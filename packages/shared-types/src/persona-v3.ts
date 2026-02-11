// ═══════════════════════════════════════════════════════════════
// DeepSight Persona Engine v3 — Shared Type Definitions
// 구현계획서 §4 기준, 설계서 §3 기반
// 패키지: @deepsight/shared-types
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
  growthArc: number // 0.0~1.0: 정체 ↔ 성장
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
  tensionScore: number
}

export interface ParadoxProfile {
  l1l2: number
  l1l3: number
  l2l3: number
  overall: number
  dimensionality: number
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

// ═══════════════════════════════════════════════════════════════
// Dynamics Config
// ═══════════════════════════════════════════════════════════════

export type BlendCurve = "linear" | "exponential" | "sigmoid"

export interface DynamicsConfig {
  pressureRange: { min: number; max: number; default: number }
  alpha: number
  beta: number
  blendCurve: BlendCurve
}

// ═══════════════════════════════════════════════════════════════
// InteractionLog Types
// ═══════════════════════════════════════════════════════════════

export type ParticipantKind = "persona" | "user" | "content"
export type InteractionKind = "conversation" | "comment" | "reply" | "reaction" | "post" | "mention"
export type UserSentiment = "supportive" | "neutral" | "challenging" | "aggressive"
