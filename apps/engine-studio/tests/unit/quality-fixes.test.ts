// ═══════════════════════════════════════════════════════════════
// 페르소나 품질 개선 테스트 (T216~T221)
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import type { SocialPersonaVector, CoreTemperamentVector, SocialDimension } from "@/types"

// ── T216: API 벡터 누적 포화 ────────────────────────────────

import { computeVectorsFromApiResponses, clamp } from "@deepsight/vector-core"
import type { OnboardingApiResponse } from "@deepsight/vector-core"

describe("T216: API 벡터 누적 포화 수정", () => {
  it("30개 동일 방향 응답에서도 벡터가 포화되지 않음", () => {
    const responses: OnboardingApiResponse[] = Array.from({ length: 30 }, (_, i) => ({
      questionId: `q_${i}`,
      answer: "A",
      l1_weights: { depth: 0.08, lens: 0.05 },
      l2_weights: { openness: 0.06 },
    }))

    const result = computeVectorsFromApiResponses(responses)

    // 30개 응답 각각 depth +0.08 → 평균 delta = 0.08
    // 결과 = clamp(0.5 + 0.08) = 0.58 (포화 없음)
    expect(result.l1.depth).toBeGreaterThan(0.5)
    expect(result.l1.depth).toBeLessThan(1.0)
    expect(result.l1.depth).toBeCloseTo(0.58, 1)
  })

  it("응답 수가 적으면 정상 범위 유지", () => {
    const responses: OnboardingApiResponse[] = [
      { questionId: "q1", answer: "A", l1_weights: { depth: 0.3 } },
      { questionId: "q2", answer: "B", l1_weights: { depth: 0.2 } },
    ]

    const result = computeVectorsFromApiResponses(responses)
    // 평균 delta = (0.3 + 0.2) / 2 = 0.25 → 0.5 + 0.25 = 0.75
    expect(result.l1.depth).toBeCloseTo(0.75, 1)
  })

  it("L2도 응답 수로 정규화됨", () => {
    const responses: OnboardingApiResponse[] = Array.from({ length: 20 }, () => ({
      questionId: "q",
      answer: "A",
      l2_weights: { openness: 0.1 },
    }))

    const result = computeVectorsFromApiResponses(responses)
    expect(result.l2).not.toBeNull()
    // 평균 delta = 0.1 → 0.5 + 0.1 = 0.6
    expect(result.l2!.openness).toBeCloseTo(0.6, 1)
    expect(result.l2!.openness).toBeLessThan(1.0)
  })
})

// ── T217: Cold-Start confidence 정규화 ──────────────────────

import { inferVectorsFromAnswers } from "@/lib/user-insight/cold-start"
import type { ColdStartQuestion } from "@/lib/user-insight/cold-start"

describe("T217: Cold-Start confidence 독립 관측 기반", () => {
  const makeQuestion = (
    id: string,
    targetDimensions: string[],
    l1Weights: Record<string, number>,
    l2Weights: Record<string, number> = {}
  ): ColdStartQuestion => ({
    id,
    text: `Question ${id}`,
    type: "forced_choice",
    targetDimensions,
    targetLayers: ["L1"],
    options: [
      { id: `${id}_a`, text: "A", l1Weights, l2Weights },
      { id: `${id}_b`, text: "B", l1Weights: {}, l2Weights: {} },
    ],
    mode: "standard",
    order: 0,
  })

  it("복합질문의 confidence는 targetDimensions 기반으로 계산", () => {
    // 질문 1: depth만 타겟하지만 l1Weights에 depth + lens + taste 모두 있음
    const q1 = makeQuestion("q1", ["depth"], { depth: 0.2, lens: 0.1, taste: 0.15 })
    // 질문 2: depth만 타겟
    const q2 = makeQuestion("q2", ["depth"], { depth: 0.15 })

    const answers = [
      { questionId: "q1", selectedOptionId: "q1_a" },
      { questionId: "q2", selectedOptionId: "q2_a" },
    ]

    const result = inferVectorsFromAnswers([q1, q2], answers)

    // depth: 2개 질문이 직접 타겟 → confidence = min(2/8, 1) = 0.25
    expect(result.confidence.depth).toBeCloseTo(0.25, 2)

    // lens: 0개 질문이 직접 타겟 (l1Weights에만 있고 targetDimensions에 없음)
    expect(result.confidence.lens).toBe(0)

    // taste: 0개 질문이 직접 타겟
    expect(result.confidence.taste).toBe(0)
  })

  it("8문항 타겟이면 confidence 1.0", () => {
    const questions = Array.from({ length: 8 }, (_, i) =>
      makeQuestion(`q${i}`, ["depth"], { depth: 0.1 })
    )
    const answers = questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: `${q.id}_a`,
    }))

    const result = inferVectorsFromAnswers(questions, answers)
    expect(result.confidence.depth).toBe(1)
  })
})

// ── T218: 3-Tier 매칭 스코어 [0,1] 범위 보장 ────────────────

import {
  calculateBasicScore,
  calculateAdvancedScore,
  calculateExplorationScore,
} from "@/lib/matching/three-tier-engine"

import { makeCrossAxisProfile, makeParadoxProfile } from "./matching/fixtures"

describe("T218: 3-Tier 스코어 [0,1] 범위 보장", () => {
  const cap = makeCrossAxisProfile()
  const eps = makeParadoxProfile()
  const vFinal = [0.7, 0.8, 0.6, 0.7, 0.4, 0.6, 0.3]

  it("Basic 스코어가 [0, 1] 범위 내", () => {
    const { score } = calculateBasicScore(vFinal, vFinal, cap, cap, eps, eps)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it("Advanced 스코어가 [0, 1] 범위 내", () => {
    const { score } = calculateAdvancedScore(vFinal, vFinal, cap, cap, eps, eps)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it("Exploration 스코어가 [0, 1] 범위 내", () => {
    const { score } = calculateExplorationScore(cap, cap, eps, eps, [], "p1")
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })
})

// ── T219: 장르 가중치 중심 기준 스케일링 ─────────────────────

import { applyGenreWeights, DEFAULT_GENRE_WEIGHTS } from "@/lib/matching/tuning"

describe("T219: 장르 가중치 중심 기준 스케일링", () => {
  it("중립값(0.5)에 가중치 적용하면 변하지 않음", () => {
    const neutral = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
    const result = applyGenreWeights(neutral, "documentary", DEFAULT_GENRE_WEIGHTS)
    // 0.5 + (0.5 - 0.5) * weight = 0.5 (모든 weight에 대해)
    for (const v of result) {
      expect(v).toBeCloseTo(0.5, 2)
    }
  })

  it("대칭성: 0.5 기준으로 동일 폭 변화", () => {
    const high = [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8]
    const low = [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2]

    const resultHigh = applyGenreWeights(high, "documentary", DEFAULT_GENRE_WEIGHTS)
    const resultLow = applyGenreWeights(low, "documentary", DEFAULT_GENRE_WEIGHTS)

    // 0.5 + (0.8 - 0.5) * w 와 0.5 + (0.2 - 0.5) * w 의 거리가 0.5로부터 대칭
    for (let i = 0; i < 7; i++) {
      const deviationHigh = Math.abs(resultHigh[i] - 0.5)
      const deviationLow = Math.abs(resultLow[i] - 0.5)
      expect(deviationHigh).toBeCloseTo(deviationLow, 2)
    }
  })

  it("고차원 값도 포화되지 않음 (weight=1.3, v=0.8)", () => {
    // Before fix: 0.8 * 1.3 = 1.04 → clamped to 1.0 (정보 손실)
    // After fix: 0.5 + (0.8 - 0.5) * 1.3 = 0.5 + 0.39 = 0.89 (보존)
    const vector = [0.8, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] // depth=0.8
    const result = applyGenreWeights(vector, "documentary", DEFAULT_GENRE_WEIGHTS)
    // documentary.depth = 1.3
    expect(result[0]).toBeCloseTo(0.89, 1)
    expect(result[0]).toBeLessThan(1.0)
  })
})

// ── T220: Balancer 아키타입 분류 로직 개선 ───────────────────

import { classifyUser, euclideanDistance, BASE_ARCHETYPES } from "@/lib/user-insight/user-archetype"

describe("T220: Balancer 분류 로직 개선", () => {
  it("균형 벡터가 Balancer로 분류 가능", () => {
    const balanced: SocialPersonaVector = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const result = classifyUser(balanced)
    expect(result.primaryArchetype.archetypeId).toBe("balancer")
  })

  it("균형 범위지만 특정 아키타입에 가까우면 그 아키타입으로 분류", () => {
    // depth=0.65, lens=0.65는 0.35~0.65 범위 내 → 밸런서 후보
    // 하지만 Analyst의 referenceVector에 더 가까움
    const analystLike: SocialPersonaVector = {
      depth: 0.65,
      lens: 0.65,
      stance: 0.55,
      scope: 0.65,
      taste: 0.45,
      purpose: 0.55,
      sociability: 0.4,
    }
    const result = classifyUser(analystLike)
    // Balancer가 강제 distance=0.1으로 항상 우선하는 버그가 수정됨
    // 실제 거리 기반으로 Analyst에 더 가까우면 Analyst로 분류
    const analystArchetype = BASE_ARCHETYPES.find((a) => a.id === "analyst")!
    const balancerArchetype = BASE_ARCHETYPES.find((a) => a.id === "balancer")!
    const distToAnalyst = euclideanDistance(
      analystLike as Record<SocialDimension, number>,
      analystArchetype.referenceVector
    )
    const distToBalancer = euclideanDistance(
      analystLike as Record<SocialDimension, number>,
      balancerArchetype.referenceVector
    )

    // Analyst에 더 가까우면 Analyst로 분류되어야 함
    if (distToAnalyst < distToBalancer * 0.7) {
      expect(result.primaryArchetype.archetypeId).not.toBe("balancer")
    }
  })
})

// ── T221: Psychometric↔Projection 매핑 정합성 ───────────────

import { OCEAN_L1_MAPPINGS, predictL1FromL2 } from "@/lib/user-insight/psychometric"

describe("T221: Psychometric↔Projection 매핑 정합성", () => {
  it("neuroticism이 lens에 영향을 줌 (inverse)", () => {
    const neuroticismMapping = OCEAN_L1_MAPPINGS.find((m) => m.l2Dimension === "neuroticism")!
    const lensCorr = neuroticismMapping.l1Correlations.find((c) => c.dimension === "lens")
    expect(lensCorr).toBeDefined()
    expect(lensCorr!.coefficient).toBeLessThan(0) // inverse 관계
  })

  it("conscientiousness가 purpose에 영향을 줌 (aligned)", () => {
    const conscientiousnessMapping = OCEAN_L1_MAPPINGS.find(
      (m) => m.l2Dimension === "conscientiousness"
    )!
    const purposeCorr = conscientiousnessMapping.l1Correlations.find(
      (c) => c.dimension === "purpose"
    )
    expect(purposeCorr).toBeDefined()
    expect(purposeCorr!.coefficient).toBeGreaterThan(0)
  })

  it("predictL1FromL2가 lens 차원을 반환", () => {
    const l2: CoreTemperamentVector = {
      openness: 0.7,
      conscientiousness: 0.6,
      extraversion: 0.5,
      agreeableness: 0.4,
      neuroticism: 0.8,
    }
    const predicted = predictL1FromL2(l2)
    // neuroticism=0.8이면 lens는 inverse이므로 낮아야 함
    expect(predicted.lens).toBeDefined()
    expect(predicted.lens!).toBeLessThan(0.5)
  })

  it("5개 L2 차원 모두 매핑 존재", () => {
    const l2Dims = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
    for (const dim of l2Dims) {
      const mapping = OCEAN_L1_MAPPINGS.find((m) => m.l2Dimension === dim)
      expect(mapping).toBeDefined()
      expect(mapping!.l1Correlations.length).toBeGreaterThan(0)
    }
  })
})
