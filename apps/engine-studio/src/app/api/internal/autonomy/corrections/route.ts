import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"

// ═══════════════════════════════════════════════════════════════
// GET /api/internal/autonomy/corrections
// 자율 교정 감사 로그 목록 조회 (필터: personaId, reviewed, severity)
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get("personaId")
    const reviewed = searchParams.get("reviewed")
    const severity = searchParams.get("severity")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100)
    const offset = parseInt(searchParams.get("offset") ?? "0", 10)

    const where: Record<string, unknown> = {}
    if (personaId) where.personaId = personaId
    if (reviewed === "true") where.reviewed = true
    if (reviewed === "false") where.reviewed = false
    if (severity === "minor" || severity === "major") where.severity = severity

    const [logs, total] = await Promise.all([
      prisma.autonomyCorrectionLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          persona: { select: { id: true, name: true } },
        },
      }),
      prisma.autonomyCorrectionLog.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: { logs, total, limit, offset },
    } satisfies ApiResponse<{ logs: typeof logs; total: number; limit: number; offset: number }>)
  } catch (error) {
    console.error("[GET /autonomy/corrections]", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "감사 로그 조회 실패" },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
