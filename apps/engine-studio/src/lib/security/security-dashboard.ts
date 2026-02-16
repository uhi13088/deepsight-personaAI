// ═══════════════════════════════════════════════════════════════
// Security Dashboard — 관리자 보안 대시보드
// T155: 보안 3계층 + 킬 스위치 통합 모니터링
// ═══════════════════════════════════════════════════════════════

import type { GateResult, RuleViolation, MemoryEntry } from "@/types"
import type {
  IntegrityMonitorResult,
  IntegrityAlertLevel,
  DriftCheckResult,
  ChangeLogCheckResult,
  CollectiveAnomalyResult,
} from "./integrity-monitor"
import type {
  OutputSentinelResult,
  OutputViolation,
  QuarantineEntry,
  QuarantineStatus,
} from "./output-sentinel"
import type { SystemSafetyConfig, SafetyFeatureKey, AutoTriggerResult } from "./kill-switch"
import type { ProvenanceData } from "./data-provenance"

// ── 타입 ──────────────────────────────────────────────────────

/** 보안 계층 식별자 */
export type SecurityLayer = "gate_guard" | "integrity_monitor" | "output_sentinel" | "kill_switch"

/** 보안 알림 심각도 */
export type SecurityAlertSeverity = "info" | "warning" | "critical"

/** 보안 알림 */
export interface SecurityAlert {
  id: string
  layer: SecurityLayer
  severity: SecurityAlertSeverity
  title: string
  message: string
  timestamp: number
  /** 관련 페르소나 ID (있는 경우) */
  personaId: string | null
  /** 자동 해결 여부 */
  autoResolvable: boolean
}

/** Gate Guard 계층 메트릭 */
export interface GateGuardMetrics {
  /** 기간 내 총 검사 수 */
  totalChecks: number
  /** 판정별 카운트 */
  verdictCounts: Record<"pass" | "suspicious" | "blocked", number>
  /** 카테고리별 위반 수 */
  violationsByCategory: Record<string, number>
  /** 차단률 */
  blockRate: number
  /** 평균 처리 시간 (ms) */
  avgProcessingTimeMs: number
}

/** Integrity Monitor 계층 메트릭 */
export interface IntegrityMetrics {
  /** 팩트북 무결성 상태 */
  factbookIntact: boolean
  /** L1 드리프트 상태 */
  driftStatus: DriftCheckResult["status"]
  /** 드리프트 유사도 */
  driftSimilarity: number
  /** 플래그된 컨텍스트 수 */
  flaggedContextCount: number
  /** 일일 총 변경 수 */
  dailyTotalChanges: number
  /** 집단 이상 타입 */
  collectiveAnomaly: CollectiveAnomalyResult["anomaly"]
  /** 집단 평균 mood */
  collectiveAverageMood: number
  /** 전체 경고 수준 */
  alertLevel: IntegrityAlertLevel
}

/** Output Sentinel 계층 메트릭 */
export interface OutputSentinelMetrics {
  /** 총 검사 수 */
  totalChecks: number
  /** 판정별 카운트 */
  verdictCounts: Record<"clean" | "flagged" | "blocked", number>
  /** 카테고리별 위반 수 */
  violationsByCategory: Record<string, number>
  /** 격리 대기 건수 */
  pendingQuarantineCount: number
  /** 총 격리 건수 */
  totalQuarantineCount: number
  /** 격리 상태별 카운트 */
  quarantineByStatus: Record<QuarantineStatus, number>
}

/** Kill Switch 계층 메트릭 */
export interface KillSwitchMetrics {
  /** 긴급 동결 여부 */
  emergencyFreeze: boolean
  /** 동결 사유 */
  freezeReason: string | null
  /** 활성화된 기능 수 */
  enabledFeatureCount: number
  /** 총 기능 수 */
  totalFeatureCount: number
  /** 기능별 상태 */
  featureStatuses: Array<{
    key: SafetyFeatureKey
    enabled: boolean
    disabledReason?: string
  }>
  /** 자동 트리거 결과 */
  autoTriggerResults: AutoTriggerResult[]
}

/** 출처 추적 메트릭 */
export interface ProvenanceMetrics {
  /** 총 엔트리 수 */
  totalEntries: number
  /** 평균 신뢰도 */
  averageTrust: number
  /** 격리 대상 수 */
  quarantinedCount: number
  /** 최대 전파 깊이 */
  maxPropagationDepth: number
  /** 신뢰도 분포 */
  trustDistribution: {
    high: number // >= 0.8
    medium: number // >= 0.5
    low: number // >= 0.2
    minimal: number // < 0.2
  }
}

/** 보안 전체 상태 */
export type OverallSecurityStatus = "healthy" | "warning" | "critical" | "frozen"

/** 보안 대시보드 전체 */
export interface SecurityDashboard {
  /** 전체 보안 상태 */
  overallStatus: OverallSecurityStatus
  /** 마지막 업데이트 시각 */
  updatedAt: number
  /** 계층별 메트릭 */
  gateGuard: GateGuardMetrics
  integrity: IntegrityMetrics
  outputSentinel: OutputSentinelMetrics
  killSwitch: KillSwitchMetrics
  provenance: ProvenanceMetrics
  /** 통합 보안 알림 (모든 계층) */
  alerts: SecurityAlert[]
  /** 요약 텍스트 */
  summary: string
}

// ── Gate Guard 메트릭 집계 ──────────────────────────────────

/** GateResult 목록에서 Gate Guard 메트릭 집계 */
export function aggregateGateGuardMetrics(results: GateResult[]): GateGuardMetrics {
  const verdictCounts: GateGuardMetrics["verdictCounts"] = {
    pass: 0,
    suspicious: 0,
    blocked: 0,
  }

  const violationsByCategory: Record<string, number> = {}
  let totalTimeMs = 0

  for (const result of results) {
    verdictCounts[result.verdict]++
    totalTimeMs += result.processingTimeMs

    for (const violation of result.ruleResult.violations) {
      violationsByCategory[violation.category] = (violationsByCategory[violation.category] ?? 0) + 1
    }
  }

  const totalChecks = results.length
  return {
    totalChecks,
    verdictCounts,
    violationsByCategory,
    blockRate:
      totalChecks > 0 ? Math.round((verdictCounts.blocked / totalChecks) * 1000) / 1000 : 0,
    avgProcessingTimeMs: totalChecks > 0 ? Math.round((totalTimeMs / totalChecks) * 100) / 100 : 0,
  }
}

// ── Integrity Monitor 메트릭 집계 ──────────────────────────

/** IntegrityMonitorResult에서 Integrity 메트릭 추출 */
export function extractIntegrityMetrics(result: IntegrityMonitorResult): IntegrityMetrics {
  return {
    factbookIntact: result.factbookIntegrity.verified,
    driftStatus: result.drift.status,
    driftSimilarity: result.drift.similarity,
    flaggedContextCount: result.changeLog.flaggedContextIds.length,
    dailyTotalChanges: result.changeLog.totalDailyChanges,
    collectiveAnomaly: result.collective.anomaly,
    collectiveAverageMood: result.collective.averageMood,
    alertLevel: result.alertLevel,
  }
}

// ── Output Sentinel 메트릭 집계 ────────────────────────────

/** OutputSentinelResult 목록 + QuarantineEntry 목록에서 Output 메트릭 집계 */
export function aggregateOutputSentinelMetrics(
  results: OutputSentinelResult[],
  quarantineEntries: QuarantineEntry[]
): OutputSentinelMetrics {
  const verdictCounts: OutputSentinelMetrics["verdictCounts"] = {
    clean: 0,
    flagged: 0,
    blocked: 0,
  }

  const violationsByCategory: Record<string, number> = {}

  for (const result of results) {
    verdictCounts[result.verdict]++
    for (const violation of result.violations) {
      violationsByCategory[violation.category] = (violationsByCategory[violation.category] ?? 0) + 1
    }
  }

  const quarantineByStatus: Record<QuarantineStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    deleted: 0,
  }

  for (const entry of quarantineEntries) {
    quarantineByStatus[entry.status]++
  }

  return {
    totalChecks: results.length,
    verdictCounts,
    violationsByCategory,
    pendingQuarantineCount: quarantineByStatus.pending,
    totalQuarantineCount: quarantineEntries.length,
    quarantineByStatus,
  }
}

// ── Kill Switch 메트릭 집계 ────────────────────────────────

/** SystemSafetyConfig + AutoTriggerResult[]에서 Kill Switch 메트릭 추출 */
export function extractKillSwitchMetrics(
  config: SystemSafetyConfig,
  triggerResults: AutoTriggerResult[]
): KillSwitchMetrics {
  const featureKeys = Object.keys(config.featureToggles) as SafetyFeatureKey[]
  const featureStatuses = featureKeys.map((key) => ({
    key,
    enabled: config.featureToggles[key].enabled,
    disabledReason: config.featureToggles[key].disabledReason,
  }))

  const enabledCount = config.emergencyFreeze ? 0 : featureStatuses.filter((f) => f.enabled).length

  return {
    emergencyFreeze: config.emergencyFreeze,
    freezeReason: config.freezeReason ?? null,
    enabledFeatureCount: enabledCount,
    totalFeatureCount: featureKeys.length,
    featureStatuses,
    autoTriggerResults: triggerResults,
  }
}

// ── Provenance 메트릭 집계 ────────────────────────────────

/** ProvenanceData 목록에서 출처 추적 메트릭 집계 */
export function aggregateProvenanceMetrics(entries: ProvenanceData[]): ProvenanceMetrics {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      averageTrust: 0,
      quarantinedCount: 0,
      maxPropagationDepth: 0,
      trustDistribution: { high: 0, medium: 0, low: 0, minimal: 0 },
    }
  }

  let trustSum = 0
  let quarantinedCount = 0
  let maxDepth = 0
  const distribution = { high: 0, medium: 0, low: 0, minimal: 0 }

  for (const entry of entries) {
    trustSum += entry.trustLevel
    if (entry.propagationDepth >= 3 || entry.trustLevel === 0) quarantinedCount++
    if (entry.propagationDepth > maxDepth) maxDepth = entry.propagationDepth

    if (entry.trustLevel >= 0.8) distribution.high++
    else if (entry.trustLevel >= 0.5) distribution.medium++
    else if (entry.trustLevel >= 0.2) distribution.low++
    else distribution.minimal++
  }

  return {
    totalEntries: entries.length,
    averageTrust: Math.round((trustSum / entries.length) * 1000) / 1000,
    quarantinedCount,
    maxPropagationDepth: maxDepth,
    trustDistribution: distribution,
  }
}

// ── 보안 알림 생성 ────────────────────────────────────────

/** Gate Guard 결과에서 보안 알림 생성 */
export function generateGateGuardAlerts(metrics: GateGuardMetrics, now?: number): SecurityAlert[] {
  const alerts: SecurityAlert[] = []
  const timestamp = now ?? Date.now()

  // 차단률 10% 초과 시 경고
  if (metrics.totalChecks >= 10 && metrics.blockRate > 0.1) {
    alerts.push({
      id: `gg-block-rate-${timestamp}`,
      layer: "gate_guard",
      severity: "warning",
      title: "높은 입력 차단률",
      message: `차단률 ${(metrics.blockRate * 100).toFixed(1)}% (${metrics.verdictCounts.blocked}/${metrics.totalChecks})`,
      timestamp,
      personaId: null,
      autoResolvable: false,
    })
  }

  // 차단률 30% 초과 시 critical
  if (metrics.totalChecks >= 10 && metrics.blockRate > 0.3) {
    alerts.push({
      id: `gg-block-critical-${timestamp}`,
      layer: "gate_guard",
      severity: "critical",
      title: "입력 차단률 위험 수준",
      message: `차단률 ${(metrics.blockRate * 100).toFixed(1)}% — 공격 시도 또는 시스템 오설정 가능`,
      timestamp,
      personaId: null,
      autoResolvable: false,
    })
  }

  // 인젝션 공격 감지
  const injectionCount = metrics.violationsByCategory["injection"] ?? 0
  if (injectionCount > 0) {
    alerts.push({
      id: `gg-injection-${timestamp}`,
      layer: "gate_guard",
      severity: injectionCount >= 5 ? "critical" : "warning",
      title: "인젝션 공격 감지",
      message: `${injectionCount}건의 프롬프트 인젝션 시도 감지`,
      timestamp,
      personaId: null,
      autoResolvable: false,
    })
  }

  return alerts
}

/** Integrity Monitor 결과에서 보안 알림 생성 */
export function generateIntegrityAlerts(metrics: IntegrityMetrics, now?: number): SecurityAlert[] {
  const alerts: SecurityAlert[] = []
  const timestamp = now ?? Date.now()

  // 팩트북 변조
  if (!metrics.factbookIntact) {
    alerts.push({
      id: `im-factbook-${timestamp}`,
      layer: "integrity_monitor",
      severity: "critical",
      title: "팩트북 변조 감지",
      message: "immutableFacts 해시 불일치 — 팩트북 무결성 위반",
      timestamp,
      personaId: null,
      autoResolvable: false,
    })
  }

  // L1 드리프트
  if (metrics.driftStatus === "critical") {
    alerts.push({
      id: `im-drift-critical-${timestamp}`,
      layer: "integrity_monitor",
      severity: "critical",
      title: "L1 벡터 드리프트 붕괴 위험",
      message: `코사인 유사도 ${metrics.driftSimilarity} — 정체성 붕괴 위험`,
      timestamp,
      personaId: null,
      autoResolvable: false,
    })
  } else if (metrics.driftStatus === "warning") {
    alerts.push({
      id: `im-drift-warning-${timestamp}`,
      layer: "integrity_monitor",
      severity: "warning",
      title: "L1 벡터 드리프트 경고",
      message: `코사인 유사도 ${metrics.driftSimilarity} — 정체성 변화 모니터링 필요`,
      timestamp,
      personaId: null,
      autoResolvable: true,
    })
  }

  // 집단 이상
  if (metrics.collectiveAnomaly === "depression") {
    alerts.push({
      id: `im-depression-${timestamp}`,
      layer: "integrity_monitor",
      severity: "warning",
      title: "집단 우울 경고",
      message: `평균 mood ${metrics.collectiveAverageMood} — 집단 정서 이상`,
      timestamp,
      personaId: null,
      autoResolvable: true,
    })
  } else if (metrics.collectiveAnomaly === "euphoria") {
    alerts.push({
      id: `im-euphoria-${timestamp}`,
      layer: "integrity_monitor",
      severity: "warning",
      title: "집단 흥분 경고",
      message: `평균 mood ${metrics.collectiveAverageMood} — 집단 정서 이상`,
      timestamp,
      personaId: null,
      autoResolvable: true,
    })
  }

  // 과도한 변경
  if (metrics.flaggedContextCount > 0) {
    alerts.push({
      id: `im-change-flag-${timestamp}`,
      layer: "integrity_monitor",
      severity: "warning",
      title: "mutableContext 과도한 변경",
      message: `${metrics.flaggedContextCount}개 항목에서 과도한 변경 감지`,
      timestamp,
      personaId: null,
      autoResolvable: true,
    })
  }

  return alerts
}

/** Output Sentinel 결과에서 보안 알림 생성 */
export function generateOutputSentinelAlerts(
  metrics: OutputSentinelMetrics,
  now?: number
): SecurityAlert[] {
  const alerts: SecurityAlert[] = []
  const timestamp = now ?? Date.now()

  // PII 유출
  const piiCount = metrics.violationsByCategory["pii"] ?? 0
  if (piiCount > 0) {
    alerts.push({
      id: `os-pii-${timestamp}`,
      layer: "output_sentinel",
      severity: "critical",
      title: "PII 유출 감지",
      message: `${piiCount}건의 개인정보 유출 시도 차단`,
      timestamp,
      personaId: null,
      autoResolvable: false,
    })
  }

  // 시스템 유출
  const leakCount = metrics.violationsByCategory["system_leak"] ?? 0
  if (leakCount > 0) {
    alerts.push({
      id: `os-leak-${timestamp}`,
      layer: "output_sentinel",
      severity: "critical",
      title: "시스템 정보 유출 감지",
      message: `${leakCount}건의 시스템 정보 유출 시도 차단`,
      timestamp,
      personaId: null,
      autoResolvable: false,
    })
  }

  // 격리 대기 건수 과다
  if (metrics.pendingQuarantineCount >= 10) {
    alerts.push({
      id: `os-quarantine-pile-${timestamp}`,
      layer: "output_sentinel",
      severity: "warning",
      title: "격리 리뷰 필요",
      message: `${metrics.pendingQuarantineCount}건의 격리 콘텐츠가 리뷰 대기 중`,
      timestamp,
      personaId: null,
      autoResolvable: false,
    })
  }

  return alerts
}

/** Kill Switch 상태에서 보안 알림 생성 */
export function generateKillSwitchAlerts(
  metrics: KillSwitchMetrics,
  now?: number
): SecurityAlert[] {
  const alerts: SecurityAlert[] = []
  const timestamp = now ?? Date.now()

  // 긴급 동결 활성
  if (metrics.emergencyFreeze) {
    alerts.push({
      id: `ks-freeze-${timestamp}`,
      layer: "kill_switch",
      severity: "critical",
      title: "긴급 동결 활성화",
      message: `사유: ${metrics.freezeReason ?? "알 수 없음"}`,
      timestamp,
      personaId: null,
      autoResolvable: false,
    })
  }

  // 자동 트리거 발동
  for (const trigger of metrics.autoTriggerResults) {
    if (trigger.action === "freeze") {
      alerts.push({
        id: `ks-auto-freeze-${trigger.triggeredAt}`,
        layer: "kill_switch",
        severity: "critical",
        title: "자동 동결 트리거 발동",
        message: trigger.reason,
        timestamp: trigger.triggeredAt,
        personaId: null,
        autoResolvable: false,
      })
    } else if (trigger.action === "warning") {
      alerts.push({
        id: `ks-auto-warn-${trigger.triggeredAt}`,
        layer: "kill_switch",
        severity: "warning",
        title: "자동 트리거 경고",
        message: trigger.reason,
        timestamp: trigger.triggeredAt,
        personaId: null,
        autoResolvable: true,
      })
    }
  }

  return alerts
}

// ── 전체 보안 상태 판정 ───────────────────────────────────

/** 모든 알림에서 전체 보안 상태 결정 */
export function determineOverallStatus(
  alerts: SecurityAlert[],
  emergencyFreeze: boolean
): OverallSecurityStatus {
  if (emergencyFreeze) return "frozen"
  if (alerts.some((a) => a.severity === "critical")) return "critical"
  if (alerts.some((a) => a.severity === "warning")) return "warning"
  return "healthy"
}

// ── 요약 텍스트 생성 ──────────────────────────────────────

/** 보안 대시보드 요약 텍스트 생성 */
export function generateSecuritySummary(dashboard: SecurityDashboard): string {
  const lines: string[] = []

  // 전체 상태
  const statusLabel: Record<OverallSecurityStatus, string> = {
    healthy: "정상",
    warning: "경고",
    critical: "위험",
    frozen: "긴급 동결",
  }
  lines.push(`보안 상태: ${statusLabel[dashboard.overallStatus]}`)

  // Gate Guard
  const gg = dashboard.gateGuard
  if (gg.totalChecks > 0) {
    lines.push(
      `입력 보안: ${gg.totalChecks}건 검사, 차단 ${gg.verdictCounts.blocked}건 (${(gg.blockRate * 100).toFixed(1)}%)`
    )
  }

  // Integrity
  const im = dashboard.integrity
  lines.push(
    `무결성: 팩트북 ${im.factbookIntact ? "정상" : "변조"}, 드리프트 ${im.driftStatus} (${im.driftSimilarity})`
  )

  // Output Sentinel
  const os = dashboard.outputSentinel
  if (os.totalChecks > 0) {
    lines.push(
      `출력 보안: ${os.totalChecks}건 검사, 차단 ${os.verdictCounts.blocked}건, 격리 대기 ${os.pendingQuarantineCount}건`
    )
  }

  // Kill Switch
  const ks = dashboard.killSwitch
  if (ks.emergencyFreeze) {
    lines.push(`킬 스위치: 긴급 동결 — ${ks.freezeReason ?? "사유 없음"}`)
  } else {
    lines.push(`킬 스위치: 정상 (${ks.enabledFeatureCount}/${ks.totalFeatureCount} 기능 활성)`)
  }

  // 알림 개수
  const criticalCount = dashboard.alerts.filter((a) => a.severity === "critical").length
  const warningCount = dashboard.alerts.filter((a) => a.severity === "warning").length
  if (criticalCount > 0 || warningCount > 0) {
    lines.push(`알림: critical ${criticalCount}건, warning ${warningCount}건`)
  }

  return lines.join("\n")
}

// ── 대시보드 빌드 ─────────────────────────────────────────

/** 보안 대시보드 빌드 파이프라인 입력 */
export interface BuildSecurityDashboardInput {
  gateResults: GateResult[]
  integrityResult: IntegrityMonitorResult
  outputResults: OutputSentinelResult[]
  quarantineEntries: QuarantineEntry[]
  safetyConfig: SystemSafetyConfig
  triggerResults: AutoTriggerResult[]
  provenanceEntries: ProvenanceData[]
}

/** 보안 대시보드 전체 빌드 */
export function buildSecurityDashboard(input: BuildSecurityDashboardInput): SecurityDashboard {
  const now = Date.now()

  // 계층별 메트릭 집계
  const gateGuard = aggregateGateGuardMetrics(input.gateResults)
  const integrity = extractIntegrityMetrics(input.integrityResult)
  const outputSentinel = aggregateOutputSentinelMetrics(
    input.outputResults,
    input.quarantineEntries
  )
  const killSwitch = extractKillSwitchMetrics(input.safetyConfig, input.triggerResults)
  const provenance = aggregateProvenanceMetrics(input.provenanceEntries)

  // 알림 생성
  const alerts: SecurityAlert[] = [
    ...generateGateGuardAlerts(gateGuard, now),
    ...generateIntegrityAlerts(integrity, now),
    ...generateOutputSentinelAlerts(outputSentinel, now),
    ...generateKillSwitchAlerts(killSwitch, now),
  ]

  // 심각도 순 정렬 (critical > warning > info)
  const severityOrder: Record<SecurityAlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // 전체 상태 결정
  const overallStatus = determineOverallStatus(alerts, input.safetyConfig.emergencyFreeze)

  const dashboard: SecurityDashboard = {
    overallStatus,
    updatedAt: now,
    gateGuard,
    integrity,
    outputSentinel,
    killSwitch,
    provenance,
    alerts,
    summary: "",
  }

  // 요약 생성 (대시보드 자체 참조)
  dashboard.summary = generateSecuritySummary(dashboard)

  return dashboard
}

// ── 유틸리티 ──────────────────────────────────────────────

/** 특정 계층의 알림만 필터링 */
export function filterAlertsByLayer(
  alerts: SecurityAlert[],
  layer: SecurityLayer
): SecurityAlert[] {
  return alerts.filter((a) => a.layer === layer)
}

/** 특정 심각도 이상의 알림만 필터링 */
export function filterAlertsBySeverity(
  alerts: SecurityAlert[],
  minSeverity: SecurityAlertSeverity
): SecurityAlert[] {
  const order: Record<SecurityAlertSeverity, number> = {
    info: 0,
    warning: 1,
    critical: 2,
  }
  const minOrder = order[minSeverity]
  return alerts.filter((a) => order[a.severity] >= minOrder)
}

/** 알림 요약 통계 */
export function summarizeAlerts(alerts: SecurityAlert[]): {
  total: number
  bySeverity: Record<SecurityAlertSeverity, number>
  byLayer: Record<SecurityLayer, number>
  autoResolvableCount: number
} {
  const bySeverity: Record<SecurityAlertSeverity, number> = {
    info: 0,
    warning: 0,
    critical: 0,
  }
  const byLayer: Record<SecurityLayer, number> = {
    gate_guard: 0,
    integrity_monitor: 0,
    output_sentinel: 0,
    kill_switch: 0,
  }
  let autoResolvableCount = 0

  for (const alert of alerts) {
    bySeverity[alert.severity]++
    byLayer[alert.layer]++
    if (alert.autoResolvable) autoResolvableCount++
  }

  return {
    total: alerts.length,
    bySeverity,
    byLayer,
    autoResolvableCount,
  }
}

/** 시간 범위 내 알림 필터링 */
export function filterAlertsByTimeRange(
  alerts: SecurityAlert[],
  startTime: number,
  endTime: number
): SecurityAlert[] {
  return alerts.filter((a) => a.timestamp >= startTime && a.timestamp <= endTime)
}

/** 보안 대시보드에서 특정 페르소나 관련 알림 필터링 */
export function filterAlertsByPersona(alerts: SecurityAlert[], personaId: string): SecurityAlert[] {
  return alerts.filter((a) => a.personaId === personaId)
}

/** 대시보드 스냅샷 비교 (상태 변화 감지) */
export function compareSecuritySnapshots(
  previous: SecurityDashboard,
  current: SecurityDashboard
): {
  statusChanged: boolean
  previousStatus: OverallSecurityStatus
  currentStatus: OverallSecurityStatus
  newAlertCount: number
  resolvedAlertCount: number
  degraded: boolean
} {
  const previousAlertIds = new Set(previous.alerts.map((a) => a.id))
  const currentAlertIds = new Set(current.alerts.map((a) => a.id))

  const newAlertCount = current.alerts.filter((a) => !previousAlertIds.has(a.id)).length
  const resolvedAlertCount = previous.alerts.filter((a) => !currentAlertIds.has(a.id)).length

  const statusOrder: Record<OverallSecurityStatus, number> = {
    healthy: 0,
    warning: 1,
    critical: 2,
    frozen: 3,
  }

  return {
    statusChanged: previous.overallStatus !== current.overallStatus,
    previousStatus: previous.overallStatus,
    currentStatus: current.overallStatus,
    newAlertCount,
    resolvedAlertCount,
    degraded: statusOrder[current.overallStatus] > statusOrder[previous.overallStatus],
  }
}
