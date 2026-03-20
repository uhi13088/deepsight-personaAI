import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@/generated/prisma"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import {
  spendCredits,
  type CreditDataProvider,
  type TransactionRecord,
} from "@/lib/persona-world/credit-service"

const RESET_COST = 100

/**
 * POST /api/persona-world/users/profile/reset
 *
 * 성향 초기화 — L1/L2 벡터 NULL, 설문 응답 삭제, 프로필 BASIC 복귀.
 *
 * Body: { userId: string, deleteSns?: boolean }
 * - deleteSns: true면 SNS 연동도 함께 삭제 (기본 false)
 *
 * 코인 100 차감.
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, deleteSns = false } = body as {
      userId: string
      deleteSns?: boolean
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    // 유저 존재 확인
    const user = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "유저를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 코인 차감
    try {
      await spendCredits(creditProvider, userId, RESET_COST, "성향 초기화")
    } catch (err) {
      if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INSUFFICIENT_BALANCE", message: "코인이 부족합니다 (100 코인 필요)" },
          },
          { status: 402 }
        )
      }
      throw err
    }

    // 벡터 초기화 + 프로필 레벨 리셋
    await prisma.personaWorldUser.update({
      where: { id: userId },
      data: {
        // L1 벡터 (7D)
        depth: null,
        lens: null,
        stance: null,
        scope: null,
        taste: null,
        purpose: null,
        sociability: null,
        // L2 OCEAN (5D)
        openness: null,
        conscientiousness: null,
        extraversion: null,
        agreeableness: null,
        neuroticism: null,
        hasOceanProfile: false,
        // 프로필 메타
        profileQuality: "BASIC",
        confidenceScore: null,
        snsExtendedData: Prisma.JsonNull,
        snsAnalysisCount: 0,
        preferences: Prisma.JsonNull,
        dataSources: Prisma.JsonNull,
      },
    })

    // 설문 응답 삭제
    await prisma.pWUserSurveyResponse.deleteMany({
      where: { userId },
    })

    // SNS 연동 삭제 (사용자 선택)
    if (deleteSns) {
      await prisma.sNSConnection.deleteMany({
        where: { userId },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        resetAt: new Date().toISOString(),
        deletedSns: deleteSns,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "PROFILE_RESET_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── Credit Provider (Prisma) ─────────────────────────────

const creditProvider: CreditDataProvider = {
  async getLatestTransaction(userId) {
    const row = await prisma.coinTransaction.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    })
    return row ? mapTransaction(row) : null
  },
  async createTransaction(data) {
    const row = await prisma.coinTransaction.create({
      data: {
        userId: data.userId,
        type: data.type,
        amount: data.amount,
        balanceAfter: data.balanceAfter,
        reason: data.reason ?? null,
        orderId: data.orderId ?? null,
        paymentKey: data.paymentKey ?? null,
        status: data.status ?? "COMPLETED",
      },
    })
    return mapTransaction(row)
  },
  async findByOrderId() {
    return null
  },
  async updateTransaction() {
    throw new Error("Not implemented")
  },
  async getTransactions() {
    return []
  },
}

function mapTransaction(row: {
  id: string
  userId: string
  type: string
  amount: number
  balanceAfter: number
  reason: string | null
  orderId: string | null
  paymentKey: string | null
  status: string
  createdAt: Date
}): TransactionRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as TransactionRecord["type"],
    amount: row.amount,
    balanceAfter: row.balanceAfter,
    reason: row.reason,
    orderId: row.orderId,
    paymentKey: row.paymentKey,
    status: row.status as TransactionRecord["status"],
    createdAt: row.createdAt,
  }
}
