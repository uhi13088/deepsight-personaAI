// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Onboarding Engine
// 구현계획서 §8, 설계서 §9.2
// Cold Start 질문 기반 벡터 생성
// QUICK → L1, STANDARD → L1+L2, DEEP → L1+L2+메타
// ═══════════════════════════════════════════════════════════════

import type { OnboardingAnswer, OnboardingResult } from "../types"
import {
  computeL1Vector,
  computeL2Vector,
  computeL3Vector,
  crossValidateWithParadox,
  ONBOARDING_CONFIDENCE,
} from "./questions"
import type { OnboardingQuestion, OnboardingQuestionsProvider } from "./questions"

/**
 * 온보딩 데이터 프로바이더 (DI).
 */
export interface OnboardingDataProvider extends OnboardingQuestionsProvider {
  /**
   * 온보딩 결과 저장 (유저 ID, 결과, 설문 레벨).
   */
  saveOnboardingResult(
    userId: string,
    result: OnboardingResult,
    level: "QUICK" | "STANDARD" | "DEEP"
  ): Promise<void>
}

/**
 * Cold Start 질문 기반 벡터 생성.
 *
 * 설계서 §9.2:
 * - QUICK (Phase 1) → L1 7D → BASIC
 * - STANDARD (Phase 1+2) → L1 7D + L2 5D → STANDARD
 * - DEEP (Phase 1+2+3) → L1 7D + L2 5D + 교차검증 → ADVANCED
 */
export async function processOnboardingAnswers(
  answers: OnboardingAnswer[],
  level: "QUICK" | "STANDARD" | "DEEP",
  provider: OnboardingDataProvider
): Promise<OnboardingResult> {
  // Phase 1: L1 벡터 산출
  const phase1Questions = await provider.getQuestionsByPhase(1)
  const l1Vector = computeL1Vector(phase1Questions, answers)

  if (level === "QUICK") {
    return {
      l1Vector,
      profileLevel: "BASIC",
      confidence: ONBOARDING_CONFIDENCE.QUICK,
    }
  }

  // Phase 2: L2 + L3 벡터 산출
  const phase2Questions = await provider.getQuestionsByPhase(2)
  const allPhase12 = [...phase1Questions, ...phase2Questions]
  const l2Vector = computeL2Vector(allPhase12, answers)
  const l3Vector = computeL3Vector(allPhase12, answers)

  if (level === "STANDARD") {
    return {
      l1Vector,
      l2Vector,
      l3Vector,
      profileLevel: "STANDARD",
      confidence: ONBOARDING_CONFIDENCE.STANDARD,
    }
  }

  // Phase 3: 교차 검증 + 7쌍 역설 감지 + EPS 계산
  const phase3Questions = await provider.getQuestionsByPhase(3)
  const { adjustedL1, adjustedL2, adjustedL3, paradoxProfile } = crossValidateWithParadox(
    l1Vector,
    l2Vector,
    l3Vector,
    phase3Questions,
    answers
  )

  return {
    l1Vector: adjustedL1,
    l2Vector: adjustedL2,
    l3Vector: adjustedL3,
    paradoxProfile,
    profileLevel: "ADVANCED",
    confidence: ONBOARDING_CONFIDENCE.DEEP,
  }
}

/**
 * 레벨별 필요한 Phase 반환.
 */
export function getRequiredPhases(level: "QUICK" | "STANDARD" | "DEEP"): (1 | 2 | 3)[] {
  switch (level) {
    case "QUICK":
      return [1]
    case "STANDARD":
      return [1, 2]
    case "DEEP":
      return [1, 2, 3]
  }
}

/**
 * 답변 완성도 확인.
 * 각 Phase의 질문 수 대비 답변 수 비율.
 */
export function computeCompleteness(
  questions: OnboardingQuestion[],
  answers: OnboardingAnswer[]
): number {
  if (questions.length === 0) return 0
  const answeredIds = new Set(answers.map((a) => a.questionId))
  const matchCount = questions.filter((q) => answeredIds.has(q.id)).length
  return matchCount / questions.length
}
