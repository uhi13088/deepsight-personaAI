import { describe, it, expect } from "vitest"
import {
  determineStage,
  determineType,
  buildProtocol,
  computeRelationshipProfile,
  computeStageProgress,
  isToneAllowed,
  getInteractionMultiplier,
  summarizeRelationship,
  detectStageChange,
  STAGE_THRESHOLDS,
  TYPE_THRESHOLDS,
} from "@/lib/persona-world/interactions/relationship-protocol"
import type { RelationshipScore } from "@/lib/persona-world/types"

// ── 헬퍼 ────────────────────────────────────────────────────

function makeScore(overrides: Partial<RelationshipScore> = {}): RelationshipScore {
  return {
    warmth: 0.5,
    tension: 0.0,
    frequency: 0.0,
    depth: 0.0,
    lastInteractionAt: null,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// determineStage
// ═══════════════════════════════════════════════════════════════

describe("determineStage", () => {
  it("기본값 → STRANGER", () => {
    expect(determineStage(makeScore())).toBe("STRANGER")
  })

  it("frequency 0.1 + totalScore 0.3 → ACQUAINTANCE", () => {
    expect(determineStage(makeScore({ warmth: 0.1, frequency: 0.1, depth: 0.1 }))).toBe(
      "ACQUAINTANCE"
    )
  })

  it("frequency 0.3, depth 0.2, totalScore 0.8 → FAMILIAR", () => {
    expect(determineStage(makeScore({ warmth: 0.3, frequency: 0.3, depth: 0.2 }))).toBe("FAMILIAR")
  })

  it("frequency 0.5, depth 0.4, totalScore 1.5 → CLOSE", () => {
    expect(determineStage(makeScore({ warmth: 0.6, frequency: 0.5, depth: 0.4 }))).toBe("CLOSE")
  })

  it("frequency 높지만 depth 부족 → ACQUAINTANCE (depth 미달)", () => {
    expect(determineStage(makeScore({ warmth: 0.5, frequency: 0.6, depth: 0.1 }))).toBe(
      "ACQUAINTANCE"
    )
  })

  it("모든 지표 최대 → CLOSE", () => {
    expect(determineStage(makeScore({ warmth: 1.0, frequency: 1.0, depth: 1.0 }))).toBe("CLOSE")
  })
})

// ═══════════════════════════════════════════════════════════════
// determineType
// ═══════════════════════════════════════════════════════════════

describe("determineType", () => {
  it("기본값 → NEUTRAL", () => {
    expect(determineType(makeScore())).toBe("NEUTRAL")
  })

  it("warmth 높고 tension 낮음 → ALLY", () => {
    expect(determineType(makeScore({ warmth: 0.7, tension: 0.1, depth: 0.3 }))).toBe("ALLY")
  })

  it("tension 높고 frequency 높음 → RIVAL", () => {
    expect(determineType(makeScore({ tension: 0.6, frequency: 0.4 }))).toBe("RIVAL")
  })

  it("warmth 높고 depth 높음 → MENTOR", () => {
    expect(determineType(makeScore({ warmth: 0.7, tension: 0.1, depth: 0.6 }))).toBe("MENTOR")
  })

  it("warmth 높고 depth 낮음 → FAN", () => {
    expect(determineType(makeScore({ warmth: 0.7, tension: 0.1, depth: 0.1 }))).toBe("FAN")
  })

  it("RIVAL이 ALLY보다 우선", () => {
    // warmth도 높지만 tension+frequency도 높음 → RIVAL 우선
    expect(determineType(makeScore({ warmth: 0.7, tension: 0.6, frequency: 0.4 }))).toBe("RIVAL")
  })
})

// ═══════════════════════════════════════════════════════════════
// buildProtocol
// ═══════════════════════════════════════════════════════════════

describe("buildProtocol", () => {
  it("STRANGER + NEUTRAL → 제한적 프로토콜", () => {
    const protocol = buildProtocol("STRANGER", "NEUTRAL")
    expect(protocol.interactionBoost).toBe(0.5)
    expect(protocol.selfDisclosure).toBe(0.1)
    expect(protocol.personalReferences).toBe(false)
    expect(protocol.vulnerabilityAllowed).toBe(false)
  })

  it("CLOSE + NEUTRAL → 개방적 프로토콜", () => {
    const protocol = buildProtocol("CLOSE", "NEUTRAL")
    expect(protocol.interactionBoost).toBe(1.5)
    expect(protocol.selfDisclosure).toBe(0.8)
    expect(protocol.personalReferences).toBe(true)
    expect(protocol.vulnerabilityAllowed).toBe(true)
    expect(protocol.allowedTones).toContain("vulnerable")
  })

  it("FAMILIAR + RIVAL → 논쟁 강화", () => {
    const protocol = buildProtocol("FAMILIAR", "RIVAL")
    expect(protocol.debateWillingness).toBeGreaterThan(0.6)
    expect(protocol.allowedTones).toContain("counter_argument")
    expect(protocol.allowedTones).toContain("defensive")
  })

  it("ACQUAINTANCE + ALLY → 인터랙션 부스트", () => {
    const protocol = buildProtocol("ACQUAINTANCE", "ALLY")
    expect(protocol.interactionBoost).toBeGreaterThan(1.0)
    expect(protocol.allowedTones).toContain("supportive")
  })

  it("FAMILIAR + FAN → 높은 인터랙션 + 낮은 논쟁", () => {
    const protocol = buildProtocol("FAMILIAR", "FAN")
    expect(protocol.interactionBoost).toBeGreaterThan(1.4)
    expect(protocol.debateWillingness).toBeLessThan(0.5)
  })

  it("interactionBoost 범위 제한 (0~2)", () => {
    const protocol = buildProtocol("CLOSE", "FAN")
    expect(protocol.interactionBoost).toBeLessThanOrEqual(2)
    expect(protocol.interactionBoost).toBeGreaterThanOrEqual(0)
  })

  it("selfDisclosure 범위 제한 (0~1)", () => {
    const protocol = buildProtocol("STRANGER", "RIVAL")
    expect(protocol.selfDisclosure).toBeGreaterThanOrEqual(0)
    expect(protocol.selfDisclosure).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeRelationshipProfile
// ═══════════════════════════════════════════════════════════════

describe("computeRelationshipProfile", () => {
  it("기본 스코어 → STRANGER/NEUTRAL", () => {
    const profile = computeRelationshipProfile(makeScore())
    expect(profile.stage).toBe("STRANGER")
    expect(profile.type).toBe("NEUTRAL")
  })

  it("높은 인터랙션 → CLOSE/ALLY", () => {
    const profile = computeRelationshipProfile(
      makeScore({ warmth: 0.8, tension: 0.1, frequency: 0.6, depth: 0.5 })
    )
    expect(profile.stage).toBe("CLOSE")
    expect(profile.type).toBe("MENTOR") // depth 높으면 MENTOR
  })

  it("갈등 관계 → RIVAL", () => {
    const profile = computeRelationshipProfile(
      makeScore({ warmth: 0.3, tension: 0.7, frequency: 0.5, depth: 0.3 })
    )
    expect(profile.type).toBe("RIVAL")
  })

  it("프로필에 protocol 포함", () => {
    const profile = computeRelationshipProfile(makeScore())
    expect(profile.protocol).toBeDefined()
    expect(profile.protocol.allowedTones).toBeDefined()
    expect(typeof profile.protocol.interactionBoost).toBe("number")
  })

  it("stageProgress 포함 (0~1)", () => {
    const profile = computeRelationshipProfile(makeScore())
    expect(profile.stageProgress).toBeGreaterThanOrEqual(0)
    expect(profile.stageProgress).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeStageProgress
// ═══════════════════════════════════════════════════════════════

describe("computeStageProgress", () => {
  it("STRANGER 초기 → 0에 가까움", () => {
    const progress = computeStageProgress(
      makeScore({ warmth: 0.0, frequency: 0.0, depth: 0.0 }),
      "STRANGER"
    )
    expect(progress).toBeLessThanOrEqual(0.01)
  })

  it("STRANGER에서 ACQUAINTANCE 직전 → 높은 진행률", () => {
    const progress = computeStageProgress(
      makeScore({ warmth: 0.09, frequency: 0.09, depth: 0.09 }),
      "STRANGER"
    )
    expect(progress).toBeGreaterThan(0.5)
  })

  it("CLOSE 단계 → 1.0", () => {
    const progress = computeStageProgress(
      makeScore({ warmth: 1.0, frequency: 1.0, depth: 1.0 }),
      "CLOSE"
    )
    expect(progress).toBe(1.0)
  })

  it("범위 0~1 유지", () => {
    const progress = computeStageProgress(makeScore(), "ACQUAINTANCE")
    expect(progress).toBeGreaterThanOrEqual(0)
    expect(progress).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// isToneAllowed
// ═══════════════════════════════════════════════════════════════

describe("isToneAllowed", () => {
  it("STRANGER → vulnerable 불허", () => {
    const profile = computeRelationshipProfile(makeScore())
    expect(isToneAllowed(profile, "vulnerable")).toBe(false)
  })

  it("STRANGER → analytical 허용", () => {
    const profile = computeRelationshipProfile(makeScore())
    expect(isToneAllowed(profile, "analytical")).toBe(true)
  })

  it("CLOSE → vulnerable 허용", () => {
    const profile = computeRelationshipProfile(
      makeScore({ warmth: 0.7, frequency: 0.6, depth: 0.5 })
    )
    expect(isToneAllowed(profile, "vulnerable")).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// getInteractionMultiplier
// ═══════════════════════════════════════════════════════════════

describe("getInteractionMultiplier", () => {
  it("STRANGER → 낮은 보정", () => {
    const profile = computeRelationshipProfile(makeScore())
    expect(getInteractionMultiplier(profile)).toBeLessThan(1.0)
  })

  it("CLOSE → 높은 보정", () => {
    const profile = computeRelationshipProfile(
      makeScore({ warmth: 0.7, frequency: 0.6, depth: 0.5 })
    )
    expect(getInteractionMultiplier(profile)).toBeGreaterThan(1.0)
  })
})

// ═══════════════════════════════════════════════════════════════
// summarizeRelationship
// ═══════════════════════════════════════════════════════════════

describe("summarizeRelationship", () => {
  it("요약 텍스트에 단계 포함", () => {
    const score = makeScore()
    const profile = computeRelationshipProfile(score)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("STRANGER")
  })

  it("CLOSE일 때 취약성 표현 언급", () => {
    const score = makeScore({ warmth: 0.7, frequency: 0.6, depth: 0.5 })
    const profile = computeRelationshipProfile(score)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("취약성 표현 가능")
  })

  it("지표 수치 포함", () => {
    const score = makeScore({ warmth: 0.75 })
    const profile = computeRelationshipProfile(score)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("warmth=0.75")
  })
})

// ═══════════════════════════════════════════════════════════════
// detectStageChange
// ═══════════════════════════════════════════════════════════════

describe("detectStageChange", () => {
  it("변화 없음", () => {
    const prev = makeScore()
    const next = makeScore({ warmth: 0.01 })
    const result = detectStageChange(prev, next)
    expect(result.changed).toBe(false)
    expect(result.prevStage).toBe("STRANGER")
    expect(result.newStage).toBe("STRANGER")
  })

  it("STRANGER → ACQUAINTANCE 승격", () => {
    const prev = makeScore()
    const next = makeScore({ warmth: 0.15, frequency: 0.15, depth: 0.05 })
    const result = detectStageChange(prev, next)
    expect(result.changed).toBe(true)
    expect(result.prevStage).toBe("STRANGER")
    expect(result.newStage).toBe("ACQUAINTANCE")
  })

  it("FAMILIAR → ACQUAINTANCE 강등", () => {
    const prev = makeScore({ warmth: 0.3, frequency: 0.3, depth: 0.2 })
    const next = makeScore({ warmth: 0.1, frequency: 0.1, depth: 0.1 })
    const result = detectStageChange(prev, next)
    expect(result.changed).toBe(true)
    expect(result.prevStage).toBe("FAMILIAR")
    expect(result.newStage).toBe("ACQUAINTANCE")
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("STAGE_THRESHOLDS: 단계별 totalScore 오름차순", () => {
    const stages = ["STRANGER", "ACQUAINTANCE", "FAMILIAR", "CLOSE"] as const
    for (let i = 1; i < stages.length; i++) {
      expect(STAGE_THRESHOLDS[stages[i]].minTotalScore).toBeGreaterThan(
        STAGE_THRESHOLDS[stages[i - 1]].minTotalScore
      )
    }
  })

  it("TYPE_THRESHOLDS: 모든 값 0~1 범위", () => {
    expect(TYPE_THRESHOLDS.ally.minWarmth).toBeGreaterThanOrEqual(0)
    expect(TYPE_THRESHOLDS.ally.minWarmth).toBeLessThanOrEqual(1)
    expect(TYPE_THRESHOLDS.rival.minTension).toBeGreaterThanOrEqual(0)
    expect(TYPE_THRESHOLDS.rival.minTension).toBeLessThanOrEqual(1)
  })
})
