// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Module Index
// Phase 0~3: 타입 + 상수 + 활동 + 인터랙션
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
} from "./interactions"
export type {
  LikeDataProvider,
  LikeDecision,
  FollowDataProvider,
  FollowDecision,
  InteractionEvent,
  RelationshipDataProvider,
} from "./interactions"
