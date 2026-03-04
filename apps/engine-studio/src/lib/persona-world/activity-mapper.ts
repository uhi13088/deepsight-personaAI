// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — Activity Mapper
// 구현계획서 §4, 설계서 §3.3~3.6, §4.4
// 3-Layer 벡터 → 8개 활동 특성 매핑
// ═══════════════════════════════════════════════════════════════

import { clamp } from "@/lib/vector/utils"
import type { ThreeLayerVector } from "@/types/persona-v3"
import { ACTIVE_HOURS, TRAIT_WEIGHTS } from "./constants"
import type { ActivityTraitsV3, PersonaStateData, VoiceStyleParams } from "./types"

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
 * 벡터 → 활동 시간대 동적 도출 (T376: 4 Chronotype).
 *
 * 설계서 §4.4 참조.
 *
 * 크로노타입 우선순위:
 *   1. 새벽형 (4~7시): 높은 conscientiousness + 낮은 extraversion + 낮은 neuroticism
 *   2. 오전형 (8~11시): 높은 purpose + 높은 conscientiousness
 *   3. 야행형 (21~01시): 야행성 점수 (neuroticism×0.4 + volatility×0.3 + (1-extraversion)×0.3) > 0.55
 *   4. 오후형 (13~18시): 기본값
 *
 * 윈도우 폭: 4 + round(endurance × 8) → 4~12시간
 */
export function computeActiveHours(vectors: ThreeLayerVector, traits: ActivityTraitsV3): number[] {
  const { social: l1, temperament: l2, narrative: l3 } = vectors
  const C = ACTIVE_HOURS

  // ── 크로노타입 분류 ──────────────────────────────────────────
  let peakHour: number

  if (
    l2.conscientiousness > C.dawnConscientiousnessMin &&
    l2.extraversion < C.dawnExtraversionMax &&
    l2.neuroticism < C.dawnNeuroticismMax
  ) {
    // 새벽형
    peakHour = C.dawnPeakBase + Math.round(l2.conscientiousness * 3)
  } else if (
    l1.purpose > C.morningPurposeMin &&
    l2.conscientiousness > C.morningConscientiousnessMin
  ) {
    // 오전형
    peakHour = C.morningPeakBase + Math.round(l1.purpose * 3)
  } else {
    // 야행성 점수 계산
    const nightOwlScore = l2.neuroticism * 0.4 + l3.volatility * 0.3 + (1 - l2.extraversion) * 0.3
    if (nightOwlScore > C.nightOwlScoreThreshold) {
      // 야행형
      peakHour = C.nightOwlPeakBase + Math.round(l3.volatility * 4)
    } else {
      // 오후형 (기본)
      peakHour = C.afternoonPeakBase + Math.round(l1.sociability * 5)
    }
  }

  peakHour = peakHour % 24

  // ── 윈도우 폭 계산 ───────────────────────────────────────────
  const windowTotal =
    C.windowMinHours + Math.round(traits.endurance * (C.windowMaxHours - C.windowMinHours))
  const windowStart = peakHour - Math.round(windowTotal * C.windowStartRatio)
  const windowEnd = peakHour + Math.round(windowTotal * C.windowEndRatio)

  const hours: number[] = []
  for (let h = windowStart; h <= windowEnd; h++) {
    hours.push(((h % 24) + 24) % 24) // normalize to 0~23
  }

  // 중복 제거 + 정렬
  return [...new Set(hours)].sort((a, b) => a - b)
}

/**
 * 3-Layer 벡터 → Voice 스타일 파라미터 도출.
 *
 * 6개 스타일 차원을 벡터 조합으로 산출:
 * - formality: 격식도 (lens×0.4 + conscientiousness×0.3 + purpose×0.3)
 * - humor: 유머 (taste×0.3 + (1-neuroticism)×0.3 + volatility×0.2 + sociability×0.2)
 * - sentenceLength: 문장 호흡 (scope×0.4 + depth×0.3 + (1-extraversion)×0.3)
 * - emotionExpression: 감정 표현 ((1-lens)×0.3 + neuroticism×0.3 + volatility×0.2 + lack×0.2)
 * - assertiveness: 단정적 어조 (stance×0.4 + moralCompass×0.3 + conscientiousness×0.3)
 * - vocabularyLevel: 어휘 수준 (depth×0.3 + lens×0.3 + openness×0.2 + purpose×0.2)
 */
export function computeVoiceParams(vectors: ThreeLayerVector): VoiceStyleParams {
  const { social: l1, temperament: l2, narrative: l3 } = vectors

  return {
    formality: clamp(l1.lens * 0.4 + l2.conscientiousness * 0.3 + l1.purpose * 0.3),
    humor: clamp(
      l1.taste * 0.3 + (1 - l2.neuroticism) * 0.3 + l3.volatility * 0.2 + l1.sociability * 0.2
    ),
    sentenceLength: clamp(l1.scope * 0.4 + l1.depth * 0.3 + (1 - l2.extraversion) * 0.3),
    emotionExpression: clamp(
      (1 - l1.lens) * 0.3 + l2.neuroticism * 0.3 + l3.volatility * 0.2 + l3.lack * 0.2
    ),
    assertiveness: clamp(l1.stance * 0.4 + l3.moralCompass * 0.3 + l2.conscientiousness * 0.3),
    vocabularyLevel: clamp(l1.depth * 0.3 + l1.lens * 0.3 + l2.openness * 0.2 + l1.purpose * 0.2),
  }
}

/**
 * postFrequency 값 → 활동 확률 배수.
 *
 * RARE=0.3, OCCASIONAL=0.5, MODERATE=1.0, ACTIVE=1.5, HYPERACTIVE=2.0
 */
const POST_FREQUENCY_MULTIPLIERS: Record<string, number> = {
  RARE: 0.3,
  OCCASIONAL: 0.5,
  MODERATE: 1.0,
  ACTIVE: 1.5,
  HYPERACTIVE: 2.0,
}

/**
 * PersonaState 보정된 최종 활동 확률 계산.
 *
 * 설계서 §3.6 참조.
 *
 * adjustedPostProbability = base × energy × (0.5 + mood × 0.5) × freqMultiplier
 * adjustedInteractionProbability = base × socialBattery × energy
 */
export function computeActivityProbabilities(
  traits: ActivityTraitsV3,
  state: PersonaStateData,
  postFrequency?: string
): { postProbability: number; interactionProbability: number } {
  // base 확률: sociability가 높을수록 포스팅 확률 높음
  const basePostProbability = traits.sociability * traits.initiative
  // base 인터랙션: interactivity 기반
  const baseInteractionProbability = traits.interactivity * traits.sociability

  // postFrequency 배수 적용
  const freqMultiplier = postFrequency ? (POST_FREQUENCY_MULTIPLIERS[postFrequency] ?? 1.0) : 1.0

  const postProbability = clamp(
    basePostProbability * state.energy * (0.5 + state.mood * 0.5) * freqMultiplier
  )

  const interactionProbability = clamp(
    baseInteractionProbability * state.socialBattery * state.energy
  )

  return { postProbability, interactionProbability }
}
