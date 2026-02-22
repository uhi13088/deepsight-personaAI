"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, X } from "lucide-react"

// ── 타입 ────────────────────────────────────────────────────

interface PersonaOption {
  id: string
  name: string
  role: string | null
  profileImageUrl: string | null
}

interface ExtraParticipantEntry {
  id: string
  name: string
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
  extraParticipants: ExtraParticipantEntry[]
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

interface TurnIssue {
  turnNumber: number
  personaId: string
  category: "consistency" | "l2" | "paradox" | "trigger" | "voice"
  severity: "minor" | "major" | "critical"
  description: string
  suggestion: string
}

interface SessionDetail {
  session: {
    id: string
    mode: string
    topic: string
    status: string
    profileLoadLevel: string
    maxTurns: number
    budgetTokens: number
    usedTokens: number
    createdAt: string
    completedAt: string | null
    participantA: string
    participantAName: string
    participantARole: string | null
    participantB: string
    participantBName: string
    participantBRole: string | null
    extraParticipants: Array<{ id: string; name: string; role: string | null }>
  }
  turns: Array<{
    turnNumber: number
    speakerId: string
    speakerName: string
    content: string
    tokensUsed: number
    timestamp: string
  }>
  judgment: {
    method: string
    overallScore: number
    scores: {
      characterConsistency: number
      l2Emergence: number
      paradoxEmergence: number
      triggerResponse: number
    }
    issues: TurnIssue[]
    summary: string
    judgedAt: string
  } | null
  corrections: Array<{
    id: string
    personaId: string
    personaName: string
    category: string
    status: string
    reason: string
    originalContent: string
    correctedContent: string
    createdAt: string
    reviewedAt: string | null
  }>
  qualityImpact: {
    correctionsPending: number
    correctionsApproved: number
    correctionsRejected: number
    totalCorrections: number
    affectedPersonas: Array<{
      id: string
      name: string
      correctionCount: number
      approvedCount: number
    }>
  }
}

type ProfileLevel = "FULL" | "STANDARD" | "LITE"
type ArenaMode = "1v1" | "1vN"

const PROFILE_LEVELS: { key: ProfileLevel; label: string; desc: string; tokens: string }[] = [
  { key: "LITE", label: "Lite", desc: "L1 + Stance", tokens: "~600" },
  { key: "STANDARD", label: "Standard", desc: "L1 + L2 + Voice", tokens: "~1,800" },
  { key: "FULL", label: "Full", desc: "3-Layer + Voice + RAG", tokens: "~3,200" },
]

type ScoreKey = "characterConsistency" | "l2Emergence" | "paradoxEmergence" | "triggerResponse"

const JUDGMENT_SCORE_LABELS: Record<ScoreKey, { label: string; weight: number; desc: string }> = {
  characterConsistency: {
    label: "캐릭터 일관성",
    weight: 35,
    desc: "페르소나 정체성·말투·세계관이 일관되었는가",
  },
  l2Emergence: {
    label: "L2 기질 발현",
    weight: 25,
    desc: "L2 레이어의 기질·감정 패턴이 드러났는가",
  },
  paradoxEmergence: {
    label: "역설 발현",
    weight: 20,
    desc: "내면의 역설·모순이 자연스럽게 표출되었는가",
  },
  triggerResponse: { label: "트리거 반응", weight: 20, desc: "트리거 상황에 적절히 반응했는가" },
}

const SEVERITY_COLOR: Record<string, string> = {
  minor: "text-amber-500 bg-amber-500/10",
  major: "text-orange-500 bg-orange-500/10",
  critical: "text-red-500 bg-red-500/10",
}

const CATEGORY_LABEL: Record<string, string> = {
  consistency: "일관성",
  l2: "L2 기질",
  paradox: "역설",
  trigger: "트리거",
  voice: "보이스",
}

const CORRECTION_STATUS_COLOR: Record<string, string> = {
  PENDING: "text-amber-500",
  APPROVED: "text-emerald-500",
  REJECTED: "text-red-400",
}

// ── PersonaSelector ─────────────────────────────────────────

function PersonaSelector({
  label,
  value,
  excludeIds,
  onChange,
}: {
  label: string
  value: PersonaOption | null
  excludeIds?: string[]
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
              .filter((p) => !(excludeIds ?? []).includes(p.id))
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
  }, [query, open, excludeIds])

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

// ── 점수 바 ──────────────────────────────────────────────────

function ScoreBar({ value, color = "blue" }: { value: number; color?: string }) {
  const pct = Math.round(value * 100)
  const barColor =
    pct >= 80
      ? "bg-emerald-500"
      : pct >= 60
        ? "bg-blue-500"
        : pct >= 40
          ? "bg-amber-500"
          : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-medium tabular-nums">{pct}%</span>
    </div>
  )
}

// ── 세션 상세 보고서 패널 ─────────────────────────────────────

function SessionDetailPanel({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/internal/arena/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((json: { success: boolean; data?: SessionDetail; error?: { message: string } }) => {
        if (json.success && json.data) setDetail(json.data)
        else setError(json.error?.message ?? "로드 실패")
      })
      .catch(() => setError("네트워크 오류"))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="border-t p-6">
        <p className="text-muted-foreground text-sm">보고서 로딩 중...</p>
      </div>
    )
  }
  if (error || !detail) {
    return (
      <div className="border-t p-6">
        <p className="text-sm text-red-500">{error ?? "데이터 없음"}</p>
      </div>
    )
  }

  const { session, turns, judgment, corrections, qualityImpact } = detail
  const allParticipants = [
    { id: session.participantA, name: session.participantAName },
    { id: session.participantB, name: session.participantBName },
    ...session.extraParticipants,
  ]
  const participantNameMap = new Map(allParticipants.map((p) => [p.id, p.name]))

  // 턴별 이슈 인덱스
  const issuesByTurn = new Map<number, TurnIssue[]>()
  if (judgment) {
    for (const issue of judgment.issues as TurnIssue[]) {
      const list = issuesByTurn.get(issue.turnNumber) ?? []
      list.push(issue)
      issuesByTurn.set(issue.turnNumber, list)
    }
  }

  return (
    <div className="bg-card border-t">
      <div className="space-y-6 p-6">
        {/* ── 1. 심판 판정 보고서 ─────────────────────────── */}
        {judgment ? (
          <section>
            <h4 className="mb-3 text-sm font-semibold">심판 판정 보고서</h4>

            {/* 종합 점수 히어로 */}
            <div className="mb-4 flex items-center gap-4 rounded-lg border p-4">
              <div className="text-center">
                <p className="text-muted-foreground text-xs">종합 점수</p>
                <p
                  className={`text-4xl font-bold ${
                    judgment.overallScore >= 0.8
                      ? "text-emerald-500"
                      : judgment.overallScore >= 0.6
                        ? "text-blue-500"
                        : judgment.overallScore >= 0.4
                          ? "text-amber-500"
                          : "text-red-500"
                  }`}
                >
                  {(judgment.overallScore * 100).toFixed(0)}
                </p>
                <p className="text-muted-foreground text-[10px]">/ 100</p>
              </div>
              <div className="bg-border h-12 w-px" />
              <div className="flex-1">
                <p className="text-sm">{judgment.summary}</p>
                <p className="text-muted-foreground mt-1 text-[10px]">
                  판정 방식: {judgment.method === "RULE_BASED" ? "룰 기반" : "LLM"} ·{" "}
                  {new Date(judgment.judgedAt).toLocaleString("ko-KR")}
                </p>
              </div>
            </div>

            {/* 차원별 점수 */}
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                Object.entries(JUDGMENT_SCORE_LABELS) as [
                  ScoreKey,
                  (typeof JUDGMENT_SCORE_LABELS)[ScoreKey],
                ][]
              ).map(([key, meta]) => (
                <div key={key} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-medium">{meta.label}</p>
                    <span className="text-muted-foreground text-[10px]">가중치 {meta.weight}%</span>
                  </div>
                  <ScoreBar value={judgment.scores[key]} />
                  <p className="text-muted-foreground mt-1.5 text-[10px]">{meta.desc}</p>
                </div>
              ))}
            </div>

            {/* 이슈 없음 */}
            {(judgment.issues as TurnIssue[]).length === 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                이슈 없음 — 모든 턴이 기준을 충족했습니다
              </div>
            )}
          </section>
        ) : (
          <section>
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-muted-foreground text-sm">아직 판정이 완료되지 않았습니다.</p>
            </div>
          </section>
        )}

        {/* ── 2. 대화 로그 + 이슈 ──────────────────────────── */}
        <section>
          <h4 className="mb-3 text-sm font-semibold">
            대화 로그
            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
              {turns.length}/{session.maxTurns}턴 · {session.usedTokens.toLocaleString()} 토큰
            </span>
          </h4>

          {turns.length === 0 ? (
            <p className="text-muted-foreground text-sm">아직 대화가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {turns.map((turn) => {
                const issues = issuesByTurn.get(turn.turnNumber) ?? []
                return (
                  <div key={turn.turnNumber} className="rounded-lg border">
                    <div className="flex items-center gap-2 border-b px-3 py-1.5">
                      <span className="text-muted-foreground text-xs">#{turn.turnNumber}</span>
                      <span className="text-xs font-medium">{turn.speakerName}</span>
                      <span className="text-muted-foreground ml-auto text-[10px]">
                        {turn.tokensUsed} tok
                      </span>
                    </div>
                    <div className="px-3 py-2.5 text-sm leading-relaxed">{turn.content}</div>
                    {issues.length > 0 && (
                      <div className="space-y-1.5 border-t px-3 py-2">
                        {issues.map((issue, i) => (
                          <div
                            key={i}
                            className={`rounded px-2 py-1.5 text-xs ${SEVERITY_COLOR[issue.severity]}`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium uppercase">{issue.severity}</span>
                              <span className="opacity-60">·</span>
                              <span>{CATEGORY_LABEL[issue.category] ?? issue.category}</span>
                            </div>
                            <p className="mt-0.5 opacity-80">{issue.description}</p>
                            <p className="mt-0.5 opacity-60">→ {issue.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── 3. 품질 개선 현황 ────────────────────────────── */}
        <section>
          <h4 className="mb-3 text-sm font-semibold">
            품질 개선 현황
            {qualityImpact.totalCorrections > 0 && (
              <span className="ml-1.5 text-xs font-normal text-blue-500">
                총 {qualityImpact.totalCorrections}건
              </span>
            )}
          </h4>

          {qualityImpact.totalCorrections === 0 ? (
            <p className="text-muted-foreground text-sm">교정 요청이 없습니다.</p>
          ) : (
            <>
              {/* 페르소나별 영향 요약 */}
              <div className="mb-3 flex flex-wrap gap-2">
                {qualityImpact.affectedPersonas.map((p) => (
                  <div key={p.id} className="rounded-lg border px-3 py-2 text-xs">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted-foreground ml-2">
                      교정 {p.correctionCount}건 (승인 {p.approvedCount}건)
                    </span>
                  </div>
                ))}
              </div>

              {/* 교정 상태 뱃지 요약 */}
              <div className="mb-3 flex gap-3 text-xs">
                {qualityImpact.correctionsPending > 0 && (
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
                    대기 {qualityImpact.correctionsPending}
                  </span>
                )}
                {qualityImpact.correctionsApproved > 0 && (
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
                    승인 {qualityImpact.correctionsApproved}
                  </span>
                )}
                {qualityImpact.correctionsRejected > 0 && (
                  <span className="rounded bg-red-500/10 px-2 py-0.5 text-red-500">
                    거부 {qualityImpact.correctionsRejected}
                  </span>
                )}
              </div>

              {/* 교정 목록 */}
              <div className="space-y-2">
                {corrections.map((c) => (
                  <div key={c.id} className="rounded-lg border p-3 text-xs">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-medium">{c.personaName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {CATEGORY_LABEL[c.category] ?? c.category}
                      </Badge>
                      <span className={`ml-auto font-medium ${CORRECTION_STATUS_COLOR[c.status]}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{c.reason}</p>
                    {c.status === "APPROVED" && (
                      <div className="mt-1.5 rounded bg-emerald-500/10 px-2 py-1 text-emerald-600 dark:text-emerald-400">
                        페르소나 스타일북에 반영되었습니다
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

// ── 상태 Badge ───────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "COMPLETED"
      ? "default"
      : status === "RUNNING"
        ? "secondary"
        : status === "ERROR"
          ? "destructive"
          : "outline"
  return <Badge variant={variant}>{status}</Badge>
}

// ── 시간 포맷 ────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "방금"
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function ArenaAdminPage() {
  const [sessions, setSessions] = useState<ArenaSessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // 폼 상태
  const [arenaMode, setArenaMode] = useState<ArenaMode>("1v1")
  const [personaA, setPersonaA] = useState<PersonaOption | null>(null)
  const [personaB, setPersonaB] = useState<PersonaOption | null>(null)
  const [extraPersonas, setExtraPersonas] = useState<(PersonaOption | null)[]>([null])
  const [topic, setTopic] = useState("")
  const [maxTurns, setMaxTurns] = useState(6)
  const [budgetTokens, setBudgetTokens] = useState(10000)
  const [profileLoadLevel, setProfileLoadLevel] = useState<ProfileLevel>("STANDARD")
  const [showAdvanced, setShowAdvanced] = useState(false)

  // 세션 상세 패널
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  const allSelectedIds = [personaA?.id, personaB?.id, ...extraPersonas.map((p) => p?.id)].filter(
    Boolean
  ) as string[]

  // 세션 목록 로드
  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/internal/arena/sessions")
      const json = (await res.json()) as {
        success: boolean
        data?: { sessions: ArenaSessionSummary[] }
      }
      if (json.success && json.data) setSessions(json.data.sessions)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  // 세션 생성
  const handleCreate = async () => {
    if (!personaA || !personaB || !topic.trim()) {
      setError("참가자와 주제를 입력하세요.")
      return
    }

    const extraIds =
      arenaMode === "1vN"
        ? extraPersonas.filter((p): p is PersonaOption => p !== null).map((p) => p.id)
        : []

    setCreating(true)
    setError(null)

    try {
      const res = await fetch("/api/internal/arena/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantA: personaA.id,
          participantB: personaB.id,
          extraParticipants: extraIds,
          topic: topic.trim(),
          maxTurns,
          budgetTokens,
          profileLoadLevel,
        }),
      })

      const json = (await res.json()) as {
        success: boolean
        error?: { message: string }
      }

      if (json.success) {
        setPersonaA(null)
        setPersonaB(null)
        setExtraPersonas([null])
        setTopic("")
        await fetchSessions()
      } else {
        setError(json.error?.message ?? "세션 생성 실패")
      }
    } catch {
      setError("네트워크 오류")
    } finally {
      setCreating(false)
    }
  }

  // 통계
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED")
  const avgScore =
    completedSessions.length > 0
      ? completedSessions
          .filter((s) => s.overallScore !== null)
          .reduce((sum, s) => sum + (s.overallScore ?? 0), 0) /
        completedSessions.filter((s) => s.overallScore !== null).length
      : 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header title="아레나 관리" description="페르소나 1:1 · 1:N 스파링 세션 생성 및 결과 리뷰" />

      {/* 통계 카드 */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-xs">총 세션</p>
            <p className="text-2xl font-bold">{sessions.length}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-xs">완료</p>
            <p className="text-2xl font-bold">{completedSessions.length}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-xs">평균 점수</p>
            <p className="text-2xl font-bold">
              {avgScore > 0 ? `${(avgScore * 100).toFixed(0)}` : "-"}
            </p>
          </div>
        </div>
      )}

      {/* 세션 생성 패널 */}
      <div className="rounded-lg border p-5">
        <h3 className="mb-4 text-sm font-semibold">새 아레나 세션</h3>

        {/* 모드 선택 */}
        <div className="mb-4">
          <label className="text-muted-foreground mb-2 block text-xs">아레나 모드</label>
          <div className="flex gap-2">
            {(["1v1", "1vN"] as ArenaMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setArenaMode(m)
                  setExtraPersonas([null])
                }}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  arenaMode === m
                    ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "hover:border-gray-400"
                }`}
              >
                {m === "1v1" ? "1 : 1  스파링" : "1 : N  다자 대결"}
              </button>
            ))}
          </div>
        </div>

        {/* 참가자 선택 */}
        {arenaMode === "1v1" ? (
          <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <PersonaSelector
              label="참가자 A"
              value={personaA}
              excludeIds={allSelectedIds.filter((id) => id !== personaA?.id)}
              onChange={setPersonaA}
            />
            <div className="hidden items-end justify-center pb-2 sm:flex">
              <span className="text-muted-foreground text-lg font-bold">VS</span>
            </div>
            <PersonaSelector
              label="참가자 B"
              value={personaB}
              excludeIds={allSelectedIds.filter((id) => id !== personaB?.id)}
              onChange={setPersonaB}
            />
          </div>
        ) : (
          <div className="mb-4 space-y-3">
            <PersonaSelector
              label="호스트 (주인공)"
              value={personaA}
              excludeIds={allSelectedIds.filter((id) => id !== personaA?.id)}
              onChange={setPersonaA}
            />
            <div className="space-y-2 border-l-2 border-blue-500/30 pl-4">
              <p className="text-muted-foreground text-xs">상대방 (최대 4명)</p>
              <PersonaSelector
                label="상대방 1"
                value={personaB}
                excludeIds={allSelectedIds.filter((id) => id !== personaB?.id)}
                onChange={setPersonaB}
              />
              {extraPersonas.map((p, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1">
                    <PersonaSelector
                      label={`상대방 ${idx + 2}`}
                      value={p}
                      excludeIds={allSelectedIds.filter((id) => id !== p?.id)}
                      onChange={(selected) => {
                        setExtraPersonas((prev) => prev.map((ep, i) => (i === idx ? selected : ep)))
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setExtraPersonas((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-foreground mb-2.5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {extraPersonas.length < 3 && (
                <button
                  type="button"
                  onClick={() => setExtraPersonas((prev) => [...prev, null])}
                  className="text-muted-foreground hover:text-foreground text-xs hover:underline"
                >
                  + 상대방 추가
                </button>
              )}
            </div>
          </div>
        )}

        {/* VS 배너 */}
        {personaA && personaB && (
          <div className="bg-muted/50 mb-4 flex items-center justify-center gap-3 rounded-lg py-2 text-sm">
            <span className="font-medium">{personaA.name}</span>
            <span className="text-muted-foreground text-xs">
              {arenaMode === "1v1" ? "vs" : "vs"}
            </span>
            <span className="font-medium">{personaB.name}</span>
            {arenaMode === "1vN" && extraPersonas.filter(Boolean).length > 0 && (
              <span className="text-muted-foreground text-xs">
                +{" "}
                {extraPersonas
                  .filter(Boolean)
                  .map((p) => p?.name)
                  .join(", ")}
              </span>
            )}
          </div>
        )}

        {/* 주제 */}
        <div className="mb-4">
          <label className="text-muted-foreground mb-1 block text-xs">토론 주제</label>
          <input
            type="text"
            className="bg-background w-full rounded-lg border px-3 py-2.5 text-sm"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
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
                  profileLoadLevel === pl.key
                    ? "border-blue-500 bg-blue-500/5"
                    : "hover:border-gray-400"
                }`}
                onClick={() => setProfileLoadLevel(pl.key)}
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
                  value={maxTurns}
                  onChange={(e) => setMaxTurns(Number(e.target.value))}
                  min={2}
                  max={20}
                />
              </div>
              <div>
                <label className="text-muted-foreground mb-1 block text-xs">예산 (토큰)</label>
                <input
                  type="number"
                  className="bg-background w-full rounded-lg border px-3 py-2 text-sm"
                  value={budgetTokens}
                  onChange={(e) => setBudgetTokens(Number(e.target.value))}
                  min={1000}
                  step={1000}
                />
              </div>
            </div>
          )}
        </div>

        {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

        <Button onClick={() => void handleCreate()} disabled={creating || !personaA || !personaB}>
          {creating ? "생성 중..." : "세션 생성"}
        </Button>
      </div>

      {/* 세션 목록 */}
      <div className="rounded-lg border">
        <div className="p-5 pb-3">
          <h3 className="text-sm font-semibold">세션 목록</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            세션을 클릭하면 판정 보고서를 확인할 수 있습니다
          </p>
        </div>

        {loading ? (
          <div className="px-5 pb-5">
            <p className="text-muted-foreground text-sm">로딩 중...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-5 pb-5">
            <p className="text-muted-foreground text-sm">아직 세션이 없습니다.</p>
          </div>
        ) : (
          <div>
            {sessions.map((s) => {
              const isExpanded = expandedSessionId === s.id
              const extraCount = s.extraParticipants?.length ?? 0
              const participantsLabel =
                extraCount > 0
                  ? `${s.participantAName} vs ${s.participantBName} +${extraCount}명`
                  : `${s.participantAName} vs ${s.participantBName}`

              return (
                <div key={s.id} className="border-t first:border-t-0">
                  <button
                    type="button"
                    className="hover:bg-muted/50 flex w-full items-center gap-4 px-5 py-3 text-left transition"
                    onClick={() => setExpandedSessionId(isExpanded ? null : s.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{s.topic}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="text-muted-foreground truncate text-xs">
                          {participantsLabel}
                        </p>
                        {s.mode === "SPARRING_1VN" && (
                          <Badge variant="outline" className="text-[10px]">
                            1:N
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {s.overallScore !== null && (
                        <span
                          className={`text-sm font-bold tabular-nums ${
                            s.overallScore >= 0.8
                              ? "text-emerald-500"
                              : s.overallScore >= 0.6
                                ? "text-blue-500"
                                : s.overallScore >= 0.4
                                  ? "text-amber-500"
                                  : "text-red-500"
                          }`}
                        >
                          {(s.overallScore * 100).toFixed(0)}점
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {s.turnCount}/{s.maxTurns}턴
                      </span>
                      <StatusBadge status={s.status} />
                      <span className="text-muted-foreground w-14 text-right text-xs">
                        {timeAgo(s.createdAt)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="text-muted-foreground h-4 w-4" />
                      ) : (
                        <ChevronDown className="text-muted-foreground h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {/* 세션 상세 보고서 인라인 패널 */}
                  {isExpanded && (
                    <SessionDetailPanel
                      sessionId={s.id}
                      onClose={() => setExpandedSessionId(null)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
