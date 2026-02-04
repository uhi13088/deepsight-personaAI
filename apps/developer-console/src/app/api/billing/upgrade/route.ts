import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"

const upgradeSchema = z.object({
  planId: z.enum(["free", "starter", "pro", "enterprise"]),
})

// Toss Payments 플랜별 가격 (원화)
const PLAN_PRICES: Record<string, number> = {
  starter: 29000, // ₩29,000/월
  pro: 99000, // ₩99,000/월
  enterprise: 299000, // ₩299,000/월
}

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter 플랜",
  pro: "Pro 플랜",
  enterprise: "Enterprise 플랜",
}

// ============================================================================
// POST /api/billing/upgrade - 플랜 업그레이드 (Toss Payments)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = upgradeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0].message,
          },
        },
        { status: 400 }
      )
    }

    const { planId } = parsed.data

    // Free plan doesn't need payment
    if (planId === "free") {
      return NextResponse.json({
        success: true,
        data: {
          planId,
          message: "Free 플랜으로 변경되었습니다.",
        },
      })
    }

    // Check if Toss Payments is configured
    if (!process.env.TOSS_CLIENT_KEY || !process.env.TOSS_SECRET_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PAYMENT_NOT_CONFIGURED",
            message: "결제 시스템이 설정되지 않았습니다. 관리자에게 문의하세요.",
          },
        },
        { status: 503 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || ""

    // Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`

    // Return payment info for client-side Toss widget
    return NextResponse.json({
      success: true,
      data: {
        paymentInfo: {
          clientKey: process.env.TOSS_CLIENT_KEY,
          orderId,
          orderName: PLAN_NAMES[planId],
          amount: PLAN_PRICES[planId],
          customerName: "DeepSight 사용자", // TODO: Get from session
          successUrl: `${baseUrl}/api/billing/toss/success?planId=${planId}`,
          failUrl: `${baseUrl}/billing?error=payment_failed`,
        },
        planId,
      },
    })
  } catch (error) {
    console.error("Error upgrading plan:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "플랜 업그레이드에 실패했습니다.",
        },
      },
      { status: 500 }
    )
  }
}
