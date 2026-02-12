// ═══════════════════════════════════════════════════════════════
// 인큐베이터 대시보드 + 모니터링
// T62-AC7: 주요 지표, 알림, 모니터링 데이터 모델
// ═══════════════════════════════════════════════════════════════

import type { BatchResult } from "./batch-workflow"
import type { CostUsage } from "./cost-control"
import type { GoldenSampleMetrics } from "./golden-sample"
import type { RevalidationBatchResult } from "./revalidation"

// ── 타입 정의 ─────────────────────────────────────────────────

export type AlertSeverity = "info" | "warning" | "critical"

export interface IncubatorAlert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  timestamp: Date
  dismissed: boolean
}

export interface DailyMetric {
  date: string // "2026-02-12"
  generated: number
  passed: number
  failed: number
  passRate: number
  costKRW: number
}

export interface StrategyMetric {
  userDriven: number
  exploration: number
  gapFilling: number
  gapRegions: string[]
  archetypeDistribution: Record<string, number>
}

export interface QualityMetric {
  avgConsistency: number
  avgVectorAlignment: number
  avgToneMatch: number
  avgReasoningQuality: number
  topFailureReasons: Array<{ reason: string; count: number }>
}

export interface LifecycleMetric {
  active: number
  standard: number
  legacy: number
  deprecated: number
  archived: number
  zombieCount: number
  recentTransitions: Array<{
    personaId: string
    from: string
    to: string
    date: Date
  }>
}

export interface IncubatorDashboard {
  // 상단: 핵심 지표 카드
  todayGenerated: number
  todayPassed: number
  passRate: number
  monthlyBudget: CostUsage
  cumulativeActive: number

  // 7일 추이
  dailyTrend: DailyMetric[]

  // 탭 데이터
  strategy: StrategyMetric
  quality: QualityMetric
  goldenSamples: GoldenSampleMetrics
  lifecycle: LifecycleMetric

  // 알림
  alerts: IncubatorAlert[]
}

// ── 알림 생성 ──────────────────────────────────────────────────

export function generateAlerts(
  passRate: number,
  costUsage: CostUsage,
  cumulativeActive: number,
  zombieCount: number
): IncubatorAlert[] {
  const alerts: IncubatorAlert[] = []
  const now = new Date()

  // 합격률 20% 미만
  if (passRate < 0.2) {
    alerts.push({
      id: `alert-passrate-${now.getTime()}`,
      severity: "warning",
      title: "낮은 합격률",
      message: `합격률이 ${Math.round(passRate * 100)}%로 기준(20%) 미만입니다. 생성 전략을 점검하세요.`,
      timestamp: now,
      dismissed: false,
    })
  }

  // 월 비용 초과
  if (costUsage.isOverBudget) {
    alerts.push({
      id: `alert-budget-${now.getTime()}`,
      severity: "critical",
      title: "예산 초과",
      message: `월간 비용 ₩${costUsage.totalCostKRW.toLocaleString()}이 예산을 초과했습니다.`,
      timestamp: now,
      dismissed: false,
    })
  } else if (costUsage.budgetUtilization > 0.8) {
    alerts.push({
      id: `alert-budget-warn-${now.getTime()}`,
      severity: "warning",
      title: "예산 경고",
      message: `월간 예산 사용률이 ${Math.round(costUsage.budgetUtilization * 100)}%입니다.`,
      timestamp: now,
      dismissed: false,
    })
  }

  // 마일스톤 알림
  const milestones = [100, 500, 1000, 5000]
  for (const ms of milestones) {
    if (cumulativeActive >= ms && cumulativeActive < ms + 10) {
      alerts.push({
        id: `alert-milestone-${ms}-${now.getTime()}`,
        severity: "info",
        title: `${ms}개 페르소나 달성`,
        message: `활성 페르소나가 ${ms}개에 도달했습니다. 골든 샘플 확장을 검토하세요.`,
        timestamp: now,
        dismissed: false,
      })
    }
  }

  // Zombie 알림
  if (zombieCount > 0) {
    alerts.push({
      id: `alert-zombie-${now.getTime()}`,
      severity: zombieCount > 10 ? "warning" : "info",
      title: "Zombie 페르소나 감지",
      message: `${zombieCount}개의 Zombie 페르소나가 감지되었습니다. GC를 검토하세요.`,
      timestamp: now,
      dismissed: false,
    })
  }

  return alerts
}

// ── 대시보드 빌드 ──────────────────────────────────────────────

export function buildDashboard(params: {
  todayBatch: BatchResult | null
  recentBatches: BatchResult[]
  costUsage: CostUsage
  cumulativeActive: number
  strategy: StrategyMetric
  goldenSamples: GoldenSampleMetrics
  lifecycle: LifecycleMetric
}): IncubatorDashboard {
  const todayGenerated = params.todayBatch?.generatedCount ?? 0
  const todayPassed = params.todayBatch?.passedCount ?? 0
  const passRate = todayGenerated > 0 ? todayPassed / todayGenerated : 0

  // 7일 추이
  const dailyTrend: DailyMetric[] = params.recentBatches.map((b) => ({
    date: b.batchDate.toISOString().slice(0, 10),
    generated: b.generatedCount,
    passed: b.passedCount,
    failed: b.failedCount,
    passRate: b.passRate,
    costKRW: b.estimatedCost,
  }))

  // 품질 메트릭 계산 (최근 배치의 평균)
  const allLogs = params.recentBatches.flatMap((b) => b.logs)
  const withScores = allLogs.filter((l) => l.scoreBreakdown !== null)
  const quality: QualityMetric = {
    avgConsistency: avg(withScores.map((l) => l.consistencyScore ?? 0)),
    avgVectorAlignment: avg(withScores.map((l) => l.scoreBreakdown?.vectorAlignment ?? 0)),
    avgToneMatch: avg(withScores.map((l) => l.scoreBreakdown?.toneMatch ?? 0)),
    avgReasoningQuality: avg(withScores.map((l) => l.scoreBreakdown?.reasoningQuality ?? 0)),
    topFailureReasons: [],
  }

  // 알림 생성
  const alerts = generateAlerts(
    passRate,
    params.costUsage,
    params.cumulativeActive,
    params.lifecycle.zombieCount
  )

  return {
    todayGenerated,
    todayPassed,
    passRate: Math.round(passRate * 100) / 100,
    monthlyBudget: params.costUsage,
    cumulativeActive: params.cumulativeActive,
    dailyTrend,
    strategy: params.strategy,
    quality,
    goldenSamples: params.goldenSamples,
    lifecycle: params.lifecycle,
    alerts,
  }
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) / 1000
}
