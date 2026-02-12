// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Interactions Module
// 좋아요 + 팔로우 + 관계 매니저 barrel export
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
