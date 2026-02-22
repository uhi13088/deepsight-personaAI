import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import type { Environment, ApiKeyStatus } from "@/generated/prisma"
import { requireAuth } from "@/lib/require-auth"
import { getUserOrganization } from "@/lib/get-user-organization"
import { API_COST_PER_CALL, getQuotaByPlan } from "@/lib/constants"

// ============================================================================
// Helper Functions
// ============================================================================

function getDateRange(days: number): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ============================================================================
// GET /api/dashboard/stats - Get dashboard statistics
// ============================================================================

export async function GET(request: NextRequest) {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const membership = await getUserOrganization(session.user.id)
    const orgFilter = membership ? { organizationId: membership.organizationId } : {}

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

    // Fetch all stats in parallel
    const [
      todayLogs,
      yesterdayLogs,
      thisMonthLogs,
      lastMonthLogs,
      recentLogs,
      apiKeys,
      last7DaysLogs,
      endpointStats,
    ] = await Promise.all([
      // Today's logs
      prisma.apiLog.aggregate({
        where: { ...orgFilter, createdAt: { gte: today } },
        _count: true,
        _avg: { latencyMs: true },
      }),
      // Yesterday's logs
      prisma.apiLog.aggregate({
        where: { ...orgFilter, createdAt: { gte: yesterday, lt: today } },
        _count: true,
      }),
      // This month's logs
      prisma.apiLog.aggregate({
        where: { ...orgFilter, createdAt: { gte: thisMonthStart } },
        _count: true,
        _avg: { latencyMs: true },
      }),
      // Last month's logs
      prisma.apiLog.aggregate({
        where: { ...orgFilter, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _count: true,
      }),
      // Recent activity (last 10 logs)
      prisma.apiLog.findMany({
        where: orgFilter,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          createdAt: true,
          method: true,
          endpoint: true,
          statusCode: true,
          latencyMs: true,
          requestId: true,
        },
      }),
      // API keys (scoped to org)
      prisma.apiKey.groupBy({
        by: ["environment", "status"],
        where: membership ? { organizationId: membership.organizationId } : {},
        _count: true,
      }),
      // Last 7 days aggregated
      prisma.apiLog.findMany({
        where: { ...orgFilter, createdAt: { gte: getDateRange(7).start } },
        select: { createdAt: true },
      }),
      // Endpoint stats
      prisma.apiLog.groupBy({
        by: ["endpoint"],
        where: { ...orgFilter, createdAt: { gte: thisMonthStart } },
        _count: true,
      }),
    ])

    // Calculate success rate
    const [successCount, totalCount] = await Promise.all([
      prisma.apiLog.count({
        where: { ...orgFilter, createdAt: { gte: thisMonthStart }, statusCode: { lt: 400 } },
      }),
      prisma.apiLog.count({
        where: { ...orgFilter, createdAt: { gte: thisMonthStart } },
      }),
    ])

    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 100

    // Calculate latency percentiles (simplified - using aggregates)
    const latencyStats = await prisma.apiLog.aggregate({
      where: { createdAt: { gte: thisMonthStart } },
      _avg: { latencyMs: true },
      _min: { latencyMs: true },
      _max: { latencyMs: true },
    })

    // Process API keys
    const activeKeys = {
      total: 0,
      live: 0,
      test: 0,
    }
    apiKeys.forEach((key: { environment: Environment; status: ApiKeyStatus; _count: number }) => {
      if (key.status === "ACTIVE") {
        activeKeys.total += key._count
        if (key.environment === "LIVE") {
          activeKeys.live += key._count
        } else {
          activeKeys.test += key._count
        }
      }
    })

    // Process last 7 days data
    const dailyData: Record<string, number> = {}
    const { start } = getDateRange(7)
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      dailyData[date.toDateString()] = 0
    }
    last7DaysLogs.forEach((log: { createdAt: Date }) => {
      const dateKey = log.createdAt.toDateString()
      if (dailyData[dateKey] !== undefined) {
        dailyData[dateKey]++
      }
    })

    const usageByDay = Object.entries(dailyData).map(([dateStr, calls]) => ({
      date: formatDate(new Date(dateStr)),
      calls,
    }))

    // Process endpoint stats
    type EndpointStat = { endpoint: string; _count: number }
    const totalEndpointCalls = endpointStats.reduce(
      (acc: number, stat: EndpointStat) => acc + stat._count,
      0
    )
    const usageByEndpoint = endpointStats
      .map((stat: EndpointStat) => ({
        endpoint: stat.endpoint,
        calls: stat._count,
        percentage:
          totalEndpointCalls > 0 ? Math.round((stat._count / totalEndpointCalls) * 1000) / 10 : 0,
      }))
      .sort((a: { calls: number }, b: { calls: number }) => b.calls - a.calls)
      .slice(0, 5)

    // Calculate change percentages
    const monthlyChange =
      lastMonthLogs._count > 0
        ? Math.round(((thisMonthLogs._count - lastMonthLogs._count) / lastMonthLogs._count) * 100)
        : 0

    // Build response
    const stats = {
      apiCalls: {
        today: todayLogs._count,
        yesterday: yesterdayLogs._count,
        thisMonth: thisMonthLogs._count,
        lastMonth: lastMonthLogs._count,
        change: monthlyChange,
      },
      successRate: {
        value: Math.round(successRate * 10) / 10,
        change: 0, // Would need historical data to calculate
      },
      latency: {
        p50: Math.round(latencyStats._avg.latencyMs || 0),
        p95: Math.round((latencyStats._avg.latencyMs || 0) * 1.5), // Approximation
        p99: Math.round((latencyStats._max.latencyMs || 0) * 0.9), // Approximation
        change: 0, // Would need historical data to calculate
      },
      cost: {
        thisMonth: Math.round(thisMonthLogs._count * API_COST_PER_CALL * 100) / 100,
        lastMonth: Math.round(lastMonthLogs._count * API_COST_PER_CALL * 100) / 100,
        quotaUsed: totalCount,
        quotaLimit: membership ? getQuotaByPlan(membership.organization.plan) : 0,
      },
      activeKeys,
    }

    type RecentLog = {
      id: string
      createdAt: Date
      method: string
      endpoint: string
      statusCode: number
      latencyMs: number
      requestId: string
    }
    const recentActivity = recentLogs.map((log: RecentLog) => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      endpoint: `${log.method} ${log.endpoint}`,
      status: log.statusCode,
      latency: log.latencyMs,
      requestId: log.requestId,
    }))

    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentActivity,
        usageByDay,
        usageByEndpoint,
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "대시보드 통계 조회에 실패했습니다." },
      },
      { status: 500 }
    )
  }
}
