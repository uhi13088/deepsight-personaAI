// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — Feed Social Boost & Bot Filter (T324)
// 구현계획서 §7 — 소셜 모듈 부스트 + 봇 의심 필터
// ═══════════════════════════════════════════════════════════════

import type { FeedPost } from "../types"

// ── 타입 ─────────────────────────────────────────────────────

/** 유저-페르소나 관계 정보 */
export interface SocialRelation {
  personaId: string
  warmth: number // 0.0~1.0
  frequency: number // 0.0~1.0
  depth: number // 0.0~1.0
}

/** 봇 의심 정보 */
export interface BotSuspectInfo {
  personaId: string
  suspectScore: number // 0.0~1.0 (높을수록 봇 의심)
}

/** 소셜 부스트 프로바이더 (DI) */
export interface SocialBoostProvider {
  getUserRelations(userId: string): Promise<SocialRelation[]>
  getBotSuspects(): Promise<BotSuspectInfo[]>
}

// ── 상수 ─────────────────────────────────────────────────────

/** 소셜 관계 부스트 가중치 */
const SOCIAL_BOOST_WEIGHTS = {
  warmth: 0.4,
  frequency: 0.3,
  depth: 0.3,
} as const

/** 소셜 부스트 최대 보정값 */
const MAX_SOCIAL_BOOST = 0.15

/** 봇 의심 점수 임계값 (이 이상이면 필터) */
const BOT_SUSPECT_THRESHOLD = 0.8

// ── 소셜 부스트 적용 ────────────────────────────────────────

/**
 * v4.0 §7: 소셜 모듈 부스트.
 *
 * 유저와 친밀한 관계의 페르소나 포스트 점수를 boost.
 * warmth/frequency/depth 가중 평균 → 최대 +0.15 보정.
 */
export function applySocialBoost(posts: FeedPost[], relations: SocialRelation[]): FeedPost[] {
  if (relations.length === 0) return posts

  const relationMap = new Map<string, SocialRelation>()
  for (const rel of relations) {
    relationMap.set(rel.personaId, rel)
  }

  return posts.map((post) => {
    if (!post.personaId) return post

    const rel = relationMap.get(post.personaId)
    if (!rel) return post

    const boostScore =
      rel.warmth * SOCIAL_BOOST_WEIGHTS.warmth +
      rel.frequency * SOCIAL_BOOST_WEIGHTS.frequency +
      rel.depth * SOCIAL_BOOST_WEIGHTS.depth

    const boost = Math.min(boostScore * MAX_SOCIAL_BOOST, MAX_SOCIAL_BOOST)

    return {
      ...post,
      matchingScore: (post.matchingScore ?? 0) + boost,
      socialBoosted: boost > 0,
    }
  })
}

// ── 봇 의심 필터 ────────────────────────────────────────────

/**
 * v4.0 §7: 봇 의심 페르소나 포스트 필터.
 *
 * quality-logger의 InteractionPatternLog 기반 BOT_PATTERN 감지.
 * suspectScore >= 0.8이면 피드에서 제외.
 */
export function filterBotSuspects(posts: FeedPost[], suspects: BotSuspectInfo[]): FeedPost[] {
  if (suspects.length === 0) return posts

  const suspectSet = new Set(
    suspects.filter((s) => s.suspectScore >= BOT_SUSPECT_THRESHOLD).map((s) => s.personaId)
  )

  if (suspectSet.size === 0) return posts

  return posts.filter((post) => {
    if (!post.personaId) return true
    return !suspectSet.has(post.personaId)
  })
}

/**
 * 소셜 부스트 + 봇 필터를 한번에 적용.
 */
export async function applyFeedEnhancements(
  posts: FeedPost[],
  userId: string,
  provider: SocialBoostProvider
): Promise<FeedPost[]> {
  const [relations, suspects] = await Promise.all([
    provider.getUserRelations(userId),
    provider.getBotSuspects(),
  ])

  let enhanced = filterBotSuspects(posts, suspects)
  enhanced = applySocialBoost(enhanced, relations)

  return enhanced
}
