// ═══════════════════════════════════════════════════════════════
// T256 — News Auto-Fetch Service
// 프리셋 자동 시드 + cron 기반 자동 수집 + 오류 추적
// ═══════════════════════════════════════════════════════════════

import { fetchArticlesFromRss, analyzeArticleWithClaude } from "./news-fetcher"
import type { LLMProvider } from "./news-fetcher"

// ── 상수 ────────────────────────────────────────────────────────

/** 소스당 최대 수집 기사 수 */
const MAX_ARTICLES_PER_FETCH = 5

/** 연속 실패 시 자동 비활성화 임계치 */
const AUTO_DISABLE_THRESHOLD = 3

/** 프리셋 RSS 소스 목록 */
export const PRESET_SOURCES = [
  // 글로벌
  {
    name: "Reuters Top News",
    rssUrl: "https://feeds.reuters.com/reuters/topNews",
    region: "GLOBAL",
  },
  { name: "BBC World News", rssUrl: "http://feeds.bbci.co.uk/news/world/rss.xml", region: "GB" },
  { name: "Associated Press", rssUrl: "https://feeds.apnews.com/rss/topnews", region: "GLOBAL" },
  // 테크
  { name: "TechCrunch", rssUrl: "https://techcrunch.com/feed/", region: "US" },
  { name: "The Verge", rssUrl: "https://www.theverge.com/rss/index.xml", region: "US" },
  { name: "Hacker News", rssUrl: "https://news.ycombinator.com/rss", region: "US" },
  { name: "Wired", rssUrl: "https://www.wired.com/feed/rss", region: "US" },
  // 경제/비즈
  {
    name: "Bloomberg Markets",
    rssUrl: "https://feeds.bloomberg.com/markets/news.rss",
    region: "US",
  },
  { name: "Financial Times", rssUrl: "https://www.ft.com/rss/home", region: "GB" },
  {
    name: "The Economist",
    rssUrl: "https://www.economist.com/the-world-this-week/rss.xml",
    region: "GB",
  },
  // 한국
  {
    name: "연합뉴스 속보",
    rssUrl: "https://www.yonhapnewstv.co.kr/category/news/newsflash/feed/",
    region: "KR",
  },
  { name: "한겨레", rssUrl: "https://www.hani.co.kr/rss/", region: "KR" },
  { name: "조선비즈", rssUrl: "https://biz.chosun.com/rss/", region: "KR" },
  { name: "한국경제", rssUrl: "https://www.hankyung.com/feed/all-news", region: "KR" },
  // 일본
  { name: "NHK World", rssUrl: "https://www3.nhk.or.jp/rss/news/cat0.xml", region: "JP" },
] as const

// ── 데이터 프로바이더 인터페이스 ─────────────────────────────────

export interface NewsAutoFetchDataProvider {
  /** 등록된 소스 수 조회 */
  getSourceCount(): Promise<number>

  /** 프리셋 소스 일괄 등록 */
  seedPresets(
    presets: Array<{ name: string; rssUrl: string; region: string }>
  ): Promise<{ added: number }>

  /** 활성 소스 목록 조회 */
  getActiveSources(): Promise<Array<{ id: string; name: string; rssUrl: string; region: string }>>

  /** 기사 URL 중복 체크 */
  articleExists(url: string): Promise<boolean>

  /** 기사 저장 */
  saveArticle(data: {
    sourceId: string
    title: string
    url: string
    publishedAt: Date
    rawContent: string
    summary: string
    topicTags: string[]
    importanceScore: number
    region: string
  }): Promise<void>

  /** 소스 수집 성공 기록 */
  markSourceSuccess(sourceId: string): Promise<void>

  /** 소스 수집 실패 기록 */
  markSourceFailure(sourceId: string, error: string): Promise<number>

  /** 소스 자동 비활성화 (3회 연속 실패) */
  disableSource(sourceId: string): Promise<void>

  /** 설정 조회 */
  getConfig(key: string): Promise<unknown | null>
}

// ── 결과 타입 ───────────────────────────────────────────────────

export interface AutoFetchResult {
  /** 자동 시드 여부 */
  seeded: boolean
  seedCount: number
  /** 수집 결과 */
  sourcesProcessed: number
  totalNewArticles: number
  sourceResults: Array<{
    sourceId: string
    name: string
    newArticles: number
    error?: string
    disabled?: boolean
  }>
  /** 자동 반응 결과 */
  reactionTriggered: boolean
  reactionResult?: unknown
}

// ── 자동 시드 ───────────────────────────────────────────────────

/**
 * 뉴스 소스가 0개이면 프리셋 자동 등록.
 * GET 요청 또는 cron 실행 시 호출.
 */
export async function ensurePresetsSeeded(
  provider: NewsAutoFetchDataProvider
): Promise<{ seeded: boolean; count: number }> {
  const count = await provider.getSourceCount()
  if (count > 0) return { seeded: false, count: 0 }

  const result = await provider.seedPresets(
    PRESET_SOURCES.map((p) => ({ name: p.name, rssUrl: p.rssUrl, region: p.region }))
  )
  return { seeded: true, count: result.added }
}

// ── 자동 수집 ───────────────────────────────────────────────────

/**
 * 전체 활성 소스 자동 수집.
 * 소스별 오류 추적 + 3회 연속 실패 시 자동 비활성화.
 * autoTriggerEnabled=true이면 수집 후 반응 트리거 연쇄 호출.
 */
export async function executeNewsAutoFetch(
  provider: NewsAutoFetchDataProvider,
  llmProvider: LLMProvider | null,
  reactionRunner?: () => Promise<unknown>
): Promise<AutoFetchResult> {
  // 1. 프리셋 시드 확인
  const seedResult = await ensurePresetsSeeded(provider)

  // 2. autoFetchEnabled 확인
  const autoFetchEnabled = await provider.getConfig("auto_fetch_enabled")
  if (autoFetchEnabled === false) {
    return {
      seeded: seedResult.seeded,
      seedCount: seedResult.count,
      sourcesProcessed: 0,
      totalNewArticles: 0,
      sourceResults: [],
      reactionTriggered: false,
    }
  }

  // 3. 활성 소스 수집
  const activeSources = await provider.getActiveSources()
  const sourceResults: AutoFetchResult["sourceResults"] = []
  let totalNewArticles = 0

  for (const source of activeSources) {
    try {
      const rawArticles = await fetchArticlesFromRss(source.rssUrl)
      let newCount = 0

      for (const raw of rawArticles.slice(0, MAX_ARTICLES_PER_FETCH)) {
        const exists = await provider.articleExists(raw.url)
        if (exists) continue

        if (llmProvider) {
          const analysis = await analyzeArticleWithClaude(raw.title, raw.rawContent, llmProvider)
          await provider.saveArticle({
            sourceId: source.id,
            title: raw.title,
            url: raw.url,
            publishedAt: raw.publishedAt,
            rawContent: raw.rawContent,
            summary: analysis.summary,
            topicTags: analysis.topicTags,
            importanceScore: analysis.importanceScore,
            region: source.region,
          })
        } else {
          // LLM 없으면 기본값으로 저장
          await provider.saveArticle({
            sourceId: source.id,
            title: raw.title,
            url: raw.url,
            publishedAt: raw.publishedAt,
            rawContent: raw.rawContent,
            summary: raw.rawContent.slice(0, 200),
            topicTags: [],
            importanceScore: 0.5,
            region: source.region,
          })
        }

        newCount++
      }

      // 성공 → consecutiveFailures 리셋
      await provider.markSourceSuccess(source.id)
      sourceResults.push({ sourceId: source.id, name: source.name, newArticles: newCount })
      totalNewArticles += newCount
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      const failures = await provider.markSourceFailure(source.id, errorMsg)

      const entry: AutoFetchResult["sourceResults"][number] = {
        sourceId: source.id,
        name: source.name,
        newArticles: 0,
        error: errorMsg,
      }

      // 3회 연속 실패 → 자동 비활성화
      if (failures >= AUTO_DISABLE_THRESHOLD) {
        await provider.disableSource(source.id)
        entry.disabled = true
      }

      sourceResults.push(entry)
    }
  }

  // 4. 자동 반응 트리거 (새 기사가 있고 reactionRunner가 제공된 경우)
  let reactionTriggered = false
  let reactionResult: unknown

  if (totalNewArticles > 0 && reactionRunner) {
    const autoTriggerEnabled = await provider.getConfig("auto_trigger_enabled")
    if (autoTriggerEnabled !== false) {
      try {
        reactionResult = await reactionRunner()
        reactionTriggered = true
      } catch (error) {
        console.error("[NewsAutoFetch] Reaction trigger failed:", error)
      }
    }
  }

  return {
    seeded: seedResult.seeded,
    seedCount: seedResult.count,
    sourcesProcessed: activeSources.length,
    totalNewArticles,
    sourceResults,
    reactionTriggered,
    reactionResult,
  }
}
