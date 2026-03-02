// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Kill Switch (Phase 6-A)
// 운영 설계서 §10.5 — 긴급 중지 시스템
// ═══════════════════════════════════════════════════════════════

export type PWFeature =
  | "postGeneration"
  | "commentGeneration"
  | "likeInteraction"
  | "followInteraction"
  | "feedAlgorithm"
  | "emotionalContagion"
  | "userInteraction"
  | "onboarding"

export type AutoTriggerType =
  | "INJECTION_SURGE"
  | "PII_LEAK_SURGE"
  | "COLLECTIVE_DRIFT"
  | "COST_OVERRUN"

export interface PWKillSwitchConfig {
  globalFreeze: boolean
  featureToggles: Record<PWFeature, boolean>
  activeTriggers: ActiveTrigger[]
  lastUpdatedAt: Date
}

export interface ActiveTrigger {
  type: AutoTriggerType
  triggeredAt: Date
  reason: string
  affectedFeatures: PWFeature[]
}

// ── 기본 설정 (모두 활성) ─────────────────────────────────────

export function createDefaultConfig(): PWKillSwitchConfig {
  return {
    globalFreeze: false,
    featureToggles: {
      postGeneration: true,
      commentGeneration: true,
      likeInteraction: true,
      followInteraction: true,
      feedAlgorithm: true,
      emotionalContagion: true,
      userInteraction: true,
      onboarding: true,
    },
    activeTriggers: [],
    lastUpdatedAt: new Date(),
  }
}

// ── Auto-Trigger 설정 ────────────────────────────────────────

interface AutoTriggerConfig {
  type: AutoTriggerType
  threshold: number
  window: string
  affectedFeatures: PWFeature[]
}

export const AUTO_TRIGGER_CONFIGS: AutoTriggerConfig[] = [
  {
    type: "INJECTION_SURGE",
    threshold: 10,
    window: "1h",
    affectedFeatures: ["userInteraction"],
  },
  {
    type: "PII_LEAK_SURGE",
    threshold: 5,
    window: "24h",
    affectedFeatures: ["postGeneration"],
  },
  {
    type: "COLLECTIVE_DRIFT",
    threshold: 0.2,
    window: "24h",
    affectedFeatures: [
      "postGeneration",
      "commentGeneration",
      "likeInteraction",
      "followInteraction",
      "emotionalContagion",
      "userInteraction",
    ],
  },
  {
    type: "COST_OVERRUN",
    threshold: 1.5,
    window: "24h",
    affectedFeatures: ["postGeneration", "commentGeneration"],
  },
]

// ── 기능 활성 여부 체크 ──────────────────────────────────────

/**
 * 특정 기능이 활성 상태인지 확인.
 * globalFreeze = true이면 feedAlgorithm 외 모두 비활성.
 */
export function isFeatureEnabled(config: PWKillSwitchConfig, feature: PWFeature): boolean {
  if (config.globalFreeze) {
    // 글로벌 프리즈에서도 피드는 chronological로 허용
    return feature === "feedAlgorithm" ? false : false
  }
  return config.featureToggles[feature]
}

/**
 * 수동 기능 토글.
 */
export function toggleFeature(
  config: PWKillSwitchConfig,
  feature: PWFeature,
  enabled: boolean
): PWKillSwitchConfig {
  return {
    ...config,
    featureToggles: {
      ...config.featureToggles,
      [feature]: enabled,
    },
    lastUpdatedAt: new Date(),
  }
}

/**
 * 글로벌 프리즈 활성화/해제.
 */
export function setGlobalFreeze(
  config: PWKillSwitchConfig,
  freeze: boolean,
  reason?: string
): PWKillSwitchConfig {
  const updated = {
    ...config,
    globalFreeze: freeze,
    lastUpdatedAt: new Date(),
  }

  if (freeze && reason) {
    updated.activeTriggers = [
      ...config.activeTriggers,
      {
        type: "COLLECTIVE_DRIFT" as AutoTriggerType,
        triggeredAt: new Date(),
        reason,
        affectedFeatures: Object.keys(config.featureToggles) as PWFeature[],
      },
    ]
  }

  return updated
}

// ── 자동 트리거 조건 검사 (T284) ────────────────────────────

/**
 * 보안 이벤트 집계 데이터.
 */
export interface SecurityEventStats {
  /** 최근 1시간 BLOCK 횟수 */
  blockCountLastHour: number
  /** 최근 24시간 PII BLOCK 횟수 */
  piiBlockCountLast24h: number
  /** 벡터 이상 페르소나 비율 (0~1) */
  driftPercentage: number
  /** 일 예산 대비 사용 비율 (1.0 = 100%) */
  dailyBudgetUsageRatio: number
}

/**
 * 자동 트리거 조건 4종 검사 (T284).
 *
 * AC2: Injection Surge — 10+ BLOCK/1h → FREEZE_USER_INTERACTION
 * AC3: PII Leak Surge — 5+ PII block/24h → FREEZE_POST_GENERATION
 * AC4: Collective Drift — 20%+ 페르소나 벡터 이상 → GLOBAL_FREEZE
 * AC5: Cost Overrun — 일 예산 150% → FREEZE_POST_AND_COMMENT
 */
export function checkAutoTriggers(
  config: PWKillSwitchConfig,
  stats: SecurityEventStats
): PWKillSwitchConfig {
  let updated = config

  // AC2: Injection Surge — 10+ BLOCK/1h
  if (stats.blockCountLastHour >= 10) {
    const alreadyTriggered = config.activeTriggers.some((t) => t.type === "INJECTION_SURGE")
    if (!alreadyTriggered) {
      updated = applyAutoTrigger(
        updated,
        "INJECTION_SURGE",
        `${stats.blockCountLastHour} blocks in last hour (threshold: 10)`
      )
    }
  }

  // AC3: PII Leak Surge — 5+ PII block/24h
  if (stats.piiBlockCountLast24h >= 5) {
    const alreadyTriggered = config.activeTriggers.some((t) => t.type === "PII_LEAK_SURGE")
    if (!alreadyTriggered) {
      updated = applyAutoTrigger(
        updated,
        "PII_LEAK_SURGE",
        `${stats.piiBlockCountLast24h} PII blocks in last 24h (threshold: 5)`
      )
    }
  }

  // AC4: Collective Drift — 20%+
  if (stats.driftPercentage >= 0.2) {
    const alreadyTriggered = config.activeTriggers.some((t) => t.type === "COLLECTIVE_DRIFT")
    if (!alreadyTriggered) {
      updated = setGlobalFreeze(
        updated,
        true,
        `${(stats.driftPercentage * 100).toFixed(1)}% personas drifted (threshold: 20%)`
      )
    }
  }

  // AC5: Cost Overrun — 일 예산 150%
  if (stats.dailyBudgetUsageRatio >= 1.5) {
    const alreadyTriggered = config.activeTriggers.some((t) => t.type === "COST_OVERRUN")
    if (!alreadyTriggered) {
      updated = applyAutoTrigger(
        updated,
        "COST_OVERRUN",
        `Daily budget usage at ${(stats.dailyBudgetUsageRatio * 100).toFixed(0)}% (threshold: 150%)`
      )
    }
  }

  return updated
}

/**
 * 자동 트리거 발동.
 */
export function applyAutoTrigger(
  config: PWKillSwitchConfig,
  triggerType: AutoTriggerType,
  reason: string
): PWKillSwitchConfig {
  const triggerConfig = AUTO_TRIGGER_CONFIGS.find((t) => t.type === triggerType)
  if (!triggerConfig) return config

  const newToggles = { ...config.featureToggles }
  for (const feature of triggerConfig.affectedFeatures) {
    newToggles[feature] = false
  }

  return {
    ...config,
    featureToggles: newToggles,
    activeTriggers: [
      ...config.activeTriggers,
      {
        type: triggerType,
        triggeredAt: new Date(),
        reason,
        affectedFeatures: triggerConfig.affectedFeatures,
      },
    ],
    lastUpdatedAt: new Date(),
  }
}
