import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/public/search
 *
 * 해시태그 기반 포스트 검색 + 트렌딩 해시태그 목록
 *
 * Query Parameters:
 * - hashtag: 검색할 해시태그 (# 없이, 예: "영화추천")
 * - q: 일반 텍스트 검색 (content 내 포함)
 * - type: 포스트 타입 필터 (예: "VS_BATTLE", "REVIEW")
 * - limit: 조회 개수 (최대 50, 기본 20)
 * - cursor: 페이지네이션 커서
 * - trending: "true"이면 트렌딩 해시태그만 반환
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const hashtag = searchParams.get("hashtag")?.trim()
    const q = searchParams.get("q")?.trim()
    const postType = searchParams.get("type")?.trim()
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 50)
    const cursor = searchParams.get("cursor") ?? undefined
    const trending = searchParams.get("trending") === "true"

    const activeStatuses = ["ACTIVE", "STANDARD"] as const

    // ── 트렌딩 해시태그 요청 ──────────────────────────────
    if (trending) {
      const trendingHashtags = await getTrendingHashtags()
      return NextResponse.json({
        success: true,
        data: { trendingHashtags },
      })
    }

    // ── 해시태그, 텍스트, 또는 포스트 타입 검색 ──────────
    if (!hashtag && !q && !postType) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PARAMS",
            message: "hashtag, q, 또는 type 파라미터가 필요합니다",
          },
        },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = {
      isHidden: false,
      persona: { status: { in: [...activeStatuses] } },
    }

    if (hashtag) {
      // PostgreSQL 배열 contains: 해시태그가 배열에 포함된 포스트
      where.hashtags = { has: hashtag }
    }

    if (q) {
      where.content = { contains: q, mode: "insensitive" }
    }

    if (postType) {
      where.type = postType
    }

    const posts = await prisma.personaPost.findMany({
      where,
      orderBy: [{ likeCount: "desc" as const }, { createdAt: "desc" as const }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        type: true,
        content: true,
        contentId: true,
        metadata: true,
        locationTag: true,
        hashtags: true,
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
          hashtags: p.hashtags ?? [],
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          repostCount: p.repostCount,
          createdAt: p.createdAt.toISOString(),
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
        searchedHashtag: hashtag ?? null,
        searchedQuery: q ?? null,
      },
    })
  } catch (error) {
    console.error("[public/search] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "SEARCH_ERROR", message } },
      { status: 500 }
    )
  }
}

/**
 * 최근 7일간 가장 많이 사용된 해시태그 상위 20개.
 *
 * Prisma의 groupBy는 배열 필드를 지원하지 않으므로
 * raw query로 unnest + group by 수행.
 */
async function getTrendingHashtags(): Promise<Array<{ tag: string; count: number }>> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const result = await prisma.$queryRaw<Array<{ tag: string; count: bigint }>>`
    SELECT unnest(hashtags) AS tag, COUNT(*) AS count
    FROM persona_posts
    WHERE "isHidden" = false
      AND "createdAt" >= ${sevenDaysAgo}
      AND array_length(hashtags, 1) > 0
    GROUP BY tag
    ORDER BY count DESC
    LIMIT 10
  `

  return result.map((r) => ({
    tag: r.tag,
    count: Number(r.count),
  }))
}
