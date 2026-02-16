import { describe, it, expect, vi, beforeEach } from "vitest"
import type { PersonaStateData, CommentToneDecision } from "@/lib/persona-world/types"
import type { ThreeLayerVector } from "@/types/persona-v3"

// Mock llm-client
vi.mock("@/lib/llm-client", () => ({
  generateText: vi.fn(),
  isLLMConfigured: vi.fn(),
}))

import { generateText, isLLMConfigured } from "@/lib/llm-client"
import {
  createPostLLMProvider,
  createCommentLLMProvider,
  createConsumptionLLMProvider,
  createUserInteractionLLMProvider,
  splitSystemPromptForCache,
} from "@/lib/persona-world/llm-adapter"

const mockGenerateText = vi.mocked(generateText)
const mockIsLLMConfigured = vi.mocked(isLLMConfigured)

// ── 공통 테스트 데이터 ────────────────────────────────────────

const PERSONA_ID = "test-persona-1"

const mockLLMResult = {
  text: "테스트 생성 텍스트",
  inputTokens: 100,
  outputTokens: 50,
  model: "claude-sonnet-4-5-20250929",
  stopReason: "end_turn",
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
}

const testState: PersonaStateData = {
  mood: 0.7,
  energy: 0.8,
  socialBattery: 0.6,
  paradoxTension: 0.2,
}

const testTone: CommentToneDecision = {
  tone: "empathetic",
  confidence: 0.8,
  reason: "sociability(0.7) + mood(0.7) → empathetic",
  paradoxInfluence: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGenerateText.mockResolvedValue(mockLLMResult)
  mockIsLLMConfigured.mockReturnValue(true)
})

// ── Post LLM Provider ─────────────────────────────────────────

describe("createPostLLMProvider", () => {
  it("generateText를 올바른 파라미터로 호출한다", async () => {
    const provider = createPostLLMProvider(PERSONA_ID)

    const result = await provider.generateText({
      systemPrompt: "시스템 프롬프트",
      userPrompt: "유저 프롬프트",
      maxTokens: 500,
    })

    // T143: 마커 없는 프롬프트 → prefix 없이 전부 suffix
    expect(mockGenerateText).toHaveBeenCalledWith({
      systemPrompt: "시스템 프롬프트",
      systemPromptPrefix: undefined,
      userMessage: "유저 프롬프트",
      maxTokens: 500,
      temperature: 0.8,
      callType: "pw:post_generation",
      personaId: PERSONA_ID,
    })

    expect(result.text).toBe("테스트 생성 텍스트")
    expect(result.tokensUsed).toBe(150) // 100 + 50
  })

  it("T143: [현재 상태] 마커가 있으면 prefix/suffix를 분리한다", async () => {
    const provider = createPostLLMProvider(PERSONA_ID)

    await provider.generateText({
      systemPrompt: "당신은 페르소나입니다.\n\n[Voice]\n분석적\n\n[현재 상태]\n기분: 0.70",
      userPrompt: "포스트 작성",
      maxTokens: 500,
    })

    const callArgs = mockGenerateText.mock.calls[0][0]
    expect(callArgs.systemPromptPrefix).toBe("당신은 페르소나입니다.\n\n[Voice]\n분석적")
    expect(callArgs.systemPrompt).toBe("[현재 상태]\n기분: 0.70")
  })

  it("personaId를 올바르게 전달한다", async () => {
    const customId = "persona-custom-123"
    const provider = createPostLLMProvider(customId)
    await provider.generateText({
      systemPrompt: "test",
      userPrompt: "test",
      maxTokens: 100,
    })

    expect(mockGenerateText).toHaveBeenCalledWith(expect.objectContaining({ personaId: customId }))
  })
})

// ── Comment LLM Provider ──────────────────────────────────────

describe("createCommentLLMProvider", () => {
  it("댓글을 생성한다", async () => {
    const provider = createCommentLLMProvider(PERSONA_ID)

    const result = await provider.generateComment({
      postContent: "오늘 새 영화를 봤는데 정말 좋았어요!",
      tone: testTone,
      ragContext: {
        voiceAnchor: "분석적 어투",
        relationMemory: "",
        interestContinuity: "영화 관련 관심",
        consumptionMemory: "",
      },
      commenterState: testState,
    })

    expect(result).toBe("테스트 생성 텍스트")
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        callType: "pw:comment",
        personaId: PERSONA_ID,
        maxTokens: 300,
        temperature: 0.8,
      })
    )
  })

  it("T143: 시스템 프롬프트를 prefix(역할정의)+suffix(동적상태)로 분리한다", async () => {
    const provider = createCommentLLMProvider(PERSONA_ID)
    await provider.generateComment({
      postContent: "테스트",
      tone: { ...testTone, tone: "analytical" },
      ragContext: {
        voiceAnchor: "",
        relationMemory: "",
        interestContinuity: "",
        consumptionMemory: "",
      },
      commenterState: testState,
    })

    const callArgs = mockGenerateText.mock.calls[0][0]
    // prefix: 정적 역할 정의
    expect(callArgs.systemPromptPrefix).toContain("당신은 SNS에서 활동하는 페르소나입니다")
    // suffix: 동적 톤/상태
    expect(callArgs.systemPrompt).toContain("analytical")
    expect(callArgs.systemPrompt).toContain("0.70") // mood
  })

  it("유저 프롬프트에 포스트 내용과 RAG 컨텍스트를 포함한다", async () => {
    const provider = createCommentLLMProvider(PERSONA_ID)
    await provider.generateComment({
      postContent: "원본 포스트 내용",
      tone: testTone,
      ragContext: {
        voiceAnchor: "보이스 앵커",
        relationMemory: "",
        interestContinuity: "관심사 연속성",
        consumptionMemory: "",
      },
      commenterState: testState,
    })

    const callArgs = mockGenerateText.mock.calls[0][0]
    expect(callArgs.userMessage).toContain("원본 포스트 내용")
    expect(callArgs.userMessage).toContain("보이스 앵커")
    expect(callArgs.userMessage).toContain("관심사 연속성")
  })
})

// ── Consumption LLM Provider ──────────────────────────────────

describe("createConsumptionLLMProvider", () => {
  it("인상 생성을 호출한다 (T143: prefix 분리)", async () => {
    const provider = createConsumptionLLMProvider(PERSONA_ID)

    const result = await provider.generateImpression({
      contentType: "MOVIE",
      title: "인터스텔라",
      personaContext: "SF와 우주 테마를 좋아하는 페르소나",
    })

    expect(result).toBe("테스트 생성 텍스트")
    const callArgs = mockGenerateText.mock.calls[0][0]
    expect(callArgs.callType).toBe("pw:impression")
    expect(callArgs.personaId).toBe(PERSONA_ID)
    expect(callArgs.maxTokens).toBe(100)
    // T143: prefix에 정적 역할, suffix에 동적 컨텍스트
    expect(callArgs.systemPromptPrefix).toContain("한줄 감상을 작성하세요")
    expect(callArgs.systemPrompt).toBe("SF와 우주 테마를 좋아하는 페르소나")
  })

  it("결과를 100자로 제한한다", async () => {
    mockGenerateText.mockResolvedValueOnce({
      ...mockLLMResult,
      text: "가".repeat(200),
    })

    const provider = createConsumptionLLMProvider(PERSONA_ID)
    const result = await provider.generateImpression({
      contentType: "BOOK",
      title: "테스트 책",
      personaContext: "독서를 좋아함",
    })

    expect(result.length).toBe(100)
  })
})

// ── User Interaction LLM Provider ─────────────────────────────

describe("createUserInteractionLLMProvider", () => {
  describe("analyzeUserAttitude", () => {
    it("유저 태도를 JSON으로 파싱한다", async () => {
      mockGenerateText.mockResolvedValueOnce({
        ...mockLLMResult,
        text: '{"politeness": 0.8, "aggression": 0.1, "intimacy": 0.5}',
      })

      const provider = createUserInteractionLLMProvider(PERSONA_ID)
      const uiv = await provider.analyzeUserAttitude("정말 좋은 글이에요! 감사합니다.")

      expect(uiv.politeness).toBe(0.8)
      expect(uiv.aggression).toBe(0.1)
      expect(uiv.intimacy).toBe(0.5)
      const callArgs = mockGenerateText.mock.calls[0][0]
      expect(callArgs.callType).toBe("pw:user_response")
      expect(callArgs.temperature).toBe(0.3)
      // T143: UIV 분석은 전체 시스템 프롬프트가 정적 → prefix로 전달
      expect(callArgs.systemPromptPrefix).toContain("태도를 분석하세요")
      expect(callArgs.systemPrompt).toBe("")
    })

    it("JSON 파싱 실패 시 기본값을 반환한다", async () => {
      mockGenerateText.mockResolvedValueOnce({
        ...mockLLMResult,
        text: "파싱할 수 없는 텍스트",
      })

      const provider = createUserInteractionLLMProvider(PERSONA_ID)
      const uiv = await provider.analyzeUserAttitude("테스트")

      expect(uiv.politeness).toBe(0.3)
      expect(uiv.aggression).toBe(0.1)
      expect(uiv.intimacy).toBe(0.2)
    })

    it("값을 0~1 범위로 클램핑한다", async () => {
      mockGenerateText.mockResolvedValueOnce({
        ...mockLLMResult,
        text: '{"politeness": 1.5, "aggression": -0.3, "intimacy": 0.5}',
      })

      const provider = createUserInteractionLLMProvider(PERSONA_ID)
      const uiv = await provider.analyzeUserAttitude("테스트")

      expect(uiv.politeness).toBe(1.0)
      expect(uiv.aggression).toBe(0.0)
      expect(uiv.intimacy).toBe(0.5)
    })
  })

  describe("generateResponse", () => {
    it("유저 댓글에 대한 응답을 생성한다", async () => {
      const provider = createUserInteractionLLMProvider(PERSONA_ID)
      const vectors: ThreeLayerVector = {
        social: {
          depth: 0.7,
          lens: 0.5,
          stance: 0.6,
          scope: 0.5,
          taste: 0.5,
          purpose: 0.5,
          sociability: 0.7,
        },
        temperament: {
          openness: 0.8,
          conscientiousness: 0.6,
          extraversion: 0.7,
          agreeableness: 0.7,
          neuroticism: 0.3,
        },
        narrative: {
          lack: 0.4,
          moralCompass: 0.6,
          volatility: 0.3,
          growthArc: 0.7,
        },
      }

      const result = await provider.generateResponse({
        userComment: "좋은 글이에요!",
        personaVectors: vectors,
        uiv: { politeness: 0.8, aggression: 0.1, intimacy: 0.5 },
        ragContext: "",
        tone: "supportive",
      })

      expect(result).toBe("테스트 생성 텍스트")
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          callType: "pw:user_response",
          personaId: PERSONA_ID,
          maxTokens: 300,
          temperature: 0.8,
        })
      )
    })

    it("T143: prefix(역할정의)+suffix(동적톤/UIV)로 분리한다", async () => {
      const provider = createUserInteractionLLMProvider(PERSONA_ID)
      await provider.generateResponse({
        userComment: "테스트",
        personaVectors: {
          social: {
            depth: 0.5,
            lens: 0.5,
            stance: 0.5,
            scope: 0.5,
            taste: 0.5,
            purpose: 0.5,
            sociability: 0.5,
          },
          temperament: {
            openness: 0.5,
            conscientiousness: 0.5,
            extraversion: 0.5,
            agreeableness: 0.5,
            neuroticism: 0.5,
          },
          narrative: { lack: 0.5, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 },
        },
        uiv: { politeness: 0.9, aggression: 0.0, intimacy: 0.6 },
        ragContext: "테스트 맥락",
        tone: "analytical",
      })

      const callArgs = mockGenerateText.mock.calls[0][0]
      // prefix: 정적 역할 정의
      expect(callArgs.systemPromptPrefix).toContain("유저 댓글에 답변합니다")
      // suffix: 동적 톤/UIV
      expect(callArgs.systemPrompt).toContain("analytical")
      expect(callArgs.systemPrompt).toContain("0.9")
      expect(callArgs.systemPrompt).toContain("테스트 맥락")
    })
  })
})

// ── splitSystemPromptForCache (T143) ────────────────────────────

describe("splitSystemPromptForCache", () => {
  it("[현재 상태] 마커를 기준으로 분리한다", () => {
    const prompt = "당신은 페르소나입니다.\n\n[Voice]\n분석적\n\n[현재 상태]\n기분: 0.70"
    const { prefix, suffix } = splitSystemPromptForCache(prompt)

    expect(prefix).toBe("당신은 페르소나입니다.\n\n[Voice]\n분석적")
    expect(suffix).toBe("[현재 상태]\n기분: 0.70")
  })

  it("마커가 없으면 전체를 suffix로 반환한다", () => {
    const prompt = "마커 없는 프롬프트"
    const { prefix, suffix } = splitSystemPromptForCache(prompt)

    expect(prefix).toBe("")
    expect(suffix).toBe("마커 없는 프롬프트")
  })

  it("마커가 맨 앞이면 전체를 suffix로 반환한다", () => {
    const prompt = "[현재 상태]\n기분: 0.50"
    const { prefix, suffix } = splitSystemPromptForCache(prompt)

    expect(prefix).toBe("")
    expect(suffix).toBe("[현재 상태]\n기분: 0.50")
  })

  it("빈 문자열을 처리한다", () => {
    const { prefix, suffix } = splitSystemPromptForCache("")

    expect(prefix).toBe("")
    expect(suffix).toBe("")
  })
})

// ── isLLMConfigured ───────────────────────────────────────────

describe("isLLMConfigured", () => {
  it("re-export가 동작한다", async () => {
    const { isLLMConfigured: reexported } = await import("@/lib/persona-world/llm-adapter")
    expect(typeof reexported).toBe("function")
  })
})
