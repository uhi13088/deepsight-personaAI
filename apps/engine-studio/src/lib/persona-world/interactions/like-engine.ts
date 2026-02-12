// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Like Engine
// 구현계획서 §6.1, 설계서 §5.2
// likeScore=basicMatch, prob=score×interactivity×socialBattery
// 관계 보정: 팔로잉×1.5, 긍정×1.3, 부정×0.5
// ═══════════════════════════════════════════════════════════════

import type { RelationshipScore, PersonaStateData } from "../types"
import { LIKE_MODIFIERS } from "../constants"

/**
 * 좋아요 판정에 필요한 외부 데이터 프로바이더.
 *
 * DB/매칭 엔진 의존성을 추상화하여 테스트 가능하게 함.
 */
export interface LikeDataProvider {
  /** 두 페르소나 간 BasicMatch 점수 (0~1) */
  getBasicMatchScore(likerPersonaId: string, postAuthorPersonaId: string): Promise<number>

  /** 팔로우 여부 */
  isFollowing(likerPersonaId: string, postAuthorPersonaId: string): Promise<boolean>

  /** 관계 스코어 (없으면 null) */
  getRelationship(personaAId: string, personaBId: string): Promise<RelationshipScore | null>

  /** 좋아요 대상 페르소나의 상태 */
  getPersonaState(personaId: string): Promise<PersonaStateData>
}

/**
 * 좋아요 판정 결과.
 */
export interface LikeDecision {
  like: boolean
  probability: number
  matchingScore: number
  modifiers: {
    following: boolean
    positiveHistory: boolean
    negativeHistory: boolean
  }
}

/**
 * 좋아요 확률 계산 (순수 함수).
 *
 * 설계서 §5.2:
 * likeProbability = likeScore × interactivity × socialBattery
 *
 * 관계 보정:
 * - 팔로우 중: ×1.5
 * - 최근 긍정 이력 (warmth > 0.6): ×1.3
 * - 최근 부정 이력 (tension > 0.5): ×0.5
 */
export function computeLikeProbability(
  likeScore: number,
  interactivity: number,
  socialBattery: number,
  isFollowing: boolean,
  relationship: RelationshipScore | null
): { probability: number; modifiers: LikeDecision["modifiers"] } {
  let probability = likeScore * interactivity * socialBattery

  const modifiers = {
    following: isFollowing,
    positiveHistory: relationship !== null && relationship.warmth > 0.6,
    negativeHistory: relationship !== null && relationship.tension > 0.5,
  }

  if (modifiers.following) {
    probability *= LIKE_MODIFIERS.followingBonus
  }

  if (modifiers.negativeHistory) {
    probability *= LIKE_MODIFIERS.negativeHistoryPenalty
  } else if (modifiers.positiveHistory) {
    probability *= LIKE_MODIFIERS.positiveHistoryBonus
  }

  // 확률 0~1 범위 보정
  probability = Math.min(1, Math.max(0, probability))

  return { probability, modifiers }
}

/**
 * 페르소나가 포스트에 좋아요를 누를지 판정.
 *
 * 설계서 §5.2:
 * likeScore = matchingEngine.computeBasicScore(liker, postAuthor)
 * likeProbability = likeScore × interactivity × socialBattery
 *
 * @param likerId 좋아요 판정 주체 페르소나 ID
 * @param postAuthorId 포스트 작성자 페르소나 ID
 * @param interactivity 좋아요 주체의 interactivity trait (0~1)
 * @param provider 데이터 프로바이더
 * @param random 테스트용 난수 주입 (0~1)
 */
export async function shouldLike(
  likerId: string,
  postAuthorId: string,
  interactivity: number,
  provider: LikeDataProvider,
  random?: number
): Promise<LikeDecision> {
  const [matchingScore, following, relationship, state] = await Promise.all([
    provider.getBasicMatchScore(likerId, postAuthorId),
    provider.isFollowing(likerId, postAuthorId),
    provider.getRelationship(likerId, postAuthorId),
    provider.getPersonaState(likerId),
  ])

  const { probability, modifiers } = computeLikeProbability(
    matchingScore,
    interactivity,
    state.socialBattery,
    following,
    relationship
  )

  const roll = random ?? Math.random()
  const like = roll < probability

  return { like, probability, matchingScore, modifiers }
}
