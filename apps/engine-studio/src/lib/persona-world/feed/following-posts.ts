// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Following Posts
// 구현계획서 §7, 설계서 §6.1
// 팔로우 중인 페르소나의 포스트 (시간순)
// ═══════════════════════════════════════════════════════════════

import type { FeedPost } from "../types"

/**
 * Following 피드 데이터 프로바이더.
 */
export interface FollowingPostsProvider {
  /** 유저가 팔로우 중인 페르소나 ID 목록 */
  getFollowingPersonaIds(userId: string): Promise<string[]>

  /** 특정 페르소나들의 최근 포스트 (시간순) */
  getRecentPostsByPersonas(personaIds: string[], limit: number, cursor?: string): Promise<string[]>
}

/**
 * 팔로잉 피드 조회.
 *
 * 설계서 §6.1: 60% × followingPosts(chronological)
 */
export async function getFollowingPosts(
  userId: string,
  limit: number,
  provider: FollowingPostsProvider,
  cursor?: string
): Promise<FeedPost[]> {
  const personaIds = await provider.getFollowingPersonaIds(userId)

  if (personaIds.length === 0) return []

  const postIds = await provider.getRecentPostsByPersonas(personaIds, limit, cursor)

  return postIds.map((postId) => ({
    postId,
    source: "following" as const,
  }))
}
