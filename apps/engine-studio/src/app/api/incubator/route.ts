import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/incubator - 인큐베이터 통계 및 오늘의 페르소나
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const view = searchParams.get("view") || "stats" // stats, today, history

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (view === "stats") {
      // 통계 데이터
      const [totalGenerated, passedToday, failedToday, pendingReview] = await Promise.all([
        prisma.incubatorLog.count(),
        prisma.incubatorLog.count({
          where: { batchDate: { gte: today }, status: "PASSED" },
        }),
        prisma.incubatorLog.count({
          where: { batchDate: { gte: today }, status: "FAILED" },
        }),
        prisma.incubatorLog.count({
          where: { status: "PENDING" },
        }),
      ])

      // 최근 7일 트렌드
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentLogs = await prisma.incubatorLog.groupBy({
        by: ["status"],
        where: { batchDate: { gte: sevenDaysAgo } },
        _count: true,
      })

      const weeklyStats = recentLogs.reduce(
        (acc, item) => {
          acc[item.status.toLowerCase()] = item._count
          return acc
        },
        {} as Record<string, number>
      )

      return NextResponse.json({
        success: true,
        data: {
          totalGenerated,
          todayStats: {
            passed: passedToday,
            failed: failedToday,
            total: passedToday + failedToday,
          },
          pendingReview,
          weeklyStats,
          passRate:
            passedToday + failedToday > 0
              ? Math.round((passedToday / (passedToday + failedToday)) * 100)
              : 0,
        },
      })
    }

    if (view === "today") {
      // 오늘 생성된 페르소나
      const todayLogs = await prisma.incubatorLog.findMany({
        where: { batchDate: { gte: today } },
        orderBy: { createdAt: "desc" },
      })

      const data = todayLogs.map((log) => ({
        id: log.id,
        batchId: log.batchId,
        personaConfig: log.personaConfig,
        generatedVector: log.generatedVector,
        generatedPrompt: log.generatedPrompt,
        status: log.status,
        scores: {
          consistency: log.consistencyScore ? Number(log.consistencyScore) : null,
          vectorAlignment: log.vectorAlignmentScore ? Number(log.vectorAlignmentScore) : null,
          toneMatch: log.toneMatchScore ? Number(log.toneMatchScore) : null,
          reasoningQuality: log.reasoningQualityScore ? Number(log.reasoningQualityScore) : null,
        },
        createdAt: log.createdAt.toISOString(),
      }))

      return NextResponse.json({
        success: true,
        data,
        total: data.length,
      })
    }

    if (view === "history") {
      // 히스토리 (페이지네이션)
      const page = parseInt(searchParams.get("page") || "1")
      const limit = parseInt(searchParams.get("limit") || "20")
      const status = searchParams.get("status")

      const where = status && status !== "all" ? { status: status as never } : {}

      const [logs, total] = await Promise.all([
        prisma.incubatorLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.incubatorLog.count({ where }),
      ])

      const data = logs.map((log) => ({
        id: log.id,
        batchId: log.batchId,
        batchDate: log.batchDate.toISOString(),
        status: log.status,
        scores: {
          consistency: log.consistencyScore ? Number(log.consistencyScore) : null,
          vectorAlignment: log.vectorAlignmentScore ? Number(log.vectorAlignmentScore) : null,
          toneMatch: log.toneMatchScore ? Number(log.toneMatchScore) : null,
          reasoningQuality: log.reasoningQualityScore ? Number(log.reasoningQualityScore) : null,
        },
        createdAt: log.createdAt.toISOString(),
      }))

      return NextResponse.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "BAD_REQUEST", message: "유효하지 않은 view 파라미터입니다" },
      },
      { status: 400 }
    )
  } catch (error) {
    console.error("[API] GET /api/incubator error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "인큐베이터 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
