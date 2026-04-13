import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/require-auth"
import { getUserOrganization } from "@/lib/get-user-organization"
import { PLAN_INFO } from "@/lib/constants"

// ============================================================================
// GET /api/billing - 빌링 정보 조회 (DB 연동)
// ============================================================================

export async function GET() {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const membership = await getUserOrganization(session.user.id)
    const organization = membership?.organization ?? null

    const currentPlanKey = organization?.plan || "FREE"
    const planInfo = PLAN_INFO[currentPlanKey] || PLAN_INFO.FREE

    // 이번 달 사용량 계산
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // UsageRecord에서 이번 달 사용량 집계
    let usedCalls = 0
    if (organization) {
      const usageAgg = await prisma.usageRecord.aggregate({
        where: {
          organizationId: organization.id,
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          totalCalls: true,
        },
      })
      usedCalls = usageAgg._sum?.totalCalls || 0
    }

    const limit = planInfo.calls || 3000
    const percentUsed = Math.round((usedCalls / limit) * 100 * 10) / 10

    // PLAN_INFO → 프론트 Plan 타입 매핑
    const planLimitsMap: Record<
      string,
      {
        activePersonas: number
        matchingApiCalls: number
        rateLimit: number
        apiKeys: number
        teamMembers: number
        sla: string
      }
    > = {
      FREE: {
        activePersonas: 10,
        matchingApiCalls: 3000,
        rateLimit: 10,
        apiKeys: 2,
        teamMembers: 1,
        sla: "N/A",
      },
      STARTER: {
        activePersonas: 50,
        matchingApiCalls: 50000,
        rateLimit: 100,
        apiKeys: 5,
        teamMembers: 3,
        sla: "99.5%",
      },
      PRO: {
        activePersonas: 100,
        matchingApiCalls: 500000,
        rateLimit: 500,
        apiKeys: 10,
        teamMembers: 5,
        sla: "99.5%",
      },
      ENTERPRISE: {
        activePersonas: -1,
        matchingApiCalls: -1,
        rateLimit: -1,
        apiKeys: -1,
        teamMembers: -1,
        sla: "99.9%",
      },
    }
    const planLimits = planLimitsMap[currentPlanKey] || planLimitsMap.FREE

    // 최근 청구서 조회
    const invoices = organization
      ? await prisma.invoice.findMany({
          where: { organizationId: organization.id },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : []

    const billingData = {
      currentPlan: {
        id: currentPlanKey.toLowerCase(),
        name: planInfo.name,
        description: planInfo.description,
        price: planInfo.price ?? 0,
        annualPrice: Math.round((planInfo.price ?? 0) * 0.8),
        limits: planLimits,
        overage: { matchApiPerCall: planInfo.pricePerCall ?? 0, personaPerUnit: 0 },
        support: currentPlanKey === "ENTERPRISE" ? "전담 지원" : "셀프서비스",
        features: planInfo.features.filter((f) => f.included).map((f) => f.name),
        isEnterprise: currentPlanKey === "ENTERPRISE",
        recommended: false,
        current: true,
      },
      billingCycle: "monthly" as const,
      usage: {
        used: usedCalls,
        limit,
        percentUsed,
        estimatedCost: 0,
        billingCycle: `${startOfMonth.toISOString().split("T")[0]} ~ ${endOfMonth.toISOString().split("T")[0]}`,
        daysRemaining: Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        activePersonas: 0,
        activePersonasLimit: planLimits.activePersonas === -1 ? 9999 : planLimits.activePersonas,
      },
      invoices: invoices.map((inv) => ({
        id: inv.id,
        date: inv.createdAt.toISOString().split("T")[0],
        amount: Number(inv.amount),
        status: inv.status.toLowerCase(),
        description: inv.description || `${currentPlanKey} 플랜 구독`,
        pdfUrl: inv.pdfUrl,
      })),
      paymentMethods: [],
    }

    return NextResponse.json({
      success: true,
      data: billingData,
    })
  } catch (error) {
    console.error("Error fetching billing info:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "빌링 정보를 불러오는데 실패했습니다.",
        },
      },
      { status: 500 }
    )
  }
}
