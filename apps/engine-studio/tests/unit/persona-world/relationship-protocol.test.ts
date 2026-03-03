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
  isEstranged,
  computeMomentum,
  updateMomentum,
  detectMilestones,
  computeMilestoneQualityDelta,
  updatePeakStage,
  STAGE_THRESHOLDS,
  TYPE_THRESHOLDS,
  WARMTH_DECAY_RATE,
  COOLING_THRESHOLD_DAYS,
  DORMANT_THRESHOLD_DAYS,
  ESTRANGED_TENSION_THRESHOLD,
  MILESTONE_THRESHOLDS,
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
// determineStage (v4.1: 6 forward 단계)
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

  it("frequency 0.2, depth 0.1, totalScore 0.5 → REGULAR (v4.1 신규)", () => {
    expect(determineStage(makeScore({ warmth: 0.2, frequency: 0.2, depth: 0.1 }))).toBe("REGULAR")
  })

  it("frequency 0.3, depth 0.2, totalScore 0.8 → FAMILIAR", () => {
    expect(determineStage(makeScore({ warmth: 0.3, frequency: 0.3, depth: 0.2 }))).toBe("FAMILIAR")
  })

  it("frequency 0.4, depth 0.3, totalScore 1.1 → INTIMATE (v4.1 신규)", () => {
    expect(determineStage(makeScore({ warmth: 0.4, frequency: 0.4, depth: 0.3 }))).toBe("INTIMATE")
  })

  it("frequency 0.5, depth 0.4, totalScore 1.5 → CLOSE", () => {
    expect(determineStage(makeScore({ warmth: 0.6, frequency: 0.5, depth: 0.4 }))).toBe("CLOSE")
  })

  it("frequency 높지만 depth 부족 → ACQUAINTANCE", () => {
    expect(determineStage(makeScore({ warmth: 0.5, frequency: 0.6, depth: 0.05 }))).toBe(
      "ACQUAINTANCE"
    )
  })

  it("모든 지표 최대 → CLOSE", () => {
    expect(determineStage(makeScore({ warmth: 1.0, frequency: 1.0, depth: 1.0 }))).toBe("CLOSE")
  })
})

// ═══════════════════════════════════════════════════════════════
// determineType (v4.1: 10종)
// ═══════════════════════════════════════════════════════════════

describe("determineType", () => {
  it("기본값 → NEUTRAL", () => {
    expect(determineType(makeScore())).toBe("NEUTRAL")
  })

  it("warmth 높고 tension 낮음 → ALLY", () => {
    expect(determineType(makeScore({ warmth: 0.7, tension: 0.1, depth: 0.3 }))).toBe("ALLY")
  })

  it("tension 높고 frequency 높음 + warmth 낮음 → RIVAL", () => {
    expect(determineType(makeScore({ warmth: 0.3, tension: 0.6, frequency: 0.4 }))).toBe("RIVAL")
  })

  it("warmth 높고 depth 높음 → MENTOR", () => {
    expect(determineType(makeScore({ warmth: 0.7, tension: 0.1, depth: 0.6 }))).toBe("MENTOR")
  })

  it("warmth 높고 depth 낮음 → FAN", () => {
    expect(determineType(makeScore({ warmth: 0.7, tension: 0.1, depth: 0.1 }))).toBe("FAN")
  })

  it("RIVAL이 ALLY보다 우선", () => {
    expect(determineType(makeScore({ warmth: 0.7, tension: 0.6, frequency: 0.4 }))).toBe("FRENEMY") // v4.1: warmth+tension 동시 고값 → FRENEMY
  })

  // v4.1 신규 유형 테스트
  it("warmth+depth 극고, tension 극저 → CONFIDANT (v4.1)", () => {
    expect(
      determineType(makeScore({ warmth: 0.85, tension: 0.1, depth: 0.75, frequency: 0.5 }))
    ).toBe("CONFIDANT")
  })

  it("warmth+tension 동시 고값 → FRENEMY (v4.1)", () => {
    expect(
      determineType(makeScore({ warmth: 0.6, tension: 0.6, depth: 0.3, frequency: 0.3 }))
    ).toBe("FRENEMY")
  })

  it("tension 극고 + depth 고 + warmth 저 → NEMESIS (v4.1)", () => {
    expect(
      determineType(makeScore({ warmth: 0.2, tension: 0.8, depth: 0.6, frequency: 0.5 }))
    ).toBe("NEMESIS")
  })

  it("warmth 중고 + depth 중 + frequency 저 → MUSE (v4.1)", () => {
    expect(
      determineType(makeScore({ warmth: 0.55, tension: 0.35, depth: 0.35, frequency: 0.2 }))
    ).toBe("MUSE")
  })

  it("depth+warmth 중고 (ALLY 밖) → PROTEGE (v4.1)", () => {
    expect(
      determineType(makeScore({ warmth: 0.55, tension: 0.35, depth: 0.55, frequency: 0.4 }))
    ).toBe("PROTEGE")
  })

  it("NEMESIS가 RIVAL보다 우선 (tension+depth 고, warmth 저)", () => {
    expect(
      determineType(makeScore({ warmth: 0.2, tension: 0.75, depth: 0.6, frequency: 0.5 }))
    ).toBe("NEMESIS")
  })

  it("FRENEMY가 RIVAL보다 우선 (warmth+tension 동시 고값)", () => {
    expect(
      determineType(makeScore({ warmth: 0.55, tension: 0.55, frequency: 0.4, depth: 0.2 }))
    ).toBe("FRENEMY")
  })

  // ── v4.2 로맨틱 유형 ──

  it("attraction 0.4 + warmth 0.5 → CRUSH (v4.2)", () => {
    expect(
      determineType(makeScore({ warmth: 0.5, tension: 0.1, depth: 0.1, attraction: 0.4 }))
    ).toBe("CRUSH")
  })

  it("attraction 0.5 + warmth 0.6 + depth 0.3 → SWEETHEART (v4.2)", () => {
    expect(
      determineType(makeScore({ warmth: 0.6, tension: 0.1, depth: 0.3, attraction: 0.5 }))
    ).toBe("SWEETHEART")
  })

  it("attraction 0.7 + warmth 0.7 + depth 0.5 + tension 낮음 → LOVER (v4.2)", () => {
    expect(
      determineType(
        makeScore({ warmth: 0.7, tension: 0.2, depth: 0.5, attraction: 0.7, frequency: 0.4 })
      )
    ).toBe("LOVER")
  })

  it("attraction 0.9 + warmth 0.9 + depth 0.8 → SOULMATE (v4.2)", () => {
    expect(
      determineType(
        makeScore({ warmth: 0.9, tension: 0.1, depth: 0.8, attraction: 0.9, frequency: 0.5 })
      )
    ).toBe("SOULMATE")
  })

  it("breakup 마일스톤 + attraction 낮음 → EX (v4.2)", () => {
    const milestones = [{ type: "breakup" as const, occurredAt: new Date(), qualityDelta: -0.12 }]
    expect(
      determineType(
        makeScore({ warmth: 0.4, tension: 0.3, depth: 0.3, attraction: 0.2, milestones })
      )
    ).toBe("EX")
  })

  it("breakup 마일스톤 있지만 attraction 높으면 → EX 아님 (재결합 가능)", () => {
    const milestones = [{ type: "breakup" as const, occurredAt: new Date(), qualityDelta: -0.12 }]
    expect(
      determineType(
        makeScore({ warmth: 0.7, tension: 0.1, depth: 0.5, attraction: 0.7, milestones })
      )
    ).toBe("LOVER")
  })

  it("attraction 0.6 + tension 0.4 + frequency 0.5 → OBSESSED (v4.2)", () => {
    expect(
      determineType(
        makeScore({ warmth: 0.5, tension: 0.4, depth: 0.3, attraction: 0.6, frequency: 0.5 })
      )
    ).toBe("OBSESSED")
  })

  // ── v4.2 사회적 유형 ──

  it("warmth 0.8 + frequency 0.5 + depth 0.4 + tension 낮음 → BESTIE (v4.2)", () => {
    expect(
      determineType(makeScore({ warmth: 0.8, tension: 0.1, depth: 0.4, frequency: 0.5 }))
    ).toBe("BESTIE")
  })

  it("warmth 0.7 + frequency 0.6 + depth 0.3 + tension 낮음 → GUARDIAN (v4.2)", () => {
    expect(
      determineType(makeScore({ warmth: 0.7, tension: 0.15, depth: 0.3, frequency: 0.6 }))
    ).toBe("GUARDIAN")
  })

  it("frequency 0.6 + warmth 0.4 → COMPANION (v4.2)", () => {
    expect(
      determineType(makeScore({ warmth: 0.4, tension: 0.35, depth: 0.2, frequency: 0.6 }))
    ).toBe("COMPANION")
  })

  // ── v4.2 감정 복합 유형 ──

  it("attraction 0.3 + tension 0.4 + warmth 0.5 + depth 낮음 → TSUNDERE (v4.2)", () => {
    expect(
      determineType(
        makeScore({ warmth: 0.5, tension: 0.4, depth: 0.2, attraction: 0.3, frequency: 0.3 })
      )
    ).toBe("TSUNDERE")
  })

  it("tension 0.5 + frequency 0.6 + warmth 낮음 → TOXIC (v4.2)", () => {
    expect(
      determineType(makeScore({ warmth: 0.2, tension: 0.6, depth: 0.2, frequency: 0.6 }))
    ).toBe("TOXIC")
  })

  it("attraction 0.3 + warmth 0.4 + tension 0.3 + frequency 0.5 → PUSH_PULL (v4.2)", () => {
    expect(
      determineType(
        makeScore({ warmth: 0.4, tension: 0.3, depth: 0.1, attraction: 0.3, frequency: 0.5 })
      )
    ).toBe("PUSH_PULL")
  })

  // ── v4.2 우선순위 테스트 ──

  it("SOULMATE가 LOVER보다 우선", () => {
    expect(
      determineType(
        makeScore({ warmth: 0.95, tension: 0.05, depth: 0.85, attraction: 0.95, frequency: 0.6 })
      )
    ).toBe("SOULMATE")
  })

  it("OBSESSED가 LOVER보다 우선 (tension 있으면 불건강)", () => {
    expect(
      determineType(
        makeScore({ warmth: 0.6, tension: 0.5, depth: 0.4, attraction: 0.7, frequency: 0.6 })
      )
    ).toBe("OBSESSED")
  })

  it("TOXIC가 RIVAL보다 우선 (frequency 극고 + warmth 극저)", () => {
    expect(
      determineType(makeScore({ warmth: 0.2, tension: 0.6, depth: 0.2, frequency: 0.7 }))
    ).toBe("TOXIC")
  })

  it("LOVER가 SWEETHEART보다 우선 (더 높은 attraction+depth)", () => {
    expect(
      determineType(
        makeScore({ warmth: 0.75, tension: 0.1, depth: 0.6, attraction: 0.75, frequency: 0.4 })
      )
    ).toBe("LOVER")
  })

  it("TSUNDERE가 CRUSH보다 우선 (tension 있으면 츤데레)", () => {
    expect(
      determineType(
        makeScore({ warmth: 0.45, tension: 0.4, depth: 0.2, attraction: 0.4, frequency: 0.3 })
      )
    ).toBe("TSUNDERE")
  })

  it("attraction 없으면 기존 유형 유지 (ALLY)", () => {
    expect(determineType(makeScore({ warmth: 0.7, tension: 0.1, depth: 0.3, attraction: 0 }))).toBe(
      "ALLY"
    )
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

  // v4.1 신규 단계 프로토콜
  it("REGULAR + NEUTRAL → ACQUAINTANCE보다 개방적 (v4.1)", () => {
    const regular = buildProtocol("REGULAR", "NEUTRAL")
    const acq = buildProtocol("ACQUAINTANCE", "NEUTRAL")
    expect(regular.interactionBoost).toBeGreaterThan(acq.interactionBoost)
    expect(regular.selfDisclosure).toBeGreaterThan(acq.selfDisclosure)
    expect(regular.personalReferences).toBe(true)
  })

  it("INTIMATE + NEUTRAL → FAMILIAR보다 개방적 (v4.1)", () => {
    const intimate = buildProtocol("INTIMATE", "NEUTRAL")
    const familiar = buildProtocol("FAMILIAR", "NEUTRAL")
    expect(intimate.interactionBoost).toBeGreaterThan(familiar.interactionBoost)
    expect(intimate.vulnerabilityAllowed).toBe(true)
    expect(intimate.allowedTones).toContain("intimate_joke")
  })

  it("ESTRANGED + NEUTRAL → 최소한의 프로토콜 (v4.1)", () => {
    const protocol = buildProtocol("ESTRANGED", "NEUTRAL")
    expect(protocol.interactionBoost).toBe(0.2)
    expect(protocol.selfDisclosure).toBe(0.05)
    expect(protocol.personalReferences).toBe(true) // 과거 기억은 유지
    expect(protocol.vulnerabilityAllowed).toBe(false)
  })

  // v4.1 신규 유형 프로토콜
  it("CLOSE + CONFIDANT → 높은 자기노출 + paradox 허용 (v4.1)", () => {
    const protocol = buildProtocol("CLOSE", "CONFIDANT")
    expect(protocol.selfDisclosure).toBeGreaterThan(0.9)
    expect(protocol.allowedTones).toContain("paradox_response")
    expect(protocol.allowedTones).toContain("intimate_joke")
  })

  it("FAMILIAR + FRENEMY → 논쟁 + 친밀 동시 (v4.1)", () => {
    const protocol = buildProtocol("FAMILIAR", "FRENEMY")
    expect(protocol.debateWillingness).toBeGreaterThan(0.6)
    expect(protocol.allowedTones).toContain("soft_rebuttal")
    expect(protocol.allowedTones).toContain("intimate_joke")
  })

  it("FAMILIAR + NEMESIS → 높은 논쟁 의지 (v4.1)", () => {
    const protocol = buildProtocol("FAMILIAR", "NEMESIS")
    expect(protocol.debateWillingness).toBe(1.0) // 0.6 + 0.4 = 1.0
    expect(protocol.allowedTones).toContain("direct_rebuttal")
    expect(protocol.allowedTones).toContain("unique_perspective")
  })

  it("ACQUAINTANCE + MUSE → deep_analysis + unique_perspective (v4.1)", () => {
    const protocol = buildProtocol("ACQUAINTANCE", "MUSE")
    expect(protocol.allowedTones).toContain("deep_analysis")
    expect(protocol.allowedTones).toContain("unique_perspective")
  })

  it("FAMILIAR + PROTEGE → supportive + deep_analysis (v4.1)", () => {
    const protocol = buildProtocol("FAMILIAR", "PROTEGE")
    expect(protocol.allowedTones).toContain("supportive")
    expect(protocol.allowedTones).toContain("deep_analysis")
    expect(protocol.selfDisclosure).toBeGreaterThan(0.5)
  })

  // v4.2 로맨틱 유형 프로토콜
  it("FAMILIAR + CRUSH → 갈등 회피 + 자기노출 소량 (v4.2)", () => {
    const protocol = buildProtocol("FAMILIAR", "CRUSH")
    expect(protocol.debateWillingness).toBeLessThan(0.5)
    expect(protocol.allowedTones).toContain("supportive")
    expect(protocol.allowedTones).toContain("empathetic")
  })

  it("INTIMATE + LOVER → 높은 상호작용 + 깊은 자기노출 (v4.2)", () => {
    const protocol = buildProtocol("INTIMATE", "LOVER")
    expect(protocol.interactionBoost).toBeGreaterThan(1.7)
    expect(protocol.selfDisclosure).toBe(1.0) // 0.65 + 0.35 = 1.0
    expect(protocol.allowedTones).toContain("intimate_joke")
    expect(protocol.allowedTones).toContain("paradox_response")
  })

  it("CLOSE + SOULMATE → 최대 개방 (v4.2)", () => {
    const protocol = buildProtocol("CLOSE", "SOULMATE")
    expect(protocol.selfDisclosure).toBe(1.0)
    expect(protocol.interactionBoost).toBe(2.0) // 1.5 + 0.5, clamped to 2.0
    expect(protocol.allowedTones).toContain("deep_analysis")
    expect(protocol.allowedTones).toContain("unique_perspective")
  })

  it("FAMILIAR + EX → 상호작용 기피 + 경계 (v4.2)", () => {
    const protocol = buildProtocol("FAMILIAR", "EX")
    expect(protocol.interactionBoost).toBeLessThan(1.1)
    expect(protocol.selfDisclosure).toBeLessThan(0.4)
    expect(protocol.allowedTones).toContain("formal_analysis")
  })

  it("REGULAR + OBSESSED → 과도한 interactionBoost (v4.2)", () => {
    const protocol = buildProtocol("REGULAR", "OBSESSED")
    expect(protocol.interactionBoost).toBeGreaterThan(1.5)
  })

  // v4.2 사회적 유형 프로토콜
  it("FAMILIAR + GUARDIAN → 방어적 논쟁 참여 (v4.2)", () => {
    const protocol = buildProtocol("FAMILIAR", "GUARDIAN")
    expect(protocol.debateWillingness).toBeGreaterThan(0.7)
    expect(protocol.allowedTones).toContain("soft_rebuttal")
    expect(protocol.allowedTones).toContain("supportive")
  })

  it("REGULAR + BESTIE → 높은 빈도 + 적당한 자기노출 (v4.2)", () => {
    const protocol = buildProtocol("REGULAR", "BESTIE")
    expect(protocol.interactionBoost).toBeGreaterThan(1.3)
    expect(protocol.allowedTones).toContain("intimate_joke")
  })

  // v4.2 감정 복합 유형 프로토콜
  it("ACQUAINTANCE + TSUNDERE → 까칠한 논쟁 + 속마음 숨김 (v4.2)", () => {
    const protocol = buildProtocol("ACQUAINTANCE", "TSUNDERE")
    expect(protocol.debateWillingness).toBeGreaterThan(0.5)
    expect(protocol.selfDisclosure).toBeLessThan(0.3)
    expect(protocol.allowedTones).toContain("soft_rebuttal")
  })

  it("REGULAR + TOXIC → 높은 논쟁 + 닫힌 자기노출 (v4.2)", () => {
    const protocol = buildProtocol("REGULAR", "TOXIC")
    expect(protocol.debateWillingness).toBeGreaterThan(0.7)
    expect(protocol.selfDisclosure).toBeLessThan(0.4)
    expect(protocol.allowedTones).toContain("direct_rebuttal")
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

  it("높은 인터랙션 → CLOSE/MENTOR", () => {
    // warmth 0.7: BESTIE(0.8)/CONFIDANT(0.8) 미달, frequency 0.5: GUARDIAN(0.6) 미달 → MENTOR
    const profile = computeRelationshipProfile(
      makeScore({ warmth: 0.7, tension: 0.1, frequency: 0.5, depth: 0.5 })
    )
    expect(profile.stage).toBe("CLOSE")
    expect(profile.type).toBe("MENTOR")
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

  it("v4.1: momentum 정보 포함", () => {
    const profile = computeRelationshipProfile(makeScore({ momentum: 0.5 }))
    expect(profile.momentum).toBeDefined()
    expect(profile.momentum!.classification).toBe("rapid")
  })

  it("v4.1: milestones 정보 포함", () => {
    const milestones = [
      { type: "first_debate" as const, occurredAt: new Date(), qualityDelta: -0.05 },
    ]
    const profile = computeRelationshipProfile(makeScore({ milestones }))
    expect(profile.milestones).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeStageProgress (v4.1: 6 forward 단계)
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

  it("v4.1: ESTRANGED → 0", () => {
    const progress = computeStageProgress(makeScore(), "ESTRANGED")
    expect(progress).toBe(0)
  })

  it("v4.1: REGULAR에서 FAMILIAR 진행률", () => {
    // REGULAR minTotalScore=0.5, FAMILIAR minTotalScore=0.8, range=0.3
    const progress = computeStageProgress(
      makeScore({ warmth: 0.3, frequency: 0.2, depth: 0.15 }), // total=0.65
      "REGULAR"
    )
    // (0.65 - 0.5) / (0.8 - 0.5) = 0.5
    expect(progress).toBeCloseTo(0.5, 1)
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

  it("v4.1: 마일스톤 서술 포함", () => {
    const milestones = [
      { type: "first_debate" as const, occurredAt: new Date(), qualityDelta: -0.05 },
      { type: "first_deep_share" as const, occurredAt: new Date(), qualityDelta: 0.05 },
    ]
    const score = makeScore({ milestones })
    const profile = computeRelationshipProfile(score)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("논쟁을 겪은 적 있음")
    expect(summary).toContain("깊은 이야기를 나눈 적 있음")
  })

  it("v4.1: rapid 모멘텀 서술 포함", () => {
    const score = makeScore({ momentum: 0.5 })
    const profile = computeRelationshipProfile(score)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("급속히 발전 중")
  })

  it("v4.1: declining 모멘텀 서술 포함", () => {
    const score = makeScore({ momentum: -0.2 })
    const profile = computeRelationshipProfile(score)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("서서히 멀어지는 중")
  })

  it("v4.2: attraction > 0이면 지표에 포함", () => {
    const score = makeScore({ attraction: 0.5 })
    const profile = computeRelationshipProfile(score)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("attraction=0.50")
  })

  it("v4.2: attraction 0이면 지표에 미포함", () => {
    const score = makeScore({ attraction: 0 })
    const profile = computeRelationshipProfile(score)
    const summary = summarizeRelationship(score, profile)
    expect(summary).not.toContain("attraction")
  })

  it("v4.2: CRUSH 유형 → 행동 힌트 포함", () => {
    const score = makeScore({ warmth: 0.5, tension: 0.1, depth: 0.1, attraction: 0.4 })
    const profile = computeRelationshipProfile(score)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("CRUSH")
    expect(summary).toContain("설렘")
  })

  it("v4.2: LOVER 유형 → 로맨틱 힌트 포함", () => {
    const score = makeScore({
      warmth: 0.7,
      tension: 0.1,
      depth: 0.5,
      attraction: 0.7,
      frequency: 0.4,
    })
    const profile = computeRelationshipProfile(score)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("LOVER")
    expect(summary).toContain("로맨틱")
  })

  it("v4.2: 로맨틱 마일스톤 서술 포함", () => {
    const milestones = [
      { type: "first_flirt" as const, occurredAt: new Date(), qualityDelta: 0.03 },
      { type: "confession" as const, occurredAt: new Date(), qualityDelta: 0.08 },
    ]
    const score = makeScore({ milestones })
    const profile = computeRelationshipProfile(score)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("설렘을 느낀 적 있음")
    expect(summary).toContain("마음을 고백한 적 있음")
  })

  it("v4.2: TSUNDERE 유형 → 츤데레 힌트 포함", () => {
    const score = makeScore({
      warmth: 0.5,
      tension: 0.4,
      depth: 0.2,
      attraction: 0.3,
      frequency: 0.3,
    })
    const profile = computeRelationshipProfile(score)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("TSUNDERE")
    expect(summary).toContain("츤데레")
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

  it("FAMILIAR → REGULAR 강등 (v4.1)", () => {
    const prev = makeScore({ warmth: 0.3, frequency: 0.3, depth: 0.2 })
    const next = makeScore({ warmth: 0.2, frequency: 0.2, depth: 0.1 })
    const result = detectStageChange(prev, next)
    expect(result.changed).toBe(true)
    expect(result.prevStage).toBe("FAMILIAR")
    expect(result.newStage).toBe("REGULAR")
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("STAGE_THRESHOLDS: forward 단계별 totalScore 오름차순 (v4.1: 6단계)", () => {
    const stages = ["STRANGER", "ACQUAINTANCE", "REGULAR", "FAMILIAR", "INTIMATE", "CLOSE"] as const
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
    // v4.1 신규
    expect(TYPE_THRESHOLDS.confidant.minWarmth).toBeGreaterThanOrEqual(0)
    expect(TYPE_THRESHOLDS.nemesis.minTension).toBeGreaterThanOrEqual(0)
    expect(TYPE_THRESHOLDS.frenemy.minWarmth).toBeGreaterThanOrEqual(0)
  })

  it("감쇠 상수 정합성", () => {
    expect(WARMTH_DECAY_RATE).toBe(0.02)
    expect(COOLING_THRESHOLD_DAYS).toBe(14)
    expect(DORMANT_THRESHOLD_DAYS).toBe(30)
    expect(DORMANT_THRESHOLD_DAYS).toBeGreaterThan(COOLING_THRESHOLD_DAYS)
  })

  it("v4.1: ESTRANGED 상수 정합성", () => {
    expect(ESTRANGED_TENSION_THRESHOLD).toBe(0.7)
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
    expect(result).toBeCloseTo(0.869, 2)
  })

  it("14일 무활동 → ~24% 감쇠", () => {
    const now = new Date()
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const result = applyWarmthDecay(1.0, twoWeeksAgo, now)
    expect(result).toBeCloseTo(0.756, 2)
  })

  it("30일 무활동 → ~45% 감쇠", () => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const result = applyWarmthDecay(1.0, thirtyDaysAgo, now)
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
    expect(result).toBeCloseTo(0.9, 2)
  })

  it("4주 무활동 → ~34% 감쇠", () => {
    const now = new Date()
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
    const result = applyFrequencyDecay(1.0, fourWeeksAgo, now)
    expect(result).toBeCloseTo(0.656, 2)
  })
})

// ═══════════════════════════════════════════════════════════════
// determineStageWithDecay (v4.1: ESTRANGED 포함)
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
      lastInteractionAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    })
    expect(determineStageWithDecay(score, now)).toBe("CLOSE")
  })

  it("14일 무활동 → COOLING", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.8,
      frequency: 0.6,
      depth: 0.5,
      lastInteractionAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    })
    expect(determineStageWithDecay(score, now)).toBe("COOLING")
  })

  it("30일 무활동 → DORMANT", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.9,
      frequency: 0.8,
      depth: 0.6,
      lastInteractionAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000),
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

  it("v4.1: peakStage ≥ FAMILIAR + tension 고 + warmth 저 → ESTRANGED", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.3,
      tension: 0.8,
      frequency: 0.4,
      depth: 0.3,
      peakStage: "FAMILIAR",
      lastInteractionAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    })
    expect(determineStageWithDecay(score, now)).toBe("ESTRANGED")
  })

  it("v4.1: peakStage < FAMILIAR → ESTRANGED 불가", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.3,
      tension: 0.8,
      frequency: 0.4,
      depth: 0.3,
      peakStage: "ACQUAINTANCE",
      lastInteractionAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    })
    expect(determineStageWithDecay(score, now)).not.toBe("ESTRANGED")
  })

  it("v4.1: ESTRANGED가 COOLING보다 우선", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.3,
      tension: 0.8,
      frequency: 0.4,
      depth: 0.3,
      peakStage: "CLOSE",
      lastInteractionAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    })
    // ESTRANGED 조건 충족 + COOLING 일수 충족 → ESTRANGED 우선
    expect(determineStageWithDecay(score, now)).toBe("ESTRANGED")
  })
})

// ═══════════════════════════════════════════════════════════════
// COOLING/DORMANT/ESTRANGED 행동 프로토콜
// ═══════════════════════════════════════════════════════════════

describe("COOLING/DORMANT/ESTRANGED 행동 프로토콜", () => {
  it("COOLING → interactionBoost 감소", () => {
    const protocol = buildProtocol("COOLING", "NEUTRAL")
    expect(protocol.interactionBoost).toBe(0.6)
    expect(protocol.selfDisclosure).toBe(0.2)
    expect(protocol.vulnerabilityAllowed).toBe(false)
    expect(protocol.personalReferences).toBe(true)
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

  it("v4.1: ESTRANGED → 가장 제한적 (v4.1)", () => {
    const protocol = buildProtocol("ESTRANGED", "NEUTRAL")
    expect(protocol.interactionBoost).toBe(0.2)
    expect(protocol.selfDisclosure).toBe(0.05)
    expect(protocol.allowedTones).not.toContain("empathetic")
    expect(protocol.allowedTones).not.toContain("supportive")
    expect(protocol.allowedTones).toContain("formal_analysis")
    expect(protocol.allowedTones).toContain("light_reaction")
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

  it("v4.1: ESTRANGED → type은 NEUTRAL로 리셋", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.3,
      tension: 0.8,
      frequency: 0.4,
      depth: 0.3,
      peakStage: "CLOSE",
      lastInteractionAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    })
    const profile = computeRelationshipProfileWithDecay(score, now)
    expect(profile.stage).toBe("ESTRANGED")
    expect(profile.type).toBe("NEUTRAL")
    expect(profile.stageProgress).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// summarizeRelationship — COOLING/DORMANT/ESTRANGED
// ═══════════════════════════════════════════════════════════════

describe("summarizeRelationship — COOLING/DORMANT/ESTRANGED", () => {
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

  it("v4.1: ESTRANGED → 갈등 메시지 포함", () => {
    const now = new Date()
    const score = makeScore({
      warmth: 0.3,
      tension: 0.8,
      frequency: 0.4,
      depth: 0.3,
      peakStage: "CLOSE",
      lastInteractionAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    })
    const profile = computeRelationshipProfileWithDecay(score, now)
    const summary = summarizeRelationship(score, profile)
    expect(summary).toContain("ESTRANGED")
    expect(summary).toContain("갈등")
  })
})

// ═══════════════════════════════════════════════════════════════
// v4.1: isEstranged
// ═══════════════════════════════════════════════════════════════

describe("isEstranged", () => {
  it("peakStage 없음 → false", () => {
    expect(isEstranged(makeScore({ tension: 0.9, warmth: 0.1 }))).toBe(false)
  })

  it("peakStage < FAMILIAR → false", () => {
    expect(isEstranged(makeScore({ tension: 0.9, warmth: 0.1, peakStage: "ACQUAINTANCE" }))).toBe(
      false
    )
  })

  it("peakStage = FAMILIAR + 고tension + 저warmth → true", () => {
    expect(isEstranged(makeScore({ tension: 0.8, warmth: 0.3, peakStage: "FAMILIAR" }))).toBe(true)
  })

  it("peakStage = CLOSE + 고tension + 저warmth → true", () => {
    expect(isEstranged(makeScore({ tension: 0.75, warmth: 0.5, peakStage: "CLOSE" }))).toBe(true)
  })

  it("tension 낮으면 → false", () => {
    expect(isEstranged(makeScore({ tension: 0.3, warmth: 0.2, peakStage: "CLOSE" }))).toBe(false)
  })

  it("warmth 높으면 → false", () => {
    expect(isEstranged(makeScore({ tension: 0.8, warmth: 0.8, peakStage: "CLOSE" }))).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// v4.1: 모멘텀
// ═══════════════════════════════════════════════════════════════

describe("computeMomentum", () => {
  it("momentum 없음 → stagnant", () => {
    const result = computeMomentum(makeScore())
    expect(result.value).toBe(0)
    expect(result.classification).toBe("stagnant")
    expect(result.stability).toBe(0.9)
  })

  it("momentum > 0.3 → rapid (불안정)", () => {
    const result = computeMomentum(makeScore({ momentum: 0.5 }))
    expect(result.classification).toBe("rapid")
    expect(result.stability).toBe(0.3)
  })

  it("momentum 0.1 → gradual (안정)", () => {
    const result = computeMomentum(makeScore({ momentum: 0.1 }))
    expect(result.classification).toBe("gradual")
    expect(result.stability).toBe(0.7)
  })

  it("momentum -0.2 → declining", () => {
    const result = computeMomentum(makeScore({ momentum: -0.2 }))
    expect(result.classification).toBe("declining")
    expect(result.stability).toBe(0.7)
  })
})

describe("updateMomentum", () => {
  it("totalScore 증가 → 양수 모멘텀", () => {
    const prev = makeScore({ warmth: 0.3, frequency: 0.2, depth: 0.1 })
    const next = makeScore({ warmth: 0.5, frequency: 0.3, depth: 0.2 })
    const momentum = updateMomentum(prev, next)
    expect(momentum).toBeGreaterThan(0)
  })

  it("totalScore 감소 → 음수 모멘텀", () => {
    const prev = makeScore({ warmth: 0.5, frequency: 0.3, depth: 0.2 })
    const next = makeScore({ warmth: 0.3, frequency: 0.2, depth: 0.1 })
    const momentum = updateMomentum(prev, next)
    expect(momentum).toBeLessThan(0)
  })

  it("이전 모멘텀을 EMA로 반영", () => {
    const prev = makeScore({ warmth: 0.5, frequency: 0.3, depth: 0.2, momentum: 0.5 })
    const next = makeScore({ warmth: 0.5, frequency: 0.3, depth: 0.2 }) // delta=0
    const momentum = updateMomentum(prev, next)
    // 0.7 * 0.5 + 0.3 * 0 = 0.35
    expect(momentum).toBeCloseTo(0.35, 2)
  })

  it("범위 -1~1 제한", () => {
    const prev = makeScore({ warmth: 0, frequency: 0, depth: 0, momentum: 1 })
    const next = makeScore({ warmth: 1, frequency: 1, depth: 1 })
    const momentum = updateMomentum(prev, next)
    expect(momentum).toBeLessThanOrEqual(1)
    expect(momentum).toBeGreaterThanOrEqual(-1)
  })
})

// ═══════════════════════════════════════════════════════════════
// v4.1: 마일스톤 감지
// ═══════════════════════════════════════════════════════════════

describe("detectMilestones", () => {
  const now = new Date()

  it("tension 급증 → first_debate", () => {
    const prev = makeScore({ tension: 0.2 })
    const next = makeScore({ tension: 0.4 }) // delta = 0.2 > 0.15
    const milestones = detectMilestones(prev, next, now)
    expect(milestones).toHaveLength(1)
    expect(milestones[0].type).toBe("first_debate")
    expect(milestones[0].qualityDelta).toBe(-0.05)
  })

  it("INTIMATE 단계 진입 → first_vulnerability", () => {
    const prev = makeScore({ warmth: 0.3, frequency: 0.3, depth: 0.2 }) // FAMILIAR
    const next = makeScore({ warmth: 0.4, frequency: 0.4, depth: 0.3 }) // INTIMATE
    const milestones = detectMilestones(prev, next, now)
    const vuln = milestones.find((m) => m.type === "first_vulnerability")
    expect(vuln).toBeDefined()
    expect(vuln!.qualityDelta).toBe(0.1)
  })

  it("tension ≥ 0.8 + warmth 급락 → first_betrayal", () => {
    const prev = makeScore({ tension: 0.5, warmth: 0.7 })
    const next = makeScore({ tension: 0.85, warmth: 0.4 }) // warmth drop = -0.3
    const milestones = detectMilestones(prev, next, now)
    const betrayal = milestones.find((m) => m.type === "first_betrayal")
    expect(betrayal).toBeDefined()
    expect(betrayal!.qualityDelta).toBe(-0.15)
  })

  it("depth ≥ 0.5 진입 → first_deep_share", () => {
    const prev = makeScore({ depth: 0.4 })
    const next = makeScore({ depth: 0.55 })
    const milestones = detectMilestones(prev, next, now)
    const deep = milestones.find((m) => m.type === "first_deep_share")
    expect(deep).toBeDefined()
    expect(deep!.qualityDelta).toBe(0.05)
  })

  it("ESTRANGED → tension 회복 → reconciliation", () => {
    const prev = makeScore({ tension: 0.8, warmth: 0.3, peakStage: "CLOSE" }) // isEstranged
    const next = makeScore({ tension: 0.2, warmth: 0.3, peakStage: "CLOSE" })
    const milestones = detectMilestones(prev, next, now)
    const recon = milestones.find((m) => m.type === "reconciliation")
    expect(recon).toBeDefined()
    expect(recon!.qualityDelta).toBe(0.1)
  })

  it("동일 마일스톤 중복 생성 안 함", () => {
    const existing = [
      { type: "first_debate" as const, occurredAt: new Date(), qualityDelta: -0.05 },
    ]
    const prev = makeScore({ tension: 0.2, milestones: existing })
    const next = makeScore({ tension: 0.4, milestones: existing })
    const milestones = detectMilestones(prev, next, now)
    expect(milestones.find((m) => m.type === "first_debate")).toBeUndefined()
  })

  it("변화 없으면 마일스톤 없음", () => {
    const prev = makeScore({ tension: 0.3, warmth: 0.5, depth: 0.3 })
    const next = makeScore({ tension: 0.3, warmth: 0.5, depth: 0.3 })
    const milestones = detectMilestones(prev, next, now)
    expect(milestones).toHaveLength(0)
  })

  // v4.2 로맨틱 마일스톤

  it("attraction 0.3 진입 → first_flirt (v4.2)", () => {
    const prev = makeScore({ attraction: 0.2 })
    const next = makeScore({ attraction: 0.35 })
    const milestones = detectMilestones(prev, next, now)
    const flirt = milestones.find((m) => m.type === "first_flirt")
    expect(flirt).toBeDefined()
    expect(flirt!.qualityDelta).toBe(0.03)
  })

  it("attraction 0.7 진입 → confession (v4.2)", () => {
    const prev = makeScore({ attraction: 0.65 })
    const next = makeScore({ attraction: 0.75 })
    const milestones = detectMilestones(prev, next, now)
    const confession = milestones.find((m) => m.type === "confession")
    expect(confession).toBeDefined()
    expect(confession!.qualityDelta).toBe(0.08)
  })

  it("attraction ≥ 0.5 + warmth 급락 → breakup (v4.2)", () => {
    const prev = makeScore({ attraction: 0.6, warmth: 0.7 })
    const next = makeScore({ attraction: 0.6, warmth: 0.4 }) // warmth drop = -0.3
    const milestones = detectMilestones(prev, next, now)
    const breakup = milestones.find((m) => m.type === "breakup")
    expect(breakup).toBeDefined()
    expect(breakup!.qualityDelta).toBe(-0.12)
  })

  it("attraction < 0.5 → breakup 불가 (v4.2)", () => {
    const prev = makeScore({ attraction: 0.3, warmth: 0.7 })
    const next = makeScore({ attraction: 0.3, warmth: 0.3 })
    const milestones = detectMilestones(prev, next, now)
    expect(milestones.find((m) => m.type === "breakup")).toBeUndefined()
  })

  it("동시에 여러 로맨틱 마일스톤 감지 가능 (v4.2)", () => {
    const prev = makeScore({ attraction: 0.2, warmth: 0.5 })
    const next = makeScore({ attraction: 0.75, warmth: 0.5 }) // first_flirt + confession
    const milestones = detectMilestones(prev, next, now)
    expect(milestones.find((m) => m.type === "first_flirt")).toBeDefined()
    expect(milestones.find((m) => m.type === "confession")).toBeDefined()
  })
})

describe("computeMilestoneQualityDelta", () => {
  it("긍정+부정 마일스톤 합산", () => {
    const milestones = [
      { type: "first_debate" as const, occurredAt: new Date(), qualityDelta: -0.05 },
      { type: "first_vulnerability" as const, occurredAt: new Date(), qualityDelta: 0.1 },
      { type: "first_deep_share" as const, occurredAt: new Date(), qualityDelta: 0.05 },
    ]
    expect(computeMilestoneQualityDelta(milestones)).toBeCloseTo(0.1, 5)
  })

  it("빈 배열 → 0", () => {
    expect(computeMilestoneQualityDelta([])).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// v4.1: peakStage 추적
// ═══════════════════════════════════════════════════════════════

describe("updatePeakStage", () => {
  it("peakStage 없음 → 현재 단계", () => {
    expect(updatePeakStage(undefined, "FAMILIAR")).toBe("FAMILIAR")
  })

  it("현재가 peak보다 높음 → 갱신", () => {
    expect(updatePeakStage("FAMILIAR", "CLOSE")).toBe("CLOSE")
  })

  it("현재가 peak보다 낮음 → 유지", () => {
    expect(updatePeakStage("CLOSE", "FAMILIAR")).toBe("CLOSE")
  })

  it("동일 단계 → 유지", () => {
    expect(updatePeakStage("INTIMATE", "INTIMATE")).toBe("INTIMATE")
  })

  it("Decay 단계(COOLING) → peak 유지", () => {
    expect(updatePeakStage("CLOSE", "COOLING")).toBe("CLOSE")
  })

  it("Decay 단계(ESTRANGED) → peak 유지", () => {
    expect(updatePeakStage("INTIMATE", "ESTRANGED")).toBe("INTIMATE")
  })
})
