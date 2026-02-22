import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { exchangeCodeForToken, validateState } from "@/lib/persona-world/onboarding/sns-oauth"
import { analyzeSnsProfile } from "@/lib/persona-world/onboarding/sns-analyzer"
import { processSnsDataWithLlm } from "@/lib/persona-world/onboarding/sns-processor"
import type { SNSExtendedData } from "@/lib/persona-world/types"
import type { Prisma } from "@/generated/prisma"
import { encryptToken } from "@/lib/persona-world/token-crypto"
import { logSecurityEvent, extractClientIp } from "@/lib/persona-world/security-log"

/**
 * GET /api/persona-world/onboarding/sns/callback/[platform]
 *
 * OAuth 콜백 처리. Google/Spotify 등 OAuth 제공자가 브라우저를 redirect하는 엔드포인트.
 *
 * ⚠️ 이 라우트는 verifyInternalToken을 사용하지 않음.
 * 이유: OAuth 콜백은 외부 OAuth 제공자(Google 등)가 브라우저를 redirect하는 것으로,
 * internal token 헤더를 포함하지 않음. 보안은 state 파라미터 검증(CSRF 방지 + 10분 만료)으로 처리.
 *
 * Google Cloud Console에 등록할 redirect_uri:
 *   https://your-domain.com/api/persona-world/onboarding/sns/callback/youtube
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform: platformParam } = await params

  const frontendUrl = process.env.PERSONA_WORLD_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? ""
  let redirectBase = `${frontendUrl}/onboarding`

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // OAuth 에러 (사용자가 거부 등)
    if (error) {
      if (state) {
        const errState = validateState(state)
        if (errState.valid && errState.returnTo) {
          redirectBase = `${frontendUrl}${errState.returnTo}`
        }
      }
      const errorDesc = searchParams.get("error_description") ?? error
      return NextResponse.redirect(`${redirectBase}?sns_error=${encodeURIComponent(errorDesc)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${redirectBase}?sns_error=${encodeURIComponent("인증 정보가 누락되었습니다")}`
      )
    }

    // 1. State 검증 (CSRF 방지 + 유저 식별)
    const stateResult = validateState(state)
    if (!stateResult.valid || !stateResult.userId || !stateResult.platform) {
      return NextResponse.redirect(
        `${redirectBase}?sns_error=${encodeURIComponent("인증이 만료되었거나 유효하지 않습니다")}`
      )
    }

    // state에서 추출한 platform이 URL 경로의 platform과 일치하는지 검증
    if (stateResult.platform.toLowerCase() !== platformParam.toLowerCase()) {
      return NextResponse.redirect(
        `${redirectBase}?sns_error=${encodeURIComponent("플랫폼 정보가 일치하지 않습니다")}`
      )
    }

    const { userId, platform } = stateResult
    if (stateResult.returnTo) {
      redirectBase = `${frontendUrl}${stateResult.returnTo}`
    }

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
        snsAnalysisCount: true,
      },
    })

    const latestSurvey = await prisma.pWUserSurveyResponse.findFirst({
      where: { userId, completedAt: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { computedVector: true },
    })

    const existingVector = buildExistingVector(latestSurvey?.computedVector, user)

    // 6. Claude Sonnet으로 심층 분석
    const result = await processSnsDataWithLlm([snsData], existingVector)

    // 7. DB 저장 — SNSConnection (토큰 암호화)
    const expiresAt = tokenResult.expiresIn
      ? new Date(Date.now() + tokenResult.expiresIn * 1000)
      : null

    const encAccessToken = encryptToken(tokenResult.accessToken)
    const encRefreshToken = tokenResult.refreshToken ? encryptToken(tokenResult.refreshToken) : null

    await prisma.sNSConnection.upsert({
      where: { userId_platform: { userId, platform } },
      update: {
        accessToken: encAccessToken,
        refreshToken: encRefreshToken,
        expiresAt,
        profileData: snsData.profileData as Prisma.InputJsonValue,
        extractedData: snsData.extractedData as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        platform,
        accessToken: encAccessToken,
        refreshToken: encRefreshToken,
        expiresAt,
        profileData: snsData.profileData as Prisma.InputJsonValue,
        extractedData: snsData.extractedData as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
    })

    // 감사 로그
    const clientIp = extractClientIp(request.headers)
    void logSecurityEvent({
      userId,
      eventType: "SNS_OAUTH_CONNECTED",
      details: { platform, hasRefreshToken: !!tokenResult.refreshToken },
      ipAddress: clientIp,
    })
    void logSecurityEvent({
      userId,
      eventType: "SNS_DATA_ANALYZED",
      details: { platform, profileLevel: result.profileLevel, confidence: result.confidence },
      ipAddress: clientIp,
    })

    // 8. PersonaWorldUser 프로필 업데이트
    const existingSnsData = (
      await prisma.personaWorldUser.findUnique({
        where: { id: userId },
        select: { snsExtendedData: true },
      })
    )?.snsExtendedData as Record<string, unknown> | null

    const updatedSnsExtendedData = {
      ...(existingSnsData ?? {}),
      platforms: {
        ...((existingSnsData?.platforms as Record<string, unknown>) ?? {}),
        [platform.toLowerCase()]: {
          extractedData: snsData.extractedData,
          analyzedAt: new Date().toISOString(),
        },
      },
      llmAnalysis: {
        summary: result.llmSummary ?? null,
        traits: result.llmTraits ?? [],
        confidence: result.confidence,
        analyzedAt: new Date().toISOString(),
      },
    }

    await prisma.personaWorldUser.update({
      where: { id: userId },
      data: {
        profileQuality: result.profileLevel,
        confidenceScore: result.confidence,
        snsAnalysisCount: { increment: 1 },
        snsExtendedData: updatedSnsExtendedData as Prisma.InputJsonValue,
        ...(result.l1Vector
          ? {
              depth: result.l1Vector.depth,
              lens: result.l1Vector.lens,
              stance: result.l1Vector.stance,
              scope: result.l1Vector.scope,
              taste: result.l1Vector.taste,
              purpose: result.l1Vector.purpose,
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
      },
    })

    // 9. 성공 리다이렉트
    const successParams = new URLSearchParams({
      sns_connected: platform.toLowerCase(),
      level: result.profileLevel,
    })
    if (result.llmSummary) {
      successParams.set("sns_summary", result.llmSummary)
    }
    return NextResponse.redirect(`${redirectBase}?${successParams.toString()}`)
  } catch (error) {
    console.error(`[persona-world/sns/callback/${platformParam}] Error:`, error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.redirect(`${redirectBase}?sns_error=${encodeURIComponent(message)}`)
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
