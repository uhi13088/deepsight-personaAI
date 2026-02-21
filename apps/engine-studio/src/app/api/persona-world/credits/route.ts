import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCoinPackageById } from "@/lib/persona-world/coin-packages"
import crypto from "crypto"

/**
 * GET /api/persona-world/credits?userId=xxx&limit=20&offset=0
 * 코인 잔액 + 거래 내역 조회
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_PARAM", message: "userId required" } },
      { status: 400 }
    )
  }

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 20), 100)
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0)

  try {
    // 최신 COMPLETED 거래에서 잔액 가져오기
    const latest = await prisma.coinTransaction.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    })

    const transactions = await prisma.coinTransaction.findMany({
      where: { userId, status: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    })

    return NextResponse.json({
      success: true,
      data: {
        balance: latest?.balanceAfter ?? 0,
        transactions: transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          balanceAfter: tx.balanceAfter,
          reason: tx.reason,
          status: tx.status,
          createdAt: tx.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error("[credits GET]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to fetch credits" } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/persona-world/credits
 * Toss 결제 요청 시작 — PENDING 거래 생성 + clientKey 반환
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, packageId } = body

    if (!userId || !packageId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PARAM", message: "userId, packageId required" } },
        { status: 400 }
      )
    }

    const pkg = getCoinPackageById(packageId)
    if (!pkg) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PACKAGE", message: "Unknown package" } },
        { status: 400 }
      )
    }

    const totalCoins = pkg.coins + pkg.bonusCoins
    const orderId = `COIN_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`

    // 현재 잔액 조회
    const latest = await prisma.coinTransaction.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    })
    const currentBalance = latest?.balanceAfter ?? 0

    // PENDING 거래 생성
    await prisma.coinTransaction.create({
      data: {
        userId,
        type: "PURCHASE",
        amount: totalCoins,
        balanceAfter: currentBalance + totalCoins,
        reason: `코인 충전: ${pkg.label}`,
        orderId,
        status: "PENDING",
      },
    })

    const clientKey = process.env.TOSS_CLIENT_KEY
    if (!clientKey) {
      return NextResponse.json(
        { success: false, error: { code: "CONFIG_ERROR", message: "Payment not configured" } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentInfo: {
          clientKey,
          orderId,
          orderName: pkg.label,
          amount: pkg.price,
          totalCoins,
        },
        packageId,
      },
    })
  } catch (error) {
    console.error("[credits POST]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to create payment" } },
      { status: 500 }
    )
  }
}
