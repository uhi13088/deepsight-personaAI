import { describe, it, expect, vi } from "vitest"
import {
  autoTag,
  generateImpression,
  extractConsumptionFromPost,
  inferContentType,
} from "@/lib/persona-world/consumption-manager"
import type { ConsumptionContentType } from "@/lib/persona-world/types"

// ═══ autoTag ═══

describe("autoTag", () => {
  it("contentType을 첫 태그로 포함", () => {
    const tags = autoTag("MOVIE", "인터스텔라")
    expect(tags[0]).toBe("movie")
  })

  it("제목에서 키워드 추출 (2자 이상)", () => {
    const tags = autoTag("BOOK", "사피엔스 유발 하라리")
    expect(tags).toContain("사피엔스")
    expect(tags).toContain("유발")
    expect(tags).toContain("하라리")
  })

  it("최대 3개 키워드 + contentType = 최대 4개", () => {
    const tags = autoTag("DRAMA", "기묘한 이야기 시즌 3 넷플릭스 한정판")
    // contentType(1) + 키워드(최대 3) = 최대 4
    expect(tags.length).toBeLessThanOrEqual(4)
    expect(tags[0]).toBe("drama")
  })

  it("1자 단어는 제외", () => {
    const tags = autoTag("MUSIC", "A B 로드 투 노웨어")
    expect(tags).not.toContain("a")
    expect(tags).not.toContain("b")
    expect(tags).toContain("로드")
  })

  it("특수문자 제거", () => {
    const tags = autoTag("ARTICLE", "AI의 미래: 2026년 전망")
    // 특수문자(', :) 제거 후 키워드
    expect(tags.some((t) => t.includes(":"))).toBe(false)
  })

  it("빈 제목 → contentType만 반환", () => {
    const tags = autoTag("GAME", "")
    expect(tags).toEqual(["game"])
  })

  it("OTHER 타입도 정상 동작", () => {
    const tags = autoTag("OTHER", "전시회 관람")
    expect(tags[0]).toBe("other")
    expect(tags).toContain("전시회")
  })
})

// ═══ generateImpression ═══

describe("generateImpression", () => {
  it("LLM provider 없으면 기본 템플릿 사용 — MOVIE", async () => {
    const impression = await generateImpression("MOVIE", "인터스텔라")
    expect(impression).toContain("인터스텔라")
    expect(impression).toContain("봤다")
  })

  it("LLM provider 없으면 기본 템플릿 사용 — DRAMA", async () => {
    const impression = await generateImpression("DRAMA", "기묘한 이야기")
    expect(impression).toContain("기묘한 이야기")
    expect(impression).toContain("정주행")
  })

  it("LLM provider 없으면 기본 템플릿 사용 — MUSIC", async () => {
    const impression = await generateImpression("MUSIC", "Bohemian Rhapsody")
    expect(impression).toContain("Bohemian Rhapsody")
    expect(impression).toContain("듣게 된다")
  })

  it("LLM provider 없으면 기본 템플릿 사용 — BOOK", async () => {
    const impression = await generateImpression("BOOK", "사피엔스")
    expect(impression).toContain("사피엔스")
    expect(impression).toContain("읽었다")
  })

  it("LLM provider 없으면 기본 템플릿 사용 — GAME", async () => {
    const impression = await generateImpression("GAME", "엘든 링")
    expect(impression).toContain("엘든 링")
    expect(impression).toContain("플레이")
  })

  it("LLM provider 있으면 LLM 결과 반환", async () => {
    const mockProvider = {
      generateImpression: vi.fn().mockResolvedValue("놀란 감독의 역작, 시공간을 초월한 감동"),
    }

    const impression = await generateImpression(
      "MOVIE",
      "인터스텔라",
      mockProvider,
      "논리적이고 분석적인 성격"
    )
    expect(impression).toBe("놀란 감독의 역작, 시공간을 초월한 감동")
    expect(mockProvider.generateImpression).toHaveBeenCalledWith({
      contentType: "MOVIE",
      title: "인터스텔라",
      personaContext: "논리적이고 분석적인 성격",
    })
  })

  it("LLM provider 있지만 personaContext 없으면 기본 템플릿", async () => {
    const mockProvider = {
      generateImpression: vi.fn(),
    }

    const impression = await generateImpression("MOVIE", "인터스텔라", mockProvider)
    expect(impression).toContain("인터스텔라")
    expect(mockProvider.generateImpression).not.toHaveBeenCalled()
  })

  it("모든 contentType에 기본 템플릿 존재", async () => {
    const types: ConsumptionContentType[] = [
      "MOVIE",
      "DRAMA",
      "MUSIC",
      "BOOK",
      "ARTICLE",
      "GAME",
      "OTHER",
    ]

    for (const type of types) {
      const impression = await generateImpression(type, "테스트 콘텐츠")
      expect(impression).toBeTruthy()
      expect(impression).toContain("테스트 콘텐츠")
    }
  })
})

// ═══ inferContentType ═══

describe("inferContentType", () => {
  it("영화 키워드 → MOVIE", () => {
    expect(inferContentType(["영화추천"], "올해 최고의 영화")).toBe("MOVIE")
  })

  it("드라마 키워드 → DRAMA", () => {
    expect(inferContentType(["드라마"], "넷플릭스 시리즈")).toBe("DRAMA")
  })

  it("음악 키워드 → MUSIC", () => {
    expect(inferContentType(["music", "album"], undefined)).toBe("MUSIC")
  })

  it("책 키워드 → BOOK", () => {
    expect(inferContentType([], "올해 읽은 소설")).toBe("BOOK")
  })

  it("기사 키워드 → ARTICLE", () => {
    expect(inferContentType(["뉴스"], undefined)).toBe("ARTICLE")
  })

  it("게임 키워드 → GAME", () => {
    expect(inferContentType(["게임추천"], "스팀 할인")).toBe("GAME")
  })

  it("매칭 없으면 → OTHER", () => {
    expect(inferContentType([], "일상 이야기")).toBe("OTHER")
  })

  it("해시태그와 토픽 모두 검사", () => {
    expect(inferContentType(["추천"], "이번 시즌 베스트 영화")).toBe("MOVIE")
  })
})

// ═══ extractConsumptionFromPost ═══

describe("extractConsumptionFromPost", () => {
  describe("CURATION 포스트", () => {
    it("metadata.items에서 소비 기록 추출", () => {
      const result = extractConsumptionFromPost({
        postType: "CURATION",
        content: "이번 주 추천 영화 3선",
        metadata: {
          items: [
            { rank: 1, title: "인터스텔라", reason: "놀란 감독의 역작" },
            { rank: 2, title: "듄", reason: "스케일이 다르다" },
            { rank: 3, title: "테넷", reason: "시간 역행의 미학" },
          ],
        },
        hashtags: ["영화추천"],
      })

      expect(result).toHaveLength(3)
      expect(result[0].title).toBe("인터스텔라")
      expect(result[0].impression).toBe("놀란 감독의 역작")
      expect(result[0].contentType).toBe("MOVIE")
      expect(result[0].emotionalImpact).toBe(0.2)
      expect(result[0].tags).toContain("movie")
    })

    it("reason 없으면 기본 impression 생성", () => {
      const result = extractConsumptionFromPost({
        postType: "CURATION",
        content: "추천",
        metadata: {
          items: [{ rank: 1, title: "인터스텔라" }],
        },
        hashtags: [],
      })

      expect(result).toHaveLength(1)
      expect(result[0].impression).toContain("큐레이션 목록에 포함")
    })

    it("빈 items → 빈 배열 반환", () => {
      const result = extractConsumptionFromPost({
        postType: "CURATION",
        content: "큐레이션",
        metadata: { items: [] },
        hashtags: [],
      })

      expect(result).toHaveLength(0)
    })

    it("items 없으면 빈 배열 반환", () => {
      const result = extractConsumptionFromPost({
        postType: "CURATION",
        content: "큐레이션",
        metadata: {},
        hashtags: [],
      })

      expect(result).toHaveLength(0)
    })

    it("title 없는 아이템은 필터링", () => {
      const result = extractConsumptionFromPost({
        postType: "CURATION",
        content: "큐레이션",
        metadata: {
          items: [
            { rank: 1, title: "유효", reason: "좋음" },
            { rank: 2, reason: "제목 없음" },
            { rank: 3, title: "", reason: "빈 제목" },
          ],
        },
        hashtags: [],
      })

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe("유효")
    })
  })

  describe("REVIEW 포스트", () => {
    it("토픽에서 제목 추출 + rating 변환", () => {
      const result = extractConsumptionFromPost({
        postType: "REVIEW",
        content: "놀란 감독의 역작이다. 시간과 공간을 넘나드는 영화.",
        metadata: { rating: 4.5 },
        topic: "인터스텔라",
        hashtags: ["영화리뷰"],
      })

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe("인터스텔라")
      expect(result[0].contentType).toBe("MOVIE")
      expect(result[0].rating).toBeCloseTo(0.9) // 4.5/5
      expect(result[0].emotionalImpact).toBe(0.3)
    })

    it("rating 최대값 1.0 (5점이면 1.0)", () => {
      const result = extractConsumptionFromPost({
        postType: "REVIEW",
        content: "최고의 소설이다.",
        metadata: { rating: 5 },
        topic: "사피엔스",
        hashtags: ["책"],
      })

      expect(result[0].rating).toBe(1)
    })

    it("rating 없으면 undefined", () => {
      const result = extractConsumptionFromPost({
        postType: "REVIEW",
        content: "괜찮았다.",
        metadata: {},
        topic: "테스트 작품",
        hashtags: [],
      })

      expect(result[0].rating).toBeUndefined()
    })

    it("토픽 없으면 콘텐츠에서 제목 추출 시도", () => {
      const result = extractConsumptionFromPost({
        postType: "REVIEW",
        content: "짧은 제목\n본문 내용",
        metadata: {},
        hashtags: [],
      })

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe("짧은 제목")
    })
  })

  describe("NEWS_REACTION 포스트", () => {
    it("토픽에서 기사 제목 추출", () => {
      const result = extractConsumptionFromPost({
        postType: "NEWS_REACTION",
        content: "흥미로운 기사다. AI 발전 속도가 빠르다.",
        metadata: {},
        topic: "AI 시대의 일자리 변화",
        hashtags: [],
      })

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe("AI 시대의 일자리 변화")
      expect(result[0].contentType).toBe("ARTICLE")
      expect(result[0].emotionalImpact).toBe(0.15)
    })

    it("토픽 없으면 콘텐츠 첫 줄에서 추출", () => {
      const result = extractConsumptionFromPost({
        postType: "NEWS_REACTION",
        content: "AI가 바꾸는 세상\n상세 내용...",
        metadata: {},
        hashtags: [],
      })

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe("AI가 바꾸는 세상")
    })
  })

  describe("기타 포스트 타입", () => {
    it("THOUGHT → 빈 배열", () => {
      const result = extractConsumptionFromPost({
        postType: "THOUGHT",
        content: "오늘 날씨가 좋다.",
        metadata: {},
        hashtags: [],
      })

      expect(result).toHaveLength(0)
    })

    it("VS_BATTLE → 빈 배열", () => {
      const result = extractConsumptionFromPost({
        postType: "VS_BATTLE",
        content: "A vs B",
        metadata: {},
        hashtags: [],
      })

      expect(result).toHaveLength(0)
    })

    it("COLLAB → 빈 배열", () => {
      const result = extractConsumptionFromPost({
        postType: "COLLAB",
        content: "콜라보",
        metadata: {},
        hashtags: [],
      })

      expect(result).toHaveLength(0)
    })
  })
})
