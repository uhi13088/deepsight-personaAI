import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"
import { getAutonomyPolicy } from "@/lib/autonomy/autonomy-policy"

// ═══════════════════════════════════════════════════════════════
// GET /api/internal/autonomy/memory-prune
// 페르소나별 기억 상태 + prune 대상 미리보기
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get("personaId")

    if (!personaId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "personaId가 필요합니다." },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
      select: { id: true, name: true, autonomyPolicy: true },
    })

    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다." },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    const policy = getAutonomyPolicy(persona)

    // 카테고리별 기억 통계
    const memories = await prisma.semanticMemory.groupBy({
      by: ["category"],
      where: { personaId },
      _count: true,
      _avg: { confidence: true },
    })

    const totalMemories = await prisma.semanticMemory.count({ where: { personaId } })
    const lowConfidence = await prisma.semanticMemory.count({
      where: {
        personaId,
        confidence: { lt: policy.memoryConfig.pruneConfidenceThreshold },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        personaId: persona.id,
        personaName: persona.name,
        autoMemoryManagement: policy.autoMemoryManagement,
        config: policy.memoryConfig,
        stats: {
          totalMemories,
          lowConfidenceCount: lowConfidence,
          byCategory: memories.map((m) => ({
            category: m.category,
            count: m._count,
            avgConfidence: m._avg.confidence ? Number(m._avg.confidence) : null,
          })),
        },
      },
    })
  } catch (error) {
    console.error("[GET /autonomy/memory-prune]", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "기억 상태 조회 실패" },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
