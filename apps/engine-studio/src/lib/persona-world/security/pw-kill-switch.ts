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
