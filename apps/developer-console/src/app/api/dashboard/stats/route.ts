import { NextRequest, NextResponse } from "next/server"

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    // TODO: Get organization ID from session/auth
    const organizationId = "org_xyz789"

    // Mock dashboard data - replace with database queries
    const stats = {
      apiCalls: {
        today: 1234,
        yesterday: 1100,
        thisMonth: 45678,
        lastMonth: 42000,
        change: 12.5, // percentage
      },
      successRate: {
        value: 99.8,
        change: 0.2,
      },
      latency: {
        p50: 85,
        p95: 142,
        p99: 285,
        change: -5, // negative is improvement
      },
      cost: {
        thisMonth: 234.56,
        lastMonth: 198.34,
        quotaUsed: 65,
        quotaLimit: 500000,
      },
      activeKeys: {
        total: 3,
        live: 1,
        test: 2,
      },
    }

    const recentActivity = [
      {
        id: "1",
        timestamp: new Date().toISOString(),
        endpoint: "POST /v1/match",
        status: 200,
        latency: 145,
        requestId: "req_abc123",
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 30000).toISOString(),
        endpoint: "POST /v1/match",
        status: 200,
        latency: 132,
        requestId: "req_def456",
      },
      {
        id: "3",
        timestamp: new Date(Date.now() - 60000).toISOString(),
        endpoint: "POST /v1/feedback",
        status: 201,
        latency: 45,
        requestId: "req_ghi789",
      },
      {
        id: "4",
        timestamp: new Date(Date.now() - 90000).toISOString(),
        endpoint: "POST /v1/match",
        status: 400,
        latency: 12,
        requestId: "req_jkl012",
      },
      {
        id: "5",
        timestamp: new Date(Date.now() - 120000).toISOString(),
        endpoint: "GET /v1/personas",
        status: 200,
        latency: 78,
        requestId: "req_mno345",
      },
    ]

    const usageByDay = [
      { date: "Jan 10", calls: 22100 },
      { date: "Jan 11", calls: 24250 },
      { date: "Jan 12", calls: 19800 },
      { date: "Jan 13", calls: 26400 },
      { date: "Jan 14", calls: 25380 },
      { date: "Jan 15", calls: 21200 },
      { date: "Jan 16", calls: 17659 },
    ]

    const usageByEndpoint = [
      { endpoint: "/v1/match", calls: 98500, percentage: 62.8 },
      { endpoint: "/v1/personas", calls: 35200, percentage: 22.4 },
      { endpoint: "/v1/feedback", calls: 18400, percentage: 11.7 },
      { endpoint: "/v1/batch-match", calls: 4689, percentage: 3.0 },
    ]

    return NextResponse.json({
      stats,
      recentActivity,
      usageByDay,
      usageByEndpoint,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch dashboard stats" } },
      { status: 500 }
    )
  }
}
