import { describe, it, expect, vi, beforeEach } from "vitest"

// parseAnalysisResponse + 캐시 로직 테스트 (LLM 호출 없이)
// analyzeImage 자체는 LLM 의존이므로 통합 테스트 대상

// ── parseAnalysisResponse 내부 로직을 간접 테스트하기 위해 모듈 전체 mock ──
// 대신 export된 캐시 유틸과 파싱 로직을 직접 테스트

vi.mock("@/lib/llm-client", () => ({
  generateText: vi.fn(),
}))

import {
  analyzeImage,
  clearImageAnalysisCache,
  getImageAnalysisCacheSize,
} from "@/lib/multimodal/image-analyzer"
import { generateText } from "@/lib/llm-client"
import type { LLMImageInput } from "@/lib/llm-client"

const mockGenerateText = vi.mocked(generateText)

beforeEach(() => {
  clearImageAnalysisCache()
  mockGenerateText.mockReset()
})

describe("analyzeImage", () => {
  const sampleImage: LLMImageInput = {
    type: "base64",
    data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk",
    mediaType: "image/png",
  }

  const validJsonResponse = JSON.stringify({
    description: "따뜻한 석양이 비치는 해변 풍경이다.",
    mood: "평화로운",
    tags: ["해변", "석양", "바다", "여행"],
    dominantColors: ["오렌지", "네이비 블루", "골드"],
    sentiment: 0.8,
    category: "풍경",
  })

  it("유효한 JSON 응답을 올바르게 파싱한다", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: validJsonResponse,
      inputTokens: 100,
      outputTokens: 50,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    })

    const result = await analyzeImage(sampleImage)

    expect(result.description).toBe("따뜻한 석양이 비치는 해변 풍경이다.")
    expect(result.mood).toBe("평화로운")
    expect(result.tags).toEqual(["해변", "석양", "바다", "여행"])
    expect(result.dominantColors).toEqual(["오렌지", "네이비 블루", "골드"])
    expect(result.sentiment).toBe(0.8)
    expect(result.category).toBe("풍경")
  })

  it("```json 블록으로 감싼 응답도 파싱한다", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: `분석 결과입니다:\n\`\`\`json\n${validJsonResponse}\n\`\`\``,
      inputTokens: 100,
      outputTokens: 50,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    })

    const result = await analyzeImage(sampleImage)
    expect(result.mood).toBe("평화로운")
  })

  it("JSON 파싱 실패 시 폴백 분석을 반환한다", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: "이 이미지는 매우 아름다운 풍경입니다. 파싱 불가능한 텍스트.",
      inputTokens: 100,
      outputTokens: 50,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    })

    const result = await analyzeImage(sampleImage)
    expect(result.mood).toBe("중립적인")
    expect(result.tags).toEqual([])
    expect(result.category).toBe("기타")
    expect(result.description).toContain("이 이미지는 매우 아름다운")
  })

  it("sentiment를 -1~1 범위로 클램핑한다", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        description: "설명",
        mood: "극도로 긍정적",
        tags: [],
        dominantColors: [],
        sentiment: 5.0,
        category: "기타",
      }),
      inputTokens: 100,
      outputTokens: 50,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    })

    const result = await analyzeImage(sampleImage)
    expect(result.sentiment).toBe(1)
  })

  it("callType을 mm:image_analysis로 설정한다", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: validJsonResponse,
      inputTokens: 100,
      outputTokens: 50,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    })

    await analyzeImage(sampleImage)

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        callType: "mm:image_analysis",
        images: [sampleImage],
      })
    )
  })
})

describe("이미지 분석 캐시", () => {
  const urlImage: LLMImageInput = {
    type: "url",
    data: "https://example.com/test.jpg",
    mediaType: "image/jpeg",
  }

  const mockResponse = {
    text: JSON.stringify({
      description: "테스트",
      mood: "중립적인",
      tags: ["테스트"],
      dominantColors: ["흰색"],
      sentiment: 0,
      category: "기타",
    }),
    inputTokens: 100,
    outputTokens: 50,
    model: "claude-sonnet-4-5-20250929",
    stopReason: "end_turn" as const,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
  }

  it("동일 이미지 재분석 시 캐시를 사용한다", async () => {
    mockGenerateText.mockResolvedValue(mockResponse)

    await analyzeImage(urlImage)
    await analyzeImage(urlImage)

    // LLM은 1번만 호출됨
    expect(mockGenerateText).toHaveBeenCalledTimes(1)
    expect(getImageAnalysisCacheSize()).toBe(1)
  })

  it("clearImageAnalysisCache로 캐시를 초기화한다", async () => {
    mockGenerateText.mockResolvedValue(mockResponse)

    await analyzeImage(urlImage)
    expect(getImageAnalysisCacheSize()).toBe(1)

    clearImageAnalysisCache()
    expect(getImageAnalysisCacheSize()).toBe(0)
  })

  it("다른 URL이면 캐시 미스로 LLM을 재호출한다", async () => {
    mockGenerateText.mockResolvedValue(mockResponse)

    await analyzeImage(urlImage)
    await analyzeImage({
      type: "url",
      data: "https://example.com/other.jpg",
      mediaType: "image/jpeg",
    })

    expect(mockGenerateText).toHaveBeenCalledTimes(2)
    expect(getImageAnalysisCacheSize()).toBe(2)
  })
})
