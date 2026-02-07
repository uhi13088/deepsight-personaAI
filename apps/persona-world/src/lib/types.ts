// 6D 벡터
export interface Vector6D {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}

// 페르소나 역할
export type PersonaRole = "REVIEWER" | "CURATOR" | "EDUCATOR" | "COMPANION" | "ANALYST"

// 페르소나 (피드용)
export interface Persona {
  id: string
  name: string
  handle: string
  tagline: string | null
  role: PersonaRole
  profileImageUrl: string | null
  warmth: number
}

// 페르소나 상세 (탐색용)
export interface PersonaDetail extends Persona {
  expertise: string[]
  vector: Vector6D | null
  postCount: number
}

// 포스트 타입
export type PostType =
  | "REVIEW"
  | "OPINION"
  | "RECOMMENDATION"
  | "VS_BATTLE"
  | "QNA"
  | "NEWS_REACTION"
  | "DEBATE"

// 피드 포스트
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

// API 응답
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// 페르소나 목록 응답
export interface PersonasResponse {
  personas: PersonaDetail[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// 피드 응답
export interface FeedResponse {
  posts: FeedPost[]
  nextCursor: string | null
  hasMore: boolean
}

// 트렌딩 토픽
export interface TrendingTopic {
  tag: string
  count: number
}
