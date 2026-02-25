// ═══════════════════════════════════════════════════════════════
// T256 — News Auto-Fetch Service 단위 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  ensurePresetsSeeded,
  executeNewsAutoFetch,
  PRESET_SOURCES,
} from "@/lib/persona-world/news/news-auto-fetch"
import type { NewsAutoFetchDataProvider } from "@/lib/persona-world/news/news-auto-fetch"

// ── 모킹 ────────────────────────────────────────────────────────

// fetchArticlesFromRss 모킹
vi.mock("@/lib/persona-world/news/news-fetcher", () => ({
  fetchArticlesFromRss: vi.fn().mockResolvedValue([
    {
      title: "Test Article 1",
      url: "https://example.com/article1",
      publishedAt: new Date("2026-02-25"),
      rawContent: "Article content 1",
    },
    {
      title: "Test Article 2",
      url: "https://example.com/article2",
      publishedAt: new Date("2026-02-25"),
      rawContent: "Article content 2",
    },
  ]),
  analyzeArticleWithClaude: vi.fn().mockResolvedValue({
    summary: "Test summary",
    topicTags: ["tech", "AI"],
    importanceScore: 0.7,
  }),
}))

// ── 테스트 프로바이더 팩토리 ─────────────────────────────────────

function createMockProvider(
  overrides?: Partial<NewsAutoFetchDataProvider>
): NewsAutoFetchDataProvider {
  return {
    getSourceCount: vi.fn().mockResolvedValue(0),
    seedPresets: vi.fn().mockResolvedValue({ added: PRESET_SOURCES.length }),
    getActiveSources: vi.fn().mockResolvedValue([
      {
        id: "src1",
        name: "Reuters",
        rssUrl: "https://feeds.reuters.com/reuters/topNews",
        region: "GLOBAL",
      },
      {
        id: "src2",
        name: "BBC",
        rssUrl: "http://feeds.bbci.co.uk/news/world/rss.xml",
        region: "GB",
      },
    ]),
    articleExists: vi.fn().mockResolvedValue(false),
    saveArticle: vi.fn().mockResolvedValue(undefined),
    markSourceSuccess: vi.fn().mockResolvedValue(undefined),
    markSourceFailure: vi.fn().mockResolvedValue(1),
    disableSource: vi.fn().mockResolvedValue(undefined),
    getConfig: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function createMockLLM() {
  return {
    generateText: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        summary: "LLM summary",
        topicTags: ["tech"],
        importanceScore: 0.8,
      }),
      tokensUsed: 100,
    }),
  }
}

// ═══════════════════════════════════════════════════════════════
// ensurePresetsSeeded
// ═══════════════════════════════════════════════════════════════

describe("ensurePresetsSeeded", () => {
  it("소스 0개일 때 프리셋 자동 시드", async () => {
    const provider = createMockProvider({ getSourceCount: vi.fn().mockResolvedValue(0) })
    const result = await ensurePresetsSeeded(provider)

    expect(result.seeded).toBe(true)
    expect(result.count).toBe(PRESET_SOURCES.length)
    expect(provider.seedPresets).toHaveBeenCalledOnce()
  })

  it("소스가 이미 있으면 시드 건너뜀", async () => {
    const provider = createMockProvider({ getSourceCount: vi.fn().mockResolvedValue(5) })
    const result = await ensurePresetsSeeded(provider)

    expect(result.seeded).toBe(false)
    expect(result.count).toBe(0)
    expect(provider.seedPresets).not.toHaveBeenCalled()
  })

  it("프리셋 개수가 15개", () => {
    expect(PRESET_SOURCES.length).toBe(15)
  })

  it("프리셋에 한국 소스 4개 포함", () => {
    const kr = PRESET_SOURCES.filter((s) => s.region === "KR")
    expect(kr.length).toBe(4)
  })
})

// ═══════════════════════════════════════════════════════════════
// executeNewsAutoFetch
// ═══════════════════════════════════════════════════════════════

describe("executeNewsAutoFetch", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // 이전 테스트의 mockRejectedValue가 남아있을 수 있으므로 기본 구현 복원
    const fetcher = await import("@/lib/persona-world/news/news-fetcher")
    vi.mocked(fetcher.fetchArticlesFromRss).mockResolvedValue([
      {
        title: "Test Article 1",
        url: "https://example.com/article1",
        publishedAt: new Date("2026-02-25"),
        rawContent: "Article content 1",
      },
      {
        title: "Test Article 2",
        url: "https://example.com/article2",
        publishedAt: new Date("2026-02-25"),
        rawContent: "Article content 2",
      },
    ])
    vi.mocked(fetcher.analyzeArticleWithClaude).mockResolvedValue({
      summary: "Test summary",
      topicTags: ["tech", "AI"],
      importanceScore: 0.7,
    })
  })

  it("전체 수집 → 기사 저장 + 소스 성공 기록", async () => {
    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(5), // 시드 건너뜀
    })
    const llm = createMockLLM()

    const result = await executeNewsAutoFetch(provider, llm)

    expect(result.seeded).toBe(false)
    expect(result.sourcesProcessed).toBe(2)
    expect(result.totalNewArticles).toBe(4) // 2 sources × 2 articles each
    expect(provider.saveArticle).toHaveBeenCalledTimes(4)
    expect(provider.markSourceSuccess).toHaveBeenCalledTimes(2)
  })

  it("auto_fetch_enabled=false이면 수집 건너뜀", async () => {
    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(5),
      getConfig: vi.fn().mockImplementation((key: string) => {
        if (key === "auto_fetch_enabled") return Promise.resolve(false)
        return Promise.resolve(null)
      }),
    })

    const result = await executeNewsAutoFetch(provider, null)

    expect(result.sourcesProcessed).toBe(0)
    expect(result.totalNewArticles).toBe(0)
    expect(provider.getActiveSources).not.toHaveBeenCalled()
  })

  it("중복 기사 건너뜀", async () => {
    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(5),
      articleExists: vi.fn().mockResolvedValue(true),
    })
    const llm = createMockLLM()

    const result = await executeNewsAutoFetch(provider, llm)

    expect(result.totalNewArticles).toBe(0)
    expect(provider.saveArticle).not.toHaveBeenCalled()
  })

  it("LLM 없으면 기본값으로 저장", async () => {
    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(5),
    })

    const result = await executeNewsAutoFetch(provider, null)

    expect(result.totalNewArticles).toBe(4)
    expect(provider.saveArticle).toHaveBeenCalledTimes(4)
    // importanceScore 기본값 0.5 확인
    const firstCall = vi.mocked(provider.saveArticle).mock.calls[0][0]
    expect(firstCall.importanceScore).toBe(0.5)
    expect(firstCall.topicTags).toEqual([])
  })

  it("수집 실패 시 consecutiveFailures 증가", async () => {
    const { fetchArticlesFromRss } = await import("@/lib/persona-world/news/news-fetcher")
    vi.mocked(fetchArticlesFromRss)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce([
        { title: "OK Article", url: "https://ok.com/1", publishedAt: new Date(), rawContent: "ok" },
      ])

    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(5),
    })

    const result = await executeNewsAutoFetch(provider, null)

    expect(result.sourceResults[0].error).toBe("Network error")
    expect(provider.markSourceFailure).toHaveBeenCalledWith("src1", "Network error")
    expect(result.sourceResults[1].error).toBeUndefined()
    expect(provider.markSourceSuccess).toHaveBeenCalledWith("src2")
  })

  it("3회 연속 실패 → 소스 자동 비활성화", async () => {
    const { fetchArticlesFromRss } = await import("@/lib/persona-world/news/news-fetcher")
    vi.mocked(fetchArticlesFromRss).mockRejectedValue(new Error("Persistent error"))

    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(5),
      markSourceFailure: vi.fn().mockResolvedValue(3), // 3회째
    })

    const result = await executeNewsAutoFetch(provider, null)

    expect(provider.disableSource).toHaveBeenCalledWith("src1")
    expect(provider.disableSource).toHaveBeenCalledWith("src2")
    expect(result.sourceResults[0].disabled).toBe(true)
    expect(result.sourceResults[1].disabled).toBe(true)
  })

  it("2회 실패 → 비활성화 안 함", async () => {
    const { fetchArticlesFromRss } = await import("@/lib/persona-world/news/news-fetcher")
    vi.mocked(fetchArticlesFromRss).mockRejectedValue(new Error("Temp error"))

    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(5),
      markSourceFailure: vi.fn().mockResolvedValue(2), // 2회째
    })

    const result = await executeNewsAutoFetch(provider, null)

    expect(provider.disableSource).not.toHaveBeenCalled()
    expect(result.sourceResults[0].disabled).toBeUndefined()
  })

  it("새 기사 있으면 반응 트리거 호출", async () => {
    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(5),
    })
    const reactionRunner = vi.fn().mockResolvedValue({ postsCreated: 5 })

    const result = await executeNewsAutoFetch(provider, null, reactionRunner)

    expect(result.reactionTriggered).toBe(true)
    expect(result.reactionResult).toEqual({ postsCreated: 5 })
    expect(reactionRunner).toHaveBeenCalledOnce()
  })

  it("auto_trigger_enabled=false이면 반응 트리거 건너뜀", async () => {
    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(5),
      getConfig: vi.fn().mockImplementation((key: string) => {
        if (key === "auto_trigger_enabled") return Promise.resolve(false)
        return Promise.resolve(null)
      }),
    })
    const reactionRunner = vi.fn()

    const result = await executeNewsAutoFetch(provider, null, reactionRunner)

    expect(result.reactionTriggered).toBe(false)
    expect(reactionRunner).not.toHaveBeenCalled()
  })

  it("새 기사 0개이면 반응 트리거 건너뜀", async () => {
    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(5),
      articleExists: vi.fn().mockResolvedValue(true), // 모두 중복
    })
    const reactionRunner = vi.fn()

    const result = await executeNewsAutoFetch(provider, null, reactionRunner)

    expect(result.reactionTriggered).toBe(false)
    expect(reactionRunner).not.toHaveBeenCalled()
  })

  it("reactionRunner 없으면 반응 트리거 건너뜀", async () => {
    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(5),
    })

    const result = await executeNewsAutoFetch(provider, null)

    expect(result.reactionTriggered).toBe(false)
  })

  it("반응 트리거 실패해도 전체 결과 반환", async () => {
    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(5),
    })
    const reactionRunner = vi.fn().mockRejectedValue(new Error("Reaction failed"))

    const result = await executeNewsAutoFetch(provider, null, reactionRunner)

    expect(result.reactionTriggered).toBe(false)
    expect(result.totalNewArticles).toBe(4) // 수집은 성공
  })

  it("시드 + 수집 동시 수행 (소스 0개인 경우)", async () => {
    const provider = createMockProvider({
      getSourceCount: vi.fn().mockResolvedValue(0),
    })

    const result = await executeNewsAutoFetch(provider, null)

    expect(result.seeded).toBe(true)
    expect(result.seedCount).toBe(PRESET_SOURCES.length)
    expect(result.sourcesProcessed).toBe(2) // getActiveSources 결과
    expect(result.totalNewArticles).toBe(4)
  })
})
