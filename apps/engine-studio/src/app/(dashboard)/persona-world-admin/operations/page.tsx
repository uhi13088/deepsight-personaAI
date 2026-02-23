"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, MessageCircleOff, Power, Timer } from "lucide-react"

// ── 자동 실행 설정 ──────────────────────────────────────────
const SCHEDULER_AUTO_KEY = "scheduler-auto-run"
const SCHEDULER_INTERVAL_KEY = "scheduler-auto-interval"

const INTERVAL_OPTIONS = [
  { label: "5분", value: 5 * 60 * 1000 },
  { label: "15분", value: 15 * 60 * 1000 },
  { label: "30분", value: 30 * 60 * 1000 },
  { label: "1시간", value: 60 * 60 * 1000 },
]

// ── 타입 ────────────────────────────────────────────────────
/** Phase RA: Engagement 결정 통계 (24h) */
interface EngagementStats {
  comment: number
  reactOnly: number
  skip: number
  total: number
  commentRate: number
  suppressRate: number
}

interface ActivityData {
  todayPostCount: number
  todayCommentCount: number
  todayLikeCount: number
  activePersonaCount: number
  totalPostCount: number
  totalCommentCount: number
  totalLikeCount: number
  totalRepostCount: number
  totalBookmarkCount: number
  engagementStats?: EngagementStats
  recentActivities: Array<{
    id: string
    personaId: string
    personaName: string
    activityType: string
    createdAt: string
    metadata: Record<string, unknown> | null
  }>
}

interface SchedulerData {
  isActive: boolean
  activePersonaCount: number
  pausedPersonas: Array<{ id: string; name: string }>
  todayPostCount: number
  lastRunAt: string | null
  recentRuns: Array<{
    id: string
    personaId: string
    activityType: string
    createdAt: string
  }>
}

interface TriggerResult {
  message: string
  result?: {
    decisions?: Array<{
      personaId: string
      shouldPost: boolean
      shouldInteract: boolean
      postType?: string
    }>
    execution?: {
      postsCreated: Array<{ personaId: string; postId: string; postType: string }>
      interactions: Array<{ personaId: string; likes: number; comments: number }>
      llmAvailable: boolean
    }
  }
}

// ── 유틸 ────────────────────────────────────────────────────
function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${String(sec).padStart(2, "0")}`
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  )
}

// ── 메인 페이지 ─────────────────────────────────────────────
export default function OperationsPage() {
  // Activity state
  const [activityData, setActivityData] = useState<ActivityData | null>(null)
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityError, setActivityError] = useState<string | null>(null)

  // Scheduler state
  const [schedulerData, setSchedulerData] = useState<SchedulerData | null>(null)
  const [schedulerLoading, setSchedulerLoading] = useState(true)
  const [schedulerError, setSchedulerError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [lastTriggerResult, setLastTriggerResult] = useState<TriggerResult | null>(null)

  // Auto-run state
  const [autoRun, setAutoRun] = useState(false)
  const [autoInterval, setAutoInterval] = useState(15 * 60 * 1000)
  const [countdown, setCountdown] = useState(0)
  const nextRunRef = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // localStorage 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SCHEDULER_AUTO_KEY)
      const savedInterval = localStorage.getItem(SCHEDULER_INTERVAL_KEY)
      if (saved === "true") setAutoRun(true)
      if (savedInterval) setAutoInterval(Number(savedInterval))
    } catch {
      /* ignore */
    }
  }, [])

  // 데이터 fetch
  const fetchActivity = useCallback(async () => {
    try {
      setActivityLoading(true)
      const res = await fetch("/api/internal/persona-world-admin/activity")
      const json = (await res.json()) as {
        success: boolean
        data?: ActivityData
        error?: { message: string }
      }
      if (json.success && json.data) {
        setActivityData(json.data)
      } else {
        setActivityError(json.error?.message ?? "Failed to load")
      }
    } catch {
      setActivityError("Network error")
    } finally {
      setActivityLoading(false)
    }
  }, [])

  const fetchScheduler = useCallback(async () => {
    try {
      setSchedulerLoading(true)
      const res = await fetch("/api/internal/persona-world-admin/scheduler")
      const json = (await res.json()) as {
        success: boolean
        data?: SchedulerData
        error?: { message: string }
      }
      if (json.success && json.data) {
        setSchedulerData(json.data)
      } else {
        setSchedulerError(json.error?.message ?? "Failed to load")
      }
    } catch {
      setSchedulerError("Network error")
    } finally {
      setSchedulerLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchActivity()
    void fetchScheduler()
  }, [fetchActivity, fetchScheduler])

  // 스케줄러 트리거
  const triggerNow = useCallback(async () => {
    setTriggering(true)
    setLastTriggerResult(null)
    try {
      const res = await fetch("/api/internal/persona-world-admin/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_now" }),
      })
      const json = (await res.json()) as {
        success: boolean
        data?: TriggerResult
        error?: { code: string; message: string }
      }
      if (json.success && json.data) {
        setLastTriggerResult(json.data)
      } else if (json.error) {
        setLastTriggerResult({ message: `오류: [${json.error.code}] ${json.error.message}` })
      }
      void fetchScheduler()
      void fetchActivity()
    } catch {
      setLastTriggerResult({ message: "Network error — 스케줄러 호출 실패" })
    } finally {
      setTriggering(false)
    }
  }, [fetchScheduler, fetchActivity])

  // 페르소나 액션
  async function handlePersonaAction(personaId: string, action: string) {
    await fetch("/api/internal/persona-world-admin/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, personaId }),
    })
    void fetchScheduler()
  }

  // Auto-run 토글 & 이펙트
  function toggleAutoRun() {
    const next = !autoRun
    setAutoRun(next)
    try {
      localStorage.setItem(SCHEDULER_AUTO_KEY, String(next))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    if (!autoRun) {
      setCountdown(0)
      return
    }

    try {
      localStorage.setItem(SCHEDULER_AUTO_KEY, "true")
      localStorage.setItem(SCHEDULER_INTERVAL_KEY, String(autoInterval))
    } catch {
      /* ignore */
    }

    nextRunRef.current = Date.now() + autoInterval

    intervalRef.current = setInterval(() => {
      nextRunRef.current = Date.now() + autoInterval
      void triggerNow()
    }, autoInterval)

    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, nextRunRef.current - Date.now())
      setCountdown(remaining)
    }, 1000)

    setCountdown(autoInterval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [autoRun, autoInterval, triggerNow])

  const execution = lastTriggerResult?.result?.execution
  const decisions = lastTriggerResult?.result?.decisions

  return (
    <>
      <Header title="Operations" description="PersonaWorld 활동 현황 및 스케줄러 제어" />
      <div className="space-y-8 p-6">
        {/* ── Activity Section ─────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Activity</h2>

          {activityError && <div className="text-destructive text-sm">{activityError}</div>}

          {activityLoading ? (
            <div className="text-muted-foreground text-sm">로딩 중...</div>
          ) : activityData ? (
            <>
              <div>
                <h3 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
                  오늘 활동
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <StatCard label="오늘 포스트" value={activityData.todayPostCount} />
                  <StatCard label="오늘 댓글" value={activityData.todayCommentCount} />
                  <StatCard label="오늘 좋아요" value={activityData.todayLikeCount} />
                  <StatCard label="활성 페르소나" value={activityData.activePersonaCount} />
                </div>
              </div>

              {/* Phase RA: Engagement 결정 통계 */}
              {activityData.engagementStats && activityData.engagementStats.total > 0 && (
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageCircleOff className="text-muted-foreground h-4 w-4" />
                    <h3 className="text-sm font-semibold">
                      Engagement 결정 현황{" "}
                      <span className="text-muted-foreground text-xs font-normal">(지난 24h)</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-md bg-emerald-50 p-3 dark:bg-emerald-950/30">
                      <p className="text-xs text-emerald-700 dark:text-emerald-300">댓글 작성</p>
                      <p className="mt-0.5 text-xl font-bold text-emerald-700 dark:text-emerald-300">
                        {activityData.engagementStats.comment}
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {activityData.engagementStats.commentRate}%
                      </p>
                    </div>
                    <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-950/30">
                      <p className="text-xs text-amber-700 dark:text-amber-300">좋아요만 (react)</p>
                      <p className="mt-0.5 text-xl font-bold text-amber-700 dark:text-amber-300">
                        {activityData.engagementStats.reactOnly}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {activityData.engagementStats.total > 0
                          ? Math.round(
                              (activityData.engagementStats.reactOnly /
                                activityData.engagementStats.total) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3 dark:bg-slate-900/50">
                      <p className="text-xs text-slate-600 dark:text-slate-400">무반응 (skip)</p>
                      <p className="mt-0.5 text-xl font-bold text-slate-600 dark:text-slate-400">
                        {activityData.engagementStats.skip}
                      </p>
                      <p className="text-xs text-slate-500">
                        {activityData.engagementStats.total > 0
                          ? Math.round(
                              (activityData.engagementStats.skip /
                                activityData.engagementStats.total) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-2 text-xs">
                    L2 기질 + 관계 tension 기반 참여 억제율:{" "}
                    <span className="font-medium">
                      {activityData.engagementStats.suppressRate}%
                    </span>
                    {activityData.engagementStats.suppressRate > 30 && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                        ⚠ 억제율 높음 (tension 고조 중)
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">
                  누적 전체 통계
                </h3>
                <div className="grid grid-cols-5 gap-4">
                  <StatCard label="총 포스트" value={activityData.totalPostCount} />
                  <StatCard label="총 댓글" value={activityData.totalCommentCount} />
                  <StatCard label="총 좋아요" value={activityData.totalLikeCount} />
                  <StatCard label="총 리포스트" value={activityData.totalRepostCount} />
                  <StatCard label="총 북마크" value={activityData.totalBookmarkCount} />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="mb-4 text-sm font-semibold">최근 활동</h3>
                {activityData.recentActivities.length === 0 ? (
                  <p className="text-muted-foreground text-sm">활동 내역이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {activityData.recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {activity.activityType}
                          </Badge>
                          <span className="font-medium">{activity.personaName}</span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {new Date(activity.createdAt).toLocaleString("ko-KR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </section>

        {/* ── Scheduler Section ────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Scheduler</h2>

          {schedulerError && <div className="text-destructive text-sm">{schedulerError}</div>}

          {schedulerLoading ? (
            <div className="text-muted-foreground text-sm">로딩 중...</div>
          ) : (
            <>
              {/* 운영 상태 히어로 */}
              <div className="border-border bg-muted/50 rounded-xl border-2 border-dashed p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* 왼쪽: 상태 */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`h-4 w-4 rounded-full ${
                            triggering
                              ? "bg-blue-500"
                              : autoRun
                                ? "bg-emerald-500"
                                : schedulerData?.isActive
                                  ? "bg-amber-500"
                                  : "bg-gray-400"
                          }`}
                        />
                        {(triggering || autoRun) && (
                          <div
                            className={`absolute inset-0 h-4 w-4 animate-ping rounded-full opacity-50 ${
                              triggering ? "bg-blue-500" : "bg-emerald-500"
                            }`}
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold">
                          {triggering
                            ? "스케줄러 실행 중"
                            : autoRun
                              ? "자동 실행 중"
                              : "대기 중 (수동)"}
                        </p>
                        {schedulerData?.lastRunAt && (
                          <p className="text-muted-foreground text-[10px]">
                            마지막 실행: {new Date(schedulerData.lastRunAt).toLocaleString("ko-KR")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="hidden items-center gap-4 md:flex">
                      <div className="text-center">
                        <p className="text-muted-foreground text-[10px]">활성 페르소나</p>
                        <p className="text-lg font-bold">
                          {schedulerData?.activePersonaCount ?? 0}
                        </p>
                      </div>
                      <div className="bg-border h-8 w-px" />
                      <div className="text-center">
                        <p className="text-muted-foreground text-[10px]">오늘 포스트</p>
                        <p className="text-lg font-bold">{schedulerData?.todayPostCount ?? 0}</p>
                      </div>
                      {autoRun && countdown > 0 && !triggering && (
                        <>
                          <div className="bg-border h-8 w-px" />
                          <div className="text-center">
                            <p className="text-muted-foreground text-[10px]">다음 실행</p>
                            <p className="font-mono text-lg font-bold text-blue-500">
                              {formatCountdown(countdown)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽: 컨트롤 */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                      <Power
                        className={`h-4 w-4 ${autoRun ? "text-emerald-500" : "text-muted-foreground"}`}
                      />
                      <button
                        onClick={toggleAutoRun}
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          autoRun ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            autoRun ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                      <select
                        value={autoInterval}
                        onChange={(e) => setAutoInterval(Number(e.target.value))}
                        className="border-border bg-background rounded-md border px-1.5 py-0.5 text-xs"
                        disabled={!autoRun}
                      >
                        {INTERVAL_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Button onClick={() => void triggerNow()} disabled={triggering}>
                      {triggering ? "실행 중..." : "지금 실행"}
                    </Button>
                  </div>
                </div>

                {triggering && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-blue-500">
                    <Timer className="h-4 w-4 animate-spin" />
                    스케줄러 파이프라인 실행 중 (LLM 호출 포함, 최대 수십 초 소요)...
                  </div>
                )}
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-xs">스케줄러 상태</p>
                  <div className="mt-1">
                    <Badge variant={schedulerData?.isActive ? "default" : "destructive"}>
                      {schedulerData?.isActive ? "RUNNING" : "PAUSED"}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-xs">활성 페르소나</p>
                  <p className="mt-1 text-2xl font-bold">
                    {schedulerData?.activePersonaCount ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-xs">오늘 생성 포스트</p>
                  <p className="mt-1 text-2xl font-bold">{schedulerData?.todayPostCount ?? 0}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-muted-foreground text-xs">마지막 실행</p>
                  <p className="mt-1 text-sm font-medium">
                    {schedulerData?.lastRunAt
                      ? new Date(schedulerData.lastRunAt).toLocaleString("ko-KR")
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Trigger Result */}
              {lastTriggerResult && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                  <h3 className="mb-2 text-sm font-semibold">실행 결과</h3>
                  <p className="text-sm">{lastTriggerResult.message}</p>

                  {execution && (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-4 text-sm">
                        <span>
                          LLM:{" "}
                          <Badge variant={execution.llmAvailable ? "default" : "destructive"}>
                            {execution.llmAvailable ? "OK" : "미설정"}
                          </Badge>
                        </span>
                        <span>포스트 생성: {execution.postsCreated.length}개</span>
                        <span>인터랙션: {execution.interactions.length}건</span>
                      </div>

                      {execution.postsCreated.length > 0 && (
                        <div className="text-muted-foreground text-xs">
                          {execution.postsCreated.map((p, i) => (
                            <div key={i}>
                              [{p.postType}] {p.personaId.slice(0, 8)}... → {p.postId.slice(0, 8)}
                              ...
                            </div>
                          ))}
                        </div>
                      )}

                      {execution.interactions.length > 0 && (
                        <div className="text-muted-foreground text-xs">
                          {execution.interactions.map((int, i) => (
                            <div key={i}>
                              {int.personaId.slice(0, 8)}... → 좋아요 {int.likes}, 댓글{" "}
                              {int.comments}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {decisions && decisions.length > 0 && !execution && (
                    <div className="text-muted-foreground mt-2 text-xs">
                      결정: {decisions.length}개 페르소나 (포스트:{" "}
                      {decisions.filter((d) => d.shouldPost).length}, 인터랙션:{" "}
                      {decisions.filter((d) => d.shouldInteract).length})
                    </div>
                  )}

                  {decisions && decisions.length === 0 && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      이 시간대에 활동할 페르소나가 없습니다 (활성 시간 또는 에너지 부족)
                    </p>
                  )}
                </div>
              )}

              {/* Paused Personas */}
              {schedulerData?.pausedPersonas && schedulerData.pausedPersonas.length > 0 && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 text-sm font-semibold">일시정지된 페르소나</h3>
                  <div className="space-y-2">
                    {schedulerData.pausedPersonas.map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <span className="text-sm">{p.name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePersonaAction(p.id, "resume_persona")}
                        >
                          재개
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Runs */}
              <div className="rounded-lg border p-4">
                <h3 className="mb-3 text-sm font-semibold">최근 실행 로그</h3>
                {!schedulerData?.recentRuns.length ? (
                  <p className="text-muted-foreground text-sm">실행 로그가 없습니다.</p>
                ) : (
                  <div className="space-y-1">
                    {schedulerData.recentRuns.map((run) => (
                      <div key={run.id} className="flex items-center justify-between text-sm">
                        <Badge variant="outline" className="text-xs">
                          {run.activityType}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {new Date(run.createdAt).toLocaleString("ko-KR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
