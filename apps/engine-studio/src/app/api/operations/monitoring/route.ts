import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/operations/monitoring - 시스템 모니터링 데이터
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
    const period = searchParams.get("period") || "1h" // 1h, 6h, 24h, 7d
    const metricType = searchParams.get("type") // CPU, MEMORY, DISK, API_LATENCY, ERROR_RATE

    // 기간 계산
    const now = new Date()
    let startDate: Date
    switch (period) {
      case "6h":
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000)
        break
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 60 * 60 * 1000)
    }

    const where: { recordedAt: { gte: Date }; metricType?: string } = {
      recordedAt: { gte: startDate },
    }

    if (metricType && metricType !== "all") {
      where.metricType = metricType
    }

    const metrics = await prisma.systemMetric.findMany({
      where,
      orderBy: { recordedAt: "asc" },
      take: 1000,
    })

    // 메트릭 타입별로 그룹화
    const groupedMetrics = metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.metricType]) {
          acc[metric.metricType] = []
        }
        acc[metric.metricType].push({
          value: Number(metric.value),
          unit: metric.unit,
          tags: metric.tags,
          recordedAt: metric.recordedAt.toISOString(),
        })
        return acc
      },
      {} as Record<string, { value: number; unit: string; tags: unknown; recordedAt: string }[]>
    )

    // 현재 상태 요약 (최신 값 기준)
    const latestMetrics = await prisma.systemMetric.findMany({
      where: { recordedAt: { gte: new Date(now.getTime() - 5 * 60 * 1000) } },
      orderBy: { recordedAt: "desc" },
      distinct: ["metricType"],
    })

    const currentStatus = latestMetrics.reduce(
      (acc, metric) => {
        acc[metric.metricType] = {
          value: Number(metric.value),
          unit: metric.unit,
          status:
            metric.metricType === "ERROR_RATE"
              ? Number(metric.value) > 5
                ? "warning"
                : "healthy"
              : metric.metricType === "CPU" || metric.metricType === "MEMORY"
                ? Number(metric.value) > 80
                  ? "warning"
                  : "healthy"
                : "healthy",
        }
        return acc
      },
      {} as Record<string, { value: number; unit: string; status: string }>
    )

    return NextResponse.json({
      success: true,
      data: {
        period,
        currentStatus,
        metrics: groupedMetrics,
        summary: {
          totalDataPoints: metrics.length,
          metricTypes: Object.keys(groupedMetrics),
        },
      },
    })
  } catch (error) {
    console.error("[API] GET /api/operations/monitoring error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "모니터링 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
