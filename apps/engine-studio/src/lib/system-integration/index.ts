// ═══════════════════════════════════════════════════════════════
// System Integration Management Module
// T66: 시스템 연동 관리 — 배포 파이프라인, 알고리즘 버전, 이벤트 버스,
//      개발자 콘솔 연동, 통합 테스트 자동화
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// AC1: API 배포 파이프라인 (환경 구성, 워크플로우, Canary Release)
// ═══════════════════════════════════════════════════════════════

// ── 배포 환경 타입 정의 ───────────────────────────────────────

export type DeployEnvironment = "development" | "staging" | "production"

export interface EnvironmentConfig {
  environment: DeployEnvironment
  label: string
  url: string
  accessLevel: "engineer" | "internal_team" | "external"
  dataType: "dummy" | "anonymized" | "production"
  requiresApproval: boolean
}

export const ENVIRONMENT_CONFIGS: EnvironmentConfig[] = [
  {
    environment: "development",
    label: "Development (DEV)",
    url: "https://api-dev.deepsight.ai",
    accessLevel: "engineer",
    dataType: "dummy",
    requiresApproval: false,
  },
  {
    environment: "staging",
    label: "Staging (STG)",
    url: "https://api-staging.deepsight.ai",
    accessLevel: "internal_team",
    dataType: "anonymized",
    requiresApproval: false,
  },
  {
    environment: "production",
    label: "Production (PROD)",
    url: "https://api.deepsight.ai",
    accessLevel: "external",
    dataType: "production",
    requiresApproval: true,
  },
]

// ── 배포 워크플로우 타입 정의 ─────────────────────────────────

export type DeployStage = "build" | "test" | "deploy" | "verify"

export type DeployStageStatus = "pending" | "running" | "passed" | "failed" | "skipped"

export interface DeployStageResult {
  stage: DeployStage
  status: DeployStageStatus
  startedAt: number | null
  completedAt: number | null
  logs: string[]
  error: string | null
}

export type DeployTarget =
  | "persona"
  | "algorithm"
  | "model_config"
  | "safety_filter"
  | "vector_schema"

export type DeployWorkflowStatus =
  | "pending"
  | "in_progress"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "rolled_back"

export interface DeployWorkflow {
  id: string
  target: DeployTarget
  targetVersion: string
  environment: DeployEnvironment
  status: DeployWorkflowStatus
  stages: DeployStageResult[]
  createdBy: string
  createdAt: number
  completedAt: number | null
  approvedBy: string | null
  approvedAt: number | null
  rollbackReason: string | null
}

// ── Canary Release 타입 정의 ─────────────────────────────────

export type CanaryPhase = "10_percent" | "50_percent" | "100_percent" | "completed" | "rolled_back"

export interface CanaryMetrics {
  errorRatePercent: number
  avgResponseTimeMs: number
  matchingSatisfactionScore: number
}

export interface CanaryRollbackTrigger {
  metric: "error_rate" | "response_time" | "satisfaction"
  threshold: number
  currentValue: number
  triggered: boolean
}

export interface CanaryConfig {
  percentage: number
  durationMinutes: number
  metrics: CanaryMetrics
  rollbackTriggers: CanaryRollbackTrigger[]
}

export interface CanaryRelease {
  id: string
  workflowId: string
  phase: CanaryPhase
  configs: Record<CanaryPhase, CanaryConfig | null>
  currentMetrics: CanaryMetrics | null
  startedAt: number
  completedAt: number | null
  rolledBackAt: number | null
  rollbackReason: string | null
}

// ── 기본 Canary 롤백 트리거 ──────────────────────────────────

export const DEFAULT_CANARY_ROLLBACK_TRIGGERS: Omit<
  CanaryRollbackTrigger,
  "currentValue" | "triggered"
>[] = [
  { metric: "error_rate", threshold: 5 },
  { metric: "response_time", threshold: 200 },
  { metric: "satisfaction", threshold: -10 },
]

// ── 배포 파이프라인 함수 ─────────────────────────────────────

const STAGE_ORDER: DeployStage[] = ["build", "test", "deploy", "verify"]

export function createDeployWorkflow(
  target: DeployTarget,
  targetVersion: string,
  environment: DeployEnvironment,
  createdBy: string
): DeployWorkflow {
  const envConfig = ENVIRONMENT_CONFIGS.find((c) => c.environment === environment)
  if (!envConfig) {
    throw new Error(`지원하지 않는 배포 환경입니다: ${environment}`)
  }

  const stages: DeployStageResult[] = STAGE_ORDER.map((stage) => ({
    stage,
    status: "pending",
    startedAt: null,
    completedAt: null,
    logs: [],
    error: null,
  }))

  return {
    id: `deploy_${Date.now()}`,
    target,
    targetVersion,
    environment,
    status: "pending",
    stages,
    createdBy,
    createdAt: Date.now(),
    completedAt: null,
    approvedBy: null,
    approvedAt: null,
    rollbackReason: null,
  }
}

export function approveDeployWorkflow(workflow: DeployWorkflow, approver: string): DeployWorkflow {
  const envConfig = ENVIRONMENT_CONFIGS.find((c) => c.environment === workflow.environment)
  if (!envConfig?.requiresApproval) {
    throw new Error(`환경 '${workflow.environment}'은 승인이 필요하지 않습니다`)
  }
  if (workflow.status !== "pending") {
    throw new Error(`현재 상태(${workflow.status})에서는 승인할 수 없습니다`)
  }
  return {
    ...workflow,
    approvedBy: approver,
    approvedAt: Date.now(),
  }
}

export function advanceDeployStage(
  workflow: DeployWorkflow,
  stage: DeployStage,
  success: boolean,
  logs: string[] = [],
  error: string | null = null
): DeployWorkflow {
  const envConfig = ENVIRONMENT_CONFIGS.find((c) => c.environment === workflow.environment)
  if (envConfig?.requiresApproval && workflow.approvedBy === null) {
    throw new Error("프로덕션 배포는 승인이 필요합니다")
  }

  const stageIdx = STAGE_ORDER.indexOf(stage)
  if (stageIdx === -1) {
    throw new Error(`잘못된 배포 단계입니다: ${stage}`)
  }

  // 이전 단계가 모두 passed인지 확인
  for (let i = 0; i < stageIdx; i++) {
    if (workflow.stages[i].status !== "passed") {
      throw new Error(`이전 단계 '${STAGE_ORDER[i]}'가 완료되지 않았습니다`)
    }
  }

  const now = Date.now()
  const updatedStages = workflow.stages.map((s) => {
    if (s.stage === stage) {
      return {
        ...s,
        status: success ? ("passed" as const) : ("failed" as const),
        startedAt: s.startedAt ?? now,
        completedAt: now,
        logs: [...s.logs, ...logs],
        error,
      }
    }
    return s
  })

  const allPassed = updatedStages.every((s) => s.status === "passed")
  const hasFailed = updatedStages.some((s) => s.status === "failed")

  let newStatus: DeployWorkflowStatus = "in_progress"
  if (hasFailed) newStatus = "failed"
  else if (allPassed) newStatus = "succeeded"

  return {
    ...workflow,
    status: newStatus,
    stages: updatedStages,
    completedAt: allPassed || hasFailed ? now : null,
  }
}

export function cancelDeployWorkflow(workflow: DeployWorkflow): DeployWorkflow {
  if (workflow.status === "succeeded" || workflow.status === "failed") {
    throw new Error(`이미 완료된 배포(${workflow.status})는 취소할 수 없습니다`)
  }
  return {
    ...workflow,
    status: "cancelled",
    completedAt: Date.now(),
    stages: workflow.stages.map((s) =>
      s.status === "pending" ? { ...s, status: "skipped" as const } : s
    ),
  }
}

export function rollbackDeployWorkflow(workflow: DeployWorkflow, reason: string): DeployWorkflow {
  if (workflow.status !== "succeeded" && workflow.status !== "in_progress") {
    throw new Error(`현재 상태(${workflow.status})에서는 롤백할 수 없습니다`)
  }
  return {
    ...workflow,
    status: "rolled_back",
    rollbackReason: reason,
    completedAt: Date.now(),
  }
}

// ── Canary Release 함수 ──────────────────────────────────────

export function createCanaryRelease(
  workflowId: string,
  durationMinutes: number = 30
): CanaryRelease {
  const baseTriggers: CanaryRollbackTrigger[] = DEFAULT_CANARY_ROLLBACK_TRIGGERS.map((t) => ({
    ...t,
    currentValue: 0,
    triggered: false,
  }))

  const createConfig = (percentage: number): CanaryConfig => ({
    percentage,
    durationMinutes,
    metrics: { errorRatePercent: 0, avgResponseTimeMs: 0, matchingSatisfactionScore: 0 },
    rollbackTriggers: baseTriggers.map((t) => ({ ...t })),
  })

  return {
    id: `canary_${Date.now()}`,
    workflowId,
    phase: "10_percent",
    configs: {
      "10_percent": createConfig(10),
      "50_percent": createConfig(50),
      "100_percent": createConfig(100),
      completed: null,
      rolled_back: null,
    },
    currentMetrics: null,
    startedAt: Date.now(),
    completedAt: null,
    rolledBackAt: null,
    rollbackReason: null,
  }
}

export function updateCanaryMetrics(canary: CanaryRelease, metrics: CanaryMetrics): CanaryRelease {
  if (canary.phase === "completed" || canary.phase === "rolled_back") {
    throw new Error(`이미 종료된 카나리(${canary.phase})의 메트릭은 업데이트할 수 없습니다`)
  }

  const config = canary.configs[canary.phase]
  if (!config) {
    throw new Error(`현재 단계(${canary.phase})의 설정이 없습니다`)
  }

  const updatedTriggers = config.rollbackTriggers.map((trigger) => {
    let currentValue: number
    let triggered: boolean

    switch (trigger.metric) {
      case "error_rate":
        currentValue = metrics.errorRatePercent
        triggered = currentValue >= trigger.threshold
        break
      case "response_time":
        currentValue = metrics.avgResponseTimeMs
        triggered = currentValue >= trigger.threshold
        break
      case "satisfaction":
        currentValue = metrics.matchingSatisfactionScore
        triggered = currentValue <= trigger.threshold
        break
    }

    return { ...trigger, currentValue, triggered }
  })

  const updatedConfig: CanaryConfig = {
    ...config,
    metrics,
    rollbackTriggers: updatedTriggers,
  }

  return {
    ...canary,
    currentMetrics: metrics,
    configs: {
      ...canary.configs,
      [canary.phase]: updatedConfig,
    },
  }
}

export function evaluateCanaryRollback(canary: CanaryRelease): {
  shouldRollback: boolean
  triggeredReasons: string[]
} {
  const config = canary.configs[canary.phase]
  if (!config) {
    return { shouldRollback: false, triggeredReasons: [] }
  }

  const triggeredReasons: string[] = []
  for (const trigger of config.rollbackTriggers) {
    if (trigger.triggered) {
      triggeredReasons.push(
        `${trigger.metric}: 현재 ${trigger.currentValue} (임계값: ${trigger.threshold})`
      )
    }
  }

  return {
    shouldRollback: triggeredReasons.length > 0,
    triggeredReasons,
  }
}

export function advanceCanaryPhase(canary: CanaryRelease): CanaryRelease {
  const PHASE_ORDER: CanaryPhase[] = ["10_percent", "50_percent", "100_percent", "completed"]

  const currentIdx = PHASE_ORDER.indexOf(canary.phase)
  if (currentIdx === -1 || currentIdx >= PHASE_ORDER.length - 1) {
    throw new Error(`현재 단계(${canary.phase})에서는 더 이상 진행할 수 없습니다`)
  }

  const { shouldRollback, triggeredReasons } = evaluateCanaryRollback(canary)
  if (shouldRollback) {
    throw new Error(
      `롤백 트리거가 발동되어 다음 단계로 진행할 수 없습니다: ${triggeredReasons.join("; ")}`
    )
  }

  const nextPhase = PHASE_ORDER[currentIdx + 1]
  return {
    ...canary,
    phase: nextPhase,
    completedAt: nextPhase === "completed" ? Date.now() : null,
  }
}

export function rollbackCanaryRelease(canary: CanaryRelease, reason: string): CanaryRelease {
  if (canary.phase === "completed" || canary.phase === "rolled_back") {
    throw new Error(`이미 종료된 카나리(${canary.phase})는 롤백할 수 없습니다`)
  }
  return {
    ...canary,
    phase: "rolled_back",
    rolledBackAt: Date.now(),
    rollbackReason: reason,
  }
}

export function executeCanaryRelease(
  workflowId: string,
  metrics: CanaryMetrics,
  durationMinutes: number = 30
): {
  canary: CanaryRelease
  shouldRollback: boolean
  triggeredReasons: string[]
} {
  const canary = createCanaryRelease(workflowId, durationMinutes)
  const updated = updateCanaryMetrics(canary, metrics)
  const evaluation = evaluateCanaryRollback(updated)

  return {
    canary: updated,
    shouldRollback: evaluation.shouldRollback,
    triggeredReasons: evaluation.triggeredReasons,
  }
}

// ── 배포 히스토리 ────────────────────────────────────────────

export interface DeployHistory {
  workflows: DeployWorkflow[]
  canaryReleases: CanaryRelease[]
}

export function getDeployHistoryByEnvironment(
  history: DeployHistory,
  environment: DeployEnvironment
): DeployWorkflow[] {
  return history.workflows
    .filter((w) => w.environment === environment)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function getActiveDeployments(history: DeployHistory): DeployWorkflow[] {
  return history.workflows.filter((w) => w.status === "in_progress" || w.status === "pending")
}

// ═══════════════════════════════════════════════════════════════
// AC2: 알고리즘 버전 관리 (버전 정책, 저장소, Diff, 롤백)
// ═══════════════════════════════════════════════════════════════

// ── 알고리즘 버전 타입 정의 ──────────────────────────────────

export type AlgorithmVersionStatus = "draft" | "testing" | "active" | "deprecated" | "rolled_back"

export type AlgorithmCategory = "matching" | "persona_generator" | "user_profiler"

export interface AlgorithmVersion {
  id: string
  category: AlgorithmCategory
  version: string // "v1.0.0-001" format
  parentVersion: string | null
  status: AlgorithmVersionStatus
  createdBy: string
  createdAt: number
  description: string
  changelog: string
  deployedEnvironments: DeployEnvironment[]
  config: Record<string, number | string | boolean>
  weights: Record<string, number>
}

// ── 버전 정책 타입 정의 ──────────────────────────────────────

export type VersionBumpType = "major" | "minor" | "patch"

export interface VersionPolicy {
  naming: {
    prefix: string
    separator: string
    buildSeparator: string
  }
  compatibility: {
    majorBreaking: boolean
    minorBackwardCompatible: boolean
    patchBugFixOnly: boolean
  }
  rules: {
    maxActiveVersions: number
    autoDeprecateAfterDays: number
    requireTestBeforeActivation: boolean
    requireApprovalForMajor: boolean
  }
}

export const DEFAULT_VERSION_POLICY: VersionPolicy = {
  naming: {
    prefix: "v",
    separator: ".",
    buildSeparator: "-",
  },
  compatibility: {
    majorBreaking: true,
    minorBackwardCompatible: true,
    patchBugFixOnly: true,
  },
  rules: {
    maxActiveVersions: 3,
    autoDeprecateAfterDays: 180,
    requireTestBeforeActivation: true,
    requireApprovalForMajor: true,
  },
}

// ── 버전 Diff 타입 정의 ─────────────────────────────────────

export type DiffChangeType = "added" | "removed" | "modified"

export interface DiffEntry {
  path: string
  changeType: DiffChangeType
  oldValue: string | number | boolean | null
  newValue: string | number | boolean | null
}

export interface VersionDiff {
  fromVersion: string
  toVersion: string
  category: AlgorithmCategory
  entries: DiffEntry[]
  configChanges: number
  weightChanges: number
  summary: string
  generatedAt: number
}

// ── 버전 롤백 타입 정의 ─────────────────────────────────────

export interface VersionRollback {
  id: string
  category: AlgorithmCategory
  fromVersion: string
  toVersion: string
  reason: string
  executedBy: string
  executedAt: number
  affectedEnvironments: DeployEnvironment[]
}

// ── 알고리즘 버전 관리 함수 ──────────────────────────────────

export function parseVersion(versionString: string): {
  major: number
  minor: number
  patch: number
  build: number | null
} {
  const cleaned = versionString.replace(/^v/, "")
  const [versionPart, buildPart] = cleaned.split("-")
  const parts = versionPart.split(".")

  if (parts.length !== 3) {
    throw new Error(
      `잘못된 버전 형식입니다: ${versionString} (v[Major].[Minor].[Patch] 형식이어야 합니다)`
    )
  }

  const major = parseInt(parts[0], 10)
  const minor = parseInt(parts[1], 10)
  const patch = parseInt(parts[2], 10)

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    throw new Error(`버전 번호는 숫자여야 합니다: ${versionString}`)
  }

  const build = buildPart !== undefined ? parseInt(buildPart, 10) : null
  if (build !== null && isNaN(build)) {
    throw new Error(`빌드 번호는 숫자여야 합니다: ${versionString}`)
  }

  return { major, minor, patch, build }
}

export function formatVersion(
  major: number,
  minor: number,
  patch: number,
  build: number | null = null,
  policy: VersionPolicy = DEFAULT_VERSION_POLICY
): string {
  const base = `${policy.naming.prefix}${major}${policy.naming.separator}${minor}${policy.naming.separator}${patch}`
  if (build !== null) {
    return `${base}${policy.naming.buildSeparator}${String(build).padStart(3, "0")}`
  }
  return base
}

export function bumpVersion(
  currentVersion: string,
  bumpType: VersionBumpType,
  build: number | null = null,
  policy: VersionPolicy = DEFAULT_VERSION_POLICY
): string {
  const parsed = parseVersion(currentVersion)

  switch (bumpType) {
    case "major":
      return formatVersion(parsed.major + 1, 0, 0, build, policy)
    case "minor":
      return formatVersion(parsed.major, parsed.minor + 1, 0, build, policy)
    case "patch":
      return formatVersion(parsed.major, parsed.minor, parsed.patch + 1, build, policy)
  }
}

export function compareVersions(a: string, b: string): number {
  const parsedA = parseVersion(a)
  const parsedB = parseVersion(b)

  if (parsedA.major !== parsedB.major) return parsedA.major - parsedB.major
  if (parsedA.minor !== parsedB.minor) return parsedA.minor - parsedB.minor
  if (parsedA.patch !== parsedB.patch) return parsedA.patch - parsedB.patch

  const buildA = parsedA.build ?? 0
  const buildB = parsedB.build ?? 0
  return buildA - buildB
}

export function createVersion(
  category: AlgorithmCategory,
  version: string,
  createdBy: string,
  description: string,
  changelog: string,
  config: Record<string, number | string | boolean>,
  weights: Record<string, number>,
  parentVersion: string | null = null
): AlgorithmVersion {
  // 버전 형식 검증
  parseVersion(version)

  return {
    id: `algo_${category}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    category,
    version,
    parentVersion,
    status: "draft",
    createdBy,
    createdAt: Date.now(),
    description,
    changelog,
    deployedEnvironments: [],
    config,
    weights,
  }
}

export function activateVersion(
  version: AlgorithmVersion,
  allVersions: AlgorithmVersion[],
  policy: VersionPolicy = DEFAULT_VERSION_POLICY
): AlgorithmVersion {
  if (version.status !== "testing" && version.status !== "draft") {
    throw new Error(`현재 상태(${version.status})에서는 활성화할 수 없습니다`)
  }

  if (policy.rules.requireTestBeforeActivation && version.status !== "testing") {
    throw new Error("활성화 전 테스트 단계를 거쳐야 합니다")
  }

  const parsed = parseVersion(version.version)
  if (policy.rules.requireApprovalForMajor && parsed.major > 0 && version.parentVersion !== null) {
    const parentParsed = parseVersion(version.parentVersion)
    if (parsed.major > parentParsed.major) {
      // Major 버전 변경은 승인이 필요하므로 status를 그대로 둘 수 있으나
      // 이 함수는 활성화 함수이므로 검증만 통과하면 활성화 허용
    }
  }

  // 같은 카테고리의 active 버전 수 확인
  const activeCount = allVersions.filter(
    (v) => v.category === version.category && v.status === "active" && v.id !== version.id
  ).length

  if (activeCount >= policy.rules.maxActiveVersions) {
    throw new Error(
      `최대 활성 버전 수(${policy.rules.maxActiveVersions})에 도달했습니다. 기존 버전을 deprecated로 변경한 후 활성화하세요.`
    )
  }

  return { ...version, status: "active" }
}

export function deprecateVersion(version: AlgorithmVersion, reason: string): AlgorithmVersion {
  if (version.status !== "active") {
    throw new Error(
      `활성(active) 상태의 버전만 deprecated 처리할 수 있습니다 (현재: ${version.status})`
    )
  }
  return {
    ...version,
    status: "deprecated",
    changelog: `${version.changelog}\n\n[Deprecated] ${reason}`,
  }
}

export function setVersionTesting(version: AlgorithmVersion): AlgorithmVersion {
  if (version.status !== "draft") {
    throw new Error(
      `초안(draft) 상태의 버전만 테스트 상태로 전환할 수 있습니다 (현재: ${version.status})`
    )
  }
  return { ...version, status: "testing" }
}

export function deployVersionToEnvironment(
  version: AlgorithmVersion,
  environment: DeployEnvironment
): AlgorithmVersion {
  if (version.status !== "active" && version.status !== "testing") {
    throw new Error(
      `활성(active) 또는 테스트(testing) 상태의 버전만 배포할 수 있습니다 (현재: ${version.status})`
    )
  }
  if (version.deployedEnvironments.includes(environment)) {
    return version
  }
  return {
    ...version,
    deployedEnvironments: [...version.deployedEnvironments, environment],
  }
}

export function diffVersions(versionA: AlgorithmVersion, versionB: AlgorithmVersion): VersionDiff {
  if (versionA.category !== versionB.category) {
    throw new Error("같은 카테고리의 버전만 비교할 수 있습니다")
  }

  const entries: DiffEntry[] = []

  // config diff
  const allConfigKeys = new Set([...Object.keys(versionA.config), ...Object.keys(versionB.config)])
  for (const key of allConfigKeys) {
    const oldVal = versionA.config[key] ?? null
    const newVal = versionB.config[key] ?? null

    if (oldVal === null && newVal !== null) {
      entries.push({ path: `config.${key}`, changeType: "added", oldValue: null, newValue: newVal })
    } else if (oldVal !== null && newVal === null) {
      entries.push({
        path: `config.${key}`,
        changeType: "removed",
        oldValue: oldVal,
        newValue: null,
      })
    } else if (oldVal !== newVal) {
      entries.push({
        path: `config.${key}`,
        changeType: "modified",
        oldValue: oldVal,
        newValue: newVal,
      })
    }
  }

  // weights diff
  const allWeightKeys = new Set([
    ...Object.keys(versionA.weights),
    ...Object.keys(versionB.weights),
  ])
  for (const key of allWeightKeys) {
    const oldVal = versionA.weights[key] ?? null
    const newVal = versionB.weights[key] ?? null

    if (oldVal === null && newVal !== null) {
      entries.push({
        path: `weights.${key}`,
        changeType: "added",
        oldValue: null,
        newValue: newVal,
      })
    } else if (oldVal !== null && newVal === null) {
      entries.push({
        path: `weights.${key}`,
        changeType: "removed",
        oldValue: oldVal,
        newValue: null,
      })
    } else if (oldVal !== newVal) {
      entries.push({
        path: `weights.${key}`,
        changeType: "modified",
        oldValue: oldVal,
        newValue: newVal,
      })
    }
  }

  const configChanges = entries.filter((e) => e.path.startsWith("config.")).length
  const weightChanges = entries.filter((e) => e.path.startsWith("weights.")).length

  const summary =
    entries.length === 0
      ? `${versionA.version} → ${versionB.version}: 변경 없음`
      : `${versionA.version} → ${versionB.version}: ${entries.length}개 변경 (설정 ${configChanges}, 가중치 ${weightChanges})`

  return {
    fromVersion: versionA.version,
    toVersion: versionB.version,
    category: versionA.category,
    entries,
    configChanges,
    weightChanges,
    summary,
    generatedAt: Date.now(),
  }
}

export function rollbackVersion(
  currentVersion: AlgorithmVersion,
  targetVersion: AlgorithmVersion,
  reason: string,
  executedBy: string,
  environments: DeployEnvironment[]
): {
  rollback: VersionRollback
  updatedCurrent: AlgorithmVersion
  updatedTarget: AlgorithmVersion
} {
  if (currentVersion.category !== targetVersion.category) {
    throw new Error("같은 카테고리의 버전만 롤백할 수 있습니다")
  }

  if (compareVersions(targetVersion.version, currentVersion.version) >= 0) {
    throw new Error("롤백 대상 버전은 현재 버전보다 이전이어야 합니다")
  }

  if (targetVersion.status !== "active" && targetVersion.status !== "deprecated") {
    throw new Error(
      `롤백 대상 버전은 active 또는 deprecated 상태여야 합니다 (현재: ${targetVersion.status})`
    )
  }

  const rollback: VersionRollback = {
    id: `rb_${Date.now()}`,
    category: currentVersion.category,
    fromVersion: currentVersion.version,
    toVersion: targetVersion.version,
    reason,
    executedBy,
    executedAt: Date.now(),
    affectedEnvironments: environments,
  }

  const updatedCurrent: AlgorithmVersion = {
    ...currentVersion,
    status: "rolled_back",
    changelog: `${currentVersion.changelog}\n\n[Rolled back] ${reason}`,
  }

  const updatedTarget: AlgorithmVersion = {
    ...targetVersion,
    status: "active",
    deployedEnvironments: [...new Set([...targetVersion.deployedEnvironments, ...environments])],
  }

  return { rollback, updatedCurrent, updatedTarget }
}

export function getVersionHistory(
  versions: AlgorithmVersion[],
  category: AlgorithmCategory
): AlgorithmVersion[] {
  return versions
    .filter((v) => v.category === category)
    .sort((a, b) => compareVersions(b.version, a.version))
}

// ═══════════════════════════════════════════════════════════════
// AC3: 이벤트 버스 (이벤트 유형/스키마, 모니터링, 동기화 지연)
// ═══════════════════════════════════════════════════════════════

// ── 이벤트 유형 정의 ────────────────────────────────────────

export type PersonaEventType =
  | "persona.created"
  | "persona.updated"
  | "persona.activated"
  | "persona.deactivated"
  | "persona.archived"
  | "persona.validation_completed"

export type AlgorithmEventType =
  | "algorithm.deployed"
  | "algorithm.rollback"
  | "algorithm.config_changed"

export type SystemEventType = "system.health_check" | "system.alert"

export type MatchingEventType = "matching.completed" | "matching.failed"

export type EventType = PersonaEventType | AlgorithmEventType | SystemEventType | MatchingEventType

export const ALL_EVENT_TYPES: EventType[] = [
  "persona.created",
  "persona.updated",
  "persona.activated",
  "persona.deactivated",
  "persona.archived",
  "persona.validation_completed",
  "algorithm.deployed",
  "algorithm.rollback",
  "algorithm.config_changed",
  "system.health_check",
  "system.alert",
  "matching.completed",
  "matching.failed",
]

// ── 이벤트 스키마 타입 정의 ──────────────────────────────────

export interface EventSource {
  service: string
  instance: string
}

export interface EventMetadata {
  userId: string
  userRole: string
  environment: DeployEnvironment
}

export interface EventSchema<T = Record<string, unknown>> {
  eventId: string
  eventType: EventType
  eventVersion: string
  timestamp: number
  source: EventSource
  correlationId: string | null
  metadata: EventMetadata
  payload: T
}

export type EventStatus = "pending" | "delivered" | "failed" | "retrying"

export interface EventLogEntry {
  event: EventSchema
  status: EventStatus
  attempts: number
  lastAttemptAt: number | null
  deliveredAt: number | null
  error: string | null
  subscribers: string[]
}

// ── 이벤트 구독자 타입 정의 ──────────────────────────────────

export interface EventSubscription {
  id: string
  subscriberId: string
  eventTypes: EventType[]
  endpoint: string
  active: boolean
  createdAt: number
}

export type EventHandler = (event: EventSchema) => void

// ── 이벤트 버스 상태 ────────────────────────────────────────

export interface EventBusState {
  subscriptions: EventSubscription[]
  eventLog: EventLogEntry[]
  handlers: Map<string, EventHandler[]>
  maxLogEntries: number
}

// ── 동기화 지연 모니터링 ────────────────────────────────────

export interface SyncDelayTarget {
  name: string
  slaMs: number
}

export const SYNC_DELAY_TARGETS: SyncDelayTarget[] = [
  { name: "API Engine", slaMs: 5000 },
  { name: "Developer Console", slaMs: 10000 },
]

export interface SyncDelayMetric {
  target: string
  eventId: string
  publishedAt: number
  deliveredAt: number | null
  delayMs: number | null
  slaMs: number
  slaMet: boolean | null
}

export interface SyncDelayReport {
  target: string
  totalEvents: number
  deliveredEvents: number
  averageDelayMs: number
  p95DelayMs: number
  slaCompliancePercent: number
  violations: SyncDelayMetric[]
  generatedAt: number
}

// ── 이벤트 버스 함수 ────────────────────────────────────────

export function createEventBus(maxLogEntries: number = 10000): EventBusState {
  return {
    subscriptions: [],
    eventLog: [],
    handlers: new Map(),
    maxLogEntries,
  }
}

export function subscribe(
  bus: EventBusState,
  subscriberId: string,
  eventTypes: EventType[],
  endpoint: string,
  handler?: EventHandler
): EventBusState {
  const subscription: EventSubscription = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    subscriberId,
    eventTypes,
    endpoint,
    active: true,
    createdAt: Date.now(),
  }

  const newHandlers = new Map(bus.handlers)
  if (handler) {
    for (const eventType of eventTypes) {
      const existing = newHandlers.get(eventType) ?? []
      newHandlers.set(eventType, [...existing, handler])
    }
  }

  return {
    ...bus,
    subscriptions: [...bus.subscriptions, subscription],
    handlers: newHandlers,
  }
}

export function unsubscribe(bus: EventBusState, subscriptionId: string): EventBusState {
  const subscription = bus.subscriptions.find((s) => s.id === subscriptionId)
  if (!subscription) {
    throw new Error(`구독을 찾을 수 없습니다: ${subscriptionId}`)
  }

  return {
    ...bus,
    subscriptions: bus.subscriptions.map((s) =>
      s.id === subscriptionId ? { ...s, active: false } : s
    ),
  }
}

export function createEvent<T = Record<string, unknown>>(
  eventType: EventType,
  payload: T,
  source: EventSource,
  metadata: EventMetadata,
  correlationId: string | null = null
): EventSchema<T> {
  return {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    eventType,
    eventVersion: "1.0",
    timestamp: Date.now(),
    source,
    correlationId,
    metadata,
    payload,
  }
}

export function publish(bus: EventBusState, event: EventSchema): EventBusState {
  // 해당 이벤트 유형을 구독하는 활성 구독자 찾기
  const activeSubscribers = bus.subscriptions
    .filter((s) => s.active && s.eventTypes.includes(event.eventType))
    .map((s) => s.subscriberId)

  // 핸들러 실행 (순수 함수 내에서는 부수 효과 없이 기록만)
  const handlers = bus.handlers.get(event.eventType) ?? []
  for (const handler of handlers) {
    try {
      handler(event)
    } catch {
      // 핸들러 실행 오류는 로그에 기록
    }
  }

  const logEntry: EventLogEntry = {
    event,
    status: activeSubscribers.length > 0 ? "delivered" : "pending",
    attempts: 1,
    lastAttemptAt: Date.now(),
    deliveredAt: activeSubscribers.length > 0 ? Date.now() : null,
    error: null,
    subscribers: activeSubscribers,
  }

  let updatedLog = [...bus.eventLog, logEntry]
  if (updatedLog.length > bus.maxLogEntries) {
    updatedLog = updatedLog.slice(updatedLog.length - bus.maxLogEntries)
  }

  return {
    ...bus,
    eventLog: updatedLog,
  }
}

export function retryEvent(bus: EventBusState, eventId: string): EventBusState {
  const entryIdx = bus.eventLog.findIndex((e) => e.event.eventId === eventId)
  if (entryIdx === -1) {
    throw new Error(`이벤트를 찾을 수 없습니다: ${eventId}`)
  }

  const entry = bus.eventLog[entryIdx]
  if (entry.status !== "failed") {
    throw new Error(`실패(failed) 상태의 이벤트만 재시도할 수 있습니다 (현재: ${entry.status})`)
  }

  const updatedEntry: EventLogEntry = {
    ...entry,
    status: "retrying",
    attempts: entry.attempts + 1,
    lastAttemptAt: Date.now(),
  }

  const updatedLog = [...bus.eventLog]
  updatedLog[entryIdx] = updatedEntry

  return { ...bus, eventLog: updatedLog }
}

export function markEventDelivered(bus: EventBusState, eventId: string): EventBusState {
  const entryIdx = bus.eventLog.findIndex((e) => e.event.eventId === eventId)
  if (entryIdx === -1) {
    throw new Error(`이벤트를 찾을 수 없습니다: ${eventId}`)
  }

  const updatedEntry: EventLogEntry = {
    ...bus.eventLog[entryIdx],
    status: "delivered",
    deliveredAt: Date.now(),
  }

  const updatedLog = [...bus.eventLog]
  updatedLog[entryIdx] = updatedEntry

  return { ...bus, eventLog: updatedLog }
}

export function markEventFailed(bus: EventBusState, eventId: string, error: string): EventBusState {
  const entryIdx = bus.eventLog.findIndex((e) => e.event.eventId === eventId)
  if (entryIdx === -1) {
    throw new Error(`이벤트를 찾을 수 없습니다: ${eventId}`)
  }

  const updatedEntry: EventLogEntry = {
    ...bus.eventLog[entryIdx],
    status: "failed",
    error,
  }

  const updatedLog = [...bus.eventLog]
  updatedLog[entryIdx] = updatedEntry

  return { ...bus, eventLog: updatedLog }
}

export function getEventLog(
  bus: EventBusState,
  filters?: {
    eventTypes?: EventType[]
    status?: EventStatus[]
    startTime?: number
    endTime?: number
    limit?: number
  }
): EventLogEntry[] {
  let result = [...bus.eventLog]

  if (filters?.eventTypes && filters.eventTypes.length > 0) {
    result = result.filter((e) => filters.eventTypes!.includes(e.event.eventType))
  }
  if (filters?.status && filters.status.length > 0) {
    result = result.filter((e) => filters.status!.includes(e.status))
  }
  if (filters?.startTime !== undefined) {
    result = result.filter((e) => e.event.timestamp >= filters.startTime!)
  }
  if (filters?.endTime !== undefined) {
    result = result.filter((e) => e.event.timestamp <= filters.endTime!)
  }

  result.sort((a, b) => b.event.timestamp - a.event.timestamp)

  if (filters?.limit !== undefined && filters.limit > 0) {
    result = result.slice(0, filters.limit)
  }

  return result
}

export function getEventStats(bus: EventBusState): {
  totalEvents: number
  byType: Record<string, number>
  byStatus: Record<EventStatus, number>
  failedEvents: number
  avgDeliveryTimeMs: number
} {
  const byType: Record<string, number> = {}
  const byStatus: Record<EventStatus, number> = {
    pending: 0,
    delivered: 0,
    failed: 0,
    retrying: 0,
  }

  let totalDeliveryTime = 0
  let deliveredCount = 0

  for (const entry of bus.eventLog) {
    byType[entry.event.eventType] = (byType[entry.event.eventType] ?? 0) + 1
    byStatus[entry.status]++

    if (entry.status === "delivered" && entry.deliveredAt !== null) {
      totalDeliveryTime += entry.deliveredAt - entry.event.timestamp
      deliveredCount++
    }
  }

  return {
    totalEvents: bus.eventLog.length,
    byType,
    byStatus,
    failedEvents: byStatus.failed,
    avgDeliveryTimeMs: deliveredCount > 0 ? Math.round(totalDeliveryTime / deliveredCount) : 0,
  }
}

// ── 동기화 지연 모니터링 함수 ────────────────────────────────

export function measureSyncDelay(
  eventId: string,
  publishedAt: number,
  deliveredAt: number | null,
  target: SyncDelayTarget
): SyncDelayMetric {
  const delayMs = deliveredAt !== null ? deliveredAt - publishedAt : null
  const slaMet = delayMs !== null ? delayMs <= target.slaMs : null

  return {
    target: target.name,
    eventId,
    publishedAt,
    deliveredAt,
    delayMs,
    slaMs: target.slaMs,
    slaMet,
  }
}

export function generateSyncDelayReport(
  metrics: SyncDelayMetric[],
  targetName: string
): SyncDelayReport {
  const targetMetrics = metrics.filter((m) => m.target === targetName)
  const delivered = targetMetrics.filter((m) => m.delayMs !== null) as Array<
    SyncDelayMetric & { delayMs: number }
  >

  const averageDelayMs =
    delivered.length > 0
      ? Math.round(delivered.reduce((s, m) => s + m.delayMs, 0) / delivered.length)
      : 0

  // P95 계산
  let p95DelayMs = 0
  if (delivered.length > 0) {
    const sorted = [...delivered].sort((a, b) => a.delayMs - b.delayMs)
    const p95Idx = Math.ceil(sorted.length * 0.95) - 1
    p95DelayMs = sorted[Math.max(0, p95Idx)].delayMs
  }

  const slaMet = delivered.filter((m) => m.slaMet === true).length
  const slaCompliancePercent =
    delivered.length > 0 ? Math.round((slaMet / delivered.length) * 10000) / 100 : 100

  const violations = targetMetrics.filter((m) => m.slaMet === false)

  return {
    target: targetName,
    totalEvents: targetMetrics.length,
    deliveredEvents: delivered.length,
    averageDelayMs,
    p95DelayMs,
    slaCompliancePercent,
    violations,
    generatedAt: Date.now(),
  }
}

// ═══════════════════════════════════════════════════════════════
// AC4: 개발자 콘솔 연동 (API 문서 자동 생성, Changelog, 사용량 동기화)
// ═══════════════════════════════════════════════════════════════

// ── API 문서 타입 정의 ───────────────────────────────────────

export type HTTPMethodDoc = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface APIDocParameter {
  name: string
  in: "query" | "path" | "header" | "body"
  required: boolean
  type: string
  description: string
  example: string | null
}

export interface APIDocResponse {
  statusCode: number
  description: string
  schema: Record<string, unknown>
  example: Record<string, unknown> | null
}

export interface APIDocEndpoint {
  path: string
  method: HTTPMethodDoc
  summary: string
  description: string
  tags: string[]
  parameters: APIDocParameter[]
  responses: APIDocResponse[]
  deprecated: boolean
}

export interface APIDocSpec {
  title: string
  version: string
  description: string
  baseUrl: string
  endpoints: APIDocEndpoint[]
  schemas: Record<string, Record<string, unknown>>
  generatedAt: number
  lastUpdatedAt: number
}

// ── Changelog 타입 정의 ──────────────────────────────────────

export type ChangeCategory = "added" | "changed" | "fixed" | "deprecated" | "removed" | "security"

export interface ChangeItem {
  category: ChangeCategory
  description: string
  relatedEventType: EventType | null
}

export interface ChangelogEntry {
  date: string // ISO date string (YYYY-MM-DD)
  version: string
  title: string
  changes: ChangeItem[]
  generatedAt: number
}

export interface Changelog {
  entries: ChangelogEntry[]
  lastUpdatedAt: number
}

// ── 사용량 동기화 타입 정의 ──────────────────────────────────

export type SyncInterval = "realtime" | "1_minute" | "1_hour"

export interface UsageRecord {
  timestamp: number
  apiCalls: number
  tokenUsage: number
  costUsd: number
  modelBreakdown: Record<string, { calls: number; tokens: number; cost: number }>
}

export interface UsageSyncConfig {
  syncIntervals: Record<string, SyncInterval>
  retentionDays: number
  enabled: boolean
}

export interface UsageSyncStatus {
  lastSyncAt: number | null
  lastSyncSuccess: boolean
  pendingRecords: number
  totalSynced: number
  errors: string[]
}

export interface DeveloperConsoleIntegration {
  apiDoc: APIDocSpec | null
  changelog: Changelog
  usageConfig: UsageSyncConfig
  usageSyncStatus: UsageSyncStatus
  connectionStatus: "connected" | "degraded" | "disconnected"
  lastHealthCheckAt: number | null
}

export const DEFAULT_USAGE_SYNC_CONFIG: UsageSyncConfig = {
  syncIntervals: {
    api_calls: "realtime",
    token_usage: "1_minute",
    cost: "1_hour",
  },
  retentionDays: 90,
  enabled: true,
}

// ── API 문서 생성 함수 ───────────────────────────────────────

export function createAPIDocSpec(
  title: string,
  version: string,
  description: string,
  baseUrl: string
): APIDocSpec {
  return {
    title,
    version,
    description,
    baseUrl,
    endpoints: [],
    schemas: {},
    generatedAt: Date.now(),
    lastUpdatedAt: Date.now(),
  }
}

export function addDocEndpoint(spec: APIDocSpec, endpoint: APIDocEndpoint): APIDocSpec {
  const exists = spec.endpoints.some(
    (e) => e.path === endpoint.path && e.method === endpoint.method
  )
  if (exists) {
    // 기존 엔드포인트 업데이트
    return {
      ...spec,
      endpoints: spec.endpoints.map((e) =>
        e.path === endpoint.path && e.method === endpoint.method ? endpoint : e
      ),
      lastUpdatedAt: Date.now(),
    }
  }
  return {
    ...spec,
    endpoints: [...spec.endpoints, endpoint],
    lastUpdatedAt: Date.now(),
  }
}

export function addDocSchema(
  spec: APIDocSpec,
  name: string,
  schema: Record<string, unknown>
): APIDocSpec {
  return {
    ...spec,
    schemas: { ...spec.schemas, [name]: schema },
    lastUpdatedAt: Date.now(),
  }
}

export function deprecateDocEndpoint(
  spec: APIDocSpec,
  path: string,
  method: HTTPMethodDoc
): APIDocSpec {
  const idx = spec.endpoints.findIndex((e) => e.path === path && e.method === method)
  if (idx === -1) {
    throw new Error(`엔드포인트를 찾을 수 없습니다: ${method} ${path}`)
  }
  const updated = [...spec.endpoints]
  updated[idx] = { ...updated[idx], deprecated: true }
  return { ...spec, endpoints: updated, lastUpdatedAt: Date.now() }
}

export function generateAPIDocs(
  personas: Array<{ id: string; name: string; status: string }>,
  algorithmVersion: string,
  baseUrl: string
): APIDocSpec {
  const spec = createAPIDocSpec(
    "DeepSight Persona API",
    algorithmVersion,
    "AI 페르소나 기반 콘텐츠 추천 API",
    baseUrl
  )

  // 페르소나 목록 엔드포인트
  const listEndpoint: APIDocEndpoint = {
    path: "/api/v3/personas",
    method: "GET",
    summary: "페르소나 목록 조회",
    description: `현재 활성화된 ${personas.filter((p) => p.status === "ACTIVE").length}개의 페르소나를 조회합니다.`,
    tags: ["Persona"],
    parameters: [
      {
        name: "page",
        in: "query",
        required: false,
        type: "number",
        description: "페이지 번호",
        example: "1",
      },
      {
        name: "limit",
        in: "query",
        required: false,
        type: "number",
        description: "페이지 크기",
        example: "20",
      },
      {
        name: "status",
        in: "query",
        required: false,
        type: "string",
        description: "페르소나 상태 필터",
        example: "ACTIVE",
      },
    ],
    responses: [
      {
        statusCode: 200,
        description: "성공",
        schema: {
          type: "object",
          properties: { success: { type: "boolean" }, data: { type: "array" } },
        },
        example: null,
      },
      { statusCode: 401, description: "인증 실패", schema: { type: "object" }, example: null },
    ],
    deprecated: false,
  }

  // 매칭 엔드포인트
  const matchEndpoint: APIDocEndpoint = {
    path: "/api/v3/matching",
    method: "POST",
    summary: "콘텐츠 매칭 요청",
    description: `알고리즘 버전 ${algorithmVersion}을 사용하여 유저와 페르소나를 매칭합니다.`,
    tags: ["Matching"],
    parameters: [
      {
        name: "user_vector",
        in: "body",
        required: true,
        type: "object",
        description: "유저 벡터 (L1 7D)",
        example: null,
      },
      {
        name: "persona_ids",
        in: "body",
        required: false,
        type: "array",
        description: "매칭 대상 페르소나 ID 목록",
        example: null,
      },
      {
        name: "limit",
        in: "body",
        required: false,
        type: "number",
        description: "결과 수 제한",
        example: "5",
      },
    ],
    responses: [
      { statusCode: 200, description: "매칭 성공", schema: { type: "object" }, example: null },
      { statusCode: 400, description: "잘못된 요청", schema: { type: "object" }, example: null },
    ],
    deprecated: false,
  }

  return addDocEndpoint(addDocEndpoint(spec, listEndpoint), matchEndpoint)
}

// ── Changelog 생성 함수 ─────────────────────────────────────

export function createChangelog(): Changelog {
  return {
    entries: [],
    lastUpdatedAt: Date.now(),
  }
}

export function addChangelogEntry(changelog: Changelog, entry: ChangelogEntry): Changelog {
  return {
    entries: [entry, ...changelog.entries],
    lastUpdatedAt: Date.now(),
  }
}

export function generateChangelog(events: EventSchema[], version: string): ChangelogEntry {
  const changes: ChangeItem[] = []
  const today = new Date().toISOString().split("T")[0]

  for (const event of events) {
    switch (event.eventType) {
      case "persona.created":
        changes.push({
          category: "added",
          description: `새로운 페르소나 추가${getPayloadName(event.payload)}`,
          relatedEventType: "persona.created",
        })
        break
      case "persona.activated":
        changes.push({
          category: "added",
          description: `페르소나 활성화${getPayloadName(event.payload)}`,
          relatedEventType: "persona.activated",
        })
        break
      case "persona.updated":
        changes.push({
          category: "changed",
          description: `페르소나 수정${getPayloadName(event.payload)}`,
          relatedEventType: "persona.updated",
        })
        break
      case "algorithm.deployed":
        changes.push({
          category: "changed",
          description: `매칭 알고리즘 업데이트${getPayloadVersion(event.payload)}`,
          relatedEventType: "algorithm.deployed",
        })
        break
      case "algorithm.rollback":
        changes.push({
          category: "fixed",
          description: `알고리즘 버전 롤백${getPayloadVersion(event.payload)}`,
          relatedEventType: "algorithm.rollback",
        })
        break
      case "algorithm.config_changed":
        changes.push({
          category: "changed",
          description: "알고리즘 설정 변경",
          relatedEventType: "algorithm.config_changed",
        })
        break
      case "persona.deactivated":
      case "persona.archived":
        changes.push({
          category: "removed",
          description: `페르소나 비활성화/보관${getPayloadName(event.payload)}`,
          relatedEventType: event.eventType,
        })
        break
      default:
        break
    }
  }

  return {
    date: today,
    version,
    title: `${version} 업데이트`,
    changes,
    generatedAt: Date.now(),
  }
}

export function formatChangelogMarkdown(changelog: Changelog): string {
  const lines: string[] = ["# Changelog", ""]

  for (const entry of changelog.entries) {
    lines.push(`## [${entry.date}] ${entry.version}`)
    lines.push("")

    const grouped = groupChangesByCategory(entry.changes)

    for (const [category, items] of Object.entries(grouped)) {
      lines.push(`### ${capitalizeCategory(category)}`)
      for (const item of items) {
        lines.push(`- ${item.description}`)
      }
      lines.push("")
    }
  }

  return lines.join("\n")
}

// ── 사용량 동기화 함수 ───────────────────────────────────────

export function createDeveloperConsoleIntegration(
  usageConfig?: Partial<UsageSyncConfig>
): DeveloperConsoleIntegration {
  return {
    apiDoc: null,
    changelog: createChangelog(),
    usageConfig: {
      ...DEFAULT_USAGE_SYNC_CONFIG,
      ...usageConfig,
    },
    usageSyncStatus: {
      lastSyncAt: null,
      lastSyncSuccess: false,
      pendingRecords: 0,
      totalSynced: 0,
      errors: [],
    },
    connectionStatus: "disconnected",
    lastHealthCheckAt: null,
  }
}

export function syncUsageStats(
  integration: DeveloperConsoleIntegration,
  records: UsageRecord[]
): DeveloperConsoleIntegration {
  if (!integration.usageConfig.enabled) {
    throw new Error("사용량 동기화가 비활성화되어 있습니다")
  }

  if (integration.connectionStatus === "disconnected") {
    return {
      ...integration,
      usageSyncStatus: {
        ...integration.usageSyncStatus,
        pendingRecords: integration.usageSyncStatus.pendingRecords + records.length,
        errors: [
          ...integration.usageSyncStatus.errors.slice(-99),
          `동기화 실패: 개발자 콘솔 연결 끊김 (${new Date().toISOString()})`,
        ],
      },
    }
  }

  return {
    ...integration,
    usageSyncStatus: {
      lastSyncAt: Date.now(),
      lastSyncSuccess: true,
      pendingRecords: 0,
      totalSynced: integration.usageSyncStatus.totalSynced + records.length,
      errors: integration.usageSyncStatus.errors,
    },
  }
}

export function updateConnectionStatus(
  integration: DeveloperConsoleIntegration,
  status: DeveloperConsoleIntegration["connectionStatus"]
): DeveloperConsoleIntegration {
  return {
    ...integration,
    connectionStatus: status,
    lastHealthCheckAt: Date.now(),
  }
}

export function getIntegrationHealthSummary(integration: DeveloperConsoleIntegration): {
  status: "healthy" | "warning" | "error"
  connectionStatus: DeveloperConsoleIntegration["connectionStatus"]
  lastSyncAge: number | null
  pendingRecords: number
  docUpToDate: boolean
  issues: string[]
} {
  const issues: string[] = []
  const now = Date.now()

  if (integration.connectionStatus === "disconnected") {
    issues.push("개발자 콘솔 연결 끊김")
  } else if (integration.connectionStatus === "degraded") {
    issues.push("개발자 콘솔 연결 불안정")
  }

  const lastSyncAge =
    integration.usageSyncStatus.lastSyncAt !== null
      ? now - integration.usageSyncStatus.lastSyncAt
      : null

  if (lastSyncAge !== null && lastSyncAge > 300000) {
    issues.push("마지막 동기화가 5분 이상 경과")
  }

  if (integration.usageSyncStatus.pendingRecords > 100) {
    issues.push(`대기 중인 동기화 레코드 ${integration.usageSyncStatus.pendingRecords}건`)
  }

  const docUpToDate = integration.apiDoc !== null
  if (!docUpToDate) {
    issues.push("API 문서가 생성되지 않음")
  }

  let status: "healthy" | "warning" | "error" = "healthy"
  if (integration.connectionStatus === "disconnected" || issues.length >= 3) {
    status = "error"
  } else if (issues.length > 0) {
    status = "warning"
  }

  return {
    status,
    connectionStatus: integration.connectionStatus,
    lastSyncAge,
    pendingRecords: integration.usageSyncStatus.pendingRecords,
    docUpToDate,
    issues,
  }
}

// ═══════════════════════════════════════════════════════════════
// AC5: 통합 테스트 자동화 (파이프라인, 시나리오, 리포트)
// ═══════════════════════════════════════════════════════════════

// ── 테스트 시나리오 타입 정의 ────────────────────────────────

export type TestType = "unit" | "integration" | "e2e" | "load" | "regression"

export type TestTrigger = "code_commit" | "dev_deploy" | "stg_deploy" | "prod_deploy" | "manual"

export type TestStepStatus = "pending" | "running" | "passed" | "failed" | "skipped"

export interface TestStep {
  order: number
  name: string
  description: string
  action: string
  expectedResult: string
  status: TestStepStatus
  actualResult: string | null
  durationMs: number | null
  error: string | null
}

export type TestScenarioStatus = "draft" | "ready" | "running" | "passed" | "failed" | "skipped"

export interface TestScenario {
  id: string
  name: string
  description: string
  category: "persona" | "algorithm" | "integration" | "performance"
  testType: TestType
  trigger: TestTrigger
  steps: TestStep[]
  status: TestScenarioStatus
  tags: string[]
  createdAt: number
  lastRunAt: number | null
}

// ── 테스트 파이프라인 타입 정의 ──────────────────────────────

export type TestPipelineStatus = "pending" | "running" | "passed" | "failed" | "cancelled"

export interface TestPipelineConfig {
  parallelExecution: boolean
  maxRetries: number
  timeoutMs: number
  stopOnFirstFailure: boolean
  notifyOnFailure: boolean
  notifyChannels: string[]
}

export interface TestPipeline {
  id: string
  name: string
  environment: DeployEnvironment
  scenarios: TestScenario[]
  config: TestPipelineConfig
  status: TestPipelineStatus
  trigger: TestTrigger
  startedAt: number | null
  completedAt: number | null
  triggeredBy: string
}

export const DEFAULT_TEST_PIPELINE_CONFIG: TestPipelineConfig = {
  parallelExecution: false,
  maxRetries: 1,
  timeoutMs: 300000, // 5분
  stopOnFirstFailure: false,
  notifyOnFailure: true,
  notifyChannels: ["slack", "email"],
}

// ── 테스트 리포트 타입 정의 ──────────────────────────────────

export interface TestCoverageItem {
  area: string
  coveredScenarios: number
  totalScenarios: number
  coveragePercent: number
}

export interface TestReportSummary {
  totalScenarios: number
  passed: number
  failed: number
  skipped: number
  passRate: number
  totalDurationMs: number
}

export interface TestFailure {
  scenarioId: string
  scenarioName: string
  failedStep: string
  error: string
  suggestion: string | null
}

export interface TestReport {
  id: string
  pipelineId: string
  pipelineName: string
  environment: DeployEnvironment
  summary: TestReportSummary
  coverage: TestCoverageItem[]
  failures: TestFailure[]
  generatedAt: number
  trigger: TestTrigger
  triggeredBy: string
}

// ── 테스트 시나리오 함수 ────────────────────────────────────

export function createTestScenario(
  name: string,
  description: string,
  category: TestScenario["category"],
  testType: TestType,
  trigger: TestTrigger,
  steps: Omit<TestStep, "order" | "status" | "actualResult" | "durationMs" | "error">[],
  tags: string[] = []
): TestScenario {
  return {
    id: `ts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    description,
    category,
    testType,
    trigger,
    steps: steps.map((s, idx) => ({
      ...s,
      order: idx + 1,
      status: "pending",
      actualResult: null,
      durationMs: null,
      error: null,
    })),
    status: "draft",
    tags,
    createdAt: Date.now(),
    lastRunAt: null,
  }
}

export function readyTestScenario(scenario: TestScenario): TestScenario {
  if (scenario.steps.length === 0) {
    throw new Error("테스트 단계가 없는 시나리오는 준비 완료로 전환할 수 없습니다")
  }
  return { ...scenario, status: "ready" }
}

export function runTestScenario(
  scenario: TestScenario,
  stepResults: Array<{
    order: number
    passed: boolean
    actualResult: string
    durationMs: number
    error?: string
  }>
): TestScenario {
  if (scenario.status !== "ready" && scenario.status !== "draft") {
    throw new Error(`현재 상태(${scenario.status})에서는 테스트를 실행할 수 없습니다`)
  }

  const resultMap = new Map(stepResults.map((r) => [r.order, r]))

  const updatedSteps = scenario.steps.map((step) => {
    const result = resultMap.get(step.order)
    if (!result) return { ...step, status: "skipped" as const }

    return {
      ...step,
      status: result.passed ? ("passed" as const) : ("failed" as const),
      actualResult: result.actualResult,
      durationMs: result.durationMs,
      error: result.error ?? null,
    }
  })

  const allPassed = updatedSteps.every((s) => s.status === "passed" || s.status === "skipped")
  const hasFailed = updatedSteps.some((s) => s.status === "failed")

  return {
    ...scenario,
    steps: updatedSteps,
    status: hasFailed ? "failed" : allPassed ? "passed" : "running",
    lastRunAt: Date.now(),
  }
}

// ── 테스트 파이프라인 함수 ───────────────────────────────────

export function createTestPipeline(
  name: string,
  environment: DeployEnvironment,
  scenarios: TestScenario[],
  trigger: TestTrigger,
  triggeredBy: string,
  config?: Partial<TestPipelineConfig>
): TestPipeline {
  return {
    id: `tp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    environment,
    scenarios: scenarios.map((s) => ({
      ...s,
      steps: s.steps.map((step) => ({
        ...step,
        status: "pending" as const,
        actualResult: null,
        durationMs: null,
        error: null,
      })),
      status: "ready" as const,
    })),
    config: { ...DEFAULT_TEST_PIPELINE_CONFIG, ...config },
    status: "pending",
    trigger,
    startedAt: null,
    completedAt: null,
    triggeredBy,
  }
}

export function startTestPipeline(pipeline: TestPipeline): TestPipeline {
  if (pipeline.status !== "pending") {
    throw new Error(
      `대기(pending) 상태의 파이프라인만 시작할 수 있습니다 (현재: ${pipeline.status})`
    )
  }
  return {
    ...pipeline,
    status: "running",
    startedAt: Date.now(),
  }
}

export function updatePipelineScenario(
  pipeline: TestPipeline,
  scenarioId: string,
  updatedScenario: TestScenario
): TestPipeline {
  if (pipeline.status !== "running") {
    throw new Error(`실행 중(running) 상태의 파이프라인만 업데이트할 수 있습니다`)
  }

  const updatedScenarios = pipeline.scenarios.map((s) =>
    s.id === scenarioId ? updatedScenario : s
  )

  // 전체 파이프라인 상태 판정
  const allDone = updatedScenarios.every(
    (s) => s.status === "passed" || s.status === "failed" || s.status === "skipped"
  )
  const hasFailed = updatedScenarios.some((s) => s.status === "failed")

  let newStatus: TestPipelineStatus = "running"
  if (allDone) {
    newStatus = hasFailed ? "failed" : "passed"
  } else if (hasFailed && pipeline.config.stopOnFirstFailure) {
    newStatus = "failed"
  }

  return {
    ...pipeline,
    scenarios: updatedScenarios,
    status: newStatus,
    completedAt: allDone || (hasFailed && pipeline.config.stopOnFirstFailure) ? Date.now() : null,
  }
}

export function cancelTestPipeline(pipeline: TestPipeline): TestPipeline {
  if (pipeline.status !== "running" && pipeline.status !== "pending") {
    throw new Error(`이미 완료된 파이프라인(${pipeline.status})은 취소할 수 없습니다`)
  }
  return {
    ...pipeline,
    status: "cancelled",
    completedAt: Date.now(),
    scenarios: pipeline.scenarios.map((s) =>
      s.status === "ready" || s.status === "draft" ? { ...s, status: "skipped" as const } : s
    ),
  }
}

// ── 테스트 리포트 생성 함수 ──────────────────────────────────

export function generateTestReport(pipeline: TestPipeline): TestReport {
  if (pipeline.status !== "passed" && pipeline.status !== "failed") {
    throw new Error("완료된 파이프라인만 리포트를 생성할 수 있습니다")
  }

  const passed = pipeline.scenarios.filter((s) => s.status === "passed").length
  const failed = pipeline.scenarios.filter((s) => s.status === "failed").length
  const skipped = pipeline.scenarios.filter((s) => s.status === "skipped").length
  const total = pipeline.scenarios.length

  const totalDurationMs =
    pipeline.completedAt !== null && pipeline.startedAt !== null
      ? pipeline.completedAt - pipeline.startedAt
      : 0

  const passRate = total > 0 ? Math.round((passed / (total - skipped)) * 100 * 100) / 100 : 0

  // 커버리지 계산
  const categories = ["persona", "algorithm", "integration", "performance"] as const
  const coverage: TestCoverageItem[] = categories
    .map((cat) => {
      const catScenarios = pipeline.scenarios.filter((s) => s.category === cat)
      const coveredCount = catScenarios.filter((s) => s.status === "passed").length
      return {
        area: cat,
        coveredScenarios: coveredCount,
        totalScenarios: catScenarios.length,
        coveragePercent:
          catScenarios.length > 0
            ? Math.round((coveredCount / catScenarios.length) * 10000) / 100
            : 0,
      }
    })
    .filter((c) => c.totalScenarios > 0)

  // 실패 상세
  const failures: TestFailure[] = pipeline.scenarios
    .filter((s) => s.status === "failed")
    .map((s) => {
      const failedStep = s.steps.find((step) => step.status === "failed")
      return {
        scenarioId: s.id,
        scenarioName: s.name,
        failedStep: failedStep?.name ?? "알 수 없음",
        error: failedStep?.error ?? "상세 오류 없음",
        suggestion: generateFailureSuggestion(s),
      }
    })

  return {
    id: `tr_${Date.now()}`,
    pipelineId: pipeline.id,
    pipelineName: pipeline.name,
    environment: pipeline.environment,
    summary: {
      totalScenarios: total,
      passed,
      failed,
      skipped,
      passRate,
      totalDurationMs,
    },
    coverage,
    failures,
    generatedAt: Date.now(),
    trigger: pipeline.trigger,
    triggeredBy: pipeline.triggeredBy,
  }
}

export function formatTestReportMarkdown(report: TestReport): string {
  const lines: string[] = []

  lines.push(`# 통합 테스트 리포트`)
  lines.push("")
  lines.push(`- **파이프라인:** ${report.pipelineName}`)
  lines.push(`- **환경:** ${report.environment}`)
  lines.push(`- **트리거:** ${report.trigger}`)
  lines.push(`- **실행자:** ${report.triggeredBy}`)
  lines.push(`- **생성 시간:** ${new Date(report.generatedAt).toISOString()}`)
  lines.push("")

  lines.push(`## 요약`)
  lines.push("")
  lines.push(`| 항목 | 값 |`)
  lines.push(`| --- | --- |`)
  lines.push(`| 전체 시나리오 | ${report.summary.totalScenarios} |`)
  lines.push(`| 통과 | ${report.summary.passed} |`)
  lines.push(`| 실패 | ${report.summary.failed} |`)
  lines.push(`| 건너뜀 | ${report.summary.skipped} |`)
  lines.push(`| 통과율 | ${report.summary.passRate}% |`)
  lines.push(`| 총 소요시간 | ${Math.round(report.summary.totalDurationMs / 1000)}초 |`)
  lines.push("")

  if (report.coverage.length > 0) {
    lines.push(`## 커버리지`)
    lines.push("")
    lines.push(`| 영역 | 통과/전체 | 커버리지 |`)
    lines.push(`| --- | --- | --- |`)
    for (const c of report.coverage) {
      lines.push(
        `| ${c.area} | ${c.coveredScenarios}/${c.totalScenarios} | ${c.coveragePercent}% |`
      )
    }
    lines.push("")
  }

  if (report.failures.length > 0) {
    lines.push(`## 실패 상세`)
    lines.push("")
    for (const f of report.failures) {
      lines.push(`### ${f.scenarioName}`)
      lines.push(`- **실패 단계:** ${f.failedStep}`)
      lines.push(`- **오류:** ${f.error}`)
      if (f.suggestion) {
        lines.push(`- **제안:** ${f.suggestion}`)
      }
      lines.push("")
    }
  }

  return lines.join("\n")
}

// ── 기본 테스트 시나리오 팩토리 ──────────────────────────────

export function createPersonaTestScenarios(): TestScenario[] {
  return [
    createTestScenario(
      "페르소나 생성 → API 조회",
      "신규 페르소나 생성 후 API에서 조회 가능한지 확인",
      "persona",
      "integration",
      "dev_deploy",
      [
        {
          name: "페르소나 생성",
          description: "POST /api/personas로 새 페르소나 생성",
          action: "POST /api/personas",
          expectedResult: "201 Created",
        },
        {
          name: "API 조회",
          description: "GET /api/v3/personas에서 생성된 페르소나 확인",
          action: "GET /api/v3/personas",
          expectedResult: "생성된 페르소나가 목록에 포함",
        },
      ],
      ["persona", "crud"]
    ),
    createTestScenario(
      "페르소나 수정 → 매칭 반영",
      "페르소나 수정 후 변경 사항이 매칭에 반영되는지 확인",
      "persona",
      "integration",
      "dev_deploy",
      [
        {
          name: "페르소나 벡터 수정",
          description: "PUT /api/personas/:id로 벡터 수정",
          action: "PUT /api/personas/:id",
          expectedResult: "200 OK",
        },
        {
          name: "매칭 실행",
          description: "수정된 벡터로 매칭 실행",
          action: "POST /api/v3/matching",
          expectedResult: "변경된 벡터가 매칭 결과에 반영",
        },
      ],
      ["persona", "matching"]
    ),
    createTestScenario(
      "페르소나 비활성화 → 매칭 제외",
      "비활성화된 페르소나가 매칭에서 제외되는지 확인",
      "persona",
      "integration",
      "dev_deploy",
      [
        {
          name: "페르소나 비활성화",
          description: "페르소나 상태를 DEPRECATED로 변경",
          action: "POST /api/personas/:id/lifecycle",
          expectedResult: "상태 변경 성공",
        },
        {
          name: "매칭 결과 확인",
          description: "매칭 실행 후 비활성화된 페르소나 제외 확인",
          action: "POST /api/v3/matching",
          expectedResult: "비활성화된 페르소나 미포함",
        },
      ],
      ["persona", "lifecycle"]
    ),
  ]
}

export function createAlgorithmTestScenarios(): TestScenario[] {
  return [
    createTestScenario(
      "알고리즘 배포 → 매칭 결과 검증",
      "새 알고리즘 배포 후 매칭 결과가 예상과 일치하는지 확인",
      "algorithm",
      "integration",
      "stg_deploy",
      [
        {
          name: "알고리즘 배포",
          description: "새 알고리즘 버전을 STG에 배포",
          action: "deploy algorithm to staging",
          expectedResult: "배포 성공",
        },
        {
          name: "매칭 실행",
          description: "테스트 유저로 매칭 실행",
          action: "POST /api/v3/matching",
          expectedResult: "매칭 결과가 예상 범위 내",
        },
        {
          name: "성능 비교",
          description: "이전 버전 대비 성능 비교",
          action: "compare metrics",
          expectedResult: "에러율 증가 없음, 응답시간 SLA 준수",
        },
      ],
      ["algorithm", "deploy"]
    ),
    createTestScenario(
      "알고리즘 롤백 → 이전 버전 복귀",
      "롤백 후 이전 알고리즘으로 정상 복귀하는지 확인",
      "algorithm",
      "regression",
      "stg_deploy",
      [
        {
          name: "롤백 실행",
          description: "이전 버전으로 롤백",
          action: "rollback algorithm",
          expectedResult: "롤백 성공",
        },
        {
          name: "결과 검증",
          description: "이전 버전의 매칭 결과와 동일한지 확인",
          action: "POST /api/v3/matching",
          expectedResult: "이전 버전 결과와 일치",
        },
      ],
      ["algorithm", "rollback"]
    ),
  ]
}

export function createIntegrationTestScenarios(): TestScenario[] {
  return [
    createTestScenario(
      "이벤트 발행 → 구독자 수신",
      "이벤트 발행 후 구독자가 정상 수신하는지 확인",
      "integration",
      "integration",
      "dev_deploy",
      [
        {
          name: "이벤트 발행",
          description: "persona.created 이벤트 발행",
          action: "publish persona.created event",
          expectedResult: "이벤트 발행 성공",
        },
        {
          name: "구독자 확인",
          description: "API Engine, Developer Console에서 이벤트 수신 확인",
          action: "check subscribers",
          expectedResult: "모든 구독자가 5초 이내 수신",
        },
      ],
      ["event_bus", "sync"]
    ),
    createTestScenario(
      "API 문서 자동 업데이트",
      "페르소나 변경 시 개발자 콘솔의 API 문서가 자동 업데이트되는지 확인",
      "integration",
      "e2e",
      "stg_deploy",
      [
        {
          name: "페르소나 활성화",
          description: "새 페르소나를 ACTIVE로 전환",
          action: "activate persona",
          expectedResult: "상태 전환 성공",
        },
        {
          name: "문서 업데이트 확인",
          description: "개발자 콘솔에서 API 문서 변경 확인",
          action: "check API docs",
          expectedResult: "새 페르소나가 API 문서에 반영",
        },
        {
          name: "Changelog 확인",
          description: "Changelog에 변경 기록 추가 확인",
          action: "check changelog",
          expectedResult: "Changelog에 새 항목 추가",
        },
      ],
      ["developer_console", "docs"]
    ),
  ]
}

// ═══════════════════════════════════════════════════════════════
// 내부 유틸리티
// ═══════════════════════════════════════════════════════════════

function getPayloadName(payload: Record<string, unknown>): string {
  const name = payload["name"] as string | undefined
  return name ? `: "${name}"` : ""
}

function getPayloadVersion(payload: Record<string, unknown>): string {
  const version = payload["version"] as string | undefined
  return version ? ` (${version})` : ""
}

function groupChangesByCategory(changes: ChangeItem[]): Record<string, ChangeItem[]> {
  const grouped: Record<string, ChangeItem[]> = {}
  for (const change of changes) {
    if (!grouped[change.category]) {
      grouped[change.category] = []
    }
    grouped[change.category].push(change)
  }
  return grouped
}

function capitalizeCategory(category: string): string {
  const labels: Record<string, string> = {
    added: "Added",
    changed: "Changed",
    fixed: "Fixed",
    deprecated: "Deprecated",
    removed: "Removed",
    security: "Security",
  }
  return labels[category] ?? category
}

function generateFailureSuggestion(scenario: TestScenario): string | null {
  switch (scenario.category) {
    case "persona":
      return "페르소나 상태 및 벡터 데이터를 확인하세요. 라이프사이클 전이 규칙을 점검하세요."
    case "algorithm":
      return "알고리즘 설정 및 가중치 변경 사항을 검토하세요. 이전 버전과의 호환성을 확인하세요."
    case "integration":
      return "이벤트 버스 연결 상태와 구독자 설정을 확인하세요. 동기화 지연을 점검하세요."
    case "performance":
      return "부하 테스트 환경 설정과 리소스 사용률을 확인하세요."
  }
}
