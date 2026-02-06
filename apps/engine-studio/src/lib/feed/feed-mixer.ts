/**
 * 피드 혼합 알고리즘
 *
 * 팔로우 기반 피드 (60%), 추천 피드 (30%), 트렌딩 피드 (10%)를
 * 가중치에 따라 혼합하여 최종 피드 생성
 */

export interface FeedPost {
  id: string
  type: "REVIEW" | "POST" | "COMMENT" | "REPOST"
  content: string
  authorId: string
  authorName: string
  authorHandle: string
  authorAvatar?: string
  createdAt: Date
  likesCount: number
  commentsCount: number
  repostsCount: number
  source: "following" | "recommended" | "trending"
  similarity?: number
  trendScore?: number
  reason?: string
  [key: string]: unknown
}

export interface FeedMixWeights {
  following: number
  recommended: number
  trending: number
}

export const DEFAULT_WEIGHTS: FeedMixWeights = {
  following: 0.6, // 60%
  recommended: 0.3, // 30%
  trending: 0.1, // 10%
}

export interface MixFeedInput {
  following: FeedPost[]
  recommended: FeedPost[]
  trending: FeedPost[]
  weights?: FeedMixWeights
  limit?: number
  deduplicate?: boolean
}

export interface MixedFeed {
  posts: FeedPost[]
  meta: {
    totalFollowing: number
    totalRecommended: number
    totalTrending: number
    actualFollowing: number
    actualRecommended: number
    actualTrending: number
  }
}

/**
 * 세 가지 피드 소스를 가중치에 따라 혼합
 *
 * 알고리즘:
 * 1. 각 소스에서 가중치 비율만큼 게시물 선택
 * 2. 중복 제거 (같은 게시물이 여러 소스에 있을 수 있음)
 * 3. 시간순 + 소스 다양성을 고려한 인터리빙
 */
export function mixFeed(input: MixFeedInput): MixedFeed {
  const {
    following,
    recommended,
    trending,
    weights = DEFAULT_WEIGHTS,
    limit = 50,
    deduplicate = true,
  } = input

  // 가중치 정규화
  const totalWeight = weights.following + weights.recommended + weights.trending
  const normalizedWeights = {
    following: weights.following / totalWeight,
    recommended: weights.recommended / totalWeight,
    trending: weights.trending / totalWeight,
  }

  // 각 소스에서 선택할 개수 계산
  const counts = {
    following: Math.floor(limit * normalizedWeights.following),
    recommended: Math.floor(limit * normalizedWeights.recommended),
    trending: Math.floor(limit * normalizedWeights.trending),
  }

  // 반올림 오차로 인한 부족분은 following에 추가
  const remaining = limit - (counts.following + counts.recommended + counts.trending)
  counts.following += remaining

  // 각 소스에서 게시물 선택 (시간순 정렬)
  const selectedFollowing = [...following]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, counts.following)
    .map((post) => ({ ...post, source: "following" as const }))

  const selectedRecommended = [...recommended]
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, counts.recommended)
    .map((post) => ({ ...post, source: "recommended" as const }))

  const selectedTrending = [...trending]
    .sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0))
    .slice(0, counts.trending)
    .map((post) => ({ ...post, source: "trending" as const }))

  // 중복 제거
  let allPosts = [...selectedFollowing, ...selectedRecommended, ...selectedTrending]

  if (deduplicate) {
    const seen = new Set<string>()
    allPosts = allPosts.filter((post) => {
      if (seen.has(post.id)) {
        return false
      }
      seen.add(post.id)
      return true
    })
  }

  // 인터리빙으로 다양성 확보
  const interleavedPosts = interleaveBySource(allPosts)

  // 최종 개수 제한
  const finalPosts = interleavedPosts.slice(0, limit)

  return {
    posts: finalPosts,
    meta: {
      totalFollowing: following.length,
      totalRecommended: recommended.length,
      totalTrending: trending.length,
      actualFollowing: finalPosts.filter((p) => p.source === "following").length,
      actualRecommended: finalPosts.filter((p) => p.source === "recommended").length,
      actualTrending: finalPosts.filter((p) => p.source === "trending").length,
    },
  }
}

/**
 * 소스별로 인터리빙하여 다양성 확보
 *
 * 예: [F, F, F, R, R, T] → [F, R, F, T, F, R]
 */
function interleaveBySource(posts: FeedPost[]): FeedPost[] {
  const bySource = {
    following: posts.filter((p) => p.source === "following"),
    recommended: posts.filter((p) => p.source === "recommended"),
    trending: posts.filter((p) => p.source === "trending"),
  }

  const result: FeedPost[] = []
  const indices = { following: 0, recommended: 0, trending: 0 }
  const sources: (keyof typeof bySource)[] = ["following", "recommended", "trending"]

  let sourceIndex = 0
  const totalPosts = posts.length

  while (result.length < totalPosts) {
    let added = false

    // 3개 소스를 순환하면서 하나씩 추가
    for (let i = 0; i < sources.length; i++) {
      const source = sources[(sourceIndex + i) % sources.length]
      const idx = indices[source]

      if (idx < bySource[source].length) {
        result.push(bySource[source][idx])
        indices[source]++
        added = true
        sourceIndex = (sourceIndex + i + 1) % sources.length
        break
      }
    }

    // 모든 소스가 소진되면 종료
    if (!added) break
  }

  return result
}

/**
 * 피드를 시간순으로 정렬
 */
export function sortByTime(posts: FeedPost[], order: "asc" | "desc" = "desc"): FeedPost[] {
  return [...posts].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime()
    const timeB = new Date(b.createdAt).getTime()
    return order === "desc" ? timeB - timeA : timeA - timeB
  })
}

/**
 * 피드를 점수순으로 정렬 (트렌딩 또는 유사도)
 */
export function sortByScore(
  posts: FeedPost[],
  scoreType: "trending" | "similarity" = "trending"
): FeedPost[] {
  return [...posts].sort((a, b) => {
    if (scoreType === "trending") {
      return (b.trendScore ?? 0) - (a.trendScore ?? 0)
    }
    return (b.similarity ?? 0) - (a.similarity ?? 0)
  })
}

/**
 * 피드 페이지네이션
 */
export function paginateFeed(
  posts: FeedPost[],
  page: number = 1,
  limit: number = 20
): {
  posts: FeedPost[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
} {
  const start = (page - 1) * limit
  const end = start + limit
  const paginatedPosts = posts.slice(start, end)

  return {
    posts: paginatedPosts,
    pagination: {
      page,
      limit,
      total: posts.length,
      hasMore: end < posts.length,
    },
  }
}

/**
 * 커서 기반 페이지네이션
 */
export function paginateFeedByCursor(
  posts: FeedPost[],
  cursor?: string,
  limit: number = 20
): {
  posts: FeedPost[]
  nextCursor: string | null
  hasMore: boolean
} {
  let startIndex = 0

  if (cursor) {
    const cursorIndex = posts.findIndex((p) => p.id === cursor)
    if (cursorIndex >= 0) {
      startIndex = cursorIndex + 1
    }
  }

  const paginatedPosts = posts.slice(startIndex, startIndex + limit)
  const hasMore = startIndex + limit < posts.length
  const nextCursor = paginatedPosts.length > 0 ? paginatedPosts[paginatedPosts.length - 1].id : null

  return {
    posts: paginatedPosts,
    nextCursor,
    hasMore,
  }
}
