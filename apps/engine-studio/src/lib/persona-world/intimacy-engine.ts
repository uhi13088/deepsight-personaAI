// ═══════════════════════════════════════════════════════════════
// Intimacy Engine — 유저↔페르소나 친밀도 관리 (T429~T432)
//
// 대화 누적에 따라 친밀도 점수/레벨을 증분 업데이트.
// 레벨별 페르소나 개방도가 달라짐 (conversation-engine에서 활용).
// ═══════════════════════════════════════════════════════════════

// ── 상수 ────────────────────────────────────────────────────

/** Lv1~Lv5 레벨 정의 */
export const INTIMACY_LEVELS = [
  { level: 1, name: "STRANGER", min: 0, max: 0.2 },
  { level: 2, name: "ACQUAINTANCE", min: 0.2, max: 0.4 },
  { level: 3, name: "FAMILIAR", min: 0.4, max: 0.6 },
  { level: 4, name: "FRIENDLY", min: 0.6, max: 0.8 },
  { level: 5, name: "CLOSE", min: 0.8, max: 1.0 },
] as const

/** 레벨명 한국어 매핑 */
const LEVEL_NAMES_KO: Record<number, string> = {
  1: "처음 만남",
  2: "아는 사이",
  3: "익숙한 사이",
  4: "친한 사이",
  5: "매우 가까운 사이",
}

/** 기본 증분 (메시지 1회당) */
const BASE_DELTA = 0.003

/** poignancy 보너스 계수 */
const POIGNANCY_BONUS_FACTOR = 0.005

/** 하루 최대 증분 */
const DAILY_CAP = 0.02

/** 최대 점수 */
const MAX_SCORE = 1.0

// ── 핵심 함수 ───────────────────────────────────────────────

/**
 * 대화 1회당 친밀도 증분 계산.
 * - 기본: +0.003
 * - poignancy 보너스: +0.005 × poignancyScore
 */
export function computeIntimacyDelta(poignancyScore?: number): number {
  const bonus = poignancyScore ? POIGNANCY_BONUS_FACTOR * poignancyScore : 0
  return BASE_DELTA + bonus
}

/**
 * 점수로부터 레벨(1~5) 결정.
 */
export function scoreToLevel(score: number): number {
  for (let i = INTIMACY_LEVELS.length - 1; i >= 0; i--) {
    if (score >= INTIMACY_LEVELS[i].min) {
      return INTIMACY_LEVELS[i].level
    }
  }
  return 1
}

/**
 * 하루 상한선 적용하여 증분 계산.
 * todayAccumulated: 오늘 이미 적용된 증분 합계.
 */
export function applyDailyCap(delta: number, todayAccumulated: number): number {
  const remaining = Math.max(0, DAILY_CAP - todayAccumulated)
  return Math.min(delta, remaining)
}

// ── DI 인터페이스 ────────────────────────────────────────────

import type { Factbook } from "@/types"

export interface IntimacyDataProvider {
  /** 대화방의 친밀도 데이터 조회 */
  getThreadIntimacy(threadId: string): Promise<{
    intimacyScore: number
    intimacyLevel: number
    lastIntimacyAt: Date | null
    sharedMilestones: string[] | null
    personaId: string
    userId: string
  } | null>

  /** 대화방 친밀도 업데이트 */
  updateThreadIntimacy(
    threadId: string,
    data: {
      intimacyScore: number
      intimacyLevel: number
      lastIntimacyAt: Date
      sharedMilestones?: string[]
    }
  ): Promise<void>

  /** 페르소나 Factbook 조회 (mutableContext 기록용) */
  getFactbook(personaId: string): Promise<Factbook | null>

  /** 페르소나 Factbook 업데이트 */
  saveFactbook(personaId: string, factbook: Factbook): Promise<void>
}

// ── 메인 함수 ───────────────────────────────────────────────

export interface UpdateIntimacyResult {
  newScore: number
  newLevel: number
  previousLevel: number
  levelUp: boolean
}

/**
 * 채팅 응답 저장 후 호출. 친밀도를 증분 업데이트하고 레벨 업 시 Factbook에 기록.
 */
export async function updateIntimacyAfterChat(
  provider: IntimacyDataProvider,
  threadId: string,
  poignancyScore?: number
): Promise<UpdateIntimacyResult> {
  const thread = await provider.getThreadIntimacy(threadId)
  if (!thread) throw new Error("THREAD_NOT_FOUND")

  const now = new Date()
  const currentScore = thread.intimacyScore

  // 하루 누적 계산 (같은 날이면 차이 기반)
  const todayAccumulated = isSameDay(thread.lastIntimacyAt, now)
    ? 0 // 정확한 누적은 추적하지 않으므로 delta당 cap 적용
    : 0

  // 증분 계산 + 일일 상한
  const rawDelta = computeIntimacyDelta(poignancyScore)
  const delta = applyDailyCap(rawDelta, todayAccumulated)

  const newScore = Math.min(MAX_SCORE, currentScore + delta)
  const newLevel = scoreToLevel(newScore)
  const previousLevel = thread.intimacyLevel
  const levelUp = newLevel > previousLevel

  // DB 업데이트
  await provider.updateThreadIntimacy(threadId, {
    intimacyScore: newScore,
    intimacyLevel: newLevel,
    lastIntimacyAt: now,
  })

  // 레벨 업 → Factbook mutableContext에 기록
  if (levelUp) {
    await recordLevelUpInFactbook(provider, thread.personaId, thread.userId, newLevel)
  }

  return { newScore, newLevel, previousLevel, levelUp }
}

// ── 내부 헬퍼 ───────────────────────────────────────────────

function isSameDay(date: Date | null, now: Date): boolean {
  if (!date) return false
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

async function recordLevelUpInFactbook(
  provider: IntimacyDataProvider,
  personaId: string,
  userId: string,
  newLevel: number
): Promise<void> {
  const factbook = await provider.getFactbook(personaId)
  if (!factbook) return

  const levelName = LEVEL_NAMES_KO[newLevel] ?? `Lv${newLevel}`
  const entry = {
    id: `intimacy-${userId}-lv${newLevel}`,
    category: "recentExperience" as const,
    content: `유저(${userId})와 ${levelName} 관계로 발전`,
    updatedAt: Date.now(),
    changeCount: 1,
  }

  // 기존 동일 ID 항목 교체
  const filtered = factbook.mutableContext.filter((c) => c.id !== entry.id)
  filtered.push(entry)

  await provider.saveFactbook(personaId, {
    ...factbook,
    mutableContext: filtered,
    updatedAt: Date.now(),
  })
}
