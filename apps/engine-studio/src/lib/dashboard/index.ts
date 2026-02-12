// ═══════════════════════════════════════════════════════════════
// Dashboard Module
// T70: 대시보드 — 시스템 헬스, 매칭 성과, 활동 로그, 퀵 액션
// ═══════════════════════════════════════════════════════════════

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC1: 시스템 헬스 개요 (API 상태, 응답 시간, 에러율)           ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── 타입 정의 ─────────────────────────────────────────────────

export type ServiceStatusLevel = "healthy" | "degraded" | "down"

export type HealthGrade = "A" | "B" | "C" | "D" | "F"

export interface ServiceStatus {
  name: string
  status: ServiceStatusLevel
  uptime: number // 0~1 (percentage as decimal)
  responseTimeMs: number
  errorRate: number // 0~1 (percentage as decimal)
}

export interface SystemHealth {
  services: ServiceStatus[]
  overallStatus: ServiceStatusLevel
  lastChecked: number // epoch ms
}

// ── 시스템 헬스 함수 ──────────────────────────────────────────

/**
 * 개별 서비스 상태들로부터 전체 시스템 상태를 결정한다.
 *
 * - 1개라도 down 이면 전체 down
 * - 1개라도 degraded 이면 전체 degraded
 * - 모두 healthy 이면 전체 healthy
 */
export function calculateOverallStatus(services: ServiceStatus[]): ServiceStatusLevel {
  if (services.length === 0) return "down"

  const hasDown = services.some((s) => s.status === "down")
  if (hasDown) return "down"

  const hasDegraded = services.some((s) => s.status === "degraded")
  if (hasDegraded) return "degraded"

  return "healthy"
}

/**
 * 서비스 목록으로 SystemHealth 객체를 빌드한다.
 */
export function buildSystemHealth(services: ServiceStatus[]): SystemHealth {
  return {
    services: [...services],
    overallStatus: calculateOverallStatus(services),
    lastChecked: Date.now(),
  }
}

/**
 * 서비스 상태 점수(0~100)를 헬스 등급(A~F)으로 변환한다.
 *
 * - A: 90~100 (우수)
 * - B: 75~89 (양호)
 * - C: 60~74 (보통)
 * - D: 40~59 (주의)
 * - F: 0~39 (위험)
 */
export function healthScoreToGrade(score: number): HealthGrade {
  const clamped = Math.max(0, Math.min(100, score))
  if (clamped >= 90) return "A"
  if (clamped >= 75) return "B"
  if (clamped >= 60) return "C"
  if (clamped >= 40) return "D"
  return "F"
}

/**
 * 서비스 목록으로 전체 헬스 점수(0~100)를 계산한다.
 *
 * 각 서비스 점수 = uptime 가중 40% + 응답시간 가중 30% + 에러율 가중 30%
 * - uptime 점수: uptime * 100
 * - 응답시간 점수: 100ms 이하=100, 100~1000ms 선형 감소, 1000ms 이상=0
 * - 에러율 점수: (1 - errorRate) * 100, 단 에러율 5% 이상=0
 */
export function calculateHealthScore(services: ServiceStatus[]): number {
  if (services.length === 0) return 0

  let totalScore = 0

  for (const service of services) {
    const uptimeScore = service.uptime * 100

    let responseScore: number
    if (service.responseTimeMs <= 100) {
      responseScore = 100
    } else if (service.responseTimeMs >= 1000) {
      responseScore = 0
    } else {
      responseScore = ((1000 - service.responseTimeMs) / 900) * 100
    }

    let errorScore: number
    if (service.errorRate >= 0.05) {
      errorScore = 0
    } else {
      errorScore = (1 - service.errorRate / 0.05) * 100
    }

    const serviceScore = uptimeScore * 0.4 + responseScore * 0.3 + errorScore * 0.3
    totalScore += serviceScore
  }

  return round(totalScore / services.length)
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC2: 매칭 성과 요약 (Tier별 분포, 평균 매칭률, 트렌드)       ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── 타입 정의 ─────────────────────────────────────────────────

/** 매칭 품질 등급 (S=최상, A=우수, B=양호, C=보통, D=미달) */
export type MatchingScoreTier = "S" | "A" | "B" | "C" | "D"

export type TrendDirection = "up" | "down" | "stable"

export interface TierDistribution {
  tier: MatchingScoreTier
  count: number
  percentage: number // 0~100
}

export interface MatchingPerformance {
  totalMatches: number
  averageScore: number // 0~1
  tierDistribution: TierDistribution[]
  trendDirection: TrendDirection
  periodDays: number
}

export interface MatchingTrendPoint {
  period: string // "2026-02-12", "Week 7" 등
  value: number // 0~1 평균 매칭 점수
}

export interface MatchingTrend {
  period: string // "daily" | "weekly" 등
  values: MatchingTrendPoint[]
}

// ── 매칭 등급 임계값 ────────────────────────────────────────────

const TIER_THRESHOLDS: { tier: MatchingScoreTier; min: number }[] = [
  { tier: "S", min: 0.9 },
  { tier: "A", min: 0.75 },
  { tier: "B", min: 0.6 },
  { tier: "C", min: 0.4 },
  { tier: "D", min: 0 },
]

// ── 매칭 성과 함수 ───────────────────────────────────────────

/**
 * 점수를 매칭 품질 등급으로 변환한다.
 *
 * - S: 0.90~1.00
 * - A: 0.75~0.89
 * - B: 0.60~0.74
 * - C: 0.40~0.59
 * - D: 0.00~0.39
 */
export function scoreToTier(score: number): MatchingScoreTier {
  const clamped = Math.max(0, Math.min(1, score))
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (clamped >= min) return tier
  }
  return "D"
}

/**
 * 점수 배열에서 Tier별 분포를 계산한다.
 */
export function calculateTierDistribution(scores: number[]): TierDistribution[] {
  const counts: Record<MatchingScoreTier, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 }

  for (const score of scores) {
    const tier = scoreToTier(score)
    counts[tier]++
  }

  const total = scores.length
  const allTiers: MatchingScoreTier[] = ["S", "A", "B", "C", "D"]

  return allTiers.map((tier) => ({
    tier,
    count: counts[tier],
    percentage: total > 0 ? round((counts[tier] / total) * 100) : 0,
  }))
}

/**
 * 트렌드 포인트에서 트렌드 방향을 판별한다.
 *
 * 전반부 평균 vs 후반부 평균 비교:
 * - 5% 이상 상승 → "up"
 * - 5% 이상 하락 → "down"
 * - 그 외 → "stable"
 */
export function calculateTrend(points: MatchingTrendPoint[]): TrendDirection {
  if (points.length < 2) return "stable"

  const half = Math.floor(points.length / 2)
  const firstHalf = points.slice(0, half)
  const secondHalf = points.slice(half)

  const firstAvg = firstHalf.reduce((s, p) => s + p.value, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((s, p) => s + p.value, 0) / secondHalf.length

  if (firstAvg === 0) {
    return secondAvg > 0 ? "up" : "stable"
  }

  const changeRate = (secondAvg - firstAvg) / firstAvg

  if (changeRate > 0.05) return "up"
  if (changeRate < -0.05) return "down"
  return "stable"
}

/**
 * 두 기간의 매칭 성과를 비교한다.
 *
 * 반환: 점수 변화량, 변화율, 방향
 */
export function comparePeriods(
  currentScores: number[],
  previousScores: number[]
): {
  currentAvg: number
  previousAvg: number
  change: number
  changeRate: number
  direction: TrendDirection
} {
  const currentAvg =
    currentScores.length > 0
      ? round(currentScores.reduce((a, b) => a + b, 0) / currentScores.length)
      : 0
  const previousAvg =
    previousScores.length > 0
      ? round(previousScores.reduce((a, b) => a + b, 0) / previousScores.length)
      : 0

  const change = round(currentAvg - previousAvg)
  const changeRate = previousAvg > 0 ? round((currentAvg - previousAvg) / previousAvg) : 0

  let direction: TrendDirection = "stable"
  if (changeRate > 0.05) direction = "up"
  else if (changeRate < -0.05) direction = "down"

  return { currentAvg, previousAvg, change, changeRate, direction }
}

/**
 * 매칭 점수 배열과 트렌드 데이터로 MatchingPerformance를 빌드한다.
 */
export function buildMatchingPerformance(
  scores: number[],
  trendPoints: MatchingTrendPoint[],
  periodDays: number
): MatchingPerformance {
  const totalMatches = scores.length
  const averageScore =
    totalMatches > 0 ? round(scores.reduce((a, b) => a + b, 0) / totalMatches) : 0
  const tierDistribution = calculateTierDistribution(scores)
  const trendDirection = calculateTrend(trendPoints)

  return {
    totalMatches,
    averageScore,
    tierDistribution,
    trendDirection,
    periodDays,
  }
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC3: 최근 활동 로그                                           ║
// ║ 페르소나 생성/수정, 매칭 실행, 시스템 이벤트                    ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── 타입 정의 ─────────────────────────────────────────────────

export type ActivityType =
  | "persona_created"
  | "persona_updated"
  | "persona_deleted"
  | "matching_executed"
  | "incubator_run"
  | "system_event"
  | "config_changed"

export interface ActivityEntry {
  id: string
  type: ActivityType
  title: string
  description: string
  actorId: string
  timestamp: number // epoch ms
  metadata: Record<string, string | number | boolean>
}

export interface ActivityPagination {
  page: number
  pageSize: number
  totalEntries: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ActivityFeed {
  entries: ActivityEntry[]
  pagination: ActivityPagination
}

export interface ActivitySummary {
  totalCount: number
  countByType: Record<ActivityType, number>
  mostRecentAt: number | null
  uniqueActors: number
}

// ── 활동 로그 함수 ───────────────────────────────────────────

/**
 * 활동 항목 목록으로 ActivityFeed를 빌드한다.
 * 최신 순으로 정렬하고 페이지네이션을 적용한다.
 */
export function buildActivityFeed(
  entries: ActivityEntry[],
  page: number = 1,
  pageSize: number = 20
): ActivityFeed {
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp)

  const safePage = Math.max(1, page)
  const safePageSize = Math.max(1, Math.min(100, pageSize))
  const totalEntries = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalEntries / safePageSize))
  const clampedPage = Math.min(safePage, totalPages)

  const startIdx = (clampedPage - 1) * safePageSize
  const pageEntries = sorted.slice(startIdx, startIdx + safePageSize)

  return {
    entries: pageEntries,
    pagination: {
      page: clampedPage,
      pageSize: safePageSize,
      totalEntries,
      totalPages,
      hasNext: clampedPage < totalPages,
      hasPrev: clampedPage > 1,
    },
  }
}

/**
 * 활동 항목을 필터링한다.
 *
 * - types: 포함할 활동 유형 (비어있으면 전체)
 * - actorId: 특정 사용자의 활동만
 * - startTime / endTime: 시간 범위
 */
export function filterActivities(
  entries: ActivityEntry[],
  filters: {
    types?: ActivityType[]
    actorId?: string
    startTime?: number
    endTime?: number
  }
): ActivityEntry[] {
  let filtered = [...entries]

  if (filters.types && filters.types.length > 0) {
    const typeSet = new Set(filters.types)
    filtered = filtered.filter((e) => typeSet.has(e.type))
  }

  if (filters.actorId !== undefined) {
    filtered = filtered.filter((e) => e.actorId === filters.actorId)
  }

  if (filters.startTime !== undefined) {
    filtered = filtered.filter((e) => e.timestamp >= filters.startTime!)
  }

  if (filters.endTime !== undefined) {
    filtered = filtered.filter((e) => e.timestamp <= filters.endTime!)
  }

  return filtered
}

/**
 * 활동 항목의 요약 통계를 반환한다.
 */
export function getActivitySummary(entries: ActivityEntry[]): ActivitySummary {
  const countByType: Record<ActivityType, number> = {
    persona_created: 0,
    persona_updated: 0,
    persona_deleted: 0,
    matching_executed: 0,
    incubator_run: 0,
    system_event: 0,
    config_changed: 0,
  }

  const actorSet = new Set<string>()
  let mostRecentAt: number | null = null

  for (const entry of entries) {
    countByType[entry.type]++
    actorSet.add(entry.actorId)

    if (mostRecentAt === null || entry.timestamp > mostRecentAt) {
      mostRecentAt = entry.timestamp
    }
  }

  return {
    totalCount: entries.length,
    countByType,
    mostRecentAt,
    uniqueActors: actorSet.size,
  }
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC4: 퀵 액션                                                  ║
// ║ 페르소나 생성, 시뮬레이션, 인큐베이터 실행                     ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── 타입 정의 ─────────────────────────────────────────────────

export type QuickActionCategory = "persona" | "matching" | "incubator" | "system"

export interface QuickAction {
  id: string
  label: string
  description: string
  icon: string
  category: QuickActionCategory
  enabled: boolean
  requiredPermission: string
}

export type QuickActionResultStatus = "success" | "error" | "pending"

export interface QuickActionResult {
  actionId: string
  status: QuickActionResultStatus
  message: string
  redirectUrl: string | null
  executedAt: number
}

// ── 기본 퀵 액션 ─────────────────────────────────────────────

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: "qa_persona_create",
    label: "페르소나 생성",
    description: "새로운 AI 페르소나를 4단계 플로우로 생성합니다",
    icon: "user-plus",
    category: "persona",
    enabled: true,
    requiredPermission: "persona:create",
  },
  {
    id: "qa_persona_import",
    label: "페르소나 가져오기",
    description: "JSON 또는 템플릿에서 페르소나를 가져옵니다",
    icon: "upload",
    category: "persona",
    enabled: true,
    requiredPermission: "persona:create",
  },
  {
    id: "qa_matching_simulate",
    label: "매칭 시뮬레이션",
    description: "가상 유저와 페르소나 간의 매칭을 시뮬레이션합니다",
    icon: "shuffle",
    category: "matching",
    enabled: true,
    requiredPermission: "matching:simulate",
  },
  {
    id: "qa_matching_batch",
    label: "배치 매칭",
    description: "다수 유저-페르소나 매칭을 일괄 실행합니다",
    icon: "layers",
    category: "matching",
    enabled: true,
    requiredPermission: "matching:execute",
  },
  {
    id: "qa_incubator_run",
    label: "인큐베이터 실행",
    description: "Daily Batch 인큐베이터를 수동으로 실행합니다",
    icon: "flask",
    category: "incubator",
    enabled: true,
    requiredPermission: "incubator:execute",
  },
  {
    id: "qa_incubator_golden",
    label: "골든 샘플 검토",
    description: "골든 샘플 페르소나의 품질을 검토합니다",
    icon: "star",
    category: "incubator",
    enabled: true,
    requiredPermission: "incubator:read",
  },
  {
    id: "qa_system_health_check",
    label: "헬스 체크",
    description: "전체 시스템의 헬스 상태를 즉시 확인합니다",
    icon: "heart-pulse",
    category: "system",
    enabled: true,
    requiredPermission: "system:read",
  },
  {
    id: "qa_system_export",
    label: "데이터 내보내기",
    description: "페르소나 및 매칭 데이터를 CSV/JSON으로 내보냅니다",
    icon: "download",
    category: "system",
    enabled: true,
    requiredPermission: "system:export",
  },
]

// ── 퀵 액션 함수 ─────────────────────────────────────────────

/**
 * 사용자 권한 목록으로 사용 가능한 퀵 액션만 필터링한다.
 * enabled=false인 액션도 제외한다.
 */
export function getAvailableActions(
  permissions: string[],
  actions: QuickAction[] = DEFAULT_QUICK_ACTIONS
): QuickAction[] {
  const permSet = new Set(permissions)
  return actions.filter((a) => a.enabled && permSet.has(a.requiredPermission))
}

/**
 * 카테고리별로 퀵 액션을 그룹화한다.
 */
export function groupActionsByCategory(
  actions: QuickAction[]
): Record<QuickActionCategory, QuickAction[]> {
  const grouped: Record<QuickActionCategory, QuickAction[]> = {
    persona: [],
    matching: [],
    incubator: [],
    system: [],
  }

  for (const action of actions) {
    grouped[action.category].push(action)
  }

  return grouped
}

/**
 * 퀵 액션을 실행한다 (stub).
 *
 * 실제 구현에서는 각 액션 ID에 맞는 로직을 호출하며,
 * 여기서는 액션 결과 구조만 반환한다.
 */
export function executeQuickAction(actionId: string): QuickActionResult {
  const action = DEFAULT_QUICK_ACTIONS.find((a) => a.id === actionId)

  if (!action) {
    return {
      actionId,
      status: "error",
      message: `알 수 없는 액션: ${actionId}`,
      redirectUrl: null,
      executedAt: Date.now(),
    }
  }

  if (!action.enabled) {
    return {
      actionId,
      status: "error",
      message: `비활성화된 액션: ${action.label}`,
      redirectUrl: null,
      executedAt: Date.now(),
    }
  }

  // 액션별 리다이렉트 URL 매핑
  const redirectMap: Record<string, string> = {
    qa_persona_create: "/personas/new",
    qa_persona_import: "/personas/import",
    qa_matching_simulate: "/matching/simulator",
    qa_matching_batch: "/matching/batch",
    qa_incubator_run: "/incubator",
    qa_incubator_golden: "/incubator/golden-samples",
    qa_system_health_check: "/system/health",
    qa_system_export: "/system/export",
  }

  return {
    actionId,
    status: "success",
    message: `${action.label} 액션이 실행되었습니다`,
    redirectUrl: redirectMap[actionId] ?? null,
    executedAt: Date.now(),
  }
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ 전체 대시보드 조합                                             ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── 타입 정의 ─────────────────────────────────────────────────

export interface DashboardState {
  health: SystemHealth
  matchingPerformance: MatchingPerformance
  activityFeed: ActivityFeed
  quickActions: QuickAction[]
  generatedAt: number
}

export interface DashboardSummary {
  // 헬스
  healthGrade: HealthGrade
  healthScore: number
  serviceCount: number
  servicesDown: number

  // 매칭
  totalMatches: number
  averageMatchScore: number
  matchTrend: TrendDirection
  topTierPercentage: number // S+A 비율

  // 활동
  recentActivityCount: number
  activeActors: number

  // 퀵 액션
  availableActionCount: number
}

// ── 대시보드 빌드 함수 ──────────────────────────────────────────

/**
 * 전체 대시보드 상태를 조합한다.
 */
export function buildDashboard(params: {
  services: ServiceStatus[]
  matchingScores: number[]
  trendPoints: MatchingTrendPoint[]
  periodDays: number
  activities: ActivityEntry[]
  activityPage?: number
  activityPageSize?: number
  userPermissions: string[]
}): DashboardState {
  const health = buildSystemHealth(params.services)
  const matchingPerformance = buildMatchingPerformance(
    params.matchingScores,
    params.trendPoints,
    params.periodDays
  )
  const activityFeed = buildActivityFeed(
    params.activities,
    params.activityPage,
    params.activityPageSize
  )
  const quickActions = getAvailableActions(params.userPermissions)

  return {
    health,
    matchingPerformance,
    activityFeed,
    quickActions,
    generatedAt: Date.now(),
  }
}

/**
 * 대시보드 상태에서 핵심 요약 메트릭을 추출한다.
 */
export function getDashboardSummary(state: DashboardState): DashboardSummary {
  const healthScore = calculateHealthScore(state.health.services)
  const healthGrade = healthScoreToGrade(healthScore)
  const servicesDown = state.health.services.filter((s) => s.status === "down").length

  // S+A 티어 비율 계산
  const saTiers = state.matchingPerformance.tierDistribution.filter(
    (t) => t.tier === "S" || t.tier === "A"
  )
  const topTierPercentage = saTiers.reduce((sum, t) => sum + t.percentage, 0)

  const activitySummary = getActivitySummary(state.activityFeed.entries)

  return {
    healthGrade,
    healthScore,
    serviceCount: state.health.services.length,
    servicesDown,

    totalMatches: state.matchingPerformance.totalMatches,
    averageMatchScore: state.matchingPerformance.averageScore,
    matchTrend: state.matchingPerformance.trendDirection,
    topTierPercentage: round(topTierPercentage),

    recentActivityCount: state.activityFeed.pagination.totalEntries,
    activeActors: activitySummary.uniqueActors,

    availableActionCount: state.quickActions.length,
  }
}

// ═══════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════

function round(v: number): number {
  return Math.round(v * 100) / 100
}
