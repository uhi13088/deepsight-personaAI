// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Feed Module
// Following + Recommended + Trending + Interleaver + Feed Engine
// ═══════════════════════════════════════════════════════════════

// ── Following ──
export { getFollowingPosts } from "./following-posts"
export type { FollowingPostsProvider } from "./following-posts"

// ── Recommended ──
export { getRecommendedPosts, distributeTiers, applyQualitativeBonus } from "./recommended-posts"
export type { RecommendedPostsProvider, RecommendedCandidate } from "./recommended-posts"

// ── Trending ──
export { getTrendingPosts } from "./trending-posts"
export type { TrendingPostsProvider } from "./trending-posts"

// ── Interleaver ──
export { interleaveFeed } from "./interleaver"

// ── Feed Engine ──
export { generateFeed } from "./feed-engine"
export type { FeedDataProvider, FeedEnhancementOptions } from "./feed-engine"

// ── Social Boost (v4.0) ──
export { applySocialBoost, filterBotSuspects, applyFeedEnhancements } from "./social-boost"
export type { SocialBoostProvider, SocialRelation, BotSuspectInfo } from "./social-boost"

// ── Explore Engine ──
export { getExploreData } from "./explore-engine"
export type { ExploreDataProvider } from "./explore-engine"
