import { describe, it, expect } from "vitest"
import {
  buildSystemPrompt,
  buildUserPrompt,
  generatePostContent,
  buildVoiceStyleInstruction,
  buildFewShotSnippet,
  extractPostTypeMetadata,
} from "@/lib/persona-world/content-generator"
import type {
  PostGenerationInput,
  PersonaPostType,
  VoiceStyleParams,
  SocialPersonaVector,
} from "@/lib/persona-world/types"

// ── 테스트용 입력 생성 ──

const makeInput = (overrides?: Partial<PostGenerationInput>): PostGenerationInput => ({
  personaId: "persona-1",
  postType: "REVIEW" as PersonaPostType,
  trigger: "SCHEDULED",
  topic: "최근 본 영화에 대한 리뷰",
  ragContext: {
    voiceAnchor: "[Voice] 평소 논리적이고 분석적인 어투 사용",
    interestContinuity: "최근 SF 영화에 관심이 많음",
    consumptionMemory: "기묘한 이야기 시즌3 시청 완료",
    emotionalState: "기분이 좋고 에너지가 충분한 상태",
  },
  personaState: {
    mood: 0.7,
    energy: 0.8,
    socialBattery: 0.6,
    paradoxTension: 0.2,
  },
  ...overrides,
})

// ═══ buildSystemPrompt ═══

describe("buildSystemPrompt", () => {
  it("상태 설명 포함", () => {
    const input = makeInput()
    const { prompt } = buildSystemPrompt(input)

    expect(prompt).toContain("현재 기분")
    expect(prompt).toContain("에너지")
    expect(prompt).toContain("소셜 배터리")
    expect(prompt).toContain("내면 긴장")
  })

  it("Voice 앵커 포함", () => {
    const input = makeInput()
    const { prompt } = buildSystemPrompt(input)

    expect(prompt).toContain("논리적이고 분석적인 어투")
  })

  it("감정 상태 포함", () => {
    const input = makeInput()
    const { prompt } = buildSystemPrompt(input)

    expect(prompt).toContain("기분이 좋고 에너지가 충분")
  })

  it("mood 높으면 '극긍정' 표기", () => {
    const input = makeInput({
      personaState: { mood: 0.9, energy: 0.5, socialBattery: 0.5, paradoxTension: 0.1 },
    })
    const { prompt } = buildSystemPrompt(input)

    expect(prompt).toContain("극긍정")
  })

  it("mood 낮으면 '극부정' 표기", () => {
    const input = makeInput({
      personaState: { mood: 0.1, energy: 0.5, socialBattery: 0.5, paradoxTension: 0.1 },
    })
    const { prompt } = buildSystemPrompt(input)

    expect(prompt).toContain("극부정")
  })

  it("paradoxTension 높으면 '폭발 직전' 표기", () => {
    const input = makeInput({
      personaState: { mood: 0.5, energy: 0.5, socialBattery: 0.5, paradoxTension: 0.9 },
    })
    const { prompt } = buildSystemPrompt(input)

    expect(prompt).toContain("폭발 직전")
  })
})

// ═══ buildUserPrompt ═══

describe("buildUserPrompt", () => {
  it("포스트 타입 포함", () => {
    const input = makeInput()
    const prompt = buildUserPrompt(input)

    expect(prompt).toContain("REVIEW")
  })

  it("글 길이 가이드 포함 (REVIEW)", () => {
    const input = makeInput()
    const prompt = buildUserPrompt(input)

    expect(prompt).toContain("200~500자")
  })

  it("주제 포함", () => {
    const input = makeInput()
    const prompt = buildUserPrompt(input)

    expect(prompt).toContain("최근 본 영화에 대한 리뷰")
  })

  it("관심사 맥락 포함", () => {
    const input = makeInput()
    const prompt = buildUserPrompt(input)

    expect(prompt).toContain("SF 영화")
  })

  it("소비 기억 포함", () => {
    const input = makeInput()
    const prompt = buildUserPrompt(input)

    expect(prompt).toContain("기묘한 이야기")
  })

  it("topic 없으면 주제 항목 없음", () => {
    const input = makeInput({ topic: undefined })
    const prompt = buildUserPrompt(input)

    expect(prompt).not.toContain("[주제]")
  })

  it("MEME 타입 → 짧은 길이 가이드", () => {
    const input = makeInput({ postType: "MEME" as PersonaPostType })
    const prompt = buildUserPrompt(input)

    expect(prompt).toContain("10~80자")
  })

  it("THREAD 타입 → 긴 길이 가이드", () => {
    const input = makeInput({ postType: "THREAD" as PersonaPostType })
    const prompt = buildUserPrompt(input)

    expect(prompt).toContain("300~800자")
  })
})

// ═══ buildUserPrompt — COLLAB 멘션 목록 ═══

describe("buildUserPrompt — COLLAB phantom mention prevention", () => {
  it("COLLAB + availablePersonaHandles → [멘션 가능 목록] 섹션 포함", () => {
    const input = makeInput({
      postType: "COLLAB" as PersonaPostType,
      availablePersonaHandles: [
        { handle: "영화광_민수", name: "민수" },
        { handle: "테크_리뷰어", name: "지수" },
      ],
    })
    const prompt = buildUserPrompt(input)

    expect(prompt).toContain("[멘션 가능 목록]")
    expect(prompt).toContain("@영화광_민수 (민수)")
    expect(prompt).toContain("@테크_리뷰어 (지수)")
    expect(prompt).toContain("목록에 없는 이름")
  })

  it("COLLAB + availablePersonaHandles 미제공 → 핸들 데이터 없음", () => {
    const input = makeInput({
      postType: "COLLAB" as PersonaPostType,
    })
    const prompt = buildUserPrompt(input)

    // 지시 텍스트에는 [멘션 가능 목록] 언급이 있지만, 실제 핸들 데이터 행은 없어야 함
    expect(prompt).not.toMatch(/\[멘션 가능 목록\]\s*@/)
  })

  it("COLLAB 아닌 타입 + availablePersonaHandles → 멘션 목록 미포함", () => {
    const input = makeInput({
      postType: "REVIEW" as PersonaPostType,
      availablePersonaHandles: [{ handle: "test", name: "테스트" }],
    })
    const prompt = buildUserPrompt(input)

    expect(prompt).not.toMatch(/\[멘션 가능 목록\]\s*@/)
  })

  it("COLLAB 타입 지시에 '목록에 없는 이름 만들지 마세요' 포함", () => {
    const input = makeInput({
      postType: "COLLAB" as PersonaPostType,
      availablePersonaHandles: [{ handle: "test", name: "테스트" }],
    })
    const prompt = buildUserPrompt(input)

    expect(prompt).toContain("만들어내지 마세요")
  })
})

// ═══ generatePostContent ═══

describe("generatePostContent", () => {
  it("LLM provider 없으면 placeholder 반환", async () => {
    const input = makeInput()
    const result = await generatePostContent(input)

    expect(result.content).toContain("[REVIEW]")
    expect(result.content).toContain("최근 본 영화")
    expect(result.tokensUsed).toBe(0)
    expect(result.voiceConsistencyScore).toBe(0)
    expect(result.metadata).toHaveProperty("postType", "REVIEW")
  })

  it("LLM provider 있으면 생성 결과 반환", async () => {
    const mockProvider = {
      generateText: async () => ({
        text: "생성된 리뷰 콘텐츠입니다.",
        tokensUsed: 150,
      }),
    }

    const input = makeInput()
    const result = await generatePostContent(input, mockProvider)

    expect(result.content).toBe("생성된 리뷰 콘텐츠입니다.")
    expect(result.tokensUsed).toBe(150)
    expect(result.metadata).toHaveProperty("postType", "REVIEW")
  })

  it("metadata에 프롬프트 길이 포함", async () => {
    const input = makeInput()
    const result = await generatePostContent(input)

    expect(result.metadata).toHaveProperty("systemPromptLength")
    expect(result.metadata).toHaveProperty("userPromptLength")
    expect(result.metadata.systemPromptLength).toBeGreaterThan(0)
    expect(result.metadata.userPromptLength).toBeGreaterThan(0)
  })

  it("topic 없으면 '자유 주제' placeholder", async () => {
    const input = makeInput({ topic: undefined })
    const result = await generatePostContent(input)

    expect(result.content).toContain("자유 주제")
  })
})

// ═══ buildVoiceStyleInstruction ═══

describe("buildVoiceStyleInstruction", () => {
  const neutralVoice: VoiceStyleParams = {
    formality: 0.5,
    humor: 0.5,
    sentenceLength: 0.5,
    emotionExpression: 0.5,
    assertiveness: 0.5,
    vocabularyLevel: 0.5,
  }

  it("중간 범위 값 → 빈 문자열 (지시 없음)", () => {
    const result = buildVoiceStyleInstruction(neutralVoice)
    expect(result).toBe("")
  })

  it("높은 formality → '격식있는 문어체' 포함", () => {
    const result = buildVoiceStyleInstruction({ ...neutralVoice, formality: 0.8 })
    expect(result).toContain("격식")
  })

  it("낮은 formality → '구어체' 포함", () => {
    const result = buildVoiceStyleInstruction({ ...neutralVoice, formality: 0.2 })
    expect(result).toContain("구어체")
  })

  it("높은 humor → '유머' 포함", () => {
    const result = buildVoiceStyleInstruction({ ...neutralVoice, humor: 0.8 })
    expect(result).toContain("유머")
  })

  it("낮은 humor → '진지' 포함", () => {
    const result = buildVoiceStyleInstruction({ ...neutralVoice, humor: 0.2 })
    expect(result).toContain("진지")
  })

  it("높은 assertiveness → '단정적' 포함", () => {
    const result = buildVoiceStyleInstruction({ ...neutralVoice, assertiveness: 0.8 })
    expect(result).toContain("단정적")
  })

  it("낮은 assertiveness → '조심스럽게' 포함", () => {
    const result = buildVoiceStyleInstruction({ ...neutralVoice, assertiveness: 0.2 })
    expect(result).toContain("조심스럽게")
  })

  it("높은 emotionExpression → '감정' 표현 지시 포함", () => {
    const result = buildVoiceStyleInstruction({ ...neutralVoice, emotionExpression: 0.8 })
    expect(result).toContain("감정")
  })

  it("높은 vocabularyLevel → '전문용어' 포함", () => {
    const result = buildVoiceStyleInstruction({ ...neutralVoice, vocabularyLevel: 0.8 })
    expect(result).toContain("전문용어")
  })

  it("복합: 격식적+진지+단정적 → 3개 지시 모두 포함", () => {
    const result = buildVoiceStyleInstruction({
      ...neutralVoice,
      formality: 0.9,
      humor: 0.1,
      assertiveness: 0.9,
    })
    expect(result).toContain("격식")
    expect(result).toContain("진지")
    expect(result).toContain("단정적")
  })

  it("[말투 스타일] 섹션 헤더 포함", () => {
    const result = buildVoiceStyleInstruction({ ...neutralVoice, formality: 0.9 })
    expect(result).toContain("[말투 스타일]")
  })
})

// ═══ buildSystemPrompt + voiceStyle ═══

describe("buildSystemPrompt with voiceStyle", () => {
  it("voiceStyle 제공 시 말투 스타일 섹션 포함", () => {
    const input = makeInput({
      voiceStyle: {
        formality: 0.9,
        humor: 0.1,
        sentenceLength: 0.5,
        emotionExpression: 0.5,
        assertiveness: 0.8,
        vocabularyLevel: 0.8,
      },
    })
    const { prompt } = buildSystemPrompt(input)

    expect(prompt).toContain("[말투 스타일]")
    expect(prompt).toContain("격식")
    expect(prompt).toContain("진지")
  })

  it("voiceStyle 미제공 시 말투 스타일 섹션 없음", () => {
    const input = makeInput()
    const { prompt } = buildSystemPrompt(input)

    expect(prompt).not.toContain("[말투 스타일]")
  })

  it("voiceStyle 중간 값만 → 말투 스타일 섹션 없음", () => {
    const input = makeInput({
      voiceStyle: {
        formality: 0.5,
        humor: 0.5,
        sentenceLength: 0.5,
        emotionExpression: 0.5,
        assertiveness: 0.5,
        vocabularyLevel: 0.5,
      },
    })
    const { prompt } = buildSystemPrompt(input)

    expect(prompt).not.toContain("[말투 스타일]")
  })
})

// ═══ buildFewShotSnippet ═══

const makeL1 = (overrides?: Partial<SocialPersonaVector>): SocialPersonaVector => ({
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
  ...overrides,
})

describe("buildFewShotSnippet", () => {
  it("fewShotKey 형식: {soc}|{sta}|{len}", () => {
    const { fewShotKey } = buildFewShotSnippet(makeL1({ sociability: 0.1, stance: 0.9, lens: 0.5 }))
    expect(fewShotKey).toBe("low|high|mid")
  })

  it("low sociability → 독백 예시 포함", () => {
    const { text } = buildFewShotSnippet(makeL1({ sociability: 0.1 }))
    expect(text).toContain("혼자")
  })

  it("high sociability → 대화 예시 포함", () => {
    const { text } = buildFewShotSnippet(makeL1({ sociability: 0.9 }))
    expect(text).toContain("너도 봤어?")
  })

  it("high stance → 비판 예시 포함", () => {
    const { text } = buildFewShotSnippet(makeL1({ stance: 0.9 }))
    expect(text).toContain("기대 이하")
  })

  it("low lens → 감성 예시 포함", () => {
    const { text } = buildFewShotSnippet(makeL1({ lens: 0.1 }))
    expect(text).toContain("감정이 계속 올라오는")
  })

  it("high lens → 논리 예시 포함", () => {
    const { text } = buildFewShotSnippet(makeL1({ lens: 0.9 }))
    expect(text).toContain("서사 구조")
  })
})

// ═══ buildSystemPrompt + fewShot ═══

describe("buildSystemPrompt with fewShot", () => {
  it("fewShotEnabled=true + l1Vector 있으면 문체 예시 섹션 포함 + fewShotKey 반환", () => {
    const l1 = makeL1({ sociability: 0.9, stance: 0.1, lens: 0.9 })
    const input = makeInput({
      personaProfile: { name: "테스터", fewShotEnabled: true },
      l1Vector: l1,
    })
    const { prompt, fewShotKey } = buildSystemPrompt(input)

    expect(prompt).toContain("[문체 예시")
    expect(fewShotKey).toBe("high|low|high")
  })

  it("fewShotEnabled=false → 문체 예시 없음, fewShotKey undefined", () => {
    const l1 = makeL1({ sociability: 0.9 })
    const input = makeInput({
      personaProfile: { name: "테스터", fewShotEnabled: false },
      l1Vector: l1,
    })
    const { prompt, fewShotKey } = buildSystemPrompt(input)

    expect(prompt).not.toContain("[문체 예시")
    expect(fewShotKey).toBeUndefined()
  })

  it("l1Vector 없으면 fewShotEnabled=true여도 문체 예시 없음", () => {
    const input = makeInput({
      personaProfile: { name: "테스터", fewShotEnabled: true },
    })
    const { prompt, fewShotKey } = buildSystemPrompt(input)

    expect(prompt).not.toContain("[문체 예시")
    expect(fewShotKey).toBeUndefined()
  })
})
