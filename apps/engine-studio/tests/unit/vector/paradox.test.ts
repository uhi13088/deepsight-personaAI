import { describe, it, expect } from "vitest"
import {
  calculateL1L2ParadoxScore,
  calculateExtendedParadoxScore,
  calculateDimensionality,
} from "@/lib/vector/paradox"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import {
  NEUTRAL_L1 as L1_NEUTRAL,
  NEUTRAL_L2 as L2_NEUTRAL,
  NEUTRAL_L3 as L3_NEUTRAL,
} from "../fixtures"

describe("calculateL1L2ParadoxScore", () => {
  it("returns 0 for identical aligned vectors", () => {
    // When L1 matches L2 (considering inversion), paradox = 0
    const l1: SocialPersonaVector = {
      depth: 0.5, // → openness 0.5 (aligned)
      lens: 0.5, // → 1 - neuroticism 0.5 = 0.5 (inverse)
      stance: 0.5, // → 1 - agreeableness 0.5 = 0.5 (inverse)
      scope: 0.5, // → conscientiousness 0.5 (aligned)
      taste: 0.5, // → openness 0.5 (aligned)
      purpose: 0.5, // → conscientiousness 0.5 (aligned)
      sociability: 0.5, // → extraversion 0.5 (aligned)
    }
    const score = calculateL1L2ParadoxScore(l1, L2_NEUTRAL)
    expect(score).toBeCloseTo(0)
  })

  it("returns high score for opposing vectors", () => {
    // Max paradox: L1 extreme high, L2 extreme opposite
    const l1: SocialPersonaVector = {
      depth: 0.9,
      lens: 0.9,
      stance: 0.9,
      scope: 0.9,
      taste: 0.9,
      purpose: 0.9,
      sociability: 0.9,
    }
    const l2: CoreTemperamentVector = {
      openness: 0.1, // depth paradox: |0.9 - 0.1| = 0.8
      conscientiousness: 0.1, // scope/purpose paradox: |0.9 - 0.1| = 0.8
      extraversion: 0.1, // sociability paradox: |0.9 - 0.1| = 0.8
      agreeableness: 0.9, // stance paradox: |0.9 - (1-0.9)| = 0.8
      neuroticism: 0.9, // lens paradox: |0.9 - (1-0.9)| = 0.8
    }
    const score = calculateL1L2ParadoxScore(l1, l2)
    expect(score).toBeCloseTo(0.8)
  })

  it("score is always in [0, 1] range", () => {
    const score = calculateL1L2ParadoxScore(L1_NEUTRAL, L2_NEUTRAL)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })
})

describe("calculateDimensionality", () => {
  it("peaks at paradoxScore ≈ 0.35", () => {
    const atPeak = calculateDimensionality(0.35)
    const atZero = calculateDimensionality(0)
    const atOne = calculateDimensionality(1.0)

    expect(atPeak).toBeCloseTo(1.0)
    expect(atZero).toBeLessThan(atPeak)
    expect(atOne).toBeLessThan(atPeak)
  })

  it("is symmetric around 0.35", () => {
    const below = calculateDimensionality(0.15) // 0.35 - 0.20
    const above = calculateDimensionality(0.55) // 0.35 + 0.20
    expect(below).toBeCloseTo(above, 5)
  })

  it("returns value in (0, 1] range", () => {
    for (let p = 0; p <= 1; p += 0.1) {
      const d = calculateDimensionality(p)
      expect(d).toBeGreaterThan(0)
      expect(d).toBeLessThanOrEqual(1)
    }
  })
})

describe("calculateExtendedParadoxScore", () => {
  it("returns complete ParadoxProfile", () => {
    const crossAxisProfile = calculateCrossAxisProfile(L1_NEUTRAL, L2_NEUTRAL, L3_NEUTRAL)
    const profile = calculateExtendedParadoxScore(
      L1_NEUTRAL,
      L2_NEUTRAL,
      L3_NEUTRAL,
      crossAxisProfile
    )

    expect(typeof profile.l1l2).toBe("number")
    expect(typeof profile.l1l3).toBe("number")
    expect(typeof profile.l2l3).toBe("number")
    expect(typeof profile.overall).toBe("number")
    expect(typeof profile.dimensionality).toBe("number")
    expect(profile.dominant).toBeDefined()
    expect(profile.dominant.layer).toMatch(/^L\dxL\d$/)
  })

  it("overall = weighted sum of layer paradoxes", () => {
    const crossAxisProfile = calculateCrossAxisProfile(L1_NEUTRAL, L2_NEUTRAL, L3_NEUTRAL)
    const profile = calculateExtendedParadoxScore(
      L1_NEUTRAL,
      L2_NEUTRAL,
      L3_NEUTRAL,
      crossAxisProfile
    )

    const expected = 0.5 * profile.l1l2 + 0.3 * profile.l1l3 + 0.2 * profile.l2l3
    expect(profile.overall).toBeCloseTo(expected)
  })

  it("works without crossAxisProfile (L1↔L3, L2↔L3 = 0)", () => {
    const profile = calculateExtendedParadoxScore(L1_NEUTRAL, L2_NEUTRAL)
    expect(profile.l1l3).toBe(0)
    expect(profile.l2l3).toBe(0)
    expect(profile.overall).toBeCloseTo(0.5 * profile.l1l2)
  })
})
