"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Plus, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"

// ── 타입 ─────────────────────────────────────────────────────

interface CurationItem {
  id: string
  curationScore: number
  curationReason: string | null
  highlights: string[]
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  persona: {
    id: string
    name: string
    handle: string | null
    profileImageUrl: string | null
  }
  contentItem: {
    id: string
    contentType: string
    title: string
    description: string | null
    sourceUrl: string | null
    genres: string[]
    tags: string[]
    vectorizedAt: string | null
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ── 콘텐츠 타입 이모지 ───────────────────────────────────────

const CONTENT_TYPE_EMOJI: Record<string, string> = {
  MOVIE: "🎬",
  DRAMA: "📺",
  MUSIC: "🎵",
  BOOK: "📚",
  ARTICLE: "📰",
  PRODUCT: "🛒",
  VIDEO: "▶️",
  PODCAST: "🎙️",
}

// ── CurationCard ──────────────────────────────────────────────

function CurationCard({
  item,
  onApprove,
  onReject,
  isUpdating,
}: {
  item: CurationItem
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isUpdating: boolean
}) {
  const emoji = CONTENT_TYPE_EMOJI[item.contentItem.contentType] ?? "📄"
  const score = Math.round(item.curationScore * 100)

  return (
    <div className="border-border bg-card rounded-lg border p-4 shadow-sm">
      {/* 콘텐츠 정보 */}
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-foreground truncate font-semibold">{item.contentItem.title}</h3>
            <Badge variant="outline" className="shrink-0 text-xs">
              {item.contentItem.contentType}
            </Badge>
            {!item.contentItem.vectorizedAt && (
              <Badge variant="outline" className="shrink-0 border-amber-300 text-xs text-amber-600">
                미벡터화
              </Badge>
            )}
          </div>
          {item.contentItem.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {item.contentItem.description}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            {item.contentItem.genres.map((g) => (
              <span
                key={g}
                className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs"
              >
                {g}
              </span>
            ))}
            {item.contentItem.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 큐레이션 메타 */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-muted-foreground flex items-center gap-3 text-sm">
          <span className="font-medium text-violet-600 dark:text-violet-400">
            @{item.persona.handle ?? item.persona.name}
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span>
            점수: <strong>{score}%</strong>
          </span>
          {item.curationReason && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="line-clamp-1 max-w-[200px] italic">"{item.curationReason}"</span>
            </>
          )}
        </div>

        {/* 승인/거절 버튼 */}
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => onReject(item.id)}
            disabled={isUpdating}
          >
            <XCircle className="mr-1 h-4 w-4" />
            거절
          </Button>
          <Button
            size="sm"
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={() => onApprove(item.id)}
            disabled={isUpdating}
          >
            <CheckCircle className="mr-1 h-4 w-4" />
            승인
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── ManualCurationForm ────────────────────────────────────────

function ManualCurationForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    personaId: "",
    contentItemId: "",
    curationScore: "1.0",
    curationReason: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/internal/curation/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: form.personaId.trim(),
          contentItemId: form.contentItemId.trim(),
          curationScore: parseFloat(form.curationScore),
          curationReason: form.curationReason.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error?.message ?? "오류 발생")
      setOpen(false)
      setForm({ personaId: "", contentItemId: "", curationScore: "1.0", curationReason: "" })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        수동 연결
      </Button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-border bg-muted space-y-3 rounded-lg border border-dashed p-4"
    >
      <h3 className="text-foreground font-medium">수동 큐레이션 생성 (APPROVED 직접 저장)</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <input
          className="border-border bg-background text-foreground rounded border px-3 py-2 text-sm"
          placeholder="페르소나 ID"
          value={form.personaId}
          onChange={(e) => setForm((f) => ({ ...f, personaId: e.target.value }))}
          required
        />
        <input
          className="border-border bg-background text-foreground rounded border px-3 py-2 text-sm"
          placeholder="ContentItem ID"
          value={form.contentItemId}
          onChange={(e) => setForm((f) => ({ ...f, contentItemId: e.target.value }))}
          required
        />
        <input
          className="border-border bg-background text-foreground rounded border px-3 py-2 text-sm"
          placeholder="점수 (0~1)"
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={form.curationScore}
          onChange={(e) => setForm((f) => ({ ...f, curationScore: e.target.value }))}
        />
        <input
          className="border-border bg-background text-foreground rounded border px-3 py-2 text-sm"
          placeholder="큐레이션 이유 (선택)"
          value={form.curationReason}
          onChange={(e) => setForm((f) => ({ ...f, curationReason: e.target.value }))}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          취소
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "생성 중..." : "생성"}
        </Button>
      </div>
    </form>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────

export default function CurationPage() {
  const [items, setItems] = useState<CurationItem[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [personaIdFilter, setPersonaIdFilter] = useState("")

  const fetchPending = useCallback(
    async (page = 1) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" })
        if (personaIdFilter.trim()) params.set("personaId", personaIdFilter.trim())
        const res = await fetch(`/api/internal/curation/pending?${params}`)
        const data = await res.json()
        if (data.success) {
          setItems(data.data.items)
          setPagination(data.data.pagination)
        }
      } finally {
        setLoading(false)
      }
    },
    [personaIdFilter]
  )

  useEffect(() => {
    fetchPending(1)
  }, [fetchPending])

  async function handleApprove(id: string) {
    setUpdatingId(id)
    try {
      await fetch(`/api/internal/curation/${id}/approve`, { method: "PATCH" })
      // Optimistic: 목록에서 제거
      setItems((prev) => prev.filter((i) => i.id !== id))
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleReject(id: string) {
    setUpdatingId(id)
    try {
      await fetch(`/api/internal/curation/${id}/reject`, { method: "PATCH" })
      setItems((prev) => prev.filter((i) => i.id !== id))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <>
      <Header title="큐레이션 관리" description="PENDING 큐레이션 검토 및 B2B 추천 승인" />

      <div className="space-y-4 p-6">
        {/* 툴바 */}
        <div className="flex items-center gap-2">
          <input
            className="border-border bg-background text-foreground w-64 rounded border px-3 py-2 text-sm"
            placeholder="페르소나 ID로 필터"
            value={personaIdFilter}
            onChange={(e) => setPersonaIdFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchPending(1)}
          />
          <Button variant="outline" size="sm" onClick={() => fetchPending(1)}>
            적용
          </Button>
          {personaIdFilter && (
            <Button variant="ghost" size="sm" onClick={() => setPersonaIdFilter("")}>
              초기화
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {pagination.total > 0 && (
              <span className="text-muted-foreground text-xs">PENDING {pagination.total}건</span>
            )}
            <Button variant="outline" size="sm" onClick={() => fetchPending(pagination.page)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <ManualCurationForm onCreated={() => fetchPending(1)} />
          </div>
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="text-muted-foreground py-12 text-center">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">
            <p className="text-lg">PENDING 큐레이션이 없습니다</p>
            <p className="mt-1 text-sm">자동 큐레이션 cron이 실행되면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <CurationCard
                key={item.id}
                item={item}
                onApprove={handleApprove}
                onReject={handleReject}
                isUpdating={updatingId === item.id}
              />
            ))}
          </div>
        )}

        {/* 페이지네이션 */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchPending(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground text-sm">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchPending(pagination.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
