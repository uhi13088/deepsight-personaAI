import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/public/auth/register
 *
 * Google OAuth 로그인 후 PersonaWorld 사용자를 등록/조회한다.
 * email 기준으로 upsert하며, 기존 사용자면 기존 데이터를 반환한다.
 *
 * Body: { email: string, name?: string, profileImageUrl?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, profileImageUrl } = body as {
      email: string
      name?: string
      profileImageUrl?: string
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "email is required" },
        },
        { status: 400 }
      )
    }

    const user = await prisma.personaWorldUser.upsert({
      where: { email: email.toLowerCase() },
      create: {
        email: email.toLowerCase(),
        name: name ?? null,
        profileImageUrl: profileImageUrl ?? null,
      },
      update: {
        // 이름/이미지가 제공되면 업데이트, 아니면 기존 유지
        ...(name !== undefined && { name }),
        ...(profileImageUrl !== undefined && { profileImageUrl }),
        lastLoginAt: new Date(),
      },
    })

    // completedOnboarding 판별: profileQuality가 BASIC이 아니면 온보딩 완료
    // BASIC = 신규 가입 또는 Phase 1 진행 전 (Cold Start LIGHT 미완료)
    // STANDARD+ = Phase 2 이상 완료 또는 SNS 연동 완료
    const completedOnboarding = user.profileQuality !== "BASIC"
    const hasVector = user.depth !== null || user.lens !== null

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
        completedOnboarding,
        profileQuality: user.profileQuality,
        vector: hasVector
          ? {
              depth: user.depth ? Number(user.depth) : null,
              lens: user.lens ? Number(user.lens) : null,
              stance: user.stance ? Number(user.stance) : null,
              scope: user.scope ? Number(user.scope) : null,
              taste: user.taste ? Number(user.taste) : null,
              purpose: user.purpose ? Number(user.purpose) : null,
            }
          : null,
        createdAt: user.createdAt.toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "AUTH_REGISTER_ERROR", message } },
      { status: 500 }
    )
  }
}
