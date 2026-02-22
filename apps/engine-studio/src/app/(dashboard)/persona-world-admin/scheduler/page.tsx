"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Clock, Power, Timer } from "lucide-react"

const SCHEDULER_AUTO_KEY = "scheduler-auto-run"
const SCHEDULER_INTERVAL_KEY = "scheduler-auto-interval"

const INTERVAL_OPTIONS = [
  { label: "5분", value: 5 * 60 * 1000 },
  { label: "15분", value: 15 * 60 * 1000 },
  { label: "30분", value: 30 * 60 * 1000 },
  { label: "1시간", value: 60 * 60 * 1000 },
]

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

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${String(sec).padStart(2, "0")}`
}

export default function SchedulerControlPage() {
  const [data, setData] = useState<SchedulerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [lastTriggerResult, setLastTriggerResult] = useState<TriggerResult | null>(null)

  // Auto-run state
  const [autoRun, setAutoRun] = useState(false)
  const [autoInterval, setAutoInterval] = useState(15 * 60 * 1000)
  const [countdown, setCountdown] = useState(0)
  const nextRunRef = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // localStorage에서 auto-run 설정 복원
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/internal/persona-world-admin/scheduler")
      const json = (await res.json()) as {
        success: boolean
        data?: SchedulerData
        error?: { message: string }
      }
      if (json.success && json.data) {
        setData(json.data)
      } else {
        setError(json.error?.message ?? "Failed to load")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

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
        setLastTriggerResult({
          message: `오류: [${json.error.code}] ${json.error.message}`,
        })
      }
      void fetchData()
    } catch {
      setLastTriggerResult({ message: "Network error — 스케줄러 호출 실패" })
    } finally {
      setTriggering(false)
    }
  }, [fetchData])

  async function handlePersonaAction(personaId: string, action: string) {
    await fetch("/api/internal/persona-world-admin/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, personaId }),
    })
    void fetchData()
  }

  // Auto-run effect
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

  function toggleAutoRun() {
    const next = !autoRun
    setAutoRun(next)
    try {
      localStorage.setItem(SCHEDULER_AUTO_KEY, String(next))
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Scheduler Control" description="자율 스케줄러 제어 및 모니터링" />
        <div className="space-y-6 p-6">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </>
    )
  }

  const execution = lastTriggerResult?.result?.execution
  const decisions = lastTriggerResult?.result?.decisions

  return (
    <>
      <Header title="Scheduler Control" description="자율 스케줄러 제어 및 모니터링" />
      <div className="space-y-6 p-6">
        {error && <div className="text-destructive">{error}</div>}

        {/* 운영 상태 히어로 */}
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-5 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
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
                          : data?.isActive
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
                    {triggering ? "스케줄러 실행 중" : autoRun ? "자동 실행 중" : "대기 중 (수동)"}
                  </p>
                  {data?.lastRunAt && (
                    <p className="text-muted-foreground text-[10px]">
                      마지막 실행: {new Date(data.lastRunAt).toLocaleString("ko-KR")}
                    </p>
                  )}
                </div>
              </div>

              <div className="hidden items-center gap-4 md:flex">
                <div className="text-center">
                  <p className="text-muted-foreground text-[10px]">활성 페르소나</p>
                  <p className="text-lg font-bold">{data?.activePersonaCount ?? 0}</p>
                </div>
                <div className="bg-border h-8 w-px" />
                <div className="text-center">
                  <p className="text-muted-foreground text-[10px]">오늘 포스트</p>
                  <p className="text-lg font-bold">{data?.todayPostCount ?? 0}</p>
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

        {/* Status Cards — 간소화 (히어로에 주요 지표 이동) */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">스케줄러 상태</p>
            <div className="mt-1">
              <Badge variant={data?.isActive ? "default" : "destructive"}>
                {data?.isActive ? "RUNNING" : "PAUSED"}
              </Badge>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">활성 페르소나</p>
            <p className="mt-1 text-2xl font-bold">{data?.activePersonaCount ?? 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">오늘 생성 포스트</p>
            <p className="mt-1 text-2xl font-bold">{data?.todayPostCount ?? 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground text-xs">마지막 실행</p>
            <p className="mt-1 text-sm font-medium">
              {data?.lastRunAt ? new Date(data.lastRunAt).toLocaleString("ko-KR") : "—"}
            </p>
          </div>
        </div>

        {/* Trigger Result */}
        {lastTriggerResult && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
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
                  <div className="text-xs text-gray-600">
                    {execution.postsCreated.map((p, i) => (
                      <div key={i}>
                        [{p.postType}] {p.personaId.slice(0, 8)}... → {p.postId.slice(0, 8)}...
                      </div>
                    ))}
                  </div>
                )}

                {execution.interactions.length > 0 && (
                  <div className="text-xs text-gray-600">
                    {execution.interactions.map((int, i) => (
                      <div key={i}>
                        {int.personaId.slice(0, 8)}... → 좋아요 {int.likes}, 댓글 {int.comments}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {decisions && decisions.length > 0 && !execution && (
              <div className="mt-2 text-xs text-gray-600">
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
        {data?.pausedPersonas && data.pausedPersonas.length > 0 && (
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">일시정지된 페르소나</h3>
            <div className="space-y-2">
              {data.pausedPersonas.map((p) => (
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
          {data?.recentRuns.length === 0 ? (
            <p className="text-muted-foreground text-sm">실행 로그가 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {data?.recentRuns.map((run) => (
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
      </div>
    </>
  )
}
