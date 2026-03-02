// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — Cost Runner (T299~T303)
// 구현계획서 §12 — DailyCostReport DB 집계, BudgetConfig CRUD,
// 예산 체크 + 자동 조치, 비용 모드 스케줄러 연동
// ═══════════════════════════════════════════════════════════════

import type { CostMode } from "./cost-mode"
import { getCostModeConfig } from "./cost-mode"
import type { BudgetAlert, CostOverrunAction } from "./budget-alert"
import { checkBudgetAlerts } from "./budget-alert"

// ── DI Provider ──────────────────────────────────────────────

export interface CostRunnerProvider {
  /** 특정 날짜의 LLM 사용 로그 집계 */
  aggregateDailyUsage(date: Date): Promise<{
    totalCost: number
    postingCost: number
    commentCost: number
    interviewCost: number
    arenaCost: number
    otherCost: number
    llmCalls: number
    cacheHitRate: number
  }>

  /** DailyCostReport DB 저장 (upsert) */
  saveDailyCostReport(params: {
    date: Date
    totalCost: number
    postingCost: number
    commentCost: number
    interviewCost: number
    arenaCost: number
    otherCost: number
    llmCalls: number
    cacheHitRate: number
  }): Promise<{ id: string }>

  /** 특정 월의 DailyCostReport 목록 조회 */
  getMonthlyDailyReports(
    monthStart: Date,
    monthEnd: Date
  ): Promise<
    Array<{
      date: Date
      totalCost: number
      postingCost: number
      commentCost: number
      interviewCost: number
      arenaCost: number
      otherCost: number
      llmCalls: number
      cacheHitRate: number | null
    }>
  >

  /** BudgetConfig 조회 (singleton) */
  getBudgetConfig(): Promise<BudgetConfigData>

  /** BudgetConfig 업데이트 */
  updateBudgetConfig(params: Partial<BudgetConfigUpdate>): Promise<BudgetConfigData>

  /** 이번 달 총 지출 */
  getMonthlySpending(): Promise<number>

  /** 오늘 총 지출 */
  getDailySpending(): Promise<number>
}

// ── BudgetConfig 타입 ────────────────────────────────────────

export interface BudgetConfigData {
  id: string
  dailyBudget: number
  monthlyBudget: number
  costMode: CostMode
  alertThresholds: {
    info: number
    warning: number
    critical: number
    emergency: number
  } | null
  autoActions: Record<string, unknown> | null
  updatedAt: Date
  updatedBy: string | null
}

export interface BudgetConfigUpdate {
  dailyBudget: number
  monthlyBudget: number
  costMode: CostMode
  alertThresholds: {
    info: number
    warning: number
    critical: number
    emergency: number
  }
  autoActions: Record<string, unknown>
  updatedBy: string
}

// ── T300: DailyCostReport 일일 집계 + DB 저장 ────────────────

/**
 * 전일 비용 집계 → DailyCostReport DB 저장.
 *
 * cron job (매일 00:05 UTC)에서 호출.
 */
export async function aggregateAndSaveDailyCostReport(
  provider: CostRunnerProvider,
  targetDate?: Date
): Promise<{ id: string; totalCost: number }> {
  const date = targetDate ?? getYesterday()

  const usage = await provider.aggregateDailyUsage(date)

  const result = await provider.saveDailyCostReport({
    date,
    ...usage,
  })

  console.log(
    `[CostRunner] DailyCostReport saved: ${date.toISOString().slice(0, 10)} — $${usage.totalCost.toFixed(4)}, ${usage.llmCalls} calls`
  )

  return { id: result.id, totalCost: usage.totalCost }
}

// ── T299: 예산 체크 + 자동 조치 결정 ────────────────────────

export interface BudgetCheckResult {
  allowed: boolean
  alerts: BudgetAlert[]
  autoAction: CostOverrunAction | null
  reason: string
}

/**
 * 예산 체크: 현재 지출 대비 예산 초과 여부 판단.
 *
 * 스케줄러/파이프라인 실행 전 호출.
 * - EMERGENCY/CRITICAL auto-action → allowed: false
 * - WARNING auto-action → allowed: true (빈도 감소 적용)
 * - INFO/없음 → allowed: true
 */
export async function checkBudgetBeforeExecution(
  provider: CostRunnerProvider
): Promise<BudgetCheckResult> {
  const config = await provider.getBudgetConfig()
  const [dailySpending, monthlySpending] = await Promise.all([
    provider.getDailySpending(),
    provider.getMonthlySpending(),
  ])

  const alerts = checkBudgetAlerts({
    dailySpending,
    dailyBudget: config.dailyBudget,
    monthlySpending,
    monthlyBudget: config.monthlyBudget,
  })

  if (alerts.length === 0) {
    return { allowed: true, alerts: [], autoAction: null, reason: "Budget within limits" }
  }

  // 가장 심각한 알림의 auto-action
  const mostSevere = alerts[0]
  const autoAction = mostSevere.autoAction

  if (mostSevere.level === "EMERGENCY") {
    return {
      allowed: false,
      alerts,
      autoAction,
      reason: `EMERGENCY: ${mostSevere.message}`,
    }
  }

  if (mostSevere.level === "CRITICAL" && autoAction?.type === "FREEZE_GENERATION") {
    return {
      allowed: false,
      alerts,
      autoAction,
      reason: `CRITICAL: ${mostSevere.message}`,
    }
  }

  return {
    allowed: true,
    alerts,
    autoAction,
    reason: mostSevere.message,
  }
}

// ── T302: 비용 모드 → 스케줄러 빈도 조회 ────────────────────

export interface SchedulerFrequencyOverride {
  postsPerDay: number
  commentsPerDay: number
  interviewSampleRate: number
}

/**
 * BudgetConfig의 costMode에서 스케줄러 빈도 설정 조회.
 *
 * 스케줄러에서 빈도 결정 시 호출.
 */
export async function getSchedulerFrequencyFromBudget(
  provider: CostRunnerProvider
): Promise<SchedulerFrequencyOverride> {
  const config = await provider.getBudgetConfig()
  const modeConfig = getCostModeConfig(config.costMode)

  return {
    postsPerDay: modeConfig.frequencies.postsPerDay,
    commentsPerDay: modeConfig.frequencies.commentsPerDay,
    interviewSampleRate: modeConfig.frequencies.interviewSampleRate,
  }
}

/**
 * auto-action에 따른 빈도 조정.
 *
 * WARNING: REDUCE_POST_FREQUENCY → 빈도 감소
 * CRITICAL: FREEZE_GENERATION → 0
 */
export function applyAutoActionToFrequency(
  base: SchedulerFrequencyOverride,
  autoAction: CostOverrunAction | null
): SchedulerFrequencyOverride {
  if (!autoAction) return base

  switch (autoAction.type) {
    case "REDUCE_POST_FREQUENCY":
      return {
        ...base,
        postsPerDay: base.postsPerDay * autoAction.factor,
        commentsPerDay: base.commentsPerDay * autoAction.factor,
      }
    case "FREEZE_GENERATION":
      return {
        postsPerDay: 0,
        commentsPerDay: 0,
        interviewSampleRate: 0,
      }
    case "FREEZE_AUTONOMOUS":
      return {
        postsPerDay: 0,
        commentsPerDay: 0,
        interviewSampleRate: 0,
      }
    case "GLOBAL_FREEZE":
      return {
        postsPerDay: 0,
        commentsPerDay: 0,
        interviewSampleRate: 0,
      }
  }
}

// ── T301: BudgetConfig CRUD ──────────────────────────────────

/**
 * BudgetConfig 조회 (admin dashboard용).
 */
export async function getBudgetConfigForAdmin(
  provider: CostRunnerProvider
): Promise<BudgetConfigData> {
  return provider.getBudgetConfig()
}

/**
 * BudgetConfig 업데이트 (admin dashboard용).
 */
export async function updateBudgetConfigForAdmin(
  provider: CostRunnerProvider,
  updates: Partial<BudgetConfigUpdate>
): Promise<BudgetConfigData> {
  return provider.updateBudgetConfig(updates)
}

// ── 유틸리티 ─────────────────────────────────────────────────

function getYesterday(): Date {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(0, 0, 0, 0)
  return d
}
