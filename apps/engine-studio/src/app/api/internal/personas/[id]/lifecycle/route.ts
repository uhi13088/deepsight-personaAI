import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import { executeTransition } from "@/lib/lifecycle"
import type { ApiResponse, LifecycleTransitionBody, LifecycleTransitionResponse } from "@/types"
import type { LifecycleAction } from "@/lib/lifecycle"
import type { PersonaStatus } from "@/generated/prisma"

// ═══════════════════════════════════════════════════════════════
// POST /api/internal/personas/[id]/lifecycle
// ═══════════════════════════════════════════════════════════════

const VALID_ACTIONS = new Set<string>([
  "SUBMIT_REVIEW",
  "APPROVE",
  "REJECT",
  "PAUSE",
  "RESUME",
  "ARCHIVE",
  "RESTORE",
  "DEPRECATE",
])

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params
    const body: LifecycleTransitionBody = await request.json()

    if (!body.action || !VALID_ACTIONS.has(body.action)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: `유효하지 않은 액션: ${body.action}` },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    const action = body.action as LifecycleAction

    // Load persona
    const persona = await prisma.persona.findUnique({
      where: { id },
      select: { id: true, status: true },
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

    // Execute transition
    const result = executeTransition(persona.status, action)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "TRANSITION_ERROR", message: result.reason },
        } satisfies ApiResponse<never>,
        { status: 409 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: result.newStatus as PersonaStatus,
    }

    // Set timestamps based on transition
    if (result.newStatus === "ACTIVE" && persona.status !== "ACTIVE") {
      updateData.activatedAt = new Date()
    }
    if (result.newStatus === "ARCHIVED") {
      updateData.archivedAt = new Date()
    }
    if (action === "RESTORE") {
      updateData.archivedAt = null
    }

    await prisma.persona.update({
      where: { id },
      data: updateData,
    })

    const response: LifecycleTransitionResponse = {
      id,
      previousStatus: persona.status,
      newStatus: result.newStatus,
    }

    return NextResponse.json({
      success: true,
      data: response,
    } satisfies ApiResponse<LifecycleTransitionResponse>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `상태 전이 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
