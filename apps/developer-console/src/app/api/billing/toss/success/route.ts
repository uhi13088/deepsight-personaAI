import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getUserOrganization } from "@/lib/get-user-organization"
import { PLAN_PRICES } from "@/lib/constants"

/**
 * GET /api/billing/toss/success - Toss 결제 성공 콜백
 *
 * Toss가 결제 완료 후 리다이렉트하는 엔드포인트
 * paymentKey, orderId, amount를 받아서 결제를 승인합니다.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const paymentKey = searchParams.get("paymentKey")
  const orderId = searchParams.get("orderId")
  const amount = searchParams.get("amount")
  const planId = searchParams.get("planId")

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    console.error("[Toss] NEXT_PUBLIC_APP_URL is not configured")
    return NextResponse.json(
      { success: false, error: { code: "MISCONFIGURED", message: "서버 설정 오류" } },
      { status: 500 }
    )
  }

  if (!paymentKey || !orderId || !amount) {
    return NextResponse.redirect(`${baseUrl}/billing?error=missing_params`)
  }

  if (!process.env.TOSS_SECRET_KEY) {
    return NextResponse.redirect(`${baseUrl}/billing?error=not_configured`)
  }

  // T214: planId 유효성 검사
  if (!planId || !(planId in PLAN_PRICES)) {
    console.warn("[Toss] Invalid planId:", planId)
    return NextResponse.redirect(`${baseUrl}/billing?error=invalid_plan`)
  }

  // T214: 결제금액 검증 — 쿼리파람 amount를 그대로 사용하면 가격 조작 가능
  const parsedAmount = parseInt(amount)
  const expectedAmount = PLAN_PRICES[planId]
  if (isNaN(parsedAmount) || parsedAmount !== expectedAmount) {
    console.warn(`[Toss] Amount mismatch: received=${parsedAmount}, expected=${expectedAmount}`)
    return NextResponse.redirect(`${baseUrl}/billing?error=amount_mismatch`)
  }

  try {
    // Toss 결제 승인 API 호출
    const secretKey = process.env.TOSS_SECRET_KEY
    const basicAuth = Buffer.from(`${secretKey}:`).toString("base64")

    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: parsedAmount,
      }),
    })

    const paymentResult = await response.json()

    if (!response.ok) {
      // T214: Toss 에러 메시지를 URL에 노출하지 않음 (서버 로그에만 기록)
      console.error("[Toss] Payment confirmation failed:", paymentResult)
      return NextResponse.redirect(`${baseUrl}/billing?error=payment_failed`)
    }

    // 결제 성공 - DB에 결제 기록 저장
    console.log("[Toss] Payment confirmed:", paymentResult.paymentKey)

    // 세션에서 사용자 조직 조회
    const session = await auth()
    let organization: { id: string; plan: string } | null = null
    if (session?.user?.id) {
      const membership = await getUserOrganization(session.user.id)
      organization = membership?.organization ?? null
    }

    if (organization) {
      // 플랜 업데이트
      const planMapping: Record<string, "FREE" | "STARTER" | "PRO" | "ENTERPRISE"> = {
        starter: "STARTER",
        pro: "PRO",
        enterprise: "ENTERPRISE",
      }

      const newPlan = planMapping[planId]
      if (newPlan) {
        await prisma.organization.update({
          where: { id: organization.id },
          data: { plan: newPlan },
        })
      }

      // 결제 기록 저장
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      try {
        await prisma.invoice.create({
          data: {
            organizationId: organization.id,
            amount: parsedAmount,
            currency: "KRW",
            status: "PAID",
            description: `${planId} 플랜 구독`,
            periodStart: now,
            periodEnd: periodEnd,
            paidAt: now,
          },
        })
      } catch (invoiceError) {
        console.error("[Toss] Invoice creation error:", invoiceError)
      }
    }

    return NextResponse.redirect(`${baseUrl}/billing?success=true&plan=${planId}`)
  } catch (error) {
    console.error("[Toss] Payment error:", error)
    return NextResponse.redirect(`${baseUrl}/billing?error=internal_error`)
  }
}
