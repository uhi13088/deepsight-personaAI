import { describe, it, expect } from "vitest"
import type { ThreeLayerVector } from "@/types/persona-v3"
import {
  computeActivityTraits,
  computeActiveHours,
  computeActivityProbabilities,
  computeVoiceParams,
} from "@/lib/persona-world/activity-mapper"
import type { PersonaStateData } from "@/lib/persona-world/types"

// ── 테스트용 벡터 ──

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

// ── computeActivityTraits ──

describe("computeActivityTraits", () => {
  it("returns 8 traits with all values in [0, 1]", () => {
    const traits = computeActivityTraits(makeVectors(), 0.5)

    const keys = Object.keys(traits)
    expect(keys).toHaveLength(8)
    expect(keys).toContain("sociability")
    expect(keys).toContain("initiative")
    expect(keys).toContain("expressiveness")
    expect(keys).toContain("interactivity")
    expect(keys).toContain("endurance")
    expect(keys).toContain("volatility")
    expect(keys).toContain("depthSeeking")
    expect(keys).toContain("growthDrive")

    for (const value of Object.values(traits)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  it("high sociability vector → high sociability trait", () => {
    const high = computeActivityTraits(
      makeVectors({ social: { ...makeVectors().social, sociability: 0.9 } }),
      0.3
    )
    const low = computeActivityTraits(
      makeVectors({ social: { ...makeVectors().social, sociability: 0.1 } }),
      0.3
    )
    expect(high.sociability).toBeGreaterThan(low.sociability)
  })

  it("high conscientiousness + low neuroticism → high endurance", () => {
    const traits = computeActivityTraits(
      makeVectors({
        temperament: {
          ...makeVectors().temperament,
          conscientiousness: 0.9,
          neuroticism: 0.1,
          extraversion: 0.5,
        },
      }),
      0.3
    )
    // endurance = 0.9×0.4 + (1-0.1)×0.4 + 0.5×0.2 = 0.36 + 0.36 + 0.10 = 0.82
    expect(traits.endurance).toBeCloseTo(0.82, 1)
  })

  it("high neuroticism + high L3 volatility + high paradox → high volatility", () => {
    const traits = computeActivityTraits(
      makeVectors({
        temperament: { ...makeVectors().temperament, neuroticism: 0.9 },
        narrative: { ...makeVectors().narrative, volatility: 0.9 },
      }),
      0.8
    )
    // volatility = 0.9×0.4 + 0.9×0.4 + 0.8×0.2 = 0.36 + 0.36 + 0.16 = 0.88
    expect(traits.volatility).toBeCloseTo(0.88, 1)
  })

  it("clamps output to [0, 1] even with extreme inputs", () => {
    const extremeHigh = computeActivityTraits(
      makeVectors({
        social: {
          depth: 1,
          lens: 0,
          stance: 1,
          scope: 1,
          taste: 1,
          purpose: 1,
          sociability: 1,
        },
        temperament: {
          openness: 1,
          conscientiousness: 1,
          extraversion: 1,
          agreeableness: 1,
          neuroticism: 1,
        },
        narrative: { lack: 1, moralCompass: 1, volatility: 1, growthArc: 1 },
      }),
      1.0
    )

    for (const value of Object.values(extremeHigh)) {
      expect(value).toBeLessThanOrEqual(1)
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })
})

// ── computeActiveHours ──

describe("computeActiveHours", () => {
  it("returns array of hours in [0, 23]", () => {
    const traits = computeActivityTraits(makeVectors(), 0.3)
    const hours = computeActiveHours(makeVectors(), traits)

    expect(hours.length).toBeGreaterThan(0)
    for (const h of hours) {
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(23)
    }
  })

  it("peakHour = 12 + round(sociability × 10) for default", () => {
    // sociability 0.5 → peakHour = 12 + 5 = 17
    const vectors = makeVectors()
    const traits = computeActivityTraits(vectors, 0.3)
    const hours = computeActiveHours(vectors, traits)

    // peakHour 17 should be in the active hours
    expect(hours).toContain(17)
  })

  it("night owl shift for introvert + neurotic persona", () => {
    const vectors = makeVectors({
      social: { ...makeVectors().social, sociability: 0.4 },
      temperament: {
        ...makeVectors().temperament,
        extraversion: 0.2, // < 0.3
        neuroticism: 0.7, // > 0.5
      },
    })
    const traits = computeActivityTraits(vectors, 0.3)
    const hours = computeActiveHours(vectors, traits)

    // peakHour = 12 + round(0.4×10) = 16, +4 night owl = 20
    expect(hours).toContain(20)
  })

  it("high endurance → wider activity window", () => {
    const highEnd = computeActivityTraits(
      makeVectors({
        temperament: {
          ...makeVectors().temperament,
          conscientiousness: 0.9,
          neuroticism: 0.1,
        },
      }),
      0.3
    )
    const lowEnd = computeActivityTraits(
      makeVectors({
        temperament: {
          ...makeVectors().temperament,
          conscientiousness: 0.1,
          neuroticism: 0.9,
        },
      }),
      0.3
    )

    const hoursHigh = computeActiveHours(makeVectors(), highEnd)
    const hoursLow = computeActiveHours(makeVectors(), lowEnd)

    expect(hoursHigh.length).toBeGreaterThan(hoursLow.length)
  })
})

// ── computeActivityProbabilities ──

describe("computeActivityProbabilities", () => {
  it("returns probabilities in [0, 1]", () => {
    const traits = computeActivityTraits(makeVectors(), 0.3)
    const state: PersonaStateData = {
      mood: 0.5,
      energy: 0.8,
      socialBattery: 0.6,
      paradoxTension: 0.3,
    }
    const probs = computeActivityProbabilities(traits, state)

    expect(probs.postProbability).toBeGreaterThanOrEqual(0)
    expect(probs.postProbability).toBeLessThanOrEqual(1)
    expect(probs.interactionProbability).toBeGreaterThanOrEqual(0)
    expect(probs.interactionProbability).toBeLessThanOrEqual(1)
  })

  it("low energy → lower probabilities", () => {
    const traits = computeActivityTraits(makeVectors(), 0.3)
    const highEnergy: PersonaStateData = {
      mood: 0.5,
      energy: 0.9,
      socialBattery: 0.8,
      paradoxTension: 0.3,
    }
    const lowEnergy: PersonaStateData = {
      mood: 0.5,
      energy: 0.2,
      socialBattery: 0.8,
      paradoxTension: 0.3,
    }

    const high = computeActivityProbabilities(traits, highEnergy)
    const low = computeActivityProbabilities(traits, lowEnergy)

    expect(high.postProbability).toBeGreaterThan(low.postProbability)
    expect(high.interactionProbability).toBeGreaterThan(low.interactionProbability)
  })

  it("low socialBattery → lower interaction probability", () => {
    const traits = computeActivityTraits(makeVectors(), 0.3)
    const highBattery: PersonaStateData = {
      mood: 0.5,
      energy: 0.8,
      socialBattery: 0.9,
      paradoxTension: 0.3,
    }
    const lowBattery: PersonaStateData = {
      mood: 0.5,
      energy: 0.8,
      socialBattery: 0.1,
      paradoxTension: 0.3,
    }

    const high = computeActivityProbabilities(traits, highBattery)
    const low = computeActivityProbabilities(traits, lowBattery)

    expect(high.interactionProbability).toBeGreaterThan(low.interactionProbability)
  })

  it("mood affects post probability (0.5 + mood × 0.5)", () => {
    const traits = computeActivityTraits(makeVectors(), 0.3)
    const highMood: PersonaStateData = {
      mood: 0.9,
      energy: 0.8,
      socialBattery: 0.8,
      paradoxTension: 0.3,
    }
    const lowMood: PersonaStateData = {
      mood: 0.1,
      energy: 0.8,
      socialBattery: 0.8,
      paradoxTension: 0.3,
    }

    const high = computeActivityProbabilities(traits, highMood)
    const low = computeActivityProbabilities(traits, lowMood)

    expect(high.postProbability).toBeGreaterThan(low.postProbability)
  })
})

// ═══ computeVoiceParams ═══

describe("computeVoiceParams", () => {
  it("returns 6 voice style params all in [0, 1]", () => {
    const voice = computeVoiceParams(makeVectors())

    expect(voice.formality).toBeGreaterThanOrEqual(0)
    expect(voice.formality).toBeLessThanOrEqual(1)
    expect(voice.humor).toBeGreaterThanOrEqual(0)
    expect(voice.humor).toBeLessThanOrEqual(1)
    expect(voice.sentenceLength).toBeGreaterThanOrEqual(0)
    expect(voice.sentenceLength).toBeLessThanOrEqual(1)
    expect(voice.emotionExpression).toBeGreaterThanOrEqual(0)
    expect(voice.emotionExpression).toBeLessThanOrEqual(1)
    expect(voice.assertiveness).toBeGreaterThanOrEqual(0)
    expect(voice.assertiveness).toBeLessThanOrEqual(1)
    expect(voice.vocabularyLevel).toBeGreaterThanOrEqual(0)
    expect(voice.vocabularyLevel).toBeLessThanOrEqual(1)
  })

  it("논리적+격식적 페르소나 → formality 높음, humor 낮음", () => {
    const voice = computeVoiceParams(
      makeVectors({
        social: { ...makeVectors().social, lens: 0.9, purpose: 0.9 },
        temperament: { ...makeVectors().temperament, conscientiousness: 0.9, neuroticism: 0.8 },
      })
    )
    expect(voice.formality).toBeGreaterThan(0.6)
    expect(voice.humor).toBeLessThan(0.5)
  })

  it("감성적+사교적 페르소나 → emotionExpression 높음, assertiveness 낮음", () => {
    const voice = computeVoiceParams(
      makeVectors({
        social: { ...makeVectors().social, lens: 0.1, stance: 0.2, sociability: 0.9 },
        temperament: { ...makeVectors().temperament, neuroticism: 0.8 },
        narrative: { ...makeVectors().narrative, volatility: 0.8, lack: 0.7 },
      })
    )
    expect(voice.emotionExpression).toBeGreaterThan(0.6)
    expect(voice.assertiveness).toBeLessThan(0.5)
  })

  it("비판적+원칙적 페르소나 → assertiveness 높음", () => {
    const voice = computeVoiceParams(
      makeVectors({
        social: { ...makeVectors().social, stance: 0.9 },
        temperament: { ...makeVectors().temperament, conscientiousness: 0.9 },
        narrative: { ...makeVectors().narrative, moralCompass: 0.9 },
      })
    )
    expect(voice.assertiveness).toBeGreaterThan(0.7)
  })

  it("극단적 입력에도 [0, 1] 범위 유지", () => {
    const voice = computeVoiceParams(
      makeVectors({
        social: {
          depth: 1,
          lens: 1,
          stance: 1,
          scope: 1,
          taste: 1,
          purpose: 1,
          sociability: 1,
        },
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
    for (const value of Object.values(voice)) {
      expect(value).toBeLessThanOrEqual(1)
      expect(value).toBeGreaterThanOrEqual(0)
    }
  })
})
