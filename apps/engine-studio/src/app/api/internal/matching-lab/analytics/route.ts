import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  calculateMatchingKPIs,
  detectAnomalies,
  analyzeTrend,
  calculateChangeRate,
} from "@/lib/matching/analytics"
import type {
  MatchingKPIs,
  RawMatchingData,
  SegmentFilter,
  TimeRange,
  TrendData,
  TimeSeriesPoint,
  AnomalyEvent,
} from "@/lib/matching/analytics"
import { generateRecommendations } from "@/lib/matching/report"
import type { RecommendationItem } from "@/lib/matching/report"

// ── Module-level store (persists during server session) ─────────

interface AnalyticsStore {
  rawData: RawMatchingData
  baseline: MatchingKPIs
  trends: TrendData[]
}

let analyticsStore: AnalyticsStore | null = null

function getAnalyticsStore(): AnalyticsStore {
  if (!analyticsStore) {
    analyticsStore = createInitialAnalyticsData()
  }
  return analyticsStore
}

function createInitialAnalyticsData(): AnalyticsStore {
  const rawData: RawMatchingData = {
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

  const baseline: MatchingKPIs = {
    matchAccuracy: 0.72,
    avgMatchScore: 0.71,
    top1Accuracy: 0.44,
    diversityIndex: 0.78,
    ctr: 0.28,
    avgDwellTime: 95,
    returnRate: 0.38,
    nps: 42,
  }

  const now = Date.now()
  const metrics = [
    { metric: "matchAccuracy", label: "매칭 정확도" },
    { metric: "ctr", label: "CTR" },
    { metric: "diversityIndex", label: "다양성 지수" },
    { metric: "returnRate", label: "재방문율" },
  ]

  const trends: TrendData[] = metrics.map(({ metric }) => {
    const base = 0.5 + Math.random() * 0.3
    const points: TimeSeriesPoint[] = Array.from({ length: 14 }, (_, i) => ({
      timestamp: now - (13 - i) * 86400000,
      value: Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.1)),
    }))
    const trend = analyzeTrend(points)
    const changeRate = calculateChangeRate(points)

    return { metric, points, trend, changeRate }
  })

  return { rawData, baseline, trends }
}

// ── Types ───────────────────────────────────────────────────────

interface AnalyticsResponse {
  kpis: MatchingKPIs
  anomalies: AnomalyEvent[]
  recommendations: RecommendationItem[]
  trends: TrendData[]
  filter: SegmentFilter
  diversityInfo: {
    uniquePersonaCount: number
    totalRecommendations: number
  }
}

// ── GET — 매칭 성과 대시보드 데이터 반환 ────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = (searchParams.get("timeRange") ?? "7d") as TimeRange

    const store = getAnalyticsStore()

    const kpis = calculateMatchingKPIs(store.rawData)
    const anomalies = detectAnomalies(kpis, store.baseline, [0.73, 0.71, 0.74, 0.72, 0.7])
    const recommendations = generateRecommendations(kpis)
    const filter: SegmentFilter = { timeRange, segment: "all" }

    const uniquePersonaCount = new Set(store.rawData.recommendedPersonaIds).size
    const totalRecommendations = store.rawData.recommendedPersonaIds.length

    return NextResponse.json<ApiResponse<AnalyticsResponse>>({
      success: true,
      data: {
        kpis,
        anomalies,
        recommendations,
        trends: store.trends,
        filter,
        diversityInfo: {
          uniquePersonaCount,
          totalRecommendations,
        },
      },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "분석 데이터 조회 실패" },
      },
      { status: 500 }
    )
  }
}
