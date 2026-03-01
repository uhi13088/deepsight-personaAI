// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Interactions Module
// 좋아요 + 팔로우 + 관계 + 댓글 + 유저 인터랙션
// ═══════════════════════════════════════════════════════════════

// ── Like Engine ──
export { shouldLike, computeLikeProbability } from "./like-engine"
export type { LikeDataProvider, LikeDecision } from "./like-engine"

// ── Repost Engine ──
export { computeRepostProbability } from "./repost-engine"

// ── Follow Engine ──
export {
  shouldFollow,
  computeFollowScore,
  computeFollowProbability,
  shouldAnnounce,
} from "./follow-engine"
export type { FollowDataProvider, FollowDecision } from "./follow-engine"

// ── Relationship Manager ──
export {
  getRelationship,
  updateRelationship,
  recalculateRelationship,
  computeRelationshipUpdate,
  DEFAULT_RELATIONSHIP,
} from "./relationship-manager"
export type { InteractionEvent, RelationshipDataProvider } from "./relationship-manager"

// ── Comment Tone ──
export { decideCommentTone } from "./comment-tone"

// ── Comment Engine ──
export { generateComment, applyExpress } from "./comment-engine"
export type { CommentLLMProvider, CommentDataProvider, CommentResult } from "./comment-engine"

// ── User Interaction ──
export { respondToUser, computeAdaptDelta, analyzeUserAttitudeSimple } from "./user-interaction"
export type {
  UserInteractionVector,
  UserInteractionDataProvider,
  UserInteractionLLMProvider,
  UserInteractionResult,
} from "./user-interaction"

// ── Phase RA: Rapport-Aware Engagement ──
export { classifyL2Pattern } from "./l2-pattern"
export type { L2ConflictPattern, L2PatternResult } from "./l2-pattern"

export { decideEngagement } from "./engagement-decision"
export type { EngagementAction, EngagementDecision } from "./engagement-decision"

export { computeVoiceAdjustment, mergeAllowedTones } from "./voice-adjustment"
export type { VoiceAdjustment } from "./voice-adjustment"
