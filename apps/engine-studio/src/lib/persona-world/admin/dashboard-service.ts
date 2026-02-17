// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Admin Dashboard Service (Phase 7-A)
// 운영 설계서 §11.3 — 대시보드 데이터 집계
// ═══════════════════════════════════════════════════════════════

import type { PISGrade } from "../quality/integrity-score"
import type { ReportStats } from "./report-handler"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface ActivityOverview {
  activePersonasNow: number
  totalPostsToday: number
  totalCommentsToday: number
  totalLikesToday: number
  totalFollowsToday: number
  averagePostsPerPersona: number
}

export interface QualityOverview {
  averagePIS: number
  pisDistribution: Record<PISGrade, number>
  pendingCorrections: number
  recentArenaResults: ArenaResultSummary[]
}

export interface ArenaResultSummary {
  sessionId: string
  personaId: string
  verdict: string
  completedAt: Date
}

export interface CostOverview {
  llmCallsToday: number
  estimatedCostToday: number
  monthlyBudget: number
  usagePercentage: number
  cacheHitRate: number
  costTrend: Array<{ date: string; cost: number }>
}

export interface SecurityOverview {
  gateGuardBlocks24h: number
  sentinelActions24h: { PASS: number; SANITIZE: number; QUARANTINE: number; BLOCK: number }
  quarantinePending: number
  killSwitchStatus: { globalFreeze: boolean; disabledFeatures: string[] }
}

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL"
export type AlertType =
  | "PIS_DROP"
  | "COST_THRESHOLD"
  | "SECURITY_INCIDENT"
  | "QUALITY_WARNING"
  | "SYSTEM_ERROR"

export interface AlertItem {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  personaId?: string
  createdAt: Date
  acknowledged: boolean
}

export interface AdminDashboard {
  activityOverview: ActivityOverview
  qualityOverview: QualityOverview
  costOverview: CostOverview
  securityOverview: SecurityOverview
  alerts: AlertItem[]
  reportOverview: {
    pendingCount: number
    resolvedToday: number
    averageResolutionTime: number
  }
}

// ── 대시보드 빌더 ──────────────────────────────────────────────

/**
 * 빈 대시보드 생성 (기본값).
 */
export function createEmptyDashboard(): AdminDashboard {
  return {
    activityOverview: {
      activePersonasNow: 0,
      totalPostsToday: 0,
      totalCommentsToday: 0,
      totalLikesToday: 0,
      totalFollowsToday: 0,
      averagePostsPerPersona: 0,
    },
    qualityOverview: {
      averagePIS: 0,
      pisDistribution: { EXCELLENT: 0, GOOD: 0, WARNING: 0, CRITICAL: 0, QUARANTINE: 0 },
      pendingCorrections: 0,
      recentArenaResults: [],
    },
    costOverview: {
      llmCallsToday: 0,
      estimatedCostToday: 0,
      monthlyBudget: 0,
      usagePercentage: 0,
      cacheHitRate: 0,
      costTrend: [],
    },
    securityOverview: {
      gateGuardBlocks24h: 0,
      sentinelActions24h: { PASS: 0, SANITIZE: 0, QUARANTINE: 0, BLOCK: 0 },
      quarantinePending: 0,
      killSwitchStatus: { globalFreeze: false, disabledFeatures: [] },
    },
    alerts: [],
    reportOverview: {
      pendingCount: 0,
      resolvedToday: 0,
      averageResolutionTime: 0,
    },
  }
}

// ── 알림 생성 ──────────────────────────────────────────────────

let alertCounter = 0

/**
 * 알림 생성.
 */
export function createAlert(params: {
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  personaId?: string
}): AlertItem {
  return {
    id: `alert-${Date.now()}-${++alertCounter}`,
    type: params.type,
    severity: params.severity,
    title: params.title,
    message: params.message,
    personaId: params.personaId,
    createdAt: new Date(),
    acknowledged: false,
  }
}

/**
 * 알림 확인 처리.
 */
export function acknowledgeAlert(alert: AlertItem): AlertItem {
  return { ...alert, acknowledged: true }
}

// ── KPI 임계값 체크 ───────────────────────────────────────────

export interface KPIThresholds {
  minActiveRate: number // 최소 페르소나 활성률 (기본 0.85)
  minAveragePIS: number // 최소 평균 PIS (기본 0.75)
  maxQuarantineRate: number // 최대 격리 비율 (기본 0.05)
  maxCostUsageRate: number // 최대 비용 사용률 (기본 0.9)
  maxReportPendingCount: number // 최대 미처리 신고 수 (기본 50)
}

export const DEFAULT_KPI_THRESHOLDS: KPIThresholds = {
  minActiveRate: 0.85,
  minAveragePIS: 0.75,
  maxQuarantineRate: 0.05,
  maxCostUsageRate: 0.9,
  maxReportPendingCount: 50,
}

/**
 * KPI 기반 알림 생성.
 */
export function checkKPIAlerts(
  dashboard: AdminDashboard,
  totalPersonas: number,
  thresholds: KPIThresholds = DEFAULT_KPI_THRESHOLDS
): AlertItem[] {
  const alerts: AlertItem[] = []

  // 페르소나 활성률 체크
  if (totalPersonas > 0) {
    const activeRate = dashboard.activityOverview.activePersonasNow / totalPersonas
    if (activeRate < thresholds.minActiveRate) {
      alerts.push(
        createAlert({
          type: "QUALITY_WARNING",
          severity: "WARNING",
          title: "페르소나 활성률 저하",
          message: `활성률 ${round(activeRate * 100)}% < 목표 ${thresholds.minActiveRate * 100}%`,
        })
      )
    }
  }

  // 평균 PIS 체크
  if (dashboard.qualityOverview.averagePIS < thresholds.minAveragePIS) {
    alerts.push(
      createAlert({
        type: "PIS_DROP",
        severity: "CRITICAL",
        title: "평균 PIS 임계값 미달",
        message: `평균 PIS ${dashboard.qualityOverview.averagePIS} < ${thresholds.minAveragePIS}`,
      })
    )
  }

  // 비용 사용률 체크
  if (dashboard.costOverview.usagePercentage > thresholds.maxCostUsageRate * 100) {
    alerts.push(
      createAlert({
        type: "COST_THRESHOLD",
        severity: "WARNING",
        title: "비용 사용률 경고",
        message: `사용률 ${dashboard.costOverview.usagePercentage}% > ${thresholds.maxCostUsageRate * 100}%`,
      })
    )
  }

  // 미처리 신고 체크
  if (dashboard.reportOverview.pendingCount > thresholds.maxReportPendingCount) {
    alerts.push(
      createAlert({
        type: "QUALITY_WARNING",
        severity: "WARNING",
        title: "미처리 신고 과다",
        message: `미처리 ${dashboard.reportOverview.pendingCount}건 > ${thresholds.maxReportPendingCount}건`,
      })
    )
  }

  // Kill Switch 발동 체크
  if (dashboard.securityOverview.killSwitchStatus.globalFreeze) {
    alerts.push(
      createAlert({
        type: "SECURITY_INCIDENT",
        severity: "CRITICAL",
        title: "Kill Switch 발동",
        message: "글로벌 프리즈 활성화 상태",
      })
    )
  }

  return alerts
}

// ── 대시보드 빌드 ──────────────────────────────────────────────

/**
 * 대시보드 데이터 조합.
 */
export function buildDashboard(params: {
  activity: ActivityOverview
  quality: QualityOverview
  cost: CostOverview
  security: SecurityOverview
  alerts: AlertItem[]
  reportStats: ReportStats
}): AdminDashboard {
  return {
    activityOverview: params.activity,
    qualityOverview: params.quality,
    costOverview: params.cost,
    securityOverview: params.security,
    alerts: params.alerts,
    reportOverview: {
      pendingCount: params.reportStats.pending,
      resolvedToday: params.reportStats.autoResolved + params.reportStats.manualResolved,
      averageResolutionTime: params.reportStats.averageResolutionTimeMs,
    },
  }
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
