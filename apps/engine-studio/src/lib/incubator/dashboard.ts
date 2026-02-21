// ═══════════════════════════════════════════════════════════════
// 인큐베이터 대시보드 + 모니터링
// T62-AC7: 주요 지표, 알림, 모니터링 데이터 모델
// ═══════════════════════════════════════════════════════════════

import type { BatchResult } from "./batch-workflow"
import type { CostUsage, DailyCostEntry } from "./cost-control"
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

  // 운영 상태
  dailyLimit: number
  pendingRequestCount: number
  lastBatchAt: string | null

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
  /** 실제 일별 LLM 비용 (LlmUsageLog 기반) */
  dailyCosts?: DailyCostEntry[]
  /** 일일 생성 한도 */
  dailyLimit?: number
  /** 대기 중인 사용자 요청 수 */
  pendingRequestCount?: number
  /** 마지막 배치 실행 시각 */
  lastBatchAt?: string | null
}): IncubatorDashboard {
  const todayGenerated = params.todayBatch?.generatedCount ?? 0
  const todayPassed = params.todayBatch?.passedCount ?? 0
  const passRate = todayGenerated > 0 ? todayPassed / todayGenerated : 0

  // 7일 추이 — 배치 데이터 + 실제 LLM 비용 매핑
  const dailyCostMap = new Map<string, number>()
  if (params.dailyCosts) {
    for (const dc of params.dailyCosts) {
      dailyCostMap.set(dc.date, dc.totalCostKRW)
    }
  }

  const dailyTrend: DailyMetric[] = params.recentBatches.map((b) => {
    const dateStr = b.batchDate.toISOString().slice(0, 10)
    return {
      date: dateStr,
      generated: b.generatedCount,
      passed: b.passedCount,
      failed: b.failedCount,
      passRate: b.passRate,
      // 실제 일별 LLM 비용이 있으면 사용, 없으면 배치 비용 사용
      costKRW: dailyCostMap.get(dateStr) ?? b.estimatedCost,
    }
  })

  // 품질 메트릭 계산 (최근 배치의 평균)
  const allLogs = params.recentBatches.flatMap((b) => b.logs)
  const withScores = allLogs.filter((l) => l.scoreBreakdown !== null)

  // 실패 사유 집계
  const failedLogs = allLogs.filter(
    (l) => (l.status === "FAILED" || l.status === "REJECTED") && l.failReason
  )
  const reasonCountMap = new Map<string, number>()
  for (const log of failedLogs) {
    // failReason이 복합 사유일 수 있으므로 각각 분리하여 집계
    const reasons = (log.failReason ?? "").split(", ")
    for (const reason of reasons) {
      const normalized = normalizeFailReason(reason)
      if (normalized) {
        reasonCountMap.set(normalized, (reasonCountMap.get(normalized) ?? 0) + 1)
      }
    }
  }
  const topFailureReasons = [...reasonCountMap.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const quality: QualityMetric = {
    avgConsistency: avg(withScores.map((l) => l.consistencyScore ?? 0)),
    avgVectorAlignment: avg(withScores.map((l) => l.scoreBreakdown?.vectorAlignment ?? 0)),
    avgToneMatch: avg(withScores.map((l) => l.scoreBreakdown?.toneMatch ?? 0)),
    avgReasoningQuality: avg(withScores.map((l) => l.scoreBreakdown?.reasoningQuality ?? 0)),
    topFailureReasons,
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
    dailyLimit: params.dailyLimit ?? 10,
    pendingRequestCount: params.pendingRequestCount ?? 0,
    lastBatchAt: params.lastBatchAt ?? null,
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

/** 실패 사유를 카테고리로 정규화 (구체 수치 제거) */
function normalizeFailReason(reason: string): string {
  const trimmed = reason.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("모순 점수 과소")) return "모순 점수 과소"
  if (trimmed.startsWith("모순 점수 과다")) return "모순 점수 과다"
  if (trimmed.startsWith("차원성 크게 미달")) return "차원성 크게 미달"
  if (trimmed.startsWith("차원성 미달")) return "차원성 미달"
  if (trimmed.startsWith("품질 미달")) return "품질 미달"
  return trimmed
}
