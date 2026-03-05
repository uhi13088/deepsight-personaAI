import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * T393: content-vectorizer — Claude API 기반 콘텐츠 벡터화 단위 테스트
 *
 * LLM 호출은 mock으로 대체 → 프롬프트 구조 + clamp 동작 검증에 집중.
 */

// ── generateText mock ──────────────────────────────────────

vi.mock("@/lib/llm-client", () => ({
  generateText: vi.fn(),
}))

vi.mock("@deepsight/vector-core", () => ({
  clamp: (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100) / 100,
}))

import { generateText } from "@/lib/llm-client"
import { vectorizeContent, vectorizeBatch } from "@/lib/content/content-vectorizer"

const mockGenerateText = vi.mocked(generateText)

// ── 기본 응답 픽스처 ─────────────────────────────────────────

const VALID_RESPONSE_TEXT = JSON.stringify({
  contentVector: {
    depth: 0.8,
    lens: 0.3,
    stance: 0.6,
    scope: 0.7,
    taste: 0.9,
    purpose: 0.5,
    sociability: 0.4,
  },
  narrativeTheme: {
    lack: 0.7,
    moralCompass: 0.4,
    volatility: 0.8,
    growthArc: 0.6,
  },
})

function makeMockResult(text: string) {
  return {
    text,
    inputTokens: 100,
    outputTokens: 50,
    model: "claude-sonnet-4-6",
    stopReason: "end_turn",
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── vectorizeContent ──────────────────────────────────────────

describe("vectorizeContent — 기본 동작", () => {
  it("title만 있어도 정상 호출", async () => {
    mockGenerateText.mockResolvedValue(makeMockResult(VALID_RESPONSE_TEXT))

    const result = await vectorizeContent({ title: "기묘한 이야기", genres: [], tags: [] })

    expect(mockGenerateText).toHaveBeenCalledOnce()
    expect(result.contentVector.depth).toBe(0.8)
    expect(result.narrativeTheme.lack).toBe(0.7)
  })

  it("description, genres, tags가 userMessage에 포함됨", async () => {
    mockGenerateText.mockResolvedValue(makeMockResult(VALID_RESPONSE_TEXT))

    await vectorizeContent({
      title: "인터스텔라",
      description: "우주 탐험 SF 영화",
      genres: ["SF", "드라마"],
      tags: ["우주", "시간여행", "감동"],
    })

    const [params] = mockGenerateText.mock.calls[0]
    expect(params.userMessage).toContain("인터스텔라")
    expect(params.userMessage).toContain("우주 탐험 SF 영화")
    expect(params.userMessage).toContain("SF, 드라마")
    expect(params.userMessage).toContain("우주, 시간여행, 감동")
  })

  it("callType이 content_vectorize로 전달됨", async () => {
    mockGenerateText.mockResolvedValue(makeMockResult(VALID_RESPONSE_TEXT))

    await vectorizeContent({ title: "테스트", genres: [], tags: [] })

    const [params] = mockGenerateText.mock.calls[0]
    expect(params.callType).toBe("content_vectorize")
  })

  it("temperature가 낮게(0.2) 설정됨", async () => {
    mockGenerateText.mockResolvedValue(makeMockResult(VALID_RESPONSE_TEXT))

    await vectorizeContent({ title: "테스트", genres: [], tags: [] })

    const [params] = mockGenerateText.mock.calls[0]
    expect(params.temperature).toBe(0.2)
  })
})

describe("vectorizeContent — clamp 처리", () => {
  it("범위 초과 값(1.5) → clamp → 1.0", async () => {
    const overRange = JSON.stringify({
      contentVector: {
        depth: 1.5,
        lens: -0.3,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
      narrativeTheme: { lack: 0.5, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 },
    })
    mockGenerateText.mockResolvedValue(makeMockResult(overRange))

    const result = await vectorizeContent({ title: "테스트", genres: [], tags: [] })

    expect(result.contentVector.depth).toBe(1.0) // 1.5 → clamp → 1.0
    expect(result.contentVector.lens).toBe(0.0) // -0.3 → clamp → 0.0
  })

  it("모든 contentVector 값이 [0,1] 범위", async () => {
    mockGenerateText.mockResolvedValue(makeMockResult(VALID_RESPONSE_TEXT))

    const result = await vectorizeContent({ title: "테스트", genres: [], tags: [] })

    for (const val of Object.values(result.contentVector)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(1)
    }
    for (const val of Object.values(result.narrativeTheme)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(1)
    }
  })

  it("빠진 필드 → 0.5 기본값 적용", async () => {
    const partial = JSON.stringify({
      contentVector: { depth: 0.8 }, // 나머지 필드 없음
      narrativeTheme: {},
    })
    mockGenerateText.mockResolvedValue(makeMockResult(partial))

    const result = await vectorizeContent({ title: "테스트", genres: [], tags: [] })

    expect(result.contentVector.depth).toBe(0.8)
    expect(result.contentVector.lens).toBe(0.5) // 기본값
    expect(result.narrativeTheme.lack).toBe(0.5) // 기본값
  })

  it("마크다운 코드블록 응답 정상 파싱", async () => {
    const withCodeBlock = "```json\n" + VALID_RESPONSE_TEXT + "\n```"
    mockGenerateText.mockResolvedValue(makeMockResult(withCodeBlock))

    const result = await vectorizeContent({ title: "테스트", genres: [], tags: [] })

    expect(result.contentVector.depth).toBe(0.8)
  })

  it("JSON 파싱 실패 시 Error 던짐", async () => {
    mockGenerateText.mockResolvedValue(makeMockResult("이것은 JSON이 아닙니다"))

    await expect(vectorizeContent({ title: "테스트", genres: [], tags: [] })).rejects.toThrow(
      "JSON 파싱 실패"
    )
  })
})

// ── vectorizeBatch ────────────────────────────────────────────

describe("vectorizeBatch — 배치 처리", () => {
  it("3개 아이템 → generateText 3회 호출", async () => {
    mockGenerateText.mockResolvedValue(makeMockResult(VALID_RESPONSE_TEXT))

    const items = [
      { title: "영화A", genres: [], tags: [] },
      { title: "영화B", genres: [], tags: [] },
      { title: "영화C", genres: [], tags: [] },
    ]

    const results = await vectorizeBatch(items, 2)

    expect(mockGenerateText).toHaveBeenCalledTimes(3)
    expect(results).toHaveLength(3)
  })

  it("빈 배열 → 빈 결과", async () => {
    const results = await vectorizeBatch([], 5)
    expect(results).toHaveLength(0)
    expect(mockGenerateText).not.toHaveBeenCalled()
  })

  it("concurrency=1 → 순차 처리 완료 (인덱스 순서 보장)", async () => {
    const order: number[] = []
    mockGenerateText.mockImplementation(async (params) => {
      const idx = parseInt(params.userMessage.replace("제목: 아이템", ""))
      order.push(idx)
      return makeMockResult(VALID_RESPONSE_TEXT)
    })

    const items = [0, 1, 2].map((i) => ({ title: `아이템${i}`, genres: [], tags: [] }))
    const results = await vectorizeBatch(items, 1)

    expect(results).toHaveLength(3)
    expect(order).toEqual([0, 1, 2])
  })

  it("각 결과는 유효한 ContentVectorResult 형태", async () => {
    mockGenerateText.mockResolvedValue(makeMockResult(VALID_RESPONSE_TEXT))

    const [result] = await vectorizeBatch([{ title: "테스트", genres: [], tags: [] }])

    expect(result).toHaveProperty("contentVector")
    expect(result).toHaveProperty("narrativeTheme")
    expect(Object.keys(result.contentVector)).toHaveLength(7)
    expect(Object.keys(result.narrativeTheme)).toHaveLength(4)
  })
})
