// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4 — Relationship Manager
// 구현계획서 §6.4, 설계서 §5.6
// 인터랙션 발생 시 관계 스코어 업데이트 + 조회
// v4.1: 모멘텀/peakStage/마일스톤 자동 업데이트
// v4.2: attraction 지표 + 로맨틱 마일스톤
// ═══════════════════════════════════════════════════════════════

import type { RelationshipScore } from "../types"
import {
  applyWarmthDecay,
  applyFrequencyDecay,
  updateMomentum,
  detectMilestones,
  updatePeakStage,
  determineStage,
} from "./relationship-protocol"

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
  attraction: 0.0,
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

  // v4.2: attraction 업데이트 (warmth 충분 + tension 낮을 때 자연 성장)
  let attraction = current.attraction ?? 0
  if (warmth >= 0.5 && tension <= 0.3) {
    if (event.type === "comment" && sentimentMod.warmth >= 0) {
      attraction = clamp(attraction + 0.03) // 댓글이 가장 큰 attraction 성장
    } else if (event.type === "like") {
      attraction = clamp(attraction + 0.01)
    } else if (event.type === "follow") {
      attraction = clamp(attraction + 0.02)
    } else if (event.type === "repost") {
      attraction = clamp(attraction + 0.01)
    }
    // 깊은 대화가 attraction 가속
    if (
      event.type === "comment" &&
      event.chainLength !== undefined &&
      event.chainLength >= 3 &&
      warmth >= 0.6
    ) {
      attraction = clamp(attraction + 0.02)
    }
  }
  // negative 감정은 attraction 감소
  if (sentimentMod.warmth < 0) {
    attraction = clamp(attraction - 0.02)
  }

  const baseUpdate: RelationshipScore = {
    warmth,
    tension,
    frequency,
    depth,
    lastInteractionAt: new Date(),
    // v4.1: 기존 필드 보존
    peakStage: current.peakStage,
    momentum: current.momentum,
    milestones: current.milestones,
    // v4.2: attraction 보존
    attraction,
  }

  // v4.1: 모멘텀 업데이트 (EMA)
  baseUpdate.momentum = updateMomentum(current, baseUpdate)

  // v4.1: peakStage 갱신
  const currentStage = determineStage(baseUpdate)
  baseUpdate.peakStage = updatePeakStage(current.peakStage, currentStage)

  // v4.1: 마일스톤 감지 + 기존 마일스톤에 추가
  const newMilestones = detectMilestones(current, baseUpdate)
  if (newMilestones.length > 0) {
    baseUpdate.milestones = [...(current.milestones ?? []), ...newMilestones]
  }

  return baseUpdate
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
 *
 * v4.1: 시간 기반 지수 감쇠 적용
 * - 활동이 있으면: 통계 기반 재계산 (기존 로직)
 * - 활동이 없으면: warmth × e^(-0.02t) 감쇠 + frequency 주간 감쇠
 */
export async function recalculateRelationship(
  personaAId: string,
  personaBId: string,
  provider: RelationshipDataProvider,
  now: Date = new Date()
): Promise<RelationshipScore> {
  const current = await getRelationship(personaAId, personaBId, provider)
  const stats = await provider.getInteractionStats(personaAId, personaBId, 7)

  let warmth: number
  let tension: number
  let frequency: number
  let depth: number

  if (stats.totalInteractions > 0) {
    // 활동이 있으면: 통계 기반 재계산 (기존 로직)
    warmth =
      stats.totalComments > 0
        ? clamp(stats.positiveComments / stats.totalComments)
        : current.warmth * 0.95

    tension =
      stats.totalComments > 0
        ? clamp(stats.negativeComments / stats.totalComments)
        : current.tension * 0.9

    frequency = clamp(stats.totalInteractions / EXPECTED_WEEKLY_INTERACTIONS)

    depth = stats.avgChainLength > 0 ? clamp(stats.avgChainLength / 10) : current.depth * 0.95
  } else {
    // 활동이 없으면: 시간 기반 지수 감쇠
    warmth = applyWarmthDecay(current.warmth, current.lastInteractionAt, now)
    tension = current.tension * 0.9 // tension도 감쇠 (갈등은 시간이 풀어줌)
    frequency = applyFrequencyDecay(current.frequency, current.lastInteractionAt, now)
    depth = current.depth * 0.95
  }

  // v4.2: attraction도 감쇠 (관심은 시간이 지나면 사라짐)
  const attraction =
    stats.totalInteractions > 0
      ? (current.attraction ?? 0) // 활동이 있으면 유지
      : clamp((current.attraction ?? 0) * 0.93) // 무활동 시 7% 주간 감쇠

  const updated: RelationshipScore = {
    warmth: clamp(warmth),
    tension: clamp(tension),
    frequency: clamp(frequency),
    depth: clamp(depth),
    lastInteractionAt: current.lastInteractionAt,
    // v4.1: 기존 필드 보존 (배치 재계산에서는 모멘텀/마일스톤 변경 없음)
    peakStage: current.peakStage,
    momentum: current.momentum,
    milestones: current.milestones,
    // v4.2: attraction 보존
    attraction: clamp(attraction),
  }

  await provider.upsertRelationship(personaAId, personaBId, updated)

  return updated
}

/** 0~1 클램프 */
function clamp(value: number): number {
  return Math.min(1, Math.max(0, value))
}
