"use client"

import { useState, useCallback, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
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

export default function IncubatorPage() {
  const [data, setData] = useState<IncubatorDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>("strategy")

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
        sub={`예산 ${budgetPct}% 사용`}
        icon={<Beaker className="h-4 w-4 text-amber-400" />}
        color={data.monthlyBudget.isOverBudget ? "red" : budgetPct > 80 ? "amber" : "emerald"}
      />
      <MetricCard
        label="예산 잔여"
        value={`₩${data.monthlyBudget.budgetRemaining.toLocaleString()}`}
        sub={data.monthlyBudget.isOverBudget ? "초과!" : "남은 금액"}
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
