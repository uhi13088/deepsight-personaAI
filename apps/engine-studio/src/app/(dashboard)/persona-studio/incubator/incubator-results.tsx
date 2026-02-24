"use client"

import { CheckCircle, Skull, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { StrategyMetric, QualityMetric, LifecycleMetric } from "@/lib/incubator/dashboard"
import type { GoldenSampleMetrics } from "@/lib/incubator/golden-sample"

// ── 생성 전략 탭 ──────────────────────────────────────────────

export function StrategyTab({ strategy }: { strategy: StrategyMetric }) {
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

export function QualityTab({ quality }: { quality: QualityMetric }) {
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

export function GoldenSamplesTab({ metrics }: { metrics: GoldenSampleMetrics }) {
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

export function LifecycleTab({ lifecycle }: { lifecycle: LifecycleMetric }) {
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
