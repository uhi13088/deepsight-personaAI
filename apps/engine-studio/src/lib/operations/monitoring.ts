// ═══════════════════════════════════════════════════════════════
// System Monitoring — 실시간 대시보드, 알림, 로그 검색, 용량 계획
// ═══════════════════════════════════════════════════════════════

import { type MetricType, roundMetric } from "./types"
export type { MetricType } from "./types"

export interface MetricDataPoint {
  timestamp: number
  value: number
  metricType: MetricType
  source: string
  labels: Record<string, string>
}

export interface MetricThreshold {
  metricType: MetricType
  warningLevel: number
  criticalLevel: number
  comparison: "above" | "below"
}

export interface ThresholdAlert {
  id: string
  metricType: MetricType
  currentValue: number
  threshold: number
  level: "warning" | "critical"
  source: string
  triggeredAt: number
  message: string
  acknowledged: boolean
}

export interface LogEntry {
  id: string
  timestamp: number
  level: "debug" | "info" | "warn" | "error" | "fatal"
  service: string
  message: string
  metadata: Record<string, string>
  traceId: string | null
}

export interface LogSearchFilter {
  startTime: number | null
  endTime: number | null
  levels: LogEntry["level"][]
  services: string[]
  keyword: string | null
  traceId: string | null
  limit: number
}

export interface DashboardLayout {
  id: string
  name: string
  panels: DashboardPanel[]
  refreshIntervalMs: number
  createdAt: number
  updatedAt: number
}

export interface DashboardPanel {
  id: string
  title: string
  metricTypes: MetricType[]
  chartType: "line" | "bar" | "gauge" | "stat"
  position: { row: number; col: number; width: number; height: number }
}

export interface MonitoringDashboardData {
  layout: DashboardLayout
  dataPoints: MetricDataPoint[]
  activeAlerts: ThresholdAlert[]
  recentLogs: LogEntry[]
}

// ── 기본 임계값 ─────────────────────────────────────────────

export const DEFAULT_METRIC_THRESHOLDS: MetricThreshold[] = [
  { metricType: "llm_error_rate", warningLevel: 5, criticalLevel: 15, comparison: "above" },
  { metricType: "avg_latency", warningLevel: 5000, criticalLevel: 15000, comparison: "above" },
  { metricType: "llm_cost", warningLevel: 100, criticalLevel: 500, comparison: "above" },
  { metricType: "llm_calls", warningLevel: 10000, criticalLevel: 50000, comparison: "above" },
  { metricType: "matching_count", warningLevel: 10000, criticalLevel: 50000, comparison: "above" },
  { metricType: "active_personas", warningLevel: 1, criticalLevel: 0, comparison: "below" },
]

// ── 기본 대시보드 레이아웃 ────────────────────────────────────

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  id: "default",
  name: "애플리케이션 현황",
  panels: [
    {
      id: "panel_personas",
      title: "활성 페르소나",
      metricTypes: ["active_personas"],
      chartType: "stat",
      position: { row: 0, col: 0, width: 4, height: 2 },
    },
    {
      id: "panel_llm_calls",
      title: "LLM 호출 (24h)",
      metricTypes: ["llm_calls"],
      chartType: "stat",
      position: { row: 0, col: 4, width: 4, height: 2 },
    },
    {
      id: "panel_llm_cost",
      title: "LLM 비용 (24h)",
      metricTypes: ["llm_cost"],
      chartType: "stat",
      position: { row: 0, col: 8, width: 4, height: 2 },
    },
    {
      id: "panel_error_rate",
      title: "LLM 에러율",
      metricTypes: ["llm_error_rate"],
      chartType: "gauge",
      position: { row: 2, col: 0, width: 4, height: 3 },
    },
    {
      id: "panel_latency",
      title: "평균 응답시간",
      metricTypes: ["avg_latency"],
      chartType: "gauge",
      position: { row: 2, col: 4, width: 4, height: 3 },
    },
    {
      id: "panel_matching",
      title: "매칭 요청 (24h)",
      metricTypes: ["matching_count"],
      chartType: "stat",
      position: { row: 2, col: 8, width: 4, height: 3 },
    },
  ],
  refreshIntervalMs: 30000,
  createdAt: 0,
  updatedAt: 0,
}

// ── 모니터링 함수 ────────────────────────────────────────────

export function createMetricDataPoint(
  metricType: MetricType,
  value: number,
  source: string,
  labels: Record<string, string> = {}
): MetricDataPoint {
  return {
    timestamp: Date.now(),
    value: roundMetric(value),
    metricType,
    source,
    labels,
  }
}

export function evaluateThresholds(
  dataPoints: MetricDataPoint[],
  thresholds: MetricThreshold[] = DEFAULT_METRIC_THRESHOLDS
): ThresholdAlert[] {
  const alerts: ThresholdAlert[] = []

  for (const point of dataPoints) {
    const threshold = thresholds.find((t) => t.metricType === point.metricType)
    if (!threshold) continue

    const exceedsCritical =
      threshold.comparison === "above"
        ? point.value >= threshold.criticalLevel
        : point.value <= threshold.criticalLevel

    const exceedsWarning =
      threshold.comparison === "above"
        ? point.value >= threshold.warningLevel
        : point.value <= threshold.warningLevel

    if (exceedsCritical) {
      alerts.push({
        id: `threshold_${point.metricType}_${point.timestamp}`,
        metricType: point.metricType,
        currentValue: point.value,
        threshold: threshold.criticalLevel,
        level: "critical",
        source: point.source,
        triggeredAt: point.timestamp,
        message: `${point.metricType} 지표가 임계값(${threshold.criticalLevel}) 초과: ${point.value}`,
        acknowledged: false,
      })
    } else if (exceedsWarning) {
      alerts.push({
        id: `threshold_${point.metricType}_${point.timestamp}`,
        metricType: point.metricType,
        currentValue: point.value,
        threshold: threshold.warningLevel,
        level: "warning",
        source: point.source,
        triggeredAt: point.timestamp,
        message: `${point.metricType} 지표가 경고 수준(${threshold.warningLevel}) 초과: ${point.value}`,
        acknowledged: false,
      })
    }
  }

  return alerts
}

export function acknowledgeThresholdAlert(alert: ThresholdAlert): ThresholdAlert {
  return { ...alert, acknowledged: true }
}

export function searchLogs(logs: LogEntry[], filter: LogSearchFilter): LogEntry[] {
  let filtered = [...logs]

  if (filter.startTime !== null) {
    filtered = filtered.filter((l) => l.timestamp >= filter.startTime!)
  }
  if (filter.endTime !== null) {
    filtered = filtered.filter((l) => l.timestamp <= filter.endTime!)
  }
  if (filter.levels.length > 0) {
    filtered = filtered.filter((l) => filter.levels.includes(l.level))
  }
  if (filter.services.length > 0) {
    filtered = filtered.filter((l) => filter.services.includes(l.service))
  }
  if (filter.keyword !== null && filter.keyword.length > 0) {
    const kw = filter.keyword.toLowerCase()
    filtered = filtered.filter((l) => l.message.toLowerCase().includes(kw))
  }
  if (filter.traceId !== null) {
    filtered = filtered.filter((l) => l.traceId === filter.traceId)
  }

  filtered.sort((a, b) => b.timestamp - a.timestamp)

  return filtered.slice(0, filter.limit)
}

export function buildMonitoringDashboard(
  dataPoints: MetricDataPoint[],
  logs: LogEntry[],
  thresholds: MetricThreshold[] = DEFAULT_METRIC_THRESHOLDS,
  layout: DashboardLayout = DEFAULT_DASHBOARD_LAYOUT
): MonitoringDashboardData {
  const activeAlerts = evaluateThresholds(dataPoints, thresholds)
  const recentLogs = searchLogs(logs, {
    startTime: null,
    endTime: null,
    levels: ["warn", "error", "fatal"],
    services: [],
    keyword: null,
    traceId: null,
    limit: 50,
  })

  return {
    layout: { ...layout, updatedAt: Date.now() },
    dataPoints,
    activeAlerts,
    recentLogs,
  }
}

// ═══════════════════════════════════════════════════════════════
// AC5: 용량 계획 (리소스 모니터링, 예측, 비용 최적화)
// ═══════════════════════════════════════════════════════════════

// ── 용량 타입 정의 ──────────────────────────────────────────

export interface ResourceUsage {
  metricType: MetricType
  currentValue: number
  maxCapacity: number
  unit: string
  timestamp: number
}

export interface UsageSnapshot {
  timestamp: number
  resources: ResourceUsage[]
}

export interface ForecastResult {
  metricType: MetricType
  currentUsagePercent: number
  projectedUsagePercent: number
  daysUntilThreshold: number | null
  thresholdPercent: number
  trend: "increasing" | "stable" | "decreasing"
  confidence: number
  projectedDataPoints: Array<{ timestamp: number; value: number }>
}

export interface CostOptimization {
  id: string
  category: "rightsizing" | "scheduling" | "storage_tiering" | "reserved_capacity" | "cleanup"
  title: string
  description: string
  estimatedSavingsPercent: number
  estimatedSavingsAmount: number
  effort: "low" | "medium" | "high"
  impact: "low" | "medium" | "high"
  priority: number
}

export interface ScalingRecommendation {
  metricType: MetricType
  direction: "scale_up" | "scale_down" | "no_change"
  reason: string
  currentCapacity: number
  recommendedCapacity: number
  urgency: "immediate" | "soon" | "planned"
}

export interface CapacityReport {
  generatedAt: number
  currentUsage: ResourceUsage[]
  forecasts: ForecastResult[]
  optimizations: CostOptimization[]
  scalingRecommendations: ScalingRecommendation[]
  summary: {
    overallHealthScore: number
    criticalResources: string[]
    estimatedTotalSavingsPercent: number
  }
}

// ── 용량 계획 함수 ──────────────────────────────────────────

export function createResourceUsage(
  metricType: MetricType,
  currentValue: number,
  maxCapacity: number,
  unit: string
): ResourceUsage {
  return {
    metricType,
    currentValue: roundMetric(currentValue),
    maxCapacity,
    unit,
    timestamp: Date.now(),
  }
}

export function getUsagePercent(resource: ResourceUsage): number {
  if (resource.maxCapacity <= 0) return 0
  return roundMetric((resource.currentValue / resource.maxCapacity) * 100)
}

export function forecastLinear(
  snapshots: UsageSnapshot[],
  metricType: MetricType,
  forecastDays: number,
  thresholdPercent: number = 80
): ForecastResult {
  const dataPoints = snapshots
    .map((snap) => {
      const resource = snap.resources.find((r) => r.metricType === metricType)
      if (!resource) return null
      return { timestamp: snap.timestamp, value: getUsagePercent(resource) }
    })
    .filter((p): p is { timestamp: number; value: number } => p !== null)
    .sort((a, b) => a.timestamp - b.timestamp)

  if (dataPoints.length < 2) {
    const currentUsage = dataPoints.length > 0 ? dataPoints[0].value : 0
    return {
      metricType,
      currentUsagePercent: currentUsage,
      projectedUsagePercent: currentUsage,
      daysUntilThreshold: null,
      thresholdPercent,
      trend: "stable",
      confidence: 0,
      projectedDataPoints: [],
    }
  }

  // 선형 회귀 (최소자승법)
  const n = dataPoints.length
  const msPerDay = 86400000

  const xValues = dataPoints.map((p) => (p.timestamp - dataPoints[0].timestamp) / msPerDay)
  const yValues = dataPoints.map((p) => p.value)

  const sumX = xValues.reduce((s, x) => s + x, 0)
  const sumY = yValues.reduce((s, y) => s + y, 0)
  const sumXY = xValues.reduce((s, x, i) => s + x * yValues[i], 0)
  const sumX2 = xValues.reduce((s, x) => s + x * x, 0)

  const denominator = n * sumX2 - sumX * sumX
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0
  const intercept = (sumY - slope * sumX) / n

  const currentUsagePercent = yValues[yValues.length - 1]
  const currentDay = xValues[xValues.length - 1]
  const projectedDay = currentDay + forecastDays
  const projectedUsagePercent = roundMetric(
    Math.max(0, Math.min(100, slope * projectedDay + intercept))
  )

  // 임계값 도달 예측
  let daysUntilThreshold: number | null = null
  if (slope > 0 && currentUsagePercent < thresholdPercent) {
    const daysToThreshold = (thresholdPercent - intercept) / slope - currentDay
    daysUntilThreshold = daysToThreshold > 0 ? Math.ceil(daysToThreshold) : null
  }

  // 추세 판별
  const trend: ForecastResult["trend"] =
    slope > 0.1 ? "increasing" : slope < -0.1 ? "decreasing" : "stable"

  // R^2 (결정계수) — 예측 신뢰도
  const meanY = sumY / n
  const ssRes = yValues.reduce((s, y, i) => {
    const predicted = slope * xValues[i] + intercept
    return s + (y - predicted) * (y - predicted)
  }, 0)
  const ssTot = yValues.reduce((s, y) => s + (y - meanY) * (y - meanY), 0)
  const confidence = ssTot > 0 ? roundMetric(Math.max(0, 1 - ssRes / ssTot)) : 0

  // 예측 데이터 포인트 생성
  const projectedDataPoints: Array<{ timestamp: number; value: number }> = []
  const lastTimestamp = dataPoints[dataPoints.length - 1].timestamp
  for (let d = 1; d <= forecastDays; d++) {
    const ts = lastTimestamp + d * msPerDay
    const dayValue = currentDay + d
    const value = roundMetric(Math.max(0, Math.min(100, slope * dayValue + intercept)))
    projectedDataPoints.push({ timestamp: ts, value })
  }

  return {
    metricType,
    currentUsagePercent,
    projectedUsagePercent,
    daysUntilThreshold,
    thresholdPercent,
    trend,
    confidence,
    projectedDataPoints,
  }
}

export function generateCostOptimizations(
  resources: ResourceUsage[],
  forecasts: ForecastResult[]
): CostOptimization[] {
  const optimizations: CostOptimization[] = []
  let priorityCounter = 0

  // 과소 사용 리소스 → 다운사이징 제안
  for (const resource of resources) {
    const usagePercent = getUsagePercent(resource)
    if (usagePercent < 20) {
      optimizations.push({
        id: `opt_rightsize_${resource.metricType}`,
        category: "rightsizing",
        title: `${resource.metricType} 리소스 다운사이징`,
        description: `현재 사용률 ${usagePercent}%로 리소스가 과다 프로비저닝되어 있습니다. 용량 축소를 권장합니다.`,
        estimatedSavingsPercent: roundMetric(Math.min(50, (100 - usagePercent) * 0.6)),
        estimatedSavingsAmount: 0,
        effort: "medium",
        impact: "medium",
        priority: ++priorityCounter,
      })
    }
  }

  // 안정적 사용 패턴 → 예약 인스턴스 제안
  const stableForecasts = forecasts.filter((f) => f.trend === "stable" && f.confidence > 0.7)
  if (stableForecasts.length > 0) {
    optimizations.push({
      id: "opt_reserved",
      category: "reserved_capacity",
      title: "예약 인스턴스 전환",
      description: `${stableForecasts.map((f) => f.metricType).join(", ")} 리소스의 사용 패턴이 안정적입니다. 예약 인스턴스로 전환하면 비용을 절감할 수 있습니다.`,
      estimatedSavingsPercent: 30,
      estimatedSavingsAmount: 0,
      effort: "low",
      impact: "high",
      priority: ++priorityCounter,
    })
  }

  // LLM 비용 최적화 제안
  const costResource = resources.find((r) => r.metricType === "llm_cost")
  if (costResource && getUsagePercent(costResource) > 50) {
    optimizations.push({
      id: "opt_storage_tiering",
      category: "storage_tiering",
      title: "스토리지 계층화",
      description: "접근 빈도가 낮은 데이터를 콜드 스토리지로 이동하여 비용을 절감할 수 있습니다.",
      estimatedSavingsPercent: 20,
      estimatedSavingsAmount: 0,
      effort: "medium",
      impact: "medium",
      priority: ++priorityCounter,
    })
  }

  // 비업무 시간 스케일 다운 제안
  optimizations.push({
    id: "opt_scheduling",
    category: "scheduling",
    title: "비업무 시간 스케일 다운",
    description: "비업무 시간(야간/주말)에 비프로덕션 리소스를 자동 축소하여 비용을 절감합니다.",
    estimatedSavingsPercent: 15,
    estimatedSavingsAmount: 0,
    effort: "low",
    impact: "low",
    priority: ++priorityCounter,
  })

  return optimizations
}

export function generateScalingRecommendations(
  resources: ResourceUsage[],
  forecasts: ForecastResult[]
): ScalingRecommendation[] {
  const recommendations: ScalingRecommendation[] = []

  for (const resource of resources) {
    const usagePercent = getUsagePercent(resource)
    const forecast = forecasts.find((f) => f.metricType === resource.metricType)

    if (usagePercent > 90) {
      recommendations.push({
        metricType: resource.metricType,
        direction: "scale_up",
        reason: `현재 사용률 ${usagePercent}%로 즉시 확장이 필요합니다`,
        currentCapacity: resource.maxCapacity,
        recommendedCapacity: roundMetric(resource.maxCapacity * 1.5),
        urgency: "immediate",
      })
    } else if (
      usagePercent > 75 ||
      (forecast && forecast.daysUntilThreshold !== null && forecast.daysUntilThreshold < 30)
    ) {
      const daysInfo =
        forecast?.daysUntilThreshold !== null && forecast?.daysUntilThreshold !== undefined
          ? ` (예상 임계값 도달: ${forecast.daysUntilThreshold}일)`
          : ""
      recommendations.push({
        metricType: resource.metricType,
        direction: "scale_up",
        reason: `현재 사용률 ${usagePercent}%이며 증가 추세${daysInfo}`,
        currentCapacity: resource.maxCapacity,
        recommendedCapacity: roundMetric(resource.maxCapacity * 1.3),
        urgency: "soon",
      })
    } else if (usagePercent < 20 && forecast?.trend === "decreasing") {
      recommendations.push({
        metricType: resource.metricType,
        direction: "scale_down",
        reason: `현재 사용률 ${usagePercent}%로 과다 프로비저닝. 감소 추세 확인`,
        currentCapacity: resource.maxCapacity,
        recommendedCapacity: roundMetric(resource.maxCapacity * 0.5),
        urgency: "planned",
      })
    } else {
      recommendations.push({
        metricType: resource.metricType,
        direction: "no_change",
        reason: `현재 사용률 ${usagePercent}%로 적정 수준`,
        currentCapacity: resource.maxCapacity,
        recommendedCapacity: resource.maxCapacity,
        urgency: "planned",
      })
    }
  }

  return recommendations
}

export function buildCapacityReport(
  snapshots: UsageSnapshot[],
  currentResources: ResourceUsage[],
  forecastDays: number = 90,
  thresholdPercent: number = 80
): CapacityReport {
  const metricTypes: MetricType[] = [
    "active_personas",
    "llm_calls",
    "llm_cost",
    "llm_error_rate",
    "avg_latency",
    "matching_count",
  ]

  const forecasts = metricTypes
    .map((mt) => forecastLinear(snapshots, mt, forecastDays, thresholdPercent))
    .filter((f) => f.confidence > 0 || f.currentUsagePercent > 0)

  const optimizations = generateCostOptimizations(currentResources, forecasts)
  const scalingRecommendations = generateScalingRecommendations(currentResources, forecasts)

  const criticalResources = currentResources
    .filter((r) => getUsagePercent(r) > 90)
    .map((r) => r.metricType)

  const overallHealthScore = calculateHealthScore(currentResources, forecasts)
  const estimatedTotalSavingsPercent =
    optimizations.length > 0
      ? roundMetric(
          optimizations.reduce((s, o) => s + o.estimatedSavingsPercent, 0) / optimizations.length
        )
      : 0

  return {
    generatedAt: Date.now(),
    currentUsage: currentResources,
    forecasts,
    optimizations,
    scalingRecommendations,
    summary: {
      overallHealthScore,
      criticalResources,
      estimatedTotalSavingsPercent,
    },
  }
}

function calculateHealthScore(resources: ResourceUsage[], forecasts: ForecastResult[]): number {
  if (resources.length === 0) return 100

  let score = 100

  for (const resource of resources) {
    const usagePercent = getUsagePercent(resource)
    if (usagePercent > 90) score -= 20
    else if (usagePercent > 80) score -= 10
    else if (usagePercent > 70) score -= 5
  }

  for (const forecast of forecasts) {
    if (forecast.daysUntilThreshold !== null && forecast.daysUntilThreshold < 7) {
      score -= 15
    } else if (forecast.daysUntilThreshold !== null && forecast.daysUntilThreshold < 30) {
      score -= 5
    }
  }

  return Math.max(0, Math.min(100, score))
}
