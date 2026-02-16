// ═══════════════════════════════════════════════════════════════
// T152: Prompt Cache 단위 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
  // 타입
  type PromptContentBlock,
  type CacheControl,
  type BlockCategory,
  type CacheEligibility,
  type SplitPromptBlock,
  type CacheAwareSystemPrompt,
  type CacheUsageInfo,
  type CacheCostBreakdown,
  type PromptCacheStats,
  type CacheUsageEntry,
  type PromptSplitInput,
  type CacheOptimizationAdvice,
  type CacheablModel,
  // 상수
  MIN_CACHEABLE_TOKENS,
  CHARS_PER_TOKEN,
  MODEL_TOKEN_PRICING,
  DEFAULT_CACHE_MODEL,
  CACHE_BENEFIT_THRESHOLD,
  // 함수
  estimateTokens,
  checkCacheEligibility,
  splitPromptBlocks,
  mergeSmallCacheableBlocks,
  buildCacheAwareSystemPrompt,
  buildCacheAwarePrompt,
  parseCacheUsage,
  computeCacheCost,
  estimateCacheBenefit,
  createEmptyCacheStats,
  updateCacheStats,
  summarizeCacheStats,
  createCacheUsageEntry,
  aggregateCacheHistory,
  analyzePerPersonaCacheEfficiency,
  generateCacheAdvice,
} from "@/lib/prompt-cache"

// ── 헬퍼 ────────────────────────────────────────────────────

/** 지정 토큰 수에 해당하는 텍스트 생성 */
function makeText(targetTokens: number): string {
  const chars = Math.ceil(targetTokens * CHARS_PER_TOKEN)
  return "가".repeat(chars)
}

/** 기본 PromptSplitInput 생성 */
function makeSplitInput(overrides: Partial<PromptSplitInput> = {}): PromptSplitInput {
  return {
    systemPromptBase: makeText(1500), // 1500 tok → cacheable
    ...overrides,
  }
}

/** 캐시 히트 CacheUsageInfo 생성 */
function makeCacheHitUsage(
  cached: number = 2000,
  regular: number = 500,
  output: number = 300
): CacheUsageInfo {
  return {
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: cached,
    regularInputTokens: regular,
    outputTokens: output,
  }
}

/** 캐시 미스 (최초 생성) CacheUsageInfo 생성 */
function makeCacheMissUsage(
  created: number = 2000,
  regular: number = 500,
  output: number = 300
): CacheUsageInfo {
  return {
    cacheCreationInputTokens: created,
    cacheReadInputTokens: 0,
    regularInputTokens: regular,
    outputTokens: output,
  }
}

/** 캐시 미사용 CacheUsageInfo 생성 */
function makeNoCacheUsage(regular: number = 2500, output: number = 300): CacheUsageInfo {
  return {
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    regularInputTokens: regular,
    outputTokens: output,
  }
}

// ══════════════════════════════════════════════════════════════
// 상수 검증
// ══════════════════════════════════════════════════════════════

describe("상수", () => {
  it("MIN_CACHEABLE_TOKENS = 1024", () => {
    expect(MIN_CACHEABLE_TOKENS).toBe(1024)
  })

  it("CHARS_PER_TOKEN = 3.5", () => {
    expect(CHARS_PER_TOKEN).toBe(3.5)
  })

  it("DEFAULT_CACHE_MODEL = claude-sonnet", () => {
    expect(DEFAULT_CACHE_MODEL).toBe("claude-sonnet-4-5-20250929")
  })

  it("CACHE_BENEFIT_THRESHOLD = 0.1", () => {
    expect(CACHE_BENEFIT_THRESHOLD).toBe(0.1)
  })

  it("Sonnet 가격: input 3, output 15, cacheWrite 3.75, cacheRead 0.3", () => {
    const sonnet = MODEL_TOKEN_PRICING["claude-sonnet-4-5-20250929"]
    expect(sonnet.inputPerM).toBe(3)
    expect(sonnet.outputPerM).toBe(15)
    expect(sonnet.cacheWritePerM).toBe(3.75)
    expect(sonnet.cacheReadPerM).toBe(0.3)
  })

  it("Haiku 가격: input 0.8, output 4, cacheWrite 1.0, cacheRead 0.08", () => {
    const haiku = MODEL_TOKEN_PRICING["claude-haiku-4-5-20251001"]
    expect(haiku.inputPerM).toBe(0.8)
    expect(haiku.outputPerM).toBe(4)
    expect(haiku.cacheWritePerM).toBe(1.0)
    expect(haiku.cacheReadPerM).toBe(0.08)
  })
})

// ══════════════════════════════════════════════════════════════
// estimateTokens
// ══════════════════════════════════════════════════════════════

describe("estimateTokens", () => {
  it("빈 문자열 → 0", () => {
    expect(estimateTokens("")).toBe(0)
  })

  it("7글자 → ceil(7/3.5) = 2", () => {
    expect(estimateTokens("가나다라마바사")).toBe(2)
  })

  it("3.5배 문자 → 정확한 토큰", () => {
    const text = "a".repeat(35)
    expect(estimateTokens(text)).toBe(10)
  })

  it("올림 처리", () => {
    const text = "a".repeat(4) // 4/3.5 = 1.14 → ceil = 2
    expect(estimateTokens(text)).toBe(2)
  })
})

// ══════════════════════════════════════════════════════════════
// checkCacheEligibility
// ══════════════════════════════════════════════════════════════

describe("checkCacheEligibility", () => {
  it("cacheable 카테고리 + 충분한 토큰 → eligible", () => {
    const result = checkCacheEligibility(makeText(1500), "persona_definition")
    expect(result.eligible).toBe(true)
    expect(result.category).toBe("persona_definition")
    expect(result.estimatedTokens).toBeGreaterThanOrEqual(MIN_CACHEABLE_TOKENS)
  })

  it("cacheable 카테고리 + 부족한 토큰 → not eligible", () => {
    const result = checkCacheEligibility(makeText(500), "persona_definition")
    expect(result.eligible).toBe(false)
    expect(result.reason).toContain("미달")
  })

  it("rag_context → 항상 not eligible", () => {
    const result = checkCacheEligibility(makeText(2000), "rag_context")
    expect(result.eligible).toBe(false)
    expect(result.reason).toContain("변동성")
  })

  it("current_context → 항상 not eligible", () => {
    const result = checkCacheEligibility(makeText(2000), "current_context")
    expect(result.eligible).toBe(false)
  })

  it("voice_spec 1024 tok → eligible", () => {
    const result = checkCacheEligibility(makeText(1024), "voice_spec")
    expect(result.eligible).toBe(true)
  })

  it("system_instruction → cacheable 카테고리", () => {
    const result = checkCacheEligibility(makeText(1500), "system_instruction")
    expect(result.eligible).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// splitPromptBlocks
// ══════════════════════════════════════════════════════════════

describe("splitPromptBlocks", () => {
  it("systemPromptBase만 → 1 블록", () => {
    const blocks = splitPromptBlocks({ systemPromptBase: makeText(1500) })
    expect(blocks).toHaveLength(1)
    expect(blocks[0].category).toBe("persona_definition")
    expect(blocks[0].cacheable).toBe(true)
  })

  it("모든 필드 → 5 블록", () => {
    const blocks = splitPromptBlocks({
      systemPromptBase: makeText(1500),
      voiceSpec: makeText(1200),
      ragContext: makeText(800),
      fewShotExamples: makeText(300),
      currentContext: makeText(200),
    })
    expect(blocks).toHaveLength(5)
    expect(blocks[0].category).toBe("persona_definition")
    expect(blocks[1].category).toBe("voice_spec")
    expect(blocks[2].category).toBe("rag_context")
    expect(blocks[3].category).toBe("few_shot")
    expect(blocks[4].category).toBe("current_context")
  })

  it("persona_definition 1500 tok → cacheable: true", () => {
    const blocks = splitPromptBlocks({ systemPromptBase: makeText(1500) })
    expect(blocks[0].cacheable).toBe(true)
  })

  it("persona_definition 500 tok → cacheable: false", () => {
    const blocks = splitPromptBlocks({ systemPromptBase: makeText(500) })
    expect(blocks[0].cacheable).toBe(false)
  })

  it("rag_context → 항상 cacheable: false", () => {
    const blocks = splitPromptBlocks({
      systemPromptBase: makeText(1500),
      ragContext: makeText(2000),
    })
    const rag = blocks.find((b) => b.category === "rag_context")
    expect(rag?.cacheable).toBe(false)
  })

  it("빈 필드는 블록 생성 안 함", () => {
    const blocks = splitPromptBlocks({
      systemPromptBase: makeText(1500),
      voiceSpec: undefined,
      ragContext: "",
    })
    expect(blocks).toHaveLength(1)
  })
})

// ══════════════════════════════════════════════════════════════
// mergeSmallCacheableBlocks
// ══════════════════════════════════════════════════════════════

describe("mergeSmallCacheableBlocks", () => {
  it("이미 큰 블록은 그대로 유지", () => {
    const blocks: SplitPromptBlock[] = [
      {
        category: "persona_definition",
        content: makeText(1500),
        cacheable: true,
        estimatedTokens: 1500,
      },
    ]
    const result = mergeSmallCacheableBlocks(blocks)
    expect(result).toHaveLength(1)
    expect(result[0].cacheable).toBe(true)
  })

  it("작은 cacheable 블록 2개 → 합산 1024 이상이면 병합", () => {
    const blocks: SplitPromptBlock[] = [
      {
        category: "persona_definition",
        content: makeText(600),
        cacheable: false,
        estimatedTokens: 600,
      },
      { category: "voice_spec", content: makeText(600), cacheable: false, estimatedTokens: 600 },
    ]
    const result = mergeSmallCacheableBlocks(blocks)
    expect(result).toHaveLength(1)
    expect(result[0].cacheable).toBe(true)
    expect(result[0].estimatedTokens).toBe(1200)
  })

  it("작은 cacheable + 부족한 합산 → cacheable: false 유지", () => {
    const blocks: SplitPromptBlock[] = [
      {
        category: "persona_definition",
        content: makeText(300),
        cacheable: false,
        estimatedTokens: 300,
      },
      { category: "voice_spec", content: makeText(300), cacheable: false, estimatedTokens: 300 },
    ]
    const result = mergeSmallCacheableBlocks(blocks)
    // 합산 600 < 1024 → cacheable: false
    expect(result.every((b) => !b.cacheable)).toBe(true)
  })

  it("non-cacheable 블록은 병합 대상 아님", () => {
    const blocks: SplitPromptBlock[] = [
      {
        category: "persona_definition",
        content: makeText(600),
        cacheable: false,
        estimatedTokens: 600,
      },
      { category: "rag_context", content: makeText(500), cacheable: false, estimatedTokens: 500 },
      { category: "voice_spec", content: makeText(600), cacheable: false, estimatedTokens: 600 },
    ]
    const result = mergeSmallCacheableBlocks(blocks)
    // rag_context가 중간에 끼어서 persona(600) flush → rag → voice(600) flush
    expect(result.length).toBeGreaterThanOrEqual(3)
  })

  it("cacheable+non-cacheable 교차 시 올바르게 분리", () => {
    const blocks: SplitPromptBlock[] = [
      {
        category: "persona_definition",
        content: makeText(1500),
        cacheable: true,
        estimatedTokens: 1500,
      },
      { category: "rag_context", content: makeText(500), cacheable: false, estimatedTokens: 500 },
      {
        category: "current_context",
        content: makeText(200),
        cacheable: false,
        estimatedTokens: 200,
      },
    ]
    const result = mergeSmallCacheableBlocks(blocks)
    expect(result[0].cacheable).toBe(true)
    expect(result[1].cacheable).toBe(false) // rag
    expect(result[2].cacheable).toBe(false) // current
  })
})

// ══════════════════════════════════════════════════════════════
// buildCacheAwareSystemPrompt
// ══════════════════════════════════════════════════════════════

describe("buildCacheAwareSystemPrompt", () => {
  it("cacheable 블록 → cache_control 포함", () => {
    const blocks: SplitPromptBlock[] = [
      {
        category: "persona_definition",
        content: "persona text",
        cacheable: true,
        estimatedTokens: 1500,
      },
    ]
    const result = buildCacheAwareSystemPrompt(blocks)
    expect(result.blocks).toHaveLength(1)
    expect(result.blocks[0].cache_control).toEqual({ type: "ephemeral" })
    expect(result.cachedBlocks).toBe(1)
    expect(result.cachedTokens).toBe(1500)
  })

  it("non-cacheable 블록 → cache_control 없음", () => {
    const blocks: SplitPromptBlock[] = [
      { category: "rag_context", content: "rag text", cacheable: false, estimatedTokens: 800 },
    ]
    const result = buildCacheAwareSystemPrompt(blocks)
    expect(result.blocks).toHaveLength(1)
    expect(result.blocks[0].cache_control).toBeUndefined()
    expect(result.dynamicTokens).toBe(800)
  })

  it("혼합 블록 → 올바른 구분", () => {
    const blocks: SplitPromptBlock[] = [
      { category: "persona_definition", content: "static", cacheable: true, estimatedTokens: 1500 },
      { category: "rag_context", content: "dynamic", cacheable: false, estimatedTokens: 800 },
    ]
    const result = buildCacheAwareSystemPrompt(blocks)
    expect(result.totalBlocks).toBe(2)
    expect(result.cachedBlocks).toBe(1)
    expect(result.cachedTokens).toBe(1500)
    expect(result.dynamicTokens).toBe(800)
    expect(result.totalTokens).toBe(2300)
  })

  it("빈 content 블록은 제외", () => {
    const blocks: SplitPromptBlock[] = [
      { category: "persona_definition", content: "", cacheable: true, estimatedTokens: 0 },
      { category: "rag_context", content: "data", cacheable: false, estimatedTokens: 100 },
    ]
    const result = buildCacheAwareSystemPrompt(blocks)
    expect(result.totalBlocks).toBe(1)
  })

  it("estimatedSavingsPercent 계산 정확", () => {
    const blocks: SplitPromptBlock[] = [
      { category: "persona_definition", content: "static", cacheable: true, estimatedTokens: 2000 },
      { category: "rag_context", content: "dynamic", cacheable: false, estimatedTokens: 500 },
    ]
    const result = buildCacheAwareSystemPrompt(blocks)
    // 캐시 비율 = 2000/2500 = 0.8 → 0.8 × 82 = 65.6 → 66 (반올림)
    expect(result.estimatedSavingsPercent).toBe(66)
  })
})

// ══════════════════════════════════════════════════════════════
// buildCacheAwarePrompt (전체 파이프라인)
// ══════════════════════════════════════════════════════════════

describe("buildCacheAwarePrompt", () => {
  it("전체 파이프라인: 분리 → 병합 → 빌드", () => {
    const result = buildCacheAwarePrompt({
      systemPromptBase: makeText(1500),
      ragContext: makeText(800),
    })
    expect(result.totalBlocks).toBe(2)
    expect(result.cachedBlocks).toBe(1)
    expect(result.blocks[0].cache_control).toEqual({ type: "ephemeral" })
    expect(result.blocks[1].cache_control).toBeUndefined()
  })

  it("작은 persona + voiceSpec → 병합 후 cacheable", () => {
    const result = buildCacheAwarePrompt({
      systemPromptBase: makeText(600),
      voiceSpec: makeText(600),
    })
    // 병합: 600+600=1200 >= 1024 → cacheable
    expect(result.cachedBlocks).toBe(1)
    expect(result.cachedTokens).toBe(1200)
  })

  it("작은 persona만 → 병합 불가 → cacheable: false", () => {
    const result = buildCacheAwarePrompt({
      systemPromptBase: makeText(500),
    })
    expect(result.cachedBlocks).toBe(0)
    expect(result.dynamicTokens).toBeGreaterThan(0)
  })
})

// ══════════════════════════════════════════════════════════════
// parseCacheUsage
// ══════════════════════════════════════════════════════════════

describe("parseCacheUsage", () => {
  it("캐시 히트 응답 파싱", () => {
    const usage = parseCacheUsage({
      usage: {
        input_tokens: 500,
        output_tokens: 300,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 2000,
      },
    })
    expect(usage.cacheReadInputTokens).toBe(2000)
    expect(usage.cacheCreationInputTokens).toBe(0)
    expect(usage.regularInputTokens).toBe(500)
    expect(usage.outputTokens).toBe(300)
  })

  it("캐시 생성 응답 파싱", () => {
    const usage = parseCacheUsage({
      usage: {
        input_tokens: 500,
        output_tokens: 300,
        cache_creation_input_tokens: 2000,
        cache_read_input_tokens: 0,
      },
    })
    expect(usage.cacheCreationInputTokens).toBe(2000)
    expect(usage.cacheReadInputTokens).toBe(0)
  })

  it("캐시 필드 없는 응답 → 0 기본값", () => {
    const usage = parseCacheUsage({
      usage: {
        input_tokens: 2500,
        output_tokens: 300,
      },
    })
    expect(usage.cacheCreationInputTokens).toBe(0)
    expect(usage.cacheReadInputTokens).toBe(0)
    expect(usage.regularInputTokens).toBe(2500)
  })

  it("usage 자체 없는 응답 → 모두 0", () => {
    const usage = parseCacheUsage({})
    expect(usage.cacheCreationInputTokens).toBe(0)
    expect(usage.cacheReadInputTokens).toBe(0)
    expect(usage.regularInputTokens).toBe(0)
    expect(usage.outputTokens).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// computeCacheCost
// ══════════════════════════════════════════════════════════════

describe("computeCacheCost", () => {
  it("캐시 히트: 읽기 비용 적용 (0.1x)", () => {
    const cost = computeCacheCost(makeCacheHitUsage(2000, 500, 300))
    // cacheRead: 2000/1M × 0.3 = 0.0006
    // regular:   500/1M × 3 = 0.0015
    // output:    300/1M × 15 = 0.0045
    expect(cost.cacheReadCostUSD).toBeCloseTo(0.0006, 5)
    expect(cost.regularInputCostUSD).toBeCloseTo(0.0015, 5)
    expect(cost.outputCostUSD).toBeCloseTo(0.0045, 5)
    expect(cost.cacheWriteCostUSD).toBe(0)
  })

  it("캐시 미스: 쓰기 비용 적용 (1.25x)", () => {
    const cost = computeCacheCost(makeCacheMissUsage(2000, 500, 300))
    // cacheWrite: 2000/1M × 3.75 = 0.0075
    expect(cost.cacheWriteCostUSD).toBeCloseTo(0.0075, 5)
    expect(cost.cacheReadCostUSD).toBe(0)
  })

  it("캐시 히트 시 절감액 양수", () => {
    const cost = computeCacheCost(makeCacheHitUsage(2000, 500, 300))
    expect(cost.savingsUSD).toBeGreaterThan(0)
    expect(cost.savingsPercent).toBeGreaterThan(0)
  })

  it("캐시 미사용 → 절감 0", () => {
    const cost = computeCacheCost(makeNoCacheUsage(2500, 300))
    expect(cost.savingsUSD).toBe(0)
    expect(cost.savingsPercent).toBe(0)
  })

  it("Haiku 모델 가격 적용", () => {
    const cost = computeCacheCost(makeCacheHitUsage(2000, 500, 300), "claude-haiku-4-5-20251001")
    // cacheRead: 2000/1M × 0.08 = 0.00016
    expect(cost.cacheReadCostUSD).toBeCloseTo(0.00016, 5)
  })

  it("total = write + read + regular + output", () => {
    const cost = computeCacheCost(makeCacheHitUsage(2000, 500, 300))
    const expected =
      cost.cacheWriteCostUSD + cost.cacheReadCostUSD + cost.regularInputCostUSD + cost.outputCostUSD
    expect(cost.totalCostUSD).toBeCloseTo(expected, 6)
  })
})

// ══════════════════════════════════════════════════════════════
// estimateCacheBenefit
// ══════════════════════════════════════════════════════════════

describe("estimateCacheBenefit", () => {
  it("캐시 적용 시 비용이 더 낮음", () => {
    const result = estimateCacheBenefit(2000, 500, 300)
    expect(result.withCache).toBeLessThan(result.withoutCache)
    expect(result.savingsUSD).toBeGreaterThan(0)
    expect(result.savingsPercent).toBeGreaterThan(0)
  })

  it("캐시 토큰 0 → 절감 없음 또는 매우 적음", () => {
    const result = estimateCacheBenefit(0, 500, 300)
    expect(result.savingsPercent).toBeLessThanOrEqual(1)
  })

  it("recommended = savingsPercent >= 10%", () => {
    const high = estimateCacheBenefit(2000, 500, 300)
    expect(high.recommended).toBe(true) // 높은 캐시 비율

    const low = estimateCacheBenefit(100, 5000, 300)
    // 캐시 비율 매우 낮음 → recommended false 가능
    expect(typeof low.recommended).toBe("boolean")
  })

  it("Haiku 모델도 절감 효과", () => {
    const result = estimateCacheBenefit(2000, 500, 300, "claude-haiku-4-5-20251001")
    expect(result.savingsUSD).toBeGreaterThan(0)
  })
})

// ══════════════════════════════════════════════════════════════
// 캐시 통계
// ══════════════════════════════════════════════════════════════

describe("캐시 통계", () => {
  it("createEmptyCacheStats → 모두 0", () => {
    const stats = createEmptyCacheStats()
    expect(stats.totalRequests).toBe(0)
    expect(stats.cacheHits).toBe(0)
    expect(stats.cacheMisses).toBe(0)
    expect(stats.hitRate).toBe(0)
    expect(stats.totalSavingsUSD).toBe(0)
  })

  it("캐시 히트 업데이트", () => {
    let stats = createEmptyCacheStats()
    const usage = makeCacheHitUsage()
    const cost = computeCacheCost(usage)
    stats = updateCacheStats(stats, usage, cost)

    expect(stats.totalRequests).toBe(1)
    expect(stats.cacheHits).toBe(1)
    expect(stats.cacheMisses).toBe(0)
    expect(stats.hitRate).toBe(1)
    expect(stats.totalSavingsUSD).toBeGreaterThan(0)
  })

  it("캐시 미스 업데이트", () => {
    let stats = createEmptyCacheStats()
    const usage = makeCacheMissUsage()
    const cost = computeCacheCost(usage)
    stats = updateCacheStats(stats, usage, cost)

    expect(stats.totalRequests).toBe(1)
    expect(stats.cacheHits).toBe(0)
    expect(stats.cacheMisses).toBe(1)
  })

  it("비적격 업데이트", () => {
    let stats = createEmptyCacheStats()
    const usage = makeNoCacheUsage()
    const cost = computeCacheCost(usage)
    stats = updateCacheStats(stats, usage, cost)

    expect(stats.cacheNonEligible).toBe(1)
  })

  it("연속 업데이트 → 히트율 정확", () => {
    let stats = createEmptyCacheStats()

    // 3히트 + 1미스 = 히트율 75%
    for (let i = 0; i < 3; i++) {
      const usage = makeCacheHitUsage()
      const cost = computeCacheCost(usage)
      stats = updateCacheStats(stats, usage, cost)
    }
    const missUsage = makeCacheMissUsage()
    const missCost = computeCacheCost(missUsage)
    stats = updateCacheStats(stats, missUsage, missCost)

    expect(stats.totalRequests).toBe(4)
    expect(stats.cacheHits).toBe(3)
    expect(stats.hitRate).toBe(0.75)
  })

  it("불변성: 원본 stats 변경 없음", () => {
    const original = createEmptyCacheStats()
    const usage = makeCacheHitUsage()
    const cost = computeCacheCost(usage)
    const updated = updateCacheStats(original, usage, cost)

    expect(original.totalRequests).toBe(0)
    expect(updated.totalRequests).toBe(1)
  })
})

// ══════════════════════════════════════════════════════════════
// summarizeCacheStats
// ══════════════════════════════════════════════════════════════

describe("summarizeCacheStats", () => {
  it("문자열 요약 포함 항목", () => {
    let stats = createEmptyCacheStats()
    const usage = makeCacheHitUsage()
    const cost = computeCacheCost(usage)
    stats = updateCacheStats(stats, usage, cost)

    const summary = summarizeCacheStats(stats)
    expect(summary).toContain("프롬프트 캐시 통계")
    expect(summary).toContain("총 요청: 1건")
    expect(summary).toContain("캐시 히트: 1건")
  })
})

// ══════════════════════════════════════════════════════════════
// createCacheUsageEntry
// ══════════════════════════════════════════════════════════════

describe("createCacheUsageEntry", () => {
  it("엔트리 생성", () => {
    const usage = makeCacheHitUsage()
    const cost = computeCacheCost(usage)
    const entry = createCacheUsageEntry("persona-1", "post_generation", usage, cost)

    expect(entry.personaId).toBe("persona-1")
    expect(entry.callType).toBe("post_generation")
    expect(entry.usage).toBe(usage)
    expect(entry.cost).toBe(cost)
    expect(entry.timestamp).toBeGreaterThan(0)
  })
})

// ══════════════════════════════════════════════════════════════
// aggregateCacheHistory
// ══════════════════════════════════════════════════════════════

describe("aggregateCacheHistory", () => {
  it("기간 내 엔트리만 집계", () => {
    const now = Date.now()
    const entries: CacheUsageEntry[] = [
      createCacheUsageEntry(
        "p1",
        "gen",
        makeCacheHitUsage(),
        computeCacheCost(makeCacheHitUsage())
      ),
      createCacheUsageEntry(
        "p2",
        "gen",
        makeCacheMissUsage(),
        computeCacheCost(makeCacheMissUsage())
      ),
    ]
    // 첫 번째 엔트리 타임스탬프를 1시간 전으로 조정
    const old = { ...entries[0], timestamp: now - 3600_000 }
    const recent = { ...entries[1], timestamp: now }

    const stats = aggregateCacheHistory([old, recent], now - 1800_000, now + 1000)
    // 30분 이내 → recent만
    expect(stats.totalRequests).toBe(1)
    expect(stats.cacheMisses).toBe(1)
  })

  it("빈 기간 → 빈 통계", () => {
    const stats = aggregateCacheHistory([], 0, Date.now())
    expect(stats.totalRequests).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// analyzePerPersonaCacheEfficiency
// ══════════════════════════════════════════════════════════════

describe("analyzePerPersonaCacheEfficiency", () => {
  it("페르소나별 분류", () => {
    const entries: CacheUsageEntry[] = [
      createCacheUsageEntry(
        "p1",
        "gen",
        makeCacheHitUsage(),
        computeCacheCost(makeCacheHitUsage())
      ),
      createCacheUsageEntry(
        "p1",
        "gen",
        makeCacheHitUsage(),
        computeCacheCost(makeCacheHitUsage())
      ),
      createCacheUsageEntry(
        "p2",
        "gen",
        makeCacheMissUsage(),
        computeCacheCost(makeCacheMissUsage())
      ),
    ]

    const result = analyzePerPersonaCacheEfficiency(entries)
    expect(result.size).toBe(2)

    const p1 = result.get("p1")!
    expect(p1.requests).toBe(2)
    expect(p1.hitRate).toBe(1) // 2/2

    const p2 = result.get("p2")!
    expect(p2.requests).toBe(1)
    expect(p2.hitRate).toBe(0) // 0/1
  })

  it("빈 엔트리 → 빈 맵", () => {
    const result = analyzePerPersonaCacheEfficiency([])
    expect(result.size).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// generateCacheAdvice
// ══════════════════════════════════════════════════════════════

describe("generateCacheAdvice", () => {
  it("데이터 부족 시 → 재평가 권장", () => {
    const stats = createEmptyCacheStats()
    const advice = generateCacheAdvice(stats, 1000)
    expect(advice.reason).toContain("데이터 부족")
    expect(advice.shouldEnableCache).toBe(true) // 부족해도 일단 활성화
  })

  it("높은 히트율 → 캐시 효과적", () => {
    let stats = createEmptyCacheStats()
    for (let i = 0; i < 20; i++) {
      const usage = makeCacheHitUsage()
      const cost = computeCacheCost(usage)
      stats = updateCacheStats(stats, usage, cost)
    }
    const advice = generateCacheAdvice(stats, 1000)
    expect(advice.reason).toContain("캐시 효과적")
    expect(advice.shouldEnableCache).toBe(true)
  })

  it("낮은 히트율 → 구조 개선 권고", () => {
    let stats = createEmptyCacheStats()
    // 2 히트 + 18 비적격 = 히트율 10%
    for (let i = 0; i < 2; i++) {
      stats = updateCacheStats(stats, makeCacheHitUsage(), computeCacheCost(makeCacheHitUsage()))
    }
    for (let i = 0; i < 18; i++) {
      stats = updateCacheStats(stats, makeNoCacheUsage(), computeCacheCost(makeNoCacheUsage()))
    }
    const advice = generateCacheAdvice(stats, 1000)
    expect(advice.reason).toContain("프롬프트 구조 개선")
    expect(advice.shouldEnableCache).toBe(false)
  })

  it("비적격 비율 높으면 → 프롬프트 확장 권고", () => {
    let stats = createEmptyCacheStats()
    for (let i = 0; i < 15; i++) {
      stats = updateCacheStats(stats, makeNoCacheUsage(), computeCacheCost(makeNoCacheUsage()))
    }
    const advice = generateCacheAdvice(stats, 1000)
    expect(advice.suggestedActions.length).toBeGreaterThan(0)
    expect(advice.suggestedActions.some((a) => a.includes("프롬프트"))).toBe(true)
  })

  it("월간 절감액 추정", () => {
    let stats = createEmptyCacheStats()
    for (let i = 0; i < 10; i++) {
      stats = updateCacheStats(stats, makeCacheHitUsage(), computeCacheCost(makeCacheHitUsage()))
    }
    const advice = generateCacheAdvice(stats, 10000)
    expect(advice.estimatedMonthlySavingsUSD).toBeGreaterThan(0)
  })
})

// ══════════════════════════════════════════════════════════════
// PromptContentBlock 형식 검증
// ══════════════════════════════════════════════════════════════

describe("PromptContentBlock 형식", () => {
  it("cache_control 블록: type='text' + cache_control={type:'ephemeral'}", () => {
    const result = buildCacheAwarePrompt({
      systemPromptBase: makeText(1500),
    })
    const block = result.blocks[0]
    expect(block.type).toBe("text")
    expect(block.text).toBeTruthy()
    expect(block.cache_control).toEqual({ type: "ephemeral" })
  })

  it("일반 블록: type='text', cache_control undefined", () => {
    const result = buildCacheAwarePrompt({
      systemPromptBase: makeText(1500),
      ragContext: makeText(500),
    })
    const ragBlock = result.blocks[1]
    expect(ragBlock.type).toBe("text")
    expect(ragBlock.cache_control).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════════
// 불변성 검증
// ══════════════════════════════════════════════════════════════

describe("불변성", () => {
  it("splitPromptBlocks → 원본 input 변경 없음", () => {
    const input: PromptSplitInput = {
      systemPromptBase: makeText(1500),
      ragContext: makeText(500),
    }
    const original = { ...input }
    splitPromptBlocks(input)
    expect(input.systemPromptBase).toBe(original.systemPromptBase)
    expect(input.ragContext).toBe(original.ragContext)
  })

  it("updateCacheStats → 원본 stats 변경 없음", () => {
    const stats = createEmptyCacheStats()
    const usage = makeCacheHitUsage()
    const cost = computeCacheCost(usage)
    updateCacheStats(stats, usage, cost)
    expect(stats.totalRequests).toBe(0)
  })

  it("aggregateCacheHistory → 원본 entries 변경 없음", () => {
    const entries: CacheUsageEntry[] = [
      createCacheUsageEntry(
        "p1",
        "gen",
        makeCacheHitUsage(),
        computeCacheCost(makeCacheHitUsage())
      ),
    ]
    const len = entries.length
    aggregateCacheHistory(entries, 0, Date.now() + 1000)
    expect(entries).toHaveLength(len)
  })
})
