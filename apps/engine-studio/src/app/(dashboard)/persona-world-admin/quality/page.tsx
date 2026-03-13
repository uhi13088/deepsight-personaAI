"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface QualityData {
  results: Array<{
    personaId: string
    personaName: string
    personaStatus: string
    checkedAt: string
    metadata: Record<string, unknown> | null
  }>
  totalChecked: number
  lastCheckAt: string | null
}

export default function QualityMonitorPage() {
  const [data, setData] = useState<QualityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/internal/persona-world-admin/quality")
      const json = (await res.json()) as {
        success: boolean
        data?: QualityData
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

  async function runCheck() {
    setRunning(true)
    try {
      await fetch("/api/internal/persona-world-admin/quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_check" }),
      })
      void fetchData()
    } finally {
      setRunning(false)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "PAUSED":
        return <Badge variant="destructive">PAUSED</Badge>
      case "ACTIVE":
        return <Badge variant="default">ACTIVE</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <>
        <Header title="Quality Monitor" description="페르소나 품질 점수 및 보이스 일관성" />
        <div className="space-y-6 p-6">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Quality Monitor" description="페르소나 품질 점수 및 보이스 일관성" />
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            마지막 체크:{" "}
            {data?.lastCheckAt ? new Date(data.lastCheckAt).toLocaleString("ko-KR") : "없음"}
          </p>
          <Button onClick={runCheck} disabled={running} size="sm">
            {running ? "실행 중..." : "품질 체크 실행"}
          </Button>
        </div>

        {error && <div className="text-destructive">{error}</div>}

        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-medium">페르소나</th>
                <th className="px-4 py-2 text-left font-medium">상태</th>
                <th className="px-4 py-2 text-left font-medium">마지막 체크</th>
                <th className="px-4 py-2 text-left font-medium">Voice</th>
                <th className="px-4 py-2 text-left font-medium">PIS</th>
                <th className="px-4 py-2 text-left font-medium">관계 건강</th>
                <th className="px-4 py-2 text-left font-medium">친밀도</th>
              </tr>
            </thead>
            <tbody>
              {data?.results.map((r) => {
                const meta = r.metadata as {
                  voiceCheck?: { similarity: number; status: string }
                  qualityGate?: { score: number; status: string }
                  relationshipHealth?: {
                    warmthTrend: "RISING" | "STABLE" | "DECLINING"
                    activeRelationships: number
                    destructivePatterns: number
                    intimacy: { avgLevel: number; recentLevelUps: number }
                  }
                } | null
                return (
                  <tr key={r.personaId} className="border-b">
                    <td className="px-4 py-2 font-medium">{r.personaName}</td>
                    <td className="px-4 py-2">{getStatusBadge(r.personaStatus)}</td>
                    <td className="text-muted-foreground px-4 py-2">
                      {new Date(r.checkedAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-2">
                      {meta?.voiceCheck ? (
                        <span
                          className={
                            meta.voiceCheck.status === "ok"
                              ? "text-green-600"
                              : meta.voiceCheck.status === "warning"
                                ? "text-amber-600"
                                : "text-red-600"
                          }
                        >
                          {meta.voiceCheck.similarity.toFixed(3)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {meta?.qualityGate ? (
                        <span
                          className={
                            meta.qualityGate.score >= 0.85
                              ? "text-green-600"
                              : meta.qualityGate.score >= 0.55
                                ? "text-amber-600"
                                : "text-red-600"
                          }
                        >
                          {meta.qualityGate.score.toFixed(3)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {meta?.relationshipHealth ? (
                        <span className="flex items-center gap-1">
                          <span
                            className={
                              meta.relationshipHealth.warmthTrend === "RISING"
                                ? "text-green-600"
                                : meta.relationshipHealth.warmthTrend === "DECLINING"
                                  ? "text-red-600"
                                  : "text-amber-600"
                            }
                          >
                            {meta.relationshipHealth.warmthTrend === "RISING"
                              ? "↑"
                              : meta.relationshipHealth.warmthTrend === "DECLINING"
                                ? "↓"
                                : "→"}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {meta.relationshipHealth.activeRelationships}관계
                          </span>
                          {meta.relationshipHealth.destructivePatterns > 0 && (
                            <Badge variant="destructive" className="ml-1 text-[10px]">
                              경고 {meta.relationshipHealth.destructivePatterns}
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {meta?.relationshipHealth?.intimacy ? (
                        <span className="text-xs">
                          Lv{meta.relationshipHealth.intimacy.avgLevel.toFixed(1)}
                          {meta.relationshipHealth.intimacy.recentLevelUps > 0 && (
                            <span className="ml-1 text-green-600">
                              +{meta.relationshipHealth.intimacy.recentLevelUps}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
