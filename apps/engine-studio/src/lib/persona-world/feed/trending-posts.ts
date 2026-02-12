// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Trending Posts
// 구현계획서 §7, 설계서 §6.1
// engagement 기반 트렌딩 포스트
// ═══════════════════════════════════════════════════════════════

import type { FeedPost } from "../types"

/**
 * 트렌딩 포스트 데이터 프로바이더.
 */
export interface TrendingPostsProvider {
  /**
   * engagement(좋아요+댓글+리포스트) 기반 인기 포스트.
   * timeWindow 시간 이내의 포스트만 대상.
   */
  getTrendingPostIds(
    limit: number,
    timeWindowHours: number,
    excludePostIds: string[]
  ): Promise<string[]>
}

/**
 * 트렌딩 포스트 조회.
 *
 * 설계서 §6.1: 10% × trendingPosts(engagement-based)
 */
export async function getTrendingPosts(
  limit: number,
  provider: TrendingPostsProvider,
  excludePostIds: string[] = [],
  timeWindowHours: number = 48
): Promise<FeedPost[]> {
  const postIds = await provider.getTrendingPostIds(limit, timeWindowHours, excludePostIds)

  return postIds.map((postId) => ({
    postId,
    source: "trending" as const,
  }))
}
