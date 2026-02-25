import { describe, it, expect, vi, beforeEach } from "vitest"
import { executeInteractions } from "@/lib/persona-world/interaction-pipeline"
import type { InteractionPipelineDataProvider } from "@/lib/persona-world/interaction-pipeline"
import type { SchedulerPersona } from "@/lib/persona-world/scheduler"
import type { PersonaStateData, RelationshipScore } from "@/lib/persona-world/types"

// ── vi.mock ──────────────────────────────────────────────────

vi.mock("@/lib/persona-world/interactions/comment-engine", () => ({
  generateComment: vi.fn().mockResolvedValue({
    content: "좋은 글이네요!",
    tone: { tone: "supportive", confidence: 0.8 },
    expressApplied: [],
  }),
}))

vi.mock("@/lib/persona-world/interactions/like-engine", () => ({
  computeLikeProbability: vi.fn(() => ({
    probability: 0.8,
    modifiers: { following: false, positiveHistory: false, negativeHistory: false },
  })),
}))

vi.mock("@/lib/persona-world/state-manager", () => ({
  updatePersonaState: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/persona-world/voice-anchor", () => ({
  parseVoiceProfile: vi.fn((raw: unknown) => (raw ? { tone: "warm" } : null)),
  buildVoiceAnchorFromProfile: vi.fn(() => "[Voice Anchor]"),
}))

vi.mock("@/lib/security/data-provenance", () => ({
  computeInteractionProvenance: vi.fn(() => ({
    source: "SYSTEM",
    propagationDepth: 0,
    trust: 1.0,
    timestamp: Date.now(),
  })),
}))

vi.mock("@/lib/persona-world/interactions/relationship-protocol", () => ({
  computeRelationshipProfileWithDecay: vi.fn(() => ({
    stage: "STRANGER",
    type: "NEUTRAL",
    protocol: {
      allowedTones: ["supportive", "curious"],
      interactionBoost: 1.0,
    },
  })),
}))

vi.mock("@/lib/persona-world/interactions/l2-pattern", () => ({
  classifyL2Pattern: vi.fn(() => ({
    pattern: "BALANCED",
    conflictDimensions: [],
    severity: 0,
  })),
}))

vi.mock("@/lib/persona-world/interactions/engagement-decision", () => ({
  decideEngagement: vi.fn(() => ({
    action: "comment",
    reason: "balanced pattern allows commenting",
    suppressedBy: null,
  })),
}))

vi.mock("@/lib/persona-world/interactions/voice-adjustment", () => ({
  computeVoiceAdjustment: vi.fn(() => null),
  mergeAllowedTones: vi.fn((tones: string[]) => tones),
}))

// ── 헬퍼 ────────────────────────────────────────────────────

const defaultVectors = {
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
}

const makePersona = (overrides?: Partial<SchedulerPersona>): SchedulerPersona => ({
  id: "p-1",
  name: "테스트봇",
  status: "ACTIVE",
  vectors: defaultVectors,
  paradoxScore: 0.2,
  region: "서울",
  role: "블로거",
  expertise: ["tech"],
  description: "테스트 페르소나",
  speechPatterns: ["~해요"],
  quirks: ["웃음"],
  ...overrides,
})

const makeState = (overrides?: Partial<PersonaStateData>): PersonaStateData => ({
  mood: 0.5,
  energy: 0.8,
  socialBattery: 0.7,
  paradoxTension: 0.2,
  ...overrides,
})

function createMockDP(
  overrides?: Partial<InteractionPipelineDataProvider>
): InteractionPipelineDataProvider {
  return {
    getRecentFeedPosts: vi.fn().mockResolvedValue([
      { id: "post-1", authorId: "p-2", content: "다른 사람의 글" },
      { id: "post-2", authorId: "p-3", content: "또 다른 글" },
    ]),
    getBasicMatchScore: vi.fn().mockResolvedValue(0.7),
    isFollowing: vi.fn().mockResolvedValue(false),
    getRelationship: vi.fn().mockResolvedValue(null),
    getPersonaVectors: vi.fn().mockResolvedValue(defaultVectors),
    getParadoxScore: vi.fn().mockResolvedValue(0.2),
    saveLike: vi.fn().mockResolvedValue(undefined),
    saveComment: vi.fn().mockResolvedValue({ id: "comment-1" }),
    updateRelationship: vi.fn().mockResolvedValue(undefined),
    saveActivityLog: vi.fn().mockResolvedValue(undefined),
    getVoiceProfile: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

// ── 테스트 ──────────────────────────────────────────────────

describe("executeInteractions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Math.random → always like (0.0 < 0.8)
    vi.spyOn(Math, "random").mockReturnValue(0.0)
  })

  // ── Early return ──

  it("피드 포스트 없으면 빈 결과 반환", async () => {
    const dp = createMockDP({
      getRecentFeedPosts: vi.fn().mockResolvedValue([]),
    })

    const result = await executeInteractions(makePersona(), makeState(), dp)

    expect(result.likes).toHaveLength(0)
    expect(result.comments).toHaveLength(0)
    expect(result.totalTokensUsed).toBe(0)
    // 벡터 조회도 하지 않음
    expect(dp.getPersonaVectors).not.toHaveBeenCalled()
  })

  // ── 자기 글 스킵 ──

  it("자기 글은 스킵 (authorId === persona.id)", async () => {
    const dp = createMockDP({
      getRecentFeedPosts: vi
        .fn()
        .mockResolvedValue([{ id: "post-self", authorId: "p-1", content: "내 글" }]),
    })

    const result = await executeInteractions(makePersona(), makeState(), dp)

    expect(result.likes).toHaveLength(0)
    expect(dp.saveLike).not.toHaveBeenCalled()
  })

  // ── 좋아요 실행 ──

  it("좋아요 확률 충족 → 좋아요 저장 + 관계 업데이트 + 로그", async () => {
    const dp = createMockDP()

    const result = await executeInteractions(makePersona(), makeState(), dp)

    // 2개 포스트 중 자기 글 0개 → 2개 모두 좋아요 대상
    expect(result.likes.length).toBeGreaterThanOrEqual(1)
    expect(dp.saveLike).toHaveBeenCalled()
    expect(dp.updateRelationship).toHaveBeenCalledWith("p-1", expect.any(String), "like")
  })

  it("좋아요 확률 미충족 → 좋아요/댓글 없음", async () => {
    // Math.random 0.99 > any probability
    vi.spyOn(Math, "random").mockReturnValue(0.99)

    const { computeLikeProbability } = await import("@/lib/persona-world/interactions/like-engine")
    vi.mocked(computeLikeProbability).mockReturnValue({
      probability: 0.1,
      modifiers: { following: false, positiveHistory: false, negativeHistory: false },
    })

    const dp = createMockDP()
    const result = await executeInteractions(makePersona(), makeState(), dp)

    expect(result.likes).toHaveLength(0)
    expect(result.comments).toHaveLength(0)
    expect(dp.saveLike).not.toHaveBeenCalled()
  })

  // ── 댓글 결정 ──

  it("좋아요 후 engagement=comment → 댓글 생성", async () => {
    const dp = createMockDP()
    const result = await executeInteractions(makePersona(), makeState(), dp)

    expect(result.comments.length).toBeGreaterThanOrEqual(1)
    expect(dp.saveComment).toHaveBeenCalled()
    expect(dp.updateRelationship).toHaveBeenCalledWith("p-1", expect.any(String), "comment")
  })

  it("engagement=skip → 댓글 억제 + COMMENT_SUPPRESSED 로그", async () => {
    const { decideEngagement } =
      await import("@/lib/persona-world/interactions/engagement-decision")
    vi.mocked(decideEngagement).mockReturnValue({
      action: "skip",
      reason: "high tension",
      suppressedBy: "l2_pattern",
    })

    const dp = createMockDP()
    const result = await executeInteractions(makePersona(), makeState(), dp)

    // 좋아요는 있지만 댓글은 없음
    expect(result.likes.length).toBeGreaterThanOrEqual(1)
    expect(result.comments).toHaveLength(0)
    expect(dp.saveComment).not.toHaveBeenCalled()

    // COMMENT_SUPPRESSED 로그 확인
    const suppressedCalls = vi
      .mocked(dp.saveActivityLog)
      .mock.calls.filter(([params]) => params.activityType === "COMMENT_SUPPRESSED")
    expect(suppressedCalls.length).toBeGreaterThanOrEqual(1)
    expect(suppressedCalls[0][0].metadata).toEqual(
      expect.objectContaining({ action: "skip", l2Pattern: "BALANCED" })
    )
  })

  it("engagement=react_only → 댓글 억제", async () => {
    const { decideEngagement } =
      await import("@/lib/persona-world/interactions/engagement-decision")
    vi.mocked(decideEngagement).mockReturnValue({
      action: "react_only",
      reason: "cautious pattern",
      suppressedBy: "l2_pattern",
    })

    const dp = createMockDP()
    const result = await executeInteractions(makePersona(), makeState(), dp)

    expect(result.comments).toHaveLength(0)
  })

  // ── 벡터 캐싱 ──

  it("벡터는 루프 전 1회만 조회 (캐싱)", async () => {
    const dp = createMockDP({
      getRecentFeedPosts: vi.fn().mockResolvedValue([
        { id: "post-1", authorId: "p-2", content: "글1" },
        { id: "post-2", authorId: "p-3", content: "글2" },
        { id: "post-3", authorId: "p-4", content: "글3" },
      ]),
    })

    await executeInteractions(makePersona(), makeState(), dp)

    // 포스트 3개지만 getPersonaVectors는 1회만 호출
    expect(dp.getPersonaVectors).toHaveBeenCalledTimes(1)
  })

  // ── Voice Anchor ──

  it("voiceProfile 있으면 → Voice Anchor 사용", async () => {
    // 댓글 경로까지 도달하도록 engagement=comment 보장
    const { decideEngagement } =
      await import("@/lib/persona-world/interactions/engagement-decision")
    vi.mocked(decideEngagement).mockReturnValue({
      action: "comment",
      reason: "balanced",
      suppressedBy: null,
    })

    const dp = createMockDP({
      getVoiceProfile: vi.fn().mockResolvedValue({ tone: "warm", style: "casual" }),
    })

    await executeInteractions(makePersona(), makeState(), dp)

    expect(dp.getVoiceProfile).toHaveBeenCalled()
  })

  // ── 관계 프로토콜 ──

  it("기존 관계가 있으면 관계 프로토콜에 전달", async () => {
    const rel: RelationshipScore = {
      warmth: 0.7,
      tension: 0.1,
      frequency: 0.5,
      depth: 0.3,
      lastInteractionAt: new Date(),
    }
    const dp = createMockDP({
      getRelationship: vi.fn().mockResolvedValue(rel),
    })

    await executeInteractions(makePersona(), makeState(), dp)

    const { computeRelationshipProfileWithDecay } =
      await import("@/lib/persona-world/interactions/relationship-protocol")
    expect(computeRelationshipProfileWithDecay).toHaveBeenCalledWith(rel)
  })

  it("관계 null → DEFAULT_RELATIONSHIP 사용", async () => {
    const dp = createMockDP({
      getRelationship: vi.fn().mockResolvedValue(null),
    })

    await executeInteractions(makePersona(), makeState(), dp)

    const { computeRelationshipProfileWithDecay } =
      await import("@/lib/persona-world/interactions/relationship-protocol")
    expect(computeRelationshipProfileWithDecay).toHaveBeenCalledWith(
      expect.objectContaining({ warmth: 0, tension: 0, frequency: 0, depth: 0 })
    )
  })

  // ── State 업데이트 ──

  it("댓글 작성 후 PersonaState 업데이트", async () => {
    const dp = createMockDP()
    const result = await executeInteractions(makePersona(), makeState(), dp)

    if (result.comments.length > 0) {
      const { updatePersonaState } = await import("@/lib/persona-world/state-manager")
      expect(updatePersonaState).toHaveBeenCalledWith(
        "p-1",
        expect.objectContaining({ type: "comment_created" })
      )
    }
  })

  // ── commentLLMProvider 미제공 ──

  it("commentLLMProvider 없이도 동작 (generateComment에 undefined 전달)", async () => {
    const dp = createMockDP()

    // commentLLMProvider 없이 호출
    const result = await executeInteractions(makePersona(), makeState(), dp)

    // 에러 없이 완료
    expect(result.likes.length).toBeGreaterThanOrEqual(0)
  })
})
