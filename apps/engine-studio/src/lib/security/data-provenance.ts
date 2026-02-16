// ═══════════════════════════════════════════════════════════════
// Data Provenance — 출처 추적 시스템
// T142: 모든 기억에 출처/신뢰도/전파 깊이 추적
// ═══════════════════════════════════════════════════════════════

import { computeTrustDecay, SOURCE_TRUST } from "./gate-guard"
import type { MemorySource } from "@/types"

// ── 타입 ──────────────────────────────────────────────────────

/** InteractionLog 출처 */
export type InteractionSource = "DIRECT" | "PERSONA_RELAY" | "EXTERNAL_FEED" | "SYSTEM"

/** PersonaPost 출처 */
export type PostSource = "AUTONOMOUS" | "FEED_INSPIRED" | "ARENA_TEST" | "SCHEDULED"

/** 출처 추적 데이터 */
export interface ProvenanceData {
  source: InteractionSource
  trustLevel: number
  propagationDepth: number
  originPersonaId: string | null
}

/** 포스트 출처 추적 데이터 */
export interface PostProvenanceData {
  postSource: PostSource
}

// ── 상수 ──────────────────────────────────────────────────────

/** InteractionSource별 기본 신뢰도 */
export const INTERACTION_SOURCE_TRUST: Record<InteractionSource, number> = {
  DIRECT: 1.0,
  PERSONA_RELAY: 0.7,
  EXTERNAL_FEED: 0.5,
  SYSTEM: 0.9,
}

/** InteractionSource → MemorySource 매핑 */
export const SOURCE_MAPPING: Record<InteractionSource, MemorySource> = {
  DIRECT: "user_input",
  PERSONA_RELAY: "persona_interaction",
  EXTERNAL_FEED: "external_feed",
  SYSTEM: "system_generated",
}

// ── AC3: 신뢰도 자동 계산 ───────────────────────────────────

/** InteractionLog 출처 태깅 데이터 자동 계산 */
export function computeInteractionProvenance(params: {
  source: InteractionSource
  propagationDepth?: number
  originPersonaId?: string
}): ProvenanceData {
  const depth = params.propagationDepth ?? 0
  const memorySource = SOURCE_MAPPING[params.source]
  const baseTrust = SOURCE_TRUST[memorySource]
  const decay = computeTrustDecay(depth)
  const trustLevel = Math.round(baseTrust * decay * 100) / 100

  return {
    source: params.source,
    trustLevel: Math.max(0, Math.min(1, trustLevel)),
    propagationDepth: depth,
    originPersonaId: params.originPersonaId ?? null,
  }
}

/** 전파된 인터랙션의 출처 데이터 계산 */
export function computeRelayProvenance(
  original: ProvenanceData,
  relayPersonaId: string
): ProvenanceData {
  const newDepth = original.propagationDepth + 1
  const memorySource = SOURCE_MAPPING[original.source]
  const baseTrust = SOURCE_TRUST[memorySource]
  const decay = computeTrustDecay(newDepth)
  const trustLevel = Math.round(baseTrust * decay * 100) / 100

  return {
    source: "PERSONA_RELAY",
    trustLevel: Math.max(0, Math.min(1, trustLevel)),
    propagationDepth: newDepth,
    originPersonaId: original.originPersonaId ?? relayPersonaId,
  }
}

/** 출처 데이터가 격리 대상인지 확인 */
export function isProvenanceQuarantined(provenance: ProvenanceData): boolean {
  return provenance.propagationDepth >= 3 || provenance.trustLevel === 0
}

/** PostSource 결정 로직 */
export function determinePostSource(params: {
  isScheduled: boolean
  isArenaTest: boolean
  isFeedInspired: boolean
}): PostSource {
  if (params.isArenaTest) return "ARENA_TEST"
  if (params.isScheduled) return "SCHEDULED"
  if (params.isFeedInspired) return "FEED_INSPIRED"
  return "AUTONOMOUS"
}

/** 출처 추적 요약 통계 */
export function summarizeProvenance(entries: ProvenanceData[]): {
  totalEntries: number
  bySource: Record<InteractionSource, number>
  averageTrust: number
  quarantinedCount: number
  maxPropagationDepth: number
} {
  const bySource: Record<InteractionSource, number> = {
    DIRECT: 0,
    PERSONA_RELAY: 0,
    EXTERNAL_FEED: 0,
    SYSTEM: 0,
  }

  let trustSum = 0
  let quarantinedCount = 0
  let maxDepth = 0

  for (const entry of entries) {
    bySource[entry.source]++
    trustSum += entry.trustLevel
    if (isProvenanceQuarantined(entry)) quarantinedCount++
    if (entry.propagationDepth > maxDepth) maxDepth = entry.propagationDepth
  }

  return {
    totalEntries: entries.length,
    bySource,
    averageTrust: entries.length > 0 ? Math.round((trustSum / entries.length) * 1000) / 1000 : 0,
    quarantinedCount,
    maxPropagationDepth: maxDepth,
  }
}
