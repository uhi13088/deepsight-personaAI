// ═══════════════════════════════════════════════════════════════
// Conversation Memory — 1:1 채팅/통화 기억 파이프라인 통합 (T332)
//
// 기존 기억 시스템(Poignancy, Forgetting Curve, RAG, Factbook)을
// 1:1 대화에 맞게 통합.
//
// 흐름:
// 1. 대화 시작 → retrieveConversationMemories() → RAG 컨텍스트
// 2. 매 턴    → recordConversationTurn()  → InteractionLog + poignancy
// 3. 대화 종료 → finalizeConversation()   → Factbook 업데이트 + PersonaState
// ═══════════════════════════════════════════════════════════════

import { calculatePoignancy } from "./poignancy"
import type { PoignancyInput } from "./poignancy"
import { searchMemories, buildRAGContextText } from "./rag-weighted-search"
import type { MemoryItem, RAGSearchOptions } from "./rag-weighted-search"
import type { PersonaStateData } from "./types"
import type { Factbook, MutableContext } from "@/types"
import { updateMutableContext, addMutableContext } from "./factbook"
import type { ConversationMode } from "./conversation-engine"

// ── DI 인터페이스 ───────────────────────────────────────────

/** 대화 기억을 위한 DB 접근 프로바이더 */
export interface ConversationMemoryProvider {
  /** 이 유저와 이 페르소나의 과거 대화 기록 (InteractionLog) 조회 */
  getInteractionMemories(personaId: string, userId: string): Promise<MemoryItem[]>

  /** InteractionLog에 턴 저장 */
  saveInteractionLog(params: {
    sessionId: string
    turnNumber: number
    initiatorType: "USER" | "PERSONA"
    initiatorId: string
    receiverType: "USER" | "PERSONA"
    receiverId: string
    interactionType: "CONVERSATION"
    userMessage?: string
    personaResponse?: string
    responseLengthTokens?: number
    poignancyScore: number
    source: "DIRECT" | "KAKAO" | "CALL"
  }): Promise<void>

  /** InteractionSession의 totalTurns 증가 */
  incrementSessionTurns(sessionId: string): Promise<void>

  /** 페르소나의 Factbook 조회 */
  getFactbook(personaId: string): Promise<Factbook | null>

  /** 페르소나의 Factbook 저장 */
  saveFactbook(personaId: string, factbook: Factbook): Promise<void>

  /** 페르소나 상태 조회 */
  getPersonaState(personaId: string): Promise<PersonaStateData | null>

  /** 페르소나 상태 저장 */
  savePersonaState(personaId: string, state: PersonaStateData): Promise<void>
}

// ── 타입 ────────────────────────────────────────────────────

/** 턴 기록 입력 */
export interface ConversationTurnInput {
  sessionId: string
  turnNumber: number
  personaId: string
  userId: string
  userMessage: string
  personaResponse: string
  responseLengthTokens?: number
  /** 이전 mood (poignancy 계산용) */
  previousMood: number
  /** 현재 mood */
  currentMood: number
  /** 페르소나 volatility (L3 narrative) */
  volatility: number
  /** 대화 출처 (기본: DIRECT) */
  source?: "DIRECT" | "KAKAO" | "CALL"
}

/** 대화 종료 시 입력 */
export interface ConversationFinalizeInput {
  personaId: string
  userId: string
  /** 대화 중 핵심 내용 요약 (가장 poignancy 높은 턴들) */
  highlights: string[]
  mode: ConversationMode
  totalTurns: number
}

// ── 1. 대화 시작: RAG 기억 검색 ─────────────────────────────

/** RAG 검색 기본 옵션 (대화용) */
const CONVERSATION_RAG_OPTIONS: Partial<RAGSearchOptions> = {
  maxResults: 10,
  recencyWindowDays: 60,
  minScore: 0.05,
  typeFilter: ["interaction", "comment", "post"],
  minRetention: 0.05,
  coreMemoryBoost: 1.3,
}

/**
 * 대화 시작 시 이 유저와의 과거 기억을 RAG 검색하여 컨텍스트 텍스트 반환.
 * Conversation Engine의 ragContext로 주입됨.
 */
export async function retrieveConversationMemories(
  provider: ConversationMemoryProvider,
  personaId: string,
  userId: string
): Promise<string> {
  const memories = await provider.getInteractionMemories(personaId, userId)

  if (memories.length === 0) {
    return "" // 첫 대화 — 기억 없음
  }

  const result = searchMemories(memories, CONVERSATION_RAG_OPTIONS)
  return buildRAGContextText(result, 1500) // 대화용: 1500 토큰으로 제한
}

// ── 2. 매 턴: InteractionLog 저장 + Poignancy 계산 ──────────

/**
 * 대화 턴 기록.
 *
 * - 유저 메시지 + 페르소나 응답을 InteractionLog에 저장
 * - Poignancy 계산하여 감정 가중치 부여
 * - 세션 totalTurns 증가
 */
export async function recordConversationTurn(
  provider: ConversationMemoryProvider,
  input: ConversationTurnInput
): Promise<{ poignancy: number }> {
  // Poignancy 계산
  const emotionalDelta = Math.abs(input.currentMood - input.previousMood)
  const pressure = 0.3 + emotionalDelta * 0.5 // 대화 자체는 중간 수준의 압박
  const poignancyInput: PoignancyInput = {
    pressure,
    volatility: input.volatility,
    emotionalDelta,
  }
  const poignancy = calculatePoignancy(poignancyInput)

  // InteractionLog 저장
  await provider.saveInteractionLog({
    sessionId: input.sessionId,
    turnNumber: input.turnNumber,
    initiatorType: "USER",
    initiatorId: input.userId,
    receiverType: "PERSONA",
    receiverId: input.personaId,
    interactionType: "CONVERSATION",
    userMessage: input.userMessage,
    personaResponse: input.personaResponse,
    responseLengthTokens: input.responseLengthTokens,
    poignancyScore: poignancy,
    source: input.source ?? "DIRECT",
  })

  // 세션 totalTurns 증가
  await provider.incrementSessionTurns(input.sessionId)

  return { poignancy }
}

// ── 3. 대화 종료: Factbook 업데이트 + PersonaState ──────────

/**
 * 대화 종료 시 기억 정리.
 *
 * - Factbook mutableContext에 대화 요약 추가
 * - PersonaState 업데이트 (socialBattery 변화 등)
 */
export async function finalizeConversation(
  provider: ConversationMemoryProvider,
  input: ConversationFinalizeInput
): Promise<void> {
  const { personaId, highlights, mode, totalTurns } = input

  // ── Factbook 업데이트 ──
  if (highlights.length > 0) {
    const factbook = await provider.getFactbook(personaId)
    if (factbook) {
      const summary = highlights.join("; ")
      const modeLabel = mode === "chat" ? "채팅" : "통화"
      const content = `유저와 ${modeLabel}에서: ${summary}`

      // recentExperience 카테고리에 추가
      const existingCtx = factbook.mutableContext.find((c) => c.category === "recentExperience")

      let updatedFactbook: Factbook
      if (existingCtx) {
        updatedFactbook = updateMutableContext(factbook, existingCtx.id, content)
      } else {
        updatedFactbook = addMutableContext(factbook, "recentExperience", content)
      }

      await provider.saveFactbook(personaId, updatedFactbook)
    }
  }

  // ── PersonaState 업데이트 ──
  const currentState = await provider.getPersonaState(personaId)
  if (currentState) {
    // 대화 후 소셜 배터리 감소 (긴 대화일수록 더 감소)
    const batteryDrain = Math.min(0.15, totalTurns * 0.005)
    const updatedState: PersonaStateData = {
      ...currentState,
      socialBattery: Math.max(0, currentState.socialBattery - batteryDrain),
      energy: Math.max(0, currentState.energy - 0.01),
    }

    await provider.savePersonaState(personaId, updatedState)
  }
}

// ── 유저 감정 분류 (간단한 regex 기반) ────────────────────────

/**
 * 유저 메시지에서 감정을 간단 분류.
 * chat-service, call-service 등 대화 파이프라인에서 공용.
 */
export function classifyUserSentiment(text: string): "positive" | "neutral" | "negative" {
  const positivePatterns = /좋|감사|행복|기쁘|사랑|최고|대박|귀엽|멋|ㅋㅋ|ㅎㅎ|😊|😍|❤️|👍/
  const negativePatterns = /싫|슬프|힘들|짜증|화나|우울|ㅠㅠ|ㅜㅜ|😢|😭|💔|별로|최악/

  if (positivePatterns.test(text)) return "positive"
  if (negativePatterns.test(text)) return "negative"
  return "neutral"
}

// ── 유저 메시지 언어 감지 (간단한 스크립트 기반) ──────────────

/**
 * 유저 메시지의 주요 언어를 감지.
 * STT가 없는 채팅에서 userLanguage 필드를 채우기 위해 사용.
 */
export function detectTextLanguage(text: string): string | undefined {
  // 한글이 50% 이상이면 한국어 (기본값이므로 undefined 반환 → suffix에서 스킵)
  const koreanChars = text.match(/[\u3131-\u3163\uac00-\ud7a3]/g)
  const totalChars = text.replace(/\s/g, "").length
  if (!totalChars) return undefined

  const koreanRatio = (koreanChars?.length ?? 0) / totalChars
  if (koreanRatio > 0.3) return undefined // 한국어는 기본이므로 생략

  // 일본어 (히라가나/카타카나)
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja"

  // 중국어 (한자만, 히라가나 없음)
  if (/[\u4e00-\u9fff]/.test(text) && !/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "zh"

  // 그 외 라틴 문자 기반
  if (/[a-zA-Z]/.test(text)) return "en"

  return undefined
}

// ── 대화 중 PersonaState 미니 업데이트 ──────────────────────

/** T446: 친밀도 레벨별 mood 영향력 매핑 (Lv1~Lv5) */
export const INTIMACY_MOOD_DELTA: Record<number, number> = {
  1: 0.02, // STRANGER (기존 유지)
  2: 0.025, // ACQUAINTANCE
  3: 0.03, // FAMILIAR
  4: 0.04, // FRIENDLY
  5: 0.05, // CLOSE
}

/**
 * 대화 턴마다 PersonaState를 미세 조정.
 * 유저 감정(sentiment)에 따라 페르소나 mood가 약간 변동.
 * T446: 친밀도 레벨에 비례하여 mood 변화량 증폭.
 */
export function adjustStateForConversation(
  state: PersonaStateData,
  userSentiment: "positive" | "neutral" | "negative",
  intimacyLevel?: number
): PersonaStateData {
  const baseDelta = INTIMACY_MOOD_DELTA[intimacyLevel ?? 1] ?? 0.02
  const delta =
    userSentiment === "positive" ? baseDelta : userSentiment === "negative" ? -baseDelta : 0
  return {
    ...state,
    mood: Math.max(0, Math.min(1, state.mood + delta)),
    // 대화 중 에너지 미세 감소
    energy: Math.max(0, state.energy - 0.005),
  }
}
