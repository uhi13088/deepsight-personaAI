// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Follow Engine
// 구현계획서 §6.3, 설계서 §5.4
// followScore = 0.5×basicMatch + 0.3×crossAxis + 0.2×paradoxCompat
// followProbability = followScore × sociability × 0.5
// 임계값: followScore > 0.6
// ═══════════════════════════════════════════════════════════════

import type { PersonaStateData } from "../types"
import { FOLLOW_WEIGHTS, FOLLOW_ANNOUNCEMENT } from "../constants"

/**
 * 팔로우 판정에 필요한 외부 데이터 프로바이더.
 */
export interface FollowDataProvider {
  /** L1 V_Final 유사도 (0~1) */
  getBasicMatchScore(followerPersonaId: string, targetPersonaId: string): Promise<number>

  /** 교차축 83축 유사도 (0~1) */
  getCrossAxisSimilarity(followerPersonaId: string, targetPersonaId: string): Promise<number>

  /** Paradox 호환성 (0~1) */
  getParadoxCompatibility(followerPersonaId: string, targetPersonaId: string): Promise<number>

  /** 이미 팔로우 중인지 */
  isFollowing(followerPersonaId: string, targetPersonaId: string): Promise<boolean>

  /** 페르소나 상태 */
  getPersonaState(personaId: string): Promise<PersonaStateData>
}

/**
 * 팔로우 판정 결과.
 */
export interface FollowDecision {
  follow: boolean
  score: number
  probability: number
  announcement: boolean
  breakdown: {
    basicMatch: number
    crossAxis: number
    paradoxCompat: number
  }
}

/**
 * 팔로우 점수 계산 (순수 함수).
 *
 * 설계서 §5.4:
 * followScore = 0.5 × basicMatch + 0.3 × crossAxisSimilarity + 0.2 × paradoxCompatibility
 */
export function computeFollowScore(
  basicMatch: number,
  crossAxis: number,
  paradoxCompat: number
): number {
  return (
    FOLLOW_WEIGHTS.basicMatch * basicMatch +
    FOLLOW_WEIGHTS.crossAxisSimilarity * crossAxis +
    FOLLOW_WEIGHTS.paradoxCompatibility * paradoxCompat
  )
}

/**
 * 팔로우 확률 계산 (순수 함수).
 *
 * followProbability = followScore × sociability × 0.5
 * 임계값: followScore > 0.6
 */
export function computeFollowProbability(followScore: number, sociability: number): number {
  if (followScore <= FOLLOW_WEIGHTS.threshold) return 0

  return Math.min(1, followScore * sociability * FOLLOW_WEIGHTS.probabilityMultiplier)
}

/**
 * 팔로우 발표 포스트 여부 판정.
 *
 * 설계서 §5.4:
 * if (sociability > 0.6 AND mood > 0.5): 발표 포스트 게시
 */
export function shouldAnnounce(sociability: number, mood: number): boolean {
  return sociability > FOLLOW_ANNOUNCEMENT.minSociability && mood > FOLLOW_ANNOUNCEMENT.minMood
}

/**
 * 페르소나가 다른 페르소나를 팔로우할지 판정.
 *
 * 설계서 §5.4:
 * followScore = 0.5 × basicMatch + 0.3 × crossAxisSimilarity + 0.2 × paradoxCompatibility
 * followProbability = followScore × sociability × 0.5
 *
 * @param followerId 팔로우 주체 페르소나 ID
 * @param targetId 팔로우 대상 페르소나 ID
 * @param sociability 팔로우 주체의 sociability (0~1)
 * @param provider 데이터 프로바이더
 * @param random 테스트용 난수 주입 (0~1)
 */
export async function shouldFollow(
  followerId: string,
  targetId: string,
  sociability: number,
  provider: FollowDataProvider,
  random?: number
): Promise<FollowDecision> {
  // 이미 팔로우 중이면 스킵
  const alreadyFollowing = await provider.isFollowing(followerId, targetId)
  if (alreadyFollowing) {
    return {
      follow: false,
      score: 0,
      probability: 0,
      announcement: false,
      breakdown: { basicMatch: 0, crossAxis: 0, paradoxCompat: 0 },
    }
  }

  const [basicMatch, crossAxis, paradoxCompat, state] = await Promise.all([
    provider.getBasicMatchScore(followerId, targetId),
    provider.getCrossAxisSimilarity(followerId, targetId),
    provider.getParadoxCompatibility(followerId, targetId),
    provider.getPersonaState(followerId),
  ])

  const score = computeFollowScore(basicMatch, crossAxis, paradoxCompat)
  const probability = computeFollowProbability(score, sociability)

  const roll = random ?? Math.random()
  const follow = probability > 0 && roll < probability

  const announcement = follow && shouldAnnounce(sociability, state.mood)

  return {
    follow,
    score,
    probability,
    announcement,
    breakdown: { basicMatch, crossAxis, paradoxCompat },
  }
}
