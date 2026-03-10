// ═══════════════════════════════════════════════════════════════
// @deepsight/vector-core — Adaptive Onboarding Types & Utilities
// 설계서 §9.2 확장: CAT(Computerized Adaptive Testing)
// 20~28문항 가변, 불확실도 기반 질문 선택
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
} from "@deepsight/shared-types"
import type { OnboardingQuestion, OnboardingAnswer } from "./types"

// ── 적응형 세션 상태 ──────────────────────────────────────────

/** 적응형 온보딩 세션 상태 */
export interface AdaptiveSession {
  sessionId: string
  userId: string
  /** 현재까지 응답한 질문 수 */
  questionCount: number
  /** 응답한 질문 ID 목록 */
  answeredQuestionIds: string[]
  /** 현재 L1 벡터 (점진 업데이트) */
  currentL1: SocialPersonaVector
  /** 현재 L2 벡터 (점진 업데이트) */
  currentL2: CoreTemperamentVector
  /** 현재 L3 벡터 (점진 업데이트) */
  currentL3: NarrativeDriveVector
  /** 차원별 불확실도 */
  uncertainty: UncertaintyProfile
  /** 세션 상태 */
  status: "active" | "completed" | "abandoned"
  /** 세션 시작 시각 */
  startedAt: Date
  /** 마지막 답변 시각 */
  lastAnsweredAt: Date | null
}

// ── 불확실도 프로필 ──────────────────────────────────────────

/** 전체 정량 차원 불확실도 프로필 */
export interface UncertaintyProfile {
  l1: Record<SocialDimension, DimensionUncertainty>
  l2: Record<TemperamentDimension, DimensionUncertainty>
  l3: Record<NarrativeDimension, DimensionUncertainty>
}

/** 개별 차원 불확실도 */
export interface DimensionUncertainty {
  /** 현재 벡터 값 */
  value: number
  /** 이 차원을 측정한 질문 수 */
  measurementCount: number
  /** 불확실도 (0.0=확실, 1.0=불확실) */
  uncertainty: number
}

// ── 종료 조건 ──────────────────────────────────────────────────

/** 적응형 온보딩 종료 조건 설정 */
export interface TerminationConfig {
  /** 최소 문항 수 (기본 20) */
  minQuestions: number
  /** 최대 문항 수 (기본 28) */
  maxQuestions: number
  /** 불확실도 수렴 임계값 — 평균 불확실도가 이 이하면 종료 허용 (기본 0.35) */
  convergenceThreshold: number
  /** 개별 차원 최소 측정 횟수 — 이 이하면 종료 불허 (기본 1) */
  minMeasurementsPerDim: number
}

/** 종료 판정 결과 */
export interface TerminationResult {
  /** 종료해야 하는가 */
  shouldTerminate: boolean
  /** 종료 이유 */
  reason: "converged" | "max_reached" | "not_ready"
  /** 예상 남은 문항 수 */
  estimatedRemaining: number
  /** 현재 평균 불확실도 */
  avgUncertainty: number
}

// ── 질문 풀 메타데이터 ────────────────────────────────────────

/** 적응형 질문 풀 카테고리 */
export type QuestionPoolCategory =
  | "core" // 필수 질문 (최소 커버리지 보장)
  | "deepening" // 불확실 차원 심층 탐색
  | "cross_layer" // L1↔L2 교차 측정
  | "verification" // 패러독스 검증
  | "narrative" // L3 서사 탐색

/** 질문 풀 확장 메타데이터 (DB PsychProfileTemplate에 저장) */
export interface AdaptiveQuestionMeta {
  /** 적응형 풀에 포함되는 질문인가 */
  isAdaptive: boolean
  /** 풀 카테고리 */
  poolCategory: QuestionPoolCategory
  /** 기대 정보 획득량 (0.0~1.0) — 높을수록 많은 차원을 한 번에 측정 */
  informationGain: number
  /** 이 질문이 측정하는 주요 차원 (가중치 키 기준) */
  targetDimensions: string[]
  /** 이 질문을 묻기 위한 최소 응답 문항 수 (0이면 처음부터 가능) */
  minPriorAnswers: number
}

// ── 적응형 API 타입 ──────────────────────────────────────────

/** 적응형 세션 시작 요청 */
export interface AdaptiveStartRequest {
  userId: string
}

/** 적응형 세션 시작 응답 */
export interface AdaptiveStartResponse {
  sessionId: string
  firstQuestion: AdaptiveQuestionWithMeta
  totalEstimated: number // 예상 총 문항 (20~28)
}

/** 답변 제출 + 다음 질문 요청 */
export interface AdaptiveAnswerRequest {
  sessionId: string
  questionId: string
  value: string | number | string[]
}

/** 답변 제출 응답 */
export interface AdaptiveAnswerResponse {
  /** 세션이 완료되었는가 */
  completed: boolean
  /** 다음 질문 (completed=false일 때) */
  nextQuestion?: AdaptiveQuestionWithMeta
  /** 진행 현황 */
  progress: AdaptiveProgress
  /** 완료 시 결과 (completed=true일 때) */
  result?: AdaptiveOnboardingResult
}

/** 적응형 진행 현황 */
export interface AdaptiveProgress {
  answered: number
  estimatedTotal: number
  estimatedRemaining: number
  convergencePercent: number // 0~100
  uncertainDimensions: string[] // 아직 불확실한 차원 이름들
}

/** 질문 + 적응형 메타데이터 */
export interface AdaptiveQuestionWithMeta {
  id: string
  text: string
  type: string
  options: Array<{ key: string; label: string }>
  category: QuestionPoolCategory
  /** 이 질문이 타겟하는 차원들 (UI에서 표시 가능) */
  focusDimensions: string[]
  /** 이 시점에서 이 질문의 정보 획득량 */
  currentInfoGain: number
}

/** 적응형 온보딩 최종 결과 */
export interface AdaptiveOnboardingResult {
  l1Vector: SocialPersonaVector
  l2Vector: CoreTemperamentVector
  l3Vector: NarrativeDriveVector
  profileLevel: "BASIC" | "STANDARD" | "ADVANCED"
  confidence: number
  totalQuestions: number
  /** 차원별 최종 불확실도 요약 */
  uncertaintySummary: Array<{
    dimension: string
    layer: "L1" | "L2" | "L3"
    finalUncertainty: number
    measurementCount: number
  }>
}

// ── 불확실도 계산 함수 ────────────────────────────────────────

/**
 * 단일 차원의 불확실도 계산.
 *
 * 공식: baseUncertainty × measurementDecay
 * - baseUncertainty = 1.0 - |value - 0.5| × 2
 *   (0.5에 가까울수록 불확실, 극단값에 가까울수록 확실)
 * - measurementDecay = 1 / (1 + measurementCount × 0.4)
 *   (측정 횟수 늘어날수록 불확실도 감소)
 *
 * 결과: 0.0(완전 확실) ~ 1.0(완전 불확실)
 */
export function computeDimensionUncertainty(value: number, measurementCount: number): number {
  const baseUncertainty = 1.0 - Math.abs(value - 0.5) * 2
  const measurementDecay = 1 / (1 + measurementCount * 0.4)
  return Math.round(baseUncertainty * measurementDecay * 100) / 100
}

/**
 * 전체 UncertaintyProfile의 평균 불확실도 계산.
 */
export function computeAverageUncertainty(profile: UncertaintyProfile): number {
  const all: number[] = []
  for (const du of Object.values(profile.l1)) all.push(du.uncertainty)
  for (const du of Object.values(profile.l2)) all.push(du.uncertainty)
  for (const du of Object.values(profile.l3)) all.push(du.uncertainty)

  if (all.length === 0) return 1.0
  const sum = all.reduce((s, u) => s + u, 0)
  return Math.round((sum / all.length) * 100) / 100
}

/**
 * 불확실도가 높은 상위 N개 차원 반환.
 */
export function getTopUncertainDimensions(
  profile: UncertaintyProfile,
  n: number = 3
): Array<{ dimension: string; layer: "L1" | "L2" | "L3"; uncertainty: number }> {
  const all: Array<{ dimension: string; layer: "L1" | "L2" | "L3"; uncertainty: number }> = []

  for (const [dim, du] of Object.entries(profile.l1)) {
    all.push({ dimension: dim, layer: "L1", uncertainty: du.uncertainty })
  }
  for (const [dim, du] of Object.entries(profile.l2)) {
    all.push({ dimension: dim, layer: "L2", uncertainty: du.uncertainty })
  }
  for (const [dim, du] of Object.entries(profile.l3)) {
    all.push({ dimension: dim, layer: "L3", uncertainty: du.uncertainty })
  }

  return all.sort((a, b) => b.uncertainty - a.uncertainty).slice(0, n)
}

// ── 정보 획득량 계산 ──────────────────────────────────────────

/**
 * 질문의 현재 기대 정보 획득량 계산.
 *
 * 이 질문이 측정하는 차원들의 불확실도 합 × 질문의 기본 정보 획득량.
 * 이미 불확실도가 낮은 차원을 측정하는 질문은 낮은 점수를 받음.
 */
export function computeQuestionInfoGain(
  question: OnboardingQuestion,
  meta: AdaptiveQuestionMeta,
  profile: UncertaintyProfile
): number {
  let totalUncertainty = 0
  let dimCount = 0

  for (const option of question.options) {
    // L1 차원
    if (option.l1Weights) {
      for (const dim of Object.keys(option.l1Weights) as SocialDimension[]) {
        if (profile.l1[dim]) {
          totalUncertainty += profile.l1[dim].uncertainty
          dimCount++
        }
      }
    }
    // L2 차원
    if (option.l2Weights) {
      for (const dim of Object.keys(option.l2Weights) as TemperamentDimension[]) {
        if (profile.l2[dim]) {
          totalUncertainty += profile.l2[dim].uncertainty
          dimCount++
        }
      }
    }
    // L3 차원
    if (option.l3Weights) {
      for (const dim of Object.keys(option.l3Weights) as NarrativeDimension[]) {
        if (profile.l3[dim]) {
          totalUncertainty += profile.l3[dim].uncertainty
          dimCount++
        }
      }
    }
    // 첫 번째 옵션의 차원 셋으로 충분 (같은 질문의 옵션들은 보통 같은 차원 측정)
    break
  }

  if (dimCount === 0) return 0
  const avgDimUncertainty = totalUncertainty / dimCount
  return Math.round(avgDimUncertainty * meta.informationGain * 100) / 100
}

// ── 기본 설정 ──────────────────────────────────────────────────

export const DEFAULT_TERMINATION_CONFIG: TerminationConfig = {
  minQuestions: 20,
  maxQuestions: 28,
  convergenceThreshold: 0.35,
  minMeasurementsPerDim: 1,
}
