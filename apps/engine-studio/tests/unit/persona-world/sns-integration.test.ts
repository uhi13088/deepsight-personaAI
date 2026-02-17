import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  buildAuthUrl,
  encodeState,
  decodeState,
  validateState,
  isOAuthSupported,
  OAUTH_SUPPORTED_PLATFORMS,
  UPLOAD_ONLY_PLATFORMS,
} from "@/lib/persona-world/onboarding/sns-oauth"
import { parseUploadedData } from "@/lib/persona-world/onboarding/sns-analyzer"

// ═══════════════════════════════════════════════════════════════
// SNS OAuth 테스트
// ═══════════════════════════════════════════════════════════════

describe("SNS OAuth", () => {
  describe("encodeState / decodeState", () => {
    it("userId와 platform을 인코딩·디코딩한다", () => {
      const state = encodeState("user-123", "YOUTUBE")
      const decoded = decodeState(state)

      expect(decoded).not.toBeNull()
      expect(decoded!.userId).toBe("user-123")
      expect(decoded!.platform).toBe("YOUTUBE")
      expect(typeof decoded!.ts).toBe("number")
    })

    it("잘못된 state는 null 반환", () => {
      expect(decodeState("invalid-state")).toBeNull()
      expect(decodeState("")).toBeNull()
    })
  })

  describe("validateState", () => {
    it("유효한 state 검증 통과", () => {
      const state = encodeState("user-456", "SPOTIFY")
      const result = validateState(state)

      expect(result.valid).toBe(true)
      expect(result.userId).toBe("user-456")
      expect(result.platform).toBe("SPOTIFY")
    })

    it("만료된 state 거부 (10분 초과)", () => {
      // 오래된 타임스탬프로 직접 생성
      const oldState = Buffer.from(
        JSON.stringify({ userId: "user-old", platform: "YOUTUBE", ts: Date.now() - 11 * 60 * 1000 })
      ).toString("base64url")

      const result = validateState(oldState)
      expect(result.valid).toBe(false)
    })

    it("잘못된 state 거부", () => {
      expect(validateState("broken")).toEqual({ valid: false })
    })
  })

  describe("isOAuthSupported", () => {
    it("YouTube, Spotify, Instagram, Twitter, TikTok 지원", () => {
      expect(isOAuthSupported("YOUTUBE")).toBe(true)
      expect(isOAuthSupported("SPOTIFY")).toBe(true)
      expect(isOAuthSupported("INSTAGRAM")).toBe(true)
      expect(isOAuthSupported("TWITTER")).toBe(true)
      expect(isOAuthSupported("TIKTOK")).toBe(true)
    })

    it("Netflix, Letterboxd 미지원", () => {
      expect(isOAuthSupported("NETFLIX")).toBe(false)
      expect(isOAuthSupported("LETTERBOXD")).toBe(false)
    })
  })

  describe("플랫폼 목록 상수", () => {
    it("OAUTH_SUPPORTED_PLATFORMS에 5개 플랫폼", () => {
      expect(OAUTH_SUPPORTED_PLATFORMS).toHaveLength(5)
      expect(OAUTH_SUPPORTED_PLATFORMS).toContain("YOUTUBE")
      expect(OAUTH_SUPPORTED_PLATFORMS).toContain("SPOTIFY")
    })

    it("UPLOAD_ONLY_PLATFORMS에 2개 플랫폼", () => {
      expect(UPLOAD_ONLY_PLATFORMS).toHaveLength(2)
      expect(UPLOAD_ONLY_PLATFORMS).toContain("NETFLIX")
      expect(UPLOAD_ONLY_PLATFORMS).toContain("LETTERBOXD")
    })
  })

  describe("buildAuthUrl", () => {
    beforeEach(() => {
      vi.stubEnv("YOUTUBE_CLIENT_ID", "test-youtube-id")
      vi.stubEnv("YOUTUBE_CLIENT_SECRET", "test-youtube-secret")
      vi.stubEnv("SPOTIFY_CLIENT_ID", "test-spotify-id")
      vi.stubEnv("SPOTIFY_CLIENT_SECRET", "test-spotify-secret")
      vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com")
    })

    it("YouTube OAuth URL 생성", () => {
      const url = buildAuthUrl("YOUTUBE", "user-1")

      expect(url).not.toBeNull()
      expect(url).toContain("accounts.google.com")
      expect(url).toContain("client_id=test-youtube-id")
      expect(url).toContain("youtube.readonly")
      expect(url).toContain("access_type=offline")
    })

    it("Spotify OAuth URL 생성", () => {
      const url = buildAuthUrl("SPOTIFY", "user-2")

      expect(url).not.toBeNull()
      expect(url).toContain("accounts.spotify.com")
      expect(url).toContain("client_id=test-spotify-id")
    })

    it("비 OAuth 플랫폼은 null 반환", () => {
      expect(buildAuthUrl("NETFLIX", "user-3")).toBeNull()
      expect(buildAuthUrl("LETTERBOXD", "user-4")).toBeNull()
    })

    it("client_id 미설정 시 null 반환", () => {
      vi.stubEnv("INSTAGRAM_CLIENT_ID", "")
      expect(buildAuthUrl("INSTAGRAM", "user-5")).toBeNull()
    })

    it("state에 userId 포함", () => {
      const url = buildAuthUrl("YOUTUBE", "user-state-test")!
      const urlObj = new URL(url)
      const state = urlObj.searchParams.get("state")!
      const decoded = decodeState(state)

      expect(decoded!.userId).toBe("user-state-test")
      expect(decoded!.platform).toBe("YOUTUBE")
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// SNS Analyzer 테스트 (데이터 업로드 파싱)
// ═══════════════════════════════════════════════════════════════

describe("SNS Analyzer — parseUploadedData", () => {
  describe("Netflix 데이터 파싱", () => {
    it("시청 기록을 SnsExtractedProfile로 변환", () => {
      const data = {
        viewingHistory: [
          { Title: "Breaking Bad", Date: "2024-01-15" },
          { Title: "Stranger Things", Date: "2024-01-20" },
          { Title: "The Office", Date: "2024-02-01" },
        ],
      }

      const result = parseUploadedData("NETFLIX", data)

      expect(result.platform).toBe("NETFLIX")
      expect(result.extractedAt).toBeDefined()
      expect(result.specificTastes.favoriteMovies).toContain("Breaking Bad")
      expect(result.specificTastes.favoriteMovies).toContain("Stranger Things")
      expect(result.activityPattern.frequency).toBe("OCCASIONAL")
      expect(result.activityPattern.contentConsumptionRate).toBe(3)
    })

    it("빈 시청 기록 처리", () => {
      const result = parseUploadedData("NETFLIX", {})

      expect(result.platform).toBe("NETFLIX")
      expect(result.specificTastes.favoriteGenres).toEqual([])
      expect(result.activityPattern.contentConsumptionRate).toBe(0)
    })

    it("대량 시청 기록 → DAILY 빈도 추론", () => {
      const viewingHistory = Array.from({ length: 150 }, (_, i) => ({
        Title: `Movie ${i}`,
        Date: "2024-01-01",
      }))

      const result = parseUploadedData("NETFLIX", { viewingHistory })

      expect(result.activityPattern.frequency).toBe("DAILY")
    })
  })

  describe("Letterboxd 데이터 파싱", () => {
    it("영화 기록을 SnsExtractedProfile로 변환", () => {
      const data = {
        watchedFilms: [
          { Name: "Parasite", Rating: "5" },
          { Name: "The Godfather", Rating: "4.5" },
          { Name: "Bad Film", Rating: "1" },
        ],
      }

      const result = parseUploadedData("LETTERBOXD", data)

      expect(result.platform).toBe("LETTERBOXD")
      expect(result.specificTastes.favoriteMovies).toContain("Parasite")
      expect(result.specificTastes.favoriteMovies).toContain("The Godfather")
      // Bad Film은 rating < 4이므로 favorite에 없음
      expect(result.specificTastes.favoriteMovies).not.toContain("Bad Film")
    })

    it("높은 평균 평점 → POSITIVE 성향", () => {
      const data = {
        watchedFilms: [
          { Name: "A", Rating: "4.5" },
          { Name: "B", Rating: "5" },
          { Name: "C", Rating: "4" },
        ],
      }

      const result = parseUploadedData("LETTERBOXD", data)
      expect(result.expressionStyle.sentimentTone).toBe("POSITIVE")
    })

    it("낮은 평균 평점 → CRITICAL 성향", () => {
      const data = {
        watchedFilms: [
          { Name: "A", Rating: "1" },
          { Name: "B", Rating: "2" },
          { Name: "C", Rating: "1.5" },
        ],
      }

      const result = parseUploadedData("LETTERBOXD", data)
      expect(result.expressionStyle.sentimentTone).toBe("CRITICAL")
    })
  })

  describe("미지원 플랫폼", () => {
    it("미지원 플랫폼은 빈 프로필 반환", () => {
      const result = parseUploadedData("TIKTOK", { some: "data" })

      expect(result.specificTastes.favoriteGenres).toEqual([])
      expect(result.interests.mentionedKeywords).toEqual([])
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// 통합 흐름 테스트
// ═══════════════════════════════════════════════════════════════

describe("SNS Integration Flow", () => {
  it("OAuth → state → 검증 → 디코딩 플로우", () => {
    // 1. state 생성
    const state = encodeState("test-user", "SPOTIFY")

    // 2. 검증
    const validated = validateState(state)
    expect(validated.valid).toBe(true)
    expect(validated.userId).toBe("test-user")

    // 3. 디코딩
    const decoded = decodeState(state)
    expect(decoded!.platform).toBe("SPOTIFY")
  })

  it("업로드 → 파싱 → 프로필 데이터 플로우", () => {
    // 1. 유저가 Netflix 데이터 업로드
    const uploadedData = {
      viewingHistory: [
        { Title: "Dark", Date: "2024-01-10" },
        { Title: "The Crown", Date: "2024-01-12" },
        { Title: "Wednesday", Date: "2024-01-15" },
        { Title: "Narcos", Date: "2024-01-18" },
        { Title: "Money Heist", Date: "2024-01-20" },
      ],
    }

    // 2. 파싱
    const extracted = parseUploadedData("NETFLIX", uploadedData)

    // 3. 데이터 구조 확인
    expect(extracted.platform).toBe("NETFLIX")
    expect(extracted.specificTastes.favoriteMovies.length).toBeGreaterThan(0)
    expect(extracted.activityPattern.contentConsumptionRate).toBe(5)
    expect(extracted.interests.mentionedKeywords.length).toBeGreaterThanOrEqual(0)
  })
})
