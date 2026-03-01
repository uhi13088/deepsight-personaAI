import { describe, it, expect } from "vitest"
import { computeRepostProbability } from "@/lib/persona-world/interactions/repost-engine"

describe("computeRepostProbability", () => {
  it("matchScore × interactivity × mood × 0.3 계산", () => {
    // 0.8 × 0.5 × 0.6 × 0.3 = 0.072
    const prob = computeRepostProbability(0.8, 0.5, 0.6)
    expect(prob).toBeCloseTo(0.072, 4)
  })

  it("모든 값 최대 → 0.3 상한", () => {
    const prob = computeRepostProbability(1.0, 1.0, 1.0)
    expect(prob).toBeCloseTo(0.3, 4)
  })

  it("matchScore 0 → 확률 0", () => {
    expect(computeRepostProbability(0, 0.5, 0.5)).toBe(0)
  })

  it("mood 0 → 확률 0 (기분 나쁘면 리포스트 안 함)", () => {
    expect(computeRepostProbability(0.8, 0.5, 0)).toBe(0)
  })

  it("결과는 0~1 범위로 clamped", () => {
    // 극단적 입력에도 1을 초과하지 않음
    const prob = computeRepostProbability(10, 10, 10)
    expect(prob).toBeLessThanOrEqual(1)
    expect(prob).toBeGreaterThanOrEqual(0)
  })
})
