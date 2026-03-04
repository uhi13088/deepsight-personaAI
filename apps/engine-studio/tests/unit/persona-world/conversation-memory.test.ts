import { describe, it, expect, vi } from "vitest"
import {
  retrieveConversationMemories,
  recordConversationTurn,
  finalizeConversation,
  adjustStateForConversation,
} from "@/lib/persona-world/conversation-memory"
import type {
  ConversationMemoryProvider,
  ConversationTurnInput,
} from "@/lib/persona-world/conversation-memory"
import type { PersonaStateData } from "@/lib/persona-world/types"

// ═══════════════════════════════════════════════════════════════
// Conversation Memory 단위 테스트 (T359)
//
// 기억 파이프라인 3단계: retrieve → record → finalize 검증
// ═══════════════════════════════════════════════════════════════

// ── Mock Provider 팩토리 ────────────────────────────────────

function createMockProvider(
  overrides?: Partial<ConversationMemoryProvider>
): ConversationMemoryProvider {
  return {
    getInteractionMemories: vi.fn().mockResolvedValue([]),
    saveInteractionLog: vi.fn().mockResolvedValue(undefined),
    incrementSessionTurns: vi.fn().mockResolvedValue(undefined),
    getFactbook: vi.fn().mockResolvedValue(null),
    saveFactbook: vi.fn().mockResolvedValue(undefined),
    getPersonaState: vi.fn().mockResolvedValue({
      mood: 0.6,
      energy: 0.7,
      socialBattery: 0.5,
      paradoxTension: 0.1,
    }),
    savePersonaState: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// ── retrieveConversationMemories 테스트 ───────────────────────

describe("retrieveConversationMemories", () => {
  it("기억이 없으면 빈 문자열을 반환한다", async () => {
    const provider = createMockProvider()
    const result = await retrieveConversationMemories(provider, "persona-1", "user-1")
    expect(result).toBe("")
  })

  it("기억이 있으면 RAG 컨텍스트 텍스트를 반환한다", async () => {
    const provider = createMockProvider({
      getInteractionMemories: vi.fn().mockResolvedValue([
        {
          id: "mem-1",
          type: "interaction",
          content: "유저: 좋아하는 영화가 뭐야? | 나: 인셉션이요!",
          personaId: "persona-1",
          createdAt: Date.now() - 1000 * 60 * 60, // 1시간 전
          poignancy: 0.5,
        },
      ]),
    })

    const result = await retrieveConversationMemories(provider, "persona-1", "user-1")
    expect(result.length).toBeGreaterThan(0)
  })
})

// ── recordConversationTurn 테스트 ──────────────────────────────

describe("recordConversationTurn", () => {
  const baseTurnInput: ConversationTurnInput = {
    sessionId: "session-1",
    turnNumber: 1,
    personaId: "persona-1",
    userId: "user-1",
    userMessage: "안녕!",
    personaResponse: "반가워요!",
    responseLengthTokens: 10,
    previousMood: 0.6,
    currentMood: 0.65,
    volatility: 0.3,
  }

  it("InteractionLog를 저장한다", async () => {
    const provider = createMockProvider()
    await recordConversationTurn(provider, baseTurnInput)

    expect(provider.saveInteractionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        turnNumber: 1,
        initiatorType: "USER",
        initiatorId: "user-1",
        receiverType: "PERSONA",
        receiverId: "persona-1",
        interactionType: "CONVERSATION",
        userMessage: "안녕!",
        personaResponse: "반가워요!",
      })
    )
  })

  it("세션 totalTurns를 증가시킨다", async () => {
    const provider = createMockProvider()
    await recordConversationTurn(provider, baseTurnInput)

    expect(provider.incrementSessionTurns).toHaveBeenCalledWith("session-1")
  })

  it("poignancy를 계산하여 반환한다", async () => {
    const provider = createMockProvider()
    const result = await recordConversationTurn(provider, baseTurnInput)

    expect(typeof result.poignancy).toBe("number")
    expect(result.poignancy).toBeGreaterThanOrEqual(0)
    expect(result.poignancy).toBeLessThanOrEqual(1)
  })

  it("emotionalDelta가 크면 poignancy가 더 높다", async () => {
    const provider = createMockProvider()

    const lowDelta = await recordConversationTurn(provider, {
      ...baseTurnInput,
      previousMood: 0.5,
      currentMood: 0.51,
    })

    const highDelta = await recordConversationTurn(provider, {
      ...baseTurnInput,
      previousMood: 0.5,
      currentMood: 0.9,
    })

    expect(highDelta.poignancy).toBeGreaterThan(lowDelta.poignancy)
  })
})

// ── finalizeConversation 테스트 ──────────────────────────────

describe("finalizeConversation", () => {
  it("하이라이트가 있으면 Factbook을 업데이트한다", async () => {
    const mockFactbook = {
      staticContext: [],
      mutableContext: [
        {
          id: "ctx-1",
          category: "recentExperience",
          content: "이전 경험",
          updatedAt: new Date().toISOString(),
        },
      ],
    }
    const provider = createMockProvider({
      getFactbook: vi.fn().mockResolvedValue(mockFactbook),
    })

    await finalizeConversation(provider, {
      personaId: "persona-1",
      userId: "user-1",
      highlights: ["좋은 대화였어요"],
      mode: "chat",
      totalTurns: 5,
    })

    expect(provider.saveFactbook).toHaveBeenCalled()
  })

  it("하이라이트가 비어있으면 Factbook을 업데이트하지 않는다", async () => {
    const provider = createMockProvider()

    await finalizeConversation(provider, {
      personaId: "persona-1",
      userId: "user-1",
      highlights: [],
      mode: "chat",
      totalTurns: 5,
    })

    expect(provider.saveFactbook).not.toHaveBeenCalled()
  })

  it("PersonaState의 socialBattery를 감소시킨다", async () => {
    const initialState: PersonaStateData = {
      mood: 0.6,
      energy: 0.7,
      socialBattery: 0.5,
      paradoxTension: 0.1,
    }
    const provider = createMockProvider({
      getPersonaState: vi.fn().mockResolvedValue(initialState),
    })

    await finalizeConversation(provider, {
      personaId: "persona-1",
      userId: "user-1",
      highlights: [],
      mode: "call",
      totalTurns: 10,
    })

    expect(provider.savePersonaState).toHaveBeenCalledWith(
      "persona-1",
      expect.objectContaining({
        socialBattery: expect.any(Number),
      })
    )

    // socialBattery가 감소했는지 확인
    const savedState = (provider.savePersonaState as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as PersonaStateData
    expect(savedState.socialBattery).toBeLessThan(initialState.socialBattery)
  })
})

// ── adjustStateForConversation 테스트 ────────────────────────

describe("adjustStateForConversation", () => {
  const baseState: PersonaStateData = {
    mood: 0.5,
    energy: 0.5,
    socialBattery: 0.5,
    paradoxTension: 0.1,
  }

  it("positive 감정이면 mood가 소폭 상승한다", () => {
    const result = adjustStateForConversation(baseState, "positive")
    expect(result.mood).toBeGreaterThan(baseState.mood)
  })

  it("negative 감정이면 mood가 소폭 하락한다", () => {
    const result = adjustStateForConversation(baseState, "negative")
    expect(result.mood).toBeLessThan(baseState.mood)
  })

  it("neutral 감정이면 mood가 변하지 않는다", () => {
    const result = adjustStateForConversation(baseState, "neutral")
    expect(result.mood).toBe(baseState.mood)
  })
})
