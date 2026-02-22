import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * POST /api/persona-world/credits/toss-confirm
 * Toss Payments 결제 승인 확인
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { paymentKey, orderId, amount } = body

    if (!paymentKey || !orderId || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_PARAM", message: "paymentKey, orderId, amount required" },
        },
        { status: 400 }
      )
    }

    // PENDING 거래 조회
    const pendingTx = await prisma.coinTransaction.findFirst({
      where: { orderId, status: "PENDING" },
    })

    if (!pendingTx) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Pending transaction not found" } },
        { status: 404 }
      )
    }

    // Toss API로 결제 승인
    const secretKey = process.env.TOSS_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "Payment not configured" } },
        { status: 500 }
      )
    }

    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`

    const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })

    if (!tossRes.ok) {
      const error = await tossRes.json().catch(() => ({}))
      console.error("[toss-confirm] Toss API error:", error)

      // PENDING → FAILED
      await prisma.coinTransaction.update({
        where: { id: pendingTx.id },
        data: { status: "FAILED" },
      })

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PAYMENT_FAILED",
            message: (error as { message?: string }).message ?? "Payment confirmation failed",
          },
        },
        { status: 400 }
      )
    }

    // 결제 성공 → PENDING → COMPLETED + paymentKey 저장
    // 잔액 재계산 (동시성 안전)
    const latestCompleted = await prisma.coinTransaction.findFirst({
      where: { userId: pendingTx.userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    })
    const currentBalance = latestCompleted?.balanceAfter ?? 0
    const newBalance = currentBalance + pendingTx.amount

    await prisma.coinTransaction.update({
      where: { id: pendingTx.id },
      data: {
        status: "COMPLETED",
        paymentKey,
        balanceAfter: newBalance,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        balance: newBalance,
        coins: pendingTx.amount,
      },
    })
  } catch (error) {
    console.error("[toss-confirm]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Payment confirmation error" } },
      { status: 500 }
    )
  }
}
