import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCoinPackageById } from "@/lib/persona-world/coin-packages"
import crypto from "crypto"

/**
 * GET /api/persona-world/credits?userId=xxx
 *
 * 유저의 코인 잔액 + 최근 거래 내역 조회
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || "20"), 50)
    const offset = Number(request.nextUrl.searchParams.get("offset") || "0")

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    // 잔액: 최근 거래의 balanceAfter
    const lastTx = await prisma.coinTransaction.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: { balanceAfter: true },
    })
    const balance = lastTx?.balanceAfter ?? 0

    // 거래 내역
    const transactions = await prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: { balance, transactions },
    })
  } catch (error) {
    console.error("[credits] GET error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "크레딧 조회 실패" } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/persona-world/credits
 *
 * 코인 충전 결제 요청 — Toss 결제 정보 반환
 *
 * Body: { userId: string, packageId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, packageId } = body as { userId: string; packageId: string }

    if (!userId || !packageId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId, packageId 필요" } },
        { status: 400 }
      )
    }

    const pkg = getCoinPackageById(packageId)
    if (!pkg) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PACKAGE", message: "잘못된 패키지 ID" } },
        { status: 400 }
      )
    }

    const clientKey = process.env.TOSS_CLIENT_KEY
    if (!clientKey) {
      return NextResponse.json(
        { success: false, error: { code: "PAYMENT_NOT_CONFIGURED", message: "결제 설정 미완료" } },
        { status: 503 }
      )
    }

    const orderId = `COIN_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`
    const totalCoins = pkg.coins + pkg.bonusCoins

    // PENDING 상태로 거래 선기록
    const lastTx = await prisma.coinTransaction.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: { balanceAfter: true },
    })
    const currentBalance = lastTx?.balanceAfter ?? 0

    await prisma.coinTransaction.create({
      data: {
        userId,
        type: "PURCHASE",
        amount: totalCoins,
        balanceAfter: currentBalance + totalCoins,
        reason: `${pkg.label} 구매`,
        orderId,
        status: "PENDING",
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        paymentInfo: {
          clientKey,
          orderId,
          orderName: `PersonaWorld ${pkg.label}`,
          amount: pkg.priceKRW,
          totalCoins,
        },
        packageId,
      },
    })
  } catch (error) {
    console.error("[credits] POST error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "결제 요청 실패" } },
      { status: 500 }
    )
  }
}
