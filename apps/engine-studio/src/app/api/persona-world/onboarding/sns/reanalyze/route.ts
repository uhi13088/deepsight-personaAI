import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processSnsDataWithLlm } from "@/lib/persona-world/onboarding/sns-processor"
import type { SNSExtendedData } from "@/lib/persona-world/types"
import type { Prisma } from "@/generated/prisma"
import { verifyInternalToken, verifyUserOwnership } from "@/lib/internal-auth"

/** SNS 재분석 비용 (코인) */
const REANALYSIS_COST = 5

/** 재분석 최소 간격 (밀리초) — 5분 */
const REANALYSIS_COOLDOWN_MS = 5 * 60 * 1000

/**
 * POST /api/persona-world/onboarding/sns/reanalyze
 *
 * SNS 데이터를 Claude Sonnet으로 재분석.
 * - 최초 1회는 무료 (snsAnalysisCount === 0)
 * - 이후 재분석은 크레딧 차감
 * - 유저 소유권 검증 (x-authenticated-email)
 * - 재분석 간격 제한 (5분)
 *
 * Body:
 * - userId: string
 *
 * Response:
 * - profileLevel, confidence, llmSummary, llmTraits, creditUsed, remainingBalance
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

    // 소유권 검증: 요청자 본인의 데이터만 접근 가능
    const ownershipError = await verifyUserOwnership(request, userId)
    if (ownershipError) return ownershipError

    // 1. 유저 조회
    const user = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
      select: {
        snsAnalysisCount: true,
        openness: true,
        conscientiousness: true,
        extraversion: true,
        agreeableness: true,
        neuroticism: true,
        hasOceanProfile: true,
        depth: true,
        lens: true,
        stance: true,
        scope: true,
        taste: true,
        purpose: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "USER_NOT_FOUND", message: "유저를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 2. 재분석 간격 제한 (5분) — 남용 방지
    const lastReanalysis = await prisma.coinTransaction.findFirst({
      where: { userId, reason: { contains: "SNS 재분석" } },
      orderBy: { createdAt: "desc" },
    })
    if (lastReanalysis) {
      const elapsed = Date.now() - lastReanalysis.createdAt.getTime()
      if (elapsed < REANALYSIS_COOLDOWN_MS) {
        const remainingSec = Math.ceil((REANALYSIS_COOLDOWN_MS - elapsed) / 1000)
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "RATE_LIMITED",
              message: `재분석은 ${remainingSec}초 후에 가능합니다`,
            },
            data: { retryAfterSeconds: remainingSec },
          },
          { status: 429 }
        )
      }
    }

    // 3. 크레딧 차감 (최초 1회는 무료)
    const isFirstAnalysis = user.snsAnalysisCount === 0
    let creditUsed = 0
    let remainingBalance = 0

    if (!isFirstAnalysis) {
      // 잔액 확인
      const latestTx = await prisma.coinTransaction.findFirst({
        where: { userId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
      })
      const currentBalance = latestTx?.balanceAfter ?? 0

      if (currentBalance < REANALYSIS_COST) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INSUFFICIENT_BALANCE",
              message: `크레딧이 부족합니다 (필요: ${REANALYSIS_COST}, 보유: ${currentBalance})`,
            },
            data: { required: REANALYSIS_COST, current: currentBalance },
          },
          { status: 402 }
        )
      }

      // 크레딧 차감
      await prisma.coinTransaction.create({
        data: {
          userId,
          type: "SPEND",
          amount: REANALYSIS_COST,
          balanceAfter: currentBalance - REANALYSIS_COST,
          reason: "SNS 재분석 (Claude Sonnet)",
          status: "COMPLETED",
        },
      })
      creditUsed = REANALYSIS_COST
      remainingBalance = currentBalance - REANALYSIS_COST
    }

    // 4. 기존 SNS 연결 데이터 조회
    const connections = await prisma.sNSConnection.findMany({
      where: { userId },
      select: {
        platform: true,
        profileData: true,
        extractedData: true,
      },
    })

    if (connections.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NO_SNS_DATA", message: "연동된 SNS가 없습니다" },
        },
        { status: 400 }
      )
    }

    // 5. SNSExtendedData 구성
    const snsDataList: SNSExtendedData[] = connections.map((conn) => ({
      platform: conn.platform,
      profileData: (conn.profileData ?? {}) as Record<string, unknown>,
      extractedData: (conn.extractedData ?? {}) as Record<string, unknown>,
    }))

    // 6. 기존 벡터 구성
    const latestSurvey = await prisma.pWUserSurveyResponse.findFirst({
      where: { userId, completedAt: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { computedVector: true },
    })

    const cv = latestSurvey?.computedVector as { l1?: Record<string, number> } | null
    const existingVector = cv?.l1
      ? {
          l1: {
            depth: cv.l1.depth ?? Number(user.depth ?? 0.5),
            lens: cv.l1.lens ?? Number(user.lens ?? 0.5),
            stance: cv.l1.stance ?? Number(user.stance ?? 0.5),
            scope: cv.l1.scope ?? Number(user.scope ?? 0.5),
            taste: cv.l1.taste ?? Number(user.taste ?? 0.5),
            purpose: cv.l1.purpose ?? Number(user.purpose ?? 0.5),
            sociability: cv.l1.sociability ?? 0.5,
          },
          ...(user.hasOceanProfile
            ? {
                l2: {
                  openness: Number(user.openness ?? 0.5),
                  conscientiousness: Number(user.conscientiousness ?? 0.5),
                  extraversion: Number(user.extraversion ?? 0.5),
                  agreeableness: Number(user.agreeableness ?? 0.5),
                  neuroticism: Number(user.neuroticism ?? 0.5),
                },
              }
            : {}),
        }
      : undefined

    // 7. Claude Sonnet으로 재분석
    const result = await processSnsDataWithLlm(snsDataList, existingVector)

    // 8. DB 업데이트 — 벡터 + LLM 분석 결과를 snsExtendedData에 보존
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
        ...Object.fromEntries(
          snsDataList.map((d) => [
            d.platform.toLowerCase(),
            {
              extractedData: d.extractedData,
              analyzedAt: new Date().toISOString(),
            },
          ])
        ),
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

    return NextResponse.json({
      success: true,
      data: {
        profileLevel: result.profileLevel,
        confidence: result.confidence,
        llmSummary: result.llmSummary,
        llmTraits: result.llmTraits,
        creditUsed,
        remainingBalance,
        isFirstFree: isFirstAnalysis,
      },
    })
  } catch (error) {
    console.error("[persona-world/sns/reanalyze] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "REANALYZE_ERROR", message } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/persona-world/onboarding/sns/reanalyze?userId=xxx
 *
 * 재분석 비용 정보 조회.
 */
export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_PARAM", message: "userId required" } },
      { status: 400 }
    )
  }

  // 소유권 검증: 요청자 본인의 비용 정보만 조회 가능
  const ownershipError = await verifyUserOwnership(request, userId)
  if (ownershipError) return ownershipError

  const user = await prisma.personaWorldUser.findUnique({
    where: { id: userId },
    select: { snsAnalysisCount: true },
  })

  const latestTx = await prisma.coinTransaction.findFirst({
    where: { userId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
  })

  const isFirstFree = (user?.snsAnalysisCount ?? 0) === 0
  const currentBalance = latestTx?.balanceAfter ?? 0

  return NextResponse.json({
    success: true,
    data: {
      cost: isFirstFree ? 0 : REANALYSIS_COST,
      isFirstFree,
      currentBalance,
      canAfford: isFirstFree || currentBalance >= REANALYSIS_COST,
      analysisCount: user?.snsAnalysisCount ?? 0,
    },
  })
}
