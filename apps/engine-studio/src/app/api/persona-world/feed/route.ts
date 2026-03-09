import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateFeed } from "@/lib/persona-world/feed/feed-engine"
import type { FeedDataProvider } from "@/lib/persona-world/feed/feed-engine"
import type { RecommendedCandidate } from "@/lib/persona-world/feed/recommended-posts"
import { cosineSimilarity } from "@/lib/vector/utils"
import { calculateVFinal } from "@/lib/vector/v-final"
import { applyGenreWeights, extractHyperParameters } from "@/lib/matching/tuning"
import type { GenreWeightTable, TuningProfile } from "@/lib/matching/tuning"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import { verifyInternalToken } from "@/lib/internal-auth"
import { bulkGetMatchData, computeAndCache } from "@/lib/cache/persona-match-cache"
import { findSimilarPersonas } from "@/lib/vector-search"

/** 벡터 검색 후보 풀 크기 — SystemConfig에서 오버라이드 가능 (T384) */
const DEFAULT_CANDIDATE_POOL_SIZE = 50

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

    // T379: followingIds 1회 조회 — following/explore/for-you 탭 공유
    const followRows = await prisma.personaFollow.findMany({
      where: { followerUserId: userId },
      select: { followingPersonaId: true },
    })
    const followingIds = followRows.map((f) => f.followingPersonaId)

    // ── following 탭: 팔로우한 페르소나 글만 ────────────────
    if (tab === "following") {
      return handleFollowingTab(userId, feedLimit, cursor, followingIds)
    }

    // ── explore 탭: 팔로우하지 않는 페르소나 + 인기순 ──────
    if (tab === "explore") {
      return handleExploreTab(userId, feedLimit, cursor, followingIds)
    }

    // ── for-you: 3-Tier 매칭 피드 엔진 ─────────────────────
    const provider: FeedDataProvider = {
      async getFollowingPersonaIds(_uid: string): Promise<string[]> {
        // T379: 이미 로드된 followingIds 재사용
        return followingIds
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
        // 유저 벡터 + 장르 가중치 로드
        const [pwUser, tuningRow] = await Promise.all([
          prisma.personaWorldUser.findUnique({
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
          }),
          prisma.systemConfig.findUnique({
            where: { category_key: { category: "MATCHING_TUNING", key: "profile" } },
            select: { value: true },
          }),
        ])

        // 튜닝 프로필에서 하이퍼파라미터 + 장르 가중치 추출
        const tuningProfile =
          tuningRow?.value && typeof tuningRow.value === "object"
            ? (tuningRow.value as Partial<TuningProfile>)
            : null

        const genreWeights: GenreWeightTable | null = tuningProfile?.genreWeights ?? null

        // 하이퍼파라미터 추출 (DB 프로필 → 정규화된 값)
        const hyperParams = extractHyperParameters(tuningProfile?.parameters ?? [])

        // candidatePoolSize: SystemConfig 오버라이드 가능
        const tuningRaw = tuningProfile as Record<string, unknown> | null
        const candidatePoolSize =
          typeof tuningRaw?.candidatePoolSize === "number"
            ? tuningRaw.candidatePoolSize
            : DEFAULT_CANDIDATE_POOL_SIZE

        // 유저 벡터 없으면 인기도 기반 폴백 (벡터 검색 불가)
        if (!pwUser || pwUser.depth == null) {
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

        // T384: pgvector 벡터 검색으로 후보 페르소나 사전 필터링
        // 벡터 컬럼이 있으면 ANN 검색, 없으면(마이그레이션 전) 전체 포스트 조회 폴백
        let candidatePersonaIds: string[] | null = null
        try {
          const similar = await findSimilarPersonas(prisma, {
            targetVector: userL1Vec,
            layer: "SOCIAL",
            topK: candidatePoolSize,
          })
          if (similar.length > 0) {
            candidatePersonaIds = similar.map((s) => s.personaId)
            console.log(
              `[feed] vector-search: ${similar.length} candidates from pgvector (pool=${candidatePoolSize})`
            )
          }
        } catch {
          // pgvector 미설정 또는 벡터 컬럼 미존재 → 폴백 (전체 포스트 조회)
          console.log("[feed] vector-search: pgvector not available, falling back to full scan")
        }

        // 후보 포스트 조회 — 벡터 검색 결과가 있으면 해당 페르소나만, 없으면 전체
        const postWhere: Record<string, unknown> = {
          isHidden: false,
          id: { notIn: excludePostIds },
          persona: { status: { in: ["ACTIVE", "STANDARD"] } },
        }
        if (candidatePersonaIds) {
          postWhere.personaId = { in: candidatePersonaIds }
        }

        const posts = await prisma.personaPost.findMany({
          where: postWhere,
          orderBy: [{ likeCount: "desc" }, { createdAt: "desc" }],
          take: lim,
          select: { id: true, personaId: true, likeCount: true },
        })

        // 페르소나 ID 추출
        const personaIds = [...new Set(posts.map((p) => p.personaId))]

        // T379: 캐시에서 매칭 데이터 일괄 로드
        const { hits: cacheHits, misses: cacheMisses } = await bulkGetMatchData(personaIds)

        // 캐시 미스 페르소나만 DB 조회 + 계산 + 캐시 저장
        if (cacheMisses.length > 0) {
          await Promise.all(cacheMisses.map((id) => computeAndCache(id)))
          // 재조회 (computeAndCache가 캐시에 저장했으므로)
          const { hits: newHits } = await bulkGetMatchData(cacheMisses)
          for (const [id, data] of newHits) {
            cacheHits.set(id, data)
          }
        }

        const cacheHitRate =
          personaIds.length > 0
            ? round((personaIds.length - cacheMisses.length) / personaIds.length)
            : 0
        console.log(
          `[feed] cache: ${personaIds.length - cacheMisses.length}/${personaIds.length} hit (${cacheHitRate * 100}%)`
        )

        // favoriteGenres는 캐시에 없으므로 별도 조회
        const personas = await prisma.persona.findMany({
          where: { id: { in: personaIds } },
          select: { id: true, favoriteGenres: true },
        })
        const genreMap = new Map(personas.map((p) => [p.id, p.favoriteGenres[0] ?? null]))

        // 유저 V_Final 계산 (L2 있으면 pressure 적용)
        const defaultL3: NarrativeDriveVector = {
          lack: 0.5,
          moralCompass: 0.5,
          volatility: 0.5,
          growthArc: 0.5,
        }
        const userVFinal = userL2 ? calculateVFinal(userL1, userL2, defaultL3, 0.3) : null

        const candidates = posts.map((p) => {
          const cached = cacheHits.get(p.personaId)
          if (!cached) {
            // 캐시 미스 (computeAndCache도 실패) → 인기도 폴백
            return {
              postId: p.id,
              personaId: p.personaId,
              basicScore: Math.min(1, p.likeCount / 20),
              explorationScore: 0.5,
              advancedScore: Math.min(1, p.likeCount / 30),
            }
          }

          // 캐시에서 L1 벡터 추출 (vFinal.l2Projected 기반이 아닌, 원본 필요 → crossAxisProfile 활용)
          // vFinal.vector = 7D 최종 벡터 (L1 기준)
          const personaL1Vec = cached.vFinal.vector

          // 장르 가중치 적용
          const primaryGenre = genreMap.get(p.personaId)
          const weightedUserL1 =
            primaryGenre && genreWeights
              ? applyGenreWeights(userL1Vec, primaryGenre, genreWeights)
              : userL1Vec
          const weightedPersonaL1 =
            primaryGenre && genreWeights
              ? applyGenreWeights(personaL1Vec, primaryGenre, genreWeights)
              : personaL1Vec

          // Basic: L1(vFinal) 코사인 유사도 70% + L2 유사도 30%
          const l1Sim = Math.max(0, cosineSimilarity(weightedUserL1, weightedPersonaL1))
          let l2Sim = 0.5
          if (userL2 && cached.vFinal.l2Projected.length >= 5) {
            const userL2Vec = [
              userL2.openness,
              userL2.conscientiousness,
              userL2.extraversion,
              userL2.agreeableness,
              userL2.neuroticism,
            ]
            l2Sim = Math.max(0, cosineSimilarity(userL2Vec, cached.vFinal.l2Projected.slice(0, 5)))
          }
          const basicScore = round(0.7 * l1Sim + 0.3 * l2Sim)

          // Exploration: L1 발산도 40% + L2 발산도 40% + 신선도 20%
          const l1Div = round(1 - l1Sim)
          const l2Div = round(1 - l2Sim)
          const freshness = 0.8
          const rawExploration = 0.4 * l1Div + 0.4 * l2Div + 0.2 * freshness
          const explorationScore = round(rawExploration * (1 + hyperParams.diversityFactor))

          // Advanced: V_Final 유사도 50% + L2 유사도 30% + 역설 호환 20%
          let vFinalSim = l1Sim
          if (userVFinal) {
            vFinalSim = Math.max(0, cosineSimilarity(userVFinal.vector, cached.vFinal.vector))
          }
          const paradox = cached.paradoxProfile.overall
          const paradoxCompat = round(1 - Math.abs(0.5 - paradox))
          const advancedScore = round(0.5 * vFinalSim + 0.3 * l2Sim + 0.2 * paradoxCompat)

          return {
            postId: p.id,
            personaId: p.personaId,
            basicScore,
            explorationScore,
            advancedScore,
          }
        })

        // 하이퍼파라미터 적용: similarity_threshold로 품질 필터링
        return candidates.filter((c) => c.basicScore >= hyperParams.similarityThreshold)
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
              locationTag: true,
              hashtags: true, // T382
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
          locationTag: p.locationTag,
          hashtags: p.hashtags, // T382
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

// ── 공통 select ───────────────────────────────────────────────

const feedPostSelect = {
  id: true,
  type: true,
  content: true,
  contentId: true,
  metadata: true,
  locationTag: true,
  hashtags: true, // T382
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

type FeedPostRow = Awaited<
  ReturnType<typeof prisma.personaPost.findMany<{ select: typeof feedPostSelect }>>
>[number]

function buildTabResponse(posts: FeedPostRow[], limit: number, source: string): NextResponse {
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
        hashtags: p.hashtags, // T382
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
          warmth: p.persona.warmth ? Number(p.persona.warmth) : 0.5,
        },
      })),
      nextCursor,
      hasMore,
    },
  })
}

// ── Following 탭 ──────────────────────────────────────────────

async function handleFollowingTab(
  userId: string,
  limit: number,
  cursor: string | undefined,
  followingIds: string[] // T379: 이미 로드된 데이터 재사용
): Promise<NextResponse> {
  void userId // 미래 확장용

  if (followingIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: { posts: [], nextCursor: null, hasMore: false },
    })
  }

  const posts = await prisma.personaPost.findMany({
    where: {
      isHidden: false,
      personaId: { in: followingIds },
      persona: { status: { in: ["ACTIVE", "STANDARD"] } },
    },
    orderBy: { createdAt: "desc" as const },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: feedPostSelect,
  })

  return buildTabResponse(posts, limit, "FOLLOWING")
}

// ── Explore 탭 ────────────────────────────────────────────────
//
// 순수 likeCount 정렬은 좋아요 1개만 눌려도 오래된 포스트가 영구 1위 고착되는
// 문제가 있음. HackerNews 스타일 time-decay 점수로 신선도 + 인기도를 균형 있게 반영.
// score = (likeCount + 1) / (ageHours + 2)^1.5

async function handleExploreTab(
  userId: string,
  limit: number,
  cursor: string | undefined,
  followingIds: string[] // T379: 이미 로드된 데이터 재사용
): Promise<NextResponse> {
  void userId // 미래 확장용
  const excludeIds = followingIds

  // 30일 이내 후보 over-fetch (커서 전 구간 포함하도록 충분히 확보)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const where: Record<string, unknown> = {
    isHidden: false,
    createdAt: { gte: since },
    persona: { status: { in: ["ACTIVE", "STANDARD"] } },
  }
  if (excludeIds.length > 0) {
    where.personaId = { notIn: excludeIds }
  }

  const candidates = await prisma.personaPost.findMany({
    where,
    orderBy: { createdAt: "desc" as const },
    take: Math.max((limit + 1) * 5, 100),
    select: feedPostSelect,
  })

  // Time-decay 점수 계산 후 정렬
  const now = Date.now()
  const scored = candidates
    .map((p) => {
      const ageHours = (now - p.createdAt.getTime()) / 3_600_000
      const score = (p.likeCount + 1) / Math.pow(ageHours + 2, 1.5)
      return { p, score }
    })
    .sort((a, b) => b.score - a.score)

  // 커서 기반 슬라이싱
  const cursorIdx = cursor ? scored.findIndex((s) => s.p.id === cursor) : -1
  const sliceFrom = cursorIdx >= 0 ? cursorIdx + 1 : 0
  const page = scored.slice(sliceFrom, sliceFrom + limit + 1)

  const hasMore = page.length > limit
  const sliced = hasMore ? page.slice(0, limit) : page
  const nextCursor = hasMore ? (sliced.at(-1)?.p.id ?? null) : null

  return NextResponse.json({
    success: true,
    data: {
      posts: sliced.map(({ p }) => ({
        id: p.id,
        type: p.type,
        content: p.content,
        contentId: p.contentId,
        metadata: p.metadata,
        locationTag: p.locationTag,
        hashtags: p.hashtags,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        repostCount: p.repostCount,
        createdAt: p.createdAt.toISOString(),
        source: "TRENDING",
        persona: {
          id: p.persona.id,
          name: p.persona.name,
          handle: p.persona.handle ?? "",
          tagline: p.persona.tagline,
          role: p.persona.role,
          profileImageUrl: p.persona.profileImageUrl,
          warmth: p.persona.warmth ? Number(p.persona.warmth) : 0.5,
        },
      })),
      nextCursor,
      hasMore,
    },
  })
}
