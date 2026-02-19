"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

export default function SchedulerControlPage() {
  const [data, setData] = useState<SchedulerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [lastTriggerResult, setLastTriggerResult] = useState<TriggerResult | null>(null)

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

  async function triggerNow() {
    setTriggering(true)
    setLastTriggerResult(null)
    try {
      const res = await fetch("/api/internal/persona-world-admin/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_now" }),
      })
      const json = (await res.json()) as { success: boolean; data?: TriggerResult }
      if (json.data) {
        setLastTriggerResult(json.data)
      }
      void fetchData()
    } catch {
      setLastTriggerResult({ message: "Network error — 스케줄러 호출 실패" })
    } finally {
      setTriggering(false)
    }
  }

  async function handlePersonaAction(personaId: string, action: string) {
    await fetch("/api/internal/persona-world-admin/scheduler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, personaId }),
    })
    void fetchData()
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Header title="Scheduler Control" description="자율 스케줄러 제어 및 모니터링" />
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  const execution = lastTriggerResult?.result?.execution
  const decisions = lastTriggerResult?.result?.decisions

  return (
    <div className="space-y-6 p-6">
      <Header title="Scheduler Control" description="자율 스케줄러 제어 및 모니터링" />

      {error && <div className="text-destructive">{error}</div>}

      {/* Status Cards */}
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

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button onClick={triggerNow} disabled={triggering}>
          {triggering ? "실행 중..." : "지금 실행"}
        </Button>
        {triggering && (
          <span className="text-muted-foreground animate-pulse text-sm">
            스케줄러 파이프라인 실행 중 (LLM 호출 포함, 최대 수십 초 소요)...
          </span>
        )}
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
  )
}
