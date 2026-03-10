import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma"
import type { ApiResponse } from "@/types"
import { verifyInternalToken } from "@/lib/internal-auth"
import { spendCredits, type CreditDataProvider } from "@/lib/persona-world/credit-service"

/** 하루 최대 생성 요청 수 (인큐베이터 dailyLimit 기본값) */
const DEFAULT_DAILY_LIMIT = 10

/** 70% 이상 유사도 유저의 페르소나 요청 크레딧 비용 */
const PERSONA_REQUEST_CREDIT_COST = 300

// ── GET: 사용자의 페르소나 요청 상태 조회 ──────────────────────
export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const userId = request.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "MISSING_PARAM", message: "userId 필요" } },
        { status: 400 }
      )
    }

    const requests = await prisma.personaGenerationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        generatedPersona: {
          select: { id: true, name: true, handle: true, role: true, profileImageUrl: true },
        },
      },
    })

    const data = requests.map((r) => ({
      id: r.id,
      status: r.status,
      topSimilarity: Number(r.topSimilarity),
      creditSpent: r.creditSpent,
      scheduledDate: r.scheduledDate.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      failReason: r.failReason,
      generatedPersona: r.generatedPersona
        ? {
            id: r.generatedPersona.id,
            name: r.generatedPersona.name,
            handle: r.generatedPersona.handle,
            role: r.generatedPersona.role,
            profileImageUrl: r.generatedPersona.profileImageUrl,
          }
        : null,
      createdAt: r.createdAt.toISOString(),
    }))

    return NextResponse.json<ApiResponse<{ requests: typeof data }>>({
      success: true,
      data: { requests: data },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "PERSONA_REQUEST_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── POST: 페르소나 생성 요청 ─────────────────────────────────
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, userVector, topSimilarity, useCredits } = body as {
      userId: string
      userVector: Record<string, unknown>
      topSimilarity: number
      useCredits?: boolean
    }

    if (!userId || !userVector || topSimilarity == null) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "MISSING_PARAM", message: "userId, userVector, topSimilarity 필요" },
        },
        { status: 400 }
      )
    }

    // 유사도 70% 이상: 크레딧 사용 시에만 허용
    const requiresCredits = topSimilarity >= 70
    if (requiresCredits && !useCredits) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: "SIMILARITY_TOO_HIGH",
            message: "유사도 70% 이상인 경우 크레딧을 사용하여 페르소나를 요청할 수 있습니다",
          },
        },
        { status: 400 }
      )
    }

    // PersonaWorldUser 존재 보장
    await prisma.personaWorldUser.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@anonymous.local` },
    })

    // 사용자 중복 요청 방지 (PENDING/SCHEDULED/GENERATING 상태의 기존 요청)
    const existingActive = await prisma.personaGenerationRequest.findFirst({
      where: {
        userId,
        status: { in: ["PENDING", "SCHEDULED", "GENERATING"] },
      },
    })

    if (existingActive) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: "DUPLICATE_REQUEST",
            message: "이미 진행 중인 페르소나 생성 요청이 있습니다",
          },
        },
        { status: 409 }
      )
    }

    // 크레딧 차감 (70% 이상 유료 요청)
    let creditSpent = 0
    if (requiresCredits) {
      try {
        await spendCredits(creditProvider, userId, PERSONA_REQUEST_CREDIT_COST, "페르소나 재요청")
        creditSpent = PERSONA_REQUEST_CREDIT_COST
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error"
        if (errMsg === "INSUFFICIENT_BALANCE") {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: {
                code: "INSUFFICIENT_CREDITS",
                message: `크레딧이 부족합니다. 페르소나 요청에 ${PERSONA_REQUEST_CREDIT_COST} 크레딧이 필요합니다`,
              },
            },
            { status: 402 }
          )
        }
        throw err
      }
    }

    // dailyLimit 조회
    const limitConfig = await prisma.systemConfig
      .findUnique({ where: { category_key: { category: "INCUBATOR", key: "dailyLimit" } } })
      .catch(() => null)
    const dailyLimit = (limitConfig?.value as number) ?? DEFAULT_DAILY_LIMIT

    // 스케줄링: 가장 빠른 슬롯이 있는 날짜 찾기
    const scheduledDate = await findNextAvailableDate(dailyLimit)

    const created = await prisma.personaGenerationRequest.create({
      data: {
        userId,
        userVector: userVector as Prisma.InputJsonValue,
        topSimilarity,
        creditSpent,
        status: "SCHEDULED",
        scheduledDate,
      },
    })

    return NextResponse.json<
      ApiResponse<{
        id: string
        status: string
        scheduledDate: string
        creditSpent: number
        message: string
      }>
    >({
      success: true,
      data: {
        id: created.id,
        status: created.status,
        scheduledDate: created.scheduledDate.toISOString(),
        creditSpent,
        message:
          scheduledDate.toDateString() === new Date().toDateString()
            ? "오늘 중으로 페르소나가 생성됩니다!"
            : `${scheduledDate.toISOString().slice(0, 10)}에 페르소나가 생성될 예정입니다.`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "PERSONA_REQUEST_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── Prisma → CreditDataProvider ──────────────────────────

const creditProvider: CreditDataProvider = {
  async getLatestTransaction(userId) {
    const row = await prisma.coinTransaction.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    })
    return row
      ? {
          id: row.id,
          userId: row.userId,
          type: row.type as "EARN" | "PURCHASE" | "SPEND",
          amount: row.amount,
          balanceAfter: row.balanceAfter,
          reason: row.reason,
          orderId: row.orderId,
          paymentKey: row.paymentKey,
          status: row.status as "COMPLETED",
          createdAt: row.createdAt,
        }
      : null
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
    return {
      id: row.id,
      userId: row.userId,
      type: row.type as "EARN" | "PURCHASE" | "SPEND",
      amount: row.amount,
      balanceAfter: row.balanceAfter,
      reason: row.reason,
      orderId: row.orderId,
      paymentKey: row.paymentKey,
      status: row.status as "COMPLETED",
      createdAt: row.createdAt,
    }
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

// ── 스케줄링: 다음 빈 슬롯 날짜 탐색 ─────────────────────────

async function findNextAvailableDate(dailyLimit: number): Promise<Date> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 최대 7일까지 탐색
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() + dayOffset)

    const nextDay = new Date(targetDate)
    nextDay.setDate(nextDay.getDate() + 1)

    const count = await prisma.personaGenerationRequest.count({
      where: {
        scheduledDate: { gte: targetDate, lt: nextDay },
        status: { in: ["PENDING", "SCHEDULED", "GENERATING"] },
      },
    })

    if (count < dailyLimit) {
      return targetDate
    }
  }

  // 7일 후로 예약
  const fallback = new Date(today)
  fallback.setDate(fallback.getDate() + 7)
  return fallback
}
