import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Prisma mock ──────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSafetyConfig: { findUnique: vi.fn().mockResolvedValue(null) },
    systemConfig: { findUnique: vi.fn().mockResolvedValue({ value: true }) },
    personaState: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
    },
    personaLayerVector: { findMany: vi.fn().mockResolvedValue([]) },
    persona: { findMany: vi.fn().mockResolvedValue([]) },
    personaActivityLog: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
    },
    personaPost: {
      create: vi.fn().mockResolvedValue({ id: "post-1" }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    personaPostLike: { create: vi.fn().mockResolvedValue({ id: "like-1" }) },
    personaComment: {
      create: vi.fn().mockResolvedValue({ id: "comment-1" }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    personaFollow: { findUnique: vi.fn().mockResolvedValue(null) },
    personaRelationship: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
    newsSource: {
      count: vi.fn().mockResolvedValue(0),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn().mockImplementation((fns: unknown[]) => Promise.all(fns)),
  },
}))

// ── 핵심 의존성 mock ─────────────────────────────────────────

const defaultPostResult = {
  postId: "post-1",
  content: "테스트 글",
  postType: "THOUGHT",
  tokensUsed: 50,
  voiceCheck: null,
  regenerated: false,
  poignancyScore: 0.3,
}

const defaultInteractionResult = {
  likes: [{ postId: "p-1", authorId: "p-2" }],
  comments: [{ postId: "p-1", authorId: "p-2", commentId: "c-1" }],
  totalTokensUsed: 30,
}

const defaultSchedulerResult = {
  decisions: [
    { personaId: "persona-a", shouldPost: true, shouldInteract: true, postType: "THOUGHT" },
  ],
}

const defaultContagionResult = {
  log: {
    personaCount: 5,
    affectedCount: 3,
    averageMoodBefore: 0.5,
    averageMoodAfter: 0.52,
    safetyStatus: "ok",
  },
  requiresKillSwitch: false,
}

vi.mock("@/lib/persona-world/scheduler", () => ({
  runScheduler: vi.fn(),
}))

vi.mock("@/lib/persona-world/post-pipeline", () => ({
  executePostCreation: vi.fn(),
}))

vi.mock("@/lib/persona-world/interaction-pipeline", () => ({
  executeInteractions: vi.fn(),
}))

vi.mock("@/lib/persona-world/llm-adapter", () => ({
  isLLMConfigured: vi.fn(),
  createPostLLMProvider: vi.fn(() => ({ generateText: vi.fn() })),
  createCommentLLMProvider: vi.fn(() => ({ generateComment: vi.fn() })),
  createNewsLLMProvider: vi.fn(() => null),
}))

vi.mock("@/lib/persona-world/state-manager", () => ({
  getPersonaState: vi.fn().mockResolvedValue({
    mood: 0.5,
    energy: 0.8,
    socialBattery: 0.7,
    paradoxTension: 0.2,
  }),
}))

vi.mock("@/lib/persona-world/consumption-manager", () => ({
  getConsumptionContext: vi.fn().mockResolvedValue(""),
}))

vi.mock("@/lib/persona-world/mention-service", () => ({
  resolveMentions: vi.fn(),
  notifyMentions: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/vector/dim-maps", () => ({
  layerVectorsToMap: vi.fn(() => {
    const map = new Map()
    const d = { dim1: 0.5, dim2: 0.5, dim3: 0.5, dim4: 0.5, dim5: 0.5, dim6: 0.5, dim7: 0.5 }
    map.set("SOCIAL", d)
    map.set("TEMPERAMENT", d)
    map.set("NARRATIVE", d)
    return map
  }),
}))

vi.mock("@/lib/security/kill-switch", () => ({
  isFeatureEnabled: vi.fn(),
  createDefaultConfig: vi.fn(() => ({
    emergencyFreeze: false,
    featureToggles: { emotionalContagion: false },
    autoTriggers: [],
    updatedAt: Date.now(),
    updatedBy: "system",
  })),
}))

vi.mock("@/lib/persona-world/contagion-integration", () => ({
  executeContagionRound: vi.fn(),
}))

vi.mock("@/lib/persona-world/voice-anchor", () => ({
  parseVoiceProfile: vi.fn(() => null),
  buildVoiceAnchorFromProfile: vi.fn(() => ""),
}))

vi.mock("@/lib/persona-world/news", () => ({
  executeNewsAutoFetch: vi.fn().mockResolvedValue({ skipped: true, reason: "test" }),
}))

vi.mock("@/lib/persona-world/admin/scheduler-service", () => ({
  isSchedulerEnabled: vi.fn().mockResolvedValue(true),
  runDailyNewsReactionPipeline: vi.fn().mockResolvedValue(undefined),
}))

// ── mock persona ──────────────────────────────────────────────

const mockPersona = {
  id: "persona-a",
  name: "테스트봇",
  status: "ACTIVE",
  paradoxScore: 0.1,
  region: "서울",
  role: "블로거",
  expertise: ["tech"],
  description: "테스트",
  speechPatterns: [],
  quirks: [],
  knowledgeAreas: [],
  layerVectors: [],
  posts: [], // 다양성 쿨다운용 최근 포스트 타입
  postFrequency: null,
  activeHours: null,
  peakHours: null,
  triggerMap: null,
  voiceSpec: null,
  factbook: null,
  postPrompt: null,
  commentPrompt: null,
  voiceProfile: null,
}

// ── 테스트 ──────────────────────────────────────────────────

describe("executeCronScheduler", () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // 매 테스트마다 기본 mock 구현 재설정 (clearAllMocks는 호출만 지움)
    const { prisma } = await import("@/lib/prisma")
    vi.mocked(prisma.persona.findMany).mockResolvedValue([mockPersona as never])

    const { runScheduler } = await import("@/lib/persona-world/scheduler")
    vi.mocked(runScheduler).mockResolvedValue(defaultSchedulerResult as never)

    const { executePostCreation } = await import("@/lib/persona-world/post-pipeline")
    vi.mocked(executePostCreation).mockResolvedValue(defaultPostResult as never)

    const { executeInteractions } = await import("@/lib/persona-world/interaction-pipeline")
    vi.mocked(executeInteractions).mockResolvedValue(defaultInteractionResult as never)

    const { isLLMConfigured } = await import("@/lib/persona-world/llm-adapter")
    vi.mocked(isLLMConfigured).mockReturnValue(true)

    const { isFeatureEnabled } = await import("@/lib/security/kill-switch")
    vi.mocked(isFeatureEnabled).mockReturnValue(false) // 기본 OFF

    const { executeContagionRound } = await import("@/lib/persona-world/contagion-integration")
    vi.mocked(executeContagionRound).mockResolvedValue(defaultContagionResult as never)

    const { resolveMentions } = await import("@/lib/persona-world/mention-service")
    vi.mocked(resolveMentions).mockResolvedValue([])
  })

  it("기본 실행: 포스트 + 인터랙션 + 감정전염(OFF) 결과 반환", async () => {
    const { executeCronScheduler } = await import("@/lib/persona-world/cron-scheduler-service")
    const result = await executeCronScheduler()

    expect(result.executedAt).toBeDefined()
    expect(result.decisions).toBe(1)
    expect(result.postsCreated).toBe(1)
    expect(result.interactions).toBe(1)
    expect(result.llmAvailable).toBe(true)
    expect(result.contagion).toEqual(
      expect.objectContaining({ skipped: true, reason: expect.stringContaining("Kill Switch OFF") })
    )
  })

  it("LLM 미설정 → 포스트 생성 스킵", async () => {
    const { isLLMConfigured } = await import("@/lib/persona-world/llm-adapter")
    vi.mocked(isLLMConfigured).mockReturnValue(false)

    const { executeCronScheduler } = await import("@/lib/persona-world/cron-scheduler-service")
    const result = await executeCronScheduler()

    expect(result.llmAvailable).toBe(false)
    expect(result.postsCreated).toBe(0)

    const { executePostCreation } = await import("@/lib/persona-world/post-pipeline")
    expect(executePostCreation).not.toHaveBeenCalled()
  })

  it("감정 전염 Kill Switch ON → 전염 라운드 실행", async () => {
    const { isFeatureEnabled } = await import("@/lib/security/kill-switch")
    vi.mocked(isFeatureEnabled).mockReturnValue(true)

    const { executeCronScheduler } = await import("@/lib/persona-world/cron-scheduler-service")
    const result = await executeCronScheduler()

    const { executeContagionRound } = await import("@/lib/persona-world/contagion-integration")
    expect(executeContagionRound).toHaveBeenCalledOnce()
    expect(result.contagion).toEqual(
      expect.objectContaining({ personaCount: 5, safetyStatus: "ok" })
    )
  })

  it("감정 전염 Kill Switch OFF → skipped", async () => {
    const { executeCronScheduler } = await import("@/lib/persona-world/cron-scheduler-service")
    const result = await executeCronScheduler()

    const { executeContagionRound } = await import("@/lib/persona-world/contagion-integration")
    expect(executeContagionRound).not.toHaveBeenCalled()
    expect(result.contagion).toEqual(expect.objectContaining({ skipped: true }))
  })

  it("감정 전염에서 requiresKillSwitch=true → 경고 로그", async () => {
    const { isFeatureEnabled } = await import("@/lib/security/kill-switch")
    vi.mocked(isFeatureEnabled).mockReturnValue(true)

    const { executeContagionRound } = await import("@/lib/persona-world/contagion-integration")
    vi.mocked(executeContagionRound).mockResolvedValueOnce({
      log: {
        personaCount: 5,
        affectedCount: 4,
        averageMoodBefore: 0.5,
        averageMoodAfter: 0.15,
        safetyStatus: "critical",
        safetyReason: "평균 mood 위험 수준",
      },
      requiresKillSwitch: true,
    } as never)

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const { executeCronScheduler } = await import("@/lib/persona-world/cron-scheduler-service")
    const result = await executeCronScheduler()

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("CRITICAL"))
    expect(result.contagion).toEqual(expect.objectContaining({ safetyStatus: "critical" }))

    warnSpy.mockRestore()
  })

  it("감정 전염 에러 → skipped (graceful degradation)", async () => {
    const { isFeatureEnabled } = await import("@/lib/security/kill-switch")
    vi.mocked(isFeatureEnabled).mockReturnValue(true)

    const { executeContagionRound } = await import("@/lib/persona-world/contagion-integration")
    vi.mocked(executeContagionRound).mockRejectedValueOnce(new Error("DB connection failed"))

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { executeCronScheduler } = await import("@/lib/persona-world/cron-scheduler-service")
    const result = await executeCronScheduler()

    expect(result.contagion).toEqual(
      expect.objectContaining({
        skipped: true,
        reason: expect.stringContaining("DB connection failed"),
      })
    )

    errSpy.mockRestore()
  })

  it("포스트 생성 에러 → 해당 건만 스킵, 인터랙션은 계속", async () => {
    const { executePostCreation } = await import("@/lib/persona-world/post-pipeline")
    vi.mocked(executePostCreation).mockRejectedValueOnce(new Error("LLM timeout"))

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { executeCronScheduler } = await import("@/lib/persona-world/cron-scheduler-service")
    const result = await executeCronScheduler()

    expect(result.postsCreated).toBe(0)
    expect(result.interactions).toBe(1)
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("Post creation failed"),
      expect.any(Error)
    )

    errSpy.mockRestore()
  })

  it("인터랙션 에러 → 해당 건만 스킵, 포스트는 성공", async () => {
    const { executeInteractions } = await import("@/lib/persona-world/interaction-pipeline")
    vi.mocked(executeInteractions).mockRejectedValueOnce(new Error("Interaction error"))

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const { executeCronScheduler } = await import("@/lib/persona-world/cron-scheduler-service")
    const result = await executeCronScheduler()

    expect(result.postsCreated).toBe(1)
    expect(result.interactions).toBe(0)
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("Interaction failed"),
      expect.any(Error)
    )

    errSpy.mockRestore()
  })

  it("멘션이 있으면 notifyMentions 호출", async () => {
    const { resolveMentions, notifyMentions } = await import("@/lib/persona-world/mention-service")
    vi.mocked(resolveMentions).mockResolvedValue([{ handle: "@friend", personaId: "p-2" }] as never)

    const { executeCronScheduler } = await import("@/lib/persona-world/cron-scheduler-service")
    await executeCronScheduler()

    // fire-and-forget promise 대기
    await new Promise((r) => setTimeout(r, 50))

    expect(resolveMentions).toHaveBeenCalledWith("테스트 글")
    expect(notifyMentions).toHaveBeenCalledWith(
      expect.objectContaining({ postId: "post-1", mentionerName: "테스트봇" })
    )
  })

  it("shouldPost=false → 포스트 생성 스킵", async () => {
    const { runScheduler } = await import("@/lib/persona-world/scheduler")
    vi.mocked(runScheduler).mockResolvedValueOnce({
      decisions: [{ personaId: "persona-a", shouldPost: false, shouldInteract: true }],
    } as never)

    const { executeCronScheduler } = await import("@/lib/persona-world/cron-scheduler-service")
    const result = await executeCronScheduler()

    expect(result.postsCreated).toBe(0)
    expect(result.interactions).toBe(1)
  })

  it("shouldInteract=false → 인터랙션 스킵", async () => {
    const { runScheduler } = await import("@/lib/persona-world/scheduler")
    vi.mocked(runScheduler).mockResolvedValueOnce({
      decisions: [
        { personaId: "persona-a", shouldPost: true, shouldInteract: false, postType: "THOUGHT" },
      ],
    } as never)

    const { executeCronScheduler } = await import("@/lib/persona-world/cron-scheduler-service")
    const result = await executeCronScheduler()

    expect(result.postsCreated).toBe(1)
    expect(result.interactions).toBe(0)
  })

  it("다수 페르소나 → 두 번째부터 랜덤 딜레이 적용", async () => {
    vi.useFakeTimers()

    const { prisma } = await import("@/lib/prisma")
    const mockPersonaB = { ...mockPersona, id: "persona-b", name: "테스트봇B" }
    vi.mocked(prisma.persona.findMany).mockResolvedValue([
      mockPersona as never,
      mockPersonaB as never,
    ])

    const { runScheduler } = await import("@/lib/persona-world/scheduler")
    vi.mocked(runScheduler).mockResolvedValueOnce({
      decisions: [
        { personaId: "persona-a", shouldPost: false, shouldInteract: true },
        { personaId: "persona-b", shouldPost: false, shouldInteract: true },
      ],
    } as never)

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    const { executeCronScheduler } = await import("@/lib/persona-world/cron-scheduler-service")
    const promise = executeCronScheduler()

    // fake timer를 진행시켜서 딜레이 해소
    await vi.runAllTimersAsync()
    const result = await promise

    // 두 번째 페르소나에 딜레이 로그가 찍혔는지 확인
    const delayLogs = logSpy.mock.calls.filter(
      (args) => typeof args[0] === "string" && args[0].includes("delay")
    )
    expect(delayLogs.length).toBe(1) // persona-b만 딜레이
    expect(delayLogs[0][0]).toContain("persona-b")

    expect(result.interactions).toBe(2)

    logSpy.mockRestore()
    vi.useRealTimers()
  })
})
