// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Module Index
// Phase 0~5: 타입 + 상수 + 활동 + 인터랙션 + 피드 + 온보딩
// ═══════════════════════════════════════════════════════════════

// Types
export type {
  ActivityTraitsV3,
  PersonaStateData,
  StateUpdateEvent,
  RelationshipScore,
  ConsumptionContentType,
  ConsumptionSource,
  ConsumptionRecord,
  ActivityDecision,
  SchedulerTrigger,
  SchedulerContext,
  PostTypeAffinityCondition,
  PostTypeAffinity,
  PostGenerationInput,
  PostGenerationResult,
  CommentGenerationInput,
  CommentTone,
  CommentToneDecision,
  FeedSource,
  FeedRequest,
  FeedResponse,
  FeedPost,
  ExploreData,
  OnboardingAnswer,
  OnboardingResult,
  SNSExtendedData,
  UserActivity,
  ThreeLayerVector,
  SocialPersonaVector,
  CoreTemperamentVector,
  PersonaPostType,
} from "./types"

// Constants
export {
  POST_TYPE_AFFINITIES,
  STATE_DEFAULTS,
  STATE_DELTAS,
  ACTIVITY_THRESHOLDS,
  FEED_RATIOS,
  RECOMMENDED_TIER_RATIOS,
  FEED_DEFAULTS,
  LIKE_MODIFIERS,
  FOLLOW_WEIGHTS,
  FOLLOW_ANNOUNCEMENT,
  COMMENT_TONE_MATRIX,
  POST_TYPE_STATE_MODIFIERS,
  ACTIVE_HOURS,
  PARADOX,
  TRAIT_WEIGHTS,
} from "./constants"

export type { CommentToneRule } from "./constants"

// Phase 1: Activity Mapping + State
export {
  computeActivityTraits,
  computeActiveHours,
  computeActivityProbabilities,
} from "./activity-mapper"
export {
  initializeState,
  applyStateEvent,
  getPersonaState,
  updatePersonaState,
} from "./state-manager"

// Phase 2: Autonomous Activity Engine
export { selectPostType, computeAffinityScore, applyStateModifiers } from "./post-type-selector"
export { selectTopic, isTriggerBasedTopic } from "./topic-selector"
export type { TopicSelectionResult, TopicDataProvider } from "./topic-selector"
export {
  computeParadoxActivityChance,
  detectParadoxPatterns,
  decideParadoxActivity,
  sigmoid,
  PARADOX_PATTERNS,
} from "./paradox-activity"
export type { ParadoxPattern, ParadoxActivityResult } from "./paradox-activity"
export { buildSystemPrompt, buildUserPrompt, generatePostContent } from "./content-generator"
export type { LLMProvider } from "./content-generator"
export {
  recordConsumption,
  getConsumptionContext,
  getConsumptionStats,
  generateImpression,
  autoTag,
} from "./consumption-manager"
export type { ConsumptionLLMProvider } from "./consumption-manager"
export { runScheduler, getActivePersonas, decideActivity } from "./scheduler"
export type { SchedulerPersona, SchedulerDataProvider, SchedulerResult } from "./scheduler"

// Phase 3: Interaction System
export {
  shouldLike,
  computeLikeProbability,
  shouldFollow,
  computeFollowScore,
  computeFollowProbability,
  shouldAnnounce,
  getRelationship,
  updateRelationship,
  recalculateRelationship,
  computeRelationshipUpdate,
  DEFAULT_RELATIONSHIP,
  decideCommentTone,
  generateComment,
  applyExpress,
  respondToUser,
  computeAdaptDelta,
  analyzeUserAttitudeSimple,
} from "./interactions"
export type {
  LikeDataProvider,
  LikeDecision,
  FollowDataProvider,
  FollowDecision,
  InteractionEvent,
  RelationshipDataProvider,
  CommentLLMProvider,
  CommentDataProvider,
  CommentResult,
  UserInteractionVector,
  UserInteractionDataProvider,
  UserInteractionLLMProvider,
  UserInteractionResult,
} from "./interactions"

// Phase 4: Feed System
export {
  getFollowingPosts,
  getRecommendedPosts,
  distributeTiers,
  applyQualitativeBonus,
  getTrendingPosts,
  interleaveFeed,
  generateFeed,
  getExploreData,
} from "./feed"
export type {
  FollowingPostsProvider,
  RecommendedPostsProvider,
  RecommendedCandidate,
  TrendingPostsProvider,
  FeedDataProvider,
  ExploreDataProvider,
} from "./feed"

// Phase 5: Onboarding
export {
  computeL1Vector,
  computeL2Vector,
  crossValidate,
  ONBOARDING_CONFIDENCE,
  processOnboardingAnswers,
  getRequiredPhases,
  computeCompleteness,
  processSnsData,
  extractCombinedText,
  learnFromActivity,
  activityToUIV,
} from "./onboarding"
export type {
  OnboardingQuestion,
  OnboardingQuestionOption,
  OnboardingQuestionsProvider,
  OnboardingDataProvider,
  SnsDataProvider,
  ActivityLearnerProvider,
  ActivityLearnResult,
} from "./onboarding"

// v4.0: Poignancy Score (감정 가중 기억 검색)
export {
  calculatePoignancy,
  derivePressureFromState,
  computeEmotionalDelta,
  computeRAGSearchScore,
  calculatePostPoignancy,
  calculateInteractionPoignancy,
  RAG_SEARCH_WEIGHTS,
  POIGNANCY_THRESHOLDS,
} from "./poignancy"
export type { PoignancyInput, PoignancyEventType, RAGSearchScoreInput } from "./poignancy"

// v4.0: Factbook (불변/가변 기억 분리)
export {
  computeFactbookHash,
  verifyFactbookIntegrity,
  convertBackstoryToFactbook,
  addMutableContext,
  updateMutableContext,
  detectExcessiveChanges,
  buildFactbookPrompt,
  factbookToBackstory,
  MUTABLE_CHANGE_ALERT_THRESHOLD,
  FACTBOOK_CATEGORIES,
} from "./factbook"

// v4.0: Factbook Runtime (T163 — mutableContext 런타임 업데이트)
export {
  inferContextCategory,
  summarizeInteraction,
  applyMutableContextUpdate,
  updateMutableContextRuntime,
  toStateEvent,
  processInteraction,
} from "./factbook-runtime"
export type {
  InteractionInput,
  MutableContextUpdateResult,
  InteractionProcessResult,
  FactbookDataProvider,
} from "./factbook-runtime"

// v4.0: Forgetting Curve (자연 망각 시스템)
export {
  computeStability,
  computeRetention,
  computeRetentionFromPoignancy,
  applyForgettingCurve,
  filterAndRankByRetention,
  BASE_STABILITY,
  MAX_STABILITY,
  CORE_MEMORY_STABILITY,
  RETENTION_CUTOFF,
  STABILITY_CONFIG,
} from "./forgetting-curve"
export type { ForgettingCurveInput } from "./forgetting-curve"

// LLM Adapter
export {
  createPostLLMProvider,
  createCommentLLMProvider,
  createConsumptionLLMProvider,
  createUserInteractionLLMProvider,
  isLLMConfigured,
} from "./llm-adapter"

// Voice Anchor (Cold Start)
export { buildVoiceAnchorFromProfile, parseVoiceProfile } from "./voice-anchor"

// Quality Runner
export { runPeriodicQualityCheck } from "./quality-runner"
export type { QualityRunnerDataProvider, QualityCheckSummary } from "./quality-runner"

// Phase 5: Quality Monitor
export {
  checkVoiceConsistency,
  extractVoiceFeatures,
  runQualityGate,
  cosineSimilarity,
  VOICE_THRESHOLDS,
  QUALITY_THRESHOLDS,
} from "./quality-monitor"
export type {
  VoiceFeatures,
  VoiceStatus,
  VoiceCheckResult,
  VoiceMonitorProvider,
  QualityStatus,
  QualityGateResult,
  QualityGateProvider,
} from "./quality-monitor"

// Evolution (L3 Long-term)
export {
  EVOLUTION_STAGES,
  getEvolutionStage,
  hasStageTransition,
  analyzeEvolutionTrend,
  computeL3Evolution,
  runEvolutionBatch,
  MAX_GROWTH_ARC_DELTA_PER_WEEK,
  MAX_DIMENSION_DELTA,
  MIN_ACTIVITIES_FOR_EVOLUTION,
  MIN_DAYS_FOR_EVOLUTION,
} from "./evolution"
export type {
  EvolutionStage,
  EvolutionTrend,
  ActivityLogEntry,
  StateSnapshotEntry,
  EvolutionAnalyzerProvider,
  L3EvolutionResult,
  EvolutionPersona,
  EvolutionRunnerDataProvider,
  EvolutionBatchResult,
} from "./evolution"
