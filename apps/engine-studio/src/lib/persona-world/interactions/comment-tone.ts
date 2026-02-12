// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Comment Tone Decision
// 구현계획서 §6.2, 설계서 §5.3
// 벡터 + 관계 + 상태 → 7종 댓글 톤 결정
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
 * 단일 규칙의 모든 조건 충족 여부 검사.
 */
function evaluateRule(
  rule: CommentToneRule,
  vectors: ThreeLayerVector,
  traits: ActivityTraitsV3,
  state: PersonaStateData,
  relationship: RelationshipScore | null
): boolean {
  // 빈 조건 = 기본 fallback (항상 true)
  if (rule.conditions.length === 0) return true

  return rule.conditions.every((cond) => {
    const value = getDimensionValue(
      cond.source,
      cond.dimension,
      vectors,
      traits,
      state,
      relationship
    )
    if (value === null) return false

    return cond.operator === ">" ? value > cond.threshold : value < cond.threshold
  })
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
 * 댓글 톤 결정.
 *
 * 설계서 §5.3 톤 결정 매트릭스:
 * 1. 모든 규칙을 조건 검사
 * 2. 충족하는 규칙 중 가장 높은 weight 선택
 * 3. Paradox 영향 판정
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

  // 매칭되는 규칙 수집
  const matched: Array<{ rule: CommentToneRule; score: number }> = []

  for (const rule of matrix) {
    if (evaluateRule(rule, commenterVectors, traits, commenterState, relationship)) {
      matched.push({ rule, score: rule.weight })
    }
  }

  // 가장 높은 weight 선택 (빈 배열이면 supportive fallback)
  if (matched.length === 0) {
    return {
      tone: "supportive",
      confidence: 0.3,
      reason: "no matching rules → supportive fallback",
      paradoxInfluence: false,
    }
  }

  matched.sort((a, b) => b.score - a.score)
  const best = matched[0]

  // confidence = weight × (조건 수 / 3 보정)
  const conditionBonus = Math.min(1, best.rule.conditions.length / 3)
  const confidence = Math.min(1, best.score * (0.5 + 0.5 * conditionBonus))

  // reason 생성
  const condDesc = best.rule.conditions
    .map((c) => `${c.dimension}${c.operator}${c.threshold}`)
    .join(" + ")
  const reason = condDesc ? `${condDesc} → ${best.rule.tone}` : `default → ${best.rule.tone}`

  return {
    tone: best.rule.tone,
    confidence,
    reason,
    paradoxInfluence: isParadoxInfluenced(best.rule.tone, paradoxScore),
  }
}
