// ═══════════════════════════════════════════════════════════════
// Score Interpretation Tables
// 설계서 §3.6.3, §11, 구현계획서 §14.2 기준
// ═══════════════════════════════════════════════════════════════

import type { CrossAxisRelationship } from "@/types"

// ── Paradox Score 해석 (0.0~1.0) ────────────────────────────
export interface ScoreInterpretation {
  range: [number, number]
  label: string
  interpretation: string
  llmGuidance: string
}

export const PARADOX_SCORE_SCALE: ScoreInterpretation[] = [
  {
    range: [0.0, 0.15],
    label: "매우 낮음",
    interpretation: "솔직하고 투명한 캐릭터 — L1↔L2 거의 일치",
    llmGuidance: "이 캐릭터는 생각하는 대로 말하며, 겉과 속의 괴리가 거의 없습니다.",
  },
  {
    range: [0.15, 0.3],
    label: "낮음",
    interpretation: "약간의 복잡성 — 비교적 단순한 성격",
    llmGuidance: "표면적인 반응과 내면 사이에 미묘한 차이가 있습니다.",
  },
  {
    range: [0.3, 0.5],
    label: "중간",
    interpretation: "적당한 역설 — 복잡하고 입체적인 캐릭터",
    llmGuidance: "겉과 속이 상당히 다른 복잡한 인물입니다. 반전 매력을 자연스럽게 표현하세요.",
  },
  {
    range: [0.5, 0.7],
    label: "높음",
    interpretation: "강한 역설 — 겉과 속이 크게 다른 캐릭터",
    llmGuidance:
      "표면과 내면이 상당히 다릅니다. Pressure가 높아질수록 진짜 모습이 균열처럼 드러나게 하세요.",
  },
  {
    range: [0.7, 1.0],
    label: "매우 높음",
    interpretation: "극단적 역설 — 표면과 내면이 거의 정반대",
    llmGuidance:
      "극적 모순 인물입니다. 가면 뒤의 진심이 때때로 균열처럼 드러나게 하세요. 일관된 모순을 유지하세요.",
  },
]

// ── Dimensionality Score (종형 곡선) 해석 ────────────────────
// dimensionality = exp(-(paradoxScore - 0.35)² / (2 × 0.2²))
export const DIMENSIONALITY_SCORE_SCALE: ScoreInterpretation[] = [
  {
    range: [0.0, 0.3],
    label: "단조로운",
    interpretation: "캐릭터가 너무 단순하거나 너무 극단적",
    llmGuidance: "역설 균형이 필요합니다. Paradox Score를 0.3~0.5 범위로 조정 권장.",
  },
  {
    range: [0.3, 0.6],
    label: "보통",
    interpretation: "일정 수준의 입체감 보유",
    llmGuidance: "캐릭터에 약간의 복잡성이 있지만 더 풍부하게 만들 수 있습니다.",
  },
  {
    range: [0.6, 0.85],
    label: "입체적",
    interpretation: "풍부한 캐릭터 — 적절한 역설 균형",
    llmGuidance: "잘 균형 잡힌 복잡성입니다. 캐릭터의 반전을 자연스럽게 표현하세요.",
  },
  {
    range: [0.85, 1.0],
    label: "최적",
    interpretation: "최적의 역설 균형 (paradoxScore ≈ 0.35 근방)",
    llmGuidance: "캐릭터의 입체감이 최고 수준입니다. 미묘한 반전을 풍부하게 활용하세요.",
  },
]

// ── Consistency Score 범위 ──────────────────────────────────
export const CONSISTENCY_RANGES = {
  excellent: { min: 0.9, max: 1.0, label: "일관성 우수", severity: "success" as const },
  warning: { min: 0.7, max: 0.9, label: "주의 필요", severity: "warning" as const },
  poor: { min: 0.0, max: 0.7, label: "일관성 부족", severity: "error" as const },
} as const

// ── Cross-Axis 관계별 해석 템플릿 ───────────────────────────
export const CROSS_AXIS_INTERPRETATION: Record<
  CrossAxisRelationship,
  {
    highHigh: string
    highLow: string
    lowHigh: string
    lowLow: string
  }
> = {
  paradox: {
    highHigh: "둘 다 높음: 극도의 모순 — 가장 복잡한 역설",
    highLow: "첫 차원 높고 둘째 낮음: 한쪽이 억압된 불일치",
    lowHigh: "첫 차원 낮고 둘째 높음: 역방향 불일치",
    lowLow: "둘 다 낮음: 일관성 있는 성격",
  },
  reinforcing: {
    highHigh: "둘 다 높음: 강한 강화 — 특성이 극대화",
    highLow: "첫 차원 높고 둘째 낮음: 강화 미작동",
    lowHigh: "첫 차원 낮고 둘째 높음: 강화 미작동",
    lowLow: "둘 다 낮음: 약한 강화",
  },
  modulating: {
    highHigh: "둘 다 높음: 시너지 효과 — 표현이 증폭",
    highLow: "첫 차원 높고 둘째 낮음: 조절이 약해짐",
    lowHigh: "첫 차원 낮고 둘째 높음: 잠재력은 높지만 표현 억제",
    lowLow: "둘 다 낮음: 중립적 상태",
  },
  neutral: {
    highHigh: "둘 다 높음: 독립적 고수치",
    highLow: "첫 차원 높고 둘째 낮음: 비대칭 프로파일",
    lowHigh: "첫 차원 낮고 둘째 높음: 비대칭 프로파일",
    lowLow: "둘 다 낮음: 독립적 저수치",
  },
}

// ── 6-Category Validation Thresholds (§11) ──────────────────
export const VALIDATION_THRESHOLDS = {
  // C1: L3.lack ≥ 0.7 AND Paradox < 0.2 → Warning
  lackParadoxGap: { lackMin: 0.7, paradoxMax: 0.2 },
  // C2: |L3.volatility - L2.neuroticism| > 0.5 → Warning
  volatilityNeuroticismGap: 0.5,
  // C3: |L1.scope - L2.openness| > 0.5 → Warning (optional)
  scopeOpennessGap: 0.5,
  // C4: L3.moralCompass ≥ 0.8 AND L2.agreeableness ≤ 0.2 → Warning
  moralAgreeExtreme: { moralMin: 0.8, agreeMax: 0.2 },

  // E1: Cross-axis score must be in [0, 1]
  crossAxisScoreRange: { min: 0.0, max: 1.0 },
  // E2: Paradox type but dimA ≈ dimB → suspicion
  paradoxSimilarityThreshold: 0.1,
  // E2: Reinforcing type but large gap → suspicion
  reinforcingDivergenceThreshold: 0.6,
  // E3: |calculated EPS - expected| > 0.01 → Error
  epsCalculationTolerance: 0.01,
  // E3: max(l1l2, l1l3, l2l3) - min(...) > 0.7 → Info
  layerParadoxBalanceGap: 0.7,
} as const
