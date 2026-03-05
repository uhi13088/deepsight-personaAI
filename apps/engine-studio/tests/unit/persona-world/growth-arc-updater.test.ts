import { describe, it, expect } from "vitest"
import {
  sumL3Influences,
  applyL3Delta,
  updateGrowthArc,
  L3_LIFETIME_MAX_DRIFT,
  L3_PER_CONSOLIDATION_MAX,
} from "@/lib/persona-world/growth-arc-updater"

// ── sumL3Influences ──────────────────────────────────────────────

describe("sumL3Influences", () => {
  it("빈 배열 → 모두 0", () => {
    const result = sumL3Influences([])
    expect(result).toEqual({ lack: 0, moralCompass: 0, volatility: 0, growthArc: 0 })
  })

  it("단일 influence → 그대로 반환", () => {
    const inf = { lack: 0.001, moralCompass: -0.001, volatility: 0.002, growthArc: 0.003 }
    const result = sumL3Influences([inf])
    expect(result.lack).toBeCloseTo(0.001)
    expect(result.growthArc).toBeCloseTo(0.003)
  })

  it("복수 influence 합산", () => {
    const influences = [
      { lack: 0.001, moralCompass: 0, volatility: 0, growthArc: 0.002 },
      { lack: 0.001, moralCompass: 0, volatility: 0, growthArc: 0.001 },
    ]
    const result = sumL3Influences(influences)
    expect(result.lack).toBeCloseTo(0.002)
    expect(result.growthArc).toBeCloseTo(0.003)
  })
})

// ── applyL3Delta ─────────────────────────────────────────────────

describe("applyL3Delta", () => {
  const base = { lack: 0.5, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 }

  it("정상 delta 적용", () => {
    const delta = { lack: 0.001, moralCompass: 0, volatility: 0, growthArc: 0.003 }
    const result = applyL3Delta(base, base, delta)
    expect(result.lack).toBeCloseTo(0.501)
    expect(result.growthArc).toBeCloseTo(0.503)
  })

  it("per-consolidation max 초과 시 clamp", () => {
    // growthArc per-consolidation max = 0.005
    const delta = { lack: 0, moralCompass: 0, volatility: 0, growthArc: 0.999 }
    const result = applyL3Delta(base, base, delta)
    // max 0.005만큼만 증가
    expect(result.growthArc).toBeCloseTo(0.5 + L3_PER_CONSOLIDATION_MAX.growthArc)
  })

  it("lifetime drift 한도 초과 시 상한에 고정", () => {
    // lack의 lifetime max = 0.10
    // current=0.5+0.09, original=0.5 → upper bound = 0.5+0.10=0.60
    const current = { lack: 0.59, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 }
    const original = { lack: 0.5, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 }
    const delta = { lack: 0.001, moralCompass: 0, volatility: 0, growthArc: 0 }
    const result = applyL3Delta(current, original, delta)
    // 0.59 + 0.001 = 0.591, 하지만 upper bound = 0.60이므로 0.591이 됨
    expect(result.lack).toBeCloseTo(0.591)
  })

  it("lifetime drift 이미 최대 도달 시 변화 없음", () => {
    const current = { lack: 0.6, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 }
    const original = { lack: 0.5, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 }
    const delta = { lack: 0.001, moralCompass: 0, volatility: 0, growthArc: 0 }
    const result = applyL3Delta(current, original, delta)
    // upper bound = 0.5 + 0.10 = 0.60, 이미 0.60이므로 변화 없음
    expect(result.lack).toBeCloseTo(0.6)
  })

  it("값 범위 0.0~1.0 초과 방지", () => {
    const current = { lack: 0.99, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 }
    const original = { lack: 0.99, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 }
    const delta = { lack: 0.001, moralCompass: 0, volatility: 0, growthArc: 0 }
    const result = applyL3Delta(current, original, delta)
    expect(result.lack).toBeLessThanOrEqual(1.0)
  })
})

// ── updateGrowthArc — DI Mock ───────────────────────────────────

describe("updateGrowthArc", () => {
  const baseVector = { lack: 0.5, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 }

  function makeProvider() {
    return {
      async getL3Vector() {
        return { ...baseVector }
      },
      async getOriginalL3Vector() {
        return { ...baseVector }
      },
      async getRecentL3Influences() {
        return [{ lack: 0, moralCompass: 0, volatility: 0.001, growthArc: 0.002 }]
      },
      async updateL3Vector(_personaId: string, _vector: unknown) {
        return { newVersion: 2 }
      },
    }
  }

  it("정상 업데이트 시 skipped=false", async () => {
    const provider = makeProvider()
    const result = await updateGrowthArc(provider, "persona-1")
    expect(result.skipped).toBe(false)
    expect(result.newVersion).toBe(2)
  })

  it("L3 벡터 없으면 skipped=true", async () => {
    const provider = {
      ...makeProvider(),
      async getL3Vector() {
        return null
      },
    }
    const result = await updateGrowthArc(provider, "persona-1")
    expect(result.skipped).toBe(true)
    expect(result.skipReason).toBe("no_l3_vector")
  })

  it("influences 없으면 skipped=true", async () => {
    const provider = {
      ...makeProvider(),
      async getRecentL3Influences() {
        return []
      },
    }
    const result = await updateGrowthArc(provider, "persona-1")
    expect(result.skipped).toBe(true)
    expect(result.skipReason).toBe("no_influences")
  })

  it("growthArc가 delta만큼 증가", async () => {
    const provider = makeProvider()
    const result = await updateGrowthArc(provider, "persona-1")
    expect(result.newVector.growthArc).toBeGreaterThan(result.previousVector.growthArc)
  })

  it("L3_LIFETIME_MAX_DRIFT 상수값 검증", () => {
    expect(L3_LIFETIME_MAX_DRIFT.lack).toBe(0.1)
    expect(L3_LIFETIME_MAX_DRIFT.moralCompass).toBe(0.1)
    expect(L3_LIFETIME_MAX_DRIFT.growthArc).toBe(0.4)
  })
})
