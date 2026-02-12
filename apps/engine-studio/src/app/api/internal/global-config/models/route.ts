import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { createModelConfig, recordSpend, getBudgetStatus } from "@/lib/global-config"
import type { ModelConfig, RoutingRule, SupportedModel } from "@/lib/global-config"

// ── In-memory store (persists within server session) ─────────
let store: ModelConfig | null = null

function getStore(): ModelConfig {
  if (!store) {
    const config = createModelConfig()
    // Seed with sample spend
    const budget = recordSpend(config.budget, 127.5)
    store = { ...config, budget }
  }
  return store
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
    const config = getStore()

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
    const config = getStore()

    switch (body.action) {
      case "toggleModel": {
        store = {
          ...config,
          models: config.models.map((m) =>
            m.id === body.modelId ? { ...m, enabled: !m.enabled } : m
          ),
        }
        break
      }
      case "updateBudgetLimit": {
        store = {
          ...config,
          budget: {
            ...config.budget,
            limitUsd: body.limitUsd,
          },
        }
        break
      }
      case "recordSpend": {
        store = {
          ...config,
          budget: recordSpend(config.budget, body.amountUsd),
        }
        break
      }
      case "updateRoutingRules": {
        store = {
          ...config,
          routingRules: body.routingRules,
        }
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
      data: serialize(store),
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
