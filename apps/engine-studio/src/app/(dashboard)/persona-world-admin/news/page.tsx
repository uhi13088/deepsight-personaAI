"use client"

import { useState, useEffect, useCallback } from "react"
import { Rss, RefreshCw, Plus, ToggleLeft, ToggleRight, Zap, ExternalLink, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// ── 타입 ────────────────────────────────────────────────────────

interface NewsSource {
  id: string
  name: string
  rssUrl: string
  isActive: boolean
  lastFetchAt: string | null
  articleCount: number
}

interface NewsArticle {
  id: string
  title: string
  url: string
  publishedAt: string
  summary: string
  topicTags: string[]
  sourceId: string
  reactionCount: number
  createdAt: string
}

interface PageData {
  sources: NewsSource[]
  recentArticles: NewsArticle[]
}

// ── 메인 페이지 ─────────────────────────────────────────────────

export default function NewsAdminPage() {
  const [data, setData] = useState<PageData>({ sources: [], recentArticles: [] })
  const [loading, setLoading] = useState(true)
  const [fetchingSource, setFetchingSource] = useState<string | null>(null)
  const [triggeringArticle, setTriggeringArticle] = useState<string | null>(null)
  const [addingSource, setAddingSource] = useState(false)
  const [newSourceName, setNewSourceName] = useState("")
  const [newSourceUrl, setNewSourceUrl] = useState("")

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/persona-world-admin/news")
      const json = await res.json()
      if (json.success) setData(json.data as PageData)
    } catch {
      // 네트워크 오류 — 현재 상태 유지
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // ── 소스 추가 ──────────────────────────────────────────────────

  const handleAddSource = async () => {
    if (!newSourceName.trim() || !newSourceUrl.trim()) return
    setAddingSource(true)
    try {
      const res = await fetch("/api/internal/persona-world-admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_source", name: newSourceName, rssUrl: newSourceUrl }),
      })
      if (res.ok) {
        setNewSourceName("")
        setNewSourceUrl("")
        await loadData()
      }
    } finally {
      setAddingSource(false)
    }
  }

  // ── 소스별 수집 ────────────────────────────────────────────────

  const handleFetchSource = async (sourceId: string) => {
    setFetchingSource(sourceId)
    try {
      await fetch("/api/internal/persona-world-admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetch_source", sourceId }),
      })
      await loadData()
    } finally {
      setFetchingSource(null)
    }
  }

  // ── 전체 수집 ──────────────────────────────────────────────────

  const handleFetchAll = async () => {
    setFetchingSource("all")
    try {
      await fetch("/api/internal/persona-world-admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetch_all" }),
      })
      await loadData()
    } finally {
      setFetchingSource(null)
    }
  }

  // ── 소스 토글 ──────────────────────────────────────────────────

  const handleToggleSource = async (source: NewsSource) => {
    await fetch("/api/internal/persona-world-admin/news", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: source.id, isActive: !source.isActive }),
    })
    await loadData()
  }

  // ── 뉴스 반응 트리거 ───────────────────────────────────────────

  const handleTriggerReaction = async (articleId: string) => {
    setTriggeringArticle(articleId)
    try {
      await fetch("/api/internal/persona-world-admin/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_news_article", articleId }),
      })
      await loadData()
    } finally {
      setTriggeringArticle(null)
    }
  }

  // ── 렌더링 ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center p-6">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rss className="h-5 w-5 text-orange-500" />
          <h1 className="text-xl font-semibold">뉴스 반응 관리</h1>
          <Badge variant="outline" className="text-xs">
            Phase NB
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleFetchAll}
          disabled={fetchingSource === "all"}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${fetchingSource === "all" ? "animate-spin" : ""}`} />
          전체 수집
        </Button>
      </div>

      {/* 소스 관리 */}
      <div className="border-border bg-card space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">RSS 소스 관리</h2>
        {/* 소스 추가 폼 */}
        <div className="flex gap-2">
          <Input
            placeholder="소스 이름 (예: 연합뉴스)"
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            className="flex-1 text-sm"
          />
          <Input
            placeholder="RSS URL"
            value={newSourceUrl}
            onChange={(e) => setNewSourceUrl(e.target.value)}
            className="flex-[2] text-sm"
          />
          <Button
            size="sm"
            onClick={handleAddSource}
            disabled={addingSource || !newSourceName.trim() || !newSourceUrl.trim()}
          >
            <Plus className="mr-1 h-4 w-4" />
            추가
          </Button>
        </div>

        {/* 소스 목록 */}
        {data.sources.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">등록된 RSS 소스 없음</p>
        ) : (
          <div className="divide-border divide-y">
            {data.sources.map((source) => (
              <div key={source.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{source.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {source.articleCount}개
                    </Badge>
                    {!source.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        비활성
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 max-w-sm truncate text-xs">
                    {source.rssUrl}
                  </p>
                  {source.lastFetchAt && (
                    <p className="text-muted-foreground text-xs">
                      마지막 수집: {new Date(source.lastFetchAt).toLocaleString("ko-KR")}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleFetchSource(source.id)}
                    disabled={fetchingSource === source.id}
                    className="text-xs"
                  >
                    <RefreshCw
                      className={`mr-1 h-3.5 w-3.5 ${fetchingSource === source.id ? "animate-spin" : ""}`}
                    />
                    수집
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggleSource(source)}>
                    {source.isActive ? (
                      <ToggleRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ToggleLeft className="text-muted-foreground h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 최근 기사 + 반응 트리거 */}
      <div className="border-border bg-card rounded-lg border p-4">
        <h2 className="mb-3 text-sm font-medium">최근 수집 기사</h2>
        {data.recentArticles.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            수집된 기사 없음 — RSS 소스를 추가하고 수집을 실행하세요
          </p>
        ) : (
          <div className="divide-border divide-y">
            {data.recentArticles.map((article) => (
              <div key={article.id} className="space-y-1.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-1 flex items-center gap-1 text-sm font-medium hover:underline"
                      >
                        {article.title}
                        <ExternalLink className="text-muted-foreground h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                      {article.summary}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {new Date(article.publishedAt).toLocaleString("ko-KR")}
                      </span>
                      {article.topicTags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="text-muted-foreground h-3 w-3" />
                          {article.topicTags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="px-1 py-0 text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {article.reactionCount > 0 && (
                        <Badge variant="outline" className="text-xs text-green-600">
                          반응 {article.reactionCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={article.reactionCount > 0 ? "outline" : "default"}
                    onClick={() => handleTriggerReaction(article.id)}
                    disabled={triggeringArticle === article.id}
                    className="shrink-0 text-xs"
                  >
                    <Zap
                      className={`mr-1 h-3.5 w-3.5 ${triggeringArticle === article.id ? "animate-pulse" : ""}`}
                    />
                    {triggeringArticle === article.id
                      ? "트리거 중..."
                      : article.reactionCount > 0
                        ? "재트리거"
                        : "반응 트리거"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
