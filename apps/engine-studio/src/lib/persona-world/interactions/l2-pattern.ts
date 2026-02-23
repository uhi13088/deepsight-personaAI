// ═══════════════════════════════════════════════════════════════
// PersonaWorld v4 — L2 Behavioral Pattern Classifier
// Phase RA T191: OCEAN 5D → 5가지 갈등 행동 패턴 분류
//
// 핵심 인사이트: 동일한 tension이라도 L2 기질에 따라 행동이 달라짐.
// tension이 낮을 때는 기질 무관 기본 행동 → tension 고조 시 기질 발현.
// ═══════════════════════════════════════════════════════════════

import type { CoreTemperamentVector } from "@/types/persona-v3"

/**
 * 갈등/고장력 상황에서의 L2 기반 행동 패턴.
 *
 * - Avoidant: 고갈등 시 철수/침묵 (높은 순응성 + 낮은 외향성)
 * - Aggressive: 고갈등 시 공격적 참여 (낮은 순응성 + 높은 신경성)
 * - Dominant: 고갈등 시 논쟁 주도 (낮은 순응성 + 높은 외향성)
 * - Anxious: 고갈등 시 반응만, 댓글 못 씀 (높은 신경성 + 낮은 외향성)
 * - Stable: 갈등 영향 최소 (뚜렷한 패턴 없음)
 */
export type L2ConflictPattern = "Avoidant" | "Aggressive" | "Dominant" | "Anxious" | "Stable"

export interface L2PatternResult {
  pattern: L2ConflictPattern
  /** 패턴 적용 강도 (0~1). 경계값에 가까울수록 낮음 */
  confidence: number
  /** 분류 근거 (로깅/디버깅용) */
  reason: string
}

/**
 * OCEAN 벡터에서 갈등 행동 패턴을 분류.
 *
 * 우선순위 (겹치는 경우 처리):
 * 1. Dominant  — 낮은 순응성 + 높은 외향성 (논쟁을 즐김)
 * 2. Aggressive — 낮은 순응성 + 높은 신경성 (반응적 적대성)
 * 3. Anxious   — 높은 신경성 + 낮은 외향성 (내향적 불안)
 * 4. Avoidant  — 높은 순응성 + 낮은 외향성 (평화적 철수)
 * 5. Stable    — 나머지 (뚜렷한 갈등 패턴 없음)
 *
 * 순서 근거: Dominant·Aggressive는 낮은 순응성으로 진입,
 * Anxious·Avoidant는 낮은 외향성으로 진입 → 먼저 낮은 순응성 패턴을 확인.
 */
export function classifyL2Pattern(temperament: CoreTemperamentVector): L2PatternResult {
  const { extraversion, agreeableness, neuroticism } = temperament

  // 1. Dominant: 낮은 순응성(≤0.4) + 높은 외향성(≥0.6) → 논쟁 주도
  if (agreeableness <= 0.4 && extraversion >= 0.6) {
    const conf = Math.min(1, (0.4 - agreeableness + (extraversion - 0.6)) / 0.8)
    return {
      pattern: "Dominant",
      confidence: conf,
      reason: `agreeableness=${agreeableness.toFixed(2)}, extraversion=${extraversion.toFixed(2)}`,
    }
  }

  // 2. Aggressive: 낮은 순응성(≤0.4) + 높은 신경성(≥0.6) → 공격적 참여
  if (agreeableness <= 0.4 && neuroticism >= 0.6) {
    const conf = Math.min(1, (0.4 - agreeableness + (neuroticism - 0.6)) / 0.8)
    return {
      pattern: "Aggressive",
      confidence: conf,
      reason: `agreeableness=${agreeableness.toFixed(2)}, neuroticism=${neuroticism.toFixed(2)}`,
    }
  }

  // 3. Anxious: 높은 신경성(≥0.6) + 낮은 외향성(≤0.4) → 내향적 불안
  if (neuroticism >= 0.6 && extraversion <= 0.4) {
    const conf = Math.min(1, (neuroticism - 0.6 + (0.4 - extraversion)) / 0.8)
    return {
      pattern: "Anxious",
      confidence: conf,
      reason: `neuroticism=${neuroticism.toFixed(2)}, extraversion=${extraversion.toFixed(2)}`,
    }
  }

  // 4. Avoidant: 높은 순응성(≥0.6) + 낮은 외향성(≤0.4) → 평화적 철수
  if (agreeableness >= 0.6 && extraversion <= 0.4) {
    const conf = Math.min(1, (agreeableness - 0.6 + (0.4 - extraversion)) / 0.8)
    return {
      pattern: "Avoidant",
      confidence: conf,
      reason: `agreeableness=${agreeableness.toFixed(2)}, extraversion=${extraversion.toFixed(2)}`,
    }
  }

  // 5. Stable: 뚜렷한 갈등 패턴 없음
  return {
    pattern: "Stable",
    confidence: 0.5,
    reason: "no strong conflict pattern",
  }
}
