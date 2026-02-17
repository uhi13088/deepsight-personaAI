import { NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  buildDashboard,
  type IncubatorDashboard,
  type LifecycleMetric,
  type BatchResult,
  type IncubatorLogEntry,
} from "@/lib/incubator"
import { calculateMonthlyCost } from "@/lib/incubator/cost-control"
import { INITIAL_GOLDEN_SAMPLES, calculateGoldenSampleMetrics } from "@/lib/incubator/golden-sample"
import {
  DEMO_INCUBATOR_STRATEGY,
  DEMO_INCUBATOR_LIFECYCLE,
  DEMO_INCUBATOR_CUMULATIVE_ACTIVE,
  DEMO_INCUBATOR_MONTHLY_COST_CALLS,
} from "@/lib/demo-fixtures"

// ── Demo data builder ──────────────────────────────────────────

function makeDemoLog(
  batchId: string,
  batchDate: Date,
  index: number,
  passed: boolean
): IncubatorLogEntry {
  const score = passed ? 0.9 + Math.random() * 0.1 : 0.5 + Math.random() * 0.3
  return {
    id: `${batchId}-${String(index).padStart(3, "0")}`,
    batchId,
    batchDate,
    personaConfig: null,
    generatedVector: null,
    generatedPrompt: null,
    testSampleIds: INITIAL_GOLDEN_SAMPLES.slice(0, 2).map((s) => s.id),
    testResults: null,
    consistencyScore: Math.round(score * 100) / 100,
    scoreBreakdown: {
      vectorAlignment: Math.round((score + (Math.random() * 0.1 - 0.05)) * 100) / 100,
      toneMatch: Math.round((score + (Math.random() * 0.1 - 0.05)) * 100) / 100,
      reasoningQuality: Math.round((score + (Math.random() * 0.1 - 0.05)) * 100) / 100,
    },
    status: passed ? "PASSED" : "FAILED",
    createdAt: batchDate,
  }
}

function makeDemoBatch(daysAgo: number): BatchResult {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const batchId = `demo-batch-${daysAgo}`
  const total = 8 + Math.floor(Math.random() * 5)
  const passCount = Math.floor(total * (0.6 + Math.random() * 0.3))
  const failCount = total - passCount

  const logs: IncubatorLogEntry[] = []
  for (let i = 0; i < total; i++) {
    logs.push(makeDemoLog(batchId, date, i, i < passCount))
  }

  return {
    batchId,
    batchDate: date,
    generatedCount: total,
    passedCount: passCount,
    failedCount: failCount,
    passRate: Math.round((passCount / total) * 100) / 100,
    estimatedCost: total * 7,
    logs,
    durationMs: 1200 + Math.floor(Math.random() * 800),
  }
}

function buildDemoData(): IncubatorDashboard {
  const recentBatches = Array.from({ length: 7 }, (_, i) => makeDemoBatch(i))
  const todayBatch = recentBatches[0]

  const costUsage = calculateMonthlyCost(
    DEMO_INCUBATOR_MONTHLY_COST_CALLS,
    DEMO_INCUBATOR_MONTHLY_COST_CALLS
  )

  const gsMetrics = calculateGoldenSampleMetrics(
    INITIAL_GOLDEN_SAMPLES,
    new Map(INITIAL_GOLDEN_SAMPLES.map((s) => [s.id, 0.7 + Math.random() * 0.25]))
  )

  const lifecycle: LifecycleMetric = {
    ...DEMO_INCUBATOR_LIFECYCLE,
    recentTransitions: [
      { personaId: "demo-persona-1", from: "STANDARD", to: "ACTIVE", date: new Date() },
      {
        personaId: "demo-persona-2",
        from: "ACTIVE",
        to: "LEGACY",
        date: new Date(Date.now() - 86400000),
      },
    ],
  }

  return buildDashboard({
    todayBatch,
    recentBatches,
    costUsage,
    cumulativeActive: DEMO_INCUBATOR_CUMULATIVE_ACTIVE,
    strategy: DEMO_INCUBATOR_STRATEGY,
    goldenSamples: gsMetrics,
    lifecycle,
  })
}

// ── GET handler ────────────────────────────────────────────────

let cache: IncubatorDashboard | null = null

export async function GET() {
  try {
    if (!cache) {
      cache = buildDemoData()
    }
    return NextResponse.json<ApiResponse<IncubatorDashboard>>({
      success: true,
      data: cache,
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "인큐베이터 대시보드 데이터 조회 실패",
        },
      },
      { status: 500 }
    )
  }
}
