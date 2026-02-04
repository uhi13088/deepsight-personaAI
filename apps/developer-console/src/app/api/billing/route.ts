import { NextResponse } from "next/server"

// ============================================================================
// GET /api/billing - 빌링 정보 조회
// ============================================================================

export async function GET() {
  try {
    // TODO: 실제 Prisma 연동 시 사용자 정보 기반으로 조회
    const billingData = {
      currentPlan: {
        id: "free",
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
        recommended: false,
        current: true,
      },
      usage: {
        used: 1247,
        limit: 3000,
        percentUsed: 41.6,
        estimatedCost: 0,
        billingCycle: "2026-02-01 ~ 2026-02-28",
        daysRemaining: 24,
      },
      invoices: [],
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
