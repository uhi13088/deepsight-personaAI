import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/internal/alerts/history
 *
 * 알림 히스토리 조회.
 * Query params:
 * - severity?: "critical" | "warning" | "info"
 * - category?: "security" | "cost" | "quality" | "system"
 * - limit?: number (기본 50)
 * - cursor?: string (pagination)
 */
export async function GET(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  const { searchParams } = new URL(request.url)
  const severity = searchParams.get("severity")
  const category = searchParams.get("category")
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100)
  const cursor = searchParams.get("cursor")

  const where: Record<string, unknown> = {}
  if (severity) where.severity = severity
  if (category) where.category = category

  const alerts = await prisma.alertLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const hasMore = alerts.length > limit
  const sliced = hasMore ? alerts.slice(0, limit) : alerts
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : null

  // 최근 24시간 알림 카운트
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const recentCount = await prisma.alertLog.count({
    where: { createdAt: { gte: since24h } },
  })

  return NextResponse.json({
    success: true,
    data: {
      alerts: sliced,
      nextCursor,
      hasMore,
      recentCount,
    },
  })
}
