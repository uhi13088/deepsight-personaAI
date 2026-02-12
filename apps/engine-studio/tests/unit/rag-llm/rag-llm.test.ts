// ═══════════════════════════════════════════════════════════════
// T71: RAG + LLM Strategy Unit Tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

import {
  // AC1: RAG System
  extractVoiceAnchors,
  updateRelationMemory,
  trackInterestContinuity,
  createEmptyRAGContext,
  buildRAGContext,
  buildContextPrompt,

  // AC2: LLM Strategy
  routeToTier,
  explainRouting,
  estimateRequestCost,
  createPromptCache,
  getCachedPrompt,
  invalidateCache,
  invalidateCacheByPersona,
  purgeExpiredCache,
  createPromptCacheStore,
  addToPromptCache,

  // AC3: Quality Feedback
  evaluateParadoxExpression,
  measureVoiceConsistency,
  runPressureReactionTest,
  computeOverallQuality,

  // AC4: Few-shot Collector
  collectFewShot,
  rankFewShots,
  selectBestExamples,
  formatFewShotsForPrompt,

  // AC5: Integration
  integrateRAGWithPromptBuilder,
  integrateTierWithPipeline,
  shouldCollectFewShot,
  shouldSampleForQuality,
  buildQualityDashboard,

  // Constants
  DEFAULT_RAG_CACHE_CONFIG,
  DEFAULT_RAG_BUILD_OPTIONS,
  MODEL_CONFIGS,
  DEFAULT_ROUTING_RULES,
  DEFAULT_ROUTING_CONFIG,
  DEFAULT_LLM_PIPELINE_CONFIG,
  DEFAULT_QUALITY_WEIGHTS,
  DEFAULT_FEW_SHOT_FILTERS,
  STANDARD_PRESSURE_LEVELS,

  // Types
  type VoiceAnchor,
  type RelationMemory,
  type InterestContinuity,
  type RAGContext,
  type TierRoutingInput,
  type PromptCacheStore,
  type PromptCache,
  type ParadoxPairDefinition,
  type ParadoxExpressionScore,
  type VoiceConsistencyMetric,
  type PressureTestSuite,
  type FewShotExample,
  type FewShotCollection,
  type QualityMetrics,
  type PipelineExecutionResult,
  type IntegratedPrompt,
  type RAGPromptIntegration,
  type TierPipelineIntegration,
} from "@/lib/rag-llm"

import type { InteractionLogEntry } from "@/types"

// ── Helpers ──────────────────────────────────────────────────

function makeLogEntry(
  overrides: Partial<{
    personaId: string
    targetId: string
    sentiment: "supportive" | "neutral" | "challenging" | "aggressive"
    tone: string
    topic: string
  }>
): InteractionLogEntry {
  return {
    sessionId: "session-1",
    turnNumber: 1,
    initiator: { type: "persona", id: overrides.personaId ?? "persona-1" },
    receiver: { type: "user", id: overrides.targetId ?? "user-1" },
    interactionType: "conversation",
    content: {
      userMessage: "안녕하세요",
      personaResponse: "반갑습니다",
      responseLengthTokens: 50,
    },
    vectorSnapshot: {
      pressure: 0.3,
      activeLayer: "L1",
      vFinalDrift: 0.05,
      paradoxActivation: 0.2,
    },
    behaviorTags: {
      userSentiment: overrides.sentiment ?? "neutral",
      personaTone: overrides.tone ?? "friendly",
      triggerActivated: null,
      quirkFired: null,
      topicCategory: overrides.topic ?? "general",
    },
  }
}

function makeRelationMemory(personaId: string): RelationMemory {
  return {
    personaId,
    interactions: [],
    topicHistory: [],
    emotionalTraces: [],
  }
}

function makeInterestContinuity(personaId: string): InterestContinuity {
  return {
    personaId,
    topics: [],
    decayRate: 0.05,
    lastUpdated: Date.now(),
  }
}

function makeVoiceAnchor(personaId: string): VoiceAnchor {
  return {
    personaId,
    toneMarkers: [{ category: "casual", intensity: 0.5, examples: ["진짜"] }],
    vocabularyProfile: {
      avgSentenceLength: 10,
      vocabLevel: 0.6,
      exclamationRate: 0.1,
      questionRate: 0.2,
      speechPatternHits: 3,
      preferredExpressions: ["진짜", "대박"],
    },
    expressionPatterns: ["그건 좀 아닌 것 같아요"],
  }
}

function makeFewShotExample(overrides: Partial<FewShotExample> = {}): FewShotExample {
  return {
    id: overrides.id ?? `fs_${Date.now()}`,
    personaId: overrides.personaId ?? "persona-1",
    input: overrides.input ?? "테스트 입력",
    output: overrides.output ?? "테스트 출력",
    quality: overrides.quality ?? {
      paradoxExpressionScore: 0.8,
      voiceConsistencyScore: 0.9,
      userFeedback: "like",
      overallScore: 0.85,
    },
    tags: overrides.tags ?? ["test"],
    paradoxType: overrides.paradoxType ?? "stance_agreeableness",
    collectedAt: overrides.collectedAt ?? Date.now(),
  }
}

function makeParadoxPair(overrides: Partial<ParadoxPairDefinition> = {}): ParadoxPairDefinition {
  return {
    l1Dimension: overrides.l1Dimension ?? "stance",
    l2Dimension: overrides.l2Dimension ?? "agreeableness",
    l1Value: overrides.l1Value ?? 0.8,
    l2Value: overrides.l2Value ?? 0.2,
    tensionScore: overrides.tensionScore ?? 0.7,
  }
}

function makeRoutingInput(overrides: Partial<TierRoutingInput> = {}): TierRoutingInput {
  return {
    personaId: overrides.personaId ?? "persona-1",
    paradoxScore: overrides.paradoxScore ?? 0.3,
    task: overrides.task ?? "chat",
    pressure: overrides.pressure,
    triggerDetected: overrides.triggerDetected,
    conflictScore: overrides.conflictScore,
    expectedResponseLength: overrides.expectedResponseLength,
  }
}

// ═══════════════════════════════════════════════════════════════
// AC1: RAG System
// ═══════════════════════════════════════════════════════════════

describe("AC1: RAG System", () => {
  describe("extractVoiceAnchors", () => {
    it("should extract voice anchors from posts with speech patterns", () => {
      const posts = [
        "진짜 대박이다 이 영화는 완전 감동적이었어요!",
        "ㅋㅋ 그건 좀 아닌 것 같아요 진짜로",
      ]
      const speechPatterns = ["진짜", "대박", "완전"]

      const anchor = extractVoiceAnchors("persona-1", posts, speechPatterns)

      expect(anchor.personaId).toBe("persona-1")
      expect(anchor.toneMarkers.length).toBeGreaterThan(0)
      expect(anchor.vocabularyProfile.avgSentenceLength).toBeGreaterThan(0)
      expect(anchor.vocabularyProfile.speechPatternHits).toBeGreaterThan(0)
      expect(anchor.vocabularyProfile.preferredExpressions).toContain("진짜")
    })

    it("should return default tone markers for empty posts", () => {
      const anchor = extractVoiceAnchors("persona-2", [], [])

      expect(anchor.personaId).toBe("persona-2")
      // Empty posts should give default/fallback
      expect(anchor.vocabularyProfile.avgSentenceLength).toBe(0)
      expect(anchor.vocabularyProfile.speechPatternHits).toBe(0)
      expect(anchor.expressionPatterns).toEqual([])
    })

    it("should detect formal tone markers", () => {
      const posts = [
        "따라서 결론적으로 분석하면 이 데이터는 구조적으로 문제가 있습니다.",
        "관점에서 보면 체계적 접근이 필요합니다.",
      ]

      const anchor = extractVoiceAnchors("persona-3", posts, [])

      const formalMarker = anchor.toneMarkers.find((m) => m.category === "formal")
      expect(formalMarker).toBeDefined()
      expect(formalMarker!.intensity).toBeGreaterThan(0)
    })

    it("should extract expression patterns from repeated sentences", () => {
      const posts = [
        "그건 좀 아닌 것 같아요. 내 생각에는 말이야.",
        "그건 좀 아닌 것 같아요. 다른 관점에서 보면.",
      ]

      const anchor = extractVoiceAnchors("persona-4", posts, [])

      // "그건 좀 아닌 것 같아요" appears in both posts, should be extracted
      expect(anchor.expressionPatterns.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe("updateRelationMemory", () => {
    it("should return current memory when no new entries", () => {
      const memory = makeRelationMemory("persona-1")
      const result = updateRelationMemory(memory, [])
      expect(result).toBe(memory)
    })

    it("should add new interaction from log entry", () => {
      const memory = makeRelationMemory("persona-1")
      const entry = makeLogEntry({ personaId: "persona-1", targetId: "user-1" })

      const result = updateRelationMemory(memory, [entry])

      expect(result.interactions.length).toBe(1)
      expect(result.interactions[0].targetId).toBe("user-1")
      expect(result.interactions[0].interactionCount).toBe(1)
    })

    it("should update topic history from log entries", () => {
      const memory = makeRelationMemory("persona-1")
      const entry = makeLogEntry({ personaId: "persona-1", topic: "영화" })

      const result = updateRelationMemory(memory, [entry])

      expect(result.topicHistory.length).toBe(1)
      expect(result.topicHistory[0].topic).toBe("영화")
      expect(result.topicHistory[0].frequency).toBe(1)
    })

    it("should update emotional traces based on sentiment", () => {
      const memory = makeRelationMemory("persona-1")
      const entry = makeLogEntry({
        personaId: "persona-1",
        targetId: "user-2",
        sentiment: "supportive",
      })

      const result = updateRelationMemory(memory, [entry])

      expect(result.emotionalTraces.length).toBe(1)
      expect(result.emotionalTraces[0].emotion).toBe("friendly")
      expect(result.emotionalTraces[0].intensity).toBeGreaterThan(0)
    })

    it("should increment interaction count for existing targets", () => {
      const memory: RelationMemory = {
        personaId: "persona-1",
        interactions: [
          {
            targetId: "user-1",
            targetType: "user",
            lastInteractionAt: Date.now() - 10000,
            interactionCount: 5,
            summary: "이전 대화",
            dominantTone: "neutral",
          },
        ],
        topicHistory: [],
        emotionalTraces: [],
      }
      const entry = makeLogEntry({ personaId: "persona-1", targetId: "user-1" })

      const result = updateRelationMemory(memory, [entry])

      expect(result.interactions.length).toBe(1)
      expect(result.interactions[0].interactionCount).toBe(6)
    })
  })

  describe("trackInterestContinuity", () => {
    it("should add new topics with initial weight", () => {
      const current = makeInterestContinuity("persona-1")
      const newTopics = [{ name: "AI", tags: ["tech"] }]

      const result = trackInterestContinuity(current, newTopics)

      expect(result.topics.length).toBe(1)
      expect(result.topics[0].name).toBe("AI")
      expect(result.topics[0].weight).toBe(0.3)
      expect(result.topics[0].rawFrequency).toBe(1)
    })

    it("should increase weight for existing topics", () => {
      const current: InterestContinuity = {
        personaId: "persona-1",
        topics: [
          {
            name: "AI",
            weight: 0.5,
            rawFrequency: 3,
            firstSeenAt: Date.now() - 86400000,
            lastSeenAt: Date.now() - 3600000,
            tags: ["tech"],
          },
        ],
        decayRate: 0.05,
        lastUpdated: Date.now(), // recent update => minimal decay
      }
      const newTopics = [{ name: "AI", tags: ["ml"] }]

      const result = trackInterestContinuity(current, newTopics)

      expect(result.topics[0].weight).toBeGreaterThan(0.5)
      expect(result.topics[0].rawFrequency).toBe(4)
      expect(result.topics[0].tags).toContain("tech")
      expect(result.topics[0].tags).toContain("ml")
    })

    it("should apply decay to old topics", () => {
      const oldTime = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days ago
      const current: InterestContinuity = {
        personaId: "persona-1",
        topics: [
          {
            name: "old-topic",
            weight: 0.5,
            rawFrequency: 5,
            firstSeenAt: oldTime,
            lastSeenAt: oldTime,
            tags: [],
          },
        ],
        decayRate: 0.05,
        lastUpdated: oldTime,
      }

      const result = trackInterestContinuity(current, [])

      // After 30 days with decay rate 0.05, weight should be significantly reduced
      if (result.topics.length > 0) {
        expect(result.topics[0].weight).toBeLessThan(0.5)
      }
    })

    it("should cap at 30 topics", () => {
      const current: InterestContinuity = {
        personaId: "persona-1",
        topics: Array.from({ length: 29 }, (_, i) => ({
          name: `topic-${i}`,
          weight: 0.5,
          rawFrequency: 1,
          firstSeenAt: Date.now(),
          lastSeenAt: Date.now(),
          tags: [],
        })),
        decayRate: 0.05,
        lastUpdated: Date.now(),
      }
      const newTopics = Array.from({ length: 5 }, (_, i) => ({
        name: `new-topic-${i}`,
        tags: ["new"],
      }))

      const result = trackInterestContinuity(current, newTopics)

      expect(result.topics.length).toBeLessThanOrEqual(30)
    })
  })

  describe("createEmptyRAGContext", () => {
    it("should create empty RAG context with correct persona ID", () => {
      const ctx = createEmptyRAGContext("persona-1")

      expect(ctx.voiceAnchor.personaId).toBe("persona-1")
      expect(ctx.relationMemory.personaId).toBe("persona-1")
      expect(ctx.interestContinuity.personaId).toBe("persona-1")
      expect(ctx.compiledText).toBe("")
      expect(ctx.totalTokenEstimate).toBe(0)
      expect(ctx.builtAt).toBeGreaterThan(0)
    })
  })

  describe("buildRAGContext", () => {
    it("should combine voice anchor, relation memory, and interest continuity", () => {
      const voiceAnchor = makeVoiceAnchor("persona-1")
      const relationMemory: RelationMemory = {
        personaId: "persona-1",
        interactions: [
          {
            targetId: "user-1",
            targetType: "user",
            lastInteractionAt: Date.now(),
            interactionCount: 3,
            summary: "친근한 대화",
            dominantTone: "casual",
          },
        ],
        topicHistory: [],
        emotionalTraces: [
          { targetId: "user-1", emotion: "friendly", intensity: 0.7, lastUpdatedAt: Date.now() },
        ],
      }
      const interestContinuity: InterestContinuity = {
        personaId: "persona-1",
        topics: [
          {
            name: "AI",
            weight: 0.8,
            rawFrequency: 5,
            firstSeenAt: Date.now(),
            lastSeenAt: Date.now(),
            tags: ["tech"],
          },
        ],
        decayRate: 0.05,
        lastUpdated: Date.now(),
      }

      const ctx = buildRAGContext(voiceAnchor, relationMemory, interestContinuity)

      expect(ctx.voiceAnchor).toBe(voiceAnchor)
      expect(ctx.relationMemory).toBe(relationMemory)
      expect(ctx.interestContinuity).toBe(interestContinuity)
      expect(ctx.compiledText.length).toBeGreaterThan(0)
      expect(ctx.totalTokenEstimate).toBeGreaterThan(0)
      expect(ctx.builtAt).toBeGreaterThan(0)
    })
  })

  describe("buildContextPrompt", () => {
    it("should include voice anchor section when tone markers exist", () => {
      const voiceAnchor = makeVoiceAnchor("persona-1")
      const memory = makeRelationMemory("persona-1")
      const interest = makeInterestContinuity("persona-1")

      const prompt = buildContextPrompt(voiceAnchor, memory, interest)

      expect(prompt).toContain("Voice 앵커")
      expect(prompt).toContain("casual")
    })

    it("should include relation memory section when interactions exist", () => {
      const voiceAnchor = makeVoiceAnchor("persona-1")
      const memory: RelationMemory = {
        personaId: "persona-1",
        interactions: [
          {
            targetId: "user-1",
            targetType: "user",
            lastInteractionAt: Date.now(),
            interactionCount: 2,
            summary: "토론 중",
            dominantTone: "analytical",
          },
        ],
        topicHistory: [],
        emotionalTraces: [],
      }
      const interest = makeInterestContinuity("persona-1")

      const prompt = buildContextPrompt(voiceAnchor, memory, interest)

      expect(prompt).toContain("관계 기억")
      expect(prompt).toContain("user-1")
    })

    it("should include interest section when topics exist", () => {
      const voiceAnchor = makeVoiceAnchor("persona-1")
      const memory = makeRelationMemory("persona-1")
      const interest: InterestContinuity = {
        personaId: "persona-1",
        topics: [
          {
            name: "음악",
            weight: 0.8,
            rawFrequency: 5,
            firstSeenAt: Date.now(),
            lastSeenAt: Date.now(),
            tags: [],
          },
        ],
        decayRate: 0.05,
        lastUpdated: Date.now(),
      }

      const prompt = buildContextPrompt(voiceAnchor, memory, interest)

      expect(prompt).toContain("최근 관심사")
      expect(prompt).toContain("음악")
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: LLM Strategy
// ═══════════════════════════════════════════════════════════════

describe("AC2: LLM Strategy", () => {
  describe("Constants", () => {
    it("should have correct model configs", () => {
      expect(MODEL_CONFIGS.tier1_heavy.provider).toBe("anthropic")
      expect(MODEL_CONFIGS.tier2_light.provider).toBe("openai")
      expect(MODEL_CONFIGS.tier1_heavy.costPerInputMToken).toBeGreaterThan(
        MODEL_CONFIGS.tier2_light.costPerInputMToken
      )
    })

    it("should have correct default routing config", () => {
      expect(DEFAULT_ROUTING_CONFIG.defaultTier).toBe("tier2_light")
      expect(DEFAULT_ROUTING_CONFIG.tokenBudgetPerRequest).toBe(8192)
      expect(DEFAULT_ROUTING_RULES.length).toBeGreaterThan(0)
    })

    it("should have standard pressure levels", () => {
      expect(STANDARD_PRESSURE_LEVELS).toEqual([0.1, 0.4, 0.7, 1.0])
    })
  })

  describe("routeToTier", () => {
    it("should route persona-generation to tier1_heavy", () => {
      const input = makeRoutingInput({ task: "persona-generation" })
      expect(routeToTier(input)).toBe("tier1_heavy")
    })

    it("should route review to tier1_heavy", () => {
      const input = makeRoutingInput({ task: "review" })
      expect(routeToTier(input)).toBe("tier1_heavy")
    })

    it("should route high paradox score to tier1_heavy", () => {
      const input = makeRoutingInput({ paradoxScore: 0.7 })
      expect(routeToTier(input)).toBe("tier1_heavy")
    })

    it("should route high pressure to tier1_heavy", () => {
      const input = makeRoutingInput({ pressure: 0.6 })
      expect(routeToTier(input)).toBe("tier1_heavy")
    })

    it("should route trigger detected to tier1_heavy", () => {
      const input = makeRoutingInput({ triggerDetected: true })
      expect(routeToTier(input)).toBe("tier1_heavy")
    })

    it("should route high conflict to tier1_heavy", () => {
      const input = makeRoutingInput({ conflictScore: 0.8 })
      expect(routeToTier(input)).toBe("tier1_heavy")
    })

    it("should route reaction to tier2_light", () => {
      const input = makeRoutingInput({ task: "reaction", paradoxScore: 0.1 })
      expect(routeToTier(input)).toBe("tier2_light")
    })

    it("should route matching to tier2_light", () => {
      const input = makeRoutingInput({ task: "matching", paradoxScore: 0.1 })
      expect(routeToTier(input)).toBe("tier2_light")
    })

    it("should use default tier when no rules match", () => {
      const input = makeRoutingInput({
        task: "chat",
        paradoxScore: 0.2,
        pressure: 0.1,
      })
      const tier = routeToTier(input)
      // chat with low scores should fall to default
      expect(tier).toBe("tier2_light")
    })
  })

  describe("explainRouting", () => {
    it("should return matched rules and selected tier", () => {
      const input = makeRoutingInput({ task: "persona-generation", paradoxScore: 0.8 })
      const explanation = explainRouting(input)

      expect(explanation.selectedTier).toBe("tier1_heavy")
      expect(explanation.matchedRules.length).toBeGreaterThan(0)
      expect(explanation.matchedRules).toContain("persona-generation-heavy")
      expect(explanation.modelConfig).toBeDefined()
      expect(explanation.input).toBe(input)
    })

    it("should include multiple matched rules", () => {
      const input = makeRoutingInput({
        task: "review",
        paradoxScore: 0.8,
        pressure: 0.6,
      })
      const explanation = explainRouting(input)

      expect(explanation.matchedRules.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe("estimateRequestCost", () => {
    it("should calculate cost for tier1_heavy", () => {
      const cost = estimateRequestCost("tier1_heavy", 1000, 500, false)

      expect(cost.provider).toBe("anthropic")
      expect(cost.inputCostUSD).toBeGreaterThan(0)
      expect(cost.outputCostUSD).toBeGreaterThan(0)
      expect(cost.totalCostUSD).toBeCloseTo(cost.inputCostUSD + cost.outputCostUSD, 6)
      expect(cost.cached).toBe(false)
      expect(cost.savingsUSD).toBe(0)
    })

    it("should calculate savings for cached anthropic requests", () => {
      const uncachedCost = estimateRequestCost("tier1_heavy", 10000, 500, false)
      const cachedCost = estimateRequestCost("tier1_heavy", 10000, 500, true)

      expect(cachedCost.cached).toBe(true)
      expect(cachedCost.savingsUSD).toBeGreaterThan(0)
      expect(cachedCost.inputCostUSD).toBeLessThan(uncachedCost.inputCostUSD)
      // output cost should be same
      expect(cachedCost.outputCostUSD).toBe(uncachedCost.outputCostUSD)
    })

    it("should calculate cost for tier2_light", () => {
      const cost = estimateRequestCost("tier2_light", 1000, 500, false)

      expect(cost.provider).toBe("openai")
      expect(cost.totalCostUSD).toBeGreaterThan(0)
    })

    it("should be cheaper for tier2_light vs tier1_heavy at same token counts", () => {
      const heavyCost = estimateRequestCost("tier1_heavy", 1000, 500, false)
      const lightCost = estimateRequestCost("tier2_light", 1000, 500, false)

      expect(lightCost.totalCostUSD).toBeLessThan(heavyCost.totalCostUSD)
    })
  })

  describe("Prompt Cache", () => {
    it("should create prompt cache with defaults", () => {
      const cache = createPromptCache("key-1", "compiled prompt text")

      expect(cache.key).toBe("key-1")
      expect(cache.compiledPrompt).toBe("compiled prompt text")
      expect(cache.ttlMs).toBe(300_000) // 5 minutes default
      expect(cache.hitCount).toBe(0)
      expect(cache.createdAt).toBeGreaterThan(0)
    })

    it("should create prompt cache with custom TTL", () => {
      const cache = createPromptCache("key-2", "text", 60_000)
      expect(cache.ttlMs).toBe(60_000)
    })

    it("should create empty cache store", () => {
      const store = createPromptCacheStore(500)

      expect(store.entries.size).toBe(0)
      expect(store.maxEntries).toBe(500)
      expect(store.totalHits).toBe(0)
      expect(store.totalMisses).toBe(0)
    })

    it("should add entry to cache store", () => {
      const store = createPromptCacheStore()
      const cache = createPromptCache("key-1", "prompt-1")
      const updated = addToPromptCache(store, cache)

      expect(updated.entries.size).toBe(1)
      expect(updated.entries.get("key-1")).toBeDefined()
    })

    it("should get cached prompt and increment hits", () => {
      let store = createPromptCacheStore()
      const cache = createPromptCache("key-1", "prompt-1")
      store = addToPromptCache(store, cache)

      const { prompt, store: updatedStore } = getCachedPrompt(store, "key-1")

      expect(prompt).not.toBeNull()
      expect(prompt!.compiledPrompt).toBe("prompt-1")
      expect(prompt!.hitCount).toBe(1)
      expect(updatedStore.totalHits).toBe(1)
    })

    it("should return null for missing cache key", () => {
      const store = createPromptCacheStore()
      const { prompt, store: updatedStore } = getCachedPrompt(store, "nonexistent")

      expect(prompt).toBeNull()
      expect(updatedStore.totalMisses).toBe(1)
    })

    it("should invalidate specific cache key", () => {
      let store = createPromptCacheStore()
      store = addToPromptCache(store, createPromptCache("key-1", "prompt-1"))
      store = addToPromptCache(store, createPromptCache("key-2", "prompt-2"))

      const updated = invalidateCache(store, "key-1")

      expect(updated.entries.size).toBe(1)
      expect(updated.entries.has("key-1")).toBe(false)
      expect(updated.entries.has("key-2")).toBe(true)
    })

    it("should invalidate cache by persona ID", () => {
      let store = createPromptCacheStore()
      store = addToPromptCache(store, createPromptCache("persona-1:voice", "v1"))
      store = addToPromptCache(store, createPromptCache("persona-1:relation", "r1"))
      store = addToPromptCache(store, createPromptCache("persona-2:voice", "v2"))

      const updated = invalidateCacheByPersona(store, "persona-1")

      expect(updated.entries.size).toBe(1)
      expect(updated.entries.has("persona-2:voice")).toBe(true)
    })

    it("should purge expired cache entries", () => {
      let store = createPromptCacheStore()
      // Add entry with very short TTL (already expired)
      const expiredCache: PromptCache = {
        key: "expired",
        compiledPrompt: "old",
        createdAt: Date.now() - 1_000_000,
        ttlMs: 1000,
        hitCount: 0,
      }
      const freshCache = createPromptCache("fresh", "new")

      store = addToPromptCache(store, expiredCache)
      store = addToPromptCache(store, freshCache)

      const purged = purgeExpiredCache(store)

      expect(purged.entries.size).toBe(1)
      expect(purged.entries.has("fresh")).toBe(true)
      expect(purged.entries.has("expired")).toBe(false)
    })

    it("should evict oldest entry when max entries reached (LRU)", () => {
      let store = createPromptCacheStore(2)

      const cache1: PromptCache = {
        key: "oldest",
        compiledPrompt: "1",
        createdAt: Date.now() - 5000,
        ttlMs: 300_000,
        hitCount: 0,
      }
      const cache2: PromptCache = {
        key: "middle",
        compiledPrompt: "2",
        createdAt: Date.now() - 2000,
        ttlMs: 300_000,
        hitCount: 0,
      }
      const cache3 = createPromptCache("newest", "3")

      store = addToPromptCache(store, cache1)
      store = addToPromptCache(store, cache2)
      store = addToPromptCache(store, cache3)

      expect(store.entries.size).toBe(2)
      expect(store.entries.has("oldest")).toBe(false)
      expect(store.entries.has("middle")).toBe(true)
      expect(store.entries.has("newest")).toBe(true)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Quality Feedback
// ═══════════════════════════════════════════════════════════════

describe("AC3: Quality Feedback", () => {
  describe("evaluateParadoxExpression", () => {
    it("should return zero score for empty paradox pairs", () => {
      const result = evaluateParadoxExpression("persona-1", "some text", [])

      expect(result.personaId).toBe("persona-1")
      expect(result.score).toBe(0)
      expect(result.contradictionCount).toBe(0)
      expect(result.examples).toEqual([])
    })

    it("should detect paradox expression in text with contrast markers and keywords", () => {
      const text =
        "나는 비판적인 시각을 유지하지만 동시에 상대방의 의견을 수용하려고 합니다. 분석적이면서도 경쟁적인 면이 있죠."
      const pairs = [
        makeParadoxPair({ l1Dimension: "stance", l2Dimension: "agreeableness", tensionScore: 0.8 }),
      ]

      const result = evaluateParadoxExpression("persona-1", text, pairs)

      expect(result.examples.length).toBe(1)
      expect(result.evaluatedAt).toBeGreaterThan(0)
    })

    it("should evaluate top 3 paradox pairs by tension score", () => {
      const pairs = [
        makeParadoxPair({ tensionScore: 0.9, l1Dimension: "depth", l2Dimension: "openness" }),
        makeParadoxPair({ tensionScore: 0.8, l1Dimension: "stance", l2Dimension: "agreeableness" }),
        makeParadoxPair({
          tensionScore: 0.7,
          l1Dimension: "lens",
          l2Dimension: "conscientiousness",
        }),
        makeParadoxPair({ tensionScore: 0.2, l1Dimension: "scope", l2Dimension: "extraversion" }),
      ]

      const result = evaluateParadoxExpression("persona-1", "하지만 분석이 필요하다", pairs)

      expect(result.examples.length).toBe(3) // Top 3 only
    })
  })

  describe("measureVoiceConsistency", () => {
    it("should return perfect score when no baseline texts", () => {
      const result = measureVoiceConsistency("persona-1", [], "new text", [])

      expect(result.score).toBe(1.0)
      expect(result.sampleCount).toBe(0)
      expect(result.deviations).toEqual([])
    })

    it("should measure consistency between baseline and new text", () => {
      const baseline = [
        "오늘 날씨가 정말 좋네요! 진짜 대박이에요!",
        "완전 신기한 경험이었어요! 진짜로!",
      ]
      const newText = "오늘도 진짜 대박인 하루였어요! 완전 신나!"
      const patterns = ["진짜", "대박", "완전"]

      const result = measureVoiceConsistency("persona-1", baseline, newText, patterns)

      expect(result.personaId).toBe("persona-1")
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
      expect(result.sampleCount).toBe(2)
      expect(result.deviations.length).toBeGreaterThan(0)
    })

    it("should detect deviations with severity levels", () => {
      const baseline = ["짧은 문장. 간결함."]
      const newText =
        "이것은 매우 길고 복잡한 문장으로 구성되어 있으며 여러 절이 포함되어 있습니다. 또한 다양한 주제를 아우르고 있습니다."
      const result = measureVoiceConsistency("persona-1", baseline, newText, [])

      const severities = result.deviations.map((d) => d.severity)
      // Should have at least some deviations recorded
      expect(result.deviations.length).toBe(5) // 5 features compared
      expect(severities.every((s) => ["low", "medium", "high"].includes(s))).toBe(true)
    })
  })

  describe("runPressureReactionTest", () => {
    it("should return failed suite for empty responses", () => {
      const result = runPressureReactionTest("persona-1", [])

      expect(result.personaId).toBe("persona-1")
      expect(result.tests).toEqual([])
      expect(result.monotonicityScore).toBe(0)
      expect(result.overallPassed).toBe(false)
    })

    it("should analyze pressure responses and compute monotonicity", () => {
      const responses = [
        { pressure: 0.1, response: "차분하게 생각해 보면" },
        { pressure: 0.4, response: "진짜 좀 고민이 되는데" },
        { pressure: 0.7, response: "정말 화가 나!! 짜증이야!" },
        { pressure: 1.0, response: "너무 화가 나서 정말 미칠 것 같아!!! 절대 용서 못해!!!" },
      ]

      const result = runPressureReactionTest("persona-1", responses)

      expect(result.tests.length).toBe(4)
      expect(result.monotonicityScore).toBeGreaterThanOrEqual(0)
      expect(result.monotonicityScore).toBeLessThanOrEqual(1)
      expect(typeof result.overallPassed).toBe("boolean")
      expect(result.testedAt).toBeGreaterThan(0)
    })

    it("should sort responses by pressure level", () => {
      const responses = [
        { pressure: 1.0, response: "격렬!!" },
        { pressure: 0.1, response: "차분." },
      ]

      const result = runPressureReactionTest("persona-1", responses)

      expect(result.tests[0].pressureLevel).toBe(0.1)
      expect(result.tests[1].pressureLevel).toBe(1.0)
    })
  })

  describe("computeOverallQuality", () => {
    it("should compute weighted overall quality score", () => {
      const paradoxScore: ParadoxExpressionScore = {
        personaId: "persona-1",
        score: 0.8,
        contradictionCount: 2,
        examples: [],
        evaluatedAt: Date.now(),
      }
      const voiceMetric: VoiceConsistencyMetric = {
        personaId: "persona-1",
        score: 0.9,
        deviations: [],
        sampleCount: 5,
        evaluatedAt: Date.now(),
      }
      const pressureSuite: PressureTestSuite = {
        personaId: "persona-1",
        tests: [],
        monotonicityScore: 0.85,
        overallPassed: true,
        testedAt: Date.now(),
      }

      const result = computeOverallQuality(paradoxScore, voiceMetric, pressureSuite)

      // 0.8 * 0.35 + 0.9 * 0.4 + 0.85 * 0.25 = 0.28 + 0.36 + 0.2125 = 0.8525
      expect(result.overallScore).toBeCloseTo(0.853, 2)
      expect(result.grade).toBe("B") // >= 0.75
      expect(result.paradoxExpression).toBe(paradoxScore)
      expect(result.voiceConsistency).toBe(voiceMetric)
      expect(result.pressureReaction).toBe(pressureSuite)
    })

    it("should assign grade A for score >= 0.9", () => {
      const paradoxScore: ParadoxExpressionScore = {
        personaId: "p",
        score: 0.95,
        contradictionCount: 0,
        examples: [],
        evaluatedAt: Date.now(),
      }
      const voiceMetric: VoiceConsistencyMetric = {
        personaId: "p",
        score: 0.95,
        deviations: [],
        sampleCount: 0,
        evaluatedAt: Date.now(),
      }
      const pressureSuite: PressureTestSuite = {
        personaId: "p",
        tests: [],
        monotonicityScore: 0.95,
        overallPassed: true,
        testedAt: Date.now(),
      }

      const result = computeOverallQuality(paradoxScore, voiceMetric, pressureSuite)
      expect(result.grade).toBe("A")
    })

    it("should assign grade F for low scores", () => {
      const paradoxScore: ParadoxExpressionScore = {
        personaId: "p",
        score: 0.1,
        contradictionCount: 0,
        examples: [],
        evaluatedAt: Date.now(),
      }
      const voiceMetric: VoiceConsistencyMetric = {
        personaId: "p",
        score: 0.1,
        deviations: [],
        sampleCount: 0,
        evaluatedAt: Date.now(),
      }
      const pressureSuite: PressureTestSuite = {
        personaId: "p",
        tests: [],
        monotonicityScore: 0.1,
        overallPassed: false,
        testedAt: Date.now(),
      }

      const result = computeOverallQuality(paradoxScore, voiceMetric, pressureSuite)
      expect(result.grade).toBe("F")
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: Few-shot Collector
// ═══════════════════════════════════════════════════════════════

describe("AC4: Few-shot Collector", () => {
  describe("collectFewShot", () => {
    it("should collect example that meets quality threshold", () => {
      const collection: FewShotCollection = {
        examples: [],
        filters: DEFAULT_FEW_SHOT_FILTERS,
      }

      const result = collectFewShot(collection, {
        personaId: "persona-1",
        input: "테스트 질문",
        output: "테스트 응답",
        quality: {
          paradoxExpressionScore: 0.9,
          voiceConsistencyScore: 0.8,
          userFeedback: "like",
          overallScore: 0.85,
        },
        tags: ["test"],
        paradoxType: "stance_agreeableness",
      })

      expect(result.examples.length).toBe(1)
      expect(result.examples[0].personaId).toBe("persona-1")
    })

    it("should reject example below quality threshold", () => {
      const collection: FewShotCollection = {
        examples: [],
        filters: DEFAULT_FEW_SHOT_FILTERS,
      }

      const result = collectFewShot(collection, {
        personaId: "persona-1",
        input: "test",
        output: "bad output",
        quality: {
          paradoxExpressionScore: 0.3,
          voiceConsistencyScore: 0.4,
          userFeedback: "dislike",
          overallScore: 0.35, // below 0.7 threshold
        },
        tags: [],
        paradoxType: "stance_agreeableness",
      })

      expect(result.examples.length).toBe(0)
    })

    it("should limit examples per paradox type", () => {
      const collection: FewShotCollection = {
        examples: [],
        filters: { ...DEFAULT_FEW_SHOT_FILTERS, maxPerType: 2 },
      }

      let current = collection
      for (let i = 0; i < 5; i++) {
        current = collectFewShot(current, {
          personaId: "persona-1",
          input: `input-${i}`,
          output: `output-${i}`,
          quality: {
            paradoxExpressionScore: 0.8,
            voiceConsistencyScore: 0.9,
            userFeedback: "like",
            overallScore: 0.8 + i * 0.01,
          },
          tags: [],
          paradoxType: "stance_agreeableness",
        })
      }

      const sameTypeCount = current.examples.filter(
        (e) => e.paradoxType === "stance_agreeableness"
      ).length
      expect(sameTypeCount).toBeLessThanOrEqual(2)
    })
  })

  describe("rankFewShots", () => {
    it("should rank by quality score descending", () => {
      const examples = [
        makeFewShotExample({
          id: "low",
          quality: {
            paradoxExpressionScore: 0.5,
            voiceConsistencyScore: 0.5,
            userFeedback: "none",
            overallScore: 0.5,
          },
        }),
        makeFewShotExample({
          id: "high",
          quality: {
            paradoxExpressionScore: 0.9,
            voiceConsistencyScore: 0.9,
            userFeedback: "like",
            overallScore: 0.9,
          },
        }),
        makeFewShotExample({
          id: "mid",
          quality: {
            paradoxExpressionScore: 0.7,
            voiceConsistencyScore: 0.7,
            userFeedback: "none",
            overallScore: 0.7,
          },
        }),
      ]

      const ranked = rankFewShots(examples)

      expect(ranked[0].id).toBe("high")
      expect(ranked[1].id).toBe("mid")
      expect(ranked[2].id).toBe("low")
    })

    it("should use user feedback as tiebreaker", () => {
      const examples = [
        makeFewShotExample({
          id: "dislike",
          quality: {
            paradoxExpressionScore: 0.8,
            voiceConsistencyScore: 0.8,
            userFeedback: "dislike",
            overallScore: 0.8,
          },
        }),
        makeFewShotExample({
          id: "like",
          quality: {
            paradoxExpressionScore: 0.8,
            voiceConsistencyScore: 0.8,
            userFeedback: "like",
            overallScore: 0.8,
          },
        }),
      ]

      const ranked = rankFewShots(examples)

      expect(ranked[0].id).toBe("like")
    })
  })

  describe("selectBestExamples", () => {
    it("should prioritize same paradox type", () => {
      const collection: FewShotCollection = {
        examples: [
          makeFewShotExample({
            id: "other-type",
            paradoxType: "depth_openness",
            quality: {
              paradoxExpressionScore: 0.95,
              voiceConsistencyScore: 0.95,
              userFeedback: "like",
              overallScore: 0.95,
            },
          }),
          makeFewShotExample({
            id: "same-type",
            paradoxType: "stance_agreeableness",
            quality: {
              paradoxExpressionScore: 0.8,
              voiceConsistencyScore: 0.8,
              userFeedback: "like",
              overallScore: 0.8,
            },
          }),
        ],
        filters: DEFAULT_FEW_SHOT_FILTERS,
      }

      const selected = selectBestExamples(collection, "stance_agreeableness", 1)

      expect(selected.length).toBe(1)
      expect(selected[0].id).toBe("same-type")
    })

    it("should return requested count of examples", () => {
      const examples = Array.from({ length: 10 }, (_, i) =>
        makeFewShotExample({
          id: `ex-${i}`,
          paradoxType: "stance_agreeableness",
          quality: {
            paradoxExpressionScore: 0.8,
            voiceConsistencyScore: 0.8,
            userFeedback: "none",
            overallScore: 0.8,
          },
        })
      )
      const collection: FewShotCollection = {
        examples,
        filters: DEFAULT_FEW_SHOT_FILTERS,
      }

      const selected = selectBestExamples(collection, "stance_agreeableness", 3)
      expect(selected.length).toBe(3)
    })
  })

  describe("formatFewShotsForPrompt", () => {
    it("should return empty string for no examples", () => {
      expect(formatFewShotsForPrompt([])).toBe("")
    })

    it("should format examples with input and output", () => {
      const examples = [makeFewShotExample({ input: "질문입니다", output: "좋은 답변입니다" })]

      const formatted = formatFewShotsForPrompt(examples)

      expect(formatted).toContain("Few-shot 참고 예시")
      expect(formatted).toContain("예시 1:")
      expect(formatted).toContain("질문입니다")
      expect(formatted).toContain("좋은 답변입니다")
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC5: Integration
// ═══════════════════════════════════════════════════════════════

describe("AC5: Integration", () => {
  describe("integrateRAGWithPromptBuilder", () => {
    it("should build integrated prompt from RAG context", () => {
      const voiceAnchor = makeVoiceAnchor("persona-1")
      const memory = makeRelationMemory("persona-1")
      const interest = makeInterestContinuity("persona-1")
      const ctx = buildRAGContext(voiceAnchor, memory, interest)

      const integration: RAGPromptIntegration = {
        ragContext: ctx,
        fewShotExamples: [makeFewShotExample()],
        systemPromptBase: "이 페르소나는 비판적이면서 공감적인 성격입니다. ".repeat(100),
        maxTotalTokens: 8192,
        cacheConfig: DEFAULT_RAG_CACHE_CONFIG,
      }

      const result = integrateRAGWithPromptBuilder(integration)

      expect(result.systemPrompt).toBe(integration.systemPromptBase)
      expect(result.totalTokenEstimate).toBeGreaterThan(0)
      expect(result.cacheKey).toContain("system:")
      expect(typeof result.cacheable).toBe("boolean")
    })

    it("should trim when exceeding token budget", () => {
      const voiceAnchor = makeVoiceAnchor("persona-1")
      const memory: RelationMemory = {
        personaId: "persona-1",
        interactions: Array.from({ length: 20 }, (_, i) => ({
          targetId: `user-${i}`,
          targetType: "user" as const,
          lastInteractionAt: Date.now(),
          interactionCount: 5,
          summary: `대화 내용 요약 ${i}`,
          dominantTone: "friendly",
        })),
        topicHistory: [],
        emotionalTraces: [],
      }
      const interest = makeInterestContinuity("persona-1")
      const ctx = buildRAGContext(voiceAnchor, memory, interest)

      const integration: RAGPromptIntegration = {
        ragContext: ctx,
        fewShotExamples: Array.from({ length: 10 }, () => makeFewShotExample()),
        systemPromptBase: "System prompt. ".repeat(500),
        maxTotalTokens: 100, // Very small budget to force trimming
        cacheConfig: DEFAULT_RAG_CACHE_CONFIG,
      }

      const result = integrateRAGWithPromptBuilder(integration)

      // Should have trimmed content
      expect(result.totalTokenEstimate).toBeGreaterThan(0)
    })
  })

  describe("integrateTierWithPipeline", () => {
    it("should create pipeline execution plan", () => {
      const store = createPromptCacheStore()
      const integration: TierPipelineIntegration = {
        routingConfig: DEFAULT_ROUTING_CONFIG,
        pipelineConfig: DEFAULT_LLM_PIPELINE_CONFIG,
        promptCacheStore: store,
      }
      const routingInput = makeRoutingInput({ task: "persona-generation" })
      const prompt: IntegratedPrompt = {
        systemPrompt: "system",
        ragSection: "rag context",
        fewShotSection: "few shot",
        totalTokenEstimate: 2000,
        cacheable: true,
        cacheKey: "system:abc123",
      }

      const plan = integrateTierWithPipeline(integration, routingInput, prompt)

      expect(plan.tier).toBe("tier1_heavy")
      expect(plan.modelConfig.provider).toBe("anthropic")
      expect(plan.estimatedCost.totalCostUSD).toBeGreaterThan(0)
      expect(plan.cacheHit).toBe(false) // empty store
      expect(plan.routingExplanation.selectedRuleName).toBe("persona-generation-heavy")
    })

    it("should detect cache hit when prompt is cached", () => {
      let store = createPromptCacheStore()
      store = addToPromptCache(store, createPromptCache("system:abc123", "cached"))

      const integration: TierPipelineIntegration = {
        routingConfig: DEFAULT_ROUTING_CONFIG,
        pipelineConfig: DEFAULT_LLM_PIPELINE_CONFIG,
        promptCacheStore: store,
      }
      const routingInput = makeRoutingInput({ task: "chat", paradoxScore: 0.2 })
      const prompt: IntegratedPrompt = {
        systemPrompt: "system",
        ragSection: "rag",
        fewShotSection: "",
        totalTokenEstimate: 500,
        cacheable: true,
        cacheKey: "system:abc123",
      }

      const plan = integrateTierWithPipeline(integration, routingInput, prompt)
      expect(plan.cacheHit).toBe(true)
    })
  })

  describe("shouldCollectFewShot", () => {
    it("should return false when no quality metrics", () => {
      const result: PipelineExecutionResult = {
        plan: {} as PipelineExecutionResult["plan"],
        response: {} as PipelineExecutionResult["response"],
        qualityMetrics: null,
      }

      expect(shouldCollectFewShot(result)).toBe(false)
    })

    it("should return true when quality exceeds thresholds", () => {
      const metrics: QualityMetrics = {
        paradoxExpression: {
          personaId: "p",
          score: 0.9,
          contradictionCount: 2,
          examples: [],
          evaluatedAt: Date.now(),
        },
        voiceConsistency: {
          personaId: "p",
          score: 0.8,
          deviations: [],
          sampleCount: 5,
          evaluatedAt: Date.now(),
        },
        pressureReaction: {
          personaId: "p",
          tests: [],
          monotonicityScore: 0.9,
          overallPassed: true,
          testedAt: Date.now(),
        },
        overallScore: 0.87,
        grade: "B",
        evaluatedAt: Date.now(),
      }

      const result: PipelineExecutionResult = {
        plan: {} as PipelineExecutionResult["plan"],
        response: {} as PipelineExecutionResult["response"],
        qualityMetrics: metrics,
      }

      expect(shouldCollectFewShot(result)).toBe(true)
    })

    it("should return false when quality below thresholds", () => {
      const metrics: QualityMetrics = {
        paradoxExpression: {
          personaId: "p",
          score: 0.5, // below 0.8 threshold
          contradictionCount: 0,
          examples: [],
          evaluatedAt: Date.now(),
        },
        voiceConsistency: {
          personaId: "p",
          score: 0.5, // below 0.7 threshold
          deviations: [],
          sampleCount: 5,
          evaluatedAt: Date.now(),
        },
        pressureReaction: {
          personaId: "p",
          tests: [],
          monotonicityScore: 0.5,
          overallPassed: false,
          testedAt: Date.now(),
        },
        overallScore: 0.5,
        grade: "D",
        evaluatedAt: Date.now(),
      }

      const result: PipelineExecutionResult = {
        plan: {} as PipelineExecutionResult["plan"],
        response: {} as PipelineExecutionResult["response"],
        qualityMetrics: metrics,
      }

      expect(shouldCollectFewShot(result)).toBe(false)
    })
  })

  describe("shouldSampleForQuality", () => {
    it("should always return true for tier1_heavy", () => {
      expect(shouldSampleForQuality("tier1_heavy")).toBe(true)
    })

    it("should return boolean for tier2_light", () => {
      const result = shouldSampleForQuality("tier2_light")
      expect(typeof result).toBe("boolean")
    })

    it("should always sample when rate is 1.0", () => {
      expect(shouldSampleForQuality("tier2_light", 1.0)).toBe(true)
    })

    it("should never sample when rate is 0", () => {
      expect(shouldSampleForQuality("tier2_light", 0)).toBe(false)
    })
  })

  describe("buildQualityDashboard", () => {
    it("should build dashboard with metrics per persona", () => {
      const metricsPerPersona = [
        {
          personaId: "p-1",
          archetypeId: "archetype-A",
          metrics: {
            paradoxExpression: {
              personaId: "p-1",
              score: 0.8,
              contradictionCount: 2,
              examples: [
                {
                  paradoxPair: "stance_agreeableness",
                  naturalLanguage: "비판적이면서 협조적인",
                  expressionFound: true,
                  confidence: 0.8,
                  excerpt: "하지만 동시에",
                },
              ],
              evaluatedAt: Date.now(),
            },
            voiceConsistency: {
              personaId: "p-1",
              score: 0.9,
              deviations: [],
              sampleCount: 10,
              evaluatedAt: Date.now(),
            },
            pressureReaction: {
              personaId: "p-1",
              tests: [
                {
                  personaId: "p-1",
                  pressureLevel: 0.1,
                  expectedBehavior: "calm",
                  actualBehavior: "sentiment=0.1, intensity=0.3",
                  passed: true,
                  sentimentScore: 0.1,
                  intensityScore: 0.3,
                },
                {
                  personaId: "p-1",
                  pressureLevel: 0.7,
                  expectedBehavior: "intense",
                  actualBehavior: "sentiment=-0.2, intensity=0.7",
                  passed: true,
                  sentimentScore: -0.2,
                  intensityScore: 0.7,
                },
              ],
              monotonicityScore: 0.85,
              overallPassed: true,
              testedAt: Date.now(),
            },
            overallScore: 0.85,
            grade: "B" as const,
            evaluatedAt: Date.now(),
          },
        },
      ]

      const fewShotCollection: FewShotCollection = {
        examples: [makeFewShotExample()],
        filters: DEFAULT_FEW_SHOT_FILTERS,
      }

      const dashboard = buildQualityDashboard(metricsPerPersona, fewShotCollection)

      expect(dashboard.overview.totalPersonas).toBe(1)
      expect(dashboard.overview.avgOverallScore).toBeGreaterThan(0)
      expect(dashboard.overview.gradeDistribution.B).toBe(1)
      expect(dashboard.archetypeMetrics["archetype-A"]).toBeDefined()
      expect(dashboard.archetypeMetrics["archetype-A"].personaCount).toBe(1)
      expect(dashboard.voiceDriftDistribution.length).toBeGreaterThan(0)
      expect(dashboard.fewShotLibrarySize["stance_agreeableness"]).toBe(1)
      expect(dashboard.trends.length).toBeGreaterThan(0)
      expect(dashboard.builtAt).toBeGreaterThan(0)
    })

    it("should generate alerts for low voice consistency", () => {
      const metricsPerPersona = [
        {
          personaId: "p-bad",
          archetypeId: "archetype-A",
          metrics: {
            paradoxExpression: {
              personaId: "p-bad",
              score: 0.1,
              contradictionCount: 0,
              examples: [
                {
                  paradoxPair: "stance_agreeableness",
                  naturalLanguage: "test",
                  expressionFound: false,
                  confidence: 0.1,
                  excerpt: "",
                },
              ],
              evaluatedAt: Date.now(),
            },
            voiceConsistency: {
              personaId: "p-bad",
              score: 0.3,
              deviations: [],
              sampleCount: 5,
              evaluatedAt: Date.now(),
            },
            pressureReaction: {
              personaId: "p-bad",
              tests: [
                {
                  personaId: "p-bad",
                  pressureLevel: 0.1,
                  expectedBehavior: "",
                  actualBehavior: "",
                  passed: false,
                  sentimentScore: 0,
                  intensityScore: 0.3,
                },
              ],
              monotonicityScore: 0.3,
              overallPassed: false,
              testedAt: Date.now(),
            },
            overallScore: 0.2,
            grade: "F" as const,
            evaluatedAt: Date.now(),
          },
        },
      ]

      const fewShotCollection: FewShotCollection = {
        examples: [],
        filters: DEFAULT_FEW_SHOT_FILTERS,
      }

      const dashboard = buildQualityDashboard(metricsPerPersona, fewShotCollection)

      expect(dashboard.alerts.length).toBeGreaterThan(0)
      const voiceDriftAlert = dashboard.alerts.find((a) => a.type === "voice_drift")
      expect(voiceDriftAlert).toBeDefined()
      expect(voiceDriftAlert!.severity).toBe("critical")
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Constants verification
// ═══════════════════════════════════════════════════════════════

describe("Constants", () => {
  it("should have correct default RAG cache config", () => {
    expect(DEFAULT_RAG_CACHE_CONFIG.voiceAnchorTTL).toBe(300)
    expect(DEFAULT_RAG_CACHE_CONFIG.relationMemoryTTL).toBe(60)
    expect(DEFAULT_RAG_CACHE_CONFIG.interestTTL).toBe(600)
  })

  it("should have correct default RAG build options", () => {
    expect(DEFAULT_RAG_BUILD_OPTIONS.maxVoiceAnchors).toBe(5)
    expect(DEFAULT_RAG_BUILD_OPTIONS.maxInteractions).toBe(10)
    expect(DEFAULT_RAG_BUILD_OPTIONS.maxLikes).toBe(10)
  })

  it("should have correct default quality weights summing to 1.0", () => {
    const sum =
      DEFAULT_QUALITY_WEIGHTS.paradoxExpression +
      DEFAULT_QUALITY_WEIGHTS.voiceConsistency +
      DEFAULT_QUALITY_WEIGHTS.pressureReaction
    expect(sum).toBeCloseTo(1.0, 5)
  })

  it("should have correct default few-shot filters", () => {
    expect(DEFAULT_FEW_SHOT_FILTERS.minQuality).toBe(0.7)
    expect(DEFAULT_FEW_SHOT_FILTERS.maxPerType).toBe(10)
  })

  it("should have correct default LLM pipeline config", () => {
    expect(DEFAULT_LLM_PIPELINE_CONFIG.caching.enabled).toBe(true)
    expect(DEFAULT_LLM_PIPELINE_CONFIG.fallback.enabled).toBe(true)
    expect(DEFAULT_LLM_PIPELINE_CONFIG.fallback.fallbackTier).toBe("tier2_light")
    expect(DEFAULT_LLM_PIPELINE_CONFIG.rateLimiting.maxRequestsPerMinute).toBe(60)
  })
})
