import { describe, it, expect } from "vitest"
import type { ThreeLayerVector } from "@/types/persona-v3"
import {
  computeActivityTraits,
  computeActiveHours,
  computeActivityProbabilities,
  computeVoiceParams,
  classifyInteractionStyle,
  computeInteractionLimits,
} from "@/lib/persona-world/activity-mapper"
import type { ActivityTraitsV3 } from "@/lib/persona-world/types"
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

// ── computeActiveHours (T376: 4 Chronotype) ──

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

  it("오후형(기본): sociability=0.5 → peakHour 16 포함", () => {
    // 오후형: peak = 13 + round(0.5 × 5) = 13 + 3 = 16
    const vectors = makeVectors()
    const traits = computeActivityTraits(vectors, 0.3)
    const hours = computeActiveHours(vectors, traits)

    expect(hours).toContain(16)
  })

  it("새벽형: 높은 conscientiousness + 낮은 extraversion + 낮은 neuroticism → 4~7시 범위", () => {
    const vectors = makeVectors({
      temperament: {
        ...makeVectors().temperament,
        conscientiousness: 0.85,
        extraversion: 0.2,
        neuroticism: 0.15,
      },
    })
    const traits = computeActivityTraits(vectors, 0.5)
    const hours = computeActiveHours(vectors, traits)

    // 새벽형 peak = 4 + round(0.85 × 3) = 4 + 3 = 7, 윈도우 안에 5~8시 포함
    const dawnHours = hours.filter((h) => h >= 4 && h <= 9)
    expect(dawnHours.length).toBeGreaterThan(0)
    // 오후 시간대(15시 이후)는 포함되지 않아야 함
    expect(hours.some((h) => h >= 15 && h <= 20)).toBe(false)
  })

  it("오전형: 높은 purpose + 높은 conscientiousness → 8~12시 범위", () => {
    const vectors = makeVectors({
      social: { ...makeVectors().social, purpose: 0.8 },
      temperament: {
        ...makeVectors().temperament,
        conscientiousness: 0.7,
        extraversion: 0.5, // 새벽형 조건 불만족
        neuroticism: 0.5,
      },
    })
    const traits = computeActivityTraits(vectors, 0.5)
    const hours = computeActiveHours(vectors, traits)

    // 오전형 peak = 8 + round(0.8 × 3) = 8 + 2 = 10, 8~12시 포함
    const morningHours = hours.filter((h) => h >= 8 && h <= 12)
    expect(morningHours.length).toBeGreaterThan(0)
  })

  it("야행형: 높은 nightOwlScore → 21시 이후 포함", () => {
    // score = 0.8×0.4 + 0.8×0.3 + (1-0.2)×0.3 = 0.32 + 0.24 + 0.24 = 0.80 > 0.55
    const vectors = makeVectors({
      temperament: {
        ...makeVectors().temperament,
        neuroticism: 0.8,
        extraversion: 0.2,
        conscientiousness: 0.3, // 새벽형 조건 불만족
      },
      narrative: { ...makeVectors().narrative, volatility: 0.8 },
    })
    const traits = computeActivityTraits(vectors, 0.4)
    const hours = computeActiveHours(vectors, traits)

    // 야행형 peak = 21 + round(0.8 × 4) = 21 + 3 = 24 → 0시
    const nightHours = hours.filter((h) => h >= 21 || h <= 2)
    expect(nightHours.length).toBeGreaterThan(0)
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

    // 오후형 기준 벡터로 비교 (새벽형/오전형 조건 미충족)
    const baseVectors = makeVectors({
      social: { ...makeVectors().social, purpose: 0.3 },
    })
    const hoursHigh = computeActiveHours(baseVectors, highEnd)
    const hoursLow = computeActiveHours(baseVectors, lowEnd)

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

// ── 테스트용 트레이트 헬퍼 ──

const makeTraits = (overrides?: Partial<ActivityTraitsV3>): ActivityTraitsV3 => ({
  sociability: 0.5,
  initiative: 0.5,
  expressiveness: 0.5,
  interactivity: 0.5,
  endurance: 0.5,
  volatility: 0.3,
  depthSeeking: 0.5,
  growthDrive: 0.5,
  ...overrides,
})

// ── classifyInteractionStyle ──

describe("classifyInteractionStyle", () => {
  it("engagementScore < 0.20 → OBSERVER", () => {
    const style = classifyInteractionStyle(makeTraits({ sociability: 0.1, interactivity: 0.1 }))
    expect(style).toBe("OBSERVER")
  })

  it("engagementScore 0.20~0.39 → LURKER", () => {
    const style = classifyInteractionStyle(makeTraits({ sociability: 0.3, interactivity: 0.3 }))
    expect(style).toBe("LURKER")
  })

  it("engagementScore 0.40~0.59 → CASUAL", () => {
    const style = classifyInteractionStyle(
      makeTraits({ sociability: 0.5, interactivity: 0.5, volatility: 0.3 })
    )
    expect(style).toBe("CASUAL")
  })

  it("engagementScore 0.60~0.79 + volatility < 0.70 → SOCIAL", () => {
    const style = classifyInteractionStyle(
      makeTraits({ sociability: 0.7, interactivity: 0.7, volatility: 0.5 })
    )
    expect(style).toBe("SOCIAL")
  })

  it("engagementScore ≥ 0.80 → HYPERACTIVE", () => {
    const style = classifyInteractionStyle(
      makeTraits({ sociability: 0.9, interactivity: 0.9, volatility: 0.3 })
    )
    expect(style).toBe("HYPERACTIVE")
  })

  it("SOCIAL 범위(0.60~0.79) + volatility ≥ 0.70 → HYPERACTIVE 승급", () => {
    const style = classifyInteractionStyle(
      makeTraits({ sociability: 0.7, interactivity: 0.7, volatility: 0.75 })
    )
    expect(style).toBe("HYPERACTIVE")
  })

  it("경계값: engagementScore = 0.40 → CASUAL (LURKER 아님)", () => {
    const style = classifyInteractionStyle(makeTraits({ sociability: 0.4, interactivity: 0.4 }))
    expect(style).toBe("CASUAL")
  })
})

// ── computeInteractionLimits ──

describe("computeInteractionLimits", () => {
  it("OBSERVER: feedPosts=3, likes=1, comments=0, reposts=0", () => {
    const limits = computeInteractionLimits(makeTraits({ sociability: 0.1, interactivity: 0.1 }))
    expect(limits.style).toBe("OBSERVER")
    expect(limits.maxFeedPostsPerRun).toBe(3)
    expect(limits.maxLikesPerRun).toBe(1)
    expect(limits.maxCommentsPerRun).toBe(0)
    expect(limits.maxRepostsPerRun).toBe(0)
  })

  it("LURKER: feedPosts=4, likes=2, comments=0, reposts=0", () => {
    const limits = computeInteractionLimits(makeTraits({ sociability: 0.3, interactivity: 0.3 }))
    expect(limits.style).toBe("LURKER")
    expect(limits.maxFeedPostsPerRun).toBe(4)
    expect(limits.maxLikesPerRun).toBe(2)
    expect(limits.maxCommentsPerRun).toBe(0)
    expect(limits.maxRepostsPerRun).toBe(0)
  })

  it("CASUAL: feedPosts=5, likes=3, comments=1, reposts=1", () => {
    const limits = computeInteractionLimits(
      makeTraits({ sociability: 0.5, interactivity: 0.5, volatility: 0.3 })
    )
    expect(limits.style).toBe("CASUAL")
    expect(limits.maxFeedPostsPerRun).toBe(5)
    expect(limits.maxLikesPerRun).toBe(3)
    expect(limits.maxCommentsPerRun).toBe(1)
    expect(limits.maxRepostsPerRun).toBe(1)
  })

  it("SOCIAL: feedPosts=6, likes=4, comments=2, reposts=1", () => {
    const limits = computeInteractionLimits(
      makeTraits({ sociability: 0.7, interactivity: 0.7, volatility: 0.5 })
    )
    expect(limits.style).toBe("SOCIAL")
    expect(limits.maxFeedPostsPerRun).toBe(6)
    expect(limits.maxLikesPerRun).toBe(4)
    expect(limits.maxCommentsPerRun).toBe(2)
    expect(limits.maxRepostsPerRun).toBe(1)
  })

  it("HYPERACTIVE: feedPosts=7, likes=5, comments=2, reposts=2", () => {
    const limits = computeInteractionLimits(
      makeTraits({ sociability: 0.9, interactivity: 0.9, volatility: 0.3 })
    )
    expect(limits.style).toBe("HYPERACTIVE")
    expect(limits.maxFeedPostsPerRun).toBe(7)
    expect(limits.maxLikesPerRun).toBe(5)
    expect(limits.maxCommentsPerRun).toBe(2)
    expect(limits.maxRepostsPerRun).toBe(2)
  })

  it("volatility 승급: SOCIAL 범위 + volatility=0.75 → HYPERACTIVE 한도 적용", () => {
    const limits = computeInteractionLimits(
      makeTraits({ sociability: 0.7, interactivity: 0.7, volatility: 0.75 })
    )
    expect(limits.style).toBe("HYPERACTIVE")
    expect(limits.maxLikesPerRun).toBe(5)
  })

  it("style 필드를 포함한 객체 반환", () => {
    const limits = computeInteractionLimits(makeTraits())
    expect(limits).toHaveProperty("style")
    expect(limits).toHaveProperty("maxFeedPostsPerRun")
    expect(limits).toHaveProperty("maxLikesPerRun")
    expect(limits).toHaveProperty("maxCommentsPerRun")
    expect(limits).toHaveProperty("maxRepostsPerRun")
  })
})
