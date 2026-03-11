import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

/**
 * GET /api/persona-world/arena/[sessionId]
 * 아레나 세션 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  const { sessionId } = await params

  try {
    const session = await prisma.pWArenaSession.findUnique({
      where: { id: sessionId },
      include: {
        turns: { orderBy: [{ roundNumber: "asc" }, { createdAt: "asc" }] },
        votes: true,
      },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "세션을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: session.id,
        userId: session.userId,
        roomType: session.roomType,
        topic: session.topic,
        participantIds: session.participantIds,
        currentRound: session.currentRound,
        maxRounds: session.maxRounds,
        status: session.status,
        replaySaved: session.replaySaved,
        totalCoinsSpent: session.totalCoinsSpent,
        turns: session.turns.map((t) => ({
          id: t.id,
          roundNumber: t.roundNumber,
          speakerId: t.speakerId,
          content: t.content,
          tokensUsed: t.tokensUsed,
          createdAt: t.createdAt.toISOString(),
        })),
        votes: session.votes.map((v) => ({
          id: v.id,
          userId: v.userId,
          personaId: v.personaId,
          roundNumber: v.roundNumber,
          createdAt: v.createdAt.toISOString(),
        })),
        createdAt: session.createdAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error("[PW Arena GET sessionId]", error)
    return NextResponse.json(
      { success: false, error: { code: "ARENA_DETAIL_ERROR", message: "세션 조회 실패" } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/persona-world/arena/[sessionId]
 * 세션 상태 변경 (완료 / 취소)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  const { sessionId } = await params

  try {
    const body = (await request.json()) as { userId: string; action: "complete" | "cancel" }
    const { userId, action } = body

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId, action 필수" } },
        { status: 400 }
      )
    }

    const session = await prisma.pWArenaSession.findUnique({ where: { id: sessionId } })
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "세션 없음" } },
        { status: 404 }
      )
    }

    if (session.userId !== userId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "세션 소유자가 아닙니다" } },
        { status: 403 }
      )
    }

    if (action === "complete") {
      if (session.status !== "WAITING" && session.status !== "IN_PROGRESS") {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_STATE", message: "완료할 수 없는 상태" } },
          { status: 400 }
        )
      }
      await prisma.pWArenaSession.update({
        where: { id: sessionId },
        data: { status: "COMPLETED", completedAt: new Date() },
      })
    } else if (action === "cancel") {
      if (session.status !== "WAITING") {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_STATE", message: "대기 중인 세션만 취소 가능" },
          },
          { status: 400 }
        )
      }
      await prisma.pWArenaSession.update({
        where: { id: sessionId },
        data: { status: "CANCELLED" },
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ACTION", message: "complete 또는 cancel만 가능" },
        },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, data: { sessionId, action } })
  } catch (error) {
    console.error("[PW Arena PATCH]", error)
    return NextResponse.json(
      { success: false, error: { code: "ARENA_UPDATE_ERROR", message: "세션 업데이트 실패" } },
      { status: 500 }
    )
  }
}
