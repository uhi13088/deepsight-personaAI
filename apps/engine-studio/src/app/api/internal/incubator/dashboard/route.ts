import { NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  buildDashboard,
  type IncubatorDashboard,
  type StrategyMetric,
  type LifecycleMetric,
  type BatchResult,
  type IncubatorLogEntry,
} from "@/lib/incubator"
import { calculateMonthlyCost } from "@/lib/incubator/cost-control"
import { INITIAL_GOLDEN_SAMPLES, calculateGoldenSampleMetrics } from "@/lib/incubator/golden-sample"

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
    testSampleIds: ["gs-001", "gs-002"],
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
  const batchId = `batch-demo-${daysAgo}`
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

  const costUsage = calculateMonthlyCost(85, 85)

  const strategy: StrategyMetric = {
    userDriven: 52,
    exploration: 18,
    gapFilling: 15,
    gapRegions: ["high-depth+low-sociability", "mid-stance+high-taste"],
    archetypeDistribution: {
      "The Analyst": 12,
      "The Enthusiast": 9,
      "The Curator": 8,
      "The Contrarian": 7,
      "The Storyteller": 6,
      "The Explorer": 5,
      "The Socialite": 4,
      "The Minimalist": 3,
    },
  }

  const gsMetrics = calculateGoldenSampleMetrics(
    INITIAL_GOLDEN_SAMPLES,
    new Map(INITIAL_GOLDEN_SAMPLES.map((s) => [s.id, 0.7 + Math.random() * 0.25]))
  )

  const lifecycle: LifecycleMetric = {
    active: 42,
    standard: 18,
    legacy: 8,
    deprecated: 3,
    archived: 2,
    zombieCount: 2,
    recentTransitions: [
      { personaId: "p-demo-1", from: "STANDARD", to: "ACTIVE", date: new Date() },
      {
        personaId: "p-demo-2",
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
    cumulativeActive: 73,
    strategy,
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
