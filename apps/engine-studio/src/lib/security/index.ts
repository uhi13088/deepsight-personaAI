// ═══════════════════════════════════════════════════════════════
// Security Module Index — v4.0 보안 3계층 아키텍처
// ═══════════════════════════════════════════════════════════════

// Gate Guard (입력 보안 계층)
export {
  // Rule-based filters
  checkInjectionPatterns,
  checkForbiddenWords,
  checkStructuralValidity,
  runRuleFilter,
  // Semantic filter
  runSemanticFilter,
  // Gate Guard pipeline
  runGateGuard,
  // Trust propagation
  computeTrustDecay,
  determineTrustLevel,
  computeTrustScore,
  // Source tagging
  createMemoryEntry,
  propagateMemoryEntry,
  isQuarantined,
  // Constants
  INJECTION_PATTERNS,
  FORBIDDEN_WORDS,
  STRUCTURAL_LIMITS,
  TRUST_PROPAGATION,
  SOURCE_TRUST,
} from "./gate-guard"
export type { SemanticFilterProvider } from "./gate-guard"

// Integrity Monitor (내부 감시 계층)
export {
  // Factbook hash verification
  verifyFactbookHash,
  // L1 drift detection
  vectorCosineSimilarity,
  l1ToArray,
  checkL1Drift,
  // Change log monitoring
  checkChangeLog,
  // Collective anomaly detection
  checkCollectiveAnomaly,
  // Full pipeline
  runIntegrityMonitor,
  // Constants
  DRIFT_THRESHOLDS,
  CHANGE_LIMITS,
  COLLECTIVE_THRESHOLDS,
} from "./integrity-monitor"
export type {
  DriftStatus,
  DriftCheckResult,
  ChangeLogEntry,
  ChangeLogCheckResult,
  CollectiveAnomalyType,
  CollectiveAnomalyResult,
  IntegrityAlertLevel,
  IntegrityMonitorResult,
} from "./integrity-monitor"

// Output Sentinel (출력 보안 계층)
export {
  // Rule-based output filters
  checkPII,
  checkSystemLeak,
  checkProfanity,
  checkFactbookViolation,
  // Full pipeline
  runOutputSentinel,
  // Quarantine management
  createQuarantineEntry,
  reviewQuarantineEntry,
  countPendingQuarantine,
  // Constants
  PII_PATTERNS,
  SYSTEM_LEAK_PATTERNS,
  PROFANITY_PATTERNS,
  FACTBOOK_NEGATION_PATTERNS,
} from "./output-sentinel"
export type {
  OutputViolationCategory,
  OutputViolation,
  OutputVerdict,
  OutputSentinelResult,
  QuarantineStatus,
  QuarantineEntry,
} from "./output-sentinel"
