import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/require-auth"
import { getUserOrganization } from "@/lib/get-user-organization"

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  description: z.string().optional(),
  events: z.array(z.string()).min(1).optional(),
  status: z.enum(["active", "disabled"]).optional(),
})

// ============================================================================
// GET /api/webhooks/[id] - 웹훅 상세 조회
// ============================================================================

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params

    const membership = await getUserOrganization(session.user.id)
    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "조직 접근 권한이 없습니다." } },
        { status: 403 }
      )
    }

    // T211: findFirst + organizationId 필터로 Cross-Org 열거 공격 방지
    // (findUnique 후 별도 org 검증은 404 vs 403 차이로 타 org ID 열거 가능)
    const webhook = await prisma.webhook.findFirst({
      where: { id, organizationId: membership.organizationId },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    if (!webhook) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Webhook not found" } },
        { status: 404 }
      )
    }

    const [deliveryAgg, successCount] = await Promise.all([
      prisma.webhookDelivery.aggregate({
        where: { webhookId: webhook.id },
        _count: true,
        _avg: { latencyMs: true },
      }),
      prisma.webhookDelivery.count({
        where: { webhookId: webhook.id, status: "SUCCESS" },
      }),
    ])

    const lastDelivery = webhook.deliveries[0]

    return NextResponse.json({
      success: true,
      data: {
        webhook: {
          id: webhook.id,
          url: webhook.url,
          description: webhook.description || "",
          status: webhook.status.toLowerCase(),
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
            totalDeliveries: deliveryAgg._count,
            successRate:
              deliveryAgg._count > 0 ? Math.round((successCount / deliveryAgg._count) * 100) : 100,
            avgLatency: Math.round(deliveryAgg._avg.latencyMs || 0),
          },
        },
      },
    })
  } catch (error) {
    console.error("Error fetching webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch webhook" },
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH /api/webhooks/[id] - 웹훅 수정
// ============================================================================

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response: authRes } = await requireAuth()
  if (authRes) return authRes

  try {
    const { id } = await params

    const membership = await getUserOrganization(session.user.id)
    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "조직 접근 권한이 없습니다." } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateWebhookSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { url, description, events, status } = parsed.data

    // T211: Cross-Org 방지 — organizationId 필터를 쿼리에 포함
    const existingWebhook = await prisma.webhook.findFirst({
      where: { id, organizationId: membership.organizationId },
    })

    if (!existingWebhook) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Webhook not found" } },
        { status: 404 }
      )
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data: {
        ...(url && { url }),
        ...(description !== undefined && { description }),
        ...(events && { events }),
        ...(status && { status: status.toUpperCase() as "ACTIVE" | "DISABLED" }),
      },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    const lastDelivery = webhook.deliveries[0]

    return NextResponse.json({
      success: true,
      data: {
        webhook: {
          id: webhook.id,
          url: webhook.url,
          description: webhook.description || "",
          status: webhook.status.toLowerCase(),
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
            totalDeliveries: 0,
            successRate: 100,
            avgLatency: 0,
          },
        },
      },
      message: "웹훅이 수정되었습니다",
    })
  } catch (error) {
    console.error("Error updating webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to update webhook" },
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE /api/webhooks/[id] - 웹훅 삭제
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response: authRes } = await requireAuth()
  if (authRes) return authRes

  try {
    const { id } = await params

    const membership = await getUserOrganization(session.user.id)
    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "조직 접근 권한이 없습니다." } },
        { status: 403 }
      )
    }

    // T211: Cross-Org 방지 — organizationId 필터를 쿼리에 포함
    const existingWebhook = await prisma.webhook.findFirst({
      where: { id, organizationId: membership.organizationId },
    })

    if (!existingWebhook) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Webhook not found" } },
        { status: 404 }
      )
    }

    await prisma.webhook.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "웹훅이 삭제되었습니다",
    })
  } catch (error) {
    console.error("Error deleting webhook:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to delete webhook" },
      },
      { status: 500 }
    )
  }
}
