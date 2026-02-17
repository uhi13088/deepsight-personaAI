import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processSnsData } from "@/lib/persona-world/onboarding/sns-processor"
import type { SNSExtendedData } from "@/lib/persona-world/types"
import type { Prisma } from "@/generated/prisma"

/**
 * POST /api/persona-world/onboarding/sns/connect
 *
 * SNS 데이터 제출 → Init 알고리즘 → 벡터 생성/보정.
 *
 * Body:
 * - userId: string (필수)
 * - snsData: SNSExtendedData[] (필수)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, snsData } = body as {
      userId: string
      snsData: SNSExtendedData[]
    }

    if (!userId || !snsData?.length) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "userId, snsData 필요" },
        },
        { status: 400 }
      )
    }

    // 기존 온보딩 벡터 조회
    const user = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
      select: {
        openness: true,
        conscientiousness: true,
        extraversion: true,
        agreeableness: true,
        neuroticism: true,
        hasOceanProfile: true,
      },
    })

    // 기존 설문 결과에서 L1 벡터 조회
    const latestSurvey = await prisma.pWUserSurveyResponse.findFirst({
      where: { userId, completedAt: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { computedVector: true },
    })

    const existingVector = latestSurvey?.computedVector
      ? buildExistingVector(latestSurvey.computedVector, user)
      : undefined

    // SNS 데이터 처리
    const result = await processSnsData(snsData, existingVector)

    // SNS 연결 정보 저장
    for (const sns of snsData) {
      const platform = sns.platform as
        | "NETFLIX"
        | "YOUTUBE"
        | "INSTAGRAM"
        | "SPOTIFY"
        | "LETTERBOXD"
        | "TWITTER"
        | "TIKTOK"

      await prisma.sNSConnection.upsert({
        where: {
          userId_platform: { userId, platform },
        },
        update: {
          profileData: sns.profileData as Prisma.InputJsonValue,
          extractedData: sns.extractedData as Prisma.InputJsonValue,
          lastSyncAt: new Date(),
        },
        create: {
          userId,
          platform,
          profileData: sns.profileData as Prisma.InputJsonValue,
          extractedData: sns.extractedData as Prisma.InputJsonValue,
          lastSyncAt: new Date(),
        },
      })
    }

    // 프로필 업데이트
    await prisma.personaWorldUser.update({
      where: { id: userId },
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

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[persona-world/sns/connect] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "SNS_CONNECT_ERROR", message } },
      { status: 500 }
    )
  }
}

function buildExistingVector(
  computedVector: unknown,
  user: {
    openness: unknown
    conscientiousness: unknown
    extraversion: unknown
    agreeableness: unknown
    neuroticism: unknown
    hasOceanProfile: boolean
  } | null
):
  | {
      l1: {
        depth: number
        lens: number
        stance: number
        scope: number
        taste: number
        purpose: number
        sociability: number
      }
      l2?: {
        openness: number
        conscientiousness: number
        extraversion: number
        agreeableness: number
        neuroticism: number
      }
    }
  | undefined {
  const cv = computedVector as { l1?: Record<string, number> } | null
  if (!cv?.l1) return undefined

  const l1 = {
    depth: cv.l1.depth ?? 0.5,
    lens: cv.l1.lens ?? 0.5,
    stance: cv.l1.stance ?? 0.5,
    scope: cv.l1.scope ?? 0.5,
    taste: cv.l1.taste ?? 0.5,
    purpose: cv.l1.purpose ?? 0.5,
    sociability: cv.l1.sociability ?? 0.5,
  }

  if (user?.hasOceanProfile) {
    return {
      l1,
      l2: {
        openness: Number(user.openness ?? 0.5),
        conscientiousness: Number(user.conscientiousness ?? 0.5),
        extraversion: Number(user.extraversion ?? 0.5),
        agreeableness: Number(user.agreeableness ?? 0.5),
        neuroticism: Number(user.neuroticism ?? 0.5),
      },
    }
  }

  return { l1 }
}
