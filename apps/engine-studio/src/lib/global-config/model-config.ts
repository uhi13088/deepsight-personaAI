// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC1: 모델 선택 + 비용 관리 + 비용 대시보드                      ║
// ║ LLM 모델 선택, 라우팅 규칙, 비용 대시보드                      ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── 모델 타입 정의 ────────────────────────────────────────────

export type SupportedModel = "claude-sonnet" | "claude-haiku" | "claude-opus" | "gpt-4o"

export type TaskType = "generation" | "matching" | "validation"

export type RoutingStrategy = "cost_optimized" | "quality_first" | "balanced"

export interface ModelSpec {
  id: SupportedModel
  displayName: string
  provider: "anthropic" | "openai"
  costPer1kInputTokens: number // USD
  costPer1kOutputTokens: number // USD
  maxContextTokens: number
  capabilities: TaskType[]
  enabled: boolean
}

export interface RoutingRule {
  taskType: TaskType
  primaryModel: SupportedModel
  fallbackModel: SupportedModel | null
  strategy: RoutingStrategy
  maxRetries: number
  timeoutMs: number
}

export interface MonthlyBudget {
  limitUsd: number
  currentSpendUsd: number
  periodStart: number // epoch ms
  periodEnd: number // epoch ms
  alertThresholds: BudgetAlertThreshold[]
}

export interface BudgetAlertThreshold {
  percent: number // 80, 90, 100
  notified: boolean
  notifiedAt: number | null
}

/**
 * callType별 모델 오버라이드.
 * key: callType 문자열 (예: "pw:post_generation")
 * value: SupportedModel ID (예: "claude-sonnet")
 *
 * 설정되지 않은 callType은 defaultModel을 사용한다.
 */
export type CallTypeModelOverrides = Record<string, SupportedModel>

export interface ModelConfig {
  models: ModelSpec[]
  routingRules: RoutingRule[]
  defaultModel: SupportedModel
  budget: MonthlyBudget
  /** 기능(callType)별 모델 오버라이드 — UI에서 설정 가능 */
  callTypeOverrides: CallTypeModelOverrides
}

// ── SupportedModel → 실제 API 모델 ID 매핑 ──────────────────

export const MODEL_API_IDS: Record<SupportedModel, string> = {
  "claude-sonnet": "claude-sonnet-4-5-20250929",
  "claude-haiku": "claude-haiku-4-5-20251001",
  "claude-opus": "claude-opus-4-6",
  "gpt-4o": "gpt-4o",
}

// ── 알려진 callType 목록 (UI 표시용) ────────────────────────

export interface CallTypeInfo {
  callType: string
  displayName: string
  description: string
  recommendedModel: SupportedModel
}

export const KNOWN_CALL_TYPES: CallTypeInfo[] = [
  {
    callType: "pw:post_generation",
    displayName: "Post Generation",
    description: "페르소나 포스트 생성",
    recommendedModel: "claude-sonnet",
  },
  {
    callType: "pw:comment",
    displayName: "Comment",
    description: "페르소나 댓글 생성",
    recommendedModel: "claude-haiku",
  },
  {
    callType: "pw:impression",
    displayName: "Impression",
    description: "콘텐츠 감상 생성",
    recommendedModel: "claude-haiku",
  },
  {
    callType: "pw:user_response",
    displayName: "User Response",
    description: "유저 댓글 응답",
    recommendedModel: "claude-sonnet",
  },
  {
    callType: "pw:news_reaction",
    displayName: "News Reaction",
    description: "뉴스 반응 포스트",
    recommendedModel: "claude-sonnet",
  },
  {
    callType: "pw:news_analysis",
    displayName: "News Analysis",
    description: "뉴스 기사 분석",
    recommendedModel: "claude-haiku",
  },
  {
    callType: "pw:sns_analysis",
    displayName: "SNS Analysis",
    description: "SNS 온보딩 분석",
    recommendedModel: "claude-sonnet",
  },
  {
    callType: "persona:character_gen",
    displayName: "Character Gen",
    description: "페르소나 캐릭터 생성",
    recommendedModel: "claude-sonnet",
  },
  {
    callType: "qualitative",
    displayName: "Qualitative",
    description: "정성적 매칭 분석",
    recommendedModel: "claude-sonnet",
  },
  {
    callType: "arena_judgment",
    displayName: "Arena Judge",
    description: "아레나 판정",
    recommendedModel: "claude-sonnet",
  },
  {
    callType: "cold_start_summary",
    displayName: "Cold Start",
    description: "콜드스타트 요약",
    recommendedModel: "claude-haiku",
  },
]

// ── 기본 모델 정의 ────────────────────────────────────────────

export const DEFAULT_MODELS: ModelSpec[] = [
  {
    id: "claude-sonnet",
    displayName: "Claude Sonnet",
    provider: "anthropic",
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    maxContextTokens: 200_000,
    capabilities: ["generation", "matching", "validation"],
    enabled: true,
  },
  {
    id: "claude-haiku",
    displayName: "Claude Haiku",
    provider: "anthropic",
    costPer1kInputTokens: 0.00025,
    costPer1kOutputTokens: 0.00125,
    maxContextTokens: 200_000,
    capabilities: ["matching", "validation"],
    enabled: true,
  },
  {
    id: "claude-opus",
    displayName: "Claude Opus",
    provider: "anthropic",
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075,
    maxContextTokens: 200_000,
    capabilities: ["generation", "matching", "validation"],
    enabled: false,
  },
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    provider: "openai",
    costPer1kInputTokens: 0.0025,
    costPer1kOutputTokens: 0.01,
    maxContextTokens: 128_000,
    capabilities: ["generation", "matching", "validation"],
    enabled: true,
  },
]

export const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  {
    taskType: "generation",
    primaryModel: "claude-sonnet",
    fallbackModel: "gpt-4o",
    strategy: "quality_first",
    maxRetries: 2,
    timeoutMs: 30_000,
  },
  {
    taskType: "matching",
    primaryModel: "claude-haiku",
    fallbackModel: "claude-sonnet",
    strategy: "cost_optimized",
    maxRetries: 3,
    timeoutMs: 10_000,
  },
  {
    taskType: "validation",
    primaryModel: "claude-haiku",
    fallbackModel: "gpt-4o",
    strategy: "balanced",
    maxRetries: 2,
    timeoutMs: 15_000,
  },
]

// ── 추천 모델 기반 기본 callTypeOverrides ──────────────────────

/** KNOWN_CALL_TYPES의 recommendedModel을 기반으로 기본 오버라이드 생성 */
export function buildDefaultCallTypeOverrides(): CallTypeModelOverrides {
  return Object.fromEntries(KNOWN_CALL_TYPES.map((ct) => [ct.callType, ct.recommendedModel]))
}

// ── 모델 설정 생성 ────────────────────────────────────────────

export function createModelConfig(overrides?: Partial<ModelConfig>): ModelConfig {
  const now = Date.now()
  const monthEnd = new Date()
  monthEnd.setMonth(monthEnd.getMonth() + 1, 1)
  monthEnd.setHours(0, 0, 0, 0)

  return {
    models: overrides?.models ?? [...DEFAULT_MODELS],
    routingRules: overrides?.routingRules ?? [...DEFAULT_ROUTING_RULES],
    defaultModel: overrides?.defaultModel ?? "claude-sonnet",
    budget: overrides?.budget ?? {
      limitUsd: 500,
      currentSpendUsd: 0,
      periodStart: now,
      periodEnd: monthEnd.getTime(),
      alertThresholds: [
        { percent: 80, notified: false, notifiedAt: null },
        { percent: 90, notified: false, notifiedAt: null },
        { percent: 100, notified: false, notifiedAt: null },
      ],
    },
    callTypeOverrides: overrides?.callTypeOverrides ?? buildDefaultCallTypeOverrides(),
  }
}

// ── 모델 라우팅 ───────────────────────────────────────────────

export function resolveModel(config: ModelConfig, taskType: TaskType): ModelSpec {
  const rule = config.routingRules.find((r) => r.taskType === taskType)
  if (!rule) {
    const defaultSpec = config.models.find((m) => m.id === config.defaultModel)
    if (!defaultSpec) {
      throw new Error(`기본 모델을 찾을 수 없습니다: ${config.defaultModel}`)
    }
    return defaultSpec
  }

  const primary = config.models.find((m) => m.id === rule.primaryModel && m.enabled)
  if (primary) return primary

  if (rule.fallbackModel) {
    const fallback = config.models.find((m) => m.id === rule.fallbackModel && m.enabled)
    if (fallback) return fallback
  }

  throw new Error(
    `태스크 '${taskType}'에 사용 가능한 모델이 없습니다. 기본: ${rule.primaryModel}, 대체: ${rule.fallbackModel ?? "없음"}`
  )
}

/**
 * callType 기반으로 실제 API 모델 ID를 해석한다.
 *
 * 우선순위:
 * 1. callTypeOverrides[callType] (UI 설정)
 * 2. defaultModel (글로벌 기본)
 *
 * @returns 실제 API 모델 ID (예: "claude-sonnet-4-5-20250929")
 */
export function resolveModelForCallType(config: ModelConfig, callType: string | undefined): string {
  const overrideModel = callType ? config.callTypeOverrides[callType] : undefined

  if (overrideModel) {
    // 모델이 enabled 상태인지 확인
    const spec = config.models.find((m) => m.id === overrideModel)
    if (spec?.enabled) {
      return MODEL_API_IDS[overrideModel]
    }
    // disabled면 defaultModel로 폴백
  }

  return MODEL_API_IDS[config.defaultModel] ?? MODEL_API_IDS["claude-sonnet"]
}

// ── 비용 계산 ─────────────────────────────────────────────────

export function estimateCost(model: ModelSpec, inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1000) * model.costPer1kInputTokens +
    (outputTokens / 1000) * model.costPer1kOutputTokens
  )
}

export function recordSpend(budget: MonthlyBudget, amountUsd: number): MonthlyBudget {
  const updated: MonthlyBudget = {
    ...budget,
    currentSpendUsd: budget.currentSpendUsd + amountUsd,
    alertThresholds: budget.alertThresholds.map((t) => ({ ...t })),
  }

  const usagePercent = (updated.currentSpendUsd / updated.limitUsd) * 100

  for (const threshold of updated.alertThresholds) {
    if (!threshold.notified && usagePercent >= threshold.percent) {
      threshold.notified = true
      threshold.notifiedAt = Date.now()
    }
  }

  return updated
}

export function getBudgetStatus(budget: MonthlyBudget): {
  usagePercent: number
  remainingUsd: number
  exceeded: boolean
  triggeredAlerts: number[]
} {
  const usagePercent = budget.limitUsd > 0 ? (budget.currentSpendUsd / budget.limitUsd) * 100 : 0
  return {
    usagePercent: Math.round(usagePercent * 100) / 100,
    remainingUsd: Math.max(0, budget.limitUsd - budget.currentSpendUsd),
    exceeded: budget.currentSpendUsd >= budget.limitUsd,
    triggeredAlerts: budget.alertThresholds.filter((t) => t.notified).map((t) => t.percent),
  }
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ 비용 대시보드                                                 ║
// ║ 일별/주별/월별 비용 집계, 모델별 분석, 예산 알림               ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── 비용 타입 정의 ────────────────────────────────────────────

export type AggregationPeriod = "daily" | "weekly" | "monthly"

export interface CostEntry {
  id: string
  timestamp: number
  model: SupportedModel
  taskType: TaskType
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export interface CostAggregation {
  period: AggregationPeriod
  periodStart: number
  periodEnd: number
  totalCostUsd: number
  totalInputTokens: number
  totalOutputTokens: number
  requestCount: number
  perModel: Record<string, ModelCostBreakdown>
}

export interface ModelCostBreakdown {
  model: SupportedModel
  costUsd: number
  inputTokens: number
  outputTokens: number
  requestCount: number
  percentOfTotal: number
}

export interface BudgetAlert {
  id: string
  thresholdPercent: number
  triggeredAt: number
  currentSpendUsd: number
  budgetLimitUsd: number
  message: string
}

export interface CostDashboard {
  entries: CostEntry[]
  alerts: BudgetAlert[]
  budget: MonthlyBudget
}

// ── 대시보드 생성 ─────────────────────────────────────────────

export function createCostDashboard(budget: MonthlyBudget): CostDashboard {
  return {
    entries: [],
    alerts: [],
    budget,
  }
}

// ── 비용 기록 ─────────────────────────────────────────────────

export function recordCostEntry(
  dashboard: CostDashboard,
  model: SupportedModel,
  taskType: TaskType,
  inputTokens: number,
  outputTokens: number,
  modelSpec: ModelSpec
): CostDashboard {
  const costUsd = estimateCost(modelSpec, inputTokens, outputTokens)

  const entry: CostEntry = {
    id: `cost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    model,
    taskType,
    inputTokens,
    outputTokens,
    costUsd,
  }

  const updatedBudget = recordSpend(dashboard.budget, costUsd)
  const newAlerts = [...dashboard.alerts]

  // 새로 트리거된 알림 확인
  for (const threshold of updatedBudget.alertThresholds) {
    if (
      threshold.notified &&
      !dashboard.budget.alertThresholds.find((t) => t.percent === threshold.percent && t.notified)
    ) {
      newAlerts.push({
        id: `alert_${Date.now()}_${threshold.percent}`,
        thresholdPercent: threshold.percent,
        triggeredAt: Date.now(),
        currentSpendUsd: updatedBudget.currentSpendUsd,
        budgetLimitUsd: updatedBudget.limitUsd,
        message: `예산 ${threshold.percent}% 도달: $${updatedBudget.currentSpendUsd.toFixed(2)} / $${updatedBudget.limitUsd.toFixed(2)}`,
      })
    }
  }

  return {
    entries: [...dashboard.entries, entry],
    alerts: newAlerts,
    budget: updatedBudget,
  }
}

// ── 비용 집계 ─────────────────────────────────────────────────

export function aggregateCosts(
  dashboard: CostDashboard,
  period: AggregationPeriod,
  referenceDate?: number
): CostAggregation {
  const ref = referenceDate ?? Date.now()
  const { start, end } = getPeriodBounds(period, ref)

  const periodEntries = dashboard.entries.filter((e) => e.timestamp >= start && e.timestamp < end)

  const perModel: Record<string, ModelCostBreakdown> = {}
  let totalCostUsd = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (const entry of periodEntries) {
    totalCostUsd += entry.costUsd
    totalInputTokens += entry.inputTokens
    totalOutputTokens += entry.outputTokens

    if (!perModel[entry.model]) {
      perModel[entry.model] = {
        model: entry.model,
        costUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
        requestCount: 0,
        percentOfTotal: 0,
      }
    }
    perModel[entry.model].costUsd += entry.costUsd
    perModel[entry.model].inputTokens += entry.inputTokens
    perModel[entry.model].outputTokens += entry.outputTokens
    perModel[entry.model].requestCount++
  }

  // percentOfTotal 계산
  if (totalCostUsd > 0) {
    for (const key of Object.keys(perModel)) {
      perModel[key].percentOfTotal =
        Math.round((perModel[key].costUsd / totalCostUsd) * 10000) / 100
    }
  }

  return {
    period,
    periodStart: start,
    periodEnd: end,
    totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    totalInputTokens,
    totalOutputTokens,
    requestCount: periodEntries.length,
    perModel,
  }
}

function getPeriodBounds(
  period: AggregationPeriod,
  referenceMs: number
): { start: number; end: number } {
  const d = new Date(referenceMs)

  switch (period) {
    case "daily": {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      const end = start + 24 * 60 * 60 * 1000
      return { start, end }
    }
    case "weekly": {
      const dayOfWeek = d.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + mondayOffset).getTime()
      const end = start + 7 * 24 * 60 * 60 * 1000
      return { start, end }
    }
    case "monthly": {
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
      return { start, end }
    }
  }
}
