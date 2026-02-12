// ═══════════════════════════════════════════════════════════════
// 적응형 프로파일링 엔진
// T56-AC5: CAT 기반 질문 선택, 데일리 체크, 불성실 응답 방지
// ═══════════════════════════════════════════════════════════════

import type { SocialDimension, TemperamentDimension } from "@/types"
import type { ColdStartQuestion } from "./cold-start"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface AxisUncertainty {
  axis: string
  uncertainty: number // 높을수록 불확실
  responseCount: number
  avgConfidence: number
  lastMeasuredAt: number | null
}

export interface QuestionCandidate {
  question: ColdStartQuestion
  expectedInfoGain: number
  targetAxis: string
}

export interface DailyCheckState {
  userId: string
  date: string // YYYY-MM-DD
  questionsAnswered: number
  questionsTarget: number // 기본 3
  completed: boolean
  streak: number // 연속 완료 일수
  coinBalance: number
}

export interface DailyReward {
  type: "daily_complete" | "streak_3" | "streak_7" | "streak_30" | "precision_milestone"
  coins: number
  description: string
}

export interface ResponseValidation {
  valid: boolean
  issues: ResponseIssue[]
  weight: number // 0~1 (벡터 업데이트에 적용할 가중치)
  message: string | null
}

export type ResponseIssue = "too_fast" | "same_pattern" | "inconsistent"

export interface TrustScore {
  userId: string
  score: number // 0.5 ~ 1.0
  penalties: TrustPenalty[]
  calculatedAt: number
}

export interface TrustPenalty {
  type: ResponseIssue
  count: number
  penalty: number
}

export interface UserResponseRecord {
  questionId: string
  selectedOptionId: string
  durationMs: number
  axis: string
  direction: number // delta 방향 (-1 ~ +1)
  timestamp: number
  isVerification: boolean
}

// ── 보상 테이블 ──────────────────────────────────────────────

export const REWARD_TABLE: Record<DailyReward["type"], { coins: number; description: string }> = {
  daily_complete: { coins: 2, description: "데일리 3개 완료" },
  streak_3: { coins: 3, description: "3일 연속 완료" },
  streak_7: { coins: 10, description: "7일 연속 완료" },
  streak_30: { coins: 50, description: "30일 연속 완료" },
  precision_milestone: { coins: 20, description: "정밀도 마일스톤 달성" },
}

// ── 축별 불확실도 계산 ───────────────────────────────────────

export function calculateAxisUncertainties(
  confidenceMap: Record<string, number>,
  responseCounts: Record<string, number>,
  lastMeasured: Record<string, number>
): AxisUncertainty[] {
  const allAxes: string[] = [...L1_AXES, ...L2_AXES]

  const now = Date.now()

  return allAxes.map((axis) => {
    const confidence = confidenceMap[axis] ?? 0
    const count = responseCounts[axis] ?? 0
    const lastAt = lastMeasured[axis] ?? null

    // uncertainty = 1 / (측정 횟수 × 평균 confidence + ε)
    const epsilon = 0.01
    const baseUncertainty = 1 / (count * Math.max(confidence, epsilon) + epsilon)

    // 시간 경과 보정: 오래되면 불확실도 증가
    let recencyPenalty = 0
    if (lastAt) {
      const daysSince = (now - lastAt) / (1000 * 60 * 60 * 24)
      recencyPenalty = Math.min(daysSince * 0.02, 0.3)
    }

    return {
      axis,
      uncertainty: round(Math.min(baseUncertainty + recencyPenalty, 1)),
      responseCount: count,
      avgConfidence: round(confidence),
      lastMeasuredAt: lastAt,
    }
  })
}

const L1_AXES: SocialDimension[] = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
]
const L2_AXES: TemperamentDimension[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
]

// ── 기대 정보 이득 ───────────────────────────────────────────

export function calculateExpectedInfoGain(
  question: ColdStartQuestion,
  uncertainties: AxisUncertainty[]
): number {
  const targetUncertainty = uncertainties.find((u) => u.axis === question.targetDimension)
  if (!targetUncertainty) return 0

  // 기본 이득: 해당 축의 불확실도
  let gain = targetUncertainty.uncertainty

  // 옵션의 벡터 다양성 보너스 (선택지가 다양할수록 정보 이득 높음)
  const deltas = question.options.map((o) => {
    const vals = Object.values(o.vectorDelta)
    return vals.length > 0 ? vals.reduce((a, b) => a + Math.abs(b), 0) : 0
  })
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / Math.max(deltas.length, 1)
  gain *= 1 + avgDelta

  // 다축 측정 보너스 (여러 축을 동시에 측정하면 효율적)
  const measuredAxes = new Set<string>()
  for (const option of question.options) {
    for (const dim of Object.keys(option.vectorDelta)) {
      measuredAxes.add(dim)
    }
  }
  if (measuredAxes.size > 1) {
    gain *= 1 + (measuredAxes.size - 1) * 0.15
  }

  return round(gain)
}

// ── CAT 기반 질문 선택 ───────────────────────────────────────

export function selectNextQuestions(
  questionPool: ColdStartQuestion[],
  answeredQuestionIds: string[],
  uncertainties: AxisUncertainty[],
  count: number = 3
): QuestionCandidate[] {
  // 1. 미출제 질문 필터
  const unanswered = questionPool.filter((q) => !answeredQuestionIds.includes(q.id))
  if (unanswered.length === 0) return []

  // 2. 가장 불확실한 축 상위 3개
  const sortedUncertainties = [...uncertainties].sort((a, b) => b.uncertainty - a.uncertainty)
  const topAxes = new Set(sortedUncertainties.slice(0, 3).map((u) => u.axis))

  // 3. 해당 축 관련 질문 우선 + 정보 이득 계산
  const candidates: QuestionCandidate[] = unanswered.map((q) => ({
    question: q,
    expectedInfoGain: calculateExpectedInfoGain(q, uncertainties),
    targetAxis: q.targetDimension,
  }))

  // 4. 타겟 축 매칭 보너스 적용
  for (const c of candidates) {
    if (topAxes.has(c.targetAxis)) {
      c.expectedInfoGain *= 1.5
      c.expectedInfoGain = round(c.expectedInfoGain)
    }
  }

  // 5. 정보 이득 순으로 정렬 후 상위 N개 반환
  candidates.sort((a, b) => b.expectedInfoGain - a.expectedInfoGain)
  return candidates.slice(0, count)
}

// ── 데일리 체크 상태 관리 ────────────────────────────────────

export function createDailyCheckState(
  userId: string,
  streak: number = 0,
  coinBalance: number = 0
): DailyCheckState {
  return {
    userId,
    date: toDateString(Date.now()),
    questionsAnswered: 0,
    questionsTarget: 3,
    completed: false,
    streak,
    coinBalance,
  }
}

export function recordDailyAnswer(state: DailyCheckState): DailyCheckState {
  const answered = state.questionsAnswered + 1
  const completed = answered >= state.questionsTarget

  return {
    ...state,
    questionsAnswered: answered,
    completed,
  }
}

// ── 보상 계산 (3회 완료 필수) ────────────────────────────────

export function calculateRewards(state: DailyCheckState): DailyReward[] {
  if (!state.completed) return [] // 부분 완료 시 보상 없음

  const rewards: DailyReward[] = []
  const newStreak = state.streak + 1

  // 기본 보상
  rewards.push({
    type: "daily_complete",
    ...REWARD_TABLE.daily_complete,
  })

  // 연속 보상
  if (newStreak >= 30 && newStreak % 30 === 0) {
    rewards.push({ type: "streak_30", ...REWARD_TABLE.streak_30 })
  } else if (newStreak >= 7 && newStreak % 7 === 0) {
    rewards.push({ type: "streak_7", ...REWARD_TABLE.streak_7 })
  } else if (newStreak >= 3 && newStreak % 3 === 0) {
    rewards.push({ type: "streak_3", ...REWARD_TABLE.streak_3 })
  }

  return rewards
}

export function applyRewards(state: DailyCheckState, rewards: DailyReward[]): DailyCheckState {
  const totalCoins = rewards.reduce((sum, r) => sum + r.coins, 0)
  return {
    ...state,
    streak: state.completed ? state.streak + 1 : 0,
    coinBalance: state.coinBalance + totalCoins,
  }
}

// ── 불성실 응답 검증 ─────────────────────────────────────────

const MIN_RESPONSE_DURATION_MS = 1000 // 1초 미만 = 너무 빠름
const MAX_SAME_PATTERN_COUNT = 5 // 연속 동일 선택 허용 횟수

export function validateResponse(
  response: UserResponseRecord,
  recentResponses: UserResponseRecord[]
): ResponseValidation {
  const issues: ResponseIssue[] = []

  // 1. 응답 시간 체크
  if (response.durationMs < MIN_RESPONSE_DURATION_MS) {
    issues.push("too_fast")
  }

  // 2. 패턴 반복 체크 (연속 같은 선택)
  if (recentResponses.length >= MAX_SAME_PATTERN_COUNT - 1) {
    const lastN = recentResponses.slice(-(MAX_SAME_PATTERN_COUNT - 1))
    const allSame = lastN.every((r) => r.selectedOptionId === response.selectedOptionId)
    if (allSame) {
      issues.push("same_pattern")
    }
  }

  // 3. 일관성 체크 (검증 질문인 경우)
  if (response.isVerification) {
    const original = recentResponses.find((r) => r.axis === response.axis && !r.isVerification)
    if (original) {
      // 방향이 반대면 inconsistent
      const directionMatch = Math.sign(original.direction) === Math.sign(response.direction)
      if (!directionMatch && original.direction !== 0 && response.direction !== 0) {
        issues.push("inconsistent")
      }
    }
  }

  // 결과 처리
  if (issues.length === 0) {
    return { valid: true, issues: [], weight: 1.0, message: null }
  }

  const weight = issues.includes("inconsistent") ? 0.5 : issues.includes("same_pattern") ? 0.0 : 0.7

  const message = getWarningMessage(issues[0])

  return { valid: false, issues, weight, message }
}

function getWarningMessage(issue: ResponseIssue): string {
  switch (issue) {
    case "too_fast":
      return "천천히 읽고 답해주세요"
    case "same_pattern":
      return "같은 답만 고르시는 것 같아요, 신중히 선택해주세요"
    case "inconsistent":
      return "이전 답변과 다른데, 다시 한번 생각해보세요"
  }
}

// ── 신뢰도 스코어 ────────────────────────────────────────────

export function calculateTrustScore(userId: string, responses: UserResponseRecord[]): TrustScore {
  const penalties: TrustPenalty[] = []

  // 1. 응답 시간 페널티
  const tooFastCount = responses.filter((r) => r.durationMs < MIN_RESPONSE_DURATION_MS).length
  if (tooFastCount > 3) {
    penalties.push({ type: "too_fast", count: tooFastCount, penalty: 0.1 })
  }

  // 2. 패턴 반복 페널티
  const patternIssues = detectPatternIssues(responses)
  if (patternIssues > 2) {
    penalties.push({ type: "same_pattern", count: patternIssues, penalty: 0.15 })
  }

  // 3. 일관성 페널티
  const inconsistencyRate = calculateInconsistencyRate(responses)
  if (inconsistencyRate > 0.3) {
    penalties.push({
      type: "inconsistent",
      count: Math.round(inconsistencyRate * responses.length),
      penalty: 0.2,
    })
  }

  const totalPenalty = penalties.reduce((sum, p) => sum + p.penalty, 0)

  return {
    userId,
    score: round(Math.max(1.0 - totalPenalty, 0.5)), // 최소 0.5 보장
    penalties,
    calculatedAt: Date.now(),
  }
}

function detectPatternIssues(responses: UserResponseRecord[]): number {
  if (responses.length < 5) return 0

  let issues = 0
  for (let i = 4; i < responses.length; i++) {
    const window = responses.slice(i - 4, i + 1)
    if (window.every((r) => r.selectedOptionId === window[0].selectedOptionId)) {
      issues++
    }
  }
  return issues
}

function calculateInconsistencyRate(responses: UserResponseRecord[]): number {
  const verificationResponses = responses.filter((r) => r.isVerification)
  if (verificationResponses.length === 0) return 0

  let inconsistent = 0
  for (const vr of verificationResponses) {
    const original = responses.find(
      (r) => r.axis === vr.axis && !r.isVerification && r.timestamp < vr.timestamp
    )
    if (original) {
      if (Math.sign(original.direction) !== Math.sign(vr.direction) && original.direction !== 0) {
        inconsistent++
      }
    }
  }

  return round(inconsistent / verificationResponses.length)
}

// ── 유틸 ─────────────────────────────────────────────────────

function toDateString(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
