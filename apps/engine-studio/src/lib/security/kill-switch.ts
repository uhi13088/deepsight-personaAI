// ═══════════════════════════════════════════════════════════════
// Kill Switch + SystemSafetyConfig
// T141: 문제 발생 시 즉시 OFF 인프라 + 기능별 토글
// ═══════════════════════════════════════════════════════════════

// ── 타입 ──────────────────────────────────────────────────────

/** v4.0 기능 키 */
export type SafetyFeatureKey =
  | "diffusion"
  | "reflection"
  | "emotionalContagion"
  | "arena"
  | "evolution"
  | "autonomousPosting"

/** 기능별 토글 상태 */
export interface FeatureToggle {
  key: SafetyFeatureKey
  enabled: boolean
  /** 비활성화 사유 */
  disabledReason?: string
  /** 비활성화 시점 */
  disabledAt?: number
}

/** 시스템 안전 설정 */
export interface SystemSafetyConfig {
  /** 긴급 동결: 모든 페르소나 활동 중지 */
  emergencyFreeze: boolean
  /** 동결 사유 */
  freezeReason?: string
  /** 동결 시점 */
  freezeAt?: number
  /** 기능별 토글 */
  featureToggles: Record<SafetyFeatureKey, FeatureToggle>
  /** 자동 트리거 설정 */
  autoTriggers: AutoTriggerConfig
  /** 마지막 업데이트 */
  updatedAt: number
  /** 업데이트한 사람 */
  updatedBy: string
}

/** 자동 트리거 설정 */
export interface AutoTriggerConfig {
  /** 격리 건수 임계값 (10분 내) */
  quarantineThreshold: number
  /** 격리 시간 윈도우 (ms) */
  quarantineWindowMs: number
  /** 집단 mood 경고 임계값 */
  collectiveMoodWarning: number
  /** L1 드리프트 critical 비율 임계값 (전체 페르소나 중 %) */
  driftCriticalRatio: number
  /** L1 드리프트 critical 임계값 */
  driftCriticalThreshold: number
}

/** 자동 트리거 평가 결과 */
export type TriggerAction = "none" | "warning" | "freeze"

export interface AutoTriggerResult {
  action: TriggerAction
  reason: string
  triggeredAt: number
}

// ── 상수 ──────────────────────────────────────────────────────

/** 기본 자동 트리거 설정 */
export const DEFAULT_AUTO_TRIGGERS: AutoTriggerConfig = {
  quarantineThreshold: 50,
  quarantineWindowMs: 10 * 60 * 1000, // 10분
  collectiveMoodWarning: 0.2,
  driftCriticalRatio: 0.2, // 20%
  driftCriticalThreshold: 0.7,
} as const

/** 기본 기능 토글 (v4.0 초기) */
export const DEFAULT_FEATURE_TOGGLES: Record<SafetyFeatureKey, FeatureToggle> = {
  diffusion: { key: "diffusion", enabled: false, disabledReason: "v4.2 예정" },
  reflection: { key: "reflection", enabled: false, disabledReason: "v4.1 예정" },
  emotionalContagion: {
    key: "emotionalContagion",
    enabled: false,
    disabledReason: "v4.2 예정",
  },
  arena: { key: "arena", enabled: true },
  evolution: { key: "evolution", enabled: true },
  autonomousPosting: { key: "autonomousPosting", enabled: true },
} as const

// ── AC1: SystemSafetyConfig 생성/관리 ───────────────────────

/** 기본 SystemSafetyConfig 생성 */
export function createDefaultConfig(updatedBy: string): SystemSafetyConfig {
  return {
    emergencyFreeze: false,
    featureToggles: { ...DEFAULT_FEATURE_TOGGLES },
    autoTriggers: { ...DEFAULT_AUTO_TRIGGERS },
    updatedAt: Date.now(),
    updatedBy,
  }
}

/** 긴급 동결 활성화 */
export function activateEmergencyFreeze(
  config: SystemSafetyConfig,
  reason: string,
  updatedBy: string
): SystemSafetyConfig {
  return {
    ...config,
    emergencyFreeze: true,
    freezeReason: reason,
    freezeAt: Date.now(),
    updatedAt: Date.now(),
    updatedBy,
  }
}

/** 긴급 동결 해제 */
export function deactivateEmergencyFreeze(
  config: SystemSafetyConfig,
  updatedBy: string
): SystemSafetyConfig {
  return {
    ...config,
    emergencyFreeze: false,
    freezeReason: undefined,
    freezeAt: undefined,
    updatedAt: Date.now(),
    updatedBy,
  }
}

// ── AC2: 기능별 토글 ────────────────────────────────────────

/** 특정 기능 활성화 */
export function enableFeature(
  config: SystemSafetyConfig,
  feature: SafetyFeatureKey,
  updatedBy: string
): SystemSafetyConfig {
  return {
    ...config,
    featureToggles: {
      ...config.featureToggles,
      [feature]: {
        key: feature,
        enabled: true,
        disabledReason: undefined,
        disabledAt: undefined,
      },
    },
    updatedAt: Date.now(),
    updatedBy,
  }
}

/** 특정 기능 비활성화 */
export function disableFeature(
  config: SystemSafetyConfig,
  feature: SafetyFeatureKey,
  reason: string,
  updatedBy: string
): SystemSafetyConfig {
  return {
    ...config,
    featureToggles: {
      ...config.featureToggles,
      [feature]: {
        key: feature,
        enabled: false,
        disabledReason: reason,
        disabledAt: Date.now(),
      },
    },
    updatedAt: Date.now(),
    updatedBy,
  }
}

/** 기능이 사용 가능한지 확인 (동결 + 토글 모두 확인) */
export function isFeatureEnabled(config: SystemSafetyConfig, feature: SafetyFeatureKey): boolean {
  if (config.emergencyFreeze) return false
  return config.featureToggles[feature]?.enabled ?? false
}

/** 현재 활성화된 기능 목록 */
export function getEnabledFeatures(config: SystemSafetyConfig): SafetyFeatureKey[] {
  if (config.emergencyFreeze) return []
  return (Object.keys(config.featureToggles) as SafetyFeatureKey[]).filter(
    (key) => config.featureToggles[key].enabled
  )
}

// ── AC3: 자동 트리거 ────────────────────────────────────────

/** 격리 건수 기반 자동 트리거 평가 */
export function evaluateQuarantineTrigger(
  quarantineTimestamps: number[],
  config: AutoTriggerConfig,
  now?: number
): AutoTriggerResult {
  const currentTime = now ?? Date.now()
  const windowStart = currentTime - config.quarantineWindowMs
  const recentCount = quarantineTimestamps.filter((t) => t >= windowStart).length

  if (recentCount >= config.quarantineThreshold) {
    return {
      action: "freeze",
      reason: `격리 ${recentCount}건/${config.quarantineWindowMs / 60000}분 (임계값: ${config.quarantineThreshold})`,
      triggeredAt: currentTime,
    }
  }

  // 50% 도달 시 경고
  if (recentCount >= config.quarantineThreshold * 0.5) {
    return {
      action: "warning",
      reason: `격리 ${recentCount}건/${config.quarantineWindowMs / 60000}분 (임계값의 50% 초과)`,
      triggeredAt: currentTime,
    }
  }

  return { action: "none", reason: "", triggeredAt: currentTime }
}

/** 집단 mood 기반 자동 트리거 평가 */
export function evaluateMoodTrigger(
  averageMood: number,
  config: AutoTriggerConfig
): AutoTriggerResult {
  if (averageMood <= config.collectiveMoodWarning) {
    return {
      action: "warning",
      reason: `집단 mood ${averageMood.toFixed(3)} ≤ ${config.collectiveMoodWarning}`,
      triggeredAt: Date.now(),
    }
  }

  return { action: "none", reason: "", triggeredAt: Date.now() }
}

/** L1 드리프트 기반 자동 트리거 평가 */
export function evaluateDriftTrigger(
  driftSimilarities: number[],
  config: AutoTriggerConfig
): AutoTriggerResult {
  if (driftSimilarities.length === 0) {
    return { action: "none", reason: "", triggeredAt: Date.now() }
  }

  const criticalCount = driftSimilarities.filter((s) => s <= config.driftCriticalThreshold).length
  const criticalRatio = criticalCount / driftSimilarities.length

  if (criticalRatio >= config.driftCriticalRatio) {
    return {
      action: "freeze",
      reason: `L1 드리프트 critical ${(criticalRatio * 100).toFixed(1)}% (임계값: ${config.driftCriticalRatio * 100}%)`,
      triggeredAt: Date.now(),
    }
  }

  if (criticalCount > 0) {
    return {
      action: "warning",
      reason: `L1 드리프트 critical ${criticalCount}건 감지`,
      triggeredAt: Date.now(),
    }
  }

  return { action: "none", reason: "", triggeredAt: Date.now() }
}

/** 모든 자동 트리거 통합 평가 */
export function evaluateAllTriggers(params: {
  quarantineTimestamps: number[]
  averageMood: number
  driftSimilarities: number[]
  config: AutoTriggerConfig
}): {
  shouldFreeze: boolean
  warnings: string[]
  triggers: AutoTriggerResult[]
} {
  const triggers: AutoTriggerResult[] = []
  const warnings: string[] = []
  let shouldFreeze = false

  // 격리 건수
  const quarantineResult = evaluateQuarantineTrigger(params.quarantineTimestamps, params.config)
  triggers.push(quarantineResult)
  if (quarantineResult.action === "freeze") shouldFreeze = true
  if (quarantineResult.action === "warning") warnings.push(quarantineResult.reason)

  // 집단 mood
  const moodResult = evaluateMoodTrigger(params.averageMood, params.config)
  triggers.push(moodResult)
  if (moodResult.action === "warning") warnings.push(moodResult.reason)

  // L1 드리프트
  const driftResult = evaluateDriftTrigger(params.driftSimilarities, params.config)
  triggers.push(driftResult)
  if (driftResult.action === "freeze") shouldFreeze = true
  if (driftResult.action === "warning") warnings.push(driftResult.reason)

  return { shouldFreeze, warnings, triggers }
}
