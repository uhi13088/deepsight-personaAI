import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import crypto from "crypto"

const createWebhookSchema = z.object({
  url: z.string().url(),
  description: z.string().optional(),
  events: z.array(z.string()).min(1),
})

// ============================================================================
// GET /api/webhooks - 웹훅 목록 조회
// ============================================================================

export async function GET() {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { deliveries: true },
        },
      },
    })

    const deliveryLogs = await prisma.webhookDelivery.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        webhook: {
          select: { url: true },
        },
      },
    })

    const webhooksWithStats = await Promise.all(
      webhooks.map(async (webhook) => {
        const deliveryStats = await prisma.webhookDelivery.aggregate({
          where: { webhookId: webhook.id },
          _count: true,
          _avg: { latencyMs: true },
        })

        const successCount = await prisma.webhookDelivery.count({
          where: { webhookId: webhook.id, status: "SUCCESS" },
        })

        const lastDelivery = webhook.deliveries[0]

        return {
          id: webhook.id,
          url: webhook.url,
          description: webhook.description || "",
          status: webhook.status.toLowerCase() as "active" | "disabled",
          events: webhook.events,
          secret: webhook.secret.substring(0, 8) + "...",
          createdAt: webhook.createdAt.toISOString(),
          lastDelivery: lastDelivery
            ? {
                timestamp: lastDelivery.createdAt.toISOString(),
                status: lastDelivery.status,
                statusCode: lastDelivery.statusCode || 0,
                latency: lastDelivery.latencyMs || 0,
              }
            : {
                timestamp: "",
                status: "never",
                statusCode: 0,
                latency: 0,
              },
          stats: {
            totalDeliveries: deliveryStats._count,
            successRate:
              deliveryStats._count > 0
                ? Math.round((successCount / deliveryStats._count) * 100)
                : 100,
            avgLatency: Math.round(deliveryStats._avg.latencyMs || 0),
          },
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        webhooks: webhooksWithStats,
        deliveryLogs: deliveryLogs.map((log) => ({
          id: log.id,
          webhookId: log.webhookId,
          event: log.event,
          status: log.status,
          statusCode: log.statusCode || 0,
          latency: log.latencyMs || 0,
          timestamp: log.createdAt.toISOString(),
          requestId: log.id,
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching webhooks:", error)
    // Return empty data on error (e.g., table doesn't exist)
    return NextResponse.json({
      success: true,
      data: {
        webhooks: [],
        deliveryLogs: [],
      },
    })
  }
}

// ============================================================================
// POST /api/webhooks - 웹훅 생성
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createWebhookSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { url, description, events } = parsed.data
    const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`

    const webhook = await prisma.webhook.create({
      data: {
        url,
        description: description || "",
        events,
        secret,
        status: "ACTIVE",
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        webhook: {
          id: webhook.id,
          url: webhook.url,
          description: webhook.description || "",
          status: webhook.status.toLowerCase(),
          events: webhook.events,
          secret: webhook.secret,
          createdAt: webhook.createdAt.toISOString(),
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
        },
      },
      message: "웹훅이 생성되었습니다",
    })
  } catch (error) {
    console.error("Error creating webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "웹훅 생성에 실패했습니다. 데이터베이스를 확인해주세요.",
        },
      },
      { status: 500 }
    )
  }
}
