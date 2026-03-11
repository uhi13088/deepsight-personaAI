// ═══════════════════════════════════════════════════════════════
// V_Final 월드 표현 강도 설정 API (T415)
// GET: 현재 설정 조회 / PUT: 레벨 + 활성화 상태 변경
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import {
  getWorldVFinalConfig,
  updateWorldVFinalConfig,
  type WorldVFinalConfig,
} from "@/lib/persona-world/vfinal-config"

// ── GET /api/internal/settings/vfinal ────────────────────────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const config = await getWorldVFinalConfig()

    return NextResponse.json<ApiResponse<WorldVFinalConfig>>({
      success: true,
      data: config,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "V_Final 설정 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── PUT /api/internal/settings/vfinal ────────────────────────

interface PutBody {
  expressionLevel: number
  vFinalEnabled: boolean
  updatedBy: string
}

export async function PUT(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as Partial<PutBody>

    if (
      typeof body.expressionLevel !== "number" ||
      typeof body.vFinalEnabled !== "boolean" ||
      typeof body.updatedBy !== "string"
    ) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "expressionLevel(number), vFinalEnabled(boolean), updatedBy(string) 필수",
          },
        },
        { status: 400 }
      )
    }

    if (body.expressionLevel < 1 || body.expressionLevel > 10) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "expressionLevel은 1~10 범위여야 합니다",
          },
        },
        { status: 400 }
      )
    }

    const config = await updateWorldVFinalConfig(
      body.expressionLevel,
      body.vFinalEnabled,
      body.updatedBy
    )

    return NextResponse.json<ApiResponse<WorldVFinalConfig>>({
      success: true,
      data: config,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "V_Final 설정 업데이트 실패"
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 }
    )
  }
}
