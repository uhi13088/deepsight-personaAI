import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * POST /api/persona-world/credits/sync
 * 온보딩 크레딧을 서버에 동기화 (최초 1회)
 * 서버에 COMPLETED 트랜잭션이 없고 로컬에 잔액이 있을 때만 동작
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = (await request.json()) as {
      userId: string
      localBalance: number
    }

    if (!body.userId || typeof body.localBalance !== "number" || body.localBalance <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_PARAM", message: "userId와 양수 localBalance가 필요합니다" },
        },
        { status: 400 }
      )
    }

    // 이미 서버에 트랜잭션이 있으면 중복 동기화 방지
    const existing = await prisma.coinTransaction.findFirst({
      where: { userId: body.userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    })

    if (existing) {
      // 이미 서버에 잔액이 있으므로 서버 잔액 반환
      return NextResponse.json({
        success: true,
        data: { balance: existing.balanceAfter },
      })
    }

    // 온보딩 크레딧을 EARN 트랜잭션으로 기록
    const tx = await prisma.coinTransaction.create({
      data: {
        userId: body.userId,
        type: "EARN",
        amount: body.localBalance,
        balanceAfter: body.localBalance,
        reason: "온보딩 크레딧 동기화",
        status: "COMPLETED",
      },
    })

    return NextResponse.json({
      success: true,
      data: { balance: tx.balanceAfter },
    })
  } catch (error) {
    console.error("[PW Credits Sync]", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "잔액 동기화 실패" } },
      { status: 500 }
    )
  }
}
