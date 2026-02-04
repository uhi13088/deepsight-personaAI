import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// ============================================================================
// Types
// ============================================================================

type LogEntry = {
  createdAt: Date
  statusCode: number
  latencyMs: number
  ipAddress: string | null
}

type EndpointStat = {
  endpoint: string
  _count: number
  _avg: { latencyMs: number | null }
}

type StatusStat = {
  statusCode: number
  _count: number
}

// ============================================================================
// Helper Functions
// ============================================================================

function getDateRangeForPeriod(period: string): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()

  switch (period) {
    case "24h":
      start.setHours(start.getHours() - 24)
      break
    case "7d":
      start.setDate(start.getDate() - 7)
      break
    case "30d":
      start.setDate(start.getDate() - 30)
      break
    case "90d":
      start.setDate(start.getDate() - 90)
      break
    default:
      start.setDate(start.getDate() - 7)
  }

  start.setHours(0, 0, 0, 0)
  return { start, end }
}

function formatDateForGroup(date: Date, groupBy: string): string {
  switch (groupBy) {
    case "hour":
      return date.toISOString().slice(0, 13) + ":00"
    case "day":
      return date.toISOString().slice(0, 10)
    case "week":
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      return weekStart.toISOString().slice(0, 10)
    case "month":
      return date.toISOString().slice(0, 7)
    default:
      return date.toISOString().slice(0, 10)
  }
}

// ============================================================================
// GET /api/usage - Get usage analytics
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "7d"
    const groupBy = searchParams.get("groupBy") || "day"

    // TODO: Get organizationId from session
    // const organizationId = await getOrganizationId(request)

    const { start, end } = getDateRangeForPeriod(period)

    // Fetch all data in parallel
    const [logs, successLogs, failedLogs, latencyStats, endpointStats, statusStats] =
      await Promise.all([
        // All logs in period
        prisma.apiLog.findMany({
          where: { createdAt: { gte: start, lte: end } },
          select: {
            createdAt: true,
            statusCode: true,
            latencyMs: true,
            ipAddress: true,
          },
        }),
        // Success count
        prisma.apiLog.count({
          where: { createdAt: { gte: start, lte: end }, statusCode: { lt: 400 } },
        }),
        // Failed count
        prisma.apiLog.count({
          where: { createdAt: { gte: start, lte: end }, statusCode: { gte: 400 } },
        }),
        // Latency stats
        prisma.apiLog.aggregate({
          where: { createdAt: { gte: start, lte: end } },
          _avg: { latencyMs: true },
          _max: { latencyMs: true },
          _min: { latencyMs: true },
        }),
        // By endpoint
        prisma.apiLog.groupBy({
          by: ["endpoint"],
          where: { createdAt: { gte: start, lte: end } },
          _count: true,
          _avg: { latencyMs: true },
        }),
        // By status code
        prisma.apiLog.groupBy({
          by: ["statusCode"],
          where: { createdAt: { gte: start, lte: end } },
          _count: true,
        }),
      ])

    const totalCalls = logs.length
    const successRate = totalCalls > 0 ? (successLogs / totalCalls) * 100 : 100
    const avgLatency = latencyStats._avg.latencyMs || 0

    // Calculate percentiles (simplified)
    const latencies = logs.map((l: LogEntry) => l.latencyMs).sort((a: number, b: number) => a - b)
    const p95Index = Math.floor(latencies.length * 0.95)
    const p99Index = Math.floor(latencies.length * 0.99)
    const p95Latency = latencies[p95Index] || avgLatency
    const p99Latency = latencies[p99Index] || avgLatency

    // Overview
    const overview = {
      totalCalls,
      successfulCalls: successLogs,
      failedCalls: failedLogs,
      successRate: Math.round(successRate * 100) / 100,
      averageLatency: Math.round(avgLatency),
      p95Latency: Math.round(p95Latency),
      p99Latency: Math.round(p99Latency),
      totalCost: Math.round(totalCalls * 0.002 * 100) / 100,
      quotaUsed: totalCalls,
      quotaLimit: 500000,
    }

    // Group logs by time period
    const dailyMap: Record<
      string,
      { calls: number; success: number; failed: number; latencySum: number }
    > = {}

    logs.forEach((log: LogEntry) => {
      const key = formatDateForGroup(log.createdAt, groupBy)
      if (!dailyMap[key]) {
        dailyMap[key] = { calls: 0, success: 0, failed: 0, latencySum: 0 }
      }
      dailyMap[key].calls++
      dailyMap[key].latencySum += log.latencyMs
      if (log.statusCode < 400) {
        dailyMap[key].success++
      } else {
        dailyMap[key].failed++
      }
    })

    const dailyUsage = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        calls: data.calls,
        success: data.success,
        failed: data.failed,
        cost: Math.round(data.calls * 0.002 * 100) / 100,
        avgLatency: Math.round(data.latencySum / data.calls),
      }))

    // By endpoint
    const totalEndpointCalls = endpointStats.reduce(
      (acc: number, e: EndpointStat) => acc + e._count,
      0
    )
    const byEndpoint = endpointStats
      .map((stat: EndpointStat) => {
        const successCount =
          logs.filter((l: LogEntry) => l.statusCode < 400).length *
          (stat._count / Math.max(totalEndpointCalls, 1))
        return {
          endpoint: stat.endpoint,
          calls: stat._count,
          percentage:
            totalEndpointCalls > 0 ? Math.round((stat._count / totalEndpointCalls) * 1000) / 10 : 0,
          avgLatency: Math.round(stat._avg.latencyMs || 0),
          successRate: Math.round((successCount / Math.max(stat._count, 1)) * 100 * 10) / 10,
        }
      })
      .sort((a: { calls: number }, b: { calls: number }) => b.calls - a.calls)

    // By status code
    const byStatusCode = statusStats
      .map((stat: StatusStat) => ({
        code: stat.statusCode,
        count: stat._count,
        percentage: totalCalls > 0 ? Math.round((stat._count / totalCalls) * 1000) / 10 : 0,
      }))
      .sort((a: { code: number }, b: { code: number }) => a.code - b.code)

    // By region (simplified - extract from IP if available)
    const regionMap: Record<string, number> = {}
    logs.forEach((_log: LogEntry) => {
      // In production, use IP geolocation service
      const region = "Unknown"
      regionMap[region] = (regionMap[region] || 0) + 1
    })

    const byRegion = Object.entries(regionMap).map(([region, calls]) => ({
      region,
      calls,
      percentage: totalCalls > 0 ? Math.round((calls / totalCalls) * 1000) / 10 : 0,
    }))

    // Hourly distribution (for 24h or 7d period)
    const hourlyMap: Record<string, number> = {}
    for (let i = 0; i < 24; i++) {
      hourlyMap[i.toString().padStart(2, "0")] = 0
    }
    logs.forEach((log: LogEntry) => {
      const hour = log.createdAt.getHours().toString().padStart(2, "0")
      hourlyMap[hour]++
    })

    const hourlyDistribution = Object.entries(hourlyMap).map(([hour, calls]) => ({
      hour,
      calls,
    }))

    return NextResponse.json({
      success: true,
      data: {
        period,
        overview,
        dailyUsage,
        byEndpoint,
        byStatusCode,
        byRegion,
        hourlyDistribution,
      },
    })
  } catch (error) {
    console.error("Error fetching usage data:", error)
    // Return empty data on error to prevent 500
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "7d"
    return NextResponse.json({
      success: true,
      data: {
        period,
        overview: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          successRate: 100,
          averageLatency: 0,
          p95Latency: 0,
          p99Latency: 0,
          totalCost: 0,
          quotaUsed: 0,
          quotaLimit: 3000,
        },
        dailyUsage: [],
        byEndpoint: [],
        byStatusCode: [],
        byRegion: [],
        hourlyDistribution: [],
      },
    })
  }
}
