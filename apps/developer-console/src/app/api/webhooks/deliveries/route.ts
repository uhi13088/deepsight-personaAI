import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/require-auth"

// ============================================================================
// GET /api/webhooks/deliveries - 웹훅 배달 로그 조회
// ============================================================================

export async function GET(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get("webhookId")

    const where = webhookId ? { webhookId } : {}

    const deliveryLogs = await prisma.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        webhook: {
          select: {
            url: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        logs: deliveryLogs.map((log) => ({
          id: log.id,
          webhookId: log.webhookId,
          event: log.event,
          status: log.status,
          statusCode: log.statusCode || 0,
          latency: log.latencyMs || 0,
          timestamp: log.createdAt.toISOString(),
          requestId: log.id,
          webhookUrl: log.webhook.url,
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching delivery logs:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch delivery logs" },
      },
      { status: 500 }
    )
  }
}
