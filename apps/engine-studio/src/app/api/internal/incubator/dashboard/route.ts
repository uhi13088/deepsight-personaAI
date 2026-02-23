// ═══════════════════════════════════════════════════════════════
// 인큐베이터 대시보드 — DB 기반 실시간 통계
// IncubatorLog, GoldenSample, Persona 테이블에서 직접 조회
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"
import {
  buildDashboard,
  type IncubatorDashboard,
  type LifecycleMetric,
  type BatchResult,
  type IncubatorLogEntry,
} from "@/lib/incubator"
import {
  calculateMonthlyCostFromDB,
  getDailyCostsFromDB,
  getCostForPeriod,
} from "@/lib/incubator/cost-control"
import { calculateGoldenSampleMetrics } from "@/lib/incubator/golden-sample"
import type { GoldenSample } from "@/lib/incubator/golden-sample"
import type { IncubatorStatus } from "@/lib/incubator/batch-workflow"
import { runIncubatorBatch } from "@/lib/incubator/run-batch"

// ── GET: 인큐베이터 대시보드 (DB 기반) ────────────────────────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      recentLogs,
      goldenSamplesRaw,
      statusCounts,
      costUsage,
      dailyCosts,
      pendingRequestCount,
      dailyLimitConfig,
    ] = await Promise.all([
      // 최근 7일 인큐베이터 로그
      prisma.incubatorLog.findMany({
        where: { batchDate: { gte: sevenDaysAgo } },
        orderBy: { batchDate: "desc" },
      }),

      // 골든 샘플 전체
      prisma.goldenSample.findMany({
        where: { isActive: true },
      }),

      // 페르소나 상태별 카운트
      prisma.persona.groupBy({
        by: ["status"],
        _count: { status: true },
      }),

      // 이번 달 실제 LLM 비용 (LlmUsageLog 기반)
      calculateMonthlyCostFromDB(),

      // 7일간 일별 실제 LLM 비용
      getDailyCostsFromDB(7),

      // 대기 중인 사용자 페르소나 생성 요청
      prisma.personaGenerationRequest
        .count({
          where: { status: { in: ["PENDING", "SCHEDULED"] } },
        })
        .catch(() => 0),

      // 일일 생성 한도
      prisma.systemConfig
        .findUnique({ where: { category_key: { category: "INCUBATOR", key: "dailyLimit" } } })
        .catch(() => null),
    ])

    // 상태별 카운트 맵
    const statusMap: Record<string, number> = {}
    for (const g of statusCounts) {
      statusMap[g.status] = g._count.status
    }

    // 라이프사이클 메트릭
    const lifecycle: LifecycleMetric = {
      active: statusMap["ACTIVE"] ?? 0,
      standard: statusMap["STANDARD"] ?? 0,
      legacy: statusMap["LEGACY"] ?? 0,
      deprecated: statusMap["DEPRECATED"] ?? 0,
      archived: statusMap["ARCHIVED"] ?? 0,
      zombieCount: (statusMap["LEGACY"] ?? 0) + (statusMap["DEPRECATED"] ?? 0),
      recentTransitions: [],
    }

    // 배치별 그룹핑
    const batchMap = new Map<string, typeof recentLogs>()
    for (const log of recentLogs) {
      const existing = batchMap.get(log.batchId) ?? []
      existing.push(log)
      batchMap.set(log.batchId, existing)
    }

    const recentBatches: BatchResult[] = []
    for (const [batchId, logs] of batchMap) {
      const passedCount = logs.filter(
        (l) => l.status === "PASSED" || l.status === "APPROVED"
      ).length
      const failedCount = logs.filter(
        (l) => l.status === "FAILED" || l.status === "REJECTED"
      ).length
      const total = logs.length
      const batchDate = logs[0].batchDate

      // 배치 시간 범위의 실제 LLM 비용 조회
      const batchStart = new Date(batchDate)
      batchStart.setHours(0, 0, 0, 0)
      const batchEnd = new Date(batchDate)
      batchEnd.setHours(23, 59, 59, 999)
      const batchCost = await getCostForPeriod(batchStart, batchEnd)

      const batchLogs: IncubatorLogEntry[] = logs.map((l) => ({
        id: l.id,
        batchId: l.batchId,
        batchDate: l.batchDate,
        personaConfig: l.personaConfig as Record<string, unknown> | null,
        generatedVector: l.generatedVector as {
          l1: Record<string, number>
          l2: Record<string, number>
          l3: Record<string, number>
        } | null,
        generatedPrompt: l.generatedPrompt,
        testSampleIds: l.testSampleIds,
        testResults: l.testResults as Record<string, unknown>[] | null,
        consistencyScore: l.consistencyScore ? Number(l.consistencyScore) : null,
        scoreBreakdown: l.vectorAlignmentScore
          ? {
              vectorAlignment: Number(l.vectorAlignmentScore),
              toneMatch: Number(l.toneMatchScore ?? 0),
              reasoningQuality: Number(l.reasoningQualityScore ?? 0),
            }
          : null,
        status: l.status as IncubatorStatus,
        failReason: l.failReason ?? null,
        createdAt: l.createdAt,
      }))

      recentBatches.push({
        batchId,
        batchDate,
        generatedCount: total,
        passedCount,
        failedCount,
        passRate: total > 0 ? Math.round((passedCount / total) * 100) / 100 : 0,
        estimatedCost: batchCost.totalCostKRW,
        logs: batchLogs,
        durationMs: 0,
      })
    }

    // 날짜순 정렬 (최신 먼저)
    recentBatches.sort((a, b) => b.batchDate.getTime() - a.batchDate.getTime())

    // 오늘 배치 — 여러 번 실행된 경우 모두 합산
    const todayBatchList = recentBatches.filter((b) => b.batchDate >= todayStart)
    let todayBatch: BatchResult | null = null
    if (todayBatchList.length > 0) {
      const generatedCount = todayBatchList.reduce((s, b) => s + b.generatedCount, 0)
      const passedCount = todayBatchList.reduce((s, b) => s + b.passedCount, 0)
      const failedCount = todayBatchList.reduce((s, b) => s + b.failedCount, 0)
      todayBatch = {
        batchId: todayBatchList[0].batchId,
        batchDate: todayBatchList[0].batchDate,
        generatedCount,
        passedCount,
        failedCount,
        passRate: generatedCount > 0 ? Math.round((passedCount / generatedCount) * 100) / 100 : 0,
        estimatedCost: todayBatchList.reduce((s, b) => s + b.estimatedCost, 0),
        logs: todayBatchList.flatMap((b) => b.logs),
        durationMs: todayBatchList.reduce((s, b) => s + b.durationMs, 0),
      }
    }

    // costUsage는 이미 calculateMonthlyCostFromDB()로 조회됨 (실제 LLM 비용)

    // 골든 샘플 메트릭
    const goldenSamples: GoldenSample[] = goldenSamplesRaw.map((gs) => ({
      id: gs.id,
      contentTitle: gs.contentTitle,
      genre: gs.genre ?? "",
      testQuestion: gs.testQuestion,
      expectedReactions: (gs.expectedReactions as Record<string, string>) ?? {},
      difficultyLevel: gs.difficultyLevel as GoldenSample["difficultyLevel"],
      validationDimensions: gs.validationDimensions,
      version: gs.version,
      isActive: gs.isActive,
    }))

    const gsMetrics = calculateGoldenSampleMetrics(
      goldenSamples,
      new Map(goldenSamples.map((s) => [s.id, 0.85]))
    )

    // 전략 메트릭
    const strategy = {
      userDriven: 0.6,
      exploration: 0.2,
      gapFilling: 0.2,
      gapRegions: [] as string[],
      archetypeDistribution: {} as Record<string, number>,
    }

    // 누적 활성 페르소나
    const cumulativeActive = (statusMap["ACTIVE"] ?? 0) + (statusMap["STANDARD"] ?? 0)

    const dailyLimit = (dailyLimitConfig?.value as number) ?? 10
    const lastBatchAt = recentLogs.length > 0 ? recentLogs[0].createdAt.toISOString() : null

    const dashboard = buildDashboard({
      todayBatch,
      recentBatches,
      costUsage,
      cumulativeActive,
      strategy,
      goldenSamples: gsMetrics,
      dailyCosts,
      lifecycle,
      dailyLimit,
      pendingRequestCount,
      lastBatchAt,
    })

    return NextResponse.json<ApiResponse<IncubatorDashboard>>({
      success: true,
      data: dashboard,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "인큐베이터 대시보드 데이터 조회 실패"
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 }
    )
  }
}

// ── POST: 수동 배치 트리거 + 설정 변경 ──────────────────────

interface IncubatorSettings {
  generationCostKRW: number
  testCostKRW: number
  monthlyBudgetKRW: number
  dailyLimit: number
  passThreshold: number
  strategyWeights: { userDriven: number; exploration: number; gapFilling: number }
}

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { action } = body as { action: string }

    if (action === "trigger_batch") {
      // 설정에서 dailyLimit, passThreshold 조회
      const configRows = await prisma.systemConfig
        .findMany({ where: { category: "INCUBATOR" } })
        .catch(() => [])
      const configMap = Object.fromEntries(configRows.map((r) => [r.key, r.value]))
      const dailyLimit = (configMap.dailyLimit as number) ?? 10
      const passThreshold = (configMap.passThreshold as number) ?? 0.9

      const result = await runIncubatorBatch({
        dailyLimit,
        passThreshold,
        batchIdPrefix: "batch-manual",
      })

      return NextResponse.json<
        ApiResponse<{
          batchId: string
          message: string
          generated: number
          passed: number
          failed: number
          errors: number
          userRequestsProcessed: number
          durationMs: number
          skipped: boolean
          results: (typeof result)["results"]
        }>
      >({
        success: true,
        data: result,
      })
    }

    if (action === "get_settings") {
      // SystemConfig에서 인큐베이터 설정 조회
      const rows = await prisma.systemConfig
        .findMany({ where: { category: "INCUBATOR" } })
        .catch(() => [])

      const configMap = Object.fromEntries(rows.map((r) => [r.key, r.value]))
      const settings: IncubatorSettings = {
        generationCostKRW: (configMap.generationCostKRW as number) ?? 5,
        testCostKRW: (configMap.testCostKRW as number) ?? 2,
        monthlyBudgetKRW: (configMap.monthlyBudgetKRW as number) ?? 10000,
        dailyLimit: (configMap.dailyLimit as number) ?? 10,
        passThreshold: (configMap.passThreshold as number) ?? 0.9,
        strategyWeights: (configMap.strategyWeights as IncubatorSettings["strategyWeights"]) ?? {
          userDriven: 0.6,
          exploration: 0.2,
          gapFilling: 0.2,
        },
      }
      return NextResponse.json<ApiResponse<IncubatorSettings>>({
        success: true,
        data: settings,
      })
    }

    if (action === "save_settings") {
      const { settings } = body as { settings: Partial<IncubatorSettings> }
      if (!settings) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: { code: "MISSING_PARAM", message: "settings required" } },
          { status: 400 }
        )
      }

      const entries = Object.entries(settings)
      await Promise.all(
        entries.map(([key, value]) =>
          prisma.systemConfig.upsert({
            where: { category_key: { category: "INCUBATOR", key } },
            update: { value: value as number | object },
            create: { category: "INCUBATOR", key, value: value as number | object },
          })
        )
      )

      return NextResponse.json<ApiResponse<{ saved: string[] }>>({
        success: true,
        data: { saved: entries.map(([k]) => k) },
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "UNKNOWN_ACTION", message: `Unknown: ${action}` } },
      { status: 400 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INCUBATOR_ACTION_ERROR", message } },
      { status: 500 }
    )
  }
}
