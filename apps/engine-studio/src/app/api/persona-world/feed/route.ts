import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateFeed } from "@/lib/persona-world/feed/feed-engine"
import type { FeedDataProvider } from "@/lib/persona-world/feed/feed-engine"
import type { RecommendedCandidate } from "@/lib/persona-world/feed/recommended-posts"
import { cosineSimilarity } from "@/lib/vector/utils"
import { calculateVFinal } from "@/lib/vector/v-final"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import { verifyInternalToken } from "@/lib/internal-auth"

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
  const authError = verifyInternalToken(request)
  if (authError) return authError

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
        uid: string,
        lim: number,
        excludePostIds: string[]
      ): Promise<RecommendedCandidate[]> {
        // 유저 벡터 로드
        const pwUser = await prisma.personaWorldUser.findUnique({
          where: { id: uid },
          select: {
            depth: true,
            lens: true,
            stance: true,
            scope: true,
            taste: true,
            purpose: true,
            openness: true,
            conscientiousness: true,
            extraversion: true,
            agreeableness: true,
            neuroticism: true,
            hasOceanProfile: true,
          },
        })

        // 후보 포스트 조회
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

        // 유저 벡터 없으면 인기도 기반 폴백
        if (!pwUser || pwUser.depth == null) {
          return posts.map((p) => ({
            postId: p.id,
            personaId: p.personaId,
            basicScore: Math.min(1, p.likeCount / 20),
            explorationScore: 0.5,
            advancedScore: Math.min(1, p.likeCount / 30),
          }))
        }

        // 유저 L1 벡터 구성
        const userL1: SocialPersonaVector = {
          depth: Number(pwUser.depth),
          lens: Number(pwUser.lens ?? 0.5),
          stance: Number(pwUser.stance ?? 0.5),
          scope: Number(pwUser.scope ?? 0.5),
          taste: Number(pwUser.taste ?? 0.5),
          purpose: Number(pwUser.purpose ?? 0.5),
          sociability: 0.5, // 유저 모델에 sociability 없음 → 기본값
        }
        const userL1Vec = [
          userL1.depth,
          userL1.lens,
          userL1.stance,
          userL1.scope,
          userL1.taste,
          userL1.purpose,
          userL1.sociability,
        ]

        // 유저 L2 벡터 (있으면)
        const userL2: CoreTemperamentVector | null = pwUser.hasOceanProfile
          ? {
              openness: Number(pwUser.openness ?? 0.5),
              conscientiousness: Number(pwUser.conscientiousness ?? 0.5),
              extraversion: Number(pwUser.extraversion ?? 0.5),
              agreeableness: Number(pwUser.agreeableness ?? 0.5),
              neuroticism: Number(pwUser.neuroticism ?? 0.5),
            }
          : null

        // 페르소나 벡터 + paradoxScore 병렬 조회
        const personaIds = [...new Set(posts.map((p) => p.personaId))]
        const [personaVectors, personas] = await Promise.all([
          prisma.personaLayerVector.findMany({
            where: { personaId: { in: personaIds } },
            select: {
              personaId: true,
              layerType: true,
              dim1: true,
              dim2: true,
              dim3: true,
              dim4: true,
              dim5: true,
              dim6: true,
              dim7: true,
            },
          }),
          prisma.persona.findMany({
            where: { id: { in: personaIds } },
            select: { id: true, paradoxScore: true },
          }),
        ])
        const paradoxMap = new Map(personas.map((p) => [p.id, Number(p.paradoxScore ?? 0)]))

        // 페르소나별 벡터 맵 구축
        const vectorMap = new Map<string, { l1?: number[]; l2?: number[]; l3?: number[] }>()
        for (const v of personaVectors) {
          if (!vectorMap.has(v.personaId)) {
            vectorMap.set(v.personaId, {})
          }
          const dims = [v.dim1, v.dim2, v.dim3, v.dim4, v.dim5, v.dim6, v.dim7]
            .filter((d) => d != null)
            .map(Number)

          const entry = vectorMap.get(v.personaId)!
          if (v.layerType === "SOCIAL") entry.l1 = dims
          else if (v.layerType === "TEMPERAMENT") entry.l2 = dims
          else if (v.layerType === "NARRATIVE") entry.l3 = dims
        }

        // 유저 V_Final 계산 (L2 있으면 pressure 적용)
        const defaultL3: NarrativeDriveVector = {
          lack: 0.5,
          moralCompass: 0.5,
          volatility: 0.5,
          growthArc: 0.5,
        }
        const userVFinal = userL2 ? calculateVFinal(userL1, userL2, defaultL3, 0.3) : null

        return posts.map((p) => {
          const vecs = vectorMap.get(p.personaId)
          if (!vecs?.l1 || vecs.l1.length < 7) {
            // 벡터 없는 페르소나 → 인기도 폴백
            return {
              postId: p.id,
              personaId: p.personaId,
              basicScore: Math.min(1, p.likeCount / 20),
              explorationScore: 0.5,
              advancedScore: Math.min(1, p.likeCount / 30),
            }
          }

          const personaL1Vec = vecs.l1

          // Basic: L1 코사인 유사도 70% + L2 유사도 30%
          const l1Sim = Math.max(0, cosineSimilarity(userL1Vec, personaL1Vec))
          let l2Sim = 0.5 // L2 없으면 중립값
          if (userL2 && vecs.l2 && vecs.l2.length >= 5) {
            const userL2Vec = [
              userL2.openness,
              userL2.conscientiousness,
              userL2.extraversion,
              userL2.agreeableness,
              userL2.neuroticism,
            ]
            l2Sim = Math.max(0, cosineSimilarity(userL2Vec, vecs.l2))
          }
          const basicScore = round(0.7 * l1Sim + 0.3 * l2Sim)

          // Exploration: L1 발산도 40% + L2 발산도 40% + 신선도 20%
          const l1Div = round(1 - l1Sim)
          const l2Div = round(1 - l2Sim)
          const freshness = 0.8 // 피드 내 중복 체크는 distributeTiers에서 처리
          const explorationScore = round(0.4 * l1Div + 0.4 * l2Div + 0.2 * freshness)

          // Advanced: V_Final 유사도 50% + L2 유사도 30% + 역설 호환 20%
          let vFinalSim = l1Sim // V_Final 없으면 L1으로 대체
          if (userVFinal && vecs.l2 && vecs.l2.length >= 5 && vecs.l3 && vecs.l3.length >= 4) {
            const personaL1Obj: SocialPersonaVector = {
              depth: personaL1Vec[0],
              lens: personaL1Vec[1],
              stance: personaL1Vec[2],
              scope: personaL1Vec[3],
              taste: personaL1Vec[4],
              purpose: personaL1Vec[5],
              sociability: personaL1Vec[6],
            }
            const personaL2Obj: CoreTemperamentVector = {
              openness: vecs.l2[0],
              conscientiousness: vecs.l2[1],
              extraversion: vecs.l2[2],
              agreeableness: vecs.l2[3],
              neuroticism: vecs.l2[4],
            }
            const personaL3Obj: NarrativeDriveVector = {
              lack: vecs.l3[0],
              moralCompass: vecs.l3[1],
              volatility: vecs.l3[2],
              growthArc: vecs.l3[3],
            }
            const personaVFinal = calculateVFinal(personaL1Obj, personaL2Obj, personaL3Obj, 0.3)
            vFinalSim = Math.max(0, cosineSimilarity(userVFinal.vector, personaVFinal.vector))
          }
          const paradox: number = Number(paradoxMap.get(p.personaId as string) ?? 0)
          const paradoxCompat = round(1 - Math.abs(0.5 - paradox)) // 유저 기본 역설 0.5
          const advancedScore = round(0.5 * vFinalSim + 0.3 * l2Sim + 0.2 * paradoxCompat)

          return {
            postId: p.id,
            personaId: p.personaId,
            basicScore,
            explorationScore,
            advancedScore,
          }
        })
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
    console.error("[persona-world/feed] Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "FEED_ERROR", message } },
      { status: 500 }
    )
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
