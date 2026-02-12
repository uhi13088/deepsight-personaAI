"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

// ── 타입 ──────────────────────────────────────────────────────

interface RollbackTriggerDefault {
  metric: "error_rate" | "response_time" | "satisfaction"
  threshold: number
}

interface DeployData {
  workflows: DeployWorkflow[]
  environments: EnvironmentConfig[]
  canary: CanaryRelease | null
  rollbackTriggers: RollbackTriggerDefault[]
}

// ── 페이지 ────────────────────────────────────────────────────

export default function DeploymentPage() {
  const [data, setData] = useState<DeployData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 선택된 환경
  const [selectedEnv, setSelectedEnv] = useState<EnvironmentConfig["environment"]>("development")

  // Canary 에러 (UI 전용)
  const [canaryError, setCanaryError] = useState<string | null>(null)

  // 현재 워크플로우의 진행 중인 stage index 추적
  const [currentStageIdx, setCurrentStageIdx] = useState(0)

  const STAGE_ORDER: DeployStage[] = useMemo(() => ["build", "test", "deploy", "verify"], [])

  // ── 데이터 로드 ─────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/system-integration/deploy")
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError(json.error?.message ?? "데이터 로드 실패")
      }
    } catch {
      setError("서버 연결 실패")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── 파생 상태 ───────────────────────────────────────────────

  const workflow = data?.workflows[data.workflows.length - 1] ?? null
  const canary = data?.canary ?? null
  const environments = data?.environments ?? []
  const rollbackTriggers = data?.rollbackTriggers ?? []

  // ── 워크플로우 생성 ─────────────────────────────────────────

  const handleCreateWorkflow = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/system-integration/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_workflow",
          target: "algorithm",
          targetVersion: "v1.2.0",
          environment: selectedEnv,
          createdBy: "admin@deepsight.ai",
        }),
      })
      const json = await res.json()
      if (json.success) {
        setCurrentStageIdx(0)
        setCanaryError(null)
        await fetchData()
      }
    } catch {
      // handle error silently
    }
  }, [selectedEnv, fetchData])

  // ── 단계 진행 (성공) ─────────────────────────────────────────

  const handleAdvanceStage = useCallback(async () => {
    if (!workflow || currentStageIdx >= STAGE_ORDER.length) return
    const stage = STAGE_ORDER[currentStageIdx]
    try {
      const res = await fetch("/api/internal/system-integration/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "advance_stage",
          workflowId: workflow.id,
          stage,
          success: true,
          logs: [`${stage} completed successfully`],
        }),
      })
      const json = await res.json()
      if (json.success) {
        setCurrentStageIdx((prev) => prev + 1)
        await fetchData()
      }
    } catch {
      // handle error silently
    }
  }, [workflow, currentStageIdx, STAGE_ORDER, fetchData])

  // ── 단계 실패 시뮬레이션 ──────────────────────────────────────

  const handleFailStage = useCallback(async () => {
    if (!workflow || currentStageIdx >= STAGE_ORDER.length) return
    const stage = STAGE_ORDER[currentStageIdx]
    try {
      const res = await fetch("/api/internal/system-integration/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "advance_stage",
          workflowId: workflow.id,
          stage,
          success: false,
          logs: [],
          error: `${stage} failed: timeout`,
        }),
      })
      const json = await res.json()
      if (json.success) {
        await fetchData()
      }
    } catch {
      // handle error silently
    }
  }, [workflow, currentStageIdx, STAGE_ORDER, fetchData])

  // ── Canary 생성 ─────────────────────────────────────────────

  const handleCreateCanary = useCallback(async () => {
    if (!workflow) return
    try {
      const res = await fetch("/api/internal/system-integration/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_canary",
          workflowId: workflow.id,
          durationMinutes: 30,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setCanaryError(null)
        await fetchData()
      }
    } catch {
      // handle error silently
    }
  }, [workflow, fetchData])

  // ── Canary 메트릭 업데이트 + 단계 진행 ───────────────────────

  const handleAdvanceCanary = useCallback(async () => {
    if (!workflow) return
    try {
      const res = await fetch("/api/internal/system-integration/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "advance_canary",
          workflowId: workflow.id,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setCanaryError(null)
        await fetchData()
      } else {
        setCanaryError(json.error?.message ?? "진행 실패")
      }
    } catch {
      setCanaryError("서버 연결 실패")
    }
  }, [workflow, fetchData])

  // ── Canary 롤백 트리거 시뮬레이션 ─────────────────────────────

  const handleSimulateRollbackTrigger = useCallback(async () => {
    if (!workflow) return
    try {
      const res = await fetch("/api/internal/system-integration/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "simulate_rollback_trigger",
          workflowId: workflow.id,
        }),
      })
      const json = await res.json()
      if (json.success) {
        const result = json.data as {
          canary: CanaryRelease
          shouldRollback: boolean
          triggeredReasons: string[]
        }
        if (result.shouldRollback) {
          setCanaryError(`Rollback triggered: ${result.triggeredReasons.join("; ")}`)
        }
        await fetchData()
      }
    } catch {
      setCanaryError("시뮬레이션 실패")
    }
  }, [workflow, fetchData])

  // ── 로딩/에러 UI ──────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Header title="Deployment Pipeline" description="API 배포 워크플로우 및 Canary Release" />
        <div className="flex items-center justify-center py-20">
          <div className="text-muted-foreground text-sm">로딩 중...</div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header title="Deployment Pipeline" description="API 배포 워크플로우 및 Canary Release" />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Deployment Pipeline" description="API 배포 워크플로우 및 Canary Release" />

      <div className="space-y-6 p-6">
        {/* ── 환경 카드 3종 ────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {environments.map((env) => (
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
