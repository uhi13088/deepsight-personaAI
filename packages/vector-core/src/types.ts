// ═══════════════════════════════════════════════════════════════
// @deepsight/vector-core — Onboarding & Vector Computation Types
// 설계서 §9.2 기준
// ═══════════════════════════════════════════════════════════════

import type {
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
} from "@deepsight/shared-types"

// ── 온보딩 질문 구조 ─────────────────────────────────────────

export interface OnboardingQuestion {
  id: string
  phase: 1 | 2 | 3
  options: OnboardingQuestionOption[]
}

export interface OnboardingQuestionOption {
  key: string
  l1Weights?: Partial<Record<SocialDimension, number>>
  l2Weights?: Partial<Record<TemperamentDimension, number>>
  l3Weights?: Partial<Record<NarrativeDimension, number>>
}

// ── 온보딩 응답 ──────────────────────────────────────────────

export interface OnboardingAnswer {
  questionId: string
  value: string | number | string[]
}

// ── API 응답용 (Developer Console) ───────────────────────────

export interface OnboardingApiResponse {
  question_id: string
  answer: string | number
  target_dimensions?: string[]
  l1_weights?: Record<string, number>
  l2_weights?: Record<string, number>
}

// ── 질문 프로바이더 (DI) ─────────────────────────────────────

export interface OnboardingQuestionsProvider {
  getQuestionsByPhase(phase: 1 | 2 | 3): Promise<OnboardingQuestion[]>
}
