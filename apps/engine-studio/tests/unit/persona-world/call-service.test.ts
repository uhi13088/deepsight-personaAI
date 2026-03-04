import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createReservation,
  startCall,
  endCall,
  cancelReservation,
} from "@/lib/persona-world/call-service"
import type { CallDataProvider } from "@/lib/persona-world/call-service"
import type { PersonaProfileSnapshot, PersonaStateData } from "@/lib/persona-world/types"

// ═══════════════════════════════════════════════════════════════
// Call Service 단위 테스트 (T359)
//
// DI 기반 서비스이므로 mock provider로 비즈니스 로직만 검증.
// LLM/STT/TTS는 vi.mock으로 대체.
// ═══════════════════════════════════════════════════════════════

// ── LLM/TTS/STT/Memory Mock ─────────────────────────────────

vi.mock("@/lib/persona-world/conversation-engine", () => ({
  generateConversationResponse: vi.fn().mockResolvedValue({
    text: "안녕하세요, 전화 받아주셔서 감사해요!",
    outputTokens: 15,
  }),
}))

vi.mock("@/lib/persona-world/conversation-memory", () => ({
  retrieveConversationMemories: vi.fn().mockResolvedValue(""),
  recordConversationTurn: vi.fn().mockResolvedValue({ poignancy: 0.3 }),
  finalizeConversation: vi.fn().mockResolvedValue(undefined),
  adjustStateForConversation: vi.fn().mockImplementation((state: PersonaStateData) => state),
}))

vi.mock("@/lib/persona-world/voice-pipeline", () => ({
  speechToText: vi.fn().mockResolvedValue({ text: "안녕하세요", language: "ko" }),
  textToSpeech: vi
    .fn()
    .mockResolvedValue({ audioBase64: "TUVTVF9BVURJT19CQVNFNJQ=", contentType: "audio/mp3" }),
  buildTTSConfig: vi.fn().mockReturnValue({ language: "ko-KR" }),
  sttLanguageToBcp47: vi.fn().mockReturnValue("ko-KR"),
}))

// ── Mock Profile ─────────────────────────────────────────────

const MOCK_PROFILE: PersonaProfileSnapshot = {
  name: "테스트 페르소나",
  role: "COMPANION",
  expertise: ["음악"],
  description: "테스트용 통화 페르소나",
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

function createMockProvider(overrides?: Partial<CallDataProvider>): CallDataProvider {
  return {
    // Reservation
    createReservation: vi.fn().mockResolvedValue({ id: "res-1" }),
    getReservation: vi.fn().mockResolvedValue({
      id: "res-1",
      personaId: "persona-1",
      userId: "user-1",
      scheduledAt: new Date(),
      status: "PENDING",
      coinSpent: 200,
    }),
    updateReservationStatus: vi.fn().mockResolvedValue(undefined),
    getReservations: vi.fn().mockResolvedValue([]),

    // Call Session
    createCallSession: vi.fn().mockResolvedValue({ id: "call-1" }),
    updateCallSession: vi.fn().mockResolvedValue(undefined),
    getCallSession: vi.fn().mockResolvedValue(null),

    // Interaction
    createInteractionSession: vi.fn().mockResolvedValue({ id: "isession-1" }),
    getInteractionMemories: vi.fn().mockResolvedValue([]),
    saveInteractionLog: vi.fn().mockResolvedValue(undefined),
    incrementSessionTurns: vi.fn().mockResolvedValue(undefined),

    // Factbook + PersonaState
    getFactbook: vi.fn().mockResolvedValue(null),
    saveFactbook: vi.fn().mockResolvedValue(undefined),
    getPersonaState: vi.fn().mockResolvedValue(MOCK_STATE),
    savePersonaState: vi.fn().mockResolvedValue(undefined),

    // Profile
    getPersonaProfile: vi.fn().mockResolvedValue(MOCK_PROFILE),
    getPersonaVolatility: vi.fn().mockResolvedValue(0.3),

    // TTS Config
    getPersonaTTSConfig: vi.fn().mockResolvedValue({
      ttsProvider: null,
      ttsVoiceId: null,
      ttsPitch: null,
      ttsSpeed: null,
      ttsLanguage: null,
    }),

    // Credit
    getLatestTransaction: vi.fn().mockResolvedValue({
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
    }),
    createTransaction: vi.fn().mockResolvedValue({
      id: "tx-2",
      userId: "user-1",
      type: "SPEND",
      amount: -200,
      balanceAfter: 800,
      reason: "통화 예약",
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

// ── createReservation 테스트 ──────────────────────────────────

describe("createReservation", () => {
  it("잔액이 충분하면 예약을 생성한다", async () => {
    const provider = createMockProvider()

    const result = await createReservation(provider, {
      personaId: "persona-1",
      userId: "user-1",
      scheduledAt: new Date(),
    })

    expect(result.reservationId).toBe("res-1")
    expect(provider.createReservation).toHaveBeenCalled()
    expect(provider.createTransaction).toHaveBeenCalled()
  })

  it("잔액이 부족하면 INSUFFICIENT_CREDITS 에러를 던진다", async () => {
    const provider = createMockProvider({
      getLatestTransaction: vi.fn().mockResolvedValue({
        id: "tx-1",
        userId: "user-1",
        type: "EARN",
        amount: 100,
        balanceAfter: 100,
        reason: "initial",
        orderId: null,
        paymentKey: null,
        status: "COMPLETED",
        createdAt: new Date(),
      }),
    })

    await expect(
      createReservation(provider, {
        personaId: "persona-1",
        userId: "user-1",
        scheduledAt: new Date(),
      })
    ).rejects.toThrow("INSUFFICIENT_CREDITS")
  })
})

// ── startCall 테스트 ──────────────────────────────────────────

describe("startCall", () => {
  let provider: CallDataProvider

  beforeEach(() => {
    provider = createMockProvider()
  })

  it("예약 확인 → InteractionSession → CallSession → 인사 생성 순서로 실행한다", async () => {
    const result = await startCall(provider, "res-1")

    expect(provider.getReservation).toHaveBeenCalledWith("res-1")
    expect(provider.createInteractionSession).toHaveBeenCalledWith({
      personaId: "persona-1",
      userId: "user-1",
    })
    expect(provider.createCallSession).toHaveBeenCalledWith({
      reservationId: "res-1",
      interactionSessionId: "isession-1",
    })
    expect(result.callSessionId).toBe("call-1")
    expect(result.interactionSessionId).toBe("isession-1")
    expect(result.greetingText).toBeTruthy()
    expect(result.greetingAudio).toBeDefined()
  })

  it("예약 상태를 IN_PROGRESS로 업데이트한다", async () => {
    await startCall(provider, "res-1")

    expect(provider.updateReservationStatus).toHaveBeenCalledWith("res-1", "IN_PROGRESS")
  })

  it("존재하지 않는 예약이면 RESERVATION_NOT_FOUND 에러를 던진다", async () => {
    provider = createMockProvider({
      getReservation: vi.fn().mockResolvedValue(null),
    })

    await expect(startCall(provider, "res-999")).rejects.toThrow("RESERVATION_NOT_FOUND")
  })

  it("COMPLETED 상태 예약이면 RESERVATION_NOT_AVAILABLE 에러를 던진다", async () => {
    provider = createMockProvider({
      getReservation: vi.fn().mockResolvedValue({
        id: "res-1",
        personaId: "persona-1",
        userId: "user-1",
        scheduledAt: new Date(),
        status: "COMPLETED",
        coinSpent: 200,
      }),
    })

    await expect(startCall(provider, "res-1")).rejects.toThrow("RESERVATION_NOT_AVAILABLE")
  })

  it("CONFIRMED 상태 예약도 통화 시작 가능하다", async () => {
    provider = createMockProvider({
      getReservation: vi.fn().mockResolvedValue({
        id: "res-1",
        personaId: "persona-1",
        userId: "user-1",
        scheduledAt: new Date(),
        status: "CONFIRMED",
        coinSpent: 200,
      }),
    })

    const result = await startCall(provider, "res-1")
    expect(result.callSessionId).toBe("call-1")
  })
})

// ── endCall 테스트 ──────────────────────────────────────────

describe("endCall", () => {
  it("CallSession 종료 + 예약 COMPLETED + 기억 최종화를 수행한다", async () => {
    const provider = createMockProvider()

    const result = await endCall(provider, {
      reservationId: "res-1",
      callSessionId: "call-1",
      personaId: "persona-1",
      userId: "user-1",
      totalTurns: 5,
      totalDurationSec: 120,
      highlights: ["좋은 대화"],
    })

    expect(provider.updateCallSession).toHaveBeenCalledWith("call-1", {
      endedAt: expect.any(Date),
      totalTurns: 5,
      totalDurationSec: 120,
    })
    expect(provider.updateReservationStatus).toHaveBeenCalledWith("res-1", "COMPLETED")
    expect(result.totalTurns).toBe(5)
    expect(result.totalDurationSec).toBe(120)
  })
})

// ── cancelReservation 테스트 ────────────────────────────────

describe("cancelReservation", () => {
  it("PENDING 예약을 취소한다", async () => {
    const provider = createMockProvider()

    await cancelReservation(provider, {
      reservationId: "res-1",
      userId: "user-1",
    })

    expect(provider.updateReservationStatus).toHaveBeenCalledWith("res-1", "CANCELLED")
  })

  it("다른 유저의 예약은 취소할 수 없다", async () => {
    const provider = createMockProvider()

    await expect(
      cancelReservation(provider, {
        reservationId: "res-1",
        userId: "other-user",
      })
    ).rejects.toThrow("UNAUTHORIZED")
  })

  it("COMPLETED 예약은 취소할 수 없다", async () => {
    const provider = createMockProvider({
      getReservation: vi.fn().mockResolvedValue({
        id: "res-1",
        personaId: "persona-1",
        userId: "user-1",
        scheduledAt: new Date(),
        status: "COMPLETED",
        coinSpent: 200,
      }),
    })

    await expect(
      cancelReservation(provider, {
        reservationId: "res-1",
        userId: "user-1",
      })
    ).rejects.toThrow("CANNOT_CANCEL")
  })
})
