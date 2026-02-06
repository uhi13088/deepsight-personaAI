import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { SNSPlatform, Prisma } from "@prisma/client"
import { analyzeSNSData, type SNSExtendedData } from "@/lib/onboarding/sns-analyzer"
import {
  mergeVectors,
  calculateProfileQuality,
  type Vector6D,
  type DataSourceInfo,
} from "@/lib/onboarding/vector-merger"

// OAuth 콜백 스키마
const callbackSchema = z.object({
  code: z.string().min(1, "인증 코드가 필요합니다"),
  state: z.string().min(1, "상태 토큰이 필요합니다"),
})

// POST /api/persona-world/onboarding/sns/callback - OAuth 콜백 처리
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = callbackSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "입력값이 올바르지 않습니다",
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const { code, state } = validationResult.data

    // 상태 토큰 검증 및 디코딩
    const stateData = parseStateToken(state)
    if (!stateData) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_STATE", message: "유효하지 않은 상태 토큰입니다" },
        },
        { status: 400 }
      )
    }

    const { userId, platform, timestamp } = stateData

    // 토큰 만료 확인 (10분)
    if (Date.now() - timestamp > 10 * 60 * 1000) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "EXPIRED_STATE", message: "상태 토큰이 만료되었습니다" },
        },
        { status: 400 }
      )
    }

    // 유저 존재 확인
    const user = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "유저를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // OAuth 토큰 교환 (실제 환경에서는 플랫폼별 API 호출)
    const tokenData = await exchangeCodeForToken(platform, code)

    // SNS 데이터 가져오기 (실제 환경에서는 플랫폼별 API 호출)
    const snsRawData = await fetchSNSData(platform, tokenData.accessToken)

    // SNS 데이터 분석
    const analysisResult = await analyzeSNSData(platform as SNSPlatform, snsRawData)

    // SNS 연결 저장
    await prisma.sNSConnection.upsert({
      where: {
        userId_platform: {
          userId,
          platform: platform as SNSPlatform,
        },
      },
      create: {
        userId,
        platform: platform as SNSPlatform,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        profileData: snsRawData as unknown as Prisma.InputJsonValue,
        extractedData: {
          vector: analysisResult.vector,
          extendedData: analysisResult.extendedData,
          confidence: analysisResult.confidence,
        } as unknown as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
      update: {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        profileData: snsRawData as unknown as Prisma.InputJsonValue,
        extractedData: {
          vector: analysisResult.vector,
          extendedData: analysisResult.extendedData,
          confidence: analysisResult.confidence,
        } as unknown as Prisma.InputJsonValue,
        lastSyncAt: new Date(),
      },
    })

    // 기존 벡터와 병합
    const existingVector: Partial<Vector6D> | null =
      user.depth !== null
        ? {
            depth: Number(user.depth),
            lens: Number(user.lens),
            stance: Number(user.stance),
            scope: Number(user.scope),
            taste: Number(user.taste),
            purpose: Number(user.purpose),
          }
        : null

    const mergedVector = mergeVectors(existingVector, analysisResult.vector, {
      existingWeight: existingVector ? 0.6 : 0,
      newWeight: existingVector ? 0.4 : 1,
    })

    // 데이터 소스 정보 업데이트
    const existingDataSources = (user.dataSources as DataSourceInfo) || {}
    const existingPlatforms = existingDataSources.sns?.platforms || []

    const updatedDataSources: DataSourceInfo = {
      ...existingDataSources,
      sns: {
        platforms: [...new Set([...existingPlatforms, platform])],
        lastSyncAt: new Date(),
      },
    }

    // 프로필 품질 계산
    const qualityResult = calculateProfileQuality(updatedDataSources)

    // SNS 확장 데이터 병합
    const existingSNSData = (user.snsExtendedData as unknown as SNSExtendedData[]) || []
    const filteredSNSData = existingSNSData.filter((d) => d.platform !== platform)
    const updatedSNSData = [...filteredSNSData, analysisResult.extendedData]

    // 유저 프로필 업데이트
    await prisma.personaWorldUser.update({
      where: { id: userId },
      data: {
        depth: mergedVector.depth,
        lens: mergedVector.lens,
        stance: mergedVector.stance,
        scope: mergedVector.scope,
        taste: mergedVector.taste,
        purpose: mergedVector.purpose,
        profileQuality: qualityResult.quality,
        confidenceScore: qualityResult.confidenceScore,
        dataSources: updatedDataSources as unknown as Prisma.InputJsonValue,
        snsExtendedData: updatedSNSData as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        message: `${platform} 연동이 완료되었습니다`,
        platform,
        vector: mergedVector,
        profileQuality: qualityResult.quality,
        confidenceScore: qualityResult.confidenceScore,
        upgradePath: qualityResult.upgradePath,
        extractedData: {
          specificTastes: analysisResult.extendedData.specificTastes,
          activityPattern: analysisResult.extendedData.activityPattern,
        },
      },
    })
  } catch (error) {
    console.error("OAuth 콜백 처리 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "OAuth 콜백 처리에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// GET /api/persona-world/onboarding/sns/callback - OAuth 리다이렉트 처리
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // OAuth 에러 처리
    if (error) {
      const errorDescription = searchParams.get("error_description") || "알 수 없는 오류"
      return NextResponse.redirect(
        new URL(
          `/onboarding/sns/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription)}`,
          process.env.NEXT_PUBLIC_APP_URL
        )
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/onboarding/sns/error?error=missing_params", process.env.NEXT_PUBLIC_APP_URL)
      )
    }

    // 상태 토큰 검증
    const stateData = parseStateToken(state)
    if (!stateData) {
      return NextResponse.redirect(
        new URL("/onboarding/sns/error?error=invalid_state", process.env.NEXT_PUBLIC_APP_URL)
      )
    }

    // 성공 페이지로 리다이렉트 (클라이언트에서 POST 요청 처리)
    return NextResponse.redirect(
      new URL(
        `/onboarding/sns/complete?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
        process.env.NEXT_PUBLIC_APP_URL
      )
    )
  } catch (error) {
    console.error("OAuth 리다이렉트 처리 실패:", error)
    return NextResponse.redirect(
      new URL("/onboarding/sns/error?error=internal_error", process.env.NEXT_PUBLIC_APP_URL)
    )
  }
}

// 상태 토큰 파싱
function parseStateToken(
  state: string
): { userId: string; platform: string; timestamp: number } | null {
  try {
    const [encoded] = state.split(".")
    const decoded = Buffer.from(encoded, "base64url").toString("utf8")
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

// OAuth 토큰 교환 (Mock - 실제 환경에서는 플랫폼별 API 호출)
async function exchangeCodeForToken(
  platform: string,
  code: string
): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}> {
  // 실제 환경에서는 플랫폼별 OAuth 토큰 교환 API 호출
  // 여기서는 Mock 데이터 반환

  console.log(`Exchanging code for ${platform}: ${code.substring(0, 10)}...`)

  return {
    accessToken: `mock_access_token_${platform.toLowerCase()}_${Date.now()}`,
    refreshToken: `mock_refresh_token_${platform.toLowerCase()}_${Date.now()}`,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1시간 후
  }
}

// SNS 데이터 가져오기 (Mock - 실제 환경에서는 플랫폼별 API 호출)
async function fetchSNSData(platform: string, accessToken: string): Promise<unknown> {
  // 실제 환경에서는 플랫폼별 API 호출로 데이터 가져오기
  // 여기서는 Mock 데이터 반환

  console.log(`Fetching ${platform} data with token: ${accessToken.substring(0, 20)}...`)

  switch (platform) {
    case "NETFLIX":
      return {
        viewingHistory: [
          {
            title: "기생충",
            date: new Date(),
            duration: 132,
            completed: true,
            genres: ["Drama", "Thriller"],
            type: "MOVIE",
            director: "봉준호",
            cast: ["송강호", "이선균", "조여정"],
          },
          {
            title: "더 글로리",
            date: new Date(Date.now() - 86400000),
            duration: 480,
            completed: true,
            genres: ["Drama", "Thriller"],
            type: "SERIES",
          },
        ],
        ratings: [
          { title: "기생충", score: 5, genres: ["Drama", "Thriller"] },
          { title: "올드보이", score: 4.5, genres: ["Thriller", "Action"] },
        ],
        myList: ["더 글로리", "오징어 게임", "무빙"],
        profiles: [{ name: "메인", isKids: false }],
      }

    case "YOUTUBE":
      return {
        watchHistory: [
          {
            title: "영화 리뷰: 오펜하이머",
            channelName: "영화리뷰채널",
            watchedAt: new Date(),
            duration: 1200,
            watchedDuration: 1100,
            category: "Entertainment",
          },
        ],
        likedVideos: [
          {
            title: "2024 최고의 영화 TOP 10",
            channelName: "무비톡",
            likedAt: new Date(),
            category: "Entertainment",
          },
        ],
        subscriptions: [
          { channelName: "무비톡", category: "Entertainment", subscribedAt: new Date() },
        ],
        searchHistory: ["봉준호 영화", "오펜하이머 해설", "마블 페이즈 6"],
      }

    case "INSTAGRAM":
      return {
        posts: [
          {
            caption: "영화 본 후 🍿 너무 좋았다 #영화추천 #주말영화",
            hashtags: ["영화추천", "주말영화"],
            postedAt: new Date(),
            likeCount: 42,
            commentCount: 5,
          },
        ],
        following: [
          { username: "movie_critic", category: "Entertainment", isVerified: true },
          { username: "director_bong", category: "DIRECTOR", isVerified: true },
        ],
        followers: 500,
        activity: {
          likesGiven: 150,
          commentsGiven: 30,
          storiesViewed: 200,
          reelsWatched: 100,
        },
      }

    default:
      return {}
  }
}
