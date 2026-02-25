import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import { createModelConfig, getBudgetStatus, KNOWN_CALL_TYPES } from "@/lib/global-config"
import type {
  ModelConfig,
  RoutingRule,
  SupportedModel,
  CallTypeModelOverrides,
} from "@/lib/global-config"
import { invalidateModelConfigCache } from "@/lib/llm-client"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma"

// ── Prisma-backed helpers ─────────────────────────────────────

async function loadModelConfig(): Promise<ModelConfig> {
  const rows = await prisma.systemConfig.findMany({ where: { category: "MODEL" } })
  if (rows.length === 0) return createModelConfig()

  const configMap = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  const defaults = createModelConfig()
  return {
    models: (configMap.models ?? defaults.models) as ModelConfig["models"],
    routingRules: (configMap.routingRules ?? defaults.routingRules) as ModelConfig["routingRules"],
    defaultModel: (configMap.defaultModel ?? defaults.defaultModel) as ModelConfig["defaultModel"],
    budget: (configMap.budget ?? defaults.budget) as ModelConfig["budget"],
    callTypeOverrides: (configMap.callTypeOverrides ??
      defaults.callTypeOverrides) as ModelConfig["callTypeOverrides"],
  }
}

async function saveModelConfigField(key: string, value: unknown): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { category_key: { category: "MODEL", key } },
    update: { value: value as Prisma.InputJsonValue },
    create: { category: "MODEL", key, value: value as Prisma.InputJsonValue },
  })
}

// ── Budget auto-sync from llmUsageLog ────────────────────────

async function syncBudgetFromDB(config: ModelConfig): Promise<ModelConfig> {
  const periodStart = new Date(config.budget.periodStart)
  const periodEnd = new Date(config.budget.periodEnd)

  const agg = await prisma.llmUsageLog.aggregate({
    where: {
      createdAt: { gte: periodStart, lt: periodEnd },
    },
    _sum: { estimatedCostUsd: true },
  })

  const actualSpend = agg._sum.estimatedCostUsd ? Number(agg._sum.estimatedCostUsd) : 0
  const usagePercent = config.budget.limitUsd > 0 ? (actualSpend / config.budget.limitUsd) * 100 : 0

  const updatedThresholds = config.budget.alertThresholds.map((t) => {
    if (!t.notified && usagePercent >= t.percent) {
      return { ...t, notified: true, notifiedAt: Date.now() }
    }
    return { ...t }
  })

  const budget = {
    ...config.budget,
    currentSpendUsd: Math.round(actualSpend * 10000) / 10000,
    alertThresholds: updatedThresholds,
  }

  await saveModelConfigField("budget", budget)
  return { ...config, budget }
}

// ── Serialized response type ─────────────────────────────────
interface ModelConfigResponse {
  models: ModelConfig["models"]
  routingRules: ModelConfig["routingRules"]
  defaultModel: ModelConfig["defaultModel"]
  budget: ModelConfig["budget"]
  budgetStatus: ReturnType<typeof getBudgetStatus>
  callTypeOverrides: CallTypeModelOverrides
  knownCallTypes: typeof KNOWN_CALL_TYPES
}

function serialize(config: ModelConfig): ModelConfigResponse {
  return {
    models: config.models,
    routingRules: config.routingRules,
    defaultModel: config.defaultModel,
    budget: config.budget,
    budgetStatus: getBudgetStatus(config.budget),
    callTypeOverrides: config.callTypeOverrides,
    knownCallTypes: KNOWN_CALL_TYPES,
  }
}

// GET — returns model config with budget status
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const raw = await loadModelConfig()
    const config = await syncBudgetFromDB(raw)

    return NextResponse.json<ApiResponse<ModelConfigResponse>>({
      success: true,
      data: serialize(config),
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "모델 설정 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// POST — handles multiple actions
type PostAction =
  | { action: "updateRoutingRules"; routingRules: RoutingRule[] }
  | { action: "toggleModel"; modelId: SupportedModel }
  | { action: "updateBudgetLimit"; limitUsd: number }
  | { action: "syncBudget" }
  | { action: "updateCallTypeOverrides"; overrides: CallTypeModelOverrides }

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as PostAction
    const config = await loadModelConfig()

    let updated: ModelConfig

    switch (body.action) {
      case "toggleModel": {
        const models = config.models.map((m) =>
          m.id === body.modelId ? { ...m, enabled: !m.enabled } : m
        )
        await saveModelConfigField("models", models)
        invalidateModelConfigCache()
        updated = { ...config, models }
        break
      }
      case "updateBudgetLimit": {
        const budget = { ...config.budget, limitUsd: body.limitUsd }
        await saveModelConfigField("budget", budget)
        updated = { ...config, budget }
        break
      }
      case "syncBudget": {
        updated = await syncBudgetFromDB(config)
        break
      }
      case "updateRoutingRules": {
        await saveModelConfigField("routingRules", body.routingRules)
        invalidateModelConfigCache()
        updated = { ...config, routingRules: body.routingRules }
        break
      }
      case "updateCallTypeOverrides": {
        await saveModelConfigField("callTypeOverrides", body.overrides)
        invalidateModelConfigCache()
        updated = { ...config, callTypeOverrides: body.overrides }
        break
      }
      default: {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "VALIDATION_ERROR", message: "알 수 없는 action입니다" },
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json<ApiResponse<ModelConfigResponse>>({
      success: true,
      data: serialize(updated),
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "모델 설정 업데이트 실패" },
      },
      { status: 500 }
    )
  }
}
