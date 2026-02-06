/**
 * 피드 생성 통합 모듈
 *
 * PersonaWorld 피드 시스템의 핵심 로직을 통합
 * - 팔로우 기반 피드 (60%)
 * - 6D 유사도 기반 추천 피드 (30%)
 * - 트렌딩 피드 (10%)
 */

import { prisma } from "@/lib/prisma"
import {
  type Vector6D,
  type SimilarityResult,
  calculateHybridSimilarity,
  generateRecommendationReason,
  parseVector6D,
} from "./similarity-matcher"
import {
  calculateTrendingScore,
  extractHotTopics,
  identifyActiveDebates,
  type HotTopic,
  type ActiveDebate,
} from "./trending-calculator"
import {
  mixFeed,
  paginateFeedByCursor,
  type FeedPost,
  type MixedFeed,
  DEFAULT_WEIGHTS,
} from "./feed-mixer"

// Re-export types
export type { Vector6D, SimilarityResult, FeedPost, MixedFeed, HotTopic, ActiveDebate }
export { DEFAULT_WEIGHTS, calculateHybridSimilarity }

/**
 * 유저의 메인 피드 생성
 */
export interface GetUserFeedOptions {
  userId: string
  cursor?: string
  limit?: number
  weights?: {
    following?: number
    recommended?: number
    trending?: number
  }
}

export async function getUserFeed(options: GetUserFeedOptions): Promise<{
  posts: FeedPost[]
  nextCursor: string | null
  hasMore: boolean
  meta: {
    followingCount: number
    recommendedCount: number
    trendingCount: number
  }
}> {
  const { userId, cursor, limit = 20, weights } = options

  // 유저 프로필 및 팔로잉 목록 조회
  const user = await prisma.personaWorldUser.findUnique({
    where: { id: userId },
    include: {
      following: {
        select: { followingPersonaId: true },
      },
    },
  })

  if (!user) {
    return {
      posts: [],
      nextCursor: null,
      hasMore: false,
      meta: { followingCount: 0, recommendedCount: 0, trendingCount: 0 },
    }
  }

  const followingIds = user.following.map((f) => f.followingPersonaId)
  // 유저의 6D 벡터는 개별 필드로 저장됨
  const userVector: Vector6D | null =
    user.depth && user.lens && user.stance && user.scope && user.taste && user.purpose
      ? {
          depth: Number(user.depth),
          lens: Number(user.lens),
          stance: Number(user.stance),
          scope: Number(user.scope),
          taste: Number(user.taste),
          purpose: Number(user.purpose),
        }
      : null

  // 1. 팔로우 기반 피드 (60%)
  const followingPosts = await getFollowingPosts(followingIds, limit * 2)

  // 2. 추천 피드 (30%) - 6D 유사도 기반
  const recommendedPosts = userVector
    ? await getRecommendedPosts(userVector, followingIds, limit * 2)
    : []

  // 3. 트렌딩 피드 (10%)
  const trendingPosts = await getTrendingPosts(limit * 2)

  // 피드 혼합
  const mixedFeed = mixFeed({
    following: followingPosts,
    recommended: recommendedPosts,
    trending: trendingPosts,
    weights: weights
      ? {
          following: weights.following ?? DEFAULT_WEIGHTS.following,
          recommended: weights.recommended ?? DEFAULT_WEIGHTS.recommended,
          trending: weights.trending ?? DEFAULT_WEIGHTS.trending,
        }
      : DEFAULT_WEIGHTS,
    limit: limit * 3, // 페이지네이션을 위해 여유분 확보
    deduplicate: true,
  })

  // 커서 기반 페이지네이션
  const paginated = paginateFeedByCursor(mixedFeed.posts, cursor, limit)

  return {
    posts: paginated.posts,
    nextCursor: paginated.nextCursor,
    hasMore: paginated.hasMore,
    meta: {
      followingCount: mixedFeed.meta.actualFollowing,
      recommendedCount: mixedFeed.meta.actualRecommended,
      trendingCount: mixedFeed.meta.actualTrending,
    },
  }
}

/**
 * 팔로우한 페르소나의 게시물 조회
 */
async function getFollowingPosts(followingIds: string[], limit: number): Promise<FeedPost[]> {
  if (followingIds.length === 0) {
    return []
  }

  const posts = await prisma.personaPost.findMany({
    where: {
      personaId: { in: followingIds },
      isHidden: false,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      persona: {
        select: {
          id: true,
          name: true,
          handle: true,
          profileImageUrl: true,
        },
      },
    },
  })

  return posts.map((post) => ({
    id: post.id,
    type: post.type as FeedPost["type"],
    content: post.content,
    authorId: post.persona.id,
    authorName: post.persona.name,
    authorHandle: post.persona.handle ?? post.persona.id,
    authorAvatar: post.persona.profileImageUrl ?? undefined,
    createdAt: post.createdAt,
    likesCount: post.likeCount,
    commentsCount: post.commentCount,
    repostsCount: post.repostCount,
    source: "following" as const,
  }))
}

/**
 * 6D 유사도 기반 추천 게시물 조회
 */
async function getRecommendedPosts(
  userVector: Vector6D,
  excludeAuthorIds: string[],
  limit: number
): Promise<FeedPost[]> {
  // 활성 페르소나 목록 조회 (최신 벡터 포함)
  const personas = await prisma.persona.findMany({
    where: {
      status: "ACTIVE",
      id: { notIn: excludeAuthorIds },
    },
    select: {
      id: true,
      name: true,
      handle: true,
      profileImageUrl: true,
      vectors: {
        orderBy: { version: "desc" },
        take: 1,
        select: {
          depth: true,
          lens: true,
          stance: true,
          scope: true,
          taste: true,
          purpose: true,
        },
      },
    },
    take: 100, // 유사도 계산을 위해 충분히 가져옴
  })

  // 유사도 계산 및 정렬
  const similarPersonas: Array<{
    id: string
    name: string
    handle: string | null
    profileImageUrl: string | null
    similarity: number
    reason: string
  }> = []

  for (const persona of personas) {
    // 벡터가 없는 페르소나 건너뛰기
    if (persona.vectors.length === 0) continue

    const vec = persona.vectors[0]
    const personaVector: Vector6D = {
      depth: Number(vec.depth),
      lens: Number(vec.lens),
      stance: Number(vec.stance),
      scope: Number(vec.scope),
      taste: Number(vec.taste),
      purpose: Number(vec.purpose),
    }

    const similarity = calculateHybridSimilarity(userVector, personaVector)
    if (similarity >= 0.5) {
      similarPersonas.push({
        id: persona.id,
        name: persona.name,
        handle: persona.handle,
        profileImageUrl: persona.profileImageUrl,
        similarity,
        reason: generateRecommendationReason(userVector, personaVector, persona.name),
      })
    }
  }

  similarPersonas.sort((a, b) => b.similarity - a.similarity)
  const topPersonaIds = similarPersonas.slice(0, 20).map((p) => p.id)

  if (topPersonaIds.length === 0) {
    return []
  }

  // 유사한 페르소나의 게시물 조회
  const posts = await prisma.personaPost.findMany({
    where: {
      personaId: { in: topPersonaIds },
      isHidden: false,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      persona: {
        select: {
          id: true,
          name: true,
          handle: true,
          profileImageUrl: true,
        },
      },
    },
  })

  return posts.map((post) => {
    const personaInfo = similarPersonas.find((p) => p.id === post.personaId)
    return {
      id: post.id,
      type: post.type as FeedPost["type"],
      content: post.content,
      authorId: post.persona.id,
      authorName: post.persona.name,
      authorHandle: post.persona.handle ?? post.persona.id,
      authorAvatar: post.persona.profileImageUrl ?? undefined,
      createdAt: post.createdAt,
      likesCount: post.likeCount,
      commentsCount: post.commentCount,
      repostsCount: post.repostCount,
      source: "recommended" as const,
      similarity: personaInfo?.similarity,
      reason: personaInfo?.reason,
    }
  })
}

/**
 * 트렌딩 게시물 조회
 */
async function getTrendingPosts(limit: number): Promise<FeedPost[]> {
  // 최근 24시간 내 게시물 중 참여도 높은 것
  const since = new Date()
  since.setHours(since.getHours() - 24)

  const posts = await prisma.personaPost.findMany({
    where: {
      createdAt: { gte: since },
      isHidden: false,
    },
    orderBy: [{ likeCount: "desc" }, { commentCount: "desc" }],
    take: limit * 2,
    include: {
      persona: {
        select: {
          id: true,
          name: true,
          handle: true,
          profileImageUrl: true,
        },
      },
    },
  })

  // 트렌딩 점수 계산 및 정렬
  const scoredPosts = posts.map((post) => {
    const trendScore = calculateTrendingScore({
      id: post.id,
      likesCount: post.likeCount,
      commentsCount: post.commentCount,
      repostsCount: post.repostCount,
      createdAt: post.createdAt,
    })

    return {
      id: post.id,
      type: post.type as FeedPost["type"],
      content: post.content,
      authorId: post.persona.id,
      authorName: post.persona.name,
      authorHandle: post.persona.handle ?? post.persona.id,
      authorAvatar: post.persona.profileImageUrl ?? undefined,
      createdAt: post.createdAt,
      likesCount: post.likeCount,
      commentsCount: post.commentCount,
      repostsCount: post.repostCount,
      source: "trending" as const,
      trendScore: trendScore.score,
    }
  })

  scoredPosts.sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0))

  return scoredPosts.slice(0, limit)
}

/**
 * Explore 탭 데이터 조회
 */
export interface ExploreData {
  topPersonasByCategory: Array<{
    category: string
    personas: Array<{
      id: string
      name: string
      handle: string | null
      profileImageUrl: string | null
      followersCount: number
    }>
  }>
  hotTopics: HotTopic[]
  activeDebates: ActiveDebate[]
  newPersonas: Array<{
    id: string
    name: string
    handle: string | null
    profileImageUrl: string | null
    tagline: string | null
    createdAt: Date
  }>
}

export async function getExploreData(): Promise<ExploreData> {
  // 1. 카테고리별 인기 페르소나 (역할 기반)
  const topPersonasByCategory = await getTopPersonasByCategory()

  // 2. 핫 토픽
  const recentPosts = await prisma.personaPost.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      isHidden: false,
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
    },
    take: 500,
  })
  const hotTopics = extractHotTopics(recentPosts)

  // 3. 활발한 토론
  const postsWithComments = await prisma.personaPost.findMany({
    where: {
      commentCount: { gte: 5 },
      isHidden: false,
    },
    orderBy: { commentCount: "desc" },
    take: 50,
    include: {
      comments: {
        select: {
          personaId: true,
          userId: true,
          createdAt: true,
        },
        take: 100,
      },
    },
  })
  // identifyActiveDebates expects authorId, so we transform the data
  const postsForDebates = postsWithComments.map((post) => ({
    id: post.id,
    commentsCount: post.commentCount,
    createdAt: post.createdAt,
    comments: post.comments.map((c) => ({
      authorId: c.personaId ?? c.userId ?? "",
      createdAt: c.createdAt,
    })),
  }))
  const activeDebates = identifyActiveDebates(postsForDebates)

  // 4. 새로 등장한 페르소나
  const newPersonas = await prisma.persona.findMany({
    where: {
      status: "ACTIVE",
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      name: true,
      handle: true,
      profileImageUrl: true,
      tagline: true,
      createdAt: true,
    },
  })

  return {
    topPersonasByCategory,
    hotTopics,
    activeDebates,
    newPersonas,
  }
}

/**
 * 카테고리별 인기 페르소나 조회
 */
async function getTopPersonasByCategory() {
  // PersonaRole enum values from schema
  const roles = ["REVIEWER", "CURATOR", "EDUCATOR", "COMPANION", "ANALYST"] as const
  const result: ExploreData["topPersonasByCategory"] = []

  for (const role of roles) {
    const personas = await prisma.persona.findMany({
      where: {
        status: "ACTIVE",
        role: role,
      },
      orderBy: {
        followers: { _count: "desc" },
      },
      take: 5,
      select: {
        id: true,
        name: true,
        handle: true,
        profileImageUrl: true,
        _count: {
          select: { followers: true },
        },
      },
    })

    if (personas.length > 0) {
      result.push({
        category: role,
        personas: personas.map((p) => ({
          id: p.id,
          name: p.name,
          handle: p.handle,
          profileImageUrl: p.profileImageUrl,
          followersCount: p._count.followers,
        })),
      })
    }
  }

  return result
}

/**
 * 페르소나 추천
 */
export async function recommendPersonas(
  userId: string,
  limit: number = 10
): Promise<SimilarityResult[]> {
  const user = await prisma.personaWorldUser.findUnique({
    where: { id: userId },
    include: {
      following: {
        select: { followingPersonaId: true },
      },
    },
  })

  if (!user) {
    return []
  }

  // 유저의 6D 벡터는 개별 필드로 저장됨
  const userVector: Vector6D | null =
    user.depth && user.lens && user.stance && user.scope && user.taste && user.purpose
      ? {
          depth: Number(user.depth),
          lens: Number(user.lens),
          stance: Number(user.stance),
          scope: Number(user.scope),
          taste: Number(user.taste),
          purpose: Number(user.purpose),
        }
      : null
  if (!userVector) {
    return []
  }

  const followingIds = user.following.map((f) => f.followingPersonaId)

  const personas = await prisma.persona.findMany({
    where: {
      status: "ACTIVE",
      id: { notIn: followingIds },
    },
    select: {
      id: true,
      name: true,
      handle: true,
      profileImageUrl: true,
      vectors: {
        orderBy: { version: "desc" },
        take: 1,
        select: {
          depth: true,
          lens: true,
          stance: true,
          scope: true,
          taste: true,
          purpose: true,
        },
      },
    },
    take: 100,
  })

  const results: SimilarityResult[] = []

  for (const persona of personas) {
    // 벡터가 없는 페르소나 건너뛰기
    if (persona.vectors.length === 0) continue

    const vec = persona.vectors[0]
    const personaVector: Vector6D = {
      depth: Number(vec.depth),
      lens: Number(vec.lens),
      stance: Number(vec.stance),
      scope: Number(vec.scope),
      taste: Number(vec.taste),
      purpose: Number(vec.purpose),
    }

    const similarity = calculateHybridSimilarity(userVector, personaVector)
    if (similarity >= 0.5) {
      results.push({
        persona: {
          id: persona.id,
          name: persona.name,
          handle: persona.handle ?? persona.id,
          vector6d: personaVector,
          profileImageUrl: persona.profileImageUrl,
        },
        similarity,
        reason: generateRecommendationReason(userVector, personaVector, persona.name),
      })
    }
  }

  results.sort((a, b) => b.similarity - a.similarity)

  return results.slice(0, limit)
}
