import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
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

// ── Prisma Helpers ────────────────────────────────────────────

const DEPLOY_CATEGORY = "DEPLOY_PIPELINE"

async function loadWorkflows(): Promise<DeployWorkflow[]> {
  const row = await prisma.systemConfig.findUnique({
    where: { category_key: { category: DEPLOY_CATEGORY, key: "workflows" } },
  })
  if (!row) return []
  return row.value as unknown as DeployWorkflow[]
}

async function saveWorkflows(workflows: DeployWorkflow[]): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { category_key: { category: DEPLOY_CATEGORY, key: "workflows" } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: { value: workflows as any },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: { category: DEPLOY_CATEGORY, key: "workflows", value: workflows as any },
  })
}

async function loadCanaries(): Promise<Record<string, CanaryRelease>> {
  const row = await prisma.systemConfig.findUnique({
    where: { category_key: { category: DEPLOY_CATEGORY, key: "canaries" } },
  })
  if (!row) return {}
  return row.value as unknown as Record<string, CanaryRelease>
}

async function saveCanaries(canaries: Record<string, CanaryRelease>): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { category_key: { category: DEPLOY_CATEGORY, key: "canaries" } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: { value: canaries as any },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: { category: DEPLOY_CATEGORY, key: "canaries", value: canaries as any },
  })
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
  const { response } = await requireAuth()
  if (response) return response

  try {
    const workflows = await loadWorkflows()
    const canaries = await loadCanaries()

    // 가장 최근 워크플로우에 연결된 canary 찾기
    const latestWorkflow = workflows[workflows.length - 1] ?? null
    const canary = latestWorkflow ? (canaries[latestWorkflow.id] ?? null) : null

    return NextResponse.json<ApiResponse<DeployDataResponse>>({
      success: true,
      data: {
        workflows,
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
  const { response } = await requireAuth()
  if (response) return response

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
        const workflows = await loadWorkflows()
        workflows.push(workflow)
        await saveWorkflows(workflows)
        return NextResponse.json<ApiResponse<DeployWorkflow>>({
          success: true,
          data: workflow,
        })
      }

      case "advance_stage": {
        const workflows = await loadWorkflows()
        const wfIdx = workflows.findIndex((w) => w.id === body.workflowId)
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
          workflows[wfIdx],
          body.stage,
          body.success,
          body.logs ?? [],
          body.error ?? null
        )
        workflows[wfIdx] = updated
        await saveWorkflows(workflows)
        return NextResponse.json<ApiResponse<DeployWorkflow>>({
          success: true,
          data: updated,
        })
      }

      case "create_canary": {
        const workflows = await loadWorkflows()
        const wf = workflows.find((w) => w.id === body.workflowId)
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
        const canaries = await loadCanaries()
        canaries[wf.id] = canary
        await saveCanaries(canaries)
        return NextResponse.json<ApiResponse<CanaryRelease>>({
          success: true,
          data: canary,
        })
      }

      case "advance_canary": {
        const canaries = await loadCanaries()
        const existingCanary = canaries[body.workflowId]
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
        canaries[body.workflowId] = advanced
        await saveCanaries(canaries)
        return NextResponse.json<ApiResponse<CanaryRelease>>({
          success: true,
          data: advanced,
        })
      }

      case "update_canary_metrics": {
        const canaries = await loadCanaries()
        const c = canaries[body.workflowId]
        if (!c) {
          return NextResponse.json<ApiResponse<never>>(
            { success: false, error: { code: "NOT_FOUND", message: "카나리를 찾을 수 없습니다" } },
            { status: 404 }
          )
        }
        const withMetrics = updateCanaryMetrics(c, body.metrics)
        canaries[body.workflowId] = withMetrics
        await saveCanaries(canaries)
        return NextResponse.json<ApiResponse<CanaryRelease>>({
          success: true,
          data: withMetrics,
        })
      }

      case "simulate_rollback_trigger": {
        const canaries = await loadCanaries()
        const canaryForSim = canaries[body.workflowId]
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
        canaries[body.workflowId] = withBadMetrics
        await saveCanaries(canaries)
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
