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
import { applyFeedEnhancements, type SocialBoostProvider } from "./social-boost"

/**
 * 피드 엔진 통합 프로바이더.
 */
export interface FeedDataProvider
  extends FollowingPostsProvider, RecommendedPostsProvider, TrendingPostsProvider {}

/** v4.0 피드 옵션 (optional) */
export interface FeedEnhancementOptions {
  socialBoostProvider?: SocialBoostProvider
}

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
  provider: FeedDataProvider,
  enhancementOptions?: FeedEnhancementOptions
): Promise<FeedResponse> {
  const limit = request.limit || FEED_DEFAULTS.pageSize

  const followingLimit = Math.round(limit * FEED_RATIOS.following)
  const recommendedLimit = Math.round(limit * FEED_RATIOS.recommended)
  const trendingLimit = limit - followingLimit - recommendedLimit

  // Following 먼저 조회
  const followingPosts = await getFollowingPosts(
    request.userId,
    followingLimit,
    provider,
    request.cursor
  )
  const followingIds = followingPosts.map((p) => p.postId)

  // Recommended: following과 중복 제거
  const recommended = await getRecommendedPosts(
    request.userId,
    recommendedLimit,
    provider,
    followingIds
  )
  const recommendedIds = [
    ...recommended.basic,
    ...recommended.exploration,
    ...recommended.advanced,
  ].map((p) => p.postId)

  // Trending: following + recommended 모두와 중복 제거
  const trendingPosts = await getTrendingPosts(trendingLimit, provider, [
    ...followingIds,
    ...recommendedIds,
  ])

  // 인터리빙
  let posts = interleaveFeed(
    followingPosts,
    recommended.basic,
    recommended.exploration,
    recommended.advanced,
    trendingPosts
  )

  // v4.0 T324: 소셜 부스트 + 봇 필터 적용
  if (enhancementOptions?.socialBoostProvider) {
    posts = await applyFeedEnhancements(
      posts,
      request.userId,
      enhancementOptions.socialBoostProvider
    )
  }

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
