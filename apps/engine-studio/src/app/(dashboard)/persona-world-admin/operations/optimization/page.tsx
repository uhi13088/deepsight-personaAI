"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Zap,
  RefreshCw,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Clock,
  Activity,
} from "lucide-react"

// ── 타입 정의 ─────────────────────────────────────────────────

interface OptimizationStatus {
  activePersonaCount: number
  activeFeatures: string[]
  nextTarget: { feature: string; minPersonaCount: number; remaining: number } | null
  haikuRoutingEnabled: boolean
  batchCommentEnabled: boolean
}

interface ThresholdConfig {
  feature: string
  minPersonaCount: number
  description: string
  active: boolean
}

interface HaikuStats {
  totalHaikuCalls: number
  totalSonnetCalls: number
  haikuCostTotal: number
  sonnetCostTotal: number
  estimatedSavings: number
}

interface ModelComparison {
  callType: string
  modelA: { model: string; avgCost: number; avgDuration: number; sampleCount: number }
  modelB: { model: string; avgCost: number; avgDuration: number; sampleCount: number }
  costSavingsPercent: number
  durationDiffPercent: number
  sufficientSamples: boolean
}

interface OptimizationAlert {
  type: string
  severity: string
  message: string
  timestamp: number
}

interface LogEntry {
  callType: string
  model: string
  costUsd: number
  durationMs: number
  routingReason: string | null
  batchGroupId: string | null
  isRegenerated: boolean
  createdAt: string
}

interface DashboardData {
  status: OptimizationStatus
  config: {
    haikuWhitelist: string[]
    batchConfig: { maxBatchSize: number; qualityThreshold: number; maxRegenerationAttempts: number }
    thresholds: ThresholdConfig[]
  }
  report: {
    period: { startDate: string; endDate: string; days: number }
    haikuStats: HaikuStats
    modelComparisons: ModelComparison[]
    batchComparison: {
      batchAvgCost: number
      individualAvgCost: number
      costSavingsPercent: number
      sufficientSamples: boolean
    } | null
    alerts: OptimizationAlert[]
  }
  recentLogs: LogEntry[]
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function OptimizationPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState(7)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/internal/persona-world-admin/operations/optimization?days=${days}&limit=50`
      )
      const json = (await res.json()) as {
        success: boolean
        data?: DashboardData
        error?: { message: string }
      }
      if (json.success && json.data) {
        setData(json.data)
      } else {
        setError(json.error?.message ?? "데이터 로딩 실패")
      }
    } catch {
      setError("서버 연결 실패")
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header
        title="v4.1 최적화 모니터"
        description="자동 비용 최적화 + 품질 보호 실시간 모니터링"
      />

      {/* 기간 선택 + 새로고침 */}
      <div className="flex items-center gap-3">
        {[7, 14, 30].map((d) => (
          <Button
            key={d}
            variant={days === d ? "default" : "outline"}
            size="sm"
            onClick={() => setDays(d)}
          >
            {d}일
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={() => void fetchData()} disabled={loading}>
          <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </div>

      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading && !data && <LoadingSkeleton />}

      {data && (
        <>
          {/* 현재 최적화 상태 */}
          <StatusSection status={data.status} thresholds={data.config.thresholds} />

          {/* Haiku 라우팅 통계 */}
          <HaikuStatsSection
            stats={data.report.haikuStats}
            whitelist={data.config.haikuWhitelist}
          />

          {/* A/B 비교 */}
          <ABComparisonSection
            modelComparisons={data.report.modelComparisons}
            batchComparison={data.report.batchComparison}
          />

          {/* 경고 */}
          {data.report.alerts.length > 0 && <AlertsSection alerts={data.report.alerts} />}

          {/* 최근 로그 */}
          <RecentLogsSection logs={data.recentLogs} />
        </>
      )}
    </div>
  )
}

// ── 서브 컴포넌트 ────────────────────────────────────────────

function StatusSection({
  status,
  thresholds,
}: {
  status: OptimizationStatus
  thresholds: ThresholdConfig[]
}) {
  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Zap className="h-5 w-5 text-yellow-400" />
        현재 최적화 상태
      </h2>
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="활성 페르소나" value={status.activePersonaCount} />
        <StatCard label="활성 최적화" value={`${status.activeFeatures.length}/5`} />
        <StatCard
          label="Haiku 라우팅"
          value={status.haikuRoutingEnabled ? "ON" : "OFF"}
          valueColor={status.haikuRoutingEnabled ? "text-green-400" : "text-zinc-500"}
        />
        <StatCard
          label="배치 댓글"
          value={status.batchCommentEnabled ? "ON" : "OFF"}
          valueColor={status.batchCommentEnabled ? "text-green-400" : "text-zinc-500"}
        />
      </div>

      {/* 임계값 진행 바 */}
      <div className="space-y-2">
        {thresholds.map((t) => (
          <div key={t.feature} className="flex items-center gap-3 text-sm">
            <Badge variant={t.active ? "default" : "secondary"} className="w-8 text-center text-xs">
              {t.active ? "ON" : "-"}
            </Badge>
            <span className="w-32 text-zinc-400">{t.description}</span>
            <span className="text-xs text-zinc-500">{t.minPersonaCount}+</span>
          </div>
        ))}
      </div>

      {status.nextTarget && (
        <p className="mt-3 text-sm text-zinc-400">
          다음 활성화: <span className="text-yellow-400">{status.nextTarget.feature}</span> —{" "}
          {status.nextTarget.remaining}개 더 필요
        </p>
      )}
    </section>
  )
}

function HaikuStatsSection({ stats, whitelist }: { stats: HaikuStats; whitelist: string[] }) {
  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <TrendingUp className="h-5 w-5 text-blue-400" />
        Haiku 라우팅 통계
      </h2>
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Haiku 호출" value={stats.totalHaikuCalls} />
        <StatCard label="Sonnet 호출" value={stats.totalSonnetCalls} />
        <StatCard label="Haiku 비용" value={`$${stats.haikuCostTotal.toFixed(4)}`} />
        <StatCard
          label="추정 절감"
          value={`$${stats.estimatedSavings.toFixed(4)}`}
          valueColor="text-green-400"
        />
      </div>
      <div className="text-xs text-zinc-500">화이트리스트: {whitelist.join(", ")}</div>
    </section>
  )
}

function ABComparisonSection({
  modelComparisons,
  batchComparison,
}: {
  modelComparisons: ModelComparison[]
  batchComparison: DashboardData["report"]["batchComparison"]
}) {
  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Activity className="h-5 w-5 text-purple-400" />
        A/B 비교
      </h2>

      {modelComparisons.length === 0 && !batchComparison ? (
        <p className="text-sm text-zinc-500">비교 데이터 없음 (최소 샘플 필요)</p>
      ) : (
        <div className="space-y-3">
          {modelComparisons.map((c) => (
            <div
              key={c.callType}
              className="flex items-center justify-between rounded border border-zinc-700 px-4 py-2 text-sm"
            >
              <span className="font-mono text-zinc-300">{c.callType}</span>
              <div className="flex items-center gap-4">
                <span className="text-zinc-400">Haiku: ${c.modelA.avgCost.toFixed(6)}</span>
                <span className="text-zinc-400">Sonnet: ${c.modelB.avgCost.toFixed(6)}</span>
                <Badge variant={c.costSavingsPercent > 0 ? "default" : "secondary"}>
                  {c.costSavingsPercent > 0 ? "-" : ""}
                  {c.costSavingsPercent.toFixed(1)}%
                </Badge>
                {!c.sufficientSamples && <span className="text-xs text-yellow-500">샘플 부족</span>}
              </div>
            </div>
          ))}

          {batchComparison && (
            <div className="flex items-center justify-between rounded border border-zinc-700 px-4 py-2 text-sm">
              <span className="font-mono text-zinc-300">배치 vs 개별 댓글</span>
              <div className="flex items-center gap-4">
                <span className="text-zinc-400">
                  배치: ${batchComparison.batchAvgCost.toFixed(6)}
                </span>
                <span className="text-zinc-400">
                  개별: ${batchComparison.individualAvgCost.toFixed(6)}
                </span>
                <Badge variant={batchComparison.costSavingsPercent > 0 ? "default" : "secondary"}>
                  {batchComparison.costSavingsPercent > 0 ? "-" : ""}
                  {batchComparison.costSavingsPercent.toFixed(1)}%
                </Badge>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function AlertsSection({ alerts }: { alerts: OptimizationAlert[] }) {
  const icons: Record<string, typeof AlertTriangle> = {
    quality_drop: AlertTriangle,
    cost_savings: DollarSign,
    performance_change: Clock,
  }
  const colors: Record<string, string> = {
    info: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    warning: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    critical: "text-red-400 border-red-500/30 bg-red-500/10",
  }

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <AlertTriangle className="h-5 w-5 text-yellow-400" />
        자동 경고
      </h2>
      {alerts.map((alert, i) => {
        const Icon = icons[alert.type] ?? AlertTriangle
        return (
          <div
            key={i}
            className={`flex items-center gap-3 rounded border p-3 text-sm ${colors[alert.severity] ?? colors.info}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {alert.message}
          </div>
        )
      })}
    </section>
  )
}

function RecentLogsSection({ logs }: { logs: LogEntry[] }) {
  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900 p-5">
      <h2 className="mb-4 text-lg font-semibold">최근 LLM 호출 로그</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-700 text-left text-zinc-400">
              <th className="py-2 pr-3">시간</th>
              <th className="py-2 pr-3">callType</th>
              <th className="py-2 pr-3">모델</th>
              <th className="py-2 pr-3">비용</th>
              <th className="py-2 pr-3">지연</th>
              <th className="py-2 pr-3">라우팅</th>
              <th className="py-2">배치</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i} className="border-b border-zinc-800 text-zinc-300">
                <td className="py-1.5 pr-3 text-zinc-500">
                  {new Date(log.createdAt).toLocaleTimeString("ko-KR")}
                </td>
                <td className="py-1.5 pr-3 font-mono">{log.callType}</td>
                <td className="py-1.5 pr-3">
                  <Badge
                    variant={log.model.includes("haiku") ? "outline" : "secondary"}
                    className="text-xs"
                  >
                    {log.model.includes("haiku") ? "Haiku" : "Sonnet"}
                  </Badge>
                </td>
                <td className="py-1.5 pr-3">${log.costUsd.toFixed(6)}</td>
                <td className="py-1.5 pr-3">{log.durationMs}ms</td>
                <td className="py-1.5 pr-3 text-zinc-500">{log.routingReason ?? "-"}</td>
                <td className="py-1.5">
                  {log.batchGroupId ? (
                    <Badge variant="outline" className="text-xs">
                      B
                    </Badge>
                  ) : (
                    "-"
                  )}
                  {log.isRegenerated && (
                    <Badge variant="destructive" className="ml-1 text-xs">
                      R
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <p className="py-4 text-center text-sm text-zinc-500">로그 없음</p>}
      </div>
    </section>
  )
}

function StatCard({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string | number
  valueColor?: string
}) {
  return (
    <div className="rounded border border-zinc-700 p-3">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${valueColor ?? "text-zinc-100"}`}>{value}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-40 animate-pulse rounded-lg bg-zinc-800" />
      ))}
    </div>
  )
}
