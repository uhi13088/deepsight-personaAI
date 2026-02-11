import { describe, it, expect } from "vitest"
import { calculateVFinal, vFinalToVector } from "@/lib/vector/v-final"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

const L1: SocialPersonaVector = {
  depth: 0.8,
  lens: 0.3,
  stance: 0.7,
  scope: 0.6,
  taste: 0.9,
  purpose: 0.4,
  sociability: 0.5,
}

const L2: CoreTemperamentVector = {
  openness: 0.6,
  conscientiousness: 0.7,
  extraversion: 0.4,
  agreeableness: 0.8,
  neuroticism: 0.3,
}

const L3: NarrativeDriveVector = {
  lack: 0.7,
  moralCompass: 0.5,
  volatility: 0.3,
  growthArc: 0.6,
}

describe("calculateVFinal", () => {
  it("returns L1 when pressure is 0", () => {
    const result = calculateVFinal(L1, L2, L3, 0)

    expect(result.vector).toHaveLength(7)
    expect(result.vector[0]).toBeCloseTo(L1.depth)
    expect(result.vector[1]).toBeCloseTo(L1.lens)
    expect(result.vector[2]).toBeCloseTo(L1.stance)
    expect(result.pressure).toBe(0)
    expect(result.layerContributions.l1Weight).toBe(1)
    expect(result.layerContributions.l2Weight).toBe(0)
    expect(result.layerContributions.l3Weight).toBe(0)
  })

  it("blends L2/L3 when pressure is 1", () => {
    const result = calculateVFinal(L1, L2, L3, 1.0, 0.6)

    expect(result.pressure).toBe(1)
    expect(result.layerContributions.l1Weight).toBe(0)
    expect(result.layerContributions.l2Weight).toBeCloseTo(0.6)
    expect(result.layerContributions.l3Weight).toBeCloseTo(0.4)

    // V_Final = 0*L1 + 1*(0.6*L2proj + 0.4*L3proj) = 0.6*L2proj + 0.4*L3proj
    // Each value should be purely from L2/L3 projections
    result.vector.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    })
  })

  it("output always in [0, 1] range", () => {
    for (let p = 0; p <= 1; p += 0.2) {
      const result = calculateVFinal(L1, L2, L3, p)
      result.vector.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      })
    }
  })

  it("includes L2/L3 projections in result", () => {
    const result = calculateVFinal(L1, L2, L3)
    expect(result.l2Projected).toHaveLength(7)
    expect(result.l3Projected).toHaveLength(7)
  })

  it("clamps pressure to [0, 1]", () => {
    const result = calculateVFinal(L1, L2, L3, 2.0)
    expect(result.pressure).toBe(1)
  })

  it("throws on invalid alpha + beta", () => {
    expect(() => calculateVFinal(L1, L2, L3, 0.5, 0.6, 0.6)).toThrow("alpha + beta must equal 1.0")
  })

  it("uses default dynamics values", () => {
    const result = calculateVFinal(L1, L2, L3)
    expect(result.pressure).toBeCloseTo(0.1) // default pressure
    expect(result.layerContributions.l1Weight).toBeCloseTo(0.9) // 1 - 0.1
  })
})

describe("vFinalToVector", () => {
  it("converts VFinalResult to SocialPersonaVector", () => {
    const result = calculateVFinal(L1, L2, L3, 0)
    const vector = vFinalToVector(result)

    expect(vector.depth).toBeCloseTo(L1.depth)
    expect(vector.lens).toBeCloseTo(L1.lens)
    expect(vector.stance).toBeCloseTo(L1.stance)
    expect(vector.scope).toBeCloseTo(L1.scope)
    expect(vector.taste).toBeCloseTo(L1.taste)
    expect(vector.purpose).toBeCloseTo(L1.purpose)
    expect(vector.sociability).toBeCloseTo(L1.sociability)
  })
})
