// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Interactions Module
// 좋아요 + 팔로우 + 관계 + 댓글 + 유저 인터랙션
// ═══════════════════════════════════════════════════════════════

// ── Like Engine ──
export { shouldLike, computeLikeProbability } from "./like-engine"
export type { LikeDataProvider, LikeDecision } from "./like-engine"

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
