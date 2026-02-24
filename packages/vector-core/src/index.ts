// ═══════════════════════════════════════════════════════════════
// @deepsight/vector-core — Public API
// 3-Layer 벡터 산출의 단일 진실 공급원 (SSoT)
// ═══════════════════════════════════════════════════════════════

export {
  computeL1Vector,
  computeL2Vector,
  computeL3Vector,
  computeVectorsFromApiResponses,
  applyPhase3Deltas,
  clamp,
} from "./compute"

export {
  L1_DIMS,
  L2_DIMS,
  L3_DIMS,
  L1_BASE,
  L2_BASE,
  L3_BASE,
  ONBOARDING_CONFIDENCE,
} from "./constants"

export type {
  OnboardingQuestion,
  OnboardingQuestionOption,
  OnboardingAnswer,
  OnboardingApiResponse,
  OnboardingQuestionsProvider,
} from "./types"
