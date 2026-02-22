import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/internal/arena/sessions/[id]
 *
 * 아레나 세션 상세 조회.
 * 세션 정보 + 턴 로그 + 판정 보고서 (점수/이슈/요약) + 교정 현황 반환.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id: sessionId } = await params

    const session = await prisma.arenaSession.findUnique({
      where: { id: sessionId },
      include: {
        turns: { orderBy: { turnNumber: "asc" } },
        judgment: {
          include: {
            corrections: {
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                personaId: true,
                category: true,
                status: true,
                reason: true,
                originalContent: true,
                correctedContent: true,
                createdAt: true,
                reviewedAt: true,
              },
            },
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SESSION_NOT_FOUND", message: "세션을 찾을 수 없습니다." },
        },
        { status: 404 }
      )
    }

    // 참가자 ID 수집 (1:N 포함) — extraParticipants는 schema 마이그레이션 후 Prisma 타입에 반영
    const rawSession = session as typeof session & { extraParticipants?: unknown }
    const extraIds = Array.isArray(rawSession.extraParticipants)
      ? (rawSession.extraParticipants as string[])
      : []
    const allParticipantIds = [session.participantA, session.participantB, ...extraIds]

    const personas = await prisma.persona.findMany({
      where: { id: { in: allParticipantIds } },
      select: { id: true, name: true, role: true, qualityScore: true, consistencyScore: true },
    })
    const personaMap = new Map(personas.map((p) => [p.id, p]))

    // 교정 참가자 이름 매핑
    const correctionPersonaIds = session.judgment?.corrections.map((c) => c.personaId) ?? []
    const correctionPersonas =
      correctionPersonaIds.length > 0
        ? await prisma.persona.findMany({
            where: { id: { in: correctionPersonaIds } },
            select: { id: true, name: true },
          })
        : []
    const correctionPersonaMap = new Map(correctionPersonas.map((p) => [p.id, p.name]))

    // 심판 이슈 파싱 (JSON 저장)
    const rawIssues = Array.isArray(session.judgment?.issues) ? session.judgment.issues : []

    // 품질 영향 요약
    const corrections = session.judgment?.corrections ?? []
    const qualityImpact = {
      correctionsPending: corrections.filter((c) => c.status === "PENDING").length,
      correctionsApproved: corrections.filter((c) => c.status === "APPROVED").length,
      correctionsRejected: corrections.filter((c) => c.status === "REJECTED").length,
      totalCorrections: corrections.length,
      affectedPersonas: [...new Set(corrections.map((c) => c.personaId))].map((id) => ({
        id,
        name: correctionPersonaMap.get(id) ?? id,
        correctionCount: corrections.filter((c) => c.personaId === id).length,
        approvedCount: corrections.filter((c) => c.personaId === id && c.status === "APPROVED")
          .length,
      })),
    }

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          mode: session.mode,
          topic: session.topic,
          status: session.status,
          profileLoadLevel: session.profileLoadLevel,
          maxTurns: session.maxTurns,
          budgetTokens: session.budgetTokens,
          usedTokens: session.usedTokens,
          createdAt: session.createdAt.toISOString(),
          completedAt: session.completedAt?.toISOString() ?? null,
          participantA: session.participantA,
          participantAName: personaMap.get(session.participantA)?.name ?? session.participantA,
          participantARole: personaMap.get(session.participantA)?.role ?? null,
          participantB: session.participantB,
          participantBName: personaMap.get(session.participantB)?.name ?? session.participantB,
          participantBRole: personaMap.get(session.participantB)?.role ?? null,
          extraParticipants: extraIds.map((id) => ({
            id,
            name: personaMap.get(id)?.name ?? id,
            role: personaMap.get(id)?.role ?? null,
          })),
        },
        turns: session.turns.map((t) => ({
          turnNumber: t.turnNumber,
          speakerId: t.speakerId,
          speakerName: personaMap.get(t.speakerId)?.name ?? t.speakerId,
          content: t.content,
          tokensUsed: t.tokensUsed,
          timestamp: t.timestamp.toISOString(),
        })),
        judgment: session.judgment
          ? {
              method: session.judgment.method,
              overallScore: Number(session.judgment.overallScore),
              scores: {
                characterConsistency: Number(session.judgment.characterConsistency),
                l2Emergence: Number(session.judgment.l2Emergence),
                paradoxEmergence: Number(session.judgment.paradoxEmergence),
                triggerResponse: Number(session.judgment.triggerResponse),
              },
              issues: rawIssues,
              summary: session.judgment.summary,
              judgedAt: session.judgment.judgedAt.toISOString(),
            }
          : null,
        corrections: corrections.map((c) => ({
          id: c.id,
          personaId: c.personaId,
          personaName: correctionPersonaMap.get(c.personaId) ?? c.personaId,
          category: c.category,
          status: c.status,
          reason: c.reason,
          originalContent: c.originalContent,
          correctedContent: c.correctedContent,
          createdAt: c.createdAt.toISOString(),
          reviewedAt: c.reviewedAt?.toISOString() ?? null,
        })),
        qualityImpact,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "SESSION_DETAIL_ERROR", message } },
      { status: 500 }
    )
  }
}
