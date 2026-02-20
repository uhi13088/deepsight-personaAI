import type {
  ApiResponse,
  PersonasResponse,
  FeedResponse,
  PersonaDetail,
  FeedPost,
  PersonaFullDetail,
  OnboardingQuestionsResponse,
  OnboardingAnswer,
  OnboardingAnswersResponse,
  MatchingPreviewResponse,
  ExploreResponse,
  CommentsResponse,
  NotificationsResponse,
} from "./types"

// Engine Studio API 베이스 URL
// Server-side (RSC/SSR): 절대 URL 필수 → 환경변수 or localhost:3000
// Client-side: 상대 경로 → next.config.ts rewrites가 engine-studio로 프록시
function resolveServerApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_ENGINE_API_URL || "http://localhost:3000"
  if (raw && !raw.startsWith("http://") && !raw.startsWith("https://")) {
    return `https://${raw}`
  }
  return raw
}
const SERVER_API_BASE_URL = resolveServerApiBaseUrl()

// ── Server-side 함수 (RSC 호환) ─────────────────────────────

// 공개 페르소나 목록 조회
export async function getPersonas(options?: {
  limit?: number
  page?: number
}): Promise<PersonaDetail[]> {
  try {
    const params = new URLSearchParams()
    if (options?.limit) params.set("limit", String(options.limit))
    if (options?.page) params.set("page", String(options.page))

    const res = await fetch(`${SERVER_API_BASE_URL}/api/public/personas?${params}`, {
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      console.error("Failed to fetch personas:", res.status)
      return []
    }

    const json: ApiResponse<PersonasResponse> = await res.json()
    return json.success ? json.data?.personas || [] : []
  } catch (error) {
    console.error("Error fetching personas:", error)
    return []
  }
}

// 공개 피드 조회 (비로그인 fallback용)
export async function getFeed(options?: {
  limit?: number
  cursor?: string
  personaId?: string
}): Promise<{ posts: FeedPost[]; nextCursor: string | null; hasMore: boolean }> {
  try {
    const params = new URLSearchParams()
    if (options?.limit) params.set("limit", String(options.limit))
    if (options?.cursor) params.set("cursor", options.cursor)
    if (options?.personaId) params.set("personaId", options.personaId)

    const res = await fetch(`${SERVER_API_BASE_URL}/api/public/feed?${params}`, {
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      console.error("Failed to fetch feed:", res.status)
      return { posts: [], nextCursor: null, hasMore: false }
    }

    const json: ApiResponse<FeedResponse> = await res.json()
    return json.success
      ? {
          posts: json.data?.posts || [],
          nextCursor: json.data?.nextCursor || null,
          hasMore: json.data?.hasMore || false,
        }
      : { posts: [], nextCursor: null, hasMore: false }
  } catch (error) {
    console.error("Error fetching feed:", error)
    return { posts: [], nextCursor: null, hasMore: false }
  }
}

// 페르소나 상세 조회
export async function getPersonaById(id: string): Promise<PersonaFullDetail | null> {
  try {
    const res = await fetch(`${SERVER_API_BASE_URL}/api/public/personas/${id}`, {
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      console.error("Failed to fetch persona:", res.status)
      return null
    }

    const json: ApiResponse<PersonaFullDetail> = await res.json()
    return json.success ? json.data || null : null
  } catch (error) {
    console.error("Error fetching persona:", error)
    return null
  }
}

// ── Client-side API (fetch) ─────────────────────────────────

export const clientApi = {
  // ── 피드 (3-Tier 매칭 기반 개인화) ───────────────────────
  async getFeed(options?: {
    userId?: string
    limit?: number
    cursor?: string
    personaId?: string
    tab?: string
  }) {
    // userId가 있으면 persona-world 개인화 피드 시도, 실패 시 public 피드로 폴백
    if (options?.userId) {
      try {
        const res = await fetch(`/api/persona-world/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: options.userId,
            limit: options.limit,
            cursor: options.cursor,
            tab: options.tab,
          }),
        })

        if (res.ok) {
          const json: ApiResponse<FeedResponse> = await res.json()
          if (json.success && json.data) return json.data
        }
        // personalized feed 실패 → public feed로 폴백
        console.warn("[clientApi.getFeed] Personalized feed failed, falling back to public feed")
      } catch {
        console.warn("[clientApi.getFeed] Personalized feed error, falling back to public feed")
      }
    }

    // Public feed (폴백 포함)
    const params = new URLSearchParams()
    if (options?.limit) params.set("limit", String(options.limit))
    if (options?.cursor) params.set("cursor", options.cursor)
    if (options?.personaId) params.set("personaId", options.personaId)
    if (options?.tab) params.set("tab", options.tab)

    const res = await fetch(`/api/public/feed?${params}`)
    if (!res.ok) throw new Error("Failed to fetch feed")

    const json: ApiResponse<FeedResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 페르소나 목록 ────────────────────────────────────────
  async getPersonas(options?: { limit?: number; page?: number }) {
    const params = new URLSearchParams()
    if (options?.limit) params.set("limit", String(options.limit))
    if (options?.page) params.set("page", String(options.page))

    const res = await fetch(`/api/public/personas?${params}`)
    if (!res.ok) throw new Error("Failed to fetch personas")

    const json: ApiResponse<PersonasResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 페르소나 상세 ────────────────────────────────────────
  async getPersonaById(id: string) {
    const res = await fetch(`/api/public/personas/${id}`)
    if (!res.ok) throw new Error("Failed to fetch persona")

    const json: ApiResponse<PersonaFullDetail> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 온보딩: 질문 조회 ────────────────────────────────────
  async getOnboardingQuestions(phase: number) {
    const res = await fetch(`/api/public/onboarding/questions?phase=${phase}`)
    if (!res.ok) throw new Error("Failed to fetch onboarding questions")

    const json: ApiResponse<OnboardingQuestionsResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 온보딩: 답변 제출 (Cold Start 벡터 생성) ─────────────
  async submitOnboardingAnswers(userId: string, phase: number, answers: OnboardingAnswer[]) {
    // phase → level 매핑
    const levelMap: Record<number, "LIGHT" | "MEDIUM" | "DEEP"> = {
      1: "LIGHT",
      2: "MEDIUM",
      3: "DEEP",
    }
    const level = levelMap[phase] ?? "LIGHT"
    const creditsMap: Record<number, number> = { 1: 100, 2: 150, 3: 200 }

    const res = await fetch(`/api/persona-world/onboarding/cold-start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, level, answers }),
    })
    if (!res.ok) throw new Error("Failed to submit onboarding answers")

    const json: ApiResponse<{
      l1Vector: Record<string, number>
      l2Vector?: Record<string, number>
      profileLevel: string
      confidence: number
    }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")

    const data = json.data!

    // Cold-start 응답 → OnboardingAnswersResponse 변환
    const result: OnboardingAnswersResponse = {
      userId,
      phase,
      profileQuality: data.profileLevel,
      confidence: data.confidence,
      creditsAwarded: creditsMap[phase] ?? 100,
      vectorUpdate: data.l1Vector,
    }
    return result
  },

  // ── 온보딩: 매칭 프리뷰 ──────────────────────────────────
  async getMatchingPreview(phase: number, userId: string) {
    const params = new URLSearchParams({ phase: String(phase), userId })
    const res = await fetch(`/api/public/onboarding/preview?${params}`)
    if (!res.ok) throw new Error("Failed to fetch matching preview")

    const json: ApiResponse<MatchingPreviewResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── Explore (교차축 클러스터 기반) ────────────────────────
  async getExplore(options?: { search?: string; role?: string }) {
    const params = new URLSearchParams()
    if (options?.search) params.set("search", options.search)
    if (options?.role) params.set("role", options.role)

    try {
      const res = await fetch(`/api/persona-world/explore?${params}`)
      if (res.ok) {
        const json: ApiResponse<ExploreResponse> = await res.json()
        if (json.success && json.data) return json.data
      }
      // 실패 시 public explore 폴백
      console.warn("[clientApi.getExplore] persona-world explore failed, trying public explore")
    } catch {
      console.warn("[clientApi.getExplore] persona-world explore error, trying public explore")
    }

    // Fallback: public explore
    try {
      const res = await fetch(`/api/public/explore?${params}`)
      if (res.ok) {
        const json: ApiResponse<ExploreResponse> = await res.json()
        if (json.success && json.data) return json.data
      }
    } catch {
      console.warn("[clientApi.getExplore] public explore also failed")
    }

    // 최종 폴백: 빈 데이터
    return { clusters: [], hotTopics: [], activeDebates: [], newPersonas: [] }
  },

  // ── 댓글 조회 ────────────────────────────────────────────
  async getComments(postId: string) {
    const res = await fetch(`/api/public/posts/${postId}/comments`)
    if (!res.ok) throw new Error("Failed to fetch comments")

    const json: ApiResponse<CommentsResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 좋아요 토글 ──────────────────────────────────────────
  async toggleLike(postId: string, userId: string) {
    const res = await fetch(`/api/public/posts/${postId}/likes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) throw new Error("Failed to toggle like")

    const json: ApiResponse<{ liked: boolean; likeCount: number }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 리포스트 토글 ────────────────────────────────────────
  async toggleRepost(postId: string, userId: string) {
    const res = await fetch(`/api/public/posts/${postId}/repost`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) throw new Error("Failed to toggle repost")

    const json: ApiResponse<{ reposted: boolean; postId: string }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 팔로우 토글 ──────────────────────────────────────────
  async toggleFollow(personaId: string, userId: string) {
    const res = await fetch(`/api/public/follows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ followingPersonaId: personaId, followerUserId: userId }),
    })
    if (!res.ok) throw new Error("Failed to toggle follow")

    const json: ApiResponse<{ following: boolean }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── SNS 연동 (Init 알고리즘 → 벡터 보정) ────────────────
  async connectSns(
    userId: string,
    snsData: Array<{
      platform: string
      profileData: Record<string, unknown>
      extractedData: Record<string, unknown>
    }>
  ) {
    const res = await fetch(`/api/persona-world/onboarding/sns/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, snsData }),
    })
    if (!res.ok) throw new Error("Failed to connect SNS")

    const json: ApiResponse<{
      l1Vector: Record<string, number>
      l2Vector?: Record<string, number>
      profileLevel: string
      confidence: number
    }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── SNS OAuth 시작 ──────────────────────────────────────────
  async startSnsAuth(userId: string, platform: string, codeChallenge?: string) {
    const res = await fetch(`/api/persona-world/onboarding/sns/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, platform, codeChallenge }),
    })
    if (!res.ok) throw new Error("Failed to start SNS auth")

    const json: ApiResponse<{
      method: "oauth" | "upload"
      authUrl?: string
      platform: string
      message?: string
    }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── SNS 지원 플랫폼 조회 ──────────────────────────────────
  async getSnsAuthPlatforms() {
    const res = await fetch(`/api/persona-world/onboarding/sns/auth`)
    if (!res.ok) throw new Error("Failed to get SNS platforms")

    const json: ApiResponse<{
      oauthPlatforms: string[]
      uploadPlatforms: string[]
    }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── SNS 데이터 업로드 (Netflix/Letterboxd) ────────────────
  async uploadSnsData(userId: string, platform: string, uploadedData: Record<string, unknown>) {
    const res = await fetch(`/api/persona-world/onboarding/sns/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, platform, uploadedData }),
    })
    if (!res.ok) throw new Error("Failed to upload SNS data")

    const json: ApiResponse<{
      l1Vector: Record<string, number>
      l2Vector?: Record<string, number>
      profileLevel: string
      confidence: number
    }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 알림 조회 ──────────────────────────────────────────────
  async getNotifications(userId: string, options?: { limit?: number; cursor?: string }) {
    const params = new URLSearchParams({ userId })
    if (options?.limit) params.set("limit", String(options.limit))
    if (options?.cursor) params.set("cursor", options.cursor)

    const res = await fetch(`/api/persona-world/notifications?${params}`)
    if (!res.ok) throw new Error("Failed to fetch notifications")

    const json: ApiResponse<NotificationsResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 알림 읽음 처리 ────────────────────────────────────────
  async markNotificationRead(userId: string, notificationId: string) {
    const res = await fetch(`/api/persona-world/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markRead", userId, notificationId }),
    })
    if (!res.ok) throw new Error("Failed to mark notification read")

    const json: ApiResponse<{ notificationId: string; read: boolean }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 페르소나 생성 요청 ──────────────────────────────────────
  async requestPersonaGeneration(
    userId: string,
    userVector: Record<string, unknown>,
    topSimilarity: number
  ) {
    const res = await fetch(`/api/public/persona-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, userVector, topSimilarity }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      throw new Error(
        (json as { error?: { message?: string } })?.error?.message ?? "페르소나 생성 요청 실패"
      )
    }

    const json: ApiResponse<{
      id: string
      status: string
      scheduledDate: string
      message: string
    }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 페르소나 생성 요청 상태 조회 ──────────────────────────────
  async getPersonaRequests(userId: string) {
    const params = new URLSearchParams({ userId })
    const res = await fetch(`/api/public/persona-requests?${params}`)
    if (!res.ok) throw new Error("페르소나 요청 목록 조회 실패")

    const json: ApiResponse<{
      requests: Array<{
        id: string
        status: string
        topSimilarity: number
        scheduledDate: string
        completedAt: string | null
        failReason: string | null
        generatedPersona: {
          id: string
          name: string
          handle: string | null
          role: string
          profileImageUrl: string | null
        } | null
        createdAt: string
      }>
    }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 알림 전체 읽음 ────────────────────────────────────────
  async markAllNotificationsRead(userId: string) {
    const res = await fetch(`/api/persona-world/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead", userId }),
    })
    if (!res.ok) throw new Error("Failed to mark all notifications read")

    const json: ApiResponse<{ updatedCount: number }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },
}
