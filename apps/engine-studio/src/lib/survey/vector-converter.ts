/**
 * 설문 응답 → 6D 벡터 변환 모듈
 *
 * 각 질문의 targetDimensions와 weightFormula를 기반으로
 * 사용자 응답을 6D 벡터(0.0~1.0)로 변환한다.
 */

import type { Vector6D, VectorDimension } from "@/types"

// ============================================
// 타입 정의
// ============================================

export interface QuestionMeta {
  id: string
  questionType: "SLIDER" | "MULTIPLE_CHOICE" | "RANKING" | "TEXT" | "IMAGE"
  targetDimensions: VectorDimension[]
  weightFormula: WeightFormula | null
  options: QuestionOptionMeta[] | null
}

export interface QuestionOptionMeta {
  id: string
  label: string
  value: string | number
  weights?: Partial<Vector6D>
}

/**
 * weightFormula JSON 구조:
 * - type: "linear" | "mapped"
 * - linear: 슬라이더 값(0~1)을 targetDimensions에 직접 매핑
 * - mapped: 선택지별 weights를 사용
 * - scale: 가중치 배수 (기본 1.0)
 */
export interface WeightFormula {
  type: "linear" | "mapped"
  scale?: number
}

export interface AnswerInput {
  questionId: string
  value: number | string // SLIDER: 0~1 숫자, MULTIPLE_CHOICE: 선택지 id
}

export interface ConversionResult {
  vector: Vector6D
  confidenceScores: Vector6D
  answeredCount: number
  totalQuestions: number
}

// ============================================
// 차원 목록
// ============================================

const DIMENSIONS: VectorDimension[] = ["depth", "lens", "stance", "scope", "taste", "purpose"]

// ============================================
// 핵심 변환 함수
// ============================================

/**
 * 설문 응답을 6D 벡터로 변환
 *
 * 알고리즘:
 * 1. 각 응답에서 targetDimensions에 해당하는 차원에 기여값을 누적
 * 2. 차원별로 기여값의 가중 평균을 계산
 * 3. 응답되지 않은 차원은 기본값 0.5 (중립)
 * 4. 결과를 [0, 1] 범위로 클램핑
 * 5. 차원별 신뢰도 = 해당 차원에 기여한 질문 수 / 전체 질문 수
 */
export function convertResponsesToVector(
  answers: AnswerInput[],
  questions: QuestionMeta[]
): ConversionResult {
  // 차원별 누적 데이터
  const accumulator: Record<VectorDimension, { sum: number; weight: number; count: number }> = {
    depth: { sum: 0, weight: 0, count: 0 },
    lens: { sum: 0, weight: 0, count: 0 },
    stance: { sum: 0, weight: 0, count: 0 },
    scope: { sum: 0, weight: 0, count: 0 },
    taste: { sum: 0, weight: 0, count: 0 },
    purpose: { sum: 0, weight: 0, count: 0 },
  }

  // 질문 ID → 질문 메타 매핑
  const questionMap = new Map<string, QuestionMeta>()
  for (const q of questions) {
    questionMap.set(q.id, q)
  }

  let answeredCount = 0

  for (const answer of answers) {
    const question = questionMap.get(answer.questionId)
    if (!question) continue

    const contributions = extractDimensionContributions(answer, question)
    if (!contributions) continue

    answeredCount++

    const scale = question.weightFormula?.scale ?? 1.0

    for (const dim of DIMENSIONS) {
      if (contributions[dim] !== undefined) {
        accumulator[dim].sum += contributions[dim] * scale
        accumulator[dim].weight += scale
        accumulator[dim].count += 1
      }
    }
  }

  // 차원별 가중 평균 계산
  const vector: Vector6D = {
    depth: 0.5,
    lens: 0.5,
    stance: 0.5,
    scope: 0.5,
    taste: 0.5,
    purpose: 0.5,
  }
  const confidenceScores: Vector6D = {
    depth: 0,
    lens: 0,
    stance: 0,
    scope: 0,
    taste: 0,
    purpose: 0,
  }

  for (const dim of DIMENSIONS) {
    const acc = accumulator[dim]
    if (acc.weight > 0) {
      vector[dim] = clamp(acc.sum / acc.weight, 0, 1)
    }
    // 신뢰도: 해당 차원에 기여한 질문 수 / 전체 질문 수 (최대 1.0)
    confidenceScores[dim] = questions.length > 0 ? Math.min(acc.count / questions.length, 1.0) : 0
  }

  return {
    vector,
    confidenceScores,
    answeredCount,
    totalQuestions: questions.length,
  }
}

// ============================================
// 내부 헬퍼 함수
// ============================================

/**
 * 단일 응답에서 차원별 기여값 추출
 */
function extractDimensionContributions(
  answer: AnswerInput,
  question: QuestionMeta
): Partial<Record<VectorDimension, number>> | null {
  const { questionType, targetDimensions, weightFormula, options } = question

  if (targetDimensions.length === 0) return null

  switch (questionType) {
    case "SLIDER":
      return extractSliderContribution(answer, targetDimensions, weightFormula)

    case "MULTIPLE_CHOICE":
      return extractMultipleChoiceContribution(answer, targetDimensions, options)

    case "RANKING":
      return extractRankingContribution(answer, targetDimensions)

    case "TEXT":
    case "IMAGE":
      // TEXT/IMAGE는 직접 벡터 기여 없음 (향후 NLP/CV 연동 가능)
      return null

    default:
      return null
  }
}

/**
 * SLIDER 응답 → 차원 기여값
 * 슬라이더 값(0~1)을 targetDimensions 각각에 직접 매핑
 */
function extractSliderContribution(
  answer: AnswerInput,
  targetDimensions: VectorDimension[],
  weightFormula: WeightFormula | null
): Partial<Record<VectorDimension, number>> | null {
  const value = typeof answer.value === "number" ? answer.value : parseFloat(String(answer.value))
  if (isNaN(value)) return null

  const normalizedValue = clamp(value, 0, 1)
  const result: Partial<Record<VectorDimension, number>> = {}

  // linear: 슬라이더 값을 모든 targetDimensions에 동일하게 매핑
  if (!weightFormula || weightFormula.type === "linear") {
    for (const dim of targetDimensions) {
      result[dim] = normalizedValue
    }
  }

  return result
}

/**
 * MULTIPLE_CHOICE 응답 → 차원 기여값
 * 선택된 옵션의 weights를 사용하거나, 없으면 선택지 index 기반 균등 분배
 */
function extractMultipleChoiceContribution(
  answer: AnswerInput,
  targetDimensions: VectorDimension[],
  options: QuestionOptionMeta[] | null
): Partial<Record<VectorDimension, number>> | null {
  if (!options || options.length === 0) return null

  const selectedOption = options.find(
    (opt) => opt.id === String(answer.value) || String(opt.value) === String(answer.value)
  )

  if (!selectedOption) return null

  // 옵션에 weights가 있으면 그대로 사용
  if (selectedOption.weights) {
    const result: Partial<Record<VectorDimension, number>> = {}
    for (const dim of targetDimensions) {
      if (selectedOption.weights[dim] !== undefined) {
        result[dim] = clamp(selectedOption.weights[dim], 0, 1)
      }
    }
    return result
  }

  // weights가 없으면 옵션 index 기반 균등 분배
  const index = options.indexOf(selectedOption)
  const normalizedValue = options.length > 1 ? index / (options.length - 1) : 0.5

  const result: Partial<Record<VectorDimension, number>> = {}
  for (const dim of targetDimensions) {
    result[dim] = normalizedValue
  }
  return result
}

/**
 * RANKING 응답 → 차원 기여값
 * 순위값(1-based)을 0~1로 정규화하여 targetDimensions에 매핑
 */
function extractRankingContribution(
  answer: AnswerInput,
  targetDimensions: VectorDimension[]
): Partial<Record<VectorDimension, number>> | null {
  const value = typeof answer.value === "number" ? answer.value : parseFloat(String(answer.value))
  if (isNaN(value)) return null

  // 순위가 높을수록(1에 가까울수록) 벡터 값이 높음
  // value는 0~1 범위로 이미 정규화된 것으로 기대
  const normalizedValue = clamp(value, 0, 1)

  const result: Partial<Record<VectorDimension, number>> = {}
  for (const dim of targetDimensions) {
    result[dim] = normalizedValue
  }
  return result
}

/**
 * 값을 [min, max] 범위로 클램핑
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
