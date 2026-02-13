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

export default function SchedulerControlPage() {
  const [data, setData] = useState<SchedulerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)

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
    try {
      await fetch("/api/internal/persona-world-admin/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_now" }),
      })
      void fetchData()
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
      <div className="flex gap-3">
        <Button onClick={triggerNow} disabled={triggering}>
          {triggering ? "실행 중..." : "지금 실행"}
        </Button>
      </div>

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
