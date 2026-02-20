import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma"
import type { ApiResponse } from "@/types"

/** 하루 최대 생성 요청 수 (인큐베이터 dailyLimit 기본값) */
const DEFAULT_DAILY_LIMIT = 10

// ── GET: 사용자의 페르소나 요청 상태 조회 ──────────────────────
export async function GET(request: NextRequest) {
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
  try {
    const body = await request.json()
    const { userId, userVector, topSimilarity } = body as {
      userId: string
      userVector: Record<string, unknown>
      topSimilarity: number
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

    // 유사도 70% 이상이면 요청 거부
    if (topSimilarity >= 70) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: "SIMILARITY_TOO_HIGH",
            message: "유사도 70% 이상인 경우 페르소나 요청이 불필요합니다",
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
        status: "SCHEDULED",
        scheduledDate,
      },
    })

    return NextResponse.json<
      ApiResponse<{
        id: string
        status: string
        scheduledDate: string
        message: string
      }>
    >({
      success: true,
      data: {
        id: created.id,
        status: created.status,
        scheduledDate: created.scheduledDate.toISOString(),
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
