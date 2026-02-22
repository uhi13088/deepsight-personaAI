"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// ── 타입 ─────────────────────────────────────────────────────

interface EvolutionData {
  totalPersonas: number
  stageDistribution: Record<string, number>
  personaStages: Array<{
    id: string
    name: string
    growthArc: number
    stage: string
    version: number
  }>
  recentEvolutions: Array<{
    personaId: string
    personaName: string
    metadata: Record<string, unknown> | null
    createdAt: string
  }>
}

interface BatchResult {
  totalProcessed: number
  totalEvolved: number
  stageTransitions: number
  durationMs: number
  results: Array<{
    personaId: string
    personaName: string
    evolved: boolean
    newVersion?: number
    stageTransition?: boolean
    reason: string
  }>
}

// ── 스테이지 UI 매핑 ────────────────────────────────────────

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  "ordinary-world": { label: "일상 세계", color: "bg-gray-500" },
  "call-to-adventure": { label: "모험의 부름", color: "bg-blue-500" },
  "trials-and-growth": { label: "시련과 성장", color: "bg-yellow-500" },
  transformation: { label: "변화", color: "bg-purple-500" },
  "return-and-mastery": { label: "귀환과 성숙", color: "bg-green-500" },
}

// ── 페이지 ───────────────────────────────────────────────────

export default function EvolutionPage() {
  const [data, setData] = useState<EvolutionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/internal/persona-world-admin/evolution")
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRunEvolution = async () => {
    try {
      setRunning(true)
      setBatchResult(null)
      const res = await fetch("/api/internal/persona-world-admin/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodDays: 7 }),
      })
      const json = await res.json()
      if (json.success) {
        setBatchResult(json.data)
        await fetchData()
      }
    } catch {
      /* ignore */
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header title="L3 Evolution" description="페르소나 장기 행동 진화 모니터링" />
        <div className="space-y-6 p-6">
          <div className="text-muted-foreground flex items-center justify-center py-20">
            로딩 중...
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="L3 Evolution" description="페르소나 장기 행동 진화 모니터링" />
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-end">
          <Button onClick={handleRunEvolution} disabled={running} size="sm">
            {running ? "실행 중..." : "수동 진화 실행"}
          </Button>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryCard label="전체 페르소나" value={data?.totalPersonas ?? 0} />
          <SummaryCard label="진화된 (최근)" value={batchResult?.totalEvolved ?? "-"} />
          <SummaryCard label="스테이지 전이" value={batchResult?.stageTransitions ?? "-"} />
          <SummaryCard
            label="실행 시간"
            value={batchResult ? `${batchResult.durationMs}ms` : "-"}
          />
        </div>

        {/* 스테이지 분포 */}
        {data && (
          <div className="bg-card rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Hero&apos;s Journey 스테이지 분포</h3>
            <div className="space-y-2">
              {Object.entries(STAGE_LABELS).map(([stageId, { label, color }]) => {
                const count = data.stageDistribution[stageId] ?? 0
                const pct = data.totalPersonas > 0 ? (count / data.totalPersonas) * 100 : 0
                return (
                  <div key={stageId} className="flex items-center gap-3">
                    <span className="text-muted-foreground w-28 text-xs">{label}</span>
                    <div className="bg-muted h-4 flex-1 overflow-hidden rounded-full">
                      <div
                        className={`h-full rounded-full ${color} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-xs">
                      {count}명 ({pct.toFixed(0)}%)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 배치 결과 */}
        {batchResult && (
          <div className="bg-card rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">
              배치 실행 결과 ({batchResult.totalProcessed}명 처리)
            </h3>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="px-2 py-1 text-left">페르소나</th>
                    <th className="px-2 py-1 text-left">상태</th>
                    <th className="px-2 py-1 text-left">버전</th>
                    <th className="px-2 py-1 text-left">근거</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResult.results.map((r) => (
                    <tr key={r.personaId} className="border-border/50 border-b">
                      <td className="px-2 py-1">{r.personaName}</td>
                      <td className="px-2 py-1">
                        {r.evolved ? (
                          <Badge variant="default" className="text-[10px]">
                            진화
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            유지
                          </Badge>
                        )}
                        {r.stageTransition && (
                          <Badge
                            variant="outline"
                            className="ml-1 border-purple-500 text-[10px] text-purple-500"
                          >
                            스테이지 전이
                          </Badge>
                        )}
                      </td>
                      <td className="px-2 py-1 font-mono">
                        {r.newVersion ? `v${r.newVersion}` : "-"}
                      </td>
                      <td className="text-muted-foreground px-2 py-1">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 페르소나 스테이지 테이블 */}
        {data && (
          <div className="bg-card rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">페르소나별 현황</h3>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="px-2 py-1 text-left">이름</th>
                    <th className="px-2 py-1 text-left">growthArc</th>
                    <th className="px-2 py-1 text-left">스테이지</th>
                    <th className="px-2 py-1 text-left">벡터 버전</th>
                  </tr>
                </thead>
                <tbody>
                  {data.personaStages.map((p) => {
                    const stageInfo = STAGE_LABELS[p.stage]
                    return (
                      <tr key={p.id} className="border-border/50 border-b">
                        <td className="px-2 py-1">{p.name}</td>
                        <td className="px-2 py-1 font-mono">{p.growthArc.toFixed(3)}</td>
                        <td className="px-2 py-1">
                          <Badge variant="outline" className="text-[10px]">
                            {stageInfo?.label ?? p.stage}
                          </Badge>
                        </td>
                        <td className="px-2 py-1 font-mono">v{p.version}</td>
                      </tr>
                    )
                  })}
                  {data.personaStages.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground px-2 py-4 text-center">
                        ACTIVE 페르소나가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 최근 진화 로그 */}
        {data && data.recentEvolutions.length > 0 && (
          <div className="bg-card rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">최근 진화 이력</h3>
            <div className="max-h-48 space-y-2 overflow-auto">
              {data.recentEvolutions.map((ev, i) => {
                const meta = ev.metadata as Record<string, unknown> | null
                return (
                  <div
                    key={`${ev.personaId}-${i}`}
                    className="border-border/50 flex items-start gap-2 rounded border p-2 text-xs"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{ev.personaName}</span>
                      <span className="text-muted-foreground ml-2">
                        {new Date(ev.createdAt).toLocaleString("ko-KR")}
                      </span>
                      {Boolean(meta?.stageTransition) && (
                        <Badge
                          variant="outline"
                          className="ml-2 border-purple-500 text-[10px] text-purple-500"
                        >
                          {String(meta?.fromStage)} → {String(meta?.toStage)}
                        </Badge>
                      )}
                      <div className="text-muted-foreground mt-1">{String(meta?.reason ?? "")}</div>
                    </div>
                    <span className="text-muted-foreground font-mono">
                      v{String(meta?.version ?? "?")}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── 헬퍼 컴포넌트 ───────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-lg border p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  )
}
