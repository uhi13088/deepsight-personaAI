import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  DEFAULT_MAX_TURNS,
  DEFAULT_BUDGET_TOKENS,
  MIN_TURNS,
  MAX_TURNS_LIMIT,
  PROFILE_TOKEN_ESTIMATES,
} from "@/lib/arena/arena-engine"
import type { ProfileLoadLevel } from "@/lib/arena/arena-engine"
import { estimateSessionCost } from "@/lib/arena/arena-cost-control"

// ── 유효성 검사 상수 ─────────────────────────────────────────

const VALID_PROFILE_LEVELS = new Set<string>(["FULL", "STANDARD", "LITE"])

// ── POST /api/internal/arena/sessions ────────────────────────
// 아레나 세션 생성 + 예상 비용 계산

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_BODY", message: "요청 본문이 올바르지 않습니다." },
        },
        { status: 400 }
      )
    }

    const { participantA, participantB, topic, maxTurns, budgetTokens, profileLoadLevel } = body

    // 필수 필드 검증
    if (!participantA || typeof participantA !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_PARTICIPANT_A", message: "participantA는 필수입니다." },
        },
        { status: 400 }
      )
    }

    if (!participantB || typeof participantB !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_PARTICIPANT_B", message: "participantB는 필수입니다." },
        },
        { status: 400 }
      )
    }

    if (participantA === participantB) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SAME_PARTICIPANTS",
            message: "두 참가자는 서로 달라야 합니다.",
          },
        },
        { status: 400 }
      )
    }

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_TOPIC", message: "topic은 필수입니다." },
        },
        { status: 400 }
      )
    }

    // 프로필 로드 수준 검증
    const level: ProfileLoadLevel =
      profileLoadLevel && VALID_PROFILE_LEVELS.has(profileLoadLevel) ? profileLoadLevel : "STANDARD"

    // maxTurns 검증
    const resolvedMaxTurns = Math.min(
      Math.max(typeof maxTurns === "number" ? maxTurns : DEFAULT_MAX_TURNS, MIN_TURNS),
      MAX_TURNS_LIMIT
    )

    // budgetTokens 검증
    const resolvedBudget =
      typeof budgetTokens === "number" && budgetTokens > 0 ? budgetTokens : DEFAULT_BUDGET_TOKENS

    // 참가자 존재 여부 확인
    const participants = await prisma.persona.findMany({
      where: { id: { in: [participantA, participantB] } },
      select: { id: true, name: true, status: true },
    })

    if (participants.length !== 2) {
      const foundIds = new Set(participants.map((p) => p.id))
      const missing = [participantA, participantB].filter((id) => !foundIds.has(id))
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PARTICIPANT_NOT_FOUND",
            message: `페르소나를 찾을 수 없습니다: ${missing.join(", ")}`,
          },
        },
        { status: 404 }
      )
    }

    // 예상 비용 계산
    const costEstimate = estimateSessionCost(level, resolvedMaxTurns, 0)

    // 세션 생성
    const session = await prisma.arenaSession.create({
      data: {
        participantA,
        participantB,
        topic: topic.trim(),
        maxTurns: resolvedMaxTurns,
        budgetTokens: resolvedBudget,
        profileLoadLevel: level,
        status: "PENDING",
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          mode: session.mode,
          participantA: session.participantA,
          participantB: session.participantB,
          profileLoadLevel: session.profileLoadLevel,
          topic: session.topic,
          maxTurns: session.maxTurns,
          budgetTokens: session.budgetTokens,
          status: session.status,
          createdAt: session.createdAt.toISOString(),
        },
        costEstimate: {
          profileTokens: costEstimate.profileTokens,
          turnTokens: costEstimate.turnTokens,
          judgmentTokens: costEstimate.judgmentTokens,
          totalEstimatedTokens: costEstimate.totalEstimatedTokens,
          profileLoadDescription: PROFILE_LOAD_DESCRIPTIONS[level],
        },
        participants: participants.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "ARENA_SESSION_CREATE_ERROR", message },
      },
      { status: 500 }
    )
  }
}

// ── 프로필 로드 수준 설명 ────────────────────────────────────

const PROFILE_LOAD_DESCRIPTIONS: Record<ProfileLoadLevel, string> = {
  FULL: `Full: 3-Layer 벡터 + Voice 스펙 + RAG 컨텍스트 (~${PROFILE_TOKEN_ESTIMATES.FULL} tok)`,
  STANDARD: `Standard: L1 + L2 + Voice (~${PROFILE_TOKEN_ESTIMATES.STANDARD} tok)`,
  LITE: `Lite: L1 + Stance (~${PROFILE_TOKEN_ESTIMATES.LITE} tok)`,
}
