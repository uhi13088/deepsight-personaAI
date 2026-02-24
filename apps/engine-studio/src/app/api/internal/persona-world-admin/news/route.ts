// ═══════════════════════════════════════════════════════════════
// Phase NB — News Admin API (T200: 안전장치 + 설정 + 비용)
// GET  /api/internal/persona-world-admin/news — 소스 목록 + 최근 기사 + 비용
// POST /api/internal/persona-world-admin/news — 소스 추가 | 수동 수집 | 설정
// PUT  /api/internal/persona-world-admin/news — 소스 활성화/비활성화
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import { fetchArticlesFromRss, analyzeArticleWithClaude } from "@/lib/persona-world/news"
import { createNewsLLMProvider } from "@/lib/persona-world/llm-adapter"
import type { Prisma } from "@/generated/prisma"

// ── 상수 ────────────────────────────────────────────────────────

/** T200-A: 소스 최대 등록 수 */
const MAX_NEWS_SOURCES = 20

/** T200-A: 소스당 최대 수집 기사 수 */
const MAX_ARTICLES_PER_FETCH = 5

// ── 설정 기본값 ─────────────────────────────────────────────────

const NEWS_CONFIG_DEFAULTS = {
  autoTriggerEnabled: true,
  dailyBudget: 20,
  maxPerPersona: 2,
}

async function loadNewsSettings(): Promise<typeof NEWS_CONFIG_DEFAULTS> {
  const configs = await prisma.systemConfig.findMany({ where: { category: "NEWS" } })
  const map = Object.fromEntries(configs.map((c) => [c.key, c.value]))
  return {
    autoTriggerEnabled:
      typeof map.auto_trigger_enabled === "boolean"
        ? map.auto_trigger_enabled
        : NEWS_CONFIG_DEFAULTS.autoTriggerEnabled,
    dailyBudget:
      typeof map.daily_budget === "number" ? map.daily_budget : NEWS_CONFIG_DEFAULTS.dailyBudget,
    maxPerPersona:
      typeof map.max_per_persona === "number"
        ? map.max_per_persona
        : NEWS_CONFIG_DEFAULTS.maxPerPersona,
  }
}

// ── GET: 소스 목록 + 최근 기사 + 설정 + 비용 ─────────────────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [sources, recentArticles, settings, todayCostRows, monthCostRows] = await Promise.all([
      prisma.newsSource.findMany({
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { articles: true } } },
      }),
      prisma.newsArticle.findMany({
        orderBy: { publishedAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          url: true,
          publishedAt: true,
          summary: true,
          topicTags: true,
          sourceId: true,
          importanceScore: true,
          region: true,
          createdAt: true,
          _count: { select: { reactingPosts: true } },
        },
      }),
      loadNewsSettings(),
      // 오늘 뉴스 비용 (분석 + 반응)
      prisma.llmUsageLog.aggregate({
        where: {
          callType: { in: ["pw:news_analysis", "pw:news_reaction"] },
          createdAt: { gte: todayStart },
          status: "SUCCESS",
        },
        _sum: { estimatedCostUsd: true },
        _count: { id: true },
      }),
      // 이번 달 뉴스 비용
      prisma.llmUsageLog.aggregate({
        where: {
          callType: { in: ["pw:news_analysis", "pw:news_reaction"] },
          createdAt: { gte: monthStart },
          status: "SUCCESS",
        },
        _sum: { estimatedCostUsd: true },
        _count: { id: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        sources: sources.map((s) => ({
          id: s.id,
          name: s.name,
          rssUrl: s.rssUrl,
          isActive: s.isActive,
          region: s.region,
          lastFetchAt: s.lastFetchAt?.toISOString() ?? null,
          articleCount: s._count.articles,
        })),
        recentArticles: recentArticles.map((a) => ({
          id: a.id,
          title: a.title,
          url: a.url,
          publishedAt: a.publishedAt.toISOString(),
          summary: a.summary,
          topicTags: a.topicTags,
          sourceId: a.sourceId,
          importanceScore: a.importanceScore,
          region: a.region,
          reactionCount: a._count.reactingPosts,
          createdAt: a.createdAt.toISOString(),
        })),
        settings,
        costSummary: {
          todayCostUsd: Number(todayCostRows._sum.estimatedCostUsd ?? 0),
          todayCallCount: todayCostRows._count.id,
          monthCostUsd: Number(monthCostRows._sum.estimatedCostUsd ?? 0),
          monthCallCount: monthCostRows._count.id,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "NEWS_READ_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── POST: 소스 추가 | 수동 수집 | 설정 ─────────────────────────

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { action } = body as { action: string }

    switch (action) {
      case "add_source": {
        const {
          name,
          rssUrl,
          region = "GLOBAL",
        } = body as {
          action: string
          name: string
          rssUrl: string
          region?: string
        }
        if (!name?.trim() || !rssUrl?.trim()) {
          return NextResponse.json(
            { success: false, error: { code: "MISSING_PARAM", message: "name, rssUrl required" } },
            { status: 400 }
          )
        }

        // T200-A: 소스 수 상한 검증
        const sourceCount = await prisma.newsSource.count()
        if (sourceCount >= MAX_NEWS_SOURCES) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "LIMIT_REACHED",
                message: `최대 ${MAX_NEWS_SOURCES}개 소스까지 등록 가능합니다`,
              },
            },
            { status: 400 }
          )
        }

        const source = await prisma.newsSource.create({
          data: { name: name.trim(), rssUrl: rssUrl.trim(), region },
        })

        return NextResponse.json({ success: true, data: { source } })
      }

      case "fetch_source": {
        const { sourceId } = body as { action: string; sourceId: string }
        if (!sourceId) {
          return NextResponse.json(
            { success: false, error: { code: "MISSING_PARAM", message: "sourceId required" } },
            { status: 400 }
          )
        }

        const source = await prisma.newsSource.findUnique({ where: { id: sourceId } })
        if (!source) {
          return NextResponse.json(
            { success: false, error: { code: "NOT_FOUND", message: "NewsSource not found" } },
            { status: 404 }
          )
        }

        const rawArticles = await fetchArticlesFromRss(source.rssUrl)
        const llm = createNewsLLMProvider()
        let newCount = 0

        // T200-A: 소스당 최대 5개
        for (const raw of rawArticles.slice(0, MAX_ARTICLES_PER_FETCH)) {
          const existing = await prisma.newsArticle.findUnique({ where: { url: raw.url } })
          if (existing) continue

          const analysis = await analyzeArticleWithClaude(raw.title, raw.rawContent, llm)

          await prisma.newsArticle.create({
            data: {
              sourceId: source.id,
              title: raw.title,
              url: raw.url,
              publishedAt: raw.publishedAt,
              rawContent: raw.rawContent,
              summary: analysis.summary,
              topicTags: analysis.topicTags,
              importanceScore: analysis.importanceScore, // T200-C
              region: source.region,
            },
          })

          newCount++
        }

        await prisma.newsSource.update({
          where: { id: source.id },
          data: { lastFetchAt: new Date() },
        })

        return NextResponse.json({
          success: true,
          data: { sourceId, fetched: rawArticles.length, newArticles: newCount },
        })
      }

      case "fetch_all": {
        const activeSources = await prisma.newsSource.findMany({
          where: { isActive: true },
          select: { id: true, name: true, rssUrl: true, region: true },
        })

        const results: Array<{ sourceId: string; name: string; newArticles: number }> = []
        const llm = createNewsLLMProvider()

        for (const src of activeSources) {
          const rawArticles = await fetchArticlesFromRss(src.rssUrl)
          let newCount = 0

          // T200-A: 소스당 최대 5개
          for (const raw of rawArticles.slice(0, MAX_ARTICLES_PER_FETCH)) {
            const existing = await prisma.newsArticle.findUnique({ where: { url: raw.url } })
            if (existing) continue

            const analysis = await analyzeArticleWithClaude(raw.title, raw.rawContent, llm)
            await prisma.newsArticle.create({
              data: {
                sourceId: src.id,
                title: raw.title,
                url: raw.url,
                publishedAt: raw.publishedAt,
                rawContent: raw.rawContent,
                summary: analysis.summary,
                topicTags: analysis.topicTags,
                importanceScore: analysis.importanceScore, // T200-C
                region: src.region,
              },
            })
            newCount++
          }

          await prisma.newsSource.update({
            where: { id: src.id },
            data: { lastFetchAt: new Date() },
          })

          results.push({ sourceId: src.id, name: src.name, newArticles: newCount })
        }

        const totalNew = results.reduce((sum, r) => sum + r.newArticles, 0)
        return NextResponse.json({ success: true, data: { results, totalNew } })
      }

      // T200-B: 설정 저장
      case "save_settings": {
        const { autoTriggerEnabled, dailyBudget, maxPerPersona } = body as {
          action: string
          autoTriggerEnabled?: boolean
          dailyBudget?: number
          maxPerPersona?: number
        }

        const upserts: Array<Promise<unknown>> = []

        if (autoTriggerEnabled !== undefined) {
          upserts.push(
            prisma.systemConfig.upsert({
              where: { category_key: { category: "NEWS", key: "auto_trigger_enabled" } },
              update: { value: autoTriggerEnabled as Prisma.InputJsonValue },
              create: {
                category: "NEWS",
                key: "auto_trigger_enabled",
                value: autoTriggerEnabled as Prisma.InputJsonValue,
                description: "뉴스 자동 트리거 ON/OFF",
              },
            })
          )
        }

        if (dailyBudget !== undefined) {
          upserts.push(
            prisma.systemConfig.upsert({
              where: { category_key: { category: "NEWS", key: "daily_budget" } },
              update: { value: dailyBudget as Prisma.InputJsonValue },
              create: {
                category: "NEWS",
                key: "daily_budget",
                value: dailyBudget as Prisma.InputJsonValue,
                description: "일일 뉴스 반응 포스트 최대 수",
              },
            })
          )
        }

        if (maxPerPersona !== undefined) {
          upserts.push(
            prisma.systemConfig.upsert({
              where: { category_key: { category: "NEWS", key: "max_per_persona" } },
              update: { value: maxPerPersona as Prisma.InputJsonValue },
              create: {
                category: "NEWS",
                key: "max_per_persona",
                value: maxPerPersona as Prisma.InputJsonValue,
                description: "페르소나당 하루 최대 뉴스 반응 수",
              },
            })
          )
        }

        await Promise.all(upserts)
        const saved = await loadNewsSettings()
        return NextResponse.json({ success: true, data: saved })
      }

      default:
        return NextResponse.json(
          { success: false, error: { code: "UNKNOWN_ACTION", message: `Unknown: ${action}` } },
          { status: 400 }
        )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "NEWS_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── PUT: 소스 활성화/비활성화 ───────────────────────────────────

export async function PUT(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id, isActive } = (await request.json()) as { id: string; isActive: boolean }
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PARAM", message: "id required" } },
        { status: 400 }
      )
    }

    await prisma.newsSource.update({ where: { id }, data: { isActive } })
    return NextResponse.json({ success: true, data: { id, isActive } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "NEWS_UPDATE_ERROR", message } },
      { status: 500 }
    )
  }
}
