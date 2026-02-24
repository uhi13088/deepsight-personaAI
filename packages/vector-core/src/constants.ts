// ═══════════════════════════════════════════════════════════════
// @deepsight/vector-core — Constants
// 설계서 §9.2
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
} from "@deepsight/shared-types"

// ── 차원 키 배열 ─────────────────────────────────────────────

export const L1_DIMS: readonly SocialDimension[] = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
] as const

export const L2_DIMS: readonly TemperamentDimension[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const

export const L3_DIMS: readonly NarrativeDimension[] = [
  "lack",
  "moralCompass",
  "volatility",
  "growthArc",
] as const

// ── 기본 벡터 (중립 0.5) ────────────────────────────────────

export const L1_BASE: SocialPersonaVector = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
}

export const L2_BASE: CoreTemperamentVector = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5,
}

export const L3_BASE: NarrativeDriveVector = {
  lack: 0.5,
  moralCompass: 0.5,
  volatility: 0.5,
  growthArc: 0.5,
}

// ── 온보딩 신뢰도 (설계서 §9.2) ─────────────────────────────

export const ONBOARDING_CONFIDENCE = {
  LIGHT: 0.65,
  MEDIUM: 0.8,
  DEEP: 0.93,
} as const
