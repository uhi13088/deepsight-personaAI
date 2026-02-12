// ═══════════════════════════════════════════════════════════════
// Testing Module — Barrel Export
// T55: 페르소나 테스트 + A/B 테스트 + 성과 모니터링
// ═══════════════════════════════════════════════════════════════

export {
  analyzeTone,
  checkProhibitedWords,
  evaluateVectorAlignment,
  evaluateLengthScore,
  evaluateResponse,
  createSingleTestResult,
} from "./single-content-test"
export type {
  ContentTestInput,
  ToneAnalysis,
  ProhibitedWordMatch,
  ContentTestEvaluation,
  SingleContentTestResult,
} from "./single-content-test"

export {
  calculateConsistency,
  detectAnomalies,
  calculateStats,
  createBatchTestResult,
} from "./batch-test"
export type { BatchTestConfig, BatchAnomaly, BatchTestStats, BatchTestResult } from "./batch-test"

export {
  parseTrafficSplit,
  createABTestConfig,
  startABTest,
  pauseABTest,
  cancelABTest,
  compareMetric,
  calculateABTestResult,
  isTestExpired,
} from "./ab-test"
export type {
  TrafficSplit,
  ABTestStatus,
  ABMetricKey,
  ABTestConfig,
  ABMetricResult,
  ABTestResult,
} from "./ab-test"

export {
  createSimulationSession,
  estimatePressureLevel,
  analyzeTurn,
  addTurn,
  generateConsistencyReport,
} from "./persona-simulator"
export type {
  SimulationTurn,
  TurnAnalysis,
  SimulationSession,
  ConsistencyReport,
} from "./persona-simulator"

export {
  computeMetrics,
  checkAlerts,
  acknowledgeAlert,
  generateSuggestions,
  buildDashboardData,
  DEFAULT_ALERT_THRESHOLDS,
} from "./monitoring"
export type {
  PerformanceMetrics,
  ComputedMetrics,
  AlertType,
  AlertSeverity,
  MonitoringAlert,
  AlertThresholds,
  ImprovementSuggestion,
  DashboardData,
} from "./monitoring"
