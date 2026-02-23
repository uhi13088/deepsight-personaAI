// ═══════════════════════════════════════════════════════════════
// Phase RA 테스트: L2 패턴 분류 + 참여 결정 + Voice 조정
// T191 (l2-pattern) + T192 (engagement-decision) + T193 (voice-adjustment)
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import { classifyL2Pattern } from "@/lib/persona-world/interactions/l2-pattern"
import { decideEngagement } from "@/lib/persona-world/interactions/engagement-decision"
import {
  computeVoiceAdjustment,
  mergeAllowedTones,
} from "@/lib/persona-world/interactions/voice-adjustment"

// ─────────────────────────────────────────────────────────────
// T191: L2 패턴 분류
// ─────────────────────────────────────────────────────────────

describe("classifyL2Pattern", () => {
  const base = {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
  }

  describe("Dominant 분류", () => {
    it("낮은 순응성 + 높은 외향성 → Dominant", () => {
      const result = classifyL2Pattern({ ...base, agreeableness: 0.2, extraversion: 0.8 })
      expect(result.pattern).toBe("Dominant")
    })

    it("경계값: agreeableness=0.4, extraversion=0.6 → Dominant", () => {
      const result = classifyL2Pattern({ ...base, agreeableness: 0.4, extraversion: 0.6 })
      expect(result.pattern).toBe("Dominant")
    })

    it("confidence는 0~1 범위", () => {
      const result = classifyL2Pattern({ ...base, agreeableness: 0.1, extraversion: 0.9 })
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe("Aggressive 분류", () => {
    it("낮은 순응성 + 높은 신경성 → Aggressive", () => {
      const result = classifyL2Pattern({
        ...base,
        agreeableness: 0.2,
        neuroticism: 0.8,
        extraversion: 0.4,
      })
      expect(result.pattern).toBe("Aggressive")
    })

    it("낮은 순응성 + 높은 외향성/신경성 모두 → Dominant 우선", () => {
      // agreeableness <= 0.4 AND extraversion >= 0.6 → Dominant이 먼저
      const result = classifyL2Pattern({
        ...base,
        agreeableness: 0.3,
        extraversion: 0.7,
        neuroticism: 0.7,
      })
      expect(result.pattern).toBe("Dominant")
    })
  })

  describe("Anxious 분류", () => {
    it("높은 신경성 + 낮은 외향성 → Anxious", () => {
      const result = classifyL2Pattern({ ...base, neuroticism: 0.8, extraversion: 0.2 })
      expect(result.pattern).toBe("Anxious")
    })

    it("높은 신경성 + 낮은 외향성 + 높은 순응성 → Anxious 우선 (신경성 기준 우선)", () => {
      // neuroticism >= 0.6 AND extraversion <= 0.4 → Anxious (Avoidant보다 우선)
      const result = classifyL2Pattern({
        ...base,
        neuroticism: 0.7,
        extraversion: 0.3,
        agreeableness: 0.8,
      })
      expect(result.pattern).toBe("Anxious")
    })
  })

  describe("Avoidant 분류", () => {
    it("높은 순응성 + 낮은 외향성 → Avoidant", () => {
      const result = classifyL2Pattern({ ...base, agreeableness: 0.8, extraversion: 0.2 })
      expect(result.pattern).toBe("Avoidant")
    })

    it("경계값: agreeableness=0.6, extraversion=0.4 → Avoidant", () => {
      const result = classifyL2Pattern({
        ...base,
        agreeableness: 0.6,
        extraversion: 0.4,
        neuroticism: 0.3,
      })
      expect(result.pattern).toBe("Avoidant")
    })
  })

  describe("Stable 분류", () => {
    it("중간값 → Stable", () => {
      const result = classifyL2Pattern({ ...base })
      expect(result.pattern).toBe("Stable")
    })

    it("confidence=0.5로 고정", () => {
      const result = classifyL2Pattern({ ...base })
      expect(result.confidence).toBe(0.5)
    })
  })

  describe("reason 필드", () => {
    it("reason에 관련 수치 포함", () => {
      const result = classifyL2Pattern({ ...base, agreeableness: 0.2, extraversion: 0.8 })
      expect(result.reason).toContain("agreeableness")
      expect(result.reason).toContain("extraversion")
    })
  })
})

// ─────────────────────────────────────────────────────────────
// T192: 참여 결정
// ─────────────────────────────────────────────────────────────

describe("decideEngagement", () => {
  describe("tension 낮음 (<0.5) — 기질 무관 대부분 comment", () => {
    it("Avoidant + tension 낮음 → rand=0.1 → comment", () => {
      const result = decideEngagement("Avoidant", 0.3, 0.1)
      expect(result.action).toBe("comment")
    })

    it("Anxious + tension 낮음 → rand=0.1 → comment", () => {
      const result = decideEngagement("Anxious", 0.2, 0.1)
      expect(result.action).toBe("comment")
    })
  })

  describe("Avoidant + tension 높음 (>0.7) — 침묵 우세", () => {
    it("rand=0.5 → skip (확률: comment 10%, react 20%, skip 70%)", () => {
      const result = decideEngagement("Avoidant", 0.8, 0.5)
      // rand=0.5 > 0.1(comment) + 0.2(react) = 0.3 → skip
      expect(result.action).toBe("skip")
    })

    it("rand=0.05 → comment (10% 확률)", () => {
      const result = decideEngagement("Avoidant", 0.9, 0.05)
      expect(result.action).toBe("comment")
    })

    it("rand=0.15 → react_only", () => {
      const result = decideEngagement("Avoidant", 0.8, 0.15)
      // rand=0.15 > 0.1(comment) but < 0.3(comment+react) → react_only
      expect(result.action).toBe("react_only")
    })

    it("skip 결정 시 suppressedBy 필드 포함", () => {
      const result = decideEngagement("Avoidant", 0.8, 0.9)
      expect(result.suppressedBy).toBeDefined()
      expect(result.suppressedBy).toContain("Avoidant")
    })
  })

  describe("Aggressive + tension 높음 — 적극 참여", () => {
    it("rand=0.5 → comment (90% 확률)", () => {
      const result = decideEngagement("Aggressive", 0.8, 0.5)
      expect(result.action).toBe("comment")
    })

    it("rand=0.01 → comment", () => {
      const result = decideEngagement("Aggressive", 0.9, 0.01)
      expect(result.action).toBe("comment")
    })
  })

  describe("Anxious + tension 높음 — 마비", () => {
    it("rand=0.5 → skip (확률: comment 10%, react 40%, skip 50%)", () => {
      const result = decideEngagement("Anxious", 0.8, 0.6)
      // rand=0.6 > 0.10 + 0.40 = 0.50 → skip
      expect(result.action).toBe("skip")
    })

    it("rand=0.3 → react_only", () => {
      const result = decideEngagement("Anxious", 0.8, 0.3)
      // rand=0.3 > 0.10(comment) but < 0.50(comment+react) → react_only
      expect(result.action).toBe("react_only")
    })
  })

  describe("Dominant + tension 높음 — 논쟁 주도 유지", () => {
    it("rand=0.5 → comment (70% 확률)", () => {
      const result = decideEngagement("Dominant", 0.8, 0.5)
      expect(result.action).toBe("comment")
    })
  })

  describe("tension 중간 (0.5~0.7)", () => {
    it("Avoidant + tension=0.6 → rand=0.7 → skip", () => {
      const result = decideEngagement("Avoidant", 0.6, 0.7)
      // probs=[0.4, 0.3, 0.3]: rand=0.7 > 0.4+0.3=0.7 → exactly boundary → react_only
      // rand=0.71 → skip
      const result2 = decideEngagement("Avoidant", 0.6, 0.71)
      expect(result2.action).toBe("skip")
    })
  })

  describe("comment 결정 시 suppressedBy 없음", () => {
    it("comment 결정에는 suppressedBy 없음", () => {
      const result = decideEngagement("Stable", 0.2, 0.1)
      expect(result.action).toBe("comment")
      expect(result.suppressedBy).toBeUndefined()
    })
  })

  describe("reason 포함", () => {
    it("결정에 항상 reason 포함", () => {
      const result = decideEngagement("Avoidant", 0.8, 0.9)
      expect(result.reason).toBeTruthy()
      expect(result.reason.length).toBeGreaterThan(0)
    })
  })
})

// ─────────────────────────────────────────────────────────────
// T193: Voice 조정
// ─────────────────────────────────────────────────────────────

describe("computeVoiceAdjustment", () => {
  describe("tension < 0.5 → null", () => {
    it("모든 기질 tension=0.4 → null", () => {
      expect(computeVoiceAdjustment("Avoidant", 0.4)).toBeNull()
      expect(computeVoiceAdjustment("Aggressive", 0.4)).toBeNull()
      expect(computeVoiceAdjustment("Dominant", 0.4)).toBeNull()
      expect(computeVoiceAdjustment("Anxious", 0.4)).toBeNull()
      expect(computeVoiceAdjustment("Stable", 0.4)).toBeNull()
    })
  })

  describe("Avoidant + high tension", () => {
    it("toneFilter 제한됨", () => {
      const adj = computeVoiceAdjustment("Avoidant", 0.8)
      expect(adj).not.toBeNull()
      expect(adj!.toneFilter).toContain("formal_analysis")
      expect(adj!.toneFilter).not.toContain("intimate_joke")
    })

    it("길이 배율 매우 작음 (0.2)", () => {
      const adj = computeVoiceAdjustment("Avoidant", 0.8)
      expect(adj!.lengthMultiplier).toBe(0.2)
    })

    it("감정어 억제 활성화", () => {
      const adj = computeVoiceAdjustment("Avoidant", 0.8)
      expect(adj!.suppressEmotionWords).toBe(true)
    })

    it("formality 높음", () => {
      const adj = computeVoiceAdjustment("Avoidant", 0.8)
      expect(adj!.styleOverride?.formality).toBeGreaterThan(0.7)
    })
  })

  describe("Avoidant + mid tension", () => {
    it("toneFilter 존재하나 high보다 넓음", () => {
      const adjMid = computeVoiceAdjustment("Avoidant", 0.6)
      const adjHigh = computeVoiceAdjustment("Avoidant", 0.8)
      expect(adjMid!.toneFilter!.length).toBeGreaterThan(adjHigh!.toneFilter!.length)
    })

    it("길이 배율 high보다 큼 (0.5)", () => {
      const adj = computeVoiceAdjustment("Avoidant", 0.6)
      expect(adj!.lengthMultiplier).toBe(0.5)
    })
  })

  describe("Aggressive + high tension", () => {
    it("direct_rebuttal 포함", () => {
      const adj = computeVoiceAdjustment("Aggressive", 0.8)
      expect(adj!.toneFilter).toContain("direct_rebuttal")
    })

    it("assertiveness 최대치에 가까움", () => {
      const adj = computeVoiceAdjustment("Aggressive", 0.8)
      expect(adj!.styleOverride?.assertiveness).toBeGreaterThanOrEqual(0.9)
    })
  })

  describe("Dominant + high tension", () => {
    it("길이 배율 1.5 (확장)", () => {
      const adj = computeVoiceAdjustment("Dominant", 0.8)
      expect(adj!.lengthMultiplier).toBe(1.5)
    })

    it("deep_analysis, formal_analysis 포함", () => {
      const adj = computeVoiceAdjustment("Dominant", 0.8)
      expect(adj!.toneFilter).toContain("deep_analysis")
      expect(adj!.toneFilter).toContain("formal_analysis")
    })
  })

  describe("Anxious + high tension", () => {
    it("toneFilter가 supportive만", () => {
      const adj = computeVoiceAdjustment("Anxious", 0.8)
      expect(adj!.toneFilter).toEqual(["supportive"])
    })

    it("길이 배율 0.3 (매우 짧음)", () => {
      const adj = computeVoiceAdjustment("Anxious", 0.8)
      expect(adj!.lengthMultiplier).toBe(0.3)
    })

    it("감정어 억제 활성화", () => {
      const adj = computeVoiceAdjustment("Anxious", 0.8)
      expect(adj!.suppressEmotionWords).toBe(true)
    })
  })

  describe("Stable", () => {
    it("mid tension → null", () => {
      expect(computeVoiceAdjustment("Stable", 0.6)).toBeNull()
    })

    it("high tension → 소폭 조정만", () => {
      const adj = computeVoiceAdjustment("Stable", 0.8)
      expect(adj).not.toBeNull()
      expect(adj!.toneFilter).toBeUndefined() // 톤 필터 없음
      expect(adj!.lengthMultiplier).toBeDefined()
    })
  })
})

describe("mergeAllowedTones", () => {
  it("adjustment null → 기존 반환", () => {
    const result = mergeAllowedTones(["empathetic", "supportive"], null)
    expect(result).toEqual(["empathetic", "supportive"])
  })

  it("toneFilter 없는 adjustment → 기존 반환", () => {
    const result = mergeAllowedTones(["empathetic"], { lengthMultiplier: 0.5 })
    expect(result).toEqual(["empathetic"])
  })

  it("기존 없음 → toneFilter 그대로", () => {
    const result = mergeAllowedTones(undefined, { toneFilter: ["formal_analysis", "supportive"] })
    expect(result).toEqual(["formal_analysis", "supportive"])
  })

  it("교집합 반환", () => {
    const result = mergeAllowedTones(["empathetic", "formal_analysis", "supportive"], {
      toneFilter: ["formal_analysis", "direct_rebuttal"],
    })
    expect(result).toEqual(["formal_analysis"])
  })

  it("교집합 비어있으면 toneFilter 사용 (fallback)", () => {
    const result = mergeAllowedTones(["intimate_joke"], {
      toneFilter: ["formal_analysis", "direct_rebuttal"],
    })
    expect(result).toEqual(["formal_analysis", "direct_rebuttal"])
  })

  it("기존 빈 배열 → toneFilter 그대로", () => {
    const result = mergeAllowedTones([], { toneFilter: ["supportive"] })
    expect(result).toEqual(["supportive"])
  })
})
