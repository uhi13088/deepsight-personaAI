import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import { generateText } from "@/lib/llm-client"
import { createPWArenaLLMProvider } from "@/lib/persona-world/arena/pw-arena-llm"

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

/**
 * POST /api/persona-world/arena/[sessionId]/turns
 * 다음 라운드 실행 — 모든 참여 페르소나가 순서대로 발언
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  const { sessionId } = await params

  try {
    const body = (await request.json()) as { userId: string }
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId 필수" } },
        { status: 400 }
      )
    }

    // 1. 세션 조회
    const session = await prisma.pWArenaSession.findUnique({
      where: { id: sessionId },
      include: {
        turns: { orderBy: [{ roundNumber: "asc" }, { createdAt: "asc" }] },
      },
    })

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

    if (session.status !== "WAITING" && session.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { success: false, error: { code: "SESSION_NOT_ACTIVE", message: "활성 세션이 아닙니다" } },
        { status: 400 }
      )
    }

    const nextRound = session.currentRound + 1
    if (nextRound > session.maxRounds) {
      return NextResponse.json(
        { success: false, error: { code: "MAX_ROUNDS_REACHED", message: "최대 라운드 도달" } },
        { status: 400 }
      )
    }

    // 2. 세션 상태 업데이트
    if (session.status === "WAITING") {
      await prisma.pWArenaSession.update({
        where: { id: sessionId },
        data: { status: "IN_PROGRESS" },
      })
    }

    // 3. LLM 프로바이더
    const llmProvider = createPWArenaLLMProvider(generateText)

    // 4. 이전 턴 컨텍스트
    const previousTurns = session.turns.map((t) => ({
      speakerId: t.speakerId,
      content: t.content,
      roundNumber: t.roundNumber,
    }))

    // 5. 각 페르소나 발언 생성
    const participantIds = session.participantIds as string[]
    const newTurns = []

    for (const personaId of participantIds) {
      // 페르소나 프로필 조회
      const persona = await prisma.persona.findUnique({
        where: { id: personaId },
        select: {
          id: true,
          name: true,
          role: true,
          description: true,
          voiceProfile: true,
        },
      })

      if (!persona) continue

      const voiceProfile = persona.voiceProfile as Record<string, unknown> | null
      const speechStyle = (voiceProfile?.speechStyle as string) ?? ""
      const habitualExpressions = (voiceProfile?.habitualExpressions as string[]) ?? []

      const result = await llmProvider.generateTurn({
        sessionId,
        roundNumber: nextRound,
        speakerId: personaId,
        topic: session.topic,
        previousTurns: [
          ...previousTurns,
          ...newTurns.map((t) => ({
            speakerId: t.speakerId,
            content: t.content,
            roundNumber: nextRound,
          })),
        ],
        personaProfile: {
          name: persona.name,
          role: persona.role,
          description: persona.description ?? "",
          speechStyle,
          habitualExpressions,
        },
      })

      const turn = await prisma.pWArenaTurn.create({
        data: {
          sessionId,
          roundNumber: nextRound,
          speakerId: personaId,
          content: result.content,
          tokensUsed: result.tokensUsed,
        },
      })

      newTurns.push(turn)
    }

    // 6. 라운드 업데이트
    const isLastRound = nextRound >= session.maxRounds
    await prisma.pWArenaSession.update({
      where: { id: sessionId },
      data: {
        currentRound: nextRound,
        ...(isLastRound ? { status: "COMPLETED", completedAt: new Date() } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        roundNumber: nextRound,
        isLastRound,
        turns: newTurns.map((t) => ({
          id: t.id,
          roundNumber: t.roundNumber,
          speakerId: t.speakerId,
          content: t.content,
          tokensUsed: t.tokensUsed,
          createdAt: t.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error("[PW Arena Turns POST]", error)
    const message = error instanceof Error ? error.message : "턴 실행 실패"
    return NextResponse.json(
      { success: false, error: { code: "ARENA_TURN_ERROR", message } },
      { status: 500 }
    )
  }
}
