import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import { startAdaptiveOnboarding } from "@/lib/persona-world/onboarding/adaptive-engine"
import type {
  AdaptiveOnboardingProvider,
  AdaptivePoolQuestion,
} from "@/lib/persona-world/onboarding/adaptive-engine"
import type { OnboardingResult } from "@/lib/persona-world/types"
import type { OnboardingQuestion } from "@deepsight/vector-core"
import type { Prisma } from "@/generated/prisma"

/**
 * POST /api/persona-world/onboarding/adaptive/start
 *
 * 적응형 온보딩 세션을 시작하고 첫 질문을 반환한다.
 *
 * Body: { userId: string }
 * Response: { sessionId, firstQuestion, totalEstimated }
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId } = body as { userId: string }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    const provider = buildAdaptiveProvider()
    const { session, firstQuestion } = await startAdaptiveOnboarding(userId, provider)

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        firstQuestion,
        totalEstimated: 24, // 초기 예상
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "ADAPTIVE_START_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── 인메모리 세션 저장소 (프로덕션에서는 Redis 등으로 대체) ──

const sessionStore = new Map<string, string>()

export function buildAdaptiveProvider(): AdaptiveOnboardingProvider {
  return {
    async getAdaptiveQuestionPool(): Promise<AdaptivePoolQuestion[]> {
      const rows = await prisma.psychProfileTemplate.findMany({
        where: { isAdaptive: true },
        orderBy: { questionOrder: "asc" },
        select: {
          id: true,
          questionText: true,
          questionType: true,
          options: true,
          targetDimensions: true,
          poolCategory: true,
          informationGain: true,
          minPriorAnswers: true,
        },
      })

      return rows.map((row) => {
        const rawOptions = (row.options ?? []) as Array<{
          key: string
          label?: string
          l1Weights?: Record<string, number>
          l2Weights?: Record<string, number>
          l3Weights?: Record<string, number>
        }>

        const question: OnboardingQuestion = {
          id: row.id,
          phase: 1, // 적응형에서는 phase 의미 없음
          options: rawOptions.map((opt) => ({
            key: opt.key,
            l1Weights: opt.l1Weights,
            l2Weights: opt.l2Weights,
            l3Weights: opt.l3Weights,
          })),
        }

        return {
          question,
          meta: {
            isAdaptive: true,
            poolCategory: row.poolCategory as
              | "core"
              | "deepening"
              | "cross_layer"
              | "verification"
              | "narrative",
            informationGain: Number(row.informationGain),
            targetDimensions: row.targetDimensions,
            minPriorAnswers: row.minPriorAnswers,
          },
          text: row.questionText,
          type: row.questionType,
          optionLabels: rawOptions.map((opt) => ({
            key: opt.key,
            label: opt.label ?? opt.key,
          })),
        }
      })
    },

    async saveSession(session) {
      sessionStore.set(session.sessionId, JSON.stringify(session))
    },

    async loadSession(sessionId) {
      const data = sessionStore.get(sessionId)
      if (!data) return null
      const parsed = JSON.parse(data)
      // Date 필드 복원
      parsed.startedAt = new Date(parsed.startedAt)
      parsed.lastAnsweredAt = parsed.lastAnsweredAt ? new Date(parsed.lastAnsweredAt) : null
      return parsed
    },

    async saveOnboardingResult(
      uid: string,
      result: OnboardingResult,
      lv: "QUICK" | "STANDARD" | "DEEP"
    ): Promise<void> {
      const onboardingLevel = lv

      await prisma.pWUserSurveyResponse.upsert({
        where: {
          userId_surveyLevel: { userId: uid, surveyLevel: onboardingLevel },
        },
        update: {
          computedVector: {
            l1: result.l1Vector,
            l2: result.l2Vector,
            l3: result.l3Vector,
          } as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
        create: {
          userId: uid,
          surveyLevel: onboardingLevel,
          answers: {} as Prisma.InputJsonValue,
          computedVector: {
            l1: result.l1Vector,
            l2: result.l2Vector,
            l3: result.l3Vector,
          } as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      })

      // L1 + L2 벡터 → PersonaWorldUser 업데이트 (upsert로 레코드 미존재 대응)
      const vectorData = {
        profileQuality: result.profileLevel,
        ...(result.l1Vector
          ? {
              depth: result.l1Vector.depth,
              lens: result.l1Vector.lens,
              stance: result.l1Vector.stance,
              scope: result.l1Vector.scope,
              taste: result.l1Vector.taste,
              purpose: result.l1Vector.purpose,
              sociability: result.l1Vector.sociability,
            }
          : {}),
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
      }
      await prisma.personaWorldUser.upsert({
        where: { id: uid },
        update: vectorData,
        create: { id: uid, email: `${uid}@onboarding.local`, ...vectorData },
      })
    },
  }
}
