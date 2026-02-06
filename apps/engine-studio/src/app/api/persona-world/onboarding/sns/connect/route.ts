import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { SNSPlatform } from "@prisma/client"

// OAuth 연결 요청 스키마
const connectRequestSchema = z.object({
  userId: z.string().min(1, "유저 ID는 필수입니다"),
  platform: z.enum([
    "NETFLIX",
    "YOUTUBE",
    "INSTAGRAM",
    "SPOTIFY",
    "LETTERBOXD",
    "TWITTER",
    "TIKTOK",
  ]),
  redirectUri: z.string().url().optional(),
})

// 플랫폼별 OAuth 설정
const OAUTH_CONFIG: Record<
  string,
  {
    authUrl: string
    scopes: string[]
    clientIdEnvVar: string
  }
> = {
  NETFLIX: {
    authUrl: "https://api.netflix.com/oauth/authorize",
    scopes: ["viewing_history", "ratings", "preferences"],
    clientIdEnvVar: "NETFLIX_CLIENT_ID",
  },
  YOUTUBE: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.force-ssl",
    ],
    clientIdEnvVar: "GOOGLE_CLIENT_ID",
  },
  INSTAGRAM: {
    authUrl: "https://api.instagram.com/oauth/authorize",
    scopes: ["user_profile", "user_media"],
    clientIdEnvVar: "INSTAGRAM_CLIENT_ID",
  },
  SPOTIFY: {
    authUrl: "https://accounts.spotify.com/authorize",
    scopes: ["user-read-recently-played", "user-top-read", "user-library-read"],
    clientIdEnvVar: "SPOTIFY_CLIENT_ID",
  },
  LETTERBOXD: {
    authUrl: "https://letterboxd.com/oauth/authorize",
    scopes: ["read"],
    clientIdEnvVar: "LETTERBOXD_CLIENT_ID",
  },
  TWITTER: {
    authUrl: "https://twitter.com/i/oauth2/authorize",
    scopes: ["tweet.read", "users.read", "follows.read"],
    clientIdEnvVar: "TWITTER_CLIENT_ID",
  },
  TIKTOK: {
    authUrl: "https://www.tiktok.com/auth/authorize",
    scopes: ["user.info.basic", "video.list"],
    clientIdEnvVar: "TIKTOK_CLIENT_ID",
  },
}

// GET /api/persona-world/onboarding/sns/connect - 연결된 SNS 목록
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "userId가 필요합니다" },
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

    // SNS 연결 목록 조회
    const connections = await prisma.sNSConnection.findMany({
      where: { userId },
      select: {
        id: true,
        platform: true,
        lastSyncAt: true,
        createdAt: true,
        extractedData: true,
      },
    })

    // 연결 가능한 플랫폼 목록
    const connectedPlatforms = connections.map((c) => c.platform)
    const availablePlatforms = Object.keys(OAUTH_CONFIG).filter(
      (p) => !connectedPlatforms.includes(p as SNSPlatform)
    )

    return NextResponse.json({
      success: true,
      data: {
        connections: connections.map((c) => ({
          id: c.id,
          platform: c.platform,
          lastSyncAt: c.lastSyncAt,
          createdAt: c.createdAt,
          hasExtractedData: !!c.extractedData,
        })),
        availablePlatforms,
        supportedPlatforms: Object.keys(OAUTH_CONFIG),
      },
    })
  } catch (error) {
    console.error("SNS 연결 목록 조회 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "SNS 연결 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/persona-world/onboarding/sns/connect - OAuth 연결 URL 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = connectRequestSchema.safeParse(body)

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

    const { userId, platform, redirectUri } = validationResult.data

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

    // 이미 연결된 플랫폼인지 확인
    const existingConnection = await prisma.sNSConnection.findUnique({
      where: {
        userId_platform: {
          userId,
          platform: platform as SNSPlatform,
        },
      },
    })

    if (existingConnection) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE",
            message: `${platform}은 이미 연결되어 있습니다`,
          },
        },
        { status: 409 }
      )
    }

    // OAuth 설정 조회
    const oauthConfig = OAUTH_CONFIG[platform]
    if (!oauthConfig) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_SUPPORTED", message: "지원하지 않는 플랫폼입니다" },
        },
        { status: 400 }
      )
    }

    // 상태 토큰 생성 (CSRF 방지)
    const state = generateStateToken(userId, platform)

    // OAuth URL 생성
    const callbackUrl =
      redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/persona-world/onboarding/sns/callback`

    const authUrl = buildOAuthUrl({
      baseUrl: oauthConfig.authUrl,
      clientId: process.env[oauthConfig.clientIdEnvVar] || "mock-client-id",
      redirectUri: callbackUrl,
      scopes: oauthConfig.scopes,
      state,
      platform,
    })

    return NextResponse.json({
      success: true,
      data: {
        authUrl,
        platform,
        state,
        expiresIn: 600, // 10분
        message: `${platform} 연동 페이지로 이동해주세요`,
      },
    })
  } catch (error) {
    console.error("OAuth URL 생성 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "OAuth URL 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/persona-world/onboarding/sns/connect - SNS 연결 해제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const platform = searchParams.get("platform")

    if (!userId || !platform) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "userId와 platform이 필요합니다" },
        },
        { status: 400 }
      )
    }

    // 연결 찾기
    const connection = await prisma.sNSConnection.findUnique({
      where: {
        userId_platform: {
          userId,
          platform: platform as SNSPlatform,
        },
      },
    })

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "SNS 연결을 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 연결 삭제
    await prisma.sNSConnection.delete({
      where: { id: connection.id },
    })

    // 유저 데이터 소스 업데이트
    const user = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
    })

    if (user?.dataSources) {
      const dataSources = user.dataSources as { sns?: { platforms: string[] } }
      if (dataSources.sns?.platforms) {
        dataSources.sns.platforms = dataSources.sns.platforms.filter((p) => p !== platform)
        await prisma.personaWorldUser.update({
          where: { id: userId },
          data: { dataSources },
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: `${platform} 연결이 해제되었습니다`,
        disconnectedPlatform: platform,
      },
    })
  } catch (error) {
    console.error("SNS 연결 해제 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "SNS 연결 해제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// 상태 토큰 생성
function generateStateToken(userId: string, platform: string): string {
  const timestamp = Date.now()
  const randomPart = Math.random().toString(36).substring(2, 15)
  const encoded = Buffer.from(JSON.stringify({ userId, platform, timestamp })).toString("base64url")
  return `${encoded}.${randomPart}`
}

// OAuth URL 빌드
function buildOAuthUrl(params: {
  baseUrl: string
  clientId: string
  redirectUri: string
  scopes: string[]
  state: string
  platform: string
}): string {
  const url = new URL(params.baseUrl)
  url.searchParams.set("client_id", params.clientId)
  url.searchParams.set("redirect_uri", params.redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", params.scopes.join(" "))
  url.searchParams.set("state", params.state)

  // 플랫폼별 추가 파라미터
  if (params.platform === "YOUTUBE") {
    url.searchParams.set("access_type", "offline")
    url.searchParams.set("prompt", "consent")
  }

  return url.toString()
}
