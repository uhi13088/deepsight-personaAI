import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const upgradeSchema = z.object({
  planId: z.enum(["free", "starter", "pro", "enterprise"]),
})

// ============================================================================
// POST /api/billing/upgrade - 플랜 업그레이드
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = upgradeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0].message,
          },
        },
        { status: 400 }
      )
    }

    const { planId } = parsed.data

    // TODO: 실제 구현 시 Stripe 등 결제 시스템 연동 필요
    // - 사용자 인증 확인
    // - 결제 수단 확인
    // - Stripe 구독 생성/변경
    // - DB 업데이트

    // Mock response for now
    return NextResponse.json({
      success: true,
      data: {
        planId,
        message: `${planId} 플랜으로 변경되었습니다.`,
      },
    })
  } catch (error) {
    console.error("Error upgrading plan:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "플랜 업그레이드에 실패했습니다.",
        },
      },
      { status: 500 }
    )
  }
}
