import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/require-auth"

// 플랜별 정보
const PLAN_INFO: Record<
  string,
  {
    name: string
    description: string
    price: number | null
    pricePerCall: number | null
    calls: number | null
    rateLimit: number | null
    features: { name: string; included: boolean }[]
  }
> = {
  FREE: {
    name: "Free",
    description: "개인 프로젝트와 테스트용",
    price: 0,
    pricePerCall: null,
    calls: 3000,
    rateLimit: 10,
    features: [
      { name: "월 3,000 API 호출", included: true },
      { name: "기본 Match API 접근", included: true },
      { name: "테스트 환경 전용", included: true },
      { name: "커뮤니티 지원", included: true },
      { name: "이메일 지원", included: false },
      { name: "Webhook 연동", included: false },
      { name: "우선 처리", included: false },
    ],
  },
  STARTER: {
    name: "Starter",
    description: "스타트업과 소규모 팀용",
    price: 29000,
    pricePerCall: 0.58,
    calls: 50000,
    rateLimit: 100,
    features: [
      { name: "월 50,000 API 호출", included: true },
      { name: "모든 API 접근", included: true },
      { name: "Live + Test 환경", included: true },
      { name: "이메일 지원", included: true },
      { name: "Webhook 연동", included: true },
      { name: "기본 분석 대시보드", included: true },
      { name: "우선 처리", included: false },
    ],
  },
  PRO: {
    name: "Pro",
    description: "성장하는 비즈니스용",
    price: 99000,
    pricePerCall: 0.198,
    calls: 500000,
    rateLimit: 500,
    features: [
      { name: "월 500,000 API 호출", included: true },
      { name: "모든 API 접근", included: true },
      { name: "Live + Test 환경", included: true },
      { name: "우선 이메일 지원", included: true },
      { name: "Webhook 연동", included: true },
      { name: "고급 분석 대시보드", included: true },
      { name: "우선 처리 큐", included: true },
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "대규모 기업용 맞춤 솔루션",
    price: null,
    pricePerCall: null,
    calls: null,
    rateLimit: null,
    features: [
      { name: "무제한 API 호출", included: true },
      { name: "전용 인프라", included: true },
      { name: "SLA 보장 (99.9%)", included: true },
      { name: "전담 기술 지원", included: true },
      { name: "맞춤 통합 지원", included: true },
      { name: "온프레미스 옵션", included: true },
      { name: "커스텀 계약", included: true },
    ],
  },
}

// ============================================================================
// GET /api/billing - 빌링 정보 조회 (DB 연동)
// ============================================================================

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    // TODO: Scope to user's organization via session
    const organization = await prisma.organization.findFirst()

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
        ...planInfo,
        recommended: false,
        current: true,
      },
      usage: {
        used: usedCalls,
        limit,
        percentUsed,
        estimatedCost: 0,
        billingCycle: `${startOfMonth.toISOString().split("T")[0]} ~ ${endOfMonth.toISOString().split("T")[0]}`,
        daysRemaining: Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
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
