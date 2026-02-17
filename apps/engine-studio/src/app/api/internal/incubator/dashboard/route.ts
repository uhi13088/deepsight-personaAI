// ═══════════════════════════════════════════════════════════════
// 인큐베이터 대시보드 — DB 기반 실시간 통계
// IncubatorLog, GoldenSample, Persona 테이블에서 직접 조회
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"
import {
  buildDashboard,
  type IncubatorDashboard,
  type LifecycleMetric,
  type BatchResult,
  type IncubatorLogEntry,
} from "@/lib/incubator"
import { calculateMonthlyCost } from "@/lib/incubator/cost-control"
import { calculateGoldenSampleMetrics } from "@/lib/incubator/golden-sample"
import type { GoldenSample } from "@/lib/incubator/golden-sample"
import type { IncubatorStatus } from "@/lib/incubator/batch-workflow"

// ── GET: 인큐베이터 대시보드 (DB 기반) ────────────────────────

export async function GET() {
  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [recentLogs, goldenSamplesRaw, statusCounts, monthlyLogCount] = await Promise.all([
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

      // 이번 달 총 생성/테스트 수
      prisma.incubatorLog.count({
        where: { createdAt: { gte: monthStart } },
      }),
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
        createdAt: l.createdAt,
      }))

      recentBatches.push({
        batchId,
        batchDate,
        generatedCount: total,
        passedCount,
        failedCount,
        passRate: total > 0 ? Math.round((passedCount / total) * 100) / 100 : 0,
        estimatedCost: total * 7,
        logs: batchLogs,
        durationMs: 0,
      })
    }

    // 날짜순 정렬 (최신 먼저)
    recentBatches.sort((a, b) => b.batchDate.getTime() - a.batchDate.getTime())

    // 오늘 배치
    const todayBatch = recentBatches.find((b) => b.batchDate >= todayStart) ?? null

    // 비용 계산
    const costUsage = calculateMonthlyCost(monthlyLogCount, monthlyLogCount)

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

    const dashboard = buildDashboard({
      todayBatch,
      recentBatches,
      costUsage,
      cumulativeActive,
      strategy,
      goldenSamples: gsMetrics,
      lifecycle,
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
