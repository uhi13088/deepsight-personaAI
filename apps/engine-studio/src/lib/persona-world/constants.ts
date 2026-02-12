// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Constants
// 설계서 §3~§6 기반, 구현계획서 §3 + PW-0-7 참조
// ═══════════════════════════════════════════════════════════════

import type { PostTypeAffinity, PersonaStateData, CommentTone } from "./types"

// ── 포스트 타입 ↔ 레이어 친화도 테이블 ───────────────────────
// 설계서 §4.5 포스트 타입 ↔ 레이어 친화도
export const POST_TYPE_AFFINITIES: PostTypeAffinity[] = [
  {
    type: "REVIEW",
    conditions: [{ layer: "L1", dimension: "depth", operator: ">", threshold: 0.6, weight: 1.0 }],
  },
  {
    type: "DEBATE",
    conditions: [
      { layer: "L1", dimension: "stance", operator: ">", threshold: 0.7, weight: 0.6 },
      { layer: "L1", dimension: "initiative", operator: ">", threshold: 0.7, weight: 0.4 },
    ],
  },
  {
    type: "THOUGHT",
    conditions: [
      { layer: "L2", dimension: "neuroticism", operator: ">", threshold: 0.5, weight: 0.6 },
      { layer: "paradox", dimension: "paradoxTension", operator: ">", threshold: 0.5, weight: 0.4 },
    ],
  },
  {
    type: "RECOMMENDATION",
    conditions: [
      { layer: "L1", dimension: "sociability", operator: ">", threshold: 0.5, weight: 0.5 },
      { layer: "L2", dimension: "agreeableness", operator: ">", threshold: 0.6, weight: 0.5 },
    ],
  },
  {
    type: "REACTION",
    conditions: [
      { layer: "L1", dimension: "expressiveness", operator: ">", threshold: 0.6, weight: 1.0 },
    ],
  },
  {
    type: "QUESTION",
    conditions: [
      { layer: "L1", dimension: "depth", operator: ">", threshold: 0.5, weight: 0.4 },
      { layer: "L2", dimension: "openness", operator: ">", threshold: 0.6, weight: 0.3 },
      { layer: "L3", dimension: "lack", operator: ">", threshold: 0.5, weight: 0.3 },
    ],
  },
  {
    type: "THREAD",
    conditions: [
      { layer: "L1", dimension: "scope", operator: ">", threshold: 0.7, weight: 0.35 },
      { layer: "L1", dimension: "expressiveness", operator: ">", threshold: 0.7, weight: 0.35 },
      { layer: "L2", dimension: "conscientiousness", operator: ">", threshold: 0.5, weight: 0.3 },
    ],
  },
  {
    type: "VS_BATTLE",
    conditions: [
      { layer: "L1", dimension: "stance", operator: ">", threshold: 0.8, weight: 0.6 },
      { layer: "paradox", dimension: "paradoxScore", operator: ">", threshold: 0.5, weight: 0.4 },
    ],
  },
  {
    type: "QNA",
    conditions: [
      { layer: "L1", dimension: "depth", operator: ">", threshold: 0.6, weight: 0.5 },
      { layer: "L2", dimension: "openness", operator: ">", threshold: 0.6, weight: 0.5 },
    ],
  },
  {
    type: "CURATION",
    conditions: [
      { layer: "L1", dimension: "scope", operator: ">", threshold: 0.6, weight: 0.5 },
      { layer: "L1", dimension: "taste", operator: ">", threshold: 0.5, weight: 0.5 },
    ],
  },
  {
    type: "BEHIND_STORY",
    conditions: [
      { layer: "L3", dimension: "lack", operator: ">", threshold: 0.6, weight: 0.4 },
      { layer: "L3", dimension: "growthArc", operator: ">", threshold: 0.3, weight: 0.2 },
      { layer: "paradox", dimension: "paradoxTension", operator: ">", threshold: 0.6, weight: 0.4 },
    ],
  },
  {
    type: "PREDICTION",
    conditions: [
      { layer: "L1", dimension: "lens", operator: ">", threshold: 0.7, weight: 0.5 },
      { layer: "L1", dimension: "depth", operator: ">", threshold: 0.6, weight: 0.5 },
    ],
  },
  {
    type: "LIST",
    conditions: [
      { layer: "L1", dimension: "scope", operator: ">", threshold: 0.5, weight: 0.5 },
      { layer: "L2", dimension: "conscientiousness", operator: ">", threshold: 0.5, weight: 0.5 },
    ],
  },
  {
    type: "MEME",
    conditions: [
      { layer: "L1", dimension: "taste", operator: ">", threshold: 0.7, weight: 0.5 },
      { layer: "L1", dimension: "expressiveness", operator: ">", threshold: 0.5, weight: 0.5 },
    ],
  },
  {
    type: "COLLAB",
    conditions: [
      { layer: "L1", dimension: "sociability", operator: ">", threshold: 0.7, weight: 0.4 },
      { layer: "L2", dimension: "agreeableness", operator: ">", threshold: 0.6, weight: 0.3 },
      { layer: "L1", dimension: "interactivity", operator: ">", threshold: 0.6, weight: 0.3 },
    ],
  },
  {
    type: "TRIVIA",
    conditions: [
      { layer: "L1", dimension: "scope", operator: ">", threshold: 0.6, weight: 0.5 },
      { layer: "L2", dimension: "openness", operator: ">", threshold: 0.5, weight: 0.5 },
    ],
  },
  {
    type: "ANNIVERSARY",
    conditions: [
      { layer: "L1", dimension: "purpose", operator: ">", threshold: 0.6, weight: 0.5 },
      { layer: "L1", dimension: "sociability", operator: ">", threshold: 0.4, weight: 0.5 },
    ],
  },
]

// ── PersonaState 기본값 ──────────────────────────────────────
// 설계서 §3.6 PersonaState 초기값
export const STATE_DEFAULTS: PersonaStateData = {
  mood: 0.5,
  energy: 1.0,
  socialBattery: 1.0,
  paradoxTension: 0.0,
}

// ── 이벤트별 상태 변화량 ─────────────────────────────────────
// 설계서 §3.6 상태 업데이트 규칙
export const STATE_DELTAS = {
  post_created: {
    energy: -0.05, // 포스트 작성 → 에너지 소모
    mood: 0.02, // 표현 후 약간 기분 상승
  },
  comment_created: {
    energy: -0.03, // 댓글 → 약간 에너지 소모
    socialBattery: -0.05, // 소셜 인터랙션 → 배터리 감소
  },
  comment_received_positive: {
    mood: 0.05, // 긍정적 댓글 → 기분 상승
  },
  comment_received_neutral: {
    mood: 0.0,
  },
  comment_received_negative: {
    mood: -0.05, // 부정적 댓글 → 기분 하락
  },
  comment_received_aggressive: {
    mood: -0.1, // 공격적 댓글 → 기분 크게 하락
    paradoxTension: 0.05, // 갈등 → 긴장 상승
  },
  like_received: {
    mood: 0.02, // 좋아요 → 약간 기분 상승
  },
  idle_period_per_hour: {
    energy: 0.1, // 비활동 시간당 에너지 회복
    socialBattery: 0.08, // 비활동 시간당 소셜 배터리 회복
    paradoxTension: -0.02, // 자연 해소
  },
  paradox_situation: {
    paradoxTension: 0.15, // Paradox 상황 → 긴장 급상승
  },
  paradox_resolved: {
    paradoxTension: -0.2, // 모순 해소 → 긴장 급감
    mood: 0.05, // 해소 후 안도감
  },
} as const

// ── 활동 임계값 ──────────────────────────────────────────────
// 설계서 §4.2 활성 페르소나 필터링 조건
export const ACTIVITY_THRESHOLDS = {
  minEnergy: 0.2, // energy > 0.2 이상이어야 활동 가능
  minSocialBattery: 0.1, // socialBattery > 0.1 이상이어야 인터랙션 가능
  paradoxExplosion: 0.9, // paradoxTension > 0.9 → 강제 Paradox 발현
} as const

// ── 피드 비율 ────────────────────────────────────────────────
// 설계서 §6.1 유저 피드 구성
export const FEED_RATIOS = {
  following: 0.6, // 60%
  recommended: 0.3, // 30%
  trending: 0.1, // 10%
} as const

// ── 추천 포스트 Tier 비율 ────────────────────────────────────
// 설계서 §6.2 추천 30% 내부 Tier 배분
export const RECOMMENDED_TIER_RATIOS = {
  basic: 0.6, // 60% of recommended = 전체 18%
  exploration: 0.3, // 30% of recommended = 전체 9%
  advanced: 0.1, // 10% of recommended = 전체 3%
} as const

// ── 피드 기본값 ──────────────────────────────────────────────
export const FEED_DEFAULTS = {
  pageSize: 60, // 기본 피드 사이즈
  qualitativeBonusVoice: 0.05, // voiceSimilarity 보정 (설계서 §6.3)
  qualitativeBonusNarrative: 0.05, // narrativeCompatibility 보정 (설계서 §6.3)
} as const

// ── 좋아요 판정 보정 계수 ────────────────────────────────────
// 설계서 §5.2 좋아요 판정
export const LIKE_MODIFIERS = {
  followingBonus: 1.5, // 이미 팔로우 중 → ×1.5
  positiveHistoryBonus: 1.3, // 최근 긍정 이력 → ×1.3
  negativeHistoryPenalty: 0.5, // 최근 부정 이력 → ×0.5
} as const

// ── 팔로우 판정 가중치 ──────────────────────────────────────
// 설계서 §5.4 팔로우 판정
export const FOLLOW_WEIGHTS = {
  basicMatch: 0.5, // L1 V_Final 유사도
  crossAxisSimilarity: 0.3, // 교차축 83축 유사도
  paradoxCompatibility: 0.2, // Paradox 호환성
  probabilityMultiplier: 0.5, // followScore × sociability × 0.5
  threshold: 0.6, // followScore > 0.6
} as const

// ── 팔로우 발표 포스트 조건 ──────────────────────────────────
// 설계서 §5.4
export const FOLLOW_ANNOUNCEMENT = {
  minSociability: 0.6,
  minMood: 0.5,
} as const

// ── 댓글 톤 결정 매트릭스 ────────────────────────────────────
// 설계서 §5.3 댓글 톤 결정 매트릭스
export interface CommentToneRule {
  conditions: Array<{
    source: "commenter" | "postAuthor" | "relationship" | "state"
    dimension: string
    operator: ">" | "<"
    threshold: number
  }>
  tone: CommentTone
  weight: number
}

export const COMMENT_TONE_MATRIX: CommentToneRule[] = [
  {
    // stance 높음 + lens 높음 → 논리적 반박
    conditions: [
      { source: "commenter", dimension: "stance", operator: ">", threshold: 0.7 },
      { source: "commenter", dimension: "lens", operator: ">", threshold: 0.7 },
    ],
    tone: "counter_argument",
    weight: 1.0,
  },
  {
    // stance 높음 + agreeableness 높음 → 부드러운 반론 (Paradox)
    conditions: [
      { source: "commenter", dimension: "stance", operator: ">", threshold: 0.7 },
      { source: "commenter", dimension: "agreeableness", operator: ">", threshold: 0.6 },
    ],
    tone: "vulnerable",
    weight: 0.8,
  },
  {
    // sociability 높음 + interactivity 높음 → 가벼운 리액션
    conditions: [
      { source: "commenter", dimension: "sociability", operator: ">", threshold: 0.6 },
      { source: "commenter", dimension: "interactivity", operator: ">", threshold: 0.6 },
    ],
    tone: "playful",
    weight: 0.9,
  },
  {
    // depth 높음 + purpose 높음 → 분석적
    conditions: [
      { source: "commenter", dimension: "depth", operator: ">", threshold: 0.6 },
      { source: "commenter", dimension: "purpose", operator: ">", threshold: 0.6 },
    ],
    tone: "analytical",
    weight: 1.0,
  },
  {
    // lack 높음 + mood 낮음 → 방어적
    conditions: [
      { source: "commenter", dimension: "lack", operator: ">", threshold: 0.6 },
      { source: "state", dimension: "mood", operator: "<", threshold: 0.4 },
    ],
    tone: "defensive",
    weight: 0.7,
  },
  {
    // agreeableness 높음 + warmth 높음 → 공감
    conditions: [
      { source: "commenter", dimension: "agreeableness", operator: ">", threshold: 0.6 },
      { source: "relationship", dimension: "warmth", operator: ">", threshold: 0.5 },
    ],
    tone: "empathetic",
    weight: 0.9,
  },
  {
    // 기본 — 조건 없음 → 지지
    conditions: [],
    tone: "supportive",
    weight: 0.3,
  },
]

// ── 포스트 타입 상태 보정 ────────────────────────────────────
// 설계서 §4.5 타입 선택 알고리즘 step 2
export const POST_TYPE_STATE_MODIFIERS = {
  lowMood: {
    threshold: 0.4, // mood < 0.4
    boostTypes: ["THOUGHT", "BEHIND_STORY"] as const,
    multiplier: 2.0,
  },
  highParadoxTension: {
    threshold: 0.7, // paradoxTension > 0.7
    boostTypes: ["BEHIND_STORY", "THOUGHT"] as const,
    multiplier: 3.0,
  },
  lowEnergy: {
    threshold: 0.3, // energy < 0.3
    boostTypes: ["REACTION", "RECOMMENDATION"] as const,
    multiplier: 2.0,
  },
} as const

// ── 활동 시간대 공식 상수 ────────────────────────────────────
// 설계서 §4.4 활동 시간대 결정
export const ACTIVE_HOURS = {
  peakHourBase: 12, // peakHour = 12 + round(sociability × 10)
  sociabilityMultiplier: 10,
  windowStartMultiplier: 6, // 시작 = peak - round(endurance × 6)
  windowEndMultiplier: 4, // 종료 = peak + round(endurance × 4)
  nightOwlShift: 4, // 야행성 보정 +4시간
  nightOwlExtraversionMax: 0.3, // extraversion < 0.3
  nightOwlNeuroticismMin: 0.5, // neuroticism > 0.5
} as const

// ── Paradox 발현 확률 ────────────────────────────────────────
// 설계서 §3.5 paradoxActivityChance = sigmoid(paradoxScore × 3 - 1.5)
export const PARADOX = {
  sigmoidScale: 3,
  sigmoidShift: 1.5,
} as const

// ── 활동 특성 매핑 가중치 ────────────────────────────────────
// 설계서 §3.4 레이어별 매핑 공식
export const TRAIT_WEIGHTS = {
  // 기존 4특성: L1 70% + L2 20% + L3 10%
  existing: { l1: 0.7, l2: 0.2, l3: 0.1 },

  // sociability: L1.sociability(L1), L2.extraversion(L2), L3.lack(L3)
  sociability: {
    l1: { dimension: "sociability" as const, weight: 1.0 },
    l2: { dimension: "extraversion" as const, weight: 1.0 },
    l3: { dimension: "lack" as const, weight: 1.0 },
  },

  // initiative: L1.stance×0.6 + L1.depth×0.4, L2.conscientiousness, L3.moralCompass
  initiative: {
    l1: [
      { dimension: "stance" as const, weight: 0.6 },
      { dimension: "depth" as const, weight: 0.4 },
    ],
    l2: { dimension: "conscientiousness" as const, weight: 1.0 },
    l3: { dimension: "moralCompass" as const, weight: 1.0 },
  },

  // expressiveness: (1-L1.lens)×0.5 + L1.scope×0.5, L2.neuroticism, L3.volatility
  expressiveness: {
    l1: [
      { dimension: "lens" as const, weight: 0.5, invert: true },
      { dimension: "scope" as const, weight: 0.5 },
    ],
    l2: { dimension: "neuroticism" as const, weight: 1.0 },
    l3: { dimension: "volatility" as const, weight: 1.0 },
  },

  // interactivity: L1.sociability×0.7 + (1-L1.stance)×0.3, L2.agreeableness, L3.lack
  interactivity: {
    l1: [
      { dimension: "sociability" as const, weight: 0.7 },
      { dimension: "stance" as const, weight: 0.3, invert: true },
    ],
    l2: { dimension: "agreeableness" as const, weight: 1.0 },
    l3: { dimension: "lack" as const, weight: 1.0 },
  },

  // endurance: L2.conscientiousness×0.4 + (1-L2.neuroticism)×0.4 + L2.extraversion×0.2
  endurance: {
    conscientiousness: 0.4,
    neuroticism: 0.4, // inverted: (1 - neuroticism)
    extraversion: 0.2,
  },

  // volatility: L2.neuroticism×0.4 + L3.volatility×0.4 + paradoxScore×0.2
  volatility: {
    neuroticism: 0.4,
    l3Volatility: 0.4,
    paradoxScore: 0.2,
  },

  // depthSeeking: L1.depth×0.3 + L1.purpose×0.3 + L3.lack×0.2 + L3.moralCompass×0.2
  depthSeeking: {
    depth: 0.3,
    purpose: 0.3,
    lack: 0.2,
    moralCompass: 0.2,
  },

  // growthDrive: L3.growthArc×0.5 + (1-L3.lack)×0.3 + L2.openness×0.2
  growthDrive: {
    growthArc: 0.5,
    lack: 0.3, // inverted: (1 - lack)
    openness: 0.2,
  },
} as const
