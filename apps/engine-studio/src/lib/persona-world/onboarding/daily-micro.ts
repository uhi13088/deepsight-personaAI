// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — Daily Micro-Question Engine (T308~T310)
// 구현계획서 §8.2 — 점진적 벡터 정밀화
// 매일 1~2개 가벼운 질문으로 유저 벡터를 ±0.05 미세 조정
// ═══════════════════════════════════════════════════════════════

import { clamp } from "@deepsight/vector-core"

// ── 타입 정의 ────────────────────────────────────────────────

/** L1 벡터 차원 */
const L1_DIMENSIONS = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
] as const

type L1Dimension = (typeof L1_DIMENSIONS)[number]

/** 마이크로 질문 정의 */
export interface MicroQuestion {
  id: string
  dimension: L1Dimension
  text: string
  options: MicroQuestionOption[]
}

export interface MicroQuestionOption {
  label: string
  delta: number // -0.05 ~ +0.05
}

/** 마이크로 질문 응답 결과 */
export interface MicroAnswerResult {
  dimension: L1Dimension
  previousValue: number
  newValue: number
  delta: number
}

/** 유저 벡터 상태 (L1) */
export interface UserL1Vectors {
  depth: number | null
  lens: number | null
  stance: number | null
  scope: number | null
  taste: number | null
  purpose: number | null
  sociability: number | null
}

/** DI 프로바이더 */
export interface DailyMicroProvider {
  getUserVectors(userId: string): Promise<UserL1Vectors | null>
  updateUserVector(userId: string, dimension: L1Dimension, value: number): Promise<void>
  getLastQuestionDate(userId: string): Promise<Date | null>
  setLastQuestionDate(userId: string, date: Date): Promise<void>
}

// ── 마이크로 질문 뱅크 ──────────────────────────────────────

const MICRO_QUESTION_BANK: Record<L1Dimension, MicroQuestion[]> = {
  depth: [
    {
      id: "depth-01",
      dimension: "depth",
      text: "오늘 흥미로운 글을 발견했을 때, 어떻게 읽으시겠어요?",
      options: [
        { label: "핵심만 빠르게 파악", delta: -0.03 },
        { label: "관련 맥락까지 꼼꼼히", delta: 0.03 },
        { label: "출처까지 추적해서 깊게", delta: 0.05 },
      ],
    },
    {
      id: "depth-02",
      dimension: "depth",
      text: "새로운 주제를 접할 때 선호하는 방식은?",
      options: [
        { label: "요약 영상이나 카드뉴스", delta: -0.03 },
        { label: "중간 길이의 해설 글", delta: 0.01 },
        { label: "전문가 분석 리포트", delta: 0.05 },
      ],
    },
  ],
  lens: [
    {
      id: "lens-01",
      dimension: "lens",
      text: "사회 이슈에 대해 어떤 관점이 더 끌리나요?",
      options: [
        { label: "감성적/인간적 이야기", delta: -0.03 },
        { label: "균형 잡힌 다양한 시각", delta: 0.0 },
        { label: "데이터 기반 분석", delta: 0.04 },
      ],
    },
    {
      id: "lens-02",
      dimension: "lens",
      text: "친구의 고민을 들을 때 주로?",
      options: [
        { label: "감정에 공감해준다", delta: -0.04 },
        { label: "같이 해결책을 찾아본다", delta: 0.02 },
        { label: "논리적으로 정리해준다", delta: 0.04 },
      ],
    },
  ],
  stance: [
    {
      id: "stance-01",
      dimension: "stance",
      text: "토론에서 의견이 다를 때 어떻게 하시나요?",
      options: [
        { label: "상대 의견에 맞춰 조율", delta: -0.03 },
        { label: "내 의견을 설명하되 경청", delta: 0.02 },
        { label: "논리적으로 반박", delta: 0.05 },
      ],
    },
  ],
  scope: [
    {
      id: "scope-01",
      dimension: "scope",
      text: "관심사의 범위가 어떤 편인가요?",
      options: [
        { label: "한 분야를 깊게 파고들기", delta: -0.04 },
        { label: "몇 가지 분야를 병행", delta: 0.01 },
        { label: "다양한 분야를 넓게 탐색", delta: 0.04 },
      ],
    },
  ],
  taste: [
    {
      id: "taste-01",
      dimension: "taste",
      text: "콘텐츠를 고를 때 가장 중요한 기준은?",
      options: [
        { label: "대중적이고 트렌디한 것", delta: -0.04 },
        { label: "개성 있고 독특한 것", delta: 0.04 },
        { label: "전문적이고 깊이 있는 것", delta: 0.02 },
      ],
    },
  ],
  purpose: [
    {
      id: "purpose-01",
      dimension: "purpose",
      text: "SNS를 사용하는 주된 이유는?",
      options: [
        { label: "재미와 시간 보내기", delta: -0.03 },
        { label: "정보 수집과 학습", delta: 0.03 },
        { label: "네트워킹과 관계 형성", delta: 0.01 },
      ],
    },
  ],
  sociability: [
    {
      id: "sociability-01",
      dimension: "sociability",
      text: "온라인에서 새로운 사람과의 교류에 대해 어떻게 생각하세요?",
      options: [
        { label: "혼자 조용히 관찰하는 게 편함", delta: -0.04 },
        { label: "관심사가 같으면 대화 환영", delta: 0.02 },
        { label: "적극적으로 교류하고 싶음", delta: 0.05 },
      ],
    },
  ],
}

// ── 불확실성 계산 ────────────────────────────────────────────

/**
 * 차원별 불확실성(uncertainty) 계산.
 *
 * null이면 최대 불확실성(1.0),
 * 기본값(0.50)에 가까우면 높은 불확실성 (아직 개인화 안됨),
 * 극단값에 가까우면 낮은 불확실성 (이미 명확한 성향).
 */
function computeUncertainty(value: number | null): number {
  if (value === null) return 1.0
  // 0.5에 가까울수록 불확실 (0.5 → 1.0, 0.0/1.0 → 0.0)
  return 1.0 - Math.abs(value - 0.5) * 2
}

/**
 * 가장 불확실한 차원을 선택하여 질문 생성.
 */
export function selectDimensionByUncertainty(vectors: UserL1Vectors): L1Dimension {
  let maxUncertainty = -1
  let selectedDim: L1Dimension = "depth"

  for (const dim of L1_DIMENSIONS) {
    const uncertainty = computeUncertainty(vectors[dim])
    // 동점이면 랜덤성 추가
    if (uncertainty > maxUncertainty || (uncertainty === maxUncertainty && Math.random() > 0.5)) {
      maxUncertainty = uncertainty
      selectedDim = dim
    }
  }

  return selectedDim
}

// ── 메인 함수들 ──────────────────────────────────────────────

/**
 * T308: 오늘의 마이크로 질문 생성.
 *
 * 1. 이미 오늘 답변했으면 null 반환
 * 2. 가장 불확실한 차원 선택
 * 3. 해당 차원의 질문 뱅크에서 랜덤 선택
 */
export async function generateDailyMicroQuestion(
  userId: string,
  provider: DailyMicroProvider
): Promise<MicroQuestion | null> {
  // 오늘 이미 답변했는지 확인
  const lastDate = await provider.getLastQuestionDate(userId)
  if (lastDate) {
    const today = new Date()
    if (
      lastDate.getFullYear() === today.getFullYear() &&
      lastDate.getMonth() === today.getMonth() &&
      lastDate.getDate() === today.getDate()
    ) {
      return null // 오늘 이미 답변 완료
    }
  }

  const vectors = await provider.getUserVectors(userId)
  if (!vectors) return null

  const dimension = selectDimensionByUncertainty(vectors)
  const questions = MICRO_QUESTION_BANK[dimension]
  if (!questions || questions.length === 0) return null

  // 랜덤 선택
  const idx = Math.floor(Math.random() * questions.length)
  return questions[idx]
}

/**
 * T309~T310: 마이크로 질문 응답 처리.
 *
 * 벡터 미세 조정 (±0.05 이내, clamp 0.0~1.0).
 */
export async function processMicroAnswer(
  userId: string,
  questionId: string,
  optionIndex: number,
  provider: DailyMicroProvider
): Promise<MicroAnswerResult | null> {
  // 질문 찾기
  let question: MicroQuestion | undefined
  for (const dim of L1_DIMENSIONS) {
    question = MICRO_QUESTION_BANK[dim].find((q) => q.id === questionId)
    if (question) break
  }
  if (!question) return null

  const option = question.options[optionIndex]
  if (!option) return null

  const vectors = await provider.getUserVectors(userId)
  if (!vectors) return null

  const currentValue = vectors[question.dimension] ?? 0.5
  const delta = option.delta
  const newValue = clamp(currentValue + delta)

  await provider.updateUserVector(userId, question.dimension, newValue)
  await provider.setLastQuestionDate(userId, new Date())

  return {
    dimension: question.dimension,
    previousValue: currentValue,
    newValue,
    delta,
  }
}

/**
 * 전체 차원의 불확실성 요약 반환.
 */
export function getUncertaintySummary(
  vectors: UserL1Vectors
): Array<{ dimension: L1Dimension; uncertainty: number }> {
  return L1_DIMENSIONS.map((dim) => ({
    dimension: dim,
    uncertainty: computeUncertainty(vectors[dim]),
  })).sort((a, b) => b.uncertainty - a.uncertainty)
}
