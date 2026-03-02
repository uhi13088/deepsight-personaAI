// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.1 — Optimization Monitor (T330)
// A/B 품질 모니터링 자동화 — llmUsageLog 기반 자동 집계
// Haiku vs Sonnet, 배치 vs 개별 품질 자동 비교
// ═══════════════════════════════════════════════════════════════

import { DEFAULT_AB_MONITOR_CONFIG } from "@/lib/global-config/optimization-config"
import type { ABMonitorConfig } from "@/lib/global-config/optimization-config"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface LLMUsageRecord {
  callType: string
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  durationMs: number
  routingReason: string | null
  batchGroupId: string | null
  isRegenerated: boolean
  createdAt: Date
}

export interface ModelComparisonResult {
  callType: string
  modelA: { model: string; avgCost: number; avgDuration: number; sampleCount: number }
  modelB: { model: string; avgCost: number; avgDuration: number; sampleCount: number }
  costSavingsPercent: number
  durationDiffPercent: number
  sufficientSamples: boolean
}

export interface BatchComparisonResult {
  batchAvgCost: number
  batchSampleCount: number
  individualAvgCost: number
  individualSampleCount: number
  costSavingsPercent: number
  sufficientSamples: boolean
}

export interface OptimizationAlert {
  type: "quality_drop" | "cost_savings" | "performance_change"
  severity: "info" | "warning" | "critical"
  message: string
  details: Record<string, string | number | boolean>
  timestamp: number
}

export interface OptimizationReport {
  period: { startDate: string; endDate: string; days: number }
  modelComparisons: ModelComparisonResult[]
  batchComparison: BatchComparisonResult | null
  haikuRoutingStats: {
    totalHaikuCalls: number
    totalSonnetCalls: number
    haikuCostTotal: number
    sonnetCostTotal: number
    estimatedSavings: number
  }
  alerts: OptimizationAlert[]
  generatedAt: number
}

// ── 모델 비교 분석 ────────────────────────────────────────────

/**
 * callType별로 Haiku vs Sonnet 비용/성능 비교.
 */
export function compareModelsByCallType(
  records: LLMUsageRecord[],
  config: ABMonitorConfig = DEFAULT_AB_MONITOR_CONFIG
): ModelComparisonResult[] {
  // callType별 그룹핑
  const byCallType = groupBy(records, (r) => r.callType)
  const results: ModelComparisonResult[] = []

  for (const [callType, typeRecords] of Object.entries(byCallType)) {
    const haikuRecords = typeRecords.filter((r) => r.model.includes("haiku"))
    const sonnetRecords = typeRecords.filter((r) => r.model.includes("sonnet"))

    if (haikuRecords.length === 0 || sonnetRecords.length === 0) continue

    const haikuStats = computeStats(haikuRecords)
    const sonnetStats = computeStats(sonnetRecords)

    const costSavings =
      sonnetStats.avgCost > 0
        ? ((sonnetStats.avgCost - haikuStats.avgCost) / sonnetStats.avgCost) * 100
        : 0

    const durationDiff =
      sonnetStats.avgDuration > 0
        ? ((sonnetStats.avgDuration - haikuStats.avgDuration) / sonnetStats.avgDuration) * 100
        : 0

    results.push({
      callType,
      modelA: {
        model: "haiku",
        avgCost: haikuStats.avgCost,
        avgDuration: haikuStats.avgDuration,
        sampleCount: haikuRecords.length,
      },
      modelB: {
        model: "sonnet",
        avgCost: sonnetStats.avgCost,
        avgDuration: sonnetStats.avgDuration,
        sampleCount: sonnetRecords.length,
      },
      costSavingsPercent: round(costSavings),
      durationDiffPercent: round(durationDiff),
      sufficientSamples:
        haikuRecords.length >= config.minSampleSize && sonnetRecords.length >= config.minSampleSize,
    })
  }

  return results
}

// ── 배치 vs 개별 비교 ─────────────────────────────────────────

/**
 * 배치 생성 vs 개별 생성 비용 비교.
 */
export function compareBatchVsIndividual(
  records: LLMUsageRecord[],
  config: ABMonitorConfig = DEFAULT_AB_MONITOR_CONFIG
): BatchComparisonResult | null {
  const batchRecords = records.filter((r) => r.batchGroupId !== null)
  const individualRecords = records.filter(
    (r) => r.batchGroupId === null && r.callType === "pw:comment"
  )

  if (batchRecords.length === 0 && individualRecords.length === 0) return null

  const batchStats = computeStats(batchRecords)
  const individualStats = computeStats(individualRecords)

  const costSavings =
    individualStats.avgCost > 0
      ? ((individualStats.avgCost - batchStats.avgCost) / individualStats.avgCost) * 100
      : 0

  return {
    batchAvgCost: batchStats.avgCost,
    batchSampleCount: batchRecords.length,
    individualAvgCost: individualStats.avgCost,
    individualSampleCount: individualRecords.length,
    costSavingsPercent: round(costSavings),
    sufficientSamples:
      batchRecords.length >= config.minSampleSize &&
      individualRecords.length >= config.minSampleSize,
  }
}

// ── Haiku 라우팅 통계 ─────────────────────────────────────────

/**
 * Haiku 자동 라우팅 통계 집계.
 */
export function computeHaikuRoutingStats(records: LLMUsageRecord[]): {
  totalHaikuCalls: number
  totalSonnetCalls: number
  haikuCostTotal: number
  sonnetCostTotal: number
  estimatedSavings: number
} {
  const haikuRecords = records.filter((r) => r.routingReason === "haiku_whitelist")
  const sonnetRecords = records.filter(
    (r) => r.routingReason !== "haiku_whitelist" && r.model.includes("sonnet")
  )

  const haikuCost = haikuRecords.reduce((sum, r) => sum + r.estimatedCostUsd, 0)
  const sonnetCost = sonnetRecords.reduce((sum, r) => sum + r.estimatedCostUsd, 0)

  // Haiku 호출이 Sonnet이었다면의 추정 비용 (Sonnet/Haiku 가격 비율 ≈ 3.75x)
  const SONNET_HAIKU_RATIO = 3.75
  const haikuAsSonnetCost = haikuCost * SONNET_HAIKU_RATIO
  const estimatedSavings = haikuAsSonnetCost - haikuCost

  return {
    totalHaikuCalls: haikuRecords.length,
    totalSonnetCalls: sonnetRecords.length,
    haikuCostTotal: roundCost(haikuCost),
    sonnetCostTotal: roundCost(sonnetCost),
    estimatedSavings: roundCost(Math.max(0, estimatedSavings)),
  }
}

// ── 자동 경고 생성 ────────────────────────────────────────────

/**
 * 최적화 데이터를 분석하고 자동 경고 생성.
 * 수동 개입 없이 자동 실행.
 */
export function generateAlerts(
  modelComparisons: ModelComparisonResult[],
  batchComparison: BatchComparisonResult | null,
  config: ABMonitorConfig = DEFAULT_AB_MONITOR_CONFIG
): OptimizationAlert[] {
  const alerts: OptimizationAlert[] = []
  const now = Date.now()

  // 모델 비교 경고
  for (const comparison of modelComparisons) {
    if (!comparison.sufficientSamples) continue

    // Haiku가 유의미하게 비용 절감
    if (comparison.costSavingsPercent >= config.savingsReportThreshold * 100) {
      alerts.push({
        type: "cost_savings",
        severity: "info",
        message: `${comparison.callType}: Haiku 라우팅으로 ${comparison.costSavingsPercent.toFixed(1)}% 비용 절감`,
        details: {
          callType: comparison.callType,
          savingsPercent: comparison.costSavingsPercent,
          haikuSamples: comparison.modelA.sampleCount,
          sonnetSamples: comparison.modelB.sampleCount,
        },
        timestamp: now,
      })
    }

    // 성능 저하 경고 (Haiku가 Sonnet보다 느린 경우는 비정상)
    if (comparison.durationDiffPercent < -20) {
      alerts.push({
        type: "performance_change",
        severity: "warning",
        message: `${comparison.callType}: Haiku가 Sonnet보다 ${Math.abs(comparison.durationDiffPercent).toFixed(1)}% 느림`,
        details: {
          callType: comparison.callType,
          haikuAvgMs: comparison.modelA.avgDuration,
          sonnetAvgMs: comparison.modelB.avgDuration,
        },
        timestamp: now,
      })
    }
  }

  // 배치 비교 경고
  if (batchComparison?.sufficientSamples) {
    if (batchComparison.costSavingsPercent >= config.savingsReportThreshold * 100) {
      alerts.push({
        type: "cost_savings",
        severity: "info",
        message: `배치 댓글 생성으로 ${batchComparison.costSavingsPercent.toFixed(1)}% 비용 절감`,
        details: {
          batchSamples: batchComparison.batchSampleCount,
          individualSamples: batchComparison.individualSampleCount,
          savingsPercent: batchComparison.costSavingsPercent,
        },
        timestamp: now,
      })
    }
  }

  return alerts
}

// ── 종합 보고서 생성 ──────────────────────────────────────────

/**
 * 최적화 보고서 자동 생성.
 * 주기적으로 실행되어 대시보드에 표시.
 */
export function generateOptimizationReport(
  records: LLMUsageRecord[],
  config: ABMonitorConfig = DEFAULT_AB_MONITOR_CONFIG
): OptimizationReport {
  const now = Date.now()
  const windowMs = config.comparisonWindowDays * 24 * 60 * 60 * 1000
  const startDate = new Date(now - windowMs)
  const endDate = new Date(now)

  // 기간 내 레코드 필터링
  const periodRecords = records.filter(
    (r) => r.createdAt.getTime() >= startDate.getTime() && r.createdAt.getTime() <= now
  )

  const modelComparisons = compareModelsByCallType(periodRecords, config)
  const batchComparison = compareBatchVsIndividual(periodRecords, config)
  const haikuStats = computeHaikuRoutingStats(periodRecords)
  const alerts = generateAlerts(modelComparisons, batchComparison, config)

  return {
    period: {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      days: config.comparisonWindowDays,
    },
    modelComparisons,
    batchComparison,
    haikuRoutingStats: haikuStats,
    alerts,
    generatedAt: now,
  }
}

// ── 유틸리티 ─────────────────────────────────────────────────

function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {}
  for (const item of array) {
    const key = keyFn(item)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return groups
}

function computeStats(records: LLMUsageRecord[]): {
  avgCost: number
  avgDuration: number
} {
  if (records.length === 0) return { avgCost: 0, avgDuration: 0 }
  const totalCost = records.reduce((sum, r) => sum + r.estimatedCostUsd, 0)
  const totalDuration = records.reduce((sum, r) => sum + r.durationMs, 0)
  return {
    avgCost: roundCost(totalCost / records.length),
    avgDuration: round(totalDuration / records.length),
  }
}

/** 일반 숫자 반올림 (소수점 2자리) */
function round(v: number): number {
  return Math.round(v * 100) / 100
}

/** 비용 반올림 (소수점 6자리 — USD 마이크로 단위 보존) */
function roundCost(v: number): number {
  return Math.round(v * 1_000_000) / 1_000_000
}
