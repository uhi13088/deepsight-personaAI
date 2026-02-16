// ═══════════════════════════════════════════════════════════════
// RAG Weighted Search v4.0
// T150: Poignancy + Forgetting Curve 통합 검색
//
// v3: recency × 0.5 + similarity × 0.5 (2축)
// v4: recency × 0.3 + similarity × 0.4 + (poignancy × retention) × 0.3 (3축 + 망각)
//
// LLM 비용: 0 (순수 규칙 기반)
// ═══════════════════════════════════════════════════════════════

import { computeRAGSearchScore, RAG_SEARCH_WEIGHTS } from "./poignancy"
import type { RAGSearchScoreInput } from "./poignancy"
import {
  computeRetentionFromPoignancy,
  applyForgettingCurve,
  filterAndRankByRetention,
  RETENTION_CUTOFF,
} from "./forgetting-curve"

// ── 타입 ────────────────────────────────────────────────────

/** RAG 검색 대상 항목 (DB에서 조회된 원본) */
export interface MemoryItem {
  id: string
  type: "post" | "comment" | "interaction" | "consumption"
  content: string
  personaId: string
  createdAt: number
  poignancy: number // 0~1
  similarity?: number // 외부 임베딩 결과 (없으면 0)
  metadata?: Record<string, unknown>
}

/** 검색 결과 항목 (가중 점수 포함) */
export interface RankedMemoryItem extends MemoryItem {
  retention: number // 0~1
  recency: number // 0~1
  effectiveSimilarity: number // 0~1
  effectivePoignancy: number // poignancy × retention
  ragScore: number // 최종 가중 점수
  isEffectivelyForgotten: boolean
}

/** 검색 옵션 */
export interface RAGSearchOptions {
  /** 최대 결과 수 */
  maxResults: number
  /** 최신성 계산 기준 일수 (기본 30) */
  recencyWindowDays: number
  /** 최소 RAG 점수 (이하 제외) */
  minScore: number
  /** 타입 필터 */
  typeFilter?: MemoryItem["type"][]
  /** 최소 retention (기본 RETENTION_CUTOFF) */
  minRetention: number
  /** 핵심 기억 부스트 계수 (기본 1.2) */
  coreMemoryBoost: number
}

/** 검색 결과 요약 */
export interface RAGSearchResult {
  items: RankedMemoryItem[]
  totalCandidates: number
  filteredCount: number
  forgottenCount: number
  avgScore: number
  avgRetention: number
  searchedAt: number
}

/** 메모리 통계 */
export interface MemoryRetentionStats {
  totalMemories: number
  activeMemories: number // retention >= RETENTION_CUTOFF
  forgottenMemories: number
  coreMemories: number // poignancy >= 0.8
  avgRetention: number
  avgPoignancy: number
  retentionDistribution: {
    high: number // >= 0.7
    medium: number // >= 0.3
    low: number // >= RETENTION_CUTOFF
    forgotten: number // < RETENTION_CUTOFF
  }
}

// ── 상수 ────────────────────────────────────────────────────

/** 기본 검색 옵션 */
export const DEFAULT_SEARCH_OPTIONS: RAGSearchOptions = {
  maxResults: 10,
  recencyWindowDays: 30,
  minScore: 0.05,
  minRetention: RETENTION_CUTOFF,
  coreMemoryBoost: 1.2,
}

/** 핵심 기억 임계값 */
export const CORE_POIGNANCY_THRESHOLD = 0.8

/** 최신성 감쇠 계수 (지수 감쇠) */
export const RECENCY_DECAY_RATE = 0.05

// ══════════════════════════════════════════════════════════════
// 최신성 (Recency) 계산
// ══════════════════════════════════════════════════════════════

/** 시간 기반 최신성 점수 (지수 감쇠) */
export function computeRecency(createdAt: number, windowDays: number): number {
  const elapsedMs = Date.now() - createdAt
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24)

  if (elapsedDays <= 0) return 1.0

  // 지수 감쇠: e^(-elapsedDays * decayRate / windowDays * scaleFactor)
  // windowDays 내 → 0.5 이상 유지
  const normalizedDecay = elapsedDays / windowDays
  return Math.exp(-normalizedDecay * 1.5)
}

// ══════════════════════════════════════════════════════════════
// 단일 항목 점수 계산
// ══════════════════════════════════════════════════════════════

/** 단일 메모리 항목의 가중 점수 계산 */
export function scoreMemoryItem(
  item: MemoryItem,
  options: RAGSearchOptions = DEFAULT_SEARCH_OPTIONS
): RankedMemoryItem {
  // 1. retention (포기ancy + 시간)
  const retention = computeRetentionFromPoignancy(item.poignancy, getElapsedDays(item.createdAt))
  const isEffectivelyForgotten = retention < options.minRetention

  // 2. recency
  const recency = computeRecency(item.createdAt, options.recencyWindowDays)

  // 3. effective poignancy (poignancy × retention)
  const effectivePoignancy = item.poignancy * retention

  // 4. similarity (외부 제공 or 0)
  const effectiveSimilarity = item.similarity ?? 0

  // 5. RAG score
  let ragScore = computeRAGSearchScore({
    recency,
    similarity: effectiveSimilarity,
    poignancy: effectivePoignancy,
  })

  // 핵심 기억 부스트
  if (item.poignancy >= CORE_POIGNANCY_THRESHOLD) {
    ragScore = Math.min(1, ragScore * options.coreMemoryBoost)
  }

  return {
    ...item,
    retention,
    recency,
    effectiveSimilarity,
    effectivePoignancy,
    ragScore,
    isEffectivelyForgotten,
  }
}

// ══════════════════════════════════════════════════════════════
// 검색 실행
// ══════════════════════════════════════════════════════════════

/** RAG 가중 검색 실행 */
export function searchMemories(
  memories: MemoryItem[],
  options: Partial<RAGSearchOptions> = {}
): RAGSearchResult {
  const opts: RAGSearchOptions = { ...DEFAULT_SEARCH_OPTIONS, ...options }
  const totalCandidates = memories.length

  // 1. 타입 필터
  let candidates = memories
  if (opts.typeFilter && opts.typeFilter.length > 0) {
    candidates = candidates.filter((m) => opts.typeFilter!.includes(m.type))
  }

  // 2. 점수 계산
  const scored = candidates.map((m) => scoreMemoryItem(m, opts))

  // 3. 망각 필터
  const forgottenCount = scored.filter((s) => s.isEffectivelyForgotten).length
  const active = scored.filter((s) => !s.isEffectivelyForgotten)

  // 4. 최소 점수 필터
  const filtered = active.filter((s) => s.ragScore >= opts.minScore)

  // 5. 정렬 (ragScore 내림차순)
  filtered.sort((a, b) => b.ragScore - a.ragScore)

  // 6. 상위 N개
  const items = filtered.slice(0, opts.maxResults)

  // 통계
  const avgScore = items.length > 0 ? items.reduce((s, i) => s + i.ragScore, 0) / items.length : 0
  const avgRetention =
    items.length > 0 ? items.reduce((s, i) => s + i.retention, 0) / items.length : 0

  return {
    items,
    totalCandidates,
    filteredCount: totalCandidates - items.length,
    forgottenCount,
    avgScore: Math.round(avgScore * 1000) / 1000,
    avgRetention: Math.round(avgRetention * 1000) / 1000,
    searchedAt: Date.now(),
  }
}

// ══════════════════════════════════════════════════════════════
// 컨텍스트 빌더
// ══════════════════════════════════════════════════════════════

/** 검색 결과 → LLM 프롬프트용 컨텍스트 텍스트 */
export function buildRAGContextText(
  result: RAGSearchResult,
  maxTokenEstimate: number = 2000
): string {
  const parts: string[] = []
  let estimatedTokens = 0
  const CHARS_PER_TOKEN = 3.5 // 한국어 평균

  for (const item of result.items) {
    const entryTokens = Math.ceil(item.content.length / CHARS_PER_TOKEN)
    if (estimatedTokens + entryTokens > maxTokenEstimate) break

    const retention = Math.round(item.retention * 100)
    const tag = item.poignancy >= CORE_POIGNANCY_THRESHOLD ? "[핵심기억]" : `[기억 ${retention}%]`
    parts.push(`${tag} ${item.content}`)
    estimatedTokens += entryTokens
  }

  return parts.join("\n---\n")
}

/** 검색 결과 → 기억 요약 (디버그/로그용) */
export function summarizeSearchResult(result: RAGSearchResult): string {
  const lines: string[] = [
    `RAG 검색: 후보 ${result.totalCandidates}건 → 결과 ${result.items.length}건`,
    `  망각 제외: ${result.forgottenCount}건`,
    `  평균 점수: ${result.avgScore}`,
    `  평균 기억 보존율: ${(result.avgRetention * 100).toFixed(1)}%`,
  ]

  if (result.items.length > 0) {
    lines.push(`  최고 점수: ${result.items[0].ragScore.toFixed(3)} (${result.items[0].type})`)
  }

  return lines.join("\n")
}

// ══════════════════════════════════════════════════════════════
// 메모리 통계
// ══════════════════════════════════════════════════════════════

/** 페르소나의 메모리 retention 통계 */
export function computeMemoryRetentionStats(memories: MemoryItem[]): MemoryRetentionStats {
  const scored = memories.map((m) => ({
    ...m,
    retention: computeRetentionFromPoignancy(m.poignancy, getElapsedDays(m.createdAt)),
  }))

  const activeMemories = scored.filter((m) => m.retention >= RETENTION_CUTOFF)
  const forgottenMemories = scored.filter((m) => m.retention < RETENTION_CUTOFF)
  const coreMemories = scored.filter((m) => m.poignancy >= CORE_POIGNANCY_THRESHOLD)

  const avgRetention =
    scored.length > 0 ? scored.reduce((s, m) => s + m.retention, 0) / scored.length : 0
  const avgPoignancy =
    scored.length > 0 ? scored.reduce((s, m) => s + m.poignancy, 0) / scored.length : 0

  const distribution = {
    high: scored.filter((m) => m.retention >= 0.7).length,
    medium: scored.filter((m) => m.retention >= 0.3 && m.retention < 0.7).length,
    low: scored.filter((m) => m.retention >= RETENTION_CUTOFF && m.retention < 0.3).length,
    forgotten: forgottenMemories.length,
  }

  return {
    totalMemories: memories.length,
    activeMemories: activeMemories.length,
    forgottenMemories: forgottenMemories.length,
    coreMemories: coreMemories.length,
    avgRetention: Math.round(avgRetention * 1000) / 1000,
    avgPoignancy: Math.round(avgPoignancy * 1000) / 1000,
    retentionDistribution: distribution,
  }
}

// ══════════════════════════════════════════════════════════════
// 타입별 전문 검색
// ══════════════════════════════════════════════════════════════

/** 인터랙션 기억 검색 (대화 컨텍스트용) */
export function searchInteractionMemories(
  memories: MemoryItem[],
  targetPersonaId?: string,
  maxResults: number = 5
): RAGSearchResult {
  const filtered = targetPersonaId
    ? memories.filter(
        (m) => m.type === "interaction" && m.metadata?.["targetId"] === targetPersonaId
      )
    : memories.filter((m) => m.type === "interaction")

  return searchMemories(filtered, {
    maxResults,
    recencyWindowDays: 60, // 인터랙션은 더 긴 윈도우
    minScore: 0.03,
  })
}

/** 포스트 기억 검색 (보이스 앵커용) */
export function searchPostMemories(
  memories: MemoryItem[],
  maxResults: number = 5
): RAGSearchResult {
  return searchMemories(
    memories.filter((m) => m.type === "post"),
    {
      maxResults,
      recencyWindowDays: 14, // 포스트는 짧은 윈도우
      minScore: 0.05,
    }
  )
}

/** 소비 기억 검색 (관심사 연속성용) */
export function searchConsumptionMemories(
  memories: MemoryItem[],
  maxResults: number = 5
): RAGSearchResult {
  return searchMemories(
    memories.filter((m) => m.type === "consumption"),
    {
      maxResults,
      recencyWindowDays: 30,
      minScore: 0.02,
    }
  )
}

// ── 유틸 ────────────────────────────────────────────────────

function getElapsedDays(createdAt: number): number {
  return (Date.now() - createdAt) / (1000 * 60 * 60 * 24)
}
