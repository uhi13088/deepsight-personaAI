// ═══════════════════════════════════════════════════════════════
// 비용 통제 정책
// T62-AC4: LLM 호출 예산, 일일 상한, Zombie GC
// 실제 LlmUsageLog 기반 비용 추적 (고정 단가 추정 → 실사용량)
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma"

// ── 환율 상수 ─────────────────────────────────────────────────

/** USD→KRW 환율 (SystemConfig에서 오버라이드 가능) */
export const DEFAULT_USD_TO_KRW = 1400

// ── 타입 정의 ─────────────────────────────────────────────────

export type ScalePhase = "phase1" | "phase2" | "phase3" | "phase4"

export interface CostPolicy {
  scalePhase: ScalePhase
  maxActivePersonas: number
  dailyGenerationLimit: number
  monthlyBudgetKRW: number
  monthlyBudgetAlarmKRW: number
  modelTier: "economy" | "standard"
}

export interface ZombieDetectionResult {
  personaId: string
  lastExposureDate: Date | null
  lastSelectionDate: Date | null
  daysSinceCreation: number
  daysSinceLastExposure: number
  daysSinceLastSelection: number
  zombieLevel: 0 | 1 | 2 | 3 | 4 // 0=정상, 1=LEGACY, 2=DEPRECATED, 3=ARCHIVED, 4=삭제대상
  recommendedAction: string
}

export interface CostUsage {
  currentMonth: string // "2026-02"
  generationCount: number
  testCount: number
  totalCostKRW: number
  budgetRemaining: number
  budgetUtilization: number // 0.0~1.0
  isOverBudget: boolean
  // 실제 LLM 사용량 (LlmUsageLog 기반)
  totalCostUsd?: number
  totalInputTokens?: number
  totalOutputTokens?: number
  totalCalls?: number
}

/** 일별 실제 LLM 비용 데이터 */
export interface DailyCostEntry {
  date: string // "2026-02-20"
  totalCostUsd: number
  totalCostKRW: number
  totalCalls: number
  totalTokens: number
}

export interface ZombieGCConfig {
  exposureThresholdDays: number // 30일
  selectionThresholdDays: number // 90일
  minAgeForGCDays: number // 60일
  legacyWeeks: number // 4주 연속 시 DEPRECATED
  deprecatedWeeks: number // 12주 연속 시 ARCHIVED
  archiveMonths: number // 6개월 후 삭제
}

// ── 스케일 페이즈별 정책 ──────────────────────────────────────

export interface ScalePhaseConfig {
  phase: ScalePhase
  maxActive: number
  dailyLimit: number
  monthlyBudget: number
  userThreshold: number
}

const SCALE_PHASES: ScalePhaseConfig[] = [
  { phase: "phase1", maxActive: 20, dailyLimit: 10, monthlyBudget: 10000, userThreshold: 0 },
  { phase: "phase2", maxActive: 50, dailyLimit: 30, monthlyBudget: 30000, userThreshold: 1000 },
  { phase: "phase3", maxActive: 100, dailyLimit: 50, monthlyBudget: 50000, userThreshold: 5000 },
  { phase: "phase4", maxActive: 200, dailyLimit: 100, monthlyBudget: 100000, userThreshold: 20000 },
]

export function determineScalePhase(activeUserCount: number): ScalePhase {
  for (let i = SCALE_PHASES.length - 1; i >= 0; i--) {
    if (activeUserCount >= SCALE_PHASES[i].userThreshold) {
      return SCALE_PHASES[i].phase
    }
  }
  return "phase1"
}

export function getCostPolicy(activeUserCount: number): CostPolicy {
  const phase = determineScalePhase(activeUserCount)
  const config = SCALE_PHASES.find((s) => s.phase === phase) ?? SCALE_PHASES[0]

  return {
    scalePhase: phase,
    maxActivePersonas: config.maxActive,
    dailyGenerationLimit: config.dailyLimit,
    monthlyBudgetKRW: config.monthlyBudget,
    monthlyBudgetAlarmKRW: config.monthlyBudget,
    modelTier: "economy",
  }
}

// ── 비용 추적 (실제 LlmUsageLog 기반) ──────────────────────────

/**
 * 이번 달 실제 LLM 사용량을 DB에서 조회하여 CostUsage를 반환.
 * LlmUsageLog 테이블의 실제 토큰 수 / USD 비용을 기반으로 계산.
 */
export async function calculateMonthlyCostFromDB(
  usdToKrw: number = DEFAULT_USD_TO_KRW
): Promise<CostUsage> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const policy = getCostPolicy(0)
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  try {
    const [aggregates, costAgg] = await Promise.all([
      prisma.llmUsageLog.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
        },
        _count: true,
      }),
      prisma.llmUsageLog.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { estimatedCostUsd: true },
      }),
    ])

    const totalCalls = aggregates._count
    const totalCostUsd = Number(costAgg._sum.estimatedCostUsd ?? 0)
    const totalCostKRW = Math.round(totalCostUsd * usdToKrw)
    const totalInputTokens = aggregates._sum.inputTokens ?? 0
    const totalOutputTokens = aggregates._sum.outputTokens ?? 0

    return {
      currentMonth,
      generationCount: totalCalls,
      testCount: 0,
      totalCostKRW,
      budgetRemaining: Math.max(0, policy.monthlyBudgetKRW - totalCostKRW),
      budgetUtilization: policy.monthlyBudgetKRW > 0 ? totalCostKRW / policy.monthlyBudgetKRW : 0,
      isOverBudget: totalCostKRW > policy.monthlyBudgetKRW,
      totalCostUsd,
      totalInputTokens,
      totalOutputTokens,
      totalCalls,
    }
  } catch {
    // DB 미준비 시 빈 데이터 반환
    return {
      currentMonth,
      generationCount: 0,
      testCount: 0,
      totalCostKRW: 0,
      budgetRemaining: policy.monthlyBudgetKRW,
      budgetUtilization: 0,
      isOverBudget: false,
      totalCostUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCalls: 0,
    }
  }
}

/**
 * 최근 N일간 일별 실제 LLM 비용을 DB에서 조회.
 */
export async function getDailyCostsFromDB(
  days: number = 7,
  usdToKrw: number = DEFAULT_USD_TO_KRW
): Promise<DailyCostEntry[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  try {
    // 컬럼명은 Prisma 스키마 필드명과 동일 (camelCase, @map 없음)
    const dailyRaw = await prisma.$queryRaw<
      { date: Date; total_cost: string; total_calls: bigint; total_tokens: bigint }[]
    >`
      SELECT
        DATE("createdAt") as date,
        COALESCE(SUM("estimatedCostUsd"), 0) as total_cost,
        COUNT(*) as total_calls,
        COALESCE(SUM("totalTokens"), 0) as total_tokens
      FROM llm_usage_logs
      WHERE "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `

    return dailyRaw.map((row) => {
      const costUsd = Number(row.total_cost)
      return {
        date: new Date(row.date).toISOString().split("T")[0],
        totalCostUsd: costUsd,
        totalCostKRW: Math.round(costUsd * usdToKrw),
        totalCalls: Number(row.total_calls),
        totalTokens: Number(row.total_tokens),
      }
    })
  } catch {
    return []
  }
}

/**
 * 특정 기간의 실제 LLM 비용 합계를 조회.
 */
export async function getCostForPeriod(
  since: Date,
  until: Date,
  usdToKrw: number = DEFAULT_USD_TO_KRW
): Promise<{ totalCostUsd: number; totalCostKRW: number; totalCalls: number }> {
  try {
    const agg = await prisma.llmUsageLog.aggregate({
      where: { createdAt: { gte: since, lte: until } },
      _sum: { estimatedCostUsd: true },
      _count: true,
    })
    const costUsd = Number(agg._sum.estimatedCostUsd ?? 0)
    return {
      totalCostUsd: costUsd,
      totalCostKRW: Math.round(costUsd * usdToKrw),
      totalCalls: agg._count,
    }
  } catch {
    return { totalCostUsd: 0, totalCostKRW: 0, totalCalls: 0 }
  }
}

/**
 * 동기 계산용 (테스트 / 호환성).
 * 실제 비용이 아닌 전달된 값으로 CostUsage 구성.
 */
export function calculateMonthlyCost(
  generationCount: number,
  testCount: number,
  _modelTier: "economy" | "standard" = "economy"
): CostUsage {
  // 더 이상 고정 단가 추정 X — 전달된 카운트만 구조화
  const policy = getCostPolicy(0)
  const now = new Date()
  return {
    currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    generationCount,
    testCount,
    totalCostKRW: 0,
    budgetRemaining: policy.monthlyBudgetKRW,
    budgetUtilization: 0,
    isOverBudget: false,
  }
}

export function canGenerateMore(
  dailyCount: number,
  monthlyCost: number,
  policy: CostPolicy
): { allowed: boolean; reason?: string } {
  if (dailyCount >= policy.dailyGenerationLimit) {
    return {
      allowed: false,
      reason: `일일 생성 한도 도달: ${dailyCount}/${policy.dailyGenerationLimit}`,
    }
  }
  if (monthlyCost >= policy.monthlyBudgetKRW) {
    return { allowed: false, reason: `월간 예산 초과: ₩${monthlyCost.toLocaleString()}` }
  }
  return { allowed: true }
}

// ── Zombie GC ──────────────────────────────────────────────────

export const DEFAULT_ZOMBIE_GC_CONFIG: ZombieGCConfig = {
  exposureThresholdDays: 30,
  selectionThresholdDays: 90,
  minAgeForGCDays: 60,
  legacyWeeks: 4,
  deprecatedWeeks: 12,
  archiveMonths: 6,
}

export function detectZombie(
  personaId: string,
  createdAt: Date,
  lastExposureDate: Date | null,
  lastSelectionDate: Date | null,
  consecutiveWeeksZombie: number,
  config: ZombieGCConfig = DEFAULT_ZOMBIE_GC_CONFIG
): ZombieDetectionResult {
  const now = new Date()
  const daysSinceCreation = Math.floor(
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  const daysSinceLastExposure = lastExposureDate
    ? Math.floor((now.getTime() - lastExposureDate.getTime()) / (1000 * 60 * 60 * 24))
    : daysSinceCreation
  const daysSinceLastSelection = lastSelectionDate
    ? Math.floor((now.getTime() - lastSelectionDate.getTime()) / (1000 * 60 * 60 * 24))
    : daysSinceCreation

  // Zombie 판정
  const isZombie =
    daysSinceLastExposure >= config.exposureThresholdDays &&
    daysSinceLastSelection >= config.selectionThresholdDays &&
    daysSinceCreation >= config.minAgeForGCDays

  if (!isZombie) {
    return {
      personaId,
      lastExposureDate,
      lastSelectionDate,
      daysSinceCreation,
      daysSinceLastExposure,
      daysSinceLastSelection,
      zombieLevel: 0,
      recommendedAction: "정상 — 조치 불필요",
    }
  }

  // Zombie 레벨 결정 (연속 주 기반)
  let zombieLevel: 0 | 1 | 2 | 3 | 4 = 1
  let recommendedAction = "ACTIVE → LEGACY 전환 (관리자 알림)"

  if (consecutiveWeeksZombie >= config.deprecatedWeeks) {
    const monthsSinceDeprecated = (consecutiveWeeksZombie - config.deprecatedWeeks) / 4
    if (monthsSinceDeprecated >= config.archiveMonths) {
      zombieLevel = 4
      recommendedAction = "ARCHIVED → 영구 삭제"
    } else {
      zombieLevel = 3
      recommendedAction = "DEPRECATED → ARCHIVED (벡터 인덱스 제거)"
    }
  } else if (consecutiveWeeksZombie >= config.legacyWeeks) {
    zombieLevel = 2
    recommendedAction = "LEGACY → DEPRECATED"
  }

  return {
    personaId,
    lastExposureDate,
    lastSelectionDate,
    daysSinceCreation,
    daysSinceLastExposure,
    daysSinceLastSelection,
    zombieLevel,
    recommendedAction,
  }
}

// ── Zombie 배치 스캔 ──────────────────────────────────────────

export function runZombieGCScan(
  personas: Array<{
    id: string
    createdAt: Date
    lastExposureDate: Date | null
    lastSelectionDate: Date | null
    consecutiveWeeksZombie: number
  }>,
  config: ZombieGCConfig = DEFAULT_ZOMBIE_GC_CONFIG
): {
  total: number
  zombies: ZombieDetectionResult[]
  byLevel: Record<number, number>
} {
  const zombies: ZombieDetectionResult[] = []
  const byLevel: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }

  for (const p of personas) {
    const result = detectZombie(
      p.id,
      p.createdAt,
      p.lastExposureDate,
      p.lastSelectionDate,
      p.consecutiveWeeksZombie,
      config
    )
    if (result.zombieLevel > 0) {
      zombies.push(result)
    }
    byLevel[result.zombieLevel] = (byLevel[result.zombieLevel] ?? 0) + 1
  }

  return { total: personas.length, zombies, byLevel }
}
