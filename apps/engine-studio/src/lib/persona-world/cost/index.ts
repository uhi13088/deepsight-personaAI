// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Cost Module (Phase 8)
// 비용 추적, 예산 알림, 비용 모드, 최적화 통합 배럴
// ═══════════════════════════════════════════════════════════════

// Usage Tracker
export { createUsageLog, computeDailyCostReport, computeMonthlyCostReport } from "./usage-tracker"
export type {
  LLMCallType,
  LlmUsageLog,
  CallTypeBreakdown,
  PersonaCostBreakdown,
  CacheEfficiency,
  DailyCostReport,
  MonthlyCostReport,
} from "./usage-tracker"

// Budget Alert
export {
  checkDailyBudget,
  checkMonthlyBudget,
  checkBudgetAlerts,
  getCostOverrunAction,
  DAILY_THRESHOLDS,
  MONTHLY_THRESHOLDS,
} from "./budget-alert"
export type {
  AlertLevel,
  BudgetPeriod,
  BudgetAlert,
  CostOverrunAction,
  BudgetThresholds,
} from "./budget-alert"

// Cost Mode
export {
  getCostModeConfig,
  getAllCostModes,
  applyCostMode,
  estimateCost,
  compareModes,
} from "./cost-mode"
export type { CostMode, CostModeConfig, CostModeApplication, CostEstimate } from "./cost-mode"

// Optimizer
export {
  getInterviewRateByGrade,
  computeAdaptiveInterviewCost,
  computeBatchCommentCost,
  computeCacheOptimizationCost,
  computeFullOptimization,
  optimizeLlmCallOrdering,
  DEFAULT_BATCH_CONFIG,
} from "./optimizer"
export type {
  OptimizationResult,
  OptimizationSummary,
  PendingLLMCall,
  BatchConfig,
} from "./optimizer"

// Integration
export { buildCostDashboard, changeCostMode } from "./cost-integration"
export type { CostDataProvider, CostDashboard } from "./cost-integration"

// Cost Runner (v4.0 T299~T303)
export {
  aggregateAndSaveDailyCostReport,
  checkBudgetBeforeExecution,
  getSchedulerFrequencyFromBudget,
  applyAutoActionToFrequency,
  getBudgetConfigForAdmin,
  updateBudgetConfigForAdmin,
} from "./cost-runner"
export type {
  CostRunnerProvider,
  BudgetConfigData,
  BudgetConfigUpdate,
  BudgetCheckResult,
  SchedulerFrequencyOverride,
} from "./cost-runner"
