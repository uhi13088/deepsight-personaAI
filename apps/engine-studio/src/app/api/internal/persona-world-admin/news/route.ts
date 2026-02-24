// ═══════════════════════════════════════════════════════════════
// Phase NB — News Admin API
// GET  /api/internal/persona-world-admin/news — 소스 목록 + 최근 기사
// POST /api/internal/persona-world-admin/news — 소스 추가 | 수동 수집
// PUT  /api/internal/persona-world-admin/news — 소스 활성화/비활성화
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import { fetchArticlesFromRss, analyzeArticleWithClaude } from "@/lib/persona-world/news"
import { createNewsLLMProvider } from "@/lib/persona-world/llm-adapter"

// ── GET: 소스 목록 + 최근 기사 ─────────────────────────────────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const [sources, recentArticles] = await Promise.all([
      prisma.newsSource.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { articles: true } },
        },
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
          createdAt: true,
          _count: { select: { reactingPosts: true } },
        },
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
          reactionCount: a._count.reactingPosts,
          createdAt: a.createdAt.toISOString(),
        })),
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

// ── POST: 소스 추가 | 수동 수집 ────────────────────────────────

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { action } = body as { action: string }

    switch (action) {
      case "add_source": {
        const { name, rssUrl } = body as { action: string; name: string; rssUrl: string }
        if (!name?.trim() || !rssUrl?.trim()) {
          return NextResponse.json(
            { success: false, error: { code: "MISSING_PARAM", message: "name, rssUrl required" } },
            { status: 400 }
          )
        }

        const source = await prisma.newsSource.create({
          data: { name: name.trim(), rssUrl: rssUrl.trim() },
        })

        return NextResponse.json({ success: true, data: { source } })
      }

      case "fetch_source": {
        // 특정 소스의 최신 기사 수집
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

        for (const raw of rawArticles.slice(0, 10)) {
          // 중복 확인
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
        // 모든 활성 소스 수집
        const activeSources = await prisma.newsSource.findMany({
          where: { isActive: true },
          select: { id: true, name: true, rssUrl: true },
        })

        const results: Array<{ sourceId: string; name: string; newArticles: number }> = []
        const llm = createNewsLLMProvider()

        for (const src of activeSources) {
          const rawArticles = await fetchArticlesFromRss(src.rssUrl)
          let newCount = 0

          for (const raw of rawArticles.slice(0, 10)) {
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
