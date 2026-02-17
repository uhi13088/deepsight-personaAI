// ═══════════════════════════════════════════════════════════════
// PersonaWorld — KPI Tracker (Phase 7-B)
// 운영 설계서 §11.6 — 서비스 8종 + UX 6종 KPI
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type KPIStatus = "HEALTHY" | "WARNING" | "CRITICAL"

export interface KPIMetric {
  name: string
  value: number
  unit: string
  target: number
  alertThreshold: number
  status: KPIStatus
  direction: "higher_is_better" | "lower_is_better"
}

export interface ServiceKPIs {
  personaActiveRate: KPIMetric
  averagePIS: KPIMetric
  engagementPerPost: KPIMetric
  factbookViolationRate: KPIMetric
  quarantineRate: KPIMetric
  reportResolutionTime: KPIMetric
  killSwitchCount: KPIMetric
  cacheHitRate: KPIMetric
}

export interface UserExperienceKPIs {
  avgSessionDuration: KPIMetric
  feedScrollCount: KPIMetric
  followConversionRate: KPIMetric
  commentParticipationRate: KPIMetric
  onboardingCompletionRate: KPIMetric
  moderationRate: KPIMetric
}

export interface KPISummary {
  serviceKPIs: ServiceKPIs
  uxKPIs: UserExperienceKPIs
  overallHealth: KPIStatus
  healthyCount: number
  warningCount: number
  criticalCount: number
  measuredAt: Date
}

// ── KPI 상태 판정 ──────────────────────────────────────────────

function evaluateStatus(
  value: number,
  target: number,
  alertThreshold: number,
  direction: "higher_is_better" | "lower_is_better"
): KPIStatus {
  if (direction === "higher_is_better") {
    if (value >= target) return "HEALTHY"
    if (value >= alertThreshold) return "WARNING"
    return "CRITICAL"
  } else {
    if (value <= target) return "HEALTHY"
    if (value <= alertThreshold) return "WARNING"
    return "CRITICAL"
  }
}

// ── KPI 메트릭 생성 ──────────────────────────────────────────

function createMetric(params: {
  name: string
  value: number
  unit: string
  target: number
  alertThreshold: number
  direction: "higher_is_better" | "lower_is_better"
}): KPIMetric {
  return {
    ...params,
    status: evaluateStatus(params.value, params.target, params.alertThreshold, params.direction),
  }
}

// ── Service KPIs 계산 ──────────────────────────────────────────

export interface ServiceKPIInput {
  activePersonas: number
  totalPersonas: number
  averagePIS: number
  totalLikes: number
  totalComments: number
  totalPosts: number
  factbookViolations: number
  quarantinedContent: number
  totalContent: number
  avgReportResolutionMinutes: number
  killSwitchActivations: number
  cacheHits: number
  totalLLMCalls: number
}

export function computeServiceKPIs(input: ServiceKPIInput): ServiceKPIs {
  const activeRate =
    input.totalPersonas > 0 ? (input.activePersonas / input.totalPersonas) * 100 : 0

  const engagementPerPost =
    input.totalPosts > 0 ? (input.totalLikes + input.totalComments) / input.totalPosts : 0

  const violationRate =
    input.totalPosts > 0 ? (input.factbookViolations / input.totalPosts) * 100 : 0

  const quarantineRate =
    input.totalContent > 0 ? (input.quarantinedContent / input.totalContent) * 100 : 0

  const cacheHitRate = input.totalLLMCalls > 0 ? (input.cacheHits / input.totalLLMCalls) * 100 : 0

  return {
    personaActiveRate: createMetric({
      name: "페르소나 활성률",
      value: round(activeRate),
      unit: "%",
      target: 90,
      alertThreshold: 85,
      direction: "higher_is_better",
    }),
    averagePIS: createMetric({
      name: "평균 PIS",
      value: round(input.averagePIS),
      unit: "",
      target: 0.8,
      alertThreshold: 0.75,
      direction: "higher_is_better",
    }),
    engagementPerPost: createMetric({
      name: "포스트당 인터랙션",
      value: round(engagementPerPost),
      unit: "",
      target: 10,
      alertThreshold: 5,
      direction: "higher_is_better",
    }),
    factbookViolationRate: createMetric({
      name: "팩트북 위반율",
      value: round(violationRate),
      unit: "%",
      target: 1,
      alertThreshold: 2,
      direction: "lower_is_better",
    }),
    quarantineRate: createMetric({
      name: "격리 비율",
      value: round(quarantineRate),
      unit: "%",
      target: 2,
      alertThreshold: 5,
      direction: "lower_is_better",
    }),
    reportResolutionTime: createMetric({
      name: "신고 처리 시간",
      value: round(input.avgReportResolutionMinutes),
      unit: "분",
      target: 30,
      alertThreshold: 60,
      direction: "lower_is_better",
    }),
    killSwitchCount: createMetric({
      name: "Kill Switch 발동",
      value: input.killSwitchActivations,
      unit: "회/월",
      target: 0,
      alertThreshold: 0,
      direction: "lower_is_better",
    }),
    cacheHitRate: createMetric({
      name: "Cache Hit Rate",
      value: round(cacheHitRate),
      unit: "%",
      target: 80,
      alertThreshold: 70,
      direction: "higher_is_better",
    }),
  }
}

// ── UX KPIs 계산 ──────────────────────────────────────────────

export interface UXKPIInput {
  avgSessionDurationMinutes: number
  avgFeedScrollCount: number
  profileVisits: number
  follows: number
  feedImpressions: number
  commentsWritten: number
  onboardingStarted: number
  onboardingCompleted: number
  totalContent: number
  moderatedContent: number
}

export function computeUserExperienceKPIs(input: UXKPIInput): UserExperienceKPIs {
  const followConversion = input.profileVisits > 0 ? (input.follows / input.profileVisits) * 100 : 0

  const commentParticipation =
    input.feedImpressions > 0 ? (input.commentsWritten / input.feedImpressions) * 100 : 0

  const onboardingCompletion =
    input.onboardingStarted > 0 ? (input.onboardingCompleted / input.onboardingStarted) * 100 : 0

  const moderationRate =
    input.totalContent > 0 ? (input.moderatedContent / input.totalContent) * 100 : 0

  return {
    avgSessionDuration: createMetric({
      name: "유저 체류시간",
      value: round(input.avgSessionDurationMinutes),
      unit: "분",
      target: 10,
      alertThreshold: 5,
      direction: "higher_is_better",
    }),
    feedScrollCount: createMetric({
      name: "피드 스크롤 수",
      value: round(input.avgFeedScrollCount),
      unit: "회",
      target: 30,
      alertThreshold: 15,
      direction: "higher_is_better",
    }),
    followConversionRate: createMetric({
      name: "팔로우 전환율",
      value: round(followConversion),
      unit: "%",
      target: 20,
      alertThreshold: 10,
      direction: "higher_is_better",
    }),
    commentParticipationRate: createMetric({
      name: "댓글 참여율",
      value: round(commentParticipation),
      unit: "%",
      target: 5,
      alertThreshold: 2,
      direction: "higher_is_better",
    }),
    onboardingCompletionRate: createMetric({
      name: "온보딩 완료율",
      value: round(onboardingCompletion),
      unit: "%",
      target: 70,
      alertThreshold: 50,
      direction: "higher_is_better",
    }),
    moderationRate: createMetric({
      name: "모더레이션 비율",
      value: round(moderationRate),
      unit: "%",
      target: 1,
      alertThreshold: 3,
      direction: "lower_is_better",
    }),
  }
}

// ── 종합 KPI Summary ──────────────────────────────────────────

/**
 * 전체 KPI 요약 계산.
 */
export function computeKPISummary(serviceInput: ServiceKPIInput, uxInput: UXKPIInput): KPISummary {
  const serviceKPIs = computeServiceKPIs(serviceInput)
  const uxKPIs = computeUserExperienceKPIs(uxInput)

  const allMetrics: KPIMetric[] = [...Object.values(serviceKPIs), ...Object.values(uxKPIs)]

  const healthyCount = allMetrics.filter((m) => m.status === "HEALTHY").length
  const warningCount = allMetrics.filter((m) => m.status === "WARNING").length
  const criticalCount = allMetrics.filter((m) => m.status === "CRITICAL").length

  let overallHealth: KPIStatus = "HEALTHY"
  if (criticalCount > 0) overallHealth = "CRITICAL"
  else if (warningCount > 2) overallHealth = "WARNING"

  return {
    serviceKPIs,
    uxKPIs,
    overallHealth,
    healthyCount,
    warningCount,
    criticalCount,
    measuredAt: new Date(),
  }
}

// ── KPI 트렌드 ────────────────────────────────────────────────

export interface KPITrendPoint {
  date: string
  value: number
}

export interface KPITrend {
  metricName: string
  points: KPITrendPoint[]
  trend: "improving" | "stable" | "declining"
}

/**
 * KPI 트렌드 분석.
 */
export function analyzeKPITrend(
  metricName: string,
  points: KPITrendPoint[],
  direction: "higher_is_better" | "lower_is_better"
): KPITrend {
  if (points.length < 2) {
    return { metricName, points, trend: "stable" }
  }

  const recent = points.slice(-3)
  const values = recent.map((p) => p.value)
  const first = values[0]
  const last = values[values.length - 1]
  const change = last - first

  const threshold = Math.abs(first) * 0.05 // 5% 변화 기준

  let trend: KPITrend["trend"]
  if (Math.abs(change) < threshold) {
    trend = "stable"
  } else if (direction === "higher_is_better") {
    trend = change > 0 ? "improving" : "declining"
  } else {
    trend = change < 0 ? "improving" : "declining"
  }

  return { metricName, points, trend }
}

// ── 유틸리티 ──────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
