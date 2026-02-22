import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseUploadedData } from "@/lib/persona-world/onboarding/sns-analyzer"
import { processSnsData } from "@/lib/persona-world/onboarding/sns-processor"
import { verifyInternalToken } from "@/lib/internal-auth"
import type { SNSExtendedData } from "@/lib/persona-world/types"
import type { Prisma, SNSPlatform } from "@/generated/prisma"

/**
 * POST /api/persona-world/onboarding/sns/upload
 *
 * Netflix, Letterboxd 등 OAuth가 없는 플랫폼의 데이터 업로드.
 * 유저가 직접 시청 기록 CSV/JSON을 업로드하면 파싱 → 벡터 생성.
 *
 * Body:
 * - userId: string (필수)
 * - platform: "NETFLIX" | "LETTERBOXD" (필수)
 * - uploadedData: Record<string, unknown> (필수 — 파싱된 CSV/JSON 데이터)
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, platform, uploadedData } = body as {
      userId: string
      platform: string
      uploadedData: Record<string, unknown>
    }

    if (!userId || !platform || !uploadedData) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "userId, platform, uploadedData 필요" },
        },
        { status: 400 }
      )
    }

    // 업로드 데이터 크기 제한: 항목 수 최대 10,000개
    if (Array.isArray(uploadedData.items) && uploadedData.items.length > 10000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "업로드 데이터는 최대 10,000개 항목까지 허용됩니다.",
          },
        },
        { status: 400 }
      )
    }

    // JSON 전체 크기 제한 (5MB)
    const bodyStr = JSON.stringify(uploadedData)
    if (bodyStr.length > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "업로드 데이터 크기가 5MB를 초과합니다.",
          },
        },
        { status: 400 }
      )
    }

    const snsPlatform = platform.toUpperCase() as SNSPlatform

    // Netflix, Letterboxd만 업로드 지원
    if (snsPlatform !== "NETFLIX" && snsPlatform !== "LETTERBOXD") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNSUPPORTED_PLATFORM",
            message: `${platform}은 데이터 업로드를 지원하지 않습니다. OAuth를 사용하세요.`,
          },
        },
        { status: 400 }
      )
    }

    // 업로드 데이터 파싱
    const extracted = parseUploadedData(snsPlatform, uploadedData)

    const snsData: SNSExtendedData = {
      platform: snsPlatform,
      profileData: uploadedData,
      extractedData: extracted as unknown as Record<string, unknown>,
    }

    // 기존 벡터 조회
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

    const latestSurvey = await prisma.pWUserSurveyResponse.findFirst({
      where: { userId, completedAt: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { computedVector: true },
    })

    const existingVector = buildExistingVector(latestSurvey?.computedVector, user)

    // sns-processor로 벡터 생성/보정
    const result = await processSnsData([snsData], existingVector)

    // DB 저장
    await prisma.sNSConnection.upsert({
      where: {
        userId_platform: { userId, platform: snsPlatform },
      },
      update: {
        profileData: snsData.profileData as Prisma.InputJsonValue,
        extractedData: snsData.extractedData as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        platform: snsPlatform,
        profileData: snsData.profileData as Prisma.InputJsonValue,
        extractedData: snsData.extractedData as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
    })

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
    console.error("[persona-world/sns/upload] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "SNS_UPLOAD_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── 유틸리티 (callback/route.ts와 동일 패턴) ─────────────────

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
