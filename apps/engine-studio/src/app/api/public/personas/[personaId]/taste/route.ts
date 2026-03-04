import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * GET /api/public/personas/[personaId]/taste
 *
 * 페르소나 소비 기록 공개 API — rating >= 0.6 (긍정 소비만)
 * cursor 기반 페이지네이션 (limit 20)
 */

const MIN_RATING = 0.6
const DEFAULT_LIMIT = 20

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personaId: string }> }
) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const { personaId } = await params
    const { searchParams } = request.nextUrl

    const limitParam = searchParams.get("limit")
    const limit = Math.min(Math.max(parseInt(limitParam ?? "20", 10) || DEFAULT_LIMIT, 1), 50)
    const cursor = searchParams.get("cursor") ?? undefined

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

    const items = await prisma.consumptionLog.findMany({
      where: {
        personaId,
        rating: { gte: MIN_RATING },
      },
      orderBy: { consumedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        contentType: true,
        title: true,
        impression: true,
        rating: true,
        tags: true,
        consumedAt: true,
      },
    })

    const hasMore = items.length > limit
    const page = hasMore ? items.slice(0, limit) : items
    const nextCursor = hasMore ? page[page.length - 1].id : null

    return NextResponse.json({
      success: true,
      data: {
        items: page.map((item) => ({
          id: item.id,
          contentType: item.contentType,
          title: item.title,
          impression: item.impression,
          rating: item.rating !== null ? Number(item.rating) : null,
          tags: item.tags,
          consumedAt: item.consumedAt.toISOString(),
        })),
        nextCursor,
        hasMore,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "TASTE_FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}
