// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Onboarding Questions
// 구현계획서 §8, 설계서 §9.2
//
// 벡터 산출 로직은 @deepsight/vector-core 에 위임 (SSoT).
// 이 파일은 Engine Studio 전용 교차 검증 + 역설 감지만 담당.
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, SocialDimension } from "@/types/persona-v3"
import type { CoreTemperamentVector, TemperamentDimension } from "@/types/persona-v3"
import type { NarrativeDriveVector } from "@/types/persona-v3"
import type { ParadoxProfile } from "@/types"
import type { OnboardingAnswer } from "../types"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import { L1_L2_PARADOX_MAPPINGS } from "@/constants/v3"
import { applyPhase3Deltas as _applyPhase3Deltas, L3_BASE } from "@deepsight/vector-core"
import type { OnboardingQuestion as VCQuestion } from "@deepsight/vector-core"

// ── Re-export from @deepsight/vector-core (SSoT) ────────────

export {
  computeL1Vector,
  computeL2Vector,
  computeL3Vector,
  computeVectorsFromApiResponses,
  applyPhase3Deltas,
  clamp,
  ONBOARDING_CONFIDENCE,
  L1_BASE,
  L2_BASE,
  L3_BASE,
  L1_DIMS,
  L2_DIMS,
  L3_DIMS,
} from "@deepsight/vector-core"

export type {
  OnboardingQuestion,
  OnboardingQuestionOption,
  OnboardingQuestionsProvider,
} from "@deepsight/vector-core"

// ── 교차 검증 (Phase 3) — Engine Studio 전용 ────────────────

/**
 * Phase 3 교차 검증 + Paradox 감지.
 *
 * 설계서 §9.2:
 * Phase 1(L1) vs Phase 2(L2) 교차 차원 일관성 검증.
 * L1 sociability ↔ L2 extraversion 등 대응 차원 간 gap > 0.3 → paradox 감지.
 */
export function crossValidate(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  phase3Questions: VCQuestion[],
  phase3Answers: OnboardingAnswer[]
): {
  adjustedL1: SocialPersonaVector
  adjustedL2: CoreTemperamentVector
  paradoxDetected: boolean
} {
  const { adjustedL1, adjustedL2 } = _applyPhase3Deltas(
    l1,
    l2,
    L3_BASE,
    phase3Questions,
    phase3Answers
  )

  const paradoxDetected = detectParadox(adjustedL1, adjustedL2)

  return { adjustedL1, adjustedL2, paradoxDetected }
}

/**
 * Phase 3 교차 검증 확장 — L3 + EPS 포함.
 *
 * 7쌍 L1↔L2 역설 검증 + L3 벡터 보정 + Extended Paradox Score 계산.
 */
export function crossValidateWithParadox(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  phase3Questions: VCQuestion[],
  phase3Answers: OnboardingAnswer[]
): {
  adjustedL1: SocialPersonaVector
  adjustedL2: CoreTemperamentVector
  adjustedL3: NarrativeDriveVector
  paradoxDetected: boolean
  paradoxProfile: ParadoxProfile
  paradoxPairs: ParadoxPairResult[]
} {
  const { adjustedL1, adjustedL2, adjustedL3 } = _applyPhase3Deltas(
    l1,
    l2,
    l3,
    phase3Questions,
    phase3Answers
  )

  const paradoxPairs = analyzeParadoxPairs(adjustedL1, adjustedL2)
  const paradoxDetected = paradoxPairs.some((p) => p.detected)
  const paradoxProfile = calculateExtendedParadoxScore(adjustedL1, adjustedL2, adjustedL3)

  return {
    adjustedL1,
    adjustedL2,
    adjustedL3,
    paradoxDetected,
    paradoxProfile,
    paradoxPairs,
  }
}

// ── 역설 쌍 결과 타입 ──────────────────────────────────────

export interface ParadoxPairResult {
  l1Dim: SocialDimension
  l2Dim: TemperamentDimension
  l1Value: number
  l2Value: number
  gap: number
  detected: boolean
  label: string
}

// ── 내부 유틸 (Engine Studio 전용 — 역설 감지) ──────────────

/** 7쌍 L1↔L2 역설 감지 (하나라도 gap > 0.3이면 true) */
function detectParadox(l1: SocialPersonaVector, l2: CoreTemperamentVector): boolean {
  return analyzeParadoxPairs(l1, l2).some((p) => p.detected)
}

/** 7쌍 L1↔L2 역설 상세 분석 */
function analyzeParadoxPairs(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector
): ParadoxPairResult[] {
  const THRESHOLD = 0.3

  return L1_L2_PARADOX_MAPPINGS.map((mapping) => {
    const l1Value = l1[mapping.l1]
    const l2Value = l2[mapping.l2]
    const adjusted = mapping.direction === "inverse" ? 1 - l2Value : l2Value
    const gap = Math.abs(l1Value - adjusted)

    return {
      l1Dim: mapping.l1,
      l2Dim: mapping.l2,
      l1Value,
      l2Value,
      gap: Math.round(gap * 100) / 100,
      detected: gap > THRESHOLD,
      label: mapping.label,
    }
  })
}
