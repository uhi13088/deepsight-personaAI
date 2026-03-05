import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * GET /api/public/personas/[personaId]/taste/summary
 *
 * 페르소나 소비 취향 요약 — 상위 5개 태그 + contentType 분포
 * rating >= 0.6 (긍정 소비만)
 */

const MIN_RATING = 0.6
const TOP_TAGS_LIMIT = 5

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const { personaId } = await params

    // 페르소나 존재 확인
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
      select: { id: true },
    })
    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    const logs = await prisma.consumptionLog.findMany({
      where: {
        personaId,
        rating: { gte: MIN_RATING },
      },
      select: {
        contentType: true,
        tags: true,
      },
    })

    // 태그 집계
    const tagCounts: Record<string, number> = {}
    for (const log of logs) {
      for (const tag of log.tags) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
      }
    }
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_TAGS_LIMIT)
      .map(([tag, count]) => ({ tag, count }))

    // contentType 분포
    const contentTypeCounts: Record<string, number> = {}
    for (const log of logs) {
      contentTypeCounts[log.contentType] = (contentTypeCounts[log.contentType] ?? 0) + 1
    }
    const contentTypeDistribution = Object.entries(contentTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([contentType, count]) => ({ contentType, count }))

    return NextResponse.json({
      success: true,
      data: {
        totalPositiveConsumptions: logs.length,
        topTags,
        contentTypeDistribution,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "TASTE_SUMMARY_ERROR", message } },
      { status: 500 }
    )
  }
}
