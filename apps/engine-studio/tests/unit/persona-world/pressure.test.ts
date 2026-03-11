// ═══════════════════════════════════════════════════════════════
// computePressure() 단위 테스트 (T416)
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import { computePressure, triggerEffectsToPressure } from "@/lib/persona-world/pressure"
import type { PersonaStateData } from "@/lib/persona-world/types"
import {
  VFINAL_LEVELS,
  getVFinalLevelConfig,
  type VFinalLevelConfig,
} from "@/lib/persona-world/vfinal-config"
import { calculateVFinal } from "@/lib/vector/v-final"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── 헬퍼 ─────────────────────────────────────────────────────

function makeState(overrides: Partial<PersonaStateData> = {}): PersonaStateData {
  return {
    mood: 0.5, // 중립 → moodExtreme = 0
    energy: 1.0,
    socialBattery: 1.0,
    paradoxTension: 0,
    narrativeTension: 0,
    ...overrides,
  }
}

// ── 기본 동작 ────────────────────────────────────────────────

describe("computePressure", () => {
  it("모든 요소 0이면 pressure=0", () => {
    const result = computePressure(makeState())
    expect(result.pressure).toBe(0)
    expect(result.rawPressure).toBe(0)
  })

  it("paradoxTension만 1.0이면 pressure=0.5", () => {
    const result = computePressure(makeState({ paradoxTension: 1.0 }))
    expect(result.contributions.paradoxTension).toBeCloseTo(0.5)
    expect(result.pressure).toBeCloseTo(0.5)
  })

  it("mood 극단값(0.0)이면 moodExtreme 기여 = 0.2", () => {
    const result = computePressure(makeState({ mood: 0.0 }))
    // |0.0 - 0.5| × 2 = 1.0 → × 0.2 = 0.2
    expect(result.contributions.moodExtreme).toBeCloseTo(0.2)
  })

  it("mood 극단값(1.0)이면 moodExtreme 기여 = 0.2", () => {
    const result = computePressure(makeState({ mood: 1.0 }))
    expect(result.contributions.moodExtreme).toBeCloseTo(0.2)
  })

  it("mood 중립(0.5)이면 moodExtreme 기여 = 0", () => {
    const result = computePressure(makeState({ mood: 0.5 }))
    expect(result.contributions.moodExtreme).toBe(0)
  })

  it("narrativeTension만 1.0이면 기여 = 0.15", () => {
    const result = computePressure(makeState({ narrativeTension: 1.0 }))
    expect(result.contributions.narrativeTension).toBeCloseTo(0.15)
    expect(result.pressure).toBeCloseTo(0.15)
  })

  it("triggerPressureBoost만 1.0이면 기여 = 0.15", () => {
    const result = computePressure(makeState(), 1.0)
    expect(result.contributions.triggerBoost).toBeCloseTo(0.15)
    expect(result.pressure).toBeCloseTo(0.15)
  })

  // ── 모든 요소 최대 ──────────────────────────────────────────

  it("모든 요소 최대 → rawPressure = 1.0", () => {
    const state = makeState({
      paradoxTension: 1.0, // 0.5
      mood: 0.0, // 0.2
      narrativeTension: 1.0, // 0.15
    })
    const result = computePressure(state, 1.0) // trigger: 0.15
    // 0.5 + 0.2 + 0.15 + 0.15 = 1.0
    expect(result.rawPressure).toBeCloseTo(1.0)
    expect(result.pressure).toBeCloseTo(1.0)
  })

  // ── Level별 maxPressure clamp ───────────────────────────────

  it("Level 1: maxPressure=0.1으로 clamp", () => {
    const state = makeState({ paradoxTension: 1.0 }) // rawP=0.5
    const result = computePressure(state, 0, VFINAL_LEVELS[0])
    expect(result.rawPressure).toBeCloseTo(0.5)
    expect(result.pressure).toBeCloseTo(0.1)
  })

  it("Level 5: maxPressure=0.5으로 clamp", () => {
    const state = makeState({
      paradoxTension: 1.0,
      mood: 0.0,
      narrativeTension: 1.0,
    })
    const result = computePressure(state, 1.0, VFINAL_LEVELS[4])
    expect(result.rawPressure).toBeCloseTo(1.0)
    expect(result.pressure).toBeCloseTo(0.5)
  })

  it("Level 10: maxPressure=1.0 → 제한 없음", () => {
    const state = makeState({
      paradoxTension: 1.0,
      mood: 0.0,
      narrativeTension: 1.0,
    })
    const result = computePressure(state, 1.0, VFINAL_LEVELS[9])
    expect(result.rawPressure).toBeCloseTo(1.0)
    expect(result.pressure).toBeCloseTo(1.0)
  })

  // ── narrativeTension undefined 처리 ─────────────────────────

  it("narrativeTension undefined → 0으로 처리", () => {
    const state = makeState()
    delete (state as unknown as Record<string, unknown>).narrativeTension
    const result = computePressure(state)
    expect(result.contributions.narrativeTension).toBe(0)
  })

  // ── triggerBoost clamp ──────────────────────────────────────

  it("triggerBoost 음수 → 0으로 clamp", () => {
    const result = computePressure(makeState(), -0.5)
    expect(result.contributions.triggerBoost).toBe(0)
  })

  it("triggerBoost 1 초과 → 1로 clamp", () => {
    const result = computePressure(makeState(), 2.0)
    // clamp(2.0) = 1.0 → × 0.15 = 0.15
    expect(result.contributions.triggerBoost).toBeCloseTo(0.15)
  })

  // ── levelConfig 없으면 maxPressure=1.0 (제한 없음) ──────────

  it("levelConfig 없으면 maxPressure=1.0", () => {
    const state = makeState({ paradoxTension: 1.0, mood: 0.0 })
    const result = computePressure(state)
    // 0.5 + 0.2 = 0.7 → clamp(0.7, 0, 1.0) = 0.7
    expect(result.pressure).toBeCloseTo(0.7)
  })
})

// ── triggerEffectsToPressure ──────────────────────────────────

describe("triggerEffectsToPressure", () => {
  it("빈 효과 배열 → 0", () => {
    expect(triggerEffectsToPressure([])).toBe(0)
  })

  it("boost 효과 합산", () => {
    const effects = [
      { layer: "L1" as const, dimension: "depth", mode: "boost" as const, magnitude: 0.3 },
      { layer: "L2" as const, dimension: "openness", mode: "boost" as const, magnitude: 0.2 },
    ]
    // (0.3 + 0.2) × 1.0 = 0.5
    expect(triggerEffectsToPressure(effects)).toBeCloseTo(0.5)
  })

  it("suppress 효과는 50%만 감산", () => {
    const effects = [
      { layer: "L1" as const, dimension: "depth", mode: "boost" as const, magnitude: 0.6 },
      { layer: "L2" as const, dimension: "openness", mode: "suppress" as const, magnitude: 0.4 },
    ]
    // 0.6 - (0.4 × 0.5) = 0.4 → × 1.0 = 0.4
    expect(triggerEffectsToPressure(effects)).toBeCloseTo(0.4)
  })

  it("override 효과는 pressure에 영향 없음", () => {
    const effects = [
      { layer: "L1" as const, dimension: "depth", mode: "override" as const, magnitude: 0.8 },
    ]
    expect(triggerEffectsToPressure(effects)).toBe(0)
  })

  it("triggerMultiplier 적용", () => {
    const effects = [
      { layer: "L1" as const, dimension: "depth", mode: "boost" as const, magnitude: 0.3 },
    ]
    // 0.3 × 2.0 = 0.6
    expect(triggerEffectsToPressure(effects, 2.0)).toBeCloseTo(0.6)
  })

  it("결과는 0~1로 clamp", () => {
    const effects = [
      { layer: "L1" as const, dimension: "depth", mode: "boost" as const, magnitude: 0.8 },
      { layer: "L2" as const, dimension: "openness", mode: "boost" as const, magnitude: 0.8 },
    ]
    // (0.8 + 0.8) × 1.0 = 1.6 → clamp → 1.0
    expect(triggerEffectsToPressure(effects)).toBe(1)
  })

  it("음수 결과 → 0으로 clamp", () => {
    const effects = [
      { layer: "L1" as const, dimension: "depth", mode: "suppress" as const, magnitude: 1.0 },
    ]
    // 0 - (1.0 × 0.5) = -0.5 → clamp → 0
    expect(triggerEffectsToPressure(effects)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 통합 테스트: computePressure → calculateVFinal → V_Final 결과
// ═══════════════════════════════════════════════════════════════

describe("V_Final 통합 시나리오", () => {
  // 테스트용 벡터
  const l1: SocialPersonaVector = {
    depth: 0.8,
    lens: 0.6,
    stance: 0.5,
    scope: 0.4,
    taste: 0.7,
    purpose: 0.5,
    sociability: 0.6,
  }
  const l2: CoreTemperamentVector = {
    openness: 0.9,
    conscientiousness: 0.3,
    extraversion: 0.2,
    agreeableness: 0.7,
    neuroticism: 0.8,
  }
  const l3: NarrativeDriveVector = {
    lack: 0.6,
    moralCompass: 0.7,
    volatility: 0.5,
    growthArc: 0.4,
  }

  it("Level 1 (최소 표현) → V_Final ≈ L1 (drift 최소)", () => {
    const state = makeState({ paradoxTension: 0.9, mood: 0.1 })
    const config = getVFinalLevelConfig(1) // maxPressure=0.1, driftLimit=0.05
    const { pressure } = computePressure(state, 0, config)
    expect(pressure).toBeCloseTo(0.1) // maxPressure로 clamp

    const vfinal = calculateVFinal(l1, l2, l3, pressure)
    // L1 가중치 = 1 - 0.1 = 0.9 → V_Final은 L1에 매우 근접
    expect(vfinal.layerContributions.l1Weight).toBeCloseTo(0.9)
    expect(vfinal.pressure).toBeCloseTo(0.1)

    // V_Final과 L1의 차이가 작아야 함
    const l1Array = [l1.depth, l1.lens, l1.stance, l1.scope, l1.taste, l1.purpose, l1.sociability]
    for (let i = 0; i < l1Array.length; i++) {
      const drift = Math.abs(vfinal.vector[i] - l1Array[i])
      expect(drift).toBeLessThan(0.15) // Level 1이므로 drift 매우 작아야 함
    }
  })

  it("Level 5 (중간 표현) → V_Final에 L2/L3 영향 반영", () => {
    const state = makeState({ paradoxTension: 0.8, mood: 0.1, narrativeTension: 0.7 })
    const config = getVFinalLevelConfig(5) // maxPressure=0.5
    const { pressure } = computePressure(state, 0.5, config)
    expect(pressure).toBeCloseTo(0.5) // maxPressure로 clamp

    const vfinal = calculateVFinal(l1, l2, l3, pressure)
    expect(vfinal.layerContributions.l1Weight).toBeCloseTo(0.5)
    expect(vfinal.layerContributions.l2Weight).toBeCloseTo(0.3) // 0.5 × 0.6
    expect(vfinal.layerContributions.l3Weight).toBeCloseTo(0.2) // 0.5 × 0.4
  })

  it("Level 10 (최대 표현) + paradoxTension=0.9 → P≈1.0 허용", () => {
    const state = makeState({
      paradoxTension: 0.9, // 0.45
      mood: 0.0, // extreme 0.2
      narrativeTension: 1.0, // 0.15
    })
    const config = getVFinalLevelConfig(10) // maxPressure=1.0
    const { pressure } = computePressure(state, 1.0, config)
    // 0.45 + 0.2 + 0.15 + 0.15 = 0.95
    expect(pressure).toBeCloseTo(0.95)

    const vfinal = calculateVFinal(l1, l2, l3, pressure)
    // L1 가중치 매우 낮음 → L2/L3의 본성이 강하게 드러남
    expect(vfinal.layerContributions.l1Weight).toBeCloseTo(0.05)
  })

  it("Kill Switch: vFinalEnabled=false → 기본 pressure (기존 동작 유지)", () => {
    // vFinalEnabled가 false면 caller가 pressure를 전달하지 않음
    // → calculateVFinal은 기본 pressure 사용
    const vfinalDefault = calculateVFinal(l1, l2, l3) // 기본 pressure
    const vfinalExplicit = calculateVFinal(l1, l2, l3, undefined) // 명시적 undefined

    // 둘 다 동일한 결과
    expect(vfinalDefault.pressure).toBe(vfinalExplicit.pressure)
    for (let i = 0; i < vfinalDefault.vector.length; i++) {
      expect(vfinalDefault.vector[i]).toBeCloseTo(vfinalExplicit.vector[i])
    }
  })

  it("10-Level 상수 테이블 일관성 검증", () => {
    for (let level = 1; level <= 10; level++) {
      const config = getVFinalLevelConfig(level)
      expect(config.level).toBe(level)
      expect(config.maxPressure).toBeGreaterThanOrEqual(0)
      expect(config.maxPressure).toBeLessThanOrEqual(1)
      expect(config.driftLimit).toBeGreaterThanOrEqual(0)
      expect(config.driftLimit).toBeLessThanOrEqual(1)
      expect(config.triggerMultiplier).toBeGreaterThanOrEqual(0.2)
      expect(config.triggerMultiplier).toBeLessThanOrEqual(2.0)
    }

    // 레벨이 올라갈수록 모든 값이 단조 증가
    for (let level = 2; level <= 10; level++) {
      const prev = getVFinalLevelConfig(level - 1)
      const curr = getVFinalLevelConfig(level)
      expect(curr.maxPressure).toBeGreaterThan(prev.maxPressure)
      expect(curr.driftLimit).toBeGreaterThan(prev.driftLimit)
      expect(curr.triggerMultiplier).toBeGreaterThan(prev.triggerMultiplier)
    }
  })

  it("getVFinalLevelConfig 범위 밖 → clamp", () => {
    expect(getVFinalLevelConfig(0).level).toBe(1)
    expect(getVFinalLevelConfig(-5).level).toBe(1)
    expect(getVFinalLevelConfig(11).level).toBe(10)
    expect(getVFinalLevelConfig(100).level).toBe(10)
    expect(getVFinalLevelConfig(5.7).level).toBe(6) // 반올림
  })
})
