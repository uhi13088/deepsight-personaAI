import { describe, it, expect } from "vitest"
import {
  determineStage,
  determineStageWithDecay,
  determineType,
  buildProtocol,
  computeRelationshipProfile,
  computeRelationshipProfileWithDecay,
  computeStageProgress,
  isToneAllowed,
  getInteractionMultiplier,
  summarizeRelationship,
  detectStageChange,
  applyWarmthDecay,
  applyFrequencyDecay,
  STAGE_THRESHOLDS,
  TYPE_THRESHOLDS,
  WARMTH_DECAY_RATE,
  COOLING_THRESHOLD_DAYS,
  DORMANT_THRESHOLD_DAYS,
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
    expect(protocol.allowedTones).toContain("paradox_response")
  })

  it("FAMILIAR + RIVAL → 논쟁 강화", () => {
    const protocol = buildProtocol("FAMILIAR", "RIVAL")
    expect(protocol.debateWillingness).toBeGreaterThan(0.6)
    expect(protocol.allowedTones).toContain("direct_rebuttal")
    expect(protocol.allowedTones).toContain("soft_rebuttal")
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
  it("STRANGER → paradox_response 불허", () => {
    const profile = computeRelationshipProfile(makeScore())
    expect(isToneAllowed(profile, "paradox_response")).toBe(false)
  })

  it("STRANGER → formal_analysis 허용", () => {
    const profile = computeRelationshipProfile(makeScore())
    expect(isToneAllowed(profile, "formal_analysis")).toBe(true)
  })

  it("CLOSE → paradox_response 허용", () => {
    const profile = computeRelationshipProfile(
      makeScore({ warmth: 0.7, frequency: 0.6, depth: 0.5 })
    )
    expect(isToneAllowed(profile, "paradox_response")).toBe(true)
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

  it("감쇠 상수 정합성", () => {
    expect(WARMTH_DECAY_RATE).toBe(0.02)
    expect(COOLING_THRESHOLD_DAYS).toBe(14)
    expect(DORMANT_THRESHOLD_DAYS).toBe(30)
    expect(DORMANT_THRESHOLD_DAYS).toBeGreaterThan(COOLING_THRESHOLD_DAYS)
  })
})

// ═══════════════════════════════════════════════════════════════
// applyWarmthDecay
// ═══════════════════════════════════════════════════════════════

describe("applyWarmthDecay", () => {
  it("lastInteractionAt null → 감쇠 없음", () => {
    expect(applyWarmthDecay(0.8, null)).toBe(0.8)
  })

  it("방금 인터랙션 → 감쇠 거의 없음", () => {
    const now = new Date()
    expect(applyWarmthDecay(0.8, now, now)).toBeCloseTo(0.8, 2)
  })

  it("7일 무활동 → ~13% 감쇠", () => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const result = applyWarmthDecay(1.0, sevenDaysAgo, now)
    // e^(-0.02 * 7) ≈ 0.869
    expect(result).toBeCloseTo(0.869, 2)
  })

  it("14일 무활동 → ~24% 감쇠", () => {
    const now = new Date()
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const result = applyWarmthDecay(1.0, twoWeeksAgo, now)
    // e^(-0.02 * 14) ≈ 0.756
    expect(result).toBeCloseTo(0.756, 2)
  })

  it("30일 무활동 → ~45% 감쇠", () => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const result = applyWarmthDecay(1.0, thirtyDaysAgo, now)
    // e^(-0.02 * 30) ≈ 0.549
    expect(result).toBeCloseTo(0.549, 2)
  })

  it("결과는 0~1 범위", () => {
    const now = new Date()
    const longAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    const result = applyWarmthDecay(0.5, longAgo, now)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// applyFrequencyDecay
// ═══════════════════════════════════════════════════════════════

describe("applyFrequencyDecay", () => {
  it("lastInteractionAt null → 감쇠 없음", () => {
    expect(applyFrequencyDecay(0.5, null)).toBe(0.5)
  })

  it("1주 무활동 → 10% 감쇠", () => {
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const result = applyFrequencyDecay(1.0, oneWeekAgo, now)
    // 1.0 * 0.9^1 = 0.9
    expect(result).toBeCloseTo(0.9, 2)
  })

  it("4주 무활동 → ~34% 감쇠", () => {
    const now = new Date()
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
    const result = applyFrequencyDecay(1.0, fourWeeksAgo, now)
    // 1.0 * 0.9^4 ≈ 0.656
    expect(result).toBeCloseTo(0.656, 2)
  })
})

// ═══════════════════════════════════════════════════════════════
// determineStageWithDecay
// ═══════════════════════════════════════════════════════════════

describe("determineStageWithDecay", () => {
  it("lastInteractionAt null → 기존 로직 (STRANGER)", () => {
    expect(determineStageWithDecay(makeScore())).toBe("STRANGER")
  })

  it("최근 활동 → 기존 score 기반 (CLOSE)", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.7,
      frequency: 0.6,
      depth: 0.5,
      lastInteractionAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1일 전
    })
    expect(determineStageWithDecay(score, now)).toBe("CLOSE")
  })

  it("14일 무활동 → COOLING", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.8,
      frequency: 0.6,
      depth: 0.5,
      lastInteractionAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15일 전
    })
    expect(determineStageWithDecay(score, now)).toBe("COOLING")
  })

  it("30일 무활동 → DORMANT", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.9,
      frequency: 0.8,
      depth: 0.6,
      lastInteractionAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000), // 31일 전
    })
    expect(determineStageWithDecay(score, now)).toBe("DORMANT")
  })

  it("13일 무활동 → 아직 COOLING 아님", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.7,
      frequency: 0.6,
      depth: 0.5,
      lastInteractionAt: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
    })
    expect(determineStageWithDecay(score, now)).toBe("CLOSE")
  })
})

// ═══════════════════════════════════════════════════════════════
// COOLING/DORMANT 행동 프로토콜
// ═══════════════════════════════════════════════════════════════

describe("COOLING/DORMANT 행동 프로토콜", () => {
  it("COOLING → interactionBoost 감소", () => {
    const protocol = buildProtocol("COOLING", "NEUTRAL")
    expect(protocol.interactionBoost).toBe(0.6)
    expect(protocol.selfDisclosure).toBe(0.2)
    expect(protocol.vulnerabilityAllowed).toBe(false)
    expect(protocol.personalReferences).toBe(true) // 과거 기억은 유지
  })

  it("DORMANT → 최소한의 인터랙션", () => {
    const protocol = buildProtocol("DORMANT", "NEUTRAL")
    expect(protocol.interactionBoost).toBe(0.3)
    expect(protocol.selfDisclosure).toBe(0.1)
    expect(protocol.debateWillingness).toBe(0.1)
    expect(protocol.personalReferences).toBe(false)
    expect(protocol.vulnerabilityAllowed).toBe(false)
  })

  it("COOLING 톤 제한 — paradox_response 불허", () => {
    const protocol = buildProtocol("COOLING", "NEUTRAL")
    expect(protocol.allowedTones).not.toContain("paradox_response")
    expect(protocol.allowedTones).not.toContain("direct_rebuttal")
    expect(protocol.allowedTones).toContain("supportive")
  })

  it("DORMANT 톤 제한 — empathetic 불허", () => {
    const protocol = buildProtocol("DORMANT", "NEUTRAL")
    expect(protocol.allowedTones).not.toContain("empathetic")
    expect(protocol.allowedTones).not.toContain("paradox_response")
    expect(protocol.allowedTones).toContain("formal_analysis")
  })
})

// ═══════════════════════════════════════════════════════════════
// computeRelationshipProfileWithDecay
// ═══════════════════════════════════════════════════════════════

describe("computeRelationshipProfileWithDecay", () => {
  it("최근 활동 → 기존과 동일", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.7,
      frequency: 0.6,
      depth: 0.5,
      lastInteractionAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    })
    const profile = computeRelationshipProfileWithDecay(score, now)
    const originalProfile = computeRelationshipProfile(score)
    expect(profile.stage).toBe(originalProfile.stage)
    expect(profile.type).toBe(originalProfile.type)
  })

  it("COOLING → type은 NEUTRAL로 리셋", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.8,
      frequency: 0.7,
      depth: 0.5,
      lastInteractionAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    })
    const profile = computeRelationshipProfileWithDecay(score, now)
    expect(profile.stage).toBe("COOLING")
    expect(profile.type).toBe("NEUTRAL")
  })

  it("DORMANT → type은 NEUTRAL로 리셋", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.9,
      frequency: 0.8,
      depth: 0.6,
      lastInteractionAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
    })
    const profile = computeRelationshipProfileWithDecay(score, now)
    expect(profile.stage).toBe("DORMANT")
    expect(profile.type).toBe("NEUTRAL")
    expect(profile.stageProgress).toBe(0)
  })

  it("COOLING → stageProgress는 0", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.8,
      frequency: 0.6,
      depth: 0.5,
      lastInteractionAt: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
    })
    const profile = computeRelationshipProfileWithDecay(score, now)
    expect(profile.stageProgress).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// summarizeRelationship — COOLING/DORMANT
// ═══════════════════════════════════════════════════════════════

describe("summarizeRelationship — COOLING/DORMANT", () => {
  it("COOLING → 냉각 중 메시지 포함", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.7,
      frequency: 0.5,
      depth: 0.4,
      lastInteractionAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    })
    const profile = computeRelationshipProfileWithDecay(score, now)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("COOLING")
    expect(summary).toContain("냉각 중")
  })

  it("DORMANT → 미교류 메시지 포함", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.8,
      frequency: 0.6,
      depth: 0.5,
      lastInteractionAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
    })
    const profile = computeRelationshipProfileWithDecay(score, now)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("DORMANT")
    expect(summary).toContain("미교류")
  })
})
