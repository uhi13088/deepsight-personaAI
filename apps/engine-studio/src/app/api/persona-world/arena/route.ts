import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import { calculateArenaCost, ARENA_ROOM_CONFIGS, ROUND_ADDON_AMOUNT } from "@deepsight/shared-types"
import type { PWArenaCreateRequest, ArenaRoomType } from "@deepsight/shared-types"
import {
  PW_ARENA_DAILY_SESSION_LIMIT,
  PW_ARENA_MAX_ROUNDS,
} from "@/lib/persona-world/arena/pw-arena-types"

/**
 * GET /api/persona-world/arena?userId=xxx&limit=20&offset=0
 * 아레나 세션 목록 조회
 */
export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  const userId = request.nextUrl.searchParams.get("userId")
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 20), 50)
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0)

  try {
    const where = userId
      ? { userId }
      : { status: { in: ["WAITING" as const, "IN_PROGRESS" as const] } }

    const [sessions, total] = await Promise.all([
      prisma.pWArenaSession.findMany({
        where,
        include: {
          turns: { orderBy: { roundNumber: "asc" } },
          votes: true,
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.pWArenaSession.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: sessions.map((s) => ({
        id: s.id,
        userId: s.userId,
        roomType: s.roomType,
        topic: s.topic,
        participantIds: s.participantIds,
        currentRound: s.currentRound,
        maxRounds: s.maxRounds,
        status: s.status,
        replaySaved: s.replaySaved,
        totalCoinsSpent: s.totalCoinsSpent,
        turnCount: s.turns.length,
        voteCount: s.votes.length,
        createdAt: s.createdAt.toISOString(),
        completedAt: s.completedAt?.toISOString() ?? null,
      })),
      meta: { total, limit, offset, hasMore: offset + limit < total },
    })
  } catch (error) {
    console.error("[PW Arena GET]", error)
    return NextResponse.json(
      { success: false, error: { code: "ARENA_LIST_ERROR", message: "아레나 목록 조회 실패" } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/persona-world/arena
 * 아레나 세션 생성 (코인 검증 → 차감 → 세션 생성)
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = (await request.json()) as PWArenaCreateRequest & { userId: string }
    const { userId, roomType, topic, participantIds, inviteTickets, extraRoundSets, saveReplay } =
      body

    if (!userId || !roomType || !topic || !participantIds?.length) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "필수 필드 누락" } },
        { status: 400 }
      )
    }

    // 1. 방 유형 검증
    const roomConfig = ARENA_ROOM_CONFIGS[roomType as ArenaRoomType]
    if (!roomConfig) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ROOM_TYPE", message: "잘못된 방 유형" } },
        { status: 400 }
      )
    }

    // 2. 인원 검증
    if (
      participantIds.length < roomConfig.minParticipants ||
      participantIds.length > roomConfig.maxParticipants
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PARTICIPANT_COUNT",
            message: `${roomConfig.minParticipants}~${roomConfig.maxParticipants}명 필요`,
          },
        },
        { status: 400 }
      )
    }

    // 3. 라운드 검증
    const maxRounds = roomConfig.defaultRounds + (extraRoundSets ?? 0) * ROUND_ADDON_AMOUNT
    if (maxRounds > PW_ARENA_MAX_ROUNDS) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MAX_ROUNDS_EXCEEDED", message: `최대 ${PW_ARENA_MAX_ROUNDS}라운드` },
        },
        { status: 400 }
      )
    }

    // 4. 일일 제한 검증
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dailyCount = await prisma.pWArenaSession.count({
      where: { userId, createdAt: { gte: today } },
    })
    if (dailyCount >= PW_ARENA_DAILY_SESSION_LIMIT) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DAILY_LIMIT", message: `일일 최대 ${PW_ARENA_DAILY_SESSION_LIMIT}회` },
        },
        { status: 429 }
      )
    }

    // 5. 비용 계산
    const costBreakdown = calculateArenaCost({
      roomType: roomType as ArenaRoomType,
      topic,
      participantIds,
      inviteTickets: inviteTickets ?? { normal: 0, premium: 0 },
      extraRoundSets: extraRoundSets ?? 0,
      saveReplay: saveReplay ?? false,
    })

    // 6. 코인 잔액 확인 + 차감
    const latestTx = await prisma.coinTransaction.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
    })
    const balance = latestTx?.balanceAfter ?? 0

    if (balance < costBreakdown.totalPrice) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INSUFFICIENT_BALANCE",
            message: `잔액 부족 (필요: ${costBreakdown.totalPrice}, 보유: ${balance})`,
          },
        },
        { status: 402 }
      )
    }

    // 코인 차감 트랜잭션
    await prisma.coinTransaction.create({
      data: {
        userId,
        type: "SPEND",
        amount: costBreakdown.totalPrice,
        balanceAfter: balance - costBreakdown.totalPrice,
        reason: `PW_ARENA_${roomType}`,
        status: "COMPLETED",
      },
    })

    // 7. 세션 생성
    const session = await prisma.pWArenaSession.create({
      data: {
        userId,
        roomType: roomType as ArenaRoomType,
        topic,
        participantIds,
        maxRounds,
        replaySaved: saveReplay ?? false,
        totalCoinsSpent: costBreakdown.totalPrice,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          userId: session.userId,
          roomType: session.roomType,
          topic: session.topic,
          participantIds: session.participantIds,
          currentRound: session.currentRound,
          maxRounds: session.maxRounds,
          status: session.status,
          createdAt: session.createdAt.toISOString(),
        },
        costBreakdown,
      },
    })
  } catch (error) {
    console.error("[PW Arena POST]", error)
    const message = error instanceof Error ? error.message : "세션 생성 실패"
    return NextResponse.json(
      { success: false, error: { code: "ARENA_CREATE_ERROR", message } },
      { status: 500 }
    )
  }
}
