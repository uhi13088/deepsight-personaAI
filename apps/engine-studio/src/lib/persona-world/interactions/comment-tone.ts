// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Comment Tone Decision
// 구현계획서 §6.2, 설계서 §5.3
// 벡터 + 관계 + 상태 → 7종 댓글 톤 결정
// Soft sigmoid scoring: hard threshold → 연속적 확률 분포
// ═══════════════════════════════════════════════════════════════

import type { ThreeLayerVector } from "@/types/persona-v3"
import type {
  PersonaStateData,
  RelationshipScore,
  CommentTone,
  CommentToneDecision,
  ActivityTraitsV3,
} from "../types"
import { COMMENT_TONE_MATRIX, type CommentToneRule } from "../constants"
import { computeActivityTraits } from "../activity-mapper"
import { sigmoid } from "../paradox-activity"

/**
 * Soft threshold 기반 조건 점수 (0.0~1.0).
 *
 * hard IF(value > threshold) 대신 sigmoid 곡선으로 연속적 점수를 반환.
 * - value가 threshold를 크게 넘으면 → ~1.0
 * - value가 threshold 근처면 → ~0.5
 * - value가 threshold에 못 미치면 → ~0.0
 *
 * steepness = 10: threshold ±0.1 구간에서 12%~88% 전이
 */
const SOFT_THRESHOLD_STEEPNESS = 10

export function softThreshold(value: number, threshold: number, operator: ">" | "<"): number {
  const diff = operator === ">" ? value - threshold : threshold - value
  return sigmoid(diff * SOFT_THRESHOLD_STEEPNESS)
}

/**
 * 차원 값 추출 (source별로 다른 데이터에서 값을 가져옴).
 */
function getDimensionValue(
  source: CommentToneRule["conditions"][0]["source"],
  dimension: string,
  vectors: ThreeLayerVector,
  traits: ActivityTraitsV3,
  state: PersonaStateData,
  relationship: RelationshipScore | null
): number | null {
  switch (source) {
    case "commenter": {
      // L1 social 차원
      const socialKey = dimension as keyof ThreeLayerVector["social"]
      if (socialKey in vectors.social) return vectors.social[socialKey]

      // L2 temperament 차원
      const tempKey = dimension as keyof ThreeLayerVector["temperament"]
      if (tempKey in vectors.temperament) return vectors.temperament[tempKey]

      // L3 narrative 차원
      const narrKey = dimension as keyof ThreeLayerVector["narrative"]
      if (narrKey in vectors.narrative) return vectors.narrative[narrKey]

      // ActivityTraits에서 파생된 차원
      const traitKey = dimension as keyof ActivityTraitsV3
      if (traitKey in traits) return traits[traitKey]

      return null
    }
    case "state": {
      const stateKey = dimension as keyof PersonaStateData
      if (stateKey in state) return state[stateKey]
      return null
    }
    case "relationship": {
      if (!relationship) return null
      const relKey = dimension as keyof Omit<RelationshipScore, "lastInteractionAt">
      if (relKey in relationship && typeof relationship[relKey] === "number") {
        return relationship[relKey] as number
      }
      return null
    }
    case "postAuthor":
      // postAuthor 조건은 현재 매트릭스에서 미사용
      return null
    default:
      return null
  }
}

/**
 * 규칙의 연속 점수 계산 (soft scoring).
 *
 * 기존 binary evaluateRule 대신 sigmoid 기반으로 모든 조건의 점수를 곱산.
 * - 조건을 크게 충족 → ~1.0 × ~1.0 = ~1.0
 * - 조건 경계 근처 → ~0.5 × ~0.5 = ~0.25 (부분 매칭)
 * - 조건 미충족 → ~0.0 (자연스럽게 제외)
 *
 * 최종 점수 = Π(softThreshold(cond_i)) × rule.weight
 */
function scoreRule(
  rule: CommentToneRule,
  vectors: ThreeLayerVector,
  traits: ActivityTraitsV3,
  state: PersonaStateData,
  relationship: RelationshipScore | null
): number {
  // 빈 조건 = 기본 fallback (낮은 기본 점수)
  if (rule.conditions.length === 0) return 0.1 * rule.weight

  let conditionProduct = 1.0

  for (const cond of rule.conditions) {
    const value = getDimensionValue(
      cond.source,
      cond.dimension,
      vectors,
      traits,
      state,
      relationship
    )
    if (value === null) return 0 // 알 수 없는 차원 → 점수 0

    const condScore = softThreshold(value, cond.threshold, cond.operator)
    conditionProduct *= condScore
  }

  return conditionProduct * rule.weight
}

/**
 * Paradox가 톤에 영향을 주는지 판정.
 *
 * 설계서 §5.3: stance 높음 + agreeableness 높음 → Paradox 발현
 * paradoxScore > 0.4이고 tone이 vulnerable이면 Paradox 영향
 */
function isParadoxInfluenced(tone: CommentTone, paradoxScore: number): boolean {
  return tone === "vulnerable" && paradoxScore > 0.4
}

/**
 * 최소 점수 임계값.
 * 이 값 미만의 점수는 후보에서 제외.
 */
const MIN_SCORE_THRESHOLD = 0.01

/**
 * 댓글 톤 결정 (Soft Sigmoid Scoring).
 *
 * 설계서 §5.3 톤 결정 매트릭스를 확장:
 * 1. 모든 규칙에 대해 sigmoid 기반 연속 점수 계산
 * 2. 가장 높은 점수의 규칙 선택
 * 3. Paradox 영향 판정
 *
 * 기존 hard threshold 대비 개선점:
 * - stance=0.69 vs 0.71에서 갑자기 결과가 바뀌지 않음
 * - 경계 근처 값은 낮은 confidence로 반영
 * - 여러 조건이 약하게 충족되는 규칙도 후보에 포함
 *
 * @param commenterVectors 댓글 작성자의 3-Layer 벡터
 * @param commenterState 댓글 작성자의 현재 상태
 * @param relationship 두 페르소나 간 관계 (없으면 null)
 * @param paradoxScore 댓글 작성자의 paradoxScore
 * @param matrix 톤 결정 매트릭스 (테스트용 DI)
 */
export function decideCommentTone(
  commenterVectors: ThreeLayerVector,
  commenterState: PersonaStateData,
  relationship: RelationshipScore | null,
  paradoxScore: number,
  matrix: CommentToneRule[] = COMMENT_TONE_MATRIX
): CommentToneDecision {
  const traits = computeActivityTraits(commenterVectors, paradoxScore)

  // 모든 규칙에 대해 연속 점수 계산
  const scored: Array<{ rule: CommentToneRule; score: number }> = []

  for (const rule of matrix) {
    const score = scoreRule(rule, commenterVectors, traits, commenterState, relationship)
    if (score > MIN_SCORE_THRESHOLD) {
      scored.push({ rule, score })
    }
  }

  // 후보가 없으면 supportive fallback
  if (scored.length === 0) {
    return {
      tone: "supportive",
      confidence: 0.3,
      reason: "no matching rules → supportive fallback",
      paradoxInfluence: false,
    }
  }

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]

  // confidence: 최고 점수를 정규화 (조건 수가 많을수록 보너스)
  const conditionBonus = Math.min(1, best.rule.conditions.length / 3)
  const confidence = Math.min(1, best.score * (0.5 + 0.5 * conditionBonus))

  // reason 생성
  const condDesc = best.rule.conditions
    .map((c) => `${c.dimension}${c.operator}${c.threshold}`)
    .join(" + ")
  const reason = condDesc
    ? `${condDesc} → ${best.rule.tone}(score=${best.score.toFixed(3)})`
    : `default → ${best.rule.tone}`

  return {
    tone: best.rule.tone,
    confidence,
    reason,
    paradoxInfluence: isParadoxInfluenced(best.rule.tone, paradoxScore),
  }
}
