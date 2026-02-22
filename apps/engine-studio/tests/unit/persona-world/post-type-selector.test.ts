import { describe, it, expect } from "vitest"
import type { ThreeLayerVector } from "@/types/persona-v3"
import {
  computeAffinityScore,
  applyStateModifiers,
  weightedRandomSelect,
  selectPostType,
} from "@/lib/persona-world/post-type-selector"
import type { PersonaStateData, PostTypeAffinity } from "@/lib/persona-world/types"
import type { PersonaPostType } from "@/generated/prisma"

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

// ═══ computeAffinityScore ═══

describe("computeAffinityScore", () => {
  it("조건 충족 시 벡터값 × weight 합산", () => {
    const affinity: PostTypeAffinity = {
      type: "REVIEW" as PersonaPostType,
      conditions: [{ layer: "L1", dimension: "depth", operator: ">", threshold: 0.6, weight: 1.0 }],
    }
    const vectors = makeVectors({
      social: {
        depth: 0.8,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
    })
    const state = makeState()

    const score = computeAffinityScore(affinity, vectors, 0.5, state)
    expect(score).toBeCloseTo(0.8, 2) // 0.8 × 1.0 = 0.8
  })

  it("조건 미충족 시 0점", () => {
    const affinity: PostTypeAffinity = {
      type: "REVIEW" as PersonaPostType,
      conditions: [{ layer: "L1", dimension: "depth", operator: ">", threshold: 0.6, weight: 1.0 }],
    }
    const vectors = makeVectors({
      social: {
        depth: 0.3,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
    })
    const state = makeState()

    const score = computeAffinityScore(affinity, vectors, 0.5, state)
    expect(score).toBe(0)
  })

  it("복수 조건 충족 시 합산", () => {
    const affinity: PostTypeAffinity = {
      type: "DEBATE" as PersonaPostType,
      conditions: [
        { layer: "L1", dimension: "stance", operator: ">", threshold: 0.7, weight: 0.6 },
        { layer: "L1", dimension: "depth", operator: ">", threshold: 0.7, weight: 0.4 },
      ],
    }
    const vectors = makeVectors({
      social: {
        depth: 0.8,
        lens: 0.5,
        stance: 0.9,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
    })
    const state = makeState()

    const score = computeAffinityScore(affinity, vectors, 0.5, state)
    // stance 0.9 × 0.6 + depth 0.8 × 0.4 = 0.54 + 0.32 = 0.86
    expect(score).toBeCloseTo(0.86, 2)
  })

  it("paradox 레이어 — paradoxScore 참조", () => {
    const affinity: PostTypeAffinity = {
      type: "VS_BATTLE" as PersonaPostType,
      conditions: [
        { layer: "paradox", dimension: "paradoxScore", operator: ">", threshold: 0.5, weight: 0.4 },
      ],
    }
    const vectors = makeVectors()
    const state = makeState()

    const score = computeAffinityScore(affinity, vectors, 0.7, state)
    expect(score).toBeCloseTo(0.7 * 0.4, 2) // 0.28
  })

  it("paradox 레이어 — paradoxTension 참조", () => {
    const affinity: PostTypeAffinity = {
      type: "THOUGHT" as PersonaPostType,
      conditions: [
        {
          layer: "paradox",
          dimension: "paradoxTension",
          operator: ">",
          threshold: 0.5,
          weight: 0.4,
        },
      ],
    }
    const vectors = makeVectors()
    const state = makeState({ paradoxTension: 0.8 })

    const score = computeAffinityScore(affinity, vectors, 0.5, state)
    expect(score).toBeCloseTo(0.8 * 0.4, 2) // 0.32
  })

  it("< 연산자 정상 동작", () => {
    const affinity: PostTypeAffinity = {
      type: "THOUGHT" as PersonaPostType,
      conditions: [{ layer: "L1", dimension: "depth", operator: "<", threshold: 0.4, weight: 1.0 }],
    }
    const vectors = makeVectors({
      social: {
        depth: 0.2,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
    })
    const state = makeState()

    const score = computeAffinityScore(affinity, vectors, 0.5, state)
    expect(score).toBeCloseTo(0.2, 2) // 0.2 < 0.4 → 0.2 × 1.0
  })
})

// ═══ applyStateModifiers ═══

describe("applyStateModifiers", () => {
  it("mood < 0.4 → THOUGHT, BEHIND_STORY ×2", () => {
    const scores = { THOUGHT: 0.5, BEHIND_STORY: 0.3, REVIEW: 0.4 }
    const state = makeState({ mood: 0.3 })

    const modified = applyStateModifiers(scores, state)
    expect(modified.THOUGHT).toBeCloseTo(1.0, 2)
    expect(modified.BEHIND_STORY).toBeCloseTo(0.6, 2)
    expect(modified.REVIEW).toBeCloseTo(0.4, 2) // 변경 없음
  })

  it("paradoxTension > 0.7 → BEHIND_STORY, THOUGHT ×3", () => {
    const scores = { THOUGHT: 0.5, BEHIND_STORY: 0.3, REVIEW: 0.4 }
    const state = makeState({ paradoxTension: 0.8 })

    const modified = applyStateModifiers(scores, state)
    expect(modified.THOUGHT).toBeCloseTo(1.5, 2) // 0.5 × 3
    expect(modified.BEHIND_STORY).toBeCloseTo(0.9, 2) // 0.3 × 3
    expect(modified.REVIEW).toBeCloseTo(0.4, 2)
  })

  it("energy < 0.3 → REACTION, RECOMMENDATION ×2", () => {
    const scores = { REACTION: 0.5, RECOMMENDATION: 0.3, REVIEW: 0.4 }
    const state = makeState({ energy: 0.2 })

    const modified = applyStateModifiers(scores, state)
    expect(modified.REACTION).toBeCloseTo(1.0, 2)
    expect(modified.RECOMMENDATION).toBeCloseTo(0.6, 2)
    expect(modified.REVIEW).toBeCloseTo(0.4, 2)
  })

  it("복수 조건 동시 적용 (mood 낮음 + paradoxTension 높음)", () => {
    const scores = { THOUGHT: 0.5, BEHIND_STORY: 0.3 }
    const state = makeState({ mood: 0.3, paradoxTension: 0.8 })

    const modified = applyStateModifiers(scores, state)
    // THOUGHT: 0.5 × 2 (mood) × 3 (paradox) = 3.0
    expect(modified.THOUGHT).toBeCloseTo(3.0, 2)
    // BEHIND_STORY: 0.3 × 2 (mood) × 3 (paradox) = 1.8
    expect(modified.BEHIND_STORY).toBeCloseTo(1.8, 2)
  })

  it("임계값 미달 시 보정 없음", () => {
    const scores = { THOUGHT: 0.5, REACTION: 0.3 }
    const state = makeState({ mood: 0.5, energy: 0.5, paradoxTension: 0.3 })

    const modified = applyStateModifiers(scores, state)
    expect(modified.THOUGHT).toBeCloseTo(0.5, 2)
    expect(modified.REACTION).toBeCloseTo(0.3, 2)
  })
})

// ═══ weightedRandomSelect ═══

describe("weightedRandomSelect", () => {
  it("가중 랜덤 — random=0 → 첫 항목", () => {
    const entries = [
      { type: "REVIEW" as PersonaPostType, score: 0.5 },
      { type: "DEBATE" as PersonaPostType, score: 0.5 },
    ]

    const result = weightedRandomSelect(entries, 0)
    expect(result).not.toBeNull()
    expect(result!.type).toBe("REVIEW")
    expect(result!.probability).toBeCloseTo(0.5, 2)
  })

  it("가중 랜덤 — random=0.99 → 마지막 항목", () => {
    const entries = [
      { type: "REVIEW" as PersonaPostType, score: 0.3 },
      { type: "DEBATE" as PersonaPostType, score: 0.7 },
    ]

    const result = weightedRandomSelect(entries, 0.99)
    expect(result!.type).toBe("DEBATE")
  })

  it("모든 점수가 0이면 null 반환", () => {
    const entries = [
      { type: "REVIEW" as PersonaPostType, score: 0 },
      { type: "DEBATE" as PersonaPostType, score: 0 },
    ]

    const result = weightedRandomSelect(entries, 0.5)
    expect(result).toBeNull()
  })

  it("단일 항목 — 확률 1.0", () => {
    const entries = [{ type: "THOUGHT" as PersonaPostType, score: 1.0 }]

    const result = weightedRandomSelect(entries, 0.5)
    expect(result!.type).toBe("THOUGHT")
    expect(result!.probability).toBeCloseTo(1.0, 2)
  })
})

// ═══ selectPostType ═══

describe("selectPostType", () => {
  it("depth 높은 벡터 → REVIEW 친화도 높음", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.8,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
    })
    const state = makeState()

    const result = selectPostType(vectors, 0.5, state)
    expect(result.scores.REVIEW).toBeGreaterThan(0)
    expect(result.selectedType).toBeDefined()
    expect(result.reason).toContain("→ selected")
  })

  it("후보 없으면 fallback THOUGHT", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.0,
        lens: 0.0,
        stance: 0.0,
        scope: 0.0,
        taste: 0.0,
        purpose: 0.0,
        sociability: 0.0,
      },
      temperament: {
        openness: 0.0,
        conscientiousness: 0.0,
        extraversion: 0.0,
        agreeableness: 0.0,
        neuroticism: 0.0,
      },
      narrative: { lack: 0.0, moralCompass: 0.0, volatility: 0.0, growthArc: 0.0 },
    })
    const state = makeState({ paradoxTension: 0.0 })

    const result = selectPostType(vectors, 0.0, state)
    expect(result.selectedType).toBe("THOUGHT")
    expect(result.reason).toContain("fallback")
  })

  it("stateModifiers 기록 — mood 낮으면 THOUGHT 보정 기록", () => {
    const vectors = makeVectors({
      temperament: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.8,
      },
    })
    const state = makeState({ mood: 0.3, paradoxTension: 0.6 })

    const result = selectPostType(vectors, 0.5, state)
    // THOUGHT는 neuroticism > 0.5 조건으로 점수 > 0
    // mood < 0.4 보정이 적용되어야 함
    if (result.scores.THOUGHT > 0) {
      expect(result.stateModifiers.THOUGHT).toBeDefined()
      expect(result.stateModifiers.THOUGHT).toBeGreaterThanOrEqual(2.0)
    }
  })

  it("random 값으로 결정적 선택 가능", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.8,
        lens: 0.8,
        stance: 0.8,
        scope: 0.8,
        taste: 0.8,
        purpose: 0.8,
        sociability: 0.8,
      },
      temperament: {
        openness: 0.8,
        conscientiousness: 0.8,
        extraversion: 0.8,
        agreeableness: 0.8,
        neuroticism: 0.8,
      },
      narrative: { lack: 0.8, moralCompass: 0.8, volatility: 0.8, growthArc: 0.8 },
    })
    const state = makeState()

    // 동일 random → 동일 결과
    const result1 = selectPostType(vectors, 0.5, state, undefined, 0.1)
    const result2 = selectPostType(vectors, 0.5, state, undefined, 0.1)
    expect(result1.selectedType).toBe(result2.selectedType)
  })

  it("커스텀 affinities 지원", () => {
    const customAffinities: PostTypeAffinity[] = [
      {
        type: "MEME" as PersonaPostType,
        conditions: [
          { layer: "L1", dimension: "taste", operator: ">", threshold: 0.5, weight: 1.0 },
        ],
      },
    ]
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.9,
        purpose: 0.5,
        sociability: 0.5,
      },
    })
    const state = makeState()

    const result = selectPostType(vectors, 0.5, state, customAffinities, 0.5)
    expect(result.selectedType).toBe("MEME")
  })
})
