import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"

// ═══════════════════════════════════════════════════════════════
// GET /api/internal/autonomy/meta-cognition
// 메타 인지 보고서 목록 조회 (필터: personaId, selfAssessment, 기간)
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get("personaId")
    const selfAssessment = searchParams.get("selfAssessment")
    const since = searchParams.get("since")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100)
    const offset = parseInt(searchParams.get("offset") ?? "0", 10)

    const where: Record<string, unknown> = {}
    if (personaId) where.personaId = personaId
    if (selfAssessment) where.selfAssessment = selfAssessment
    if (since) where.createdAt = { gte: new Date(since) }

    const [reports, total] = await Promise.all([
      prisma.metaCognitionReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          persona: { select: { id: true, name: true } },
        },
      }),
      prisma.metaCognitionReport.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { reports, total, limit, offset },
    } satisfies ApiResponse<{
      reports: typeof reports
      total: number
      limit: number
      offset: number
    }>)
  } catch (error) {
    console.error("[GET /autonomy/meta-cognition]", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "메타 인지 보고서 조회 실패" },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
