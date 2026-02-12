// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Relationship Manager
// 구현계획서 §6.4, 설계서 §5.6
// 인터랙션 발생 시 관계 스코어 업데이트 + 조회
// warmth / tension / frequency / depth
// ═══════════════════════════════════════════════════════════════

import type { RelationshipScore } from "../types"

/**
 * 인터랙션 데이터 (관계 업데이트 입력).
 */
export interface InteractionEvent {
  type: "like" | "comment" | "follow" | "repost"
  sentiment?: "positive" | "neutral" | "negative"
  chainLength?: number
}

/**
 * 관계 데이터 프로바이더 (DB 추상화).
 */
export interface RelationshipDataProvider {
  /** 두 페르소나 간 관계 조회 (없으면 null) */
  findRelationship(personaAId: string, personaBId: string): Promise<RelationshipScore | null>

  /** 관계 생성 또는 업데이트 (upsert) */
  upsertRelationship(
    personaAId: string,
    personaBId: string,
    score: RelationshipScore
  ): Promise<void>

  /** 최근 N일간 인터랙션 통계 조회 */
  getInteractionStats(
    personaAId: string,
    personaBId: string,
    days: number
  ): Promise<{
    totalComments: number
    positiveComments: number
    negativeComments: number
    totalInteractions: number
    avgChainLength: number
  }>
}

/** 관계 스코어 기본값. */
export const DEFAULT_RELATIONSHIP: RelationshipScore = {
  warmth: 0.5,
  tension: 0.0,
  frequency: 0.0,
  depth: 0.0,
  lastInteractionAt: null,
}

/**
 * 인터랙션 유형별 가중치.
 */
const INTERACTION_WEIGHTS = {
  like: { warmth: 0.02, tension: 0, frequency: 0.05 },
  comment: { warmth: 0, tension: 0, frequency: 0.1 },
  follow: { warmth: 0.1, tension: 0, frequency: 0.15 },
  repost: { warmth: 0.05, tension: 0, frequency: 0.08 },
} as const

/**
 * 센티먼트별 warmth/tension 보정.
 */
const SENTIMENT_MODIFIERS = {
  positive: { warmth: 0.05, tension: -0.03 },
  neutral: { warmth: 0, tension: 0 },
  negative: { warmth: -0.03, tension: 0.08 },
} as const

/**
 * 주간 기대 인터랙션 수 (frequency 정규화 기준).
 */
const EXPECTED_WEEKLY_INTERACTIONS = 5

/**
 * 관계 스코어 계산 (순수 함수).
 *
 * 설계서 §5.6:
 * - warmth: 긍정 댓글 / 전체 댓글
 * - tension: 반박 댓글 / 전체 댓글 (최근 7일)
 * - frequency: 주간 인터랙션 수 / 기대값
 * - depth: 평균 답글 체인 길이
 */
export function computeRelationshipUpdate(
  current: RelationshipScore,
  event: InteractionEvent
): RelationshipScore {
  const weights = INTERACTION_WEIGHTS[event.type]
  const sentimentMod = event.sentiment
    ? SENTIMENT_MODIFIERS[event.sentiment]
    : SENTIMENT_MODIFIERS.neutral

  // warmth: 기본 가중치 + 센티먼트 보정
  const warmth = clamp(current.warmth + weights.warmth + sentimentMod.warmth)

  // tension: 센티먼트 기반 (negative → 증가, positive → 감소)
  const tension = clamp(current.tension + weights.tension + sentimentMod.tension)

  // frequency: 인터랙션 발생마다 증가 (감쇠는 별도 배치)
  const frequency = clamp(current.frequency + weights.frequency)

  // depth: 댓글 체인 길이가 있으면 이동평균
  let depth = current.depth
  if (event.type === "comment" && event.chainLength !== undefined) {
    // 이동 평균: (기존 × 0.7) + (새 값 × 0.3)
    depth = clamp(current.depth * 0.7 + (event.chainLength / 10) * 0.3)
  }

  return {
    warmth,
    tension,
    frequency,
    depth,
    lastInteractionAt: new Date(),
  }
}

/**
 * 두 페르소나 간 관계 스코어 조회 (없으면 기본값 반환).
 */
export async function getRelationship(
  personaAId: string,
  personaBId: string,
  provider: RelationshipDataProvider
): Promise<RelationshipScore> {
  // 양방향 조회 (A→B 또는 B→A)
  const relationship =
    (await provider.findRelationship(personaAId, personaBId)) ??
    (await provider.findRelationship(personaBId, personaAId))

  return relationship ?? { ...DEFAULT_RELATIONSHIP }
}

/**
 * 인터랙션 발생 시 관계 스코어 업데이트.
 *
 * 설계서 §5.6:
 * 인터랙션 유형과 센티먼트에 따라 warmth/tension/frequency/depth 갱신.
 *
 * @param personaAId 인터랙션 주체
 * @param personaBId 인터랙션 대상
 * @param event 인터랙션 이벤트
 * @param provider 데이터 프로바이더
 */
export async function updateRelationship(
  personaAId: string,
  personaBId: string,
  event: InteractionEvent,
  provider: RelationshipDataProvider
): Promise<RelationshipScore> {
  const current = await getRelationship(personaAId, personaBId, provider)
  const updated = computeRelationshipUpdate(current, event)

  await provider.upsertRelationship(personaAId, personaBId, updated)

  return updated
}

/**
 * 최근 인터랙션 통계 기반으로 관계 스코어 재계산.
 *
 * 주기적 배치 (예: 일 1회)에서 호출하여
 * warmth/tension을 실제 비율로 보정하고 frequency를 감쇠.
 */
export async function recalculateRelationship(
  personaAId: string,
  personaBId: string,
  provider: RelationshipDataProvider
): Promise<RelationshipScore> {
  const current = await getRelationship(personaAId, personaBId, provider)
  const stats = await provider.getInteractionStats(personaAId, personaBId, 7)

  // warmth 재계산: 긍정 댓글 비율
  const warmth =
    stats.totalComments > 0
      ? clamp(stats.positiveComments / stats.totalComments)
      : current.warmth * 0.95 // 활동 없으면 약간 감쇠

  // tension 재계산: 부정 댓글 비율
  const tension =
    stats.totalComments > 0
      ? clamp(stats.negativeComments / stats.totalComments)
      : current.tension * 0.9 // 활동 없으면 더 빠르게 감쇠

  // frequency 재계산: 주간 인터랙션 / 기대값
  const frequency = clamp(stats.totalInteractions / EXPECTED_WEEKLY_INTERACTIONS)

  // depth 재계산: 평균 체인 길이
  const depth = stats.avgChainLength > 0 ? clamp(stats.avgChainLength / 10) : current.depth * 0.95

  const updated: RelationshipScore = {
    warmth,
    tension,
    frequency,
    depth,
    lastInteractionAt: current.lastInteractionAt,
  }

  await provider.upsertRelationship(personaAId, personaBId, updated)

  return updated
}

/** 0~1 클램프 */
function clamp(value: number): number {
  return Math.min(1, Math.max(0, value))
}
