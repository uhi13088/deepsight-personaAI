import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processOnboardingAnswers } from "@/lib/persona-world/onboarding/onboarding-engine"
import type { OnboardingDataProvider } from "@/lib/persona-world/onboarding/onboarding-engine"
import type { OnboardingQuestion } from "@/lib/persona-world/onboarding/questions"
import type { OnboardingAnswer, OnboardingResult } from "@/lib/persona-world/types"
import type { Prisma } from "@/generated/prisma"

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

    // Phase → DB onboardingLevel/questionOrder 매핑 (질문 API route와 동일)
    type PhaseRange = { level: "LIGHT" | "MEDIUM"; from: number; to: number }
    const PHASE_RANGES: Record<number, PhaseRange[]> = {
      1: [{ level: "LIGHT", from: 1, to: 8 }],
      2: [
        { level: "LIGHT", from: 9, to: 12 },
        { level: "MEDIUM", from: 13, to: 16 },
      ],
      3: [{ level: "MEDIUM", from: 17, to: 24 }],
    }

    const provider: OnboardingDataProvider = {
      async getQuestionsByPhase(phase: 1 | 2 | 3): Promise<OnboardingQuestion[]> {
        const ranges = PHASE_RANGES[phase]
        const rows: Array<{ id: string; options: Prisma.JsonValue }> = []

        for (const range of ranges) {
          const batch = await prisma.psychProfileTemplate.findMany({
            where: {
              onboardingLevel: range.level,
              questionOrder: { gte: range.from, lte: range.to },
            },
            orderBy: { questionOrder: "asc" },
            select: { id: true, options: true },
          })
          rows.push(...batch)
        }

        return rows.map((row) => {
          const rawOptions = (row.options ?? []) as Array<{
            key: string
            l1Weights?: Record<string, number>
            l2Weights?: Record<string, number>
          }>
          return {
            id: row.id,
            phase,
            options: rawOptions.map((opt) => ({
              key: opt.key,
              l1Weights: opt.l1Weights,
              l2Weights: opt.l2Weights,
            })),
          }
        })
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
