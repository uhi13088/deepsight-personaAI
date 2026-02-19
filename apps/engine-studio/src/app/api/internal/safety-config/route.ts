// ═══════════════════════════════════════════════════════════════
// 안전 설정 — DB 기반 SystemSafetyConfig 관리
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"
import {
  createDefaultConfig,
  activateEmergencyFreeze,
  deactivateEmergencyFreeze,
  enableFeature,
  disableFeature,
} from "@/lib/security/kill-switch"
import type { SystemSafetyConfig, SafetyFeatureKey } from "@/lib/security/kill-switch"
import type { Prisma } from "@/generated/prisma"

// ── DB에서 안전 설정 로드 ─────────────────────────────────────

async function loadConfig(): Promise<SystemSafetyConfig> {
  const row = await prisma.systemSafetyConfig.findUnique({
    where: { id: "singleton" },
  })

  if (!row) {
    return createDefaultConfig("system")
  }

  return {
    emergencyFreeze: row.emergencyFreeze,
    freezeReason: row.freezeReason ?? undefined,
    freezeAt: row.freezeAt ? row.freezeAt.getTime() : undefined,
    featureToggles: row.featureToggles as unknown as SystemSafetyConfig["featureToggles"],
    autoTriggers: row.autoTriggers as unknown as SystemSafetyConfig["autoTriggers"],
    updatedAt: row.updatedAt.getTime(),
    updatedBy: row.updatedBy,
  }
}

async function saveConfig(config: SystemSafetyConfig): Promise<void> {
  await prisma.systemSafetyConfig.upsert({
    where: { id: "singleton" },
    update: {
      emergencyFreeze: config.emergencyFreeze,
      freezeReason: config.freezeReason ?? null,
      freezeAt: config.freezeAt ? new Date(config.freezeAt) : null,
      featureToggles: config.featureToggles as unknown as Prisma.InputJsonValue,
      autoTriggers: config.autoTriggers as unknown as Prisma.InputJsonValue,
      updatedBy: config.updatedBy,
    },
    create: {
      id: "singleton",
      emergencyFreeze: config.emergencyFreeze,
      freezeReason: config.freezeReason ?? null,
      freezeAt: config.freezeAt ? new Date(config.freezeAt) : null,
      featureToggles: config.featureToggles as unknown as Prisma.InputJsonValue,
      autoTriggers: config.autoTriggers as unknown as Prisma.InputJsonValue,
      updatedBy: config.updatedBy,
    },
  })
}

// ── GET /api/internal/safety-config ─────────────────────────────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const config = await loadConfig()

    return NextResponse.json<ApiResponse<SystemSafetyConfig>>({
      success: true,
      data: config,
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

// ── PUT /api/internal/safety-config ─────────────────────────────

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
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as PutAction
    let config = await loadConfig()

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
        config = activateEmergencyFreeze(config, body.reason, body.updatedBy)
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
        config = deactivateEmergencyFreeze(config, body.updatedBy)
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
        config = enableFeature(config, body.feature, body.updatedBy)
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
        config = disableFeature(config, body.feature, body.reason, body.updatedBy)
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

    await saveConfig(config)

    return NextResponse.json<ApiResponse<SystemSafetyConfig>>({
      success: true,
      data: config,
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
