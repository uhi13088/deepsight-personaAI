// ═══════════════════════════════════════════════════════════════
// PersonaWorld — 신고 처리 시스템 (Phase 7-A)
// 6종 카테고리 × 자동 해결 + Trust Score 연동
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type ReportCategory =
  | "INAPPROPRIATE_CONTENT"
  | "WRONG_INFORMATION"
  | "CHARACTER_BREAK"
  | "REPETITIVE_CONTENT"
  | "UNPLEASANT_INTERACTION"
  | "TECHNICAL_ISSUE"

export type ReportResolution = "HIDDEN" | "DELETED" | "PERSONA_PAUSED" | "DISMISSED" | "NO_ACTION"

export interface ReportCategoryConfig {
  severity: "LOW" | "MEDIUM" | "HIGH"
  autoResolvable: boolean
  maxAutoResolveCount: number
  trustDecayOnConfirm: number
  defaultResolution: ReportResolution
}

export interface ReportInput {
  reporterUserId: string
  targetType: "POST" | "COMMENT"
  targetId: string
  category: ReportCategory
  description?: string
}

export interface ReportResult {
  reportId: string
  status: "PENDING" | "AUTO_RESOLVED" | "IN_REVIEW"
  action: ReportResolution | null
  message: string
}

export interface ReportStats {
  pendingCount: number
  resolvedToday: number
  totalReports: number
  byCategory: Record<string, number>
}

// ── DI Provider ──────────────────────────────────────────────

export interface ReportDataProvider {
  createReport(data: {
    reporterUserId: string
    targetType: string
    targetId: string
    reason: string
    description?: string
    status: string
    resolution?: string
    resolvedAt?: Date
  }): Promise<{ id: string }>
  countRecentReports(userId: string, windowHours: number): Promise<number>
  countReportsForTarget(targetId: string): Promise<number>
  hideTarget(targetType: string, targetId: string): Promise<void>
  getReportStats(): Promise<ReportStats>
}

// ── 카테고리별 설정 ──────────────────────────────────────────

export const REPORT_CATEGORY_CONFIG: Record<ReportCategory, ReportCategoryConfig> = {
  INAPPROPRIATE_CONTENT: {
    severity: "HIGH",
    autoResolvable: false,
    maxAutoResolveCount: 0,
    trustDecayOnConfirm: -0.1,
    defaultResolution: "HIDDEN",
  },
  WRONG_INFORMATION: {
    severity: "MEDIUM",
    autoResolvable: false,
    maxAutoResolveCount: 0,
    trustDecayOnConfirm: -0.05,
    defaultResolution: "NO_ACTION",
  },
  CHARACTER_BREAK: {
    severity: "MEDIUM",
    autoResolvable: true,
    maxAutoResolveCount: 3,
    trustDecayOnConfirm: -0.05,
    defaultResolution: "PERSONA_PAUSED",
  },
  REPETITIVE_CONTENT: {
    severity: "LOW",
    autoResolvable: true,
    maxAutoResolveCount: 5,
    trustDecayOnConfirm: -0.03,
    defaultResolution: "HIDDEN",
  },
  UNPLEASANT_INTERACTION: {
    severity: "HIGH",
    autoResolvable: false,
    maxAutoResolveCount: 0,
    trustDecayOnConfirm: -0.1,
    defaultResolution: "HIDDEN",
  },
  TECHNICAL_ISSUE: {
    severity: "LOW",
    autoResolvable: true,
    maxAutoResolveCount: 10,
    trustDecayOnConfirm: 0,
    defaultResolution: "NO_ACTION",
  },
}

// ── Rate Limit ──────────────────────────────────────────────

const REPORT_RATE_LIMITS = {
  maxPerHour: 10,
  maxPerDay: 30,
}

// ── 카테고리 → DB reason 매핑 ────────────────────────────────

const CATEGORY_TO_REASON: Record<ReportCategory, string> = {
  INAPPROPRIATE_CONTENT: "INAPPROPRIATE",
  WRONG_INFORMATION: "MISINFORMATION",
  CHARACTER_BREAK: "OTHER",
  REPETITIVE_CONTENT: "SPAM",
  UNPLEASANT_INTERACTION: "HARASSMENT",
  TECHNICAL_ISSUE: "OTHER",
}

// ── 서비스 함수 ──────────────────────────────────────────────

/**
 * 유저 신고 제출
 * - Rate limit 검사 → 카테고리별 자동 해결 판정 → DB 저장
 */
export async function submitReport(
  provider: ReportDataProvider,
  input: ReportInput
): Promise<ReportResult> {
  // Rate limit 검사
  const recentCount = await provider.countRecentReports(input.reporterUserId, 1)
  if (recentCount >= REPORT_RATE_LIMITS.maxPerHour) {
    return {
      reportId: "",
      status: "PENDING",
      action: null,
      message: "신고 횟수 제한을 초과했습니다. 잠시 후 다시 시도해주세요.",
    }
  }

  const dailyCount = await provider.countRecentReports(input.reporterUserId, 24)
  if (dailyCount >= REPORT_RATE_LIMITS.maxPerDay) {
    return {
      reportId: "",
      status: "PENDING",
      action: null,
      message: "일일 신고 횟수를 초과했습니다.",
    }
  }

  const config = REPORT_CATEGORY_CONFIG[input.category]

  // 자동 해결 가능 카테고리: 동일 대상에 대한 신고가 임계치 초과 시 자동 처리
  let autoResolved = false
  let resolution: ReportResolution | null = null

  if (config.autoResolvable) {
    const targetReportCount = await provider.countReportsForTarget(input.targetId)
    if (targetReportCount >= config.maxAutoResolveCount) {
      autoResolved = true
      resolution = config.defaultResolution

      // 자동 숨김 처리
      if (resolution === "HIDDEN") {
        await provider.hideTarget(input.targetType, input.targetId)
      }
    }
  }

  const report = await provider.createReport({
    reporterUserId: input.reporterUserId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: CATEGORY_TO_REASON[input.category],
    description: input.description,
    status: autoResolved ? "RESOLVED" : "PENDING",
    resolution: resolution ?? undefined,
    resolvedAt: autoResolved ? new Date() : undefined,
  })

  return {
    reportId: report.id,
    status: autoResolved ? "AUTO_RESOLVED" : "PENDING",
    action: resolution,
    message: autoResolved
      ? "신고가 접수되어 자동 처리되었습니다."
      : "신고가 접수되었습니다. 검토 후 처리됩니다.",
  }
}

/**
 * 신고 통계 조회 (관리자 대시보드용)
 */
export async function getReportStats(provider: ReportDataProvider): Promise<ReportStats> {
  return provider.getReportStats()
}

/**
 * 카테고리별 심각도 조회
 */
export function getCategorySeverity(category: ReportCategory): "LOW" | "MEDIUM" | "HIGH" {
  return REPORT_CATEGORY_CONFIG[category].severity
}
