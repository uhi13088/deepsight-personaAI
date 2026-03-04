// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — Onboarding Module
// 온보딩 질문 + 벡터 생성 + SNS 처리 + 적응형 온보딩
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

// ── SNS OAuth ──
export {
  buildAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  encodeState,
  decodeState,
  validateState,
  isOAuthSupported,
  OAUTH_SUPPORTED_PLATFORMS,
  UPLOAD_ONLY_PLATFORMS,
} from "./sns-oauth"
export type { OAuthPlatformConfig, OAuthTokenResponse, OAuthCallbackParams } from "./sns-oauth"

// ── SNS Analyzer ──
export { analyzeSnsProfile, parseUploadedData } from "./sns-analyzer"
export type { SnsAnalysisResult, SnsExtractedProfile } from "./sns-analyzer"

// ── Activity Learner ──
export { learnFromActivity, activityToUIV } from "./activity-learner"
export type { ActivityLearnerProvider, ActivityLearnResult } from "./activity-learner"

// ── Adaptive Onboarding Engine ──
export {
  createAdaptiveSession,
  selectNextQuestion,
  processAdaptiveAnswer,
  checkTermination,
  buildAdaptiveResult,
  buildAdaptiveProgress,
  toQuestionWithMeta,
  startAdaptiveOnboarding,
  processAdaptiveOnboardingAnswer,
} from "./adaptive-engine"
export type { AdaptiveOnboardingProvider, AdaptivePoolQuestion } from "./adaptive-engine"
