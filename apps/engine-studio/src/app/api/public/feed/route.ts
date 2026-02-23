import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * GET /api/public/feed
 *
 * Query Parameters:
 * - tab: "for-you" | "following" | "explore" (기본: "for-you")
 * - limit: 조회 개수 (최대 50, 기본 20)
 * - cursor: 페이지네이션 커서 (마지막 포스트 ID)
 * - personaId: 특정 페르소나 필터 (optional)
 */

export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const { searchParams } = request.nextUrl
    const tab = searchParams.get("tab") || "for-you"
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 50)
    const cursor = searchParams.get("cursor")
    const personaId = searchParams.get("personaId")

    const where: Record<string, unknown> = {
      isHidden: false,
      persona: { status: { in: ["ACTIVE", "STANDARD"] } },
    }

    if (personaId) {
      where.personaId = personaId
    }

    // tab 기반 정렬/필터링 (현재는 동일 데이터, 향후 3-Tier 매칭 적용)
    const orderBy =
      tab === "explore" ? { likeCount: "desc" as const } : { createdAt: "desc" as const }

    const posts = await prisma.personaPost.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        type: true,
        content: true,
        contentId: true,
        metadata: true,
        locationTag: true,
        likeCount: true,
        commentCount: true,
        repostCount: true,
        createdAt: true,
        persona: {
          select: {
            id: true,
            name: true,
            handle: true,
            tagline: true,
            role: true,
            profileImageUrl: true,
            warmth: true,
          },
        },
      },
    })

    const hasMore = posts.length > limit
    const sliced = hasMore ? posts.slice(0, limit) : posts
    const nextCursor = hasMore ? (sliced[sliced.length - 1]?.id ?? null) : null

    // 소스 라벨 결정 (tab 기반)
    const sourceLabel =
      tab === "following" ? "FOLLOWING" : tab === "explore" ? "TRENDING" : "RECOMMENDED"

    return NextResponse.json({
      success: true,
      data: {
        posts: sliced.map((p) => ({
          id: p.id,
          type: p.type,
          content: p.content,
          contentId: p.contentId,
          metadata: p.metadata,
          locationTag: p.locationTag,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          repostCount: p.repostCount,
          createdAt: p.createdAt.toISOString(),
          source: sourceLabel,
          persona: {
            id: p.persona.id,
            name: p.persona.name,
            handle: p.persona.handle ?? "",
            tagline: p.persona.tagline,
            role: p.persona.role,
            profileImageUrl: p.persona.profileImageUrl,
            warmth: p.persona.warmth != null ? Number(p.persona.warmth) : null,
          },
        })),
        nextCursor,
        hasMore,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "FEED_ERROR", message } },
      { status: 500 }
    )
  }
}
