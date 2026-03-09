// ═══════════════════════════════════════════════════════════════
// T408: Memory Prune 서비스 — SemanticMemory 자동 정리
// 3가지 규칙: low_confidence, duplicate, overflow
// 안전 장치: evidenceCount ≥ 3 삭제 불가, 1회 최대 10개
// ═══════════════════════════════════════════════════════════════

import type { MemoryConfig } from "./autonomy-policy"
import { DEFAULT_AUTONOMY_POLICY } from "./autonomy-policy"

// ── 타입 ────────────────────────────────────────────────────

export interface PrunableMemory {
  id: string
  personaId: string
  category: string
  subject: string
  confidence: number
  evidenceCount: number
}

export interface PruneDecision {
  memoryId: string
  subject: string
  rule: "low_confidence" | "duplicate" | "overflow"
  reason: string
}

export interface MemoryPruneResult {
  personaId: string
  prunedCount: number
  decisions: PruneDecision[]
  skippedProtected: number
}

// ── 상수 ────────────────────────────────────────────────────

/** 보호 대상: evidenceCount ≥ 이 값이면 삭제 불가 */
const PROTECTED_EVIDENCE_THRESHOLD = 3

/** 1회 prune 최대 삭제 수 */
const MAX_PRUNE_PER_RUN = 10

// ── 핵심 함수 ────────────────────────────────────────────────

/**
 * 페르소나의 SemanticMemory prune 대상 결정.
 *
 * 규칙:
 * 1. Low Confidence — confidence < pruneConfidenceThreshold
 * 2. Duplicate Subject — 같은 subject 2개+ → 낮은 confidence 삭제
 * 3. Overflow — 카테고리당 maxPerCategory 초과 → 낮은 confidence부터
 *
 * 안전 장치:
 * - evidenceCount ≥ 3인 기억은 삭제 불가
 * - 1회 최대 10개
 */
export function selectMemoriesToPrune(
  memories: PrunableMemory[],
  config: MemoryConfig | null
): MemoryPruneResult {
  const cfg = config ?? DEFAULT_AUTONOMY_POLICY.memoryConfig
  const personaId = memories[0]?.personaId ?? ""
  const decisions: PruneDecision[] = []
  const prunedIds = new Set<string>()
  let skippedProtected = 0

  // Rule 1: Low Confidence
  for (const mem of memories) {
    if (prunedIds.size >= MAX_PRUNE_PER_RUN) break
    if (mem.confidence < cfg.pruneConfidenceThreshold) {
      if (mem.evidenceCount >= PROTECTED_EVIDENCE_THRESHOLD) {
        skippedProtected++
        continue
      }
      prunedIds.add(mem.id)
      decisions.push({
        memoryId: mem.id,
        subject: mem.subject,
        rule: "low_confidence",
        reason: `confidence ${mem.confidence} < 임계값 ${cfg.pruneConfidenceThreshold}`,
      })
    }
  }

  // Rule 2: Duplicate Subject
  const bySubject = new Map<string, PrunableMemory[]>()
  for (const mem of memories) {
    if (prunedIds.has(mem.id)) continue
    const key = `${mem.category}:${mem.subject}`
    const group = bySubject.get(key) ?? []
    group.push(mem)
    bySubject.set(key, group)
  }

  for (const [, group] of bySubject) {
    if (group.length < 2) continue
    // confidence 낮은 순 정렬 → 첫 번째 것만 남기고 삭제
    const sorted = [...group].sort((a, b) => a.confidence - b.confidence)
    for (let i = 0; i < sorted.length - 1; i++) {
      if (prunedIds.size >= MAX_PRUNE_PER_RUN) break
      const mem = sorted[i]
      if (mem.evidenceCount >= PROTECTED_EVIDENCE_THRESHOLD) {
        skippedProtected++
        continue
      }
      prunedIds.add(mem.id)
      decisions.push({
        memoryId: mem.id,
        subject: mem.subject,
        rule: "duplicate",
        reason: `중복 subject "${mem.subject}" — 낮은 confidence 삭제`,
      })
    }
  }

  // Rule 3: Overflow
  const byCategory = new Map<string, PrunableMemory[]>()
  for (const mem of memories) {
    if (prunedIds.has(mem.id)) continue
    const group = byCategory.get(mem.category) ?? []
    group.push(mem)
    byCategory.set(mem.category, group)
  }

  for (const [category, group] of byCategory) {
    const excess = group.length - cfg.maxPerCategory
    if (excess <= 0) continue

    // confidence 낮은 순
    const sorted = [...group].sort((a, b) => a.confidence - b.confidence)
    let pruned = 0
    for (const mem of sorted) {
      if (pruned >= excess || prunedIds.size >= MAX_PRUNE_PER_RUN) break
      if (mem.evidenceCount >= PROTECTED_EVIDENCE_THRESHOLD) {
        skippedProtected++
        continue
      }
      prunedIds.add(mem.id)
      decisions.push({
        memoryId: mem.id,
        subject: mem.subject,
        rule: "overflow",
        reason: `카테고리 ${category} overflow (${group.length}/${cfg.maxPerCategory})`,
      })
      pruned++
    }
  }

  return {
    personaId,
    prunedCount: decisions.length,
    decisions,
    skippedProtected,
  }
}
