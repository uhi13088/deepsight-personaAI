import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"
import {
  type AutonomyPolicy,
  getAutonomyPolicy,
  validateAutonomyPolicy,
} from "@/lib/autonomy/autonomy-policy"

// ═══════════════════════════════════════════════════════════════
// GET /api/internal/personas/[id]/autonomy
// 현재 AutonomyPolicy 조회 (null이면 기본값 반환)
// ═══════════════════════════════════════════════════════════════

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params

    const persona = await prisma.persona.findUnique({
      where: { id },
      select: { id: true, name: true, autonomyPolicy: true },
    })

    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다." },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    const policy = getAutonomyPolicy(persona)

    return NextResponse.json({
      success: true,
      data: {
        personaId: persona.id,
        personaName: persona.name,
        isCustom: persona.autonomyPolicy !== null,
        policy,
      },
    } satisfies ApiResponse<{
      personaId: string
      personaName: string
      isCustom: boolean
      policy: AutonomyPolicy
    }>)
  } catch (error) {
    console.error("[GET /personas/[id]/autonomy]", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "자율 정책 조회 실패" },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════
// PATCH /api/internal/personas/[id]/autonomy
// AutonomyPolicy 업데이트 (부분 업데이트 지원)
// ═══════════════════════════════════════════════════════════════

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params

    const persona = await prisma.persona.findUnique({
      where: { id },
      select: { id: true, name: true, autonomyPolicy: true },
    })

    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다." },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    const body = await request.json()

    // 기존 정책과 머지 (부분 업데이트)
    const currentPolicy = getAutonomyPolicy(persona)
    const merged = deepMerge(
      currentPolicy as unknown as Record<string, unknown>,
      body as Record<string, unknown>
    )

    const { valid, errors, policy } = validateAutonomyPolicy(merged)

    if (!valid || !policy) {
      return NextResponse.json(
        {
          success: false as const,
          error: {
            code: "VALIDATION_ERROR",
            message: "입력값이 유효하지 않습니다.",
            details: errors,
          },
        },
        { status: 400 }
      )
    }

    const updated = await prisma.persona.update({
      where: { id },
      data: { autonomyPolicy: JSON.parse(JSON.stringify(policy)) },
      select: { id: true, name: true, autonomyPolicy: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        personaId: updated.id,
        personaName: updated.name,
        isCustom: true,
        policy,
      },
    } satisfies ApiResponse<{
      personaId: string
      personaName: string
      isCustom: boolean
      policy: AutonomyPolicy
    }>)
  } catch (error) {
    console.error("[PATCH /personas/[id]/autonomy]", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "자율 정책 업데이트 실패" },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

// ── 유틸 ────────────────────────────────────────────────────

function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base }
  for (const key of Object.keys(patch)) {
    const baseVal = base[key]
    const patchVal = patch[key]
    if (
      patchVal &&
      typeof patchVal === "object" &&
      !Array.isArray(patchVal) &&
      baseVal &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        patchVal as Record<string, unknown>
      )
    } else {
      result[key] = patchVal
    }
  }
  return result
}
