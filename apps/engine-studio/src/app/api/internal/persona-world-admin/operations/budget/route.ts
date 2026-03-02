import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma"
import type { CostMode } from "@/lib/persona-world/cost/cost-mode"

const VALID_COST_MODES: CostMode[] = ["QUALITY", "BALANCE", "COST_PRIORITY"]

/**
 * GET /api/internal/persona-world-admin/operations/budget
 * BudgetConfig 싱글톤 조회 (T301)
 */
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const config = await prisma.budgetConfig
      .findUnique({ where: { id: "singleton" } })
      .catch(() => null)

    if (!config) {
      // 기본값 반환 (아직 레코드 미생성 시)
      return NextResponse.json({
        success: true,
        data: {
          id: "singleton",
          dailyBudget: 50,
          monthlyBudget: 1000,
          costMode: "BALANCE",
          alertThresholds: null,
          autoActions: null,
          updatedAt: null,
          updatedBy: null,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: config.id,
        dailyBudget: Number(config.dailyBudget),
        monthlyBudget: Number(config.monthlyBudget),
        costMode: config.costMode,
        alertThresholds: config.alertThresholds,
        autoActions: config.autoActions,
        updatedAt: config.updatedAt.toISOString(),
        updatedBy: config.updatedBy,
      },
    })
  } catch (error) {
    console.error("[operations/budget] GET error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to fetch budget config" } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/internal/persona-world-admin/operations/budget
 * BudgetConfig 업데이트 (T301)
 */
export async function PUT(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { dailyBudget, monthlyBudget, costMode, alertThresholds, autoActions, updatedBy } =
      body as {
        dailyBudget?: number
        monthlyBudget?: number
        costMode?: string
        alertThresholds?: Record<string, number>
        autoActions?: Record<string, unknown>
        updatedBy?: string
      }

    // 유효성 검증
    if (dailyBudget !== undefined && (typeof dailyBudget !== "number" || dailyBudget < 0)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_PARAM", message: "dailyBudget must be >= 0" } },
        { status: 400 }
      )
    }
    if (monthlyBudget !== undefined && (typeof monthlyBudget !== "number" || monthlyBudget < 0)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_PARAM", message: "monthlyBudget must be >= 0" },
        },
        { status: 400 }
      )
    }
    if (costMode !== undefined && !VALID_COST_MODES.includes(costMode as CostMode)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MODE",
            message: `Invalid cost mode. Valid: ${VALID_COST_MODES.join(", ")}`,
          },
        },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (dailyBudget !== undefined) updateData.dailyBudget = dailyBudget
    if (monthlyBudget !== undefined) updateData.monthlyBudget = monthlyBudget
    if (costMode !== undefined) updateData.costMode = costMode
    if (alertThresholds !== undefined)
      updateData.alertThresholds = alertThresholds as Prisma.InputJsonValue
    if (autoActions !== undefined) updateData.autoActions = autoActions as Prisma.InputJsonValue
    if (updatedBy !== undefined) updateData.updatedBy = updatedBy

    const config = await prisma.budgetConfig.upsert({
      where: { id: "singleton" },
      update: updateData,
      create: {
        id: "singleton",
        dailyBudget: dailyBudget ?? 50,
        monthlyBudget: monthlyBudget ?? 1000,
        costMode: costMode ?? "BALANCE",
        alertThresholds: (alertThresholds as Prisma.InputJsonValue) ?? undefined,
        autoActions: (autoActions as Prisma.InputJsonValue) ?? undefined,
        updatedBy: updatedBy ?? null,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: config.id,
        dailyBudget: Number(config.dailyBudget),
        monthlyBudget: Number(config.monthlyBudget),
        costMode: config.costMode,
        alertThresholds: config.alertThresholds,
        autoActions: config.autoActions,
        updatedAt: config.updatedAt.toISOString(),
        updatedBy: config.updatedBy,
      },
    })
  } catch (error) {
    console.error("[operations/budget] PUT error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to update budget config" } },
      { status: 500 }
    )
  }
}
