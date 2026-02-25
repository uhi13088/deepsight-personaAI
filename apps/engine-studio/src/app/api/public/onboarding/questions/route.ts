import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/public/onboarding/questions?phase=1
 *
 * 온보딩 Phase별 질문 8개를 반환한다.
 *
 * Phase 매핑:
 *   Phase 1 = QUICK Q1~Q8   (L1: depth/lens/stance/scope)
 *   Phase 2 = QUICK Q9~Q12 + STANDARD Q13~Q16 (L1: taste/purpose + 교차)
 *   Phase 3 = STANDARD Q17~Q24 (교차검증 + 심층)
 */

type PhaseRange = { level: "QUICK" | "STANDARD" | "DEEP"; from: number; to: number }

const PHASE_RANGES: Record<number, PhaseRange[]> = {
  1: [{ level: "QUICK", from: 1, to: 8 }],
  2: [
    { level: "QUICK", from: 9, to: 12 },
    { level: "STANDARD", from: 13, to: 16 },
  ],
  3: [{ level: "STANDARD", from: 17, to: 24 }],
}

export async function GET(request: NextRequest) {
  try {
    const phase = Number(request.nextUrl.searchParams.get("phase") || "1")

    if (![1, 2, 3].includes(phase)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PHASE", message: "phase must be 1, 2, or 3" } },
        { status: 400 }
      )
    }

    const ranges = PHASE_RANGES[phase]

    // 여러 range를 OR 조건으로 묶어 단일 쿼리로 실행
    const questions = await prisma.psychProfileTemplate.findMany({
      where: {
        OR: ranges.map((range) => ({
          onboardingLevel: range.level,
          questionOrder: { gte: range.from, lte: range.to },
        })),
      },
      orderBy: { questionOrder: "asc" },
      select: {
        id: true,
        name: true,
        questionOrder: true,
        questionText: true,
        questionType: true,
        options: true,
        targetDimensions: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        phase,
        totalQuestions: questions.length,
        questions: questions.map((q) => ({
          id: q.id,
          order: q.questionOrder,
          text: q.questionText,
          type: q.questionType,
          options: q.options,
          targetDimensions: q.targetDimensions,
        })),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "ONBOARDING_QUESTIONS_ERROR", message } },
      { status: 500 }
    )
  }
}
