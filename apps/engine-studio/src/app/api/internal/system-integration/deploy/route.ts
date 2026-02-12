import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createDeployWorkflow,
  advanceDeployStage,
  createCanaryRelease,
  updateCanaryMetrics,
  advanceCanaryPhase,
  evaluateCanaryRollback,
  ENVIRONMENT_CONFIGS,
  DEFAULT_CANARY_ROLLBACK_TRIGGERS,
} from "@/lib/system-integration"
import type {
  DeployWorkflow,
  DeployEnvironment,
  DeployTarget,
  DeployStage,
  CanaryRelease,
  CanaryMetrics,
} from "@/lib/system-integration"

// ── In-memory Store ────────────────────────────────────────────
interface DeployStore {
  workflows: DeployWorkflow[]
  canaries: Map<string, CanaryRelease>
}

const store: DeployStore = {
  workflows: [],
  canaries: new Map(),
}

// ── Response Types ─────────────────────────────────────────────
interface DeployDataResponse {
  workflows: DeployWorkflow[]
  environments: typeof ENVIRONMENT_CONFIGS
  canary: CanaryRelease | null
  rollbackTriggers: typeof DEFAULT_CANARY_ROLLBACK_TRIGGERS
}

// GET — 배포 데이터 반환
export async function GET() {
  try {
    // 가장 최근 워크플로우에 연결된 canary 찾기
    const latestWorkflow = store.workflows[store.workflows.length - 1] ?? null
    const canary = latestWorkflow ? (store.canaries.get(latestWorkflow.id) ?? null) : null

    return NextResponse.json<ApiResponse<DeployDataResponse>>({
      success: true,
      data: {
        workflows: store.workflows,
        environments: ENVIRONMENT_CONFIGS,
        canary,
        rollbackTriggers: DEFAULT_CANARY_ROLLBACK_TRIGGERS,
      },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "배포 데이터 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── Action Types ───────────────────────────────────────────────

type DeployAction =
  | {
      action: "create_workflow"
      target: DeployTarget
      targetVersion: string
      environment: DeployEnvironment
      createdBy: string
    }
  | {
      action: "advance_stage"
      workflowId: string
      stage: DeployStage
      success: boolean
      logs?: string[]
      error?: string | null
    }
  | { action: "create_canary"; workflowId: string; durationMinutes?: number }
  | { action: "advance_canary"; workflowId: string }
  | { action: "update_canary_metrics"; workflowId: string; metrics: CanaryMetrics }
  | { action: "simulate_rollback_trigger"; workflowId: string }

// POST — 배포 액션 처리
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeployAction

    switch (body.action) {
      case "create_workflow": {
        if (!body.target || !body.targetVersion || !body.environment || !body.createdBy) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "INVALID_REQUEST", message: "필수 필드가 누락되었습니다" },
            },
            { status: 400 }
          )
        }
        const workflow = createDeployWorkflow(
          body.target,
          body.targetVersion,
          body.environment,
          body.createdBy
        )
        store.workflows.push(workflow)
        return NextResponse.json<ApiResponse<DeployWorkflow>>({
          success: true,
          data: workflow,
        })
      }

      case "advance_stage": {
        const wfIdx = store.workflows.findIndex((w) => w.id === body.workflowId)
        if (wfIdx === -1) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "NOT_FOUND", message: "워크플로우를 찾을 수 없습니다" },
            },
            { status: 404 }
          )
        }
        const updated = advanceDeployStage(
          store.workflows[wfIdx],
          body.stage,
          body.success,
          body.logs ?? [],
          body.error ?? null
        )
        store.workflows[wfIdx] = updated
        return NextResponse.json<ApiResponse<DeployWorkflow>>({
          success: true,
          data: updated,
        })
      }

      case "create_canary": {
        const wf = store.workflows.find((w) => w.id === body.workflowId)
        if (!wf) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "NOT_FOUND", message: "워크플로우를 찾을 수 없습니다" },
            },
            { status: 404 }
          )
        }
        const canary = createCanaryRelease(wf.id, body.durationMinutes ?? 30)
        store.canaries.set(wf.id, canary)
        return NextResponse.json<ApiResponse<CanaryRelease>>({
          success: true,
          data: canary,
        })
      }

      case "advance_canary": {
        const existingCanary = store.canaries.get(body.workflowId)
        if (!existingCanary) {
          return NextResponse.json<ApiResponse<never>>(
            { success: false, error: { code: "NOT_FOUND", message: "카나리를 찾을 수 없습니다" } },
            { status: 404 }
          )
        }
        // Update with good metrics first, then advance
        const withMetrics = updateCanaryMetrics(existingCanary, {
          errorRatePercent: 1.2,
          avgResponseTimeMs: 85,
          matchingSatisfactionScore: 72,
        })
        const advanced = advanceCanaryPhase(withMetrics)
        store.canaries.set(body.workflowId, advanced)
        return NextResponse.json<ApiResponse<CanaryRelease>>({
          success: true,
          data: advanced,
        })
      }

      case "update_canary_metrics": {
        const c = store.canaries.get(body.workflowId)
        if (!c) {
          return NextResponse.json<ApiResponse<never>>(
            { success: false, error: { code: "NOT_FOUND", message: "카나리를 찾을 수 없습니다" } },
            { status: 404 }
          )
        }
        const withMetrics = updateCanaryMetrics(c, body.metrics)
        store.canaries.set(body.workflowId, withMetrics)
        return NextResponse.json<ApiResponse<CanaryRelease>>({
          success: true,
          data: withMetrics,
        })
      }

      case "simulate_rollback_trigger": {
        const canaryForSim = store.canaries.get(body.workflowId)
        if (!canaryForSim) {
          return NextResponse.json<ApiResponse<never>>(
            { success: false, error: { code: "NOT_FOUND", message: "카나리를 찾을 수 없습니다" } },
            { status: 404 }
          )
        }
        const withBadMetrics = updateCanaryMetrics(canaryForSim, {
          errorRatePercent: 8.5,
          avgResponseTimeMs: 350,
          matchingSatisfactionScore: -15,
        })
        store.canaries.set(body.workflowId, withBadMetrics)
        const evaluation = evaluateCanaryRollback(withBadMetrics)
        return NextResponse.json<
          ApiResponse<{
            canary: CanaryRelease
            shouldRollback: boolean
            triggeredReasons: string[]
          }>
        >({
          success: true,
          data: {
            canary: withBadMetrics,
            shouldRollback: evaluation.shouldRollback,
            triggeredReasons: evaluation.triggeredReasons,
          },
        })
      }

      default:
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_ACTION", message: "지원하지 않는 액션입니다" },
          },
          { status: 400 }
        )
    }
  } catch (e) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: e instanceof Error ? e.message : "배포 액션 처리 실패",
        },
      },
      { status: 500 }
    )
  }
}
