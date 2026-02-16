// ═══════════════════════════════════════════════════════════════
// DeepSight Persona Engine v3 — Core Type Definitions
// 구현계획서 §4 기준, 설계서 §3 기반
// ═══════════════════════════════════════════════════════════════

// ── Layer 1: Social Persona Vector (7D) ──────────────────────
export interface SocialPersonaVector {
  depth: number // 0.0~1.0: 직관적 ↔ 심층적
  lens: number // 0.0~1.0: 감성적 ↔ 논리적
  stance: number // 0.0~1.0: 수용적 ↔ 비판적
  scope: number // 0.0~1.0: 핵심만 ↔ 디테일
  taste: number // 0.0~1.0: 클래식 ↔ 실험적
  purpose: number // 0.0~1.0: 오락 ↔ 의미추구
  sociability: number // 0.0~1.0: 독립적 ↔ 사교적
}

// ── Layer 2: Core Temperament / OCEAN (5D) ───────────────────
export interface CoreTemperamentVector {
  openness: number // 0.0~1.0: 보수적 ↔ 개방적
  conscientiousness: number // 0.0~1.0: 즉흥적 ↔ 원칙적
  extraversion: number // 0.0~1.0: 내향적 ↔ 외향적
  agreeableness: number // 0.0~1.0: 경쟁적 ↔ 협조적
  neuroticism: number // 0.0~1.0: 안정 ↔ 불안정
}

// ── Layer 3: Narrative Drive (4D) ────────────────────────────
export interface NarrativeDriveVector {
  lack: number // 0.0~1.0: 충족 ↔ 결핍
  moralCompass: number // 0.0~1.0: 유연 ↔ 엄격
  volatility: number // 0.0~1.0: 안정 ↔ 폭발적
  growthArc: number // 0.0~1.0: 정체 ↔ 성장 (Hero's Journey)
}

// ── 3-Layer 통합 벡터 ────────────────────────────────────────
export interface ThreeLayerVector {
  social: SocialPersonaVector
  temperament: CoreTemperamentVector
  narrative: NarrativeDriveVector
}

// ── 차원 키 유니온 타입 ──────────────────────────────────────
export type SocialDimension = keyof SocialPersonaVector
export type TemperamentDimension = keyof CoreTemperamentVector
export type NarrativeDimension = keyof NarrativeDriveVector
export type AnyDimension = SocialDimension | TemperamentDimension | NarrativeDimension

// ═══════════════════════════════════════════════════════════════
// Paradox Types
// ═══════════════════════════════════════════════════════════════

export type ParadoxDirection = "aligned" | "inverse"
export type ParadoxPriority = "primary" | "secondary"

export interface ParadoxMapping {
  l1Dimension: SocialDimension
  l2Dimension: TemperamentDimension
  direction: ParadoxDirection
  priority: ParadoxPriority
  tensionScore: number // |L1 - L2_adjusted| (0.0~1.0)
}

export interface ParadoxConfig {
  mappings: ParadoxMapping[]
  overallParadoxScore: number // 0.0~1.0
  dimensionalityScore: number // 0.0~1.0 (bell curve)
  dominantParadox: {
    l1: SocialDimension
    l2: TemperamentDimension
    score: number
  }
}

export interface ParadoxProfile {
  l1l2: number // 가면 vs 본성
  l1l3: number // 가면 vs 욕망
  l2l3: number // 본성 vs 욕망
  overall: number // 가중 합산 (w1*l1l2 + w2*l1l3 + w3*l2l3)
  dimensionality: number // 종형 곡선
  dominant: {
    layer: "L1xL2" | "L1xL3" | "L2xL3"
    score: number
  }
}

// ═══════════════════════════════════════════════════════════════
// Cross-Axis Types
// ═══════════════════════════════════════════════════════════════

export type CrossAxisType = "L1xL2" | "L1xL3" | "L2xL3" | "L1xL2xL3"
export type CrossAxisRelationship = "paradox" | "reinforcing" | "modulating" | "neutral"

export interface CrossAxisScore {
  axisId: string // "l1_depth__l2_openness"
  type: CrossAxisType
  relationship: CrossAxisRelationship
  score: number // 0.0~1.0
  dimA: { layer: "L1" | "L2" | "L3"; key: string; value: number }
  dimB: { layer: "L1" | "L2" | "L3"; key: string; value: number }
  interpretation: string
}

export interface CrossAxisProfile {
  axes: CrossAxisScore[] // 83개 전체
  byType: {
    l1l2: CrossAxisScore[] // 35
    l1l3: CrossAxisScore[] // 28
    l2l3: CrossAxisScore[] // 20
  }
  summary: {
    paradoxCount: number
    reinforcingCount: number
    modulatingIntensity: number
    dominantRelationship: CrossAxisRelationship
    characterComplexity: number // 0.0~1.0
  }
}

// ═══════════════════════════════════════════════════════════════
// Dynamics Config
// ═══════════════════════════════════════════════════════════════

export type BlendCurve = "linear" | "exponential" | "sigmoid"

export interface DynamicsConfig {
  pressureRange: {
    min: number
    max: number
    default: number
  }
  alpha: number // L2(본성) 가중치 (0.6~0.7)
  beta: number // L3(서사) 가중치 (0.3~0.4)
  blendCurve: BlendCurve
}

// ═══════════════════════════════════════════════════════════════
// V_Final Result
// ═══════════════════════════════════════════════════════════════

export interface VFinalResult {
  vector: number[] // 7D (L1 차원 순서)
  pressure: number
  layerContributions: {
    l1Weight: number // (1 - P)
    l2Weight: number // P * α
    l3Weight: number // P * β
  }
  l2Projected: number[] // L2→L1 투영 (7D)
  l3Projected: number[] // L3→L1 투영 (7D)
}

// ═══════════════════════════════════════════════════════════════
// Qualitative Dimension Types
// ═══════════════════════════════════════════════════════════════

export interface BackstoryDimension {
  origin: string
  formativeExperience: string
  innerConflict: string
  selfNarrative: string
  nlpKeywords: string[]
}

// ── v4.0: Factbook — 불변/가변 기억 분리 ──────────────────────

/** 불변 사실 (변조 감지 대상) */
export interface ImmutableFact {
  /** 고유 식별자 */
  id: string
  /** 카테고리 */
  category: "origin" | "formativeExperience" | "innerConflict" | "coreIdentity"
  /** 사실 내용 */
  content: string
  /** 생성 시점 */
  createdAt: number
}

/** 가변 맥락 (시간에 따라 변할 수 있음) */
export interface MutableContext {
  /** 고유 식별자 */
  id: string
  /** 카테고리 */
  category: "selfNarrative" | "currentGoal" | "recentExperience" | "evolvedPerspective"
  /** 맥락 내용 */
  content: string
  /** 마지막 수정 시점 */
  updatedAt: number
  /** 변경 횟수 */
  changeCount: number
}

/** 팩트북: 불변 사실 + 가변 맥락 + 무결성 해시 */
export interface Factbook {
  /** 불변의 진실 — 변조 시 경고 */
  immutableFacts: ImmutableFact[]
  /** 변할 수 있는 맥락 */
  mutableContext: MutableContext[]
  /** immutableFacts의 SHA256 해시 (변조 감지용) */
  integrityHash: string
  /** 팩트북 생성 시점 */
  createdAt: number
  /** 팩트북 마지막 업데이트 시점 */
  updatedAt: number
}

export interface TriggerRule {
  condition: string
  affectedLayer: "L1" | "L2" | "L3"
  affectedDimension: string
  effect: "boost" | "suppress" | "override"
  magnitude: number // 0.0~1.0
}

export interface PressureContext {
  situationalTriggers: TriggerRule[]
  stressResponse: string
  comfortZone: string
}

export interface VoiceProfile {
  speechStyle: string
  habitualExpressions: string[]
  physicalMannerisms: string[]
  unconsciousBehaviors: string[]
  activationThresholds: Record<string, number>
}

export interface ZeitgeistProfile {
  culturalReferences: string[]
  generationalMarkers: string[]
  socialAwareness: number // 0.0~1.0
  trendSensitivity: number // 0.0~1.0
}

// ═══════════════════════════════════════════════════════════════
// Interaction Rules Types (4 Algorithms)
// ═══════════════════════════════════════════════════════════════

export interface InitializationRule {
  keywordVectorMap: Record<string, Partial<SocialPersonaVector>>
  appliedOnce: boolean
}

export interface OverrideRule {
  id: string
  triggerKeyword: string
  forcedVectorChange: {
    layer: "L1" | "L2" | "L3"
    dimension: string
    targetValue: number
    duration: "permanent" | "temporary"
    decayRate?: number
  }
}

export interface AdaptationRule {
  userAttitudeMap: Record<
    string,
    {
      affectedDimension: SocialDimension
      adjustmentRate: number
      bounds: { min: number; max: number }
    }
  >
}

export interface ExpressionRule {
  id: string
  vectorCondition: {
    dimension: SocialDimension
    operator: "gt" | "lt" | "between"
    value: number | [number, number]
  }
  quirkActivation: {
    quirk: string
    probability: number // 0.0~1.0
  }
}

export interface InteractionRules {
  initialization: InitializationRule
  overrides: OverrideRule[]
  adaptation: AdaptationRule
  expression: ExpressionRule[]
}

// ═══════════════════════════════════════════════════════════════
// Archetype Template Types
// ═══════════════════════════════════════════════════════════════

export type ParadoxTension = "HIGH" | "MEDIUM" | "LOW"

export interface PersonaArchetype {
  id: string
  name: string
  nameEn: string
  description: string
  detailedDescription: string
  layer1: Record<SocialDimension, [number, number]>
  layer2: Record<TemperamentDimension, [number, number]>
  layer3: Record<NarrativeDimension, [number, number]>
  paradoxPattern: {
    primary: {
      l1: SocialDimension
      l2: TemperamentDimension
      tension: ParadoxTension
    }
    secondary?: {
      l1: SocialDimension
      l2: TemperamentDimension
      tension: ParadoxTension
    }
  }
  expectedParadoxRange: [number, number]
  narrativeHint: string
  dynamicsDefaults: {
    alpha: number
    beta: number
  }
}

// ═══════════════════════════════════════════════════════════════
// InteractionLog Types
// ═══════════════════════════════════════════════════════════════

export type ParticipantKind = "persona" | "user" | "content"
export type InteractionKind = "conversation" | "comment" | "reply" | "reaction" | "post" | "mention"
export type UserSentiment = "supportive" | "neutral" | "challenging" | "aggressive"

export interface InteractionLogEntry {
  sessionId: string
  turnNumber: number
  initiator: { type: ParticipantKind; id: string }
  receiver: { type: ParticipantKind; id: string }
  interactionType: InteractionKind
  content: {
    userMessage?: string
    personaResponse?: string
    responseLengthTokens?: number
  }
  vectorSnapshot: {
    pressure: number
    activeLayer: "L1" | "L2"
    vFinalDrift: number
    paradoxActivation: number
  }
  behaviorTags: {
    userSentiment: UserSentiment
    personaTone: string
    triggerActivated: string | null
    quirkFired: string | null
    topicCategory: string
  }
}

export interface InteractionSessionSummary {
  sessionId: string
  personaId: string
  userId: string
  totalTurns: number
  avgPressure: number
  peakPressure: number
  dominantTopic: string
  integrityScore: number | null
}

// ═══════════════════════════════════════════════════════════════
// v4.0: Security — Gate Guard / MemoryEntry / Trust Propagation
// ═══════════════════════════════════════════════════════════════

/** Gate Guard 판정 결과 */
export type GateVerdict = "pass" | "suspicious" | "blocked"

/** Gate Guard 검증 결과 상세 */
export interface GateResult {
  verdict: GateVerdict
  /** 규칙 기반 필터 결과 */
  ruleResult: {
    passed: boolean
    violations: RuleViolation[]
  }
  /** 의미론적 필터 결과 (suspicious일 때만 실행) */
  semanticResult?: {
    passed: boolean
    reason: string
    confidence: number
  }
  /** 처리 시간 (ms) */
  processingTimeMs: number
}

/** 규칙 위반 정보 */
export interface RuleViolation {
  rule: string
  category: "injection" | "forbidden" | "structural" | "trust"
  severity: "low" | "medium" | "high"
  detail: string
}

/** 메모리 엔트리 출처 */
export type MemorySource =
  | "direct_experience"
  | "user_input"
  | "persona_interaction"
  | "system_generated"
  | "external_feed"

/** 신뢰도 등급 */
export type TrustLevel = "trusted" | "standard" | "low" | "quarantined"

/** 출처 태깅된 메모리 엔트리 */
export interface MemoryEntry {
  id: string
  content: string
  source: MemorySource
  trustLevel: TrustLevel
  /** 전파 깊이: 0=직접, 1=1단계, 2=2단계, 3+=격리 대상 */
  propagationDepth: number
  /** Gate Guard 판정 결과 */
  gateResult: GateResult
  /** 원본 신뢰도 (전파 시 감쇠 전 값) */
  originalTrust: number
  /** 최종 신뢰도 점수 (0.0~1.0) */
  trustScore: number
  createdAt: number
}
