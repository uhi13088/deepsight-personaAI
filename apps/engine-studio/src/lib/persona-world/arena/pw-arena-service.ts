// ═══════════════════════════════════════════════════════════════
// PW Arena — 세션 서비스 (T430)
// 세션 생성 (코인 검증 → 차감 → DB 저장), 턴 실행, 세션 완료
// ═══════════════════════════════════════════════════════════════

import type { PWArenaCreateRequest } from "@deepsight/shared-types"
import { calculateArenaCost, ARENA_ROOM_CONFIGS, ROUND_ADDON_AMOUNT } from "@deepsight/shared-types"
import type { CreditDataProvider } from "../credit-service"
import { spendCredits, getBalance } from "../credit-service"
import type { PWArenaLLMProvider } from "./pw-arena-llm"
import type { PWArenaCreateParams, PWArenaSessionRecord, PWArenaTurnRecord } from "./pw-arena-types"
import { PW_ARENA_DAILY_SESSION_LIMIT, PW_ARENA_MAX_ROUNDS } from "./pw-arena-types"

// ── DI 인터페이스 ───────────────────────────────────────────

/** DB 접근 인터페이스 (Prisma DI) */
export interface PWArenaDataProvider {
  createSession(params: PWArenaCreateParams): Promise<PWArenaSessionRecord>
  getSession(sessionId: string): Promise<PWArenaSessionRecord | null>
  getSessionsByUser(
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<PWArenaSessionRecord[]>
  getActiveSessionsByUser(userId: string): Promise<PWArenaSessionRecord[]>
  getDailySessionCount(userId: string): Promise<number>
  updateSessionStatus(sessionId: string, status: string, completedAt?: Date): Promise<void>
  updateSessionRound(sessionId: string, currentRound: number): Promise<void>
  createTurn(data: {
    sessionId: string
    roundNumber: number
    speakerId: string
    content: string
    tokensUsed: number
  }): Promise<PWArenaTurnRecord>
  createVote(data: {
    sessionId: string
    userId: string
    personaId: string
    roundNumber: number | null
  }): Promise<void>
  markQualitySynced(sessionId: string): Promise<void>
  getCompletedUnsyncedSessions(limit?: number): Promise<PWArenaSessionRecord[]>
}

/** 페르소나 정보 조회 인터페이스 */
export interface PersonaProfileProvider {
  getPersonaProfile(personaId: string): Promise<{
    id: string
    name: string
    role: string
    description: string
    speechStyle: string
    habitualExpressions: string[]
  } | null>
}

// ── 검증 ────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * 세션 생성 전 검증
 */
export async function validateCreateSession(
  creditProvider: CreditDataProvider,
  arenaProvider: PWArenaDataProvider,
  userId: string,
  request: PWArenaCreateRequest
): Promise<ValidationResult> {
  // 1. 방 유형 확인
  const roomConfig = ARENA_ROOM_CONFIGS[request.roomType]
  if (!roomConfig) {
    return { valid: false, error: "INVALID_ROOM_TYPE" }
  }

  // 2. 참여 인원 확인
  const participantCount = request.participantIds.length
  if (
    participantCount < roomConfig.minParticipants ||
    participantCount > roomConfig.maxParticipants
  ) {
    return {
      valid: false,
      error: `INVALID_PARTICIPANT_COUNT: ${roomConfig.minParticipants}~${roomConfig.maxParticipants}명 필요`,
    }
  }

  // 3. 최대 라운드 확인
  const totalRounds = roomConfig.defaultRounds + request.extraRoundSets * ROUND_ADDON_AMOUNT
  if (totalRounds > PW_ARENA_MAX_ROUNDS) {
    return { valid: false, error: `MAX_ROUNDS_EXCEEDED: 최대 ${PW_ARENA_MAX_ROUNDS}라운드` }
  }

  // 4. 일일 세션 제한 확인
  const dailyCount = await arenaProvider.getDailySessionCount(userId)
  if (dailyCount >= PW_ARENA_DAILY_SESSION_LIMIT) {
    return { valid: false, error: "DAILY_SESSION_LIMIT_REACHED" }
  }

  // 5. 코인 잔액 확인
  const costBreakdown = calculateArenaCost(request)
  const balance = await getBalance(creditProvider, userId)
  if (balance < costBreakdown.totalPrice) {
    return { valid: false, error: "INSUFFICIENT_BALANCE" }
  }

  return { valid: true }
}

// ── 세션 생성 ───────────────────────────────────────────────

/**
 * PW 아레나 세션 생성.
 * 코인 검증 → 차감 → DB 저장 → 세션 반환.
 */
export async function createArenaSession(
  creditProvider: CreditDataProvider,
  arenaProvider: PWArenaDataProvider,
  userId: string,
  request: PWArenaCreateRequest
): Promise<PWArenaSessionRecord> {
  // 검증
  const validation = await validateCreateSession(creditProvider, arenaProvider, userId, request)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // 비용 계산 + 코인 차감
  const costBreakdown = calculateArenaCost(request)
  await spendCredits(
    creditProvider,
    userId,
    costBreakdown.totalPrice,
    `PW_ARENA_${request.roomType}`
  )

  // 세션 생성
  const roomConfig = ARENA_ROOM_CONFIGS[request.roomType]
  const maxRounds = roomConfig.defaultRounds + request.extraRoundSets * ROUND_ADDON_AMOUNT

  return arenaProvider.createSession({
    userId,
    roomType: request.roomType,
    topic: request.topic,
    participantIds: request.participantIds,
    maxRounds,
    saveReplay: request.saveReplay,
    costBreakdown,
  })
}

// ── 턴 실행 ─────────────────────────────────────────────────

/**
 * 다음 라운드의 모든 참여자 턴을 실행.
 * 각 페르소나가 순서대로 발언.
 */
export async function executeNextRound(
  arenaProvider: PWArenaDataProvider,
  personaProvider: PersonaProfileProvider,
  llmProvider: PWArenaLLMProvider,
  sessionId: string
): Promise<PWArenaTurnRecord[]> {
  const session = await arenaProvider.getSession(sessionId)
  if (!session) throw new Error("SESSION_NOT_FOUND")
  if (session.status !== "WAITING" && session.status !== "IN_PROGRESS") {
    throw new Error("SESSION_NOT_ACTIVE")
  }

  const nextRound = session.currentRound + 1
  if (nextRound > session.maxRounds) {
    throw new Error("MAX_ROUNDS_REACHED")
  }

  // 세션 상태 업데이트
  if (session.status === "WAITING") {
    await arenaProvider.updateSessionStatus(sessionId, "IN_PROGRESS")
  }

  // 이전 턴 컨텍스트
  const previousTurns = session.turns.map((t) => ({
    speakerId: t.speakerId,
    content: t.content,
    roundNumber: t.roundNumber,
  }))

  // 각 페르소나 발언 생성
  const participantIds = session.participantIds as string[]
  const newTurns: PWArenaTurnRecord[] = []

  for (const personaId of participantIds) {
    const profile = await personaProvider.getPersonaProfile(personaId)
    if (!profile) continue

    const result = await llmProvider.generateTurn({
      sessionId,
      roundNumber: nextRound,
      speakerId: personaId,
      topic: session.topic,
      previousTurns: [
        ...previousTurns,
        ...newTurns.map((t) => ({
          speakerId: t.speakerId,
          content: t.content,
          roundNumber: t.roundNumber,
        })),
      ],
      personaProfile: {
        name: profile.name,
        role: profile.role,
        description: profile.description,
        speechStyle: profile.speechStyle,
        habitualExpressions: profile.habitualExpressions,
      },
    })

    const turn = await arenaProvider.createTurn({
      sessionId,
      roundNumber: nextRound,
      speakerId: personaId,
      content: result.content,
      tokensUsed: result.tokensUsed,
    })
    newTurns.push(turn)

    // 이전 턴에 현재 턴 추가 (다음 페르소나 컨텍스트에 포함)
    previousTurns.push({
      speakerId: personaId,
      content: result.content,
      roundNumber: nextRound,
    })
  }

  // 라운드 업데이트
  await arenaProvider.updateSessionRound(sessionId, nextRound)

  // 마지막 라운드면 세션 완료
  if (nextRound >= session.maxRounds) {
    await arenaProvider.updateSessionStatus(sessionId, "COMPLETED", new Date())
  }

  return newTurns
}

// ── 세션 완료/취소 ──────────────────────────────────────────

/**
 * 세션 조기 완료 (유저가 중간에 종료)
 */
export async function completeSession(
  arenaProvider: PWArenaDataProvider,
  sessionId: string,
  userId: string
): Promise<void> {
  const session = await arenaProvider.getSession(sessionId)
  if (!session) throw new Error("SESSION_NOT_FOUND")
  if (session.userId !== userId) throw new Error("UNAUTHORIZED")
  if (session.status !== "WAITING" && session.status !== "IN_PROGRESS") {
    throw new Error("SESSION_NOT_ACTIVE")
  }

  await arenaProvider.updateSessionStatus(sessionId, "COMPLETED", new Date())
}

/**
 * 세션 취소
 */
export async function cancelSession(
  arenaProvider: PWArenaDataProvider,
  sessionId: string,
  userId: string
): Promise<void> {
  const session = await arenaProvider.getSession(sessionId)
  if (!session) throw new Error("SESSION_NOT_FOUND")
  if (session.userId !== userId) throw new Error("UNAUTHORIZED")
  if (session.status !== "WAITING") {
    throw new Error("CANNOT_CANCEL_IN_PROGRESS")
  }

  await arenaProvider.updateSessionStatus(sessionId, "CANCELLED")
}
