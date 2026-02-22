import { describe, it, expect } from "vitest"
import {
  computeTrustScore,
  computeLambda,
  computeConflictResolutionRate,
  computeEngagementSlope,
  computeSessionNorm,
  W_CONFLICT_RESOLUTION,
  W_ENGAGEMENT_SLOPE,
  W_SESSION_NORM,
  LAMBDA_CENTER,
  LAMBDA_ACTIVE_THRESHOLD,
} from "@/lib/persona-world/quality/trust-score"

// ═══════════════════════════════════════════════════════════════
// computeLambda — 시그모이드 활성화 가중치
// ═══════════════════════════════════════════════════════════════

describe("computeLambda", () => {
  it("0 세션 → λ ≈ 0.007 (거의 비활성)", () => {
    const lambda = computeLambda(0)
    expect(lambda).toBeLessThan(0.01)
  })

  it("10 세션 → λ ≈ 0.03 (비활성)", () => {
    const lambda = computeLambda(10)
    expect(lambda).toBeGreaterThan(0.02)
    expect(lambda).toBeLessThan(0.1)
  })

  it("30 세션 → λ = 0.5 (활성화 시작, 중심점)", () => {
    const lambda = computeLambda(30)
    expect(lambda).toBeCloseTo(0.5, 1)
  })

  it("50 세션 → λ ≈ 0.97 (거의 완전 활성)", () => {
    const lambda = computeLambda(50)
    expect(lambda).toBeGreaterThan(0.95)
    expect(lambda).toBeLessThan(0.99)
  })

  it("100 세션 → λ ≈ 0.99 (완전 활성)", () => {
    const lambda = computeLambda(100)
    expect(lambda).toBeGreaterThan(0.99)
  })

  it("λ 단조 증가", () => {
    const lambdas = [0, 10, 20, 30, 40, 50, 100].map(computeLambda)
    for (let i = 1; i < lambdas.length; i++) {
      expect(lambdas[i]).toBeGreaterThan(lambdas[i - 1])
    }
  })

  it("λ는 0~1 범위", () => {
    for (const sessions of [0, 1, 5, 10, 30, 50, 100, 1000]) {
      const lambda = computeLambda(sessions)
      expect(lambda).toBeGreaterThanOrEqual(0)
      expect(lambda).toBeLessThanOrEqual(1)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// computeConflictResolutionRate
// ═══════════════════════════════════════════════════════════════

describe("computeConflictResolutionRate", () => {
  it("갈등 0건 → 1.0 (무갈등 = 완전 해결)", () => {
    expect(computeConflictResolutionRate(0, 0)).toBe(1.0)
  })

  it("전부 해결 → 1.0", () => {
    expect(computeConflictResolutionRate(5, 5)).toBe(1.0)
  })

  it("절반 해결 → 0.5", () => {
    expect(computeConflictResolutionRate(3, 6)).toBe(0.5)
  })

  it("해결 0 → 0.0", () => {
    expect(computeConflictResolutionRate(0, 10)).toBe(0)
  })

  it("해결 > 갈등 → 최대 1.0 (클램프)", () => {
    expect(computeConflictResolutionRate(10, 5)).toBe(1.0)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeEngagementSlope
// ═══════════════════════════════════════════════════════════════

describe("computeEngagementSlope", () => {
  it("빈 배열 → 0", () => {
    expect(computeEngagementSlope([])).toBe(0)
  })

  it("1개 원소 → 0 (회귀 불가)", () => {
    expect(computeEngagementSlope([0.5])).toBe(0)
  })

  it("증가 추세 → 양의 기울기", () => {
    const slope = computeEngagementSlope([0.1, 0.2, 0.3, 0.4, 0.5])
    expect(slope).toBeGreaterThan(0)
  })

  it("감소 추세 → 음의 기울기", () => {
    const slope = computeEngagementSlope([0.5, 0.4, 0.3, 0.2, 0.1])
    expect(slope).toBeLessThan(0)
  })

  it("일정한 값 → 0에 가까운 기울기", () => {
    const slope = computeEngagementSlope([0.5, 0.5, 0.5, 0.5])
    expect(Math.abs(slope)).toBeLessThan(0.001)
  })

  it("급격한 증가 → 큰 양의 기울기", () => {
    const slope = computeEngagementSlope([0.0, 0.5, 1.0])
    expect(slope).toBeCloseTo(0.5, 2)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeSessionNorm
// ═══════════════════════════════════════════════════════════════

describe("computeSessionNorm", () => {
  it("0 세션 → 0", () => {
    expect(computeSessionNorm(0)).toBe(0)
  })

  it("50 세션 → 0.5", () => {
    expect(computeSessionNorm(50)).toBe(0.5)
  })

  it("100 세션 → 1.0 (상한)", () => {
    expect(computeSessionNorm(100)).toBe(1.0)
  })

  it("200 세션 → 1.0 (상한 초과해도 1.0)", () => {
    expect(computeSessionNorm(200)).toBe(1.0)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeTrustScore — 통합 계산
// ═══════════════════════════════════════════════════════════════

describe("computeTrustScore", () => {
  it("0 세션 → 거의 0 (λ가 0에 가까움)", () => {
    const result = computeTrustScore({
      totalSessions: 0,
      conflictResolutions: 0,
      totalConflicts: 0,
      engagementDepths: [],
    })
    expect(result.score).toBeLessThan(0.01)
    expect(result.isActive).toBe(false)
  })

  it("30 세션, 모든 지표 양호 → 중간 점수", () => {
    const result = computeTrustScore({
      totalSessions: 30,
      conflictResolutions: 5,
      totalConflicts: 5,
      engagementDepths: [0.3, 0.4, 0.5, 0.6, 0.7],
    })
    expect(result.score).toBeGreaterThan(0.3)
    expect(result.lambda).toBeCloseTo(0.5, 1)
    expect(result.isActive).toBe(true)
  })

  it("100 세션, 양호 → 높은 점수", () => {
    const result = computeTrustScore({
      totalSessions: 100,
      conflictResolutions: 10,
      totalConflicts: 10,
      engagementDepths: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
    })
    expect(result.score).toBeGreaterThan(0.7)
    expect(result.isActive).toBe(true)
  })

  it("score 범위 0~1", () => {
    const result = computeTrustScore({
      totalSessions: 50,
      conflictResolutions: 3,
      totalConflicts: 10,
      engagementDepths: [0.5, 0.4, 0.3],
    })
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })

  it("isActive = λ >= 0.5 기준", () => {
    const inactive = computeTrustScore({
      totalSessions: 10,
      conflictResolutions: 0,
      totalConflicts: 0,
      engagementDepths: [],
    })
    expect(inactive.isActive).toBe(false)

    const active = computeTrustScore({
      totalSessions: 50,
      conflictResolutions: 0,
      totalConflicts: 0,
      engagementDepths: [],
    })
    expect(active.isActive).toBe(true)
  })

  it("갈등 해결률이 낮으면 점수 감소", () => {
    const good = computeTrustScore({
      totalSessions: 50,
      conflictResolutions: 10,
      totalConflicts: 10,
      engagementDepths: [0.5, 0.5, 0.5],
    })
    const bad = computeTrustScore({
      totalSessions: 50,
      conflictResolutions: 0,
      totalConflicts: 10,
      engagementDepths: [0.5, 0.5, 0.5],
    })
    expect(good.score).toBeGreaterThan(bad.score)
  })

  it("결과 구조 검증", () => {
    const result = computeTrustScore({
      totalSessions: 30,
      conflictResolutions: 2,
      totalConflicts: 5,
      engagementDepths: [0.3, 0.5, 0.7],
    })
    expect(result).toHaveProperty("score")
    expect(result).toHaveProperty("lambda")
    expect(result).toHaveProperty("conflictResolutionRate")
    expect(result).toHaveProperty("engagementDepthSlope")
    expect(result).toHaveProperty("sessionNorm")
    expect(result).toHaveProperty("isActive")
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("가중치 합 = 1.0", () => {
    const sum = W_CONFLICT_RESOLUTION + W_ENGAGEMENT_SLOPE + W_SESSION_NORM
    expect(sum).toBeCloseTo(1.0, 5)
  })

  it("LAMBDA_CENTER = 30", () => {
    expect(LAMBDA_CENTER).toBe(30)
  })

  it("LAMBDA_ACTIVE_THRESHOLD = 0.5", () => {
    expect(LAMBDA_ACTIVE_THRESHOLD).toBe(0.5)
  })
})
