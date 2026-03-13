// ═══════════════════════════════════════════════════════════════
// Chat Service — 1:1 채팅 서비스 (T333)
//
// DI 기반. Conversation Engine + Memory Pipeline + Credit Service 통합.
// createThread → sendMessage (코인 차감 + LLM 호출 + 기억 저장) → getMessages
// ═══════════════════════════════════════════════════════════════

import { generateConversationResponse } from "./conversation-engine"
import type {
  ConversationMessage,
  ConversationContext,
  ConversationResult,
} from "./conversation-engine"
import {
  retrieveConversationMemories,
  recordConversationTurn,
  adjustStateForConversation,
  classifyUserSentiment,
  detectTextLanguage,
} from "./conversation-memory"
import type { ConversationMemoryProvider } from "./conversation-memory"
import { spendCredits, getBalance } from "./credit-service"
import type { CreditDataProvider } from "./credit-service"
import { updateIntimacyAfterChat } from "./intimacy-engine"
import type { IntimacyDataProvider } from "./intimacy-engine"
import type { PersonaProfileSnapshot, PersonaStateData } from "./types"

// ── 상수 ────────────────────────────────────────────────────

/** 채팅 1턴당 코인 비용 */
const CHAT_COST_PER_TURN = 10

/** 페이지네이션 기본값 */
const DEFAULT_PAGE_SIZE = 30

// ── DI 인터페이스 ───────────────────────────────────────────

export interface ChatDataProvider
  extends ConversationMemoryProvider, CreditDataProvider, IntimacyDataProvider {
  /** 대화방 생성 */
  createThread(params: {
    personaId: string
    userId: string
    sessionId: string
  }): Promise<{ id: string }>

  /** 대화방 목록 (최근 메시지 순) */
  getThreads(userId: string): Promise<
    Array<{
      id: string
      personaId: string
      personaName: string
      personaImageUrl: string | null
      lastMessageAt: Date | null
      lastMessageContent: string | null
      totalMessages: number
      isActive: boolean
    }>
  >

  /** 대화방 상세 조회 */
  getThread(threadId: string): Promise<{
    id: string
    personaId: string
    userId: string
    sessionId: string | null
    totalMessages: number
    isActive: boolean
    intimacyScore: number
    intimacyLevel: number
    lastIntimacyAt: Date | null
    sharedMilestones: string[] | null
  } | null>

  /** 메시지 저장 */
  saveMessage(params: {
    threadId: string
    role: "USER" | "PERSONA"
    content: string
    imageUrl?: string
    tokenCount?: number
    poignancyScore?: number
  }): Promise<{ id: string; createdAt: Date }>

  /** 메시지 히스토리 (커서 페이지네이션) */
  getMessages(
    threadId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{
    messages: Array<{
      id: string
      role: "USER" | "PERSONA"
      content: string
      imageUrl: string | null
      createdAt: Date
    }>
    nextCursor: string | null
  }>

  /** 대화방 업데이트 (lastMessageAt, totalMessages) */
  updateThread(
    threadId: string,
    data: { lastMessageAt?: Date; totalMessages?: number }
  ): Promise<void>

  /** InteractionSession 생성 */
  createInteractionSession(params: { personaId: string; userId: string }): Promise<{ id: string }>

  /** 페르소나 프로필 조회 */
  getPersonaProfile(personaId: string): Promise<PersonaProfileSnapshot | null>

  /** L3 volatility 조회 (poignancy 계산용) */
  getPersonaVolatility(personaId: string): Promise<number>
}

// ── 서비스 함수: 대화방 생성 ───────────────────────────────

export interface CreateThreadResult {
  threadId: string
  sessionId: string
}

/**
 * 새 대화방 생성.
 * InteractionSession도 함께 생성하여 기억 시스템 연결.
 */
export async function createThread(
  provider: ChatDataProvider,
  userId: string,
  personaId: string
): Promise<CreateThreadResult> {
  // InteractionSession 먼저 생성
  const session = await provider.createInteractionSession({
    personaId,
    userId,
  })

  // ChatThread 생성 (세션 연결)
  const thread = await provider.createThread({
    personaId,
    userId,
    sessionId: session.id,
  })

  return { threadId: thread.id, sessionId: session.id }
}

// ── 서비스 함수: 메시지 전송 ───────────────────────────────

export interface SendMessageInput {
  threadId: string
  userId: string
  content: string
  imageBase64?: string
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
  imageUrl?: string
  /** 대화 출처 (기본: DIRECT, 카카오: KAKAO) */
  source?: "DIRECT" | "KAKAO"
  /** v4.2: 유저 활동명 — 페르소나가 유저를 이 이름으로 호칭 */
  userNickname?: string
}

export interface SendMessageResult {
  userMessageId: string
  personaMessageId: string
  personaResponse: string
  tokenCount: number
  poignancy: number
  remainingBalance: number
}

/**
 * 메시지 전송: 코인 차감 → LLM 응답 생성 → 기억 저장.
 *
 * 1. 잔액 확인 + 10코인 차감
 * 2. RAG 기억 검색 → 컨텍스트 구성
 * 3. 대화 이력 로드
 * 4. Conversation Engine으로 Sonnet 호출 (Vision 포함)
 * 5. 유저 메시지 + 페르소나 응답 저장
 * 6. InteractionLog에 기록 (poignancy 계산)
 * 7. PersonaState 미세 조정
 */
export async function sendMessage(
  provider: ChatDataProvider,
  input: SendMessageInput
): Promise<SendMessageResult> {
  const { threadId, userId, content, imageBase64, imageMediaType, imageUrl, userNickname } = input

  // 1. 대화방 확인
  const thread = await provider.getThread(threadId)
  if (!thread) throw new Error("THREAD_NOT_FOUND")
  if (thread.userId !== userId) throw new Error("UNAUTHORIZED")
  if (!thread.isActive) throw new Error("THREAD_INACTIVE")

  // 2. 코인 차감 (잔액 부족 시 INSUFFICIENT_BALANCE 에러)
  await spendCredits(provider, userId, CHAT_COST_PER_TURN, "persona_chat")

  // 3. 페르소나 프로필 + 상태 조회
  const [profile, personaState, volatility] = await Promise.all([
    provider.getPersonaProfile(thread.personaId),
    provider.getPersonaState(thread.personaId),
    provider.getPersonaVolatility(thread.personaId),
  ])

  if (!profile) throw new Error("PERSONA_NOT_FOUND")

  const state: PersonaStateData = personaState ?? {
    mood: 0.6,
    energy: 0.7,
    socialBattery: 0.6,
    paradoxTension: 0.2,
  }

  // 4. RAG 기억 검색
  const ragContext = await retrieveConversationMemories(provider, thread.personaId, userId)

  // 5. 대화 이력 로드 (LLM 컨텍스트용)
  const historyResult = await provider.getMessages(threadId, { limit: 60 })
  const history: ConversationMessage[] = historyResult.messages.map((m) => ({
    role: m.role === "PERSONA" ? ("persona" as const) : ("user" as const),
    content: m.content,
  }))

  // 6. Conversation Engine 호출 (친밀도 주입 T431)
  const userLanguage = detectTextLanguage(content)
  const conversationContext: ConversationContext = {
    persona: profile,
    personaId: thread.personaId,
    personaState: state,
    ragContext,
    mode: "chat",
    userNickname,
    intimacyLevel: thread.intimacyLevel,
    sharedMilestones: thread.sharedMilestones ?? undefined,
    userLanguage,
  }

  const llmResult: ConversationResult = await generateConversationResponse({
    context: conversationContext,
    history,
    userMessage: content,
    imageBase64,
    imageMediaType,
  })

  // 7. 유저 메시지 저장
  const userMsg = await provider.saveMessage({
    threadId,
    role: "USER",
    content,
    imageUrl,
  })

  // 8. 페르소나 응답 저장
  const personaMsg = await provider.saveMessage({
    threadId,
    role: "PERSONA",
    content: llmResult.text,
    tokenCount: llmResult.outputTokens,
  })

  // 9. InteractionLog 기록 + Poignancy
  const previousMood = state.mood
  const turnNumber = thread.totalMessages + 1
  const { poignancy } = await recordConversationTurn(provider, {
    sessionId: thread.sessionId ?? "",
    turnNumber,
    personaId: thread.personaId,
    userId,
    userMessage: content,
    personaResponse: llmResult.text,
    responseLengthTokens: llmResult.outputTokens,
    previousMood,
    currentMood: state.mood,
    volatility,
    source: input.source,
  })

  // 10. 친밀도 업데이트 (T430)
  await updateIntimacyAfterChat(provider, threadId, poignancy)

  // 11. 대화방 메타데이터 업데이트
  await provider.updateThread(threadId, {
    lastMessageAt: new Date(),
    totalMessages: thread.totalMessages + 2, // user + persona
  })

  // 12. PersonaState 미세 조정 (간단한 감정 분류)
  const sentiment = classifyUserSentiment(content)
  const updatedState = adjustStateForConversation(state, sentiment)
  await provider.savePersonaState(thread.personaId, updatedState)

  // 13. 잔액 조회
  const remainingBalance = await getBalance(provider, userId)

  return {
    userMessageId: userMsg.id,
    personaMessageId: personaMsg.id,
    personaResponse: llmResult.text,
    tokenCount: llmResult.outputTokens,
    poignancy,
    remainingBalance,
  }
}

// ── 서비스 함수: 대화방 목록 ───────────────────────────────

export async function getThreads(
  provider: ChatDataProvider,
  userId: string
): Promise<
  Array<{
    id: string
    personaId: string
    personaName: string
    personaImageUrl: string | null
    lastMessageAt: Date | null
    lastMessageContent: string | null
    totalMessages: number
    isActive: boolean
  }>
> {
  return provider.getThreads(userId)
}

// ── 서비스 함수: 메시지 히스토리 ────────────────────────────

export async function getMessages(
  provider: ChatDataProvider,
  threadId: string,
  userId: string,
  options?: { limit?: number; cursor?: string }
): Promise<{
  messages: Array<{
    id: string
    role: "USER" | "PERSONA"
    content: string
    imageUrl: string | null
    createdAt: Date
  }>
  nextCursor: string | null
}> {
  // 권한 확인
  const thread = await provider.getThread(threadId)
  if (!thread) throw new Error("THREAD_NOT_FOUND")
  if (thread.userId !== userId) throw new Error("UNAUTHORIZED")

  return provider.getMessages(threadId, {
    limit: options?.limit ?? DEFAULT_PAGE_SIZE,
    cursor: options?.cursor,
  })
}

// classifyUserSentiment → conversation-memory.ts로 이동 (공용 함수)
