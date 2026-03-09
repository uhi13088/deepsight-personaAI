import { describe, it, expect } from "vitest"
import {
  buildSystemBlocks,
  calculateCacheSavings,
  buildUserContent,
  type LLMImageInput,
} from "@/lib/llm-client"

// ── buildSystemBlocks (T143) ────────────────────────────────────

describe("buildSystemBlocks", () => {
  it("prefix 없으면 전체 시스템 프롬프트를 문자열로 반환한다", () => {
    const result = buildSystemBlocks("전체 프롬프트")

    expect(result).toBe("전체 프롬프트")
  })

  it("prefix 있으면 cache_control 블록 배열을 반환한다", () => {
    const result = buildSystemBlocks("동적 suffix", "정적 prefix")

    expect(Array.isArray(result)).toBe(true)
    const blocks = result as Array<{ type: string; text: string; cache_control?: { type: string } }>
    expect(blocks).toHaveLength(2)

    // prefix 블록: cache_control 포함
    expect(blocks[0].type).toBe("text")
    expect(blocks[0].text).toBe("정적 prefix")
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" })

    // suffix 블록: cache_control 없음
    expect(blocks[1].type).toBe("text")
    expect(blocks[1].text).toBe("동적 suffix")
    expect(blocks[1].cache_control).toBeUndefined()
  })

  it("prefix만 있고 suffix 빈 문자열이면 prefix 블록만 반환한다", () => {
    const result = buildSystemBlocks("", "정적 prefix만")

    expect(Array.isArray(result)).toBe(true)
    const blocks = result as Array<{ type: string; text: string; cache_control?: { type: string } }>
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text).toBe("정적 prefix만")
    expect(blocks[0].cache_control).toEqual({ type: "ephemeral" })
  })
})

// ── calculateCacheSavings (T143) ─────────────────────────────────

describe("calculateCacheSavings", () => {
  const model = "claude-sonnet-4-5-20250929"

  it("캐시 읽기만 있으면 90% 절감한다", () => {
    // 1M 읽기 토큰 × $3/1M × 0.9 = $2.70
    const savings = calculateCacheSavings(model, 0, 1_000_000)
    expect(savings).toBeCloseTo(2.7, 4)
  })

  it("캐시 생성만 있으면 추가 비용이므로 0을 반환한다", () => {
    const savings = calculateCacheSavings(model, 1_000_000, 0)
    expect(savings).toBe(0)
  })

  it("읽기 절감이 생성 비용보다 크면 순 절감을 반환한다", () => {
    // 500k 생성: 500k × $3/1M × 0.25 = $0.375 추가비용
    // 2M 읽기: 2M × $3/1M × 0.9 = $5.40 절감
    // 순: $5.40 - $0.375 = $5.025
    const savings = calculateCacheSavings(model, 500_000, 2_000_000)
    expect(savings).toBeCloseTo(5.025, 3)
  })

  it("알 수 없는 모델은 Sonnet 기본 가격을 적용한다", () => {
    const savings = calculateCacheSavings("unknown-model", 0, 1_000_000)
    // Sonnet 기본: $3/1M → 0.9 × 3 = $2.70
    expect(savings).toBeCloseTo(2.7, 4)
  })

  it("토큰 0이면 절감 0이다", () => {
    const savings = calculateCacheSavings(model, 0, 0)
    expect(savings).toBe(0)
  })
})

// ── buildUserContent (T389: Vision 이미지 입력) ─────────────────

describe("buildUserContent", () => {
  it("이미지 없으면 텍스트 문자열을 그대로 반환한다", () => {
    const result = buildUserContent("안녕하세요")
    expect(result).toBe("안녕하세요")
  })

  it("빈 이미지 배열이면 텍스트 문자열을 반환한다", () => {
    const result = buildUserContent("텍스트만", [])
    expect(result).toBe("텍스트만")
  })

  it("base64 이미지 1장이면 이미지+텍스트 content block 배열을 반환한다", () => {
    const images: LLMImageInput[] = [
      { type: "base64", data: "iVBORw0KGgoAAAA...", mediaType: "image/png" },
    ]
    const result = buildUserContent("이 이미지를 분석해줘", images)

    expect(Array.isArray(result)).toBe(true)
    const blocks = result as Array<Record<string, unknown>>
    expect(blocks).toHaveLength(2)

    // 이미지 블록
    expect(blocks[0]).toEqual({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/png",
        data: "iVBORw0KGgoAAAA...",
      },
    })

    // 텍스트 블록
    expect(blocks[1]).toEqual({ type: "text", text: "이 이미지를 분석해줘" })
  })

  it("URL 이미지이면 url source를 사용한다", () => {
    const images: LLMImageInput[] = [
      { type: "url", data: "https://example.com/photo.jpg", mediaType: "image/jpeg" },
    ]
    const result = buildUserContent("분석해줘", images)

    const blocks = result as Array<Record<string, unknown>>
    expect(blocks[0]).toEqual({
      type: "image",
      source: {
        type: "url",
        url: "https://example.com/photo.jpg",
      },
    })
  })

  it("여러 이미지(최대 5장)를 지원한다", () => {
    const images: LLMImageInput[] = Array.from({ length: 5 }, (_, i) => ({
      type: "base64" as const,
      data: `data${i}`,
      mediaType: "image/jpeg" as const,
    }))
    const result = buildUserContent("여러 이미지", images)

    const blocks = result as Array<Record<string, unknown>>
    // 5 이미지 + 1 텍스트 = 6 블록
    expect(blocks).toHaveLength(6)
    expect(blocks[5]).toEqual({ type: "text", text: "여러 이미지" })
  })

  it("6장 이상이면 에러를 던진다", () => {
    const images: LLMImageInput[] = Array.from({ length: 6 }, () => ({
      type: "base64" as const,
      data: "data",
      mediaType: "image/jpeg" as const,
    }))
    expect(() => buildUserContent("초과", images)).toThrow("최대 5장")
  })

  it("지원하지 않는 포맷이면 에러를 던진다", () => {
    const images = [
      { type: "base64" as const, data: "data", mediaType: "image/bmp" as "image/jpeg" },
    ]
    expect(() => buildUserContent("BMP", images)).toThrow("지원하지 않는 이미지 포맷")
  })
})
