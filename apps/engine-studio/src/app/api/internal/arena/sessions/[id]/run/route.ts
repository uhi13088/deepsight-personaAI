import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import {
  startSession,
  addTurn,
  getNextSpeaker,
  judgeSessionRuleBased,
} from "@/lib/arena/arena-engine"
import type { ArenaSession } from "@/lib/arena/arena-engine"

const anthropic = new Anthropic()

// ── 페르소나 대화 컨텍스트 프롬프트 빌더 ─────────────────────

function buildConversationPrompt(
  session: ArenaSession,
  speakerId: string,
  personaNames: Record<string, string>
): string {
  const opponentId = session.participants.find((p) => p !== speakerId) ?? ""
  const opponentName = personaNames[opponentId] ?? opponentId
  const myName = personaNames[speakerId] ?? speakerId

  const history = session.turns
    .map((t) => `${personaNames[t.speakerId] ?? t.speakerId}: ${t.content}`)
    .join("\n\n")

  const lines: string[] = []

  if (session.turns.length === 0) {
    lines.push(`주제: "${session.topic}"`)
    lines.push(`${opponentName}와 토론을 시작합니다. 당신의 첫 발언을 해주세요.`)
  } else {
    lines.push(`주제: "${session.topic}"`)
    lines.push(``)
    lines.push(`대화 기록:`)
    lines.push(history)
    lines.push(``)
    lines.push(
      `위 대화에 이어, ${myName}로서 ${opponentName}의 주장에 반응하여 자연스럽게 발언하세요.`
    )
  }

  lines.push(`2~4문장으로 간결하게 작성하세요.`)
  return lines.join("\n")
}

// ── POST /api/internal/arena/sessions/[id]/run ───────────────

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  const { id } = await params

  try {
    // 1. 세션 로드
    const dbSession = await prisma.arenaSession.findUnique({
      where: { id },
      include: { turns: { orderBy: { turnNumber: "asc" } } },
    })

    if (!dbSession) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `세션을 찾을 수 없습니다: ${id}` } },
        { status: 404 }
      )
    }

    if (dbSession.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATE",
            message: `PENDING 상태 세션만 실행 가능합니다. 현재 상태: ${dbSession.status}`,
          },
        },
        { status: 400 }
      )
    }

    // 2. 참가자 페르소나 로드
    const personas = await prisma.persona.findMany({
      where: { id: { in: [dbSession.participantA, dbSession.participantB] } },
      select: { id: true, name: true, role: true, basePrompt: true, promptTemplate: true },
    })

    const personaNames: Record<string, string> = {}
    const personaSystemPrompts: Record<string, string> = {}

    for (const p of personas) {
      personaNames[p.id] = p.name
      personaSystemPrompts[p.id] =
        p.basePrompt ??
        p.promptTemplate ??
        `당신은 ${p.name}입니다.${p.role ? ` 역할: ${p.role}.` : ""} 자신의 캐릭터에 맞게 토론에 참여하세요.`
    }

    // 3. lib 형식 세션 구성 (PENDING 상태 — startSession이 RUNNING으로 변경)
    const libSession: ArenaSession = {
      id: dbSession.id,
      mode: "SPARRING_1V1",
      participants: [dbSession.participantA, dbSession.participantB],
      profileLoadLevel: dbSession.profileLoadLevel as ArenaSession["profileLoadLevel"],
      topic: dbSession.topic,
      maxTurns: dbSession.maxTurns,
      budgetTokens: dbSession.budgetTokens,
      usedTokens: dbSession.usedTokens,
      status: "PENDING",
      turns: [],
      createdAt: dbSession.createdAt.getTime(),
      completedAt: null,
    }

    // 4. DB 상태를 RUNNING으로 업데이트
    await prisma.arenaSession.update({
      where: { id },
      data: { status: "RUNNING", startedAt: new Date() },
    })

    // 5. 턴 실행 루프 (system prompt 분리 적용)
    let current = startSession(libSession)
    let totalTokensUsed = 0

    while (current.status === "RUNNING") {
      const speakerId = getNextSpeaker(current)
      if (!speakerId) break

      const systemPrompt =
        personaSystemPrompts[speakerId] ??
        `당신은 ${personaNames[speakerId] ?? speakerId}입니다. 캐릭터에 맞게 토론하세요.`
      const userPrompt = buildConversationPrompt(current, speakerId, personaNames)

      let content = ""
      let tokensUsed = 0

      try {
        const msg = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        })
        content = msg.content[0]?.type === "text" ? msg.content[0].text : "(응답 없음)"
        tokensUsed = msg.usage.input_tokens + msg.usage.output_tokens
      } catch {
        content = "(LLM 오류로 응답 생략)"
        tokensUsed = 0
      }

      // DB에 턴 즉시 저장
      const turnNumber = current.turns.length + 1
      await prisma.arenaTurn.create({
        data: {
          sessionId: id,
          turnNumber,
          speakerId,
          content,
          tokensUsed,
          timestamp: new Date(),
        },
      })

      current = addTurn(current, speakerId, content, tokensUsed)
      totalTokensUsed += tokensUsed
    }

    // 6. 룰 기반 판정
    const judgment = judgeSessionRuleBased(current)

    // 7. 판정 저장 (이미 존재하면 skip)
    const existingJudgment = await prisma.arenaJudgment.findUnique({
      where: { sessionId: id },
    })

    if (!existingJudgment) {
      await prisma.arenaJudgment.create({
        data: {
          sessionId: id,
          method: "RULE_BASED",
          characterConsistency: judgment.scores.characterConsistency,
          l2Emergence: judgment.scores.l2Emergence,
          paradoxEmergence: judgment.scores.paradoxEmergence,
          triggerResponse: judgment.scores.triggerResponse,
          overallScore: judgment.overallScore,
          issues: judgment.issues as unknown as Prisma.InputJsonValue,
          summary: judgment.summary,
        },
      })
    }

    // 8. 세션 COMPLETED 처리
    await prisma.arenaSession.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        usedTokens: totalTokensUsed,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        sessionId: id,
        status: "COMPLETED",
        totalTurns: current.turns.length,
        totalTokens: totalTokensUsed,
        overallScore: judgment.overallScore,
      },
    })
  } catch (error) {
    // 실패 시 세션을 PENDING으로 복구 (재시도 가능)
    await prisma.arenaSession.update({ where: { id }, data: { status: "PENDING" } }).catch(() => {})

    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "RUN_FAILED", message } },
      { status: 500 }
    )
  }
}

// Prisma InputJsonValue 타입 참조
import type { Prisma } from "@/generated/prisma"
