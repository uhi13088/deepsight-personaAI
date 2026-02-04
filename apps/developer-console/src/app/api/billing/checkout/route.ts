import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// Stripe price IDs (configure in Stripe Dashboard)
const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || "price_starter",
  pro: process.env.STRIPE_PRICE_PRO || "price_pro",
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || "price_enterprise",
}

// POST /api/billing/checkout - Create Stripe Checkout Session
export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json()

    if (!planId || !PRICE_IDS[planId]) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_PLAN", message: "유효하지 않은 플랜입니다" },
        },
        { status: 400 }
      )
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STRIPE_NOT_CONFIGURED",
            message: "결제 시스템이 설정되지 않았습니다. 관리자에게 문의하세요.",
          },
        },
        { status: 503 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-11-20.acacia",
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || ""

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: PRICE_IDS[planId],
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing?canceled=true`,
      metadata: {
        planId,
      },
    })

    return NextResponse.json({
      success: true,
      data: { url: session.url },
    })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CHECKOUT_ERROR",
          message: "결제 세션 생성에 실패했습니다",
        },
      },
      { status: 500 }
    )
  }
}
