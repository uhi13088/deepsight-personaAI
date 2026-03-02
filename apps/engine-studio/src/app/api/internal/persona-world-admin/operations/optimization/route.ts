import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import {
  getOptimizationStatus,
  HAIKU_WHITELIST,
  DEFAULT_BATCH_COMMENT_CONFIG,
  DEFAULT_AB_MONITOR_CONFIG,
  OPTIMIZATION_THRESHOLDS,
} from "@/lib/global-config"
import {
  generateOptimizationReport,
  type LLMUsageRecord,
} from "@/lib/persona-world/optimization-monitor"

/**
 * GET /api/internal/persona-world-admin/operations/optimization
 * 최적화 대시보드 — 현재 상태 + A/B 보고서 + 로그
 *
 * Query params:
 * - days: 조회 기간 (기본 7일)
 * - limit: 로그 최대 건수 (기본 50)
 */
export async function GET(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const url = new URL(request.url)
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 7))
    const limit = Math.min(200, Math.max(10, Number(url.searchParams.get("limit")) || 50))

    // 1. 현재 활성 페르소나 수
    const activePersonaCount = await prisma.persona.count({
      where: { status: "ACTIVE" },
    })

    // 2. 현재 최적화 상태
    const status = getOptimizationStatus(activePersonaCount)

    // 3. 최근 LLM 사용 로그 조회
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const rawLogs = await prisma.llmUsageLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: limit * 10, // A/B 분석용으로 여유 있게 조회
      select: {
        callType: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCostUsd: true,
        durationMs: true,
        routingReason: true,
        batchGroupId: true,
        isRegenerated: true,
        createdAt: true,
      },
    })

    // 4. LLMUsageRecord 형식으로 변환
    const records: LLMUsageRecord[] = rawLogs.map((log) => ({
      callType: log.callType,
      model: log.model,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      estimatedCostUsd: Number(log.estimatedCostUsd),
      durationMs: log.durationMs,
      routingReason: log.routingReason,
      batchGroupId: log.batchGroupId,
      isRegenerated: log.isRegenerated,
      createdAt: log.createdAt,
    }))

    // 5. A/B 보고서 생성
    const report = generateOptimizationReport(records, {
      ...DEFAULT_AB_MONITOR_CONFIG,
      comparisonWindowDays: days,
    })

    // 6. 최근 로그 (UI 표시용)
    const recentLogs = rawLogs.slice(0, limit).map((log) => ({
      callType: log.callType,
      model: log.model,
      costUsd: Number(log.estimatedCostUsd),
      durationMs: log.durationMs,
      routingReason: log.routingReason,
      batchGroupId: log.batchGroupId,
      isRegenerated: log.isRegenerated,
      createdAt: log.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        status: {
          activePersonaCount: status.activePersonaCount,
          activeFeatures: status.activeFeatures,
          nextTarget: status.nextTarget,
          haikuRoutingEnabled: status.haikuRoutingEnabled,
          batchCommentEnabled: status.batchCommentEnabled,
        },
        config: {
          haikuWhitelist: [...HAIKU_WHITELIST],
          batchConfig: DEFAULT_BATCH_COMMENT_CONFIG,
          thresholds: OPTIMIZATION_THRESHOLDS.map((t) => ({
            feature: t.feature,
            minPersonaCount: t.minPersonaCount,
            description: t.description,
            active: activePersonaCount >= t.minPersonaCount,
          })),
        },
        report: {
          period: report.period,
          haikuStats: report.haikuRoutingStats,
          modelComparisons: report.modelComparisons,
          batchComparison: report.batchComparison,
          alerts: report.alerts,
        },
        recentLogs,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "OPTIMIZATION_LOGS_ERROR", message } },
      { status: 500 }
    )
  }
}
