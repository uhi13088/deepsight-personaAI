"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Rss,
  RefreshCw,
  Plus,
  ToggleLeft,
  ToggleRight,
  Zap,
  ExternalLink,
  Tag,
  Settings,
  DollarSign,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

// ── 타입 ────────────────────────────────────────────────────────

interface NewsSource {
  id: string
  name: string
  rssUrl: string
  isActive: boolean
  region: string
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
  importanceScore: number
  region: string
  reactionCount: number
  createdAt: string
}

interface NewsSettings {
  autoTriggerEnabled: boolean
  dailyBudget: number
  maxPerPersona: number
}

interface CostSummary {
  todayCostUsd: number
  todayCallCount: number
  monthCostUsd: number
  monthCallCount: number
}

interface PresetSource {
  name: string
  rssUrl: string
  region: string
}

interface PageData {
  sources: NewsSource[]
  presets: PresetSource[]
  recentArticles: NewsArticle[]
  settings: NewsSettings
  costSummary: CostSummary
}

// ── 유틸리티 ────────────────────────────────────────────────────

function ImportanceBadge({ score }: { score: number }) {
  if (score >= 0.8)
    return (
      <Badge className="bg-red-100 px-1 py-0 text-xs text-red-700">🔥 {score.toFixed(1)}</Badge>
    )
  if (score >= 0.6)
    return (
      <Badge className="bg-orange-100 px-1 py-0 text-xs text-orange-700">
        ⚡ {score.toFixed(1)}
      </Badge>
    )
  if (score >= 0.4)
    return (
      <Badge variant="secondary" className="px-1 py-0 text-xs">
        {score.toFixed(1)}
      </Badge>
    )
  return (
    <Badge variant="outline" className="px-1 py-0 text-xs text-gray-400">
      {score.toFixed(1)}
    </Badge>
  )
}

function formatUsd(val: number) {
  if (val === 0) return "$0.00"
  if (val < 0.01) return `$${val.toFixed(4)}`
  return `$${val.toFixed(2)}`
}

// ── 인라인 토글 컴포넌트 ─────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
    >
      <div
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
  )
}

// ── 메인 페이지 ─────────────────────────────────────────────────

export default function NewsAdminPage() {
  const [data, setData] = useState<PageData>({
    sources: [],
    presets: [],
    recentArticles: [],
    settings: { autoTriggerEnabled: true, dailyBudget: 20, maxPerPersona: 2 },
    costSummary: { todayCostUsd: 0, todayCallCount: 0, monthCostUsd: 0, monthCallCount: 0 },
  })
  const [loading, setLoading] = useState(true)
  const [fetchingSource, setFetchingSource] = useState<string | null>(null)
  const [triggeringArticle, setTriggeringArticle] = useState<string | null>(null)
  const [addingSource, setAddingSource] = useState(false)
  const [addingPresets, setAddingPresets] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [newSourceName, setNewSourceName] = useState("")
  const [newSourceUrl, setNewSourceUrl] = useState("")
  const [newSourceRegion, setNewSourceRegion] = useState("GLOBAL")
  const [showSettings, setShowSettings] = useState(false)

  // 로컬 설정 임시 상태
  const [localSettings, setLocalSettings] = useState<NewsSettings>({
    autoTriggerEnabled: true,
    dailyBudget: 20,
    maxPerPersona: 2,
  })

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/persona-world-admin/news")
      const json = await res.json()
      if (json.success) {
        setData(json.data as PageData)
        setLocalSettings((json.data as PageData).settings)
      }
    } catch {
      // 네트워크 오류 — 현재 상태 유지
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // ── 프리셋 일괄 등록 ────────────────────────────────────────────

  const handleAddPresets = async (urls?: string[]) => {
    setAddingPresets(true)
    try {
      const res = await fetch("/api/internal/persona-world-admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_presets", ...(urls ? { urls } : {}) }),
      })
      const json = await res.json()
      if (json.success) await loadData()
    } finally {
      setAddingPresets(false)
    }
  }

  // ── 소스 추가 ──────────────────────────────────────────────────

  const handleAddSource = async () => {
    if (!newSourceName.trim() || !newSourceUrl.trim()) return
    setAddingSource(true)
    try {
      const res = await fetch("/api/internal/persona-world-admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_source",
          name: newSourceName,
          rssUrl: newSourceUrl,
          region: newSourceRegion,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        alert(json.error?.message ?? "소스 추가 실패")
        return
      }
      setNewSourceName("")
      setNewSourceUrl("")
      setNewSourceRegion("GLOBAL")
      await loadData()
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

  // ── 설정 저장 ──────────────────────────────────────────────────

  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch("/api/internal/persona-world-admin/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_settings", ...localSettings }),
      })
      const json = await res.json()
      if (json.success) {
        await loadData()
        setShowSettings(false)
      }
    } finally {
      setSavingSettings(false)
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

  const { sources, presets, recentArticles, settings, costSummary } = data

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
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="mr-1 h-4 w-4" />
            설정
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleFetchAll}
            disabled={fetchingSource === "all"}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${fetchingSource === "all" ? "animate-spin" : ""}`}
            />
            전체 수집
          </Button>
        </div>
      </div>

      {/* 비용 요약 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "오늘 비용",
            value: formatUsd(costSummary.todayCostUsd),
            sub: `${costSummary.todayCallCount}회 호출`,
            color: "text-green-500",
          },
          {
            label: "이번 달",
            value: formatUsd(costSummary.monthCostUsd),
            sub: `${costSummary.monthCallCount}회 호출`,
            color: "text-blue-500",
          },
          {
            label: "일일 예산",
            value: `${settings.dailyBudget}포스트`,
            sub: "자동 반응 상한",
            color: "text-amber-500",
          },
          {
            label: "자동 트리거",
            value: settings.autoTriggerEnabled ? "ON" : "OFF",
            sub: settings.autoTriggerEnabled ? "매일 실행 중" : "수동 전용",
            color: settings.autoTriggerEnabled ? "text-emerald-500" : "text-gray-400",
          },
        ].map((card) => (
          <div key={card.label} className="border-border bg-card rounded-lg border p-3">
            <div className="text-muted-foreground text-xs">{card.label}</div>
            <div className={`text-lg font-semibold ${card.color}`}>{card.value}</div>
            <div className="text-muted-foreground text-xs">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* T200-B: 설정 패널 (인큐베이터 스타일) */}
      {showSettings && (
        <div className="border-border bg-card space-y-4 rounded-lg border p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Settings className="h-4 w-4" />
            뉴스 반응 설정
          </h2>

          {/* 자동 트리거 ON/OFF */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">자동 트리거</div>
              <div className="text-muted-foreground text-xs">
                매일 cron → 헤드라인 수집 → 자동 반응 포스트 생성
              </div>
            </div>
            <Toggle
              enabled={localSettings.autoTriggerEnabled}
              onChange={(v) => setLocalSettings((s) => ({ ...s, autoTriggerEnabled: v }))}
            />
          </div>

          {/* 일일 예산 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">일일 예산 (포스트 수)</div>
              <div className="text-muted-foreground text-xs">
                하루 자동 생성 최대 포스트 수 (기본 20)
              </div>
            </div>
            <Input
              type="number"
              min={1}
              max={100}
              value={localSettings.dailyBudget}
              onChange={(e) =>
                setLocalSettings((s) => ({ ...s, dailyBudget: Number(e.target.value) }))
              }
              className="w-20 text-right text-sm"
            />
          </div>

          {/* 페르소나당 최대 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">페르소나당 최대</div>
              <div className="text-muted-foreground text-xs">
                1명 페르소나가 하루 최대 반응 가능 수 (기본 2)
              </div>
            </div>
            <Input
              type="number"
              min={1}
              max={10}
              value={localSettings.maxPerPersona}
              onChange={(e) =>
                setLocalSettings((s) => ({ ...s, maxPerPersona: Number(e.target.value) }))
              }
              className="w-20 text-right text-sm"
            />
          </div>

          {/* 고정 안전장치 안내 */}
          <div className="bg-muted/50 flex items-start gap-2 rounded-md p-3 text-xs">
            <AlertCircle className="text-muted-foreground mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <div className="text-muted-foreground space-y-1">
              <div>
                수동 트리거: 기사당 최대 <strong>10명</strong> 페르소나 (고정)
              </div>
              <div>
                소스 등록: 최대 <strong>20개</strong> (고정)
              </div>
              <div>
                소스당 수집: 최대 <strong>5기사</strong> (고정)
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowSettings(false)}>
              취소
            </Button>
            <Button size="sm" onClick={handleSaveSettings} disabled={savingSettings}>
              {savingSettings ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>
      )}

      {/* 소스 관리 */}
      <div className="border-border bg-card space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">
            RSS 소스 관리
            <span className="text-muted-foreground ml-2 text-xs">({sources.length}/20)</span>
          </h2>
          {presets.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAddPresets()}
              disabled={addingPresets || sources.length >= 20}
              className="text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {addingPresets ? "추가 중..." : `추천 소스 전체 추가 (${presets.length}개)`}
            </Button>
          )}
        </div>

        {/* 미등록 프리셋 빠른 추가 */}
        {presets.length > 0 && (
          <div className="rounded-lg border border-dashed p-3">
            <p className="text-muted-foreground mb-2 text-xs font-medium">
              추천 RSS 소스 — 클릭해서 개별 추가
            </p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.rssUrl}
                  onClick={() => handleAddPresets([p.rssUrl])}
                  disabled={addingPresets || sources.length >= 20}
                  className="border-border hover:bg-accent flex items-center gap-1 rounded-full border bg-transparent px-2.5 py-1 text-xs transition-colors disabled:opacity-40"
                >
                  <span className="text-muted-foreground">[{p.region}]</span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 소스 추가 폼 */}
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="소스 이름 (예: Reuters)"
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            className="min-w-28 flex-1 text-sm"
          />
          <Input
            placeholder="RSS URL"
            value={newSourceUrl}
            onChange={(e) => setNewSourceUrl(e.target.value)}
            className="min-w-40 flex-[2] text-sm"
          />
          <select
            value={newSourceRegion}
            onChange={(e) => setNewSourceRegion(e.target.value)}
            className="border-input bg-background h-9 rounded-md border px-2 text-sm"
          >
            {["GLOBAL", "KR", "US", "JP", "CN", "EU", "GB"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleAddSource}
            disabled={
              addingSource || !newSourceName.trim() || !newSourceUrl.trim() || sources.length >= 20
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            추가
          </Button>
        </div>

        {/* 소스 목록 */}
        {sources.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">등록된 RSS 소스 없음</p>
        ) : (
          <div className="divide-border divide-y">
            {sources.map((source) => (
              <div key={source.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{source.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {source.region}
                    </Badge>
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
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          최근 수집 기사
          <span className="text-muted-foreground text-xs font-normal">
            — 중요도: 🔥0.8+ ⚡0.6+ 보통0.4+ 낮음
          </span>
        </h2>
        {recentArticles.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            수집된 기사 없음 — RSS 소스를 추가하고 수집을 실행하세요
          </p>
        ) : (
          <div className="divide-border divide-y">
            {recentArticles.map((article) => (
              <div key={article.id} className="space-y-1.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {/* T200-C: 중요도 배지 */}
                      <ImportanceBadge score={article.importanceScore} />
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
                      <Badge variant="outline" className="text-xs">
                        {article.region}
                      </Badge>
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
                  {/* T200-A: 수동 트리거 (최대 10명 캡 적용됨) */}
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

      {/* 비용 안내 링크 */}
      <div className="border-border bg-muted/30 flex items-center gap-2 rounded-lg border p-3">
        <DollarSign className="text-muted-foreground h-4 w-4 flex-shrink-0" />
        <span className="text-muted-foreground text-xs">
          상세 비용 내역은{" "}
          <a href="/operations/llm-costs" className="text-blue-500 underline">
            운영 → LLM 비용 대시보드
          </a>
          에서 <code className="text-xs">pw:news_analysis</code> ·{" "}
          <code className="text-xs">pw:news_reaction</code> 항목으로 확인하세요.
        </span>
      </div>
    </div>
  )
}
