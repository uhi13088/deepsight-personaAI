// ═══════════════════════════════════════════════════════════════
// 매칭 성과 분석 대시보드
// T58-AC1: KPI, 세그먼트 분석, 이상 탐지
// T215: A/B 실험 트래킹 추가
// ═══════════════════════════════════════════════════════════════

import { round } from "./utils"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface MatchingKPIs {
  matchAccuracy: number // 매칭 후 Like 비율 (목표 ≥ 0.8)
  avgMatchScore: number // 평균 매칭 점수 (목표 ≥ 0.75)
  top1Accuracy: number // 1위 추천 선택 비율 (목표 ≥ 0.5)
  diversityIndex: number // 추천 페르소나 분포 균등도 (0~1)
  ctr: number // Click-Through Rate (목표 ≥ 0.3)
  avgDwellTime: number // 평균 체류시간 (초)
  returnRate: number // 7일 재방문율 (목표 ≥ 0.4)
  nps: number // Net Promoter Score (-100 ~ 100)
}

export type TimeRange = "realtime" | "today" | "7d" | "30d" | "custom"
export type SegmentType = "all" | "new_user" | "returning" | "archetype"

/** A/B 실험 결과 */
export interface ExperimentResult {
  experimentId: string
  variant: string
  sampleSize: number
  kpis: MatchingKPIs
  uplift: Partial<Record<keyof MatchingKPIs, number>> // 대조군 대비 변화율
  significance: number // p-value (< 0.05면 유의미)
  startedAt: number
  endedAt?: number
}

export interface SegmentFilter {
  timeRange: TimeRange
  segment: SegmentType
  archetypeId?: string
  personaId?: string
  customDateRange?: { start: number; end: number }
  /** A/B 실험 필터 */
  experimentId?: string
  variant?: string
}

export interface SegmentAnalysis {
  segmentName: string
  segmentSize: number
  kpis: MatchingKPIs
  topPersonas: Array<{ personaId: string; selectionRate: number }>
  failureRate: number
}

export interface TimeSeriesPoint {
  timestamp: number
  value: number
}

export interface TrendData {
  metric: string
  points: TimeSeriesPoint[]
  trend: "rising" | "falling" | "stable"
  changeRate: number // 변화율 (전기 대비 %)
}

export interface AnomalyEvent {
  id: string
  type: "accuracy_drop" | "dislike_spike" | "failure_spike" | "traffic_anomaly"
  severity: "warning" | "critical"
  metric: string
  expectedValue: number
  actualValue: number
  deviation: number // 표준편차 기준
  affectedSegment: string
  detectedAt: number
  description: string
}

export interface AnalyticsDashboard {
  kpis: MatchingKPIs
  segments: SegmentAnalysis[]
  trends: TrendData[]
  anomalies: AnomalyEvent[]
  experiments: ExperimentResult[]
  filter: SegmentFilter
  generatedAt: number
}

// ── KPI 목표값 ───────────────────────────────────────────────

export const KPI_TARGETS: Partial<MatchingKPIs> = {
  matchAccuracy: 0.8,
  avgMatchScore: 0.75,
  top1Accuracy: 0.5,
  ctr: 0.3,
  returnRate: 0.4,
  nps: 50,
}

// ── KPI 계산 ─────────────────────────────────────────────────

export interface RawMatchingData {
  totalMatches: number
  likedMatches: number
  matchScores: number[]
  top1Selections: number
  totalRecommendations: number
  clicks: number
  impressions: number
  dwellTimes: number[] // 초 단위
  uniqueVisitors: number
  returnVisitors: number
  promoters: number // NPS 9-10
  passives: number // NPS 7-8
  detractors: number // NPS 0-6
  recommendedPersonaIds: string[]
}

export function calculateMatchingKPIs(data: RawMatchingData): MatchingKPIs {
  const matchAccuracy = data.totalMatches > 0 ? round(data.likedMatches / data.totalMatches) : 0
  const avgMatchScore =
    data.matchScores.length > 0
      ? round(data.matchScores.reduce((a, b) => a + b, 0) / data.matchScores.length)
      : 0
  const top1Accuracy =
    data.totalRecommendations > 0 ? round(data.top1Selections / data.totalRecommendations) : 0
  const diversityIndex = calculateDiversityIndex(data.recommendedPersonaIds)
  const ctr = data.impressions > 0 ? round(data.clicks / data.impressions) : 0
  const avgDwellTime =
    data.dwellTimes.length > 0
      ? round(data.dwellTimes.reduce((a, b) => a + b, 0) / data.dwellTimes.length)
      : 0
  const returnRate = data.uniqueVisitors > 0 ? round(data.returnVisitors / data.uniqueVisitors) : 0
  const totalRespondents = data.promoters + data.passives + data.detractors
  const nps =
    totalRespondents > 0
      ? Math.round(((data.promoters - data.detractors) / totalRespondents) * 100)
      : 0

  return {
    matchAccuracy,
    avgMatchScore,
    top1Accuracy,
    diversityIndex,
    ctr,
    avgDwellTime,
    returnRate,
    nps,
  }
}

// ── 다양성 지수 (Shannon Entropy 기반) ───────────────────────

export function calculateDiversityIndex(personaIds: string[]): number {
  if (personaIds.length === 0) return 0

  const counts: Record<string, number> = {}
  for (const id of personaIds) {
    counts[id] = (counts[id] ?? 0) + 1
  }

  const total = personaIds.length
  const uniqueCount = Object.keys(counts).length
  if (uniqueCount <= 1) return 0

  // Shannon entropy 정규화
  let entropy = 0
  for (const count of Object.values(counts)) {
    const p = count / total
    if (p > 0) entropy -= p * Math.log2(p)
  }

  const maxEntropy = Math.log2(uniqueCount)
  return round(maxEntropy > 0 ? entropy / maxEntropy : 0)
}

// ── 트렌드 판별 ──────────────────────────────────────────────

export function analyzeTrend(points: TimeSeriesPoint[]): TrendData["trend"] {
  if (points.length < 2) return "stable"

  const half = Math.floor(points.length / 2)
  const firstHalf = points.slice(0, half)
  const secondHalf = points.slice(half)

  const firstAvg = firstHalf.reduce((s, p) => s + p.value, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((s, p) => s + p.value, 0) / secondHalf.length

  const changeRate = firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0

  if (changeRate > 0.05) return "rising"
  if (changeRate < -0.05) return "falling"
  return "stable"
}

export function calculateChangeRate(points: TimeSeriesPoint[]): number {
  if (points.length < 2) return 0
  const half = Math.floor(points.length / 2)
  const firstAvg = points.slice(0, half).reduce((s, p) => s + p.value, 0) / half
  const secondAvg = points.slice(half).reduce((s, p) => s + p.value, 0) / (points.length - half)
  return firstAvg > 0 ? round((secondAvg - firstAvg) / firstAvg) : 0
}

// ── 이상 탐지 ────────────────────────────────────────────────

export const ANOMALY_THRESHOLDS = {
  accuracyDropThreshold: 0.1, // 10% 이상 하락
  dislikeSpikeThreshold: 2.0, // 2배 이상 증가
  failureSpikeThreshold: 1.5, // 1.5배 이상 증가
  deviationThreshold: 2.0, // 2σ 이상 이탈
}

export function detectAnomalies(
  currentKPIs: MatchingKPIs,
  baselineKPIs: MatchingKPIs,
  historicalAccuracies: number[] = []
): AnomalyEvent[] {
  const anomalies: AnomalyEvent[] = []

  // 1. 매칭 정확도 급락
  const accuracyDrop = baselineKPIs.matchAccuracy - currentKPIs.matchAccuracy
  if (accuracyDrop >= ANOMALY_THRESHOLDS.accuracyDropThreshold) {
    anomalies.push({
      id: `anomaly_${Date.now()}_acc`,
      type: "accuracy_drop",
      severity: accuracyDrop >= 0.2 ? "critical" : "warning",
      metric: "matchAccuracy",
      expectedValue: baselineKPIs.matchAccuracy,
      actualValue: currentKPIs.matchAccuracy,
      deviation: round(accuracyDrop / Math.max(baselineKPIs.matchAccuracy, 0.01)),
      affectedSegment: "all",
      detectedAt: Date.now(),
      description: `매칭 정확도가 ${round(accuracyDrop * 100)}% 하락 (${round(baselineKPIs.matchAccuracy * 100)}% → ${round(currentKPIs.matchAccuracy * 100)}%)`,
    })
  }

  // 2. CTR 급락
  if (baselineKPIs.ctr > 0 && currentKPIs.ctr < baselineKPIs.ctr * 0.7) {
    anomalies.push({
      id: `anomaly_${Date.now()}_ctr`,
      type: "traffic_anomaly",
      severity: "warning",
      metric: "ctr",
      expectedValue: baselineKPIs.ctr,
      actualValue: currentKPIs.ctr,
      deviation: round((baselineKPIs.ctr - currentKPIs.ctr) / baselineKPIs.ctr),
      affectedSegment: "all",
      detectedAt: Date.now(),
      description: `CTR이 ${round(baselineKPIs.ctr * 100)}%에서 ${round(currentKPIs.ctr * 100)}%로 하락`,
    })
  }

  // 3. 통계적 이상치 (2σ)
  if (historicalAccuracies.length >= 5) {
    const mean = historicalAccuracies.reduce((a, b) => a + b, 0) / historicalAccuracies.length
    const stdDev = Math.sqrt(
      historicalAccuracies.reduce((s, v) => s + (v - mean) ** 2, 0) / historicalAccuracies.length
    )

    if (
      stdDev > 0 &&
      Math.abs(currentKPIs.matchAccuracy - mean) > ANOMALY_THRESHOLDS.deviationThreshold * stdDev
    ) {
      anomalies.push({
        id: `anomaly_${Date.now()}_stat`,
        type: "accuracy_drop",
        severity: "warning",
        metric: "matchAccuracy",
        expectedValue: round(mean),
        actualValue: currentKPIs.matchAccuracy,
        deviation: round(Math.abs(currentKPIs.matchAccuracy - mean) / stdDev),
        affectedSegment: "all",
        detectedAt: Date.now(),
        description: `매칭 정확도가 통계적으로 이상치 (${round(Math.abs(currentKPIs.matchAccuracy - mean) / stdDev)}σ 이탈)`,
      })
    }
  }

  return anomalies
}

// ── 대시보드 빌더 ────────────────────────────────────────────

export function buildAnalyticsDashboard(
  rawData: RawMatchingData,
  baselineKPIs: MatchingKPIs,
  segments: SegmentAnalysis[] = [],
  trends: TrendData[] = [],
  historicalAccuracies: number[] = [],
  filter: SegmentFilter = { timeRange: "7d", segment: "all" },
  experiments: ExperimentResult[] = []
): AnalyticsDashboard {
  const kpis = calculateMatchingKPIs(rawData)
  const anomalies = detectAnomalies(kpis, baselineKPIs, historicalAccuracies)

  return {
    kpis,
    segments,
    trends,
    anomalies,
    experiments,
    filter,
    generatedAt: Date.now(),
  }
}

// ── A/B 실험 Uplift 계산 ──────────────────────────────────────

export function calculateExperimentUplift(
  controlKPIs: MatchingKPIs,
  variantKPIs: MatchingKPIs
): Partial<Record<keyof MatchingKPIs, number>> {
  const uplift: Partial<Record<keyof MatchingKPIs, number>> = {}
  const keys: (keyof MatchingKPIs)[] = [
    "matchAccuracy",
    "avgMatchScore",
    "top1Accuracy",
    "diversityIndex",
    "ctr",
    "avgDwellTime",
    "returnRate",
  ]

  for (const key of keys) {
    const control = controlKPIs[key]
    const variant = variantKPIs[key]
    if (control > 0) {
      uplift[key] = round((variant - control) / control)
    }
  }

  return uplift
}
