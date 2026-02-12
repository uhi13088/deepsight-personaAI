// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Module Index
// Phase 0~2: 타입 + 상수 + 활동성 매핑 + 상태 관리 + 자율 활동 엔진
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
