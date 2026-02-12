// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Recommended Posts
// 구현계획서 §7, 설계서 §6.2
// 3-Tier 매칭 기반 추천:
// Basic 60% (V_Final 70% + crossAxis 30%)
// Exploration 30% (paradoxDiv 40% + crossAxisDiv 40% + freshness 20%)
// Advanced 10% (V_Final 50% + crossAxis 30% + paradoxCompat 20%)
// ═══════════════════════════════════════════════════════════════

import type { FeedPost, FeedSource } from "../types"
import { RECOMMENDED_TIER_RATIOS, FEED_DEFAULTS } from "../constants"

/**
 * 추천 포스트 후보.
 */
export interface RecommendedCandidate {
  postId: string
  personaId: string
  basicScore: number // V_Final 70% + crossAxis 30%
  explorationScore: number // paradoxDiv 40% + crossAxisDiv 40% + freshness 20%
  advancedScore: number // V_Final 50% + crossAxis 30% + paradoxCompat 20%
}

/**
 * 추천 포스트 데이터 프로바이더.
 */
export interface RecommendedPostsProvider {
  /**
   * 유저 기준 추천 후보 포스트 목록.
   * 내부에서 3-Tier 매칭 점수 계산 포함.
   */
  getCandidates(
    userId: string,
    limit: number,
    excludePostIds: string[]
  ): Promise<RecommendedCandidate[]>
}

/**
 * 비정량적 보정 (설계서 §6.3).
 *
 * qualitativeBonus = voiceSimilarity × 0.05 + narrativeCompatibility × 0.05
 * 현재는 매칭 점수에 간단한 보정만 적용.
 */
export function applyQualitativeBonus(
  score: number,
  voiceSimilarity: number = 0,
  narrativeCompat: number = 0
): number {
  return (
    score +
    voiceSimilarity * FEED_DEFAULTS.qualitativeBonusVoice +
    narrativeCompat * FEED_DEFAULTS.qualitativeBonusNarrative
  )
}

/**
 * Tier별 포스트 분배.
 */
export function distributeTiers(
  candidates: RecommendedCandidate[],
  totalLimit: number
): { basic: FeedPost[]; exploration: FeedPost[]; advanced: FeedPost[] } {
  const basicLimit = Math.round(totalLimit * RECOMMENDED_TIER_RATIOS.basic)
  const explorationLimit = Math.round(totalLimit * RECOMMENDED_TIER_RATIOS.exploration)
  const advancedLimit = totalLimit - basicLimit - explorationLimit

  // 각 Tier별 정렬 + 선택
  const basicPosts = [...candidates]
    .sort((a, b) => b.basicScore - a.basicScore)
    .slice(0, basicLimit)
    .map(
      (c): FeedPost => ({
        postId: c.postId,
        source: "basic" as FeedSource,
        matchingScore: c.basicScore,
        matchingExplanation: "취향이 비슷한 페르소나",
      })
    )

  const usedIds = new Set(basicPosts.map((p) => p.postId))

  const explorationPosts = [...candidates]
    .filter((c) => !usedIds.has(c.postId))
    .sort((a, b) => b.explorationScore - a.explorationScore)
    .slice(0, explorationLimit)
    .map(
      (c): FeedPost => ({
        postId: c.postId,
        source: "exploration" as FeedSource,
        matchingScore: c.explorationScore,
        matchingExplanation: "새로운 관점을 가진 페르소나",
      })
    )

  for (const p of explorationPosts) usedIds.add(p.postId)

  const advancedPosts = [...candidates]
    .filter((c) => !usedIds.has(c.postId))
    .sort((a, b) => b.advancedScore - a.advancedScore)
    .slice(0, advancedLimit)
    .map(
      (c): FeedPost => ({
        postId: c.postId,
        source: "advanced" as FeedSource,
        matchingScore: c.advancedScore,
        matchingExplanation: "깊이 있는 매칭",
      })
    )

  return { basic: basicPosts, exploration: explorationPosts, advanced: advancedPosts }
}

/**
 * 추천 포스트 조회.
 *
 * 설계서 §6.2: 추천 30% 내부 3-Tier 배분.
 */
export async function getRecommendedPosts(
  userId: string,
  limit: number,
  provider: RecommendedPostsProvider,
  excludePostIds: string[] = []
): Promise<{ basic: FeedPost[]; exploration: FeedPost[]; advanced: FeedPost[] }> {
  const candidates = await provider.getCandidates(userId, limit * 3, excludePostIds)

  if (candidates.length === 0) {
    return { basic: [], exploration: [], advanced: [] }
  }

  return distributeTiers(candidates, limit)
}
