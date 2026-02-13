// ═══════════════════════════════════════════════════════════════
// 콜드 스타트 전략 관리
// T56-AC1: Quick/Standard/Deep 모드, 질문 세트 CRUD
// ═══════════════════════════════════════════════════════════════

import type { SocialDimension, TemperamentDimension } from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export type OnboardingMode = "quick" | "standard" | "deep"

export type QuestionType =
  | "forced_choice" // A vs B 선택
  | "scenario" // 상황 제시 후 반응
  | "ab_review" // 두 리뷰 중 선택
  | "reversal" // 반전 탐지용

export interface ColdStartQuestion {
  id: string
  text: string
  type: QuestionType
  targetDimensions: string[] // 복합질문: 여러 차원 동시 측정
  targetLayers: ("L1" | "L2")[] // 복합질문: L1+L2 동시 측정
  options: QuestionOption[]
  mode: OnboardingMode
  order: number
}

export interface QuestionOption {
  id: string
  text: string
  l1Weights: Record<string, number> // L1 차원 → delta (-0.5 ~ +0.5)
  l2Weights: Record<string, number> // L2 차원 → delta (-0.5 ~ +0.5)
}

export interface QuestionSet {
  id: string
  name: string
  mode: OnboardingMode
  questions: ColdStartQuestion[]
  estimatedMinutes: number
  targetPrecision: number // 0~1
  createdAt: number
  updatedAt: number
}

export interface ColdStartResult {
  questionSetId: string
  answers: Array<{ questionId: string; selectedOptionId: string }>
  inferredL1: Record<SocialDimension, number>
  inferredL2: Record<TemperamentDimension, number> | null
  confidence: Record<string, number> // dimension → confidence (0~1)
  completedAt: number
}

// ── 모드 설정 ───────────────────────────────────────────────────

export const MODE_CONFIG: Record<
  OnboardingMode,
  { questionCount: number; minutes: number; precision: number; questionsPerAxis: number }
> = {
  quick: { questionCount: 8, minutes: 1.3, precision: 0.65, questionsPerAxis: 1 },
  standard: { questionCount: 16, minutes: 2.7, precision: 0.8, questionsPerAxis: 2 },
  deep: { questionCount: 24, minutes: 4, precision: 0.93, questionsPerAxis: 3 },
}

// ── 질문 세트 생성 ──────────────────────────────────────────────

export function createQuestionSet(
  name: string,
  mode: OnboardingMode,
  questions: ColdStartQuestion[] = []
): QuestionSet {
  const config = MODE_CONFIG[mode]
  const now = Date.now()
  return {
    id: `qs_${now}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    mode,
    questions,
    estimatedMinutes: config.minutes,
    targetPrecision: config.precision,
    createdAt: now,
    updatedAt: now,
  }
}

// ── 질문 추가 ───────────────────────────────────────────────────

export function addQuestion(
  set: QuestionSet,
  question: Omit<ColdStartQuestion, "id" | "order" | "mode">
): QuestionSet {
  const config = MODE_CONFIG[set.mode]
  if (set.questions.length >= config.questionCount) {
    throw new Error(`${set.mode} 모드 최대 질문 수 (${config.questionCount}) 초과`)
  }

  const newQ: ColdStartQuestion = {
    ...question,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    order: set.questions.length,
    mode: set.mode,
  }

  return {
    ...set,
    questions: [...set.questions, newQ],
    updatedAt: Date.now(),
  }
}

// ── 질문 제거 ───────────────────────────────────────────────────

export function removeQuestion(set: QuestionSet, questionId: string): QuestionSet {
  return {
    ...set,
    questions: set.questions.filter((q) => q.id !== questionId).map((q, i) => ({ ...q, order: i })),
    updatedAt: Date.now(),
  }
}

// ── 질문 순서 변경 ──────────────────────────────────────────────

export function reorderQuestions(set: QuestionSet, questionIds: string[]): QuestionSet {
  const ordered: ColdStartQuestion[] = []
  for (const id of questionIds) {
    const q = set.questions.find((q) => q.id === id)
    if (q) ordered.push({ ...q, order: ordered.length })
  }
  return { ...set, questions: ordered, updatedAt: Date.now() }
}

// ── 응답 → 벡터 추론 ───────────────────────────────────────────

export function inferVectorsFromAnswers(
  questions: ColdStartQuestion[],
  answers: Array<{ questionId: string; selectedOptionId: string }>
): ColdStartResult["inferredL1"] & {
  l2: ColdStartResult["inferredL2"]
  confidence: Record<string, number>
} {
  const l1Dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  const l2Dims: TemperamentDimension[] = [
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
  ]

  // 차원별 누적
  const sums: Record<string, { total: number; count: number }> = {}
  for (const dim of [...l1Dims, ...l2Dims]) {
    sums[dim] = { total: 0, count: 0 }
  }

  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId)
    if (!question) continue
    const option = question.options.find((o) => o.id === answer.selectedOptionId)
    if (!option) continue

    // L1 + L2 가중치를 각각 적용 (복합질문: 동시 측정)
    for (const [dim, delta] of Object.entries(option.l1Weights)) {
      if (sums[dim]) {
        sums[dim].total += delta
        sums[dim].count++
      }
    }
    for (const [dim, delta] of Object.entries(option.l2Weights)) {
      if (sums[dim]) {
        sums[dim].total += delta
        sums[dim].count++
      }
    }
  }

  // 평균 → 0~1 정규화 (0.5 기준)
  const l1: Record<string, number> = {}
  for (const dim of l1Dims) {
    const s = sums[dim]
    l1[dim] = s.count > 0 ? clamp(0.5 + s.total / s.count) : 0.5
  }

  const hasL2 = l2Dims.some((d) => sums[d].count > 0)
  const l2: Record<string, number> | null = hasL2
    ? Object.fromEntries(
        l2Dims.map((d) => [d, sums[d].count > 0 ? clamp(0.5 + sums[d].total / sums[d].count) : 0.5])
      )
    : null

  // 신뢰도: 질문 수 기반 (0~1)
  const confidence: Record<string, number> = {}
  for (const dim of [...l1Dims, ...l2Dims]) {
    const count = sums[dim].count
    confidence[dim] = round(Math.min(count / 8, 1)) // 8문항이면 max confidence
  }

  return { ...l1, l2, confidence } as ColdStartResult["inferredL1"] & {
    l2: ColdStartResult["inferredL2"]
    confidence: Record<string, number>
  }
}

// ── 질문 세트 검증 ──────────────────────────────────────────────

export function validateQuestionSet(set: QuestionSet): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const config = MODE_CONFIG[set.mode]

  if (set.questions.length === 0) {
    errors.push("질문이 없습니다")
  }

  // 차원별 질문 수 체크
  const dimCounts: Record<string, number> = {}
  for (const q of set.questions) {
    for (const dim of q.targetDimensions) {
      dimCounts[dim] = (dimCounts[dim] ?? 0) + 1
    }
  }

  // 최소 1문항/차원 체크
  const l1Dims: SocialDimension[] = [
    "depth",
    "lens",
    "stance",
    "scope",
    "taste",
    "purpose",
    "sociability",
  ]
  for (const dim of l1Dims) {
    if (!dimCounts[dim]) {
      errors.push(`L1 차원 '${dim}'에 대한 질문이 없습니다`)
    }
  }

  // 옵션 유효성
  for (const q of set.questions) {
    if (q.options.length < 2) {
      errors.push(`질문 '${q.id}' 옵션이 2개 미만`)
    }
  }

  return { valid: errors.length === 0, errors }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, round(v)))
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
