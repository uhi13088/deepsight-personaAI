// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Feed Engine
// 구현계획서 §7, 설계서 §6.1
// Following 60% + Recommended 30% + Trending 10%
// ═══════════════════════════════════════════════════════════════

import type { FeedRequest, FeedResponse } from "../types"
import { FEED_RATIOS, FEED_DEFAULTS } from "../constants"
import { getFollowingPosts, type FollowingPostsProvider } from "./following-posts"
import { getRecommendedPosts, type RecommendedPostsProvider } from "./recommended-posts"
import { getTrendingPosts, type TrendingPostsProvider } from "./trending-posts"
import { interleaveFeed } from "./interleaver"

/**
 * 피드 엔진 통합 프로바이더.
 */
export interface FeedDataProvider
  extends FollowingPostsProvider, RecommendedPostsProvider, TrendingPostsProvider {}

/**
 * 피드 생성.
 *
 * 설계서 §6.1:
 * 유저 피드 = 60% following + 30% recommended + 10% trending
 *
 * 설계서 §6.5:
 * 인터리빙으로 다양성 보장 (같은 Tier 연속 방지)
 */
export async function generateFeed(
  request: FeedRequest,
  provider: FeedDataProvider
): Promise<FeedResponse> {
  const limit = request.limit || FEED_DEFAULTS.pageSize

  const followingLimit = Math.round(limit * FEED_RATIOS.following)
  const recommendedLimit = Math.round(limit * FEED_RATIOS.recommended)
  const trendingLimit = limit - followingLimit - recommendedLimit

  // 병렬 조회
  const [followingPosts, recommended, trendingPosts] = await Promise.all([
    getFollowingPosts(request.userId, followingLimit, provider, request.cursor),
    getRecommendedPosts(request.userId, recommendedLimit, provider),
    getTrendingPosts(trendingLimit, provider),
  ])

  // 인터리빙
  const posts = interleaveFeed(
    followingPosts,
    recommended.basic,
    recommended.exploration,
    recommended.advanced,
    trendingPosts
  )

  return {
    posts,
    nextCursor: posts.length >= limit ? (posts[posts.length - 1]?.postId ?? null) : null,
    meta: {
      tierDistribution: {
        following: followingPosts.length,
        basic: recommended.basic.length,
        exploration: recommended.exploration.length,
        advanced: recommended.advanced.length,
        trending: trendingPosts.length,
      },
    },
  }
}
