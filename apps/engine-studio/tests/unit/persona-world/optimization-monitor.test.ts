// ═══════════════════════════════════════════════════════════════
// Optimization Monitor Tests — T330
// A/B 품질 모니터링 자동화 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

import {
  compareModelsByCallType,
  compareBatchVsIndividual,
  computeHaikuRoutingStats,
  generateAlerts,
  generateOptimizationReport,
  type LLMUsageRecord,
} from "@/lib/persona-world/optimization-monitor"

// ── 테스트 헬퍼 ──────────────────────────────────────────────

function createRecord(overrides?: Partial<LLMUsageRecord>): LLMUsageRecord {
  return {
    callType: "pw:comment",
    model: "claude-sonnet-4-5-20250929",
    inputTokens: 500,
    outputTokens: 200,
    estimatedCostUsd: 0.0045,
    durationMs: 1200,
    routingReason: "default_model",
    batchGroupId: null,
    isRegenerated: false,
    createdAt: new Date(),
    ...overrides,
  }
}

function createHaikuRecords(count: number, callType: string): LLMUsageRecord[] {
  return Array.from({ length: count }, () =>
    createRecord({
      callType,
      model: "claude-haiku-4-5-20251001",
      estimatedCostUsd: 0.0012,
      durationMs: 400,
      routingReason: "haiku_whitelist",
    })
  )
}

function createSonnetRecords(count: number, callType: string): LLMUsageRecord[] {
  return Array.from({ length: count }, () =>
    createRecord({
      callType,
      model: "claude-sonnet-4-5-20250929",
      estimatedCostUsd: 0.0045,
      durationMs: 1200,
      routingReason: "config_override",
    })
  )
}

// ── compareModelsByCallType ──────────────────────────────────

describe("compareModelsByCallType", () => {
  it("Haiku와 Sonnet 레코드가 모두 있을 때 비교 결과 반환", () => {
    const records = [
      ...createHaikuRecords(5, "pw:impression"),
      ...createSonnetRecords(5, "pw:impression"),
    ]

    const results = compareModelsByCallType(records, {
      comparisonWindowDays: 7,
      minSampleSize: 3,
      qualityDropThreshold: 0.05,
      savingsReportThreshold: 0.1,
    })

    expect(results).toHaveLength(1)
    expect(results[0].callType).toBe("pw:impression")
    expect(results[0].costSavingsPercent).toBeGreaterThan(0)
    expect(results[0].sufficientSamples).toBe(true)
  })

  it("Haiku만 있으면 비교 결과 없음", () => {
    const records = createHaikuRecords(10, "pw:news_analysis")
    const results = compareModelsByCallType(records)
    expect(results).toHaveLength(0)
  })

  it("callType별로 개별 비교", () => {
    const records = [
      ...createHaikuRecords(5, "pw:impression"),
      ...createSonnetRecords(5, "pw:impression"),
      ...createHaikuRecords(5, "pw:news_analysis"),
      ...createSonnetRecords(5, "pw:news_analysis"),
    ]

    const results = compareModelsByCallType(records, {
      comparisonWindowDays: 7,
      minSampleSize: 3,
      qualityDropThreshold: 0.05,
      savingsReportThreshold: 0.1,
    })
    expect(results).toHaveLength(2)
  })

  it("샘플 수가 minSampleSize 미만이면 sufficientSamples=false", () => {
    const records = [
      ...createHaikuRecords(2, "pw:impression"),
      ...createSonnetRecords(2, "pw:impression"),
    ]

    const results = compareModelsByCallType(records, {
      comparisonWindowDays: 7,
      minSampleSize: 30,
      qualityDropThreshold: 0.05,
      savingsReportThreshold: 0.1,
    })

    expect(results[0].sufficientSamples).toBe(false)
  })

  it("비용 절감률은 (Sonnet - Haiku) / Sonnet × 100", () => {
    const records = [
      ...createHaikuRecords(5, "pw:impression"), // cost: 0.0012
      ...createSonnetRecords(5, "pw:impression"), // cost: 0.0045
    ]

    const results = compareModelsByCallType(records, {
      comparisonWindowDays: 7,
      minSampleSize: 3,
      qualityDropThreshold: 0.05,
      savingsReportThreshold: 0.1,
    })
    // (0.0045 - 0.0012) / 0.0045 × 100 ≈ 73.3%
    expect(results[0].costSavingsPercent).toBeCloseTo(73.33, 0)
  })
})

// ── compareBatchVsIndividual ─────────────────────────────────

describe("compareBatchVsIndividual", () => {
  it("배치와 개별 댓글이 모두 있을 때 비교", () => {
    const records = [
      createRecord({ batchGroupId: "batch-1", estimatedCostUsd: 0.003 }),
      createRecord({ batchGroupId: "batch-1", estimatedCostUsd: 0.003 }),
      createRecord({ batchGroupId: null, estimatedCostUsd: 0.005 }),
      createRecord({ batchGroupId: null, estimatedCostUsd: 0.005 }),
    ]

    const result = compareBatchVsIndividual(records, {
      comparisonWindowDays: 7,
      minSampleSize: 1,
      qualityDropThreshold: 0.05,
      savingsReportThreshold: 0.1,
    })

    expect(result).not.toBeNull()
    expect(result!.batchSampleCount).toBe(2)
    expect(result!.individualSampleCount).toBe(2)
    expect(result!.costSavingsPercent).toBeGreaterThan(0)
  })

  it("데이터 없으면 null 반환", () => {
    const result = compareBatchVsIndividual([])
    expect(result).toBeNull()
  })

  it("개별 댓글만 있으면 비교 가능 (배치 0건)", () => {
    const records = [createRecord({ batchGroupId: null, estimatedCostUsd: 0.005 })]

    const result = compareBatchVsIndividual(records, {
      comparisonWindowDays: 7,
      minSampleSize: 1,
      qualityDropThreshold: 0.05,
      savingsReportThreshold: 0.1,
    })
    expect(result).not.toBeNull()
    expect(result!.batchSampleCount).toBe(0)
  })
})

// ── computeHaikuRoutingStats ─────────────────────────────────

describe("computeHaikuRoutingStats", () => {
  it("Haiku 라우팅 호출 수와 비용 집계", () => {
    const records = [
      createRecord({
        routingReason: "haiku_whitelist",
        model: "claude-haiku-4-5-20251001",
        estimatedCostUsd: 0.001,
      }),
      createRecord({
        routingReason: "haiku_whitelist",
        model: "claude-haiku-4-5-20251001",
        estimatedCostUsd: 0.001,
      }),
      createRecord({
        routingReason: "default_model",
        model: "claude-sonnet-4-5-20250929",
        estimatedCostUsd: 0.005,
      }),
    ]

    const stats = computeHaikuRoutingStats(records)

    expect(stats.totalHaikuCalls).toBe(2)
    expect(stats.totalSonnetCalls).toBe(1)
    expect(stats.haikuCostTotal).toBe(0.002) // 0.001 + 0.001 = 0.002
    expect(stats.estimatedSavings).toBeGreaterThan(0)
  })

  it("Haiku 호출 없으면 절감 0", () => {
    const records = [
      createRecord({
        routingReason: "default_model",
        model: "claude-sonnet-4-5-20250929",
        estimatedCostUsd: 0.005,
      }),
    ]

    const stats = computeHaikuRoutingStats(records)
    expect(stats.totalHaikuCalls).toBe(0)
    expect(stats.estimatedSavings).toBe(0)
  })

  it("빈 레코드는 모든 값 0", () => {
    const stats = computeHaikuRoutingStats([])
    expect(stats.totalHaikuCalls).toBe(0)
    expect(stats.totalSonnetCalls).toBe(0)
    expect(stats.haikuCostTotal).toBe(0)
    expect(stats.sonnetCostTotal).toBe(0)
    expect(stats.estimatedSavings).toBe(0)
  })
})

// ── generateAlerts ───────────────────────────────────────────

describe("generateAlerts", () => {
  it("비용 절감이 임계값 이상이면 info 경고 생성", () => {
    const comparisons = [
      {
        callType: "pw:impression",
        modelA: { model: "haiku", avgCost: 0.001, avgDuration: 400, sampleCount: 50 },
        modelB: { model: "sonnet", avgCost: 0.005, avgDuration: 1200, sampleCount: 50 },
        costSavingsPercent: 80,
        durationDiffPercent: 66.7,
        sufficientSamples: true,
      },
    ]

    const alerts = generateAlerts(comparisons, null, {
      comparisonWindowDays: 7,
      minSampleSize: 30,
      qualityDropThreshold: 0.05,
      savingsReportThreshold: 0.1,
    })

    expect(alerts.length).toBeGreaterThanOrEqual(1)
    expect(alerts.some((a) => a.type === "cost_savings")).toBe(true)
  })

  it("샘플 부족 시 경고 생성 안 함", () => {
    const comparisons = [
      {
        callType: "pw:impression",
        modelA: { model: "haiku", avgCost: 0.001, avgDuration: 400, sampleCount: 5 },
        modelB: { model: "sonnet", avgCost: 0.005, avgDuration: 1200, sampleCount: 5 },
        costSavingsPercent: 80,
        durationDiffPercent: 66.7,
        sufficientSamples: false,
      },
    ]

    const alerts = generateAlerts(comparisons, null)
    expect(alerts).toHaveLength(0)
  })

  it("Haiku가 Sonnet보다 느리면 performance_change 경고", () => {
    const comparisons = [
      {
        callType: "pw:impression",
        modelA: { model: "haiku", avgCost: 0.001, avgDuration: 2000, sampleCount: 50 },
        modelB: { model: "sonnet", avgCost: 0.005, avgDuration: 1200, sampleCount: 50 },
        costSavingsPercent: 80,
        durationDiffPercent: -66.7, // Haiku가 더 느림
        sufficientSamples: true,
      },
    ]

    const alerts = generateAlerts(comparisons, null, {
      comparisonWindowDays: 7,
      minSampleSize: 30,
      qualityDropThreshold: 0.05,
      savingsReportThreshold: 0.1,
    })

    expect(alerts.some((a) => a.type === "performance_change")).toBe(true)
  })

  it("배치 비용 절감 경고", () => {
    const batchComparison = {
      batchAvgCost: 0.002,
      batchSampleCount: 50,
      individualAvgCost: 0.005,
      individualSampleCount: 50,
      costSavingsPercent: 60,
      sufficientSamples: true,
    }

    const alerts = generateAlerts([], batchComparison, {
      comparisonWindowDays: 7,
      minSampleSize: 30,
      qualityDropThreshold: 0.05,
      savingsReportThreshold: 0.1,
    })

    expect(alerts.some((a) => a.type === "cost_savings" && a.message.includes("배치"))).toBe(true)
  })
})

// ── generateOptimizationReport ───────────────────────────────

describe("generateOptimizationReport", () => {
  it("빈 레코드로도 보고서 생성 가능", () => {
    const report = generateOptimizationReport([])

    expect(report.period.days).toBe(7)
    expect(report.modelComparisons).toHaveLength(0)
    expect(report.batchComparison).toBeNull()
    expect(report.haikuRoutingStats.totalHaikuCalls).toBe(0)
    expect(report.alerts).toHaveLength(0)
    expect(report.generatedAt).toBeGreaterThan(0)
  })

  it("혼합 레코드로 종합 보고서 생성", () => {
    const records = [
      ...createHaikuRecords(10, "pw:impression"),
      ...createSonnetRecords(10, "pw:impression"),
      createRecord({ batchGroupId: "batch-1", estimatedCostUsd: 0.003 }),
      createRecord({ batchGroupId: null, estimatedCostUsd: 0.005 }),
    ]

    const report = generateOptimizationReport(records, {
      comparisonWindowDays: 7,
      minSampleSize: 3,
      qualityDropThreshold: 0.05,
      savingsReportThreshold: 0.1,
    })

    expect(report.modelComparisons.length).toBeGreaterThanOrEqual(1)
    expect(report.haikuRoutingStats.totalHaikuCalls).toBe(10)
    expect(report.generatedAt).toBeGreaterThan(0)
  })

  it("보고서 기간이 config에 맞게 설정됨", () => {
    const report = generateOptimizationReport([], {
      comparisonWindowDays: 14,
      minSampleSize: 30,
      qualityDropThreshold: 0.05,
      savingsReportThreshold: 0.1,
    })
    expect(report.period.days).toBe(14)
  })
})
