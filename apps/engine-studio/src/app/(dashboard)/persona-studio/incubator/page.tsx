"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Beaker,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Sparkles,
  Shield,
  Skull,
  ArrowRight,
  Play,
  Settings,
  Save,
  X,
  Clock,
  Power,
  Inbox,
  Timer,
} from "lucide-react"
import type {
  IncubatorDashboard,
  DailyMetric,
  StrategyMetric,
  QualityMetric,
  LifecycleMetric,
  IncubatorAlert,
} from "@/lib/incubator/dashboard"
import type { GoldenSampleMetrics } from "@/lib/incubator/golden-sample"

type TabKey = "strategy" | "quality" | "goldenSamples" | "lifecycle"

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "strategy", label: "생성 전략" },
  { key: "quality", label: "품질 메트릭" },
  { key: "goldenSamples", label: "Golden Samples" },
  { key: "lifecycle", label: "라이프사이클" },
]

interface IncubatorSettings {
  generationCostKRW: number
  testCostKRW: number
  monthlyBudgetKRW: number
  dailyLimit: number
  passThreshold: number
  strategyWeights: { userDriven: number; exploration: number; gapFilling: number }
}

const AUTO_RUN_KEY = "incubator-auto-run"
const AUTO_INTERVAL_KEY = "incubator-auto-interval"

const INTERVAL_OPTIONS = [
  { label: "5분", value: 5 * 60 * 1000 },
  { label: "15분", value: 15 * 60 * 1000 },
  { label: "30분", value: 30 * 60 * 1000 },
  { label: "1시간", value: 60 * 60 * 1000 },
]

export default function IncubatorPage() {
  const [data, setData] = useState<IncubatorDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>("strategy")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [batchTriggering, setBatchTriggering] = useState(false)
  const [batchMessage, setBatchMessage] = useState<string | null>(null)
  const [batchResults, setBatchResults] = useState<Array<{
    name: string
    status: string
    failReason: string | null
  }> | null>(null)

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
      const saved = localStorage.getItem(AUTO_RUN_KEY)
      const savedInterval = localStorage.getItem(AUTO_INTERVAL_KEY)
      if (saved === "true") setAutoRun(true)
      if (savedInterval) setAutoInterval(Number(savedInterval))
    } catch {
      /* ignore */
    }
  }, [])

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(null)
    fetch("/api/internal/incubator/dashboard")
      .then((r) => r.json())
      .then(
        (d: {
          success: boolean
          data?: IncubatorDashboard
          error?: { code: string; message: string }
        }) => {
          if (d.success && d.data) {
            setData(d.data)
          } else {
            setError(d.error?.message ?? "인큐베이터 대시보드 로드 실패")
          }
        }
      )
      .catch(() => {
        setError("인큐베이터 대시보드 로드 실패")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const triggerBatch = useCallback(async () => {
    setBatchTriggering(true)
    setBatchMessage(null)
    setBatchResults(null)
    try {
      const res = await fetch("/api/internal/incubator/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger_batch" }),
      })
      const json = (await res.json()) as {
        success: boolean
        data?: {
          message: string
          generated?: number
          passed?: number
          failed?: number
          durationMs?: number
          results?: Array<{
            name: string
            status: string
            failReason: string | null
          }>
        }
      }
      if (json.success && json.data) {
        setBatchMessage(json.data.message)
        if (json.data.results) {
          setBatchResults(json.data.results)
        }
        fetchData()
      } else {
        setBatchMessage("배치 실행 실패")
      }
    } catch {
      setBatchMessage("배치 트리거 실패")
    } finally {
      setBatchTriggering(false)
    }
  }, [fetchData])

  // Auto-run effect
  useEffect(() => {
    // Clear previous timers
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    if (!autoRun) {
      setCountdown(0)
      return
    }

    // Save to localStorage
    try {
      localStorage.setItem(AUTO_RUN_KEY, "true")
      localStorage.setItem(AUTO_INTERVAL_KEY, String(autoInterval))
    } catch {
      /* ignore */
    }

    // Set next run time
    nextRunRef.current = Date.now() + autoInterval

    // Auto-trigger interval
    intervalRef.current = setInterval(() => {
      nextRunRef.current = Date.now() + autoInterval
      void triggerBatch()
    }, autoInterval)

    // Countdown ticker (every second)
    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, nextRunRef.current - Date.now())
      setCountdown(remaining)
    }, 1000)

    setCountdown(autoInterval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [autoRun, autoInterval, triggerBatch])

  function toggleAutoRun() {
    const next = !autoRun
    setAutoRun(next)
    try {
      localStorage.setItem(AUTO_RUN_KEY, String(next))
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <>
        <Header
          title="Incubator Dashboard"
          description="Daily Batch 워크플로우 및 자가발전 시스템"
        />
        <div className="flex items-center justify-center p-8">
          <div className="text-muted-foreground text-sm">데이터를 불러오는 중...</div>
        </div>
      </>
    )
  }

  if (error || !data) {
    return (
      <>
        <Header
          title="Incubator Dashboard"
          description="Daily Batch 워크플로우 및 자가발전 시스템"
        />
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-red-400">{error ?? "데이터를 불러올 수 없습니다"}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Incubator Dashboard" description="Daily Batch 워크플로우 및 자가발전 시스템" />

      <div className="space-y-6 p-6">
        {/* 운영 상태 히어로 */}
        <OperationStatus
          data={data}
          autoRun={autoRun}
          autoInterval={autoInterval}
          countdown={countdown}
          batchTriggering={batchTriggering}
          batchMessage={batchMessage}
          batchResults={batchResults}
          onToggleAutoRun={toggleAutoRun}
          onChangeInterval={setAutoInterval}
          onTriggerBatch={triggerBatch}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* 설정 패널 */}
        {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

        {/* 핵심 지표 카드 */}
        <MetricCards data={data} />

        {/* 알림 */}
        {data.alerts.length > 0 && <AlertsSection alerts={data.alerts} />}

        {/* 7일 추이 */}
        <TrendSection dailyTrend={data.dailyTrend} />

        {/* 탭 네비게이션 */}
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        {activeTab === "strategy" && <StrategyTab strategy={data.strategy} />}
        {activeTab === "quality" && <QualityTab quality={data.quality} />}
        {activeTab === "goldenSamples" && <GoldenSamplesTab metrics={data.goldenSamples} />}
        {activeTab === "lifecycle" && <LifecycleTab lifecycle={data.lifecycle} />}
      </div>
    </>
  )
}

// ── 핵심 지표 카드 ────────────────────────────────────────────

function MetricCards({ data }: { data: IncubatorDashboard }) {
  const budgetPct = Math.round(data.monthlyBudget.budgetUtilization * 100)
  const passRatePct = Math.round(data.passRate * 100)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <MetricCard
        label="오늘 생성"
        value={String(data.todayGenerated)}
        sub={`합격 ${data.todayPassed}개`}
        icon={<Sparkles className="h-4 w-4 text-purple-400" />}
        color="purple"
      />
      <MetricCard
        label="합격률"
        value={`${passRatePct}%`}
        sub={passRatePct >= 70 ? "양호" : passRatePct >= 40 ? "주의" : "위험"}
        icon={<CheckCircle className="h-4 w-4 text-emerald-400" />}
        color={passRatePct >= 70 ? "emerald" : passRatePct >= 40 ? "amber" : "red"}
      />
      <MetricCard
        label="누적 활성"
        value={String(data.cumulativeActive)}
        sub="페르소나"
        icon={<Users className="h-4 w-4 text-blue-400" />}
        color="blue"
      />
      <MetricCard
        label="월 비용"
        value={`₩${data.monthlyBudget.totalCostKRW.toLocaleString()}`}
        sub={
          data.monthlyBudget.totalCostUsd != null
            ? `$${data.monthlyBudget.totalCostUsd.toFixed(2)} · ${data.monthlyBudget.totalCalls ?? 0}회 호출`
            : `예산 ${budgetPct}% 사용`
        }
        icon={<Beaker className="h-4 w-4 text-amber-400" />}
        color={data.monthlyBudget.isOverBudget ? "red" : budgetPct > 80 ? "amber" : "emerald"}
      />
      <MetricCard
        label="예산 잔여"
        value={`₩${data.monthlyBudget.budgetRemaining.toLocaleString()}`}
        sub={data.monthlyBudget.isOverBudget ? "초과!" : `${budgetPct}% 사용`}
        icon={<Shield className="h-4 w-4 text-cyan-400" />}
        color={data.monthlyBudget.isOverBudget ? "red" : "cyan"}
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">{label}</p>
        {icon}
      </div>
      <p className={`mt-1 text-2xl font-bold text-${color}-400`}>{value}</p>
      <p className="text-muted-foreground mt-0.5 text-[10px]">{sub}</p>
    </div>
  )
}

// ── 운영 상태 히어로 ──────────────────────────────────────────

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${String(sec).padStart(2, "0")}`
}

function OperationStatus({
  data,
  autoRun,
  autoInterval,
  countdown,
  batchTriggering,
  batchMessage,
  batchResults,
  onToggleAutoRun,
  onChangeInterval,
  onTriggerBatch,
  onOpenSettings,
}: {
  data: IncubatorDashboard
  autoRun: boolean
  autoInterval: number
  countdown: number
  batchTriggering: boolean
  batchMessage: string | null
  batchResults: Array<{ name: string; status: string; failReason: string | null }> | null
  onToggleAutoRun: () => void
  onChangeInterval: (ms: number) => void
  onTriggerBatch: () => void
  onOpenSettings: () => void
}) {
  const isRunning = batchTriggering
  const statusColor = isRunning ? "bg-blue-500" : autoRun ? "bg-emerald-500" : "bg-gray-400"
  const statusLabel = isRunning ? "배치 실행 중" : autoRun ? "자동 실행 중" : "대기 중 (수동)"

  return (
    <div className="border-border bg-muted/50 rounded-xl border-2 border-dashed p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* 왼쪽: 상태 + 지표 */}
        <div className="flex items-center gap-6">
          {/* 상태 표시 */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`h-4 w-4 rounded-full ${statusColor}`} />
              {(isRunning || autoRun) && (
                <div
                  className={`absolute inset-0 h-4 w-4 animate-ping rounded-full ${statusColor} opacity-50`}
                />
              )}
            </div>
            <div>
              <p className="text-sm font-bold">{statusLabel}</p>
              {data.lastBatchAt && (
                <p className="text-muted-foreground text-[10px]">
                  마지막 실행: {new Date(data.lastBatchAt).toLocaleString("ko-KR")}
                </p>
              )}
            </div>
          </div>

          {/* 진행도 */}
          <div className="hidden items-center gap-4 md:flex">
            <div className="text-center">
              <p className="text-muted-foreground text-[10px]">오늘 생성</p>
              <p className="text-lg font-bold">
                {data.todayGenerated}
                <span className="text-muted-foreground text-xs font-normal">
                  /{data.dailyLimit}
                </span>
              </p>
            </div>
            <div className="bg-border h-8 w-px" />
            <div className="text-center">
              <p className="text-muted-foreground text-[10px]">대기 요청</p>
              <p className="text-lg font-bold">
                {data.pendingRequestCount > 0 ? (
                  <span className="text-amber-500">{data.pendingRequestCount}</span>
                ) : (
                  <span>0</span>
                )}
              </p>
            </div>
            {autoRun && countdown > 0 && !isRunning && (
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
          {/* 자동 실행 토글 */}
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <Power
              className={`h-4 w-4 ${autoRun ? "text-emerald-500" : "text-muted-foreground"}`}
            />
            <button
              onClick={onToggleAutoRun}
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
              onChange={(e) => onChangeInterval(Number(e.target.value))}
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

          {/* 수동 실행 */}
          <Button size="sm" onClick={onTriggerBatch} disabled={batchTriggering}>
            <Play className="mr-1 h-3.5 w-3.5" />
            {batchTriggering ? "생성 중..." : "배치 실행"}
          </Button>

          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            <Settings className="mr-1 h-3.5 w-3.5" />
            설정
          </Button>
        </div>
      </div>

      {/* 실행 중 메시지 */}
      {batchTriggering && (
        <div className="mt-3 flex items-center gap-2 text-sm text-blue-500">
          <Timer className="h-4 w-4 animate-spin" />
          페르소나 배치 생성 중 (LLM 호출 포함, 수 분 소요)...
        </div>
      )}
      {batchMessage && !batchTriggering && (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-500">
          <CheckCircle className="h-4 w-4" />
          {batchMessage}
        </div>
      )}

      {/* 개별 결과 (불합격 사유 포함) */}
      {batchResults && batchResults.length > 0 && !batchTriggering && (
        <div className="mt-3 space-y-1.5">
          {batchResults.map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                r.status === "PASSED"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              <span className="font-medium">{r.name}</span>
              <span className="text-[10px] opacity-70">—</span>
              <Badge
                variant={r.status === "PASSED" ? "success" : "destructive"}
                className="text-[10px]"
              >
                {r.status === "PASSED" ? "PASSED ✓" : "FAILED ✗"}
              </Badge>
              {r.failReason && (
                <span className="text-muted-foreground ml-1 text-[10px]">{r.failReason}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 대기 요청 안내 */}
      {data.pendingRequestCount > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          <Inbox className="h-4 w-4 shrink-0" />
          사용자 페르소나 생성 요청 {data.pendingRequestCount}건 대기 중 — 다음 배치에서 처리됩니다
        </div>
      )}
    </div>
  )
}

// ── 알림 섹션 ─────────────────────────────────────────────────

function AlertsSection({ alerts }: { alerts: IncubatorAlert[] }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-medium">
        알림
        <Badge variant="warning" className="ml-2">
          {alerts.length}
        </Badge>
      </h3>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 rounded-lg p-3 ${
              alert.severity === "critical"
                ? "bg-red-500/10 text-red-400"
                : alert.severity === "warning"
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-blue-500/10 text-blue-400"
            }`}
          >
            {alert.severity === "critical" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Bell className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    alert.severity === "critical"
                      ? "destructive"
                      : alert.severity === "warning"
                        ? "warning"
                        : "info"
                  }
                >
                  {alert.severity}
                </Badge>
                <span className="text-xs font-medium">{alert.title}</span>
              </div>
              <p className="mt-1 text-xs">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 7일 추이 ──────────────────────────────────────────────────

function TrendSection({ dailyTrend }: { dailyTrend: DailyMetric[] }) {
  const sorted = [...dailyTrend].sort((a, b) => a.date.localeCompare(b.date))
  const maxGenerated = Math.max(...sorted.map((d) => d.generated), 1)

  // 7일 전체 합격률 추이
  const firstRate = sorted[0]?.passRate ?? 0
  const lastRate = sorted[sorted.length - 1]?.passRate ?? 0
  const trendDir = lastRate > firstRate ? "up" : lastRate < firstRate ? "down" : "flat"

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium">7일 추이</h3>
        <div className="flex items-center gap-1.5">
          {trendDir === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
          {trendDir === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
          {trendDir === "flat" && <Minus className="text-muted-foreground h-3.5 w-3.5" />}
          <span
            className={`text-xs font-medium ${
              trendDir === "up"
                ? "text-emerald-400"
                : trendDir === "down"
                  ? "text-red-400"
                  : "text-muted-foreground"
            }`}
          >
            합격률 {Math.round(lastRate * 100)}%
          </span>
        </div>
      </div>

      {/* 바 차트 */}
      <div className="flex items-end gap-2" style={{ height: 120 }}>
        {sorted.map((day) => {
          const passH = (day.passed / maxGenerated) * 100
          const failH = (day.failed / maxGenerated) * 100
          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-col items-center" style={{ height: 100 }}>
                <div className="flex w-full flex-col-reverse items-stretch">
                  <div className="rounded-t bg-emerald-500/60" style={{ height: `${passH}px` }} />
                  <div className="bg-red-500/40" style={{ height: `${failH}px` }} />
                </div>
              </div>
              <span className="text-muted-foreground text-[9px]">{day.date.slice(5)}</span>
            </div>
          )
        })}
      </div>

      {/* 범례 */}
      <div className="mt-3 flex items-center gap-4 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-emerald-500/60" />
          <span className="text-muted-foreground">합격</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-red-500/40" />
          <span className="text-muted-foreground">불합격</span>
        </div>
        <div className="text-muted-foreground ml-auto">
          총 비용 ₩{sorted.reduce((s, d) => s + d.costKRW, 0).toLocaleString()}
        </div>
      </div>
    </div>
  )
}

// ── 생성 전략 탭 ──────────────────────────────────────────────

function StrategyTab({ strategy }: { strategy: StrategyMetric }) {
  const total = strategy.userDriven + strategy.exploration + strategy.gapFilling
  const segments = [
    { label: "유저 기반", value: strategy.userDriven, color: "bg-blue-500" },
    { label: "탐험", value: strategy.exploration, color: "bg-purple-500" },
    { label: "GAP 충전", value: strategy.gapFilling, color: "bg-amber-500" },
  ]

  const archetypeEntries = Object.entries(strategy.archetypeDistribution).sort(
    ([, a], [, b]) => b - a
  )
  const maxArchetype = archetypeEntries[0]?.[1] ?? 1

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 전략 분포 */}
      <div className="bg-card rounded-lg border p-4">
        <h4 className="mb-3 text-xs font-medium">생성 전략 분포</h4>

        {/* 수평 바 */}
        <div className="mb-3 flex h-3 overflow-hidden rounded-full">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className={`${seg.color}/70`}
              style={{ width: `${total > 0 ? (seg.value / total) * 100 : 0}%` }}
            />
          ))}
        </div>

        <div className="space-y-2">
          {segments.map((seg) => (
            <div key={seg.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${seg.color}/70`} />
                <span>{seg.label}</span>
              </div>
              <span className="text-muted-foreground">
                {seg.value}개 ({total > 0 ? Math.round((seg.value / total) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>

        {strategy.gapRegions.length > 0 && (
          <div className="mt-4">
            <p className="text-muted-foreground mb-1 text-[10px]">GAP 영역:</p>
            <div className="flex flex-wrap gap-1">
              {strategy.gapRegions.map((r) => (
                <Badge key={r} variant="outline" className="text-[10px]">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 아키타입 분포 */}
      <div className="bg-card rounded-lg border p-4">
        <h4 className="mb-3 text-xs font-medium">아키타입 분포</h4>
        <div className="space-y-2">
          {archetypeEntries.map(([name, count]) => (
            <div key={name} className="flex items-center gap-3 text-xs">
              <span className="w-28 truncate">{name}</span>
              <div className="flex-1">
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full bg-purple-500/60"
                    style={{ width: `${(count / maxArchetype) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-muted-foreground w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 품질 메트릭 탭 ────────────────────────────────────────────

function QualityTab({ quality }: { quality: QualityMetric }) {
  const metrics = [
    { label: "일관성 평균", value: quality.avgConsistency, color: "emerald" },
    { label: "벡터 정합성", value: quality.avgVectorAlignment, color: "blue" },
    { label: "말투 일치도", value: quality.avgToneMatch, color: "purple" },
    { label: "논리 품질", value: quality.avgReasoningQuality, color: "amber" },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 점수 카드 */}
      <div className="bg-card rounded-lg border p-4">
        <h4 className="mb-3 text-xs font-medium">품질 지표</h4>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => {
            const pct = Math.round(m.value * 100)
            return (
              <div key={m.label} className={`rounded-lg bg-${m.color}-500/10 p-3 text-center`}>
                <p className="text-muted-foreground text-[10px]">{m.label}</p>
                <p className={`mt-1 text-xl font-bold text-${m.color}-400`}>{pct}%</p>
                <div className="bg-muted mx-auto mt-2 h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full bg-${m.color}-500/70`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 실패 원인 */}
      <div className="bg-card rounded-lg border p-4">
        <h4 className="mb-3 text-xs font-medium">주요 실패 원인</h4>
        {quality.topFailureReasons.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4" />
            기록된 실패 원인이 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {quality.topFailureReasons.map((fr, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-2 text-xs"
              >
                <span>{fr.reason}</span>
                <Badge variant="destructive">{fr.count}건</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Golden Samples 탭 ──────────────────────────────────────────

function GoldenSamplesTab({ metrics }: { metrics: GoldenSampleMetrics }) {
  const dimEntries = Object.entries(metrics.dimensionCoverage).sort(([, a], [, b]) => b - a)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 요약 */}
      <div className="bg-card rounded-lg border p-4">
        <h4 className="mb-3 text-xs font-medium">Golden Sample 풀</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-blue-500/10 p-3 text-center">
            <p className="text-muted-foreground text-[10px]">전체</p>
            <p className="mt-1 text-xl font-bold text-blue-400">{metrics.totalSamples}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
            <p className="text-muted-foreground text-[10px]">활성</p>
            <p className="mt-1 text-xl font-bold text-emerald-400">{metrics.activeSamples}</p>
          </div>
          <div className="rounded-lg bg-purple-500/10 p-3 text-center">
            <p className="text-muted-foreground text-[10px]">평균 통과율</p>
            <p className="mt-1 text-xl font-bold text-purple-400">
              {Math.round(metrics.avgPassRate * 100)}%
            </p>
          </div>
          <div className="rounded-lg bg-amber-500/10 p-3 text-center">
            <p className="text-muted-foreground text-[10px]">확장 목표</p>
            <p className="mt-1 text-xl font-bold text-amber-400">{metrics.nextExpansionTarget}개</p>
          </div>
        </div>
      </div>

      {/* 차원 커버리지 */}
      <div className="bg-card rounded-lg border p-4">
        <h4 className="mb-3 text-xs font-medium">차원별 커버리지</h4>
        <div className="space-y-2">
          {dimEntries.map(([dim, coverage]) => {
            const pct = Math.round(coverage * 100)
            return (
              <div key={dim} className="flex items-center gap-3 text-xs">
                <span className="w-20 font-medium">{dim}</span>
                <div className="flex-1">
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-cyan-500/60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-muted-foreground w-10 text-right">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 라이프사이클 탭 ────────────────────────────────────────────

function LifecycleTab({ lifecycle }: { lifecycle: LifecycleMetric }) {
  const grades = [
    { label: "Active", value: lifecycle.active, color: "emerald" },
    { label: "Standard", value: lifecycle.standard, color: "blue" },
    { label: "Legacy", value: lifecycle.legacy, color: "amber" },
    { label: "Deprecated", value: lifecycle.deprecated, color: "red" },
    { label: "Archived", value: lifecycle.archived, color: "gray" },
  ]
  const total = grades.reduce((s, g) => s + g.value, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* 등급 분포 */}
      <div className="bg-card rounded-lg border p-4">
        <h4 className="mb-3 text-xs font-medium">등급 분포</h4>

        {/* 수평 바 */}
        <div className="mb-3 flex h-3 overflow-hidden rounded-full">
          {grades.map((g) => (
            <div
              key={g.label}
              className={`bg-${g.color}-500/70`}
              style={{ width: `${total > 0 ? (g.value / total) * 100 : 0}%` }}
            />
          ))}
        </div>

        <div className="space-y-2">
          {grades.map((g) => (
            <div key={g.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full bg-${g.color}-500/70`} />
                <span>{g.label}</span>
              </div>
              <span className="text-muted-foreground">
                {g.value}개 ({total > 0 ? Math.round((g.value / total) * 100) : 0}%)
              </span>
            </div>
          ))}
        </div>

        {/* Zombie 경고 */}
        {lifecycle.zombieCount > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-400">
            <Skull className="h-4 w-4 shrink-0" />
            Zombie 페르소나 {lifecycle.zombieCount}개 감지 — GC 검토 필요
          </div>
        )}
      </div>

      {/* 최근 전이 */}
      <div className="bg-card rounded-lg border p-4">
        <h4 className="mb-3 text-xs font-medium">최근 상태 전이</h4>
        {lifecycle.recentTransitions.length === 0 ? (
          <p className="text-muted-foreground text-xs">최근 전이 내역이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {lifecycle.recentTransitions.map((t, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border p-2 text-xs">
                <span className="text-muted-foreground font-mono">{t.personaId}</span>
                <Badge variant="outline">{t.from}</Badge>
                <ArrowRight className="text-muted-foreground h-3 w-3" />
                <Badge
                  variant={
                    t.to === "ACTIVE" ? "success" : t.to === "LEGACY" ? "warning" : "outline"
                  }
                >
                  {t.to}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 설정 패널 ──────────────────────────────────────────────────

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<IncubatorSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/internal/incubator/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_settings" }),
    })
      .then((r) => r.json())
      .then((json: { success: boolean; data?: IncubatorSettings }) => {
        if (json.success && json.data) {
          setSettings(json.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    try {
      await fetch("/api/internal/incubator/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_settings", settings }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  if (loading || !settings) {
    return (
      <div className="bg-card text-muted-foreground rounded-lg border p-4 text-sm">
        설정을 불러오는 중...
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">인큐베이터 설정</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SettingField
          label="생성 비용 (KRW/개)"
          value={settings.generationCostKRW}
          onChange={(v) => setSettings({ ...settings, generationCostKRW: v })}
        />
        <SettingField
          label="테스트 비용 (KRW/개)"
          value={settings.testCostKRW}
          onChange={(v) => setSettings({ ...settings, testCostKRW: v })}
        />
        <SettingField
          label="월 예산 (KRW)"
          value={settings.monthlyBudgetKRW}
          onChange={(v) => setSettings({ ...settings, monthlyBudgetKRW: v })}
        />
        <SettingField
          label="일일 생성 한도"
          value={settings.dailyLimit}
          onChange={(v) => setSettings({ ...settings, dailyLimit: v })}
        />
        <SettingField
          label="합격 임계값"
          value={settings.passThreshold}
          onChange={(v) => setSettings({ ...settings, passThreshold: v })}
          step={0.05}
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium">전략 가중치</p>
        <div className="grid grid-cols-3 gap-3">
          <SettingField
            label="유저 기반"
            value={settings.strategyWeights.userDriven}
            onChange={(v) =>
              setSettings({
                ...settings,
                strategyWeights: { ...settings.strategyWeights, userDriven: v },
              })
            }
            step={0.05}
          />
          <SettingField
            label="탐험"
            value={settings.strategyWeights.exploration}
            onChange={(v) =>
              setSettings({
                ...settings,
                strategyWeights: { ...settings.strategyWeights, exploration: v },
              })
            }
            step={0.05}
          />
          <SettingField
            label="GAP 충전"
            value={settings.strategyWeights.gapFilling}
            onChange={(v) =>
              setSettings({
                ...settings,
                strategyWeights: { ...settings.strategyWeights, gapFilling: v },
              })
            }
            step={0.05}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-3.5 w-3.5" />
          {saving ? "저장 중..." : "저장"}
        </Button>
        {saved && <span className="text-xs text-emerald-500">저장 완료</span>}
      </div>
    </div>
  )
}

function SettingField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <div>
      <label className="text-muted-foreground mb-1 block text-[11px]">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border-border bg-background w-full rounded-md border px-2 py-1 text-sm"
      />
    </div>
  )
}
