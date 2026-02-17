import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { createModelConfig, recordSpend, getBudgetStatus } from "@/lib/global-config"
import type { ModelConfig, RoutingRule, SupportedModel } from "@/lib/global-config"
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
  }
}

async function saveModelConfigField(key: string, value: unknown): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { category_key: { category: "MODEL", key } },
    update: { value: value as Prisma.InputJsonValue },
    create: { category: "MODEL", key, value: value as Prisma.InputJsonValue },
  })
}

// ── Serialized response type ─────────────────────────────────
interface ModelConfigResponse {
  models: ModelConfig["models"]
  routingRules: ModelConfig["routingRules"]
  defaultModel: ModelConfig["defaultModel"]
  budget: ModelConfig["budget"]
  budgetStatus: ReturnType<typeof getBudgetStatus>
}

function serialize(config: ModelConfig): ModelConfigResponse {
  return {
    models: config.models,
    routingRules: config.routingRules,
    defaultModel: config.defaultModel,
    budget: config.budget,
    budgetStatus: getBudgetStatus(config.budget),
  }
}

// GET — returns model config with budget status
export async function GET() {
  try {
    const config = await loadModelConfig()

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
  | { action: "recordSpend"; amountUsd: number }

export async function POST(request: NextRequest) {
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
        updated = { ...config, models }
        break
      }
      case "updateBudgetLimit": {
        const budget = { ...config.budget, limitUsd: body.limitUsd }
        await saveModelConfigField("budget", budget)
        updated = { ...config, budget }
        break
      }
      case "recordSpend": {
        const budget = recordSpend(config.budget, body.amountUsd)
        await saveModelConfigField("budget", budget)
        updated = { ...config, budget }
        break
      }
      case "updateRoutingRules": {
        await saveModelConfigField("routingRules", body.routingRules)
        updated = { ...config, routingRules: body.routingRules }
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
