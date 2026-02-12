import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processOnboardingAnswers } from "@/lib/persona-world/onboarding/onboarding-engine"
import type { OnboardingDataProvider } from "@/lib/persona-world/onboarding/onboarding-engine"
import type { OnboardingQuestion } from "@/lib/persona-world/onboarding/questions"
import type { OnboardingAnswer, OnboardingResult } from "@/lib/persona-world/types"
import type { Prisma } from "@prisma/client"

/**
 * POST /api/persona-world/onboarding/cold-start
 *
 * Cold Start 온보딩: 답변 제출 → 벡터 생성.
 *
 * Body:
 * - userId: string (필수)
 * - level: "LIGHT" | "MEDIUM" | "DEEP" (필수)
 * - answers: OnboardingAnswer[] (필수)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, level, answers } = body as {
      userId: string
      level: "LIGHT" | "MEDIUM" | "DEEP"
      answers: OnboardingAnswer[]
    }

    if (!userId || !level || !answers?.length) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "userId, level, answers 필요" },
        },
        { status: 400 }
      )
    }

    const provider: OnboardingDataProvider = {
      async getQuestionsByPhase(phase: 1 | 2 | 3): Promise<OnboardingQuestion[]> {
        // 설문 질문은 PWUserSurveyResponse의 answers JSON에서 질문 구조 재구성
        // 실제로는 별도 question_pool 테이블에서 조회하거나 설정 파일에서 로드
        // 현재는 빈 배열 반환 → 추후 질문 풀 구현 시 연동
        const _phase = phase
        return []
      },

      async saveOnboardingResult(
        uid: string,
        result: OnboardingResult,
        lv: "LIGHT" | "MEDIUM" | "DEEP"
      ): Promise<void> {
        const onboardingLevel = lv === "LIGHT" ? "LIGHT" : lv === "MEDIUM" ? "MEDIUM" : "DEEP"

        await prisma.pWUserSurveyResponse.upsert({
          where: {
            userId_surveyLevel: { userId: uid, surveyLevel: onboardingLevel },
          },
          update: {
            answers: answers as unknown as Prisma.InputJsonValue,
            computedVector: {
              l1: result.l1Vector,
              l2: result.l2Vector,
            } as unknown as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
          create: {
            userId: uid,
            surveyLevel: onboardingLevel,
            answers: answers as unknown as Prisma.InputJsonValue,
            computedVector: {
              l1: result.l1Vector,
              l2: result.l2Vector,
            } as unknown as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        })

        // 프로필 레벨 업데이트
        await prisma.personaWorldUser.update({
          where: { id: uid },
          data: {
            profileQuality: result.profileLevel,
            ...(result.l2Vector
              ? {
                  openness: result.l2Vector.openness,
                  conscientiousness: result.l2Vector.conscientiousness,
                  extraversion: result.l2Vector.extraversion,
                  agreeableness: result.l2Vector.agreeableness,
                  neuroticism: result.l2Vector.neuroticism,
                  hasOceanProfile: true,
                }
              : {}),
          },
        })
      },
    }

    const result = await processOnboardingAnswers(answers, level, provider)
    await provider.saveOnboardingResult(userId, result, level)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "ONBOARDING_ERROR", message } },
      { status: 500 }
    )
  }
}
