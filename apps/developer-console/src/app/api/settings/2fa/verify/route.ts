import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/settings/2fa/verify - 2FA 코드 검증
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    // In production, verify the TOTP code using `otplib`
    // For demo, accept any 6-digit code
    if (!code || code.length !== 6) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CODE",
            message: "올바른 6자리 코드를 입력해주세요.",
          },
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { message: "2FA가 활성화되었습니다." },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "2FA_VERIFY_FAILED",
          message: "2FA 인증에 실패했습니다.",
        },
      },
      { status: 500 }
    )
  }
}
