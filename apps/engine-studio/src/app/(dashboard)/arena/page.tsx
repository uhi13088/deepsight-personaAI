"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// ── 타입 ────────────────────────────────────────────────────

interface PersonaOption {
  id: string
  name: string
  role: string | null
  profileImageUrl: string | null
}

interface ArenaTurn {
  turnNumber: number
  speakerId: string
  content: string
  tokensUsed: number
  timestamp: string
}

interface ArenaSessionSummary {
  id: string
  mode: string
  participantA: string
  participantAName: string
  participantARole: string | null
  participantB: string
  participantBName: string
  participantBRole: string | null
  profileLoadLevel: string
  topic: string
  maxTurns: number
  budgetTokens: number
  usedTokens: number
  status: string
  turnCount: number
  overallScore: number | null
  judgmentMethod: string | null
  createdAt: string
  completedAt: string | null
}

type ProfileLevel = "FULL" | "STANDARD" | "LITE"

type CreateFormState = {
  participantA: string
  participantB: string
  topic: string
  maxTurns: number
  budgetTokens: number
  profileLoadLevel: ProfileLevel
}

const INITIAL_FORM: CreateFormState = {
  participantA: "",
  participantB: "",
  topic: "",
  maxTurns: 6,
  budgetTokens: 10000,
  profileLoadLevel: "STANDARD",
}

const PROFILE_LEVELS: { key: ProfileLevel; label: string; desc: string; tokens: string }[] = [
  { key: "LITE", label: "Lite", desc: "L1 + Stance", tokens: "~600" },
  { key: "STANDARD", label: "Standard", desc: "L1 + L2 + Voice", tokens: "~1,800" },
  { key: "FULL", label: "Full", desc: "3-Layer + Voice + RAG", tokens: "~3,200" },
]

// ── PersonaSelector ─────────────────────────────────────────

function PersonaSelector({
  label,
  value,
  excludeId,
  onChange,
}: {
  label: string
  value: PersonaOption | null
  excludeId?: string
  onChange: (persona: PersonaOption | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [options, setOptions] = useState<PersonaOption[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ limit: "20" })
        if (query.trim()) params.set("search", query.trim())
        const res = await fetch(`/api/internal/personas?${params}`)
        const json = (await res.json()) as {
          success: boolean
          data?: { personas: PersonaOption[] }
        }
        if (json.success && json.data) {
          setOptions(
            json.data.personas
              .filter((p) => p.id !== excludeId)
              .map((p) => ({
                id: p.id,
                name: p.name,
                role: p.role ?? null,
                profileImageUrl: p.profileImageUrl ?? null,
              }))
          )
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 200)
  }, [query, open, excludeId])

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()

  if (value && !open) {
    return (
      <div ref={containerRef}>
        <label className="text-muted-foreground mb-1 block text-xs">{label}</label>
        <button
          type="button"
          className="bg-background flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition hover:border-blue-400"
          onClick={() => {
            setOpen(true)
            setQuery("")
          }}
        >
          <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
            {initials(value.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.name}</p>
            {value.role && <p className="text-muted-foreground truncate text-xs">{value.role}</p>}
          </div>
          <span className="text-muted-foreground text-xs">변경</span>
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="text-muted-foreground mb-1 block text-xs">{label}</label>
      <input
        type="text"
        className="bg-background w-full rounded-lg border px-3 py-2.5 text-sm placeholder:text-gray-400"
        placeholder="페르소나 이름으로 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="bg-popover absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border shadow-lg">
          {loading && <p className="text-muted-foreground px-3 py-2 text-xs">검색 중...</p>}
          {!loading && options.length === 0 && (
            <p className="text-muted-foreground px-3 py-2 text-xs">
              {query ? "검색 결과 없음" : "페르소나가 없습니다"}
            </p>
          )}
          {options.map((p) => (
            <button
              key={p.id}
              type="button"
              className="hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-left transition"
              onClick={() => {
                onChange(p)
                setOpen(false)
                setQuery("")
              }}
            >
              <div className="bg-muted flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                {initials(p.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{p.name}</p>
                {p.role && <p className="text-muted-foreground truncate text-xs">{p.role}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 상태 Badge (한글 라벨) ──────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { label: "대기 중", variant: "outline" },
  RUNNING: { label: "실행 중", variant: "secondary" },
  COMPLETED: { label: "완료", variant: "default" },
  CANCELLED: { label: "취소됨", variant: "destructive" },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}

// ── 시간 포맷 ───────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "방금"
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

// ── 턴 뷰어 모달 ────────────────────────────────────────────

function TurnViewer({ session, onClose }: { session: ArenaSessionSummary; onClose: () => void }) {
  const [turns, setTurns] = useState<ArenaTurn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/internal/arena/sessions/${session.id}/turns`)
      .then((r) => r.json())
      .then((json: { success: boolean; data?: { turns: ArenaTurn[] } }) => {
        if (json.success && json.data) setTurns(json.data.turns)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [session.id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-background max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-inherit px-5 py-4">
          <div>
            <p className="text-sm font-semibold">{session.topic}</p>
            <p className="text-muted-foreground text-xs">
              {session.participantAName} vs {session.participantBName}
              {session.overallScore !== null && (
                <span className="ml-2 font-medium text-blue-500">
                  점수: {session.overallScore.toFixed(2)}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-lg"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* 턴 목록 */}
        <div className="space-y-3 p-5">
          {loading && <p className="text-muted-foreground text-sm">불러오는 중...</p>}
          {!loading && turns.length === 0 && (
            <p className="text-muted-foreground text-sm">턴 데이터가 없습니다.</p>
          )}
          {turns.map((t) => {
            const isA = t.speakerId === session.participantA
            const name = isA ? session.participantAName : session.participantBName
            return (
              <div
                key={t.turnNumber}
                className={`rounded-lg border p-3 ${isA ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20" : "border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20"}`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold">{name}</span>
                  <span className="text-muted-foreground text-xs">턴 {t.turnNumber}</span>
                  <span className="text-muted-foreground ml-auto text-xs">{t.tokensUsed}tok</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{t.content}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 세션 카드 ───────────────────────────────────────────────

function SessionCard({
  session,
  onRun,
  onDelete,
  onViewTurns,
  running,
  deleting,
}: {
  session: ArenaSessionSummary
  onRun: (id: string) => void
  onDelete: (id: string) => void
  onViewTurns: (session: ArenaSessionSummary) => void
  running: boolean
  deleting: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 transition hover:bg-gray-50 dark:hover:bg-gray-900">
      {/* 메인 정보 */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => session.status === "COMPLETED" && onViewTurns(session)}
          disabled={session.status !== "COMPLETED"}
        >
          <p className="truncate text-sm font-medium">
            {session.topic}
            {session.status === "COMPLETED" && (
              <span className="text-muted-foreground ml-1 text-xs">(클릭하여 대화 보기)</span>
            )}
          </p>
          <p className="text-muted-foreground text-xs">
            {session.participantAName} vs {session.participantBName}
          </p>
        </button>
      </div>

      {/* 오른쪽 정보 */}
      <div className="flex shrink-0 items-center gap-2">
        {session.overallScore !== null && (
          <span className="text-xs font-medium text-blue-500">
            {session.overallScore.toFixed(2)}점
          </span>
        )}
        <span className="text-muted-foreground text-xs">
          {session.turnCount}/{session.maxTurns}턴
        </span>
        <StatusBadge status={session.status} />
        <span className="text-muted-foreground w-14 text-right text-xs">
          {timeAgo(session.createdAt)}
        </span>

        {/* 실행 버튼 (PENDING만) */}
        {session.status === "PENDING" && (
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs"
            onClick={() => onRun(session.id)}
            disabled={running}
          >
            {running ? "실행 중..." : "▶ 실행"}
          </Button>
        )}

        {/* 삭제 버튼 (RUNNING 제외) */}
        {session.status !== "RUNNING" && (
          <button
            type="button"
            className="text-muted-foreground text-xs transition hover:text-red-500"
            onClick={() => onDelete(session.id)}
            disabled={deleting}
            title="세션 삭제"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function ArenaAdminPage() {
  const [sessions, setSessions] = useState<ArenaSessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [personaA, setPersonaA] = useState<PersonaOption | null>(null)
  const [personaB, setPersonaB] = useState<PersonaOption | null>(null)
  const [runningSessions, setRunningSessions] = useState<Set<string>>(new Set())
  const [deletingSessions, setDeletingSessions] = useState<Set<string>>(new Set())
  const [viewingSession, setViewingSession] = useState<ArenaSessionSummary | null>(null)

  // 세션 목록 로드
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/arena/sessions")
      const json = (await res.json()) as {
        success: boolean
        data?: { sessions: ArenaSessionSummary[] }
      }
      if (json.success && json.data) {
        setSessions(json.data.sessions)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // 세션 생성
  const handleCreate = async () => {
    if (!personaA || !personaB || !form.topic.trim()) {
      setCreateError("참가자 2명과 주제를 입력하세요.")
      return
    }
    if (personaA.id === personaB.id) {
      setCreateError("서로 다른 참가자를 선택하세요.")
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch("/api/internal/arena/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          participantA: personaA.id,
          participantB: personaB.id,
        }),
      })
      const json = (await res.json()) as {
        success: boolean
        data?: { session: ArenaSessionSummary }
        error?: { message: string }
      }
      if (json.success) {
        setForm(INITIAL_FORM)
        setPersonaA(null)
        setPersonaB(null)
        await fetchSessions()
      } else {
        setCreateError(json.error?.message ?? "세션 생성 실패")
      }
    } catch {
      setCreateError("네트워크 오류")
    } finally {
      setCreating(false)
    }
  }

  // 세션 실행
  const handleRun = async (sessionId: string) => {
    setRunningSessions((s) => new Set(s).add(sessionId))
    try {
      const res = await fetch(`/api/internal/arena/sessions/${sessionId}/run`, {
        method: "POST",
      })
      const json = (await res.json()) as { success: boolean; error?: { message: string } }
      if (!json.success) {
        alert(json.error?.message ?? "세션 실행 실패")
      }
    } catch {
      alert("네트워크 오류")
    } finally {
      setRunningSessions((s) => {
        const next = new Set(s)
        next.delete(sessionId)
        return next
      })
      await fetchSessions()
    }
  }

  // 세션 삭제
  const handleDelete = async (sessionId: string) => {
    if (!confirm("이 세션을 삭제하시겠습니까?")) return
    setDeletingSessions((s) => new Set(s).add(sessionId))
    try {
      const res = await fetch(`/api/internal/arena/sessions/${sessionId}`, {
        method: "DELETE",
      })
      const json = (await res.json()) as { success: boolean; error?: { message: string } }
      if (json.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      } else {
        alert(json.error?.message ?? "세션 삭제 실패")
      }
    } catch {
      alert("네트워크 오류")
    } finally {
      setDeletingSessions((s) => {
        const next = new Set(s)
        next.delete(sessionId)
        return next
      })
    }
  }

  // 통계
  const completedCount = sessions.filter((s) => s.status === "COMPLETED").length
  const pendingCount = sessions.filter((s) => s.status === "PENDING").length
  const scoredSessions = sessions.filter((s) => s.overallScore !== null)
  const avgScore =
    scoredSessions.length > 0
      ? scoredSessions.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / scoredSessions.length
      : 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header title="아레나 관리" description="1:1 스파링 세션 생성 및 결과 리뷰" />

      {/* 통계 카드 */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-xs">총 세션</p>
            <p className="text-2xl font-bold">{sessions.length}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-xs">완료</p>
            <p className="text-2xl font-bold">{completedCount}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-xs">대기 중</p>
            <p className="text-2xl font-bold text-orange-500">{pendingCount}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-xs">평균 점수</p>
            <p className="text-2xl font-bold">{avgScore > 0 ? avgScore.toFixed(2) : "-"}</p>
          </div>
        </div>
      )}

      {/* 세션 생성 패널 */}
      <div className="rounded-lg border p-5">
        <h3 className="mb-4 text-sm font-semibold">새 아레나 세션</h3>

        {/* 참가자 선택 */}
        <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <PersonaSelector
            label="참가자 A"
            value={personaA}
            excludeId={personaB?.id}
            onChange={(p) => {
              setPersonaA(p)
              if (p) setForm((f) => ({ ...f, participantA: p.id }))
            }}
          />
          <div className="hidden items-end justify-center pb-2 sm:flex">
            <span className="text-muted-foreground text-lg font-bold">VS</span>
          </div>
          <PersonaSelector
            label="참가자 B"
            value={personaB}
            excludeId={personaA?.id}
            onChange={(p) => {
              setPersonaB(p)
              if (p) setForm((f) => ({ ...f, participantB: p.id }))
            }}
          />
        </div>

        {personaA && personaB && (
          <div className="bg-muted/50 mb-4 flex items-center justify-center gap-3 rounded-lg py-2 text-sm">
            <span className="font-medium">{personaA.name}</span>
            <span className="text-muted-foreground">vs</span>
            <span className="font-medium">{personaB.name}</span>
          </div>
        )}

        {/* 주제 */}
        <div className="mb-4">
          <label className="text-muted-foreground mb-1 block text-xs">토론 주제</label>
          <input
            type="text"
            className="bg-background w-full rounded-lg border px-3 py-2.5 text-sm"
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            placeholder="예: AI가 인간의 창의성을 대체할 수 있는가?"
          />
        </div>

        {/* 프로필 로드 수준 */}
        <div className="mb-4">
          <label className="text-muted-foreground mb-2 block text-xs">프로필 로드 수준</label>
          <div className="grid grid-cols-3 gap-2">
            {PROFILE_LEVELS.map((pl) => (
              <button
                key={pl.key}
                type="button"
                className={`rounded-lg border p-3 text-left transition ${
                  form.profileLoadLevel === pl.key
                    ? "border-blue-500 bg-blue-500/5"
                    : "hover:border-gray-400"
                }`}
                onClick={() => setForm((f) => ({ ...f, profileLoadLevel: pl.key }))}
              >
                <p className="text-sm font-medium">{pl.label}</p>
                <p className="text-muted-foreground text-xs">
                  {pl.desc} ({pl.tokens} tok)
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 고급 설정 */}
        <div className="mb-4">
          <button
            type="button"
            className="text-muted-foreground text-xs hover:underline"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "- 고급 설정 닫기" : "+ 고급 설정"}
          </button>
          {showAdvanced && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">최대 턴</label>
                <input
                  type="number"
                  className="bg-background w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.maxTurns}
                  onChange={(e) => setForm((f) => ({ ...f, maxTurns: Number(e.target.value) }))}
                  min={2}
                  max={20}
                />
              </div>
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">예산 (토큰)</label>
                <input
                  type="number"
                  className="bg-background w-full rounded-lg border px-3 py-2 text-sm"
                  value={form.budgetTokens}
                  onChange={(e) => setForm((f) => ({ ...f, budgetTokens: Number(e.target.value) }))}
                  min={1000}
                  step={1000}
                />
              </div>
            </div>
          )}
        </div>

        {createError && <p className="mb-3 text-sm text-red-500">{createError}</p>}

        <Button onClick={handleCreate} disabled={creating || !personaA || !personaB}>
          {creating ? "생성 중..." : "세션 생성"}
        </Button>
      </div>

      {/* 세션 목록 */}
      <div className="rounded-lg border p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">세션 목록</h3>
          {pendingCount > 0 && (
            <p className="text-muted-foreground text-xs">▶ 버튼을 눌러 PENDING 세션을 실행하세요</p>
          )}
        </div>
        {loading ? (
          <p className="text-muted-foreground text-sm">로딩 중...</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">아직 세션이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onRun={handleRun}
                onDelete={handleDelete}
                onViewTurns={setViewingSession}
                running={runningSessions.has(s.id)}
                deleting={deletingSessions.has(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 턴 뷰어 모달 */}
      {viewingSession && (
        <TurnViewer session={viewingSession} onClose={() => setViewingSession(null)} />
      )}
    </div>
  )
}
