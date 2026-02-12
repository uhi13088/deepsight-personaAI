// ═══════════════════════════════════════════════════════════════
// 리포트 생성
// T58-AC4: 정기/커스텀 리포트, CSV/PDF 내보내기
// ═══════════════════════════════════════════════════════════════

import type { MatchingKPIs, SegmentAnalysis, AnomalyEvent, TrendData } from "./analytics"

// ── 타입 정의 ─────────────────────────────────────────────────

export type ReportFrequency = "daily" | "weekly" | "monthly" | "custom"
export type ExportFormat = "csv" | "pdf" | "excel"

export interface ReportConfig {
  id: string
  name: string
  frequency: ReportFrequency
  dateRange: { start: number; end: number }
  includeSections: ReportSection[]
  segmentFilters: string[] // archetype ids
  createdBy: string
  createdAt: number
}

export type ReportSection =
  | "kpi_summary"
  | "segment_analysis"
  | "trend_charts"
  | "anomaly_log"
  | "recommendation"

export interface GeneratedReport {
  id: string
  configId: string
  name: string
  frequency: ReportFrequency
  dateRange: { start: number; end: number }
  sections: ReportSectionData[]
  generatedAt: number
  generatedBy: string
}

export interface ReportSectionData {
  type: ReportSection
  title: string
  data:
    | KPISummaryData
    | SegmentSectionData
    | TrendSectionData
    | AnomalySectionData
    | RecommendationData
}

export interface KPISummaryData {
  current: MatchingKPIs
  previous: MatchingKPIs | null
  changes: Partial<Record<keyof MatchingKPIs, number>> // 변화율
}

export interface SegmentSectionData {
  segments: SegmentAnalysis[]
}

export interface TrendSectionData {
  trends: TrendData[]
}

export interface AnomalySectionData {
  events: AnomalyEvent[]
  totalCount: number
  criticalCount: number
}

export interface RecommendationData {
  items: RecommendationItem[]
}

export interface RecommendationItem {
  priority: "high" | "medium" | "low"
  category: string
  message: string
  metric: string
  currentValue: number
  targetValue: number
}

export interface CsvRow {
  [key: string]: string | number
}

// ── 리포트 설정 생성 ────────────────────────────────────────

export function createReportConfig(
  name: string,
  frequency: ReportFrequency,
  dateRange: { start: number; end: number },
  createdBy: string,
  sections: ReportSection[] = [
    "kpi_summary",
    "segment_analysis",
    "trend_charts",
    "anomaly_log",
    "recommendation",
  ]
): ReportConfig {
  return {
    id: `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    frequency,
    dateRange,
    includeSections: sections,
    segmentFilters: [],
    createdBy,
    createdAt: Date.now(),
  }
}

// ── KPI 요약 섹션 생성 ──────────────────────────────────────

export function buildKPISummary(
  current: MatchingKPIs,
  previous: MatchingKPIs | null
): KPISummaryData {
  const changes: Partial<Record<keyof MatchingKPIs, number>> = {}

  if (previous) {
    const keys: (keyof MatchingKPIs)[] = [
      "matchAccuracy",
      "avgMatchScore",
      "top1Accuracy",
      "diversityIndex",
      "ctr",
      "avgDwellTime",
      "returnRate",
      "nps",
    ]

    for (const key of keys) {
      const prev = previous[key]
      const curr = current[key]
      if (prev !== 0) {
        changes[key] = round((curr - prev) / Math.abs(prev))
      }
    }
  }

  return { current, previous, changes }
}

// ── 개선 권고 생성 ───────────────────────────────────────────

const KPI_TARGETS: Record<string, { target: number; category: string; label: string }> = {
  matchAccuracy: { target: 0.8, category: "매칭 품질", label: "매칭 정확도" },
  avgMatchScore: { target: 0.75, category: "매칭 품질", label: "평균 매칭 스코어" },
  top1Accuracy: { target: 0.5, category: "추천 정확도", label: "Top-1 정확도" },
  ctr: { target: 0.3, category: "사용자 참여", label: "CTR" },
  returnRate: { target: 0.4, category: "리텐션", label: "재방문율" },
}

export function generateRecommendations(kpis: MatchingKPIs): RecommendationItem[] {
  const items: RecommendationItem[] = []

  for (const [key, config] of Object.entries(KPI_TARGETS)) {
    const value = kpis[key as keyof MatchingKPIs] as number
    if (value < config.target) {
      const gap = round(config.target - value)
      const priority: RecommendationItem["priority"] =
        gap >= config.target * 0.3 ? "high" : gap >= config.target * 0.15 ? "medium" : "low"

      items.push({
        priority,
        category: config.category,
        message: `${config.label}이(가) 목표(${round(config.target * 100)}%) 대비 ${round(gap * 100)}%p 미달`,
        metric: key,
        currentValue: round(value),
        targetValue: config.target,
      })
    }
  }

  items.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })

  return items
}

// ── 리포트 생성 ──────────────────────────────────────────────

export function generateReport(
  config: ReportConfig,
  currentKPIs: MatchingKPIs,
  previousKPIs: MatchingKPIs | null,
  segments: SegmentAnalysis[],
  trends: TrendData[],
  anomalies: AnomalyEvent[]
): GeneratedReport {
  const sections: ReportSectionData[] = []

  for (const section of config.includeSections) {
    switch (section) {
      case "kpi_summary":
        sections.push({
          type: "kpi_summary",
          title: "핵심 성과 지표 요약",
          data: buildKPISummary(currentKPIs, previousKPIs),
        })
        break
      case "segment_analysis":
        sections.push({
          type: "segment_analysis",
          title: "세그먼트별 분석",
          data: { segments } as SegmentSectionData,
        })
        break
      case "trend_charts":
        sections.push({
          type: "trend_charts",
          title: "트렌드 분석",
          data: { trends } as TrendSectionData,
        })
        break
      case "anomaly_log":
        sections.push({
          type: "anomaly_log",
          title: "이상 탐지 이벤트",
          data: {
            events: anomalies,
            totalCount: anomalies.length,
            criticalCount: anomalies.filter((a) => a.severity === "critical").length,
          } as AnomalySectionData,
        })
        break
      case "recommendation":
        sections.push({
          type: "recommendation",
          title: "개선 권고",
          data: { items: generateRecommendations(currentKPIs) } as RecommendationData,
        })
        break
    }
  }

  return {
    id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    configId: config.id,
    name: config.name,
    frequency: config.frequency,
    dateRange: config.dateRange,
    sections,
    generatedAt: Date.now(),
    generatedBy: config.createdBy,
  }
}

// ── CSV 내보내기 ─────────────────────────────────────────────

export function kpisToCsvRows(kpis: MatchingKPIs): CsvRow[] {
  return [
    { metric: "매칭 정확도", value: kpis.matchAccuracy },
    { metric: "평균 매칭 스코어", value: kpis.avgMatchScore },
    { metric: "Top-1 정확도", value: kpis.top1Accuracy },
    { metric: "다양성 지수", value: kpis.diversityIndex },
    { metric: "CTR", value: kpis.ctr },
    { metric: "평균 체류시간(초)", value: kpis.avgDwellTime },
    { metric: "재방문율", value: kpis.returnRate },
    { metric: "NPS", value: kpis.nps },
  ]
}

export function csvRowsToString(rows: CsvRow[]): string {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const lines = [headers.join(",")]
  for (const row of rows) {
    lines.push(headers.map((h) => String(row[h] ?? "")).join(","))
  }
  return lines.join("\n")
}

// ── 유틸 ─────────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
