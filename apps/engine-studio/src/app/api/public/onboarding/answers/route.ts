import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/public/onboarding/answers
 *
 * Phase 완료 시 답변을 제출하고 벡터를 계산한다.
 *
 * Body:
 * {
 *   userId: string,
 *   phase: 1 | 2 | 3,
 *   answers: Array<{ questionId: string, value: string }>
 * }
 *
 * 답변의 weights를 합산하여 6D 벡터 차원별 평균을 구한 뒤,
 * PersonaWorldUser 프로필을 업데이트한다.
 */

interface AnswerInput {
  questionId: string
  value: string
}

interface RequestBody {
  userId: string
  phase: number
  answers: AnswerInput[]
}

// Phase별 프로필 등급 & 보상
const PHASE_CONFIG: Record<
  number,
  { quality: "BASIC" | "STANDARD" | "ADVANCED"; credits: number; confidence: number }
> = {
  1: { quality: "BASIC", credits: 100, confidence: 0.65 },
  2: { quality: "STANDARD", credits: 150, confidence: 0.8 },
  3: { quality: "ADVANCED", credits: 200, confidence: 0.93 },
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { userId, phase, answers } = body

    if (!userId || ![1, 2, 3].includes(phase) || !answers?.length) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "userId, phase (1-3), and answers are required",
          },
        },
        { status: 400 }
      )
    }

    // 질문 정보 조회 (weights 포함)
    const questionIds = answers.map((a) => a.questionId)
    const questions = await prisma.psychProfileTemplate.findMany({
      where: { id: { in: questionIds } },
      select: {
        id: true,
        questionType: true,
        options: true,
        targetDimensions: true,
        weightFormula: true,
      },
    })

    const questionMap = new Map(questions.map((q) => [q.id, q]))

    // 차원별 점수 누적
    const dimScores: Record<string, number[]> = {}

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId)
      if (!question) continue

      const formula = question.weightFormula as { type: string } | null

      if (question.questionType === "SLIDER") {
        // 슬라이더: value가 0~1 숫자
        const val = Number(answer.value)
        if (!isNaN(val)) {
          for (const dim of question.targetDimensions) {
            if (!dimScores[dim]) dimScores[dim] = []
            dimScores[dim].push(Math.max(0, Math.min(1, val)))
          }
        }
      } else if (question.questionType === "MULTIPLE_CHOICE" && formula?.type === "mapped") {
        // 매핑형: 선택된 옵션의 weights 사용
        const options = question.options as Array<{
          id: string
          value: string
          weights?: Record<string, number>
        }> | null
        if (options) {
          const selected = options.find((o) => o.id === answer.value || o.value === answer.value)
          if (selected?.weights) {
            for (const [dim, weight] of Object.entries(selected.weights)) {
              if (!dimScores[dim]) dimScores[dim] = []
              dimScores[dim].push(weight)
            }
          }
        }
      }
    }

    // 차원별 평균 계산
    const vectorUpdate: Record<string, number> = {}
    for (const [dim, scores] of Object.entries(dimScores)) {
      if (scores.length > 0) {
        const avg = scores.reduce((s, v) => s + v, 0) / scores.length
        vectorUpdate[dim] = Math.round(avg * 100) / 100
      }
    }

    // 사용자 프로필 업데이트 (userId = PersonaWorldUser.id)
    const config = PHASE_CONFIG[phase]

    const user = await prisma.personaWorldUser.update({
      where: { id: userId },
      data: {
        ...(vectorUpdate.depth !== undefined && { depth: vectorUpdate.depth }),
        ...(vectorUpdate.lens !== undefined && { lens: vectorUpdate.lens }),
        ...(vectorUpdate.stance !== undefined && { stance: vectorUpdate.stance }),
        ...(vectorUpdate.scope !== undefined && { scope: vectorUpdate.scope }),
        ...(vectorUpdate.taste !== undefined && { taste: vectorUpdate.taste }),
        ...(vectorUpdate.purpose !== undefined && { purpose: vectorUpdate.purpose }),
        profileQuality: config.quality,
        confidenceScore: config.confidence,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        phase,
        profileQuality: config.quality,
        confidence: config.confidence,
        creditsAwarded: config.credits,
        vectorUpdate,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "ONBOARDING_ANSWERS_ERROR", message } },
      { status: 500 }
    )
  }
}
