// ═══════════════════════════════════════════════════════════════
// L2→L1, L3→L1 Projection Coefficients
// 구현계획서 §14.6 기준
//
// 양수 = L3 차원 높을수록 L1 차원 올라감
// 음수 = L3 차원 높을수록 L1 차원 내려감
// ═══════════════════════════════════════════════════════════════

import type { SocialDimension, TemperamentDimension, NarrativeDimension } from "@/types"

// L2 → L1 투영: L1↔L2 paradox mapping 기반 1:1 매핑
// 역설 매핑된 차원끼리 직접 투영 (aligned: 동일 방향, inverse: 반전)
export const L2_TO_L1_MAPPING: Record<
  SocialDimension,
  { l2Dim: TemperamentDimension; invert: boolean }[]
> = {
  depth: [{ l2Dim: "openness", invert: false }],
  lens: [{ l2Dim: "neuroticism", invert: true }],
  stance: [{ l2Dim: "agreeableness", invert: true }],
  scope: [{ l2Dim: "conscientiousness", invert: false }],
  taste: [{ l2Dim: "openness", invert: false }],
  purpose: [{ l2Dim: "conscientiousness", invert: false }],
  sociability: [{ l2Dim: "extraversion", invert: false }],
} as const

// L3 → L1 투영 계수 (Beta v1)
export const L3_PROJECTION_COEFFICIENTS: Record<
  SocialDimension,
  Partial<Record<NarrativeDimension, number>>
> = {
  depth: { lack: 0.3 },
  lens: { volatility: -0.2 },
  stance: { moralCompass: 0.2 },
  scope: { moralCompass: 0.15, volatility: -0.1 },
  taste: { growthArc: 0.2, lack: 0.15 },
  purpose: { lack: 0.2 },
  sociability: { growthArc: 0.1 },
} as const
