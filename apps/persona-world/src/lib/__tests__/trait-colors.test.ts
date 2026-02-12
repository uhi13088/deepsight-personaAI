import { describe, it, expect } from "vitest"
import {
  L1_DIMENSIONS,
  L2_DIMENSIONS,
  L3_DIMENSIONS,
  ALL_DIMENSIONS,
  LAYER_COLORS,
  getTraitDimension,
  getDimensionsByLayer,
  getLayerValues,
  mapLayerToTraits,
} from "../trait-colors"

describe("trait-colors: 3-Layer 16D 색상 매핑", () => {
  // ── 차원 수 검증 ──────────────────────────────────────
  it("L1 = 7D (Social Persona)", () => {
    expect(L1_DIMENSIONS).toHaveLength(7)
    const keys = L1_DIMENSIONS.map((d) => d.key)
    expect(keys).toContain("depth")
    expect(keys).toContain("sociability")
  })

  it("L2 = 5D (Core Temperament / OCEAN)", () => {
    expect(L2_DIMENSIONS).toHaveLength(5)
    const keys = L2_DIMENSIONS.map((d) => d.key)
    expect(keys).toContain("openness")
    expect(keys).toContain("neuroticism")
  })

  it("L3 = 4D (Narrative Drive)", () => {
    expect(L3_DIMENSIONS).toHaveLength(4)
    const keys = L3_DIMENSIONS.map((d) => d.key)
    expect(keys).toContain("lack")
    expect(keys).toContain("growthArc")
  })

  it("ALL_DIMENSIONS = 16개", () => {
    expect(ALL_DIMENSIONS).toHaveLength(16)
  })

  // ── 레이어 구분 ───────────────────────────────────────
  it("모든 L1 차원의 layer = 'L1'", () => {
    L1_DIMENSIONS.forEach((d) => expect(d.layer).toBe("L1"))
  })

  it("모든 L2 차원의 layer = 'L2'", () => {
    L2_DIMENSIONS.forEach((d) => expect(d.layer).toBe("L2"))
  })

  it("모든 L3 차원의 layer = 'L3'", () => {
    L3_DIMENSIONS.forEach((d) => expect(d.layer).toBe("L3"))
  })

  // ── 색상 필드 검증 ────────────────────────────────────
  it("모든 차원이 color.primary, from, to를 가짐", () => {
    ALL_DIMENSIONS.forEach((d) => {
      expect(d.color.primary).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(d.color.from).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(d.color.to).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })

  // ── LAYER_COLORS ──────────────────────────────────────
  it("LAYER_COLORS에 L1/L2/L3 존재", () => {
    expect(LAYER_COLORS.L1.primary).toBe("#3B82F6")
    expect(LAYER_COLORS.L2.primary).toBe("#F59E0B")
    expect(LAYER_COLORS.L3.primary).toBe("#8B5CF6")
  })

  // ── getTraitDimension ─────────────────────────────────
  it("key로 차원 조회", () => {
    const dim = getTraitDimension("sociability")
    expect(dim).toBeDefined()
    expect(dim!.layer).toBe("L1")
    expect(dim!.label).toBe("사교성")
  })

  it("없는 key 시 undefined", () => {
    expect(getTraitDimension("nonexistent")).toBeUndefined()
  })

  // ── getDimensionsByLayer ──────────────────────────────
  it("getDimensionsByLayer('L1') = L1_DIMENSIONS", () => {
    expect(getDimensionsByLayer("L1")).toBe(L1_DIMENSIONS)
  })

  it("getDimensionsByLayer('L2') = L2_DIMENSIONS", () => {
    expect(getDimensionsByLayer("L2")).toBe(L2_DIMENSIONS)
  })

  it("getDimensionsByLayer('L3') = L3_DIMENSIONS", () => {
    expect(getDimensionsByLayer("L3")).toBe(L3_DIMENSIONS)
  })

  // ── getLayerValues ────────────────────────────────────
  it("3-Layer 벡터에서 레이어별 값 추출", () => {
    const vector = {
      social: {
        depth: 0.7,
        lens: 0.3,
        stance: 0.5,
        scope: 0.6,
        taste: 0.4,
        purpose: 0.8,
        sociability: 0.9,
      },
      temperament: {
        openness: 0.6,
        conscientiousness: 0.7,
        extraversion: 0.4,
        agreeableness: 0.5,
        neuroticism: 0.3,
      },
      narrative: { lack: 0.2, moralCompass: 0.8, volatility: 0.4, growthArc: 0.6 },
    }
    expect(getLayerValues(vector, "L1")).toBe(vector.social)
    expect(getLayerValues(vector, "L2")).toBe(vector.temperament)
    expect(getLayerValues(vector, "L3")).toBe(vector.narrative)
  })

  // ── mapLayerToTraits ──────────────────────────────────
  it("레이어 데이터를 차원 config + 값으로 매핑", () => {
    const data = { depth: 0.7, lens: 0.3, sociability: 0.9 }
    const result = mapLayerToTraits(data, "L1")
    // L1에 7개 차원 중 data에 있는 3개만 반환
    expect(result).toHaveLength(3)
    expect(result[0].key).toBe("depth")
    expect(result[0].value).toBe(0.7)
    expect(result[2].key).toBe("sociability")
    expect(result[2].value).toBe(0.9)
  })

  // ── engine-studio 동기화 검증 ─────────────────────────
  it("L1 depth primary = #3B82F6 (engine-studio와 동기화)", () => {
    const depth = getTraitDimension("depth")
    expect(depth!.color.primary).toBe("#3B82F6")
  })

  it("L2 openness primary = #F97316 (engine-studio와 동기화)", () => {
    const openness = getTraitDimension("openness")
    expect(openness!.color.primary).toBe("#F97316")
  })

  it("L3 lack primary = #7C3AED (engine-studio와 동기화)", () => {
    const lack = getTraitDimension("lack")
    expect(lack!.color.primary).toBe("#7C3AED")
  })

  // ── key 유일성 검증 ───────────────────────────────────
  it("ALL_DIMENSIONS의 key가 모두 유일", () => {
    const keys = ALL_DIMENSIONS.map((d) => d.key)
    const uniqueKeys = new Set(keys)
    expect(uniqueKeys.size).toBe(keys.length)
  })
})
