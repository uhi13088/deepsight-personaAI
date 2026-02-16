import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/internal/arena/sessions/[id]/corrections
 *
 * 아레나 세션의 심판 판정에서 교정 요청 생성.
 *
 * Body:
 * - personaId: string (교정 대상 페르소나)
 * - category: string (consistency|l2|paradox|trigger|voice)
 * - originalContent: string (원본 텍스트)
 * - correctedContent: string (교정된 텍스트)
 * - reason: string (교정 사유)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { personaId, category, originalContent, correctedContent, reason } = body

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
        status: "PENDING",
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        correction: {
          id: correction.id,
          sessionId: correction.sessionId,
          personaId: correction.personaId,
          category: correction.category,
          status: correction.status,
          createdAt: correction.createdAt.toISOString(),
        },
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
 *
 * Body:
 * - correctionId: string
 * - action: "approve" | "reject"
 * - reviewedBy?: string
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // 승인 시 voiceProfile 반영 (AC2)
    let voiceProfileUpdated = false
    if (action === "approve" && correction.category === "voice") {
      await prisma.persona.update({
        where: { id: correction.personaId },
        data: {
          voiceProfile: {
            // JSON merge: 교정 사유를 기록
            correctionApplied: true,
            lastCorrectionAt: new Date().toISOString(),
            lastCorrectionReason: correction.reason,
          },
        },
      })
      voiceProfileUpdated = true
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
        voiceProfileUpdated,
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
