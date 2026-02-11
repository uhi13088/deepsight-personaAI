import { describe, it, expect } from "vitest"
import { projectL2toL1, projectL3toL1 } from "@/lib/vector/projection"
import type { CoreTemperamentVector, NarrativeDriveVector } from "@/types"

describe("projectL2toL1", () => {
  it("projects neutral OCEAN to expected L1 values", () => {
    const l2: CoreTemperamentVector = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }

    const result = projectL2toL1(l2)
    expect(result).toHaveLength(7)

    // depth = openness = 0.5
    expect(result[0]).toBe(0.5)
    // lens = 1 - neuroticism = 0.5
    expect(result[1]).toBe(0.5)
    // stance = 1 - agreeableness = 0.5
    expect(result[2]).toBe(0.5)
    // scope = conscientiousness = 0.5
    expect(result[3]).toBe(0.5)
    // taste = openness = 0.5
    expect(result[4]).toBe(0.5)
    // purpose = conscientiousness = 0.5
    expect(result[5]).toBe(0.5)
    // sociability = extraversion = 0.5
    expect(result[6]).toBe(0.5)
  })

  it("correctly inverts neuroticism and agreeableness", () => {
    const l2: CoreTemperamentVector = {
      openness: 0.8,
      conscientiousness: 0.7,
      extraversion: 0.9,
      agreeableness: 0.2, // stance = 1 - 0.2 = 0.8
      neuroticism: 0.9, // lens = 1 - 0.9 = 0.1
    }

    const result = projectL2toL1(l2)

    expect(result[0]).toBeCloseTo(0.8) // depth = openness
    expect(result[1]).toBeCloseTo(0.1) // lens = 1 - neuroticism
    expect(result[2]).toBeCloseTo(0.8) // stance = 1 - agreeableness
    expect(result[3]).toBeCloseTo(0.7) // scope = conscientiousness
    expect(result[6]).toBeCloseTo(0.9) // sociability = extraversion
  })
})

describe("projectL3toL1", () => {
  it("projects neutral L3 to 0.5 baseline", () => {
    const l3: NarrativeDriveVector = {
      lack: 0.0,
      moralCompass: 0.0,
      volatility: 0.0,
      growthArc: 0.0,
    }

    const result = projectL3toL1(l3)
    expect(result).toHaveLength(7)
    // All should be 0.5 when L3 = 0
    result.forEach((v) => expect(v).toBeCloseTo(0.5))
  })

  it("applies coefficients correctly", () => {
    const l3: NarrativeDriveVector = {
      lack: 1.0,
      moralCompass: 1.0,
      volatility: 1.0,
      growthArc: 1.0,
    }

    const result = projectL3toL1(l3)

    // depth = 0.5 + 1.0 * 0.3 = 0.8
    expect(result[0]).toBeCloseTo(0.8)
    // lens = 0.5 + 1.0 * -0.2 = 0.3
    expect(result[1]).toBeCloseTo(0.3)
    // stance = 0.5 + 1.0 * 0.2 = 0.7
    expect(result[2]).toBeCloseTo(0.7)
    // scope = 0.5 + 1.0 * 0.15 + 1.0 * -0.1 = 0.55
    expect(result[3]).toBeCloseTo(0.55)
    // taste = 0.5 + 1.0 * 0.2 + 1.0 * 0.15 = 0.85
    expect(result[4]).toBeCloseTo(0.85)
    // purpose = 0.5 + 1.0 * 0.2 = 0.7
    expect(result[5]).toBeCloseTo(0.7)
    // sociability = 0.5 + 1.0 * 0.1 = 0.6
    expect(result[6]).toBeCloseTo(0.6)
  })

  it("clamps output to [0, 1]", () => {
    // Even with extreme values, output stays in [0, 1]
    const l3: NarrativeDriveVector = {
      lack: 1.0,
      moralCompass: 1.0,
      volatility: 1.0,
      growthArc: 1.0,
    }

    const result = projectL3toL1(l3)
    result.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    })
  })
})
