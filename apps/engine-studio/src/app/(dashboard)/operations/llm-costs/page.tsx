"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DollarSign,
  Zap,
  Clock,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Hash,
  ArrowUpDown,
} from "lucide-react"

// ── 타입 정의 ──────────────────────────────────────────────────

interface DailyCost {
  date: string
  totalCostUsd: number
  totalCalls: number
  totalTokens: number
}

interface CallTypeBreakdown {
  callType: string
  totalCalls: number
  totalCostUsd: number
  totalInputTokens: number
  totalOutputTokens: number
  avgDurationMs: number
}

interface LlmCostsSummary {
  totalCostUsd: number
  totalCalls: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  avgCostPerCall: number
  avgDurationMs: number
  errorCount: number
  errorRate: number
}

interface RecentCall {
  id: string
  personaId: string | null
  callType: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
  durationMs: number
  status: string
  errorMessage: string | null
  createdAt: string
}

interface LlmCostsData {
  summary: LlmCostsSummary
  dailyCosts: DailyCost[]
  callTypeBreakdown: CallTypeBreakdown[]
  recentCalls: RecentCall[]
}

// ── 유틸 ──────────────────────────────────────────────────────

function formatUsd(value: number): string {
  if (value < 0.01) return `$${value.toFixed(6)}`
  if (value < 1) return `$${value.toFixed(4)}`
  return `$${value.toFixed(2)}`
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toString()
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${ms}ms`
}

// ── 컴포넌트 ─────────────────────────────────────────────────

export default function LlmCostsPage() {
  const [data, setData] = useState<LlmCostsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(30)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/internal/operations/llm-costs?days=${days}&limit=50`)
      const json = (await res.json()) as {
        success: boolean
        data?: LlmCostsData
        error?: { code: string; message: string }
      }
      if (!json.success || !json.data) {
        throw new Error(json.error?.message ?? "데이터 조회 실패")
      }
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류")
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 30초 간격 자동 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData()
    }, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div className="flex flex-1 flex-col">
      <Header title="LLM 비용 모니터링" description="LLM API 호출 비용 및 사용량 실시간 대시보드" />

      <main className="flex-1 space-y-6 p-6">
        {/* 기간 선택 + 새로고침 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {[7, 14, 30, 60].map((d) => (
              <Button
                key={d}
                variant={days === d ? "default" : "outline"}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d}일
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
            데이터 로딩 중...
          </div>
        ) : data ? (
          <>
            {/* 요약 카드 */}
            <SummaryCards summary={data.summary} />

            {/* 일별 비용 차트 */}
            <DailyCostChart dailyCosts={data.dailyCosts} />

            {/* 호출 유형별 통계 */}
            <CallTypeTable breakdown={data.callTypeBreakdown} />

            {/* 최근 호출 목록 */}
            <RecentCallsTable calls={data.recentCalls} />
          </>
        ) : null}
      </main>
    </div>
  )
}

// ── 요약 카드 ─────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: LlmCostsSummary }) {
  const cards = [
    {
      label: "총 비용",
      value: formatUsd(summary.totalCostUsd),
      icon: DollarSign,
      color: "text-green-500",
    },
    {
      label: "총 호출",
      value: summary.totalCalls.toLocaleString(),
      icon: Zap,
      color: "text-blue-500",
    },
    {
      label: "총 토큰",
      value: formatTokens(summary.totalTokens),
      icon: Hash,
      color: "text-purple-500",
    },
    {
      label: "평균 응답시간",
      value: formatDuration(summary.avgDurationMs),
      icon: Clock,
      color: "text-amber-500",
    },
    {
      label: "호출당 비용",
      value: formatUsd(summary.avgCostPerCall),
      icon: TrendingUp,
      color: "text-cyan-500",
    },
    {
      label: "에러율",
      value: `${(summary.errorRate * 100).toFixed(1)}%`,
      icon: AlertTriangle,
      color: summary.errorRate > 0.05 ? "text-red-500" : "text-gray-400",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-muted-foreground text-xs">{card.label}</span>
            </div>
            <p className="mt-2 text-xl font-bold">{card.value}</p>
          </div>
        )
      })}
    </div>
  )
}

// ── 일별 비용 차트 (CSS 기반 bar chart) ──────────────────────

function DailyCostChart({ dailyCosts }: { dailyCosts: DailyCost[] }) {
  if (dailyCosts.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <h3 className="mb-4 text-sm font-semibold">일별 비용 추이</h3>
        <p className="text-muted-foreground text-center text-sm">데이터가 없습니다</p>
      </div>
    )
  }

  const maxCost = Math.max(...dailyCosts.map((d) => d.totalCostUsd), 0.000001)

  return (
    <div className="bg-card rounded-lg border p-6">
      <h3 className="mb-4 text-sm font-semibold">일별 비용 추이</h3>
      <div className="flex items-end gap-1" style={{ height: 160 }}>
        {dailyCosts.map((d) => {
          const heightPct = (d.totalCostUsd / maxCost) * 100
          return (
            <div key={d.date} className="group relative flex flex-1 flex-col items-center">
              <div
                className="w-full rounded-t bg-blue-500 transition-colors hover:bg-blue-400"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              />
              {/* Tooltip */}
              <div className="bg-popover pointer-events-none absolute -top-16 z-10 hidden rounded px-2 py-1 text-xs shadow-lg group-hover:block">
                <p className="font-medium">{d.date}</p>
                <p>{formatUsd(d.totalCostUsd)}</p>
                <p>{d.totalCalls}건</p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
        <span>{dailyCosts[0]?.date}</span>
        <span>{dailyCosts[dailyCosts.length - 1]?.date}</span>
      </div>
    </div>
  )
}

// ── 호출 유형별 통계 테이블 ──────────────────────────────────

function CallTypeTable({ breakdown }: { breakdown: CallTypeBreakdown[] }) {
  if (breakdown.length === 0) return null

  return (
    <div className="bg-card rounded-lg border">
      <div className="border-b px-6 py-3">
        <h3 className="text-sm font-semibold">호출 유형별 통계</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-4 py-2 text-left font-medium">유형</th>
              <th className="px-4 py-2 text-right font-medium">호출수</th>
              <th className="px-4 py-2 text-right font-medium">비용</th>
              <th className="px-4 py-2 text-right font-medium">Input 토큰</th>
              <th className="px-4 py-2 text-right font-medium">Output 토큰</th>
              <th className="px-4 py-2 text-right font-medium">평균 응답</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((row) => (
              <tr key={row.callType} className="hover:bg-muted/30 border-b last:border-0">
                <td className="px-4 py-2">
                  <Badge variant="outline">{row.callType}</Badge>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.totalCalls.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">
                  {formatUsd(row.totalCostUsd)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatTokens(row.totalInputTokens)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatTokens(row.totalOutputTokens)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatDuration(row.avgDurationMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 최근 호출 목록 테이블 ───────────────────────────────────

function RecentCallsTable({ calls }: { calls: RecentCall[] }) {
  const [sortField, setSortField] = useState<"createdAt" | "estimatedCostUsd">("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const sorted = [...calls].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    if (sortField === "createdAt") {
      return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }
    return dir * (a.estimatedCostUsd - b.estimatedCostUsd)
  })

  function toggleSort(field: "createdAt" | "estimatedCostUsd") {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  if (calls.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <h3 className="mb-2 text-sm font-semibold">최근 호출 목록</h3>
        <p className="text-muted-foreground text-center text-sm">아직 LLM 호출 기록이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border">
      <div className="border-b px-6 py-3">
        <h3 className="text-sm font-semibold">최근 호출 목록</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-4 py-2 text-left font-medium">
                <button className="flex items-center gap-1" onClick={() => toggleSort("createdAt")}>
                  시간
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-2 text-left font-medium">유형</th>
              <th className="px-4 py-2 text-left font-medium">모델</th>
              <th className="px-4 py-2 text-right font-medium">토큰</th>
              <th className="px-4 py-2 text-right font-medium">
                <button
                  className="ml-auto flex items-center gap-1"
                  onClick={() => toggleSort("estimatedCostUsd")}
                >
                  비용
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="px-4 py-2 text-right font-medium">응답시간</th>
              <th className="px-4 py-2 text-center font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((call) => (
              <tr key={call.id} className="hover:bg-muted/30 border-b last:border-0">
                <td className="text-muted-foreground px-4 py-2 text-xs tabular-nums">
                  {new Date(call.createdAt).toLocaleString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2">
                  <Badge variant="outline" className="text-xs">
                    {call.callType}
                  </Badge>
                </td>
                <td className="text-muted-foreground max-w-[120px] truncate px-4 py-2 text-xs">
                  {call.model}
                </td>
                <td className="px-4 py-2 text-right text-xs tabular-nums">
                  <span className="text-blue-500">{formatTokens(call.inputTokens)}</span>
                  {" / "}
                  <span className="text-amber-500">{formatTokens(call.outputTokens)}</span>
                </td>
                <td className="px-4 py-2 text-right font-medium tabular-nums">
                  {formatUsd(call.estimatedCostUsd)}
                </td>
                <td className="px-4 py-2 text-right text-xs tabular-nums">
                  {formatDuration(call.durationMs)}
                </td>
                <td className="px-4 py-2 text-center">
                  {call.status === "SUCCESS" ? (
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      OK
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      ERR
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
