// ═══════════════════════════════════════════════════════════════
// Deployment Pipeline — 환경 구성, 워크플로우, Canary Release
// + 통합 테스트 자동화 (파이프라인, 시나리오, 리포트)
// ═══════════════════════════════════════════════════════════════

import type { DeployEnvironment } from "./types"
export type { DeployEnvironment } from "./types"

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
