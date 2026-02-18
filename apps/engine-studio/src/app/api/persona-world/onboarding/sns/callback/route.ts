import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { exchangeCodeForToken, validateState } from "@/lib/persona-world/onboarding/sns-oauth"
import { analyzeSnsProfile } from "@/lib/persona-world/onboarding/sns-analyzer"
import { processSnsData } from "@/lib/persona-world/onboarding/sns-processor"
import type { SNSExtendedData } from "@/lib/persona-world/types"
import type { Prisma, SNSPlatform } from "@/generated/prisma"

/**
 * GET /api/persona-world/onboarding/sns/callback
 *
 * OAuth 콜백 처리.
 * 1. state 검증 → userId, platform 추출
 * 2. authorization code → access token 교환
 * 3. 플랫폼 API로 데이터 수집
 * 4. sns-processor로 벡터 생성/보정
 * 5. DB 저장 (SNSConnection + PersonaWorldUser)
 * 6. 프론트엔드로 리다이렉트
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? ""
    const redirectBase = `${appUrl}/onboarding`

    // OAuth 에러 (사용자가 거부 등)
    if (error) {
      const errorDesc = searchParams.get("error_description") ?? error
      return NextResponse.redirect(`${redirectBase}?sns_error=${encodeURIComponent(errorDesc)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${redirectBase}?sns_error=${encodeURIComponent("인증 정보가 누락되었습니다")}`
      )
    }

    // 1. State 검증
    const stateResult = validateState(state)
    if (!stateResult.valid || !stateResult.userId || !stateResult.platform) {
      return NextResponse.redirect(
        `${redirectBase}?sns_error=${encodeURIComponent("인증이 만료되었거나 유효하지 않습니다")}`
      )
    }

    const { userId, platform } = stateResult

    // 2. 토큰 교환
    const codeVerifier = searchParams.get("code_verifier") ?? undefined
    const tokenResult = await exchangeCodeForToken(platform, code, codeVerifier)

    // 3. 플랫폼 API로 데이터 수집
    const profileData = await analyzeSnsProfile(platform, tokenResult.accessToken)

    // 4. SNSExtendedData 구성
    const snsData: SNSExtendedData = {
      platform: platform,
      profileData: profileData.raw as Record<string, unknown>,
      extractedData: profileData.extracted as unknown as Record<string, unknown>,
    }

    // 5. 기존 온보딩 벡터 조회
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

    // 6. sns-processor로 벡터 생성/보정
    const result = await processSnsData([snsData], existingVector)

    // 7. DB 저장 — SNSConnection
    const expiresAt = tokenResult.expiresIn
      ? new Date(Date.now() + tokenResult.expiresIn * 1000)
      : null

    await prisma.sNSConnection.upsert({
      where: {
        userId_platform: { userId, platform },
      },
      update: {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken ?? null,
        expiresAt,
        profileData: snsData.profileData as Prisma.InputJsonValue,
        extractedData: snsData.extractedData as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        platform,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken ?? null,
        expiresAt,
        profileData: snsData.profileData as Prisma.InputJsonValue,
        extractedData: snsData.extractedData as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
    })

    // 8. DB 저장 — PersonaWorldUser 프로필 업데이트
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

    // 9. 프론트엔드로 리다이렉트 (성공)
    return NextResponse.redirect(
      `${redirectBase}?sns_connected=${platform.toLowerCase()}&level=${result.profileLevel}`
    )
  } catch (error) {
    console.error("[persona-world/sns/callback] Error:", error)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? ""
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.redirect(`${appUrl}/onboarding?sns_error=${encodeURIComponent(message)}`)
  }
}

// ── 유틸리티 ─────────────────────────────────────────────────

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
