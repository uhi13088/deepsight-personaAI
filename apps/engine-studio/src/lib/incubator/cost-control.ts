// ═══════════════════════════════════════════════════════════════
// 비용 통제 정책
// T62-AC4: LLM 호출 예산, 일일 상한, Zombie GC
// ═══════════════════════════════════════════════════════════════

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

// ── 비용 추적 ──────────────────────────────────────────────────

const UNIT_COST_KRW = {
  economy: { generation: 5, test: 2 },
  standard: { generation: 25, test: 10 },
} as const

export function calculateMonthlyCost(
  generationCount: number,
  testCount: number,
  modelTier: "economy" | "standard" = "economy"
): CostUsage {
  const costs = UNIT_COST_KRW[modelTier]
  const totalCost = generationCount * costs.generation + testCount * costs.test
  const policy = getCostPolicy(0) // 현재 정책 기준

  const now = new Date()
  return {
    currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    generationCount,
    testCount,
    totalCostKRW: totalCost,
    budgetRemaining: Math.max(0, policy.monthlyBudgetKRW - totalCost),
    budgetUtilization: policy.monthlyBudgetKRW > 0 ? totalCost / policy.monthlyBudgetKRW : 0,
    isOverBudget: totalCost > policy.monthlyBudgetKRW,
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
