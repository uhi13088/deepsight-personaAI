import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createThread,
  sendMessage,
  getMessages,
  endChatThread,
  extractHighlights,
  SESSION_TIMEOUT_MS,
} from "@/lib/persona-world/chat-service"
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
  classifyUserSentiment: vi.fn().mockReturnValue("neutral"),
  detectTextLanguage: vi.fn().mockReturnValue(undefined),
  finalizeConversation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/persona-world/intimacy-engine", () => ({
  updateIntimacyAfterChat: vi.fn().mockResolvedValue({
    newScore: 0.003,
    newLevel: 1,
    previousLevel: 1,
    levelUp: false,
  }),
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
      lastMessageAt: new Date(),
      intimacyScore: 0,
      intimacyLevel: 1,
      lastIntimacyAt: null,
      sharedMilestones: null,
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
    getThreadIntimacy: vi.fn().mockResolvedValue({
      intimacyScore: 0,
      intimacyLevel: 1,
      lastIntimacyAt: null,
      sharedMilestones: null,
      personaId: "persona-1",
      userId: "user-1",
    }),
    updateThreadIntimacy: vi.fn().mockResolvedValue(undefined),
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
    getTopPoignancyLogs: vi
      .fn()
      .mockResolvedValue([
        { userMessage: "좋아하는 영화?", personaResponse: "인셉션이요!", poignancyScore: 0.8 },
      ]),
    endInteractionSession: vi.fn().mockResolvedValue(undefined),
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
        lastMessageAt: new Date(),
        intimacyScore: 0,
        intimacyLevel: 1,
        lastIntimacyAt: null,
        sharedMilestones: null,
      }),
    })

    await expect(sendMessage(provider, baseInput)).rejects.toThrow("UNAUTHORIZED")
  })

  it("T434: 비활성 대화방이면 자동 재활성화 후 정상 처리한다", async () => {
    provider = createMockProvider({
      getThread: vi.fn().mockResolvedValue({
        id: "thread-1",
        personaId: "persona-1",
        userId: "user-1",
        sessionId: "session-1",
        totalMessages: 0,
        isActive: false,
        lastMessageAt: new Date(),
        intimacyScore: 0,
        intimacyLevel: 1,
        lastIntimacyAt: null,
        sharedMilestones: null,
      }),
    })

    const result = await sendMessage(provider, baseInput)
    expect(result.personaResponse).toBe("안녕하세요! 반가워요.")
    // 재활성화 시 새 세션 생성 + isActive 업데이트
    expect(provider.createInteractionSession).toHaveBeenCalled()
    expect(provider.updateThread).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({ isActive: true, sessionId: "session-1" })
    )
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
        lastMessageAt: new Date(),
        intimacyScore: 0,
        intimacyLevel: 1,
        lastIntimacyAt: null,
        sharedMilestones: null,
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

// ── T433: 세션 타임아웃 자동 finalize ─────────────────────

describe("sendMessage — session timeout (T433)", () => {
  const baseInput: SendMessageInput = {
    threadId: "thread-1",
    userId: "user-1",
    content: "안녕하세요!",
  }

  it("T433: 30분 비활동 후 메시지 → 이전 세션 finalize + 새 세션 시작", async () => {
    const oldTime = new Date(Date.now() - SESSION_TIMEOUT_MS - 60000) // 31분 전
    const provider = createMockProvider({
      getThread: vi.fn().mockResolvedValue({
        id: "thread-1",
        personaId: "persona-1",
        userId: "user-1",
        sessionId: "session-old",
        totalMessages: 10,
        isActive: true,
        lastMessageAt: oldTime,
        intimacyScore: 0,
        intimacyLevel: 1,
        lastIntimacyAt: null,
        sharedMilestones: null,
      }),
    })

    await sendMessage(provider, baseInput)

    // 이전 세션 종료
    expect(provider.endInteractionSession).toHaveBeenCalledWith("session-old", expect.any(Date))
    // 새 세션 생성
    expect(provider.createInteractionSession).toHaveBeenCalled()
    // 스레드 세션 교체
    expect(provider.updateThread).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({ sessionId: "session-1" })
    )
  })

  it("T433: 30분 미만 활동 → 세션 유지 (finalize 미호출)", async () => {
    const recentTime = new Date(Date.now() - 10 * 60 * 1000) // 10분 전
    const provider = createMockProvider({
      getThread: vi.fn().mockResolvedValue({
        id: "thread-1",
        personaId: "persona-1",
        userId: "user-1",
        sessionId: "session-1",
        totalMessages: 5,
        isActive: true,
        lastMessageAt: recentTime,
        intimacyScore: 0,
        intimacyLevel: 1,
        lastIntimacyAt: null,
        sharedMilestones: null,
      }),
    })

    await sendMessage(provider, baseInput)

    expect(provider.endInteractionSession).not.toHaveBeenCalled()
  })

  it("T433: SESSION_TIMEOUT_MS = 30분", () => {
    expect(SESSION_TIMEOUT_MS).toBe(30 * 60 * 1000)
  })
})

// ── T433: extractHighlights ─────────────────────────────

describe("extractHighlights (T433)", () => {
  it("sessionId가 null이면 빈 배열 반환", async () => {
    const provider = createMockProvider()
    const result = await extractHighlights(provider, null)
    expect(result).toEqual([])
  })

  it("poignancy 상위 로그에서 highlights 추출", async () => {
    const provider = createMockProvider()
    const result = await extractHighlights(provider, "session-1")
    expect(result).toHaveLength(1)
    expect(result[0]).toContain("좋아하는 영화?")
    expect(result[0]).toContain("인셉션이요!")
  })
})

// ── T435: endChatThread ────────────────────────────────

describe("endChatThread (T435)", () => {
  it("정상적으로 스레드를 종료한다", async () => {
    const provider = createMockProvider()
    const result = await endChatThread(provider, {
      threadId: "thread-1",
      userId: "user-1",
    })

    expect(result.totalTurns).toBe(0)
    expect(result.highlights).toHaveLength(1)
    // isActive=false, endedAt 설정
    expect(provider.updateThread).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({ isActive: false, endedAt: expect.any(Date) })
    )
    // 세션 종료
    expect(provider.endInteractionSession).toHaveBeenCalledWith("session-1", expect.any(Date))
  })

  it("사용자 제공 highlights 사용", async () => {
    const provider = createMockProvider()
    const result = await endChatThread(provider, {
      threadId: "thread-1",
      userId: "user-1",
      highlights: ["좋은 대화였어요", "영화 추천 받았음"],
    })

    expect(result.highlights).toEqual(["좋은 대화였어요", "영화 추천 받았음"])
    // 자동 추출 미호출
    expect(provider.getTopPoignancyLogs).not.toHaveBeenCalled()
  })

  it("대화방이 없으면 THREAD_NOT_FOUND 에러", async () => {
    const provider = createMockProvider({
      getThread: vi.fn().mockResolvedValue(null),
    })

    await expect(endChatThread(provider, { threadId: "x", userId: "user-1" })).rejects.toThrow(
      "THREAD_NOT_FOUND"
    )
  })

  it("다른 유저의 스레드면 UNAUTHORIZED 에러", async () => {
    const provider = createMockProvider({
      getThread: vi.fn().mockResolvedValue({
        id: "thread-1",
        personaId: "persona-1",
        userId: "other-user",
        sessionId: "session-1",
        totalMessages: 5,
        isActive: true,
        lastMessageAt: new Date(),
        intimacyScore: 0,
        intimacyLevel: 1,
        lastIntimacyAt: null,
        sharedMilestones: null,
      }),
    })

    await expect(
      endChatThread(provider, { threadId: "thread-1", userId: "user-1" })
    ).rejects.toThrow("UNAUTHORIZED")
  })

  it("이미 종료된 스레드면 THREAD_ALREADY_ENDED 에러", async () => {
    const provider = createMockProvider({
      getThread: vi.fn().mockResolvedValue({
        id: "thread-1",
        personaId: "persona-1",
        userId: "user-1",
        sessionId: "session-1",
        totalMessages: 5,
        isActive: false,
        lastMessageAt: new Date(),
        intimacyScore: 0,
        intimacyLevel: 1,
        lastIntimacyAt: null,
        sharedMilestones: null,
      }),
    })

    await expect(
      endChatThread(provider, { threadId: "thread-1", userId: "user-1" })
    ).rejects.toThrow("THREAD_ALREADY_ENDED")
  })
})
