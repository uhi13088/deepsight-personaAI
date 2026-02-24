// ═══════════════════════════════════════════════════════════════
// 심층 성향 분석 모델
// T56-AC2: Big5/OCEAN 매핑, 반전 매칭 탐지
// ═══════════════════════════════════════════════════════════════

import type {
  SocialDimension,
  TemperamentDimension,
  SocialPersonaVector,
  CoreTemperamentVector,
} from "@/types"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface PsychometricMapping {
  l2Dimension: TemperamentDimension
  l1Correlations: Array<{
    dimension: SocialDimension
    coefficient: number // -1 ~ +1
    description: string
  }>
}

export interface ReversalDetection {
  dimension: string
  explicitScore: number // 설문 응답 기반
  implicitScore: number // 행동 데이터 기반
  delta: number
  isReversal: boolean // delta > threshold
  description: string
}

export interface LatentTraitProfile {
  userId: string
  explicit: Record<string, number> // 설문 기반 점수
  implicit: Record<string, number> // 행동 기반 점수
  reversals: ReversalDetection[]
  latentTraits: LatentTrait[]
  analyzedAt: number
}

export interface LatentTrait {
  name: string
  strength: number // 0~1
  source: "explicit" | "implicit" | "mixed"
  description: string
}

// ── OCEAN → L1 매핑 ─────────────────────────────────────────────

// T221: projection-coefficients.ts의 L2→L1 매핑과 정합성 보장
// projection: depth→openness, lens→neuroticism(inv), stance→agreeableness(inv),
//   scope→conscientiousness, taste→openness, purpose→conscientiousness, sociability→extraversion
export const OCEAN_L1_MAPPINGS: PsychometricMapping[] = [
  {
    l2Dimension: "openness",
    l1Correlations: [
      {
        dimension: "depth",
        coefficient: 0.5,
        description: "개방성 → 심층 분석 경향 (projection primary)",
      },
      {
        dimension: "taste",
        coefficient: 0.7,
        description: "개방성 → 실험적 취향 (projection secondary)",
      },
      { dimension: "purpose", coefficient: 0.3, description: "개방성 → 의미 추구" },
    ],
  },
  {
    l2Dimension: "conscientiousness",
    l1Correlations: [
      {
        dimension: "scope",
        coefficient: 0.6,
        description: "성실성 → 디테일 지향 (projection primary)",
      },
      {
        dimension: "purpose",
        coefficient: 0.5,
        description: "성실성 → 목표 실천 (projection secondary)",
      },
      { dimension: "depth", coefficient: 0.4, description: "성실성 → 체계적 분석" },
    ],
  },
  {
    l2Dimension: "extraversion",
    l1Correlations: [
      {
        dimension: "sociability",
        coefficient: 0.8,
        description: "외향성 → 소통 지향 (projection primary)",
      },
      { dimension: "stance", coefficient: -0.3, description: "외향성 → 수용적 태도" },
    ],
  },
  {
    l2Dimension: "agreeableness",
    l1Correlations: [
      {
        dimension: "stance",
        coefficient: -0.7,
        description: "우호성 → 비판 회피 (projection primary, inverse)",
      },
      { dimension: "sociability", coefficient: 0.4, description: "우호성 → 소통 선호" },
    ],
  },
  {
    l2Dimension: "neuroticism",
    l1Correlations: [
      {
        dimension: "lens",
        coefficient: -0.6,
        description: "신경성 → 감성적 판단 (projection primary, inverse)",
      },
      { dimension: "purpose", coefficient: 0.3, description: "신경성 → 의미 민감" },
      { dimension: "taste", coefficient: -0.2, description: "신경성 → 검증된 선호" },
    ],
  },
]

// ── L2→L1 예측 ──────────────────────────────────────────────────

export function predictL1FromL2(
  l2: CoreTemperamentVector
): Partial<Record<SocialDimension, number>> {
  const predicted: Record<string, number[]> = {}

  for (const mapping of OCEAN_L1_MAPPINGS) {
    const l2Value = l2[mapping.l2Dimension]
    for (const corr of mapping.l1Correlations) {
      if (!predicted[corr.dimension]) predicted[corr.dimension] = []
      // 계수 적용: 양의 계수면 비례, 음의 계수면 반비례
      const contribution =
        corr.coefficient > 0
          ? l2Value * corr.coefficient
          : (1 - l2Value) * Math.abs(corr.coefficient)
      predicted[corr.dimension].push(contribution)
    }
  }

  const result: Partial<Record<SocialDimension, number>> = {}
  for (const [dim, values] of Object.entries(predicted)) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    result[dim as SocialDimension] = round(clamp(avg))
  }

  return result
}

// ── 반전 탐지 ───────────────────────────────────────────────────

export const REVERSAL_THRESHOLD = 0.25

export function detectReversals(
  explicitScores: Record<string, number>,
  implicitScores: Record<string, number>,
  threshold: number = REVERSAL_THRESHOLD
): ReversalDetection[] {
  const reversals: ReversalDetection[] = []

  for (const dim of Object.keys(explicitScores)) {
    const explicit = explicitScores[dim] ?? 0.5
    const implicit = implicitScores[dim] ?? 0.5
    const delta = round(Math.abs(explicit - implicit))

    reversals.push({
      dimension: dim,
      explicitScore: explicit,
      implicitScore: implicit,
      delta,
      isReversal: delta >= threshold,
      description:
        delta >= threshold
          ? `'${dim}' 차원에서 설문(${explicit})과 행동(${implicit}) 간 괴리 (Δ${delta})`
          : `'${dim}' 차원 일관됨`,
    })
  }

  return reversals
}

// ── 잠재 특성 추출 ──────────────────────────────────────────────

export function extractLatentTraits(
  explicitScores: Record<string, number>,
  implicitScores: Record<string, number>
): LatentTrait[] {
  const traits: LatentTrait[] = []

  // 1) 강한 명시적 특성 (0.8 이상)
  for (const [dim, score] of Object.entries(explicitScores)) {
    if (score >= 0.8) {
      traits.push({
        name: `${dim}_high`,
        strength: score,
        source: "explicit",
        description: `${dim} 차원에서 높은 명시적 점수`,
      })
    }
  }

  // 2) 숨은 암묵적 특성 (명시적 < 0.5이지만 암묵적 > 0.7)
  for (const [dim, implicit] of Object.entries(implicitScores)) {
    const explicit = explicitScores[dim] ?? 0.5
    if (explicit < 0.5 && implicit > 0.7) {
      traits.push({
        name: `${dim}_hidden`,
        strength: implicit,
        source: "implicit",
        description: `${dim} 차원에서 숨겨진 높은 선호`,
      })
    }
  }

  // 3) 혼합 특성 (양쪽 모두 높음)
  for (const [dim, explicit] of Object.entries(explicitScores)) {
    const implicit = implicitScores[dim] ?? 0.5
    if (explicit >= 0.6 && implicit >= 0.6) {
      const existing = traits.find((t) => t.name === `${dim}_high`)
      if (!existing) {
        traits.push({
          name: `${dim}_confirmed`,
          strength: round((explicit + implicit) / 2),
          source: "mixed",
          description: `${dim} 차원에서 설문과 행동 모두 높은 점수`,
        })
      }
    }
  }

  return traits
}

// ── 종합 프로필 생성 ────────────────────────────────────────────

export function createLatentTraitProfile(
  userId: string,
  explicitScores: Record<string, number>,
  implicitScores: Record<string, number>
): LatentTraitProfile {
  return {
    userId,
    explicit: explicitScores,
    implicit: implicitScores,
    reversals: detectReversals(explicitScores, implicitScores),
    latentTraits: extractLatentTraits(explicitScores, implicitScores),
    analyzedAt: Date.now(),
  }
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function round(v: number): number {
  return Math.round(v * 100) / 100
}
