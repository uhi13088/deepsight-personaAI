import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import { generateFeed } from "@/lib/persona-world/feed/feed-engine"
import type { FeedDataProvider } from "@/lib/persona-world/feed/feed-engine"
import type { RecommendedCandidate } from "@/lib/persona-world/feed/recommended-posts"

// ── 공통 select / 응답 빌더 ──────────────────────────────────

const postSelect = {
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
} as const

type PostRow = Awaited<
  ReturnType<typeof prisma.personaPost.findMany<{ select: typeof postSelect }>>
>[number]

function buildFeedResponse(posts: PostRow[], limit: number, source: string): NextResponse {
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
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        repostCount: p.repostCount,
        createdAt: p.createdAt.toISOString(),
        source,
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
}

/**
 * GET /api/public/feed
 *
 * Query Parameters:
 * - tab: "for-you" | "following" | "explore" (기본: "for-you")
 * - limit: 조회 개수 (최대 50, 기본 20)
 * - cursor: 페이지네이션 커서 (마지막 포스트 ID)
 * - personaId: 특정 페르소나 필터 (optional)
 * - userId: 유저 ID (optional — 제공 시 3-Tier 매칭 기반 피드 생성)
 */

export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const { searchParams } = request.nextUrl
    const tab = searchParams.get("tab") || "for-you"
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 50)
    const cursor = searchParams.get("cursor") ?? undefined
    const personaId = searchParams.get("personaId")
    const userId = searchParams.get("userId")

    // userId 제공 + tab="for-you" → 3-Tier 매칭 피드
    if (userId && tab === "for-you" && !personaId) {
      return handlePersonalizedFeed(userId, limit, cursor, request)
    }

    // ── following 탭: 팔로우한 페르소나 글만 ────────────────
    if (tab === "following" && userId) {
      return handleFollowingFeed(userId, limit, cursor, personaId)
    }

    // ── explore 탭: 팔로우하지 않는 페르소나 + 인기순 ──────
    if (tab === "explore") {
      return handleExploreFeed(userId, limit, cursor, personaId)
    }

    // ── for-you / 기본 단순 피드 (userId 없거나 특정 페르소나 필터)
    const where: Record<string, unknown> = {
      isHidden: false,
      persona: { status: { in: ["ACTIVE", "STANDARD"] } },
    }

    if (personaId) {
      where.personaId = personaId
    }

    const posts = await prisma.personaPost.findMany({
      where,
      orderBy: { createdAt: "desc" as const },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: postSelect,
    })

    return buildFeedResponse(posts, limit, "RECOMMENDED")
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "FEED_ERROR", message } },
      { status: 500 }
    )
  }
}

/**
 * userId 기반 3-Tier 매칭 피드 생성.
 *
 * feed-engine.ts의 generateFeed()를 사용하여
 * following 60% + recommended 30% + trending 10% 비율로 피드 생성.
 */
async function handlePersonalizedFeed(
  userId: string,
  limit: number,
  cursor: string | undefined,
  _request: NextRequest
): Promise<NextResponse> {
  const provider: FeedDataProvider = {
    async getFollowingPersonaIds(uid: string): Promise<string[]> {
      const follows = await prisma.personaFollow.findMany({
        where: { followerUserId: uid },
        select: { followingPersonaId: true },
      })
      return follows.map((f) => f.followingPersonaId)
    },

    async getRecentPostsByPersonas(
      personaIds: string[],
      lim: number,
      cur?: string
    ): Promise<string[]> {
      const posts = await prisma.personaPost.findMany({
        where: {
          personaId: { in: personaIds },
          isHidden: false,
          ...(cur ? { id: { lt: cur } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: lim,
        select: { id: true },
      })
      return posts.map((p) => p.id)
    },

    async getCandidates(
      _uid: string,
      lim: number,
      excludePostIds: string[]
    ): Promise<RecommendedCandidate[]> {
      // 인기도 기반 간소화 추천 (벡터 매칭 없이)
      const posts = await prisma.personaPost.findMany({
        where: {
          isHidden: false,
          id: { notIn: excludePostIds },
          persona: { status: { in: ["ACTIVE", "STANDARD"] } },
        },
        orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
        take: lim,
        select: { id: true, personaId: true, likeCount: true },
      })
      return posts.map((p) => ({
        postId: p.id,
        personaId: p.personaId,
        basicScore: Math.min(1, p.likeCount / 20),
        explorationScore: 0.5,
        advancedScore: Math.min(1, p.likeCount / 30),
      }))
    },

    async getTrendingPostIds(
      lim: number,
      timeWindowHours: number,
      excludePostIds: string[]
    ): Promise<string[]> {
      const since = new Date()
      since.setHours(since.getHours() - timeWindowHours)
      const posts = await prisma.personaPost.findMany({
        where: {
          isHidden: false,
          createdAt: { gte: since },
          id: { notIn: excludePostIds },
          persona: { status: { in: ["ACTIVE", "STANDARD"] } },
        },
        orderBy: { likeCount: "desc" },
        take: lim,
        select: { id: true },
      })
      return posts.map((p) => p.id)
    },
  }

  const feedResult = await generateFeed({ userId, limit, cursor }, provider)

  const postIds = feedResult.posts.map((p) => p.postId)
  const sourceMap = new Map(feedResult.posts.map((p) => [p.postId, p.source]))

  const dbPosts =
    postIds.length > 0
      ? await prisma.personaPost.findMany({
          where: { id: { in: postIds } },
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
      : []

  const postMap = new Map(dbPosts.map((p) => [p.id, p]))
  const enrichedPosts = postIds
    .map((id) => {
      const p = postMap.get(id)
      if (!p) return null
      return {
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
        source: sourceMap.get(id) ?? "RECOMMENDED",
        persona: {
          id: p.persona.id,
          name: p.persona.name,
          handle: p.persona.handle ?? "",
          tagline: p.persona.tagline,
          role: p.persona.role,
          profileImageUrl: p.persona.profileImageUrl,
          warmth: p.persona.warmth != null ? Number(p.persona.warmth) : null,
        },
      }
    })
    .filter(Boolean)

  return NextResponse.json({
    success: true,
    data: {
      posts: enrichedPosts,
      nextCursor: feedResult.nextCursor,
      hasMore: enrichedPosts.length >= limit,
    },
  })
}

// ── Following 탭: 팔로우한 페르소나 글만 ──────────────────────

async function handleFollowingFeed(
  userId: string,
  limit: number,
  cursor: string | undefined,
  personaId: string | null
): Promise<NextResponse> {
  const follows = await prisma.personaFollow.findMany({
    where: { followerUserId: userId },
    select: { followingPersonaId: true },
  })
  const followingIds = follows.map((f) => f.followingPersonaId)

  if (followingIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: { posts: [], nextCursor: null, hasMore: false },
    })
  }

  const where: Record<string, unknown> = {
    isHidden: false,
    personaId: personaId ? personaId : { in: followingIds },
    persona: { status: { in: ["ACTIVE", "STANDARD"] } },
  }

  const posts = await prisma.personaPost.findMany({
    where,
    orderBy: { createdAt: "desc" as const },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: postSelect,
  })

  return buildFeedResponse(posts, limit, "FOLLOWING")
}

// ── Explore 탭: 팔로우하지 않는 페르소나 + 인기순 ──────────────

async function handleExploreFeed(
  userId: string | null,
  limit: number,
  cursor: string | undefined,
  personaId: string | null
): Promise<NextResponse> {
  // 팔로우 중인 페르소나 제외 (userId가 있는 경우)
  let excludePersonaIds: string[] = []
  if (userId) {
    const follows = await prisma.personaFollow.findMany({
      where: { followerUserId: userId },
      select: { followingPersonaId: true },
    })
    excludePersonaIds = follows.map((f) => f.followingPersonaId)
  }

  const where: Record<string, unknown> = {
    isHidden: false,
    persona: { status: { in: ["ACTIVE", "STANDARD"] } },
  }

  if (personaId) {
    where.personaId = personaId
  } else if (excludePersonaIds.length > 0) {
    where.personaId = { notIn: excludePersonaIds }
  }

  const posts = await prisma.personaPost.findMany({
    where,
    orderBy: [{ likeCount: "desc" as const }, { createdAt: "desc" as const }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: postSelect,
  })

  return buildFeedResponse(posts, limit, "TRENDING")
}
