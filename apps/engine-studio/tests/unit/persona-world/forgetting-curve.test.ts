import { describe, it, expect } from "vitest"
import {
  computeStability,
  computeRetention,
  computeRetentionFromPoignancy,
  applyForgettingCurve,
  filterAndRankByRetention,
  BASE_STABILITY,
  MAX_STABILITY,
  CORE_MEMORY_STABILITY,
  RETENTION_CUTOFF,
  STABILITY_CONFIG,
} from "@/lib/persona-world/forgetting-curve"

// ═══════════════════════════════════════════════════════════════
// computeStability
// ═══════════════════════════════════════════════════════════════

describe("computeStability", () => {
  it("poignancy=0 → BASE_STABILITY (7일)", () => {
    const result = computeStability(0)
    expect(result).toBe(BASE_STABILITY)
    expect(result).toBe(7)
  })

  it("poignancy=1.0 → CORE_MEMORY_STABILITY (핵심 기억 = 영구)", () => {
    const result = computeStability(1.0)
    expect(result).toBe(CORE_MEMORY_STABILITY)
  })

  it("poignancy >= coreThreshold → CORE_MEMORY_STABILITY", () => {
    expect(computeStability(0.8)).toBe(CORE_MEMORY_STABILITY)
    expect(computeStability(0.9)).toBe(CORE_MEMORY_STABILITY)
    expect(computeStability(1.0)).toBe(CORE_MEMORY_STABILITY)
  })

  it("poignancy 증가 → stability 증가 (단조 증가)", () => {
    const s0 = computeStability(0)
    const s02 = computeStability(0.2)
    const s04 = computeStability(0.4)
    const s06 = computeStability(0.6)
    expect(s02).toBeGreaterThan(s0)
    expect(s04).toBeGreaterThan(s02)
    expect(s06).toBeGreaterThan(s04)
  })

  it("scalePower=2이므로 낮은 poignancy는 빠르게 잊힘", () => {
    // poignancy=0.1 → stability ≈ 7 + 358 × 0.01 = 10.58
    const s01 = computeStability(0.1)
    expect(s01).toBeCloseTo(10.58, 0)
    expect(s01).toBeLessThan(15) // 2주도 안됨
  })

  it("poignancy=0.5 → 약 3개월", () => {
    const s05 = computeStability(0.5)
    // 7 + 358 × 0.25 = 7 + 89.5 = 96.5
    expect(s05).toBeCloseTo(96.5, 0)
  })

  it("음수/범위 초과 입력도 안전 처리", () => {
    const sNeg = computeStability(-0.5)
    expect(sNeg).toBe(BASE_STABILITY)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeRetention
// ═══════════════════════════════════════════════════════════════

describe("computeRetention", () => {
  it("경과 시간 0 → retention=1.0", () => {
    expect(computeRetention(0, 30)).toBe(1.0)
  })

  it("경과 시간 = stability → retention ≈ 0.368 (1/e)", () => {
    const result = computeRetention(30, 30)
    expect(result).toBeCloseTo(1 / Math.E, 3)
  })

  it("경과 시간 >> stability → retention → 0", () => {
    const result = computeRetention(1000, 7)
    expect(result).toBeLessThan(0.001)
  })

  it("stability가 매우 크면 retention ≈ 1.0 (핵심 기억)", () => {
    const result = computeRetention(365, CORE_MEMORY_STABILITY) // 1년 후
    expect(result).toBeGreaterThan(0.9)
  })

  it("음수 경과 시간 → 1.0", () => {
    expect(computeRetention(-10, 30)).toBe(1.0)
  })

  it("stability 0 이하 → 0.0", () => {
    expect(computeRetention(10, 0)).toBe(0.0)
    expect(computeRetention(10, -5)).toBe(0.0)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeRetentionFromPoignancy
// ═══════════════════════════════════════════════════════════════

describe("computeRetentionFromPoignancy", () => {
  it("일상 대화 (poignancy=0) 1주 후 → 거의 잊힘", () => {
    const retention = computeRetentionFromPoignancy(0, 7) // 1주 후
    // retention = e^(-7/7) = e^(-1) ≈ 0.368
    expect(retention).toBeCloseTo(0.368, 2)
  })

  it("일상 대화 (poignancy=0) 1개월 후 → 사실상 잊힘", () => {
    const retention = computeRetentionFromPoignancy(0, 30)
    // retention = e^(-30/7) ≈ 0.014
    expect(retention).toBeLessThan(RETENTION_CUTOFF) // 0.05 이하
  })

  it("중요 기억 (poignancy=0.5) 3개월 후 → 여전히 기억", () => {
    const retention = computeRetentionFromPoignancy(0.5, 90)
    // S ≈ 96.5, retention = e^(-90/96.5) ≈ 0.394
    expect(retention).toBeGreaterThan(0.3)
  })

  it("핵심 기억 (poignancy=0.9) 1년 후 → 거의 유지", () => {
    const retention = computeRetentionFromPoignancy(0.9, 365)
    // S = CORE(3650), retention = e^(-365/3650) ≈ 0.905
    expect(retention).toBeGreaterThan(0.9)
  })

  it("핵심 기억은 3년 후에도 높은 retention", () => {
    const retention = computeRetentionFromPoignancy(0.85, 365 * 3) // 3년
    // S = CORE(3650), retention = e^(-1095/3650) ≈ 0.741
    expect(retention).toBeGreaterThan(0.7)
  })
})

// ═══════════════════════════════════════════════════════════════
// applyForgettingCurve
// ═══════════════════════════════════════════════════════════════

describe("applyForgettingCurve", () => {
  it("최근 기억 → relevance 거의 유지", () => {
    const result = applyForgettingCurve({
      createdAt: Date.now() - 1000 * 60 * 60, // 1시간 전
      poignancy: 0.3,
      relevance: 0.8,
    })
    expect(result.adjustedRelevance).toBeCloseTo(0.8, 1)
    expect(result.retention).toBeGreaterThan(0.99)
    expect(result.isEffectivelyForgotten).toBe(false)
  })

  it("오래된 일상 기억 → relevance 대폭 감소", () => {
    const result = applyForgettingCurve({
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60, // 60일 전
      poignancy: 0.0, // 일상
      relevance: 0.9,
    })
    expect(result.adjustedRelevance).toBeLessThan(0.01)
    expect(result.isEffectivelyForgotten).toBe(true)
  })

  it("오래된 감정적 기억 → relevance 유지", () => {
    const result = applyForgettingCurve({
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 180, // 6개월 전
      poignancy: 0.9, // 핵심
      relevance: 0.7,
    })
    // CORE stability → 거의 유지
    expect(result.adjustedRelevance).toBeGreaterThan(0.6)
    expect(result.isEffectivelyForgotten).toBe(false)
  })

  it("isEffectivelyForgotten: retention < RETENTION_CUTOFF", () => {
    const result = applyForgettingCurve({
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365, // 1년 전
      poignancy: 0.0,
      relevance: 1.0,
    })
    expect(result.isEffectivelyForgotten).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// filterAndRankByRetention
// ═══════════════════════════════════════════════════════════════

describe("filterAndRankByRetention", () => {
  it("잊혀진 기억 필터링", () => {
    const memories = [
      { id: "recent", createdAt: Date.now() - 1000 * 60 * 60, poignancy: 0.3 },
      { id: "old-boring", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365, poignancy: 0.0 },
      { id: "old-important", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 180, poignancy: 0.9 },
    ]
    const result = filterAndRankByRetention(memories)
    // old-boring은 필터링됨
    const ids = result.map((m) => m.id)
    expect(ids).toContain("recent")
    expect(ids).toContain("old-important")
    expect(ids).not.toContain("old-boring")
  })

  it("retention 높은 순으로 정렬", () => {
    const memories = [
      { id: "a", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30, poignancy: 0.3 },
      { id: "b", createdAt: Date.now() - 1000 * 60 * 60 * 24, poignancy: 0.3 },
      { id: "c", createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7, poignancy: 0.3 },
    ]
    const result = filterAndRankByRetention(memories)
    // b(1일) > c(7일) > a(30일)
    expect(result[0].id).toBe("b")
    expect(result[1].id).toBe("c")
    expect(result[2].id).toBe("a")
  })

  it("빈 배열 → 빈 결과", () => {
    const result = filterAndRankByRetention([])
    expect(result).toHaveLength(0)
  })

  it("결과에 retention/stability 필드 포함", () => {
    const memories = [{ id: "x", createdAt: Date.now(), poignancy: 0.5 }]
    const result = filterAndRankByRetention(memories)
    expect(result[0]).toHaveProperty("retention")
    expect(result[0]).toHaveProperty("stability")
    expect(result[0].retention).toBeCloseTo(1.0, 1)
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("BASE_STABILITY < MAX_STABILITY < CORE_MEMORY_STABILITY", () => {
    expect(BASE_STABILITY).toBeLessThan(MAX_STABILITY)
    expect(MAX_STABILITY).toBeLessThan(CORE_MEMORY_STABILITY)
  })

  it("RETENTION_CUTOFF: 0 < cutoff < 0.1", () => {
    expect(RETENTION_CUTOFF).toBeGreaterThan(0)
    expect(RETENTION_CUTOFF).toBeLessThan(0.1)
  })

  it("STABILITY_CONFIG: coreThreshold > significantThreshold", () => {
    expect(STABILITY_CONFIG.coreThreshold).toBeGreaterThan(STABILITY_CONFIG.significantThreshold)
  })
})
