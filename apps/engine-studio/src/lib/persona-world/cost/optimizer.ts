// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Cost Optimizer (Phase 8)
// 운영 설계서 §12.4 — 적응적 스케줄링, 배치 처리, 캐시 최적화
// ═══════════════════════════════════════════════════════════════

import type { PISGrade } from "../quality/integrity-score"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface OptimizationResult {
  strategy: string
  beforeCost: number
  afterCost: number
  savings: number
  savingsPercentage: number
}

// ── 전략 1: PIS 기반 적응적 인터뷰 스케줄링 ─────────────────

interface PersonaPISInfo {
  personaId: string
  grade: PISGrade
}

/**
 * PIS 등급별 일일 인터뷰 비율 계산.
 */
export function getInterviewRateByGrade(grade: PISGrade): number {
  switch (grade) {
    case "EXCELLENT":
      return 1 / 14 // 2주에 1회
    case "GOOD":
      return 1 / 7 // 주 1회
    case "WARNING":
      return 2 / 7 // 주 2회
    case "CRITICAL":
    case "QUARANTINE":
      return 1 // 매일
  }
}

/**
 * 적응적 인터뷰 스케줄링 비용 계산.
 *
 * 기본: 20% 샘플링 → 적응적 스케줄링으로 최적화.
 * 효과: -15.2% (98.4 → 83.4)
 */
export function computeAdaptiveInterviewCost(
  personas: PersonaPISInfo[],
  costPerInterview: number = 0.164 // 20문항 × $0.0082
): OptimizationResult {
  const totalPersonas = personas.length
  const baseDaily = Math.ceil(totalPersonas * 0.2)
  const baseMonthlyCost = baseDaily * 30 * costPerInterview

  let adaptiveDaily = 0
  for (const p of personas) {
    adaptiveDaily += getInterviewRateByGrade(p.grade)
  }

  const adaptiveMonthlyCost = round(adaptiveDaily * 30 * costPerInterview)
  const savings = round(baseMonthlyCost - adaptiveMonthlyCost)

  return {
    strategy: "PIS 기반 적응적 인터뷰",
    beforeCost: round(baseMonthlyCost),
    afterCost: adaptiveMonthlyCost,
    savings: Math.max(0, savings),
    savingsPercentage: baseMonthlyCost > 0 ? round((savings / baseMonthlyCost) * 100) : 0,
  }
}

// ── 전략 2: 댓글 배치 처리 ──────────────────────────────────

export interface BatchConfig {
  maxBatchSize: number // 최대 배치 크기 (기본 3)
  avgBatchSize: number // 평균 배치 크기 (기본 2)
  batchCostMultiplier: number // 배치 비용 배수 (기본 1.35 — 3개를 1회로 처리 시)
}

export const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: 3,
  avgBatchSize: 2,
  batchCostMultiplier: 1.35,
}

/**
 * 댓글 배치 처리 최적화 비용 계산.
 *
 * 기존: 500건/일 × $0.0048 = $2.40/일
 * 배치: 250건/일 × $0.0065 = $1.63/일
 * 효과: -32.1%
 */
export function computeBatchCommentCost(
  dailyComments: number,
  costPerComment: number = 0.0048,
  config: BatchConfig = DEFAULT_BATCH_CONFIG
): OptimizationResult {
  const beforeDaily = dailyComments * costPerComment
  const beforeMonthly = round(beforeDaily * 30)

  const batchedCalls = Math.ceil(dailyComments / config.avgBatchSize)
  const batchedCostPerCall = costPerComment * config.batchCostMultiplier
  const afterDaily = batchedCalls * batchedCostPerCall
  const afterMonthly = round(afterDaily * 30)

  const savings = round(beforeMonthly - afterMonthly)

  return {
    strategy: "댓글 배치 처리",
    beforeCost: beforeMonthly,
    afterCost: afterMonthly,
    savings: Math.max(0, savings),
    savingsPercentage: beforeMonthly > 0 ? round((savings / beforeMonthly) * 100) : 0,
  }
}

// ── 전략 3: 캐시 적중률 극대화 ──────────────────────────────

/**
 * 캐시 최적화 효과 계산.
 *
 * 유사 Static 블록 페르소나 연속 처리, 최소 5분 간격 유지.
 * 캐시 적중률: 95% → 98%
 * 효과: -4.9%
 */
export function computeCacheOptimizationCost(
  dailyPosts: number,
  costPerPost: number = 0.0081,
  currentCacheHitRate: number = 0.95,
  optimizedCacheHitRate: number = 0.98
): OptimizationResult {
  const inputCostRatio = 0.44 // 입력 비용 비율 (약 44%)
  const beforeMonthly = round(dailyPosts * 30 * costPerPost)

  // 캐시 개선에 의한 입력 비용 절감
  const cacheImprovement = optimizedCacheHitRate - currentCacheHitRate
  const inputSavingsRatio = cacheImprovement * inputCostRatio
  const afterMonthly = round(beforeMonthly * (1 - inputSavingsRatio))
  const savings = round(beforeMonthly - afterMonthly)

  return {
    strategy: "캐시 적중률 최적화",
    beforeCost: beforeMonthly,
    afterCost: afterMonthly,
    savings: Math.max(0, savings),
    savingsPercentage: beforeMonthly > 0 ? round((savings / beforeMonthly) * 100) : 0,
  }
}

// ── 종합 최적화 계산 ──────────────────────────────────────────

export interface OptimizationSummary {
  strategies: OptimizationResult[]
  totalBeforeCost: number
  totalAfterCost: number
  totalSavings: number
  totalSavingsPercentage: number
}

/**
 * 전체 최적화 효과 계산.
 */
export function computeFullOptimization(params: {
  personas: PersonaPISInfo[]
  dailyComments: number
  dailyPosts: number
}): OptimizationSummary {
  const interview = computeAdaptiveInterviewCost(params.personas)
  const batch = computeBatchCommentCost(params.dailyComments)
  const cache = computeCacheOptimizationCost(params.dailyPosts)

  const strategies = [interview, batch, cache]
  const totalBefore = round(strategies.reduce((s, r) => s + r.beforeCost, 0))
  const totalAfter = round(strategies.reduce((s, r) => s + r.afterCost, 0))
  const totalSavings = round(totalBefore - totalAfter)

  return {
    strategies,
    totalBeforeCost: totalBefore,
    totalAfterCost: totalAfter,
    totalSavings: Math.max(0, totalSavings),
    totalSavingsPercentage: totalBefore > 0 ? round((totalSavings / totalBefore) * 100) : 0,
  }
}

// ── LLM 호출 순서 최적화 ───────────────────────────────────

export interface PendingLLMCall {
  personaId: string
  callType: string
  staticBlockHash: string // 동일 Static 블록 식별
  scheduledAt: Date
}

/**
 * LLM 호출 순서 최적화 (캐시 적중 극대화).
 * 같은 Static 블록을 가진 호출끼리 그룹핑.
 */
export function optimizeLlmCallOrdering(calls: PendingLLMCall[]): PendingLLMCall[] {
  // Static 블록 해시로 그룹핑
  const groups = new Map<string, PendingLLMCall[]>()
  for (const call of calls) {
    const group = groups.get(call.staticBlockHash) ?? []
    group.push(call)
    groups.set(call.staticBlockHash, group)
  }

  // 그룹 크기 내림차순 정렬 (큰 그룹 먼저 → 캐시 효율 극대화)
  const sortedGroups = [...groups.values()].sort((a, b) => b.length - a.length)

  return sortedGroups.flat()
}

// ── 유틸리티 ──────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
