// ═══════════════════════════════════════════════════════════════
// T149: LLM 기반 정성적 차원 생성기 테스트
// LLM 호출을 mock하여 JSON 파싱, 검증, fallback 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest"
import { _internals } from "@/lib/qualitative/llm-qualitative"
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

const VALID_LLM_RESPONSE = {
  backstory: {
    origin:
      "지방 소도시의 작은 서점을 운영하던 아버지 밑에서 자랐다. 초등학교 때 몰래 읽은 카프카의 변신이 세상을 의심하는 법을 가르쳐줬다.",
    formativeExperience: "대학에서 비교문학을 전공하며 비평적 사고의 기초를 다졌다.",
    innerConflict:
      "분석이 깊어질수록 작품을 순수하게 즐기지 못하는 자신을 발견한다. 이 습관이 때로는 재능이고 때로는 저주다.",
    selfNarrative: "나는 논리의 갑옷을 입은 예민한 감성가다. 분석은 내 방어이자 표현이다.",
    nlpKeywords: ["분석적", "비평", "심층", "논리적", "예민", "내향적", "결핍", "성장"],
  },
  voice: {
    speechStyle:
      "문장은 길지만 군더더기가 없다. 비판할 때는 냉정하지만, 좋은 작품 앞에서는 말을 아낀다.",
    habitualExpressions: [
      "구조적으로 보면...",
      "핵심은 이거야.",
      "근거 없는 감상은 감상이 아니라 감탄이다.",
    ],
    physicalMannerisms: [
      "글을 쓸 때 손가락으로 테이블을 두드린다",
      "깊은 생각에 빠지면 눈을 감는다",
    ],
    unconsciousBehaviors: [
      "감상 후 며칠이 지나서야 진짜 의견이 형성된다",
      "칭찬보다 비판이 먼저 나오는 것을 스스로 인지하지 못한다",
    ],
    activationThresholds: {
      anger: 0.55,
      joy: 0.65,
      sadness: 0.45,
      surprise: 0.6,
      disgust: 0.7,
    },
  },
  pressure: {
    situationalTriggers: [
      {
        condition: "논쟁적 댓글이나 인신공격을 받았을 때",
        affectedLayer: "L1",
        affectedDimension: "stance",
        effect: "boost",
        magnitude: 0.6,
      },
      {
        condition: "자신의 리뷰가 무시당했다고 느낄 때",
        affectedLayer: "L2",
        affectedDimension: "neuroticism",
        effect: "boost",
        magnitude: 0.5,
      },
      {
        condition: "예상치 못한 비판을 받았을 때",
        affectedLayer: "L3",
        affectedDimension: "volatility",
        effect: "boost",
        magnitude: 0.4,
      },
    ],
    stressResponse:
      "스트레스 상황에서 더 날카로운 비평으로 반격한다. 논리를 무기로 삼아 공격적으로 반응한다.",
    comfortZone: "충분한 시간을 갖고 글을 다듬을 수 있는 조용한 환경.",
  },
  zeitgeist: {
    culturalReferences: [
      "고전 문학과 예술 영화를 기준점으로 삼는다",
      "한국뿐 아니라 해외 콘텐츠에도 높은 관심을 보인다",
    ],
    generationalMarkers: [
      "아날로그와 디지털 경험을 모두 갖고 있다",
      "깊이 있는 독서와 영화 관람을 선호한다",
    ],
    socialAwareness: 0.42,
    trendSensitivity: 0.55,
  },
}

// ═══════════════════════════════════════════════════════════════
// extractJSON 테스트
// ═══════════════════════════════════════════════════════════════

describe("extractJSON", () => {
  const { extractJSON } = _internals

  it("should extract JSON from ```json code block", () => {
    const text = '```json\n{"key": "value"}\n```'
    expect(extractJSON(text)).toBe('{"key": "value"}')
  })

  it("should extract JSON from ``` code block (no json tag)", () => {
    const text = '```\n{"key": "value"}\n```'
    expect(extractJSON(text)).toBe('{"key": "value"}')
  })

  it("should extract bare JSON object", () => {
    const text = 'Some text before\n{"key": "value"}\nSome text after'
    expect(extractJSON(text)).toBe('{"key": "value"}')
  })

  it("should return original text if no JSON found", () => {
    const text = "No JSON here"
    expect(extractJSON(text)).toBe("No JSON here")
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

  it("should detect sociability-extraversion paradox", () => {
    // L1.sociability=0.3, L2.extraversion=0.35 → diff=0.05 < 0.3 → no paradox
    const msg = buildUserMessage(L1, L2, L3)
    expect(msg).not.toContain("사교적 가면")

    // 큰 괴리 만들기
    const highSocL1 = { ...L1, sociability: 0.9 }
    const lowExtL2 = { ...L2, extraversion: 0.2 }
    const msg2 = buildUserMessage(highSocL1, lowExtL2, L3)
    expect(msg2).toContain("핵심 역설")
    expect(msg2).toContain("사교성")
  })

  it("should detect stance-agreeableness paradox", () => {
    const highStanceL1 = { ...L1, stance: 0.8 }
    const highAgreeL2 = { ...L2, agreeableness: 0.8 }
    const msg = buildUserMessage(highStanceL1, highAgreeL2, L3)
    expect(msg).toContain("따뜻한 독설가")
  })

  it("should include archetype info when provided", () => {
    const arch = {
      id: "ironic-philosopher",
      name: "아이러닉 철학자",
      narrativeHint: "세상을 비틀어 보는 관찰자",
    } as import("@/types").PersonaArchetype
    const msg = buildUserMessage(L1, L2, L3, arch)
    expect(msg).toContain("아키타입")
    expect(msg).toContain("ironic-philosopher")
    expect(msg).toContain("세상을 비틀어 보는 관찰자")
  })
})

// ═══════════════════════════════════════════════════════════════
// validateAndNormalize 테스트
// ═══════════════════════════════════════════════════════════════

describe("validateAndNormalize", () => {
  const { validateAndNormalize } = _internals

  it("should pass through valid response", () => {
    const result = validateAndNormalize(VALID_LLM_RESPONSE)

    expect(result.backstory.origin).toBe(VALID_LLM_RESPONSE.backstory.origin)
    expect(result.backstory.nlpKeywords.length).toBeGreaterThanOrEqual(5)
    expect(result.voice.speechStyle).toBe(VALID_LLM_RESPONSE.voice.speechStyle)
    expect(result.voice.habitualExpressions.length).toBe(3)
    expect(result.voice.activationThresholds.anger).toBe(0.55)
    expect(result.pressure.situationalTriggers.length).toBe(3)
    expect(result.pressure.situationalTriggers[0].affectedLayer).toBe("L1")
    expect(result.zeitgeist.socialAwareness).toBe(0.42)
    expect(result.zeitgeist.trendSensitivity).toBe(0.55)
  })

  it("should use fallback for missing backstory fields", () => {
    const partial = {
      backstory: {
        origin: "",
        formativeExperience: null as unknown as string,
        innerConflict: undefined as unknown as string,
        selfNarrative: "자기 서사",
        nlpKeywords: [],
      },
      voice: VALID_LLM_RESPONSE.voice,
      pressure: VALID_LLM_RESPONSE.pressure,
      zeitgeist: VALID_LLM_RESPONSE.zeitgeist,
    }

    const result = validateAndNormalize(partial)

    // 빈 문자열/null/undefined → fallback 문장 사용
    expect(result.backstory.origin).toBe("출신 서사를 알 수 없다.")
    expect(result.backstory.formativeExperience).toBe("다양한 경험을 통해 현재에 이르렀다.")
    expect(result.backstory.innerConflict).toBe("내면의 갈등을 안고 살아간다.")
    expect(result.backstory.selfNarrative).toBe("자기 서사")
  })

  it("should clamp activation thresholds to 0-1", () => {
    const outOfRange = {
      ...VALID_LLM_RESPONSE,
      voice: {
        ...VALID_LLM_RESPONSE.voice,
        activationThresholds: {
          anger: 1.5,
          joy: -0.3,
          sadness: 0.5,
          surprise: 2.0,
          disgust: "invalid" as unknown as number,
        },
      },
    }

    const result = validateAndNormalize(outOfRange)
    expect(result.voice.activationThresholds.anger).toBe(1)
    expect(result.voice.activationThresholds.joy).toBe(0)
    expect(result.voice.activationThresholds.sadness).toBe(0.5)
    expect(result.voice.activationThresholds.surprise).toBe(1)
    expect(result.voice.activationThresholds.disgust).toBe(0.5) // NaN fallback
  })

  it("should enforce valid enum values for triggers", () => {
    const badTriggers = {
      ...VALID_LLM_RESPONSE,
      pressure: {
        ...VALID_LLM_RESPONSE.pressure,
        situationalTriggers: [
          {
            condition: "테스트",
            affectedLayer: "L4", // invalid
            affectedDimension: "test",
            effect: "explode", // invalid
            magnitude: 0.5,
          },
          {
            condition: "테스트2",
            affectedLayer: "L2",
            affectedDimension: "test2",
            effect: "suppress",
            magnitude: 1.5, // out of range
          },
        ],
      },
    }

    const result = validateAndNormalize(badTriggers)
    expect(result.pressure.situationalTriggers[0].affectedLayer).toBe("L1") // fallback
    expect(result.pressure.situationalTriggers[0].effect).toBe("boost") // fallback
    expect(result.pressure.situationalTriggers[1].magnitude).toBe(1) // clamped
  })

  it("should add minimum trigger if less than 2", () => {
    const fewTriggers = {
      ...VALID_LLM_RESPONSE,
      pressure: {
        ...VALID_LLM_RESPONSE.pressure,
        situationalTriggers: [
          {
            condition: "하나뿐인 트리거",
            affectedLayer: "L1",
            affectedDimension: "stance",
            effect: "boost",
            magnitude: 0.5,
          },
        ],
      },
    }

    const result = validateAndNormalize(fewTriggers)
    expect(result.pressure.situationalTriggers.length).toBeGreaterThanOrEqual(2)
  })

  it("should handle completely empty response gracefully", () => {
    const empty = {
      backstory: {} as typeof VALID_LLM_RESPONSE.backstory,
      voice: {} as typeof VALID_LLM_RESPONSE.voice,
      pressure: {} as typeof VALID_LLM_RESPONSE.pressure,
      zeitgeist: {} as typeof VALID_LLM_RESPONSE.zeitgeist,
    }

    const result = validateAndNormalize(empty)

    // 모든 필드에 fallback 값이 들어가야 함
    expect(result.backstory.origin).toBeTruthy()
    expect(result.voice.speechStyle).toBeTruthy()
    expect(result.pressure.stressResponse).toBeTruthy()
    expect(result.zeitgeist.socialAwareness).toBe(0.5)
    expect(result.voice.activationThresholds.anger).toBe(0.5)
    expect(result.pressure.situationalTriggers.length).toBeGreaterThanOrEqual(2)
  })

  it("should limit triggers to max 8", () => {
    const manyTriggers = {
      ...VALID_LLM_RESPONSE,
      pressure: {
        ...VALID_LLM_RESPONSE.pressure,
        situationalTriggers: Array.from({ length: 12 }, (_, i) => ({
          condition: `트리거 ${i}`,
          affectedLayer: "L1",
          affectedDimension: "stance",
          effect: "boost",
          magnitude: 0.5,
        })),
      },
    }

    const result = validateAndNormalize(manyTriggers)
    expect(result.pressure.situationalTriggers.length).toBeLessThanOrEqual(8)
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

  it("should contain JSON schema", () => {
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("backstory")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("voice")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("pressure")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("zeitgeist")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("activationThresholds")
    expect(_internals.SYSTEM_PROMPT_PREFIX).toContain("situationalTriggers")
  })
})

// ═══════════════════════════════════════════════════════════════
// generateAllQualitativeDimensionsWithLLM 통합 테스트 (mocked)
// ═══════════════════════════════════════════════════════════════

// LLM 클라이언트 모킹
vi.mock("@/lib/llm-client", () => ({
  isLLMConfigured: vi.fn().mockReturnValue(true),
  generateText: vi.fn(),
}))

import { generateAllQualitativeDimensionsWithLLM } from "@/lib/qualitative/llm-qualitative"
import { generateText, isLLMConfigured } from "@/lib/llm-client"

describe("generateAllQualitativeDimensionsWithLLM", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should generate all 4 dimensions from LLM response", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify(VALID_LLM_RESPONSE),
      inputTokens: 1000,
      outputTokens: 800,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 500,
      cacheReadInputTokens: 0,
    })

    const result = await generateAllQualitativeDimensionsWithLLM(L1, L2, L3)

    expect(result.backstory.origin).toBeTruthy()
    expect(result.voice.speechStyle).toBeTruthy()
    expect(result.pressure.situationalTriggers.length).toBeGreaterThanOrEqual(2)
    expect(result.zeitgeist.culturalReferences.length).toBeGreaterThanOrEqual(2)
  })

  it("should handle JSON wrapped in code block", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: "```json\n" + JSON.stringify(VALID_LLM_RESPONSE) + "\n```",
      inputTokens: 1000,
      outputTokens: 800,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 500,
    })

    const result = await generateAllQualitativeDimensionsWithLLM(L1, L2, L3)
    expect(result.backstory.origin).toBe(VALID_LLM_RESPONSE.backstory.origin)
  })

  it("should throw when LLM is not configured", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(false)

    await expect(generateAllQualitativeDimensionsWithLLM(L1, L2, L3)).rejects.toThrow(
      "ANTHROPIC_API_KEY"
    )
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

    await expect(generateAllQualitativeDimensionsWithLLM(L1, L2, L3)).rejects.toThrow()
  })

  it("should pass systemPromptPrefix for prompt caching", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify(VALID_LLM_RESPONSE),
      inputTokens: 1000,
      outputTokens: 800,
      model: "claude-sonnet-4-5-20250929",
      stopReason: "end_turn",
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 800,
    })

    await generateAllQualitativeDimensionsWithLLM(L1, L2, L3)

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPromptPrefix: expect.stringContaining("캐릭터 디자이너"),
        callType: "qualitative:all",
      })
    )
  })

  it("should propagate LLM errors for caller to handle", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true)
    vi.mocked(generateText).mockRejectedValue(new Error("Rate limit exceeded"))

    await expect(generateAllQualitativeDimensionsWithLLM(L1, L2, L3)).rejects.toThrow(
      "Rate limit exceeded"
    )
  })
})
