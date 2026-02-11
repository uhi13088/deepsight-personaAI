import { describe, it, expect } from "vitest"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

const L1_NEUTRAL: SocialPersonaVector = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
}

const L2_NEUTRAL: CoreTemperamentVector = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5,
}

const L3_NEUTRAL: NarrativeDriveVector = {
  lack: 0.5,
  moralCompass: 0.5,
  volatility: 0.5,
  growthArc: 0.5,
}

describe("calculateCrossAxisProfile", () => {
  it("calculates all 83 axes", () => {
    const profile = calculateCrossAxisProfile(L1_NEUTRAL, L2_NEUTRAL, L3_NEUTRAL)

    expect(profile.axes).toHaveLength(83)
    expect(profile.byType.l1l2).toHaveLength(35)
    expect(profile.byType.l1l3).toHaveLength(28)
    expect(profile.byType.l2l3).toHaveLength(20)
  })

  it("all scores are in [0, 1] range", () => {
    const profile = calculateCrossAxisProfile(L1_NEUTRAL, L2_NEUTRAL, L3_NEUTRAL)

    profile.axes.forEach((axis) => {
      expect(axis.score).toBeGreaterThanOrEqual(0)
      expect(axis.score).toBeLessThanOrEqual(1)
    })
  })

  it("produces correct paradox score for tsundere pair (stance × agreeableness)", () => {
    // stance=0.9 (critical), agreeableness=0.9 (warm) → inverse → |0.9 - (1-0.9)| = 0.8
    const l1: SocialPersonaVector = { ...L1_NEUTRAL, stance: 0.9 }
    const l2: CoreTemperamentVector = { ...L2_NEUTRAL, agreeableness: 0.9 }

    const profile = calculateCrossAxisProfile(l1, l2, L3_NEUTRAL)
    const tsundere = profile.axes.find((a) => a.axisId === "l1_stance__l2_agreeableness")

    expect(tsundere).toBeDefined()
    expect(tsundere!.relationship).toBe("paradox")
    expect(tsundere!.score).toBeCloseTo(0.8)
  })

  it("produces correct reinforcing score", () => {
    // depth=0.9, conscientiousness=0.9 → reinforcing → 1 - |0.9 - 0.9| = 1.0
    const l1: SocialPersonaVector = { ...L1_NEUTRAL, depth: 0.9 }
    const l2: CoreTemperamentVector = { ...L2_NEUTRAL, conscientiousness: 0.9 }

    const profile = calculateCrossAxisProfile(l1, l2, L3_NEUTRAL)
    const axis = profile.axes.find((a) => a.axisId === "l1_depth__l2_conscientiousness")

    expect(axis).toBeDefined()
    expect(axis!.relationship).toBe("reinforcing")
    expect(axis!.score).toBeCloseTo(1.0)
  })

  it("produces correct modulating score", () => {
    // depth=0.8, neuroticism=0.6 → modulating → invertB for neuroticism
    // invertB=true for neuroticism → effective = 1 - 0.6 = 0.4
    // modulating formula uses raw value though (not inverted for modulating type)
    // Actually modulating uses: dimA × dimB (NO inversion for modulating)
    const l1: SocialPersonaVector = { ...L1_NEUTRAL, depth: 0.8 }
    const l2: CoreTemperamentVector = { ...L2_NEUTRAL, neuroticism: 0.6 }

    const profile = calculateCrossAxisProfile(l1, l2, L3_NEUTRAL)
    const axis = profile.axes.find((a) => a.axisId === "l1_depth__l2_neuroticism")

    expect(axis).toBeDefined()
    expect(axis!.relationship).toBe("modulating")
    // modulating: dimA × dimB = 0.8 × 0.6 = 0.48
    expect(axis!.score).toBeCloseTo(0.48)
  })

  it("has summary statistics", () => {
    const profile = calculateCrossAxisProfile(L1_NEUTRAL, L2_NEUTRAL, L3_NEUTRAL)

    expect(typeof profile.summary.paradoxCount).toBe("number")
    expect(typeof profile.summary.reinforcingCount).toBe("number")
    expect(typeof profile.summary.modulatingIntensity).toBe("number")
    expect(typeof profile.summary.characterComplexity).toBe("number")
    expect(profile.summary.characterComplexity).toBeGreaterThanOrEqual(0)
    expect(profile.summary.characterComplexity).toBeLessThanOrEqual(1)
  })

  it("each axis has unique id", () => {
    const profile = calculateCrossAxisProfile(L1_NEUTRAL, L2_NEUTRAL, L3_NEUTRAL)
    const ids = profile.axes.map((a) => a.axisId)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(83)
  })
})
