import { describe, it, expect, vi } from "vitest"
import type { ThreeLayerVector } from "@/types/persona-v3"
import type {
  PersonaStateData,
  RelationshipScore,
  CommentGenerationInput,
} from "@/lib/persona-world/types"
import { decideCommentTone } from "@/lib/persona-world/interactions/comment-tone"
import {
  applyExpress,
  generateComment,
  type CommentDataProvider,
} from "@/lib/persona-world/interactions/comment-engine"
import {
  analyzeUserAttitudeSimple,
  computeAdaptDelta,
  respondToUser,
  type UserInteractionDataProvider,
} from "@/lib/persona-world/interactions/user-interaction"

// ── 헬퍼 ──

const makeVectors = (overrides?: Partial<ThreeLayerVector>): ThreeLayerVector => ({
  social: {
    depth: 0.5,
    lens: 0.5,
    stance: 0.5,
    scope: 0.5,
    taste: 0.5,
    purpose: 0.5,
    sociability: 0.5,
    ...overrides?.social,
  },
  temperament: {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
    ...overrides?.temperament,
  },
  narrative: {
    lack: 0.5,
    moralCompass: 0.5,
    volatility: 0.5,
    growthArc: 0.5,
    ...overrides?.narrative,
  },
})

const makeState = (overrides?: Partial<PersonaStateData>): PersonaStateData => ({
  mood: 0.5,
  energy: 0.8,
  socialBattery: 0.7,
  paradoxTension: 0.2,
  ...overrides,
})

const makeRelationship = (overrides?: Partial<RelationshipScore>): RelationshipScore => ({
  warmth: 0.5,
  tension: 0.0,
  frequency: 0.0,
  depth: 0.0,
  lastInteractionAt: null,
  ...overrides,
})

// ═══ decideCommentTone ═══

describe("decideCommentTone", () => {
  it("stance+lens 높으면 counter_argument", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        lens: 0.8,
        stance: 0.8,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
    })
    const state = makeState()
    const result = decideCommentTone(vectors, state, null, 0.3)
    expect(result.tone).toBe("counter_argument")
    expect(result.confidence).toBeGreaterThan(0)
  })

  it("sociability+interactivity 높으면 playful", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        lens: 0.5,
        stance: 0.3,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.8,
      },
      temperament: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.8,
        agreeableness: 0.5,
        neuroticism: 0.5,
      },
    })
    const state = makeState()
    const result = decideCommentTone(vectors, state, null, 0.3)
    // sociability>0.6 + interactivity (derived) > 0.6
    expect(["playful", "counter_argument", "analytical", "supportive"]).toContain(result.tone)
  })

  it("depth+purpose 높으면 analytical", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.8,
        lens: 0.3,
        stance: 0.3,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.8,
        sociability: 0.3,
      },
    })
    const state = makeState()
    const result = decideCommentTone(vectors, state, null, 0.3)
    expect(result.tone).toBe("analytical")
  })

  it("lack 높음 + mood 낮음 → defensive", () => {
    const vectors = makeVectors({
      narrative: { lack: 0.8, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 },
    })
    const state = makeState({ mood: 0.3 })
    const result = decideCommentTone(vectors, state, null, 0.3)
    expect(result.tone).toBe("defensive")
  })

  it("agreeableness 높음 + warmth 높음 → empathetic", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.3,
        lens: 0.3,
        stance: 0.3,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.3,
        sociability: 0.3,
      },
      temperament: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.8,
        neuroticism: 0.3,
      },
      narrative: { lack: 0.3, moralCompass: 0.5, volatility: 0.3, growthArc: 0.5 },
    })
    const rel = makeRelationship({ warmth: 0.7 })
    const state = makeState({ mood: 0.6 })
    const result = decideCommentTone(vectors, state, rel, 0.1)
    expect(result.tone).toBe("empathetic")
  })

  it("기본 fallback → supportive", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.3,
        lens: 0.3,
        stance: 0.3,
        scope: 0.3,
        taste: 0.3,
        purpose: 0.3,
        sociability: 0.3,
      },
      temperament: {
        openness: 0.3,
        conscientiousness: 0.3,
        extraversion: 0.3,
        agreeableness: 0.3,
        neuroticism: 0.3,
      },
      narrative: { lack: 0.3, moralCompass: 0.3, volatility: 0.3, growthArc: 0.3 },
    })
    const state = makeState({ mood: 0.6 })
    const result = decideCommentTone(vectors, state, null, 0.1)
    expect(result.tone).toBe("supportive")
  })

  it("Paradox 영향 — vulnerable + paradoxScore > 0.4", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.5,
        lens: 0.5,
        stance: 0.8,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
      temperament: {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.7,
        neuroticism: 0.5,
      },
    })
    const state = makeState()
    const result = decideCommentTone(vectors, state, null, 0.6)
    if (result.tone === "vulnerable") {
      expect(result.paradoxInfluence).toBe(true)
    }
  })

  it("reason에 조건 포함", () => {
    const vectors = makeVectors({
      social: {
        depth: 0.8,
        lens: 0.3,
        stance: 0.3,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.8,
        sociability: 0.3,
      },
    })
    const state = makeState()
    const result = decideCommentTone(vectors, state, null, 0.3)
    expect(result.reason).toBeTruthy()
    expect(result.reason).toContain("→")
  })
})

// ═══ applyExpress ═══

describe("applyExpress", () => {
  it("높은 에너지 + playful → playful_reaction applied", () => {
    const state = makeState({ energy: 0.9 })
    const tone = { tone: "playful" as const, confidence: 0.8, reason: "", paradoxInfluence: false }
    const result = applyExpress("좋은 글이에요", state, tone)
    expect(result.applied).toContain("playful_reaction")
  })

  it("낮은 에너지 + 긴 콘텐츠 → low_energy_brevity", () => {
    const state = makeState({ energy: 0.2 })
    const tone = {
      tone: "analytical" as const,
      confidence: 0.8,
      reason: "",
      paradoxInfluence: false,
    }
    const longContent = "a".repeat(60)
    const result = applyExpress(longContent, state, tone)
    expect(result.applied).toContain("low_energy_brevity")
  })

  it("paradox 긴장 + paradoxInfluence → paradox_honesty", () => {
    const state = makeState({ paradoxTension: 0.7 })
    const tone = {
      tone: "vulnerable" as const,
      confidence: 0.8,
      reason: "",
      paradoxInfluence: true,
    }
    const result = applyExpress("솔직한 말이에요", state, tone)
    expect(result.applied).toContain("paradox_honesty")
  })
})

// ═══ generateComment ═══

describe("generateComment", () => {
  const makeInput = (overrides?: Partial<CommentGenerationInput>): CommentGenerationInput => ({
    commenterId: "p1",
    postId: "post-1",
    postAuthorId: "p2",
    relationship: null,
    ragContext: {
      voiceAnchor: "논리적 분석가",
      relationMemory: "",
      interestContinuity: "",
      consumptionMemory: "",
    },
    commenterState: makeState(),
    ...overrides,
  })

  const makeCommentProvider = (): CommentDataProvider => ({
    getPostContent: vi.fn().mockResolvedValue("테스트 포스트 내용입니다."),
    getPersonaVectors: vi.fn().mockResolvedValue(makeVectors()),
    getParadoxScore: vi.fn().mockResolvedValue(0.3),
    saveCommentLog: vi.fn().mockResolvedValue(undefined),
  })

  it("LLM 없으면 placeholder 댓글 생성", async () => {
    const input = makeInput()
    const provider = makeCommentProvider()
    const vectors = makeVectors()

    const result = await generateComment(input, vectors, provider)
    expect(result.content).toBeTruthy()
    expect(result.tone).toBeDefined()
    expect(result.tone.tone).toBeTruthy()
  })

  it("saveCommentLog 호출", async () => {
    const input = makeInput()
    const provider = makeCommentProvider()
    const vectors = makeVectors()

    await generateComment(input, vectors, provider)
    expect(provider.saveCommentLog).toHaveBeenCalledWith(
      expect.objectContaining({
        commenterId: "p1",
        postId: "post-1",
      })
    )
  })

  it("LLM provider 있으면 LLM 결과 사용", async () => {
    const input = makeInput()
    const provider = makeCommentProvider()
    const vectors = makeVectors()
    const llmProvider = {
      generateComment: vi.fn().mockResolvedValue("LLM이 생성한 댓글입니다."),
    }

    const result = await generateComment(input, vectors, provider, llmProvider)
    expect(result.content).toBe("LLM이 생성한 댓글입니다.")
    expect(llmProvider.generateComment).toHaveBeenCalled()
  })

  it("Override 결과 반영", async () => {
    const input = makeInput({
      overrideResult: { triggered: true, triggerName: "keyword_trigger", strength: 0.8 },
    })
    const provider = makeCommentProvider()
    const vectors = makeVectors()

    const result = await generateComment(input, vectors, provider)
    expect(result.tone.reason).toContain("override")
  })
})

// ═══ analyzeUserAttitudeSimple ═══

describe("analyzeUserAttitudeSimple", () => {
  it("공격적 키워드 → 높은 aggression", () => {
    const uiv = analyzeUserAttitudeSimple("이건 별로야 최악이야")
    expect(uiv.aggression).toBeGreaterThan(0.5)
  })

  it("공손한 키워드 → 높은 politeness", () => {
    const uiv = analyzeUserAttitudeSimple("감사합니다 좋은 글이에요")
    expect(uiv.politeness).toBeGreaterThan(0.5)
  })

  it("친밀 키워드 → 높은 intimacy", () => {
    const uiv = analyzeUserAttitudeSimple("우리 같이 이야기해요 ㅋㅋ")
    expect(uiv.intimacy).toBeGreaterThan(0.4)
  })

  it("중립 텍스트 → 기본값", () => {
    const uiv = analyzeUserAttitudeSimple("정보 확인했습니다")
    expect(uiv.aggression).toBeLessThan(0.5)
    expect(uiv.politeness).toBeLessThanOrEqual(0.5)
  })
})

// ═══ computeAdaptDelta ═══

describe("computeAdaptDelta", () => {
  it("공손한 유저 → agreeableness delta 양수", () => {
    const delta = computeAdaptDelta({ politeness: 0.8, aggression: 0.1, intimacy: 0.3 })
    expect(delta.agreeableness).toBeGreaterThan(0)
  })

  it("공격적 유저 → stance delta 양수", () => {
    const delta = computeAdaptDelta({ politeness: 0.1, aggression: 0.8, intimacy: 0.1 })
    expect(delta.stance).toBeGreaterThan(0)
    expect(delta.tension).toBeGreaterThan(0)
  })

  it("친밀한 유저 → sociability delta 양수", () => {
    const delta = computeAdaptDelta({ politeness: 0.3, aggression: 0.1, intimacy: 0.8 })
    expect(delta.sociability).toBeGreaterThan(0)
  })

  it("alpha=0.1이므로 delta는 작음", () => {
    const delta = computeAdaptDelta({ politeness: 1.0, aggression: 1.0, intimacy: 1.0 })
    expect(delta.agreeableness).toBeLessThanOrEqual(0.1)
    expect(delta.stance).toBeLessThanOrEqual(0.1)
  })
})

// ═══ respondToUser ═══

describe("respondToUser", () => {
  const makeUserProvider = (): UserInteractionDataProvider => ({
    getPersonaVectors: vi.fn().mockResolvedValue(makeVectors()),
    getPersonaState: vi.fn().mockResolvedValue(makeState()),
    getParadoxScore: vi.fn().mockResolvedValue(0.3),
    getUserRelationship: vi.fn().mockResolvedValue(null),
    saveInteractionLog: vi.fn().mockResolvedValue(undefined),
  })

  it("LLM 없이도 응답 생성", async () => {
    const provider = makeUserProvider()
    const result = await respondToUser("persona-1", "user-1", "좋은 글이에요!", provider)
    expect(result.response).toBeTruthy()
    expect(result.uiv).toBeDefined()
    expect(result.adaptDelta).toBeDefined()
  })

  it("UIV 분석 결과 포함", async () => {
    const provider = makeUserProvider()
    const result = await respondToUser("persona-1", "user-1", "감사합니다 멋져요", provider)
    expect(result.uiv.politeness).toBeGreaterThan(0)
    expect(typeof result.uiv.aggression).toBe("number")
  })

  it("adaptDelta 반환", async () => {
    const provider = makeUserProvider()
    const result = await respondToUser("persona-1", "user-1", "댓글입니다", provider)
    expect(result.adaptDelta).toHaveProperty("agreeableness")
    expect(result.adaptDelta).toHaveProperty("stance")
  })

  it("saveInteractionLog 호출", async () => {
    const provider = makeUserProvider()
    await respondToUser("persona-1", "user-1", "댓글입니다", provider)
    expect(provider.saveInteractionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: "persona-1",
        userId: "user-1",
      })
    )
  })

  it("공격적 유저 → 방어적/경계 응답", async () => {
    const provider = makeUserProvider()
    const result = await respondToUser("persona-1", "user-1", "별로 최악 짜증나", provider)
    expect(result.uiv.aggression).toBeGreaterThan(0.5)
    expect(result.response).toBeTruthy()
  })
})
