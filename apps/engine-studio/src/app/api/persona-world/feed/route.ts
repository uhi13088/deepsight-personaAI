import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateFeed } from "@/lib/persona-world/feed/feed-engine"
import type { FeedDataProvider } from "@/lib/persona-world/feed/feed-engine"
import type { RecommendedCandidate } from "@/lib/persona-world/feed/recommended-posts"

/**
 * POST /api/persona-world/feed
 *
 * 3-Tier 매칭 기반 피드 생성 API.
 * postId 목록 → 실제 포스트 데이터로 풍성화하여 반환.
 *
 * Body:
 * - userId: string (필수)
 * - limit?: number (기본 20)
 * - cursor?: string
 * - tab?: string ("for-you" | "following" | "explore")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, limit, cursor, tab } = body as {
      userId: string
      limit?: number
      cursor?: string
      tab?: string
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    const feedLimit = Math.min(limit ?? 20, 50)

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
        const posts = await prisma.personaPost.findMany({
          where: {
            isHidden: false,
            id: { notIn: excludePostIds },
            persona: { status: { in: ["ACTIVE", "STANDARD"] } },
          },
          orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
          take: lim,
          select: {
            id: true,
            personaId: true,
            likeCount: true,
          },
        })

        return posts.map((p) => ({
          postId: p.id,
          personaId: p.personaId,
          basicScore: Math.min(1, p.likeCount / 20),
          explorationScore: Math.random() * 0.5 + 0.3,
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

    const feedResult = await generateFeed({ userId, limit: feedLimit, cursor }, provider)

    // postId → 실제 포스트 데이터로 풍성화
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

    // 원래 순서 유지
    const postMap = new Map(dbPosts.map((p) => [p.id, p]))
    const enrichedPosts = postIds
      .map((id) => {
        const p = postMap.get(id)
        if (!p) return null
        const tabSource = tab === "following" ? "FOLLOWING" : tab === "explore" ? "TRENDING" : null
        return {
          id: p.id,
          type: p.type,
          content: p.content,
          contentId: p.contentId,
          metadata: p.metadata,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          repostCount: p.repostCount,
          createdAt: p.createdAt.toISOString(),
          source: tabSource ?? sourceMap.get(id) ?? "RECOMMENDED",
          persona: {
            id: p.persona.id,
            name: p.persona.name,
            handle: p.persona.handle ?? "",
            tagline: p.persona.tagline,
            role: p.persona.role,
            profileImageUrl: p.persona.profileImageUrl,
            warmth: p.persona.warmth ? Number(p.persona.warmth) : 0.5,
          },
        }
      })
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      data: {
        posts: enrichedPosts,
        nextCursor: feedResult.nextCursor,
        hasMore: enrichedPosts.length >= feedLimit,
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
