import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import { generateText } from "@/lib/llm-client"
import {
  judgeSessionRuleBased,
  judgeSessionLLM,
  type ArenaSession,
  type ArenaLLMProvider,
  type JudgmentPrecision,
} from "@/lib/arena/arena-engine"
import { loadPersonaMeta } from "@/lib/arena/persona-meta-loader"

// ── LLM 판정 프로바이더 (ArenaLLMProvider 구현) ───────────────

const claudeJudgeProvider: ArenaLLMProvider = {
  async generateTurn() {
    throw new Error("judge endpoint는 generateTurn을 사용하지 않습니다.")
  },
  async generateJudgment(prompt: string) {
    const result = await generateText({
      systemPrompt: "당신은 페르소나 아레나 심판관입니다. 지시에 따라 JSON으로만 응답하세요.",
      userMessage: prompt,
      maxTokens: 1024,
      temperature: 0,
      callType: "arena_judgment",
    })
    return { content: result.text, tokensUsed: result.inputTokens + result.outputTokens }
  },
}

/**
 * POST /api/internal/arena/sessions/[id]/judge
 *
 * 아레나 세션 판정 실행.
 * COMPLETED 세션에 대해 룰 기반 또는 LLM 판정을 수행하고 결과를 저장합니다.
 * 기존 판정이 있으면 덮어씁니다 (재판정 가능).
 *
 * Body:
 *   method?:    "RULE_BASED" | "LLM"  (default: "RULE_BASED")
 *   precision?: "BASIC" | "STANDARD" | "PRECISE"  (LLM 전용, default: "PRECISE")
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id: sessionId } = await params
    const body = (await req.json().catch(() => ({}))) as {
      method?: string
      precision?: string
    }
    const method = body.method === "LLM" ? "LLM" : "RULE_BASED"
    const precision = (body.precision ?? "PRECISE") as JudgmentPrecision

    // 세션 + 턴 조회
    const dbSession = await prisma.arenaSession.findUnique({
      where: { id: sessionId },
      include: { turns: { orderBy: { turnNumber: "asc" } } },
    })

    if (!dbSession) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SESSION_NOT_FOUND", message: "세션을 찾을 수 없습니다." },
        },
        { status: 404 }
      )
    }

    if (dbSession.status !== "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SESSION_NOT_COMPLETED",
            message: `판정은 COMPLETED 세션에서만 가능합니다. 현재 상태: ${dbSession.status}`,
          },
        },
        { status: 400 }
      )
    }

    // Prisma 레코드 → ArenaSession 엔진 객체 변환
    const rawSession = dbSession as typeof dbSession & { extraParticipants?: unknown }
    const extraIds = Array.isArray(rawSession.extraParticipants)
      ? (rawSession.extraParticipants as string[])
      : []
    const session: ArenaSession = {
      id: dbSession.id,
      mode: dbSession.mode as ArenaSession["mode"],
      participants: [dbSession.participantA, dbSession.participantB, ...extraIds],
      profileLoadLevel: dbSession.profileLoadLevel as ArenaSession["profileLoadLevel"],
      topic: dbSession.topic,
      maxTurns: dbSession.maxTurns,
      budgetTokens: dbSession.budgetTokens,
      usedTokens: dbSession.usedTokens,
      status: "COMPLETED",
      turns: dbSession.turns.map((t) => ({
        turnNumber: t.turnNumber,
        speakerId: t.speakerId,
        content: t.content,
        tokensUsed: t.tokensUsed,
        timestamp: t.timestamp.getTime(),
      })),
      createdAt: dbSession.createdAt.getTime(),
      completedAt: dbSession.completedAt?.getTime() ?? null,
    }

    // personaMeta 로드 (양/관련성 격률 검증용)
    const participantIds = [...new Set(session.turns.map((t) => t.speakerId))]
    const personaMeta = await loadPersonaMeta(participantIds)

    // 판정 실행
    const judgment =
      method === "LLM"
        ? await judgeSessionLLM(session, claudeJudgeProvider, precision, personaMeta)
        : judgeSessionRuleBased(session, personaMeta)

    // ArenaJudgment DB upsert (재판정 허용)
    const saved = await prisma.arenaJudgment.upsert({
      where: { sessionId },
      create: {
        sessionId,
        method: method === "LLM" ? "LLM" : "RULE_BASED",
        characterConsistency: judgment.scores.characterConsistency,
        l2Emergence: judgment.scores.l2Emergence,
        paradoxEmergence: judgment.scores.paradoxEmergence,
        triggerResponse: judgment.scores.triggerResponse,
        overallScore: judgment.overallScore,
        issues: JSON.parse(JSON.stringify(judgment.issues)),
        summary: judgment.summary,
        judgedAt: new Date(judgment.judgedAt),
      },
      update: {
        method: method === "LLM" ? "LLM" : "RULE_BASED",
        characterConsistency: judgment.scores.characterConsistency,
        l2Emergence: judgment.scores.l2Emergence,
        paradoxEmergence: judgment.scores.paradoxEmergence,
        triggerResponse: judgment.scores.triggerResponse,
        overallScore: judgment.overallScore,
        issues: JSON.parse(JSON.stringify(judgment.issues)),
        summary: judgment.summary,
        judgedAt: new Date(judgment.judgedAt),
      },
    })

    // LLM 판정인 경우 토큰 사용량 기록
    if (method === "LLM") {
      await prisma.arenaTokenUsage
        .create({
          data: {
            sessionId,
            phase: "JUDGMENT",
            inputTokens: 0, // claudeJudgeProvider에서 합산됨
            outputTokens: 0,
            estimatedCostUsd: 0,
          },
        })
        .catch(() => {
          // 비용 로깅 실패해도 판정 응답에 영향 없음
        })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: saved.id,
        method: saved.method,
        overallScore: Number(saved.overallScore),
        scores: {
          characterConsistency: Number(saved.characterConsistency),
          l2Emergence: Number(saved.l2Emergence),
          paradoxEmergence: Number(saved.paradoxEmergence),
          triggerResponse: Number(saved.triggerResponse),
        },
        issues: judgment.issues,
        summary: saved.summary,
        issueCount: judgment.issues.length,
        judgedAt: saved.judgedAt.toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "JUDGE_ERROR", message } },
      { status: 500 }
    )
  }
}
