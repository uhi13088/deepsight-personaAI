"use client"

import { useState, useCallback, useMemo } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ENVIRONMENT_CONFIGS,
  createDeployWorkflow,
  advanceDeployStage,
  createCanaryRelease,
  advanceCanaryPhase,
  updateCanaryMetrics,
  evaluateCanaryRollback,
  DEFAULT_CANARY_ROLLBACK_TRIGGERS,
} from "@/lib/system-integration"
import type {
  DeployWorkflow,
  DeployStage,
  DeployStageStatus,
  CanaryRelease,
  CanaryPhase,
  EnvironmentConfig,
} from "@/lib/system-integration"
import {
  Rocket,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Globe,
  Shield,
  Server,
} from "lucide-react"

// ── 상수 ──────────────────────────────────────────────────────

const STAGE_LABELS: Record<DeployStage, string> = {
  build: "Build",
  test: "Test",
  deploy: "Deploy",
  verify: "Verify",
}

const STAGE_STATUS_ICON: Record<DeployStageStatus, React.ReactNode> = {
  pending: <Clock className="text-muted-foreground h-4 w-4" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-blue-400" />,
  passed: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
  skipped: <Clock className="text-muted-foreground h-4 w-4 opacity-50" />,
}

const CANARY_PHASE_LABELS: Record<CanaryPhase, string> = {
  "10_percent": "10%",
  "50_percent": "50%",
  "100_percent": "100%",
  completed: "Completed",
  rolled_back: "Rolled Back",
}

const ENV_ICONS: Record<string, React.ReactNode> = {
  development: <Server className="h-5 w-5 text-blue-400" />,
  staging: <Shield className="h-5 w-5 text-amber-400" />,
  production: <Globe className="h-5 w-5 text-emerald-400" />,
}

const ENV_STATUS_COLORS: Record<string, string> = {
  development: "border-blue-500/30 bg-blue-500/5",
  staging: "border-amber-500/30 bg-amber-500/5",
  production: "border-emerald-500/30 bg-emerald-500/5",
}

// ── 페이지 ────────────────────────────────────────────────────

export default function DeploymentPage() {
  // 배포 워크플로우 상태
  const [workflow, setWorkflow] = useState<DeployWorkflow | null>(null)
  const [currentStageIdx, setCurrentStageIdx] = useState(0)

  // Canary Release 상태
  const [canary, setCanary] = useState<CanaryRelease | null>(null)
  const [canaryError, setCanaryError] = useState<string | null>(null)

  // 선택된 환경
  const [selectedEnv, setSelectedEnv] = useState<EnvironmentConfig["environment"]>("development")

  const STAGE_ORDER: DeployStage[] = useMemo(() => ["build", "test", "deploy", "verify"], [])

  // 워크플로우 생성
  const handleCreateWorkflow = useCallback(() => {
    const wf = createDeployWorkflow("algorithm", "v1.2.0", selectedEnv, "admin@deepsight.ai")
    setWorkflow(wf)
    setCurrentStageIdx(0)
    setCanary(null)
    setCanaryError(null)
  }, [selectedEnv])

  // 단계 진행 (성공)
  const handleAdvanceStage = useCallback(() => {
    if (!workflow || currentStageIdx >= STAGE_ORDER.length) return
    const stage = STAGE_ORDER[currentStageIdx]
    try {
      const updated = advanceDeployStage(workflow, stage, true, [`${stage} completed successfully`])
      setWorkflow(updated)
      setCurrentStageIdx((prev) => prev + 1)
    } catch {
      // 승인 필요 등
    }
  }, [workflow, currentStageIdx, STAGE_ORDER])

  // 단계 실패 시뮬레이션
  const handleFailStage = useCallback(() => {
    if (!workflow || currentStageIdx >= STAGE_ORDER.length) return
    const stage = STAGE_ORDER[currentStageIdx]
    try {
      const updated = advanceDeployStage(workflow, stage, false, [], `${stage} failed: timeout`)
      setWorkflow(updated)
    } catch {
      // 이전 단계 미완료 등
    }
  }, [workflow, currentStageIdx, STAGE_ORDER])

  // Canary 생성
  const handleCreateCanary = useCallback(() => {
    if (!workflow) return
    const release = createCanaryRelease(workflow.id, 30)
    setCanary(release)
    setCanaryError(null)
  }, [workflow])

  // Canary 메트릭 업데이트 + 단계 진행
  const handleAdvanceCanary = useCallback(() => {
    if (!canary) return
    try {
      // 정상 메트릭으로 업데이트
      const withMetrics = updateCanaryMetrics(canary, {
        errorRatePercent: 1.2,
        avgResponseTimeMs: 85,
        matchingSatisfactionScore: 72,
      })
      const advanced = advanceCanaryPhase(withMetrics)
      setCanary(advanced)
      setCanaryError(null)
    } catch (e) {
      setCanaryError(e instanceof Error ? e.message : "진행 실패")
    }
  }, [canary])

  // Canary 롤백 트리거 시뮬레이션
  const handleSimulateRollbackTrigger = useCallback(() => {
    if (!canary) return
    try {
      const withBadMetrics = updateCanaryMetrics(canary, {
        errorRatePercent: 8.5,
        avgResponseTimeMs: 350,
        matchingSatisfactionScore: -15,
      })
      setCanary(withBadMetrics)
      const evaluation = evaluateCanaryRollback(withBadMetrics)
      if (evaluation.shouldRollback) {
        setCanaryError(`Rollback triggered: ${evaluation.triggeredReasons.join("; ")}`)
      }
    } catch (e) {
      setCanaryError(e instanceof Error ? e.message : "시뮬레이션 실패")
    }
  }, [canary])

  // 롤백 트리거 기본값
  const rollbackTriggers = useMemo(() => DEFAULT_CANARY_ROLLBACK_TRIGGERS, [])

  return (
    <>
      <Header title="Deployment Pipeline" description="API 배포 워크플로우 및 Canary Release" />

      <div className="space-y-6 p-6">
        {/* ── 환경 카드 3종 ────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {ENVIRONMENT_CONFIGS.map((env) => (
            <button
              key={env.environment}
              onClick={() => setSelectedEnv(env.environment)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                ENV_STATUS_COLORS[env.environment]
              } ${selectedEnv === env.environment ? "ring-primary ring-2" : ""}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ENV_ICONS[env.environment]}
                  <span className="text-sm font-medium">{env.label}</span>
                </div>
                <Badge
                  variant={
                    env.environment === "production"
                      ? "destructive"
                      : env.environment === "staging"
                        ? "warning"
                        : "info"
                  }
                >
                  {env.accessLevel}
                </Badge>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">URL</span>
                  <span className="font-mono">{env.url}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span>{env.dataType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approval</span>
                  <span>{env.requiresApproval ? "Required" : "Not required"}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* ── 배포 워크플로우 ─────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Deploy Workflow</h3>
            <Button size="sm" onClick={handleCreateWorkflow}>
              <Rocket className="mr-1.5 h-3.5 w-3.5" />
              New Workflow
            </Button>
          </div>

          {workflow ? (
            <div className="space-y-4">
              {/* 워크플로우 정보 */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <Badge variant="outline">{workflow.id}</Badge>
                <Badge
                  variant={
                    workflow.status === "succeeded"
                      ? "success"
                      : workflow.status === "failed"
                        ? "destructive"
                        : workflow.status === "in_progress"
                          ? "info"
                          : "muted"
                  }
                >
                  {workflow.status}
                </Badge>
                <span className="text-muted-foreground">
                  {workflow.target} {workflow.targetVersion} → {workflow.environment}
                </span>
              </div>

              {/* 타임라인 */}
              <div className="flex items-center gap-2">
                {workflow.stages.map((stage, idx) => (
                  <div key={stage.stage} className="flex items-center">
                    <div
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                        stage.status === "passed"
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : stage.status === "failed"
                            ? "border-red-500/30 bg-red-500/10"
                            : stage.status === "running"
                              ? "border-blue-500/30 bg-blue-500/10"
                              : "border-border"
                      }`}
                    >
                      {STAGE_STATUS_ICON[stage.status]}
                      <span className="text-xs font-medium">{STAGE_LABELS[stage.stage]}</span>
                    </div>
                    {idx < workflow.stages.length - 1 && (
                      <ChevronRight className="text-muted-foreground mx-1 h-4 w-4" />
                    )}
                  </div>
                ))}
              </div>

              {/* 로그 */}
              {workflow.stages.some((s) => s.logs.length > 0) && (
                <div className="rounded bg-black/20 p-3 font-mono text-xs">
                  {workflow.stages
                    .flatMap((s) => s.logs.map((log) => `[${s.stage}] ${log}`))
                    .map((line, i) => (
                      <div key={i} className="text-muted-foreground">
                        {line}
                      </div>
                    ))}
                  {workflow.stages
                    .filter((s) => s.error)
                    .map((s) => (
                      <div key={s.stage} className="text-red-400">
                        [ERROR] {s.stage}: {s.error}
                      </div>
                    ))}
                </div>
              )}

              {/* 컨트롤 */}
              {workflow.status !== "succeeded" && workflow.status !== "failed" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAdvanceStage}
                    disabled={currentStageIdx >= STAGE_ORDER.length}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Pass{" "}
                    {currentStageIdx < STAGE_ORDER.length
                      ? STAGE_LABELS[STAGE_ORDER[currentStageIdx]]
                      : ""}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleFailStage}
                    disabled={currentStageIdx >= STAGE_ORDER.length}
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Fail{" "}
                    {currentStageIdx < STAGE_ORDER.length
                      ? STAGE_LABELS[STAGE_ORDER[currentStageIdx]]
                      : ""}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Rocket className="text-muted-foreground mb-3 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                환경을 선택하고 워크플로우를 생성하세요
              </p>
            </div>
          )}
        </div>

        {/* ── Canary Release ──────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Canary Release</h3>
            <Button size="sm" variant="outline" onClick={handleCreateCanary} disabled={!workflow}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Start Canary
            </Button>
          </div>

          {canary ? (
            <div className="space-y-4">
              {/* Phase 진행 게이지 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Phase</span>
                  <Badge
                    variant={
                      canary.phase === "completed"
                        ? "success"
                        : canary.phase === "rolled_back"
                          ? "destructive"
                          : "info"
                    }
                  >
                    {CANARY_PHASE_LABELS[canary.phase]}
                  </Badge>
                </div>

                {/* 진행 바 */}
                <div className="flex gap-1">
                  {(["10_percent", "50_percent", "100_percent"] as const).map((phase) => {
                    const phaseOrder = ["10_percent", "50_percent", "100_percent", "completed"]
                    const currentIdx = phaseOrder.indexOf(canary.phase)
                    const phaseIdx = phaseOrder.indexOf(phase)
                    const isActive = phaseIdx <= currentIdx
                    return (
                      <div
                        key={phase}
                        className={`h-3 flex-1 rounded-full transition-colors ${
                          isActive ? "bg-emerald-500/60" : "bg-muted"
                        }`}
                      />
                    )
                  })}
                </div>

                <div className="text-muted-foreground flex justify-between text-[10px]">
                  <span>10%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* 현재 메트릭 */}
              {canary.currentMetrics && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                    <p className="text-muted-foreground text-[10px]">Error Rate</p>
                    <p className="text-sm font-bold text-blue-400">
                      {canary.currentMetrics.errorRatePercent.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-500/10 p-3 text-center">
                    <p className="text-muted-foreground text-[10px]">Avg Response</p>
                    <p className="text-sm font-bold text-purple-400">
                      {canary.currentMetrics.avgResponseTimeMs}ms
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                    <p className="text-muted-foreground text-[10px]">Satisfaction</p>
                    <p className="text-sm font-bold text-amber-400">
                      {canary.currentMetrics.matchingSatisfactionScore}
                    </p>
                  </div>
                </div>
              )}

              {/* 에러 표시 */}
              {canaryError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-xs text-red-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{canaryError}</span>
                </div>
              )}

              {/* 컨트롤 */}
              {canary.phase !== "completed" && canary.phase !== "rolled_back" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAdvanceCanary}>
                    <ChevronRight className="mr-1.5 h-3.5 w-3.5" />
                    Advance Phase
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleSimulateRollbackTrigger}>
                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                    Simulate Bad Metrics
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <RotateCcw className="text-muted-foreground mb-3 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                워크플로우를 생성한 후 Canary Release를 시작하세요
              </p>
            </div>
          )}
        </div>

        {/* ── 롤백 트리거 설정 ────────────────────────── */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">Rollback Trigger Defaults</h3>
          <div className="space-y-2">
            {rollbackTriggers.map((trigger) => (
              <div
                key={trigger.metric}
                className="flex items-center justify-between rounded-lg border px-4 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-medium">
                    {trigger.metric === "error_rate"
                      ? "Error Rate"
                      : trigger.metric === "response_time"
                        ? "Response Time"
                        : "Satisfaction Score"}
                  </span>
                </div>
                <div className="text-muted-foreground text-xs">
                  Threshold:{" "}
                  <span className="text-foreground font-mono font-medium">
                    {trigger.metric === "error_rate"
                      ? `${trigger.threshold}%`
                      : trigger.metric === "response_time"
                        ? `${trigger.threshold}ms`
                        : trigger.threshold}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
