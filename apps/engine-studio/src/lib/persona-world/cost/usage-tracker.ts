// ═══════════════════════════════════════════════════════════════
// PersonaWorld — LLM Usage Tracker (Phase 8)
// 운영 설계서 §12.6 — 활동 유형별 LLM 로깅, 일간/월간 집계
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type LLMCallType = "POST" | "COMMENT" | "INTERVIEW" | "JUDGE" | "ARENA" | "OTHER"

export interface LlmUsageLog {
  id: string
  personaId: string
  callType: LLMCallType

  tokens: {
    inputTotal: number
    inputCached: number
    output: number
  }

  cost: {
    inputCost: number
    cacheCost: number
    outputCost: number
    totalCost: number
  }

  latencyMs: number
  model: string
  cacheHit: boolean
  timestamp: Date
}

// ── 비용 정수 (Sonnet 기준) ──────────────────────────────────

const PRICING = {
  inputPerMillion: 3.0, // $3/1M input tokens
  cacheReadPerMillion: 0.3, // $0.3/1M cached tokens
  outputPerMillion: 15.0, // $15/1M output tokens
} as const

// ── 로그 생성 ──────────────────────────────────────────────────

let logCounter = 0

/**
 * LLM 사용 로그 생성.
 */
export function createUsageLog(params: {
  personaId: string
  callType: LLMCallType
  inputTotal: number
  inputCached: number
  output: number
  latencyMs: number
  model: string
}): LlmUsageLog {
  const inputNonCached = params.inputTotal - params.inputCached
  const inputCost = round((inputNonCached / 1_000_000) * PRICING.inputPerMillion)
  const cacheCost = round((params.inputCached / 1_000_000) * PRICING.cacheReadPerMillion)
  const outputCost = round((params.output / 1_000_000) * PRICING.outputPerMillion)

  return {
    id: `llm-${Date.now()}-${++logCounter}`,
    personaId: params.personaId,
    callType: params.callType,
    tokens: {
      inputTotal: params.inputTotal,
      inputCached: params.inputCached,
      output: params.output,
    },
    cost: {
      inputCost,
      cacheCost,
      outputCost,
      totalCost: round(inputCost + cacheCost + outputCost),
    },
    latencyMs: params.latencyMs,
    model: params.model,
    cacheHit: params.inputCached > 0,
    timestamp: new Date(),
  }
}

// ── 일간 비용 리포트 ──────────────────────────────────────────

export interface CallTypeBreakdown {
  callType: LLMCallType
  count: number
  totalCost: number
  avgCostPerCall: number
  totalTokens: number
}

export interface PersonaCostBreakdown {
  personaId: string
  totalCost: number
  callCount: number
}

export interface CacheEfficiency {
  totalInputTokens: number
  cachedTokens: number
  cacheHitRate: number
  estimatedSavings: number
}

export interface DailyCostReport {
  date: string
  totalCost: number
  totalCalls: number
  byCallType: CallTypeBreakdown[]
  byPersona: PersonaCostBreakdown[]
  cacheEfficiency: CacheEfficiency
  budgetUsage?: { budget: number; usagePercentage: number }
}

/**
 * 일간 비용 리포트 생성.
 */
export function computeDailyCostReport(logs: LlmUsageLog[], dailyBudget?: number): DailyCostReport {
  const totalCost = round(logs.reduce((s, l) => s + l.cost.totalCost, 0))
  const date =
    logs.length > 0
      ? logs[0].timestamp.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)

  // By call type
  const callTypeMap = new Map<LLMCallType, LlmUsageLog[]>()
  for (const log of logs) {
    const group = callTypeMap.get(log.callType) ?? []
    group.push(log)
    callTypeMap.set(log.callType, group)
  }

  const byCallType: CallTypeBreakdown[] = []
  for (const [callType, group] of callTypeMap) {
    const cost = round(group.reduce((s, l) => s + l.cost.totalCost, 0))
    const tokens = group.reduce((s, l) => s + l.tokens.inputTotal + l.tokens.output, 0)
    byCallType.push({
      callType,
      count: group.length,
      totalCost: cost,
      avgCostPerCall: round(cost / group.length),
      totalTokens: tokens,
    })
  }

  // By persona
  const personaMap = new Map<string, LlmUsageLog[]>()
  for (const log of logs) {
    const group = personaMap.get(log.personaId) ?? []
    group.push(log)
    personaMap.set(log.personaId, group)
  }

  const byPersona: PersonaCostBreakdown[] = []
  for (const [personaId, group] of personaMap) {
    byPersona.push({
      personaId,
      totalCost: round(group.reduce((s, l) => s + l.cost.totalCost, 0)),
      callCount: group.length,
    })
  }

  // Cache efficiency
  const totalInputTokens = logs.reduce((s, l) => s + l.tokens.inputTotal, 0)
  const cachedTokens = logs.reduce((s, l) => s + l.tokens.inputCached, 0)
  const cacheHitRate = totalInputTokens > 0 ? round(cachedTokens / totalInputTokens) : 0
  const estimatedSavings = round(
    (cachedTokens / 1_000_000) * (PRICING.inputPerMillion - PRICING.cacheReadPerMillion)
  )

  const report: DailyCostReport = {
    date,
    totalCost,
    totalCalls: logs.length,
    byCallType,
    byPersona,
    cacheEfficiency: { totalInputTokens, cachedTokens, cacheHitRate, estimatedSavings },
  }

  if (dailyBudget !== undefined && dailyBudget > 0) {
    report.budgetUsage = {
      budget: dailyBudget,
      usagePercentage: round((totalCost / dailyBudget) * 100),
    }
  }

  return report
}

// ── 월간 비용 리포트 ──────────────────────────────────────────

export interface MonthlyCostReport {
  month: string
  totalCost: number
  totalCalls: number
  byCategory: CallTypeBreakdown[]
  dailyTrend: Array<{ date: string; cost: number }>
  projectedEndOfMonth: number
  budgetUsage?: { budget: number; usagePercentage: number }
}

/**
 * 월간 비용 리포트 생성.
 */
export function computeMonthlyCostReport(
  dailyReports: DailyCostReport[],
  monthlyBudget?: number,
  totalDaysInMonth: number = 30
): MonthlyCostReport {
  const totalCost = round(dailyReports.reduce((s, r) => s + r.totalCost, 0))
  const totalCalls = dailyReports.reduce((s, r) => s + r.totalCalls, 0)

  // By category (aggregate all daily breakdowns)
  const categoryMap = new Map<LLMCallType, { count: number; cost: number; tokens: number }>()
  for (const report of dailyReports) {
    for (const bt of report.byCallType) {
      const existing = categoryMap.get(bt.callType) ?? { count: 0, cost: 0, tokens: 0 }
      existing.count += bt.count
      existing.cost += bt.totalCost
      existing.tokens += bt.totalTokens
      categoryMap.set(bt.callType, existing)
    }
  }

  const byCategory: CallTypeBreakdown[] = []
  for (const [callType, data] of categoryMap) {
    byCategory.push({
      callType,
      count: data.count,
      totalCost: round(data.cost),
      avgCostPerCall: data.count > 0 ? round(data.cost / data.count) : 0,
      totalTokens: data.tokens,
    })
  }

  // Daily trend
  const dailyTrend = dailyReports.map((r) => ({
    date: r.date,
    cost: r.totalCost,
  }))

  // Projection
  const daysElapsed = dailyReports.length
  const avgDailyCost = daysElapsed > 0 ? totalCost / daysElapsed : 0
  const remainingDays = Math.max(0, totalDaysInMonth - daysElapsed)
  const projectedEndOfMonth = round(totalCost + avgDailyCost * remainingDays)

  const month =
    dailyReports.length > 0
      ? dailyReports[0].date.slice(0, 7)
      : new Date().toISOString().slice(0, 7)

  const report: MonthlyCostReport = {
    month,
    totalCost,
    totalCalls,
    byCategory,
    dailyTrend,
    projectedEndOfMonth,
  }

  if (monthlyBudget !== undefined && monthlyBudget > 0) {
    report.budgetUsage = {
      budget: monthlyBudget,
      usagePercentage: round((totalCost / monthlyBudget) * 100),
    }
  }

  return report
}

// ── 유틸리티 ──────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 1000000) / 1000000 // 6자리 정밀도 (비용용)
}
