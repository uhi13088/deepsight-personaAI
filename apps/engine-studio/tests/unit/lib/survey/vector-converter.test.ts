import { describe, it, expect } from "vitest"
import {
  convertResponsesToVector,
  type QuestionMeta,
  type AnswerInput,
} from "@/lib/survey/vector-converter"

describe("Survey Vector Converter", () => {
  // ============================================
  // 테스트용 질문 데이터
  // ============================================

  const sliderQuestion: QuestionMeta = {
    id: "q1",
    questionType: "SLIDER",
    targetDimensions: ["depth", "lens"],
    weightFormula: { type: "linear" },
    options: null,
  }

  const multipleChoiceQuestion: QuestionMeta = {
    id: "q2",
    questionType: "MULTIPLE_CHOICE",
    targetDimensions: ["stance", "taste"],
    weightFormula: null,
    options: [
      { id: "opt1", label: "옵션 A", value: "a", weights: { stance: 0.2, taste: 0.8 } },
      { id: "opt2", label: "옵션 B", value: "b", weights: { stance: 0.7, taste: 0.3 } },
      { id: "opt3", label: "옵션 C", value: "c", weights: { stance: 0.9, taste: 0.1 } },
    ],
  }

  const multipleChoiceNoWeights: QuestionMeta = {
    id: "q3",
    questionType: "MULTIPLE_CHOICE",
    targetDimensions: ["scope"],
    weightFormula: null,
    options: [
      { id: "opt-a", label: "첫 번째", value: 0 },
      { id: "opt-b", label: "두 번째", value: 1 },
      { id: "opt-c", label: "세 번째", value: 2 },
    ],
  }

  const rankingQuestion: QuestionMeta = {
    id: "q4",
    questionType: "RANKING",
    targetDimensions: ["purpose"],
    weightFormula: null,
    options: null,
  }

  const textQuestion: QuestionMeta = {
    id: "q5",
    questionType: "TEXT",
    targetDimensions: ["depth"],
    weightFormula: null,
    options: null,
  }

  const scaledQuestion: QuestionMeta = {
    id: "q6",
    questionType: "SLIDER",
    targetDimensions: ["depth"],
    weightFormula: { type: "linear", scale: 2.0 },
    options: null,
  }

  // ============================================
  // 기본 변환 테스트
  // ============================================

  describe("기본 변환", () => {
    it("빈 응답은 기본 벡터(모두 0.5)를 반환한다", () => {
      const result = convertResponsesToVector([], [sliderQuestion])

      expect(result.vector.depth).toBe(0.5)
      expect(result.vector.lens).toBe(0.5)
      expect(result.vector.stance).toBe(0.5)
      expect(result.vector.scope).toBe(0.5)
      expect(result.vector.taste).toBe(0.5)
      expect(result.vector.purpose).toBe(0.5)
      expect(result.answeredCount).toBe(0)
    })

    it("빈 질문 목록에 대해 기본 벡터를 반환한다", () => {
      const result = convertResponsesToVector([], [])

      expect(result.vector.depth).toBe(0.5)
      expect(result.totalQuestions).toBe(0)
    })

    it("존재하지 않는 questionId는 무시한다", () => {
      const answers: AnswerInput[] = [{ questionId: "nonexistent", value: 0.8 }]
      const result = convertResponsesToVector(answers, [sliderQuestion])

      expect(result.answeredCount).toBe(0)
      expect(result.vector.depth).toBe(0.5)
    })
  })

  // ============================================
  // SLIDER 응답 테스트
  // ============================================

  describe("SLIDER 응답", () => {
    it("슬라이더 값이 targetDimensions에 매핑된다", () => {
      const answers: AnswerInput[] = [{ questionId: "q1", value: 0.8 }]
      const result = convertResponsesToVector(answers, [sliderQuestion])

      expect(result.vector.depth).toBe(0.8)
      expect(result.vector.lens).toBe(0.8)
      expect(result.answeredCount).toBe(1)
    })

    it("슬라이더 값 0.0은 최소값으로 매핑된다", () => {
      const answers: AnswerInput[] = [{ questionId: "q1", value: 0 }]
      const result = convertResponsesToVector(answers, [sliderQuestion])

      expect(result.vector.depth).toBe(0)
      expect(result.vector.lens).toBe(0)
    })

    it("슬라이더 값 1.0은 최대값으로 매핑된다", () => {
      const answers: AnswerInput[] = [{ questionId: "q1", value: 1.0 }]
      const result = convertResponsesToVector(answers, [sliderQuestion])

      expect(result.vector.depth).toBe(1.0)
      expect(result.vector.lens).toBe(1.0)
    })

    it("범위를 벗어난 값은 클램핑된다", () => {
      const answers: AnswerInput[] = [{ questionId: "q1", value: 1.5 }]
      const result = convertResponsesToVector(answers, [sliderQuestion])

      expect(result.vector.depth).toBe(1.0)
      expect(result.vector.lens).toBe(1.0)
    })

    it("음수 값은 0으로 클램핑된다", () => {
      const answers: AnswerInput[] = [{ questionId: "q1", value: -0.3 }]
      const result = convertResponsesToVector(answers, [sliderQuestion])

      expect(result.vector.depth).toBe(0)
      expect(result.vector.lens).toBe(0)
    })

    it("문자열 숫자도 파싱된다", () => {
      const answers: AnswerInput[] = [{ questionId: "q1", value: "0.6" }]
      const result = convertResponsesToVector(answers, [sliderQuestion])

      expect(result.vector.depth).toBeCloseTo(0.6)
    })

    it("잘못된 문자열은 무시된다", () => {
      const answers: AnswerInput[] = [{ questionId: "q1", value: "invalid" }]
      const result = convertResponsesToVector(answers, [sliderQuestion])

      expect(result.answeredCount).toBe(0)
      expect(result.vector.depth).toBe(0.5)
    })
  })

  // ============================================
  // MULTIPLE_CHOICE 응답 테스트
  // ============================================

  describe("MULTIPLE_CHOICE 응답", () => {
    it("선택지의 weights가 반영된다", () => {
      const answers: AnswerInput[] = [{ questionId: "q2", value: "opt1" }]
      const result = convertResponsesToVector(answers, [multipleChoiceQuestion])

      expect(result.vector.stance).toBe(0.2)
      expect(result.vector.taste).toBe(0.8)
    })

    it("다른 선택지의 weights도 정확히 반영된다", () => {
      const answers: AnswerInput[] = [{ questionId: "q2", value: "opt3" }]
      const result = convertResponsesToVector(answers, [multipleChoiceQuestion])

      expect(result.vector.stance).toBe(0.9)
      expect(result.vector.taste).toBe(0.1)
    })

    it("weights가 없는 선택지는 index 기반 분배한다", () => {
      // opt-a는 index 0, 총 3개 → 0/(3-1) = 0.0
      const answers: AnswerInput[] = [{ questionId: "q3", value: "opt-a" }]
      const result = convertResponsesToVector(answers, [multipleChoiceNoWeights])

      expect(result.vector.scope).toBe(0)
    })

    it("weights가 없는 마지막 선택지는 1.0이 된다", () => {
      // opt-c는 index 2, 총 3개 → 2/(3-1) = 1.0
      const answers: AnswerInput[] = [{ questionId: "q3", value: "opt-c" }]
      const result = convertResponsesToVector(answers, [multipleChoiceNoWeights])

      expect(result.vector.scope).toBe(1.0)
    })

    it("존재하지 않는 선택지 ID는 무시된다", () => {
      const answers: AnswerInput[] = [{ questionId: "q2", value: "nonexistent" }]
      const result = convertResponsesToVector(answers, [multipleChoiceQuestion])

      expect(result.answeredCount).toBe(0)
      expect(result.vector.stance).toBe(0.5)
    })
  })

  // ============================================
  // RANKING 응답 테스트
  // ============================================

  describe("RANKING 응답", () => {
    it("순위값이 targetDimension에 매핑된다", () => {
      const answers: AnswerInput[] = [{ questionId: "q4", value: 0.75 }]
      const result = convertResponsesToVector(answers, [rankingQuestion])

      expect(result.vector.purpose).toBe(0.75)
    })
  })

  // ============================================
  // TEXT/IMAGE 응답 테스트
  // ============================================

  describe("TEXT/IMAGE 응답", () => {
    it("TEXT 응답은 벡터에 기여하지 않는다", () => {
      const answers: AnswerInput[] = [{ questionId: "q5", value: "자유 텍스트 입력" }]
      const result = convertResponsesToVector(answers, [textQuestion])

      expect(result.answeredCount).toBe(0)
      expect(result.vector.depth).toBe(0.5)
    })
  })

  // ============================================
  // 가중치(scale) 테스트
  // ============================================

  describe("가중치(scale) 적용", () => {
    it("scale이 적용되어 가중 평균이 계산된다", () => {
      // q1: depth=0.3, scale=1.0 → contribution=0.3
      // q6: depth=0.9, scale=2.0 → contribution=0.9
      // 가중 평균: (0.3*1.0 + 0.9*2.0) / (1.0 + 2.0) = 2.1/3.0 = 0.7
      const answers: AnswerInput[] = [
        { questionId: "q1", value: 0.3 },
        { questionId: "q6", value: 0.9 },
      ]
      const result = convertResponsesToVector(answers, [sliderQuestion, scaledQuestion])

      expect(result.vector.depth).toBeCloseTo(0.7, 5)
      expect(result.answeredCount).toBe(2)
    })
  })

  // ============================================
  // 복합 시나리오 테스트
  // ============================================

  describe("복합 시나리오", () => {
    it("여러 질문이 같은 차원에 기여하면 평균이 된다", () => {
      // 두 슬라이더 질문이 모두 depth에 기여
      const q1: QuestionMeta = {
        id: "sq1",
        questionType: "SLIDER",
        targetDimensions: ["depth"],
        weightFormula: { type: "linear" },
        options: null,
      }
      const q2: QuestionMeta = {
        id: "sq2",
        questionType: "SLIDER",
        targetDimensions: ["depth"],
        weightFormula: { type: "linear" },
        options: null,
      }
      const answers: AnswerInput[] = [
        { questionId: "sq1", value: 0.2 },
        { questionId: "sq2", value: 0.8 },
      ]
      const result = convertResponsesToVector(answers, [q1, q2])

      // (0.2 + 0.8) / 2 = 0.5
      expect(result.vector.depth).toBeCloseTo(0.5, 5)
    })

    it("서로 다른 차원을 다루는 질문들이 독립적으로 매핑된다", () => {
      const answers: AnswerInput[] = [
        { questionId: "q1", value: 0.8 }, // depth, lens
        { questionId: "q2", value: "opt1" }, // stance=0.2, taste=0.8
        { questionId: "q4", value: 0.6 }, // purpose
      ]
      const result = convertResponsesToVector(answers, [
        sliderQuestion,
        multipleChoiceQuestion,
        rankingQuestion,
      ])

      expect(result.vector.depth).toBe(0.8)
      expect(result.vector.lens).toBe(0.8)
      expect(result.vector.stance).toBe(0.2)
      expect(result.vector.taste).toBe(0.8)
      expect(result.vector.purpose).toBe(0.6)
      // scope는 응답 없으므로 기본값 0.5
      expect(result.vector.scope).toBe(0.5)
      expect(result.answeredCount).toBe(3)
    })

    it("totalQuestions가 정확히 반환된다", () => {
      const answers: AnswerInput[] = [{ questionId: "q1", value: 0.5 }]
      const result = convertResponsesToVector(answers, [
        sliderQuestion,
        multipleChoiceQuestion,
        rankingQuestion,
      ])

      expect(result.totalQuestions).toBe(3)
      expect(result.answeredCount).toBe(1)
    })
  })

  // ============================================
  // 신뢰도(confidence) 테스트
  // ============================================

  describe("신뢰도 점수", () => {
    it("응답한 차원의 신뢰도가 0보다 크다", () => {
      const answers: AnswerInput[] = [{ questionId: "q1", value: 0.7 }]
      const result = convertResponsesToVector(answers, [sliderQuestion])

      expect(result.confidenceScores.depth).toBeGreaterThan(0)
      expect(result.confidenceScores.lens).toBeGreaterThan(0)
    })

    it("응답하지 않은 차원의 신뢰도는 0이다", () => {
      const answers: AnswerInput[] = [{ questionId: "q1", value: 0.7 }]
      const result = convertResponsesToVector(answers, [sliderQuestion])

      expect(result.confidenceScores.stance).toBe(0)
      expect(result.confidenceScores.purpose).toBe(0)
    })

    it("더 많은 질문이 차원에 기여할수록 신뢰도가 높아진다", () => {
      const q1: QuestionMeta = {
        id: "cq1",
        questionType: "SLIDER",
        targetDimensions: ["depth"],
        weightFormula: { type: "linear" },
        options: null,
      }
      const q2: QuestionMeta = {
        id: "cq2",
        questionType: "SLIDER",
        targetDimensions: ["depth"],
        weightFormula: { type: "linear" },
        options: null,
      }
      const q3: QuestionMeta = {
        id: "cq3",
        questionType: "SLIDER",
        targetDimensions: ["lens"],
        weightFormula: { type: "linear" },
        options: null,
      }

      const answers: AnswerInput[] = [
        { questionId: "cq1", value: 0.5 },
        { questionId: "cq2", value: 0.6 },
        { questionId: "cq3", value: 0.7 },
      ]
      const result = convertResponsesToVector(answers, [q1, q2, q3])

      // depth has 2 contributions, lens has 1
      expect(result.confidenceScores.depth).toBeGreaterThan(result.confidenceScores.lens)
    })
  })

  // ============================================
  // 벡터 범위 검증
  // ============================================

  describe("벡터 범위 검증", () => {
    it("모든 벡터 값은 0~1 범위 내에 있다", () => {
      const answers: AnswerInput[] = [
        { questionId: "q1", value: 0.99 },
        { questionId: "q2", value: "opt1" },
        { questionId: "q4", value: 0.01 },
      ]
      const result = convertResponsesToVector(answers, [
        sliderQuestion,
        multipleChoiceQuestion,
        rankingQuestion,
      ])

      const dims = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const
      for (const dim of dims) {
        expect(result.vector[dim]).toBeGreaterThanOrEqual(0)
        expect(result.vector[dim]).toBeLessThanOrEqual(1)
      }
    })
  })
})
