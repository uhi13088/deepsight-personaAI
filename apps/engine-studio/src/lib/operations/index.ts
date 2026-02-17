// ═══════════════════════════════════════════════════════════════
// Operations Management Module
// T67: 운영 관리 — 모니터링, 장애 대응, 롤백/복구, 백업/DR, 용량 계획
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// AC1: 시스템 모니터링 대시보드 (실시간, 레이아웃, 알림, 로그 검색)
// ═══════════════════════════════════════════════════════════════

// ── 메트릭 타입 정의 ──────────────────────────────────────────

export type MetricType =
  | "active_personas"
  | "llm_calls"
  | "llm_cost"
  | "llm_error_rate"
  | "avg_latency"
  | "matching_count"

export interface MetricDataPoint {
  timestamp: number
  value: number
  metricType: MetricType
  source: string
  labels: Record<string, string>
}

export interface MetricThreshold {
  metricType: MetricType
  warningLevel: number
  criticalLevel: number
  comparison: "above" | "below"
}

export interface ThresholdAlert {
  id: string
  metricType: MetricType
  currentValue: number
  threshold: number
  level: "warning" | "critical"
  source: string
  triggeredAt: number
  message: string
  acknowledged: boolean
}

export interface LogEntry {
  id: string
  timestamp: number
  level: "debug" | "info" | "warn" | "error" | "fatal"
  service: string
  message: string
  metadata: Record<string, string>
  traceId: string | null
}

export interface LogSearchFilter {
  startTime: number | null
  endTime: number | null
  levels: LogEntry["level"][]
  services: string[]
  keyword: string | null
  traceId: string | null
  limit: number
}

export interface DashboardLayout {
  id: string
  name: string
  panels: DashboardPanel[]
  refreshIntervalMs: number
  createdAt: number
  updatedAt: number
}

export interface DashboardPanel {
  id: string
  title: string
  metricTypes: MetricType[]
  chartType: "line" | "bar" | "gauge" | "stat"
  position: { row: number; col: number; width: number; height: number }
}

export interface MonitoringDashboardData {
  layout: DashboardLayout
  dataPoints: MetricDataPoint[]
  activeAlerts: ThresholdAlert[]
  recentLogs: LogEntry[]
}

// ── 기본 임계값 ─────────────────────────────────────────────

export const DEFAULT_METRIC_THRESHOLDS: MetricThreshold[] = [
  { metricType: "llm_error_rate", warningLevel: 5, criticalLevel: 15, comparison: "above" },
  { metricType: "avg_latency", warningLevel: 5000, criticalLevel: 15000, comparison: "above" },
  { metricType: "llm_cost", warningLevel: 100, criticalLevel: 500, comparison: "above" },
  { metricType: "llm_calls", warningLevel: 10000, criticalLevel: 50000, comparison: "above" },
  { metricType: "matching_count", warningLevel: 10000, criticalLevel: 50000, comparison: "above" },
  { metricType: "active_personas", warningLevel: 1, criticalLevel: 0, comparison: "below" },
]

// ── 기본 대시보드 레이아웃 ────────────────────────────────────

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  id: "default",
  name: "애플리케이션 현황",
  panels: [
    {
      id: "panel_personas",
      title: "활성 페르소나",
      metricTypes: ["active_personas"],
      chartType: "stat",
      position: { row: 0, col: 0, width: 4, height: 2 },
    },
    {
      id: "panel_llm_calls",
      title: "LLM 호출 (24h)",
      metricTypes: ["llm_calls"],
      chartType: "stat",
      position: { row: 0, col: 4, width: 4, height: 2 },
    },
    {
      id: "panel_llm_cost",
      title: "LLM 비용 (24h)",
      metricTypes: ["llm_cost"],
      chartType: "stat",
      position: { row: 0, col: 8, width: 4, height: 2 },
    },
    {
      id: "panel_error_rate",
      title: "LLM 에러율",
      metricTypes: ["llm_error_rate"],
      chartType: "gauge",
      position: { row: 2, col: 0, width: 4, height: 3 },
    },
    {
      id: "panel_latency",
      title: "평균 응답시간",
      metricTypes: ["avg_latency"],
      chartType: "gauge",
      position: { row: 2, col: 4, width: 4, height: 3 },
    },
    {
      id: "panel_matching",
      title: "매칭 요청 (24h)",
      metricTypes: ["matching_count"],
      chartType: "stat",
      position: { row: 2, col: 8, width: 4, height: 3 },
    },
  ],
  refreshIntervalMs: 30000,
  createdAt: 0,
  updatedAt: 0,
}

// ── 모니터링 함수 ────────────────────────────────────────────

export function createMetricDataPoint(
  metricType: MetricType,
  value: number,
  source: string,
  labels: Record<string, string> = {}
): MetricDataPoint {
  return {
    timestamp: Date.now(),
    value: roundMetric(value),
    metricType,
    source,
    labels,
  }
}

export function evaluateThresholds(
  dataPoints: MetricDataPoint[],
  thresholds: MetricThreshold[] = DEFAULT_METRIC_THRESHOLDS
): ThresholdAlert[] {
  const alerts: ThresholdAlert[] = []

  for (const point of dataPoints) {
    const threshold = thresholds.find((t) => t.metricType === point.metricType)
    if (!threshold) continue

    const exceedsCritical =
      threshold.comparison === "above"
        ? point.value >= threshold.criticalLevel
        : point.value <= threshold.criticalLevel

    const exceedsWarning =
      threshold.comparison === "above"
        ? point.value >= threshold.warningLevel
        : point.value <= threshold.warningLevel

    if (exceedsCritical) {
      alerts.push({
        id: `threshold_${point.metricType}_${point.timestamp}`,
        metricType: point.metricType,
        currentValue: point.value,
        threshold: threshold.criticalLevel,
        level: "critical",
        source: point.source,
        triggeredAt: point.timestamp,
        message: `${point.metricType} 지표가 임계값(${threshold.criticalLevel}) 초과: ${point.value}`,
        acknowledged: false,
      })
    } else if (exceedsWarning) {
      alerts.push({
        id: `threshold_${point.metricType}_${point.timestamp}`,
        metricType: point.metricType,
        currentValue: point.value,
        threshold: threshold.warningLevel,
        level: "warning",
        source: point.source,
        triggeredAt: point.timestamp,
        message: `${point.metricType} 지표가 경고 수준(${threshold.warningLevel}) 초과: ${point.value}`,
        acknowledged: false,
      })
    }
  }

  return alerts
}

export function acknowledgeThresholdAlert(alert: ThresholdAlert): ThresholdAlert {
  return { ...alert, acknowledged: true }
}

export function searchLogs(logs: LogEntry[], filter: LogSearchFilter): LogEntry[] {
  let filtered = [...logs]

  if (filter.startTime !== null) {
    filtered = filtered.filter((l) => l.timestamp >= filter.startTime!)
  }
  if (filter.endTime !== null) {
    filtered = filtered.filter((l) => l.timestamp <= filter.endTime!)
  }
  if (filter.levels.length > 0) {
    filtered = filtered.filter((l) => filter.levels.includes(l.level))
  }
  if (filter.services.length > 0) {
    filtered = filtered.filter((l) => filter.services.includes(l.service))
  }
  if (filter.keyword !== null && filter.keyword.length > 0) {
    const kw = filter.keyword.toLowerCase()
    filtered = filtered.filter((l) => l.message.toLowerCase().includes(kw))
  }
  if (filter.traceId !== null) {
    filtered = filtered.filter((l) => l.traceId === filter.traceId)
  }

  filtered.sort((a, b) => b.timestamp - a.timestamp)

  return filtered.slice(0, filter.limit)
}

export function buildMonitoringDashboard(
  dataPoints: MetricDataPoint[],
  logs: LogEntry[],
  thresholds: MetricThreshold[] = DEFAULT_METRIC_THRESHOLDS,
  layout: DashboardLayout = DEFAULT_DASHBOARD_LAYOUT
): MonitoringDashboardData {
  const activeAlerts = evaluateThresholds(dataPoints, thresholds)
  const recentLogs = searchLogs(logs, {
    startTime: null,
    endTime: null,
    levels: ["warn", "error", "fatal"],
    services: [],
    keyword: null,
    traceId: null,
    limit: 50,
  })

  return {
    layout: { ...layout, updatedAt: Date.now() },
    dataPoints,
    activeAlerts,
    recentLogs,
  }
}

// ═══════════════════════════════════════════════════════════════
// AC2: 장애 대응 (등급 정의, 탐지, 워크플로우, 대시보드, Post-mortem)
// ═══════════════════════════════════════════════════════════════

// ── 장애 등급 정의 ──────────────────────────────────────────

export type IncidentSeverity = "P0" | "P1" | "P2" | "P3"

export interface IncidentSeverityDefinition {
  level: IncidentSeverity
  label: string
  description: string
  responseTimeMinutes: number
  escalationTimeMinutes: number
  notifyChannels: string[]
}

export const INCIDENT_SEVERITY_DEFINITIONS: IncidentSeverityDefinition[] = [
  {
    level: "P0",
    label: "Critical",
    description: "서비스 전면 장애, 전체 사용자 영향",
    responseTimeMinutes: 5,
    escalationTimeMinutes: 15,
    notifyChannels: ["pager", "slack", "email", "sms"],
  },
  {
    level: "P1",
    label: "High",
    description: "주요 기능 장애, 다수 사용자 영향",
    responseTimeMinutes: 15,
    escalationTimeMinutes: 30,
    notifyChannels: ["slack", "email", "sms"],
  },
  {
    level: "P2",
    label: "Medium",
    description: "부분 기능 저하, 일부 사용자 영향",
    responseTimeMinutes: 60,
    escalationTimeMinutes: 120,
    notifyChannels: ["slack", "email"],
  },
  {
    level: "P3",
    label: "Low",
    description: "경미한 이슈, 사용자 영향 최소",
    responseTimeMinutes: 240,
    escalationTimeMinutes: 480,
    notifyChannels: ["slack"],
  },
]

// ── 장애 탐지 ───────────────────────────────────────────────

export interface DetectionRule {
  id: string
  name: string
  description: string
  metricType: MetricType
  condition: "above" | "below"
  threshold: number
  durationSeconds: number
  severity: IncidentSeverity
  enabled: boolean
}

export interface DetectionResult {
  ruleId: string
  triggered: boolean
  severity: IncidentSeverity
  metricValue: number
  threshold: number
  message: string
  detectedAt: number
}

// ── 장애 워크플로우 ─────────────────────────────────────────

export type IncidentPhase =
  | "detected"
  | "triaged"
  | "investigating"
  | "mitigating"
  | "resolved"
  | "postmortem"

export interface IncidentTimelineEntry {
  timestamp: number
  phase: IncidentPhase
  actor: string
  description: string
}

export interface Incident {
  id: string
  title: string
  severity: IncidentSeverity
  phase: IncidentPhase
  detectedAt: number
  resolvedAt: number | null
  commander: string | null
  affectedServices: string[]
  timeline: IncidentTimelineEntry[]
  rootCause: string | null
  mitigation: string | null
}

export interface PostMortem {
  incidentId: string
  title: string
  summary: string
  timeline: IncidentTimelineEntry[]
  rootCause: string
  impact: {
    affectedUsers: number
    affectedServices: string[]
    downtimeMinutes: number
    dataLoss: boolean
  }
  actionItems: PostMortemAction[]
  lessonsLearned: string[]
  createdAt: number
}

export interface PostMortemAction {
  id: string
  description: string
  assignee: string
  dueDate: number
  priority: "low" | "medium" | "high"
  completed: boolean
}

export interface IncidentDashboardData {
  activeIncidents: Incident[]
  recentResolved: Incident[]
  detectionRules: DetectionRule[]
  stats: {
    totalIncidents: number
    mttrMinutes: number // Mean Time To Resolve
    incidentsBySeverity: Record<IncidentSeverity, number>
  }
}

// ── 장애 대응 함수 ──────────────────────────────────────────

export function evaluateDetectionRules(
  dataPoints: MetricDataPoint[],
  rules: DetectionRule[]
): DetectionResult[] {
  const results: DetectionResult[] = []
  const enabledRules = rules.filter((r) => r.enabled)

  for (const rule of enabledRules) {
    const relevantPoints = dataPoints.filter((p) => p.metricType === rule.metricType)
    if (relevantPoints.length === 0) continue

    const now = Date.now()
    const windowStart = now - rule.durationSeconds * 1000
    const recentPoints = relevantPoints.filter((p) => p.timestamp >= windowStart)
    if (recentPoints.length === 0) continue

    const avgValue = recentPoints.reduce((s, p) => s + p.value, 0) / recentPoints.length

    const triggered =
      rule.condition === "above" ? avgValue >= rule.threshold : avgValue <= rule.threshold

    results.push({
      ruleId: rule.id,
      triggered,
      severity: rule.severity,
      metricValue: roundMetric(avgValue),
      threshold: rule.threshold,
      message: triggered
        ? `탐지 규칙 "${rule.name}" 발동: ${rule.metricType} 평균 ${roundMetric(avgValue)} (임계값: ${rule.threshold})`
        : `탐지 규칙 "${rule.name}" 정상: ${rule.metricType} 평균 ${roundMetric(avgValue)}`,
      detectedAt: now,
    })
  }

  return results
}

export function createIncident(
  title: string,
  severity: IncidentSeverity,
  affectedServices: string[],
  detectedBy: string
): Incident {
  const now = Date.now()
  return {
    id: `INC-${now}`,
    title,
    severity,
    phase: "detected",
    detectedAt: now,
    resolvedAt: null,
    commander: null,
    affectedServices,
    timeline: [
      {
        timestamp: now,
        phase: "detected",
        actor: detectedBy,
        description: `장애 탐지: ${title}`,
      },
    ],
    rootCause: null,
    mitigation: null,
  }
}

export function triageIncident(
  incident: Incident,
  commander: string,
  severity: IncidentSeverity
): Incident {
  const now = Date.now()
  return {
    ...incident,
    severity,
    phase: "triaged",
    commander,
    timeline: [
      ...incident.timeline,
      {
        timestamp: now,
        phase: "triaged",
        actor: commander,
        description: `장애 분류 완료 — 등급: ${severity}, 담당: ${commander}`,
      },
    ],
  }
}

export function advanceIncidentPhase(
  incident: Incident,
  nextPhase: IncidentPhase,
  actor: string,
  description: string
): Incident {
  const PHASE_ORDER: IncidentPhase[] = [
    "detected",
    "triaged",
    "investigating",
    "mitigating",
    "resolved",
    "postmortem",
  ]

  const currentIdx = PHASE_ORDER.indexOf(incident.phase)
  const nextIdx = PHASE_ORDER.indexOf(nextPhase)
  if (nextIdx <= currentIdx) {
    throw new Error(
      `잘못된 단계 전환: ${incident.phase} → ${nextPhase}. 이전 단계로 돌아갈 수 없습니다.`
    )
  }

  const now = Date.now()
  return {
    ...incident,
    phase: nextPhase,
    resolvedAt: nextPhase === "resolved" || nextPhase === "postmortem" ? now : incident.resolvedAt,
    timeline: [...incident.timeline, { timestamp: now, phase: nextPhase, actor, description }],
  }
}

export function resolveIncident(
  incident: Incident,
  actor: string,
  rootCause: string,
  mitigation: string
): Incident {
  const now = Date.now()
  return {
    ...incident,
    phase: "resolved",
    resolvedAt: now,
    rootCause,
    mitigation,
    timeline: [
      ...incident.timeline,
      {
        timestamp: now,
        phase: "resolved",
        actor,
        description: `장애 해결 — 원인: ${rootCause}`,
      },
    ],
  }
}

export function createPostMortem(
  incident: Incident,
  rootCause: string,
  affectedUsers: number,
  downtimeMinutes: number,
  dataLoss: boolean,
  actionItems: Omit<PostMortemAction, "id" | "completed">[],
  lessonsLearned: string[]
): PostMortem {
  return {
    incidentId: incident.id,
    title: `Post-Mortem: ${incident.title}`,
    summary: `${incident.severity} 등급 장애 — ${incident.affectedServices.join(", ")}`,
    timeline: incident.timeline,
    rootCause,
    impact: {
      affectedUsers,
      affectedServices: incident.affectedServices,
      downtimeMinutes,
      dataLoss,
    },
    actionItems: actionItems.map((item, idx) => ({
      ...item,
      id: `action_${incident.id}_${idx}`,
      completed: false,
    })),
    lessonsLearned,
    createdAt: Date.now(),
  }
}

export function calculateMTTR(incidents: Incident[]): number {
  const resolved = incidents.filter((i) => i.resolvedAt !== null)
  if (resolved.length === 0) return 0

  const totalMinutes = resolved.reduce((sum, i) => {
    const duration = (i.resolvedAt! - i.detectedAt) / (1000 * 60)
    return sum + duration
  }, 0)

  return roundMetric(totalMinutes / resolved.length)
}

export function buildIncidentDashboard(
  incidents: Incident[],
  rules: DetectionRule[]
): IncidentDashboardData {
  const activeIncidents = incidents.filter(
    (i) => i.phase !== "resolved" && i.phase !== "postmortem"
  )
  const recentResolved = incidents
    .filter((i) => i.phase === "resolved" || i.phase === "postmortem")
    .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))
    .slice(0, 20)

  const incidentsBySeverity: Record<IncidentSeverity, number> = {
    P0: 0,
    P1: 0,
    P2: 0,
    P3: 0,
  }
  for (const inc of incidents) {
    incidentsBySeverity[inc.severity]++
  }

  return {
    activeIncidents,
    recentResolved,
    detectionRules: rules,
    stats: {
      totalIncidents: incidents.length,
      mttrMinutes: calculateMTTR(incidents),
      incidentsBySeverity,
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// AC3: 롤백/복구 (유형, 실행, 영향 분석, 데이터 복구)
// ═══════════════════════════════════════════════════════════════

// ── 롤백 타입 정의 ──────────────────────────────────────────

export type RollbackType = "config" | "code" | "data"

export type RollbackStatus =
  | "pending"
  | "analyzing"
  | "approved"
  | "executing"
  | "verifying"
  | "completed"
  | "failed"
  | "cancelled"

export interface RollbackStep {
  order: number
  description: string
  status: "pending" | "running" | "completed" | "failed" | "skipped"
  startedAt: number | null
  completedAt: number | null
  error: string | null
}

export interface ImpactAnalysis {
  affectedUsers: number
  affectedServices: string[]
  estimatedDowntimeMinutes: number
  dataImpact: "none" | "partial_loss" | "full_recovery"
  riskLevel: "low" | "medium" | "high" | "critical"
  warnings: string[]
}

export interface RollbackRequest {
  id: string
  type: RollbackType
  reason: string
  fromVersion: string
  toVersion: string
  requestedBy: string
  requestedAt: number
  status: RollbackStatus
  impactAnalysis: ImpactAnalysis | null
  steps: RollbackStep[]
  executedAt: number | null
  completedAt: number | null
  verifiedBy: string | null
}

export interface DataRecoveryProcedure {
  id: string
  targetTable: string
  recoveryType: "point_in_time" | "backup_restore" | "transaction_replay"
  targetTimestamp: number | null
  backupId: string | null
  affectedRows: number
  status: "pending" | "executing" | "verifying" | "completed" | "failed"
  startedAt: number | null
  completedAt: number | null
}

// ── 롤백 기본 단계 정의 ──────────────────────────────────────

function getDefaultRollbackSteps(type: RollbackType): RollbackStep[] {
  const baseStep = (order: number, description: string): RollbackStep => ({
    order,
    description,
    status: "pending",
    startedAt: null,
    completedAt: null,
    error: null,
  })

  switch (type) {
    case "config":
      return [
        baseStep(1, "현재 설정 백업"),
        baseStep(2, "대상 설정 버전 검증"),
        baseStep(3, "설정 적용"),
        baseStep(4, "서비스 재로드"),
        baseStep(5, "헬스체크 검증"),
      ]
    case "code":
      return [
        baseStep(1, "현재 배포 스냅샷 저장"),
        baseStep(2, "대상 코드 버전 체크아웃"),
        baseStep(3, "의존성 설치 및 빌드"),
        baseStep(4, "카나리 배포 (10%)"),
        baseStep(5, "전체 배포"),
        baseStep(6, "헬스체크 및 스모크 테스트"),
        baseStep(7, "트래픽 전환 완료"),
      ]
    case "data":
      return [
        baseStep(1, "현재 데이터 스냅샷 저장"),
        baseStep(2, "복구 대상 데이터 식별"),
        baseStep(3, "데이터 무결성 사전 검증"),
        baseStep(4, "데이터 복구 실행"),
        baseStep(5, "무결성 사후 검증"),
        baseStep(6, "관련 캐시 무효화"),
      ]
  }
}

// ── 롤백 함수 ────────────────────────────────────────────────

export function createRollbackRequest(
  type: RollbackType,
  reason: string,
  fromVersion: string,
  toVersion: string,
  requestedBy: string
): RollbackRequest {
  return {
    id: `RB-${Date.now()}`,
    type,
    reason,
    fromVersion,
    toVersion,
    requestedBy,
    requestedAt: Date.now(),
    status: "pending",
    impactAnalysis: null,
    steps: getDefaultRollbackSteps(type),
    executedAt: null,
    completedAt: null,
    verifiedBy: null,
  }
}

export function analyzeRollbackImpact(
  request: RollbackRequest,
  totalUsers: number,
  services: string[],
  estimatedDowntimeMinutes: number
): RollbackRequest {
  const riskLevel = determineRiskLevel(request.type, services.length, estimatedDowntimeMinutes)

  const warnings: string[] = []
  if (request.type === "data") {
    warnings.push("데이터 롤백은 복구 시점 이후의 데이터가 유실될 수 있습니다")
  }
  if (estimatedDowntimeMinutes > 30) {
    warnings.push("예상 다운타임이 30분을 초과합니다. 유지보수 윈도우 확인 필요")
  }
  if (services.length > 3) {
    warnings.push("3개 이상의 서비스에 영향. 단계적 롤백을 권장합니다")
  }

  const dataImpact: ImpactAnalysis["dataImpact"] = request.type === "data" ? "partial_loss" : "none"

  const impact: ImpactAnalysis = {
    affectedUsers: totalUsers,
    affectedServices: services,
    estimatedDowntimeMinutes,
    dataImpact,
    riskLevel,
    warnings,
  }

  return {
    ...request,
    status: "analyzing",
    impactAnalysis: impact,
  }
}

export function approveRollback(request: RollbackRequest, approver: string): RollbackRequest {
  if (request.impactAnalysis === null) {
    throw new Error("영향 분석이 완료되지 않은 롤백은 승인할 수 없습니다")
  }
  return { ...request, status: "approved", verifiedBy: approver }
}

export function executeRollbackStep(
  request: RollbackRequest,
  stepOrder: number,
  success: boolean,
  error: string | null = null
): RollbackRequest {
  if (request.status !== "approved" && request.status !== "executing") {
    throw new Error(`현재 상태(${request.status})에서는 롤백 단계를 실행할 수 없습니다`)
  }

  const now = Date.now()
  const updatedSteps = request.steps.map((step) => {
    if (step.order === stepOrder) {
      return {
        ...step,
        status: success ? ("completed" as const) : ("failed" as const),
        startedAt: step.startedAt ?? now,
        completedAt: now,
        error,
      }
    }
    return step
  })

  const allCompleted = updatedSteps.every((s) => s.status === "completed" || s.status === "skipped")
  const hasFailed = updatedSteps.some((s) => s.status === "failed")

  let newStatus: RollbackStatus = "executing"
  if (hasFailed) newStatus = "failed"
  else if (allCompleted) newStatus = "verifying"

  return {
    ...request,
    status: newStatus,
    steps: updatedSteps,
    executedAt: request.executedAt ?? now,
  }
}

export function completeRollback(request: RollbackRequest, verifiedBy: string): RollbackRequest {
  if (request.status !== "verifying") {
    throw new Error(`검증 단계가 아닌 상태(${request.status})에서는 완료할 수 없습니다`)
  }
  return {
    ...request,
    status: "completed",
    completedAt: Date.now(),
    verifiedBy,
  }
}

export function cancelRollback(request: RollbackRequest): RollbackRequest {
  if (request.status === "completed" || request.status === "failed") {
    throw new Error(`이미 종료된 롤백(${request.status})은 취소할 수 없습니다`)
  }
  return {
    ...request,
    status: "cancelled",
    steps: request.steps.map((s) =>
      s.status === "pending" ? { ...s, status: "skipped" as const } : s
    ),
  }
}

export function createDataRecoveryProcedure(
  targetTable: string,
  recoveryType: DataRecoveryProcedure["recoveryType"],
  affectedRows: number,
  targetTimestamp: number | null = null,
  backupId: string | null = null
): DataRecoveryProcedure {
  return {
    id: `DR-${Date.now()}`,
    targetTable,
    recoveryType,
    targetTimestamp,
    backupId,
    affectedRows,
    status: "pending",
    startedAt: null,
    completedAt: null,
  }
}

export function advanceDataRecovery(
  procedure: DataRecoveryProcedure,
  nextStatus: DataRecoveryProcedure["status"]
): DataRecoveryProcedure {
  const now = Date.now()
  return {
    ...procedure,
    status: nextStatus,
    startedAt: procedure.startedAt ?? now,
    completedAt: nextStatus === "completed" || nextStatus === "failed" ? now : null,
  }
}

// ═══════════════════════════════════════════════════════════════
// AC4: 백업/재해복구 (정책, 대상, 모니터링, DR 계획, 훈련)
// ═══════════════════════════════════════════════════════════════

// ── 백업 정책 ───────────────────────────────────────────────

export type BackupMethod = "full" | "incremental" | "differential"

export type BackupTarget = "database" | "files" | "configs"

export interface BackupPolicy {
  id: string
  name: string
  method: BackupMethod
  target: BackupTarget
  cronSchedule: string
  retentionDays: number
  encryptionEnabled: boolean
  compressionEnabled: boolean
  destinationPath: string
  enabled: boolean
}

export interface BackupRecord {
  id: string
  policyId: string
  method: BackupMethod
  target: BackupTarget
  status: "running" | "completed" | "failed" | "verifying"
  startedAt: number
  completedAt: number | null
  sizeBytes: number
  checksum: string | null
  storagePath: string
  error: string | null
}

export interface BackupMonitoring {
  policyId: string
  policyName: string
  target: BackupTarget
  lastBackupAt: number | null
  lastBackupSizeBytes: number
  lastBackupStatus: "completed" | "failed" | "running" | null
  totalBackups: number
  successRate: number
  averageDurationMs: number
  totalStorageBytes: number
}

// ── DR 계획 ─────────────────────────────────────────────────

export type DRScenario =
  | "database_failure"
  | "region_outage"
  | "data_corruption"
  | "ransomware"
  | "network_partition"

export interface DRPlan {
  id: string
  name: string
  scenario: DRScenario
  rtoMinutes: number // Recovery Time Objective
  rpoMinutes: number // Recovery Point Objective
  steps: DRPlanStep[]
  contacts: DRContact[]
  lastTestedAt: number | null
  lastUpdatedAt: number
}

export interface DRPlanStep {
  order: number
  description: string
  responsible: string
  estimatedMinutes: number
  prerequisites: string[]
  verificationCommand: string | null
}

export interface DRContact {
  name: string
  role: string
  phone: string
  email: string
  isPrimary: boolean
}

export interface DRDrill {
  id: string
  planId: string
  scenario: DRScenario
  scheduledAt: number
  executedAt: number | null
  completedAt: number | null
  status: "scheduled" | "in_progress" | "completed" | "cancelled"
  actualRtoMinutes: number | null
  actualRpoMinutes: number | null
  findings: string[]
  actionItems: string[]
}

// ── 기본 백업 정책 ──────────────────────────────────────────

export const DEFAULT_BACKUP_POLICIES: BackupPolicy[] = [
  {
    id: "policy_db_full",
    name: "데이터베이스 전체 백업",
    method: "full",
    target: "database",
    cronSchedule: "0 2 * * 0",
    retentionDays: 90,
    encryptionEnabled: true,
    compressionEnabled: true,
    destinationPath: "/backups/db/full",
    enabled: true,
  },
  {
    id: "policy_db_incremental",
    name: "데이터베이스 증분 백업",
    method: "incremental",
    target: "database",
    cronSchedule: "0 2 * * 1-6",
    retentionDays: 30,
    encryptionEnabled: true,
    compressionEnabled: true,
    destinationPath: "/backups/db/incremental",
    enabled: true,
  },
  {
    id: "policy_files_diff",
    name: "파일 차등 백업",
    method: "differential",
    target: "files",
    cronSchedule: "0 3 * * *",
    retentionDays: 30,
    encryptionEnabled: true,
    compressionEnabled: true,
    destinationPath: "/backups/files",
    enabled: true,
  },
  {
    id: "policy_configs",
    name: "설정 파일 백업",
    method: "full",
    target: "configs",
    cronSchedule: "0 4 * * *",
    retentionDays: 365,
    encryptionEnabled: true,
    compressionEnabled: false,
    destinationPath: "/backups/configs",
    enabled: true,
  },
]

// ── 백업 관리 함수 ──────────────────────────────────────────

export function createBackupPolicy(
  name: string,
  method: BackupMethod,
  target: BackupTarget,
  cronSchedule: string,
  retentionDays: number,
  destinationPath: string,
  options: { encryptionEnabled?: boolean; compressionEnabled?: boolean } = {}
): BackupPolicy {
  return {
    id: `policy_${Date.now()}`,
    name,
    method,
    target,
    cronSchedule,
    retentionDays,
    encryptionEnabled: options.encryptionEnabled ?? true,
    compressionEnabled: options.compressionEnabled ?? true,
    destinationPath,
    enabled: true,
  }
}

export function createBackupRecord(policy: BackupPolicy, storagePath: string): BackupRecord {
  return {
    id: `backup_${Date.now()}`,
    policyId: policy.id,
    method: policy.method,
    target: policy.target,
    status: "running",
    startedAt: Date.now(),
    completedAt: null,
    sizeBytes: 0,
    checksum: null,
    storagePath,
    error: null,
  }
}

export function completeBackupRecord(
  record: BackupRecord,
  sizeBytes: number,
  checksum: string
): BackupRecord {
  return {
    ...record,
    status: "completed",
    completedAt: Date.now(),
    sizeBytes,
    checksum,
  }
}

export function failBackupRecord(record: BackupRecord, error: string): BackupRecord {
  return {
    ...record,
    status: "failed",
    completedAt: Date.now(),
    error,
  }
}

export function computeBackupMonitoring(
  policy: BackupPolicy,
  records: BackupRecord[]
): BackupMonitoring {
  const policyRecords = records.filter((r) => r.policyId === policy.id)
  const completedRecords = policyRecords.filter((r) => r.status === "completed")
  const lastRecord =
    policyRecords.length > 0
      ? policyRecords.reduce((latest, r) => (r.startedAt > latest.startedAt ? r : latest))
      : null

  const successRate =
    policyRecords.length > 0
      ? roundMetric((completedRecords.length / policyRecords.length) * 100)
      : 0

  const averageDurationMs =
    completedRecords.length > 0
      ? roundMetric(
          completedRecords.reduce(
            (sum, r) => sum + ((r.completedAt ?? r.startedAt) - r.startedAt),
            0
          ) / completedRecords.length
        )
      : 0

  const totalStorageBytes = completedRecords.reduce((sum, r) => sum + r.sizeBytes, 0)

  return {
    policyId: policy.id,
    policyName: policy.name,
    target: policy.target,
    lastBackupAt: lastRecord?.startedAt ?? null,
    lastBackupSizeBytes: lastRecord?.sizeBytes ?? 0,
    lastBackupStatus:
      lastRecord?.status === "running"
        ? "running"
        : lastRecord?.status === "completed"
          ? "completed"
          : lastRecord?.status === "failed"
            ? "failed"
            : null,
    totalBackups: policyRecords.length,
    successRate,
    averageDurationMs,
    totalStorageBytes,
  }
}

export function isBackupOverdue(monitoring: BackupMonitoring, expectedIntervalMs: number): boolean {
  if (monitoring.lastBackupAt === null) return true
  return Date.now() - monitoring.lastBackupAt > expectedIntervalMs * 1.5
}

// ── DR 계획 함수 ────────────────────────────────────────────

export function createDRPlan(
  name: string,
  scenario: DRScenario,
  rtoMinutes: number,
  rpoMinutes: number,
  steps: Omit<DRPlanStep, "order">[],
  contacts: DRContact[]
): DRPlan {
  return {
    id: `drplan_${Date.now()}`,
    name,
    scenario,
    rtoMinutes,
    rpoMinutes,
    steps: steps.map((s, idx) => ({ ...s, order: idx + 1 })),
    contacts,
    lastTestedAt: null,
    lastUpdatedAt: Date.now(),
  }
}

export function scheduleDRDrill(
  planId: string,
  scenario: DRScenario,
  scheduledAt: number
): DRDrill {
  return {
    id: `drill_${Date.now()}`,
    planId,
    scenario,
    scheduledAt,
    executedAt: null,
    completedAt: null,
    status: "scheduled",
    actualRtoMinutes: null,
    actualRpoMinutes: null,
    findings: [],
    actionItems: [],
  }
}

export function startDRDrill(drill: DRDrill): DRDrill {
  if (drill.status !== "scheduled") {
    throw new Error(`예정(scheduled) 상태의 훈련만 시작할 수 있습니다 (현재: ${drill.status})`)
  }
  return {
    ...drill,
    status: "in_progress",
    executedAt: Date.now(),
  }
}

export function completeDRDrill(
  drill: DRDrill,
  actualRtoMinutes: number,
  actualRpoMinutes: number,
  findings: string[],
  actionItems: string[]
): DRDrill {
  if (drill.status !== "in_progress") {
    throw new Error(`진행 중(in_progress) 상태의 훈련만 완료할 수 있습니다 (현재: ${drill.status})`)
  }
  return {
    ...drill,
    status: "completed",
    completedAt: Date.now(),
    actualRtoMinutes,
    actualRpoMinutes,
    findings,
    actionItems,
  }
}

export function evaluateDRDrillResult(
  drill: DRDrill,
  plan: DRPlan
): {
  rtoMet: boolean
  rpoMet: boolean
  overallPass: boolean
  summary: string
} {
  if (
    drill.status !== "completed" ||
    drill.actualRtoMinutes === null ||
    drill.actualRpoMinutes === null
  ) {
    return {
      rtoMet: false,
      rpoMet: false,
      overallPass: false,
      summary: "훈련이 아직 완료되지 않았습니다",
    }
  }

  const rtoMet = drill.actualRtoMinutes <= plan.rtoMinutes
  const rpoMet = drill.actualRpoMinutes <= plan.rpoMinutes
  const overallPass = rtoMet && rpoMet

  const summary = overallPass
    ? `DR 훈련 통과 — RTO: ${drill.actualRtoMinutes}분/${plan.rtoMinutes}분, RPO: ${drill.actualRpoMinutes}분/${plan.rpoMinutes}분`
    : `DR 훈련 미통과 — RTO: ${drill.actualRtoMinutes}분/${plan.rtoMinutes}분${rtoMet ? " (통과)" : " (미달)"}, RPO: ${drill.actualRpoMinutes}분/${plan.rpoMinutes}분${rpoMet ? " (통과)" : " (미달)"}`

  return { rtoMet, rpoMet, overallPass, summary }
}

// ═══════════════════════════════════════════════════════════════
// AC5: 용량 계획 (리소스 모니터링, 예측, 비용 최적화)
// ═══════════════════════════════════════════════════════════════

// ── 용량 타입 정의 ──────────────────────────────────────────

export interface ResourceUsage {
  metricType: MetricType
  currentValue: number
  maxCapacity: number
  unit: string
  timestamp: number
}

export interface UsageSnapshot {
  timestamp: number
  resources: ResourceUsage[]
}

export interface ForecastResult {
  metricType: MetricType
  currentUsagePercent: number
  projectedUsagePercent: number
  daysUntilThreshold: number | null
  thresholdPercent: number
  trend: "increasing" | "stable" | "decreasing"
  confidence: number
  projectedDataPoints: Array<{ timestamp: number; value: number }>
}

export interface CostOptimization {
  id: string
  category: "rightsizing" | "scheduling" | "storage_tiering" | "reserved_capacity" | "cleanup"
  title: string
  description: string
  estimatedSavingsPercent: number
  estimatedSavingsAmount: number
  effort: "low" | "medium" | "high"
  impact: "low" | "medium" | "high"
  priority: number
}

export interface ScalingRecommendation {
  metricType: MetricType
  direction: "scale_up" | "scale_down" | "no_change"
  reason: string
  currentCapacity: number
  recommendedCapacity: number
  urgency: "immediate" | "soon" | "planned"
}

export interface CapacityReport {
  generatedAt: number
  currentUsage: ResourceUsage[]
  forecasts: ForecastResult[]
  optimizations: CostOptimization[]
  scalingRecommendations: ScalingRecommendation[]
  summary: {
    overallHealthScore: number
    criticalResources: string[]
    estimatedTotalSavingsPercent: number
  }
}

// ── 용량 계획 함수 ──────────────────────────────────────────

export function createResourceUsage(
  metricType: MetricType,
  currentValue: number,
  maxCapacity: number,
  unit: string
): ResourceUsage {
  return {
    metricType,
    currentValue: roundMetric(currentValue),
    maxCapacity,
    unit,
    timestamp: Date.now(),
  }
}

export function getUsagePercent(resource: ResourceUsage): number {
  if (resource.maxCapacity <= 0) return 0
  return roundMetric((resource.currentValue / resource.maxCapacity) * 100)
}

export function forecastLinear(
  snapshots: UsageSnapshot[],
  metricType: MetricType,
  forecastDays: number,
  thresholdPercent: number = 80
): ForecastResult {
  const dataPoints = snapshots
    .map((snap) => {
      const resource = snap.resources.find((r) => r.metricType === metricType)
      if (!resource) return null
      return { timestamp: snap.timestamp, value: getUsagePercent(resource) }
    })
    .filter((p): p is { timestamp: number; value: number } => p !== null)
    .sort((a, b) => a.timestamp - b.timestamp)

  if (dataPoints.length < 2) {
    const currentUsage = dataPoints.length > 0 ? dataPoints[0].value : 0
    return {
      metricType,
      currentUsagePercent: currentUsage,
      projectedUsagePercent: currentUsage,
      daysUntilThreshold: null,
      thresholdPercent,
      trend: "stable",
      confidence: 0,
      projectedDataPoints: [],
    }
  }

  // 선형 회귀 (최소자승법)
  const n = dataPoints.length
  const msPerDay = 86400000

  const xValues = dataPoints.map((p) => (p.timestamp - dataPoints[0].timestamp) / msPerDay)
  const yValues = dataPoints.map((p) => p.value)

  const sumX = xValues.reduce((s, x) => s + x, 0)
  const sumY = yValues.reduce((s, y) => s + y, 0)
  const sumXY = xValues.reduce((s, x, i) => s + x * yValues[i], 0)
  const sumX2 = xValues.reduce((s, x) => s + x * x, 0)

  const denominator = n * sumX2 - sumX * sumX
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0
  const intercept = (sumY - slope * sumX) / n

  const currentUsagePercent = yValues[yValues.length - 1]
  const currentDay = xValues[xValues.length - 1]
  const projectedDay = currentDay + forecastDays
  const projectedUsagePercent = roundMetric(
    Math.max(0, Math.min(100, slope * projectedDay + intercept))
  )

  // 임계값 도달 예측
  let daysUntilThreshold: number | null = null
  if (slope > 0 && currentUsagePercent < thresholdPercent) {
    const daysToThreshold = (thresholdPercent - intercept) / slope - currentDay
    daysUntilThreshold = daysToThreshold > 0 ? Math.ceil(daysToThreshold) : null
  }

  // 추세 판별
  const trend: ForecastResult["trend"] =
    slope > 0.1 ? "increasing" : slope < -0.1 ? "decreasing" : "stable"

  // R^2 (결정계수) — 예측 신뢰도
  const meanY = sumY / n
  const ssRes = yValues.reduce((s, y, i) => {
    const predicted = slope * xValues[i] + intercept
    return s + (y - predicted) * (y - predicted)
  }, 0)
  const ssTot = yValues.reduce((s, y) => s + (y - meanY) * (y - meanY), 0)
  const confidence = ssTot > 0 ? roundMetric(Math.max(0, 1 - ssRes / ssTot)) : 0

  // 예측 데이터 포인트 생성
  const projectedDataPoints: Array<{ timestamp: number; value: number }> = []
  const lastTimestamp = dataPoints[dataPoints.length - 1].timestamp
  for (let d = 1; d <= forecastDays; d++) {
    const ts = lastTimestamp + d * msPerDay
    const dayValue = currentDay + d
    const value = roundMetric(Math.max(0, Math.min(100, slope * dayValue + intercept)))
    projectedDataPoints.push({ timestamp: ts, value })
  }

  return {
    metricType,
    currentUsagePercent,
    projectedUsagePercent,
    daysUntilThreshold,
    thresholdPercent,
    trend,
    confidence,
    projectedDataPoints,
  }
}

export function generateCostOptimizations(
  resources: ResourceUsage[],
  forecasts: ForecastResult[]
): CostOptimization[] {
  const optimizations: CostOptimization[] = []
  let priorityCounter = 0

  // 과소 사용 리소스 → 다운사이징 제안
  for (const resource of resources) {
    const usagePercent = getUsagePercent(resource)
    if (usagePercent < 20) {
      optimizations.push({
        id: `opt_rightsize_${resource.metricType}`,
        category: "rightsizing",
        title: `${resource.metricType} 리소스 다운사이징`,
        description: `현재 사용률 ${usagePercent}%로 리소스가 과다 프로비저닝되어 있습니다. 용량 축소를 권장합니다.`,
        estimatedSavingsPercent: roundMetric(Math.min(50, (100 - usagePercent) * 0.6)),
        estimatedSavingsAmount: 0,
        effort: "medium",
        impact: "medium",
        priority: ++priorityCounter,
      })
    }
  }

  // 안정적 사용 패턴 → 예약 인스턴스 제안
  const stableForecasts = forecasts.filter((f) => f.trend === "stable" && f.confidence > 0.7)
  if (stableForecasts.length > 0) {
    optimizations.push({
      id: "opt_reserved",
      category: "reserved_capacity",
      title: "예약 인스턴스 전환",
      description: `${stableForecasts.map((f) => f.metricType).join(", ")} 리소스의 사용 패턴이 안정적입니다. 예약 인스턴스로 전환하면 비용을 절감할 수 있습니다.`,
      estimatedSavingsPercent: 30,
      estimatedSavingsAmount: 0,
      effort: "low",
      impact: "high",
      priority: ++priorityCounter,
    })
  }

  // LLM 비용 최적화 제안
  const costResource = resources.find((r) => r.metricType === "llm_cost")
  if (costResource && getUsagePercent(costResource) > 50) {
    optimizations.push({
      id: "opt_storage_tiering",
      category: "storage_tiering",
      title: "스토리지 계층화",
      description: "접근 빈도가 낮은 데이터를 콜드 스토리지로 이동하여 비용을 절감할 수 있습니다.",
      estimatedSavingsPercent: 20,
      estimatedSavingsAmount: 0,
      effort: "medium",
      impact: "medium",
      priority: ++priorityCounter,
    })
  }

  // 비업무 시간 스케일 다운 제안
  optimizations.push({
    id: "opt_scheduling",
    category: "scheduling",
    title: "비업무 시간 스케일 다운",
    description: "비업무 시간(야간/주말)에 비프로덕션 리소스를 자동 축소하여 비용을 절감합니다.",
    estimatedSavingsPercent: 15,
    estimatedSavingsAmount: 0,
    effort: "low",
    impact: "low",
    priority: ++priorityCounter,
  })

  return optimizations
}

export function generateScalingRecommendations(
  resources: ResourceUsage[],
  forecasts: ForecastResult[]
): ScalingRecommendation[] {
  const recommendations: ScalingRecommendation[] = []

  for (const resource of resources) {
    const usagePercent = getUsagePercent(resource)
    const forecast = forecasts.find((f) => f.metricType === resource.metricType)

    if (usagePercent > 90) {
      recommendations.push({
        metricType: resource.metricType,
        direction: "scale_up",
        reason: `현재 사용률 ${usagePercent}%로 즉시 확장이 필요합니다`,
        currentCapacity: resource.maxCapacity,
        recommendedCapacity: roundMetric(resource.maxCapacity * 1.5),
        urgency: "immediate",
      })
    } else if (
      usagePercent > 75 ||
      (forecast && forecast.daysUntilThreshold !== null && forecast.daysUntilThreshold < 30)
    ) {
      const daysInfo =
        forecast?.daysUntilThreshold !== null && forecast?.daysUntilThreshold !== undefined
          ? ` (예상 임계값 도달: ${forecast.daysUntilThreshold}일)`
          : ""
      recommendations.push({
        metricType: resource.metricType,
        direction: "scale_up",
        reason: `현재 사용률 ${usagePercent}%이며 증가 추세${daysInfo}`,
        currentCapacity: resource.maxCapacity,
        recommendedCapacity: roundMetric(resource.maxCapacity * 1.3),
        urgency: "soon",
      })
    } else if (usagePercent < 20 && forecast?.trend === "decreasing") {
      recommendations.push({
        metricType: resource.metricType,
        direction: "scale_down",
        reason: `현재 사용률 ${usagePercent}%로 과다 프로비저닝. 감소 추세 확인`,
        currentCapacity: resource.maxCapacity,
        recommendedCapacity: roundMetric(resource.maxCapacity * 0.5),
        urgency: "planned",
      })
    } else {
      recommendations.push({
        metricType: resource.metricType,
        direction: "no_change",
        reason: `현재 사용률 ${usagePercent}%로 적정 수준`,
        currentCapacity: resource.maxCapacity,
        recommendedCapacity: resource.maxCapacity,
        urgency: "planned",
      })
    }
  }

  return recommendations
}

export function buildCapacityReport(
  snapshots: UsageSnapshot[],
  currentResources: ResourceUsage[],
  forecastDays: number = 90,
  thresholdPercent: number = 80
): CapacityReport {
  const metricTypes: MetricType[] = [
    "active_personas",
    "llm_calls",
    "llm_cost",
    "llm_error_rate",
    "avg_latency",
    "matching_count",
  ]

  const forecasts = metricTypes
    .map((mt) => forecastLinear(snapshots, mt, forecastDays, thresholdPercent))
    .filter((f) => f.confidence > 0 || f.currentUsagePercent > 0)

  const optimizations = generateCostOptimizations(currentResources, forecasts)
  const scalingRecommendations = generateScalingRecommendations(currentResources, forecasts)

  const criticalResources = currentResources
    .filter((r) => getUsagePercent(r) > 90)
    .map((r) => r.metricType)

  const overallHealthScore = calculateHealthScore(currentResources, forecasts)
  const estimatedTotalSavingsPercent =
    optimizations.length > 0
      ? roundMetric(
          optimizations.reduce((s, o) => s + o.estimatedSavingsPercent, 0) / optimizations.length
        )
      : 0

  return {
    generatedAt: Date.now(),
    currentUsage: currentResources,
    forecasts,
    optimizations,
    scalingRecommendations,
    summary: {
      overallHealthScore,
      criticalResources,
      estimatedTotalSavingsPercent,
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// 내부 유틸리티
// ═══════════════════════════════════════════════════════════════

function roundMetric(v: number): number {
  return Math.round(v * 100) / 100
}

function determineRiskLevel(
  type: RollbackType,
  serviceCount: number,
  downtimeMinutes: number
): ImpactAnalysis["riskLevel"] {
  if (type === "data" || downtimeMinutes > 60 || serviceCount > 5) return "critical"
  if (downtimeMinutes > 30 || serviceCount > 3) return "high"
  if (type === "code" || downtimeMinutes > 10 || serviceCount > 1) return "medium"
  return "low"
}

function calculateHealthScore(resources: ResourceUsage[], forecasts: ForecastResult[]): number {
  if (resources.length === 0) return 100

  let score = 100

  for (const resource of resources) {
    const usagePercent = getUsagePercent(resource)
    if (usagePercent > 90) score -= 20
    else if (usagePercent > 80) score -= 10
    else if (usagePercent > 70) score -= 5
  }

  for (const forecast of forecasts) {
    if (forecast.daysUntilThreshold !== null && forecast.daysUntilThreshold < 7) {
      score -= 15
    } else if (forecast.daysUntilThreshold !== null && forecast.daysUntilThreshold < 30) {
      score -= 5
    }
  }

  return Math.max(0, Math.min(100, score))
}
