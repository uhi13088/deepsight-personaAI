import { describe, it, expect, vi, beforeEach } from "vitest"
import { executePostCreation, stripPhantomMentions } from "@/lib/persona-world/post-pipeline"
import type {
  PostPipelineDataProvider,
  PostCreationResult,
} from "@/lib/persona-world/post-pipeline"
import type { SchedulerPersona } from "@/lib/persona-world/scheduler"
import type {
  ActivityDecision,
  PersonaStateData,
  SchedulerContext,
} from "@/lib/persona-world/types"
import type { LLMProvider } from "@/lib/persona-world/content-generator"

// ── vi.mock ──────────────────────────────────────────────────

vi.mock("@/lib/persona-world/content-generator", () => ({
  generatePostContent: vi.fn().mockResolvedValue({
    content: "테스트 포스트 내용입니다.",
    metadata: { model: "mock" },
    tokensUsed: 100,
    voiceConsistencyScore: 0.85,
  }),
}))

vi.mock("@/lib/persona-world/quality-monitor", () => ({
  checkVoiceConsistency: vi.fn().mockResolvedValue({
    status: "ok",
    similarity: 0.9,
    currentFeatures: {},
    averageFeatures: {},
  }),
}))

vi.mock("@/lib/persona-world/state-manager", () => ({
  updatePersonaState: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/persona-world/voice-anchor", () => ({
  parseVoiceProfile: vi.fn((raw: unknown) => (raw ? { tone: "warm" } : null)),
  buildVoiceAnchorFromProfile: vi.fn(() => "[Voice Anchor from DB]"),
}))

vi.mock("@/lib/persona-world/poignancy", () => ({
  calculatePostPoignancy: vi.fn(() => 0.42),
}))

vi.mock("@/lib/security/data-provenance", () => ({
  determinePostSource: vi.fn(() => "SCHEDULED"),
}))

// ── 헬퍼 ────────────────────────────────────────────────────

const makePersona = (overrides?: Partial<SchedulerPersona>): SchedulerPersona => ({
  id: "p-1",
  name: "테스트봇",
  status: "ACTIVE",
  vectors: {
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
      openness: 0.6,
      conscientiousness: 0.5,
      extraversion: 0.7,
      agreeableness: 0.5,
      neuroticism: 0.4,
    },
    narrative: { lack: 0.3, moralCompass: 0.6, volatility: 0.4, growthArc: 0.5 },
  },
  paradoxScore: 0.2,
  region: "서울",
  role: "블로거",
  expertise: ["tech", "음악"],
  description: "테스트 페르소나",
  speechPatterns: ["~해요"],
  quirks: ["웃음"],
  knowledgeAreas: ["AI", "음악", "영화"],
  ...overrides,
})

const makeState = (overrides?: Partial<PersonaStateData>): PersonaStateData => ({
  mood: 0.5,
  energy: 0.8,
  socialBattery: 0.7,
  paradoxTension: 0.2,
  ...overrides,
})

const makeDecision = (overrides?: Partial<ActivityDecision>): ActivityDecision => ({
  shouldPost: true,
  shouldInteract: false,
  postType: "THOUGHT",
  ...overrides,
})

const makeContext = (overrides?: Partial<SchedulerContext>): SchedulerContext => ({
  trigger: "SCHEDULED",
  currentHour: 14,
  ...overrides,
})

const mockLLMProvider: LLMProvider = {
  generateText: vi.fn().mockResolvedValue({
    text: "LLM 생성 텍스트",
    tokensUsed: 100,
  }),
}

function createMockDataProvider(
  overrides?: Partial<PostPipelineDataProvider>
): PostPipelineDataProvider {
  return {
    savePost: vi.fn().mockResolvedValue({ id: "post-123" }),
    getRecentPostTexts: vi.fn().mockResolvedValue([]),
    getConsumptionContext: vi.fn().mockResolvedValue("최근 소비: 넷플릭스"),
    saveActivityLog: vi.fn().mockResolvedValue(undefined),
    selectTopic: vi.fn().mockResolvedValue(null),
    getVoiceProfile: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

// ── 테스트 ──────────────────────────────────────────────────

describe("executePostCreation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("기본 파이프라인: 포스트 생성 → 저장 → 상태 갱신 → 로그", async () => {
    const dp = createMockDataProvider()

    const result = await executePostCreation(
      makePersona(),
      makeDecision(),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    expect(result.postId).toBe("post-123")
    expect(result.postType).toBe("THOUGHT")
    expect(result.regenerated).toBe(false)
    expect(result.poignancyScore).toBe(0.42)
    expect(dp.savePost).toHaveBeenCalledOnce()
    expect(dp.saveActivityLog).toHaveBeenCalledOnce()

    // updatePersonaState 호출 확인
    const { updatePersonaState } = await import("@/lib/persona-world/state-manager")
    expect(updatePersonaState).toHaveBeenCalledWith(
      "p-1",
      expect.objectContaining({ type: "post_created" })
    )
  })

  it("postType null → THOUGHT 기본값 사용", async () => {
    const dp = createMockDataProvider()

    const result = await executePostCreation(
      makePersona(),
      makeDecision({ postType: undefined }),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    expect(result.postType).toBe("THOUGHT")
  })

  // ── 주제 선택 fallback ──

  it("provider 주제가 있으면 provider 주제 사용", async () => {
    const dp = createMockDataProvider({ selectTopic: vi.fn().mockResolvedValue("블록체인 트렌드") })

    await executePostCreation(
      makePersona(),
      makeDecision(),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    const { generatePostContent } = await import("@/lib/persona-world/content-generator")
    const callArg = vi.mocked(generatePostContent).mock.calls[0][0]
    expect(callArg.topic).toBe("블록체인 트렌드")
  })

  it("provider null → knowledgeAreas 랜덤 fallback", async () => {
    const dp = createMockDataProvider()

    await executePostCreation(
      makePersona({ knowledgeAreas: ["AI", "음악", "영화"] }),
      makeDecision(),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    const { generatePostContent } = await import("@/lib/persona-world/content-generator")
    const callArg = vi.mocked(generatePostContent).mock.calls[0][0]
    expect(["AI", "음악", "영화"]).toContain(callArg.topic)
  })

  it("provider null + knowledgeAreas 없으면 topic = undefined", async () => {
    const dp = createMockDataProvider()

    await executePostCreation(
      makePersona({ knowledgeAreas: [] }),
      makeDecision(),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    const { generatePostContent } = await import("@/lib/persona-world/content-generator")
    const callArg = vi.mocked(generatePostContent).mock.calls[0][0]
    expect(callArg.topic).toBeUndefined()
  })

  // ── Voice Anchor 3단계 fallback ──

  it("최근 글 존재 → 최근 글 기반 voiceAnchor", async () => {
    const dp = createMockDataProvider({
      getRecentPostTexts: vi.fn().mockResolvedValue(["글1", "글2"]),
    })

    await executePostCreation(
      makePersona(),
      makeDecision(),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    const { generatePostContent } = await import("@/lib/persona-world/content-generator")
    const callArg = vi.mocked(generatePostContent).mock.calls[0][0]
    expect(callArg.ragContext.voiceAnchor).toContain("최근 글 스타일")
    expect(callArg.ragContext.voiceAnchor).toContain("글1")
  })

  it("최근 글 없고 DB voiceProfile 존재 → DB fallback", async () => {
    const dp = createMockDataProvider({
      getRecentPostTexts: vi.fn().mockResolvedValue([]),
      getVoiceProfile: vi.fn().mockResolvedValue({ tone: "warm", style: "casual" }),
    })

    await executePostCreation(
      makePersona(),
      makeDecision(),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    const { generatePostContent } = await import("@/lib/persona-world/content-generator")
    const callArg = vi.mocked(generatePostContent).mock.calls[0][0]
    expect(callArg.ragContext.voiceAnchor).toBe("[Voice Anchor from DB]")
  })

  it("최근 글 없고 voiceProfile null → 빈 voiceAnchor", async () => {
    const dp = createMockDataProvider({
      getRecentPostTexts: vi.fn().mockResolvedValue([]),
      getVoiceProfile: vi.fn().mockResolvedValue(null),
    })

    await executePostCreation(
      makePersona(),
      makeDecision(),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    const { generatePostContent } = await import("@/lib/persona-world/content-generator")
    const callArg = vi.mocked(generatePostContent).mock.calls[0][0]
    expect(callArg.ragContext.voiceAnchor).toBe("")
  })

  // ── Voice 일관성 체크 + 재생성 ──

  it("recentTexts >= 3 → voice 일관성 체크 실행", async () => {
    const dp = createMockDataProvider({
      getRecentPostTexts: vi.fn().mockResolvedValue(["a", "b", "c"]),
    })

    const result = await executePostCreation(
      makePersona(),
      makeDecision(),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    expect(result.voiceCheck).not.toBeNull()
    expect(result.voiceCheck!.status).toBe("ok")
    expect(result.regenerated).toBe(false)
  })

  it("recentTexts < 3 → voice 체크 생략 (null)", async () => {
    const dp = createMockDataProvider({
      getRecentPostTexts: vi.fn().mockResolvedValue(["a", "b"]),
    })

    const result = await executePostCreation(
      makePersona(),
      makeDecision(),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    expect(result.voiceCheck).toBeNull()
    expect(result.regenerated).toBe(false)
  })

  it("voice critical → 재생성 1회 (regenerated = true)", async () => {
    const { checkVoiceConsistency } = await import("@/lib/persona-world/quality-monitor")
    vi.mocked(checkVoiceConsistency)
      .mockResolvedValueOnce({
        status: "critical",
        similarity: 0.2,
        currentFeatures: {} as never,
        averageFeatures: {} as never,
      })
      .mockResolvedValueOnce({
        status: "ok",
        similarity: 0.85,
        currentFeatures: {} as never,
        averageFeatures: {} as never,
      })

    const dp = createMockDataProvider({
      getRecentPostTexts: vi.fn().mockResolvedValue(["a", "b", "c", "d"]),
    })

    const result = await executePostCreation(
      makePersona(),
      makeDecision(),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    expect(result.regenerated).toBe(true)
    expect(result.voiceCheck!.status).toBe("ok")

    // generatePostContent 2회 호출 확인 (원본 + 재생성)
    const { generatePostContent } = await import("@/lib/persona-world/content-generator")
    expect(generatePostContent).toHaveBeenCalledTimes(2)

    // 재생성 시 강화된 voiceAnchor 확인
    const secondCallInput = vi.mocked(generatePostContent).mock.calls[1][0]
    expect(secondCallInput.ragContext.voiceAnchor).toContain(
      "중요: 아래 글 스타일을 반드시 유지하세요"
    )
  })

  // ── emotionalState 설명 ──

  it("높은 mood + 높은 energy → 기분/에너지 반영", async () => {
    const dp = createMockDataProvider()

    await executePostCreation(
      makePersona(),
      makeDecision(),
      makeContext(),
      makeState({ mood: 0.9, energy: 0.9, paradoxTension: 0.8 }),
      mockLLMProvider,
      dp
    )

    const { generatePostContent } = await import("@/lib/persona-world/content-generator")
    const callArg = vi.mocked(generatePostContent).mock.calls[0][0]
    expect(callArg.ragContext.emotionalState).toContain("기분이 좋은 상태")
    expect(callArg.ragContext.emotionalState).toContain("에너지가 충만")
    expect(callArg.ragContext.emotionalState).toContain("내면 갈등이 높은 상태")
  })

  it("낮은 mood + 낮은 energy → 부정적 상태 반영", async () => {
    const dp = createMockDataProvider()

    await executePostCreation(
      makePersona(),
      makeDecision(),
      makeContext(),
      makeState({ mood: 0.1, energy: 0.1 }),
      mockLLMProvider,
      dp
    )

    const { generatePostContent } = await import("@/lib/persona-world/content-generator")
    const callArg = vi.mocked(generatePostContent).mock.calls[0][0]
    expect(callArg.ragContext.emotionalState).toContain("기분이 좋지 않은 상태")
    expect(callArg.ragContext.emotionalState).toContain("피곤한 상태")
  })

  // ── 메타데이터 & Post Source ──

  it("SCHEDULED trigger → postSource 반영", async () => {
    const dp = createMockDataProvider()

    await executePostCreation(
      makePersona(),
      makeDecision(),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    const { determinePostSource } = await import("@/lib/security/data-provenance")
    expect(determinePostSource).toHaveBeenCalledWith(
      expect.objectContaining({ isScheduled: true, isArenaTest: false })
    )
  })

  it("savePost에 poignancyScore + locationTag 전달", async () => {
    const dp = createMockDataProvider()

    await executePostCreation(
      makePersona({ region: "부산" }),
      makeDecision(),
      makeContext(),
      makeState(),
      mockLLMProvider,
      dp
    )

    expect(dp.savePost).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: "p-1",
        poignancyScore: 0.42,
        locationTag: "부산",
      })
    )
  })
})

// ═══ stripPhantomMentions ═══

describe("stripPhantomMentions", () => {
  const validHandles = [{ handle: "민수" }, { handle: "테크_리뷰어" }]

  it("유효한 멘션은 유지", () => {
    const content = "안녕 @민수 같이 작업할래?"
    expect(stripPhantomMentions(content, validHandles)).toBe(content)
  })

  it("팬텀 멘션은 @를 제거", () => {
    const content = "안녕 @시네마틱_레이어 같이 작업할래?"
    const result = stripPhantomMentions(content, validHandles)
    expect(result).toBe("안녕 시네마틱_레이어 같이 작업할래?")
    expect(result).not.toContain("@시네마틱_레이어")
  })

  it("혼합 (유효 + 팬텀) → 유효만 유지", () => {
    const content = "@민수 @시네마틱_레이어 @테크_리뷰어 함께 해요"
    const result = stripPhantomMentions(content, validHandles)
    expect(result).toContain("@민수")
    expect(result).toContain("@테크_리뷰어")
    expect(result).not.toContain("@시네마틱_레이어")
    expect(result).toContain("시네마틱_레이어") // 이름 자체는 유지
  })

  it("멘션 없는 텍스트 → 그대로 반환", () => {
    const content = "멘션 없는 일반 텍스트"
    expect(stripPhantomMentions(content, validHandles)).toBe(content)
  })

  it("빈 validHandles → 모든 멘션 제거", () => {
    const content = "@민수 안녕"
    const result = stripPhantomMentions(content, [])
    expect(result).not.toContain("@민수")
    expect(result).toContain("민수")
  })
})
