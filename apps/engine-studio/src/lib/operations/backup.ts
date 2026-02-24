// ═══════════════════════════════════════════════════════════════
// Backup & Recovery — 롤백/복구, 백업/DR, 훈련
// ═══════════════════════════════════════════════════════════════

import { roundMetric } from "./types"

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
