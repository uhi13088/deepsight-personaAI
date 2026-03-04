import { describe, it, expect, vi, beforeEach } from "vitest"
import { createThread, sendMessage, getMessages } from "@/lib/persona-world/chat-service"
import type { ChatDataProvider, SendMessageInput } from "@/lib/persona-world/chat-service"
import type { PersonaProfileSnapshot, PersonaStateData } from "@/lib/persona-world/types"

// ═══════════════════════════════════════════════════════════════
// Chat Service 단위 테스트 (T359)
//
// DI 기반 서비스이므로 mock provider로 비즈니스 로직만 검증.
// LLM 호출(generateConversationResponse)은 vi.mock으로 대체.
// ═══════════════════════════════════════════════════════════════

// ── LLM/Memory Mock ──────────────────────────────────────────

vi.mock("@/lib/persona-world/conversation-engine", () => ({
  generateConversationResponse: vi.fn().mockResolvedValue({
    text: "안녕하세요! 반가워요.",
    outputTokens: 20,
  }),
}))

vi.mock("@/lib/persona-world/conversation-memory", () => ({
  retrieveConversationMemories: vi.fn().mockResolvedValue(""),
  recordConversationTurn: vi.fn().mockResolvedValue({ poignancy: 0.3 }),
  adjustStateForConversation: vi.fn().mockImplementation((state: PersonaStateData) => state),
}))

// ── Mock Profile ─────────────────────────────────────────────

const MOCK_PROFILE: PersonaProfileSnapshot = {
  name: "테스트 페르소나",
  role: "REVIEWER",
  expertise: ["영화"],
  description: "테스트용 페르소나",
  region: "ko",
  voiceSpec: null,
  factbook: null,
  postPrompt: null,
  commentPrompt: null,
}

const MOCK_STATE: PersonaStateData = {
  mood: 0.6,
  energy: 0.7,
  socialBattery: 0.5,
  paradoxTension: 0.1,
}

// ── Mock Provider 팩토리 ────────────────────────────────────

function createMockProvider(overrides?: Partial<ChatDataProvider>): ChatDataProvider {
  return {
    createThread: vi.fn().mockResolvedValue({ id: "thread-1" }),
    getThreads: vi.fn().mockResolvedValue([]),
    getThread: vi.fn().mockResolvedValue({
      id: "thread-1",
      personaId: "persona-1",
      userId: "user-1",
      sessionId: "session-1",
      totalMessages: 0,
      isActive: true,
    }),
    saveMessage: vi
      .fn()
      .mockResolvedValueOnce({ id: "msg-user-1", createdAt: new Date() })
      .mockResolvedValueOnce({ id: "msg-persona-1", createdAt: new Date() }),
    getMessages: vi.fn().mockResolvedValue({ messages: [], nextCursor: null }),
    updateThread: vi.fn().mockResolvedValue(undefined),
    createInteractionSession: vi.fn().mockResolvedValue({ id: "session-1" }),
    getPersonaProfile: vi.fn().mockResolvedValue(MOCK_PROFILE),
    getPersonaVolatility: vi.fn().mockResolvedValue(0.3),
    getInteractionMemories: vi.fn().mockResolvedValue([]),
    saveInteractionLog: vi.fn().mockResolvedValue(undefined),
    incrementSessionTurns: vi.fn().mockResolvedValue(undefined),
    getFactbook: vi.fn().mockResolvedValue(null),
    saveFactbook: vi.fn().mockResolvedValue(undefined),
    getPersonaState: vi.fn().mockResolvedValue(MOCK_STATE),
    savePersonaState: vi.fn().mockResolvedValue(undefined),
    getLatestTransaction: vi
      .fn()
      .mockResolvedValueOnce({
        id: "tx-1",
        userId: "user-1",
        type: "EARN",
        amount: 1000,
        balanceAfter: 1000,
        reason: "initial",
        orderId: null,
        paymentKey: null,
        status: "COMPLETED",
        createdAt: new Date(),
      })
      .mockResolvedValue({
        id: "tx-2",
        userId: "user-1",
        type: "SPEND",
        amount: -10,
        balanceAfter: 990,
        reason: "persona_chat",
        orderId: null,
        paymentKey: null,
        status: "COMPLETED",
        createdAt: new Date(),
      }),
    createTransaction: vi.fn().mockResolvedValue({
      id: "tx-2",
      userId: "user-1",
      type: "SPEND",
      amount: -10,
      balanceAfter: 990,
      reason: "persona_chat",
      orderId: null,
      paymentKey: null,
      status: "COMPLETED",
      createdAt: new Date(),
    }),
    findByOrderId: vi.fn().mockResolvedValue(null),
    updateTransaction: vi.fn().mockResolvedValue(null),
    getTransactions: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

// ── 테스트 ──────────────────────────────────────────────────

describe("createThread", () => {
  it("InteractionSession → ChatThread 순서로 생성한다", async () => {
    const provider = createMockProvider()

    const result = await createThread(provider, "user-1", "persona-1")

    expect(provider.createInteractionSession).toHaveBeenCalledWith({
      personaId: "persona-1",
      userId: "user-1",
    })
    expect(provider.createThread).toHaveBeenCalledWith({
      personaId: "persona-1",
      userId: "user-1",
      sessionId: "session-1",
    })
    expect(result.threadId).toBe("thread-1")
    expect(result.sessionId).toBe("session-1")
  })
})

describe("sendMessage", () => {
  let provider: ChatDataProvider

  beforeEach(() => {
    provider = createMockProvider()
  })

  const baseInput: SendMessageInput = {
    threadId: "thread-1",
    userId: "user-1",
    content: "안녕하세요!",
  }

  it("정상적으로 메시지를 전송하고 응답을 반환한다", async () => {
    const result = await sendMessage(provider, baseInput)

    expect(result.userMessageId).toBe("msg-user-1")
    expect(result.personaMessageId).toBe("msg-persona-1")
    expect(result.personaResponse).toBe("안녕하세요! 반가워요.")
    expect(result.remainingBalance).toBe(990) // 1000 - 10
  })

  it("코인을 차감한다 (createTransaction 호출)", async () => {
    await sendMessage(provider, baseInput)

    expect(provider.createTransaction).toHaveBeenCalled()
  })

  it("대화방이 없으면 THREAD_NOT_FOUND 에러를 던진다", async () => {
    provider = createMockProvider({
      getThread: vi.fn().mockResolvedValue(null),
    })

    await expect(sendMessage(provider, baseInput)).rejects.toThrow("THREAD_NOT_FOUND")
  })

  it("유저 ID가 다르면 UNAUTHORIZED 에러를 던진다", async () => {
    provider = createMockProvider({
      getThread: vi.fn().mockResolvedValue({
        id: "thread-1",
        personaId: "persona-1",
        userId: "other-user",
        sessionId: "session-1",
        totalMessages: 0,
        isActive: true,
      }),
    })

    await expect(sendMessage(provider, baseInput)).rejects.toThrow("UNAUTHORIZED")
  })

  it("비활성 대화방이면 THREAD_INACTIVE 에러를 던진다", async () => {
    provider = createMockProvider({
      getThread: vi.fn().mockResolvedValue({
        id: "thread-1",
        personaId: "persona-1",
        userId: "user-1",
        sessionId: "session-1",
        totalMessages: 0,
        isActive: false,
      }),
    })

    await expect(sendMessage(provider, baseInput)).rejects.toThrow("THREAD_INACTIVE")
  })

  it("페르소나가 없으면 PERSONA_NOT_FOUND 에러를 던진다", async () => {
    provider = createMockProvider({
      getPersonaProfile: vi.fn().mockResolvedValue(null),
    })

    await expect(sendMessage(provider, baseInput)).rejects.toThrow("PERSONA_NOT_FOUND")
  })

  it("유저 메시지와 페르소나 응답을 모두 저장한다", async () => {
    await sendMessage(provider, baseInput)

    expect(provider.saveMessage).toHaveBeenCalledTimes(2)
    expect(provider.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ threadId: "thread-1", role: "USER", content: "안녕하세요!" })
    )
    expect(provider.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: "thread-1",
        role: "PERSONA",
        content: "안녕하세요! 반가워요.",
      })
    )
  })

  it("대화방 메타데이터를 업데이트한다", async () => {
    await sendMessage(provider, baseInput)

    expect(provider.updateThread).toHaveBeenCalledWith("thread-1", {
      lastMessageAt: expect.any(Date),
      totalMessages: 2, // 0 + 2
    })
  })

  it("PersonaState를 저장한다", async () => {
    await sendMessage(provider, baseInput)

    expect(provider.savePersonaState).toHaveBeenCalled()
  })

  it("잔액 부족 시 INSUFFICIENT_BALANCE 에러를 던진다", async () => {
    provider = createMockProvider({
      getLatestTransaction: vi.fn().mockResolvedValue({
        id: "tx-1",
        userId: "user-1",
        type: "EARN",
        amount: 5,
        balanceAfter: 5,
        reason: "initial",
        orderId: null,
        paymentKey: null,
        status: "COMPLETED",
        createdAt: new Date(),
      }),
    })

    await expect(sendMessage(provider, baseInput)).rejects.toThrow("INSUFFICIENT_BALANCE")
  })
})

describe("getMessages", () => {
  it("대화방 소유자만 메시지를 조회할 수 있다", async () => {
    const provider = createMockProvider({
      getThread: vi.fn().mockResolvedValue({
        id: "thread-1",
        personaId: "persona-1",
        userId: "other-user",
        sessionId: "session-1",
        totalMessages: 10,
        isActive: true,
      }),
    })

    await expect(getMessages(provider, "thread-1", "user-1")).rejects.toThrow("UNAUTHORIZED")
  })

  it("대화방이 존재하지 않으면 THREAD_NOT_FOUND 에러를 던진다", async () => {
    const provider = createMockProvider({
      getThread: vi.fn().mockResolvedValue(null),
    })

    await expect(getMessages(provider, "thread-999", "user-1")).rejects.toThrow("THREAD_NOT_FOUND")
  })

  it("정상적으로 메시지를 반환한다", async () => {
    const mockMessages = [
      {
        id: "msg-1",
        role: "USER" as const,
        content: "hello",
        imageUrl: null,
        createdAt: new Date(),
      },
    ]
    const provider = createMockProvider({
      getMessages: vi.fn().mockResolvedValue({ messages: mockMessages, nextCursor: null }),
    })

    const result = await getMessages(provider, "thread-1", "user-1")
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0].content).toBe("hello")
  })
})
