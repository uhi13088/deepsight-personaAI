// ═══════════════════════════════════════════════════════════════
// PersonaWorld v3 — State Manager
// 구현계획서 §5.4, 설계서 §3.6
// PersonaState 초기화, 업데이트, 조회
// + 성격 기반 개인화 (PersonalitySensitivity)
// ═══════════════════════════════════════════════════════════════

import { clamp } from "@/lib/vector/utils"
import { prisma } from "@/lib/prisma"
import type { ThreeLayerVector } from "@/types/persona-v3"
import { STATE_DEFAULTS, STATE_DELTAS } from "./constants"
import type { PersonaStateData, StateUpdateEvent, PersonalitySensitivity } from "./types"

/**
 * 3-Layer 벡터 → 성격 민감도 계수 산출.
 *
 * 각 계수는 0.5~1.5 범위:
 * - 1.0 = 기본 반응 (기존 상수 delta 그대로)
 * - >1.0 = 더 민감하게 반응 (예: neuroticism 높으면 기분 변화 큼)
 * - <1.0 = 둔감하게 반응 (예: extraversion 높으면 소셜 소모 적음)
 */
export function computePersonalitySensitivity(vectors: ThreeLayerVector): PersonalitySensitivity {
  const { temperament: l2, narrative: l3 } = vectors
  return {
    // neuroticism 0→0.5, 0.5→1.0, 1.0→1.5
    moodSensitivity: 0.5 + l2.neuroticism,
    // extraversion+conscientiousness 평균 → 회복 속도
    energyRecoveryRate: 0.5 + (l2.extraversion * 0.5 + l2.conscientiousness * 0.5),
    // 내향적일수록 소셜 소모 빠름: extraversion 0→1.5, 1.0→0.5
    socialDrain: 0.5 + (1 - l2.extraversion),
    // neuroticism+volatility 평균 → 긴장 축적 속도
    tensionSensitivity: 0.5 + (l2.neuroticism * 0.5 + l3.volatility * 0.5),
  }
}

/**
 * PersonaState 초기화 (페르소나 생성 시).
 *
 * 벡터 기반으로 초기 상태를 약간 보정.
 * - mood: 기본 0.5 (중립)
 * - energy: 기본 1.0 (충만)
 * - socialBattery: 기본 1.0 (충전)
 * - paradoxTension: paradoxScore × 0.3 (높은 모순→약간 긴장 시작)
 * - narrativeTension: L3.lack × 0.3 (높은 결핍→약간 서사 긴장)
 */
export function initializeState(vectors: ThreeLayerVector, paradoxScore: number): PersonaStateData {
  return {
    mood: STATE_DEFAULTS.mood,
    energy: STATE_DEFAULTS.energy,
    socialBattery: STATE_DEFAULTS.socialBattery,
    paradoxTension: clamp(paradoxScore * 0.3),
    narrativeTension: clamp(vectors.narrative.lack * 0.3),
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

  // v4.0 T326: 활동 카운터 증분 + lastActivityAt 설정
  const counterUpdate: Record<string, unknown> = {}
  if (event.type === "post_created") {
    counterUpdate.postsThisWeek = { increment: 1 }
    counterUpdate.lastActivityAt = new Date()
  } else if (event.type === "comment_created") {
    counterUpdate.commentsThisWeek = { increment: 1 }
    counterUpdate.lastActivityAt = new Date()
  }

  await prisma.personaState.upsert({
    where: { personaId },
    update: {
      mood: updated.mood,
      energy: updated.energy,
      socialBattery: updated.socialBattery,
      paradoxTension: updated.paradoxTension,
      narrativeTension: updated.narrativeTension ?? 0,
      ...counterUpdate,
    },
    create: {
      personaId,
      mood: updated.mood,
      energy: updated.energy,
      socialBattery: updated.socialBattery,
      paradoxTension: updated.paradoxTension,
      narrativeTension: updated.narrativeTension ?? 0,
      ...(event.type === "post_created" ? { postsThisWeek: 1, lastActivityAt: new Date() } : {}),
      ...(event.type === "comment_created"
        ? { commentsThisWeek: 1, lastActivityAt: new Date() }
        : {}),
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
    narrativeTension: "narrativeTension" in state ? Number(state.narrativeTension) : 0,
  }
}

/**
 * 이벤트에 따른 상태 변화 적용 (순수 함수).
 *
 * sensitivity가 제공되면 성격 기반 개인화 적용:
 * - mood delta × moodSensitivity (neuroticism 높으면 기분 변화 큼)
 * - energy recovery × energyRecoveryRate
 * - socialBattery drain × socialDrain (내향적이면 소셜 소모 큼)
 * - paradoxTension delta × tensionSensitivity
 */
export function applyStateEvent(
  current: PersonaStateData,
  event: StateUpdateEvent,
  sensitivity?: PersonalitySensitivity
): PersonaStateData {
  const next = { ...current }
  const ms = sensitivity?.moodSensitivity ?? 1.0
  const er = sensitivity?.energyRecoveryRate ?? 1.0
  const sd = sensitivity?.socialDrain ?? 1.0
  const ts = sensitivity?.tensionSensitivity ?? 1.0

  switch (event.type) {
    case "post_created": {
      const d = STATE_DELTAS.post_created
      next.energy = clamp(next.energy + d.energy)
      next.mood = clamp(next.mood + d.mood * ms)
      // 글쓰기 = 서사 긴장 해소 (자기표현)
      if (next.narrativeTension !== undefined) {
        next.narrativeTension = clamp(next.narrativeTension - 0.03)
      }
      break
    }
    case "comment_created": {
      const d = STATE_DELTAS.comment_created
      next.energy = clamp(next.energy + d.energy)
      next.socialBattery = clamp(next.socialBattery + d.socialBattery * sd)
      // 댓글 = 약간의 서사 긴장 해소
      if (next.narrativeTension !== undefined) {
        next.narrativeTension = clamp(next.narrativeTension - 0.01)
      }
      break
    }
    case "comment_received": {
      const key = `comment_received_${event.sentiment}` as keyof typeof STATE_DELTAS
      const d = STATE_DELTAS[key]
      if (d && "mood" in d) {
        next.mood = clamp(next.mood + d.mood * ms)
      }
      if (d && "paradoxTension" in d) {
        next.paradoxTension = clamp(
          next.paradoxTension + (d as { paradoxTension: number }).paradoxTension * ts
        )
      }
      // 부정적/공격적 댓글은 서사 긴장 축적 (결핍 자극)
      if (next.narrativeTension !== undefined) {
        if (event.sentiment === "negative") {
          next.narrativeTension = clamp(next.narrativeTension + 0.02 * ts)
        } else if (event.sentiment === "aggressive") {
          next.narrativeTension = clamp(next.narrativeTension + 0.04 * ts)
        } else if (event.sentiment === "positive") {
          next.narrativeTension = clamp(next.narrativeTension - 0.01)
        }
      }
      break
    }
    case "like_received": {
      const d = STATE_DELTAS.like_received
      next.mood = clamp(next.mood + d.mood * ms)
      break
    }
    case "idle_period": {
      const d = STATE_DELTAS.idle_period_per_hour
      next.energy = clamp(next.energy + d.energy * event.hours * er)
      next.socialBattery = clamp(next.socialBattery + d.socialBattery * event.hours * er)
      next.paradoxTension = clamp(next.paradoxTension + d.paradoxTension * event.hours)
      // 비활동 시 서사 긴장은 느리게 축적 (결핍이 쌓임)
      if (next.narrativeTension !== undefined) {
        next.narrativeTension = clamp(next.narrativeTension + 0.01 * event.hours)
      }
      break
    }
    case "like_given": {
      // 좋아요는 가벼운 인터랙션 — 소셜배터리만 미세 감소
      const drain = 0.002 * event.count * sd
      next.socialBattery = clamp(next.socialBattery - drain)
      break
    }
    case "repost_given": {
      // 리포스트는 좋아요보다 약간 더 관여
      const drain = 0.003 * event.count * sd
      next.socialBattery = clamp(next.socialBattery - drain)
      next.energy = clamp(next.energy - 0.001 * event.count)
      break
    }
    case "follow_given": {
      // 팔로우는 사회적 결정 — 소셜배터리 약간 감소
      const drain = 0.005 * event.count * sd
      next.socialBattery = clamp(next.socialBattery - drain)
      break
    }
    case "paradox_situation": {
      const d = STATE_DELTAS.paradox_situation
      next.paradoxTension = clamp(next.paradoxTension + d.paradoxTension * event.intensity * ts)
      // Paradox 상황은 서사 긴장도 증가
      if (next.narrativeTension !== undefined) {
        next.narrativeTension = clamp(next.narrativeTension + 0.05 * event.intensity)
      }
      break
    }
    case "paradox_resolved": {
      const d = STATE_DELTAS.paradox_resolved
      next.paradoxTension = clamp(next.paradoxTension + d.paradoxTension)
      next.mood = clamp(next.mood + d.mood * ms)
      // 모순 해소 = 서사 긴장 해소
      if (next.narrativeTension !== undefined) {
        next.narrativeTension = clamp(next.narrativeTension - 0.08)
      }
      break
    }
  }

  return next
}
