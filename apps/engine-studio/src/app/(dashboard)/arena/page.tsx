"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

import type {
  ArenaSessionSummary,
  PersonaOption,
  ProfileLevel,
  ArenaMode,
} from "./arena-session-list"
import { StatusBadge, timeAgo, TurnViewer } from "./arena-session-list"
import { ArenaCreationForm, type ArenaFormState } from "./arena-runner"
import { SessionDetailPanel } from "./arena-results"

// ── 메인 페이지 ──────────────────────────────────────────────

export default function ArenaAdminPage() {
  const [sessions, setSessions] = useState<ArenaSessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  // 폼 상태
  const [form, setForm] = useState<ArenaFormState>({
    arenaMode: "1v1" as ArenaMode,
    personaA: null,
    personaB: null,
    extraPersonas: [null],
    topic: "",
    maxTurns: 6,
    budgetTokens: 10000,
    profileLoadLevel: "STANDARD" as ProfileLevel,
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // 세션 상세 패널
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  // 세션 액션
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
    const {
      personaA,
      personaB,
      topic,
      arenaMode,
      extraPersonas,
      maxTurns,
      budgetTokens,
      profileLoadLevel,
    } = form

    if (!personaA || !personaB || !topic.trim()) {
      setCreateError("참가자 2명과 주제를 입력하세요.")
      return
    }
    if (personaA.id === personaB.id) {
      setCreateError("서로 다른 참가자를 선택하세요.")
      return
    }

    const extraIds =
      arenaMode === "1vN"
        ? extraPersonas.filter((p): p is PersonaOption => p !== null).map((p) => p.id)
        : []

    setCreating(true)
    setCreateError(null)
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
        setForm((prev) => ({
          ...prev,
          personaA: null,
          personaB: null,
          extraPersonas: [null],
          topic: "",
        }))
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
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED")
  const pendingCount = sessions.filter((s) => s.status === "PENDING").length
  const scoredSessions = sessions.filter((s) => s.overallScore !== null)
  const avgScore =
    scoredSessions.length > 0
      ? scoredSessions.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / scoredSessions.length
      : 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header title="아레나 관리" description="페르소나 1:1 · 1:N 스파링 세션 생성 및 결과 리뷰" />

      {/* 통계 카드 */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-xs">총 세션</p>
            <p className="text-2xl font-bold">{sessions.length}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-xs">완료</p>
            <p className="text-2xl font-bold">{completedSessions.length}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-muted-foreground text-xs">대기 중</p>
            <p className="text-2xl font-bold text-orange-500">{pendingCount}</p>
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
      <ArenaCreationForm
        form={form}
        onFormChange={setForm}
        onCreate={() => void handleCreate()}
        creating={creating}
        createError={createError}
      />

      {/* 세션 목록 */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h3 className="text-sm font-semibold">세션 목록</h3>
            <p className="text-muted-foreground mt-0.5 text-xs">
              세션을 클릭하면 판정 보고서를 확인할 수 있습니다
            </p>
          </div>
          {pendingCount > 0 && (
            <p className="text-muted-foreground text-xs">▶ 버튼을 눌러 PENDING 세션을 실행하세요</p>
          )}
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
                  <div className="hover:bg-muted/50 flex w-full items-center gap-4 px-5 py-3 transition">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setExpandedSessionId(isExpanded ? null : s.id)}
                    >
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
                    </button>
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

                      {/* 실행 버튼 (PENDING만) */}
                      {s.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleRun(s.id)}
                          disabled={runningSessions.has(s.id)}
                        >
                          {runningSessions.has(s.id) ? "실행 중..." : "▶ 실행"}
                        </Button>
                      )}

                      {/* 삭제 버튼 (RUNNING 제외) */}
                      {s.status !== "RUNNING" && (
                        <button
                          type="button"
                          className="text-muted-foreground text-xs transition hover:text-red-500"
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingSessions.has(s.id)}
                          title="세션 삭제"
                        >
                          ✕
                        </button>
                      )}

                      {isExpanded ? (
                        <ChevronUp className="text-muted-foreground h-4 w-4" />
                      ) : (
                        <ChevronDown className="text-muted-foreground h-4 w-4" />
                      )}
                    </div>
                  </div>

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

      {/* 턴 뷰어 모달 */}
      {viewingSession && (
        <TurnViewer session={viewingSession} onClose={() => setViewingSession(null)} />
      )}
    </div>
  )
}
