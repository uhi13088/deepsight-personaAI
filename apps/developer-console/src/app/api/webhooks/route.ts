import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import crypto from "crypto"
import { requireAuth } from "@/lib/require-auth"
import { getUserOrganization } from "@/lib/get-user-organization"

// T215: SSRF 방어 — 내부 IP/호스트 차단
const BLOCKED_HOSTS =
  /^(localhost|127\.|0\.0\.0\.0|::1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/i

function isInternalUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return BLOCKED_HOSTS.test(hostname)
  } catch {
    return true
  }
}

const createWebhookSchema = z.object({
  url: z
    .string()
    .url("올바른 URL 형식이 아닙니다")
    .refine((url) => !isInternalUrl(url), "내부 네트워크 URL은 사용할 수 없습니다"),
  description: z.string().optional(),
  events: z.array(z.string()).min(1, "최소 1개 이상의 이벤트를 선택해주세요"),
})

// ============================================================================
// GET /api/webhooks - 웹훅 목록 조회
// ============================================================================

export async function GET() {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const membership = await getUserOrganization(session.user.id)

    // T212: membership null 시 빈 필터({})로 전체 조회하는 것을 방지
    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "조직 접근 권한이 없습니다." } },
        { status: 403 }
      )
    }

    const orgFilter = { organizationId: membership.organizationId }

    // 1쿼리: 웹훅 목록 (최근 배달 포함)
    const webhooks = await prisma.webhook.findMany({
      where: orgFilter,
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

    // 1쿼리: 최근 배달 로그
    const deliveryLogs = await prisma.webhookDelivery.findMany({
      where: { webhook: orgFilter },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        webhook: {
          select: { url: true },
        },
      },
    })

    // N+1 제거: webhookId별 통계를 2쿼리로 사전 집계
    const webhookIds = webhooks.map((w) => w.id)

    const [deliveryAggByWebhook, successCountByWebhook] = await Promise.all([
      // 웹훅별 총 배달 수 + 평균 지연 시간
      prisma.webhookDelivery.groupBy({
        by: ["webhookId"],
        where: { webhookId: { in: webhookIds } },
        _count: { id: true },
        _avg: { latencyMs: true },
      }),
      // 웹훅별 성공 배달 수
      prisma.webhookDelivery.groupBy({
        by: ["webhookId"],
        where: { webhookId: { in: webhookIds }, status: "SUCCESS" },
        _count: { id: true },
      }),
    ])

    // Map으로 O(1) 조회
    const aggMap = new Map(deliveryAggByWebhook.map((r) => [r.webhookId, r]))
    const successMap = new Map(successCountByWebhook.map((r) => [r.webhookId, r._count.id]))

    const webhooksWithStats = webhooks.map((webhook) => {
      const agg = aggMap.get(webhook.id)
      const totalDeliveries = agg?._count.id ?? 0
      const successCount = successMap.get(webhook.id) ?? 0
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
          totalDeliveries,
          successRate:
            totalDeliveries > 0 ? Math.round((successCount / totalDeliveries) * 100) : 100,
          avgLatency: Math.round(agg?._avg.latencyMs ?? 0),
        },
      }
    })

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
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "웹훅 목록 조회에 실패했습니다." },
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/webhooks - 웹훅 생성
// ============================================================================

export async function POST(request: NextRequest) {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    // T212: POST에도 조직 소속 확인 후 organizationId 설정
    const membership = await getUserOrganization(session.user.id)
    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "조직 접근 권한이 없습니다." } },
        { status: 403 }
      )
    }

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

    // T212: organizationId 누락 수정
    const webhook = await prisma.webhook.create({
      data: {
        url,
        description: description || "",
        events,
        secret,
        status: "ACTIVE",
        organizationId: membership.organizationId,
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
          // T215: 생성 시 secret 1회 공개는 의도적 (one-time reveal)
          // 이후 GET 응답에서는 앞 8자리만 노출
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
          message: "웹훅 생성에 실패했습니다.",
        },
      },
      { status: 500 }
    )
  }
}
