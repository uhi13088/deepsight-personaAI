import { describe, it, expect, vi } from "vitest"
import {
  computeL1Vector,
  computeL2Vector,
  crossValidate,
  ONBOARDING_CONFIDENCE,
} from "@/lib/persona-world/onboarding/questions"
import type {
  OnboardingQuestion,
  OnboardingQuestionsProvider,
} from "@/lib/persona-world/onboarding/questions"
import {
  processOnboardingAnswers,
  getRequiredPhases,
  computeCompleteness,
} from "@/lib/persona-world/onboarding/onboarding-engine"
import type { OnboardingDataProvider } from "@/lib/persona-world/onboarding/onboarding-engine"
import { processSnsData, extractCombinedText } from "@/lib/persona-world/onboarding/sns-processor"
import type { OnboardingAnswer, SNSExtendedData } from "@/lib/persona-world/types"

// ═══ Helper: Phase 1 질문 (L1 차원 측정) ═══

const PHASE1_QUESTIONS: OnboardingQuestion[] = [
  {
    id: "p1-q1",
    phase: 1,
    options: [
      { key: "A", l1Weights: { depth: 0.15, lens: 0.05 } },
      { key: "B", l1Weights: { depth: -0.1, sociability: 0.15 } },
      { key: "C", l1Weights: { stance: 0.15 } },
      { key: "D", l1Weights: { taste: 0.15, purpose: 0.1 } },
    ],
  },
  {
    id: "p1-q2",
    phase: 1,
    options: [
      { key: "A", l1Weights: { sociability: 0.2 } },
      { key: "B", l1Weights: { depth: 0.1, lens: 0.1 } },
      { key: "C", l1Weights: { sociability: -0.15 } },
      { key: "D", l1Weights: { scope: 0.15, taste: 0.1 } },
    ],
  },
  {
    id: "p1-q3",
    phase: 1,
    options: [
      { key: "A", l1Weights: { purpose: 0.15 } },
      { key: "B", l1Weights: { taste: 0.15 } },
      { key: "C", l1Weights: { scope: 0.15 } },
      { key: "D", l1Weights: { lens: 0.15 } },
    ],
  },
]

// ═══ Helper: Phase 2 질문 (L2 OCEAN 측정) ═══

const PHASE2_QUESTIONS: OnboardingQuestion[] = [
  {
    id: "p2-q1",
    phase: 2,
    options: [
      { key: "A", l2Weights: { openness: 0.2, extraversion: 0.1 } },
      { key: "B", l2Weights: { conscientiousness: 0.2 } },
      { key: "C", l2Weights: { neuroticism: 0.15 } },
      { key: "D", l2Weights: { agreeableness: 0.2 } },
    ],
  },
  {
    id: "p2-q2",
    phase: 2,
    options: [
      { key: "A", l2Weights: { extraversion: 0.2 } },
      { key: "B", l2Weights: { openness: -0.15, conscientiousness: 0.1 } },
      { key: "C", l2Weights: { agreeableness: -0.15 } },
      { key: "D", l2Weights: { neuroticism: -0.15 } },
    ],
  },
]

// ═══ Helper: Phase 3 질문 (교차검증) ═══

const PHASE3_QUESTIONS: OnboardingQuestion[] = [
  {
    id: "p3-q1",
    phase: 3,
    options: [
      { key: "A", l1Weights: { sociability: 0.05 }, l2Weights: { extraversion: 0.05 } },
      { key: "B", l1Weights: { sociability: -0.05 }, l2Weights: { extraversion: -0.05 } },
    ],
  },
]

// ═══ computeL1Vector ═══

describe("computeL1Vector", () => {
  it("답변에 따라 L1 벡터 산출", () => {
    const answers: OnboardingAnswer[] = [
      { questionId: "p1-q1", value: "A" }, // depth +0.15, lens +0.05
      { questionId: "p1-q2", value: "A" }, // sociability +0.2
      { questionId: "p1-q3", value: "A" }, // purpose +0.15
    ]
    const result = computeL1Vector(PHASE1_QUESTIONS, answers)

    expect(result.depth).toBe(0.65) // 0.5 + 0.15
    expect(result.lens).toBe(0.55) // 0.5 + 0.05
    expect(result.sociability).toBe(0.7) // 0.5 + 0.2
    expect(result.purpose).toBe(0.65) // 0.5 + 0.15
    // 미답변 차원은 기본값
    expect(result.stance).toBe(0.5)
    expect(result.scope).toBe(0.5)
    expect(result.taste).toBe(0.5)
  })

  it("음수 가중치 적용", () => {
    const answers: OnboardingAnswer[] = [
      { questionId: "p1-q1", value: "B" }, // depth -0.1, sociability +0.15
    ]
    const result = computeL1Vector(PHASE1_QUESTIONS, answers)

    expect(result.depth).toBe(0.4) // 0.5 - 0.1
    expect(result.sociability).toBe(0.65) // 0.5 + 0.15
  })

  it("답변 없으면 기본값(0.5) 유지", () => {
    const result = computeL1Vector(PHASE1_QUESTIONS, [])

    expect(result.depth).toBe(0.5)
    expect(result.lens).toBe(0.5)
    expect(result.sociability).toBe(0.5)
  })

  it("결과값 0~1 범위로 클램프", () => {
    // 극단적으로 높은 가중치 시뮬레이션
    const extremeQuestions: OnboardingQuestion[] = [
      {
        id: "extreme",
        phase: 1,
        options: [{ key: "A", l1Weights: { depth: 0.8 } }],
      },
    ]
    const result = computeL1Vector(extremeQuestions, [{ questionId: "extreme", value: "A" }])
    expect(result.depth).toBeLessThanOrEqual(1.0)
    expect(result.depth).toBeGreaterThanOrEqual(0)
  })
})

// ═══ computeL2Vector ═══

describe("computeL2Vector", () => {
  it("답변에 따라 L2 OCEAN 벡터 산출", () => {
    const answers: OnboardingAnswer[] = [
      { questionId: "p2-q1", value: "A" }, // openness +0.2, extraversion +0.1
      { questionId: "p2-q2", value: "A" }, // extraversion +0.2
    ]
    const result = computeL2Vector(PHASE2_QUESTIONS, answers)

    expect(result.openness).toBe(0.7) // 0.5 + 0.2
    expect(result.extraversion).toBe(0.8) // 0.5 + 0.1 + 0.2
    expect(result.conscientiousness).toBe(0.5) // 기본값
  })

  it("음수 가중치 적용 (L2)", () => {
    const answers: OnboardingAnswer[] = [
      { questionId: "p2-q2", value: "B" }, // openness -0.15, conscientiousness +0.1
    ]
    const result = computeL2Vector(PHASE2_QUESTIONS, answers)

    expect(result.openness).toBe(0.35) // 0.5 - 0.15
    expect(result.conscientiousness).toBe(0.6) // 0.5 + 0.1
  })
})

// ═══ crossValidate ═══

describe("crossValidate", () => {
  it("Phase 3 답변으로 L1/L2 보정", () => {
    const l1 = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.7,
    }
    const l2 = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.7,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }
    const answers: OnboardingAnswer[] = [
      { questionId: "p3-q1", value: "A" }, // sociability +0.05, extraversion +0.05
    ]

    const result = crossValidate(l1, l2, PHASE3_QUESTIONS, answers)

    expect(result.adjustedL1.sociability).toBe(0.75)
    expect(result.adjustedL2.extraversion).toBe(0.75)
  })

  it("Paradox 감지: sociability ↔ extraversion 갭 > 0.3", () => {
    const l1 = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.9,
    }
    const l2 = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.2,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }

    const result = crossValidate(l1, l2, [], [])

    expect(result.paradoxDetected).toBe(true)
  })

  it("일관적이면 Paradox 미감지", () => {
    const l1 = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.6,
    }
    const l2 = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.6,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }

    const result = crossValidate(l1, l2, [], [])

    expect(result.paradoxDetected).toBe(false)
  })
})

// ═══ processOnboardingAnswers ═══

describe("processOnboardingAnswers", () => {
  const makeProvider = (): OnboardingDataProvider => ({
    getQuestionsByPhase: vi.fn().mockImplementation((phase: number) => {
      switch (phase) {
        case 1:
          return Promise.resolve(PHASE1_QUESTIONS)
        case 2:
          return Promise.resolve(PHASE2_QUESTIONS)
        case 3:
          return Promise.resolve(PHASE3_QUESTIONS)
        default:
          return Promise.resolve([])
      }
    }),
    saveOnboardingResult: vi.fn().mockResolvedValue(undefined),
  })

  it("LIGHT → L1만 반환, BASIC 프로필", async () => {
    const provider = makeProvider()
    const answers: OnboardingAnswer[] = [
      { questionId: "p1-q1", value: "A" },
      { questionId: "p1-q2", value: "B" },
    ]

    const result = await processOnboardingAnswers(answers, "LIGHT", provider)

    expect(result.l1Vector).toBeDefined()
    expect(result.l2Vector).toBeUndefined()
    expect(result.profileLevel).toBe("BASIC")
    expect(result.confidence).toBe(ONBOARDING_CONFIDENCE.LIGHT)
    expect(provider.getQuestionsByPhase).toHaveBeenCalledWith(1)
    expect(provider.getQuestionsByPhase).not.toHaveBeenCalledWith(2)
  })

  it("MEDIUM → L1+L2 반환, STANDARD 프로필", async () => {
    const provider = makeProvider()
    const answers: OnboardingAnswer[] = [
      { questionId: "p1-q1", value: "A" },
      { questionId: "p2-q1", value: "A" },
    ]

    const result = await processOnboardingAnswers(answers, "MEDIUM", provider)

    expect(result.l1Vector).toBeDefined()
    expect(result.l2Vector).toBeDefined()
    expect(result.profileLevel).toBe("STANDARD")
    expect(result.confidence).toBe(ONBOARDING_CONFIDENCE.MEDIUM)
    expect(provider.getQuestionsByPhase).toHaveBeenCalledWith(1)
    expect(provider.getQuestionsByPhase).toHaveBeenCalledWith(2)
  })

  it("DEEP → L1+L2+교차검증, ADVANCED 프로필", async () => {
    const provider = makeProvider()
    const answers: OnboardingAnswer[] = [
      { questionId: "p1-q1", value: "A" },
      { questionId: "p2-q1", value: "A" },
      { questionId: "p3-q1", value: "A" },
    ]

    const result = await processOnboardingAnswers(answers, "DEEP", provider)

    expect(result.l1Vector).toBeDefined()
    expect(result.l2Vector).toBeDefined()
    expect(result.profileLevel).toBe("ADVANCED")
    expect(result.confidence).toBe(ONBOARDING_CONFIDENCE.DEEP)
    expect(provider.getQuestionsByPhase).toHaveBeenCalledWith(1)
    expect(provider.getQuestionsByPhase).toHaveBeenCalledWith(2)
    expect(provider.getQuestionsByPhase).toHaveBeenCalledWith(3)
  })
})

// ═══ getRequiredPhases ═══

describe("getRequiredPhases", () => {
  it("LIGHT → [1]", () => {
    expect(getRequiredPhases("LIGHT")).toEqual([1])
  })
  it("MEDIUM → [1, 2]", () => {
    expect(getRequiredPhases("MEDIUM")).toEqual([1, 2])
  })
  it("DEEP → [1, 2, 3]", () => {
    expect(getRequiredPhases("DEEP")).toEqual([1, 2, 3])
  })
})

// ═══ computeCompleteness ═══

describe("computeCompleteness", () => {
  it("전체 답변 시 1.0", () => {
    const questions = PHASE1_QUESTIONS
    const answers: OnboardingAnswer[] = [
      { questionId: "p1-q1", value: "A" },
      { questionId: "p1-q2", value: "B" },
      { questionId: "p1-q3", value: "C" },
    ]
    expect(computeCompleteness(questions, answers)).toBe(1)
  })

  it("부분 답변 시 비율 반환", () => {
    const questions = PHASE1_QUESTIONS
    const answers: OnboardingAnswer[] = [{ questionId: "p1-q1", value: "A" }]
    expect(computeCompleteness(questions, answers)).toBeCloseTo(1 / 3)
  })

  it("질문 없으면 0", () => {
    expect(computeCompleteness([], [])).toBe(0)
  })
})

// ═══ extractCombinedText ═══

describe("extractCombinedText", () => {
  it("SNS 데이터에서 텍스트 추출", () => {
    const snsData: SNSExtendedData[] = [
      {
        platform: "TWITTER",
        profileData: { bio: "분석과 비판이 좋아요" },
        extractedData: { recentPosts: ["논리적 구조가 인상적"] },
      },
    ]
    const text = extractCombinedText(snsData)

    expect(text).toContain("분석과 비판이 좋아요")
    expect(text).toContain("논리적 구조가 인상적")
  })

  it("다중 플랫폼 텍스트 합침", () => {
    const snsData: SNSExtendedData[] = [
      {
        platform: "TWITTER",
        profileData: { bio: "감동적" },
        extractedData: {},
      },
      {
        platform: "INSTAGRAM",
        profileData: { bio: "창의적" },
        extractedData: {},
      },
    ]
    const text = extractCombinedText(snsData)

    expect(text).toContain("감동적")
    expect(text).toContain("창의적")
  })
})

// ═══ processSnsData ═══

describe("processSnsData", () => {
  it("SNS 데이터 없으면 기본값 반환", async () => {
    const result = await processSnsData([])

    expect(result.l1Vector.depth).toBe(0.5)
    expect(result.confidence).toBe(0.5)
    expect(result.profileLevel).toBe("BASIC")
  })

  it("키워드가 포함된 SNS → 벡터 조정", async () => {
    const snsData: SNSExtendedData[] = [
      {
        platform: "TWITTER",
        profileData: { bio: "분석적 사고, 논리와 구조를 좋아합니다" },
        extractedData: { posts: ["데이터 기반 리뷰"] },
      },
    ]
    const result = await processSnsData(snsData)

    // analytical 카테고리: depth +0.05, lens +0.08
    expect(result.l1Vector.depth).toBeGreaterThan(0.5)
    expect(result.l1Vector.lens).toBeGreaterThan(0.5)
    expect(result.profileLevel).toBe("STANDARD")
  })

  it("기존 벡터 + SNS → PREMIUM", async () => {
    const existing = {
      l1: {
        depth: 0.7,
        lens: 0.6,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
      l2: {
        openness: 0.6,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
      },
    }
    const snsData: SNSExtendedData[] = [
      {
        platform: "YOUTUBE",
        profileData: { bio: "감동적인 콘텐츠" },
        extractedData: {},
      },
    ]

    const result = await processSnsData(snsData, existing)

    expect(result.profileLevel).toBe("PREMIUM")
    expect(result.confidence).toBeGreaterThan(0.6)
  })

  it("2+ 플랫폼 (기존 벡터 없음) → ADVANCED", async () => {
    const snsData: SNSExtendedData[] = [
      {
        platform: "TWITTER",
        profileData: { bio: "분석" },
        extractedData: {},
      },
      {
        platform: "INSTAGRAM",
        profileData: { bio: "창의" },
        extractedData: {},
      },
    ]

    const result = await processSnsData(snsData)

    expect(result.profileLevel).toBe("ADVANCED")
  })

  it("L2 벡터도 카테고리 기반으로 추론", async () => {
    const snsData: SNSExtendedData[] = [
      {
        platform: "TWITTER",
        profileData: { bio: "토론과 소통, 커뮤니티 대화 반응" },
        extractedData: {},
      },
    ]

    const result = await processSnsData(snsData)

    // social 카테고리: extraversion +0.08, agreeableness +0.03
    expect(result.l2Vector).toBeDefined()
    expect(result.l2Vector!.extraversion).toBeGreaterThan(0.5)
  })
})

// ═══ ONBOARDING_CONFIDENCE ═══

describe("ONBOARDING_CONFIDENCE", () => {
  it("LIGHT < MEDIUM < DEEP", () => {
    expect(ONBOARDING_CONFIDENCE.LIGHT).toBeLessThan(ONBOARDING_CONFIDENCE.MEDIUM)
    expect(ONBOARDING_CONFIDENCE.MEDIUM).toBeLessThan(ONBOARDING_CONFIDENCE.DEEP)
  })
})
