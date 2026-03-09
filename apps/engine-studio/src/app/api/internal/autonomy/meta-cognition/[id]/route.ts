import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"

// ═══════════════════════════════════════════════════════════════
// GET /api/internal/autonomy/meta-cognition/[id]
// 개별 메타 인지 보고서 상세 조회
// ═══════════════════════════════════════════════════════════════

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params

    const report = await prisma.metaCognitionReport.findUnique({
      where: { id },
      include: {
        persona: { select: { id: true, name: true } },
      },
    })

    if (!report) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "보고서를 찾을 수 없습니다." },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: report,
    } satisfies ApiResponse<typeof report>)
  } catch (error) {
    console.error("[GET /autonomy/meta-cognition/[id]]", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "보고서 조회 실패" },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
