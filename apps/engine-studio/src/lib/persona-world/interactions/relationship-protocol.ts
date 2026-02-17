// ═══════════════════════════════════════════════════════════════
// Relationship Protocol v4.0
// T143: 관계 단계 + 유형 + 행동 프로토콜
// 기존 RelationshipScore(warmth/tension/frequency/depth) 위에
// 단계/유형/행동 규범을 레이어링
// ═══════════════════════════════════════════════════════════════

import type { RelationshipScore } from "../types"

// ── 관계 단계 (Relationship Stage) ─────────────────────────

/** 관계 발전 단계 (STRANGER → CLOSE) */
export type RelationshipStage =
  | "STRANGER" // 처음 만남 / 인터랙션 없음
  | "ACQUAINTANCE" // 서로 인지, 가끔 인터랙션
  | "FAMILIAR" // 정기적 인터랙션, 취향 파악
  | "CLOSE" // 깊은 교류, 개인적 이야기 공유

/** 관계 유형 (Type) */
export type RelationshipType =
  | "NEUTRAL" // 평범한 관계
  | "ALLY" // 긍정적, 서로 지지
  | "RIVAL" // 자주 논쟁, 높은 tension
  | "MENTOR" // 한쪽이 안내/조언 역할
  | "FAN" // 한쪽이 다른쪽을 추종

// ── 행동 프로토콜 ──────────────────────────────────────────

/** 관계 기반 행동 프로토콜 */
export interface BehaviorProtocol {
  /** 인터랙션 확률 보정 (0.0~2.0, 1.0=기본) */
  interactionBoost: number
  /** 허용되는 댓글 톤 */
  allowedTones: string[]
  /** 자기 노출 수준 (0.0~1.0) */
  selfDisclosure: number
  /** 논쟁 참여 의지 (0.0~1.0) */
  debateWillingness: number
  /** 개인적 참조 허용 (과거 대화 언급 등) */
  personalReferences: boolean
  /** 취약성 표현 가능 (Paradox 발현) */
  vulnerabilityAllowed: boolean
}

// ── 관계 프로필 ────────────────────────────────────────────

/** 두 페르소나 간 관계 프로필 */
export interface RelationshipProfile {
  stage: RelationshipStage
  type: RelationshipType
  protocol: BehaviorProtocol
  stageProgress: number // 현재 단계 내 진행률 (0.0~1.0)
}

// ── 단계 전환 임계값 ────────────────────────────────────────

export interface StageThresholds {
  minFrequency: number
  minDepth: number
  minTotalScore: number // warmth + frequency + depth 합산
}

/** 단계별 진입 조건 */
export const STAGE_THRESHOLDS: Record<RelationshipStage, StageThresholds> = {
  STRANGER: { minFrequency: 0, minDepth: 0, minTotalScore: 0 },
  ACQUAINTANCE: { minFrequency: 0.1, minDepth: 0, minTotalScore: 0.3 },
  FAMILIAR: { minFrequency: 0.3, minDepth: 0.2, minTotalScore: 0.8 },
  CLOSE: { minFrequency: 0.5, minDepth: 0.4, minTotalScore: 1.5 },
}

/** 유형 판단 임계값 */
export const TYPE_THRESHOLDS = {
  /** ALLY: warmth 높고 tension 낮음 */
  ally: { minWarmth: 0.6, maxTension: 0.3 },
  /** RIVAL: tension 높고 frequency 높음 */
  rival: { minTension: 0.5, minFrequency: 0.3 },
  /** MENTOR: depth 높고 warmth 높음 (비대칭은 외부에서 판단) */
  mentor: { minDepth: 0.5, minWarmth: 0.5 },
  /** FAN: warmth 높고 depth 낮음 (일방적 관계) */
  fan: { minWarmth: 0.6, maxDepth: 0.2 },
} as const

// ── 단계별 행동 프로토콜 ────────────────────────────────────

const STAGE_PROTOCOLS: Record<RelationshipStage, BehaviorProtocol> = {
  STRANGER: {
    interactionBoost: 0.5,
    allowedTones: ["formal_analysis", "supportive", "light_reaction"],
    selfDisclosure: 0.1,
    debateWillingness: 0.2,
    personalReferences: false,
    vulnerabilityAllowed: false,
  },
  ACQUAINTANCE: {
    interactionBoost: 0.8,
    allowedTones: [
      "formal_analysis",
      "deep_analysis",
      "supportive",
      "light_reaction",
      "empathetic",
    ],
    selfDisclosure: 0.3,
    debateWillingness: 0.4,
    personalReferences: false,
    vulnerabilityAllowed: false,
  },
  FAMILIAR: {
    interactionBoost: 1.2,
    allowedTones: [
      "deep_analysis",
      "supportive",
      "light_reaction",
      "empathetic",
      "soft_rebuttal",
      "unique_perspective",
    ],
    selfDisclosure: 0.5,
    debateWillingness: 0.6,
    personalReferences: true,
    vulnerabilityAllowed: false,
  },
  CLOSE: {
    interactionBoost: 1.5,
    allowedTones: [
      "paradox_response",
      "direct_rebuttal",
      "intimate_joke",
      "soft_rebuttal",
      "deep_analysis",
      "empathetic",
      "light_reaction",
      "unique_perspective",
      "over_agreement",
      "supportive",
    ],
    selfDisclosure: 0.8,
    debateWillingness: 0.8,
    personalReferences: true,
    vulnerabilityAllowed: true,
  },
}

// ── 유형별 프로토콜 보정 ────────────────────────────────────

interface TypeModifier {
  interactionBoostDelta: number
  debateWillingnessDelta: number
  selfDisclosureDelta: number
  extraTones: string[]
}

const TYPE_MODIFIERS: Record<RelationshipType, TypeModifier> = {
  NEUTRAL: {
    interactionBoostDelta: 0,
    debateWillingnessDelta: 0,
    selfDisclosureDelta: 0,
    extraTones: [],
  },
  ALLY: {
    interactionBoostDelta: 0.3,
    debateWillingnessDelta: -0.1,
    selfDisclosureDelta: 0.1,
    extraTones: ["supportive"],
  },
  RIVAL: {
    interactionBoostDelta: 0.2,
    debateWillingnessDelta: 0.3,
    selfDisclosureDelta: -0.1,
    extraTones: ["direct_rebuttal", "soft_rebuttal"],
  },
  MENTOR: {
    interactionBoostDelta: 0.2,
    debateWillingnessDelta: 0.1,
    selfDisclosureDelta: 0.2,
    extraTones: ["deep_analysis", "empathetic"],
  },
  FAN: {
    interactionBoostDelta: 0.4,
    debateWillingnessDelta: -0.2,
    selfDisclosureDelta: 0,
    extraTones: ["supportive", "light_reaction"],
  },
}

// ══════════════════════════════════════════════════════════════
// 관계 단계 결정
// ══════════════════════════════════════════════════════════════

/** 관계 스코어로 단계 결정 */
export function determineStage(score: RelationshipScore): RelationshipStage {
  const totalScore = score.warmth + score.frequency + score.depth

  if (
    score.frequency >= STAGE_THRESHOLDS.CLOSE.minFrequency &&
    score.depth >= STAGE_THRESHOLDS.CLOSE.minDepth &&
    totalScore >= STAGE_THRESHOLDS.CLOSE.minTotalScore
  ) {
    return "CLOSE"
  }

  if (
    score.frequency >= STAGE_THRESHOLDS.FAMILIAR.minFrequency &&
    score.depth >= STAGE_THRESHOLDS.FAMILIAR.minDepth &&
    totalScore >= STAGE_THRESHOLDS.FAMILIAR.minTotalScore
  ) {
    return "FAMILIAR"
  }

  if (
    score.frequency >= STAGE_THRESHOLDS.ACQUAINTANCE.minFrequency &&
    totalScore >= STAGE_THRESHOLDS.ACQUAINTANCE.minTotalScore
  ) {
    return "ACQUAINTANCE"
  }

  return "STRANGER"
}

/** 현재 단계 내 진행률 (0.0~1.0) */
export function computeStageProgress(
  score: RelationshipScore,
  currentStage: RelationshipStage
): number {
  const totalScore = score.warmth + score.frequency + score.depth

  const stages: RelationshipStage[] = ["STRANGER", "ACQUAINTANCE", "FAMILIAR", "CLOSE"]
  const currentIdx = stages.indexOf(currentStage)
  const nextIdx = currentIdx + 1

  if (nextIdx >= stages.length) return 1.0 // 최고 단계

  const nextThreshold = STAGE_THRESHOLDS[stages[nextIdx]]
  const currentThreshold = STAGE_THRESHOLDS[currentStage]

  const range = nextThreshold.minTotalScore - currentThreshold.minTotalScore
  if (range <= 0) return 1.0

  const progress = (totalScore - currentThreshold.minTotalScore) / range
  return Math.max(0, Math.min(1, progress))
}

// ══════════════════════════════════════════════════════════════
// 관계 유형 결정
// ══════════════════════════════════════════════════════════════

/** 관계 스코어로 유형 결정 */
export function determineType(score: RelationshipScore): RelationshipType {
  // RIVAL: tension 높고 빈도 높음 (최우선 — 갈등 관계)
  if (
    score.tension >= TYPE_THRESHOLDS.rival.minTension &&
    score.frequency >= TYPE_THRESHOLDS.rival.minFrequency
  ) {
    return "RIVAL"
  }

  // ALLY: warmth 높고 tension 낮음
  if (
    score.warmth >= TYPE_THRESHOLDS.ally.minWarmth &&
    score.tension <= TYPE_THRESHOLDS.ally.maxTension
  ) {
    // MENTOR: depth도 높으면 멘토
    if (
      score.depth >= TYPE_THRESHOLDS.mentor.minDepth &&
      score.warmth >= TYPE_THRESHOLDS.mentor.minWarmth
    ) {
      return "MENTOR"
    }

    // FAN: depth 낮으면 팬
    if (score.depth <= TYPE_THRESHOLDS.fan.maxDepth) {
      return "FAN"
    }

    return "ALLY"
  }

  return "NEUTRAL"
}

// ══════════════════════════════════════════════════════════════
// 행동 프로토콜 생성
// ══════════════════════════════════════════════════════════════

/** 단계 + 유형 기반 행동 프로토콜 생성 */
export function buildProtocol(stage: RelationshipStage, type: RelationshipType): BehaviorProtocol {
  const base = STAGE_PROTOCOLS[stage]
  const modifier = TYPE_MODIFIERS[type]

  // 톤 병합 (중복 제거)
  const toneSet = new Set([...base.allowedTones, ...modifier.extraTones])

  return {
    interactionBoost: clamp(base.interactionBoost + modifier.interactionBoostDelta, 0, 2),
    allowedTones: Array.from(toneSet),
    selfDisclosure: clamp(base.selfDisclosure + modifier.selfDisclosureDelta, 0, 1),
    debateWillingness: clamp(base.debateWillingness + modifier.debateWillingnessDelta, 0, 1),
    personalReferences: base.personalReferences,
    vulnerabilityAllowed: base.vulnerabilityAllowed,
  }
}

// ══════════════════════════════════════════════════════════════
// 통합 API
// ══════════════════════════════════════════════════════════════

/** 관계 스코어 → 전체 관계 프로필 */
export function computeRelationshipProfile(score: RelationshipScore): RelationshipProfile {
  const stage = determineStage(score)
  const type = determineType(score)
  const protocol = buildProtocol(stage, type)
  const stageProgress = computeStageProgress(score, stage)

  return { stage, type, protocol, stageProgress }
}

/** 특정 톤이 허용되는지 확인 */
export function isToneAllowed(profile: RelationshipProfile, tone: string): boolean {
  return profile.protocol.allowedTones.includes(tone)
}

/** 인터랙션 확률 보정 계수 */
export function getInteractionMultiplier(profile: RelationshipProfile): number {
  return profile.protocol.interactionBoost
}

/** 관계 요약 텍스트 생성 (프롬프트용) */
export function summarizeRelationship(
  score: RelationshipScore,
  profile: RelationshipProfile
): string {
  const parts: string[] = []

  parts.push(`관계 단계: ${profile.stage}`)
  parts.push(`관계 유형: ${profile.type}`)
  parts.push(
    `지표: warmth=${score.warmth.toFixed(2)}, tension=${score.tension.toFixed(2)}, ` +
      `frequency=${score.frequency.toFixed(2)}, depth=${score.depth.toFixed(2)}`
  )

  if (profile.protocol.personalReferences) {
    parts.push("과거 대화 참조 가능")
  }
  if (profile.protocol.vulnerabilityAllowed) {
    parts.push("취약성 표현 가능")
  }

  return parts.join(". ")
}

/** 관계 변화 감지 (단계 변동 여부) */
export function detectStageChange(
  prevScore: RelationshipScore,
  newScore: RelationshipScore
): { changed: boolean; prevStage: RelationshipStage; newStage: RelationshipStage } {
  const prevStage = determineStage(prevScore)
  const newStage = determineStage(newScore)
  return {
    changed: prevStage !== newStage,
    prevStage,
    newStage,
  }
}

// ── 유틸 ────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
