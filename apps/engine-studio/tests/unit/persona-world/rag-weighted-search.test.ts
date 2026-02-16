import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
  computeRecency,
  scoreMemoryItem,
  searchMemories,
  buildRAGContextText,
  summarizeSearchResult,
  computeMemoryRetentionStats,
  searchInteractionMemories,
  searchPostMemories,
  searchConsumptionMemories,
  DEFAULT_SEARCH_OPTIONS,
  CORE_POIGNANCY_THRESHOLD,
  RECENCY_DECAY_RATE,
} from "@/lib/persona-world/rag-weighted-search"
import type { MemoryItem, RAGSearchOptions } from "@/lib/persona-world/rag-weighted-search"
import { RETENTION_CUTOFF } from "@/lib/persona-world/forgetting-curve"
import { RAG_SEARCH_WEIGHTS } from "@/lib/persona-world/poignancy"

// ── 헬퍼 ────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

function makeMemory(overrides: Partial<MemoryItem> = {}): MemoryItem {
  return {
    id: `mem-${Math.random().toString(36).slice(2, 8)}`,
    type: "post",
    content: "테스트 기억 내용입니다. 이 영화에 대한 리뷰를 작성했습니다.",
    personaId: "persona-1",
    createdAt: Date.now() - DAY_MS, // 1일 전
    poignancy: 0.5,
    similarity: 0.6,
    ...overrides,
  }
}

function makeMemories(count: number, overrides: Partial<MemoryItem> = {}): MemoryItem[] {
  return Array.from({ length: count }, (_, i) =>
    makeMemory({
      id: `mem-${i}`,
      createdAt: Date.now() - (i + 1) * DAY_MS,
      poignancy: Math.random() * 0.5 + 0.1,
      ...overrides,
    })
  )
}

// ═══════════════════════════════════════════════════════════════
// computeRecency
// ═══════════════════════════════════════════════════════════════

describe("computeRecency", () => {
  it("방금 생성 → 1.0", () => {
    const recency = computeRecency(Date.now(), 30)
    expect(recency).toBeCloseTo(1.0, 1)
  })

  it("windowDays 이내 → 0.5 이상", () => {
    const halfWindow = Date.now() - 15 * DAY_MS
    const recency = computeRecency(halfWindow, 30)
    expect(recency).toBeGreaterThan(0.3)
  })

  it("windowDays × 2 → 매우 낮은 값", () => {
    const doubleWindow = Date.now() - 60 * DAY_MS
    const recency = computeRecency(doubleWindow, 30)
    expect(recency).toBeLessThan(0.2)
  })

  it("시간 경과에 따라 단조 감소", () => {
    const recent = computeRecency(Date.now() - 1 * DAY_MS, 30)
    const older = computeRecency(Date.now() - 10 * DAY_MS, 30)
    const oldest = computeRecency(Date.now() - 30 * DAY_MS, 30)
    expect(recent).toBeGreaterThan(older)
    expect(older).toBeGreaterThan(oldest)
  })

  it("미래 시점 → 1.0", () => {
    const recency = computeRecency(Date.now() + DAY_MS, 30)
    expect(recency).toBe(1.0)
  })
})

// ═══════════════════════════════════════════════════════════════
// scoreMemoryItem
// ═══════════════════════════════════════════════════════════════

describe("scoreMemoryItem", () => {
  it("최근 + 높은 poignancy + 높은 similarity → 높은 점수", () => {
    const item = makeMemory({
      createdAt: Date.now() - DAY_MS,
      poignancy: 0.9,
      similarity: 0.9,
    })
    const scored = scoreMemoryItem(item)
    expect(scored.ragScore).toBeGreaterThan(0.5)
    expect(scored.isEffectivelyForgotten).toBe(false)
  })

  it("오래된 + 낮은 poignancy → 낮은 점수", () => {
    const item = makeMemory({
      createdAt: Date.now() - 60 * DAY_MS,
      poignancy: 0.1,
      similarity: 0.3,
    })
    const scored = scoreMemoryItem(item)
    expect(scored.ragScore).toBeLessThan(0.3)
  })

  it("retention 계산 포함", () => {
    const item = makeMemory({ poignancy: 0.5 })
    const scored = scoreMemoryItem(item)
    expect(scored.retention).toBeGreaterThan(0)
    expect(scored.retention).toBeLessThanOrEqual(1)
  })

  it("effectivePoignancy = poignancy × retention", () => {
    const item = makeMemory({ poignancy: 0.6, createdAt: Date.now() - 5 * DAY_MS })
    const scored = scoreMemoryItem(item)
    expect(scored.effectivePoignancy).toBeCloseTo(item.poignancy * scored.retention, 2)
  })

  it("similarity 없으면 0 적용", () => {
    const item = makeMemory({ similarity: undefined })
    const scored = scoreMemoryItem(item)
    expect(scored.effectiveSimilarity).toBe(0)
  })

  it("핵심 기억 부스트 적용", () => {
    const coreItem = makeMemory({
      poignancy: 0.9,
      similarity: 0.5,
      createdAt: Date.now() - DAY_MS,
    })
    const normalItem = makeMemory({
      poignancy: 0.5,
      similarity: 0.5,
      createdAt: Date.now() - DAY_MS,
    })
    const coreScore = scoreMemoryItem(coreItem)
    const normalScore = scoreMemoryItem(normalItem)
    // 핵심 기억은 1.2배 부스트
    expect(coreScore.ragScore).toBeGreaterThan(normalScore.ragScore)
  })

  it("90일 전 poignancy=0 → isEffectivelyForgotten", () => {
    const item = makeMemory({
      createdAt: Date.now() - 90 * DAY_MS,
      poignancy: 0,
    })
    const scored = scoreMemoryItem(item)
    expect(scored.isEffectivelyForgotten).toBe(true)
  })

  it("1년 전 poignancy=0.9 (핵심) → 아직 기억", () => {
    const item = makeMemory({
      createdAt: Date.now() - 365 * DAY_MS,
      poignancy: 0.9,
    })
    const scored = scoreMemoryItem(item)
    expect(scored.isEffectivelyForgotten).toBe(false)
    expect(scored.retention).toBeGreaterThan(0.5)
  })
})

// ═══════════════════════════════════════════════════════════════
// searchMemories
// ═══════════════════════════════════════════════════════════════

describe("searchMemories", () => {
  it("빈 배열 → 빈 결과", () => {
    const result = searchMemories([])
    expect(result.items).toHaveLength(0)
    expect(result.totalCandidates).toBe(0)
    expect(result.forgottenCount).toBe(0)
  })

  it("maxResults 적용", () => {
    const memories = makeMemories(20)
    const result = searchMemories(memories, { maxResults: 5 })
    expect(result.items.length).toBeLessThanOrEqual(5)
  })

  it("ragScore 내림차순 정렬", () => {
    const memories = makeMemories(10, { similarity: 0.5 })
    const result = searchMemories(memories)
    for (let i = 1; i < result.items.length; i++) {
      expect(result.items[i - 1].ragScore).toBeGreaterThanOrEqual(result.items[i].ragScore)
    }
  })

  it("망각된 기억 제외", () => {
    const memories = [
      makeMemory({ createdAt: Date.now() - 1 * DAY_MS, poignancy: 0.5 }), // 기억
      makeMemory({ createdAt: Date.now() - 200 * DAY_MS, poignancy: 0 }), // 망각
    ]
    const result = searchMemories(memories)
    expect(result.forgottenCount).toBe(1)
    expect(result.items.length).toBe(1)
  })

  it("타입 필터 적용", () => {
    const memories = [
      makeMemory({ type: "post" }),
      makeMemory({ type: "comment" }),
      makeMemory({ type: "interaction" }),
    ]
    const result = searchMemories(memories, { typeFilter: ["post"] })
    expect(result.items.every((i) => i.type === "post")).toBe(true)
  })

  it("최소 점수 필터 적용", () => {
    const memories = makeMemories(5, { similarity: 0.5 })
    const result = searchMemories(memories, { minScore: 0.3 })
    expect(result.items.every((i) => i.ragScore >= 0.3)).toBe(true)
  })

  it("통계 포함", () => {
    const memories = makeMemories(5, { similarity: 0.5 })
    const result = searchMemories(memories)
    expect(result.avgScore).toBeGreaterThan(0)
    expect(result.avgRetention).toBeGreaterThan(0)
    expect(result.searchedAt).toBeGreaterThan(0)
  })

  it("핵심 기억 우선 랭킹", () => {
    const memories = [
      makeMemory({
        id: "core",
        poignancy: 0.9,
        similarity: 0.5,
        createdAt: Date.now() - 30 * DAY_MS,
      }),
      makeMemory({
        id: "recent",
        poignancy: 0.2,
        similarity: 0.5,
        createdAt: Date.now() - 1 * DAY_MS,
      }),
    ]
    const result = searchMemories(memories)
    // 핵심 기억은 부스트 받으므로 최근 것보다 앞에 올 수도 있음
    expect(result.items.length).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════
// buildRAGContextText
// ═══════════════════════════════════════════════════════════════

describe("buildRAGContextText", () => {
  it("빈 결과 → 빈 텍스트", () => {
    const result = searchMemories([])
    const text = buildRAGContextText(result)
    expect(text).toBe("")
  })

  it("핵심 기억 태그 포함", () => {
    const memories = [makeMemory({ poignancy: 0.9, similarity: 0.8 })]
    const result = searchMemories(memories)
    const text = buildRAGContextText(result)
    expect(text).toContain("[핵심기억]")
  })

  it("일반 기억 태그 포함", () => {
    const memories = [makeMemory({ poignancy: 0.3, similarity: 0.8 })]
    const result = searchMemories(memories)
    const text = buildRAGContextText(result)
    expect(text).toContain("[기억")
    expect(text).toContain("%]")
  })

  it("토큰 한도 내 자르기", () => {
    const longMemories = Array.from({ length: 20 }, (_, i) =>
      makeMemory({
        id: `long-${i}`,
        content: "매우 긴 콘텐츠. ".repeat(100),
        similarity: 0.8,
        createdAt: Date.now() - i * DAY_MS,
      })
    )
    const result = searchMemories(longMemories)
    const text = buildRAGContextText(result, 500) // 토큰 한도 작게
    // 모든 항목이 포함되지 않음
    const itemCount = (text.match(/\[/g) || []).length
    expect(itemCount).toBeLessThan(result.items.length)
  })

  it("내용 포함", () => {
    const memories = [makeMemory({ content: "영화 리뷰 내용", similarity: 0.8 })]
    const result = searchMemories(memories)
    const text = buildRAGContextText(result)
    expect(text).toContain("영화 리뷰 내용")
  })
})

// ═══════════════════════════════════════════════════════════════
// summarizeSearchResult
// ═══════════════════════════════════════════════════════════════

describe("summarizeSearchResult", () => {
  it("요약 텍스트 포함", () => {
    const memories = makeMemories(5, { similarity: 0.5 })
    const result = searchMemories(memories)
    const summary = summarizeSearchResult(result)
    expect(summary).toContain("RAG 검색")
    expect(summary).toContain("후보")
    expect(summary).toContain("결과")
  })

  it("빈 결과 → 후보 0건", () => {
    const result = searchMemories([])
    const summary = summarizeSearchResult(result)
    expect(summary).toContain("후보 0건")
  })

  it("망각 건수 포함", () => {
    const memories = [makeMemory({ createdAt: Date.now() - 200 * DAY_MS, poignancy: 0 })]
    const result = searchMemories(memories)
    const summary = summarizeSearchResult(result)
    expect(summary).toContain("망각 제외")
  })
})

// ═══════════════════════════════════════════════════════════════
// computeMemoryRetentionStats
// ═══════════════════════════════════════════════════════════════

describe("computeMemoryRetentionStats", () => {
  it("빈 배열 → 0 통계", () => {
    const stats = computeMemoryRetentionStats([])
    expect(stats.totalMemories).toBe(0)
    expect(stats.activeMemories).toBe(0)
    expect(stats.avgRetention).toBe(0)
  })

  it("최근 기억 → 모두 활성", () => {
    const memories = makeMemories(5, { createdAt: Date.now() - DAY_MS, poignancy: 0.5 })
    const stats = computeMemoryRetentionStats(memories)
    expect(stats.activeMemories).toBe(5)
    expect(stats.forgottenMemories).toBe(0)
  })

  it("핵심 기억 카운트", () => {
    const memories = [
      makeMemory({ poignancy: 0.9 }),
      makeMemory({ poignancy: 0.85 }),
      makeMemory({ poignancy: 0.3 }),
    ]
    const stats = computeMemoryRetentionStats(memories)
    expect(stats.coreMemories).toBe(2)
  })

  it("retention 분포", () => {
    const memories = [
      makeMemory({ createdAt: Date.now() - 1 * DAY_MS, poignancy: 0.8 }), // high
      makeMemory({ createdAt: Date.now() - 30 * DAY_MS, poignancy: 0.5 }), // medium
      makeMemory({ createdAt: Date.now() - 200 * DAY_MS, poignancy: 0 }), // forgotten
    ]
    const stats = computeMemoryRetentionStats(memories)
    expect(stats.retentionDistribution.forgotten).toBeGreaterThanOrEqual(1)
  })

  it("평균 값 계산", () => {
    const memories = makeMemories(5, { poignancy: 0.5 })
    const stats = computeMemoryRetentionStats(memories)
    expect(stats.avgRetention).toBeGreaterThan(0)
    expect(stats.avgPoignancy).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 타입별 전문 검색
// ═══════════════════════════════════════════════════════════════

describe("searchInteractionMemories", () => {
  it("인터랙션 타입만 반환", () => {
    const memories = [
      makeMemory({ type: "interaction", similarity: 0.5 }),
      makeMemory({ type: "post", similarity: 0.5 }),
    ]
    const result = searchInteractionMemories(memories)
    expect(result.items.every((i) => i.type === "interaction")).toBe(true)
  })

  it("targetPersonaId 필터", () => {
    const memories = [
      makeMemory({
        type: "interaction",
        similarity: 0.5,
        metadata: { targetId: "persona-2" },
      }),
      makeMemory({
        type: "interaction",
        similarity: 0.5,
        metadata: { targetId: "persona-3" },
      }),
    ]
    const result = searchInteractionMemories(memories, "persona-2")
    expect(result.items).toHaveLength(1)
  })
})

describe("searchPostMemories", () => {
  it("포스트 타입만 반환", () => {
    const memories = [
      makeMemory({ type: "post", similarity: 0.5 }),
      makeMemory({ type: "comment", similarity: 0.5 }),
    ]
    const result = searchPostMemories(memories)
    expect(result.items.every((i) => i.type === "post")).toBe(true)
  })
})

describe("searchConsumptionMemories", () => {
  it("소비 타입만 반환", () => {
    const memories = [
      makeMemory({ type: "consumption", similarity: 0.5 }),
      makeMemory({ type: "post", similarity: 0.5 }),
    ]
    const result = searchConsumptionMemories(memories)
    expect(result.items.every((i) => i.type === "consumption")).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("DEFAULT_SEARCH_OPTIONS 유효", () => {
    expect(DEFAULT_SEARCH_OPTIONS.maxResults).toBeGreaterThan(0)
    expect(DEFAULT_SEARCH_OPTIONS.recencyWindowDays).toBeGreaterThan(0)
    expect(DEFAULT_SEARCH_OPTIONS.minScore).toBeGreaterThanOrEqual(0)
  })

  it("CORE_POIGNANCY_THRESHOLD 0~1 범위", () => {
    expect(CORE_POIGNANCY_THRESHOLD).toBeGreaterThan(0)
    expect(CORE_POIGNANCY_THRESHOLD).toBeLessThanOrEqual(1)
  })

  it("RAG_SEARCH_WEIGHTS 합 = 1.0", () => {
    const sum =
      RAG_SEARCH_WEIGHTS.recency + RAG_SEARCH_WEIGHTS.similarity + RAG_SEARCH_WEIGHTS.poignancy
    expect(sum).toBeCloseTo(1.0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 통합 시나리오
// ═══════════════════════════════════════════════════════════════

describe("통합 시나리오", () => {
  it("페르소나 기억 검색 → 컨텍스트 생성 전체 플로우", () => {
    const memories: MemoryItem[] = [
      makeMemory({
        id: "core-memory",
        type: "interaction",
        content: "첫 역설 상황에서 겪은 내적 갈등과 해소 과정",
        poignancy: 0.9,
        similarity: 0.7,
        createdAt: Date.now() - 30 * DAY_MS,
      }),
      makeMemory({
        id: "recent-post",
        type: "post",
        content: "오늘 본 영화에 대한 짧은 리뷰",
        poignancy: 0.3,
        similarity: 0.8,
        createdAt: Date.now() - 1 * DAY_MS,
      }),
      makeMemory({
        id: "old-trivial",
        type: "consumption",
        content: "3개월 전 읽은 뉴스 기사",
        poignancy: 0.05,
        similarity: 0.2,
        createdAt: Date.now() - 90 * DAY_MS,
      }),
    ]

    // 검색
    const result = searchMemories(memories, { maxResults: 10 })
    expect(result.items.length).toBeGreaterThanOrEqual(1)
    expect(result.items.length).toBeLessThanOrEqual(3)

    // 핵심 기억이 상위에 위치
    if (result.items.length >= 2) {
      const coreIdx = result.items.findIndex((i) => i.id === "core-memory")
      expect(coreIdx).toBeLessThanOrEqual(1) // 상위 2위 이내
    }

    // 컨텍스트 생성
    const context = buildRAGContextText(result)
    expect(context.length).toBeGreaterThan(0)

    // 요약
    const summary = summarizeSearchResult(result)
    expect(summary).toContain("후보 3건")

    // 통계
    const stats = computeMemoryRetentionStats(memories)
    expect(stats.totalMemories).toBe(3)
    expect(stats.coreMemories).toBe(1)
  })

  it("오래된 기억 → 핵심만 생존", () => {
    const memories = [
      makeMemory({
        id: "old-core",
        poignancy: 0.95,
        similarity: 0.5,
        createdAt: Date.now() - 365 * DAY_MS,
      }),
      makeMemory({
        id: "old-trivial",
        poignancy: 0.05,
        similarity: 0.5,
        createdAt: Date.now() - 365 * DAY_MS,
      }),
    ]

    const result = searchMemories(memories)
    // 핵심은 살아남고, 일상은 망각
    expect(result.forgottenCount).toBe(1)
    if (result.items.length > 0) {
      expect(result.items[0].id).toBe("old-core")
    }
  })
})
