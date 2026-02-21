import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/persona-world/credits/toss-confirm
 *
 * Toss 결제 확인 + 코인 충전 완료
 *
 * Body: { paymentKey: string, orderId: string, amount: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paymentKey, orderId, amount } = body as {
      paymentKey: string
      orderId: string
      amount: number
    }

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "paymentKey, orderId, amount 필요" },
        },
        { status: 400 }
      )
    }

    const secretKey = process.env.TOSS_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: { code: "PAYMENT_NOT_CONFIGURED", message: "결제 설정 미완료" } },
        { status: 503 }
      )
    }

    // PENDING 상태 거래 확인
    const pendingTx = await prisma.coinTransaction.findFirst({
      where: { orderId, status: "PENDING" },
    })

    if (!pendingTx) {
      return NextResponse.json(
        { success: false, error: { code: "ORDER_NOT_FOUND", message: "주문을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 이미 완료된 거래인지 확인
    const completedTx = await prisma.coinTransaction.findFirst({
      where: { orderId, status: "COMPLETED", type: "PURCHASE" },
    })
    if (completedTx) {
      return NextResponse.json({
        success: true,
        data: { balance: completedTx.balanceAfter, alreadyProcessed: true },
      })
    }

    // Toss API로 결제 확인
    const basicAuth = Buffer.from(`${secretKey}:`).toString("base64")
    const tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })

    if (!tossResponse.ok) {
      const errorData = await tossResponse.json().catch(() => null)
      const errorMessage = (errorData as { message?: string })?.message ?? "결제 확인 실패"
      console.error("[toss-confirm] Toss API error:", errorData)

      // PENDING → FAILED
      await prisma.coinTransaction.update({
        where: { id: pendingTx.id },
        data: { status: "FAILED" },
      })

      return NextResponse.json(
        { success: false, error: { code: "PAYMENT_FAILED", message: errorMessage } },
        { status: 400 }
      )
    }

    // 결제 확인 성공 → PENDING → COMPLETED + paymentKey 저장
    // 잔액 재계산 (동시성 안전)
    const lastCompletedTx = await prisma.coinTransaction.findFirst({
      where: { userId: pendingTx.userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: { balanceAfter: true },
    })
    const currentBalance = lastCompletedTx?.balanceAfter ?? 0
    const newBalance = currentBalance + pendingTx.amount

    await prisma.coinTransaction.update({
      where: { id: pendingTx.id },
      data: {
        status: "COMPLETED",
        paymentKey,
        balanceAfter: newBalance,
      },
    })

    console.log(
      `[toss-confirm] Payment confirmed: userId=${pendingTx.userId}, coins=${pendingTx.amount}, balance=${newBalance}`
    )

    return NextResponse.json({
      success: true,
      data: { balance: newBalance, coins: pendingTx.amount },
    })
  } catch (error) {
    console.error("[toss-confirm] error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "결제 확인 처리 실패" } },
      { status: 500 }
    )
  }
}
