import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { TurnIssue } from "@/lib/arena/arena-engine"

// ── 헬퍼: 교정 내용을 페르소나에 반영 ─────────────────────────────

async function applyPersonaCorrection(correction: {
  id: string
  personaId: string
  category: string
  reason: string
  correctedContent: string
}): Promise<void> {
  const persona = await prisma.persona.findUnique({
    where: { id: correction.personaId },
    select: { voiceProfile: true, consistencyScore: true },
  })
  if (!persona) return

  const existingVoice = (persona.voiceProfile as Record<string, unknown>) ?? {}

  const updateData: Record<string, unknown> = {
    voiceProfile: {
      ...existingVoice,
      correctionApplied: true,
      lastCorrectionAt: new Date().toISOString(),
      lastCorrectionReason: correction.reason,
      lastCorrectionCategory: correction.category,
      lastCorrectionId: correction.id,
    },
  }

  if (correction.category === "consistency") {
    const current = Number(persona.consistencyScore ?? 0)
    updateData.consistencyScore = Math.min(1.0, current + 0.01)
  }

  await prisma.persona.update({
    where: { id: correction.personaId },
    data: updateData,
  })
}

/**
 * POST /api/internal/arena/sessions/[id]/corrections/generate
 *
 * 판정 이슈에서 교정 요청 일괄 자동 생성.
 * - 이미 교정이 존재하면 중복 생성하지 않음
 * - severity === "minor" → APPROVED + 페르소나 즉시 반영
 * - severity === "major" | "critical" → PENDING (관리자 검토)
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id: sessionId } = await params

    // 세션 + 판정 + 기존 교정 조회
    const session = await prisma.arenaSession.findUnique({
      where: { id: sessionId },
      include: {
        judgment: {
          include: {
            corrections: { select: { id: true } },
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

    if (!session.judgment) {
      return NextResponse.json(
        { success: false, error: { code: "NO_JUDGMENT", message: "판정이 없습니다." } },
        { status: 400 }
      )
    }

    // 이미 교정이 있으면 스킵
    if (session.judgment.corrections.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          generated: 0,
          skipped: session.judgment.corrections.length,
          message: "이미 교정이 생성되어 있습니다.",
        },
      })
    }

    const issues = Array.isArray(session.judgment.issues)
      ? (session.judgment.issues as unknown as TurnIssue[])
      : []

    if (issues.length === 0) {
      return NextResponse.json({
        success: true,
        data: { generated: 0, skipped: 0, message: "이슈가 없습니다." },
      })
    }

    let generated = 0
    let autoApplied = 0

    for (const issue of issues) {
      const isMinor = issue.severity === "minor"
      const initialStatus = isMinor ? "APPROVED" : "PENDING"

      const correction = await prisma.arenaCorrectionRequest.create({
        data: {
          sessionId,
          judgmentId: session.judgment.id,
          personaId: issue.personaId,
          category: issue.category,
          originalContent: `턴 ${issue.turnNumber} 발화`,
          correctedContent: issue.suggestion,
          reason: issue.description,
          status: initialStatus,
          ...(isMinor && {
            reviewedAt: new Date(),
            reviewedBy: "auto",
          }),
        },
      })

      generated++

      // minor → 즉시 페르소나 반영
      if (isMinor) {
        await applyPersonaCorrection({
          id: correction.id,
          personaId: correction.personaId,
          category: correction.category,
          reason: correction.reason,
          correctedContent: correction.correctedContent,
        })
        autoApplied++
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        generated,
        autoApplied,
        pendingReview: generated - autoApplied,
        message: `교정 ${generated}건 생성 (자동 적용 ${autoApplied}건, 검토 대기 ${generated - autoApplied}건)`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "GENERATE_CORRECTIONS_ERROR", message } },
      { status: 500 }
    )
  }
}
