import { NextRequest, NextResponse } from "next/server"

// ============================================================================
// GET /api/webhooks - 웹훅 목록 조회
// ============================================================================

export async function GET() {
  // Return mock data until database is properly set up
  const webhooks = [
    {
      id: "webhook-1",
      url: "https://api.example.com/webhooks",
      description: "Production webhook",
      status: "active" as const,
      events: ["api.request.completed", "api.key.created"],
      secret: "whsec_ab12...",
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastDelivery: {
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        status: "SUCCESS",
        statusCode: 200,
        latency: 120,
      },
      stats: {
        totalDeliveries: 156,
        successRate: 98,
        avgLatency: 145,
      },
    },
  ]

  const deliveryLogs = [
    {
      id: "delivery-1",
      webhookId: "webhook-1",
      event: "api.request.completed",
      status: "SUCCESS",
      statusCode: 200,
      latency: 120,
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      requestId: "req-123",
    },
    {
      id: "delivery-2",
      webhookId: "webhook-1",
      event: "api.key.created",
      status: "SUCCESS",
      statusCode: 200,
      latency: 98,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      requestId: "req-124",
    },
  ]

  return NextResponse.json({
    success: true,
    data: {
      webhooks,
      deliveryLogs,
    },
  })
}

// ============================================================================
// POST /api/webhooks - 웹훅 생성
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, description, events } = body

    if (!url || !events || events.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "URL과 이벤트를 입력해주세요." },
        },
        { status: 400 }
      )
    }

    const webhook = {
      id: `webhook-${Date.now()}`,
      url,
      description: description || "",
      status: "active" as const,
      events,
      secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
      createdAt: new Date().toISOString(),
      lastDelivery: {
        timestamp: "",
        status: "never",
        statusCode: 0,
        latency: 0,
      },
      stats: {
        totalDeliveries: 0,
        successRate: 100,
        avgLatency: 0,
      },
    }

    return NextResponse.json({
      success: true,
      data: { webhook },
      message: "웹훅이 생성되었습니다",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to create webhook" },
      },
      { status: 500 }
    )
  }
}
