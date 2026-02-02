import { NextRequest, NextResponse } from "next/server"

// GET /api/usage - Get usage analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "7d" // 24h, 7d, 30d, 90d
    const groupBy = searchParams.get("groupBy") || "day" // hour, day, week, month

    // Mock usage data - replace with database queries
    const overview = {
      totalCalls: 156789,
      successfulCalls: 155234,
      failedCalls: 1555,
      successRate: 99.01,
      averageLatency: 142,
      p95Latency: 285,
      p99Latency: 412,
      totalCost: 312.45,
      quotaUsed: 65,
      quotaLimit: 500000,
    }

    const dailyUsage = [
      {
        date: "2025-01-10",
        calls: 22100,
        success: 21890,
        failed: 210,
        cost: 44.2,
        avgLatency: 138,
      },
      {
        date: "2025-01-11",
        calls: 24250,
        success: 24100,
        failed: 150,
        cost: 48.5,
        avgLatency: 145,
      },
      {
        date: "2025-01-12",
        calls: 19800,
        success: 19650,
        failed: 150,
        cost: 39.6,
        avgLatency: 132,
      },
      {
        date: "2025-01-13",
        calls: 26400,
        success: 26200,
        failed: 200,
        cost: 52.8,
        avgLatency: 148,
      },
      {
        date: "2025-01-14",
        calls: 25380,
        success: 25100,
        failed: 280,
        cost: 50.76,
        avgLatency: 155,
      },
      {
        date: "2025-01-15",
        calls: 21200,
        success: 21050,
        failed: 150,
        cost: 42.4,
        avgLatency: 140,
      },
      {
        date: "2025-01-16",
        calls: 17659,
        success: 17244,
        failed: 415,
        cost: 33.32,
        avgLatency: 142,
      },
    ]

    const byEndpoint = [
      { endpoint: "/v1/match", calls: 98500, percentage: 62.8, avgLatency: 156, successRate: 99.1 },
      {
        endpoint: "/v1/personas",
        calls: 35200,
        percentage: 22.4,
        avgLatency: 45,
        successRate: 99.8,
      },
      {
        endpoint: "/v1/feedback",
        calls: 18400,
        percentage: 11.7,
        avgLatency: 32,
        successRate: 99.5,
      },
      {
        endpoint: "/v1/batch-match",
        calls: 4689,
        percentage: 3.0,
        avgLatency: 890,
        successRate: 98.2,
      },
    ]

    const byStatusCode = [
      { code: 200, count: 145234, percentage: 92.6 },
      { code: 201, count: 10000, percentage: 6.4 },
      { code: 400, count: 890, percentage: 0.57 },
      { code: 401, count: 234, percentage: 0.15 },
      { code: 429, count: 312, percentage: 0.2 },
      { code: 500, count: 119, percentage: 0.08 },
    ]

    const byRegion = [
      { region: "Asia Pacific", calls: 89500, percentage: 57.1 },
      { region: "North America", calls: 42300, percentage: 27.0 },
      { region: "Europe", calls: 18900, percentage: 12.1 },
      { region: "Others", calls: 6089, percentage: 3.9 },
    ]

    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour: hour.toString().padStart(2, "0"),
      calls: Math.floor(1000 + Math.random() * 11000),
    }))

    return NextResponse.json({
      period,
      overview,
      dailyUsage,
      byEndpoint,
      byStatusCode,
      byRegion,
      hourlyDistribution,
    })
  } catch (error) {
    console.error("Error fetching usage data:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch usage data" } },
      { status: 500 }
    )
  }
}
