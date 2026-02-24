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

    const result = await processOnboardingAnswers(answers, "QUICK", provider)

    expect(result.l1Vector).toBeDefined()
    expect(result.l2Vector).toBeUndefined()
    expect(result.profileLevel).toBe("BASIC")
    expect(result.confidence).toBe(ONBOARDING_CONFIDENCE.QUICK)
    expect(provider.getQuestionsByPhase).toHaveBeenCalledWith(1)
    expect(provider.getQuestionsByPhase).not.toHaveBeenCalledWith(2)
  })

  it("MEDIUM → L1+L2 반환, STANDARD 프로필", async () => {
    const provider = makeProvider()
    const answers: OnboardingAnswer[] = [
      { questionId: "p1-q1", value: "A" },
      { questionId: "p2-q1", value: "A" },
    ]

    const result = await processOnboardingAnswers(answers, "STANDARD", provider)

    expect(result.l1Vector).toBeDefined()
    expect(result.l2Vector).toBeDefined()
    expect(result.profileLevel).toBe("STANDARD")
    expect(result.confidence).toBe(ONBOARDING_CONFIDENCE.STANDARD)
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
    expect(getRequiredPhases("QUICK")).toEqual([1])
  })
  it("MEDIUM → [1, 2]", () => {
    expect(getRequiredPhases("STANDARD")).toEqual([1, 2])
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
    expect(ONBOARDING_CONFIDENCE.QUICK).toBeLessThan(ONBOARDING_CONFIDENCE.STANDARD)
    expect(ONBOARDING_CONFIDENCE.STANDARD).toBeLessThan(ONBOARDING_CONFIDENCE.DEEP)
  })
})

// ═══ v3 24문항 구조 통합 테스트 ═══
// 설계서 §19.3~§19.4 기준 — 실제 SQL(009_cold_start_v3.sql)과 동일 구조

describe("v3 24문항 구조 통합", () => {
  // Phase 1 실제 질문 구조 (SQL과 동일)
  const V3_PHASE1: OnboardingQuestion[] = [
    {
      id: "v3-q01-depth-openness",
      phase: 1,
      options: [
        { key: "A", l1Weights: { depth: -0.2 }, l2Weights: { openness: 0.1 } },
        { key: "B", l1Weights: { depth: 0.1 }, l2Weights: { openness: 0.15 } },
        { key: "C", l1Weights: { depth: 0.3 }, l2Weights: { openness: 0.25 } },
        { key: "D", l1Weights: { depth: 0.4 }, l2Weights: { openness: 0.3 } },
      ],
    },
    {
      id: "v3-q02-lens-conscientiousness",
      phase: 1,
      options: [
        { key: "A", l1Weights: { lens: -0.3 }, l2Weights: { conscientiousness: -0.2 } },
        { key: "B", l1Weights: { lens: -0.1 }, l2Weights: { conscientiousness: 0.0 } },
        { key: "C", l1Weights: { lens: 0.2 }, l2Weights: { conscientiousness: 0.25 } },
        { key: "D", l1Weights: { lens: 0.35 }, l2Weights: { conscientiousness: 0.35 } },
      ],
    },
    {
      id: "v3-q03-stance-agreeableness",
      phase: 1,
      options: [
        { key: "A", l1Weights: { stance: -0.3 }, l2Weights: { agreeableness: 0.3 } },
        { key: "B", l1Weights: { stance: -0.1 }, l2Weights: { agreeableness: 0.2 } },
        { key: "C", l1Weights: { stance: 0.25 }, l2Weights: { agreeableness: -0.1 } },
        { key: "D", l1Weights: { stance: 0.4 }, l2Weights: { agreeableness: -0.3 } },
      ],
    },
    {
      id: "v3-q04-scope-openness",
      phase: 1,
      options: [
        { key: "A", l1Weights: { scope: -0.3 }, l2Weights: { openness: -0.2 } },
        { key: "B", l1Weights: { scope: -0.05 }, l2Weights: { openness: 0.05 } },
        { key: "C", l1Weights: { scope: 0.2 }, l2Weights: { openness: 0.2 } },
        { key: "D", l1Weights: { scope: 0.35 }, l2Weights: { openness: 0.35 } },
      ],
    },
    {
      id: "v3-q05-taste-openness",
      phase: 1,
      options: [
        { key: "A", l1Weights: { taste: -0.3 }, l2Weights: { openness: -0.3 } },
        { key: "B", l1Weights: { taste: -0.1 }, l2Weights: { openness: -0.05 } },
        { key: "C", l1Weights: { taste: 0.2 }, l2Weights: { openness: 0.25 } },
        { key: "D", l1Weights: { taste: 0.4 }, l2Weights: { openness: 0.35 } },
      ],
    },
    {
      id: "v3-q06-purpose-conscientiousness",
      phase: 1,
      options: [
        { key: "A", l1Weights: { purpose: -0.3 }, l2Weights: { conscientiousness: -0.25 } },
        { key: "B", l1Weights: { purpose: -0.1 }, l2Weights: { conscientiousness: -0.05 } },
        { key: "C", l1Weights: { purpose: 0.2 }, l2Weights: { conscientiousness: 0.2 } },
        { key: "D", l1Weights: { purpose: 0.35 }, l2Weights: { conscientiousness: 0.35 } },
      ],
    },
    {
      id: "v3-q07-sociability-extraversion",
      phase: 1,
      options: [
        { key: "A", l1Weights: { sociability: -0.3 }, l2Weights: { extraversion: -0.3 } },
        { key: "B", l1Weights: { sociability: -0.1 }, l2Weights: { extraversion: -0.1 } },
        { key: "C", l1Weights: { sociability: 0.2 }, l2Weights: { extraversion: 0.2 } },
        { key: "D", l1Weights: { sociability: 0.4 }, l2Weights: { extraversion: 0.35 } },
      ],
    },
    {
      id: "v3-q08-depth-lens-neuroticism",
      phase: 1,
      options: [
        { key: "A", l1Weights: { depth: 0.1, lens: -0.2 }, l2Weights: { neuroticism: -0.2 } },
        { key: "B", l1Weights: { depth: 0.1, lens: 0.15 }, l2Weights: { neuroticism: 0.1 } },
        { key: "C", l1Weights: { depth: -0.15, lens: 0.0 }, l2Weights: { neuroticism: 0.3 } },
        { key: "D", l1Weights: { depth: 0.3, lens: 0.2 }, l2Weights: { neuroticism: -0.1 } },
      ],
    },
  ]

  // Phase 2 대표 질문 (Q9, Q11)
  const V3_PHASE2: OnboardingQuestion[] = [
    {
      id: "v3-q09-openness-taste",
      phase: 2,
      options: [
        { key: "A", l2Weights: { openness: -0.3 }, l1Weights: { taste: -0.25 } },
        { key: "B", l2Weights: { openness: -0.05 }, l1Weights: { taste: -0.05 } },
        { key: "C", l2Weights: { openness: 0.2 }, l1Weights: { taste: 0.15 } },
        { key: "D", l2Weights: { openness: 0.35 }, l1Weights: { taste: 0.3 } },
      ],
    },
    {
      id: "v3-q11-extraversion-sociability",
      phase: 2,
      options: [
        { key: "A", l2Weights: { extraversion: -0.3 }, l1Weights: { sociability: -0.25 } },
        { key: "B", l2Weights: { extraversion: -0.05 }, l1Weights: { sociability: 0.05 } },
        { key: "C", l2Weights: { extraversion: 0.25 }, l1Weights: { sociability: 0.2 } },
        { key: "D", l2Weights: { extraversion: 0.35 }, l1Weights: { sociability: 0.35 } },
      ],
    },
  ]

  // Phase 3 역설 검증 질문 (Q19)
  const V3_PHASE3: OnboardingQuestion[] = [
    {
      id: "v3-q19-paradox-sociability-extraversion",
      phase: 3,
      options: [
        { key: "A", l1Weights: { sociability: 0.15 }, l2Weights: { extraversion: 0.3 } },
        { key: "B", l1Weights: { sociability: 0.1 }, l2Weights: { extraversion: -0.1 } },
        { key: "C", l1Weights: { sociability: 0.05 }, l2Weights: { extraversion: -0.2 } },
        { key: "D", l1Weights: { sociability: 0.2 }, l2Weights: { extraversion: -0.3 } },
      ],
    },
  ]

  it("Phase 1 전체 8문항 응답 → L1 7D 모든 축 측정", () => {
    const answers: OnboardingAnswer[] = [
      { questionId: "v3-q01-depth-openness", value: "C" },
      { questionId: "v3-q02-lens-conscientiousness", value: "D" },
      { questionId: "v3-q03-stance-agreeableness", value: "C" },
      { questionId: "v3-q04-scope-openness", value: "C" },
      { questionId: "v3-q05-taste-openness", value: "C" },
      { questionId: "v3-q06-purpose-conscientiousness", value: "C" },
      { questionId: "v3-q07-sociability-extraversion", value: "C" },
      { questionId: "v3-q08-depth-lens-neuroticism", value: "D" },
    ]
    const l1 = computeL1Vector(V3_PHASE1, answers)

    // 모든 L1 차원이 기본값(0.5)에서 변화해야 함
    expect(l1.depth).not.toBe(0.5) // Q1 +0.3, Q8 +0.3
    expect(l1.lens).not.toBe(0.5) // Q2 +0.35, Q8 +0.2
    expect(l1.stance).not.toBe(0.5) // Q3 +0.25
    expect(l1.scope).not.toBe(0.5) // Q4 +0.2
    expect(l1.taste).not.toBe(0.5) // Q5 +0.2
    expect(l1.purpose).not.toBe(0.5) // Q6 +0.2
    expect(l1.sociability).not.toBe(0.5) // Q7 +0.2

    // 값 범위 검증
    for (const key of [
      "depth",
      "lens",
      "stance",
      "scope",
      "taste",
      "purpose",
      "sociability",
    ] as const) {
      expect(l1[key]).toBeGreaterThanOrEqual(0)
      expect(l1[key]).toBeLessThanOrEqual(1)
    }
  })

  it("Phase 1 극단적 응답 (전부 A) → 보수적/소극적 벡터", () => {
    const answers: OnboardingAnswer[] = V3_PHASE1.map((q) => ({
      questionId: q.id,
      value: "A",
    }))
    const l1 = computeL1Vector(V3_PHASE1, answers)

    // A는 대부분 음수 가중치
    expect(l1.depth).toBeLessThan(0.5)
    expect(l1.lens).toBeLessThan(0.5)
    expect(l1.stance).toBeLessThan(0.5)
    expect(l1.scope).toBeLessThan(0.5)
    expect(l1.taste).toBeLessThan(0.5)
    expect(l1.purpose).toBeLessThan(0.5)
    expect(l1.sociability).toBeLessThan(0.5)
  })

  it("Phase 1 극단적 응답 (전부 D) → 적극적/개방적 벡터", () => {
    const answers: OnboardingAnswer[] = V3_PHASE1.map((q) => ({
      questionId: q.id,
      value: "D",
    }))
    const l1 = computeL1Vector(V3_PHASE1, answers)

    // D는 대부분 양수 가중치
    expect(l1.depth).toBeGreaterThan(0.5)
    expect(l1.lens).toBeGreaterThan(0.5)
    expect(l1.stance).toBeGreaterThan(0.5)
    expect(l1.scope).toBeGreaterThan(0.5)
    expect(l1.taste).toBeGreaterThan(0.5)
    expect(l1.purpose).toBeGreaterThan(0.5)
    expect(l1.sociability).toBeGreaterThan(0.5)
  })

  it("Phase 2 → L2 OCEAN 벡터 변화", () => {
    const answers: OnboardingAnswer[] = [
      { questionId: "v3-q09-openness-taste", value: "D" },
      { questionId: "v3-q11-extraversion-sociability", value: "D" },
    ]
    const l2 = computeL2Vector(V3_PHASE2, answers)

    expect(l2.openness).toBe(0.85) // 0.5 + 0.35
    expect(l2.extraversion).toBe(0.85) // 0.5 + 0.35
  })

  it("Phase 2 → L1 교차 측정도 반영", () => {
    const answers: OnboardingAnswer[] = [
      { questionId: "v3-q09-openness-taste", value: "D" }, // taste +0.3
      { questionId: "v3-q11-extraversion-sociability", value: "D" }, // sociability +0.35
    ]
    // Phase 2 질문은 l1Weights도 포함 → computeL1Vector로도 측정 가능
    const l1 = computeL1Vector(V3_PHASE2, answers)

    expect(l1.taste).toBe(0.8) // 0.5 + 0.3
    expect(l1.sociability).toBe(0.85) // 0.5 + 0.35
  })

  it("Phase 3 역설 검증 — sociability↔extraversion 괴리 감지", () => {
    // 온라인 활발(sociability 높음) + 오프라인 소극(extraversion 낮음) = 역설
    const l1 = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.85,
    }
    const l2 = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.3,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }
    // Q19 D선택: sociability +0.2, extraversion -0.3 → 괴리 심화
    const answers: OnboardingAnswer[] = [
      { questionId: "v3-q19-paradox-sociability-extraversion", value: "D" },
    ]

    const result = crossValidate(l1, l2, V3_PHASE3, answers)

    // sociability=0.85+0.2=1.0(클램프), extraversion=0.3-0.3=0.0 → 갭 1.0 > 0.3
    expect(result.paradoxDetected).toBe(true)
  })

  it("Phase 3 일관 응답 → 역설 미감지", () => {
    const l1 = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.65,
    }
    const l2 = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.6,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }
    // Q19 A선택: sociability +0.15, extraversion +0.3 → 일관
    const answers: OnboardingAnswer[] = [
      { questionId: "v3-q19-paradox-sociability-extraversion", value: "A" },
    ]

    const result = crossValidate(l1, l2, V3_PHASE3, answers)

    // sociability=0.8, extraversion=0.9 → 갭 0.1 < 0.3
    expect(result.paradoxDetected).toBe(false)
  })

  it("전체 파이프라인 DEEP → ADVANCED 프로필", async () => {
    const provider: OnboardingDataProvider = {
      getQuestionsByPhase: vi.fn().mockImplementation((phase: number) => {
        switch (phase) {
          case 1:
            return Promise.resolve(V3_PHASE1)
          case 2:
            return Promise.resolve(V3_PHASE2)
          case 3:
            return Promise.resolve(V3_PHASE3)
          default:
            return Promise.resolve([])
        }
      }),
      saveOnboardingResult: vi.fn().mockResolvedValue(undefined),
    }

    const answers: OnboardingAnswer[] = [
      // Phase 1
      { questionId: "v3-q01-depth-openness", value: "C" },
      { questionId: "v3-q02-lens-conscientiousness", value: "C" },
      { questionId: "v3-q03-stance-agreeableness", value: "B" },
      { questionId: "v3-q04-scope-openness", value: "C" },
      { questionId: "v3-q05-taste-openness", value: "C" },
      { questionId: "v3-q06-purpose-conscientiousness", value: "C" },
      { questionId: "v3-q07-sociability-extraversion", value: "B" },
      { questionId: "v3-q08-depth-lens-neuroticism", value: "B" },
      // Phase 2
      { questionId: "v3-q09-openness-taste", value: "C" },
      { questionId: "v3-q11-extraversion-sociability", value: "B" },
      // Phase 3
      { questionId: "v3-q19-paradox-sociability-extraversion", value: "B" },
    ]

    const result = await processOnboardingAnswers(answers, "DEEP", provider)

    expect(result.profileLevel).toBe("ADVANCED")
    expect(result.confidence).toBe(ONBOARDING_CONFIDENCE.DEEP)
    expect(result.l1Vector).toBeDefined()
    expect(result.l2Vector).toBeDefined()
    // L1 벡터 범위 검증
    for (const key of [
      "depth",
      "lens",
      "stance",
      "scope",
      "taste",
      "purpose",
      "sociability",
    ] as const) {
      expect(result.l1Vector[key]).toBeGreaterThanOrEqual(0)
      expect(result.l1Vector[key]).toBeLessThanOrEqual(1)
    }
    // L2 벡터 범위 검증
    for (const key of [
      "openness",
      "conscientiousness",
      "extraversion",
      "agreeableness",
      "neuroticism",
    ] as const) {
      expect(result.l2Vector![key]).toBeGreaterThanOrEqual(0)
      expect(result.l2Vector![key]).toBeLessThanOrEqual(1)
    }
  })

  it("v3 질문 구조 검증 — 모든 질문에 key/l1Weights 또는 l2Weights 존재", () => {
    const allQuestions = [...V3_PHASE1, ...V3_PHASE2, ...V3_PHASE3]

    for (const q of allQuestions) {
      expect(q.options.length).toBe(4) // 4지선다
      for (const opt of q.options) {
        expect(["A", "B", "C", "D"]).toContain(opt.key)
        // 최소 l1Weights 또는 l2Weights 하나는 존재
        const hasWeights =
          (opt.l1Weights && Object.keys(opt.l1Weights).length > 0) ||
          (opt.l2Weights && Object.keys(opt.l2Weights).length > 0)
        expect(hasWeights).toBe(true)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 경계값 및 에러 케이스
// ═══════════════════════════════════════════════════════════════

describe("경계값 및 에러 케이스", () => {
  // ── 잘못된 답변 인덱스 (존재하지 않는 option key) ──────────────

  it("computeL1Vector — 존재하지 않는 옵션 키(E) → 해당 답변 무시, 기본값 유지", () => {
    const answers: OnboardingAnswer[] = [
      { questionId: "p1-q1", value: "E" }, // A-D만 존재
      { questionId: "p1-q2", value: "A" },
    ]
    const result = computeL1Vector(PHASE1_QUESTIONS, answers)

    // q1 답변 "E"는 매칭 안 됨 → depth, lens 변화 없음
    expect(result.depth).toBe(0.5)
    expect(result.lens).toBe(0.5)
    // q2 답변 "A"는 정상 반영
    expect(result.sociability).toBe(0.7) // 0.5 + 0.2
  })

  it("computeL2Vector — 존재하지 않는 옵션 키 → 해당 답변 무시", () => {
    const answers: OnboardingAnswer[] = [
      { questionId: "p2-q1", value: "Z" }, // A-D만 존재
    ]
    const result = computeL2Vector(PHASE2_QUESTIONS, answers)

    // 모든 값이 기본값 유지
    expect(result.openness).toBe(0.5)
    expect(result.extraversion).toBe(0.5)
    expect(result.conscientiousness).toBe(0.5)
    expect(result.agreeableness).toBe(0.5)
    expect(result.neuroticism).toBe(0.5)
  })

  // ── 빈 답변 배열 ──────────────────────────────────────────────

  it("processOnboardingAnswers — 빈 답변 배열 → 기본 벡터로 결과 반환 (LIGHT)", async () => {
    const provider: OnboardingDataProvider = {
      getQuestionsByPhase: vi.fn().mockResolvedValue(PHASE1_QUESTIONS),
      saveOnboardingResult: vi.fn().mockResolvedValue(undefined),
    }

    const result = await processOnboardingAnswers([], "QUICK", provider)

    expect(result.l1Vector).toBeDefined()
    expect(result.profileLevel).toBe("BASIC")
    // 모든 L1 차원이 기본값(0.5)
    expect(result.l1Vector.depth).toBe(0.5)
    expect(result.l1Vector.lens).toBe(0.5)
    expect(result.l1Vector.stance).toBe(0.5)
    expect(result.l1Vector.scope).toBe(0.5)
    expect(result.l1Vector.taste).toBe(0.5)
    expect(result.l1Vector.purpose).toBe(0.5)
    expect(result.l1Vector.sociability).toBe(0.5)
  })

  // ── 프로바이더가 빈 질문 반환 ──────────────────────────────────

  it("processOnboardingAnswers — 프로바이더가 빈 질문 목록 반환 → 기본 벡터", async () => {
    const emptyProvider: OnboardingDataProvider = {
      getQuestionsByPhase: vi.fn().mockResolvedValue([]),
      saveOnboardingResult: vi.fn().mockResolvedValue(undefined),
    }

    const answers: OnboardingAnswer[] = [{ questionId: "p1-q1", value: "A" }]

    const result = await processOnboardingAnswers(answers, "QUICK", emptyProvider)

    expect(result.l1Vector).toBeDefined()
    // 질문이 없으므로 답변이 매칭되지 않음 → 모두 기본값
    expect(result.l1Vector.depth).toBe(0.5)
    expect(result.l1Vector.sociability).toBe(0.5)
  })

  // ── 중복 답변 (같은 질문에 두 번 응답) ─────────────────────────

  it("computeL1Vector — 동일 질문에 중복 답변 → 마지막 답변 기준으로 처리", () => {
    const answers: OnboardingAnswer[] = [
      { questionId: "p1-q1", value: "A" }, // depth +0.15, lens +0.05
      { questionId: "p1-q1", value: "C" }, // stance +0.15
    ]
    const result = computeL1Vector(PHASE1_QUESTIONS, answers)

    // Map은 같은 key 시 마지막 값 사용 → "C" 적용
    expect(result.stance).toBe(0.65) // 0.5 + 0.15
    // "A"의 depth +0.15는 무시됨
    expect(result.depth).toBe(0.5)
  })

  // ── 답변이 질문과 매칭되지 않는 경우 ──────────────────────────

  it("computeL1Vector — 다른 Phase 질문 ID로 답변 → 무시", () => {
    const answers: OnboardingAnswer[] = [
      { questionId: "p2-q1", value: "A" }, // Phase 2 질문 ID
      { questionId: "nonexistent-q", value: "B" }, // 존재하지 않는 ID
    ]
    const result = computeL1Vector(PHASE1_QUESTIONS, answers)

    // Phase 1 질문에 매칭되는 답변 없음 → 모두 기본값
    expect(result.depth).toBe(0.5)
    expect(result.lens).toBe(0.5)
    expect(result.sociability).toBe(0.5)
  })

  // ── computeCompleteness 경계 케이스 ───────────────────────────

  it("computeCompleteness — 답변이 질문과 전혀 매칭 안 됨 → 0", () => {
    const questions = PHASE1_QUESTIONS // p1-q1, p1-q2, p1-q3
    const answers: OnboardingAnswer[] = [
      { questionId: "unknown-1", value: "A" },
      { questionId: "unknown-2", value: "B" },
    ]
    expect(computeCompleteness(questions, answers)).toBe(0)
  })

  it("computeCompleteness — 중복 답변은 한 번만 카운트", () => {
    const questions = PHASE1_QUESTIONS
    const answers: OnboardingAnswer[] = [
      { questionId: "p1-q1", value: "A" },
      { questionId: "p1-q1", value: "B" }, // 같은 질문 중복
    ]
    // Set으로 중복 제거되므로 1/3
    expect(computeCompleteness(questions, answers)).toBeCloseTo(1 / 3)
  })

  // ── crossValidate 경계 케이스 ─────────────────────────────────

  it("crossValidate — 빈 Phase 3 질문/답변 → L1/L2 그대로 반환", () => {
    const l1 = {
      depth: 0.7,
      lens: 0.6,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const l2 = {
      openness: 0.6,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }

    const result = crossValidate(l1, l2, [], [])

    // Phase 3 질문이 없으므로 L1/L2 조정 없음
    expect(result.adjustedL1.depth).toBe(0.7)
    expect(result.adjustedL1.lens).toBe(0.6)
    expect(result.adjustedL2.openness).toBe(0.6)
    expect(result.paradoxDetected).toBe(false) // 갭 없음
  })
})
