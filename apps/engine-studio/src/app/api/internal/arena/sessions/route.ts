import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import {
  DEFAULT_MAX_TURNS,
  DEFAULT_BUDGET_TOKENS,
  MIN_TURNS,
  MAX_TURNS_LIMIT,
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  PROFILE_TOKEN_ESTIMATES,
} from "@/lib/arena/arena-engine"
import type { ProfileLoadLevel } from "@/lib/arena/arena-engine"
import { estimateSessionCost } from "@/lib/arena/arena-cost-control"

// ── 유효성 검사 상수 ─────────────────────────────────────────

const VALID_PROFILE_LEVELS = new Set<string>(["FULL", "STANDARD", "LITE"])

// ── GET /api/internal/arena/sessions ─────────────────────────
// 아레나 세션 목록 조회 (최근 50개, 참가자 이름 포함)

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const sessions = await prisma.arenaSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        judgment: { select: { overallScore: true, method: true } },
        _count: { select: { turns: true } },
      },
    })

    // 참가자 ID → 이름 매핑 (extraParticipants 포함) — 필드는 schema 마이그레이션 후 Prisma 타입에 반영
    type SessionWithExtra = (typeof sessions)[0] & { extraParticipants?: unknown }
    const personaIds = new Set<string>()
    for (const s of sessions as SessionWithExtra[]) {
      personaIds.add(s.participantA)
      personaIds.add(s.participantB)
      if (Array.isArray(s.extraParticipants)) {
        for (const id of s.extraParticipants as string[]) personaIds.add(id)
      }
    }
    const personas = await prisma.persona.findMany({
      where: { id: { in: [...personaIds] } },
      select: { id: true, name: true, role: true, profileImageUrl: true },
    })
    const personaMap = new Map(personas.map((p) => [p.id, p]))

    return NextResponse.json({
      success: true,
      data: {
        sessions: (sessions as SessionWithExtra[]).map((s) => ({
          id: s.id,
          mode: s.mode,
          participantA: s.participantA,
          participantAName: personaMap.get(s.participantA)?.name ?? s.participantA,
          participantARole: personaMap.get(s.participantA)?.role ?? null,
          participantB: s.participantB,
          participantBName: personaMap.get(s.participantB)?.name ?? s.participantB,
          participantBRole: personaMap.get(s.participantB)?.role ?? null,
          extraParticipants: Array.isArray(s.extraParticipants)
            ? (s.extraParticipants as string[]).map((id) => ({
                id,
                name: personaMap.get(id)?.name ?? id,
              }))
            : [],
          profileLoadLevel: s.profileLoadLevel,
          topic: s.topic,
          maxTurns: s.maxTurns,
          budgetTokens: s.budgetTokens,
          usedTokens: s.usedTokens,
          status: s.status,
          turnCount: s._count.turns,
          overallScore: s.judgment ? Number(s.judgment.overallScore) : null,
          judgmentMethod: s.judgment?.method ?? null,
          createdAt: s.createdAt.toISOString(),
          completedAt: s.completedAt?.toISOString() ?? null,
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "ARENA_LIST_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── POST /api/internal/arena/sessions ────────────────────────
// 아레나 세션 생성 + 예상 비용 계산

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

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

    const {
      participantA,
      participantB,
      extraParticipants: rawExtra,
      topic,
      maxTurns,
      budgetTokens,
      profileLoadLevel,
    } = body

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

    // 추가 참가자 검증 (1:N)
    const extraParticipants: string[] = Array.isArray(rawExtra)
      ? rawExtra.filter((id): id is string => typeof id === "string")
      : []

    const allParticipantIds = [participantA, participantB, ...extraParticipants]
    const uniqueIds = new Set(allParticipantIds)

    if (uniqueIds.size !== allParticipantIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DUPLICATE_PARTICIPANTS", message: "참가자가 중복됩니다." },
        },
        { status: 400 }
      )
    }

    if (allParticipantIds.length > MAX_PARTICIPANTS) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_PARTICIPANTS",
            message: `최대 ${MAX_PARTICIPANTS}명까지 참가 가능합니다.`,
          },
        },
        { status: 400 }
      )
    }

    if (allParticipantIds.length < MIN_PARTICIPANTS) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_FEW_PARTICIPANTS",
            message: `최소 ${MIN_PARTICIPANTS}명이 필요합니다.`,
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
      where: { id: { in: allParticipantIds } },
      select: { id: true, name: true, status: true },
    })

    if (participants.length !== allParticipantIds.length) {
      const foundIds = new Set(participants.map((p) => p.id))
      const missing = allParticipantIds.filter((id) => !foundIds.has(id))
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

    // 모드 결정 — SPARRING_1VN은 schema 마이그레이션 후 enum에 추가됨, 현재는 cast로 처리
    const mode = (allParticipantIds.length > 2 ? "SPARRING_1VN" : "SPARRING_1V1") as "SPARRING_1V1"

    // 예상 비용 계산
    const costEstimate = estimateSessionCost(level, resolvedMaxTurns, 0)

    // 세션 생성
    const session = await prisma.arenaSession.create({
      data: {
        mode,
        participantA,
        participantB,
        // extraParticipants는 schema 마이그레이션 후 활성화
        // extraParticipants,
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
          extraParticipants,
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
