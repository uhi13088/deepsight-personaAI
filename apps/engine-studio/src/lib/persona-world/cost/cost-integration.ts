// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Cost Integration (Phase 8)
// DI 기반 비용 관리 통합 서비스
// 4개 모듈(usage-tracker, budget-alert, cost-mode, optimizer)을
// DB 데이터와 연결하는 브릿지 계층
// ═══════════════════════════════════════════════════════════════

import type { LlmUsageLog, DailyCostReport, MonthlyCostReport } from "./usage-tracker"
import { computeDailyCostReport, computeMonthlyCostReport } from "./usage-tracker"
import type { BudgetAlert } from "./budget-alert"
import { checkBudgetAlerts } from "./budget-alert"
import type { CostMode, CostModeConfig, CostModeApplication, CostEstimate } from "./cost-mode"
import { getCostModeConfig, getAllCostModes, applyCostMode, compareModes } from "./cost-mode"
import type { OptimizationSummary } from "./optimizer"
import { computeFullOptimization } from "./optimizer"
import type { PISGrade } from "../quality/integrity-score"

// ── DI Provider ──────────────────────────────────────────────

export interface CostDataProvider {
  /** 오늘의 LLM 사용 로그 */
  getTodayUsageLogs(): Promise<LlmUsageLog[]>

  /** 이번 달 일별 비용 리포트 (이미 집계된 데이터) */
  getMonthDailyReports(month: string): Promise<DailyCostReport[]>

  /** 현재 비용 모드 조회 */
  getCurrentCostMode(): Promise<CostMode>

  /** 비용 모드 변경 */
  setCostMode(mode: CostMode): Promise<void>

  /** 일일 예산 */
  getDailyBudget(): Promise<number>

  /** 월간 예산 */
  getMonthlyBudget(): Promise<number>

  /** 이번 달 총 지출 */
  getMonthlySpending(): Promise<number>

  /** 활성 페르소나 수 */
  getActivePersonaCount(): Promise<number>

  /** 활성 페르소나 PIS 등급 분포 */
  getPersonaPISDistribution(): Promise<Array<{ personaId: string; grade: PISGrade }>>

  /** 일일 댓글 수 */
  getDailyCommentCount(): Promise<number>

  /** 일일 포스트 수 */
  getDailyPostCount(): Promise<number>
}

// ── 통합 대시보드 ──────────────────────────────────────────────

export interface CostDashboard {
  dailyReport: DailyCostReport
  monthlyReport: MonthlyCostReport
  alerts: BudgetAlert[]
  currentMode: CostModeConfig
  modeApplication: CostModeApplication
  modeComparison: CostEstimate[]
  optimization: OptimizationSummary
}

/**
 * 비용 대시보드 전체 데이터 수집.
 */
export async function buildCostDashboard(provider: CostDataProvider): Promise<CostDashboard> {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)

  const [
    todayLogs,
    monthDailyReports,
    currentCostMode,
    dailyBudget,
    monthlyBudget,
    monthlySpending,
    activePersonaCount,
    pisDistribution,
    dailyComments,
    dailyPosts,
  ] = await Promise.all([
    provider.getTodayUsageLogs(),
    provider.getMonthDailyReports(currentMonth),
    provider.getCurrentCostMode(),
    provider.getDailyBudget(),
    provider.getMonthlyBudget(),
    provider.getMonthlySpending(),
    provider.getActivePersonaCount(),
    provider.getPersonaPISDistribution(),
    provider.getDailyCommentCount(),
    provider.getDailyPostCount(),
  ])

  // 일간 리포트
  const dailyReport = computeDailyCostReport(todayLogs, dailyBudget)

  // 월간 리포트
  const monthlyReport = computeMonthlyCostReport(monthDailyReports, monthlyBudget)

  // 예산 알림
  const alerts = checkBudgetAlerts({
    dailySpending: dailyReport.totalCost,
    dailyBudget,
    monthlySpending,
    monthlyBudget,
  })

  // 비용 모드
  const currentMode = getCostModeConfig(currentCostMode)
  const modeApplication = applyCostMode(currentCostMode, activePersonaCount)
  const modeComparison = compareModes(activePersonaCount)

  // 최적화 분석
  const optimization = computeFullOptimization({
    personas: pisDistribution,
    dailyComments,
    dailyPosts,
  })

  return {
    dailyReport,
    monthlyReport,
    alerts,
    currentMode,
    modeApplication,
    modeComparison,
    optimization,
  }
}

/**
 * 비용 모드 변경 + 적용 결과 반환.
 */
export async function changeCostMode(
  provider: CostDataProvider,
  newMode: CostMode
): Promise<CostModeApplication> {
  const activePersonaCount = await provider.getActivePersonaCount()
  await provider.setCostMode(newMode)
  return applyCostMode(newMode, activePersonaCount)
}

// ── Re-exports for convenience ──────────────────────────────

export { getAllCostModes }
export type { CostMode, CostModeConfig, CostModeApplication, CostEstimate }
export type { LlmUsageLog, DailyCostReport, MonthlyCostReport }
export type { BudgetAlert }
export type { OptimizationSummary }
