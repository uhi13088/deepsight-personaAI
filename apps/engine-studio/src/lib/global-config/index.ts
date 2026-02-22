// ═══════════════════════════════════════════════════════════════
// Global Config — T68
// 글로벌 설정: 모델 선택, 안전 필터, API 관리, 비용 대시보드
// ═══════════════════════════════════════════════════════════════

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC1: 모델 선택 + 비용 관리                                    ║
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

export interface ModelConfig {
  models: ModelSpec[]
  routingRules: RoutingRule[]
  defaultModel: SupportedModel
  budget: MonthlyBudget
}

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
// ║ AC2: 안전 필터                                                ║
// ║ 필터 강도 설정, 커스텀 금기어, 필터 로그                        ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── 안전 필터 타입 정의 ───────────────────────────────────────

export type FilterLevel = "strict" | "moderate" | "permissive" | "off"

export type FilterAction = "block" | "warn" | "flag" | "pass"

export interface ForbiddenWord {
  word: string
  category: string
  severity: "critical" | "high" | "medium" | "low"
  exactMatch: boolean // true: 정확히 일치, false: 포함 여부
}

export interface FilterLogEntry {
  id: string
  timestamp: number
  input: string
  matchedRule: string
  matchedWord: string | null
  filterLevel: FilterLevel
  action: FilterAction
  details: string
}

export interface SafetyFilterConfig {
  level: FilterLevel
  forbiddenWords: ForbiddenWord[]
  maxLogEntries: number
  enableLogging: boolean
}

export interface SafetyFilter {
  config: SafetyFilterConfig
  logs: FilterLogEntry[]
}

// ── 기본 금기어 목록 ──────────────────────────────────────────

export const DEFAULT_FORBIDDEN_WORDS: ForbiddenWord[] = [
  { word: "폭력", category: "violence", severity: "critical", exactMatch: false },
  { word: "자해", category: "self_harm", severity: "critical", exactMatch: false },
  { word: "차별", category: "discrimination", severity: "high", exactMatch: false },
  { word: "혐오", category: "hate_speech", severity: "high", exactMatch: false },
  { word: "음란", category: "explicit", severity: "high", exactMatch: false },
  { word: "마약", category: "illegal", severity: "critical", exactMatch: false },
  { word: "도박", category: "illegal", severity: "medium", exactMatch: false },
  { word: "사기", category: "fraud", severity: "high", exactMatch: false },
]

// ── 필터 강도별 액션 매핑 ─────────────────────────────────────

const LEVEL_ACTION_MAP: Record<FilterLevel, Record<ForbiddenWord["severity"], FilterAction>> = {
  strict: {
    critical: "block",
    high: "block",
    medium: "warn",
    low: "flag",
  },
  moderate: {
    critical: "block",
    high: "warn",
    medium: "flag",
    low: "pass",
  },
  permissive: {
    critical: "block",
    high: "flag",
    medium: "pass",
    low: "pass",
  },
  off: {
    critical: "pass",
    high: "pass",
    medium: "pass",
    low: "pass",
  },
}

// ── 안전 필터 생성 ────────────────────────────────────────────

export function createSafetyFilter(overrides?: Partial<SafetyFilterConfig>): SafetyFilter {
  return {
    config: {
      level: overrides?.level ?? "moderate",
      forbiddenWords: overrides?.forbiddenWords ?? [...DEFAULT_FORBIDDEN_WORDS],
      maxLogEntries: overrides?.maxLogEntries ?? 10_000,
      enableLogging: overrides?.enableLogging ?? true,
    },
    logs: [],
  }
}

// ── 필터 평가 ─────────────────────────────────────────────────

export interface FilterEvaluationResult {
  passed: boolean
  action: FilterAction
  matchedWords: Array<{ word: string; category: string; severity: ForbiddenWord["severity"] }>
  logEntry: FilterLogEntry | null
}

export function evaluateFilter(
  filter: SafetyFilter,
  input: string
): { result: FilterEvaluationResult; updatedFilter: SafetyFilter } {
  const normalizedInput = input.toLowerCase().trim()
  const matchedWords: FilterEvaluationResult["matchedWords"] = []

  for (const fw of filter.config.forbiddenWords) {
    const normalizedWord = fw.word.toLowerCase()
    const found = fw.exactMatch
      ? normalizedInput === normalizedWord
      : normalizedInput.includes(normalizedWord)

    if (found) {
      matchedWords.push({
        word: fw.word,
        category: fw.category,
        severity: fw.severity,
      })
    }
  }

  // 가장 높은 심각도 기준으로 액션 결정
  let finalAction: FilterAction = "pass"
  const severityOrder: ForbiddenWord["severity"][] = ["critical", "high", "medium", "low"]

  for (const severity of severityOrder) {
    if (matchedWords.some((m) => m.severity === severity)) {
      finalAction = LEVEL_ACTION_MAP[filter.config.level][severity]
      break
    }
  }

  const logEntry: FilterLogEntry | null = filter.config.enableLogging
    ? {
        id: `flog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        input: input.length > 200 ? input.slice(0, 200) + "..." : input,
        matchedRule:
          matchedWords.length > 0
            ? matchedWords.map((m) => `${m.category}:${m.severity}`).join(", ")
            : "none",
        matchedWord: matchedWords.length > 0 ? matchedWords.map((m) => m.word).join(", ") : null,
        filterLevel: filter.config.level,
        action: finalAction,
        details:
          matchedWords.length > 0
            ? `${matchedWords.length}개 금기어 탐지 → ${finalAction}`
            : "필터 통과",
      }
    : null

  // 로그 추가 (최대 제한 적용)
  let updatedLogs = [...filter.logs]
  if (logEntry) {
    updatedLogs.push(logEntry)
    if (updatedLogs.length > filter.config.maxLogEntries) {
      updatedLogs = updatedLogs.slice(updatedLogs.length - filter.config.maxLogEntries)
    }
  }

  return {
    result: {
      passed: finalAction === "pass" || finalAction === "flag",
      action: finalAction,
      matchedWords,
      logEntry,
    },
    updatedFilter: {
      ...filter,
      logs: updatedLogs,
    },
  }
}

// ── 금기어 관리 ───────────────────────────────────────────────

export function addForbiddenWord(filter: SafetyFilter, word: ForbiddenWord): SafetyFilter {
  const exists = filter.config.forbiddenWords.some(
    (fw) => fw.word.toLowerCase() === word.word.toLowerCase() && fw.category === word.category
  )
  if (exists) {
    throw new Error(`금기어가 이미 존재합니다: "${word.word}" (${word.category})`)
  }
  return {
    ...filter,
    config: {
      ...filter.config,
      forbiddenWords: [...filter.config.forbiddenWords, word],
    },
  }
}

export function removeForbiddenWord(
  filter: SafetyFilter,
  word: string,
  category: string
): SafetyFilter {
  const filtered = filter.config.forbiddenWords.filter(
    (fw) => !(fw.word.toLowerCase() === word.toLowerCase() && fw.category === category)
  )
  if (filtered.length === filter.config.forbiddenWords.length) {
    throw new Error(`금기어를 찾을 수 없습니다: "${word}" (${category})`)
  }
  return {
    ...filter,
    config: {
      ...filter.config,
      forbiddenWords: filtered,
    },
  }
}

export function getFilterLogSummary(filter: SafetyFilter): {
  totalEntries: number
  byAction: Record<FilterAction, number>
  byLevel: Record<FilterLevel, number>
  recentBlocks: FilterLogEntry[]
} {
  const byAction: Record<FilterAction, number> = { block: 0, warn: 0, flag: 0, pass: 0 }
  const byLevel: Record<FilterLevel, number> = { strict: 0, moderate: 0, permissive: 0, off: 0 }

  for (const log of filter.logs) {
    byAction[log.action]++
    byLevel[log.filterLevel]++
  }

  const recentBlocks = filter.logs.filter((l) => l.action === "block").slice(-10)

  return {
    totalEntries: filter.logs.length,
    byAction,
    byLevel,
    recentBlocks,
  }
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC3: API 엔드포인트 관리                                      ║
// ║ 내부/외부 API, Rate Limiting, 버전 관리                       ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── API 엔드포인트 타입 정의 ──────────────────────────────────

export type APIScope = "internal" | "external"

export type APIVersion = "v1" | "v2" | "v3"

export type EndpointStatus = "active" | "deprecated" | "disabled"

export type HealthStatus = "healthy" | "degraded" | "down" | "unknown"

export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface RateLimitConfig {
  requestsPerMinute: number
  burstLimit: number // 순간 최대 요청
  windowMs: number // 윈도우 크기 (ms)
  retryAfterMs: number // 제한 시 재시도 대기 시간
}

export interface APIVersionInfo {
  version: APIVersion
  releasedAt: number // epoch ms
  deprecatedAt: number | null // epoch ms
  sunsetAt: number | null // epoch ms (완전 종료일)
  changelog: string
}

export interface HealthCheckConfig {
  enabled: boolean
  intervalMs: number // 체크 주기
  timeoutMs: number // 응답 대기 시간
  unhealthyThreshold: number // 연속 실패 시 down 판정
}

export interface APIEndpoint {
  id: string
  name: string
  path: string
  method: HTTPMethod
  scope: APIScope
  version: APIVersion
  status: EndpointStatus
  description: string
  rateLimit: RateLimitConfig
  healthCheck: HealthCheckConfig
  tags: string[]
}

export interface HealthCheckResult {
  endpointId: string
  status: HealthStatus
  responseTimeMs: number
  checkedAt: number
  consecutiveFailures: number
  lastSuccessAt: number | null
  errorMessage: string | null
}

export interface APIEndpointManager {
  endpoints: APIEndpoint[]
  versions: APIVersionInfo[]
  healthResults: Map<string, HealthCheckResult>
}

// ── 기본 Rate Limit 설정 ──────────────────────────────────────

export const DEFAULT_RATE_LIMITS: Record<APIScope, RateLimitConfig> = {
  internal: {
    requestsPerMinute: 600,
    burstLimit: 100,
    windowMs: 60_000,
    retryAfterMs: 1_000,
  },
  external: {
    requestsPerMinute: 60,
    burstLimit: 20,
    windowMs: 60_000,
    retryAfterMs: 5_000,
  },
}

export const DEFAULT_HEALTH_CHECK: HealthCheckConfig = {
  enabled: true,
  intervalMs: 30_000,
  timeoutMs: 5_000,
  unhealthyThreshold: 3,
}

// ── 버전 정의 ─────────────────────────────────────────────────

export const DEFAULT_API_VERSIONS: APIVersionInfo[] = [
  {
    version: "v1",
    releasedAt: new Date("2024-01-01").getTime(),
    deprecatedAt: new Date("2025-01-01").getTime(),
    sunsetAt: new Date("2025-07-01").getTime(),
    changelog: "초기 릴리즈: 기본 페르소나 API",
  },
  {
    version: "v2",
    releasedAt: new Date("2025-01-01").getTime(),
    deprecatedAt: null,
    sunsetAt: null,
    changelog: "6D 벡터 매칭, 배치 처리 추가",
  },
  {
    version: "v3",
    releasedAt: new Date("2025-06-01").getTime(),
    deprecatedAt: null,
    sunsetAt: null,
    changelog: "PersonaWorld 통합, 실시간 스트리밍",
  },
]

// ── API 엔드포인트 매니저 생성 ────────────────────────────────

export function createAPIEndpointManager(
  endpoints?: APIEndpoint[],
  versions?: APIVersionInfo[]
): APIEndpointManager {
  return {
    endpoints: endpoints ?? [],
    versions: versions ?? [...DEFAULT_API_VERSIONS],
    healthResults: new Map(),
  }
}

// ── 엔드포인트 등록 ───────────────────────────────────────────

export function registerEndpoint(
  manager: APIEndpointManager,
  endpoint: Omit<APIEndpoint, "id">
): APIEndpointManager {
  const existingPath = manager.endpoints.find(
    (e) =>
      e.path === endpoint.path && e.method === endpoint.method && e.version === endpoint.version
  )
  if (existingPath) {
    throw new Error(
      `엔드포인트가 이미 존재합니다: ${endpoint.method} ${endpoint.path} (${endpoint.version})`
    )
  }

  const versionExists = manager.versions.some((v) => v.version === endpoint.version)
  if (!versionExists) {
    throw new Error(`지원하지 않는 API 버전입니다: ${endpoint.version}`)
  }

  const newEndpoint: APIEndpoint = {
    ...endpoint,
    id: `ep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  }

  return {
    ...manager,
    endpoints: [...manager.endpoints, newEndpoint],
  }
}

// ── 엔드포인트 상태 변경 ──────────────────────────────────────

export function updateEndpointStatus(
  manager: APIEndpointManager,
  endpointId: string,
  status: EndpointStatus
): APIEndpointManager {
  const idx = manager.endpoints.findIndex((e) => e.id === endpointId)
  if (idx === -1) {
    throw new Error(`엔드포인트를 찾을 수 없습니다: ${endpointId}`)
  }

  const updated = [...manager.endpoints]
  updated[idx] = { ...updated[idx], status }

  return { ...manager, endpoints: updated }
}

// ── Rate Limit 업데이트 ───────────────────────────────────────

export function updateRateLimit(
  manager: APIEndpointManager,
  endpointId: string,
  rateLimit: Partial<RateLimitConfig>
): APIEndpointManager {
  const idx = manager.endpoints.findIndex((e) => e.id === endpointId)
  if (idx === -1) {
    throw new Error(`엔드포인트를 찾을 수 없습니다: ${endpointId}`)
  }

  const updated = [...manager.endpoints]
  updated[idx] = {
    ...updated[idx],
    rateLimit: { ...updated[idx].rateLimit, ...rateLimit },
  }

  return { ...manager, endpoints: updated }
}

// ── 헬스체크 결과 기록 ────────────────────────────────────────

export function recordHealthCheck(
  manager: APIEndpointManager,
  endpointId: string,
  responseTimeMs: number,
  success: boolean,
  errorMessage?: string
): APIEndpointManager {
  const endpoint = manager.endpoints.find((e) => e.id === endpointId)
  if (!endpoint) {
    throw new Error(`엔드포인트를 찾을 수 없습니다: ${endpointId}`)
  }

  const previous = manager.healthResults.get(endpointId)
  const consecutiveFailures = success ? 0 : (previous?.consecutiveFailures ?? 0) + 1

  let status: HealthStatus
  if (!success && consecutiveFailures >= endpoint.healthCheck.unhealthyThreshold) {
    status = "down"
  } else if (!success) {
    status = "degraded"
  } else if (responseTimeMs > endpoint.healthCheck.timeoutMs * 0.8) {
    status = "degraded"
  } else {
    status = "healthy"
  }

  const result: HealthCheckResult = {
    endpointId,
    status,
    responseTimeMs,
    checkedAt: Date.now(),
    consecutiveFailures,
    lastSuccessAt: success ? Date.now() : (previous?.lastSuccessAt ?? null),
    errorMessage: errorMessage ?? null,
  }

  const newHealthResults = new Map(manager.healthResults)
  newHealthResults.set(endpointId, result)

  return {
    ...manager,
    endpoints: manager.endpoints,
    versions: manager.versions,
    healthResults: newHealthResults,
  }
}

// ── 버전별 엔드포인트 조회 ────────────────────────────────────

export function getEndpointsByVersion(
  manager: APIEndpointManager,
  version: APIVersion
): APIEndpoint[] {
  return manager.endpoints.filter((e) => e.version === version)
}

export function getDeprecatedEndpoints(manager: APIEndpointManager): APIEndpoint[] {
  const deprecatedVersions = new Set(
    manager.versions.filter((v) => v.deprecatedAt !== null).map((v) => v.version)
  )
  return manager.endpoints.filter(
    (e) => e.status === "deprecated" || deprecatedVersions.has(e.version)
  )
}

export function getHealthSummary(manager: APIEndpointManager): {
  total: number
  healthy: number
  degraded: number
  down: number
  unknown: number
} {
  const summary = { total: manager.endpoints.length, healthy: 0, degraded: 0, down: 0, unknown: 0 }

  for (const endpoint of manager.endpoints) {
    const result = manager.healthResults.get(endpoint.id)
    if (!result) {
      summary.unknown++
    } else {
      summary[result.status]++
    }
  }

  return summary
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

// ╔═══════════════════════════════════════════════════════════════╗
// ║ Config Validator                                              ║
// ║ 설정 검증, 충돌 탐지, 최적화 제안                              ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── 검증 타입 정의 ────────────────────────────────────────────

export type ValidationSeverity = "error" | "warning" | "info"

export interface ValidationIssue {
  section: "model" | "safety" | "api" | "cost"
  severity: ValidationSeverity
  code: string
  message: string
  suggestion: string | null
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  checkedAt: number
}

export interface GlobalConfig {
  modelConfig: ModelConfig
  safetyFilter: SafetyFilter
  apiManager: APIEndpointManager
  costDashboard: CostDashboard
}

// ── 전체 설정 생성 ────────────────────────────────────────────

export function createGlobalConfig(
  overrides?: Partial<{
    modelConfig: Partial<ModelConfig>
    safetyFilter: Partial<SafetyFilterConfig>
  }>
): GlobalConfig {
  const modelConfig = createModelConfig(overrides?.modelConfig)
  const safetyFilter = createSafetyFilter(overrides?.safetyFilter)
  const apiManager = createAPIEndpointManager()
  const costDashboard = createCostDashboard(modelConfig.budget)

  return { modelConfig, safetyFilter, apiManager, costDashboard }
}

// ── 설정 검증 ─────────────────────────────────────────────────

export function validateConfig(config: GlobalConfig): ValidationResult {
  const issues: ValidationIssue[] = [
    ...validateModelConfig(config.modelConfig),
    ...validateSafetyFilter(config.safetyFilter),
    ...validateAPIManager(config.apiManager),
    ...validateCostDashboard(config.costDashboard, config.modelConfig),
  ]

  return {
    valid: issues.every((i) => i.severity !== "error"),
    issues,
    checkedAt: Date.now(),
  }
}

// ── 모델 설정 검증 ────────────────────────────────────────────

function validateModelConfig(config: ModelConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // 기본 모델 활성화 확인
  const defaultModel = config.models.find((m) => m.id === config.defaultModel)
  if (!defaultModel) {
    issues.push({
      section: "model",
      severity: "error",
      code: "MODEL_DEFAULT_MISSING",
      message: `기본 모델 '${config.defaultModel}'이 모델 목록에 없습니다`,
      suggestion: "models 배열에 기본 모델을 추가하거나 defaultModel을 변경하세요",
    })
  } else if (!defaultModel.enabled) {
    issues.push({
      section: "model",
      severity: "error",
      code: "MODEL_DEFAULT_DISABLED",
      message: `기본 모델 '${config.defaultModel}'이 비활성화 상태입니다`,
      suggestion: "기본 모델을 활성화하거나 활성화된 모델을 기본으로 설정하세요",
    })
  }

  // 활성 모델 최소 1개
  const enabledModels = config.models.filter((m) => m.enabled)
  if (enabledModels.length === 0) {
    issues.push({
      section: "model",
      severity: "error",
      code: "MODEL_NONE_ENABLED",
      message: "활성화된 모델이 없습니다",
      suggestion: "최소 1개 모델을 활성화하세요",
    })
  }

  // 라우팅 규칙 유효성
  for (const rule of config.routingRules) {
    const primary = config.models.find((m) => m.id === rule.primaryModel)
    if (!primary) {
      issues.push({
        section: "model",
        severity: "error",
        code: "ROUTING_MODEL_MISSING",
        message: `라우팅 규칙 '${rule.taskType}'의 기본 모델 '${rule.primaryModel}'이 없습니다`,
        suggestion: `models에 '${rule.primaryModel}'을 추가하세요`,
      })
    } else if (!primary.enabled) {
      issues.push({
        section: "model",
        severity: "warning",
        code: "ROUTING_MODEL_DISABLED",
        message: `라우팅 규칙 '${rule.taskType}'의 기본 모델 '${rule.primaryModel}'이 비활성화 상태입니다`,
        suggestion: "대체 모델로 자동 전환됩니다. 의도한 설정인지 확인하세요",
      })
    } else if (!primary.capabilities.includes(rule.taskType)) {
      issues.push({
        section: "model",
        severity: "error",
        code: "ROUTING_CAPABILITY_MISMATCH",
        message: `모델 '${rule.primaryModel}'은 '${rule.taskType}' 작업을 지원하지 않습니다`,
        suggestion: `해당 작업을 지원하는 모델로 변경하세요`,
      })
    }

    if (rule.fallbackModel) {
      const fallback = config.models.find((m) => m.id === rule.fallbackModel)
      if (!fallback) {
        issues.push({
          section: "model",
          severity: "warning",
          code: "ROUTING_FALLBACK_MISSING",
          message: `라우팅 규칙 '${rule.taskType}'의 대체 모델 '${rule.fallbackModel}'이 없습니다`,
          suggestion: "대체 모델을 추가하거나 null로 설정하세요",
        })
      }
    }

    if (rule.timeoutMs < 1_000) {
      issues.push({
        section: "model",
        severity: "warning",
        code: "ROUTING_TIMEOUT_LOW",
        message: `라우팅 규칙 '${rule.taskType}'의 타임아웃(${rule.timeoutMs}ms)이 너무 짧습니다`,
        suggestion: "최소 1000ms 이상으로 설정하세요",
      })
    }
  }

  // 태스크 커버리지
  const coveredTasks = new Set(config.routingRules.map((r) => r.taskType))
  const allTasks: TaskType[] = ["generation", "matching", "validation"]
  for (const task of allTasks) {
    if (!coveredTasks.has(task)) {
      issues.push({
        section: "model",
        severity: "warning",
        code: "ROUTING_TASK_UNCOVERED",
        message: `태스크 '${task}'에 대한 라우팅 규칙이 없습니다`,
        suggestion: "기본 모델이 사용됩니다. 명시적 라우팅 규칙 추가를 권장합니다",
      })
    }
  }

  // 예산 검증
  if (config.budget.limitUsd <= 0) {
    issues.push({
      section: "model",
      severity: "error",
      code: "BUDGET_INVALID",
      message: "월 예산이 0 이하입니다",
      suggestion: "양수 값으로 설정하세요",
    })
  }

  return issues
}

// ── 안전 필터 검증 ────────────────────────────────────────────

function validateSafetyFilter(filter: SafetyFilter): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (filter.config.forbiddenWords.length === 0) {
    issues.push({
      section: "safety",
      severity: "warning",
      code: "SAFETY_NO_WORDS",
      message: "금기어 목록이 비어있습니다",
      suggestion: "기본 금기어를 추가하여 안전성을 확보하세요",
    })
  }

  // 중복 금기어 확인
  const seen = new Set<string>()
  for (const fw of filter.config.forbiddenWords) {
    const key = `${fw.word.toLowerCase()}::${fw.category}`
    if (seen.has(key)) {
      issues.push({
        section: "safety",
        severity: "warning",
        code: "SAFETY_DUPLICATE_WORD",
        message: `중복 금기어: "${fw.word}" (${fw.category})`,
        suggestion: "중복 항목을 제거하세요",
      })
    }
    seen.add(key)
  }

  // permissive / off 레벨 경고
  if (filter.config.level === "off") {
    issues.push({
      section: "safety",
      severity: "warning",
      code: "SAFETY_LEVEL_OFF",
      message: "안전 필터가 비활성화(off) 상태입니다",
      suggestion: "프로덕션 환경에서는 'moderate' 이상을 권장합니다",
    })
  } else if (filter.config.level === "permissive") {
    issues.push({
      section: "safety",
      severity: "warning",
      code: "SAFETY_LEVEL_PERMISSIVE",
      message: "필터 레벨이 'permissive'로 설정되어 있습니다",
      suggestion: "프로덕션 환경에서는 'moderate' 이상을 권장합니다",
    })
  }

  // 로그 비활성화 경고
  if (!filter.config.enableLogging) {
    issues.push({
      section: "safety",
      severity: "info",
      code: "SAFETY_LOGGING_DISABLED",
      message: "안전 필터 로깅이 비활성화되어 있습니다",
      suggestion: "감사(audit) 목적으로 로깅 활성화를 권장합니다",
    })
  }

  // 로그 용량 경고
  if (filter.logs.length > filter.config.maxLogEntries * 0.9) {
    issues.push({
      section: "safety",
      severity: "info",
      code: "SAFETY_LOG_NEAR_LIMIT",
      message: `필터 로그가 최대 용량의 90%에 도달했습니다 (${filter.logs.length}/${filter.config.maxLogEntries})`,
      suggestion: "오래된 로그를 아카이브하거나 maxLogEntries를 늘리세요",
    })
  }

  return issues
}

// ── API 매니저 검증 ───────────────────────────────────────────

function validateAPIManager(manager: APIEndpointManager): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // deprecated 버전에 active 엔드포인트 확인
  for (const version of manager.versions) {
    if (version.deprecatedAt !== null) {
      const activeInDeprecated = manager.endpoints.filter(
        (e) => e.version === version.version && e.status === "active"
      )
      if (activeInDeprecated.length > 0) {
        issues.push({
          section: "api",
          severity: "warning",
          code: "API_ACTIVE_ON_DEPRECATED",
          message: `deprecated 버전 '${version.version}'에 ${activeInDeprecated.length}개의 활성 엔드포인트가 있습니다`,
          suggestion: "엔드포인트를 deprecated 상태로 변경하거나 새 버전으로 이전하세요",
        })
      }
    }

    // sunset 경과 확인
    if (version.sunsetAt !== null && version.sunsetAt < Date.now()) {
      const stillActive = manager.endpoints.filter(
        (e) => e.version === version.version && e.status !== "disabled"
      )
      if (stillActive.length > 0) {
        issues.push({
          section: "api",
          severity: "error",
          code: "API_PAST_SUNSET",
          message: `버전 '${version.version}'이 sunset을 지났으나 ${stillActive.length}개 엔드포인트가 아직 비활성화되지 않았습니다`,
          suggestion: "해당 엔드포인트를 즉시 비활성화하세요",
        })
      }
    }
  }

  // 헬스체크 미설정 외부 엔드포인트
  const externalWithoutHealth = manager.endpoints.filter(
    (e) => e.scope === "external" && !e.healthCheck.enabled
  )
  if (externalWithoutHealth.length > 0) {
    issues.push({
      section: "api",
      severity: "warning",
      code: "API_EXTERNAL_NO_HEALTH",
      message: `${externalWithoutHealth.length}개의 외부 엔드포인트에 헬스체크가 비활성화되어 있습니다`,
      suggestion: "외부 엔드포인트에는 헬스체크 활성화를 권장합니다",
    })
  }

  // Rate Limit 극단값 확인
  for (const endpoint of manager.endpoints) {
    if (endpoint.rateLimit.requestsPerMinute > 10_000) {
      issues.push({
        section: "api",
        severity: "warning",
        code: "API_RATE_LIMIT_HIGH",
        message: `엔드포인트 '${endpoint.name}'의 Rate Limit이 매우 높습니다 (${endpoint.rateLimit.requestsPerMinute}/min)`,
        suggestion: "의도한 설정인지 확인하세요. 과도한 트래픽에 취약할 수 있습니다",
      })
    }

    if (endpoint.rateLimit.burstLimit > endpoint.rateLimit.requestsPerMinute) {
      issues.push({
        section: "api",
        severity: "warning",
        code: "API_BURST_EXCEEDS_RPM",
        message: `엔드포인트 '${endpoint.name}'의 burst(${endpoint.rateLimit.burstLimit})가 RPM(${endpoint.rateLimit.requestsPerMinute})을 초과합니다`,
        suggestion: "burst를 RPM 이하로 설정하세요",
      })
    }
  }

  // down 상태 엔드포인트 경고
  for (const [endpointId, health] of manager.healthResults) {
    if (health.status === "down") {
      const ep = manager.endpoints.find((e) => e.id === endpointId)
      issues.push({
        section: "api",
        severity: "error",
        code: "API_ENDPOINT_DOWN",
        message: `엔드포인트 '${ep?.name ?? endpointId}'이 down 상태입니다 (연속 실패: ${health.consecutiveFailures})`,
        suggestion: "엔드포인트 상태를 즉시 확인하세요",
      })
    }
  }

  return issues
}

// ── 비용 대시보드 검증 ────────────────────────────────────────

function validateCostDashboard(
  dashboard: CostDashboard,
  modelConfig: ModelConfig
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const status = getBudgetStatus(dashboard.budget)

  if (status.exceeded) {
    issues.push({
      section: "cost",
      severity: "error",
      code: "COST_BUDGET_EXCEEDED",
      message: `월 예산을 초과했습니다: $${dashboard.budget.currentSpendUsd.toFixed(2)} / $${dashboard.budget.limitUsd.toFixed(2)}`,
      suggestion: "예산을 증액하거나 비용 최적화(저비용 모델 전환)를 진행하세요",
    })
  } else if (status.usagePercent >= 80) {
    issues.push({
      section: "cost",
      severity: "warning",
      code: "COST_BUDGET_HIGH",
      message: `월 예산의 ${status.usagePercent}%를 사용했습니다`,
      suggestion: "남은 기간 동안의 소비 속도를 확인하세요",
    })
  }

  // 알림 임계값 검증
  const thresholds = dashboard.budget.alertThresholds.map((t) => t.percent)
  const expectedThresholds = [80, 90, 100]
  for (const expected of expectedThresholds) {
    if (!thresholds.includes(expected)) {
      issues.push({
        section: "cost",
        severity: "info",
        code: "COST_MISSING_THRESHOLD",
        message: `${expected}% 예산 알림 임계값이 설정되어 있지 않습니다`,
        suggestion: `${expected}% 임계값을 추가하세요`,
      })
    }
  }

  // 비용 최적화 제안: 고비용 모델 과다 사용
  if (dashboard.entries.length > 0) {
    const opusEntries = dashboard.entries.filter((e) => e.model === "claude-opus")
    const opusRatio = opusEntries.length / dashboard.entries.length
    if (opusRatio > 0.3) {
      issues.push({
        section: "cost",
        severity: "info",
        code: "COST_OPTIMIZE_MODEL",
        message: `고비용 모델(claude-opus) 사용 비율이 ${Math.round(opusRatio * 100)}%입니다`,
        suggestion: "validation/matching 작업에 claude-haiku 사용을 검토하세요",
      })
    }
  }

  // 예산 기간 만료 확인
  if (dashboard.budget.periodEnd < Date.now()) {
    issues.push({
      section: "cost",
      severity: "warning",
      code: "COST_PERIOD_EXPIRED",
      message: "현재 예산 기간이 만료되었습니다",
      suggestion: "새 예산 기간을 설정하세요",
    })
  }

  // 모델 비용 정보 일관성
  for (const model of modelConfig.models) {
    if (model.costPer1kInputTokens <= 0 || model.costPer1kOutputTokens <= 0) {
      issues.push({
        section: "cost",
        severity: "error",
        code: "COST_MODEL_PRICING_INVALID",
        message: `모델 '${model.id}'의 비용 정보가 유효하지 않습니다`,
        suggestion: "양수 값으로 비용을 설정하세요",
      })
    }
  }

  return issues
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ 최적화 제안                                                   ║
// ╚═══════════════════════════════════════════════════════════════╝

export interface OptimizationSuggestion {
  category: "cost" | "performance" | "safety" | "reliability"
  priority: "high" | "medium" | "low"
  title: string
  description: string
  estimatedImpact: string
}

export function suggestOptimizations(config: GlobalConfig): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []

  // 비용 최적화: matching에 고비용 모델 사용 중
  const matchingRule = config.modelConfig.routingRules.find((r) => r.taskType === "matching")
  if (matchingRule) {
    const matchingModel = config.modelConfig.models.find((m) => m.id === matchingRule.primaryModel)
    if (matchingModel && matchingModel.costPer1kInputTokens > 0.005) {
      suggestions.push({
        category: "cost",
        priority: "high",
        title: "매칭 작업에 저비용 모델 사용 권장",
        description: `현재 매칭에 '${matchingModel.displayName}'을 사용 중입니다. claude-haiku로 전환하면 비용을 크게 절감할 수 있습니다.`,
        estimatedImpact: "매칭 비용 최대 90% 절감",
      })
    }
  }

  // 성능: 낮은 타임아웃
  for (const rule of config.modelConfig.routingRules) {
    if (rule.taskType === "generation" && rule.timeoutMs < 20_000) {
      suggestions.push({
        category: "performance",
        priority: "medium",
        title: "생성 작업 타임아웃 증가 권장",
        description: `생성 작업의 타임아웃이 ${rule.timeoutMs}ms로 설정되어 있습니다. 복잡한 페르소나 생성 시 시간 초과가 발생할 수 있습니다.`,
        estimatedImpact: "생성 실패율 감소",
      })
    }
  }

  // 안전성: off / permissive 레벨
  if (config.safetyFilter.config.level === "off") {
    suggestions.push({
      category: "safety",
      priority: "high",
      title: "안전 필터 활성화 권장",
      description:
        "현재 안전 필터가 비활성화(off) 상태입니다. B2B 서비스 특성상 'moderate' 이상을 권장합니다.",
      estimatedImpact: "콘텐츠 안전성 확보",
    })
  } else if (config.safetyFilter.config.level === "permissive") {
    suggestions.push({
      category: "safety",
      priority: "high",
      title: "안전 필터 강도 상향 권장",
      description:
        "현재 필터 레벨이 'permissive'입니다. B2B 서비스 특성상 'moderate' 이상을 권장합니다.",
      estimatedImpact: "콘텐츠 안전성 향상",
    })
  }

  // 신뢰성: 대체 모델 미설정
  const noFallback = config.modelConfig.routingRules.filter((r) => r.fallbackModel === null)
  if (noFallback.length > 0) {
    suggestions.push({
      category: "reliability",
      priority: "medium",
      title: "대체 모델 설정 권장",
      description: `${noFallback.map((r) => r.taskType).join(", ")} 작업에 대체 모델이 설정되어 있지 않습니다.`,
      estimatedImpact: "서비스 가용성 향상",
    })
  }

  // 신뢰성: 헬스체크 미설정 엔드포인트
  const noHealthCheck = config.apiManager.endpoints.filter(
    (e) => !e.healthCheck.enabled && e.status === "active"
  )
  if (noHealthCheck.length > 0) {
    suggestions.push({
      category: "reliability",
      priority: "medium",
      title: "헬스체크 활성화 권장",
      description: `${noHealthCheck.length}개의 활성 엔드포인트에 헬스체크가 비활성화되어 있습니다.`,
      estimatedImpact: "장애 조기 감지 가능",
    })
  }

  // 비용: 예산 미설정 경고
  if (config.modelConfig.budget.limitUsd === 0) {
    suggestions.push({
      category: "cost",
      priority: "high",
      title: "월별 예산 한도 설정 권장",
      description: "예산 한도가 설정되어 있지 않습니다. 예상치 못한 비용 발생을 방지하세요.",
      estimatedImpact: "비용 통제 가능",
    })
  }

  return suggestions
}
