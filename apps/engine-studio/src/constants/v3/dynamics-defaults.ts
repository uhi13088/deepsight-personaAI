// ═══════════════════════════════════════════════════════════════
// Dynamics Configuration Defaults
// 설계서 §5, 구현계획서 §14.2 기준
//
// V_Final[i] = clamp((1-P)*L1[i] + P*(α*L2proj[i] + β*L3proj[i]))
//   P = pressure (0.0~1.0)
//   α = L2 본성 가중치 (default 0.6)
//   β = L3 서사 가중치 (default 0.4)
//   α + β = 1.0
// ═══════════════════════════════════════════════════════════════

import type { DynamicsConfig, BlendCurve } from "@/types"

// ── 기본 Dynamics 설정 ───────────────────────────────────────
export const DYNAMICS_DEFAULTS: DynamicsConfig = {
  pressureRange: {
    min: 0.0,
    max: 1.0,
    default: 0.1,
  },
  alpha: 0.6,
  beta: 0.4,
  blendCurve: "linear",
} as const

// ── V_Final 연산 범위 ────────────────────────────────────────
export const VFINAL_PARAMS = {
  pressureBaseline: 0.1,
  alphaRange: { min: 0.55, max: 0.75 },
  betaRange: { min: 0.25, max: 0.45 },
  clampMin: 0.0,
  clampMax: 1.0,
} as const

// ── Blend Curve 옵션 ────────────────────────────────────────
export const BLEND_CURVES: { value: BlendCurve; label: string; description: string }[] = [
  {
    value: "linear",
    label: "선형",
    description: "Pressure에 비례하여 L2/L3 가중치 선형 증가",
  },
  {
    value: "exponential",
    label: "지수형",
    description: "높은 Pressure에서 급격히 L2/L3 영향 증가",
  },
  {
    value: "sigmoid",
    label: "S-커브",
    description: "중간 Pressure 구간에서 전환 (자연스러운 변화)",
  },
]

// ── Pressure Decay 공식 (§5.4) ──────────────────────────────
// decayConstant = 0.7 - 0.6 × volatility
// volatility 높을수록 decay 느림 (감정 회복 느림)
export const PRESSURE_DECAY = {
  baseDecay: 0.7,
  volatilityCoefficient: 0.6,
  minDecay: 0.1, // volatility=1.0일 때
  maxDecay: 0.7, // volatility=0.0일 때
} as const

// ── 아키타입별 α/β 기본값 ───────────────────────────────────
export const ARCHETYPE_DYNAMICS: Record<string, { alpha: number; beta: number }> = {
  "ironic-philosopher": { alpha: 0.55, beta: 0.45 },
  "wounded-critic": { alpha: 0.6, beta: 0.4 },
  "social-introvert": { alpha: 0.65, beta: 0.35 },
  "lazy-perfectionist": { alpha: 0.6, beta: 0.4 },
  "conservative-hipster": { alpha: 0.6, beta: 0.4 },
  "empathetic-debater": { alpha: 0.6, beta: 0.4 },
  "free-guardian": { alpha: 0.65, beta: 0.35 },
  "quiet-passionate": { alpha: 0.55, beta: 0.45 },
  "emotional-pragmatist": { alpha: 0.6, beta: 0.4 },
  "dangerous-mentor": { alpha: 0.55, beta: 0.45 },
  "explosive-intellectual": { alpha: 0.55, beta: 0.45 },
  "growing-cynic": { alpha: 0.55, beta: 0.45 },
}
