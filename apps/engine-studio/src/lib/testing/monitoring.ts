// ═══════════════════════════════════════════════════════════════
// 성과 모니터링
// T55-AC5: 핵심 지표, 알림 설정, 개선 제안
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export interface PerformanceMetrics {
  personaId: string
  impressions: number
  clicks: number
  likes: number
  dislikes: number
  engagementTimeTotal: number // seconds
  conversions: number
  period: { startDate: number; endDate: number }
}

export interface ComputedMetrics {
  ctr: number // (clicks / impressions) × 100
  satisfaction: number // (likes / (likes + dislikes)) × 100
  engagementTimeAvg: number // seconds per impression
  conversionRate: number // (conversions / impressions) × 100
}

export type AlertType = "low_ctr" | "user_dissatisfaction" | "traffic_spike" | "quality_drop"
export type AlertSeverity = "info" | "warning" | "critical"

export interface MonitoringAlert {
  id: string
  personaId: string
  type: AlertType
  severity: AlertSeverity
  message: string
  triggeredAt: number
  acknowledged: boolean
}

export interface AlertThresholds {
  minCtr: number // 아래면 알림 (기본 5)
  maxDislikeRatio: number // 위면 알림 (기본 0.3)
  maxImpressionSpike: number // 평균 대비 배율 (기본 3)
  minQualityScore: number // 아래면 알림 (기본 50)
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  minCtr: 5,
  maxDislikeRatio: 0.3,
  maxImpressionSpike: 3,
  minQualityScore: 50,
}

export interface ImprovementSuggestion {
  personaId: string
  suggestion: string
  affectedMetric: string
  priority: "low" | "medium" | "high"
}

export interface DashboardData {
  summaryMetrics: ComputedMetrics
  personaMetrics: Array<{ personaId: string; metrics: ComputedMetrics }>
  alerts: MonitoringAlert[]
  suggestions: ImprovementSuggestion[]
}

// ── 지표 계산 ───────────────────────────────────────────────────

export function computeMetrics(raw: PerformanceMetrics): ComputedMetrics {
  const ctr = raw.impressions > 0 ? round((raw.clicks / raw.impressions) * 100) : 0
  const totalReactions = raw.likes + raw.dislikes
  const satisfaction = totalReactions > 0 ? round((raw.likes / totalReactions) * 100) : 0
  const engagementTimeAvg =
    raw.impressions > 0 ? round(raw.engagementTimeTotal / raw.impressions) : 0
  const conversionRate = raw.impressions > 0 ? round((raw.conversions / raw.impressions) * 100) : 0

  return { ctr, satisfaction, engagementTimeAvg, conversionRate }
}

// ── 알림 생성 ───────────────────────────────────────────────────

export function checkAlerts(
  raw: PerformanceMetrics,
  computed: ComputedMetrics,
  avgImpressions: number = 0,
  qualityScore: number | null = null,
  thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS
): MonitoringAlert[] {
  const alerts: MonitoringAlert[] = []

  // Low CTR
  if (raw.impressions >= 10 && computed.ctr < thresholds.minCtr) {
    alerts.push({
      id: `alert_${Date.now()}_ctr`,
      personaId: raw.personaId,
      type: "low_ctr",
      severity: computed.ctr < thresholds.minCtr / 2 ? "critical" : "warning",
      message: `CTR이 ${computed.ctr}%로 기준(${thresholds.minCtr}%) 미달`,
      triggeredAt: Date.now(),
      acknowledged: false,
    })
  }

  // User dissatisfaction
  const totalReactions = raw.likes + raw.dislikes
  if (totalReactions >= 5) {
    const dislikeRatio = raw.dislikes / totalReactions
    if (dislikeRatio > thresholds.maxDislikeRatio) {
      alerts.push({
        id: `alert_${Date.now()}_dislike`,
        personaId: raw.personaId,
        type: "user_dissatisfaction",
        severity: dislikeRatio > 0.5 ? "critical" : "warning",
        message: `비호감 비율 ${round(dislikeRatio * 100)}% (기준: ${thresholds.maxDislikeRatio * 100}%)`,
        triggeredAt: Date.now(),
        acknowledged: false,
      })
    }
  }

  // Traffic spike
  if (avgImpressions > 0 && raw.impressions > avgImpressions * thresholds.maxImpressionSpike) {
    alerts.push({
      id: `alert_${Date.now()}_spike`,
      personaId: raw.personaId,
      type: "traffic_spike",
      severity: "info",
      message: `노출 수 ${raw.impressions}이 평균(${Math.round(avgImpressions)})의 ${round(raw.impressions / avgImpressions)}배`,
      triggeredAt: Date.now(),
      acknowledged: false,
    })
  }

  // Quality drop
  if (qualityScore !== null && qualityScore < thresholds.minQualityScore) {
    alerts.push({
      id: `alert_${Date.now()}_quality`,
      personaId: raw.personaId,
      type: "quality_drop",
      severity: qualityScore < thresholds.minQualityScore / 2 ? "critical" : "warning",
      message: `품질 점수 ${qualityScore}점 (기준: ${thresholds.minQualityScore}점)`,
      triggeredAt: Date.now(),
      acknowledged: false,
    })
  }

  return alerts
}

// ── 알림 확인 ───────────────────────────────────────────────────

export function acknowledgeAlert(alert: MonitoringAlert): MonitoringAlert {
  return { ...alert, acknowledged: true }
}

// ── 개선 제안 ───────────────────────────────────────────────────

export function generateSuggestions(
  computed: ComputedMetrics,
  qualityScore: number | null = null
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = []
  const personaId = "" // 호출 시 설정

  if (computed.ctr < 10) {
    suggestions.push({
      personaId,
      suggestion: "프롬프트의 첫 인상 표현을 강화하여 클릭율을 개선하세요",
      affectedMetric: "ctr",
      priority: computed.ctr < 5 ? "high" : "medium",
    })
  }

  if (computed.satisfaction < 70) {
    suggestions.push({
      personaId,
      suggestion: "벡터 정합성을 확인하고 톤/스타일을 조정하세요",
      affectedMetric: "satisfaction",
      priority: computed.satisfaction < 50 ? "high" : "medium",
    })
  }

  if (computed.engagementTimeAvg < 10) {
    suggestions.push({
      personaId,
      suggestion: "응답 길이와 깊이를 늘려 체류 시간을 개선하세요",
      affectedMetric: "engagement",
      priority: "low",
    })
  }

  if (computed.conversionRate < 2) {
    suggestions.push({
      personaId,
      suggestion: "추천 콘텐츠의 관련성을 높여 전환율을 개선하세요",
      affectedMetric: "conversion",
      priority: "medium",
    })
  }

  if (qualityScore !== null && qualityScore < 60) {
    suggestions.push({
      personaId,
      suggestion: "Auto-Interview를 재실시하고 벡터 설계를 점검하세요",
      affectedMetric: "quality",
      priority: "high",
    })
  }

  return suggestions
}

// ── 대시보드 데이터 조립 ────────────────────────────────────────

export function buildDashboardData(
  allRawMetrics: PerformanceMetrics[],
  avgImpressions: number = 0,
  qualityScores: Record<string, number> = {}
): DashboardData {
  if (allRawMetrics.length === 0) {
    return {
      summaryMetrics: { ctr: 0, satisfaction: 0, engagementTimeAvg: 0, conversionRate: 0 },
      personaMetrics: [],
      alerts: [],
      suggestions: [],
    }
  }

  // 전체 요약
  const totalRaw: PerformanceMetrics = {
    personaId: "all",
    impressions: allRawMetrics.reduce((s, m) => s + m.impressions, 0),
    clicks: allRawMetrics.reduce((s, m) => s + m.clicks, 0),
    likes: allRawMetrics.reduce((s, m) => s + m.likes, 0),
    dislikes: allRawMetrics.reduce((s, m) => s + m.dislikes, 0),
    engagementTimeTotal: allRawMetrics.reduce((s, m) => s + m.engagementTimeTotal, 0),
    conversions: allRawMetrics.reduce((s, m) => s + m.conversions, 0),
    period: {
      startDate: Math.min(...allRawMetrics.map((m) => m.period.startDate)),
      endDate: Math.max(...allRawMetrics.map((m) => m.period.endDate)),
    },
  }
  const summaryMetrics = computeMetrics(totalRaw)

  // 페르소나별
  const personaMetrics = allRawMetrics.map((raw) => ({
    personaId: raw.personaId,
    metrics: computeMetrics(raw),
  }))

  // 알림 수집
  const alerts: MonitoringAlert[] = []
  for (const raw of allRawMetrics) {
    const computed = computeMetrics(raw)
    const qs = qualityScores[raw.personaId] ?? null
    alerts.push(...checkAlerts(raw, computed, avgImpressions, qs))
  }

  // 개선 제안
  const suggestions = generateSuggestions(summaryMetrics)

  return { summaryMetrics, personaMetrics, alerts, suggestions }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
