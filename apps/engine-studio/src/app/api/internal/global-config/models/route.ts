import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { createModelConfig, DEFAULT_ROUTING_RULES } from "@/lib/global-config"
import type { ModelConfig, RoutingRule } from "@/lib/global-config"

// GET — returns model config with defaults
export async function GET() {
  try {
    const config = createModelConfig()

    return NextResponse.json<ApiResponse<ModelConfig>>({
      success: true,
      data: config,
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

// POST — updates routing rules
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { routingRules?: RoutingRule[] }

    const config = createModelConfig({
      routingRules: body.routingRules ?? DEFAULT_ROUTING_RULES,
    })

    return NextResponse.json<ApiResponse<ModelConfig>>({
      success: true,
      data: config,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "라우팅 규칙 업데이트 실패" },
      },
      { status: 500 }
    )
  }
}
