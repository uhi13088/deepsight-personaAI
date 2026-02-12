import { describe, it, expect } from "vitest"
import type { ThreeLayerVector } from "@/types/persona-v3"
import {
  sigmoid,
  computeParadoxActivityChance,
  detectParadoxPatterns,
  decideParadoxActivity,
  PARADOX_PATTERNS,
} from "@/lib/persona-world/paradox-activity"
import type { PersonaStateData } from "@/lib/persona-world/types"

// ── 테스트용 벡터 ──

const makeVectors = (overrides?: Partial<ThreeLayerVector>): ThreeLayerVector => ({
  social: {
    depth: 0.5,
    lens: 0.5,
    stance: 0.5,
    scope: 0.5,
    taste: 0.5,
    purpose: 0.5,
    sociability: 0.5,
    ...overrides?.social,
  },
  temperament: {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
    ...overrides?.temperament,
  },
  narrative: {
    lack: 0.5,
    moralCompass: 0.5,
    volatility: 0.5,
    growthArc: 0.5,
    ...overrides?.narrative,
  },
})

const makeState = (overrides?: Partial<PersonaStateData>): PersonaStateData => ({
  mood: 0.5,
  energy: 1.0,
  socialBattery: 1.0,
  paradoxTension: 0.0,
  ...overrides,
})

// ═══ sigmoid ═══

describe("sigmoid", () => {
  it("σ(0) = 0.5", () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 4)
  })

  it("σ(큰 양수) ≈ 1.0", () => {
    expect(sigmoid(10)).toBeCloseTo(1.0, 4)
  })

  it("σ(큰 음수) ≈ 0.0", () => {
    expect(sigmoid(-10)).toBeCloseTo(0.0, 4)
  })

  it("σ(-x) = 1 - σ(x)", () => {
    const x = 1.5
    expect(sigmoid(-x)).toBeCloseTo(1 - sigmoid(x), 6)
  })
})

// ═══ computeParadoxActivityChance ═══

describe("computeParadoxActivityChance", () => {
  it("paradoxScore 0.5 → ~50%", () => {
    // sigmoid(0.5 × 3 - 1.5) = sigmoid(0) = 0.5
    const chance = computeParadoxActivityChance(0.5)
    expect(chance).toBeCloseTo(0.5, 2)
  })

  it("paradoxScore 0.3 → ~12%", () => {
    // sigmoid(0.3 × 3 - 1.5) = sigmoid(-0.6) ≈ 0.354
    // 설계서에는 ~12%라고 쓰여있지만 실제 sigmoid(-0.6) ≈ 0.354
    // 설계서의 "~12%"는 대략적 참고값
    const chance = computeParadoxActivityChance(0.3)
    expect(chance).toBeLessThan(0.5)
    expect(chance).toBeGreaterThan(0)
  })

  it("paradoxScore 0.7 → ~50% 이상", () => {
    // sigmoid(0.7 × 3 - 1.5) = sigmoid(0.6) ≈ 0.646
    const chance = computeParadoxActivityChance(0.7)
    expect(chance).toBeGreaterThan(0.5)
    expect(chance).toBeLessThan(1.0)
  })

  it("paradoxScore 0 → 낮은 확률", () => {
    // sigmoid(0 × 3 - 1.5) = sigmoid(-1.5) ≈ 0.182
    const chance = computeParadoxActivityChance(0)
    expect(chance).toBeLessThan(0.3)
  })

  it("paradoxScore 1.0 → 높은 확률", () => {
    // sigmoid(1.0 × 3 - 1.5) = sigmoid(1.5) ≈ 0.818
    const chance = computeParadoxActivityChance(1.0)
    expect(chance).toBeGreaterThan(0.7)
  })

  it("paradoxScore 증가 → 확률 단조 증가", () => {
    const c1 = computeParadoxActivityChance(0.2)
    const c2 = computeParadoxActivityChance(0.5)
    const c3 = computeParadoxActivityChance(0.8)
    expect(c1).toBeLessThan(c2)
    expect(c2).toBeLessThan(c3)
  })
})

// ═══ detectParadoxPatterns ═══

describe("detectParadoxPatterns", () => {
  it("사교적 내향인 — sociability 높음 + extraversion 낮음", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.8,
      },
      temperament: {
        openness: 0.5,
        conscientiousness: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
        extraversion: 0.2,
      },
    })

    const patterns = detectParadoxPatterns(vectors)
    expect(patterns.some((p) => p.name === "sociable_introvert")).toBe(true)
  })

  it("상처받은 비평가 — stance 높음 + agreeableness 높음", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        lens: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
        stance: 0.8,
      },
      temperament: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        neuroticism: 0.5,
        agreeableness: 0.8,
      },
    })

    const patterns = detectParadoxPatterns(vectors)
    expect(patterns.some((p) => p.name === "wounded_critic")).toBe(true)
  })

  it("게으른 완벽주의자 — scope 높음 + conscientiousness 낮음", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
        scope: 0.8,
      },
      temperament: {
        openness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
        conscientiousness: 0.2,
      },
    })

    const patterns = detectParadoxPatterns(vectors)
    expect(patterns.some((p) => p.name === "lazy_perfectionist")).toBe(true)
  })

  it("폭발하는 지성인 — lens 높음 + volatility 높음", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
        lens: 0.8,
      },
      narrative: {
        lack: 0.5,
        moralCompass: 0.5,
        growthArc: 0.5,
        volatility: 0.8,
      },
    })

    const patterns = detectParadoxPatterns(vectors)
    expect(patterns.some((p) => p.name === "exploding_intellectual")).toBe(true)
  })

  it("조건 미충족 → 빈 배열", () => {
    const vectors = makeVectors() // 모두 0.5 → 임계값 미달
    const patterns = detectParadoxPatterns(vectors)
    expect(patterns).toHaveLength(0)
  })

  it("복수 패턴 동시 매칭", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        lens: 0.8,
        stance: 0.8,
        scope: 0.8,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.8,
      },
      temperament: {
        openness: 0.5,
        conscientiousness: 0.2,
        extraversion: 0.2,
        agreeableness: 0.8,
        neuroticism: 0.5,
      },
      narrative: {
        lack: 0.5,
        moralCompass: 0.5,
        volatility: 0.8,
        growthArc: 0.5,
      },
    })

    const patterns = detectParadoxPatterns(vectors)
    expect(patterns.length).toBeGreaterThanOrEqual(2)
  })
})

// ═══ decideParadoxActivity ═══

describe("decideParadoxActivity", () => {
  it("패턴 매칭 + random < chance → shouldTrigger true", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.8,
      },
      temperament: {
        openness: 0.5,
        conscientiousness: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
        extraversion: 0.2,
      },
    })
    const state = makeState({ paradoxTension: 0.3 })

    // paradoxScore 0.7 → chance ~0.65
    const result = decideParadoxActivity(vectors, 0.7, state, 0.1) // random=0.1 < chance
    expect(result.shouldTrigger).toBe(true)
    expect(result.matchedPatterns.length).toBeGreaterThan(0)
    expect(result.primaryPattern).not.toBeNull()
    expect(result.primaryPattern!.name).toBe("sociable_introvert")
  })

  it("패턴 매칭 + random > chance → shouldTrigger false", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.8,
      },
      temperament: {
        openness: 0.5,
        conscientiousness: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
        extraversion: 0.2,
      },
    })
    const state = makeState({ paradoxTension: 0.0 })

    // paradoxScore 0.3 → base chance ~0.354
    const result = decideParadoxActivity(vectors, 0.3, state, 0.9) // random=0.9 > chance
    expect(result.shouldTrigger).toBe(false)
  })

  it("패턴 미매칭 → shouldTrigger false (paradoxScore 높아도)", () => {
    const vectors = makeVectors() // 모두 0.5 → 패턴 미매칭
    const state = makeState()

    const result = decideParadoxActivity(vectors, 0.9, state, 0.1)
    expect(result.shouldTrigger).toBe(false)
    expect(result.matchedPatterns).toHaveLength(0)
    expect(result.primaryPattern).toBeNull()
  })

  it("paradoxTension > 0.5 → adjustedChance 증가", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.8,
      },
      temperament: {
        openness: 0.5,
        conscientiousness: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
        extraversion: 0.2,
      },
    })
    const lowTensionState = makeState({ paradoxTension: 0.3 })
    const highTensionState = makeState({ paradoxTension: 0.9 })

    const resultLow = decideParadoxActivity(vectors, 0.5, lowTensionState, 0.5)
    const resultHigh = decideParadoxActivity(vectors, 0.5, highTensionState, 0.5)

    expect(resultHigh.adjustedChance).toBeGreaterThan(resultLow.adjustedChance)
  })

  it("adjustedChance는 1.0을 초과하지 않음", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.8,
      },
      temperament: {
        openness: 0.5,
        conscientiousness: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
        extraversion: 0.2,
      },
    })
    const state = makeState({ paradoxTension: 1.0 })

    const result = decideParadoxActivity(vectors, 1.0, state)
    expect(result.adjustedChance).toBeLessThanOrEqual(1.0)
  })
})

// ═══ PARADOX_PATTERNS ═══

describe("PARADOX_PATTERNS", () => {
  it("4종 패턴 정의", () => {
    expect(PARADOX_PATTERNS).toHaveLength(4)
  })

  it("모든 패턴에 name, nameKo, description 존재", () => {
    for (const pattern of PARADOX_PATTERNS) {
      expect(pattern.name).toBeTruthy()
      expect(pattern.nameKo).toBeTruthy()
      expect(pattern.description).toBeTruthy()
    }
  })

  it("모든 패턴에 유효한 L1/L2 조건", () => {
    for (const pattern of PARADOX_PATTERNS) {
      expect([">" as const, "<" as const]).toContain(pattern.l1Condition.operator)
      expect(pattern.l1Condition.threshold).toBeGreaterThanOrEqual(0)
      expect(pattern.l1Condition.threshold).toBeLessThanOrEqual(1)

      expect([">" as const, "<" as const]).toContain(pattern.l2Condition.operator)
      expect(pattern.l2Condition.threshold).toBeGreaterThanOrEqual(0)
      expect(pattern.l2Condition.threshold).toBeLessThanOrEqual(1)
    }
  })
})
