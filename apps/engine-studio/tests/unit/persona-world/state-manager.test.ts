import { describe, it, expect } from "vitest"
import type { ThreeLayerVector } from "@/types/persona-v3"
import { initializeState, applyStateEvent } from "@/lib/persona-world/state-manager"
import { STATE_DEFAULTS } from "@/lib/persona-world/constants"
import type { PersonaStateData, StateUpdateEvent } from "@/lib/persona-world/types"

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
