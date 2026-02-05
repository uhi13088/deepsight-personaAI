import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/billing/toss/webhook - Toss Payments 웹훅
 *
 * Toss에서 결제 상태 변경 시 호출되는 웹훅입니다.
 * 결제 완료, 취소, 실패 등의 이벤트를 처리합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[Toss Webhook] Received event:", body.eventType)

    const { eventType, data } = body

    switch (eventType) {
      case "PAYMENT_STATUS_CHANGED": {
        // 결제 상태 변경
        const { paymentKey, status, orderId } = data

        console.log(`[Toss Webhook] Payment ${paymentKey} status changed to ${status}`)

        if (status === "CANCELED" || status === "PARTIAL_CANCELED") {
          // 결제 취소 처리
          // TODO: 플랜 다운그레이드 또는 취소 처리
          console.log(`[Toss Webhook] Payment canceled for order ${orderId}`)
        }
        break
      }

      case "BILLING_KEY_DELETED": {
        // 정기 결제 키 삭제 (구독 취소)
        const { billingKey, customerId } = data
        console.log(`[Toss Webhook] Billing key deleted for customer ${customerId}: ${billingKey}`)

        // TODO: 구독 취소 처리
        break
      }

      case "DEPOSIT_CALLBACK": {
        // 가상계좌 입금 완료
        const { orderId, status: depositStatus } = data
        console.log(`[Toss Webhook] Deposit received for order ${orderId}: ${depositStatus}`)

        if (depositStatus === "DONE") {
          // 입금 완료 - 플랜 활성화
          // orderId에서 planId 추출 또는 별도 저장된 정보 조회
        }
        break
      }

      default:
        console.log(`[Toss Webhook] Unhandled event type: ${eventType}`)
    }

    // 웹훅 로그는 콘솔에만 기록
    console.log("[Toss Webhook] Processed event:", eventType, "at", new Date().toISOString())

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Toss Webhook] Error:", error)
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}
