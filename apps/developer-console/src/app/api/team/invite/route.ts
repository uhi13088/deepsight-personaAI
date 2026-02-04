import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/team/invite - 팀원 초대
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "이메일과 역할을 입력해주세요.",
          },
        },
        { status: 400 }
      )
    }

    const invite = {
      id: `invite-${Date.now()}`,
      email,
      role,
      invitedBy: "관리자",
      invitedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: { invite },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVITE_FAILED",
          message: "초대 발송에 실패했습니다.",
        },
      },
      { status: 500 }
    )
  }
}
