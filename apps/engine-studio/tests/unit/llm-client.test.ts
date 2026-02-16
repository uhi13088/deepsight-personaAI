import { describe, it, expect } from "vitest"
import { buildSystemBlocks, calculateCacheSavings } from "@/lib/llm-client"

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
