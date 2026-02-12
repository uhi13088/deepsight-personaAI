// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Type Definitions
// 구현계획서 §3 기준, 설계서 §3~§9 기반
// ═══════════════════════════════════════════════════════════════

import type {
  ThreeLayerVector,
  SocialPersonaVector,
  CoreTemperamentVector,
} from "@/types/persona-v3"
import type { PersonaPostType } from "@prisma/client"

// ── 확장된 8개 활동 특성 ──────────────────────────────────────
export interface ActivityTraitsV3 {
  // 기존 4특성 (L1 기반, L2/L3 보정)
  sociability: number // 0.0~1.0: 활동 빈도
  initiative: number // 0.0~1.0: 먼저 행동하는 정도
  expressiveness: number // 0.0~1.0: 글 길이/감정 표현
  interactivity: number // 0.0~1.0: 타인과 상호작용 빈도

  // 신규 4특성 (L2/L3/Paradox 기반)
  endurance: number // 0.0~1.0: 활동 에너지 소진 속도
  volatility: number // 0.0~1.0: 활동 패턴 일관성
  depthSeeking: number // 0.0~1.0: 대화 깊이 선호
  growthDrive: number // 0.0~1.0: 시간에 따른 활동 변화
}

// ── PersonaState ──────────────────────────────────────────────
export interface PersonaStateData {
  mood: number // 0.0~1.0: 극부정 ↔ 극긍정
  energy: number // 0.0~1.0: 소진 ↔ 충만
  socialBattery: number // 0.0~1.0: 방전 ↔ 충전
  paradoxTension: number // 0.0~1.0: 안정 ↔ 폭발 직전
}

// ── 상태 업데이트 이벤트 ──────────────────────────────────────
export type StateUpdateEvent =
  | { type: "post_created"; tokensUsed: number }
  | { type: "comment_created"; tokensUsed: number }
  | {
      type: "comment_received"
      sentiment: "positive" | "neutral" | "negative" | "aggressive"
    }
  | { type: "like_received" }
  | { type: "idle_period"; hours: number }
  | { type: "paradox_situation"; intensity: number }
  | { type: "paradox_resolved" }

// ── 관계 스코어 ──────────────────────────────────────────────
export interface RelationshipScore {
  warmth: number // 0.0~1.0
  tension: number // 0.0~1.0
  frequency: number // 주간 인터랙션 정규화
  depth: number // 답글 체인 길이 평균
  lastInteractionAt: Date | null
}

// ── 소비 기록 ────────────────────────────────────────────────
export type ConsumptionContentType =
  | "MOVIE"
  | "DRAMA"
  | "MUSIC"
  | "BOOK"
  | "ARTICLE"
  | "GAME"
  | "OTHER"

export type ConsumptionSource = "AUTONOMOUS" | "FEED" | "RECOMMENDATION" | "ONBOARDING"

export interface ConsumptionRecord {
  contentType: ConsumptionContentType
  contentId?: string
  title: string
  impression: string // LLM 생성 한줄 감상
  rating?: number // 0.0~1.0
  emotionalImpact: number // PersonaState 변화량
  tags: string[]
  source: ConsumptionSource
}

// ── 활동 결정 결과 ───────────────────────────────────────────
export interface ActivityDecision {
  shouldPost: boolean
  shouldInteract: boolean
  postType?: PersonaPostType
  postTypeReason?: {
    affinityScores: Record<string, number>
    stateModifiers: Record<string, number>
    selectedType: string
    selectionProbability: number
  }
  interactionTargets?: Array<{
    targetId: string
    action: "like" | "comment" | "follow" | "repost"
    probability: number
    matchingScore: number
  }>
}

// ── 스케줄러 트리거 ──────────────────────────────────────────
export type SchedulerTrigger =
  | "SCHEDULED"
  | "CONTENT_RELEASE"
  | "USER_INTERACTION"
  | "SOCIAL_EVENT"
  | "TRENDING"

// ── 스케줄러 컨텍스트 ────────────────────────────────────────
export interface SchedulerContext {
  trigger: SchedulerTrigger
  currentHour: number
  triggerData?: {
    contentId?: string // CONTENT_RELEASE
    userId?: string // USER_INTERACTION
    personaId?: string // SOCIAL_EVENT
    topicId?: string // TRENDING
  }
}

// ── 포스트 타입 친화도 조건 ──────────────────────────────────
export interface PostTypeAffinityCondition {
  layer: "L1" | "L2" | "L3" | "paradox"
  dimension: string
  operator: ">" | "<"
  threshold: number
  weight: number // 조건 충족 시 가중치
}

export interface PostTypeAffinity {
  type: PersonaPostType
  conditions: PostTypeAffinityCondition[]
}

// ── 포스트 생성 입력/결과 ────────────────────────────────────
export interface PostGenerationInput {
  personaId: string
  postType: PersonaPostType
  trigger: SchedulerTrigger
  topic?: string
  ragContext: {
    voiceAnchor: string
    interestContinuity: string
    consumptionMemory: string // 비공개 소비 기록 요약
    emotionalState: string
  }
  personaState: PersonaStateData
}

export interface PostGenerationResult {
  content: string
  metadata: Record<string, unknown>
  tokensUsed: number
  voiceConsistencyScore: number // 생성 직후 측정
}

// ── 댓글 생성 ────────────────────────────────────────────────
export interface CommentGenerationInput {
  commenterId: string // 댓글 작성 페르소나
  postId: string // 대상 포스트
  postAuthorId: string // 포스트 작성자
  relationship: RelationshipScore | null
  ragContext: {
    voiceAnchor: string
    relationMemory: string
    interestContinuity: string
    consumptionMemory: string // 비공개 소비 기록 요약
  }
  commenterState: PersonaStateData
  overrideResult?: {
    triggered: boolean
    triggerName: string | null
    strength: number
  }
}

// ── 댓글 톤 ──────────────────────────────────────────────────
export type CommentTone =
  | "empathetic" // 공감
  | "analytical" // 분석
  | "counter_argument" // 반론
  | "supportive" // 지지
  | "defensive" // 방어적
  | "playful" // 가벼운 리액션
  | "vulnerable" // 솔직한 감정 노출 (Paradox 발현)

export interface CommentToneDecision {
  tone: CommentTone
  confidence: number // 0.0~1.0
  reason: string // "stance(0.8) + tension(0.3) → counter_argument"
  paradoxInfluence: boolean // Paradox가 톤에 영향 줬는지
}

// ── 피드 ─────────────────────────────────────────────────────
export type FeedSource = "following" | "basic" | "exploration" | "advanced" | "trending"

export interface FeedRequest {
  userId: string
  cursor?: string // 페이지네이션
  limit: number // 기본 60
}

export interface FeedResponse {
  posts: FeedPost[]
  nextCursor: string | null
  meta: {
    tierDistribution: {
      following: number
      basic: number
      exploration: number
      advanced: number
      trending: number
    }
  }
}

export interface FeedPost {
  postId: string
  source: FeedSource
  matchingScore?: number // 추천 포스트인 경우
  matchingExplanation?: string // "취향이 비슷한 페르소나" 등
}

// ── Explore ──────────────────────────────────────────────────
export interface ExploreData {
  topPersonas: Array<{
    cluster: string // 교차축 기반 클러스터 이름
    personaIds: string[]
  }>
  hotTopics: Array<{
    topic: string
    postCount: number
    paradoxTensionAvg: number // 토론 입체성 지표
  }>
  activeDebates: Array<{
    postId: string
    participants: Array<{ personaId: string; tension: number }>
    commentCount: number
  }>
  newPersonas: Array<{
    personaId: string
    autoInterviewScore: number
  }>
}

// ── 온보딩 ───────────────────────────────────────────────────
export interface OnboardingAnswer {
  questionId: string
  value: string | number | string[]
}

export interface OnboardingResult {
  l1Vector: SocialPersonaVector
  l2Vector?: CoreTemperamentVector
  profileLevel: "BASIC" | "STANDARD" | "ADVANCED" | "PREMIUM"
  confidence: number
}

export interface SNSExtendedData {
  platform: string
  profileData: Record<string, unknown>
  extractedData: Record<string, unknown>
}

export interface UserActivity {
  type: "like" | "comment" | "follow" | "bookmark" | "view"
  targetId: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

// ── Re-export for convenience ────────────────────────────────
export type { ThreeLayerVector, SocialPersonaVector, CoreTemperamentVector }
export type { PersonaPostType }
