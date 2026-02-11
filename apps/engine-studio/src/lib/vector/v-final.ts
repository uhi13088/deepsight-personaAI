// ═══════════════════════════════════════════════════════════════
// V_Final Calculation Engine
// 설계서 §3.5, §5, 구현계획서 Phase 1, Task 1-7
//
// V_Final[i] = clamp(
//   (1-P) × L1[i] + P × (α × L2proj[i] + β × L3proj[i])
// )
//
// P = Pressure (0.0~1.0)
// α = L2 가중치 (default 0.6)
// β = L3 가중치 (default 0.4, α + β = 1.0)
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
  VFinalResult,
} from "@/types"
import { DYNAMICS_DEFAULTS } from "@/constants/v3"
import { projectL2toL1, projectL3toL1, L1_DIM_ORDER } from "./projection"
import { clamp, validateVector } from "./utils"

/**
 * V_Final 계산
 *
 * @param l1 - Social Persona (7D, 가면)
 * @param l2 - Core Temperament (5D, 본성)
 * @param l3 - Narrative Drive (4D, 욕망)
 * @param pressure - 상황 압력 (0.0=평온, 1.0=위기)
 * @param alpha - L2 가중치 (default: 0.6)
 * @param beta - L3 가중치 (default: 1 - alpha)
 * @returns VFinalResult
 */
export function calculateVFinal(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  pressure: number = DYNAMICS_DEFAULTS.pressureRange.default,
  alpha: number = DYNAMICS_DEFAULTS.alpha,
  beta?: number
): VFinalResult {
  // ── 입력 검증 ──────────────────────────────────────────────
  const p = clamp(pressure)
  const a = clamp(alpha)
  const b = beta !== undefined ? clamp(beta) : 1.0 - a

  // α + β = 1.0 검증 (허용 오차 0.01)
  if (Math.abs(a + b - 1.0) > 0.01) {
    throw new Error(`alpha + beta must equal 1.0, got ${a} + ${b} = ${a + b}`)
  }

  // 벡터 유효성 검증
  const l1Validation = validateVector(l1 as unknown as Record<string, number>, "L1")
  if (!l1Validation.valid) {
    throw new Error(`Invalid L1 vector: ${l1Validation.errors.join(", ")}`)
  }

  // ── Step 1: L2/L3 → L1 투영 ───────────────────────────────
  const l1Base = L1_DIM_ORDER.map((dim) => l1[dim])
  const l2Projected = projectL2toL1(l2)
  const l3Projected = projectL3toL1(l3)

  // ── Step 2: V_Final 연산 ───────────────────────────────────
  // V_Final[i] = clamp((1-P) × L1[i] + P × (α × L2proj[i] + β × L3proj[i]))
  const vector = l1Base.map((v1, i) => {
    const blended = (1 - p) * v1 + p * (a * l2Projected[i] + b * l3Projected[i])
    return clamp(blended)
  })

  return {
    vector,
    pressure: p,
    layerContributions: {
      l1Weight: 1 - p,
      l2Weight: p * a,
      l3Weight: p * b,
    },
    l2Projected,
    l3Projected,
  }
}

/**
 * V_Final 결과를 SocialPersonaVector로 변환
 */
export function vFinalToVector(result: VFinalResult): SocialPersonaVector {
  const entries = L1_DIM_ORDER.map((dim, i) => [dim, result.vector[i]] as [SocialDimension, number])
  return Object.fromEntries(entries) as unknown as SocialPersonaVector
}
