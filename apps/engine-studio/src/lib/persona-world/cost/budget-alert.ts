// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Budget Alert System (Phase 8)
// 운영 설계서 §12.6 — 4단계 예산 알림 + 자동 조치
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type AlertLevel = "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY"
export type BudgetPeriod = "DAILY" | "MONTHLY"

export interface BudgetAlert {
  level: AlertLevel
  period: BudgetPeriod
  currentSpending: number
  budget: number
  usagePercentage: number
  message: string
  autoAction: CostOverrunAction | null
  triggeredAt: Date
}

export type CostOverrunAction =
  | { type: "REDUCE_POST_FREQUENCY"; factor: number }
  | { type: "FREEZE_GENERATION"; allowLikesOnly: true }
  | { type: "FREEZE_AUTONOMOUS"; allowUserResponseOnly: true }
  | { type: "GLOBAL_FREEZE" }

// ── 알림 임계값 ───────────────────────────────────────────────

export interface BudgetThresholds {
  info: number
  warning: number
  critical: number
  emergency: number
}

export const DAILY_THRESHOLDS: BudgetThresholds = {
  info: 0.5, // 50%
  warning: 0.8, // 80%
  critical: 1.0, // 100%
  emergency: 1.5, // 150%
}

export const MONTHLY_THRESHOLDS: BudgetThresholds = {
  info: 0.6, // 60%
  warning: 0.8, // 80%
  critical: 0.9, // 90%
  emergency: 1.0, // 100%
}

// ── 알림 체크 ──────────────────────────────────────────────────

/**
 * 일일 예산 알림 체크.
 */
export function checkDailyBudget(currentSpending: number, dailyBudget: number): BudgetAlert | null {
  if (dailyBudget <= 0) return null

  const ratio = currentSpending / dailyBudget
  return checkThresholds(ratio, currentSpending, dailyBudget, "DAILY", DAILY_THRESHOLDS)
}

/**
 * 월간 예산 알림 체크.
 */
export function checkMonthlyBudget(
  currentSpending: number,
  monthlyBudget: number
): BudgetAlert | null {
  if (monthlyBudget <= 0) return null

  const ratio = currentSpending / monthlyBudget
  return checkThresholds(ratio, currentSpending, monthlyBudget, "MONTHLY", MONTHLY_THRESHOLDS)
}

function checkThresholds(
  ratio: number,
  spending: number,
  budget: number,
  period: BudgetPeriod,
  thresholds: BudgetThresholds
): BudgetAlert | null {
  const usagePercentage = round(ratio * 100)

  if (ratio >= thresholds.emergency) {
    return {
      level: "EMERGENCY",
      period,
      currentSpending: spending,
      budget,
      usagePercentage,
      message: `${period} 예산 ${usagePercentage}% 사용 — 긴급 조치 필요`,
      autoAction: getAutoAction("EMERGENCY"),
      triggeredAt: new Date(),
    }
  }

  if (ratio >= thresholds.critical) {
    return {
      level: "CRITICAL",
      period,
      currentSpending: spending,
      budget,
      usagePercentage,
      message: `${period} 예산 ${usagePercentage}% 사용 — 즉시 알림`,
      autoAction: getAutoAction("CRITICAL"),
      triggeredAt: new Date(),
    }
  }

  if (ratio >= thresholds.warning) {
    return {
      level: "WARNING",
      period,
      currentSpending: spending,
      budget,
      usagePercentage,
      message: `${period} 예산 ${usagePercentage}% 사용 — 경고`,
      autoAction: getAutoAction("WARNING"),
      triggeredAt: new Date(),
    }
  }

  if (ratio >= thresholds.info) {
    return {
      level: "INFO",
      period,
      currentSpending: spending,
      budget,
      usagePercentage,
      message: `${period} 예산 ${usagePercentage}% 사용`,
      autoAction: null,
      triggeredAt: new Date(),
    }
  }

  return null
}

// ── 자동 조치 ──────────────────────────────────────────────────

/**
 * 비용 초과 수준별 자동 조치.
 */
function getAutoAction(level: AlertLevel): CostOverrunAction | null {
  switch (level) {
    case "INFO":
      return null
    case "WARNING":
      return { type: "REDUCE_POST_FREQUENCY", factor: 0.5 }
    case "CRITICAL":
      return { type: "FREEZE_GENERATION", allowLikesOnly: true }
    case "EMERGENCY":
      return { type: "GLOBAL_FREEZE" }
  }
}

/**
 * 비용 초과 시 추가 조치 결정 (120% 구간).
 */
export function getCostOverrunAction(usagePercentage: number): CostOverrunAction | null {
  if (usagePercentage >= 150) {
    return { type: "GLOBAL_FREEZE" }
  }
  if (usagePercentage >= 120) {
    return { type: "FREEZE_AUTONOMOUS", allowUserResponseOnly: true }
  }
  if (usagePercentage >= 100) {
    return { type: "FREEZE_GENERATION", allowLikesOnly: true }
  }
  if (usagePercentage >= 80) {
    return { type: "REDUCE_POST_FREQUENCY", factor: 0.5 }
  }
  return null
}

// ── 전체 예산 체크 ────────────────────────────────────────────

/**
 * 일일 + 월간 예산 체크 (가장 심각한 알림 반환).
 */
export function checkBudgetAlerts(params: {
  dailySpending: number
  dailyBudget: number
  monthlySpending: number
  monthlyBudget: number
}): BudgetAlert[] {
  const alerts: BudgetAlert[] = []

  const daily = checkDailyBudget(params.dailySpending, params.dailyBudget)
  if (daily) alerts.push(daily)

  const monthly = checkMonthlyBudget(params.monthlySpending, params.monthlyBudget)
  if (monthly) alerts.push(monthly)

  // 심각도 정렬
  const levelOrder: AlertLevel[] = ["EMERGENCY", "CRITICAL", "WARNING", "INFO"]
  alerts.sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level))

  return alerts
}

// ── 유틸리티 ──────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
