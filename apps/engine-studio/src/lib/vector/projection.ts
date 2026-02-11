// ═══════════════════════════════════════════════════════════════
// L2→L1 / L3→L1 Projection Functions
// 구현계획서 Phase 1, Tasks 1-2, 1-3
//
// L2→L1: OCEAN 5D → Social Persona 7D (1:1 매핑, 역설 기반)
// L3→L1: Narrative 4D → Social Persona 7D (가중 계수, 0.5 기반)
// ═══════════════════════════════════════════════════════════════

import type { CoreTemperamentVector, NarrativeDriveVector, SocialDimension } from "@/types"
import { L2_TO_L1_MAPPING, L3_PROJECTION_COEFFICIENTS } from "@/constants/v3"
import { clamp } from "./utils"

// ── L1 차원 순서 (DB dim1~dim7 순서와 동일) ─────────────────
const L1_DIM_ORDER: SocialDimension[] = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
]

/**
 * L2 (OCEAN 5D) → L1 (Social 7D) 투영
 *
 * 각 L1 차원은 1개의 L2 차원에서 1:1 매핑.
 * - aligned(invert=false): L1[i] = L2[j]
 * - inverse(invert=true):  L1[i] = 1 - L2[j]
 *
 * @returns 7D array [depth, lens, stance, scope, taste, purpose, sociability]
 */
export function projectL2toL1(l2: CoreTemperamentVector): number[] {
  return L1_DIM_ORDER.map((dim) => {
    const mapping = L2_TO_L1_MAPPING[dim][0]
    const l2Value = l2[mapping.l2Dim]
    return mapping.invert ? 1 - l2Value : l2Value
  })
}

/**
 * L3 (Narrative 4D) → L1 (Social 7D) 투영
 *
 * 기준값 0.5(중립)에서 L3 계수만큼 이동.
 * - 양수 계수: L3 높을수록 L1 올라감
 * - 음수 계수: L3 높을수록 L1 내려감
 *
 * 예: depth = clamp(0.5 + lack × 0.3)
 *     lens = clamp(0.5 + volatility × -0.2)
 *
 * @returns 7D array [depth, lens, stance, scope, taste, purpose, sociability]
 */
export function projectL3toL1(l3: NarrativeDriveVector): number[] {
  return L1_DIM_ORDER.map((dim) => {
    const coeffs = L3_PROJECTION_COEFFICIENTS[dim]
    let value = 0.5 // neutral baseline

    for (const [l3Dim, coeff] of Object.entries(coeffs)) {
      value += l3[l3Dim as keyof NarrativeDriveVector] * coeff
    }

    return clamp(value)
  })
}

/**
 * L1 차원 순서 배열 (외부 참조용)
 */
export { L1_DIM_ORDER }
