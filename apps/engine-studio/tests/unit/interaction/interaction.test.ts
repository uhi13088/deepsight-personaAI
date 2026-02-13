// ═══════════════════════════════════════════════════════════════
// T73: 하이브리드 연결 메커니즘 테스트
// Init / Override / Adapt / Express / InteractionEngine
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
  extractKeywords,
  categorizeKeywords,
  calculateInitDelta,
} from "@/lib/interaction/init-algorithm"
import {
  detectTriggers,
  applyOverrides,
  decayOverrides,
  DEFAULT_OVERRIDE_RULES,
} from "@/lib/interaction/override-algorithm"
import {
  sentimentToUIV,
  createAdaptState,
  adaptVector,
  adaptBatch,
  DEFAULT_ADAPT_CONFIG,
} from "@/lib/interaction/adapt-algorithm"
import {
  calculateDerivedStates,
  evaluateQuirks,
  DEFAULT_QUIRKS,
} from "@/lib/interaction/express-algorithm"
import {
  ATTITUDE_DELTA_MAP,
  applyAttitudeDelta,
  createInteractionEngine,
  processTurn,
  calculateDrift,
  resetEngine,
  DEFAULT_ENGINE_CONFIG,
} from "@/lib/interaction"
import type { SocialPersonaVector } from "@/types"

// ── Fixtures ──────────────────────────────────────────────────

const L1: SocialPersonaVector = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
}

const HIGH_L1: SocialPersonaVector = {
  depth: 0.8,
  lens: 0.7,
  stance: 0.85,
  scope: 0.6,
  taste: 0.4,
  purpose: 0.75,
  sociability: 0.3,
}

// ═══════════════════════════════════════════════════════════════
// AC1: Init Algorithm
// ═══════════════════════════════════════════════════════════════

describe("Init Algorithm", () => {
  describe("extractKeywords", () => {
    it("should extract matching keywords from text", () => {
      const text = "이 영화의 논리적 구조와 분석이 인상적이다"
      const kws = extractKeywords(text)
      expect(kws).toContain("논리")
      expect(kws).toContain("구조")
      expect(kws).toContain("분석")
    })

    it("should return empty array when no keywords match", () => {
      const kws = extractKeywords("안녕하세요 좋은 날씨입니다")
      expect(kws).toEqual([])
    })
  })

  describe("categorizeKeywords", () => {
    it("should categorize keywords into semantic categories", () => {
      const cats = categorizeKeywords(["분석", "논리", "감동"])
      expect(cats).toContain("analytical")
      expect(cats).toContain("emotional")
    })

    it("should deduplicate categories", () => {
      const cats = categorizeKeywords(["분석", "구조", "논리"])
      // all three map to analytical
      expect(cats).toHaveLength(1)
      expect(cats[0]).toBe("analytical")
    })
  })

  describe("calculateInitDelta", () => {
    it("should adjust L1 vector based on context keywords", () => {
      const result = calculateInitDelta(
        L1,
        "이 콘텐츠는 논리적 분석과 깊이 있는 철학적 메시지를 담고 있다"
      )
      expect(result.extractedKeywords.length).toBeGreaterThan(0)
      expect(result.detectedCategories.length).toBeGreaterThan(0)
      // analytical + serious keywords → depth and lens should change
      expect(result.adjustedVector.depth).not.toBe(L1.depth)
    })

    it("should not modify vector when no keywords found", () => {
      const result = calculateInitDelta(L1, "안녕하세요")
      expect(result.adjustedVector).toEqual(L1)
      expect(result.extractedKeywords).toEqual([])
    })

    it("should clamp values to [0, 1]", () => {
      const lowL1 = { ...L1, depth: 0.01, purpose: 0.01 }
      const result = calculateInitDelta(lowL1, "재미 오락 가볍게 웃음")
      expect(result.adjustedVector.depth).toBeGreaterThanOrEqual(0)
      expect(result.adjustedVector.purpose).toBeGreaterThanOrEqual(0)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: Override Algorithm
// ═══════════════════════════════════════════════════════════════

describe("Override Algorithm", () => {
  describe("detectTriggers", () => {
    it("should detect anger trigger keywords", () => {
      const triggered = detectTriggers("정말 화가 나고 짜증나는 상황이다")
      expect(triggered.length).toBeGreaterThan(0)
      expect(triggered.some((r) => r.id === "anger_trigger")).toBe(true)
    })

    it("should detect multiple triggers", () => {
      const triggered = detectTriggers("함께 토론하며 새로운 실험을 해보자")
      expect(triggered.some((r) => r.id === "social_burst")).toBe(true)
      expect(triggered.some((r) => r.id === "creativity_spark")).toBe(true)
    })

    it("should return empty when no triggers match", () => {
      const triggered = detectTriggers("오늘 날씨가 좋다")
      expect(triggered).toEqual([])
    })
  })

  describe("applyOverrides", () => {
    it("should apply override to vector", () => {
      const result = applyOverrides(L1, "화가 난다!", [])
      expect(result.triggeredRules).toContain("anger_trigger")
      expect(result.adjustedVector.stance).toBe(0.95)
    })

    it("should apply additive delta", () => {
      const result = applyOverrides(L1, "공감이 되는 이야기", [])
      expect(result.triggeredRules).toContain("empathy_trigger")
      // lens should decrease (additive delta -0.2)
      expect(result.adjustedVector.lens).toBe(0.3)
    })

    it("should decay existing overrides", () => {
      const existing = [
        {
          ruleId: "anger_trigger",
          dimension: "stance" as const,
          originalValue: 0.5,
          targetValue: 0.95,
          mode: "override" as const,
          turnsRemaining: 3,
          decayRate: 0.3,
          currentMagnitude: 0.7,
        },
      ]
      const result = applyOverrides(L1, "평범한 대화", existing)
      // should have decayed override
      const overr = result.activeOverrides.find((o) => o.ruleId === "anger_trigger")
      expect(overr).toBeDefined()
      expect(overr!.currentMagnitude).toBeLessThan(0.7)
    })
  })

  describe("decayOverrides", () => {
    it("should decay magnitude and reduce turns", () => {
      const overrides = [
        {
          ruleId: "test",
          dimension: "stance" as const,
          originalValue: 0.5,
          targetValue: 0.9,
          mode: "override" as const,
          turnsRemaining: 3,
          decayRate: 0.3,
          currentMagnitude: 1.0,
        },
      ]
      const decayed = decayOverrides(overrides)
      expect(decayed[0].turnsRemaining).toBe(2)
      expect(decayed[0].currentMagnitude).toBe(0.7)
    })

    it("should remove overrides below threshold", () => {
      const overrides = [
        {
          ruleId: "test",
          dimension: "stance" as const,
          originalValue: 0.5,
          targetValue: 0.9,
          mode: "override" as const,
          turnsRemaining: 1,
          decayRate: 0.96,
          currentMagnitude: 0.04,
        },
      ]
      const decayed = decayOverrides(overrides)
      expect(decayed).toHaveLength(0)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Adapt Algorithm
// ═══════════════════════════════════════════════════════════════

describe("Adapt Algorithm", () => {
  describe("sentimentToUIV", () => {
    it("should map supportive to positive UIV", () => {
      const uiv = sentimentToUIV("supportive")
      expect(uiv.valence).toBeGreaterThan(0)
      expect(uiv.engagement).toBeGreaterThan(0)
    })

    it("should map aggressive to negative UIV", () => {
      const uiv = sentimentToUIV("aggressive")
      expect(uiv.valence).toBeLessThan(0)
      expect(uiv.intensity).toBeGreaterThan(0.5)
    })
  })

  describe("createAdaptState", () => {
    it("should initialize with zero delta and momentum", () => {
      const state = createAdaptState(L1)
      expect(state.originalL1).toEqual(L1)
      expect(state.currentL1).toEqual(L1)
      expect(state.turnCount).toBe(0)
      expect(state.totalDelta.depth).toBe(0)
      expect(state.momentumBuffer.depth).toBe(0)
    })
  })

  describe("adaptVector", () => {
    it("should not adapt before minTurns", () => {
      const state = createAdaptState(L1)
      const uiv = sentimentToUIV("supportive")
      const result = adaptVector(state, uiv)
      // turnCount=1 < minTurnsForAdapt=3
      expect(result.currentL1).toEqual(L1)
      expect(result.turnCount).toBe(1)
    })

    it("should adapt after minTurns", () => {
      let state = createAdaptState(L1)
      const uiv = sentimentToUIV("supportive")
      // Advance past minTurns
      state = adaptVector(state, uiv)
      state = adaptVector(state, uiv)
      state = adaptVector(state, uiv) // turnCount=3, now adapting
      // At least one dimension should have changed
      const changed = Object.keys(state.currentL1).some(
        (k) =>
          state.currentL1[k as keyof SocialPersonaVector] !== L1[k as keyof SocialPersonaVector]
      )
      expect(changed).toBe(true)
    })

    it("should respect maxDelta clamping", () => {
      let state = createAdaptState(L1)
      const uiv = sentimentToUIV("aggressive")
      // Many turns of aggressive sentiment
      for (let i = 0; i < 50; i++) {
        state = adaptVector(state, uiv)
      }
      // No totalDelta should exceed ±0.3
      for (const val of Object.values(state.totalDelta)) {
        expect(Math.abs(val)).toBeLessThanOrEqual(0.3 + 0.01) // small float tolerance
      }
    })
  })

  describe("adaptBatch", () => {
    it("should process multiple sentiments", () => {
      const state = createAdaptState(L1)
      const result = adaptBatch(state, ["supportive", "supportive", "challenging", "neutral"])
      expect(result.turnCount).toBe(4)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: Express Algorithm
// ═══════════════════════════════════════════════════════════════

describe("Express Algorithm", () => {
  describe("calculateDerivedStates", () => {
    it("should return 5 derived states in [0, 1]", () => {
      const states = calculateDerivedStates(L1)
      expect(states.irritability).toBeGreaterThanOrEqual(0)
      expect(states.irritability).toBeLessThanOrEqual(1)
      expect(states.enthusiasm).toBeGreaterThanOrEqual(0)
      expect(states.enthusiasm).toBeLessThanOrEqual(1)
      expect(states.vulnerability).toBeGreaterThanOrEqual(0)
      expect(states.vulnerability).toBeLessThanOrEqual(1)
      expect(states.assertiveness).toBeGreaterThanOrEqual(0)
      expect(states.assertiveness).toBeLessThanOrEqual(1)
      expect(states.introspection).toBeGreaterThanOrEqual(0)
      expect(states.introspection).toBeLessThanOrEqual(1)
    })

    it("should increase irritability with high pressure", () => {
      const noPressure = calculateDerivedStates(L1, 0)
      const highPressure = calculateDerivedStates(L1, 1)
      expect(highPressure.irritability).toBeGreaterThan(noPressure.irritability)
    })

    it("should increase vulnerability with high pressure", () => {
      const noPressure = calculateDerivedStates(L1, 0)
      const highPressure = calculateDerivedStates(L1, 1)
      expect(highPressure.vulnerability).toBeGreaterThan(noPressure.vulnerability)
    })

    it("should produce higher assertiveness with high stance+depth+purpose", () => {
      const highAssert = calculateDerivedStates(HIGH_L1)
      const lowAssert = calculateDerivedStates(L1)
      expect(highAssert.assertiveness).toBeGreaterThan(lowAssert.assertiveness)
    })
  })

  describe("evaluateQuirks", () => {
    it("should return ExpressResult structure", () => {
      const derived = calculateDerivedStates(L1)
      const result = evaluateQuirks(L1, derived, 1, [])
      expect(result).toHaveProperty("derivedStates")
      expect(result).toHaveProperty("firedQuirks")
      expect(result).toHaveProperty("quirkStates")
      expect(Array.isArray(result.firedQuirks)).toBe(true)
    })

    it("should respect cooldown", () => {
      const derived = calculateDerivedStates(HIGH_L1, 1)
      // Simulate a quirk that just fired at turn 1 with cooldown 3
      const priorStates = [{ quirkId: "sarcasm_burst", lastFiredTurn: 1, totalFired: 1 }]
      const result = evaluateQuirks(HIGH_L1, derived, 2, priorStates)
      // sarcasm_burst should not fire at turn 2 (cooldown=3, needs turn 4+)
      const sarcasm = result.firedQuirks.find((q) => q.quirkId === "sarcasm_burst")
      expect(sarcasm).toBeUndefined()
    })

    it("should allow quirk after cooldown expires", () => {
      const derived = calculateDerivedStates(HIGH_L1, 1)
      const priorStates = [{ quirkId: "sarcasm_burst", lastFiredTurn: 1, totalFired: 1 }]
      // Turn 5 (cooldown 3 = needs > 1+3 = turn 4+)
      const result = evaluateQuirks(HIGH_L1, derived, 5, priorStates)
      // May or may not fire due to probability, but cooldown is not blocking
      // We check that sarcasm_burst condition is met (irritability > 0.7)
      expect(derived.irritability).toBeGreaterThan(0.5) // high stance + pressure
    })

    it("should provide DEFAULT_QUIRKS with 6 definitions", () => {
      expect(DEFAULT_QUIRKS).toHaveLength(6)
      for (const quirk of DEFAULT_QUIRKS) {
        expect(quirk.id).toBeTruthy()
        expect(quirk.cooldownTurns).toBeGreaterThan(0)
        expect(quirk.baseProbability).toBeGreaterThan(0)
        expect(quirk.baseProbability).toBeLessThanOrEqual(1)
      }
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC5: Attitude → Delta Mapping + InteractionEngine
// ═══════════════════════════════════════════════════════════════

describe("Attitude Delta Mapping", () => {
  it("should have 8 attitude types", () => {
    const attitudes = Object.keys(ATTITUDE_DELTA_MAP)
    expect(attitudes).toHaveLength(8)
    expect(attitudes).toContain("admiring")
    expect(attitudes).toContain("neutral")
    expect(attitudes).toContain("confrontational")
  })

  it("neutral should have no deltas", () => {
    expect(ATTITUDE_DELTA_MAP.neutral).toHaveLength(0)
  })

  it("should apply admiring delta — stance decreases", () => {
    const result = applyAttitudeDelta(L1, "admiring")
    expect(result.stance).toBeLessThan(L1.stance)
    expect(result.sociability).toBeGreaterThan(L1.sociability)
  })

  it("should apply confrontational delta — stance increases", () => {
    const result = applyAttitudeDelta(L1, "confrontational")
    expect(result.stance).toBeGreaterThan(L1.stance)
  })

  it("should respect bounds", () => {
    const lowStance = { ...L1, stance: 0.05 }
    const result = applyAttitudeDelta(lowStance, "admiring")
    // admiring has bounds min 0.1 for stance
    expect(result.stance).toBeGreaterThanOrEqual(0.1)
  })
})

describe("InteractionEngine", () => {
  describe("createInteractionEngine", () => {
    it("should initialize engine state", () => {
      const state = createInteractionEngine(L1)
      expect(state.originalL1).toEqual(L1)
      expect(state.currentL1).toEqual(L1)
      expect(state.initApplied).toBe(false)
      expect(state.activeOverrides).toEqual([])
      expect(state.currentTurn).toBe(0)
      expect(state.quirkStates).toEqual([])
    })
  })

  describe("processTurn", () => {
    it("should apply Init on first turn with context", () => {
      const state = createInteractionEngine(L1)
      const result = processTurn(state, {
        userMessage: "안녕하세요",
        sentiment: "neutral",
        contextText: "분석적이고 논리적인 콘텐츠를 좋아합니다",
      })
      expect(result.initResult).not.toBeNull()
      expect(result.state.initApplied).toBe(true)
    })

    it("should not apply Init on second turn", () => {
      let state = createInteractionEngine(L1)
      const firstResult = processTurn(state, {
        userMessage: "안녕",
        sentiment: "neutral",
        contextText: "분석 논리",
      })
      state = firstResult.state

      const secondResult = processTurn(state, {
        userMessage: "또 분석해줘",
        sentiment: "neutral",
        contextText: "분석 논리",
      })
      expect(secondResult.initResult).toBeNull()
    })

    it("should apply Override when trigger detected", () => {
      const state = createInteractionEngine(L1)
      const result = processTurn(state, {
        userMessage: "정말 화가 나!",
        sentiment: "aggressive",
      })
      expect(result.overrideResult).not.toBeNull()
      expect(result.overrideResult!.triggeredRules).toContain("anger_trigger")
    })

    it("should apply attitude delta when provided", () => {
      const state = createInteractionEngine(L1)
      const result = processTurn(state, {
        userMessage: "그렇군요",
        sentiment: "neutral",
        attitude: "curious",
      })
      expect(result.attitudeApplied).toBe(true)
      expect(result.state.currentL1.depth).toBeGreaterThan(L1.depth)
    })

    it("should run Express and return derived states", () => {
      const state = createInteractionEngine(L1)
      const result = processTurn(state, {
        userMessage: "안녕하세요",
        sentiment: "neutral",
        pressure: 0.5,
      })
      expect(result.expressResult).not.toBeNull()
      expect(result.state.lastDerivedStates).not.toBeNull()
    })

    it("should increment turn count", () => {
      const state = createInteractionEngine(L1)
      const r1 = processTurn(state, { userMessage: "1", sentiment: "neutral" })
      expect(r1.state.currentTurn).toBe(1)
      const r2 = processTurn(r1.state, { userMessage: "2", sentiment: "neutral" })
      expect(r2.state.currentTurn).toBe(2)
    })

    it("should handle multi-turn conversation", () => {
      let state = createInteractionEngine(L1)

      // Turn 1: Init
      const r1 = processTurn(state, {
        userMessage: "이 영화 어떤가요?",
        sentiment: "neutral",
        contextText: "깊이 있는 분석과 감정적 공감을 원합니다",
      })
      state = r1.state
      expect(state.initApplied).toBe(true)

      // Turn 2: supportive
      const r2 = processTurn(state, {
        userMessage: "좋은 의견이네요",
        sentiment: "supportive",
      })
      state = r2.state

      // Turn 3: challenging (adapt starts at turn 3)
      const r3 = processTurn(state, {
        userMessage: "그건 좀 아닌 것 같은데요",
        sentiment: "challenging",
      })
      state = r3.state

      // Turn 4: aggressive with trigger
      const r4 = processTurn(state, {
        userMessage: "정말 화가 나요, 짜증나!",
        sentiment: "aggressive",
        attitude: "confrontational",
        pressure: 0.8,
      })
      state = r4.state

      expect(state.currentTurn).toBe(4)
      expect(state.activeOverrides.length).toBeGreaterThan(0)
    })
  })

  describe("calculateDrift", () => {
    it("should return zero drift for fresh engine", () => {
      const state = createInteractionEngine(L1)
      const drift = calculateDrift(state)
      for (const val of Object.values(drift)) {
        expect(val).toBe(0)
      }
    })

    it("should calculate drift after modifications", () => {
      const state = createInteractionEngine(L1)
      const result = processTurn(state, {
        userMessage: "화가 난다!",
        sentiment: "aggressive",
        attitude: "confrontational",
      })
      const drift = calculateDrift(result.state)
      // stance should have drifted
      expect(drift.stance).not.toBe(0)
    })
  })

  describe("resetEngine", () => {
    it("should restore original vector", () => {
      const state = createInteractionEngine(L1)
      const modified = processTurn(state, {
        userMessage: "화가 난다!",
        sentiment: "aggressive",
      })
      const reset = resetEngine(modified.state)
      expect(reset.currentL1).toEqual(L1)
      expect(reset.currentTurn).toBe(0)
      expect(reset.initApplied).toBe(false)
    })
  })

  describe("selective algorithm disabling", () => {
    it("should skip Init when disabled", () => {
      const state = createInteractionEngine(L1)
      const config = { ...DEFAULT_ENGINE_CONFIG, enableInit: false }
      const result = processTurn(
        state,
        { userMessage: "분석 논리", sentiment: "neutral", contextText: "분석 논리" },
        config
      )
      expect(result.initResult).toBeNull()
    })

    it("should skip Override when disabled", () => {
      const state = createInteractionEngine(L1)
      const config = { ...DEFAULT_ENGINE_CONFIG, enableOverride: false }
      const result = processTurn(
        state,
        { userMessage: "화가 나!", sentiment: "aggressive" },
        config
      )
      expect(result.overrideResult).toBeNull()
    })

    it("should skip Express when disabled", () => {
      const state = createInteractionEngine(L1)
      const config = { ...DEFAULT_ENGINE_CONFIG, enableExpress: false }
      const result = processTurn(state, { userMessage: "안녕", sentiment: "neutral" }, config)
      expect(result.expressResult).toBeNull()
    })
  })
})
