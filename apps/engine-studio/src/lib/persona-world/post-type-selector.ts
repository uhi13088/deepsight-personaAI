// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Post Type Selector
// 구현계획서 §5.2, 설계서 §4.5
// 포스트 타입 ↔ 레이어 친화도 계산 + 상태 보정 + 가중 랜덤 선택
// ═══════════════════════════════════════════════════════════════

import type { ThreeLayerVector } from "@/types/persona-v3"
import type { PersonaPostType } from "@/generated/prisma"
import { POST_TYPE_AFFINITIES, POST_TYPE_STATE_MODIFIERS } from "./constants"
import type { PersonaStateData, PostTypeAffinity } from "./types"

/**
 * 개별 포스트 타입의 친화도 점수를 계산.
 *
 * 설계서 §4.5:
 * score(type) = Σ(조건 충족 시 해당 벡터값 × weight, 미충족 시 0)
 */
export function computeAffinityScore(
  affinity: PostTypeAffinity,
  vectors: ThreeLayerVector,
  paradoxScore: number,
  state: PersonaStateData
): number {
  let score = 0

  for (const condition of affinity.conditions) {
    const value = getVectorValue(condition.layer, condition.dimension, vectors, paradoxScore, state)
    if (value === null) continue

    const passes =
      condition.operator === ">" ? value > condition.threshold : value < condition.threshold

    if (passes) {
      score += value * condition.weight
    }
  }

  return score
}

/**
 * 벡터/상태에서 차원 값 추출.
 */
function getVectorValue(
  layer: "L1" | "L2" | "L3" | "paradox",
  dimension: string,
  vectors: ThreeLayerVector,
  paradoxScore: number,
  state: PersonaStateData
): number | null {
  switch (layer) {
    case "L1": {
      const val = vectors.social[dimension as keyof typeof vectors.social]
      return typeof val === "number" ? val : null
    }
    case "L2": {
      const val = vectors.temperament[dimension as keyof typeof vectors.temperament]
      return typeof val === "number" ? val : null
    }
    case "L3": {
      const val = vectors.narrative[dimension as keyof typeof vectors.narrative]
      return typeof val === "number" ? val : null
    }
    case "paradox": {
      if (dimension === "paradoxScore") return paradoxScore
      if (dimension === "paradoxTension") return state.paradoxTension
      return null
    }
  }
}

/**
 * PersonaState 기반 포스트 타입 가중치 보정.
 *
 * 설계서 §4.5 step 2:
 * - mood < 0.4 → THOUGHT, BEHIND_STORY ×2
 * - paradoxTension > 0.7 → BEHIND_STORY, THOUGHT ×3
 * - energy < 0.3 → REACTION, RECOMMENDATION ×2
 */
export function applyStateModifiers(
  scores: Record<string, number>,
  state: PersonaStateData
): Record<string, number> {
  const modified = { ...scores }

  // mood < 0.4 → 감성적 시기
  if (state.mood < POST_TYPE_STATE_MODIFIERS.lowMood.threshold) {
    for (const type of POST_TYPE_STATE_MODIFIERS.lowMood.boostTypes) {
      if (modified[type] !== undefined) {
        modified[type] *= POST_TYPE_STATE_MODIFIERS.lowMood.multiplier
      }
    }
  }

  // paradoxTension > 0.7 → 폭발 직전
  if (state.paradoxTension > POST_TYPE_STATE_MODIFIERS.highParadoxTension.threshold) {
    for (const type of POST_TYPE_STATE_MODIFIERS.highParadoxTension.boostTypes) {
      if (modified[type] !== undefined) {
        modified[type] *= POST_TYPE_STATE_MODIFIERS.highParadoxTension.multiplier
      }
    }
  }

  // energy < 0.3 → 간단한 활동 선호
  if (state.energy < POST_TYPE_STATE_MODIFIERS.lowEnergy.threshold) {
    for (const type of POST_TYPE_STATE_MODIFIERS.lowEnergy.boostTypes) {
      if (modified[type] !== undefined) {
        modified[type] *= POST_TYPE_STATE_MODIFIERS.lowEnergy.multiplier
      }
    }
  }

  return modified
}

/**
 * 가중 랜덤 선택.
 *
 * 점수 배열에서 가중치 기반 랜덤 선택.
 * random 값을 외부에서 주입 가능 (테스트용).
 */
export function weightedRandomSelect(
  entries: Array<{ type: PersonaPostType; score: number }>,
  random?: number
): { type: PersonaPostType; probability: number } | null {
  const totalScore = entries.reduce((sum, e) => sum + e.score, 0)
  if (totalScore === 0) return null

  const r = (random ?? Math.random()) * totalScore
  let cumulative = 0

  for (const entry of entries) {
    cumulative += entry.score
    if (r <= cumulative) {
      return { type: entry.type, probability: entry.score / totalScore }
    }
  }

  // fallback: 마지막 항목
  const last = entries[entries.length - 1]
  return { type: last.type, probability: last.score / totalScore }
}

/**
 * 다양성 쿨다운: 최근 사용된 타입의 점수를 감소시켜 반복 방지.
 *
 * recentTypes 배열의 순서: [가장 최근, 그 이전, ...]
 * 감쇠: 최근 1번째 → ×0.2, 2번째 → ×0.5, 3번째 → ×0.7
 */
export function applyDiversityCooldown(
  scores: Record<string, number>,
  recentTypes: string[]
): Record<string, number> {
  const COOLDOWN_FACTORS = [0.2, 0.5, 0.7]
  const modified = { ...scores }

  for (let i = 0; i < Math.min(recentTypes.length, COOLDOWN_FACTORS.length); i++) {
    const type = recentTypes[i]
    if (modified[type] !== undefined) {
      modified[type] *= COOLDOWN_FACTORS[i]
    }
  }

  return modified
}

/**
 * 모든 포스트 타입의 친화도 점수를 계산하고 가중 랜덤으로 선택.
 *
 * 설계서 §4.5 전체 파이프라인:
 * 1. 각 포스트 타입의 친화도 점수 계산
 * 2. PersonaState 보정
 * 3. 다양성 쿨다운 (최근 사용 타입 감쇠)
 * 4. 가중 랜덤 선택
 */
export function selectPostType(
  vectors: ThreeLayerVector,
  paradoxScore: number,
  state: PersonaStateData,
  affinities: PostTypeAffinity[] = POST_TYPE_AFFINITIES,
  random?: number,
  recentTypes: string[] = []
): {
  selectedType: PersonaPostType
  scores: Record<string, number>
  stateModifiers: Record<string, number>
  reason: string
} {
  // Step 1: 친화도 점수 계산
  const rawScores: Record<string, number> = {}
  for (const affinity of affinities) {
    rawScores[affinity.type] = computeAffinityScore(affinity, vectors, paradoxScore, state)
  }

  // Step 2: 상태 보정
  const stateModified = applyStateModifiers(rawScores, state)

  // 상태 보정 비율 기록
  const stateModifierRecord: Record<string, number> = {}
  for (const key of Object.keys(rawScores)) {
    if (rawScores[key] > 0 && stateModified[key] !== rawScores[key]) {
      stateModifierRecord[key] = stateModified[key] / rawScores[key]
    }
  }

  // Step 3: 다양성 쿨다운
  const diversityApplied = applyDiversityCooldown(stateModified, recentTypes)

  // Step 4: 0점 초과 항목만 후보
  const candidates = Object.entries(diversityApplied)
    .filter(([, score]) => score > 0)
    .map(([type, score]) => ({ type: type as PersonaPostType, score }))

  // 후보가 없으면 기본 THOUGHT 반환
  if (candidates.length === 0) {
    return {
      selectedType: "THOUGHT" as PersonaPostType,
      scores: rawScores,
      stateModifiers: stateModifierRecord,
      reason: "no_affinity_match → fallback THOUGHT",
    }
  }

  const selection = weightedRandomSelect(candidates, random)!

  // reason 생성
  const topScores = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((c) => `${c.type}(${c.score.toFixed(2)})`)
    .join(", ")

  const cooldownInfo =
    recentTypes.length > 0 ? ` cooldown=[${recentTypes.slice(0, 3).join(",")}]` : ""

  return {
    selectedType: selection.type,
    scores: rawScores,
    stateModifiers: stateModifierRecord,
    reason: `top3=[${topScores}] → selected ${selection.type}(p=${selection.probability.toFixed(2)})${cooldownInfo}`,
  }
}
