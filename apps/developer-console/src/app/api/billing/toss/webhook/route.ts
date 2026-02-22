import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/**
 * POST /api/billing/toss/webhook - Toss Payments 웹훅
 *
 * Toss에서 결제 상태 변경 시 호출되는 웹훅입니다.
 * Basic Auth 검증 후 결제 완료, 취소, 실패 등의 이벤트를 처리합니다.
 *
 * Toss 웹훅 인증 방식: Basic Auth (시크릿키를 Base64 인코딩)
 * @see https://docs.tosspayments.com/guides/webhook
 */
export async function POST(request: NextRequest) {
  try {
    // ── 1. 웹훅 인증 검증 ────────────────────────────────────
    const webhookSecret = process.env.TOSS_WEBHOOK_SECRET || process.env.TOSS_SECRET_KEY
    if (!webhookSecret) {
      console.error("[Toss Webhook] TOSS_WEBHOOK_SECRET not configured")
      return NextResponse.json(
        {
          success: false,
          error: { code: "CONFIG_ERROR", message: "Webhook secret not configured" },
        },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } },
        { status: 401 }
      )
    }

    // Toss Basic Auth: Base64(secretKey + ":")
    const expectedAuth = `Basic ${Buffer.from(`${webhookSecret}:`).toString("base64")}`
    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid authorization" } },
        { status: 401 }
      )
    }

    // ── 2. 이벤트 처리 ───────────────────────────────────────
    const body = await request.json()
    const { eventType, data } = body

    switch (eventType) {
      case "PAYMENT_STATUS_CHANGED": {
        const { paymentKey, status, orderId } = data
        console.log(`[Toss Webhook] Payment ${paymentKey} status: ${status}, order: ${orderId}`)

        if (status === "CANCELED" || status === "PARTIAL_CANCELED") {
          // orderId 기반으로 Invoice 조회 → 해당 Organization 플랜을 FREE로 다운그레이드
          const invoice = await prisma.invoice.findFirst({
            where: { stripeInvoiceId: orderId },
          })
          if (invoice) {
            await Promise.all([
              prisma.organization.update({
                where: { id: invoice.organizationId },
                data: { plan: "FREE" },
              }),
              prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: "CANCELLED" },
              }),
            ])
            console.log(`[Toss Webhook] Plan downgraded to FREE for org ${invoice.organizationId}`)
          }
        }
        break
      }

      case "BILLING_KEY_DELETED": {
        const { billingKey } = data
        console.log(`[Toss Webhook] Billing key deleted: ${billingKey}`)
        // stripeSubscriptionId에 billingKey가 저장된 경우 해당 조직 구독 취소
        const org = await prisma.organization.findFirst({
          where: { stripeSubscriptionId: billingKey },
        })
        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: { plan: "FREE", stripeSubscriptionId: null },
          })
          console.log(`[Toss Webhook] Subscription cancelled for org ${org.id}`)
        }
        break
      }

      case "DEPOSIT_CALLBACK": {
        const { orderId, status: depositStatus } = data
        console.log(`[Toss Webhook] Deposit for order ${orderId}: ${depositStatus}`)
        break
      }

      default:
        console.log(`[Toss Webhook] Unhandled event: ${eventType}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Toss Webhook] Error:", error)
    return NextResponse.json(
      { success: false, error: { code: "WEBHOOK_ERROR", message: "Webhook processing failed" } },
      { status: 500 }
    )
  }
}
