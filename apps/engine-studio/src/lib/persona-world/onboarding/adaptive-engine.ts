// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4.0 — Adaptive Onboarding Engine
// 설계서 §9.2 확장: CAT(Computerized Adaptive Testing)
//
// 고정 24문항 → 적응형 20~28문항 가변
// 답변마다 불확실도 재계산 → 가장 정보 획득량 높은 질문 선택
// ═══════════════════════════════════════════════════════════════

import {
  clamp,
  L1_BASE,
  L2_BASE,
  L3_BASE,
  L1_DIMS,
  L2_DIMS,
  L3_DIMS,
  computeDimensionUncertainty,
  computeAverageUncertainty,
  computeQuestionInfoGain,
  getTopUncertainDimensions,
  DEFAULT_TERMINATION_CONFIG,
} from "@deepsight/vector-core"
import type {
  OnboardingQuestion,
  OnboardingAnswer,
  AdaptiveSession,
  UncertaintyProfile,
  DimensionUncertainty,
  TerminationConfig,
  TerminationResult,
  AdaptiveQuestionMeta,
  AdaptiveQuestionWithMeta,
  AdaptiveProgress,
  AdaptiveOnboardingResult,
} from "@deepsight/vector-core"
import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
} from "@deepsight/shared-types"
import type { OnboardingResult } from "../types"
import { crossValidateWithParadox } from "./questions"

// ── DI 프로바이더 ──────────────────────────────────────────────

/** 적응형 온보딩에 필요한 데이터 프로바이더 */
export interface AdaptiveOnboardingProvider {
  /** 적응형 질문 풀 전체 로드 (isAdaptive=true) */
  getAdaptiveQuestionPool(): Promise<AdaptivePoolQuestion[]>
  /** 세션 저장 (인메모리 또는 DB) */
  saveSession(session: AdaptiveSession): Promise<void>
  /** 세션 로드 */
  loadSession(sessionId: string): Promise<AdaptiveSession | null>
  /** 온보딩 결과 저장 (기존 cold-start와 동일) */
  saveOnboardingResult(
    userId: string,
    result: OnboardingResult,
    level: "QUICK" | "STANDARD" | "DEEP"
  ): Promise<void>
}

/** DB에서 로드되는 질문 풀 질문 (질문 데이터 + 적응형 메타) */
export interface AdaptivePoolQuestion {
  /** OnboardingQuestion 데이터 */
  question: OnboardingQuestion
  /** 적응형 메타데이터 */
  meta: AdaptiveQuestionMeta
  /** DB의 questionText */
  text: string
  /** DB의 questionType */
  type: string
  /** 옵션의 label 목록 (UI 표시용) */
  optionLabels: Array<{ key: string; label: string }>
}

// ── 세션 초기화 ──────────────────────────────────────────────

/**
 * 새로운 적응형 온보딩 세션 생성.
 */
export function createAdaptiveSession(sessionId: string, userId: string): AdaptiveSession {
  return {
    sessionId,
    userId,
    questionCount: 0,
    answeredQuestionIds: [],
    currentL1: { ...L1_BASE },
    currentL2: { ...L2_BASE },
    currentL3: { ...L3_BASE },
    uncertainty: createInitialUncertainty(),
    status: "active",
    startedAt: new Date(),
    lastAnsweredAt: null,
  }
}

/**
 * 초기 불확실도 프로필 생성 (모든 차원 = 1.0).
 */
function createInitialUncertainty(): UncertaintyProfile {
  const makeDU = (value: number): DimensionUncertainty => ({
    value,
    measurementCount: 0,
    uncertainty: 1.0,
  })

  const l1 = {} as Record<SocialDimension, DimensionUncertainty>
  for (const dim of L1_DIMS) l1[dim] = makeDU(0.5)

  const l2 = {} as Record<TemperamentDimension, DimensionUncertainty>
  for (const dim of L2_DIMS) l2[dim] = makeDU(0.5)

  const l3 = {} as Record<NarrativeDimension, DimensionUncertainty>
  for (const dim of L3_DIMS) l3[dim] = makeDU(0.5)

  return { l1, l2, l3 }
}

// ── 질문 선택 알고리즘 ────────────────────────────────────────

/**
 * 다음 최적 질문 선택.
 *
 * 알고리즘:
 * 1. 이미 답변한 질문 제외
 * 2. minPriorAnswers 미충족 질문 제외
 * 3. 나머지 중 기대 정보 획득량이 가장 높은 질문 선택
 * 4. 단, "core" 카테고리 질문은 첫 8문항 내에서 우선 선택
 */
export function selectNextQuestion(
  session: AdaptiveSession,
  pool: AdaptivePoolQuestion[],
  config: TerminationConfig = DEFAULT_TERMINATION_CONFIG
): AdaptivePoolQuestion | null {
  // 이미 답변한 질문 제외
  const answeredSet = new Set(session.answeredQuestionIds)
  const candidates = pool.filter(
    (pq) => !answeredSet.has(pq.question.id) && pq.meta.minPriorAnswers <= session.questionCount
  )

  if (candidates.length === 0) return null

  // Phase 1 전략: 처음 8문항은 core 질문 우선 (최소 커버리지 보장)
  if (session.questionCount < 8) {
    const coreFirst = candidates.filter((pq) => pq.meta.poolCategory === "core")
    if (coreFirst.length > 0) {
      return selectByInfoGain(coreFirst, session)
    }
  }

  // Phase 2 전략 (8~15문항): deepening + cross_layer 우선
  if (session.questionCount >= 8 && session.questionCount < 16) {
    const phase2Candidates = candidates.filter(
      (pq) => pq.meta.poolCategory === "deepening" || pq.meta.poolCategory === "cross_layer"
    )
    if (phase2Candidates.length > 0) {
      return selectByInfoGain(phase2Candidates, session)
    }
  }

  // Phase 3 전략 (16문항~): verification + narrative + 나머지
  // 패러독스 감지된 차원의 verification 질문 우선
  if (session.questionCount >= 16) {
    const verifyOrNarrative = candidates.filter(
      (pq) => pq.meta.poolCategory === "verification" || pq.meta.poolCategory === "narrative"
    )
    if (verifyOrNarrative.length > 0) {
      return selectByInfoGain(verifyOrNarrative, session)
    }
  }

  // 범용: 정보 획득량 최대 질문 선택
  return selectByInfoGain(candidates, session)
}

/**
 * 후보 질문 중 정보 획득량이 가장 높은 질문 선택.
 * 동점 시 랜덤 (다양성 확보).
 */
function selectByInfoGain(
  candidates: AdaptivePoolQuestion[],
  session: AdaptiveSession
): AdaptivePoolQuestion {
  const scored = candidates.map((pq) => ({
    pq,
    infoGain: computeQuestionInfoGain(pq.question, pq.meta, session.uncertainty),
  }))

  scored.sort((a, b) => b.infoGain - a.infoGain)

  // 상위 3개 중 랜덤 선택 (다양성)
  const topN = Math.min(3, scored.length)
  const idx = Math.floor(Math.random() * topN)
  return scored[idx].pq
}

// ── 답변 처리 + 벡터 업데이트 ────────────────────────────────

/**
 * 답변을 처리하여 세션의 벡터와 불확실도를 업데이트.
 *
 * 기존 computeL1Vector와 동일한 가중치 누적 방식이지만,
 * 1문항씩 점진적으로 적용.
 */
export function processAdaptiveAnswer(
  session: AdaptiveSession,
  question: OnboardingQuestion,
  answer: OnboardingAnswer
): AdaptiveSession {
  const selectedOption = question.options.find((o) => o.key === String(answer.value))
  if (!selectedOption) return session

  // 벡터 업데이트
  const updatedL1 = { ...session.currentL1 }
  const updatedL2 = { ...session.currentL2 }
  const updatedL3 = { ...session.currentL3 }
  const updatedUncertainty: UncertaintyProfile = {
    l1: { ...session.uncertainty.l1 },
    l2: { ...session.uncertainty.l2 },
    l3: { ...session.uncertainty.l3 },
  }

  // L1 가중치 적용
  if (selectedOption.l1Weights) {
    for (const [dim, weight] of Object.entries(selectedOption.l1Weights)) {
      const d = dim as SocialDimension
      if (weight != null && updatedL1[d] != null) {
        updatedL1[d] = clamp(updatedL1[d] + weight)
        // 불확실도 업데이트
        const du = updatedUncertainty.l1[d]
        const newCount = du.measurementCount + 1
        updatedUncertainty.l1[d] = {
          value: updatedL1[d],
          measurementCount: newCount,
          uncertainty: computeDimensionUncertainty(updatedL1[d], newCount),
        }
      }
    }
  }

  // L2 가중치 적용
  if (selectedOption.l2Weights) {
    for (const [dim, weight] of Object.entries(selectedOption.l2Weights)) {
      const d = dim as TemperamentDimension
      if (weight != null && updatedL2[d] != null) {
        updatedL2[d] = clamp(updatedL2[d] + weight)
        const du = updatedUncertainty.l2[d]
        const newCount = du.measurementCount + 1
        updatedUncertainty.l2[d] = {
          value: updatedL2[d],
          measurementCount: newCount,
          uncertainty: computeDimensionUncertainty(updatedL2[d], newCount),
        }
      }
    }
  }

  // L3 가중치 적용
  if (selectedOption.l3Weights) {
    for (const [dim, weight] of Object.entries(selectedOption.l3Weights)) {
      const d = dim as NarrativeDimension
      if (weight != null && updatedL3[d] != null) {
        updatedL3[d] = clamp(updatedL3[d] + weight)
        const du = updatedUncertainty.l3[d]
        const newCount = du.measurementCount + 1
        updatedUncertainty.l3[d] = {
          value: updatedL3[d],
          measurementCount: newCount,
          uncertainty: computeDimensionUncertainty(updatedL3[d], newCount),
        }
      }
    }
  }

  return {
    ...session,
    questionCount: session.questionCount + 1,
    answeredQuestionIds: [...session.answeredQuestionIds, question.id],
    currentL1: updatedL1,
    currentL2: updatedL2,
    currentL3: updatedL3,
    uncertainty: updatedUncertainty,
    lastAnsweredAt: new Date(),
  }
}

// ── 종료 판정 ──────────────────────────────────────────────────

/**
 * 세션을 종료해야 하는지 판정.
 *
 * 조건:
 * 1. questionCount >= maxQuestions → 강제 종료
 * 2. questionCount >= minQuestions AND avgUncertainty < threshold → 수렴 종료
 * 3. 모든 차원이 최소 1회 이상 측정되었을 때만 종료 허용
 */
export function checkTermination(
  session: AdaptiveSession,
  config: TerminationConfig = DEFAULT_TERMINATION_CONFIG
): TerminationResult {
  const avgUncertainty = computeAverageUncertainty(session.uncertainty)

  // Hard limit
  if (session.questionCount >= config.maxQuestions) {
    return {
      shouldTerminate: true,
      reason: "max_reached",
      estimatedRemaining: 0,
      avgUncertainty,
    }
  }

  // 최소 문항 미충족
  if (session.questionCount < config.minQuestions) {
    const remaining = estimateRemainingQuestions(session, config)
    return {
      shouldTerminate: false,
      reason: "not_ready",
      estimatedRemaining: remaining,
      avgUncertainty,
    }
  }

  // 모든 차원 최소 측정 횟수 확인
  const allMeasured = checkAllDimensionsMeasured(session.uncertainty, config.minMeasurementsPerDim)
  if (!allMeasured) {
    const remaining = estimateRemainingQuestions(session, config)
    return {
      shouldTerminate: false,
      reason: "not_ready",
      estimatedRemaining: remaining,
      avgUncertainty,
    }
  }

  // 수렴 체크
  if (avgUncertainty <= config.convergenceThreshold) {
    return {
      shouldTerminate: true,
      reason: "converged",
      estimatedRemaining: 0,
      avgUncertainty,
    }
  }

  // 아직 수렴 안 됨
  const remaining = estimateRemainingQuestions(session, config)
  return {
    shouldTerminate: false,
    reason: "not_ready",
    estimatedRemaining: remaining,
    avgUncertainty,
  }
}

/**
 * 남은 예상 질문 수 추정.
 */
function estimateRemainingQuestions(session: AdaptiveSession, config: TerminationConfig): number {
  const minRemaining = Math.max(0, config.minQuestions - session.questionCount)
  const maxRemaining = config.maxQuestions - session.questionCount
  const avgUncertainty = computeAverageUncertainty(session.uncertainty)

  // 불확실도 기반 예상: 수렴에 얼마나 가까운지
  const convergenceRatio = Math.min(1, avgUncertainty / config.convergenceThreshold)
  const uncertaintyBasedRemaining = Math.ceil(
    convergenceRatio * (config.maxQuestions - config.minQuestions)
  )

  return Math.min(maxRemaining, Math.max(minRemaining, uncertaintyBasedRemaining))
}

/**
 * 모든 차원이 최소 측정 횟수를 충족하는지 확인.
 */
function checkAllDimensionsMeasured(profile: UncertaintyProfile, minMeasurements: number): boolean {
  for (const du of Object.values(profile.l1)) {
    if (du.measurementCount < minMeasurements) return false
  }
  for (const du of Object.values(profile.l2)) {
    if (du.measurementCount < minMeasurements) return false
  }
  for (const du of Object.values(profile.l3)) {
    if (du.measurementCount < minMeasurements) return false
  }
  return true
}

// ── 결과 생성 ──────────────────────────────────────────────────

/**
 * 적응형 온보딩 세션에서 최종 결과 생성.
 *
 * 교차검증(Phase 3 패러독스 감지)은 충분한 데이터가 있을 때만 적용.
 */
export function buildAdaptiveResult(session: AdaptiveSession): AdaptiveOnboardingResult {
  // L2 데이터가 충분하면 교차검증 수행
  const hasL2Data = Object.values(session.uncertainty.l2).some((du) => du.measurementCount > 0)
  const hasL3Data = Object.values(session.uncertainty.l3).some((du) => du.measurementCount > 0)

  let finalL1 = session.currentL1
  let finalL2 = session.currentL2
  let finalL3 = session.currentL3
  let profileLevel: "BASIC" | "STANDARD" | "ADVANCED" = "BASIC"
  let confidence = 0.65

  if (hasL2Data && hasL3Data && session.questionCount >= 16) {
    // 교차검증 수행 (빈 Phase 3 질문 배열 — 적응형에서는 이미 검증 질문이 포함됨)
    const crossResult = crossValidateWithParadox(
      session.currentL1,
      session.currentL2,
      session.currentL3,
      [], // 적응형에서는 검증 질문이 인라인으로 처리됨
      []
    )
    finalL1 = crossResult.adjustedL1
    finalL2 = crossResult.adjustedL2
    finalL3 = crossResult.adjustedL3
    profileLevel = "ADVANCED"
    confidence = computeAdaptiveConfidence(session)
  } else if (hasL2Data) {
    profileLevel = "STANDARD"
    confidence = computeAdaptiveConfidence(session)
  }

  // 불확실도 요약
  const uncertaintySummary: AdaptiveOnboardingResult["uncertaintySummary"] = []
  for (const [dim, du] of Object.entries(session.uncertainty.l1)) {
    uncertaintySummary.push({
      dimension: dim,
      layer: "L1",
      finalUncertainty: du.uncertainty,
      measurementCount: du.measurementCount,
    })
  }
  for (const [dim, du] of Object.entries(session.uncertainty.l2)) {
    uncertaintySummary.push({
      dimension: dim,
      layer: "L2",
      finalUncertainty: du.uncertainty,
      measurementCount: du.measurementCount,
    })
  }
  for (const [dim, du] of Object.entries(session.uncertainty.l3)) {
    uncertaintySummary.push({
      dimension: dim,
      layer: "L3",
      finalUncertainty: du.uncertainty,
      measurementCount: du.measurementCount,
    })
  }

  return {
    l1Vector: finalL1,
    l2Vector: finalL2,
    l3Vector: finalL3,
    profileLevel,
    confidence,
    totalQuestions: session.questionCount,
    uncertaintySummary,
  }
}

/**
 * 적응형 온보딩의 confidence 계산.
 *
 * 기존 고정형: QUICK=0.65, STANDARD=0.80, DEEP=0.93
 * 적응형: 문항 수 + 불확실도 기반 동적 계산 (0.65~0.95)
 */
function computeAdaptiveConfidence(session: AdaptiveSession): number {
  const avgUncertainty = computeAverageUncertainty(session.uncertainty)
  // confidence = 1 - uncertainty, but scaled to 0.65~0.95 range
  const rawConfidence = 1 - avgUncertainty
  const scaled = 0.65 + rawConfidence * 0.3
  return Math.round(Math.min(0.95, scaled) * 100) / 100
}

// ── 진행 현황 ──────────────────────────────────────────────────

/**
 * 현재 적응형 세션의 진행 현황 생성.
 */
export function buildAdaptiveProgress(
  session: AdaptiveSession,
  config: TerminationConfig = DEFAULT_TERMINATION_CONFIG
): AdaptiveProgress {
  const termination = checkTermination(session, config)
  const topUncertain = getTopUncertainDimensions(session.uncertainty, 3)

  const estimatedTotal = session.questionCount + termination.estimatedRemaining
  // 수렴도: uncertainty가 threshold 이하면 100%, 아니면 비율
  const convergencePercent = Math.min(
    100,
    Math.round(((1 - termination.avgUncertainty) / (1 - config.convergenceThreshold)) * 100)
  )

  return {
    answered: session.questionCount,
    estimatedTotal: Math.max(config.minQuestions, Math.min(config.maxQuestions, estimatedTotal)),
    estimatedRemaining: termination.estimatedRemaining,
    convergencePercent,
    uncertainDimensions: topUncertain.map((d) => `${d.layer}.${d.dimension}`),
  }
}

// ── 질문을 UI용 형태로 변환 ──────────────────────────────────

/**
 * AdaptivePoolQuestion을 AdaptiveQuestionWithMeta로 변환.
 */
export function toQuestionWithMeta(
  poolQuestion: AdaptivePoolQuestion,
  session: AdaptiveSession
): AdaptiveQuestionWithMeta {
  const currentInfoGain = computeQuestionInfoGain(
    poolQuestion.question,
    poolQuestion.meta,
    session.uncertainty
  )

  return {
    id: poolQuestion.question.id,
    text: poolQuestion.text,
    type: poolQuestion.type,
    options: poolQuestion.optionLabels,
    category: poolQuestion.meta.poolCategory,
    focusDimensions: poolQuestion.meta.targetDimensions,
    currentInfoGain,
  }
}

// ── 메인 오케스트레이션 함수 ──────────────────────────────────

/**
 * 적응형 온보딩 세션 시작.
 */
export async function startAdaptiveOnboarding(
  userId: string,
  provider: AdaptiveOnboardingProvider,
  config: TerminationConfig = DEFAULT_TERMINATION_CONFIG
): Promise<{ session: AdaptiveSession; firstQuestion: AdaptiveQuestionWithMeta }> {
  const sessionId = crypto.randomUUID()
  const session = createAdaptiveSession(sessionId, userId)
  const pool = await provider.getAdaptiveQuestionPool()

  const firstPoolQ = selectNextQuestion(session, pool, config)
  if (!firstPoolQ) {
    throw new Error("No questions available in adaptive pool")
  }

  await provider.saveSession(session)

  return {
    session,
    firstQuestion: toQuestionWithMeta(firstPoolQ, session),
  }
}

/**
 * 적응형 온보딩 답변 처리.
 *
 * 1. 답변 → 벡터/불확실도 업데이트
 * 2. 종료 판정
 * 3. 미종료 시 다음 질문 선택
 * 4. 종료 시 결과 생성 + 저장
 */
export async function processAdaptiveOnboardingAnswer(
  sessionId: string,
  answer: { questionId: string; value: string | number | string[] },
  provider: AdaptiveOnboardingProvider,
  config: TerminationConfig = DEFAULT_TERMINATION_CONFIG
): Promise<{
  completed: boolean
  nextQuestion?: AdaptiveQuestionWithMeta
  progress: AdaptiveProgress
  result?: AdaptiveOnboardingResult
}> {
  const session = await provider.loadSession(sessionId)
  if (!session || session.status !== "active") {
    throw new Error("Session not found or not active")
  }

  const pool = await provider.getAdaptiveQuestionPool()
  const poolQuestion = pool.find((pq) => pq.question.id === answer.questionId)
  if (!poolQuestion) {
    throw new Error(`Question not found: ${answer.questionId}`)
  }

  // 1. 답변 처리
  const onboardingAnswer: OnboardingAnswer = {
    questionId: answer.questionId,
    value: answer.value,
  }
  const updatedSession = processAdaptiveAnswer(session, poolQuestion.question, onboardingAnswer)

  // 2. 종료 판정
  const termination = checkTermination(updatedSession, config)
  const progress = buildAdaptiveProgress(updatedSession, config)

  if (termination.shouldTerminate) {
    // 세션 완료
    const completedSession: AdaptiveSession = {
      ...updatedSession,
      status: "completed",
    }
    await provider.saveSession(completedSession)

    const result = buildAdaptiveResult(completedSession)

    // OnboardingResult 형태로 저장 (기존 시스템 호환)
    const onboardingResult: OnboardingResult = {
      l1Vector: result.l1Vector,
      l2Vector: result.l2Vector,
      l3Vector: result.l3Vector,
      profileLevel: result.profileLevel,
      confidence: result.confidence,
    }
    await provider.saveOnboardingResult(
      completedSession.userId,
      onboardingResult,
      result.profileLevel === "ADVANCED"
        ? "DEEP"
        : result.profileLevel === "STANDARD"
          ? "STANDARD"
          : "QUICK"
    )

    return { completed: true, progress, result }
  }

  // 3. 다음 질문 선택
  const nextPoolQ = selectNextQuestion(updatedSession, pool, config)
  await provider.saveSession(updatedSession)

  if (!nextPoolQ) {
    // 더 이상 질문 없음 → 강제 완료
    const completedSession: AdaptiveSession = {
      ...updatedSession,
      status: "completed",
    }
    await provider.saveSession(completedSession)

    const result = buildAdaptiveResult(completedSession)
    const onboardingResult: OnboardingResult = {
      l1Vector: result.l1Vector,
      l2Vector: result.l2Vector,
      l3Vector: result.l3Vector,
      profileLevel: result.profileLevel,
      confidence: result.confidence,
    }
    await provider.saveOnboardingResult(completedSession.userId, onboardingResult, "DEEP")

    return { completed: true, progress, result }
  }

  return {
    completed: false,
    nextQuestion: toQuestionWithMeta(nextPoolQ, updatedSession),
    progress,
  }
}
