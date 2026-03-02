import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import {
  generateDailyMicroQuestion,
  processMicroAnswer,
  type DailyMicroProvider,
  type UserL1Vectors,
} from "@/lib/persona-world/onboarding/daily-micro"

/**
 * GET /api/persona-world/onboarding/daily-question?userId=...
 *
 * 오늘의 마이크로 질문 조회 (T309).
 * 이미 오늘 답변했으면 null 반환.
 */
export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const userId = request.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    const provider = createDailyMicroProvider()
    const question = await generateDailyMicroQuestion(userId, provider)

    return NextResponse.json({
      success: true,
      data: { question },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "DAILY_QUESTION_ERROR", message } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/persona-world/onboarding/daily-question
 *
 * 마이크로 질문 응답 처리 (T310).
 *
 * Body:
 * - userId: string
 * - questionId: string
 * - optionIndex: number
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, questionId, optionIndex } = body as {
      userId?: string
      questionId?: string
      optionIndex?: number
    }

    if (!userId || !questionId || optionIndex === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "userId, questionId, optionIndex 필요" },
        },
        { status: 400 }
      )
    }

    if (typeof optionIndex !== "number" || optionIndex < 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "유효하지 않은 optionIndex" },
        },
        { status: 400 }
      )
    }

    const provider = createDailyMicroProvider()
    const result = await processMicroAnswer(userId, questionId, optionIndex, provider)

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "질문을 찾을 수 없거나 유저가 존재하지 않습니다" },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "DAILY_ANSWER_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── DailyMicroProvider Prisma 구현 ──────────────────────────

function createDailyMicroProvider(): DailyMicroProvider {
  return {
    async getUserVectors(userId: string): Promise<UserL1Vectors | null> {
      const user = await prisma.personaWorldUser.findUnique({
        where: { id: userId },
        select: {
          depth: true,
          lens: true,
          stance: true,
          scope: true,
          taste: true,
          purpose: true,
          sociability: true,
        },
      })
      if (!user) return null
      return {
        depth: user.depth !== null ? Number(user.depth) : null,
        lens: user.lens !== null ? Number(user.lens) : null,
        stance: user.stance !== null ? Number(user.stance) : null,
        scope: user.scope !== null ? Number(user.scope) : null,
        taste: user.taste !== null ? Number(user.taste) : null,
        purpose: user.purpose !== null ? Number(user.purpose) : null,
        sociability: user.sociability !== null ? Number(user.sociability) : null,
      }
    },

    async updateUserVector(userId: string, dimension: string, value: number): Promise<void> {
      await prisma.personaWorldUser.update({
        where: { id: userId },
        data: { [dimension]: value },
      })
    },

    async getLastQuestionDate(userId: string): Promise<Date | null> {
      const config = await prisma.systemConfig
        .findUnique({
          where: { category_key: { category: "DAILY_MICRO", key: `LAST_${userId}` } },
        })
        .catch(() => null)
      if (!config?.value) return null
      const dateStr = typeof config.value === "string" ? config.value : String(config.value)
      const parsed = new Date(dateStr)
      return isNaN(parsed.getTime()) ? null : parsed
    },

    async setLastQuestionDate(userId: string, date: Date): Promise<void> {
      await prisma.systemConfig.upsert({
        where: { category_key: { category: "DAILY_MICRO", key: `LAST_${userId}` } },
        update: { value: date.toISOString() },
        create: {
          category: "DAILY_MICRO",
          key: `LAST_${userId}`,
          value: date.toISOString(),
        },
      })
    },
  }
}
