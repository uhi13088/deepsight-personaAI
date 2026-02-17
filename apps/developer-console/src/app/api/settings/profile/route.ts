import { NextRequest, NextResponse } from "next/server"

/**
 * PATCH /api/settings/profile - 프로필 업데이트
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    // TODO: Replace with actual database update when auth is implemented
    const updatedProfile = {
      id: "pending-auth",
      name: body.name || "개발자",
      email: body.email || "",
      avatar: null,
      phone: body.phone || "",
      company: body.company || "",
      timezone: body.timezone || "Asia/Seoul",
      language: body.language || "ko",
      twoFactorEnabled: false,
      lastPasswordChange: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: { profile: updatedProfile },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PROFILE_UPDATE_FAILED",
          message: "프로필 수정에 실패했습니다.",
        },
      },
      { status: 500 }
    )
  }
}
