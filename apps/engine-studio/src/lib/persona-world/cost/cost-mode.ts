// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Cost Mode (Phase 8)
// 운영 설계서 §12.7 — 품질 vs 비용 트레이드오프 3종 모드
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type CostMode = "QUALITY" | "BALANCE" | "COST_PRIORITY"

export interface CostModeConfig {
  mode: CostMode
  label: string
  description: string

  frequencies: {
    postsPerDay: number
    commentsPerDay: number
    interviewSampleRate: number // 0.0 ~ 1.0
    arenaFrequency: string // 주기 설명
  }

  estimates: {
    monthlyLlmCostPer100: number // 100 페르소나 기준
    perPersonaMonthly: number
    expectedMinPIS: number
  }
}

// ── 모드 설정 ──────────────────────────────────────────────────

const MODE_CONFIGS: Record<CostMode, CostModeConfig> = {
  QUALITY: {
    mode: "QUALITY",
    label: "품질 우선",
    description: "최대 품질 유지 (런칭 초기 권장)",
    frequencies: {
      postsPerDay: 2,
      commentsPerDay: 5,
      interviewSampleRate: 0.2,
      arenaFrequency: "주 1회",
    },
    estimates: {
      monthlyLlmCostPer100: 190,
      perPersonaMonthly: 2.4,
      expectedMinPIS: 0.85,
    },
  },
  BALANCE: {
    mode: "BALANCE",
    label: "균형",
    description: "품질과 비용의 균형 (PIS 안정 후 권장)",
    frequencies: {
      postsPerDay: 1.5,
      commentsPerDay: 3,
      interviewSampleRate: 0.1,
      arenaFrequency: "격주 1회",
    },
    estimates: {
      monthlyLlmCostPer100: 120,
      perPersonaMonthly: 1.7,
      expectedMinPIS: 0.8,
    },
  },
  COST_PRIORITY: {
    mode: "COST_PRIORITY",
    label: "비용 우선",
    description: "최소 비용 (PIS 리스크 있음)",
    frequencies: {
      postsPerDay: 1,
      commentsPerDay: 2,
      interviewSampleRate: 0.05,
      arenaFrequency: "월 1회",
    },
    estimates: {
      monthlyLlmCostPer100: 70,
      perPersonaMonthly: 1.2,
      expectedMinPIS: 0.75,
    },
  },
}

// ── 모드 조회 ──────────────────────────────────────────────────

/**
 * 비용 모드 설정 조회.
 */
export function getCostModeConfig(mode: CostMode): CostModeConfig {
  return MODE_CONFIGS[mode]
}

/**
 * 모든 모드 설정 조회.
 */
export function getAllCostModes(): CostModeConfig[] {
  return Object.values(MODE_CONFIGS)
}

// ── 모드 적용 ──────────────────────────────────────────────────

export interface CostModeApplication {
  mode: CostMode
  schedulerUpdates: {
    postFrequency: number
    commentFrequency: number
  }
  interviewSampling: number
  arenaFrequency: string
  estimatedBudget: {
    dailyBudget: number
    monthlyBudget: number
  }
}

/**
 * 비용 모드 적용 결과 계산.
 */
export function applyCostMode(mode: CostMode, personaCount: number): CostModeApplication {
  const config = getCostModeConfig(mode)
  const monthlyLlmCost = (config.estimates.monthlyLlmCostPer100 / 100) * personaCount
  const dailyBudget = round(monthlyLlmCost / 30)

  return {
    mode,
    schedulerUpdates: {
      postFrequency: config.frequencies.postsPerDay,
      commentFrequency: config.frequencies.commentsPerDay,
    },
    interviewSampling: config.frequencies.interviewSampleRate,
    arenaFrequency: config.frequencies.arenaFrequency,
    estimatedBudget: {
      dailyBudget: round(dailyBudget),
      monthlyBudget: round(monthlyLlmCost),
    },
  }
}

// ── 비용 추정 ──────────────────────────────────────────────────

export interface CostEstimate {
  mode: CostMode
  personaCount: number
  monthlyLlmCost: number
  monthlyInfra: number
  monthlyTotal: number
  perPersonaCost: number
}

/**
 * 규모별 비용 추정.
 */
export function estimateCost(
  mode: CostMode,
  personaCount: number,
  infraCostBase: number = 50
): CostEstimate {
  const config = getCostModeConfig(mode)
  const monthlyLlmCost = round((config.estimates.monthlyLlmCostPer100 / 100) * personaCount)
  const monthlyInfra = round(infraCostBase + personaCount * 0.1) // 기본 $50 + 페르소나당 $0.1
  const monthlyTotal = round(monthlyLlmCost + monthlyInfra)

  return {
    mode,
    personaCount,
    monthlyLlmCost,
    monthlyInfra,
    monthlyTotal,
    perPersonaCost: personaCount > 0 ? round(monthlyTotal / personaCount) : 0,
  }
}

/**
 * 모드 비교 테이블 생성.
 */
export function compareModes(personaCount: number): CostEstimate[] {
  const modes: CostMode[] = ["QUALITY", "BALANCE", "COST_PRIORITY"]
  return modes.map((mode) => estimateCost(mode, personaCount))
}

// ── 유틸리티 ──────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v * 100) / 100
}
