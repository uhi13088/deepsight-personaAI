import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  calculateMatchingKPIs,
  detectAnomalies,
  buildAnalyticsDashboard,
  KPI_TARGETS,
} from "@/lib/matching/analytics"
import type {
  MatchingKPIs,
  RawMatchingData,
  AnalyticsDashboard,
  SegmentFilter,
  TimeRange,
} from "@/lib/matching/analytics"
import { generateRecommendations } from "@/lib/matching/report"
import type { RecommendationItem } from "@/lib/matching/report"

interface AnalyticsResponse {
  kpis: MatchingKPIs
  anomalies: ReturnType<typeof detectAnomalies>
  recommendations: RecommendationItem[]
  filter: SegmentFilter
}

// GET — 매칭 성과 대시보드 데이터 반환
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = (searchParams.get("timeRange") ?? "7d") as TimeRange

    // 실제 구현 시 DB 조회로 대체
    const rawData: RawMatchingData = {
      totalMatches: 1250,
      likedMatches: 940,
      matchScores: Array.from({ length: 100 }, () => 0.3 + Math.random() * 0.6),
      top1Selections: 580,
      totalRecommendations: 1250,
      clicks: 420,
      impressions: 1400,
      dwellTimes: Array.from({ length: 100 }, () => 30 + Math.random() * 180),
      uniqueVisitors: 500,
      returnVisitors: 215,
      promoters: 120,
      passives: 80,
      detractors: 45,
      recommendedPersonaIds: Array.from(
        { length: 100 },
        () => `persona_${Math.floor(Math.random() * 8)}`
      ),
    }

    const kpis = calculateMatchingKPIs(rawData)

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

    const anomalies = detectAnomalies(kpis, baseline)
    const recommendations = generateRecommendations(kpis)
    const filter: SegmentFilter = { timeRange, segment: "all" }

    return NextResponse.json<ApiResponse<AnalyticsResponse>>({
      success: true,
      data: { kpis, anomalies, recommendations, filter },
    })
  } catch (error) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "분석 데이터 조회 실패" },
      },
      { status: 500 }
    )
  }
}
