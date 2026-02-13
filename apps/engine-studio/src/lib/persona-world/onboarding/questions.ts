// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Onboarding Questions
// 구현계획서 §8, 설계서 §9.2
// Cold Start 질문 구조 + 벡터 산출 로직
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, SocialDimension } from "@/types/persona-v3"
import type { CoreTemperamentVector, TemperamentDimension } from "@/types/persona-v3"
import type { OnboardingAnswer } from "../types"

// ── 질문 구조 타입 ──────────────────────────────────────────

export interface OnboardingQuestion {
  id: string
  phase: 1 | 2 | 3
  /** 각 옵션이 어떤 차원에 얼마나 영향을 주는지 */
  options: OnboardingQuestionOption[]
}

export interface OnboardingQuestionOption {
  key: string // 보기 식별자 ("A", "B", "C", "D" 등)
  /** L1 차원별 가중치: 선택 시 해당 차원에 더해질 값 */
  l1Weights?: Partial<Record<SocialDimension, number>>
  /** L2 차원별 가중치: 선택 시 해당 차원에 더해질 값 */
  l2Weights?: Partial<Record<TemperamentDimension, number>>
}

/**
 * 질문 프로바이더 (DI).
 * 실제 질문 콘텐츠는 DB 또는 설정에서 제공.
 */
export interface OnboardingQuestionsProvider {
  getQuestionsByPhase(phase: 1 | 2 | 3): Promise<OnboardingQuestion[]>
}

// ── 온보딩 신뢰도 상수 ──────────────────────────────────────
// 설계서 §9.2

export const ONBOARDING_CONFIDENCE = {
  LIGHT: 0.65, // Phase 1만 → L1
  MEDIUM: 0.8, // Phase 1+2 → L1+L2
  DEEP: 0.93, // Phase 1+2+3 → L1+L2+메타
} as const

// ── L1 벡터 기본값 (중립) ────────────────────────────────────

const L1_BASE: SocialPersonaVector = {
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
}

const L2_BASE: CoreTemperamentVector = {
  openness: 0.5,
  conscientiousness: 0.5,
  extraversion: 0.5,
  agreeableness: 0.5,
  neuroticism: 0.5,
}

const L1_KEYS: SocialDimension[] = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
]
const L2_KEYS: TemperamentDimension[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
]

// ── L1 벡터 산출 ────────────────────────────────────────────

/**
 * Phase 1 답변으로 L1 SocialPersonaVector 계산.
 *
 * 설계서 §9.2:
 * 각 질문의 선택된 옵션 l1Weights를 기본 벡터(0.5)에 누적 후 클램프.
 */
export function computeL1Vector(
  questions: OnboardingQuestion[],
  answers: OnboardingAnswer[]
): SocialPersonaVector {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]))
  const accumulated: Record<string, number> = {}

  for (const q of questions) {
    const selectedKey = answerMap.get(q.id)
    if (selectedKey == null) continue

    const option = q.options.find((o) => o.key === String(selectedKey))
    if (!option?.l1Weights) continue

    for (const [dim, weight] of Object.entries(option.l1Weights)) {
      accumulated[dim] = (accumulated[dim] ?? 0) + weight
    }
  }

  const result = { ...L1_BASE }
  for (const key of L1_KEYS) {
    if (accumulated[key] != null) {
      result[key] = clamp(result[key] + accumulated[key])
    }
  }

  return result
}

// ── L2 벡터 산출 ────────────────────────────────────────────

/**
 * Phase 2 답변으로 L2 CoreTemperamentVector (OCEAN) 계산.
 *
 * 설계서 §9.2:
 * Phase 2 질문의 선택된 옵션 l2Weights를 기본 벡터(0.5)에 누적 후 클램프.
 */
export function computeL2Vector(
  questions: OnboardingQuestion[],
  answers: OnboardingAnswer[]
): CoreTemperamentVector {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]))
  const accumulated: Record<string, number> = {}

  for (const q of questions) {
    const selectedKey = answerMap.get(q.id)
    if (selectedKey == null) continue

    const option = q.options.find((o) => o.key === String(selectedKey))
    if (!option?.l2Weights) continue

    for (const [dim, weight] of Object.entries(option.l2Weights)) {
      accumulated[dim] = (accumulated[dim] ?? 0) + weight
    }
  }

  const result = { ...L2_BASE }
  for (const key of L2_KEYS) {
    if (accumulated[key] != null) {
      result[key] = clamp(result[key] + accumulated[key])
    }
  }

  return result
}

// ── 교차 검증 (Phase 3) ────────────────────────────────────

/**
 * Phase 3 교차 검증 + Paradox 감지.
 *
 * 설계서 §9.2:
 * Phase 1(L1) vs Phase 2(L2) 교차 차원 일관성 검증.
 * L1 sociability ↔ L2 extraversion 등 대응 차원 간 gap > 0.3 → paradox 감지.
 */
export function crossValidate(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  phase3Questions: OnboardingQuestion[],
  phase3Answers: OnboardingAnswer[]
): {
  adjustedL1: SocialPersonaVector
  adjustedL2: CoreTemperamentVector
  paradoxDetected: boolean
} {
  // Phase 3 답변으로 추가 보정
  const l1Delta: Record<string, number> = {}
  const l2Delta: Record<string, number> = {}
  const answerMap = new Map(phase3Answers.map((a) => [a.questionId, a.value]))

  for (const q of phase3Questions) {
    const selectedKey = answerMap.get(q.id)
    if (selectedKey == null) continue
    const option = q.options.find((o) => o.key === String(selectedKey))
    if (!option) continue

    if (option.l1Weights) {
      for (const [dim, w] of Object.entries(option.l1Weights)) {
        l1Delta[dim] = (l1Delta[dim] ?? 0) + w
      }
    }
    if (option.l2Weights) {
      for (const [dim, w] of Object.entries(option.l2Weights)) {
        l2Delta[dim] = (l2Delta[dim] ?? 0) + w
      }
    }
  }

  const adjustedL1 = { ...l1 }
  for (const key of L1_KEYS) {
    if (l1Delta[key] != null) {
      adjustedL1[key] = clamp(adjustedL1[key] + l1Delta[key])
    }
  }

  const adjustedL2 = { ...l2 }
  for (const key of L2_KEYS) {
    if (l2Delta[key] != null) {
      adjustedL2[key] = clamp(adjustedL2[key] + l2Delta[key])
    }
  }

  // 교차 차원 Paradox 감지: sociability ↔ extraversion
  const paradoxDetected =
    Math.abs(adjustedL1.sociability - adjustedL2.extraversion) > 0.3 ||
    Math.abs(adjustedL1.stance - (1 - adjustedL2.agreeableness)) > 0.3 ||
    Math.abs(adjustedL1.taste - adjustedL2.openness) > 0.3

  return { adjustedL1, adjustedL2, paradoxDetected }
}

function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100
}
