// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Onboarding Module
// 온보딩 질문 + 벡터 생성 + SNS 처리
// ═══════════════════════════════════════════════════════════════

// ── Questions ──
export { computeL1Vector, computeL2Vector, crossValidate, ONBOARDING_CONFIDENCE } from "./questions"
export type {
  OnboardingQuestion,
  OnboardingQuestionOption,
  OnboardingQuestionsProvider,
} from "./questions"

// ── Onboarding Engine ──
export {
  processOnboardingAnswers,
  getRequiredPhases,
  computeCompleteness,
} from "./onboarding-engine"
export type { OnboardingDataProvider } from "./onboarding-engine"

// ── SNS Processor ──
export { processSnsData, extractCombinedText } from "./sns-processor"
export type { SnsDataProvider } from "./sns-processor"

// ── Activity Learner ──
export { learnFromActivity, activityToUIV } from "./activity-learner"
export type { ActivityLearnerProvider, ActivityLearnResult } from "./activity-learner"
