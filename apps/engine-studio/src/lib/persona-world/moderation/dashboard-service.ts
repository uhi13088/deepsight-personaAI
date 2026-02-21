// ═══════════════════════════════════════════════════════════════
// PersonaWorld — 관리자 대시보드 서비스 (Phase 7-A)
// 활동/품질/보안/신고 통계 집계
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export interface DashboardOverview {
  activity: ActivityStats
  quality: QualityStats
  security: SecurityStats
  reports: ReportOverview
}

export interface ActivityStats {
  activePersonas: number
  postsToday: number
  commentsToday: number
  likesToday: number
  followsToday: number
}

export interface QualityStats {
  avgPIS: number
  distribution: {
    excellent: number
    good: number
    warning: number
    critical: number
  }
}

export interface SecurityStats {
  gateGuardBlocks: number
  sentinelFlags: number
  quarantinePending: number
  killSwitchActive: boolean
}

export interface ReportOverview {
  pendingCount: number
  resolvedToday: number
  avgResolutionHours: number | null
  byCategoryTop3: Array<{ category: string; count: number }>
}

export interface DashboardAlert {
  id: string
  type: "QUALITY" | "SECURITY" | "COST" | "REPORT"
  severity: "INFO" | "WARNING" | "CRITICAL"
  message: string
  createdAt: Date
}

// ── DI Provider ──────────────────────────────────────────────

export interface DashboardDataProvider {
  getActivityStats(): Promise<ActivityStats>
  getQualityStats(): Promise<QualityStats>
  getSecurityStats(): Promise<SecurityStats>
  getReportOverview(): Promise<ReportOverview>
  getRecentAlerts(limit: number): Promise<DashboardAlert[]>
}

// ── 서비스 함수 ──────────────────────────────────────────────

/**
 * 대시보드 전체 데이터 조회
 * 4개 섹션을 병렬 조회하여 반환
 */
export async function buildDashboard(provider: DashboardDataProvider): Promise<DashboardOverview> {
  const [activity, quality, security, reports] = await Promise.all([
    provider.getActivityStats(),
    provider.getQualityStats(),
    provider.getSecurityStats(),
    provider.getReportOverview(),
  ])

  return { activity, quality, security, reports }
}

/**
 * KPI 임계치 기반 알림 생성
 */
export function checkKPIAlerts(overview: DashboardOverview): DashboardAlert[] {
  const alerts: DashboardAlert[] = []
  const now = new Date()

  // 품질 알림
  if (overview.quality.distribution.critical > 0) {
    alerts.push({
      id: `alert_quality_critical_${now.getTime()}`,
      type: "QUALITY",
      severity: "CRITICAL",
      message: `${overview.quality.distribution.critical}개 페르소나가 CRITICAL 상태입니다`,
      createdAt: now,
    })
  }

  if (overview.quality.avgPIS < 0.5) {
    alerts.push({
      id: `alert_quality_low_${now.getTime()}`,
      type: "QUALITY",
      severity: "WARNING",
      message: `평균 PIS가 ${(overview.quality.avgPIS * 100).toFixed(1)}%로 낮습니다`,
      createdAt: now,
    })
  }

  // 보안 알림
  if (overview.security.killSwitchActive) {
    alerts.push({
      id: `alert_security_killswitch_${now.getTime()}`,
      type: "SECURITY",
      severity: "CRITICAL",
      message: "Kill Switch가 활성화되어 있습니다",
      createdAt: now,
    })
  }

  if (overview.security.quarantinePending > 10) {
    alerts.push({
      id: `alert_security_quarantine_${now.getTime()}`,
      type: "SECURITY",
      severity: "WARNING",
      message: `${overview.security.quarantinePending}건의 격리 대기 항목이 있습니다`,
      createdAt: now,
    })
  }

  // 신고 알림
  if (overview.reports.pendingCount > 20) {
    alerts.push({
      id: `alert_report_backlog_${now.getTime()}`,
      type: "REPORT",
      severity: "WARNING",
      message: `미처리 신고 ${overview.reports.pendingCount}건이 누적되었습니다`,
      createdAt: now,
    })
  }

  return alerts
}
