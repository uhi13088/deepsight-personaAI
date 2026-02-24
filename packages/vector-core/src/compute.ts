// ═══════════════════════════════════════════════════════════════
// @deepsight/vector-core — Vector Computation
// 설계서 §9.2: 온보딩 질문 → 벡터 산출
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  SocialDimension,
  TemperamentDimension,
  NarrativeDimension,
} from "@deepsight/shared-types"
import type { OnboardingQuestion, OnboardingAnswer, OnboardingApiResponse } from "./types"
import { L1_DIMS, L2_DIMS, L3_DIMS, L1_BASE, L2_BASE, L3_BASE } from "./constants"

// ── 유틸리티 ─────────────────────────────────────────────────

export function clamp(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100
}

// ── 질문 기반 벡터 산출 (Engine Studio 용) ───────────────────

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
      if (weight != null) accumulated[dim] = (accumulated[dim] ?? 0) + weight
    }
  }

  const result = { ...L1_BASE }
  for (const key of L1_DIMS) {
    if (accumulated[key] != null) {
      result[key] = clamp(result[key] + accumulated[key])
    }
  }

  return result
}

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
      if (weight != null) accumulated[dim] = (accumulated[dim] ?? 0) + weight
    }
  }

  const result = { ...L2_BASE }
  for (const key of L2_DIMS) {
    if (accumulated[key] != null) {
      result[key] = clamp(result[key] + accumulated[key])
    }
  }

  return result
}

/**
 * Phase 2 답변으로 L3 NarrativeDriveVector 계산.
 *
 * L3는 Phase 2에서 l3Weights를 통해 간접 탐색.
 */
export function computeL3Vector(
  questions: OnboardingQuestion[],
  answers: OnboardingAnswer[]
): NarrativeDriveVector {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]))
  const accumulated: Record<string, number> = {}

  for (const q of questions) {
    const selectedKey = answerMap.get(q.id)
    if (selectedKey == null) continue

    const option = q.options.find((o) => o.key === String(selectedKey))
    if (!option?.l3Weights) continue

    for (const [dim, weight] of Object.entries(option.l3Weights)) {
      if (weight != null) accumulated[dim] = (accumulated[dim] ?? 0) + weight
    }
  }

  const result = { ...L3_BASE }
  for (const key of L3_DIMS) {
    if (accumulated[key] != null) {
      result[key] = clamp(result[key] + accumulated[key])
    }
  }

  return result
}

// ── API 응답 기반 벡터 산출 (Developer Console 용) ──────────

/**
 * API 응답에서 L1+L2 벡터를 계산.
 *
 * 설계서 §9.2:
 * - l1_weights / l2_weights 제공 시: base(0.5)에 delta 누적 후 clamp
 * - target_dimensions만 제공 시: 기존 heuristic (하위 호환)
 */
export function computeVectorsFromApiResponses(responses: OnboardingApiResponse[]): {
  l1: Record<SocialDimension, number>
  l2: Record<TemperamentDimension, number> | null
  hasL2: boolean
} {
  const l1Delta: Record<string, number> = {}
  const l2Delta: Record<string, number> = {}
  const l1Values: Record<string, number> = {}
  const l1Counts: Record<string, number> = {}
  let hasStructuredL1 = false
  let hasL2Data = false

  for (const dim of L1_DIMS) {
    l1Delta[dim] = 0
    l1Values[dim] = 0.5
    l1Counts[dim] = 0
  }
  for (const dim of L2_DIMS) {
    l2Delta[dim] = 0
  }

  for (const resp of responses) {
    // Structured weights path
    if (resp.l1_weights) {
      hasStructuredL1 = true
      for (const [dim, weight] of Object.entries(resp.l1_weights)) {
        if (isDimInList(dim, L1_DIMS)) {
          l1Delta[dim] = (l1Delta[dim] ?? 0) + weight
        }
      }
    } else if (resp.target_dimensions) {
      // Legacy heuristic (backward compat)
      for (const dim of resp.target_dimensions) {
        if (isDimInList(dim, L1_DIMS)) {
          const val =
            typeof resp.answer === "number" ? resp.answer : resp.answer === "A" ? 0.3 : 0.7
          l1Values[dim] = (l1Values[dim] * l1Counts[dim] + val) / (l1Counts[dim] + 1)
          l1Counts[dim]++
        }
      }
    }

    // L2 weights
    if (resp.l2_weights) {
      hasL2Data = true
      for (const [dim, weight] of Object.entries(resp.l2_weights)) {
        if (isDimInList(dim, L2_DIMS)) {
          l2Delta[dim] = (l2Delta[dim] ?? 0) + weight
        }
      }
    }
  }

  // Build L1 result — delta를 응답 수(N)로 나누어 포화 방지 (T216)
  const l1 = {} as Record<SocialDimension, number>
  const l1ResponseCount = responses.filter((r) => r.l1_weights).length || 1
  for (const dim of L1_DIMS) {
    l1[dim] = hasStructuredL1 ? clamp(0.5 + l1Delta[dim] / l1ResponseCount) : clamp(l1Values[dim])
  }

  // Build L2 result — delta를 응답 수(N)로 나누어 포화 방지 (T216)
  let l2: Record<TemperamentDimension, number> | null = null
  const l2ResponseCount = responses.filter((r) => r.l2_weights).length || 1
  if (hasL2Data) {
    l2 = {} as Record<TemperamentDimension, number>
    for (const dim of L2_DIMS) {
      l2[dim] = clamp(0.5 + l2Delta[dim] / l2ResponseCount)
    }
  }

  return { l1, l2, hasL2: hasL2Data }
}

// ── Phase 3 delta 적용 (교차 검증) ──────────────────────────

/**
 * Phase 3 답변의 L1/L2/L3 delta를 적용.
 */
export function applyPhase3Deltas(
  l1: SocialPersonaVector,
  l2: CoreTemperamentVector,
  l3: NarrativeDriveVector,
  phase3Questions: OnboardingQuestion[],
  phase3Answers: OnboardingAnswer[]
): {
  adjustedL1: SocialPersonaVector
  adjustedL2: CoreTemperamentVector
  adjustedL3: NarrativeDriveVector
} {
  const l1Delta: Record<string, number> = {}
  const l2Delta: Record<string, number> = {}
  const l3Delta: Record<string, number> = {}
  const answerMap = new Map(phase3Answers.map((a) => [a.questionId, a.value]))

  for (const q of phase3Questions) {
    const selectedKey = answerMap.get(q.id)
    if (selectedKey == null) continue
    const option = q.options.find((o) => o.key === String(selectedKey))
    if (!option) continue

    if (option.l1Weights) {
      for (const [dim, w] of Object.entries(option.l1Weights)) {
        if (w != null) l1Delta[dim] = (l1Delta[dim] ?? 0) + w
      }
    }
    if (option.l2Weights) {
      for (const [dim, w] of Object.entries(option.l2Weights)) {
        if (w != null) l2Delta[dim] = (l2Delta[dim] ?? 0) + w
      }
    }
    if (option.l3Weights) {
      for (const [dim, w] of Object.entries(option.l3Weights)) {
        if (w != null) l3Delta[dim] = (l3Delta[dim] ?? 0) + w
      }
    }
  }

  const adjustedL1 = { ...l1 }
  for (const key of L1_DIMS) {
    if (l1Delta[key] != null) {
      adjustedL1[key] = clamp(adjustedL1[key] + l1Delta[key])
    }
  }

  const adjustedL2 = { ...l2 }
  for (const key of L2_DIMS) {
    if (l2Delta[key] != null) {
      adjustedL2[key] = clamp(adjustedL2[key] + l2Delta[key])
    }
  }

  const adjustedL3 = { ...l3 }
  for (const key of L3_DIMS) {
    if (l3Delta[key] != null) {
      adjustedL3[key] = clamp(adjustedL3[key] + l3Delta[key])
    }
  }

  return { adjustedL1, adjustedL2, adjustedL3 }
}

// ── Internal helper ──────────────────────────────────────────

function isDimInList<T extends string>(dim: string, list: readonly T[]): dim is T {
  return (list as readonly string[]).includes(dim)
}
