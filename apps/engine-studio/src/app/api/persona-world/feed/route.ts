import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateFeed } from "@/lib/persona-world/feed/feed-engine"
import type { FeedDataProvider } from "@/lib/persona-world/feed/feed-engine"
import type { RecommendedCandidate } from "@/lib/persona-world/feed/recommended-posts"

/**
 * POST /api/persona-world/feed
 *
 * 3-Tier 매칭 기반 피드 생성 API.
 *
 * Body:
 * - userId: string (필수)
 * - limit?: number (기본 60)
 * - cursor?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, limit, cursor } = body as {
      userId: string
      limit?: number
      cursor?: string
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

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
        // 추천 후보: 매칭 점수는 향후 3-Tier 매칭 엔진 연동 시 계산
        // 현재는 최신+인기 포스트를 후보로 사용
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

    const result = await generateFeed({ userId, limit: limit ?? 60, cursor }, provider)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "FEED_ERROR", message } },
      { status: 500 }
    )
  }
}
