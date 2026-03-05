import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"
import { generateFeed } from "@/lib/persona-world/feed/feed-engine"
import type { FeedDataProvider } from "@/lib/persona-world/feed/feed-engine"
import type { RecommendedCandidate } from "@/lib/persona-world/feed/recommended-posts"
import { matchAll } from "@/lib/matching/three-tier-engine"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import { calculateVFinal } from "@/lib/vector/v-final"
import { DEFAULT_L1_VECTOR, DEFAULT_L2_VECTOR, DEFAULT_L3_VECTOR } from "@/constants/v3/dimensions"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import type {
  UserProfile,
  PersonaCandidate,
  MatchingContext,
} from "@/lib/matching/three-tier-engine"
import type {
  EnrichedMatchingContext,
  PersonaEnrichedSignals,
  UserEnrichedContext,
  EngagementSignal,
  ConsumptionSignal,
  ExposureSignal,
} from "@/lib/matching/context-enricher"

// ── 공통 select / 응답 빌더 ──────────────────────────────────

const postSelect = {
  id: true,
  type: true,
  content: true,
  contentId: true,
  metadata: true,
  locationTag: true,
  hashtags: true,
  likeCount: true,
  repostCount: true,
  createdAt: true,
  _count: {
    select: { comments: { where: { isHidden: false } } },
  },
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
        hashtags: p.hashtags ?? [],
        likeCount: p.likeCount,
        commentCount: p._count.comments,
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

// ── 벡터 기반 추천 후보 빌더 ─────────────────────────────────

const L1_KEYS = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"] as const
const L2_KEYS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const
const L3_KEYS = ["lack", "moralCompass", "volatility", "growthArc"] as const

/**
 * PersonaWorldUser 벡터 → matchAll() 호출 → RecommendedCandidate[] 반환.
 *
 * 유저의 L1/L2 벡터가 존재하지 않으면 null 반환 (fallback to likeCount).
 */
async function buildVectorCandidates(
  userId: string,
  limit: number,
  excludePostIds: string[]
): Promise<RecommendedCandidate[] | null> {
  // 1. PersonaWorldUser 벡터 조회
  const pwUser = await prisma.personaWorldUser.findUnique({
    where: { id: userId },
    select: {
      depth: true,
      lens: true,
      stance: true,
      scope: true,
      taste: true,
      purpose: true,
      sociability: true,
      openness: true,
      conscientiousness: true,
      extraversion: true,
      agreeableness: true,
      neuroticism: true,
      hasOceanProfile: true,
    },
  })

  // L1 벡터가 없으면 (온보딩 미완료) null → fallback
  if (!pwUser || pwUser.depth === null) return null

  // 2. UserProfile 조립
  const l1: SocialPersonaVector = Object.fromEntries(
    L1_KEYS.map((k) => [k, Number(pwUser[k] ?? DEFAULT_L1_VECTOR[k])])
  ) as unknown as SocialPersonaVector

  const l2: CoreTemperamentVector = pwUser.hasOceanProfile
    ? (Object.fromEntries(
        L2_KEYS.map((k) => [k, Number(pwUser[k] ?? DEFAULT_L2_VECTOR[k])])
      ) as unknown as CoreTemperamentVector)
    : { ...DEFAULT_L2_VECTOR }

  const l3: NarrativeDriveVector = { ...DEFAULT_L3_VECTOR }

  const vFinal = calculateVFinal(l1, l2, l3)
  const crossAxisProfile = calculateCrossAxisProfile(l1, l2, l3)
  const paradoxProfile = calculateExtendedParadoxScore(l1, l2, l3)

  const userProfile: UserProfile = {
    id: userId,
    l1,
    l2,
    l3,
    vFinal,
    crossAxisProfile,
    paradoxProfile,
  }

  // 3. 활성 페르소나 + LayerVector 조회
  const personas = await prisma.persona.findMany({
    where: { status: { in: ["ACTIVE", "STANDARD"] } },
    select: {
      id: true,
      name: true,
      archetypeId: true,
      layerVectors: {
        select: {
          layerType: true,
          dim1: true,
          dim2: true,
          dim3: true,
          dim4: true,
          dim5: true,
          dim6: true,
          dim7: true,
        },
      },
    },
  })

  // 4. PersonaCandidate[] 조립
  const candidates: PersonaCandidate[] = personas.map((p) => {
    const socialVec = p.layerVectors.find((v) => v.layerType === "SOCIAL")
    const tempVec = p.layerVectors.find((v) => v.layerType === "TEMPERAMENT")
    const narrVec = p.layerVectors.find((v) => v.layerType === "NARRATIVE")

    const pL1: SocialPersonaVector = socialVec
      ? (Object.fromEntries(
          L1_KEYS.map((k, i) => [
            k,
            Number(socialVec[`dim${i + 1}` as keyof typeof socialVec] ?? DEFAULT_L1_VECTOR[k]),
          ])
        ) as unknown as SocialPersonaVector)
      : { ...DEFAULT_L1_VECTOR }

    const pL2: CoreTemperamentVector = tempVec
      ? (Object.fromEntries(
          L2_KEYS.map((k, i) => [
            k,
            Number(tempVec[`dim${i + 1}` as keyof typeof tempVec] ?? DEFAULT_L2_VECTOR[k]),
          ])
        ) as unknown as CoreTemperamentVector)
      : { ...DEFAULT_L2_VECTOR }

    const pL3: NarrativeDriveVector = narrVec
      ? (Object.fromEntries(
          L3_KEYS.map((k, i) => [
            k,
            Number(narrVec[`dim${i + 1}` as keyof typeof narrVec] ?? DEFAULT_L3_VECTOR[k]),
          ])
        ) as unknown as NarrativeDriveVector)
      : { ...DEFAULT_L3_VECTOR }

    return {
      id: p.id,
      name: p.name,
      l1: pL1,
      l2: pL2,
      l3: pL3,
      crossAxisProfile: calculateCrossAxisProfile(pL1, pL2, pL3),
      paradoxProfile: calculateExtendedParadoxScore(pL1, pL2, pL3),
      archetype: p.archetypeId ?? undefined,
    } satisfies PersonaCandidate
  })

  if (candidates.length === 0) return null

  // 5. Enrichment Context 조립 (DB 3개 병렬 조회)
  const personaIds = candidates.map((c) => c.id)
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [userLikes, personaEngagement, personaConsumption, userPreferences] = await Promise.all([
    // 유저가 최근 7일간 각 페르소나 포스트에 남긴 좋아요 (ExposureSignal 프록시)
    prisma.personaPostLike.findMany({
      where: {
        userId: userId,
        createdAt: { gte: since7d },
        post: { personaId: { in: personaIds } },
      },
      select: { createdAt: true, post: { select: { personaId: true } } },
    }),
    // 페르소나별 최근 30일 포스트 engagement 집계
    prisma.personaPost.groupBy({
      by: ["personaId"],
      where: { personaId: { in: personaIds }, createdAt: { gte: since30d }, isHidden: false },
      _avg: { likeCount: true },
      _count: { id: true },
    }),
    // 페르소나별 ConsumptionLog 태그 + 평균 rating
    prisma.consumptionLog.findMany({
      where: { personaId: { in: personaIds } },
      select: { personaId: true, tags: true, rating: true },
      orderBy: { consumedAt: "desc" },
      take: personaIds.length * 20, // 페르소나당 최대 20건
    }),
    // 유저 선호 태그 (preferences JSON)
    prisma.personaWorldUser.findUnique({
      where: { id: userId },
      select: { preferences: true },
    }),
  ])

  // exposure: personaId → { count, lastAt }
  const exposureMap = new Map<string, { count: number; lastAt: Date | null }>()
  for (const like of userLikes) {
    const pid = like.post.personaId
    const cur = exposureMap.get(pid) ?? { count: 0, lastAt: null }
    cur.count += 1
    if (!cur.lastAt || like.createdAt > cur.lastAt) cur.lastAt = like.createdAt
    exposureMap.set(pid, cur)
  }

  // engagement: personaId → EngagementSignal
  const engagementMap = new Map<string, EngagementSignal>()
  for (const row of personaEngagement) {
    engagementMap.set(row.personaId, {
      avgLikes: Number(row._avg.likeCount ?? 0),
      avgComments: 0,
      postCount30d: row._count.id,
      engagementVelocity: 1.0,
    })
  }

  // consumption: personaId → ConsumptionSignal
  const consumptionRaw = new Map<string, { tags: string[]; ratings: number[] }>()
  for (const log of personaConsumption) {
    const cur = consumptionRaw.get(log.personaId) ?? { tags: [], ratings: [] }
    cur.tags.push(...log.tags)
    if (log.rating !== null) cur.ratings.push(Number(log.rating))
    consumptionRaw.set(log.personaId, cur)
  }
  const consumptionMap = new Map<string, ConsumptionSignal>()
  for (const [pid, { tags, ratings }] of consumptionRaw) {
    // 태그 빈도 집계 → 상위 5개
    const freq = new Map<string, number>()
    for (const t of tags) freq.set(t, (freq.get(t) ?? 0) + 1)
    const topTags = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t)
    const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0.5
    consumptionMap.set(pid, { topTags, avgRating, contentTypeDistribution: {} })
  }

  // 유저 선호 태그 (preferences.favoriteGenres 등)
  const prefJson = userPreferences?.preferences as Record<string, unknown> | null
  const preferredTags: string[] = Array.isArray(prefJson?.favoriteGenres)
    ? (prefJson.favoriteGenres as string[])
    : []

  // EnrichedMatchingContext 조립
  const personaSignals = new Map<string, PersonaEnrichedSignals>()
  for (const pid of personaIds) {
    const exposure = exposureMap.get(pid)
    const daysSince = exposure?.lastAt
      ? Math.floor((Date.now() - exposure.lastAt.getTime()) / 86400000)
      : 999

    const signals: PersonaEnrichedSignals = {
      exposure: {
        appearanceCount7d: exposure?.count ?? 0,
        lastShownAt: exposure?.lastAt ?? null,
        daysSinceLastShown: daysSince,
      } satisfies ExposureSignal,
      engagement: engagementMap.get(pid),
      consumption: consumptionMap.get(pid),
    }
    personaSignals.set(pid, signals)
  }

  const userContext: UserEnrichedContext = {
    preferredTags: preferredTags.length > 0 ? preferredTags : undefined,
  }

  const enrichment: EnrichedMatchingContext = { personaSignals, userContext }

  const matchingContext: MatchingContext = { enrichment }

  console.log(
    `[feed/enrichment] userId=${userId} personas=${personaIds.length} ` +
      `exposure_signals=${exposureMap.size} consumption_signals=${consumptionMap.size}`
  )

  // 6. matchAll() with enrichment
  const matchResults = matchAll(userProfile, candidates, undefined, matchingContext)

  // 6. personaId별 tier별 best score 집계
  const scoreMap = new Map<
    string,
    { basicScore: number; explorationScore: number; advancedScore: number }
  >()
  for (const result of matchResults) {
    const existing = scoreMap.get(result.personaId) ?? {
      basicScore: 0,
      explorationScore: 0,
      advancedScore: 0,
    }
    if (result.tier === "basic") existing.basicScore = Math.max(existing.basicScore, result.score)
    if (result.tier === "exploration")
      existing.explorationScore = Math.max(existing.explorationScore, result.score)
    if (result.tier === "advanced")
      existing.advancedScore = Math.max(existing.advancedScore, result.score)
    scoreMap.set(result.personaId, existing)
  }

  // 7. 매칭된 페르소나 상위 N개의 최근 포스트 조회
  const topPersonaIds = [...scoreMap.entries()]
    .sort((a, b) => {
      const aMax = Math.max(a[1].basicScore, a[1].explorationScore, a[1].advancedScore)
      const bMax = Math.max(b[1].basicScore, b[1].explorationScore, b[1].advancedScore)
      return bMax - aMax
    })
    .slice(0, 10)
    .map(([id]) => id)

  const recentPosts = await prisma.personaPost.findMany({
    where: {
      personaId: { in: topPersonaIds },
      isHidden: false,
      id: { notIn: excludePostIds },
    },
    orderBy: { createdAt: "desc" },
    take: limit * 3,
    select: { id: true, personaId: true },
  })

  // 8. 포스트에 매칭 스코어 할당
  const result: RecommendedCandidate[] = recentPosts.map((post) => {
    const scores = scoreMap.get(post.personaId) ?? {
      basicScore: 0.5,
      explorationScore: 0.5,
      advancedScore: 0.5,
    }
    return {
      postId: post.id,
      personaId: post.personaId,
      basicScore: scores.basicScore,
      explorationScore: scores.explorationScore,
      advancedScore: scores.advancedScore,
    }
  })

  return result.length > 0 ? result : null
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
      orderBy: [{ likeCount: "desc" as const }, { createdAt: "desc" as const }],
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
      uid: string,
      lim: number,
      excludePostIds: string[]
    ): Promise<RecommendedCandidate[]> {
      // 벡터 기반 3-Tier 매칭 시도
      const vectorCandidates = await buildVectorCandidates(uid, lim, excludePostIds)
      if (vectorCandidates) return vectorCandidates

      // Fallback: 유저 벡터 없는 경우 likeCount 기반 정렬
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

  const TIER_REASONS: Record<string, string> = {
    basic: "취향 기반",
    exploration: "새로운 발견",
    advanced: "깊은 일치",
  }

  const postIds = feedResult.posts.map((p) => p.postId)
  const sourceMap = new Map(feedResult.posts.map((p) => [p.postId, p.source]))
  const scoreMap2 = new Map(feedResult.posts.map((p) => [p.postId, p.matchingScore]))

  const dbPosts =
    postIds.length > 0
      ? await prisma.personaPost.findMany({
          where: { id: { in: postIds } },
          select: postSelect,
        })
      : []

  const postMap = new Map(dbPosts.map((p) => [p.id, p]))
  const enrichedPosts = postIds
    .map((id) => {
      const p = postMap.get(id)
      if (!p) return null
      const src = sourceMap.get(id) ?? "RECOMMENDED"
      const matchingScore = scoreMap2.get(id)
      const tier = src as string
      const matchContext =
        tier in TIER_REASONS && matchingScore !== undefined
          ? {
              tier,
              personaMatchScore: Math.round(matchingScore * 100) / 100,
              reason: TIER_REASONS[tier],
            }
          : null

      return {
        id: p.id,
        type: p.type,
        content: p.content,
        contentId: p.contentId,
        metadata: p.metadata,
        locationTag: p.locationTag,
        hashtags: p.hashtags ?? [],
        likeCount: p.likeCount,
        commentCount: p._count.comments,
        repostCount: p.repostCount,
        createdAt: p.createdAt.toISOString(),
        source: src,
        matchContext,
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
    orderBy: [{ likeCount: "desc" as const }, { createdAt: "desc" as const }],
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
