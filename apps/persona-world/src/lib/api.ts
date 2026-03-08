import type {
  ApiResponse,
  PersonasResponse,
  FeedResponse,
  PersonaFullDetail,
  OnboardingQuestionsResponse,
  OnboardingAnswer,
  OnboardingAnswersResponse,
  AdaptiveStartResponse,
  AdaptiveAnswerResponse,
  MatchingPreviewResponse,
  ExploreResponse,
  Comment,
  CommentsResponse,
  NotificationsResponse,
  NotificationPreferenceData,
  SearchResponse,
  TrendingHashtag,
  SearchSuggestionsResponse,
  ChatThread,
  ChatMessage,
  SendMessageResponse,
  CallReservation,
  StartCallResponse,
  CallTurnResponse,
  EndCallResponse,
  TasteResponse,
  TasteSummary,
} from "./types"

// ── Client-side API (fetch) ─────────────────────────────────
// 상대 경로 → next.config.ts rewrites가 engine-studio로 프록시
// persona-world 미들웨어가 x-internal-token 헤더 주입

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

  // ── 페르소나 취향 소비 기록 ─────────────────────────────
  async getPersonaTaste(personaId: string, cursor?: string, limit = 20) {
    const params = new URLSearchParams({ limit: String(limit) })
    if (cursor) params.set("cursor", cursor)
    const res = await fetch(`/api/public/personas/${personaId}/taste?${params}`)
    if (!res.ok) throw new Error("Failed to fetch persona taste")

    const json: ApiResponse<TasteResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  async getPersonaTasteSummary(personaId: string) {
    const res = await fetch(`/api/public/personas/${personaId}/taste/summary`)
    if (!res.ok) throw new Error("Failed to fetch persona taste summary")

    const json: ApiResponse<TasteSummary> = await res.json()
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
    const levelMap: Record<number, "QUICK" | "STANDARD" | "DEEP"> = {
      1: "QUICK",
      2: "STANDARD",
      3: "DEEP",
    }
    const level = levelMap[phase] ?? "QUICK"
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

  // ── 적응형 온보딩 ─────────────────────────────────────────
  async startAdaptiveOnboarding(userId: string) {
    const res = await fetch(`/api/persona-world/onboarding/adaptive/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) throw new Error("Failed to start adaptive onboarding")
    const json: ApiResponse<AdaptiveStartResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  async submitAdaptiveAnswer(sessionId: string, questionId: string, value: string) {
    const res = await fetch(`/api/persona-world/onboarding/adaptive/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, questionId, value }),
    })
    if (!res.ok) throw new Error("Failed to submit adaptive answer")
    const json: ApiResponse<AdaptiveAnswerResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
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

  // ── 댓글 작성 ────────────────────────────────────────────
  async postComment(postId: string, userId: string, content: string, parentId?: string) {
    const res = await fetch(`/api/public/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, content, parentId }),
    })
    if (!res.ok) throw new Error("Failed to post comment")

    const json: ApiResponse<Comment> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 댓글 삭제 ────────────────────────────────────────────
  async deleteComment(postId: string, commentId: string, userId: string) {
    const res = await fetch(`/api/public/posts/${postId}/comments/${commentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      throw new Error(json?.error?.message || "Failed to delete comment")
    }
    const json: ApiResponse<{ deleted: boolean; commentId: string }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 신고 ──────────────────────────────────────────────────
  async submitReport(
    userId: string,
    targetType: "POST" | "COMMENT",
    targetId: string,
    category: string,
    description?: string
  ) {
    const res = await fetch(`/api/persona-world/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, targetType, targetId, category, description }),
    })
    if (!res.ok) {
      if (res.status === 429) throw new Error("신고는 하루에 5회까지 가능합니다.")
      throw new Error("Failed to submit report")
    }

    const json: ApiResponse<{ reportId: string; message: string }> = await res.json()
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

  // ── 북마크 토글 ─────────────────────────────────────────
  async toggleBookmark(postId: string, userId: string) {
    const res = await fetch(`/api/public/bookmarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, postId }),
    })
    if (!res.ok) throw new Error("Failed to toggle bookmark")

    const json: ApiResponse<{ bookmarked: boolean; postId: string }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 유저 활동 통계 (postId 목록) ───────────────────────────
  async getUserStats(userId: string) {
    const res = await fetch(`/api/public/user-stats?userId=${userId}`)
    if (!res.ok) throw new Error("Failed to fetch user stats")

    const json: ApiResponse<{
      likedPostIds: string[]
      bookmarkedPostIds: string[]
      repostedPostIds: string[]
    }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 유저 활동 조회 (좋아요/저장/리포스트) ─────────────────
  async getUserActivity(
    userId: string,
    type: "likes" | "bookmarks" | "reposts",
    limit = 20,
    cursor?: string
  ): Promise<FeedResponse> {
    const params = new URLSearchParams({ userId, type, limit: String(limit) })
    if (cursor) params.set("cursor", cursor)
    const res = await fetch(`/api/public/user-activity?${params}`)
    if (!res.ok) throw new Error("Failed to fetch user activity")

    const json: ApiResponse<FeedResponse> = await res.json()
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

  // ── 팔로우 목록 조회 ────────────────────────────────────────
  async getFollows(userId: string) {
    const params = new URLSearchParams({ userId })
    const res = await fetch(`/api/public/follows?${params}`)
    if (!res.ok) throw new Error("Failed to fetch follows")

    const json: ApiResponse<{
      follows: Array<{ personaId: string; personaName: string; followedAt: string }>
    }> = await res.json()
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

  // ── SNS 설정된 플랫폼 조회 ─────────────────────────────────
  async getSnsConfiguredPlatforms(): Promise<{
    oauthPlatforms: string[]
    uploadPlatforms: string[]
    configuredPlatforms: string[]
  }> {
    const res = await fetch(`/api/persona-world/onboarding/sns/auth`)
    const json: ApiResponse<{
      oauthPlatforms: string[]
      uploadPlatforms: string[]
      configuredPlatforms: string[]
    }> | null = await res.json().catch(() => null)

    if (!res.ok || !json?.success) {
      return { oauthPlatforms: [], uploadPlatforms: [], configuredPlatforms: [] }
    }
    return json.data!
  },

  // ── SNS OAuth 시작 ──────────────────────────────────────────
  async startSnsAuth(userId: string, platform: string, codeChallenge?: string, returnTo?: string) {
    const res = await fetch(`/api/persona-world/onboarding/sns/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, platform, codeChallenge, returnTo }),
    })

    // 에러 응답도 body를 파싱해 실제 에러 메시지를 전달
    const json: ApiResponse<{
      method: "oauth" | "upload"
      authUrl?: string
      platform: string
      message?: string
    }> | null = await res.json().catch(() => null)

    if (!res.ok || !json) {
      const errMsg = json?.error?.message ?? `SNS 연동 요청 실패 (${res.status})`
      throw new Error(errMsg)
    }
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

  // ── 알림 환경설정 조회 ────────────────────────────────────
  async getNotificationPreferences(userId: string) {
    const params = new URLSearchParams({ userId })
    const res = await fetch(`/api/persona-world/notification-preferences?${params}`)
    if (!res.ok) throw new Error("Failed to fetch notification preferences")

    const json: ApiResponse<NotificationPreferenceData> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 알림 환경설정 업데이트 ────────────────────────────────
  async updateNotificationPreferences(
    userId: string,
    updates: Partial<NotificationPreferenceData>
  ) {
    const res = await fetch(`/api/persona-world/notification-preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...updates }),
    })
    if (!res.ok) throw new Error("Failed to update notification preferences")

    const json: ApiResponse<NotificationPreferenceData> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 코인 잔액 + 거래 내역 조회 ────────────────────────────
  async getCredits(userId: string, options?: { limit?: number; offset?: number }) {
    const params = new URLSearchParams({ userId })
    if (options?.limit) params.set("limit", String(options.limit))
    if (options?.offset) params.set("offset", String(options.offset))

    const res = await fetch(`/api/persona-world/credits?${params}`)
    if (!res.ok) throw new Error("Failed to fetch credits")

    const json: ApiResponse<{
      balance: number
      transactions: Array<{
        id: string
        type: "EARN" | "PURCHASE" | "SPEND"
        amount: number
        balanceAfter: number
        reason: string | null
        status: string
        createdAt: string
      }>
    }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 코인 충전 요청 (Toss 결제 시작) ────────────────────────
  async requestCoinPurchase(userId: string, packageId: string) {
    const res = await fetch(`/api/persona-world/credits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, packageId }),
    })
    if (!res.ok) throw new Error("Failed to request coin purchase")

    const json: ApiResponse<{
      paymentInfo: {
        clientKey: string
        orderId: string
        orderName: string
        amount: number
        totalCoins: number
      }
      packageId: string
    }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── SNS 재분석 실행 ──────────────────────────────────────
  async reanalyzeSns(userId: string) {
    const res = await fetch(`/api/persona-world/onboarding/sns/reanalyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })

    const json: ApiResponse<{
      profileLevel: string
      confidence: number
      llmSummary?: string
      llmTraits?: string[]
      creditUsed: number
      remainingBalance: number
      isFirstFree: boolean
    }> = await res.json()

    if (!res.ok || !json.success) {
      const errMsg = json?.error?.message ?? "SNS 재분석 실패"
      throw new Error(errMsg)
    }
    return json.data!
  },

  // ── 해시태그 / 타입 검색 ────────────────────────────────────
  async searchByHashtag(options: {
    hashtag?: string
    q?: string
    type?: string
    limit?: number
    cursor?: string
  }) {
    const params = new URLSearchParams()
    if (options.hashtag) params.set("hashtag", options.hashtag)
    if (options.q) params.set("q", options.q)
    if (options.type) params.set("type", options.type)
    if (options.limit) params.set("limit", String(options.limit))
    if (options.cursor) params.set("cursor", options.cursor)

    const res = await fetch(`/api/public/search?${params}`)
    if (!res.ok) throw new Error("Failed to search")

    const json: ApiResponse<SearchResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 트렌딩 해시태그 ──────────────────────────────────────
  async getTrendingHashtags() {
    const res = await fetch(`/api/public/search?trending=true`)
    if (!res.ok) throw new Error("Failed to fetch trending hashtags")

    const json: ApiResponse<{ trendingHashtags: TrendingHashtag[] }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!.trendingHashtags
  },

  // ── 검색 자동완성 ──────────────────────────────────────────
  async getSearchSuggestions(q: string): Promise<SearchSuggestionsResponse> {
    if (!q || q.length < 1) return { personas: [], hashtags: [] }

    const res = await fetch(`/api/public/search/suggestions?q=${encodeURIComponent(q)}`)
    if (!res.ok) return { personas: [], hashtags: [] }

    const json: ApiResponse<SearchSuggestionsResponse> = await res.json()
    if (!json.success || !json.data) return { personas: [], hashtags: [] }
    return json.data
  },

  // ── 단건 포스트 조회 ──────────────────────────────────────
  async getPost(postId: string) {
    const res = await fetch(`/api/public/posts/${postId}`)
    if (!res.ok) throw new Error("Failed to fetch post")

    const json: ApiResponse<import("./types").FeedPost> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── VS 배틀 투표 ──────────────────────────────────────────
  async voteOnBattle(postId: string, userId: string, choice: "A" | "B") {
    const res = await fetch(`/api/public/posts/${postId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, choice }),
    })
    if (!res.ok) throw new Error("Failed to vote")

    const json: ApiResponse<{
      postId: string
      choice: string
      votes: { A: number; B: number }
      totalVotes: number
      pctA: number
      pctB: number
    }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── Toss 결제 승인 확인 ────────────────────────────────────
  async confirmCoinPayment(paymentKey: string, orderId: string, amount: number) {
    const res = await fetch(`/api/persona-world/credits/toss-confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
    if (!res.ok) throw new Error("Failed to confirm payment")

    const json: ApiResponse<{ balance: number; coins: number }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 1:1 채팅 ──────────────────────────────────────────────
  async getChatThreads(userId: string) {
    const res = await fetch(`/api/persona-world/chat/threads?userId=${encodeURIComponent(userId)}`)
    if (!res.ok) throw new Error("Failed to fetch chat threads")

    const json: ApiResponse<{ threads: ChatThread[] }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!.threads
  },

  async createChatThread(userId: string, personaId: string) {
    const res = await fetch(`/api/persona-world/chat/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, personaId }),
    })
    if (!res.ok) throw new Error("Failed to create chat thread")

    const json: ApiResponse<{ thread: ChatThread }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!.thread
  },

  async getChatMessages(
    threadId: string,
    userId: string,
    options?: { cursor?: string; limit?: number }
  ) {
    const params = new URLSearchParams({ userId })
    if (options?.cursor) params.set("cursor", options.cursor)
    if (options?.limit) params.set("limit", String(options.limit))

    const res = await fetch(
      `/api/persona-world/chat/threads/${encodeURIComponent(threadId)}/messages?${params}`
    )
    if (!res.ok) throw new Error("Failed to fetch chat messages")

    const json: ApiResponse<{
      messages: ChatMessage[]
      nextCursor: string | null
      hasMore: boolean
    }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  async sendChatMessage(
    threadId: string,
    userId: string,
    content: string,
    imageBase64?: string,
    imageMediaType?: string
  ) {
    const res = await fetch(
      `/api/persona-world/chat/threads/${encodeURIComponent(threadId)}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, content, imageBase64, imageMediaType }),
      }
    )

    if (res.status === 402) {
      throw new Error("INSUFFICIENT_CREDITS")
    }
    if (!res.ok) throw new Error("Failed to send message")

    const json: ApiResponse<SendMessageResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 통화 예약 ─────────────────────────────────────────────
  async getCallReservations(userId: string) {
    const res = await fetch(
      `/api/persona-world/calls/reservations?userId=${encodeURIComponent(userId)}`
    )
    if (!res.ok) throw new Error("Failed to fetch call reservations")

    const json: ApiResponse<{ reservations: CallReservation[] }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!.reservations
  },

  async createCallReservation(userId: string, personaId: string, scheduledAt: string) {
    const res = await fetch(`/api/persona-world/calls/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, personaId, scheduledAt }),
    })

    if (res.status === 402) {
      throw new Error("INSUFFICIENT_CREDITS")
    }
    if (!res.ok) throw new Error("Failed to create call reservation")

    const json: ApiResponse<{ reservationId: string; remainingBalance: number }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  async cancelCallReservation(reservationId: string, userId: string) {
    const res = await fetch(
      `/api/persona-world/calls/reservations/${encodeURIComponent(reservationId)}?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    )
    if (!res.ok) throw new Error("Failed to cancel reservation")

    const json: ApiResponse<{ cancelled: boolean }> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 통화 세션 (시작 / 턴 / 종료) ──────────────────────────────
  async startCall(reservationId: string): Promise<StartCallResponse> {
    const res = await fetch(`/api/persona-world/calls/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservationId }),
    })
    if (!res.ok) throw new Error("Failed to start call")

    const json: ApiResponse<StartCallResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  async sendVoiceTurn(params: {
    sessionId: string
    reservationId: string
    personaId: string
    userId: string
    audioBase64: string
    audioContentType: string
    conversationHistory: Array<{ role: "user" | "persona"; content: string }>
    turnNumber: number
    elapsedSec: number
  }): Promise<CallTurnResponse> {
    const res = await fetch(
      `/api/persona-world/calls/sessions/${encodeURIComponent(params.sessionId)}/turn`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: params.reservationId,
          personaId: params.personaId,
          userId: params.userId,
          audioBase64: params.audioBase64,
          audioContentType: params.audioContentType,
          conversationHistory: params.conversationHistory,
          turnNumber: params.turnNumber,
          elapsedSec: params.elapsedSec,
        }),
      }
    )
    if (!res.ok) throw new Error("Failed to process call turn")

    const json: ApiResponse<CallTurnResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  async endCall(params: {
    sessionId: string
    reservationId: string
    personaId: string
    userId: string
    totalTurns: number
    totalDurationSec: number
    highlights?: string[]
  }): Promise<EndCallResponse> {
    const res = await fetch(
      `/api/persona-world/calls/sessions/${encodeURIComponent(params.sessionId)}/end`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: params.reservationId,
          personaId: params.personaId,
          userId: params.userId,
          totalTurns: params.totalTurns,
          totalDurationSec: params.totalDurationSec,
          highlights: params.highlights,
        }),
      }
    )
    if (!res.ok) throw new Error("Failed to end call")

    const json: ApiResponse<EndCallResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")
    return json.data!
  },

  // ── 상점 아이템 ──────────────────────────────────────────────
  async getShopItems() {
    const res = await fetch("/api/persona-world/shop")
    if (!res.ok) return null // fallback to static data

    const json: ApiResponse<ShopItemFromAPI[]> = await res.json()
    if (!json.success) return null
    return json.data!
  },

  // ── 카카오톡 연동 (T374) ───────────────────────────────────
  async getKakaoLink(userId: string) {
    const res = await fetch(`/api/persona-world/kakao/link?userId=${encodeURIComponent(userId)}`)
    if (!res.ok) return null

    const json: ApiResponse<KakaoLinkResponse> = await res.json()
    if (!json.success) return null
    return json.data!
  },

  async createKakaoLink(params: { userId: string; personaId: string; kakaoUserKey: string }) {
    const res = await fetch("/api/persona-world/kakao/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })

    const json: ApiResponse<KakaoLinkData> = await res.json()
    if (!json.success) {
      throw new Error(json.error?.message || "Failed to create kakao link")
    }
    return json.data!
  },

  async deleteKakaoLink(userId: string) {
    const res = await fetch(`/api/persona-world/kakao/link?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    })

    const json: ApiResponse<{ unlinked: boolean }> = await res.json()
    if (!json.success) {
      throw new Error(json.error?.message || "Failed to unlink kakao")
    }
    return json.data!
  },
}

/** 카카오톡 연동 데이터 */
export interface KakaoLinkData {
  id: string
  personaId: string
  kakaoUserKey: string
  isActive: boolean
  createdAt: string
}

export interface KakaoLinkResponse {
  linked: boolean
  link:
    | (KakaoLinkData & {
        personaName: string
        personaImageUrl: string | null
      })
    | null
}

/** API에서 반환하는 상점 아이템 형태 */
export interface ShopItemFromAPI {
  itemKey: string
  name: string
  description: string
  price: number
  priceLabel: string | null
  category: string
  emoji: string
  repeatable: boolean
  tag: string | null
}
