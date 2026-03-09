import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"

// ═══════════════════════════════════════════════════════════════
// PATCH /api/internal/autonomy/corrections/[id]/review
// 감사 로그 리뷰 완료 마킹
// ═══════════════════════════════════════════════════════════════

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (authResult.response) return authResult.response

  try {
    const { id } = await params
    const reviewerId = authResult.session.user?.id ?? "unknown"

    const log = await prisma.autonomyCorrectionLog.findUnique({ where: { id } })

    if (!log) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "감사 로그를 찾을 수 없습니다." },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    if (log.reviewed) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "ALREADY_REVIEWED", message: "이미 리뷰 완료된 로그입니다." },
        } satisfies ApiResponse<never>,
        { status: 409 }
      )
    }

    const updated = await prisma.autonomyCorrectionLog.update({
      where: { id },
      data: {
        reviewed: true,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    } satisfies ApiResponse<typeof updated>)
  } catch (error) {
    console.error("[PATCH /autonomy/corrections/[id]/review]", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "리뷰 마킹 실패" },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
