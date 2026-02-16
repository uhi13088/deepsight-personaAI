import { describe, it, expect } from "vitest"
import {
  createDefaultConfig,
  activateEmergencyFreeze,
  deactivateEmergencyFreeze,
  enableFeature,
  disableFeature,
  isFeatureEnabled,
  getEnabledFeatures,
  evaluateQuarantineTrigger,
  evaluateMoodTrigger,
  evaluateDriftTrigger,
  evaluateAllTriggers,
  DEFAULT_AUTO_TRIGGERS,
  DEFAULT_FEATURE_TOGGLES,
} from "@/lib/security/kill-switch"
import type { SystemSafetyConfig } from "@/lib/security/kill-switch"

// ═══════════════════════════════════════════════════════════════
// createDefaultConfig
// ═══════════════════════════════════════════════════════════════

describe("createDefaultConfig", () => {
  it("기본 설정 생성", () => {
    const config = createDefaultConfig("admin")
    expect(config.emergencyFreeze).toBe(false)
    expect(config.updatedBy).toBe("admin")
    expect(config.featureToggles).toBeDefined()
    expect(config.autoTriggers).toBeDefined()
  })

  it("기본 토글: diffusion=off, arena=on", () => {
    const config = createDefaultConfig("admin")
    expect(config.featureToggles.diffusion.enabled).toBe(false)
    expect(config.featureToggles.reflection.enabled).toBe(false)
    expect(config.featureToggles.emotionalContagion.enabled).toBe(false)
    expect(config.featureToggles.arena.enabled).toBe(true)
  })

  it("기본 자동 트리거 설정", () => {
    const config = createDefaultConfig("admin")
    expect(config.autoTriggers.quarantineThreshold).toBe(50)
    expect(config.autoTriggers.collectiveMoodWarning).toBe(0.2)
    expect(config.autoTriggers.driftCriticalRatio).toBe(0.2)
  })
})

// ═══════════════════════════════════════════════════════════════
// Emergency Freeze
// ═══════════════════════════════════════════════════════════════

describe("Emergency Freeze", () => {
  it("긴급 동결 활성화", () => {
    const config = createDefaultConfig("admin")
    const frozen = activateEmergencyFreeze(config, "보안 위협", "admin")
    expect(frozen.emergencyFreeze).toBe(true)
    expect(frozen.freezeReason).toBe("보안 위협")
    expect(frozen.freezeAt).toBeDefined()
  })

  it("긴급 동결 해제", () => {
    const config = createDefaultConfig("admin")
    const frozen = activateEmergencyFreeze(config, "테스트", "admin")
    const unfrozen = deactivateEmergencyFreeze(frozen, "admin")
    expect(unfrozen.emergencyFreeze).toBe(false)
    expect(unfrozen.freezeReason).toBeUndefined()
    expect(unfrozen.freezeAt).toBeUndefined()
  })

  it("원본 config 불변", () => {
    const config = createDefaultConfig("admin")
    activateEmergencyFreeze(config, "테스트", "admin")
    expect(config.emergencyFreeze).toBe(false)
  })

  it("updatedBy 기록", () => {
    const config = createDefaultConfig("admin")
    const frozen = activateEmergencyFreeze(config, "위협", "security-bot")
    expect(frozen.updatedBy).toBe("security-bot")
  })
})

// ═══════════════════════════════════════════════════════════════
// Feature Toggles
// ═══════════════════════════════════════════════════════════════

describe("Feature Toggles", () => {
  it("기능 활성화", () => {
    const config = createDefaultConfig("admin")
    const updated = enableFeature(config, "diffusion", "admin")
    expect(updated.featureToggles.diffusion.enabled).toBe(true)
  })

  it("기능 비활성화 + 사유 기록", () => {
    const config = createDefaultConfig("admin")
    const enabled = enableFeature(config, "diffusion", "admin")
    const disabled = disableFeature(enabled, "diffusion", "안정성 문제", "admin")
    expect(disabled.featureToggles.diffusion.enabled).toBe(false)
    expect(disabled.featureToggles.diffusion.disabledReason).toBe("안정성 문제")
    expect(disabled.featureToggles.diffusion.disabledAt).toBeDefined()
  })

  it("다른 기능은 영향 없음", () => {
    const config = createDefaultConfig("admin")
    const updated = enableFeature(config, "diffusion", "admin")
    expect(updated.featureToggles.arena.enabled).toBe(true)
    expect(updated.featureToggles.reflection.enabled).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// isFeatureEnabled
// ═══════════════════════════════════════════════════════════════

describe("isFeatureEnabled", () => {
  it("활성화된 기능 → true", () => {
    const config = createDefaultConfig("admin")
    expect(isFeatureEnabled(config, "arena")).toBe(true)
  })

  it("비활성화된 기능 → false", () => {
    const config = createDefaultConfig("admin")
    expect(isFeatureEnabled(config, "diffusion")).toBe(false)
  })

  it("긴급 동결 시 모든 기능 → false", () => {
    const config = createDefaultConfig("admin")
    const frozen = activateEmergencyFreeze(config, "테스트", "admin")
    expect(isFeatureEnabled(frozen, "arena")).toBe(false)
    expect(isFeatureEnabled(frozen, "evolution")).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// getEnabledFeatures
// ═══════════════════════════════════════════════════════════════

describe("getEnabledFeatures", () => {
  it("기본 활성 기능 목록", () => {
    const config = createDefaultConfig("admin")
    const enabled = getEnabledFeatures(config)
    expect(enabled).toContain("arena")
    expect(enabled).toContain("evolution")
    expect(enabled).toContain("autonomousPosting")
    expect(enabled).not.toContain("diffusion")
    expect(enabled).not.toContain("reflection")
  })

  it("긴급 동결 시 빈 목록", () => {
    const config = createDefaultConfig("admin")
    const frozen = activateEmergencyFreeze(config, "테스트", "admin")
    expect(getEnabledFeatures(frozen)).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// evaluateQuarantineTrigger
// ═══════════════════════════════════════════════════════════════

describe("evaluateQuarantineTrigger", () => {
  const config = DEFAULT_AUTO_TRIGGERS
  const now = Date.now()

  it("격리 0건 → none", () => {
    const result = evaluateQuarantineTrigger([], config, now)
    expect(result.action).toBe("none")
  })

  it("격리 50건/10분 → freeze", () => {
    const timestamps = Array.from({ length: 50 }, (_, i) => now - i * 1000)
    const result = evaluateQuarantineTrigger(timestamps, config, now)
    expect(result.action).toBe("freeze")
  })

  it("격리 25건/10분 → warning (50%)", () => {
    const timestamps = Array.from({ length: 25 }, (_, i) => now - i * 1000)
    const result = evaluateQuarantineTrigger(timestamps, config, now)
    expect(result.action).toBe("warning")
  })

  it("격리 10건/10분 → none (20%)", () => {
    const timestamps = Array.from({ length: 10 }, (_, i) => now - i * 1000)
    const result = evaluateQuarantineTrigger(timestamps, config, now)
    expect(result.action).toBe("none")
  })

  it("윈도우 외 격리는 무시", () => {
    const oldTimestamps = Array.from(
      { length: 100 },
      (_, i) => now - 20 * 60 * 1000 - i * 1000 // 20분 전
    )
    const result = evaluateQuarantineTrigger(oldTimestamps, config, now)
    expect(result.action).toBe("none")
  })
})

// ═══════════════════════════════════════════════════════════════
// evaluateMoodTrigger
// ═══════════════════════════════════════════════════════════════

describe("evaluateMoodTrigger", () => {
  const config = DEFAULT_AUTO_TRIGGERS

  it("mood 0.5 → none", () => {
    const result = evaluateMoodTrigger(0.5, config)
    expect(result.action).toBe("none")
  })

  it("mood 0.2 → warning", () => {
    const result = evaluateMoodTrigger(0.2, config)
    expect(result.action).toBe("warning")
  })

  it("mood 0.1 → warning", () => {
    const result = evaluateMoodTrigger(0.1, config)
    expect(result.action).toBe("warning")
  })

  it("mood 0.21 → none (경계 바로 위)", () => {
    const result = evaluateMoodTrigger(0.21, config)
    expect(result.action).toBe("none")
  })
})

// ═══════════════════════════════════════════════════════════════
// evaluateDriftTrigger
// ═══════════════════════════════════════════════════════════════

describe("evaluateDriftTrigger", () => {
  const config = DEFAULT_AUTO_TRIGGERS

  it("빈 배열 → none", () => {
    const result = evaluateDriftTrigger([], config)
    expect(result.action).toBe("none")
  })

  it("모두 정상 → none", () => {
    const result = evaluateDriftTrigger([0.9, 0.85, 0.95], config)
    expect(result.action).toBe("none")
  })

  it("20% 이상 critical → freeze", () => {
    // 5개 중 1개 = 20%
    const result = evaluateDriftTrigger([0.6, 0.9, 0.9, 0.9, 0.9], config)
    expect(result.action).toBe("freeze")
  })

  it("critical 1건 but < 20% → warning", () => {
    // 10개 중 1개 = 10%
    const sims = [0.5, ...Array(9).fill(0.9)]
    const result = evaluateDriftTrigger(sims, config)
    expect(result.action).toBe("warning")
  })

  it("모두 critical → freeze", () => {
    const result = evaluateDriftTrigger([0.5, 0.4, 0.3], config)
    expect(result.action).toBe("freeze")
  })
})

// ═══════════════════════════════════════════════════════════════
// evaluateAllTriggers
// ═══════════════════════════════════════════════════════════════

describe("evaluateAllTriggers", () => {
  const config = DEFAULT_AUTO_TRIGGERS
  const now = Date.now()

  it("모든 지표 정상 → shouldFreeze=false", () => {
    const result = evaluateAllTriggers({
      quarantineTimestamps: [],
      averageMood: 0.5,
      driftSimilarities: [0.9, 0.95],
      config,
    })
    expect(result.shouldFreeze).toBe(false)
    expect(result.warnings).toHaveLength(0)
  })

  it("격리 초과 → shouldFreeze=true", () => {
    const timestamps = Array.from({ length: 50 }, (_, i) => now - i * 1000)
    const result = evaluateAllTriggers({
      quarantineTimestamps: timestamps,
      averageMood: 0.5,
      driftSimilarities: [0.9],
      config,
    })
    expect(result.shouldFreeze).toBe(true)
  })

  it("mood 경고 → warnings에 포함", () => {
    const result = evaluateAllTriggers({
      quarantineTimestamps: [],
      averageMood: 0.15,
      driftSimilarities: [0.9],
      config,
    })
    expect(result.shouldFreeze).toBe(false)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it("복합 트리거 → 모두 수집", () => {
    const timestamps = Array.from({ length: 50 }, (_, i) => now - i * 1000)
    const result = evaluateAllTriggers({
      quarantineTimestamps: timestamps,
      averageMood: 0.1,
      driftSimilarities: [0.5, 0.4],
      config,
    })
    expect(result.shouldFreeze).toBe(true)
    expect(result.triggers).toHaveLength(3)
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("DEFAULT_AUTO_TRIGGERS 값 합리성", () => {
    expect(DEFAULT_AUTO_TRIGGERS.quarantineThreshold).toBe(50)
    expect(DEFAULT_AUTO_TRIGGERS.quarantineWindowMs).toBe(600000)
    expect(DEFAULT_AUTO_TRIGGERS.collectiveMoodWarning).toBe(0.2)
    expect(DEFAULT_AUTO_TRIGGERS.driftCriticalRatio).toBe(0.2)
    expect(DEFAULT_AUTO_TRIGGERS.driftCriticalThreshold).toBe(0.7)
  })

  it("DEFAULT_FEATURE_TOGGLES: v4.0 초기값", () => {
    expect(DEFAULT_FEATURE_TOGGLES.diffusion.enabled).toBe(false)
    expect(DEFAULT_FEATURE_TOGGLES.reflection.enabled).toBe(false)
    expect(DEFAULT_FEATURE_TOGGLES.emotionalContagion.enabled).toBe(false)
    expect(DEFAULT_FEATURE_TOGGLES.arena.enabled).toBe(true)
    expect(DEFAULT_FEATURE_TOGGLES.evolution.enabled).toBe(true)
    expect(DEFAULT_FEATURE_TOGGLES.autonomousPosting.enabled).toBe(true)
  })
})
