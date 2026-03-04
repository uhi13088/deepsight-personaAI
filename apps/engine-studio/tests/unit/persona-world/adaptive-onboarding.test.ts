import { describe, it, expect } from "vitest"
import {
  computeDimensionUncertainty,
  computeAverageUncertainty,
  getTopUncertainDimensions,
  computeQuestionInfoGain,
  DEFAULT_TERMINATION_CONFIG,
} from "@deepsight/vector-core"
import type {
  UncertaintyProfile,
  AdaptiveQuestionMeta,
  AdaptiveSession,
} from "@deepsight/vector-core"
import type { OnboardingQuestion } from "@deepsight/vector-core"
import {
  createAdaptiveSession,
  processAdaptiveAnswer,
  selectNextQuestion,
  checkTermination,
  buildAdaptiveProgress,
  buildAdaptiveResult,
} from "@/lib/persona-world/onboarding/adaptive-engine"
import type { AdaptivePoolQuestion } from "@/lib/persona-world/onboarding/adaptive-engine"

// ═══════════════════════════════════════════════════════════════
// §1. 불확실도 계산 (vector-core)
// ═══════════════════════════════════════════════════════════════

describe("computeDimensionUncertainty", () => {
  it("value=0.5(중립)일 때 불확실도가 높아야 한다", () => {
    const u = computeDimensionUncertainty(0.5, 0)
    expect(u).toBe(1.0) // baseUncertainty=1.0, decay=1.0
  })

  it("value=0.0(극단)일 때 불확실도가 낮아야 한다", () => {
    const u = computeDimensionUncertainty(0.0, 0)
    expect(u).toBe(0.0) // |0.0 - 0.5| * 2 = 1.0 → base = 0.0
  })

  it("value=1.0(극단)일 때 불확실도가 낮아야 한다", () => {
    const u = computeDimensionUncertainty(1.0, 0)
    expect(u).toBe(0.0)
  })

  it("측정 횟수가 늘어날수록 불확실도가 감소해야 한다", () => {
    const u0 = computeDimensionUncertainty(0.5, 0) // 1.0
    const u1 = computeDimensionUncertainty(0.5, 1) // 1.0 * (1/1.4) ≈ 0.71
    const u3 = computeDimensionUncertainty(0.5, 3) // 1.0 * (1/2.2) ≈ 0.45
    expect(u0).toBeGreaterThan(u1)
    expect(u1).toBeGreaterThan(u3)
  })

  it("결과는 0~1 범위이고 소수점 둘째자리까지", () => {
    const u = computeDimensionUncertainty(0.65, 2)
    expect(u).toBeGreaterThanOrEqual(0)
    expect(u).toBeLessThanOrEqual(1)
    expect(String(u).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(2)
  })
})

// ═══════════════════════════════════════════════════════════════
// §2. 평균 불확실도
// ═══════════════════════════════════════════════════════════════

describe("computeAverageUncertainty", () => {
  const makeProfile = (uncertainty: number): UncertaintyProfile => ({
    l1: {
      depth: { value: 0.5, measurementCount: 0, uncertainty },
      lens: { value: 0.5, measurementCount: 0, uncertainty },
      stance: { value: 0.5, measurementCount: 0, uncertainty },
      scope: { value: 0.5, measurementCount: 0, uncertainty },
      taste: { value: 0.5, measurementCount: 0, uncertainty },
      purpose: { value: 0.5, measurementCount: 0, uncertainty },
      sociability: { value: 0.5, measurementCount: 0, uncertainty },
    },
    l2: {
      openness: { value: 0.5, measurementCount: 0, uncertainty },
      conscientiousness: { value: 0.5, measurementCount: 0, uncertainty },
      extraversion: { value: 0.5, measurementCount: 0, uncertainty },
      agreeableness: { value: 0.5, measurementCount: 0, uncertainty },
      neuroticism: { value: 0.5, measurementCount: 0, uncertainty },
    },
    l3: {
      lack: { value: 0.5, measurementCount: 0, uncertainty },
      moralCompass: { value: 0.5, measurementCount: 0, uncertainty },
      volatility: { value: 0.5, measurementCount: 0, uncertainty },
      growthArc: { value: 0.5, measurementCount: 0, uncertainty },
    },
  })

  it("모든 차원의 불확실도가 같을 때 평균은 그 값이어야 한다", () => {
    const avg = computeAverageUncertainty(makeProfile(0.8))
    expect(avg).toBe(0.8)
  })

  it("모든 차원의 불확실도가 0이면 평균도 0", () => {
    expect(computeAverageUncertainty(makeProfile(0))).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// §3. 상위 불확실 차원 선택
// ═══════════════════════════════════════════════════════════════

describe("getTopUncertainDimensions", () => {
  it("불확실도가 높은 차원을 우선 반환해야 한다", () => {
    const profile: UncertaintyProfile = {
      l1: {
        depth: { value: 0.5, measurementCount: 0, uncertainty: 0.9 },
        lens: { value: 0.7, measurementCount: 2, uncertainty: 0.2 },
        stance: { value: 0.5, measurementCount: 0, uncertainty: 0.8 },
        scope: { value: 0.5, measurementCount: 1, uncertainty: 0.6 },
        taste: { value: 0.5, measurementCount: 0, uncertainty: 0.7 },
        purpose: { value: 0.5, measurementCount: 1, uncertainty: 0.4 },
        sociability: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
      },
      l2: {
        openness: { value: 0.5, measurementCount: 0, uncertainty: 0.3 },
        conscientiousness: { value: 0.5, measurementCount: 0, uncertainty: 0.3 },
        extraversion: { value: 0.5, measurementCount: 0, uncertainty: 0.3 },
        agreeableness: { value: 0.5, measurementCount: 0, uncertainty: 0.3 },
        neuroticism: { value: 0.5, measurementCount: 0, uncertainty: 0.3 },
      },
      l3: {
        lack: { value: 0.5, measurementCount: 0, uncertainty: 0.3 },
        moralCompass: { value: 0.5, measurementCount: 0, uncertainty: 0.3 },
        volatility: { value: 0.5, measurementCount: 0, uncertainty: 0.3 },
        growthArc: { value: 0.5, measurementCount: 0, uncertainty: 0.3 },
      },
    }

    const top3 = getTopUncertainDimensions(profile, 3)
    expect(top3).toHaveLength(3)
    expect(top3[0].dimension).toBe("depth")
    expect(top3[0].uncertainty).toBe(0.9)
    expect(top3[1].dimension).toBe("stance")
    expect(top3[2].dimension).toBe("taste")
  })

  it("요청 N보다 차원이 적으면 가능한 만큼만 반환", () => {
    const profile: UncertaintyProfile = {
      l1: {
        depth: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        lens: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        stance: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        scope: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        taste: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        purpose: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        sociability: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
      },
      l2: {
        openness: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        conscientiousness: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        extraversion: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        agreeableness: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        neuroticism: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
      },
      l3: {
        lack: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        moralCompass: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        volatility: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
        growthArc: { value: 0.5, measurementCount: 0, uncertainty: 0.5 },
      },
    }
    const top = getTopUncertainDimensions(profile, 100)
    expect(top).toHaveLength(16) // 7+5+4 = 16 dimensions
  })
})

// ═══════════════════════════════════════════════════════════════
// §4. 적응형 엔진 (adaptive-engine.ts)
// ═══════════════════════════════════════════════════════════════

describe("createAdaptiveSession", () => {
  it("초기 세션은 0.5 기반 벡터와 불확실도를 가져야 한다", () => {
    const session = createAdaptiveSession("session-1", "user-1")

    expect(session.userId).toBe("user-1")
    expect(session.questionCount).toBe(0)
    expect(session.answeredQuestionIds).toHaveLength(0)
    expect(session.status).toBe("active")

    // L1 벡터 기본값 0.5
    expect(session.currentL1.depth).toBe(0.5)
    expect(session.currentL1.sociability).toBe(0.5)

    // L2 벡터 기본값 0.5
    expect(session.currentL2.openness).toBe(0.5)

    // L3 벡터 기본값 0.5
    expect(session.currentL3.lack).toBe(0.5)

    // 불확실도 — 초기에 1.0 (value=0.5, count=0)
    expect(session.uncertainty.l1.depth.uncertainty).toBe(1.0)
    expect(session.uncertainty.l2.openness.uncertainty).toBe(1.0)
    expect(session.uncertainty.l3.lack.uncertainty).toBe(1.0)
  })
})

describe("processAdaptiveAnswer", () => {
  it("답변 후 벡터와 불확실도가 업데이트되어야 한다", () => {
    const session = createAdaptiveSession("session-1", "user-1")

    const question: OnboardingQuestion = {
      id: "q1",
      phase: 1,
      options: [
        { key: "A", l1Weights: { depth: 0.15 } },
        { key: "B", l1Weights: { depth: -0.1 } },
        { key: "C", l1Weights: { stance: 0.15 } },
        { key: "D", l1Weights: { taste: 0.1 } },
      ],
    }

    const answer = { questionId: "q1", value: "A" as string | number | string[] }
    const updated = processAdaptiveAnswer(session, question, answer)

    expect(updated.questionCount).toBe(1)
    expect(updated.answeredQuestionIds).toContain("q1")
    // depth가 0.5 + 0.15 = 0.65로 이동
    expect(updated.currentL1.depth).toBe(0.65)
    // depth 불확실도가 초기보다 낮아져야 함
    expect(updated.uncertainty.l1.depth.uncertainty).toBeLessThan(1.0)
    expect(updated.uncertainty.l1.depth.measurementCount).toBe(1)
  })
})

describe("checkTermination", () => {
  it("minQuestions 미만이면 종료 불가", () => {
    const session = createAdaptiveSession("session-1", "user-1")
    // 19문항 답변한 상태 시뮬레이션
    const modified = { ...session, questionCount: 19 }

    const result = checkTermination(modified)
    expect(result.shouldTerminate).toBe(false)
    expect(result.reason).toBe("not_ready")
  })

  it("maxQuestions에 도달하면 종료", () => {
    const session = createAdaptiveSession("session-1", "user-1")
    const modified = { ...session, questionCount: 28 }

    const result = checkTermination(modified)
    expect(result.shouldTerminate).toBe(true)
    expect(result.reason).toBe("max_reached")
  })
})

describe("buildAdaptiveProgress", () => {
  it("진행 현황이 올바른 형태여야 한다", () => {
    const session = createAdaptiveSession("session-1", "user-1")
    const progress = buildAdaptiveProgress(session)

    expect(progress.answered).toBe(0)
    expect(progress.estimatedTotal).toBeGreaterThanOrEqual(20)
    expect(progress.estimatedTotal).toBeLessThanOrEqual(28)
    expect(progress.convergencePercent).toBeGreaterThanOrEqual(0)
    expect(progress.convergencePercent).toBeLessThanOrEqual(100)
    expect(Array.isArray(progress.uncertainDimensions)).toBe(true)
  })
})

describe("buildAdaptiveResult", () => {
  it("완료된 세션에서 결과를 생성해야 한다", () => {
    const session = createAdaptiveSession("session-1", "user-1")
    const completed = {
      ...session,
      status: "completed" as const,
      questionCount: 22,
    }

    const result = buildAdaptiveResult(completed)

    expect(result.totalQuestions).toBe(22)
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
    expect(result.l1Vector).toBeDefined()
    expect(result.l2Vector).toBeDefined()
    expect(result.l3Vector).toBeDefined()
    expect(result.uncertaintySummary).toHaveLength(16) // 7+5+4
    expect(["BASIC", "STANDARD", "ADVANCED"]).toContain(result.profileLevel)
  })
})

// ═══════════════════════════════════════════════════════════════
// §5. 종료 조건 기본 설정
// ═══════════════════════════════════════════════════════════════

describe("DEFAULT_TERMINATION_CONFIG", () => {
  it("20~28문항 범위여야 한다", () => {
    expect(DEFAULT_TERMINATION_CONFIG.minQuestions).toBe(20)
    expect(DEFAULT_TERMINATION_CONFIG.maxQuestions).toBe(28)
  })

  it("수렴 임계값이 0.35여야 한다", () => {
    expect(DEFAULT_TERMINATION_CONFIG.convergenceThreshold).toBe(0.35)
  })
})

// ═══════════════════════════════════════════════════════════════
// §6. selectNextQuestion 기본 동작
// ═══════════════════════════════════════════════════════════════

describe("selectNextQuestion", () => {
  const makePoolQuestion = (
    id: string,
    category: "core" | "deepening" | "cross_layer" | "verification" | "narrative",
    l1WeightKey?: string
  ): AdaptivePoolQuestion => ({
    question: {
      id,
      phase: 1,
      options: [
        { key: "A", l1Weights: l1WeightKey ? { [l1WeightKey]: 0.15 } : {} },
        { key: "B", l1Weights: l1WeightKey ? { [l1WeightKey]: -0.1 } : {} },
      ],
    },
    meta: {
      isAdaptive: true,
      poolCategory: category,
      informationGain: 0.6,
      targetDimensions: l1WeightKey ? [l1WeightKey] : [],
      minPriorAnswers: 0,
    },
    text: `Question ${id}`,
    type: "MULTIPLE_CHOICE",
    optionLabels: { A: "Option A", B: "Option B" },
  })

  it("이미 답변한 질문은 제외해야 한다", () => {
    const session = createAdaptiveSession("session-1", "user-1")
    const modified = {
      ...session,
      answeredQuestionIds: ["q1"],
    }

    const pool = [makePoolQuestion("q1", "core", "depth"), makePoolQuestion("q2", "core", "lens")]

    const next = selectNextQuestion(modified, pool)
    expect(next).not.toBeNull()
    expect(next!.question.id).toBe("q2")
  })

  it("초기(0~8)에는 core 카테고리를 우선해야 한다", () => {
    const session = createAdaptiveSession("session-1", "user-1")

    const pool = [
      makePoolQuestion("q-deep", "deepening", "depth"),
      makePoolQuestion("q-core", "core", "depth"),
    ]

    const next = selectNextQuestion(session, pool)
    expect(next).not.toBeNull()
    expect(next!.question.id).toBe("q-core")
  })
})
