// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Activity Mapper
// 구현계획서 §4, 설계서 §3.3~3.6, §4.4
// 3-Layer 벡터 → 8개 활동 특성 매핑
// ═══════════════════════════════════════════════════════════════

import { clamp } from "@/lib/vector/utils"
import type { ThreeLayerVector } from "@/types/persona-v3"
import { ACTIVE_HOURS, TRAIT_WEIGHTS } from "./constants"
import type { ActivityTraitsV3, PersonaStateData } from "./types"

/**
 * 3-Layer 벡터 → 8개 활동 특성 매핑.
 *
 * 설계서 §3.3~3.4 참조.
 *
 * 기존 4특성: L1 기여 70% + L2 보정 20% + L3 보정 10%
 * 신규 4특성: L2/L3/Paradox 기반
 */
export function computeActivityTraits(
  vectors: ThreeLayerVector,
  paradoxScore: number
): ActivityTraitsV3 {
  const { social: l1, temperament: l2, narrative: l3 } = vectors
  const w = TRAIT_WEIGHTS

  // ── 기존 4특성 (L1 70% + L2 20% + L3 10%) ──

  // sociability: L1.sociability, L2.extraversion, L3.lack
  const sociability = clamp(
    w.existing.l1 * l1.sociability + w.existing.l2 * l2.extraversion + w.existing.l3 * l3.lack
  )

  // initiative: L1.stance×0.6 + L1.depth×0.4, L2.conscientiousness, L3.moralCompass
  const initiativeL1 = l1.stance * 0.6 + l1.depth * 0.4
  const initiative = clamp(
    w.existing.l1 * initiativeL1 +
      w.existing.l2 * l2.conscientiousness +
      w.existing.l3 * l3.moralCompass
  )

  // expressiveness: (1-L1.lens)×0.5 + L1.scope×0.5, L2.neuroticism, L3.volatility
  const expressivenessL1 = (1 - l1.lens) * 0.5 + l1.scope * 0.5
  const expressiveness = clamp(
    w.existing.l1 * expressivenessL1 +
      w.existing.l2 * l2.neuroticism +
      w.existing.l3 * l3.volatility
  )

  // interactivity: L1.sociability×0.7 + (1-L1.stance)×0.3, L2.agreeableness, L3.lack
  const interactivityL1 = l1.sociability * 0.7 + (1 - l1.stance) * 0.3
  const interactivity = clamp(
    w.existing.l1 * interactivityL1 + w.existing.l2 * l2.agreeableness + w.existing.l3 * l3.lack
  )

  // ── 신규 4특성 ──

  // endurance = L2.conscientiousness×0.4 + (1-L2.neuroticism)×0.4 + L2.extraversion×0.2
  const endurance = clamp(
    l2.conscientiousness * w.endurance.conscientiousness +
      (1 - l2.neuroticism) * w.endurance.neuroticism +
      l2.extraversion * w.endurance.extraversion
  )

  // volatility = L2.neuroticism×0.4 + L3.volatility×0.4 + paradoxScore×0.2
  const volatility = clamp(
    l2.neuroticism * w.volatility.neuroticism +
      l3.volatility * w.volatility.l3Volatility +
      paradoxScore * w.volatility.paradoxScore
  )

  // depthSeeking = L1.depth×0.3 + L1.purpose×0.3 + L3.lack×0.2 + L3.moralCompass×0.2
  const depthSeeking = clamp(
    l1.depth * w.depthSeeking.depth +
      l1.purpose * w.depthSeeking.purpose +
      l3.lack * w.depthSeeking.lack +
      l3.moralCompass * w.depthSeeking.moralCompass
  )

  // growthDrive = L3.growthArc×0.5 + (1-L3.lack)×0.3 + L2.openness×0.2
  const growthDrive = clamp(
    l3.growthArc * w.growthDrive.growthArc +
      (1 - l3.lack) * w.growthDrive.lack +
      l2.openness * w.growthDrive.openness
  )

  return {
    sociability,
    initiative,
    expressiveness,
    interactivity,
    endurance,
    volatility,
    depthSeeking,
    growthDrive,
  }
}

/**
 * 벡터 → 활동 시간대 동적 도출.
 *
 * 설계서 §4.4 참조.
 *
 * peakHour = 12 + round(L1.sociability × 10)
 * 활동 윈도우: ±endurance 기반 확장
 * 야행성 보정: extraversion < 0.3 AND neuroticism > 0.5 → +4시간
 */
export function computeActiveHours(vectors: ThreeLayerVector, traits: ActivityTraitsV3): number[] {
  const { social: l1, temperament: l2 } = vectors

  let peakHour =
    ACTIVE_HOURS.peakHourBase + Math.round(l1.sociability * ACTIVE_HOURS.sociabilityMultiplier)

  // 야행성 보정
  if (
    l2.extraversion < ACTIVE_HOURS.nightOwlExtraversionMax &&
    l2.neuroticism > ACTIVE_HOURS.nightOwlNeuroticismMin
  ) {
    peakHour += ACTIVE_HOURS.nightOwlShift
  }
  peakHour = peakHour % 24

  const windowStart = peakHour - Math.round(traits.endurance * ACTIVE_HOURS.windowStartMultiplier)
  const windowEnd = peakHour + Math.round(traits.endurance * ACTIVE_HOURS.windowEndMultiplier)

  const hours: number[] = []
  for (let h = windowStart; h <= windowEnd; h++) {
    hours.push(((h % 24) + 24) % 24) // normalize to 0~23
  }

  // 중복 제거 + 정렬
  return [...new Set(hours)].sort((a, b) => a - b)
}

/**
 * PersonaState 보정된 최종 활동 확률 계산.
 *
 * 설계서 §3.6 참조.
 *
 * adjustedPostProbability = base × energy × (0.5 + mood × 0.5)
 * adjustedInteractionProbability = base × socialBattery × energy
 */
export function computeActivityProbabilities(
  traits: ActivityTraitsV3,
  state: PersonaStateData
): { postProbability: number; interactionProbability: number } {
  // base 확률: sociability가 높을수록 포스팅 확률 높음
  const basePostProbability = traits.sociability * traits.initiative
  // base 인터랙션: interactivity 기반
  const baseInteractionProbability = traits.interactivity * traits.sociability

  const postProbability = clamp(basePostProbability * state.energy * (0.5 + state.mood * 0.5))

  const interactionProbability = clamp(
    baseInteractionProbability * state.socialBattery * state.energy
  )

  return { postProbability, interactionProbability }
}
