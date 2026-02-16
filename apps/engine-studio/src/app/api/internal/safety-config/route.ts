import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createDefaultConfig,
  activateEmergencyFreeze,
  deactivateEmergencyFreeze,
  enableFeature,
  disableFeature,
} from "@/lib/security/kill-switch"
import type { SystemSafetyConfig, SafetyFeatureKey } from "@/lib/security/kill-switch"

// ── In-memory store (singleton) ──────────────────────────────
let store: SystemSafetyConfig | null = null

function getStore(): SystemSafetyConfig {
  if (!store) {
    store = createDefaultConfig("system")
  }
  return store
}

// GET /api/internal/safety-config
export async function GET() {
  try {
    return NextResponse.json<ApiResponse<SystemSafetyConfig>>({
      success: true,
      data: getStore(),
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "안전 설정 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// PUT /api/internal/safety-config
type PutAction =
  | { action: "freeze"; reason: string; updatedBy: string }
  | { action: "unfreeze"; updatedBy: string }
  | { action: "enableFeature"; feature: SafetyFeatureKey; updatedBy: string }
  | {
      action: "disableFeature"
      feature: SafetyFeatureKey
      reason: string
      updatedBy: string
    }

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as PutAction
    const config = getStore()

    switch (body.action) {
      case "freeze": {
        if (!body.reason || !body.updatedBy) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "VALIDATION_ERROR", message: "reason, updatedBy 필수" },
            },
            { status: 400 }
          )
        }
        store = activateEmergencyFreeze(config, body.reason, body.updatedBy)
        break
      }
      case "unfreeze": {
        if (!body.updatedBy) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "VALIDATION_ERROR", message: "updatedBy 필수" },
            },
            { status: 400 }
          )
        }
        store = deactivateEmergencyFreeze(config, body.updatedBy)
        break
      }
      case "enableFeature": {
        if (!body.feature || !body.updatedBy) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "VALIDATION_ERROR", message: "feature, updatedBy 필수" },
            },
            { status: 400 }
          )
        }
        store = enableFeature(config, body.feature, body.updatedBy)
        break
      }
      case "disableFeature": {
        if (!body.feature || !body.reason || !body.updatedBy) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: "feature, reason, updatedBy 필수",
              },
            },
            { status: 400 }
          )
        }
        store = disableFeature(config, body.feature, body.reason, body.updatedBy)
        break
      }
      default: {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "VALIDATION_ERROR", message: "알 수 없는 action" },
          },
          { status: 400 }
        )
      }
    }

    return NextResponse.json<ApiResponse<SystemSafetyConfig>>({
      success: true,
      data: store!,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "안전 설정 업데이트 실패"
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 }
    )
  }
}
