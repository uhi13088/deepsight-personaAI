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

// ── 피드 소스 ─────────────────────────────────────────────
export type FeedSource = "FOLLOWING" | "RECOMMENDED" | "TRENDING"

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
  source?: FeedSource
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
  archetypeId: string | null
  paradoxScore: number | null
  dimensionalityScore: number | null
  followerCount: number
  followingCount: number
  recentPosts: Omit<FeedPost, "persona">[]
}

// ── 온보딩 API 타입 ───────────────────────────────────────

export interface OnboardingQuestion {
  id: string
  order: number
  text: string
  type: "SLIDER" | "MULTIPLE_CHOICE" | "RANKING"
  options: OnboardingQuestionOption[] | null
  targetDimensions: string[]
}

export interface OnboardingQuestionOption {
  id: string
  label: string
  value: string | number
  weights?: Record<string, number>
}

export interface OnboardingQuestionsResponse {
  phase: number
  totalQuestions: number
  questions: OnboardingQuestion[]
}

export interface OnboardingAnswer {
  questionId: string
  value: string
}

export interface OnboardingAnswersResponse {
  userId: string
  phase: number
  profileQuality: string
  confidence: number
  creditsAwarded: number
  vectorUpdate: Record<string, number>
}

export interface MatchingPreviewPersona {
  personaId: string
  name: string
  handle: string
  tagline: string | null
  role: string
  profileImageUrl: string | null
  similarity: number
  dimComparison?: Array<{
    dimension: string
    userValue: number
    personaValue: number
  }>
}

export interface MatchingPreviewResponse {
  phase: number
  confidence: number
  topPersonas: MatchingPreviewPersona[]
  nextPhaseInfo: {
    nextPhase: number
    estimatedTime: number
    expectedImprovement: number
  } | null
}

// ── 댓글 톤 타입 (v4: 11종) ──────────────────────────────────────
export type CommentTone =
  | "paradox_response"
  | "direct_rebuttal"
  | "intimate_joke"
  | "formal_analysis"
  | "soft_rebuttal"
  | "deep_analysis"
  | "empathetic"
  | "light_reaction"
  | "unique_perspective"
  | "over_agreement"
  | "supportive"

// ── 댓글 타입 ──────────────────────────────────────────────────
export interface Comment {
  id: string
  postId: string
  personaId: string
  personaName: string
  personaHandle: string
  personaRole: string
  personaImageUrl: string | null
  content: string
  tone: CommentTone
  likeCount: number
  createdAt: string
}

// ── 댓글 API 응답 ─────────────────────────────────────────────
export interface CommentsResponse {
  comments: Comment[]
  total: number
  hasMore: boolean
}

// ── 데일리 마이크로 질문 ──────────────────────────────────────
export interface DailyQuestion {
  id: string
  text: string
  options: Array<{ label: string; value: string }>
  rewardCoins: number
  targetDimension: string
}

// ── SNS 플랫폼 연동 ──────────────────────────────────────────
export type SnsProvider =
  | "twitter"
  | "instagram"
  | "threads"
  | "naver_blog"
  | "youtube"
  | "youtube_music"
  | "spotify"
  | "netflix"

export interface SnsConnection {
  provider: SnsProvider
  connected: boolean
  connectedAt: string | null
  username: string | null
  analyzing: boolean
}

// ── Explore API 타입 ─────────────────────────────────────────

export interface ExploreClusterPersona {
  id: string
  name: string
  handle: string
  tagline: string | null
  role: string
  profileImageUrl: string | null
  warmth: number
  archetypeId: string | null
  followerCount: number
  postCount: number
}

export interface ExploreCluster {
  role: string
  count: number
  personas: ExploreClusterPersona[]
}

export interface ExploreHotTopic {
  type: string
  postCount: number
  totalLikes: number
  totalComments: number
  engagement: number
}

export interface ExploreDebatePost {
  id: string
  type: string
  content: string
  metadata: Record<string, unknown> | null
  likeCount: number
  commentCount: number
  createdAt: string
  persona: {
    id: string
    name: string
    handle: string
    role: string
    profileImageUrl: string | null
  }
}

export interface ExploreNewPersona extends ExploreClusterPersona {
  expertise: string[]
  createdAt: string
}

export interface ExploreResponse {
  clusters: ExploreCluster[]
  hotTopics: ExploreHotTopic[]
  activeDebates: ExploreDebatePost[]
  newPersonas: ExploreNewPersona[]
}

// ── 알림 ─────────────────────────────────────────────────────

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "repost"
  | "recommendation"
  | "new_post"
  | "system"

export interface ServerNotification {
  id: string
  type: NotificationType
  message: string
  personaId: string | null
  personaName: string | null
  postId: string | null
  commentId: string | null
  read: boolean
  createdAt: string
}

export interface NotificationsResponse {
  notifications: ServerNotification[]
  unreadCount: number
  nextCursor: string | null
  hasMore: boolean
}
