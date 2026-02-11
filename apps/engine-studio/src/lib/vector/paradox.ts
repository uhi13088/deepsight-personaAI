// ═══════════════════════════════════════════════════════════════
// Extended Paradox Score Engine
// 설계서 §3.6, 구현계획서 Phase 1, Tasks 1-5, 1-6
//
// EPS = w₁(0.50) × L1↔L2 + w₂(0.30) × L1↔L3 + w₃(0.20) × L2↔L3
// Dimensionality = exp(-(paradoxScore - 0.35)² / (2 × 0.2²))
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  ParadoxProfile,
  CrossAxisProfile,
} from "@/types"
import { L1_L2_PARADOX_MAPPINGS, EPS_WEIGHTS } from "@/constants/v3"

// ── L1↔L2 역설 점수 (가면 vs 본성) ─────────────────────────
// 7쌍의 역설 매핑에 가중치 적용
// primary: 1.0, secondary: 0.5
const PRIORITY_WEIGHTS = { primary: 1.0, secondary: 0.5 } as const

export function calculateL1L2ParadoxScore(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector
): number {
  let sumWeighted = 0
  let sumWeights = 0

  for (const mapping of L1_L2_PARADOX_MAPPINGS) {
    const l1Val = l1[mapping.l1]
    const l2Val = l2[mapping.l2]
    const adjusted = mapping.direction === "inverse" ? 1 - l2Val : l2Val
    const paradox = Math.abs(l1Val - adjusted)
    const weight = PRIORITY_WEIGHTS[mapping.type]

    sumWeighted += weight * paradox
    sumWeights += weight
  }

  return sumWeights > 0 ? sumWeighted / sumWeights : 0
}

// ── L1↔L3 역설 점수 (가면 vs 욕망) ─────────────────────────
// CrossAxisProfile에서 paradox 관계인 L1×L3 축의 평균
export function calculateL1L3ParadoxScore(crossAxisProfile: CrossAxisProfile): number {
  const paradoxAxes = crossAxisProfile.byType.l1l3.filter((a) => a.relationship === "paradox")
  if (paradoxAxes.length === 0) return 0
  return paradoxAxes.reduce((sum, a) => sum + a.score, 0) / paradoxAxes.length
}

// ── L2↔L3 역설 점수 (본성 vs 욕망) ─────────────────────────
// CrossAxisProfile에서 paradox 관계인 L2×L3 축의 평균
export function calculateL2L3ParadoxScore(crossAxisProfile: CrossAxisProfile): number {
  const paradoxAxes = crossAxisProfile.byType.l2l3.filter((a) => a.relationship === "paradox")
  if (paradoxAxes.length === 0) return 0
  return paradoxAxes.reduce((sum, a) => sum + a.score, 0) / paradoxAxes.length
}

// ── Dimensionality Score (종형 곡선) ────────────────────────
// 최적 역설 ≈ 0.35에서 최대값 1.0
// σ = 0.2 (표준편차)
const OPTIMAL_PARADOX = 0.35
const SIGMA = 0.2

export function calculateDimensionality(paradoxScore: number): number {
  return Math.exp(-((paradoxScore - OPTIMAL_PARADOX) ** 2) / (2 * SIGMA ** 2))
}

/**
 * Extended Paradox Score 전체 계산
 *
 * @param l1 - Social Persona Vector (7D)
 * @param l2 - Core Temperament Vector (5D)
 * @param l3 - Narrative Drive Vector (4D) (optional, 없으면 L1↔L3/L2↔L3 = 0)
 * @param crossAxisProfile - 미리 계산된 교차축 프로파일 (optional)
 * @returns ParadoxProfile (l1l2, l1l3, l2l3, overall, dimensionality, dominant)
 */
export function calculateExtendedParadoxScore(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  _l3?: NarrativeDriveVector,
  crossAxisProfile?: CrossAxisProfile
): ParadoxProfile {
  const l1l2 = calculateL1L2ParadoxScore(l1, l2)
  const l1l3 = crossAxisProfile ? calculateL1L3ParadoxScore(crossAxisProfile) : 0
  const l2l3 = crossAxisProfile ? calculateL2L3ParadoxScore(crossAxisProfile) : 0

  const overall = EPS_WEIGHTS.l1l2 * l1l2 + EPS_WEIGHTS.l1l3 * l1l3 + EPS_WEIGHTS.l2l3 * l2l3

  // dominant = 가장 높은 레이어 간 역설
  const scores = [
    { layer: "L1xL2" as const, score: l1l2 },
    { layer: "L1xL3" as const, score: l1l3 },
    { layer: "L2xL3" as const, score: l2l3 },
  ]
  const dominant = scores.reduce((max, s) => (s.score > max.score ? s : max))

  return {
    l1l2,
    l1l3,
    l2l3,
    overall,
    dimensionality: calculateDimensionality(overall),
    dominant,
  }
}
