import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"

// ── 헬퍼: 교정 내용을 페르소나에 반영 ─────────────────────────────

async function applyPersonaCorrection(correction: {
  id: string
  personaId: string
  category: string
  reason: string
  correctedContent: string
}): Promise<void> {
  // voiceProfile JSON 머지 (기존 데이터 보존)
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

  // consistency 카테고리: consistencyScore 소폭 상향 (+0.01, max 1.0)
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
 * POST /api/internal/arena/sessions/[id]/corrections
 *
 * 아레나 세션의 심판 판정에서 교정 요청 생성.
 * severity === "minor" 인 경우 자동 승인 후 페르소나에 즉시 반영.
 *
 * Body:
 * - personaId: string (교정 대상 페르소나)
 * - category: string (consistency|l2|paradox|trigger|voice)
 * - severity?: "minor" | "major" | "critical" (기본값: "major")
 * - originalContent: string (원본 텍스트)
 * - correctedContent: string (교정된 텍스트)
 * - reason: string (교정 사유)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id: sessionId } = await params
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

    const { personaId, category, severity, originalContent, correctedContent, reason } = body

    // 필수 필드 검증
    if (!personaId || typeof personaId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_PERSONA_ID", message: "personaId는 필수입니다." },
        },
        { status: 400 }
      )
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_CATEGORY", message: "category는 필수입니다." },
        },
        { status: 400 }
      )
    }

    if (!originalContent || typeof originalContent !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_ORIGINAL", message: "originalContent는 필수입니다." },
        },
        { status: 400 }
      )
    }

    if (!correctedContent || typeof correctedContent !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_CORRECTED", message: "correctedContent는 필수입니다." },
        },
        { status: 400 }
      )
    }

    if (!reason || typeof reason !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_REASON", message: "reason은 필수입니다." },
        },
        { status: 400 }
      )
    }

    // minor severity → 자동 승인
    const isMinor = severity === "minor"
    const initialStatus = isMinor ? "APPROVED" : "PENDING"

    // 세션 + 판정 존재 확인
    const session = await prisma.arenaSession.findUnique({
      where: { id: sessionId },
      include: { judgment: true },
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
        {
          success: false,
          error: {
            code: "NO_JUDGMENT",
            message: "판정이 아직 없습니다. 판정 후 교정을 요청하세요.",
          },
        },
        { status: 400 }
      )
    }

    // 교정 요청 생성
    const correction = await prisma.arenaCorrectionRequest.create({
      data: {
        sessionId,
        judgmentId: session.judgment.id,
        personaId,
        category,
        originalContent,
        correctedContent,
        reason,
        status: initialStatus,
        ...(isMinor && {
          reviewedAt: new Date(),
          reviewedBy: "auto",
        }),
      },
    })

    // minor → 즉시 페르소나 반영
    let personaUpdated = false
    if (isMinor) {
      await applyPersonaCorrection({
        id: correction.id,
        personaId: correction.personaId,
        category: correction.category,
        reason: correction.reason,
        correctedContent: correction.correctedContent,
      })
      personaUpdated = true
    }

    return NextResponse.json({
      success: true,
      data: {
        correction: {
          id: correction.id,
          sessionId: correction.sessionId,
          personaId: correction.personaId,
          category: correction.category,
          status: correction.status,
          autoApplied: isMinor,
          createdAt: correction.createdAt.toISOString(),
        },
        personaUpdated,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "CORRECTION_CREATE_ERROR", message },
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/internal/arena/sessions/[id]/corrections
 *
 * 교정 요청 승인/거부.
 * 승인 시 모든 카테고리(voice/consistency/l2/paradox/trigger) 페르소나에 반영.
 *
 * Body:
 * - correctionId: string
 * - action: "approve" | "reject"
 * - reviewedBy?: string
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id: sessionId } = await params
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

    const { correctionId, action, reviewedBy } = body

    if (!correctionId || typeof correctionId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "MISSING_CORRECTION_ID", message: "correctionId는 필수입니다." },
        },
        { status: 400 }
      )
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ACTION", message: "action은 approve 또는 reject이어야 합니다." },
        },
        { status: 400 }
      )
    }

    // 교정 요청 조회
    const correction = await prisma.arenaCorrectionRequest.findUnique({
      where: { id: correctionId },
    })

    if (!correction || correction.sessionId !== sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "CORRECTION_NOT_FOUND", message: "교정 요청을 찾을 수 없습니다." },
        },
        { status: 404 }
      )
    }

    if (correction.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ALREADY_REVIEWED",
            message: `이미 처리된 교정입니다: ${correction.status}`,
          },
        },
        { status: 400 }
      )
    }

    // 상태 업데이트
    const updated = await prisma.arenaCorrectionRequest.update({
      where: { id: correctionId },
      data: {
        status: action === "approve" ? "APPROVED" : "REJECTED",
        reviewedAt: new Date(),
        reviewedBy: reviewedBy ?? null,
      },
    })

    // 승인 시 모든 카테고리 페르소나 반영
    let personaUpdated = false
    if (action === "approve") {
      await applyPersonaCorrection({
        id: correction.id,
        personaId: correction.personaId,
        category: correction.category,
        reason: correction.reason,
        correctedContent: correction.correctedContent,
      })
      personaUpdated = true
    }

    return NextResponse.json({
      success: true,
      data: {
        correction: {
          id: updated.id,
          status: updated.status,
          reviewedAt: updated.reviewedAt?.toISOString() ?? null,
          reviewedBy: updated.reviewedBy,
        },
        personaUpdated,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "CORRECTION_REVIEW_ERROR", message },
      },
      { status: 500 }
    )
  }
}
