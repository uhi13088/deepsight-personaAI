// ═══════════════════════════════════════════════════════════════
// Arena Cost Control v4.0
// T146: 아레나 비용 제어 + 관리자 운영 로직
// 예산 정책, 비용 추정, 지출 추적, 세션 관리 승인 플로우
// ═══════════════════════════════════════════════════════════════

import type { ArenaSession, ArenaJudgment, ProfileLoadLevel } from "./arena-engine"
import { PROFILE_TOKEN_ESTIMATES } from "./arena-engine"

// ── 타입 ────────────────────────────────────────────────────

/** 아레나 예산 정책 */
export interface ArenaBudgetPolicy {
  /** 월간 아레나 예산 (토큰) */
  monthlyBudgetTokens: number
  /** 일일 세션 한도 */
  dailySessionLimit: number
  /** 세션당 최대 토큰 */
  maxTokensPerSession: number
  /** 경고 임계값 (0~1, 기본 0.8) */
  warningThreshold: number
  /** 차단 임계값 (0~1, 기본 1.0) */
  blockThreshold: number
}

/** 월간 지출 현황 */
export interface MonthlySpendingSummary {
  month: string // "2026-02"
  totalTokensUsed: number
  totalSessions: number
  completedSessions: number
  cancelledSessions: number
  budgetTokens: number
  usagePercent: number
  remainingTokens: number
  status: "NORMAL" | "WARNING" | "BLOCKED"
  avgTokensPerSession: number
  dailyBreakdown: DailySpending[]
}

/** 일별 지출 */
export interface DailySpending {
  date: string // "2026-02-16"
  tokensUsed: number
  sessionCount: number
}

/** 세션 비용 추정 */
export interface SessionCostEstimate {
  profileTokens: number
  turnTokens: number
  judgmentTokens: number
  totalEstimatedTokens: number
  withinBudget: boolean
  remainingAfter: number
}

/** 세션 승인 검사 결과 */
export interface SessionApprovalResult {
  approved: boolean
  reasons: string[]
}

/** 교정 요청 */
export interface CorrectionRequest {
  id: string
  sessionId: string
  turnNumber: number
  originalContent: string
  correctedContent: string
  issueCategory: "consistency" | "l2" | "paradox" | "trigger" | "voice"
  reason: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: number
  reviewedAt: number | null
  reviewedBy: string | null
}

/** 교정 생성 파라미터 */
export interface CreateCorrectionParams {
  id: string
  sessionId: string
  turnNumber: number
  originalContent: string
  correctedContent: string
  issueCategory: "consistency" | "l2" | "paradox" | "trigger" | "voice"
  reason: string
}

/** 교정 결과 (승인 후) */
export interface CorrectionApplyResult {
  correctionId: string
  sessionId: string
  turnNumber: number
  appliedAt: number
  updatedFields: string[]
}

/** 관리자 대시보드 통계 */
export interface ArenaAdminStats {
  totalSessions: number
  activeSessions: number
  completedSessions: number
  totalTurns: number
  totalTokensUsed: number
  avgOverallScore: number
  issueCount: number
  criticalIssueCount: number
  pendingCorrections: number
}

// ── 상수 ────────────────────────────────────────────────────

/** 기본 예산 정책 */
export const DEFAULT_BUDGET_POLICY: ArenaBudgetPolicy = {
  monthlyBudgetTokens: 500000,
  dailySessionLimit: 10,
  maxTokensPerSession: 15000,
  warningThreshold: 0.8,
  blockThreshold: 1.0,
}

/** 심판 판정에 사용되는 예상 토큰 */
export const JUDGMENT_TOKEN_ESTIMATE = 2000

/** 턴당 평균 토큰 */
export const AVG_TOKENS_PER_TURN = 500

// ══════════════════════════════════════════════════════════════
// 비용 추정
// ══════════════════════════════════════════════════════════════

/** 세션 비용 추정 */
export function estimateSessionCost(
  profileLoadLevel: ProfileLoadLevel,
  maxTurns: number,
  currentMonthUsed: number,
  policy: ArenaBudgetPolicy = DEFAULT_BUDGET_POLICY
): SessionCostEstimate {
  const profileTokens = PROFILE_TOKEN_ESTIMATES[profileLoadLevel]
  const turnTokens = maxTurns * AVG_TOKENS_PER_TURN
  const judgmentTokens = JUDGMENT_TOKEN_ESTIMATE
  const totalEstimatedTokens = profileTokens + turnTokens + judgmentTokens

  const remainingAfter = policy.monthlyBudgetTokens - currentMonthUsed - totalEstimatedTokens

  return {
    profileTokens,
    turnTokens,
    judgmentTokens,
    totalEstimatedTokens,
    withinBudget: remainingAfter >= 0,
    remainingAfter: Math.max(0, remainingAfter),
  }
}

// ══════════════════════════════════════════════════════════════
// 세션 승인 검사
// ══════════════════════════════════════════════════════════════

/** 세션 생성 가능 여부 검사 */
export function checkSessionApproval(
  currentMonthUsed: number,
  todaySessionCount: number,
  profileLoadLevel: ProfileLoadLevel,
  maxTurns: number,
  policy: ArenaBudgetPolicy = DEFAULT_BUDGET_POLICY
): SessionApprovalResult {
  const reasons: string[] = []

  // 일일 세션 한도
  if (todaySessionCount >= policy.dailySessionLimit) {
    reasons.push(`일일 세션 한도 초과: ${todaySessionCount}/${policy.dailySessionLimit}`)
  }

  // 비용 추정
  const estimate = estimateSessionCost(profileLoadLevel, maxTurns, currentMonthUsed, policy)

  // 세션당 최대 토큰
  if (estimate.totalEstimatedTokens > policy.maxTokensPerSession) {
    reasons.push(
      `세션 토큰 한도 초과: ${estimate.totalEstimatedTokens}/${policy.maxTokensPerSession}`
    )
  }

  // 월간 예산 차단 임계값
  const projectedUsage = currentMonthUsed + estimate.totalEstimatedTokens
  const projectedPercent = projectedUsage / policy.monthlyBudgetTokens
  if (projectedPercent >= policy.blockThreshold) {
    reasons.push(`월간 예산 차단 임계 도달: ${Math.round(projectedPercent * 100)}%`)
  }

  return {
    approved: reasons.length === 0,
    reasons,
  }
}

// ══════════════════════════════════════════════════════════════
// 지출 현황 추적
// ══════════════════════════════════════════════════════════════

/** 월간 지출 현황 계산 */
export function computeMonthlySpending(
  sessions: ArenaSession[],
  month: string,
  policy: ArenaBudgetPolicy = DEFAULT_BUDGET_POLICY
): MonthlySpendingSummary {
  const totalTokensUsed = sessions.reduce((sum, s) => sum + s.usedTokens, 0)
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED").length
  const cancelledSessions = sessions.filter((s) => s.status === "CANCELLED").length
  const usagePercent =
    policy.monthlyBudgetTokens > 0
      ? Math.round((totalTokensUsed / policy.monthlyBudgetTokens) * 100) / 100
      : 1

  let status: "NORMAL" | "WARNING" | "BLOCKED" = "NORMAL"
  if (usagePercent >= policy.blockThreshold) {
    status = "BLOCKED"
  } else if (usagePercent >= policy.warningThreshold) {
    status = "WARNING"
  }

  // 일별 분류
  const dailyMap = new Map<string, { tokens: number; count: number }>()
  for (const s of sessions) {
    const dateStr = new Date(s.createdAt).toISOString().slice(0, 10)
    const existing = dailyMap.get(dateStr) ?? { tokens: 0, count: 0 }
    dailyMap.set(dateStr, {
      tokens: existing.tokens + s.usedTokens,
      count: existing.count + 1,
    })
  }

  const dailyBreakdown: DailySpending[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      tokensUsed: data.tokens,
      sessionCount: data.count,
    }))

  return {
    month,
    totalTokensUsed,
    totalSessions: sessions.length,
    completedSessions,
    cancelledSessions,
    budgetTokens: policy.monthlyBudgetTokens,
    usagePercent,
    remainingTokens: Math.max(0, policy.monthlyBudgetTokens - totalTokensUsed),
    status,
    avgTokensPerSession: sessions.length > 0 ? Math.round(totalTokensUsed / sessions.length) : 0,
    dailyBreakdown,
  }
}

// ══════════════════════════════════════════════════════════════
// 교정 관리
// ══════════════════════════════════════════════════════════════

/** 교정 요청 생성 */
export function createCorrection(params: CreateCorrectionParams): CorrectionRequest {
  return {
    ...params,
    status: "PENDING",
    createdAt: Date.now(),
    reviewedAt: null,
    reviewedBy: null,
  }
}

/** 교정 승인 */
export function approveCorrection(
  correction: CorrectionRequest,
  reviewerId: string
): CorrectionRequest {
  if (correction.status !== "PENDING") return correction
  return {
    ...correction,
    status: "APPROVED",
    reviewedAt: Date.now(),
    reviewedBy: reviewerId,
  }
}

/** 교정 거부 */
export function rejectCorrection(
  correction: CorrectionRequest,
  reviewerId: string
): CorrectionRequest {
  if (correction.status !== "PENDING") return correction
  return {
    ...correction,
    status: "REJECTED",
    reviewedAt: Date.now(),
    reviewedBy: reviewerId,
  }
}

/** 교정 적용 결과 생성 (승인된 교정 → 어떤 필드가 업데이트되는지) */
export function buildCorrectionApplyResult(
  correction: CorrectionRequest
): CorrectionApplyResult | null {
  if (correction.status !== "APPROVED") return null

  const updatedFields: string[] = []
  switch (correction.issueCategory) {
    case "voice":
      updatedFields.push("voiceProfile.speechStyle", "voiceProfile.habitualExpressions")
      break
    case "consistency":
      updatedFields.push("factbook")
      break
    case "l2":
      updatedFields.push("coreTemperament")
      break
    case "paradox":
      updatedFields.push("narrativeDrive.volatility")
      break
    case "trigger":
      updatedFields.push("triggerMap")
      break
  }

  return {
    correctionId: correction.id,
    sessionId: correction.sessionId,
    turnNumber: correction.turnNumber,
    appliedAt: Date.now(),
    updatedFields,
  }
}

// ══════════════════════════════════════════════════════════════
// 관리자 대시보드 통계
// ══════════════════════════════════════════════════════════════

/** 관리자 대시보드 통계 계산 */
export function computeAdminStats(
  sessions: ArenaSession[],
  judgments: ArenaJudgment[],
  pendingCorrections: CorrectionRequest[]
): ArenaAdminStats {
  const activeSessions = sessions.filter(
    (s) => s.status === "RUNNING" || s.status === "PENDING"
  ).length
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED").length
  const totalTurns = sessions.reduce((sum, s) => sum + s.turns.length, 0)
  const totalTokensUsed = sessions.reduce((sum, s) => sum + s.usedTokens, 0)

  const scores = judgments.map((j) => j.overallScore)
  const avgOverallScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : 0

  const allIssues = judgments.flatMap((j) => j.issues)
  const criticalIssueCount = allIssues.filter((i) => i.severity === "critical").length

  return {
    totalSessions: sessions.length,
    activeSessions,
    completedSessions,
    totalTurns,
    totalTokensUsed,
    avgOverallScore,
    issueCount: allIssues.length,
    criticalIssueCount,
    pendingCorrections: pendingCorrections.filter((c) => c.status === "PENDING").length,
  }
}

// ══════════════════════════════════════════════════════════════
// 예산 정책 검증
// ══════════════════════════════════════════════════════════════

/** 예산 정책 유효성 검증 */
export function validateBudgetPolicy(policy: ArenaBudgetPolicy): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (policy.monthlyBudgetTokens <= 0) {
    errors.push("월간 예산은 0보다 커야 합니다")
  }
  if (policy.dailySessionLimit <= 0) {
    errors.push("일일 세션 한도는 0보다 커야 합니다")
  }
  if (policy.maxTokensPerSession <= 0) {
    errors.push("세션당 최대 토큰은 0보다 커야 합니다")
  }
  if (policy.warningThreshold <= 0 || policy.warningThreshold > 1) {
    errors.push("경고 임계값은 0~1 범위여야 합니다")
  }
  if (policy.blockThreshold <= 0 || policy.blockThreshold > 1) {
    errors.push("차단 임계값은 0~1 범위여야 합니다")
  }
  if (policy.warningThreshold >= policy.blockThreshold) {
    errors.push("경고 임계값은 차단 임계값보다 작아야 합니다")
  }

  return { valid: errors.length === 0, errors }
}

/** 예산 경고 레벨 판단 */
export function getBudgetAlertLevel(
  currentUsage: number,
  policy: ArenaBudgetPolicy
): "NORMAL" | "WARNING" | "CRITICAL" | "BLOCKED" {
  if (policy.monthlyBudgetTokens <= 0) return "BLOCKED"

  const percent = currentUsage / policy.monthlyBudgetTokens
  if (percent >= policy.blockThreshold) return "BLOCKED"
  if (percent >= (policy.warningThreshold + policy.blockThreshold) / 2) return "CRITICAL"
  if (percent >= policy.warningThreshold) return "WARNING"
  return "NORMAL"
}
