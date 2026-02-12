"use client"

import { useState, useCallback, useMemo } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  calculateMatchingKPIs,
  calculateDiversityIndex,
  analyzeTrend,
  calculateChangeRate,
  detectAnomalies,
  buildAnalyticsDashboard,
  KPI_TARGETS,
} from "@/lib/matching/analytics"
import type {
  MatchingKPIs,
  RawMatchingData,
  TimeRange,
  SegmentType,
  TrendData,
  TimeSeriesPoint,
  AnomalyEvent,
  AnalyticsDashboard,
} from "@/lib/matching/analytics"
import { generateRecommendations, kpisToCsvRows, csvRowsToString } from "@/lib/matching/report"
import type { RecommendationItem } from "@/lib/matching/report"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Download,
  RefreshCw,
  Target,
  Activity,
} from "lucide-react"

// ── 시뮬레이션용 데이터 생성 ─────────────────────────────────
function generateSampleData(): RawMatchingData {
  return {
    totalMatches: 1250,
    likedMatches: 940,
    matchScores: Array.from({ length: 1250 }, () => 0.3 + Math.random() * 0.6),
    top1Selections: 580,
    totalRecommendations: 1250,
    clicks: 420,
    impressions: 1400,
    dwellTimes: Array.from({ length: 800 }, () => 30 + Math.random() * 180),
    uniqueVisitors: 500,
    returnVisitors: 215,
    promoters: 120,
    passives: 80,
    detractors: 45,
    recommendedPersonaIds: Array.from(
      { length: 1250 },
      () => `persona_${Math.floor(Math.random() * 8)}`
    ),
  }
}

function generateBaseline(): MatchingKPIs {
  return {
    matchAccuracy: 0.72,
    avgMatchScore: 0.71,
    top1Accuracy: 0.44,
    diversityIndex: 0.78,
    ctr: 0.28,
    avgDwellTime: 95,
    returnRate: 0.38,
    nps: 42,
  }
}

function generateTrends(): TrendData[] {
  const now = Date.now()
  const metrics = [
    { metric: "matchAccuracy", label: "매칭 정확도" },
    { metric: "ctr", label: "CTR" },
    { metric: "diversityIndex", label: "다양성 지수" },
    { metric: "returnRate", label: "재방문율" },
  ]

  return metrics.map(({ metric, label }) => {
    const base = 0.5 + Math.random() * 0.3
    const points: TimeSeriesPoint[] = Array.from({ length: 14 }, (_, i) => ({
      timestamp: now - (13 - i) * 86400000,
      value: Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.1)),
    }))
    const trend = analyzeTrend(points)
    const changeRate = calculateChangeRate(points)

    return { metric, points, trend, changeRate }
  })
}

const TIME_RANGES: Array<{ key: TimeRange; label: string }> = [
  { key: "realtime", label: "실시간" },
  { key: "today", label: "오늘" },
  { key: "7d", label: "7일" },
  { key: "30d", label: "30일" },
]

const KPI_LABELS: Record<
  keyof MatchingKPIs,
  { label: string; format: "percent" | "number" | "nps" }
> = {
  matchAccuracy: { label: "매칭 정확도", format: "percent" },
  avgMatchScore: { label: "평균 매칭 점수", format: "percent" },
  top1Accuracy: { label: "Top-1 정확도", format: "percent" },
  diversityIndex: { label: "다양성 지수", format: "percent" },
  ctr: { label: "CTR", format: "percent" },
  avgDwellTime: { label: "평균 체류시간", format: "number" },
  returnRate: { label: "재방문율", format: "percent" },
  nps: { label: "NPS", format: "nps" },
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d")

  // 데이터
  const rawData = useMemo(() => generateSampleData(), [])
  const baseline = useMemo(() => generateBaseline(), [])
  const kpis = useMemo(() => calculateMatchingKPIs(rawData), [rawData])
  const trends = useMemo(() => generateTrends(), [])
  const anomalies = useMemo(
    () => detectAnomalies(kpis, baseline, [0.73, 0.71, 0.74, 0.72, 0.7]),
    [kpis, baseline]
  )
  const recommendations = useMemo(() => generateRecommendations(kpis), [kpis])

  // CSV 내보내기
  const handleExportCsv = useCallback(() => {
    const rows = kpisToCsvRows(kpis)
    const csv = csvRowsToString(rows)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `matching-kpis-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [kpis])

  const formatValue = useCallback((key: keyof MatchingKPIs, value: number): string => {
    const info = KPI_LABELS[key]
    if (info.format === "percent") return `${Math.round(value * 100)}%`
    if (info.format === "nps") return `${value}`
    if (key === "avgDwellTime") return `${Math.round(value)}s`
    return `${value}`
  }, [])

  const getTargetStatus = useCallback(
    (key: keyof MatchingKPIs, value: number): "above" | "below" | "none" => {
      const target = KPI_TARGETS[key]
      if (target === undefined) return "none"
      return value >= target ? "above" : "below"
    },
    []
  )

  const TrendIcon = useCallback(({ trend }: { trend: TrendData["trend"] }) => {
    if (trend === "rising") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
    if (trend === "falling") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />
    return <Minus className="text-muted-foreground h-3.5 w-3.5" />
  }, [])

  return (
    <>
      <Header title="Performance Analytics" description="매칭 성과 분석 및 리포트" />

      <div className="space-y-6 p-6">
        {/* 시간 범위 + 액션 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {TIME_RANGES.map((tr) => (
              <button
                key={tr.key}
                onClick={() => setTimeRange(tr.key)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeRange === tr.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={handleExportCsv}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            CSV 내보내기
          </Button>
        </div>

        {/* KPI 카드 그리드 */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {(Object.keys(KPI_LABELS) as Array<keyof MatchingKPIs>).map((key) => {
            const info = KPI_LABELS[key]
            const value = kpis[key]
            const status = getTargetStatus(key, value)
            const target = KPI_TARGETS[key]

            return (
              <div key={key} className="bg-card rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-xs">{info.label}</p>
                  {status !== "none" && (
                    <Badge variant={status === "above" ? "success" : "warning"}>
                      {status === "above" ? "달성" : "미달"}
                    </Badge>
                  )}
                </div>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    status === "below" ? "text-amber-400" : ""
                  }`}
                >
                  {formatValue(key, value)}
                </p>
                {target !== undefined && (
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    목표: {info.format === "percent" ? `${Math.round(target * 100)}%` : target}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* 트렌드 */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-4 text-sm font-medium">트렌드 분석 (14일)</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {trends.map((trend) => (
              <div key={trend.metric} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {KPI_LABELS[trend.metric as keyof MatchingKPIs]?.label ?? trend.metric}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <TrendIcon trend={trend.trend} />
                    <span
                      className={`text-xs font-medium ${
                        trend.trend === "rising"
                          ? "text-emerald-400"
                          : trend.trend === "falling"
                            ? "text-red-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {trend.changeRate >= 0 ? "+" : ""}
                      {Math.round(trend.changeRate * 100)}%
                    </span>
                  </div>
                </div>

                {/* 미니 차트 (스파크라인) */}
                <div className="flex items-end gap-px" style={{ height: 40 }}>
                  {trend.points.map((pt, i) => {
                    const allValues = trend.points.map((p) => p.value)
                    const min = Math.min(...allValues)
                    const max = Math.max(...allValues)
                    const range = max - min || 1
                    const height = ((pt.value - min) / range) * 100
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t ${
                          trend.trend === "rising"
                            ? "bg-emerald-500/40"
                            : trend.trend === "falling"
                              ? "bg-red-500/40"
                              : "bg-blue-500/40"
                        }`}
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 이상 탐지 */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">
            이상 탐지
            {anomalies.length > 0 && (
              <Badge variant="warning" className="ml-2">
                {anomalies.length}
              </Badge>
            )}
          </h3>

          {anomalies.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              <Activity className="h-4 w-4" />
              이상 징후가 감지되지 않았습니다
            </div>
          ) : (
            <div className="space-y-2">
              {anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`flex items-start gap-3 rounded-lg p-3 ${
                    anomaly.severity === "critical"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={anomaly.severity === "critical" ? "destructive" : "warning"}>
                        {anomaly.severity}
                      </Badge>
                      <span className="text-xs font-medium">{anomaly.type}</span>
                    </div>
                    <p className="mt-1 text-xs">{anomaly.description}</p>
                    <div className="mt-1 flex gap-4 text-[10px] opacity-60">
                      <span>기대값: {anomaly.expectedValue}</span>
                      <span>실제값: {anomaly.actualValue}</span>
                      <span>이탈: {anomaly.deviation.toFixed(2)}x</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 개선 권고 */}
        {recommendations.length > 0 && (
          <div className="bg-card rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-medium">개선 권고</h3>
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
                  <Target
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      rec.priority === "high"
                        ? "text-red-400"
                        : rec.priority === "medium"
                          ? "text-amber-400"
                          : "text-blue-400"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          rec.priority === "high"
                            ? "destructive"
                            : rec.priority === "medium"
                              ? "warning"
                              : "info"
                        }
                      >
                        {rec.priority}
                      </Badge>
                      <span className="text-xs font-medium">{rec.category}</span>
                    </div>
                    <p className="mt-1 text-xs">{rec.message}</p>
                    <div className="text-muted-foreground mt-1 text-[10px]">
                      현재: {rec.currentValue} / 목표: {rec.targetValue}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 다양성 지수 세부 */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">추천 다양성 분석</h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <div className="rounded-lg bg-purple-500/10 p-3 text-center">
              <p className="text-muted-foreground text-xs">Shannon Entropy 기반</p>
              <p className="mt-1 text-2xl font-bold text-purple-400">
                {Math.round(kpis.diversityIndex * 100)}%
              </p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3 text-center">
              <p className="text-muted-foreground text-xs">고유 페르소나 수</p>
              <p className="mt-1 text-2xl font-bold text-blue-400">
                {new Set(rawData.recommendedPersonaIds).size}
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3 text-center">
              <p className="text-muted-foreground text-xs">총 추천 수</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                {rawData.recommendedPersonaIds.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
