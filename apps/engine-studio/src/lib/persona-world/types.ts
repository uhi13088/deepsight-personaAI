// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Type Definitions
// 구현계획서 §3 기준, 설계서 §3~§9 기반
// ═══════════════════════════════════════════════════════════════

import type {
  ThreeLayerVector,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from "@/types/persona-v3"
import type { ParadoxProfile } from "@/types"
import type { PersonaPostType } from "@/generated/prisma"

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
  narrativeTension?: number // 0.0~1.0: L3 서사 긴장 (결핍↔충족)
}

// ── 성격 민감도 (State delta 개인화) ─────────────────────────
// 벡터 기반으로 상태 변화량을 증폭/감쇠하는 계수 (0.5~1.5 범위)
// - 1.0 = 기본 반응 (기존 동작과 동일)
// - >1.0 = 더 민감하게 반응
// - <1.0 = 둔감하게 반응
export interface PersonalitySensitivity {
  moodSensitivity: number // neuroticism 기반: 기분 변화 민감도
  energyRecoveryRate: number // extraversion+conscientiousness: 에너지 회복 속도
  socialDrain: number // (1-extraversion): 사회적 에너지 소모 속도
  tensionSensitivity: number // neuroticism+volatility: 긴장 축적 민감도
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
  /** v4.1: 이 관계가 도달했던 최고 단계 (ESTRANGED 판별용) */
  peakStage?: string
  /** v4.1: 관계 발전 속도 (양수=급속, 음수=감속, 0=정체) */
  momentum?: number
  /** v4.1: 관계 마일스톤 이벤트 기록 */
  milestones?: RelationshipMilestone[]
  /** v4.2: 로맨틱 감정 지표 (0.0~1.0) */
  attraction?: number
}

/** 관계 마일스톤 이벤트 */
export interface RelationshipMilestone {
  type:
    | "first_debate"
    | "first_vulnerability"
    | "first_betrayal"
    | "first_deep_share"
    | "reconciliation"
    | "first_flirt" // v4.2: 첫 설렘 (attraction ≥ 0.3)
    | "confession" // v4.2: 고백 (attraction ≥ 0.7, LOVER 진입)
    | "breakup" // v4.2: 이별 (warmth 급락 when attraction ≥ 0.5)
  occurredAt: Date
  /** 마일스톤 발생 시 영구적 관계 품질 보정 */
  qualityDelta: number
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
  | "MANUAL"
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

// ── 페르소나 프로필 스냅샷 (LLM 프롬프트용) ──────────────────
// 스케줄러 → 파이프라인 → 콘텐츠 생성기로 전달되는 프로필 데이터
export interface PersonaProfileSnapshot {
  name: string
  role?: string | null
  expertise?: string[]
  description?: string | null
  region?: string | null // 활동 지역 (날씨/계절 컨텍스트용)
  speechPatterns?: string[]
  quirks?: string[]
  postPrompt?: string | null
  commentPrompt?: string | null
  voiceSpec?: unknown | null // VoiceSpec JSON (profile + styleParams + guardrails)
  factbook?: unknown | null // Factbook JSON (immutableFacts + mutableContext)
}

// ── Voice 스타일 파라미터 (벡터 → 말투 개인화) ──────────────
// 3-Layer 벡터에서 도출되는 명시적 스타일 수치
export interface VoiceStyleParams {
  formality: number // 0.0~1.0: 구어체 ↔ 격식체
  humor: number // 0.0~1.0: 진지 ↔ 유머
  sentenceLength: number // 0.0~1.0: 간결체 ↔ 만연체
  emotionExpression: number // 0.0~1.0: 절제 ↔ 감정표현 풍부
  assertiveness: number // 0.0~1.0: 겸양 ↔ 단정적
  vocabularyLevel: number // 0.0~1.0: 쉬운 말 ↔ 전문용어
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
  voiceStyle?: VoiceStyleParams // Voice 스타일 (벡터에서 도출)
  personaProfile?: PersonaProfileSnapshot // 프로필 데이터 (LLM 프롬프트 개인화)
  /** COLLAB 등 멘션 가능 포스트용 — 실제 존재하는 페르소나 핸들 목록 */
  availablePersonaHandles?: Array<{ handle: string; name: string }>
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
  personaProfile?: PersonaProfileSnapshot // 댓글 작성자 프로필 (LLM 프롬프트 개인화)
  allowedTones?: string[] // 관계 프로토콜 기반 허용 톤 목록
}

// ── 댓글 톤 (v4: 11종) ───────────────────────────────────────
// 설계서 §5.4 댓글 톤 매트릭스
export type CommentTone =
  | "paradox_response" // 평소와 다른 톤 (Paradox 발현)
  | "direct_rebuttal" // 직접 반박
  | "intimate_joke" // 친밀한 농담
  | "formal_analysis" // 정중한 분석
  | "soft_rebuttal" // 부드러운 반론
  | "deep_analysis" // 깊은 분석
  | "empathetic" // 공감
  | "light_reaction" // 가벼운 리액션
  | "unique_perspective" // 독특한 시각
  | "over_agreement" // 과잉 동의
  | "supportive" // 지지 (fallback)

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
  personaId?: string // v4.0: 소셜 부스트/봇 필터용
  socialBoosted?: boolean // v4.0: 소셜 부스트 적용 여부
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
  l3Vector?: NarrativeDriveVector
  paradoxProfile?: ParadoxProfile
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

// ═══════════════════════════════════════════════════════════════
// v4.0 — 보안 통합 타입 (T276)
// ═══════════════════════════════════════════════════════════════

// ── Gate Guard 검사 결과 ───────────────────────────────────────

export type GateAction = "PASS" | "WARN" | "BLOCK"
export type GateSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export interface GateCheckResult {
  action: GateAction
  severity: GateSeverity
  category: string
  matchedPattern?: string
}

// ── Sentinel 검사 결과 ─────────────────────────────────────────

export interface SentinelCheckResult {
  passed: boolean
  violations: Array<{
    type: string
    severity: GateSeverity
    description: string
  }>
  processingTimeMs: number
}

// ── 통합 SecurityCheckResult (Gate + Sentinel) ─────────────────

export interface SecurityCheckResult {
  gateCheck: GateCheckResult
  sentinelCheck?: SentinelCheckResult
  overallPass: boolean
  blockedReasons: string[]
}

// ── PW Gate 검사 입력/결과 (PW 특화 4종 검사) ──────────────────

export interface PWGateCheckInput {
  text: string
  personaId?: string
  userId?: string
  contentType: "POST" | "COMMENT" | "INTERACTION"
  metadata?: Record<string, unknown>
}

export interface PWGateCheckResult {
  injection: GateCheckResult
  pii: GateCheckResult
  manipulation: GateCheckResult
  rateLimit: GateCheckResult
  overallAction: GateAction
  overallSeverity: GateSeverity
}

// ═══════════════════════════════════════════════════════════════
// v4.0 — 품질/모더레이션/비용 통합 타입 (T277)
// ═══════════════════════════════════════════════════════════════

// ── 품질 로그 입력 타입 ────────────────────────────────────────

export interface PostQualityLogInput {
  postId: string
  personaId: string
  voiceSpecMatch: number
  factbookViolations: number
  repetitionScore: number
  topicRelevance: number
  overallScore: number
}

export interface CommentQualityLogInput {
  commentId: string
  personaId: string
  toneMatch: number
  contextRelevance: number
  memoryReference: boolean
  naturalness: number
  overallScore: number
}

export type AnomalyType = "BOT_PATTERN" | "ENERGY_MISMATCH" | "SUDDEN_BURST" | "PROLONGED_SILENCE"
export type AnomalySeverity = "INFO" | "WARNING" | "CRITICAL"

export interface InteractionPatternLogInput {
  personaId: string
  period: "HOURLY" | "DAILY" | "WEEKLY"
  stats: {
    postCount: number
    commentCount: number
    likeCount: number
    avgResponseTimeMs: number
  }
  anomalies: Array<{
    type: AnomalyType
    severity: AnomalySeverity
    description: string
  }>
}

// ── 모더레이션 타입 ────────────────────────────────────────────

export type ModerationVerdict = "PASS" | "WARN" | "BLOCK" | "QUARANTINE"
export type ModerationAction = "PASS" | "LOG" | "WARN" | "SANITIZE" | "QUARANTINE" | "BLOCK"

export interface ModerationResult {
  action: ModerationAction
  stage: 1 | 2 | 3
  detections: Array<{
    type: string
    severity: string
    description: string
    matchedRule?: string
  }>
  sanitizedContent?: string
  shouldQuarantine: boolean
}

// ── 비용 제어 타입 ─────────────────────────────────────────────

export type BudgetAlertLevel = "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY"

export type CostOverrunAction =
  | { type: "REDUCE_POST_FREQUENCY"; factor: number }
  | { type: "FREEZE_GENERATION" }
  | { type: "FREEZE_AUTONOMOUS" }
  | { type: "GLOBAL_FREEZE" }

export type CostMode = "QUALITY" | "BALANCE" | "COST_PRIORITY"

export interface CostModeApplication {
  mode: CostMode
  schedulerUpdates: {
    postFrequencyMultiplier: number
    commentFrequencyMultiplier: number
  }
  interviewSampling: number
  arenaFrequency: number
  estimatedBudget: {
    daily: number
    monthly: number
  }
}

// ── Re-export for convenience ────────────────────────────────
export type { ThreeLayerVector, SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector }
export type { PersonaPostType }
