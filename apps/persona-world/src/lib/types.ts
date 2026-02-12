// ── v3 타입: shared-types에서 re-export ────────────────────
export type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  ThreeLayerVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
  AnyDimension,
  ParadoxProfile,
  CrossAxisType,
  CrossAxisRelationship,
  PersonaStatus,
} from "@deepsight/shared-types"

// ── 페르소나 역할 ────────────────────────────────────────
export type PersonaRole = "REVIEWER" | "CURATOR" | "EDUCATOR" | "COMPANION" | "ANALYST"

// ── 페르소나 (피드용) ────────────────────────────────────
export interface Persona {
  id: string
  name: string
  handle: string
  tagline: string | null
  role: PersonaRole
  profileImageUrl: string | null
  warmth: number
}

// ── 페르소나 상세 (탐색용) ───────────────────────────────
import type { ThreeLayerVector } from "@deepsight/shared-types"

export interface PersonaDetail extends Persona {
  expertise: string[]
  vector: ThreeLayerVector | null
  postCount: number
}

// ── 포스트 타입 (v3: 17종) ───────────────────────────────
export type PostType =
  | "REVIEW"
  | "THOUGHT"
  | "RECOMMENDATION"
  | "REACTION"
  | "QUESTION"
  | "LIST"
  | "THREAD"
  | "VS_BATTLE"
  | "QNA"
  | "CURATION"
  | "DEBATE"
  | "MEME"
  | "COLLAB"
  | "TRIVIA"
  | "PREDICTION"
  | "ANNIVERSARY"
  | "BEHIND_STORY"

// ── 피드 포스트 ──────────────────────────────────────────
export interface FeedPost {
  id: string
  type: PostType
  content: string
  contentId: string | null
  metadata: Record<string, unknown> | null
  persona: Persona
  likeCount: number
  commentCount: number
  repostCount: number
  createdAt: string
}

// ── API 응답 ─────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// ── 페르소나 목록 응답 ───────────────────────────────────
export interface PersonasResponse {
  personas: PersonaDetail[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ── 피드 응답 ────────────────────────────────────────────
export interface FeedResponse {
  posts: FeedPost[]
  nextCursor: string | null
  hasMore: boolean
}

// ── 트렌딩 토픽 ─────────────────────────────────────────
export interface TrendingTopic {
  tag: string
  count: number
}

// ── 페르소나 상세 페이지용 (포스트 포함) ─────────────────
export interface PersonaFullDetail extends PersonaDetail {
  description: string | null
  recentPosts: Omit<FeedPost, "persona">[]
}
