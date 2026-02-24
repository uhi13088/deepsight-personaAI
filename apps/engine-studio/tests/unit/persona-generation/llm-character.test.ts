// ═══════════════════════════════════════════════════════════════
// T153: LLM 기반 캐릭터 생성기 테스트
// LLM 호출을 mock하여 JSON 파싱, 검증, fallback 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest"
import { _internals } from "@/lib/persona-generation/llm-character-generator"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import { IRONIC_L1 as L1, IRONIC_L2 as L2, IRONIC_L3 as L3 } from "../fixtures"

// ── 유효한 LLM 응답 샘플 ─────────────────────────────────────

const VALID_LLM_RESPONSE = {
  name: "서진",
  role: "논리의 갑옷을 입은 심층 비평가",
  expertise: ["텍스트 해석", "서사 구조 분석", "비교 비평"],
  description: "날카로운 분석력과 예민한 감수성 사이에서 균형을 잡는 비평가",
  background:
    "지방 대학 도서관에서 보낸 유년기가 이 사람의 분석적 시선을 만들었다. 카프카를 처음 읽던 열네 살 여름, '세상은 해석해야 보인다'는 깨달음이 왔다. 이후 비교문학을 전공하며 모든 작품을 해부하는 습관이 생겼지만, 가끔 순수하게 감동받고 싶다는 욕구와 충돌한다.",
  speechPatterns: ["구조적으로 보면...", "근거를 대자면...", "흥미로운 건 이 지점인데..."],
  quirks: [
    "논리적으로 분석하다가 갑자기 감정적 토로를 시작한다",
    "비판한 직후 '그래도...'라며 부연한다",
  ],
  habits: [
    "감상 노트를 꼼꼼히 기록한다",
    "글을 쓸 때 여러 번 고쳐 쓴다",
    "평점을 매기기 전 최소 하루를 기다린다",
  ],
  relationships: [
    {
      type: "rival",
      description: "감성 중심 리뷰어와의 긴장 관계",
      dynamic: "서로의 접근법을 비판하면서도 은근히 인정하는 사이",
    },
    {
      type: "mentor",
      description: "은퇴한 문학 교수",
      dynamic: "비평의 깊이를 넓혀준 영향력 있는 관계",
    },
  ],
}

// ═══════════════════════════════════════════════════════════════
// extractJSON 테스트
// ═══════════════════════════════════════════════════════════════

describe("extractJSON", () => {
  const { extractJSON } = _internals

  it("should extract JSON from ```json code block", () => {
    const text = '```json\n{"name": "서진"}\n```'
    expect(extractJSON(text)).toBe('{"name": "서진"}')
  })

  it("should extract bare JSON object", () => {
    const text = 'Some text\n{"name": "서진"}\nMore text'
    expect(extractJSON(text)).toBe('{"name": "서진"}')
  })
})

// ═══════════════════════════════════════════════════════════════
// buildUserMessage 테스트
// ═══════════════════════════════════════════════════════════════

describe("buildUserMessage", () => {
  const { buildUserMessage } = _internals

  it("should include all three layers in message", () => {
    const msg = buildUserMessage(L1, L2, L3)
    expect(msg).toContain("L1 (Social Persona)")
    expect(msg).toContain("L2 (Core Temperament)")
    expect(msg).toContain("L3 (Narrative Drive)")
    expect(msg).toContain(`depth: ${L1.depth}`)
    expect(msg).toContain(`openness: ${L2.openness}`)
    expect(msg).toContain(`lack: ${L3.lack}`)
  })

  it("should detect paradoxes", () => {
    const highSocL1 = { ...L1, sociability: 0.9 }
    const lowExtL2 = { ...L2, extraversion: 0.2 }
    const msg = buildUserMessage(highSocL1, lowExtL2, L3)
    expect(msg).toContain("핵심 역설")
    expect(msg).toContain("사교성")
  })

  it("should include archetype info when provided", () => {
    const arch = {
      id: "ironic-philosopher",
      name: "아이러닉 철학자",
      description: "세상을 비틀어 보는 관찰자",
      narrativeHint: "아이러니로 세상을 해석",
    } as import("@/types").PersonaArchetype
    const msg = buildUserMessage(L1, L2, L3, arch)
    expect(msg).toContain("아키타입")
    expect(msg).toContain("ironic-philosopher")
  })

  it("should include existing names for dedup", () => {
    const msg = buildUserMessage(L1, L2, L3, undefined, ["현서", "유진", "태우"])
    expect(msg).toContain("금지 이름")
    expect(msg).toContain("현서")
    expect(msg).toContain("유진")
  })

  it("should not include dedup section when no existing names", () => {
    const msg = buildUserMessage(L1, L2, L3)
    expect(msg).not.toContain("금지 이름")
  })
})

// ═══════════════════════════════════════════════════════════════
// validateAndNormalize 테스트
// ═══════════════════════════════════════════════════════════════

describe("validateAndNormalize", () => {
  const { validateAndNormalize } = _internals

  it("should pass through valid response", () => {
    const result = validateAndNormalize(VALID_LLM_RESPONSE)

    expect(result.name).toBe("서진")
    expect(result.role).toBe("논리의 갑옷을 입은 심층 비평가")
    expect(result.expertise).toHaveLength(3)
    expect(result.description).toBeTruthy()
    expect(result.background).toBeTruthy()
    expect(result.speechPatterns.length).toBeGreaterThanOrEqual(2)
    expect(result.quirks.length).toBeGreaterThanOrEqual(1)
    expect(result.habits.length).toBeGreaterThanOrEqual(2)
    expect(result.relationships.length).toBeGreaterThanOrEqual(2)
  })

  it("should use fallback for missing fields", () => {
    const partial = {
      name: "",
      role: null as unknown as string,
      expertise: [],
      description: undefined as unknown as string,
      background: "",
      speechPatterns: [],
      quirks: [],
      habits: [],
      relationships: [],
    }

    const result = validateAndNormalize(partial)

    expect(result.name).toBe("무명")
    expect(result.role).toBe("콘텐츠 리뷰어")
    expect(result.expertise.length).toBeGreaterThanOrEqual(2)
    expect(result.description).toBeTruthy()
    expect(result.speechPatterns.length).toBeGreaterThanOrEqual(2)
    expect(result.quirks.length).toBeGreaterThanOrEqual(1)
    expect(result.habits.length).toBeGreaterThanOrEqual(2)
    expect(result.relationships.length).toBeGreaterThanOrEqual(2)
  })

  it("should normalize invalid relationship types to ally", () => {
    const badRelations = {
      ...VALID_LLM_RESPONSE,
      relationships: [
        { type: "enemy", description: "적", dynamic: "대립" },
        { type: "rival", description: "라이벌", dynamic: "경쟁" },
      ],
    }

    const result = validateAndNormalize(badRelations)
    expect(result.relationships[0].type).toBe("ally") // "enemy" → fallback to "ally"
    expect(result.relationships[1].type).toBe("rival") // valid
  })

  it("should limit arrays to max lengths", () => {
    const tooMany = {
      ...VALID_LLM_RESPONSE,
      expertise: Array.from({ length: 10 }, (_, i) => `분야${i}`),
      speechPatterns: Array.from({ length: 10 }, (_, i) => `말버릇${i}`),
      quirks: Array.from({ length: 10 }, (_, i) => `퀴크${i}`),
      habits: Array.from({ length: 10 }, (_, i) => `습관${i}`),
      relationships: Array.from({ length: 10 }, (_, i) => ({
        type: "ally",
        description: `관계${i}`,
        dynamic: `역동${i}`,
      })),
    }

    const result = validateAndNormalize(tooMany)
    expect(result.expertise.length).toBeLessThanOrEqual(5)
    expect(result.speechPatterns.length).toBeLessThanOrEqual(5)
    expect(result.quirks.length).toBeLessThanOrEqual(4)
    expect(result.habits.length).toBeLessThanOrEqual(4)
    expect(result.relationships.length).toBeLessThanOrEqual(4)
  })
})

// ═══════════════════════════════════════════════════════════════
// SYSTEM_PROMPT_PREFIX 테스트
// ═══════════════════════════════════════════════════════════════

describe("SYSTEM_PROMPT_PREFIX", () => {
  it("should contain vector interpretation guide", () => {
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("L1: Social Persona Vector")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("L2: Core Temperament")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("L3: Narrative Drive")
  })

  it("should contain JSON schema for CharacterProfile", () => {
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain('"name"')
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain('"role"')
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain('"expertise"')
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain('"speechPatterns"')
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain('"quirks"')
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain('"relationships"')
  })
})

// ═══════════════════════════════════════════════════════════════
// generateCharacterWithLLM 통합 테스트 (mocked)
// ═══════════════════════════════════════════════════════════════

vi.mock("@/lib/llm-client", () => ({
  isLLMConfigured: vi.fn().mockReturnValue(true),
  generateText: vi.fn(),
}))

import { generateCharacterWithLLM } from "@/lib/persona-generation/llm-character-generator"
import { generateText, isLLMConfigured } from "@/lib/llm-client"

describe("generateCharacterWithLLM", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should generate character profile from LLM response", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify(VALID_LLM_RESPONSE),
      inputTokens: 800,
      outputTokens: 600,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 400,
      cacheReadInputTokens: 0,
    })

    const result = await generateCharacterWithLLM(L1, L2, L3)

    expect(result.name).toBe("서진")
    expect(result.role).toBeTruthy()
    expect(result.expertise.length).toBeGreaterThanOrEqual(2)
    expect(result.relationships.length).toBeGreaterThanOrEqual(2)
  })

  it("should handle JSON wrapped in code block", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: "```json\n" + JSON.stringify(VALID_LLM_RESPONSE) + "\n```",
      inputTokens: 800,
      outputTokens: 600,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 400,
    })

    const result = await generateCharacterWithLLM(L1, L2, L3)
    expect(result.name).toBe("서진")
  })

  it("should throw when LLM is not configured", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(false)

    await expect(generateCharacterWithLLM(L1, L2, L3)).rejects.toThrow("ANTHROPIC_API_KEY")
  })

  it("should throw on invalid JSON response", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: "This is not JSON",
      inputTokens: 500,
      outputTokens: 100,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    })

    await expect(generateCharacterWithLLM(L1, L2, L3)).rejects.toThrow()
  })

  it("should pass systemPromptPrefix for prompt caching", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify(VALID_LLM_RESPONSE),
      inputTokens: 800,
      outputTokens: 600,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 400,
    })

    await generateCharacterWithLLM(L1, L2, L3)

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPromptPrefix: expect.stringContaining("캐릭터 디자이너"),
        callType: "character:generate",
      })
    )
  })

  it("should pass existing names for dedup", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify(VALID_LLM_RESPONSE),
      inputTokens: 800,
      outputTokens: 600,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    })

    await generateCharacterWithLLM(L1, L2, L3, undefined, ["현서", "유진"])

    const callArgs = vi.mocked(generateText).mock.calls[0][0]
    expect(callArgs.userMessage).toContain("현서")
    expect(callArgs.userMessage).toContain("유진")
  })

  it("should propagate LLM errors for caller to handle", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockRejectedValue(new Error("Rate limit exceeded"))

    await expect(generateCharacterWithLLM(L1, L2, L3)).rejects.toThrow("Rate limit exceeded")
  })
})
