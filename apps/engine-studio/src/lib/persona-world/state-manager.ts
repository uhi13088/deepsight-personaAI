// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — State Manager
// 구현계획서 §5.4, 설계서 §3.6
// PersonaState 초기화, 업데이트, 조회
// ═══════════════════════════════════════════════════════════════

import { clamp } from "@/lib/vector/utils"
import { prisma } from "@/lib/prisma"
import type { ThreeLayerVector } from "@/types/persona-v3"
import { STATE_DEFAULTS, STATE_DELTAS } from "./constants"
import type { PersonaStateData, StateUpdateEvent } from "./types"

/**
 * PersonaState 초기화 (페르소나 생성 시).
 *
 * 벡터 기반으로 초기 상태를 약간 보정.
 * - mood: 기본 0.5 (중립)
 * - energy: 기본 1.0 (충만)
 * - socialBattery: 기본 1.0 (충전)
 * - paradoxTension: paradoxScore × 0.3 (높은 모순→약간 긴장 시작)
 */
export function initializeState(vectors: ThreeLayerVector, paradoxScore: number): PersonaStateData {
  return {
    mood: STATE_DEFAULTS.mood,
    energy: STATE_DEFAULTS.energy,
    socialBattery: STATE_DEFAULTS.socialBattery,
    paradoxTension: clamp(paradoxScore * 0.3),
  }
}

/**
 * PersonaState 업데이트.
 *
 * 설계서 §3.6 상태 업데이트 규칙:
 * - mood: 긍정 댓글 → ↑, 공격적 댓글 → ↓
 * - energy: 휴식 → ↑, 활동 → ↓ (endurance 비례)
 * - socialBattery: 비활동 → ↑, 인터랙션 → ↓
 * - paradoxTension: L1↔L2 모순 상황 → ↑, 해소 → ↓
 */
export async function updatePersonaState(
  personaId: string,
  event: StateUpdateEvent
): Promise<PersonaStateData> {
  const current = await getPersonaState(personaId)
  const updated = applyStateEvent(current, event)

  await prisma.personaState.upsert({
    where: { personaId },
    update: {
      mood: updated.mood,
      energy: updated.energy,
      socialBattery: updated.socialBattery,
      paradoxTension: updated.paradoxTension,
    },
    create: {
      personaId,
      mood: updated.mood,
      energy: updated.energy,
      socialBattery: updated.socialBattery,
      paradoxTension: updated.paradoxTension,
    },
  })

  return updated
}

/**
 * PersonaState 조회 (없으면 기본값 반환).
 */
export async function getPersonaState(personaId: string): Promise<PersonaStateData> {
  const state = await prisma.personaState.findUnique({
    where: { personaId },
  })

  if (!state) {
    return { ...STATE_DEFAULTS }
  }

  return {
    mood: Number(state.mood),
    energy: Number(state.energy),
    socialBattery: Number(state.socialBattery),
    paradoxTension: Number(state.paradoxTension),
  }
}

/**
 * 이벤트에 따른 상태 변화 적용 (순수 함수).
 */
export function applyStateEvent(
  current: PersonaStateData,
  event: StateUpdateEvent
): PersonaStateData {
  const next = { ...current }

  switch (event.type) {
    case "post_created": {
      const d = STATE_DELTAS.post_created
      next.energy = clamp(next.energy + d.energy)
      next.mood = clamp(next.mood + d.mood)
      break
    }
    case "comment_created": {
      const d = STATE_DELTAS.comment_created
      next.energy = clamp(next.energy + d.energy)
      next.socialBattery = clamp(next.socialBattery + d.socialBattery)
      break
    }
    case "comment_received": {
      const key = `comment_received_${event.sentiment}` as keyof typeof STATE_DELTAS
      const d = STATE_DELTAS[key]
      if (d && "mood" in d) {
        next.mood = clamp(next.mood + d.mood)
      }
      if (d && "paradoxTension" in d) {
        next.paradoxTension = clamp(
          next.paradoxTension + (d as { paradoxTension: number }).paradoxTension
        )
      }
      break
    }
    case "like_received": {
      const d = STATE_DELTAS.like_received
      next.mood = clamp(next.mood + d.mood)
      break
    }
    case "idle_period": {
      const d = STATE_DELTAS.idle_period_per_hour
      next.energy = clamp(next.energy + d.energy * event.hours)
      next.socialBattery = clamp(next.socialBattery + d.socialBattery * event.hours)
      next.paradoxTension = clamp(next.paradoxTension + d.paradoxTension * event.hours)
      break
    }
    case "paradox_situation": {
      const d = STATE_DELTAS.paradox_situation
      next.paradoxTension = clamp(next.paradoxTension + d.paradoxTension * event.intensity)
      break
    }
    case "paradox_resolved": {
      const d = STATE_DELTAS.paradox_resolved
      next.paradoxTension = clamp(next.paradoxTension + d.paradoxTension)
      next.mood = clamp(next.mood + d.mood)
      break
    }
  }

  return next
}
