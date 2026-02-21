// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Moderation Module Index (Phase 7-A)
// ═══════════════════════════════════════════════════════════════

// Auto-Moderator (3-Stage Pipeline)
export {
  runStage1,
  runStage2,
  runStage3,
  runModerationPipeline,
  sanitizePII,
  getEscalationAction,
} from "./auto-moderator"
export type {
  ModerationAction,
  DetectionType,
  ModerationResult,
  ModerationDetection,
  EscalationAction,
  AsyncAnalysisInput,
} from "./auto-moderator"

// Report Handler (6종 카테고리)
export {
  submitReport,
  getReportStats,
  getCategorySeverity,
  REPORT_CATEGORY_CONFIG,
} from "./report-handler"
export type {
  ReportCategory,
  ReportResolution,
  ReportCategoryConfig,
  ReportInput,
  ReportResult,
  ReportStats,
  ReportDataProvider,
} from "./report-handler"

// Moderation Actions
export { executeAction } from "./moderation-actions"
export type {
  ActionType,
  ActionResult,
  AuditLogEntry,
  ModerationActionProvider,
} from "./moderation-actions"

// Dashboard Service
export { buildDashboard, checkKPIAlerts } from "./dashboard-service"
export type {
  DashboardOverview,
  ActivityStats,
  QualityStats,
  SecurityStats,
  ReportOverview,
  DashboardAlert,
  DashboardDataProvider,
} from "./dashboard-service"
