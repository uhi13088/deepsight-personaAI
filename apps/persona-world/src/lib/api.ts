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
} from "./types"

// Engine Studio API 베이스 URL (환경변수로 설정 가능)
// Engine Studio는 port 3000에서 실행됨
function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_ENGINE_API_URL || "http://localhost:3000"
  // 프로토콜 누락 방어 (상대 경로 방지)
  if (raw && !raw.startsWith("http://") && !raw.startsWith("https://")) {
    return `https://${raw}`
  }
  return raw
}
const API_BASE_URL = resolveApiBaseUrl()

// 공개 페르소나 목록 조회
export async function getPersonas(options?: {
  limit?: number
  page?: number
}): Promise<PersonaDetail[]> {
  try {
    const params = new URLSearchParams()
    if (options?.limit) params.set("limit", String(options.limit))
    if (options?.page) params.set("page", String(options.page))

    const res = await fetch(`${API_BASE_URL}/api/public/personas?${params}`, {
      next: { revalidate: 60 }, // 1분 캐시
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

// 공개 피드 조회
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

    const res = await fetch(`${API_BASE_URL}/api/public/feed?${params}`, {
      next: { revalidate: 30 }, // 30초 캐시
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
    const res = await fetch(`${API_BASE_URL}/api/public/personas/${id}`, {
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

// 클라이언트 사이드 API 함수들 (fetch 사용)
export const clientApi = {
  // 피드 조회 (클라이언트)
  async getFeed(options?: { limit?: number; cursor?: string; personaId?: string; tab?: string }) {
    const params = new URLSearchParams()
    if (options?.limit) params.set("limit", String(options.limit))
    if (options?.cursor) params.set("cursor", options.cursor)
    if (options?.personaId) params.set("personaId", options.personaId)
    if (options?.tab) params.set("tab", options.tab)

    const res = await fetch(`${API_BASE_URL}/api/public/feed?${params}`)
    if (!res.ok) throw new Error("Failed to fetch feed")

    const json: ApiResponse<FeedResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")

    return json.data!
  },

  // 페르소나 목록 조회 (클라이언트)
  async getPersonas(options?: { limit?: number; page?: number }) {
    const params = new URLSearchParams()
    if (options?.limit) params.set("limit", String(options.limit))
    if (options?.page) params.set("page", String(options.page))

    const res = await fetch(`${API_BASE_URL}/api/public/personas?${params}`)
    if (!res.ok) throw new Error("Failed to fetch personas")

    const json: ApiResponse<PersonasResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")

    return json.data!
  },

  // 페르소나 상세 조회 (클라이언트)
  async getPersonaById(id: string) {
    const res = await fetch(`${API_BASE_URL}/api/public/personas/${id}`)
    if (!res.ok) throw new Error("Failed to fetch persona")

    const json: ApiResponse<PersonaFullDetail> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")

    return json.data!
  },

  // ── 온보딩 API ──────────────────────────────────────────────

  // Phase별 질문 조회
  async getOnboardingQuestions(phase: number) {
    const res = await fetch(`${API_BASE_URL}/api/public/onboarding/questions?phase=${phase}`)
    if (!res.ok) throw new Error("Failed to fetch onboarding questions")

    const json: ApiResponse<OnboardingQuestionsResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")

    return json.data!
  },

  // Phase 답변 제출
  async submitOnboardingAnswers(userId: string, phase: number, answers: OnboardingAnswer[]) {
    const res = await fetch(`${API_BASE_URL}/api/public/onboarding/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, phase, answers }),
    })
    if (!res.ok) throw new Error("Failed to submit onboarding answers")

    const json: ApiResponse<OnboardingAnswersResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")

    return json.data!
  },

  // 매칭 프리뷰 조회
  async getMatchingPreview(phase: number, userId: string) {
    const params = new URLSearchParams({ phase: String(phase), userId })
    const res = await fetch(`${API_BASE_URL}/api/public/onboarding/preview?${params}`)
    if (!res.ok) throw new Error("Failed to fetch matching preview")

    const json: ApiResponse<MatchingPreviewResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")

    return json.data!
  },

  // ── Explore API ───────────────────────────────────────────

  async getExplore(options?: { search?: string; role?: string }) {
    const params = new URLSearchParams()
    if (options?.search) params.set("search", options.search)
    if (options?.role) params.set("role", options.role)

    const res = await fetch(`${API_BASE_URL}/api/public/explore?${params}`)
    if (!res.ok) throw new Error("Failed to fetch explore data")

    const json: ApiResponse<ExploreResponse> = await res.json()
    if (!json.success) throw new Error(json.error?.message || "Unknown error")

    return json.data!
  },
}
