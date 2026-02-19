// ═══════════════════════════════════════════════════════════════
// T154: LLM 기반 Express 퀴크 생성기 테스트
// LLM 호출을 mock하여 JSON 파싱, 검증, fallback 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest"
import { _internals } from "@/lib/interaction/llm-express-quirks"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── Fixtures ──────────────────────────────────────────────────

const L1: SocialPersonaVector = {
  depth: 0.85,
  lens: 0.9,
  stance: 0.75,
  scope: 0.8,
  taste: 0.35,
  purpose: 0.7,
  sociability: 0.3,
}
const L2: CoreTemperamentVector = {
  openness: 0.75,
  conscientiousness: 0.6,
  extraversion: 0.35,
  agreeableness: 0.45,
  neuroticism: 0.7,
}
const L3: NarrativeDriveVector = {
  lack: 0.65,
  moralCompass: 0.55,
  volatility: 0.5,
  growthArc: 0.6,
}

// ── 유효한 LLM 응답 샘플 ─────────────────────────────────────

const VALID_QUIRK_RESPONSE = [
  {
    id: "anxious_deep_dive",
    name: "불안한 몰입",
    description: "분석 중 불안감이 치솟으면 오히려 더 깊이 파고든다",
    condition: {
      dimension: "derived",
      derivedState: "introspection",
      operator: "gt",
      value: 0.7,
    },
    baseProbability: 0.4,
    cooldownTurns: 3,
    expression: "갑자기 침묵하더니 분석의 깊이가 두 단계 올라간다",
  },
  {
    id: "critical_warmth",
    name: "날카로운 온기",
    description: "비판적이면서도 따뜻한 역설적 반응",
    condition: {
      dimension: "derived",
      derivedState: "assertiveness",
      operator: "gt",
      value: 0.6,
    },
    baseProbability: 0.35,
    cooldownTurns: 4,
    expression: "날카롭게 비판한 직후 '그래도 이 부분은 좋았어'라고 덧붙인다",
  },
  {
    id: "social_withdrawal",
    name: "갑작스런 후퇴",
    description: "사교적 상황에서 갑자기 침묵하는 내향적 발동",
    condition: {
      dimension: "derived",
      derivedState: "vulnerability",
      operator: "gt",
      value: 0.65,
    },
    baseProbability: 0.3,
    cooldownTurns: 5,
    expression: "활발하게 대화하다가 갑자기 '나 좀 생각할 시간이 필요해'라며 물러난다",
  },
  {
    id: "enthusiasm_burst",
    name: "열정 폭발",
    description: "좋은 콘텐츠를 만나면 분석을 잊고 감탄한다",
    condition: {
      dimension: "derived",
      derivedState: "enthusiasm",
      operator: "gt",
      value: 0.8,
    },
    baseProbability: 0.5,
    cooldownTurns: 2,
    expression: "분석 모드를 벗어나 순수한 감탄을 쏟아낸다",
  },
  {
    id: "irritable_precision",
    name: "예민한 정밀함",
    description: "짜증이 나면 오히려 더 정확해진다",
    condition: {
      dimension: "derived",
      derivedState: "irritability",
      operator: "gt",
      value: 0.6,
    },
    baseProbability: 0.45,
    cooldownTurns: 3,
    expression: "과민한 상태에서 칼같이 정확한 비평을 던진다",
  },
]

// ═══════════════════════════════════════════════════════════════
// extractJSON 테스트
// ═══════════════════════════════════════════════════════════════

describe("extractJSON (quirks)", () => {
  const { extractJSON } = _internals

  it("should extract JSON from ```json code block", () => {
    const text = "```json\n" + JSON.stringify(VALID_QUIRK_RESPONSE) + "\n```"
    const result = extractJSON(text)
    expect(JSON.parse(result)).toHaveLength(5)
  })

  it("should extract bare JSON array", () => {
    const text = "Here are the quirks:\n" + JSON.stringify(VALID_QUIRK_RESPONSE) + "\nDone."
    const result = extractJSON(text)
    expect(JSON.parse(result)).toHaveLength(5)
  })

  it("should return text as-is if no JSON found", () => {
    const text = "No JSON here"
    expect(extractJSON(text)).toBe("No JSON here")
  })
})

// ═══════════════════════════════════════════════════════════════
// buildUserMessage 테스트
// ═══════════════════════════════════════════════════════════════

describe("buildUserMessage (quirks)", () => {
  const { buildUserMessage } = _internals

  it("should include all three layers in message", () => {
    const msg = buildUserMessage(L1, L2, L3)
    expect(msg).toContain("L1")
    expect(msg).toContain("L2")
    expect(msg).toContain("L3")
  })

  it("should detect sociability↔extraversion paradox", () => {
    const highSocL1 = { ...L1, sociability: 0.9 }
    const lowExtL2 = { ...L2, extraversion: 0.2 }
    const msg = buildUserMessage(highSocL1, lowExtL2, L3)
    expect(msg).toContain("핵심 역설")
    expect(msg).toContain("사교성")
  })

  it("should detect stance+agreeableness paradox", () => {
    const highStanceL1 = { ...L1, stance: 0.75 }
    const highAgreeL2 = { ...L2, agreeableness: 0.7 }
    const msg = buildUserMessage(highStanceL1, highAgreeL2, L3)
    expect(msg).toContain("비판적+친화적")
  })

  it("should detect depth+openness paradox", () => {
    const lowDepthL1 = { ...L1, depth: 0.3 }
    const highOpenL2 = { ...L2, openness: 0.75 }
    const msg = buildUserMessage(lowDepthL1, highOpenL2, L3)
    expect(msg).toContain("직관적+개방적")
  })

  it("should detect purpose+neuroticism paradox", () => {
    const highPurposeL1 = { ...L1, purpose: 0.7 }
    const highNeuroL2 = { ...L2, neuroticism: 0.7 }
    const msg = buildUserMessage(highPurposeL1, highNeuroL2, L3)
    expect(msg).toContain("의미추구+불안")
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

  it("should include voice profile when provided", () => {
    const voice = {
      speechStyle: "날카롭고 직설적인 어투",
      habitualExpressions: ["솔직히 이건 좀...", "핵심은 이거야."],
      physicalMannerisms: [],
      unconsciousBehaviors: [],
      activationThresholds: {},
    } as import("@/types").VoiceProfile
    const msg = buildUserMessage(L1, L2, L3, undefined, voice)
    expect(msg).toContain("말투 참고")
    expect(msg).toContain("날카롭고 직설적인 어투")
    expect(msg).toContain("솔직히 이건 좀...")
  })

  it("should not include paradox section when no paradoxes", () => {
    // L1 and L2 aligned → no paradoxes
    const alignedL1: SocialPersonaVector = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.4,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.4,
      sociability: 0.5,
    }
    const alignedL2: CoreTemperamentVector = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.4,
    }
    const msg = buildUserMessage(alignedL1, alignedL2, L3)
    expect(msg).not.toContain("핵심 역설")
  })
})

// ═══════════════════════════════════════════════════════════════
// validateAndNormalize 테스트
// ═══════════════════════════════════════════════════════════════

describe("validateAndNormalize (quirks)", () => {
  const { validateAndNormalize } = _internals

  it("should pass through valid quirk definitions", () => {
    const result = validateAndNormalize(VALID_QUIRK_RESPONSE)

    expect(result).toHaveLength(5)
    expect(result[0].id).toBe("anxious_deep_dive")
    expect(result[0].condition.derivedState).toBe("introspection")
    expect(result[0].condition.operator).toBe("gt")
    expect(result[0].condition.value).toBe(0.7)
    expect(result[0].baseProbability).toBe(0.4)
    expect(result[0].cooldownTurns).toBe(3)
  })

  it("should limit to max 8 quirks", () => {
    const tooMany = Array.from({ length: 12 }, (_, i) => ({
      ...VALID_QUIRK_RESPONSE[0],
      id: `quirk_${i}`,
    }))
    const result = validateAndNormalize(tooMany)
    expect(result.length).toBeLessThanOrEqual(8)
  })

  it("should deduplicate quirk ids", () => {
    const dupes = [
      { ...VALID_QUIRK_RESPONSE[0], id: "same_id" },
      { ...VALID_QUIRK_RESPONSE[1], id: "same_id" },
      { ...VALID_QUIRK_RESPONSE[2], id: "unique_id" },
    ]
    const result = validateAndNormalize(dupes)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("same_id")
    expect(result[1].id).toBe("unique_id")
  })

  it("should fallback invalid derivedState to valid rotation", () => {
    const badState = [
      {
        ...VALID_QUIRK_RESPONSE[0],
        condition: {
          ...VALID_QUIRK_RESPONSE[0].condition,
          derivedState: "invalid_state",
        },
      },
    ]
    const result = validateAndNormalize(badState)
    expect(result).toHaveLength(1)
    // Should be one of the 5 valid derived states
    const validStates = [
      "irritability",
      "enthusiasm",
      "vulnerability",
      "assertiveness",
      "introspection",
    ]
    expect(validStates).toContain(result[0].condition.derivedState)
  })

  it("should fallback invalid operator to 'gt'", () => {
    const badOp = [
      {
        ...VALID_QUIRK_RESPONSE[0],
        condition: {
          ...VALID_QUIRK_RESPONSE[0].condition,
          operator: "eq",
        },
      },
    ]
    const result = validateAndNormalize(badOp)
    expect(result[0].condition.operator).toBe("gt")
  })

  it("should handle 'between' operator with array value", () => {
    const betweenQuirk = [
      {
        ...VALID_QUIRK_RESPONSE[0],
        condition: {
          dimension: "derived",
          derivedState: "enthusiasm",
          operator: "between",
          value: [0.3, 0.7],
        },
      },
    ]
    const result = validateAndNormalize(betweenQuirk)
    expect(result[0].condition.operator).toBe("between")
    expect(result[0].condition.value).toEqual([0.3, 0.7])
  })

  it("should clamp baseProbability to 0.2~0.7 range", () => {
    const outOfRange = [
      { ...VALID_QUIRK_RESPONSE[0], baseProbability: 0.05 },
      { ...VALID_QUIRK_RESPONSE[1], baseProbability: 0.95 },
    ]
    const result = validateAndNormalize(outOfRange)
    expect(result[0].baseProbability).toBeGreaterThanOrEqual(0.2)
    expect(result[1].baseProbability).toBeLessThanOrEqual(0.7)
  })

  it("should clamp cooldownTurns to 2~6 range", () => {
    const outOfRange = [
      { ...VALID_QUIRK_RESPONSE[0], cooldownTurns: 0 },
      { ...VALID_QUIRK_RESPONSE[1], cooldownTurns: 20 },
    ]
    const result = validateAndNormalize(outOfRange)
    expect(result[0].cooldownTurns).toBeGreaterThanOrEqual(2)
    expect(result[1].cooldownTurns).toBeLessThanOrEqual(6)
  })

  it("should use fallback for missing fields", () => {
    const minimal = [
      {
        id: "",
        name: "",
        description: "",
        condition: {},
        baseProbability: null,
        cooldownTurns: undefined,
        expression: "",
      },
    ]
    const result = validateAndNormalize(minimal as never)
    expect(result).toHaveLength(1)
    expect(result[0].id).toContain("custom_quirk")
    expect(result[0].name).toBeTruthy()
    expect(result[0].description).toBeTruthy()
    expect(result[0].expression).toBeTruthy()
    expect(result[0].condition.dimension).toBe("derived")
  })

  it("should return empty array for non-array input", () => {
    expect(validateAndNormalize("not an array" as never)).toEqual([])
    expect(validateAndNormalize(null as never)).toEqual([])
    expect(validateAndNormalize(undefined as never)).toEqual([])
  })

  it("should skip null/non-object items", () => {
    const mixed = [null, "string", VALID_QUIRK_RESPONSE[0], undefined]
    const result = validateAndNormalize(mixed as never)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("anxious_deep_dive")
  })

  it("should clamp condition.value to 0~1 range", () => {
    const outOfRange = [
      {
        ...VALID_QUIRK_RESPONSE[0],
        condition: {
          ...VALID_QUIRK_RESPONSE[0].condition,
          value: 1.5,
        },
      },
    ]
    const result = validateAndNormalize(outOfRange)
    expect(result[0].condition.value).toBeLessThanOrEqual(1)
    expect(result[0].condition.value).toBeGreaterThanOrEqual(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// SYSTEM_PROMPT_PREFIX 테스트
// ═══════════════════════════════════════════════════════════════

describe("SYSTEM_PROMPT_PREFIX (quirks)", () => {
  it("should contain derived states explanation", () => {
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("irritability")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("enthusiasm")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("vulnerability")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("assertiveness")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("introspection")
  })

  it("should contain QuirkDefinition schema", () => {
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("baseProbability")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("cooldownTurns")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("condition")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("expression")
  })
})

// ═══════════════════════════════════════════════════════════════
// generateExpressQuirksWithLLM 통합 테스트 (mocked)
// ═══════════════════════════════════════════════════════════════

vi.mock("@/lib/llm-client", () => ({
  isLLMConfigured: vi.fn().mockReturnValue(true),
  generateText: vi.fn(),
}))

import { generateExpressQuirksWithLLM } from "@/lib/interaction/llm-express-quirks"
import { generateText, isLLMConfigured } from "@/lib/llm-client"

describe("generateExpressQuirksWithLLM", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should generate quirk definitions from LLM response", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify(VALID_QUIRK_RESPONSE),
      inputTokens: 600,
      outputTokens: 500,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 300,
      cacheReadInputTokens: 0,
    })

    const result = await generateExpressQuirksWithLLM(L1, L2, L3)

    expect(result).toHaveLength(5)
    expect(result[0].id).toBe("anxious_deep_dive")
    expect(result[0].condition.derivedState).toBe("introspection")
  })

  it("should handle JSON wrapped in code block", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: "```json\n" + JSON.stringify(VALID_QUIRK_RESPONSE) + "\n```",
      inputTokens: 600,
      outputTokens: 500,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 300,
    })

    const result = await generateExpressQuirksWithLLM(L1, L2, L3)
    expect(result).toHaveLength(5)
  })

  it("should throw when LLM is not configured", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(false)

    await expect(generateExpressQuirksWithLLM(L1, L2, L3)).rejects.toThrow("ANTHROPIC_API_KEY")
  })

  it("should throw on invalid JSON response", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: "This is not JSON at all",
      inputTokens: 500,
      outputTokens: 100,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    })

    await expect(generateExpressQuirksWithLLM(L1, L2, L3)).rejects.toThrow()
  })

  it("should pass systemPromptPrefix for prompt caching", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify(VALID_QUIRK_RESPONSE),
      inputTokens: 600,
      outputTokens: 500,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 300,
    })

    await generateExpressQuirksWithLLM(L1, L2, L3)

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPromptPrefix: expect.stringContaining("퀴크"),
        callType: "express:quirks",
      })
    )
  })

  it("should pass archetype and voice profile to user message", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify(VALID_QUIRK_RESPONSE),
      inputTokens: 600,
      outputTokens: 500,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    })

    const arch = {
      id: "ironic-philosopher",
      name: "아이러닉 철학자",
      description: "세상을 비틀어 보는 관찰자",
      narrativeHint: "아이러니로 세상을 해석",
    } as import("@/types").PersonaArchetype

    const voice = {
      speechStyle: "날카롭고 직설적인 어투",
      habitualExpressions: ["핵심은 이거야."],
      physicalMannerisms: [],
      unconsciousBehaviors: [],
      activationThresholds: {},
    } as import("@/types").VoiceProfile

    await generateExpressQuirksWithLLM(L1, L2, L3, arch, voice)

    const callArgs = vi.mocked(generateText).mock.calls[0][0]
    expect(callArgs.userMessage).toContain("ironic-philosopher")
    expect(callArgs.userMessage).toContain("날카롭고 직설적인 어투")
  })

  it("should propagate LLM errors for caller to handle", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockRejectedValue(new Error("Rate limit exceeded"))

    await expect(generateExpressQuirksWithLLM(L1, L2, L3)).rejects.toThrow("Rate limit exceeded")
  })
})
