// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Report Handler (Phase 7-A)
// 운영 설계서 §11.5 — 신고 처리 시스템 (6종 카테고리)
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type ReportCategory =
  | "INAPPROPRIATE_CONTENT"
  | "WRONG_INFORMATION"
  | "CHARACTER_BREAK"
  | "REPETITIVE_CONTENT"
  | "UNPLEASANT_INTERACTION"
  | "TECHNICAL_ISSUE"

export type ReportStatus = "PENDING" | "AUTO_RESOLVED" | "IN_REVIEW" | "RESOLVED" | "DISMISSED"
export type ReportPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
export type ReportTargetType = "POST" | "COMMENT" | "PERSONA"
export type ResolutionAction = "HIDDEN" | "DELETED" | "PERSONA_PAUSED" | "DISMISSED" | "NO_ACTION"

export interface ContentReport {
  id: string
  reportedBy: string
  targetType: ReportTargetType
  targetId: string
  category: ReportCategory
  description?: string
  status: ReportStatus
  priority: ReportPriority

  autoAnalysis?: {
    suggestedAction: ResolutionAction
    confidence: number
    matchedRules: string[]
  }

  resolution?: {
    action: ResolutionAction
    resolvedBy: string
    resolvedAt: Date
    note: string
    arenaTriggered: boolean
  }

  createdAt: Date
  updatedAt: Date
}

export interface ReportStats {
  total: number
  pending: number
  autoResolved: number
  manualResolved: number
  dismissed: number
  byCategory: Partial<Record<ReportCategory, number>>
  averageResolutionTimeMs: number
}

// ── 카테고리 설정 ──────────────────────────────────────────────

interface CategoryConfig {
  priority: ReportPriority
  autoResolvable: boolean
  autoAction?: ResolutionAction
}

const CATEGORY_CONFIGS: Record<ReportCategory, CategoryConfig> = {
  INAPPROPRIATE_CONTENT: { priority: "HIGH", autoResolvable: false },
  WRONG_INFORMATION: { priority: "MEDIUM", autoResolvable: false },
  CHARACTER_BREAK: { priority: "MEDIUM", autoResolvable: true, autoAction: "NO_ACTION" },
  REPETITIVE_CONTENT: { priority: "LOW", autoResolvable: true, autoAction: "HIDDEN" },
  UNPLEASANT_INTERACTION: { priority: "HIGH", autoResolvable: false },
  TECHNICAL_ISSUE: { priority: "LOW", autoResolvable: false },
}

// ── 신고 생성 ──────────────────────────────────────────────────

let reportCounter = 0

/**
 * 신고 접수.
 */
export function submitReport(params: {
  reportedBy: string
  targetType: ReportTargetType
  targetId: string
  category: ReportCategory
  description?: string
}): ContentReport {
  const config = CATEGORY_CONFIGS[params.category]
  const id = `report-${Date.now()}-${++reportCounter}`

  const report: ContentReport = {
    id,
    reportedBy: params.reportedBy,
    targetType: params.targetType,
    targetId: params.targetId,
    category: params.category,
    description: params.description,
    status: "PENDING",
    priority: config.priority,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  // 자동 분석
  if (config.autoResolvable) {
    report.autoAnalysis = {
      suggestedAction: config.autoAction ?? "NO_ACTION",
      confidence: 0.8,
      matchedRules: [`auto_${params.category.toLowerCase()}`],
    }
  }

  return report
}

/**
 * 자동 처리 가능 여부 확인.
 */
export function isAutoResolvable(report: ContentReport): boolean {
  return CATEGORY_CONFIGS[report.category].autoResolvable
}

/**
 * 자동 처리 실행.
 */
export function autoResolve(report: ContentReport): ContentReport {
  if (!isAutoResolvable(report)) {
    return report
  }

  const config = CATEGORY_CONFIGS[report.category]

  return {
    ...report,
    status: "AUTO_RESOLVED",
    resolution: {
      action: config.autoAction ?? "NO_ACTION",
      resolvedBy: "SYSTEM",
      resolvedAt: new Date(),
      note: `자동 처리: ${report.category}`,
      arenaTriggered: report.category === "CHARACTER_BREAK",
    },
    updatedAt: new Date(),
  }
}

// ── 관리자 처리 ───────────────────────────────────────────────

/**
 * 관리자 리뷰 시작.
 */
export function startReview(report: ContentReport): ContentReport {
  return {
    ...report,
    status: "IN_REVIEW",
    updatedAt: new Date(),
  }
}

/**
 * 관리자 신고 처리.
 */
export function resolveReport(
  report: ContentReport,
  action: ResolutionAction,
  adminId: string,
  note: string,
  arenaTriggered: boolean = false
): ContentReport {
  const status: ReportStatus = action === "DISMISSED" ? "DISMISSED" : "RESOLVED"

  return {
    ...report,
    status,
    resolution: {
      action,
      resolvedBy: adminId,
      resolvedAt: new Date(),
      note,
      arenaTriggered,
    },
    updatedAt: new Date(),
  }
}

// ── Trust Score 영향 ──────────────────────────────────────────

export interface TrustScoreAdjustment {
  targetId: string
  targetType: "PERSONA" | "REPORTER"
  adjustment: number
  reason: string
}

/**
 * 신고 처리 결과에 따른 Trust Score 조정값 계산.
 */
export function calculateTrustAdjustments(report: ContentReport): TrustScoreAdjustment[] {
  const adjustments: TrustScoreAdjustment[] = []

  if (!report.resolution) return adjustments

  const { action } = report.resolution

  // 신고 확인 → 대상 Trust -0.10
  if (action === "HIDDEN" || action === "DELETED" || action === "PERSONA_PAUSED") {
    adjustments.push({
      targetId: report.targetId,
      targetType: "PERSONA",
      adjustment: -0.1,
      reason: `신고 확인: ${report.category}`,
    })
  }

  // 무혐의 처리 → 신고자 Trust -0.05
  if (action === "DISMISSED") {
    adjustments.push({
      targetId: report.reportedBy,
      targetType: "REPORTER",
      adjustment: -0.05,
      reason: "무혐의 신고",
    })
  }

  return adjustments
}

// ── 신고 통계 ──────────────────────────────────────────────────

/**
 * 신고 통계 계산.
 */
export function calculateReportStats(reports: ContentReport[]): ReportStats {
  const byCategory: Partial<Record<ReportCategory, number>> = {}

  let pending = 0
  let autoResolved = 0
  let manualResolved = 0
  let dismissed = 0
  let totalResolutionTime = 0
  let resolvedCount = 0

  for (const r of reports) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1

    switch (r.status) {
      case "PENDING":
      case "IN_REVIEW":
        pending++
        break
      case "AUTO_RESOLVED":
        autoResolved++
        if (r.resolution?.resolvedAt) {
          totalResolutionTime += r.resolution.resolvedAt.getTime() - r.createdAt.getTime()
          resolvedCount++
        }
        break
      case "RESOLVED":
        manualResolved++
        if (r.resolution?.resolvedAt) {
          totalResolutionTime += r.resolution.resolvedAt.getTime() - r.createdAt.getTime()
          resolvedCount++
        }
        break
      case "DISMISSED":
        dismissed++
        if (r.resolution?.resolvedAt) {
          totalResolutionTime += r.resolution.resolvedAt.getTime() - r.createdAt.getTime()
          resolvedCount++
        }
        break
    }
  }

  return {
    total: reports.length,
    pending,
    autoResolved,
    manualResolved,
    dismissed,
    byCategory,
    averageResolutionTimeMs: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
  }
}

// ── 필터링 ────────────────────────────────────────────────────

export interface ReportFilter {
  status?: ReportStatus
  category?: ReportCategory
  priority?: ReportPriority
  targetType?: ReportTargetType
}

/**
 * 신고 목록 필터링.
 */
export function filterReports(reports: ContentReport[], filter: ReportFilter): ContentReport[] {
  return reports.filter((r) => {
    if (filter.status && r.status !== filter.status) return false
    if (filter.category && r.category !== filter.category) return false
    if (filter.priority && r.priority !== filter.priority) return false
    if (filter.targetType && r.targetType !== filter.targetType) return false
    return true
  })
}
