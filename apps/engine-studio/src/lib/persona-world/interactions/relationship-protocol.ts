// ═══════════════════════════════════════════════════════════════
// Relationship Protocol v4.2
// T143: 기본 관계 프로토콜
// T350~T353: 관계 모델 확장
//   - T351: 유형 5→10종 (CONFIDANT/FRENEMY/NEMESIS/MUSE/PROTEGE)
//   - T352: 단계 4→6 forward + ESTRANGED (총 9단계)
//   - T353: 비대칭/동적 메커니즘 (모멘텀, 마일스톤)
// T355: 관계 유형 대규모 확장
//   - 유형 10→22종 (+로맨틱 6종, 사회적 3종, 감정 복합 3종)
//   - attraction 지표 추가
//   - 로맨틱 마일스톤 3종 (first_flirt/confession/breakup)
// ═══════════════════════════════════════════════════════════════

import type { RelationshipScore, RelationshipMilestone } from "../types"

// ── 관계 단계 (Relationship Stage) ─────────────────────────

/**
 * v4.1 관계 발전 단계 (9단계)
 *
 * Forward (6단계):
 *   STRANGER → ACQUAINTANCE → REGULAR → FAMILIAR → INTIMATE → CLOSE
 *
 * Decay (3단계):
 *   COOLING (14일+ 무활동) → DORMANT (30일+) → ESTRANGED (갈등 기반 분리)
 */
export type RelationshipStage =
  | "STRANGER" // 처음 만남 / 인터랙션 없음
  | "ACQUAINTANCE" // 서로 인지, 가끔 인터랙션
  | "REGULAR" // 정기적으로 만남, 취향 파악 시작 (v4.1 신규)
  | "FAMILIAR" // 충분한 교류, 서로의 성향 이해
  | "INTIMATE" // 깊은 교류, 개인사 일부 공유 (v4.1 신규)
  | "CLOSE" // 가장 깊은 관계, 취약성 공유
  | "COOLING" // 인터랙션 감소, 관계 냉각 중 (14일+ 무활동)
  | "DORMANT" // 장기 무활동 (30일+), 최소한의 인터랙션만 유지
  | "ESTRANGED" // 한때 가까웠으나 갈등으로 의도적 거리두기 (v4.1 신규)

/**
 * v4.2 관계 유형 (22종)
 *
 * 기존 5종: NEUTRAL, ALLY, RIVAL, MENTOR, FAN
 * v4.1 5종: CONFIDANT, FRENEMY, NEMESIS, MUSE, PROTEGE
 * v4.2 로맨틱 6종: CRUSH, SWEETHEART, LOVER, SOULMATE, EX, OBSESSED
 * v4.2 사회적 3종: GUARDIAN, COMPANION, BESTIE
 * v4.2 감정 복합 3종: TSUNDERE, TOXIC, PUSH_PULL
 */
export type RelationshipType =
  | "NEUTRAL" // 평범한 관계
  | "ALLY" // 긍정적, 서로 지지
  | "RIVAL" // 자주 논쟁, 높은 tension
  | "MENTOR" // 한쪽이 안내/조언 역할
  | "FAN" // 한쪽이 다른쪽을 추종
  | "CONFIDANT" // ALLY보다 깊은 신뢰, 취약성 공유 (v4.1)
  | "FRENEMY" // 친하면서도 경쟁 — warmth+tension 동시 고값 (v4.1)
  | "NEMESIS" // RIVAL보다 깊은 개인적 대립, 역사적 갈등 (v4.1)
  | "MUSE" // 상대의 관점에서 창작적 영감 수령 (v4.1)
  | "PROTEGE" // MENTOR 역방향 — 가르침 받는 쪽 (v4.1)
  | "CRUSH" // 짝사랑 — attraction 있으나 깊이 부족 (v4.2)
  | "SWEETHEART" // 썸 — 상호 호감, 발전 중 (v4.2)
  | "LOVER" // 연인 — 깊은 로맨틱 관계 (v4.2)
  | "SOULMATE" // 소울메이트 — LOVER 진화, 극한 유대 (v4.2)
  | "EX" // 전 연인 — breakup 마일스톤 기반 (v4.2)
  | "OBSESSED" // 집착 — attraction+tension 동시 고값, 불건강 (v4.2)
  | "GUARDIAN" // 보호자 — 보호 본능, 비요청 조언 (v4.2)
  | "COMPANION" // 동반자 — 항상 함께, 일상적 유대 (v4.2)
  | "BESTIE" // 절친 — BFF 수준, 높은 warmth+frequency (v4.2)
  | "TSUNDERE" // 츤데레 — 겉으론 차갑지만 속은 따뜻+호감 (v4.2)
  | "TOXIC" // 독성 — 파괴적이지만 끊지 못하는 관계 (v4.2)
  | "PUSH_PULL" // 밀당 — 다가갔다 밀어내기 반복 (v4.2)

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
  /** v4.1: 관계 모멘텀 정보 */
  momentum?: MomentumInfo
  /** v4.1: 활성 마일스톤 목록 */
  milestones?: RelationshipMilestone[]
}

/** v4.1: 모멘텀 분석 정보 */
export interface MomentumInfo {
  /** 모멘텀 값 (-1.0~1.0, 양수=급속 발전, 음수=쇠퇴) */
  value: number
  /** 분류: rapid(급속)/gradual(점진)/stagnant(정체)/declining(쇠퇴) */
  classification: "rapid" | "gradual" | "stagnant" | "declining"
  /** 안정성 (0.0~1.0) — 빠른 진행은 불안정, 느린 진행은 안정적 */
  stability: number
}

// ── 단계 전환 임계값 ────────────────────────────────────────

export interface StageThresholds {
  minFrequency: number
  minDepth: number
  minTotalScore: number // warmth + frequency + depth 합산
}

/**
 * v4.1 단계별 진입 조건 (6 forward + 3 decay)
 *
 * 기존 ACQUAINTANCE↔FAMILIAR 사이에 REGULAR 삽입
 * 기존 FAMILIAR↔CLOSE 사이에 INTIMATE 삽입
 */
export const STAGE_THRESHOLDS: Record<RelationshipStage, StageThresholds> = {
  STRANGER: { minFrequency: 0, minDepth: 0, minTotalScore: 0 },
  ACQUAINTANCE: { minFrequency: 0.1, minDepth: 0, minTotalScore: 0.3 },
  REGULAR: { minFrequency: 0.2, minDepth: 0.1, minTotalScore: 0.5 },
  FAMILIAR: { minFrequency: 0.3, minDepth: 0.2, minTotalScore: 0.8 },
  INTIMATE: { minFrequency: 0.4, minDepth: 0.3, minTotalScore: 1.1 },
  CLOSE: { minFrequency: 0.5, minDepth: 0.4, minTotalScore: 1.5 },
  // Decay 단계는 시간/갈등 기반 전환
  COOLING: { minFrequency: 0, minDepth: 0, minTotalScore: 0 },
  DORMANT: { minFrequency: 0, minDepth: 0, minTotalScore: 0 },
  ESTRANGED: { minFrequency: 0, minDepth: 0, minTotalScore: 0 },
}

// ── 감쇠 관련 상수 ──────────────────────────────────────────

/** warmth 지수 감쇠 계수: warmth × e^(-DECAY_RATE × days) */
export const WARMTH_DECAY_RATE = 0.02

/** COOLING 진입까지 무활동 일수 */
export const COOLING_THRESHOLD_DAYS = 14

/** DORMANT 진입까지 무활동 일수 */
export const DORMANT_THRESHOLD_DAYS = 30

/** COOLING 상태에서 재활성화에 필요한 최소 인터랙션 수 */
export const REACTIVATION_MIN_INTERACTIONS = 3

/** v4.1: ESTRANGED 판별 — tension 임계값 (peakStage ≥ FAMILIAR && tension ≥ 이 값) */
export const ESTRANGED_TENSION_THRESHOLD = 0.7

/** v4.1: ESTRANGED 판별 — warmth 급락 임계값 (peakWarmth 대비 현재 warmth 차이) */
export const ESTRANGED_WARMTH_DROP = 0.3

// ── 유형 판단 임계값 ────────────────────────────────────────

/** v4.2: 22종 유형 판단 임계값 */
export const TYPE_THRESHOLDS = {
  // 기존 5종
  ally: { minWarmth: 0.6, maxTension: 0.3 },
  rival: { minTension: 0.5, minFrequency: 0.3 },
  mentor: { minDepth: 0.5, minWarmth: 0.5 },
  fan: { minWarmth: 0.6, maxDepth: 0.2 },
  // v4.1 5종
  confidant: { minWarmth: 0.8, minDepth: 0.7, maxTension: 0.2 },
  frenemy: { minWarmth: 0.5, minTension: 0.5 },
  nemesis: { minTension: 0.7, minDepth: 0.5, maxWarmth: 0.3 },
  muse: { minWarmth: 0.5, minDepth: 0.3, maxFrequency: 0.3 },
  protege: { minDepth: 0.5, minWarmth: 0.5 },
  // v4.2 로맨틱 6종
  crush: { minAttraction: 0.4, minWarmth: 0.4 },
  sweetheart: { minAttraction: 0.5, minWarmth: 0.6, minDepth: 0.3 },
  lover: { minAttraction: 0.7, minWarmth: 0.7, minDepth: 0.5, maxTension: 0.3 },
  soulmate: { minAttraction: 0.9, minWarmth: 0.9, minDepth: 0.8 },
  ex: { maxAttraction: 0.4 },
  obsessed: { minAttraction: 0.6, minTension: 0.4, minFrequency: 0.5 },
  // v4.2 사회적 3종
  guardian: { minWarmth: 0.7, minFrequency: 0.6, minDepth: 0.3, maxTension: 0.2 },
  companion: { minFrequency: 0.6, minWarmth: 0.4 },
  bestie: { minWarmth: 0.8, minFrequency: 0.5, minDepth: 0.4, maxTension: 0.2 },
  // v4.2 감정 복합 3종
  tsundere: {
    minAttraction: 0.3,
    minTension: 0.35,
    minWarmth: 0.35,
    maxWarmth: 0.65,
    maxDepth: 0.4,
  },
  toxic: { minTension: 0.5, minFrequency: 0.6, maxWarmth: 0.3 },
  pushPull: {
    minAttraction: 0.3,
    minWarmth: 0.3,
    maxWarmth: 0.6,
    minTension: 0.2,
    maxTension: 0.5,
    minFrequency: 0.4,
  },
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
  REGULAR: {
    interactionBoost: 1.0,
    allowedTones: [
      "formal_analysis",
      "deep_analysis",
      "supportive",
      "light_reaction",
      "empathetic",
      "unique_perspective",
    ],
    selfDisclosure: 0.4,
    debateWillingness: 0.5,
    personalReferences: true,
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
  INTIMATE: {
    interactionBoost: 1.35,
    allowedTones: [
      "deep_analysis",
      "supportive",
      "light_reaction",
      "empathetic",
      "soft_rebuttal",
      "unique_perspective",
      "intimate_joke",
      "direct_rebuttal",
    ],
    selfDisclosure: 0.65,
    debateWillingness: 0.7,
    personalReferences: true,
    vulnerabilityAllowed: true,
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
  COOLING: {
    interactionBoost: 0.6,
    allowedTones: ["formal_analysis", "supportive", "light_reaction", "empathetic"],
    selfDisclosure: 0.2,
    debateWillingness: 0.3,
    personalReferences: true, // 과거 기억은 유지
    vulnerabilityAllowed: false,
  },
  DORMANT: {
    interactionBoost: 0.3,
    allowedTones: ["formal_analysis", "light_reaction", "supportive"],
    selfDisclosure: 0.1,
    debateWillingness: 0.1,
    personalReferences: false,
    vulnerabilityAllowed: false,
  },
  ESTRANGED: {
    interactionBoost: 0.2,
    allowedTones: ["formal_analysis", "light_reaction"],
    selfDisclosure: 0.05,
    debateWillingness: 0.1,
    personalReferences: true, // 과거를 기억하지만 거리 유지
    vulnerabilityAllowed: false,
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
  // ── 기존 5종 ──
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
  // ── v4.1 5종 ──
  CONFIDANT: {
    interactionBoostDelta: 0.3,
    debateWillingnessDelta: 0,
    selfDisclosureDelta: 0.3,
    extraTones: ["empathetic", "intimate_joke", "paradox_response"],
  },
  FRENEMY: {
    interactionBoostDelta: 0.3,
    debateWillingnessDelta: 0.2,
    selfDisclosureDelta: 0.05,
    extraTones: ["soft_rebuttal", "intimate_joke", "unique_perspective"],
  },
  NEMESIS: {
    interactionBoostDelta: 0.15,
    debateWillingnessDelta: 0.4,
    selfDisclosureDelta: -0.15,
    extraTones: ["direct_rebuttal", "soft_rebuttal", "unique_perspective"],
  },
  MUSE: {
    interactionBoostDelta: 0.1,
    debateWillingnessDelta: 0,
    selfDisclosureDelta: 0.1,
    extraTones: ["deep_analysis", "unique_perspective"],
  },
  PROTEGE: {
    interactionBoostDelta: 0.25,
    debateWillingnessDelta: -0.1,
    selfDisclosureDelta: 0.15,
    extraTones: ["supportive", "empathetic", "deep_analysis"],
  },
  // ── v4.2 로맨틱 6종 ──
  CRUSH: {
    interactionBoostDelta: 0.3, // 적극적 상호작용 시도
    debateWillingnessDelta: -0.2, // 갈등 회피 (싫은 모습 보이기 싫음)
    selfDisclosureDelta: 0.05, // 조심스러운 자기 노출
    extraTones: ["supportive", "light_reaction", "empathetic"],
  },
  SWEETHEART: {
    interactionBoostDelta: 0.35, // 자주 대화하고 싶음
    debateWillingnessDelta: -0.1, // 갈등 약간 회피
    selfDisclosureDelta: 0.15, // 서서히 마음 열기
    extraTones: ["light_reaction", "intimate_joke", "empathetic"],
  },
  LOVER: {
    interactionBoostDelta: 0.5, // 가장 높은 상호작용 욕구
    debateWillingnessDelta: 0, // 편안한 의견 교환
    selfDisclosureDelta: 0.35, // 깊은 자기 노출
    extraTones: ["intimate_joke", "empathetic", "paradox_response", "supportive"],
  },
  SOULMATE: {
    interactionBoostDelta: 0.5, // 최고의 유대
    debateWillingnessDelta: 0.1, // 진솔한 의견 교환 가능
    selfDisclosureDelta: 0.4, // 완전한 자기 노출
    extraTones: [
      "intimate_joke",
      "empathetic",
      "paradox_response",
      "deep_analysis",
      "unique_perspective",
    ],
  },
  EX: {
    interactionBoostDelta: -0.2, // 상호작용 기피
    debateWillingnessDelta: 0.1, // 잔여 감정으로 날카로움
    selfDisclosureDelta: -0.15, // 경계, 마음 닫음
    extraTones: ["formal_analysis", "light_reaction"],
  },
  OBSESSED: {
    interactionBoostDelta: 0.6, // 과도한 관심, 멈출 수 없음
    debateWillingnessDelta: -0.1, // 상대 비위 맞추려 함
    selfDisclosureDelta: 0, // 일방적 관심
    extraTones: ["supportive", "empathetic", "light_reaction"],
  },
  // ── v4.2 사회적 3종 ──
  GUARDIAN: {
    interactionBoostDelta: 0.35, // 늘 지켜보고 보호
    debateWillingnessDelta: 0.2, // 상대를 위해 논쟁도 불사
    selfDisclosureDelta: 0.1,
    extraTones: ["supportive", "empathetic", "soft_rebuttal"],
  },
  COMPANION: {
    interactionBoostDelta: 0.4, // 습관적으로 함께
    debateWillingnessDelta: 0, // 편안한 관계
    selfDisclosureDelta: 0.1,
    extraTones: ["light_reaction", "supportive", "empathetic"],
  },
  BESTIE: {
    interactionBoostDelta: 0.45, // 절친 — 가장 자주 교류
    debateWillingnessDelta: 0, // 편하지만 굳이 안 싸움
    selfDisclosureDelta: 0.25,
    extraTones: ["intimate_joke", "light_reaction", "empathetic", "supportive"],
  },
  // ── v4.2 감정 복합 3종 ──
  TSUNDERE: {
    interactionBoostDelta: 0.2, // 관심 있지만 티 안 냄
    debateWillingnessDelta: 0.2, // 겉으로 까칠하게 반응
    selfDisclosureDelta: -0.05, // 속마음 숨김
    extraTones: ["soft_rebuttal", "light_reaction", "intimate_joke"],
  },
  TOXIC: {
    interactionBoostDelta: 0.3, // 독성 패턴 — 끊지 못함
    debateWillingnessDelta: 0.3, // 자주 충돌
    selfDisclosureDelta: -0.1, // 상처받을까 봐 닫음
    extraTones: ["direct_rebuttal", "soft_rebuttal"],
  },
  PUSH_PULL: {
    interactionBoostDelta: 0.15, // 다가갔다 밀어내기
    debateWillingnessDelta: 0.1,
    selfDisclosureDelta: 0.05, // 조금씩만 보여줌
    extraTones: ["light_reaction", "soft_rebuttal", "empathetic"],
  },
}

// ── v4.1+v4.2: 마일스톤 감지 임계값 ─────────────────────────

/** 마일스톤 이벤트 감지 기준 */
export const MILESTONE_THRESHOLDS = {
  // v4.1 기존 5종
  /** 첫 논쟁: tension 단일 이벤트에서 0.15 이상 급증 */
  firstDebate: { tensionDelta: 0.15 },
  /** 첫 취약성 공유: INTIMATE 이상 단계 진입 시 자동 기록 */
  firstVulnerability: { minStage: "INTIMATE" as RelationshipStage },
  /** 첫 배신: tension ≥ 0.8 && warmth 급락 -0.2 이상 */
  firstBetrayal: { minTension: 0.8, warmthDrop: -0.2 },
  /** 첫 깊은 공유: depth가 0.5 이상으로 진입 */
  firstDeepShare: { minDepth: 0.5 },
  /** 화해: ESTRANGED에서 tension 0.3 이하로 회복 */
  reconciliation: { maxTension: 0.3 },
  // v4.2 로맨틱 3종
  /** 첫 설렘: attraction이 0.3 이상으로 진입 */
  firstFlirt: { minAttraction: 0.3 },
  /** 고백: attraction이 0.7 이상 도달 (LOVER 수준) */
  confession: { minAttraction: 0.7 },
  /** 이별: attraction ≥ 0.5 상태에서 warmth가 0.25 이상 급락 */
  breakup: { minPrevAttraction: 0.5, warmthDrop: -0.25 },
} as const

// ══════════════════════════════════════════════════════════════
// 관계 단계 결정
// ══════════════════════════════════════════════════════════════

/** v4.1 forward 단계 순서 (진행 방향) */
const FORWARD_STAGES: RelationshipStage[] = [
  "STRANGER",
  "ACQUAINTANCE",
  "REGULAR",
  "FAMILIAR",
  "INTIMATE",
  "CLOSE",
]

/** 관계 스코어로 단계 결정 (시간 감쇠 미포함 — 순수 점수 기반) */
export function determineStage(score: RelationshipScore): RelationshipStage {
  const totalScore = score.warmth + score.frequency + score.depth

  // 높은 단계부터 역순으로 체크
  if (
    score.frequency >= STAGE_THRESHOLDS.CLOSE.minFrequency &&
    score.depth >= STAGE_THRESHOLDS.CLOSE.minDepth &&
    totalScore >= STAGE_THRESHOLDS.CLOSE.minTotalScore
  ) {
    return "CLOSE"
  }

  if (
    score.frequency >= STAGE_THRESHOLDS.INTIMATE.minFrequency &&
    score.depth >= STAGE_THRESHOLDS.INTIMATE.minDepth &&
    totalScore >= STAGE_THRESHOLDS.INTIMATE.minTotalScore
  ) {
    return "INTIMATE"
  }

  if (
    score.frequency >= STAGE_THRESHOLDS.FAMILIAR.minFrequency &&
    score.depth >= STAGE_THRESHOLDS.FAMILIAR.minDepth &&
    totalScore >= STAGE_THRESHOLDS.FAMILIAR.minTotalScore
  ) {
    return "FAMILIAR"
  }

  if (
    score.frequency >= STAGE_THRESHOLDS.REGULAR.minFrequency &&
    score.depth >= STAGE_THRESHOLDS.REGULAR.minDepth &&
    totalScore >= STAGE_THRESHOLDS.REGULAR.minTotalScore
  ) {
    return "REGULAR"
  }

  if (
    score.frequency >= STAGE_THRESHOLDS.ACQUAINTANCE.minFrequency &&
    totalScore >= STAGE_THRESHOLDS.ACQUAINTANCE.minTotalScore
  ) {
    return "ACQUAINTANCE"
  }

  return "STRANGER"
}

/**
 * v4.1 시간 감쇠를 포함한 관계 단계 결정.
 *
 * 로직:
 * 1. ESTRANGED 판별: peakStage ≥ FAMILIAR && tension ≥ 0.7 && warmth 급락
 * 2. DORMANT: 30일+ 무활동
 * 3. COOLING: 14일+ 무활동
 * 4. 그 외 → 기존 score 기반 단계 결정
 */
export function determineStageWithDecay(
  score: RelationshipScore,
  now: Date = new Date()
): RelationshipStage {
  // v4.1: ESTRANGED 판별 (갈등 기반 — 시간과 무관)
  if (isEstranged(score)) {
    return "ESTRANGED"
  }

  // lastInteractionAt이 없으면(관계 초기) 순수 점수 기반
  if (!score.lastInteractionAt) {
    return determineStage(score)
  }

  const daysSinceLastInteraction = getDaysSince(score.lastInteractionAt, now)

  // DORMANT: 30일+ 무활동
  if (daysSinceLastInteraction >= DORMANT_THRESHOLD_DAYS) {
    return "DORMANT"
  }

  // COOLING: 14일+ 무활동
  if (daysSinceLastInteraction >= COOLING_THRESHOLD_DAYS) {
    return "COOLING"
  }

  // 활동적인 관계 → 기존 점수 기반 결정
  return determineStage(score)
}

/**
 * v4.1: ESTRANGED 상태 판별.
 *
 * 조건: 한때 FAMILIAR 이상이었으나 (peakStage) 현재 높은 tension + warmth 급락
 */
export function isEstranged(score: RelationshipScore): boolean {
  const peakStage = score.peakStage as RelationshipStage | undefined
  if (!peakStage) return false

  const peakIdx = FORWARD_STAGES.indexOf(peakStage)
  const familiarIdx = FORWARD_STAGES.indexOf("FAMILIAR")

  // peakStage가 FAMILIAR 미만이면 ESTRANGED 불가
  if (peakIdx < familiarIdx) return false

  // tension이 충분히 높고 warmth가 낮아야 함
  return (
    score.tension >= ESTRANGED_TENSION_THRESHOLD && score.warmth <= 1.0 - ESTRANGED_WARMTH_DROP // warmth가 0.7 이하
  )
}

/**
 * warmth에 시간 기반 지수 감쇠 적용.
 *
 * 공식: decayedWarmth = warmth × e^(-WARMTH_DECAY_RATE × daysSinceLastInteraction)
 */
export function applyWarmthDecay(
  warmth: number,
  lastInteractionAt: Date | null,
  now: Date = new Date()
): number {
  if (!lastInteractionAt) return warmth

  const daysSince = getDaysSince(lastInteractionAt, now)
  if (daysSince <= 0) return warmth

  const decayed = warmth * Math.exp(-WARMTH_DECAY_RATE * daysSince)
  return clamp(decayed, 0, 1)
}

/**
 * frequency에 주간 감쇠 적용.
 *
 * 공식: decayedFrequency = frequency × 0.9^(weeksSinceLastInteraction)
 */
export function applyFrequencyDecay(
  frequency: number,
  lastInteractionAt: Date | null,
  now: Date = new Date()
): number {
  if (!lastInteractionAt) return frequency

  const daysSince = getDaysSince(lastInteractionAt, now)
  const weeksSince = daysSince / 7
  if (weeksSince <= 0) return frequency

  const decayed = frequency * Math.pow(0.9, weeksSince)
  return clamp(decayed, 0, 1)
}

/** v4.1: 현재 단계 내 진행률 (0.0~1.0) */
export function computeStageProgress(
  score: RelationshipScore,
  currentStage: RelationshipStage
): number {
  // Decay 단계는 진행률 0
  if (currentStage === "COOLING" || currentStage === "DORMANT" || currentStage === "ESTRANGED") {
    return 0.0
  }

  const totalScore = score.warmth + score.frequency + score.depth

  const currentIdx = FORWARD_STAGES.indexOf(currentStage)
  const nextIdx = currentIdx + 1

  if (nextIdx >= FORWARD_STAGES.length) return 1.0 // 최고 단계

  const nextThreshold = STAGE_THRESHOLDS[FORWARD_STAGES[nextIdx]]
  const currentThreshold = STAGE_THRESHOLDS[currentStage]

  const range = nextThreshold.minTotalScore - currentThreshold.minTotalScore
  if (range <= 0) return 1.0

  const progress = (totalScore - currentThreshold.minTotalScore) / range
  return Math.max(0, Math.min(1, progress))
}

// ══════════════════════════════════════════════════════════════
// 관계 유형 결정
// ══════════════════════════════════════════════════════════════

/**
 * v4.2 관계 스코어로 유형 결정 (22종).
 *
 * 우선순위 그룹:
 * [1] 이벤트 기반: EX (breakup 마일스톤)
 * [2] 극단 상태: NEMESIS, SOULMATE, OBSESSED, TOXIC
 * [3] 로맨틱: LOVER, TSUNDERE, SWEETHEART, PUSH_PULL, CRUSH
 * [4] 갈등: FRENEMY, RIVAL
 * [5] 긍정 심층: CONFIDANT, BESTIE, GUARDIAN, MENTOR, FAN, ALLY
 * [6] 중립대: COMPANION, PROTEGE, MUSE
 * [7] 기본값: NEUTRAL
 */
export function determineType(score: RelationshipScore): RelationshipType {
  const t = TYPE_THRESHOLDS
  const attraction = score.attraction ?? 0
  const milestones = score.milestones ?? []
  const hasBreakup = milestones.some((m) => m.type === "breakup")

  // ── [1] 이벤트 기반 ──
  // EX: breakup 마일스톤 + attraction 소진
  if (hasBreakup && attraction <= t.ex.maxAttraction) {
    return "EX"
  }

  // ── [2] 극단 상태 ──
  // NEMESIS: tension 극고 + depth 고 + warmth 저
  if (
    score.tension >= t.nemesis.minTension &&
    score.depth >= t.nemesis.minDepth &&
    score.warmth <= t.nemesis.maxWarmth
  ) {
    return "NEMESIS"
  }

  // SOULMATE: 모든 지표 극고 (로맨틱 극한)
  if (
    attraction >= t.soulmate.minAttraction &&
    score.warmth >= t.soulmate.minWarmth &&
    score.depth >= t.soulmate.minDepth
  ) {
    return "SOULMATE"
  }

  // OBSESSED: attraction 고 + tension 고 + frequency 고 (불건강 집착)
  if (
    attraction >= t.obsessed.minAttraction &&
    score.tension >= t.obsessed.minTension &&
    score.frequency >= t.obsessed.minFrequency
  ) {
    return "OBSESSED"
  }

  // TOXIC: tension 고 + frequency 고 + warmth 저 (파괴적이지만 끊지 못함)
  if (
    score.tension >= t.toxic.minTension &&
    score.frequency >= t.toxic.minFrequency &&
    score.warmth <= t.toxic.maxWarmth
  ) {
    return "TOXIC"
  }

  // ── [3] 로맨틱 (attraction 기반) ──
  // LOVER: 완전한 로맨틱 관계
  if (
    attraction >= t.lover.minAttraction &&
    score.warmth >= t.lover.minWarmth &&
    score.depth >= t.lover.minDepth &&
    score.tension <= t.lover.maxTension
  ) {
    return "LOVER"
  }

  // TSUNDERE: 겉은 차갑지만 속은 호감 (attraction + tension + moderate warmth)
  if (
    attraction >= t.tsundere.minAttraction &&
    score.tension >= t.tsundere.minTension &&
    score.warmth >= t.tsundere.minWarmth &&
    score.warmth < t.tsundere.maxWarmth &&
    score.depth <= t.tsundere.maxDepth
  ) {
    return "TSUNDERE"
  }

  // SWEETHEART: 상호 호감 발전 중
  if (
    attraction >= t.sweetheart.minAttraction &&
    score.warmth >= t.sweetheart.minWarmth &&
    score.depth >= t.sweetheart.minDepth
  ) {
    return "SWEETHEART"
  }

  // PUSH_PULL: 밀당 — 모든 값이 중간대, attraction 존재
  if (
    attraction >= t.pushPull.minAttraction &&
    score.warmth >= t.pushPull.minWarmth &&
    score.warmth <= t.pushPull.maxWarmth &&
    score.tension >= t.pushPull.minTension &&
    score.tension <= t.pushPull.maxTension &&
    score.frequency >= t.pushPull.minFrequency
  ) {
    return "PUSH_PULL"
  }

  // CRUSH: 초기 attraction (나머지 로맨틱 캐치올)
  if (attraction >= t.crush.minAttraction && score.warmth >= t.crush.minWarmth) {
    return "CRUSH"
  }

  // ── [4] 갈등 기반 (attraction 없음) ──
  // FRENEMY: warmth + tension 동시 고값
  if (score.warmth >= t.frenemy.minWarmth && score.tension >= t.frenemy.minTension) {
    return "FRENEMY"
  }

  // RIVAL: tension + frequency 고값
  if (score.tension >= t.rival.minTension && score.frequency >= t.rival.minFrequency) {
    return "RIVAL"
  }

  // ── [5] 긍정 심층 (warmth 고, tension 저) ──
  if (score.warmth >= t.ally.minWarmth && score.tension <= t.ally.maxTension) {
    // CONFIDANT: warmth + depth 극고, tension 극저
    if (
      score.warmth >= t.confidant.minWarmth &&
      score.depth >= t.confidant.minDepth &&
      score.tension <= t.confidant.maxTension
    ) {
      return "CONFIDANT"
    }

    // BESTIE: warmth + frequency 고, 적당한 depth
    if (
      score.warmth >= t.bestie.minWarmth &&
      score.frequency >= t.bestie.minFrequency &&
      score.depth >= t.bestie.minDepth &&
      score.tension <= t.bestie.maxTension
    ) {
      return "BESTIE"
    }

    // GUARDIAN: warmth 고 + frequency 고 + depth 중
    if (
      score.warmth >= t.guardian.minWarmth &&
      score.frequency >= t.guardian.minFrequency &&
      score.depth >= t.guardian.minDepth &&
      score.tension <= t.guardian.maxTension
    ) {
      return "GUARDIAN"
    }

    // MENTOR: depth + warmth 고값
    if (score.depth >= t.mentor.minDepth && score.warmth >= t.mentor.minWarmth) {
      return "MENTOR"
    }

    // FAN: warmth 고, depth 저
    if (score.depth <= t.fan.maxDepth) {
      return "FAN"
    }

    // ALLY: 일반적 긍정 관계
    return "ALLY"
  }

  // ── [6] 중립대 (warmth 중간 또는 tension 중간) ──
  // COMPANION: frequency 매우 높음, 습관적 동행
  if (score.frequency >= t.companion.minFrequency && score.warmth >= t.companion.minWarmth) {
    return "COMPANION"
  }

  // PROTEGE: depth + warmth 중고 (ALLY 조건 밖)
  if (score.depth >= t.protege.minDepth && score.warmth >= t.protege.minWarmth) {
    return "PROTEGE"
  }

  // MUSE: warmth 중고, depth 중, frequency 저 (빈도 낮지만 깊은 영감)
  if (
    score.warmth >= t.muse.minWarmth &&
    score.depth >= t.muse.minDepth &&
    score.frequency <= t.muse.maxFrequency
  ) {
    return "MUSE"
  }

  // ── [7] 기본값 ──
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
// v4.1: 모멘텀 시스템
// ══════════════════════════════════════════════════════════════

/**
 * 관계 모멘텀 계산.
 *
 * 모멘텀 = score.momentum (외부에서 업데이트된 값)
 * - 양수: 관계가 급속히 발전 중 (불안정)
 * - 0: 정체 (안정적)
 * - 음수: 관계가 쇠퇴 중
 *
 * 안정성: 빠른 진행은 불안정 (stability 낮음), 느린 진행은 안정적 (stability 높음)
 */
export function computeMomentum(score: RelationshipScore): MomentumInfo {
  const value = score.momentum ?? 0

  let classification: MomentumInfo["classification"]
  if (value > 0.3) classification = "rapid"
  else if (value > 0.05) classification = "gradual"
  else if (value >= -0.05) classification = "stagnant"
  else classification = "declining"

  // 안정성: 급속 진행 → 0.3, 점진 → 0.7, 정체 → 0.9, 쇠퇴 → 0.5
  const absValue = Math.abs(value)
  const stability = absValue > 0.3 ? 0.3 : absValue > 0.05 ? 0.7 : 0.9

  return { value, classification, stability }
}

/**
 * v4.1: 인터랙션 후 모멘텀 업데이트.
 *
 * 이전/이후 totalScore 차이를 기반으로 EMA(지수이동평균) 적용.
 * momentum = 0.7 * prev_momentum + 0.3 * scoreDelta
 */
export function updateMomentum(prevScore: RelationshipScore, newScore: RelationshipScore): number {
  const prevTotal = prevScore.warmth + prevScore.frequency + prevScore.depth
  const newTotal = newScore.warmth + newScore.frequency + newScore.depth
  const delta = newTotal - prevTotal

  const prevMomentum = prevScore.momentum ?? 0
  return clamp(0.7 * prevMomentum + 0.3 * delta, -1, 1)
}

// ══════════════════════════════════════════════════════════════
// v4.1+v4.2: 마일스톤 감지
// ══════════════════════════════════════════════════════════════

/**
 * 인터랙션 전후 스코어를 비교하여 새 마일스톤 감지.
 *
 * 이미 동일 type의 마일스톤이 있으면 중복 생성하지 않음.
 */
export function detectMilestones(
  prevScore: RelationshipScore,
  newScore: RelationshipScore,
  now: Date = new Date()
): RelationshipMilestone[] {
  const existing = newScore.milestones ?? []
  const existingTypes = new Set(existing.map((m) => m.type))
  const detected: RelationshipMilestone[] = []

  // ── v4.1 기존 5종 ──

  // 첫 논쟁: tension 급증
  if (
    !existingTypes.has("first_debate") &&
    newScore.tension - prevScore.tension >= MILESTONE_THRESHOLDS.firstDebate.tensionDelta
  ) {
    detected.push({ type: "first_debate", occurredAt: now, qualityDelta: -0.05 })
  }

  // 첫 취약성 공유: INTIMATE 이상 단계 진입
  if (!existingTypes.has("first_vulnerability")) {
    const newStage = determineStage(newScore)
    const stageIdx = FORWARD_STAGES.indexOf(newStage)
    const intimateIdx = FORWARD_STAGES.indexOf("INTIMATE")
    if (stageIdx >= intimateIdx) {
      detected.push({ type: "first_vulnerability", occurredAt: now, qualityDelta: 0.1 })
    }
  }

  // 첫 배신: tension ≥ 0.8 && warmth 급락
  if (
    !existingTypes.has("first_betrayal") &&
    newScore.tension >= MILESTONE_THRESHOLDS.firstBetrayal.minTension &&
    newScore.warmth - prevScore.warmth <= MILESTONE_THRESHOLDS.firstBetrayal.warmthDrop
  ) {
    detected.push({ type: "first_betrayal", occurredAt: now, qualityDelta: -0.15 })
  }

  // 첫 깊은 공유: depth ≥ 0.5 진입
  if (
    !existingTypes.has("first_deep_share") &&
    prevScore.depth < MILESTONE_THRESHOLDS.firstDeepShare.minDepth &&
    newScore.depth >= MILESTONE_THRESHOLDS.firstDeepShare.minDepth
  ) {
    detected.push({ type: "first_deep_share", occurredAt: now, qualityDelta: 0.05 })
  }

  // 화해: ESTRANGED 상태에서 tension 회복
  if (
    !existingTypes.has("reconciliation") &&
    isEstranged(prevScore) &&
    newScore.tension <= MILESTONE_THRESHOLDS.reconciliation.maxTension
  ) {
    detected.push({ type: "reconciliation", occurredAt: now, qualityDelta: 0.1 })
  }

  // ── v4.2 로맨틱 3종 ──

  const prevAttraction = prevScore.attraction ?? 0
  const newAttraction = newScore.attraction ?? 0

  // 첫 설렘: attraction이 0.3 이상으로 진입
  if (
    !existingTypes.has("first_flirt") &&
    prevAttraction < MILESTONE_THRESHOLDS.firstFlirt.minAttraction &&
    newAttraction >= MILESTONE_THRESHOLDS.firstFlirt.minAttraction
  ) {
    detected.push({ type: "first_flirt", occurredAt: now, qualityDelta: 0.03 })
  }

  // 고백: attraction이 0.7 이상 도달
  if (
    !existingTypes.has("confession") &&
    prevAttraction < MILESTONE_THRESHOLDS.confession.minAttraction &&
    newAttraction >= MILESTONE_THRESHOLDS.confession.minAttraction
  ) {
    detected.push({ type: "confession", occurredAt: now, qualityDelta: 0.08 })
  }

  // 이별: attraction ≥ 0.5 상태에서 warmth 급락
  if (
    !existingTypes.has("breakup") &&
    prevAttraction >= MILESTONE_THRESHOLDS.breakup.minPrevAttraction &&
    newScore.warmth - prevScore.warmth <= MILESTONE_THRESHOLDS.breakup.warmthDrop
  ) {
    detected.push({ type: "breakup", occurredAt: now, qualityDelta: -0.12 })
  }

  return detected
}

/**
 * v4.1: 마일스톤의 영구적 품질 보정값 합산.
 * summarizeRelationship() 프롬프트 컨텍스트에 반영.
 */
export function computeMilestoneQualityDelta(milestones: RelationshipMilestone[]): number {
  return milestones.reduce((sum, m) => sum + m.qualityDelta, 0)
}

// ══════════════════════════════════════════════════════════════
// v4.1: peakStage 추적
// ══════════════════════════════════════════════════════════════

/**
 * 현재 단계가 peakStage보다 높으면 peakStage를 갱신.
 * 반환값: 갱신된 peakStage (없으면 현재 단계)
 */
export function updatePeakStage(
  currentPeakStage: string | undefined,
  currentStage: RelationshipStage
): string {
  if (!currentPeakStage) return currentStage

  const peakIdx = FORWARD_STAGES.indexOf(currentPeakStage as RelationshipStage)
  const currentIdx = FORWARD_STAGES.indexOf(currentStage)

  // Decay 단계(COOLING/DORMANT/ESTRANGED)는 peak 갱신하지 않음
  if (currentIdx < 0) return currentPeakStage

  return currentIdx > peakIdx ? currentStage : currentPeakStage
}

// ══════════════════════════════════════════════════════════════
// 통합 API
// ══════════════════════════════════════════════════════════════

/** 관계 스코어 → 전체 관계 프로필 (시간 감쇠 미포함) */
export function computeRelationshipProfile(score: RelationshipScore): RelationshipProfile {
  const stage = determineStage(score)
  const type = determineType(score)
  const protocol = buildProtocol(stage, type)
  const stageProgress = computeStageProgress(score, stage)

  return {
    stage,
    type,
    protocol,
    stageProgress,
    momentum: computeMomentum(score),
    milestones: score.milestones,
  }
}

/**
 * 시간 감쇠를 포함한 관계 프로필 계산.
 *
 * COOLING/DORMANT/ESTRANGED 단계에서는:
 * - 유형(type)은 NEUTRAL로 리셋
 * - 행동 프로토콜이 축소됨
 */
export function computeRelationshipProfileWithDecay(
  score: RelationshipScore,
  now: Date = new Date()
): RelationshipProfile {
  const stage = determineStageWithDecay(score, now)

  // Decay 단계에서는 유형을 NEUTRAL로
  const isDecay = stage === "COOLING" || stage === "DORMANT" || stage === "ESTRANGED"
  const type = isDecay ? "NEUTRAL" : determineType(score)

  const protocol = buildProtocol(stage, type)
  const stageProgress = computeStageProgress(score, stage)

  return {
    stage,
    type,
    protocol,
    stageProgress,
    momentum: computeMomentum(score),
    milestones: score.milestones,
  }
}

/** 특정 톤이 허용되는지 확인 */
export function isToneAllowed(profile: RelationshipProfile, tone: string): boolean {
  return profile.protocol.allowedTones.includes(tone)
}

/** 인터랙션 확률 보정 계수 */
export function getInteractionMultiplier(profile: RelationshipProfile): number {
  return profile.protocol.interactionBoost
}

/** v4.2: 관계 요약 텍스트 생성 (프롬프트용) */
export function summarizeRelationship(
  score: RelationshipScore,
  profile: RelationshipProfile
): string {
  const parts: string[] = []

  parts.push(`관계 단계: ${profile.stage}`)
  parts.push(`관계 유형: ${profile.type}`)

  const attraction = score.attraction ?? 0
  parts.push(
    `지표: warmth=${score.warmth.toFixed(2)}, tension=${score.tension.toFixed(2)}, ` +
      `frequency=${score.frequency.toFixed(2)}, depth=${score.depth.toFixed(2)}` +
      (attraction > 0 ? `, attraction=${attraction.toFixed(2)}` : "")
  )

  // 단계별 설명
  if (profile.stage === "COOLING") {
    parts.push("관계 냉각 중 — 최근 교류 감소")
  }
  if (profile.stage === "DORMANT") {
    parts.push("장기 미교류 — 다시 만나면 어색할 수 있음")
  }
  if (profile.stage === "ESTRANGED") {
    parts.push("한때 가까웠으나 갈등으로 거리를 둔 상태 — 조심스러운 태도")
  }

  // v4.2: 유형별 행동 힌트
  const typeHints: Partial<Record<RelationshipType, string>> = {
    CRUSH: "설렘이 있지만 아직 표현하지 못함 — 호감을 숨기며 조심스럽게 행동",
    SWEETHEART: "서로 호감이 있음 — 장난스럽고 탐색적인 대화",
    LOVER: "깊은 로맨틱 관계 — 친밀하고 편안한 소통",
    SOULMATE: "영혼의 단짝 — 말하지 않아도 통하는 관계",
    EX: "전 연인 — 과거를 알지만 어색하고 조심스러움",
    OBSESSED: "상대에 대한 집착 — 과도한 관심과 불안정한 행동",
    GUARDIAN: "보호자 — 상대를 지키려는 본능, 비요청 조언",
    COMPANION: "동반자 — 늘 함께하는 일상적 존재",
    BESTIE: "절친 — 서로를 가장 잘 아는 BFF",
    TSUNDERE: "츤데레 — 겉으론 차갑게 굴지만 속으론 호감",
    TOXIC: "독성 관계 — 끊고 싶지만 끊지 못하는 파괴적 패턴",
    PUSH_PULL: "밀당 — 다가갔다 밀어내기 반복, 예측 불가",
  }
  const hint = typeHints[profile.type]
  if (hint) {
    parts.push(hint)
  }

  // 모멘텀 정보
  if (profile.momentum) {
    if (profile.momentum.classification === "rapid") {
      parts.push("관계가 급속히 발전 중 (불안정할 수 있음)")
    } else if (profile.momentum.classification === "declining") {
      parts.push("관계가 서서히 멀어지는 중")
    }
  }

  // 마일스톤 서술
  const milestones = profile.milestones ?? score.milestones ?? []
  if (milestones.length > 0) {
    const milestoneDescs: Record<RelationshipMilestone["type"], string> = {
      first_debate: "논쟁을 겪은 적 있음",
      first_vulnerability: "취약한 면을 공유한 적 있음",
      first_betrayal: "신뢰가 크게 손상된 적 있음",
      first_deep_share: "깊은 이야기를 나눈 적 있음",
      reconciliation: "갈등 후 화해한 적 있음",
      first_flirt: "서로에게 설렘을 느낀 적 있음",
      confession: "마음을 고백한 적 있음",
      breakup: "이별을 겪은 적 있음",
    }
    const descs = milestones.map((m) => milestoneDescs[m.type]).filter(Boolean)
    if (descs.length > 0) {
      parts.push(`관계 이력: ${descs.join(", ")}`)
    }
  }

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

/** 두 날짜 사이의 일수 계산 */
function getDaysSince(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.max(0, (to.getTime() - from.getTime()) / msPerDay)
}
