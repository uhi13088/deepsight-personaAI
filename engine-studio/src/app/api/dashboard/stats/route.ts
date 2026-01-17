import { NextRequest, NextResponse } from "next/server"

// GET /api/dashboard/stats - 대시보드 통계 조회
export async function GET(request: NextRequest) {
  try {
    // Mock 데이터 (실제로는 DB에서 조회)
    const stats = {
      kpi: {
        totalMatches: 156789,
        todayMatches: 3456,
        matchingAccuracy: 94.2,
        avgMatchScore: 87.5,
        ctr: 23.8,
        nps: 72,
        activePersonas: 48,
        totalPersonas: 52,
      },
      trend: [
        { date: "01/10", matches: 2800, accuracy: 93.1 },
        { date: "01/11", matches: 3200, accuracy: 93.8 },
        { date: "01/12", matches: 2950, accuracy: 94.0 },
        { date: "01/13", matches: 3100, accuracy: 93.5 },
        { date: "01/14", matches: 3400, accuracy: 94.2 },
        { date: "01/15", matches: 3250, accuracy: 94.5 },
        { date: "01/16", matches: 3456, accuracy: 94.2 },
      ],
      topPersonas: [
        { name: "논리적 평론가", matches: 12340, accuracy: 96.2, score: 92 },
        { name: "감성 에세이스트", matches: 10890, accuracy: 94.8, score: 89 },
        { name: "트렌드 헌터", matches: 9560, accuracy: 93.5, score: 87 },
        { name: "균형 잡힌 가이드", matches: 8230, accuracy: 95.1, score: 85 },
        { name: "시네필 평론가", matches: 7890, accuracy: 94.2, score: 83 },
      ],
      recentActivity: [
        {
          id: "1",
          type: "PERSONA_DEPLOYED",
          title: "페르소나 배포 완료",
          description: "'논리적 평론가' 페르소나가 프로덕션에 배포되었습니다.",
          time: "10분 전",
          status: "success",
        },
        {
          id: "2",
          type: "AB_TEST_COMPLETED",
          title: "A/B 테스트 완료",
          description: "'알고리즘 v2.1' 테스트가 종료되었습니다.",
          time: "1시간 전",
          status: "info",
        },
      ],
      systemStatus: {
        api: { status: "healthy", latency: 142 },
        database: { status: "healthy", connections: 45 },
        matchingEngine: { status: "healthy", qps: 234 },
        incubator: { status: "idle", lastRun: "03:00 AM" },
      },
    }

    return NextResponse.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}
