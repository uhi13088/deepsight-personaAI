"use client"

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
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { IncubatorDashboard, DailyMetric, IncubatorAlert } from "@/lib/incubator/dashboard"

// ── 핵심 지표 카드 ────────────────────────────────────────────

export function MetricCards({ data }: { data: IncubatorDashboard }) {
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

// ── 알림 섹션 ─────────────────────────────────────────────────

export function AlertsSection({ alerts }: { alerts: IncubatorAlert[] }) {
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

export function TrendSection({ dailyTrend }: { dailyTrend: DailyMetric[] }) {
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
