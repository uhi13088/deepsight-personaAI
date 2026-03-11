// ═══════════════════════════════════════════════════════════════
// V_Final 동적 Pressure 계산 (T416)
//
// P_raw = paradoxTension × 0.5
//       + moodExtreme × 0.2        // |mood - 0.5| × 2
//       + narrativeTension × 0.15
//       + triggerPressureBoost × 0.15
//
// P_final = clamp(P_raw, 0, worldConfig.maxPressure)
// ═══════════════════════════════════════════════════════════════

import { clamp } from "@/lib/vector/utils"
import type { RuleEffect } from "@/lib/trigger/rule-dsl"
import type { PersonaStateData } from "./types"
import type { VFinalLevelConfig } from "./vfinal-config"

// ── 가중치 상수 ──────────────────────────────────────────────

const WEIGHT_PARADOX = 0.5
const WEIGHT_MOOD_EXTREME = 0.2
const WEIGHT_NARRATIVE = 0.15
const WEIGHT_TRIGGER = 0.15

// ── Pressure 계산 ────────────────────────────────────────────

export interface PressureResult {
  /** 최종 Pressure (0.0~maxPressure) */
  pressure: number
  /** 원시 Pressure (clamp 전) */
  rawPressure: number
  /** 각 요소별 기여값 */
  contributions: {
    paradoxTension: number
    moodExtreme: number
    narrativeTension: number
    triggerBoost: number
  }
}

/**
 * PersonaState + TriggerMap 효과로부터 동적 Pressure를 계산.
 *
 * @param state - 현재 PersonaState
 * @param triggerPressureBoost - TriggerMap 규칙에서 누적된 Pressure 부스트 (0.0~1.0)
 * @param levelConfig - 월드 표현 강도 설정 (maxPressure로 상한 clamp)
 */
export function computePressure(
  state: PersonaStateData,
  triggerPressureBoost: number = 0,
  levelConfig?: VFinalLevelConfig
): PressureResult {
  // 각 요소 계산
  const paradox = state.paradoxTension * WEIGHT_PARADOX
  const moodExtreme = Math.abs(state.mood - 0.5) * 2 * WEIGHT_MOOD_EXTREME
  const narrative = (state.narrativeTension ?? 0) * WEIGHT_NARRATIVE
  const trigger = clamp(triggerPressureBoost) * WEIGHT_TRIGGER

  const rawPressure = paradox + moodExtreme + narrative + trigger

  // maxPressure로 상한 clamp
  const maxP = levelConfig?.maxPressure ?? 1.0
  const pressure = Math.max(0, Math.min(maxP, rawPressure))

  return {
    pressure,
    rawPressure,
    contributions: {
      paradoxTension: paradox,
      moodExtreme,
      narrativeTension: narrative,
      triggerBoost: trigger,
    },
  }
}

// ── TriggerMap 효과 → Pressure 부스트 변환 ───────────────────

/**
 * TriggerMap evaluateRules()의 appliedEffects를 Pressure 부스트 값으로 변환.
 *
 * boost 모드 효과의 magnitude 합산 (suppress는 감산).
 * triggerMultiplier를 적용하여 Level별로 스케일링.
 */
export function triggerEffectsToPressure(
  effects: RuleEffect[],
  triggerMultiplier: number = 1.0
): number {
  if (effects.length === 0) return 0

  let boost = 0
  for (const effect of effects) {
    if (effect.mode === "boost") {
      boost += effect.magnitude
    } else if (effect.mode === "suppress") {
      boost -= effect.magnitude * 0.5
    }
    // override는 pressure에 직접 영향 없음 (벡터만 변경)
  }

  return clamp(boost * triggerMultiplier)
}
