import { describe, it, expect } from "vitest"
import type { ThreeLayerVector } from "@/types/persona-v3"
import {
  initializeState,
  applyStateEvent,
  computePersonalitySensitivity,
} from "@/lib/persona-world/state-manager"
import { STATE_DEFAULTS } from "@/lib/persona-world/constants"
import type {
  PersonaStateData,
  StateUpdateEvent,
  PersonalitySensitivity,
} from "@/lib/persona-world/types"

// ── initializeState ──

describe("initializeState", () => {
  const defaultVectors: ThreeLayerVector = {
    social: {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    },
    temperament: {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    },
    narrative: { lack: 0.5, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 },
  }

  it("returns default state values", () => {
    const state = initializeState(defaultVectors, 0)
    expect(state.mood).toBe(STATE_DEFAULTS.mood)
    expect(state.energy).toBe(STATE_DEFAULTS.energy)
    expect(state.socialBattery).toBe(STATE_DEFAULTS.socialBattery)
  })

  it("initializes paradoxTension from paradoxScore × 0.3", () => {
    const state = initializeState(defaultVectors, 0.6)
    expect(state.paradoxTension).toBeCloseTo(0.18, 2)
  })

  it("clamps paradoxTension to [0, 1]", () => {
    const state = initializeState(defaultVectors, 5.0) // extreme
    expect(state.paradoxTension).toBeLessThanOrEqual(1)
  })

  it("zero paradox → zero tension", () => {
    const state = initializeState(defaultVectors, 0)
    expect(state.paradoxTension).toBe(0)
  })
})

// ── applyStateEvent ──

describe("applyStateEvent", () => {
  const baseState: PersonaStateData = {
    mood: 0.5,
    energy: 0.8,
    socialBattery: 0.7,
    paradoxTension: 0.3,
  }

  it("post_created: energy decreases, mood slightly increases", () => {
    const event: StateUpdateEvent = { type: "post_created", tokensUsed: 500 }
    const next = applyStateEvent(baseState, event)

    expect(next.energy).toBeLessThan(baseState.energy)
    expect(next.mood).toBeGreaterThan(baseState.mood)
  })

  it("comment_created: energy and socialBattery decrease", () => {
    const event: StateUpdateEvent = { type: "comment_created", tokensUsed: 200 }
    const next = applyStateEvent(baseState, event)

    expect(next.energy).toBeLessThan(baseState.energy)
    expect(next.socialBattery).toBeLessThan(baseState.socialBattery)
  })

  it("comment_received positive: mood increases", () => {
    const event: StateUpdateEvent = { type: "comment_received", sentiment: "positive" }
    const next = applyStateEvent(baseState, event)

    expect(next.mood).toBeGreaterThan(baseState.mood)
  })

  it("comment_received aggressive: mood decreases, paradoxTension increases", () => {
    const event: StateUpdateEvent = { type: "comment_received", sentiment: "aggressive" }
    const next = applyStateEvent(baseState, event)

    expect(next.mood).toBeLessThan(baseState.mood)
    expect(next.paradoxTension).toBeGreaterThan(baseState.paradoxTension)
  })

  it("comment_received neutral: mood stays the same", () => {
    const event: StateUpdateEvent = { type: "comment_received", sentiment: "neutral" }
    const next = applyStateEvent(baseState, event)

    expect(next.mood).toBe(baseState.mood)
  })

  it("like_received: mood slightly increases", () => {
    const event: StateUpdateEvent = { type: "like_received" }
    const next = applyStateEvent(baseState, event)

    expect(next.mood).toBeGreaterThan(baseState.mood)
  })

  it("idle_period: energy and socialBattery recover, paradoxTension decreases", () => {
    const lowState: PersonaStateData = {
      mood: 0.5,
      energy: 0.3,
      socialBattery: 0.2,
      paradoxTension: 0.5,
    }
    const event: StateUpdateEvent = { type: "idle_period", hours: 3 }
    const next = applyStateEvent(lowState, event)

    expect(next.energy).toBeGreaterThan(lowState.energy)
    expect(next.socialBattery).toBeGreaterThan(lowState.socialBattery)
    expect(next.paradoxTension).toBeLessThan(lowState.paradoxTension)
  })

  it("paradox_situation: paradoxTension increases proportional to intensity", () => {
    const event: StateUpdateEvent = { type: "paradox_situation", intensity: 0.8 }
    const next = applyStateEvent(baseState, event)

    expect(next.paradoxTension).toBeGreaterThan(baseState.paradoxTension)
  })

  it("paradox_resolved: paradoxTension decreases, mood increases", () => {
    const tensedState: PersonaStateData = {
      mood: 0.4,
      energy: 0.7,
      socialBattery: 0.6,
      paradoxTension: 0.8,
    }
    const event: StateUpdateEvent = { type: "paradox_resolved" }
    const next = applyStateEvent(tensedState, event)

    expect(next.paradoxTension).toBeLessThan(tensedState.paradoxTension)
    expect(next.mood).toBeGreaterThan(tensedState.mood)
  })

  it("all values stay clamped to [0, 1]", () => {
    // Start near boundary
    const lowState: PersonaStateData = {
      mood: 0.02,
      energy: 0.01,
      socialBattery: 0.01,
      paradoxTension: 0.99,
    }
    const event: StateUpdateEvent = { type: "comment_received", sentiment: "aggressive" }
    const next = applyStateEvent(lowState, event)

    expect(next.mood).toBeGreaterThanOrEqual(0)
    expect(next.paradoxTension).toBeLessThanOrEqual(1)
  })

  it("multiple events accumulate correctly", () => {
    let state = { ...baseState }

    // Post → energy down
    state = applyStateEvent(state, { type: "post_created", tokensUsed: 300 })
    const afterPost = state.energy

    // Like → mood up
    state = applyStateEvent(state, { type: "like_received" })
    expect(state.mood).toBeGreaterThan(baseState.mood)

    // Idle → energy recovers
    state = applyStateEvent(state, { type: "idle_period", hours: 2 })
    expect(state.energy).toBeGreaterThan(afterPost)
  })
})

// ═══ computePersonalitySensitivity ═══

describe("computePersonalitySensitivity", () => {
  const makeVectors = (overrides?: Partial<ThreeLayerVector>): ThreeLayerVector => ({
    social: {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
      ...overrides?.social,
    },
    temperament: {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
      ...overrides?.temperament,
    },
    narrative: {
      lack: 0.5,
      moralCompass: 0.5,
      volatility: 0.5,
      growthArc: 0.5,
      ...overrides?.narrative,
    },
  })

  it("기본 벡터 → 모든 계수 ~1.0", () => {
    const s = computePersonalitySensitivity(makeVectors())
    expect(s.moodSensitivity).toBeCloseTo(1.0, 1)
    expect(s.energyRecoveryRate).toBeCloseTo(1.0, 1)
    expect(s.socialDrain).toBeCloseTo(1.0, 1)
    expect(s.tensionSensitivity).toBeCloseTo(1.0, 1)
  })

  it("높은 neuroticism → 높은 moodSensitivity", () => {
    const s = computePersonalitySensitivity(
      makeVectors({ temperament: { ...makeVectors().temperament, neuroticism: 0.9 } })
    )
    expect(s.moodSensitivity).toBeCloseTo(1.4, 1)
  })

  it("낮은 extraversion → 높은 socialDrain", () => {
    const s = computePersonalitySensitivity(
      makeVectors({ temperament: { ...makeVectors().temperament, extraversion: 0.1 } })
    )
    expect(s.socialDrain).toBeCloseTo(1.4, 1)
  })

  it("모든 계수는 0.5~1.5 범위", () => {
    // 극단적 벡터
    const extreme = computePersonalitySensitivity(
      makeVectors({
        temperament: {
          openness: 1,
          conscientiousness: 1,
          extraversion: 1,
          agreeableness: 1,
          neuroticism: 1,
        },
        narrative: { lack: 1, moralCompass: 1, volatility: 1, growthArc: 1 },
      })
    )
    for (const v of Object.values(extreme)) {
      expect(v).toBeGreaterThanOrEqual(0.5)
      expect(v).toBeLessThanOrEqual(1.5)
    }
  })
})

// ═══ PersonalitySensitivity 적용 ═══

describe("applyStateEvent with personality sensitivity", () => {
  const baseState: PersonaStateData = {
    mood: 0.5,
    energy: 0.8,
    socialBattery: 0.7,
    paradoxTension: 0.3,
  }

  const highSensitivity: PersonalitySensitivity = {
    moodSensitivity: 1.5,
    energyRecoveryRate: 1.5,
    socialDrain: 1.5,
    tensionSensitivity: 1.5,
  }

  const lowSensitivity: PersonalitySensitivity = {
    moodSensitivity: 0.5,
    energyRecoveryRate: 0.5,
    socialDrain: 0.5,
    tensionSensitivity: 0.5,
  }

  it("높은 moodSensitivity → 긍정 댓글에 기분 더 많이 상승", () => {
    const event: StateUpdateEvent = { type: "comment_received", sentiment: "positive" }
    const highResult = applyStateEvent(baseState, event, highSensitivity)
    const lowResult = applyStateEvent(baseState, event, lowSensitivity)
    const defaultResult = applyStateEvent(baseState, event)

    expect(highResult.mood).toBeGreaterThan(defaultResult.mood)
    expect(lowResult.mood).toBeLessThan(defaultResult.mood)
  })

  it("높은 socialDrain → 댓글 작성 시 소셜배터리 더 많이 감소", () => {
    const event: StateUpdateEvent = { type: "comment_created", tokensUsed: 200 }
    const highResult = applyStateEvent(baseState, event, highSensitivity)
    const lowResult = applyStateEvent(baseState, event, lowSensitivity)

    expect(highResult.socialBattery).toBeLessThan(lowResult.socialBattery)
  })

  it("높은 tensionSensitivity → paradox 상황에 긴장 더 많이 축적", () => {
    const event: StateUpdateEvent = { type: "paradox_situation", intensity: 0.8 }
    const highResult = applyStateEvent(baseState, event, highSensitivity)
    const lowResult = applyStateEvent(baseState, event, lowSensitivity)

    expect(highResult.paradoxTension).toBeGreaterThan(lowResult.paradoxTension)
  })

  it("높은 energyRecoveryRate → 휴식 시 에너지 더 빨리 회복", () => {
    const lowState: PersonaStateData = {
      mood: 0.5,
      energy: 0.3,
      socialBattery: 0.2,
      paradoxTension: 0.3,
    }
    const event: StateUpdateEvent = { type: "idle_period", hours: 3 }
    const highResult = applyStateEvent(lowState, event, highSensitivity)
    const lowResult = applyStateEvent(lowState, event, lowSensitivity)

    expect(highResult.energy).toBeGreaterThan(lowResult.energy)
  })

  it("sensitivity 미제공 시 기본 동작 (기존 호환)", () => {
    const event: StateUpdateEvent = { type: "like_received" }
    const withSens = applyStateEvent(baseState, event, {
      moodSensitivity: 1.0,
      energyRecoveryRate: 1.0,
      socialDrain: 1.0,
      tensionSensitivity: 1.0,
    })
    const without = applyStateEvent(baseState, event)

    expect(withSens.mood).toBeCloseTo(without.mood, 10)
  })
})

// ═══ narrativeTension 추적 ═══

describe("narrativeTension tracking", () => {
  const stateWithNarrative: PersonaStateData = {
    mood: 0.5,
    energy: 0.8,
    socialBattery: 0.7,
    paradoxTension: 0.3,
    narrativeTension: 0.5,
  }

  it("initializeState → narrativeTension = lack × 0.3", () => {
    const vectors: ThreeLayerVector = {
      social: {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
      temperament: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
      },
      narrative: { lack: 0.8, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 },
    }
    const state = initializeState(vectors, 0.5)
    expect(state.narrativeTension).toBeCloseTo(0.24, 2)
  })

  it("post_created → narrativeTension 감소 (자기표현 해소)", () => {
    const next = applyStateEvent(stateWithNarrative, { type: "post_created", tokensUsed: 300 })
    expect(next.narrativeTension).toBeLessThan(stateWithNarrative.narrativeTension!)
  })

  it("comment_received aggressive → narrativeTension 증가", () => {
    const next = applyStateEvent(stateWithNarrative, {
      type: "comment_received",
      sentiment: "aggressive",
    })
    expect(next.narrativeTension).toBeGreaterThan(stateWithNarrative.narrativeTension!)
  })

  it("idle_period → narrativeTension 느리게 증가 (결핍 축적)", () => {
    const next = applyStateEvent(stateWithNarrative, { type: "idle_period", hours: 3 })
    expect(next.narrativeTension).toBeGreaterThan(stateWithNarrative.narrativeTension!)
  })

  it("paradox_resolved → narrativeTension 크게 감소", () => {
    const tensed = { ...stateWithNarrative, narrativeTension: 0.8 }
    const next = applyStateEvent(tensed, { type: "paradox_resolved" })
    expect(next.narrativeTension).toBeLessThan(0.8)
  })

  it("narrativeTension 없으면 기존 동작 유지 (backward compat)", () => {
    const stateWithout: PersonaStateData = {
      mood: 0.5,
      energy: 0.8,
      socialBattery: 0.7,
      paradoxTension: 0.3,
    }
    const next = applyStateEvent(stateWithout, { type: "post_created", tokensUsed: 300 })
    expect(next.energy).toBeLessThan(stateWithout.energy)
    // narrativeTension이 undefined면 조작하지 않음
    expect(next.narrativeTension).toBeUndefined()
  })
})
