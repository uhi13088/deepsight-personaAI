// ═══════════════════════════════════════════════════════════════
// Call Service — 1:1 통화 서비스 (T338)
//
// DI 기반. Voice Pipeline + Conversation Engine + Memory Pipeline + Credit 통합.
// createReservation → startCall → processTurn (STT→LLM→TTS) → endCall
// ═══════════════════════════════════════════════════════════════

import { generateConversationResponse } from "./conversation-engine"
import type { ConversationMessage, ConversationInput } from "./conversation-engine"
import {
  retrieveConversationMemories,
  recordConversationTurn,
  finalizeConversation,
  adjustStateForConversation,
} from "./conversation-memory"
import type {
  ConversationMemoryProvider,
  ConversationTurnInput,
  ConversationFinalizeInput,
} from "./conversation-memory"
import { spendCredits, getBalance } from "./credit-service"
import type { CreditDataProvider } from "./credit-service"
import { updateIntimacyAfterChat } from "./intimacy-engine"
import { speechToText, textToSpeech, buildTTSConfig, sttLanguageToBcp47 } from "./voice-pipeline"
import type { TTSResult } from "./voice-pipeline"
import type { PersonaProfileSnapshot, PersonaStateData } from "./types"

// ── 상수 ────────────────────────────────────────────────────

/** 통화 예약 비용 (코인) */
const CALL_RESERVATION_COST = 200

/** 통화 최대 시간 (초) */
const MAX_CALL_DURATION_SEC = 600 // 10분

/** 통화 최대 턴 수 */
const MAX_CALL_TURNS = 30

// ── DI 인터페이스 ───────────────────────────────────────────

export interface CallDataProvider extends ConversationMemoryProvider, CreditDataProvider {
  /** 예약 생성 */
  createReservation(params: {
    personaId: string
    userId: string
    scheduledAt: Date
    coinSpent: number
  }): Promise<{ id: string }>

  /** 예약 조회 */
  getReservation(reservationId: string): Promise<{
    id: string
    personaId: string
    userId: string
    scheduledAt: Date
    status: string
    coinSpent: number
  } | null>

  /** 예약 상태 업데이트 */
  updateReservationStatus(reservationId: string, status: string): Promise<void>

  /** 사용자 예약 목록 */
  getReservations(userId: string): Promise<
    Array<{
      id: string
      personaId: string
      personaName: string
      personaImageUrl: string | null
      scheduledAt: Date
      status: string
      coinSpent: number
    }>
  >

  /** 통화 세션 생성 */
  createCallSession(params: {
    reservationId: string
    interactionSessionId: string
  }): Promise<{ id: string }>

  /** 통화 세션 업데이트 */
  updateCallSession(
    sessionId: string,
    data: {
      endedAt?: Date
      totalTurns?: number
      totalDurationSec?: number
      summary?: string
    }
  ): Promise<void>

  /** 통화 세션 조회 */
  getCallSession(reservationId: string): Promise<{
    id: string
    reservationId: string
    interactionSessionId: string
    startedAt: Date
    endedAt: Date | null
    totalTurns: number
    totalDurationSec: number | null
  } | null>

  /** InteractionSession 생성 */
  createInteractionSession(params: { personaId: string; userId: string }): Promise<{ id: string }>

  /** 페르소나 프로필 조회 */
  getPersonaProfile(personaId: string): Promise<PersonaProfileSnapshot | null>

  /** L3 volatility 조회 */
  getPersonaVolatility(personaId: string): Promise<number>

  /** 페르소나 TTS 설정 조회 */
  getPersonaTTSConfig(personaId: string): Promise<{
    ttsProvider: string | null
    ttsVoiceId: string | null
    ttsPitch: number | null
    ttsSpeed: number | null
    ttsLanguage: string | null
  }>

  /** 유저↔페르소나의 ChatThread 친밀도 조회 (통화에서도 친밀도 반영) */
  getIntimacyByUserAndPersona(
    userId: string,
    personaId: string
  ): Promise<{
    threadId: string
    intimacyLevel: number
    sharedMilestones: string[] | null
    intimacyScore: number
    lastIntimacyAt: Date | null
  } | null>

  /** ChatThread 친밀도 업데이트 (IntimacyDataProvider 호환) */
  getThreadIntimacy(threadId: string): Promise<{
    intimacyScore: number
    intimacyLevel: number
    lastIntimacyAt: Date | null
    sharedMilestones: string[] | null
    personaId: string
    userId: string
  } | null>

  /** ChatThread 친밀도 업데이트 */
  updateThreadIntimacy(
    threadId: string,
    data: {
      intimacyScore: number
      intimacyLevel: number
      lastIntimacyAt: Date
      sharedMilestones?: string[]
    }
  ): Promise<void>
}

// ── 서비스 함수: 예약 생성 ───────────────────────────────────

export interface CreateReservationResult {
  reservationId: string
  remainingBalance: number
}

/**
 * 통화 예약 생성.
 * 코인 차감 → 예약 레코드 생성.
 */
export async function createReservation(
  dp: CallDataProvider,
  params: { personaId: string; userId: string; scheduledAt: Date }
): Promise<CreateReservationResult> {
  // 1. 잔액 확인
  const balance = await getBalance(dp, params.userId)
  if (balance < CALL_RESERVATION_COST) {
    throw new Error("INSUFFICIENT_CREDITS")
  }

  // 2. 코인 차감
  const txRecord = await spendCredits(dp, params.userId, CALL_RESERVATION_COST, "통화 예약")

  // 3. 예약 생성
  const reservation = await dp.createReservation({
    personaId: params.personaId,
    userId: params.userId,
    scheduledAt: params.scheduledAt,
    coinSpent: CALL_RESERVATION_COST,
  })

  return {
    reservationId: reservation.id,
    remainingBalance: txRecord.balanceAfter,
  }
}

// ── 서비스 함수: 통화 시작 ───────────────────────────────────

export interface StartCallResult {
  callSessionId: string
  interactionSessionId: string
  greetingText: string
  greetingAudio: TTSResult
}

/**
 * 통화 시작.
 * 예약 확인 → CallSession 생성 → 인사 생성 + TTS
 */
export async function startCall(
  dp: CallDataProvider,
  reservationId: string,
  userNickname?: string
): Promise<StartCallResult> {
  // 1. 예약 확인
  const reservation = await dp.getReservation(reservationId)
  if (!reservation) throw new Error("RESERVATION_NOT_FOUND")
  if (reservation.status !== "CONFIRMED" && reservation.status !== "PENDING") {
    throw new Error("RESERVATION_NOT_AVAILABLE")
  }

  // 2. InteractionSession 생성
  const session = await dp.createInteractionSession({
    personaId: reservation.personaId,
    userId: reservation.userId,
  })

  // 3. CallSession 생성
  const callSession = await dp.createCallSession({
    reservationId,
    interactionSessionId: session.id,
  })

  // 4. 예약 상태 → IN_PROGRESS
  await dp.updateReservationStatus(reservationId, "IN_PROGRESS")

  // 5. 페르소나 프로필 + 상태 로드
  const profile = await dp.getPersonaProfile(reservation.personaId)
  if (!profile) throw new Error("PERSONA_NOT_FOUND")

  const state = await dp.getPersonaState(reservation.personaId)
  const defaultState: PersonaStateData = {
    mood: 0.6,
    energy: 0.7,
    socialBattery: 0.5,
    paradoxTension: 0.1,
  }
  const currentState = state ?? defaultState

  // 6. 기억 검색
  const ragContext = await retrieveConversationMemories(
    dp,
    reservation.personaId,
    reservation.userId
  )

  // 7. 친밀도 조회 (ChatThread 기반)
  const intimacyData = await dp.getIntimacyByUserAndPersona(
    reservation.userId,
    reservation.personaId
  )

  // 8. 인사 생성 (LLM)
  const input: ConversationInput = {
    context: {
      persona: profile,
      personaId: reservation.personaId,
      personaState: currentState,
      ragContext,
      mode: "call",
      userNickname,
      intimacyLevel: intimacyData?.intimacyLevel,
      sharedMilestones: intimacyData?.sharedMilestones ?? undefined,
    },
    history: [],
    userMessage: "안녕하세요, 전화 받아주셔서 감사해요!",
  }
  const greetingResult = await generateConversationResponse(input)

  // 8. TTS
  const ttsConfig = buildTTSConfig(await dp.getPersonaTTSConfig(reservation.personaId))
  const greetingAudio = await textToSpeech(greetingResult.text, ttsConfig)

  return {
    callSessionId: callSession.id,
    interactionSessionId: session.id,
    greetingText: greetingResult.text,
    greetingAudio,
  }
}

// ── 서비스 함수: 턴 처리 ─────────────────────────────────────

export interface CallTurnResult {
  userText: string
  personaText: string
  personaAudio: TTSResult
  turnNumber: number
  shouldEnd: boolean
  /** STT가 감지한 유저 사용 언어 (ISO 639-1) */
  detectedLanguage: string
}

/**
 * 통화 턴 처리: 유저 음성 → STT → LLM → TTS → 페르소나 음성
 */
export async function processCallTurn(
  dp: CallDataProvider,
  params: {
    reservationId: string
    callSessionId: string
    personaId: string
    userId: string
    audioBuffer: Buffer
    audioContentType: string
    conversationHistory: ConversationMessage[]
    turnNumber: number
    elapsedSec: number
    userNickname?: string
  }
): Promise<CallTurnResult> {
  // 1. 시간/턴 제한 확인
  const shouldEnd =
    params.turnNumber >= MAX_CALL_TURNS || params.elapsedSec >= MAX_CALL_DURATION_SEC

  // 2. STT
  const sttResult = await speechToText(params.audioBuffer, params.audioContentType)

  // 3. 페르소나 프로필 + 상태
  const profile = await dp.getPersonaProfile(params.personaId)
  if (!profile) throw new Error("PERSONA_NOT_FOUND")

  const state = await dp.getPersonaState(params.personaId)
  const defaultState: PersonaStateData = {
    mood: 0.6,
    energy: 0.7,
    socialBattery: 0.5,
    paradoxTension: 0.1,
  }
  const currentState = state ?? defaultState

  // 4. 기억 검색
  const ragContext = await retrieveConversationMemories(dp, params.personaId, params.userId)

  // 5. 유저 메시지 구성
  let userMessage = sttResult.text
  if (shouldEnd) {
    userMessage = `${sttResult.text}\n\n[시스템: 통화 시간이 거의 끝나갑니다. 자연스럽게 마무리 인사를 해주세요.]`
  }

  // 6. 친밀도 조회 (ChatThread 기반)
  const intimacyData = await dp.getIntimacyByUserAndPersona(params.userId, params.personaId)

  // 7. LLM 응답 생성 (유저 언어로 응답하도록 지시)
  const input: ConversationInput = {
    context: {
      persona: profile,
      personaId: params.personaId,
      personaState: currentState,
      ragContext,
      mode: "call",
      userLanguage: sttResult.language,
      userNickname: params.userNickname,
      intimacyLevel: intimacyData?.intimacyLevel,
      sharedMilestones: intimacyData?.sharedMilestones ?? undefined,
    },
    history: params.conversationHistory,
    userMessage,
  }
  const llmResult = await generateConversationResponse(input)

  // 7. TTS 변환 (유저 언어로 languageCode 오버라이드, voiceId/speed는 페르소나 프로필 유지)
  const ttsConfig = buildTTSConfig(await dp.getPersonaTTSConfig(params.personaId))
  ttsConfig.language = sttLanguageToBcp47(sttResult.language)
  const personaAudio = await textToSpeech(llmResult.text, ttsConfig)

  // 8. 기억 기록 (유저 발화 + 페르소나 응답)
  const volatility = await dp.getPersonaVolatility(params.personaId)
  const turnInput: ConversationTurnInput = {
    sessionId: params.callSessionId,
    turnNumber: params.turnNumber,
    personaId: params.personaId,
    userId: params.userId,
    userMessage: sttResult.text,
    personaResponse: llmResult.text,
    responseLengthTokens: llmResult.outputTokens,
    previousMood: currentState.mood,
    currentMood: currentState.mood, // 미세 변화는 adjustState에서 처리
    volatility,
  }
  const { poignancy } = await recordConversationTurn(dp, turnInput)

  // 9. 친밀도 업데이트 (ChatThread 기반)
  if (intimacyData) {
    await updateIntimacyAfterChat(dp, intimacyData.threadId, poignancy)
  }

  // 10. 상태 조정
  const updatedState = adjustStateForConversation(currentState, "neutral")
  await dp.savePersonaState(params.personaId, updatedState)

  // 10. CallSession 턴 수 업데이트
  await dp.updateCallSession(params.callSessionId, {
    totalTurns: params.turnNumber + 1,
  })

  return {
    userText: sttResult.text,
    personaText: llmResult.text,
    personaAudio,
    turnNumber: params.turnNumber + 1,
    shouldEnd,
    detectedLanguage: sttResult.language,
  }
}

// ── 서비스 함수: 통화 종료 ───────────────────────────────────

export interface EndCallResult {
  totalTurns: number
  totalDurationSec: number
}

/**
 * 통화 종료.
 * CallSession 마감 → 예약 상태 COMPLETED → 기억 최종화.
 */
export async function endCall(
  dp: CallDataProvider,
  params: {
    reservationId: string
    callSessionId: string
    personaId: string
    userId: string
    totalTurns: number
    totalDurationSec: number
    highlights: string[]
  }
): Promise<EndCallResult> {
  // 1. CallSession 종료
  await dp.updateCallSession(params.callSessionId, {
    endedAt: new Date(),
    totalTurns: params.totalTurns,
    totalDurationSec: params.totalDurationSec,
  })

  // 2. 예약 상태 → COMPLETED
  await dp.updateReservationStatus(params.reservationId, "COMPLETED")

  // 3. 기억 최종화 (Factbook + PersonaState 업데이트)
  const finalizeInput: ConversationFinalizeInput = {
    personaId: params.personaId,
    userId: params.userId,
    highlights: params.highlights,
    mode: "call",
    totalTurns: params.totalTurns,
  }
  await finalizeConversation(dp, finalizeInput)

  return {
    totalTurns: params.totalTurns,
    totalDurationSec: params.totalDurationSec,
  }
}

// ── 서비스 함수: 예약 목록 ───────────────────────────────────

/**
 * 사용자의 통화 예약 목록 조회.
 */
export async function getReservations(
  dp: CallDataProvider,
  userId: string
): Promise<
  Array<{
    id: string
    personaId: string
    personaName: string
    personaImageUrl: string | null
    scheduledAt: string
    status: string
    coinSpent: number
  }>
> {
  const reservations = await dp.getReservations(userId)
  return reservations.map((r) => ({
    ...r,
    scheduledAt: r.scheduledAt.toISOString(),
  }))
}

/**
 * 예약 취소. PENDING/CONFIRMED만 가능. 코인 환불 없음(정책).
 */
export async function cancelReservation(
  dp: CallDataProvider,
  params: { reservationId: string; userId: string }
): Promise<void> {
  const reservation = await dp.getReservation(params.reservationId)
  if (!reservation) throw new Error("RESERVATION_NOT_FOUND")
  if (reservation.userId !== params.userId) throw new Error("UNAUTHORIZED")
  if (reservation.status !== "PENDING" && reservation.status !== "CONFIRMED") {
    throw new Error("CANNOT_CANCEL")
  }

  await dp.updateReservationStatus(params.reservationId, "CANCELLED")
}
