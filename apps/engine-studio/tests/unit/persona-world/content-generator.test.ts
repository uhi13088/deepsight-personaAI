import { describe, it, expect } from "vitest"
import {
  buildSystemPrompt,
  buildUserPrompt,
  generatePostContent,
} from "@/lib/persona-world/content-generator"
import type { PostGenerationInput, PersonaPostType } from "@/lib/persona-world/types"

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
    const prompt = buildSystemPrompt(input)

    expect(prompt).toContain("현재 기분")
    expect(prompt).toContain("에너지")
    expect(prompt).toContain("소셜 배터리")
    expect(prompt).toContain("내면 긴장")
  })

  it("Voice 앵커 포함", () => {
    const input = makeInput()
    const prompt = buildSystemPrompt(input)

    expect(prompt).toContain("논리적이고 분석적인 어투")
  })

  it("감정 상태 포함", () => {
    const input = makeInput()
    const prompt = buildSystemPrompt(input)

    expect(prompt).toContain("기분이 좋고 에너지가 충분")
  })

  it("mood 높으면 '극긍정' 표기", () => {
    const input = makeInput({
      personaState: { mood: 0.9, energy: 0.5, socialBattery: 0.5, paradoxTension: 0.1 },
    })
    const prompt = buildSystemPrompt(input)

    expect(prompt).toContain("극긍정")
  })

  it("mood 낮으면 '극부정' 표기", () => {
    const input = makeInput({
      personaState: { mood: 0.1, energy: 0.5, socialBattery: 0.5, paradoxTension: 0.1 },
    })
    const prompt = buildSystemPrompt(input)

    expect(prompt).toContain("극부정")
  })

  it("paradoxTension 높으면 '폭발 직전' 표기", () => {
    const input = makeInput({
      personaState: { mood: 0.5, energy: 0.5, socialBattery: 0.5, paradoxTension: 0.9 },
    })
    const prompt = buildSystemPrompt(input)

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
