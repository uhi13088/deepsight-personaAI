import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { CostDataProvider } from "@/lib/persona-world/cost/cost-integration"
import { buildCostDashboard, changeCostMode } from "@/lib/persona-world/cost/cost-integration"
import type { CostMode } from "@/lib/persona-world/cost/cost-mode"
import type { LlmUsageLog, LLMCallType } from "@/lib/persona-world/cost/usage-tracker"
import { getPISGrade } from "@/lib/persona-world/quality/integrity-score"

const VALID_COST_MODES: CostMode[] = ["QUALITY", "BALANCE", "COST_PRIORITY"]

/**
 * GET /api/internal/persona-world-admin/operations/cost
 * 비용 대시보드 (일간/월간 리포트, 예산 알림, 비용 모드, 최적화 분석)
 */
export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const provider = createPrismaCostDataProvider()
    const dashboard = await buildCostDashboard(provider)

    return NextResponse.json({
      success: true,
      data: {
        daily: {
          date: dashboard.dailyReport.date,
          totalCost: dashboard.dailyReport.totalCost,
          totalCalls: dashboard.dailyReport.totalCalls,
          byCallType: dashboard.dailyReport.byCallType,
          cacheEfficiency: dashboard.dailyReport.cacheEfficiency,
          budgetUsage: dashboard.dailyReport.budgetUsage ?? null,
        },
        monthly: {
          month: dashboard.monthlyReport.month,
          totalCost: dashboard.monthlyReport.totalCost,
          totalCalls: dashboard.monthlyReport.totalCalls,
          byCategory: dashboard.monthlyReport.byCategory,
          dailyTrend: dashboard.monthlyReport.dailyTrend,
          projectedEndOfMonth: dashboard.monthlyReport.projectedEndOfMonth,
          budgetUsage: dashboard.monthlyReport.budgetUsage ?? null,
        },
        alerts: dashboard.alerts.map((a) => ({
          level: a.level,
          period: a.period,
          usagePercentage: a.usagePercentage,
          message: a.message,
          autoAction: a.autoAction,
          triggeredAt: a.triggeredAt.toISOString(),
        })),
        currentMode: {
          mode: dashboard.currentMode.mode,
          label: dashboard.currentMode.label,
          description: dashboard.currentMode.description,
          frequencies: dashboard.currentMode.frequencies,
          estimates: dashboard.currentMode.estimates,
        },
        modeApplication: dashboard.modeApplication,
        modeComparison: dashboard.modeComparison,
        optimization: {
          strategies: dashboard.optimization.strategies,
          totalSavings: dashboard.optimization.totalSavings,
          totalSavingsPercentage: dashboard.optimization.totalSavingsPercentage,
        },
      },
    })
  } catch (error) {
    console.error("[operations/cost] GET error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to fetch cost dashboard" } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/internal/persona-world-admin/operations/cost
 * 비용 모드 변경 (action: "set_mode", mode: "QUALITY"|"BALANCE"|"COST_PRIORITY")
 */
export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { action, mode } = body as { action?: string; mode?: string }

    if (action !== "set_mode" || !mode) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: 'action "set_mode" and mode required',
          },
        },
        { status: 400 }
      )
    }

    if (!VALID_COST_MODES.includes(mode as CostMode)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MODE",
            message: `Invalid cost mode: ${mode}. Valid modes: ${VALID_COST_MODES.join(", ")}`,
          },
        },
        { status: 400 }
      )
    }

    const provider = createPrismaCostDataProvider()
    const application = await changeCostMode(provider, mode as CostMode)

    return NextResponse.json({
      success: true,
      data: {
        mode: application.mode,
        schedulerUpdates: application.schedulerUpdates,
        interviewSampling: application.interviewSampling,
        arenaFrequency: application.arenaFrequency,
        estimatedBudget: application.estimatedBudget,
      },
    })
  } catch (error) {
    console.error("[operations/cost] POST error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL", message: "Failed to change cost mode" } },
      { status: 500 }
    )
  }
}

// ── Prisma 기반 CostDataProvider ──────────────────────────────

function createPrismaCostDataProvider(): CostDataProvider {
  return {
    async getTodayUsageLogs(): Promise<LlmUsageLog[]> {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const logs = await prisma.llmUsageLog.findMany({
        where: { createdAt: { gte: todayStart } },
        orderBy: { createdAt: "asc" },
      })

      return logs.map((log) => ({
        id: log.id,
        personaId: log.personaId ?? "unknown",
        callType: mapCallType(log.callType),
        tokens: {
          inputTotal: log.inputTokens,
          inputCached: log.cacheReadInputTokens ?? 0,
          output: log.outputTokens,
        },
        cost: {
          inputCost: computeInputCost(log.inputTokens, log.cacheReadInputTokens ?? 0),
          cacheCost: computeCacheCost(log.cacheReadInputTokens ?? 0),
          outputCost: computeOutputCost(log.outputTokens),
          totalCost: Number(log.estimatedCostUsd),
        },
        latencyMs: log.durationMs,
        model: log.model,
        cacheHit: (log.cacheReadInputTokens ?? 0) > 0,
        timestamp: log.createdAt,
      }))
    },

    async getMonthDailyReports() {
      // 간소화: 빈 배열 반환 (일별 집계 테이블 미구현 시 일간 리포트로 대체)
      return []
    },

    async getCurrentCostMode(): Promise<CostMode> {
      const config = await prisma.systemConfig
        .findUnique({
          where: { category_key: { category: "COST", key: "mode" } },
        })
        .catch(() => null)

      if (config?.value && typeof config.value === "string") {
        const mode = config.value as CostMode
        if (VALID_COST_MODES.includes(mode)) return mode
      }
      // JSON value 형태인 경우
      if (
        config?.value &&
        typeof config.value === "object" &&
        "mode" in (config.value as Record<string, unknown>)
      ) {
        const mode = (config.value as Record<string, unknown>).mode as CostMode
        if (VALID_COST_MODES.includes(mode)) return mode
      }

      return "QUALITY" // 기본값
    },

    async setCostMode(mode: CostMode) {
      await prisma.systemConfig.upsert({
        where: { category_key: { category: "COST", key: "mode" } },
        update: { value: mode },
        create: {
          category: "COST",
          key: "mode",
          value: mode,
          description: "PersonaWorld 비용 모드 (QUALITY/BALANCE/COST_PRIORITY)",
        },
      })
    },

    async getDailyBudget() {
      const config = await prisma.systemConfig
        .findUnique({
          where: { category_key: { category: "COST", key: "daily_budget" } },
        })
        .catch(() => null)

      if (config?.value && typeof config.value === "number") {
        return config.value
      }
      return 8 // 기본값: $8/일 (QUALITY 모드 100명 기준 ~$6.3/일)
    },

    async getMonthlyBudget() {
      const config = await prisma.systemConfig
        .findUnique({
          where: { category_key: { category: "COST", key: "monthly_budget" } },
        })
        .catch(() => null)

      if (config?.value && typeof config.value === "number") {
        return config.value
      }
      return 240 // 기본값: $240/월 (QUALITY 모드 100명)
    },

    async getMonthlySpending() {
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const result = await prisma.llmUsageLog.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { estimatedCostUsd: true },
      })

      return Number(result._sum.estimatedCostUsd ?? 0)
    },

    async getActivePersonaCount() {
      return prisma.persona.count({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
      })
    },

    async getPersonaPISDistribution() {
      const personas = await prisma.persona.findMany({
        where: { status: { in: ["ACTIVE", "STANDARD"] } },
        select: { id: true, qualityScore: true },
      })

      return personas.map((p) => ({
        personaId: p.id,
        grade: getPISGrade(Number(p.qualityScore ?? 0.8)),
      }))
    },

    async getDailyCommentCount() {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      return prisma.personaComment.count({
        where: { createdAt: { gte: todayStart } },
      })
    },

    async getDailyPostCount() {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      return prisma.personaPost.count({
        where: { createdAt: { gte: todayStart } },
      })
    },
  }
}

// ── 비용 계산 유틸리티 ──────────────────────────────────────────

const PRICING = {
  inputPerMillion: 3.0,
  cacheReadPerMillion: 0.3,
  outputPerMillion: 15.0,
}

function mapCallType(dbCallType: string): LLMCallType {
  const mapping: Record<string, LLMCallType> = {
    post: "POST",
    comment: "COMMENT",
    interview: "INTERVIEW",
    "test-generate": "INTERVIEW",
    judge: "JUDGE",
    arena: "ARENA",
    review: "OTHER",
    interaction: "OTHER",
  }
  return mapping[dbCallType.toLowerCase()] ?? "OTHER"
}

function computeInputCost(inputTokens: number, cachedTokens: number): number {
  const nonCached = inputTokens - cachedTokens
  return (nonCached / 1_000_000) * PRICING.inputPerMillion
}

function computeCacheCost(cachedTokens: number): number {
  return (cachedTokens / 1_000_000) * PRICING.cacheReadPerMillion
}

function computeOutputCost(outputTokens: number): number {
  return (outputTokens / 1_000_000) * PRICING.outputPerMillion
}
