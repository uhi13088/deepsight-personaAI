// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Paradox Activity
// 구현계획서 §5.2, 설계서 §3.5
// Paradox 발현 확률 계산 + 4종 Paradox 패턴 매칭
// ═══════════════════════════════════════════════════════════════

import type { ThreeLayerVector } from "@/types/persona-v3"
import { PARADOX } from "./constants"
import type { PersonaStateData } from "./types"

/**
 * Paradox 패턴 정의.
 *
 * 설계서 §3.5 표:
 * | 패턴명          | L1 (겉)          | L2 (속)                | 활동 발현                          |
 * | 사교적 내향인   | sociability 높음 | extraversion 낮음      | 활발 포스팅, DM 회피, 심야 감성글   |
 * | 상처받은 비평가 | stance 높음      | agreeableness 높음     | 날카로운 리뷰, 반박에 의외로 수긍   |
 * | 게으른 완벽주의 | scope 높음       | conscientiousness 낮음 | 남의 디테일 지적, 본인 불규칙       |
 * | 폭발하는 지성인 | lens 높음        | volatility 높음        | 평소 논리적, 트리거 시 감정 폭발    |
 */
export interface ParadoxPattern {
  name: string
  nameKo: string
  l1Condition: {
    dimension: keyof ThreeLayerVector["social"]
    operator: ">" | "<"
    threshold: number
  }
  l2Condition: {
    dimension: keyof ThreeLayerVector["temperament"] | keyof ThreeLayerVector["narrative"]
    layer: "temperament" | "narrative"
    operator: ">" | "<"
    threshold: number
  }
  description: string
}

export const PARADOX_PATTERNS: ParadoxPattern[] = [
  {
    name: "sociable_introvert",
    nameKo: "사교적 내향인",
    l1Condition: { dimension: "sociability", operator: ">", threshold: 0.6 },
    l2Condition: {
      dimension: "extraversion",
      layer: "temperament",
      operator: "<",
      threshold: 0.4,
    },
    description: "활발히 포스팅하지만 DM/1:1 대화는 회피. 심야에 갑자기 감성글",
  },
  {
    name: "wounded_critic",
    nameKo: "상처받은 비평가",
    l1Condition: { dimension: "stance", operator: ">", threshold: 0.6 },
    l2Condition: {
      dimension: "agreeableness",
      layer: "temperament",
      operator: ">",
      threshold: 0.6,
    },
    description: "날카로운 리뷰를 쓰지만, 반박 댓글에 의외로 수긍",
  },
  {
    name: "lazy_perfectionist",
    nameKo: "게으른 완벽주의자",
    l1Condition: { dimension: "scope", operator: ">", threshold: 0.6 },
    l2Condition: {
      dimension: "conscientiousness",
      layer: "temperament",
      operator: "<",
      threshold: 0.4,
    },
    description: "남의 글 디테일은 지적하지만 본인 포스팅은 불규칙",
  },
  {
    name: "exploding_intellectual",
    nameKo: "폭발하는 지성인",
    l1Condition: { dimension: "lens", operator: ">", threshold: 0.6 },
    l2Condition: {
      dimension: "volatility",
      layer: "narrative",
      operator: ">",
      threshold: 0.6,
    },
    description: "평소 논리적 분석글, 트리거 시 감정적 폭발 포스트",
  },
]

/**
 * Sigmoid 함수.
 *
 * σ(x) = 1 / (1 + e^(-x))
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

/**
 * Paradox 발현 확률 계산.
 *
 * 설계서 §3.5:
 * paradoxActivityChance = sigmoid(paradoxScore × 3 - 1.5)
 *
 * - paradoxScore 0.3 → ~12%
 * - paradoxScore 0.5 → ~50%
 * - paradoxScore 0.7 → ~88%
 */
export function computeParadoxActivityChance(paradoxScore: number): number {
  return sigmoid(paradoxScore * PARADOX.sigmoidScale - PARADOX.sigmoidShift)
}

/**
 * 현재 벡터에 매칭되는 Paradox 패턴 탐색.
 *
 * L1↔L2 조건이 모두 충족되는 패턴을 반환.
 */
export function detectParadoxPatterns(vectors: ThreeLayerVector): ParadoxPattern[] {
  return PARADOX_PATTERNS.filter((pattern) => {
    // L1 조건 체크
    const l1Value = vectors.social[pattern.l1Condition.dimension]
    const l1Passes =
      pattern.l1Condition.operator === ">"
        ? l1Value > pattern.l1Condition.threshold
        : l1Value < pattern.l1Condition.threshold

    if (!l1Passes) return false

    // L2/L3 조건 체크
    const l2Layer =
      pattern.l2Condition.layer === "temperament" ? vectors.temperament : vectors.narrative
    const l2Value = l2Layer[pattern.l2Condition.dimension as keyof typeof l2Layer] as number
    const l2Passes =
      pattern.l2Condition.operator === ">"
        ? l2Value > pattern.l2Condition.threshold
        : l2Value < pattern.l2Condition.threshold

    return l2Passes
  })
}

/**
 * Paradox 발현 결정.
 *
 * 1. paradoxActivityChance 계산 (sigmoid)
 * 2. 매칭 패턴 탐색
 * 3. paradoxTension이 높으면 발현 확률 추가 증가
 * 4. 최종 발현 여부 결정
 */
export interface ParadoxActivityResult {
  shouldTrigger: boolean
  chance: number // sigmoid 기반 기본 확률
  adjustedChance: number // paradoxTension 보정 후 확률
  matchedPatterns: ParadoxPattern[]
  primaryPattern: ParadoxPattern | null
}

export function decideParadoxActivity(
  vectors: ThreeLayerVector,
  paradoxScore: number,
  state: PersonaStateData,
  random?: number
): ParadoxActivityResult {
  const baseChance = computeParadoxActivityChance(paradoxScore)
  const matchedPatterns = detectParadoxPatterns(vectors)

  // paradoxTension 보정: tension > 0.5이면 확률 증가
  // adjustedChance = baseChance + (paradoxTension - 0.5) × 0.3 (0.5 초과분 30% 가산)
  let adjustedChance = baseChance
  if (state.paradoxTension > 0.5) {
    adjustedChance = Math.min(1.0, baseChance + (state.paradoxTension - 0.5) * 0.3)
  }

  // 매칭 패턴이 없으면 발현 불가
  if (matchedPatterns.length === 0) {
    return {
      shouldTrigger: false,
      chance: baseChance,
      adjustedChance,
      matchedPatterns: [],
      primaryPattern: null,
    }
  }

  const r = random ?? Math.random()
  const shouldTrigger = r < adjustedChance

  return {
    shouldTrigger,
    chance: baseChance,
    adjustedChance,
    matchedPatterns,
    primaryPattern: matchedPatterns[0],
  }
}
