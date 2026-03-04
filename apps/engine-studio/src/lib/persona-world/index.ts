// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4 — Module Index
// Phase 0~5: 타입 + 상수 + 활동 + 인터랙션 + 피드 + 온보딩
// v4.1: 관계 프로토콜 (단계/유형/모멘텀/마일스톤)
// v4.2: attraction + 22종 관계 유형 + 로맨틱 마일스톤
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

// PIS Engine (Phase 6-B)
export {
  measureContextRecall,
  measureSettingConsistency,
  measureCharacterStability,
  computeToneVariance,
  measurePIS,
  measurePISBatch,
} from "./quality/pis-engine"
export type {
  PISDataProvider,
  MemoryRetentionStats,
  QualityLogStats,
  VoiceStyleSnapshot,
  PISMeasurement,
  PISDataQuality,
  PISBatchResult,
  PISBatchSummary,
} from "./quality/pis-engine"

// T231: Arena ↔ Quality Feedback Loop
export {
  applyAndTrackCorrection,
  processQualityTriggers,
  evaluatePendingCorrections,
  summarizeCorrectionEffectiveness,
} from "./quality/arena-feedback"
export type {
  ArenaFeedbackDataProvider,
  ApplyCorrectionResult,
  TriggerProcessingResult,
  EvaluationResult,
  CorrectionEffectivenessSummary,
} from "./quality/arena-feedback"

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

// PW-F: 알림 환경설정
export {
  DEFAULT_PREFERENCES,
  getPreferences,
  updatePreferences,
  shouldDeliver,
} from "./notification-preference"
export type {
  NotificationType,
  NotificationPreferenceData,
  NotificationPreferenceProvider,
} from "./notification-preference"

// PW-F: 코인 패키지
export { COIN_PACKAGES, getCoinPackageById, formatPrice } from "./coin-packages"
export type { CoinPackage } from "./coin-packages"

// PW-F: 크레딧 서비스
export {
  getBalance,
  addCredits,
  spendCredits,
  purchaseCredits,
  getTransactionHistory,
} from "./credit-service"
export type {
  TransactionType,
  TransactionStatus,
  TransactionRecord,
  CreditDataProvider,
} from "./credit-service"

// Phase 7-A: 모더레이션
export {
  // Auto-Moderator
  runStage1,
  runStage2,
  runStage3,
  runModerationPipeline,
  sanitizePII,
  getEscalationAction,
  // Report Handler
  submitReport,
  getReportStats,
  getCategorySeverity,
  REPORT_CATEGORY_CONFIG,
  // Moderation Actions
  executeAction,
  // Dashboard
  buildDashboard,
  checkKPIAlerts,
} from "./moderation"
export type {
  ModerationAction,
  DetectionType,
  ModerationResult,
  ModerationDetection,
  EscalationAction,
  AsyncAnalysisInput,
  ReportCategory,
  ReportResolution,
  ReportCategoryConfig,
  ReportInput,
  ReportResult,
  ReportStats,
  ReportDataProvider,
  ActionType,
  ActionResult,
  AuditLogEntry,
  ModerationActionProvider,
  DashboardOverview,
  ActivityStats,
  QualityStats,
  SecurityStats,
  ReportOverview,
  DashboardAlert,
  DashboardDataProvider,
} from "./moderation"

// Phase 8: 비용 모니터링 & 제어
export {
  // Usage Tracker
  createUsageLog,
  computeDailyCostReport,
  computeMonthlyCostReport,
  // Budget Alert
  checkDailyBudget,
  checkMonthlyBudget,
  checkBudgetAlerts,
  getCostOverrunAction,
  DAILY_THRESHOLDS,
  MONTHLY_THRESHOLDS,
  // Cost Mode
  getCostModeConfig,
  getAllCostModes,
  applyCostMode,
  estimateCost,
  compareModes,
  // Optimizer
  getInterviewRateByGrade,
  computeAdaptiveInterviewCost,
  computeBatchCommentCost,
  computeCacheOptimizationCost,
  computeFullOptimization,
  optimizeLlmCallOrdering,
  DEFAULT_BATCH_CONFIG,
  // Integration
  buildCostDashboard,
  changeCostMode,
} from "./cost"
export type {
  LLMCallType,
  LlmUsageLog,
  CallTypeBreakdown,
  PersonaCostBreakdown,
  CacheEfficiency,
  DailyCostReport,
  MonthlyCostReport,
  AlertLevel,
  BudgetPeriod,
  BudgetAlert,
  CostOverrunAction,
  BudgetThresholds,
  CostMode,
  CostModeConfig,
  CostModeApplication,
  CostEstimate,
  OptimizationResult,
  OptimizationSummary,
  PendingLLMCall,
  BatchConfig,
  CostDataProvider,
  CostDashboard,
} from "./cost"

// Emotional Contagion (T156 — Kill Switch 기본 OFF)
export {
  DEFAULT_CONTAGION_CONFIG,
  RELATIONSHIP_WEIGHTS,
  computeRelationshipWeight,
  computeResistance,
  canReceiveContagion,
  computeSingleEffect,
  runContagionRound,
  applyContagionResult,
  applyContagionRound,
  hasConverged,
  computeContagionStats,
  checkMoodSafety,
} from "./emotional-contagion"
export type {
  ContagionPersonaState,
  ContagionEdge,
  ContagionSensitivity,
  ContagionConfig,
  NodeTopology,
  ContagionEffect,
  PersonaContagionResult,
  ContagionRoundResult,
  ContagionStats,
} from "./emotional-contagion"

// Emotional Contagion Integration (T225 — DB 연동)
export { executeContagionRound } from "./contagion-integration"
export type {
  ContagionDataProvider,
  ContagionRoundLog,
  ContagionExecutionResult,
} from "./contagion-integration"

// Chat Service (T333 — 1:1 채팅 서비스)
export {
  createThread,
  sendMessage,
  getThreads as getChatThreads,
  getMessages as getChatMessages,
} from "./chat-service"
export type {
  ChatDataProvider,
  CreateThreadResult,
  SendMessageInput,
  SendMessageResult,
} from "./chat-service"

// Conversation Memory (T332 — 기억 파이프라인 통합)
export {
  retrieveConversationMemories,
  recordConversationTurn,
  finalizeConversation,
  adjustStateForConversation,
} from "./conversation-memory"
export type {
  ConversationMemoryProvider,
  ConversationTurnInput,
  ConversationFinalizeInput,
} from "./conversation-memory"

// Conversation Engine (T331 — 1:1 채팅/통화 공용)
export {
  buildConversationSystemPrefix,
  buildConversationSystemSuffix,
  buildAnthropicMessages,
  generateConversationResponse,
} from "./conversation-engine"
export type {
  ConversationMode,
  ConversationMessage,
  ConversationContext,
  ConversationInput,
  ConversationResult,
} from "./conversation-engine"

// Voice Pipeline (T337 — STT + TTS)
export {
  speechToText,
  textToSpeech,
  textToSpeechOpenAI,
  textToSpeechGoogle,
  buildTTSConfig,
  isVoiceConfigured,
  DEFAULT_TTS_CONFIG,
  OPENAI_VOICES,
} from "./voice-pipeline"
export type {
  TTSProvider,
  TTSVoiceConfig,
  STTResult,
  TTSResult,
  OpenAIVoice,
} from "./voice-pipeline"

// Call Service (T338 — 1:1 통화 서비스)
export {
  createReservation,
  startCall,
  processCallTurn,
  endCall,
  getReservations as getCallReservations,
  cancelReservation,
} from "./call-service"
export type {
  CallDataProvider,
  CreateReservationResult,
  StartCallResult,
  CallTurnResult,
  EndCallResult,
} from "./call-service"
