// Autonomy Module v5.0 — per-persona 자율 동작 정책
export {
  type AutonomyPolicy,
  type CorrectionConfig,
  type MemoryConfig,
  type ValidationError,
  DEFAULT_AUTONOMY_POLICY,
  getAutonomyPolicy,
  validateAutonomyPolicy,
} from "./autonomy-policy"

// T402: 자율 교정 분기
export {
  type AutoApplyConfig,
  type AutoApplyDecision,
  getAutoApplyConfig,
  checkAutoApply,
  isAutoApplicable,
} from "./auto-correction"

// T403: 감사 로그
export {
  type AutonomyCorrectionLog,
  type CreateCorrectionLogInput,
  type CorrectionLogFilter,
  type OverCorrectionResult,
  buildCorrectionLog,
  detectOverCorrection,
  buildPatchSummary,
} from "./correction-log"

// T404: 자동 Arena 트리거
export {
  type AutoArenaTriggerResult,
  type AutoArenaTriggerParams,
  checkAutoArenaTrigger,
} from "./auto-arena-trigger"

// T405: 메타 인지
export {
  type SelfAssessment,
  type MetaCognitionReport as MetaCognitionReportType,
  type MetaCognitionInput,
  type MemoryStats,
  determineSelfAssessment,
  generateMetaCognitionReport,
} from "./meta-cognition"

// T407: 메타 인지 알림
export {
  type MetaCognitionAlertResult,
  sendMetaCognitionAlert,
  shouldSendAlert,
} from "./meta-cognition-alert"

// T408: 기억 정리
export {
  type PrunableMemory,
  type PruneDecision,
  type MemoryPruneResult,
  selectMemoriesToPrune,
} from "./memory-prune"

// T409: 기억 정리 통합
export {
  type PruneIntegrationProvider,
  type PruneIntegrationResult,
  runAutoPrune,
} from "./memory-prune-integration"
