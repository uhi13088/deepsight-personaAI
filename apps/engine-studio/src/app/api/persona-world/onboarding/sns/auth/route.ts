import { NextRequest, NextResponse } from "next/server"
import type { SNSPlatform } from "@/generated/prisma"
import {
  buildAuthUrl,
  isOAuthSupported,
  OAUTH_SUPPORTED_PLATFORMS,
  UPLOAD_ONLY_PLATFORMS,
} from "@/lib/persona-world/onboarding/sns-oauth"

/**
 * POST /api/persona-world/onboarding/sns/auth
 *
 * SNS OAuth 인증 시작 — 인증 URL 반환.
 *
 * Body:
 * - userId: string (필수)
 * - platform: SNSPlatform (필수)
 * - codeChallenge?: string (PKCE 사용 시)
 *
 * Response:
 * - authUrl: string (OAuth 인증 페이지 URL)
 * - method: "oauth" | "upload" (인증 방식)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, platform, codeChallenge } = body as {
      userId: string
      platform: string
      codeChallenge?: string
    }

    if (!userId || !platform) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "userId, platform 필요" },
        },
        { status: 400 }
      )
    }

    const snsPlatform = platform.toUpperCase() as SNSPlatform

    // 데이터 업로드 방식 플랫폼
    if (UPLOAD_ONLY_PLATFORMS.includes(snsPlatform)) {
      return NextResponse.json({
        success: true,
        data: {
          method: "upload" as const,
          platform: snsPlatform,
          message: `${platform}은 데이터 업로드 방식을 사용합니다`,
        },
      })
    }

    // OAuth 미지원 플랫폼
    if (!isOAuthSupported(snsPlatform)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNSUPPORTED_PLATFORM",
            message: `지원하지 않는 플랫폼: ${platform}`,
          },
        },
        { status: 400 }
      )
    }

    const authUrl = buildAuthUrl(snsPlatform, userId, codeChallenge)

    if (!authUrl) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "OAUTH_CONFIG_MISSING",
            message: `${platform} OAuth 설정이 누락되었습니다 (환경변수 확인 필요)`,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        method: "oauth" as const,
        authUrl,
        platform: snsPlatform,
      },
    })
  } catch (error) {
    console.error("[persona-world/sns/auth] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "SNS_AUTH_ERROR", message } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/persona-world/onboarding/sns/auth
 *
 * 지원 플랫폼 목록 반환.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      oauthPlatforms: OAUTH_SUPPORTED_PLATFORMS,
      uploadPlatforms: UPLOAD_ONLY_PLATFORMS,
    },
  })
}
