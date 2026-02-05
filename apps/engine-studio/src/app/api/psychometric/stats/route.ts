import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/psychometric/stats - 심리측정 모델 통계 조회
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    // 병렬로 통계 데이터 조회
    const [totalProcessed, avgResponseTime, userVectorCount, recentLogs, sampleVector] =
      await Promise.all([
        // 총 처리 건수
        prisma.matchingLog.count().catch(() => 0),
        // 평균 응답 시간
        prisma.matchingLog
          .aggregate({
            _avg: { responseTimeMs: true },
          })
          .catch(() => ({ _avg: { responseTimeMs: null } })),
        // 사용자 벡터 수
        prisma.userVector.count().catch(() => 0),
        // 최근 7일 매칭 로그 (일별 그룹핑)
        prisma.$queryRaw<Array<{ date: string; count: bigint; avg_response: number }>>`
          SELECT
            DATE("createdAt") as date,
            COUNT(*) as count,
            AVG("responseTimeMs") as avg_response
          FROM matching_logs
          WHERE "createdAt" >= NOW() - INTERVAL '7 days'
          GROUP BY DATE("createdAt")
          ORDER BY date ASC
        `.catch(() => []),
        // 샘플 사용자 벡터 (최근 1개)
        prisma.userVector
          .findFirst({
            orderBy: { updatedAt: "desc" },
          })
          .catch(() => null),
      ])

    // 피드백 기반 정확도 계산
    const [totalFeedback, positiveFeedback] = await Promise.all([
      prisma.matchingLog.count({ where: { feedback: { not: null } } }).catch(() => 0),
      prisma.matchingLog.count({ where: { feedback: "LIKE" } }).catch(() => 0),
    ])

    const accuracy = totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0

    // 모델 설정 정보
    const modelConfig = await prisma.systemConfig
      .findFirst({
        where: { category: "PSYCHOMETRIC", key: "model_config" },
      })
      .catch(() => null)

    const lastUpdatedConfig = await prisma.systemConfig
      .findFirst({
        where: { category: "PSYCHOMETRIC" },
        orderBy: { updatedAt: "desc" },
      })
      .catch(() => null)

    // 정확도 트렌드 데이터 구성
    const accuracyTrend = recentLogs.map((log) => ({
      date: String(log.date).split("T")[0],
      accuracy: log.avg_response ? Math.min(100, 100 - log.avg_response / 100) : accuracy,
      samples: Number(log.count),
    }))

    // 샘플 벡터 구성
    const sampleVectorData = sampleVector
      ? {
          depth: Number(sampleVector.depth),
          lens: Number(sampleVector.lens),
          stance: Number(sampleVector.stance),
          scope: Number(sampleVector.scope),
          taste: Number(sampleVector.taste),
          purpose: Number(sampleVector.purpose),
        }
      : null

    return NextResponse.json({
      success: true,
      data: {
        modelConfig: {
          version: (modelConfig?.value as Record<string, unknown>)?.version ?? "3.0",
          lastUpdated: lastUpdatedConfig?.updatedAt?.toISOString() ?? new Date().toISOString(),
          status: "active",
          accuracy: Math.round(accuracy * 10) / 10,
          totalProcessed,
          avgInferenceTime: Math.round(avgResponseTime._avg.responseTimeMs ?? 0),
        },
        accuracyTrend,
        sampleVector: sampleVectorData,
        userVectorCount,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/psychometric/stats error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "통계 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
