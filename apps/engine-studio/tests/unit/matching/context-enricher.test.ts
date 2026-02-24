// ═══════════════════════════════════════════════════════════════
// Context Enricher Tests
// T215: MatchingContext Enrichment Layer
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

// ── Shared Fixtures ──────────────────────────────────────────

import {
  sampleL1,
  makeCrossAxisProfile,
  makeParadoxProfile,
  makeUserProfile,
  makePersonaCandidate,
} from "./fixtures"

// ── Context Enricher ─────────────────────────────────────────

import {
  computeVoiceSimilarity,
  computeRelationshipDepthScore,
  computeNegativePenalty,
  computeEngagementBoost,
  computeColdStartFactor,
  computeFatigueDecay,
  computeRediscoveryBoost,
  computeQualityWeight,
  computeConsumptionMatch,
  computeTopologyModifier,
  computeEmotionalModifier,
  computeDynamicPressure,
  computeDynamicTierWeights,
  applyEnrichmentSignals,
} from "@/lib/matching/context-enricher"
import type {
  RelationshipSignal,
  NegativeSignal,
  EngagementSignal,
  ConsumptionSignal,
  TopologySignal,
  EmotionalSignal,
  SessionContext,
  QualitySignal,
  ExposureSignal,
  PersonaEnrichedSignals,
  UserEnrichedContext,
  EnrichmentFeature,
} from "@/lib/matching/context-enricher"

import {
  matchAll,
  matchPersona,
  calculateBasicScore,
  calculateAdvancedScore,
  calculateExplorationScore,
  DEFAULT_MATCHING_CONFIG,
} from "@/lib/matching/three-tier-engine"
import type { MatchingContext } from "@/lib/matching/three-tier-engine"
import type { VoiceStyleParams } from "@/lib/persona-world/types"

import { generateEnrichmentExplanation } from "@/lib/matching/explanation"

import { calculateExperimentUplift } from "@/lib/matching/analytics"
import type { MatchingKPIs } from "@/lib/matching/analytics"

const sampleVoiceStyle: VoiceStyleParams = {
  formality: 0.7,
  humor: 0.3,
  sentenceLength: 0.5,
  emotionExpression: 0.6,
  assertiveness: 0.8,
  vocabularyLevel: 0.7,
}

// ═══════════════════════════════════════════════════════════════
// Context Enricher — Signal Functions
// ═══════════════════════════════════════════════════════════════

describe("Context Enricher — Signal Functions", () => {
  describe("computeVoiceSimilarity", () => {
    it("동일 스타일이면 1.0", () => {
      expect(computeVoiceSimilarity(sampleVoiceStyle, sampleVoiceStyle)).toBeCloseTo(1.0, 2)
    })

    it("다른 스타일이면 < 1.0", () => {
      const other: VoiceStyleParams = {
        formality: 0.2,
        humor: 0.9,
        sentenceLength: 0.3,
        emotionExpression: 0.1,
        assertiveness: 0.2,
        vocabularyLevel: 0.1,
      }
      const sim = computeVoiceSimilarity(sampleVoiceStyle, other)
      expect(sim).toBeLessThan(0.9)
      expect(sim).toBeGreaterThanOrEqual(0)
    })

    it("0~1 범위", () => {
      const style1: VoiceStyleParams = {
        formality: 1,
        humor: 0,
        sentenceLength: 1,
        emotionExpression: 0,
        assertiveness: 1,
        vocabularyLevel: 0,
      }
      const style2: VoiceStyleParams = {
        formality: 0,
        humor: 1,
        sentenceLength: 0,
        emotionExpression: 1,
        assertiveness: 0,
        vocabularyLevel: 1,
      }
      const sim = computeVoiceSimilarity(style1, style2)
      expect(sim).toBeGreaterThanOrEqual(0)
      expect(sim).toBeLessThanOrEqual(1)
    })
  })

  describe("computeRelationshipDepthScore", () => {
    it("따뜻하고 빈번한 관계 → 높은 점수", () => {
      const signal: RelationshipSignal = {
        warmth: 0.9,
        tension: 0.1,
        frequency: 0.8,
        depth: 0.7,
        lastInteractionAt: new Date(),
      }
      const score = computeRelationshipDepthScore(signal)
      expect(score).toBeGreaterThan(0.7)
    })

    it("긴장 높고 빈도 낮으면 → 낮은 점수", () => {
      const signal: RelationshipSignal = {
        warmth: 0.2,
        tension: 0.9,
        frequency: 0.1,
        depth: 0.3,
        lastInteractionAt: null,
      }
      const score = computeRelationshipDepthScore(signal)
      expect(score).toBeLessThan(0.3)
    })

    it("0~1 범위 내", () => {
      const signal: RelationshipSignal = {
        warmth: 1,
        tension: 0,
        frequency: 1,
        depth: 1,
        lastInteractionAt: new Date(),
      }
      expect(computeRelationshipDepthScore(signal)).toBeLessThanOrEqual(1)
      expect(computeRelationshipDepthScore(signal)).toBeGreaterThanOrEqual(0)
    })
  })

  describe("computeNegativePenalty", () => {
    it("블록된 페르소나 → 1.0", () => {
      const signal: NegativeSignal = {
        reportCount: 0,
        isBlocked: true,
        highTension: false,
        isSuspectedBot: false,
      }
      expect(computeNegativePenalty(signal)).toBe(1.0)
    })

    it("봇 의심 → 0.8", () => {
      const signal: NegativeSignal = {
        reportCount: 0,
        isBlocked: false,
        highTension: false,
        isSuspectedBot: true,
      }
      expect(computeNegativePenalty(signal)).toBe(0.8)
    })

    it("리포트 많으면 누적 패널티", () => {
      const signal: NegativeSignal = {
        reportCount: 5,
        isBlocked: false,
        highTension: true,
        isSuspectedBot: false,
      }
      const penalty = computeNegativePenalty(signal)
      expect(penalty).toBeGreaterThan(0.3) // highTension + reports
      expect(penalty).toBeLessThanOrEqual(1)
    })

    it("문제 없으면 0", () => {
      const signal: NegativeSignal = {
        reportCount: 0,
        isBlocked: false,
        highTension: false,
        isSuspectedBot: false,
      }
      expect(computeNegativePenalty(signal)).toBe(0)
    })
  })

  describe("computeEngagementBoost", () => {
    it("높은 인게이지먼트 → 높은 부스트", () => {
      const signal: EngagementSignal = {
        avgLikes: 5,
        avgComments: 3,
        postCount30d: 10,
        engagementVelocity: 0.5,
      }
      const boost = computeEngagementBoost(signal)
      expect(boost).toBeGreaterThan(0.5)
    })

    it("낮은 인게이지먼트 → 낮은 부스트", () => {
      const signal: EngagementSignal = {
        avgLikes: 0,
        avgComments: 0,
        postCount30d: 0,
        engagementVelocity: -0.5,
      }
      expect(computeEngagementBoost(signal)).toBe(0)
    })

    it("0~1 범위", () => {
      const signal: EngagementSignal = {
        avgLikes: 100,
        avgComments: 100,
        postCount30d: 100,
        engagementVelocity: 10,
      }
      const boost = computeEngagementBoost(signal)
      expect(boost).toBeGreaterThanOrEqual(0)
      expect(boost).toBeLessThanOrEqual(1)
    })
  })

  describe("computeColdStartFactor", () => {
    it("인터랙션 10+ → 1.0 (정상)", () => {
      const quality: QualitySignal = {
        qualityScore: 0.8,
        consistencyScore: 0.9,
        paradoxScore: 0.7,
        driftSeverity: "STABLE",
        interactionCount: 15,
      }
      expect(computeColdStartFactor(quality)).toBe(1.0)
    })

    it("인터랙션 0 → 0.5 (최소)", () => {
      const quality: QualitySignal = {
        qualityScore: 0.8,
        consistencyScore: 0.9,
        paradoxScore: 0.7,
        driftSeverity: "STABLE",
        interactionCount: 0,
      }
      expect(computeColdStartFactor(quality)).toBe(0.5)
    })

    it("인터랙션 5 → 0.75 (중간)", () => {
      const quality: QualitySignal = {
        qualityScore: 0.8,
        consistencyScore: 0.9,
        paradoxScore: 0.7,
        driftSeverity: "STABLE",
        interactionCount: 5,
      }
      expect(computeColdStartFactor(quality)).toBe(0.75)
    })
  })

  describe("computeFatigueDecay", () => {
    it("노출 0회 → 감쇠 없음 (1.0)", () => {
      const exposure: ExposureSignal = {
        appearanceCount7d: 0,
        lastShownAt: null,
        daysSinceLastShown: 30,
      }
      expect(computeFatigueDecay(exposure)).toBe(1.0)
    })

    it("노출 5회 → e^(-1) ≈ 0.37", () => {
      const exposure: ExposureSignal = {
        appearanceCount7d: 5,
        lastShownAt: new Date(),
        daysSinceLastShown: 0,
      }
      expect(computeFatigueDecay(exposure)).toBeCloseTo(Math.exp(-1), 2)
    })

    it("노출 많을수록 감쇠 심함", () => {
      const low: ExposureSignal = {
        appearanceCount7d: 2,
        lastShownAt: new Date(),
        daysSinceLastShown: 0,
      }
      const high: ExposureSignal = {
        appearanceCount7d: 10,
        lastShownAt: new Date(),
        daysSinceLastShown: 0,
      }
      expect(computeFatigueDecay(low)).toBeGreaterThan(computeFatigueDecay(high))
    })
  })

  describe("computeRediscoveryBoost", () => {
    it("14일 이상 미노출 + warmth 높으면 → 0.08", () => {
      const exposure: ExposureSignal = {
        appearanceCount7d: 0,
        lastShownAt: null,
        daysSinceLastShown: 20,
      }
      const rel: RelationshipSignal = {
        warmth: 0.7,
        tension: 0.1,
        frequency: 0.5,
        depth: 0.6,
        lastInteractionAt: null,
      }
      expect(computeRediscoveryBoost(exposure, rel)).toBe(0.08)
    })

    it("14일 미만이면 → 0", () => {
      const exposure: ExposureSignal = {
        appearanceCount7d: 1,
        lastShownAt: new Date(),
        daysSinceLastShown: 7,
      }
      expect(computeRediscoveryBoost(exposure)).toBe(0)
    })

    it("warmth 낮으면 → 0", () => {
      const exposure: ExposureSignal = {
        appearanceCount7d: 0,
        lastShownAt: null,
        daysSinceLastShown: 20,
      }
      const rel: RelationshipSignal = {
        warmth: 0.2,
        tension: 0.1,
        frequency: 0.1,
        depth: 0.1,
        lastInteractionAt: null,
      }
      expect(computeRediscoveryBoost(exposure, rel)).toBe(0)
    })
  })

  describe("computeQualityWeight", () => {
    it("높은 품질 → 1에 가까움", () => {
      const quality: QualitySignal = {
        qualityScore: 1.0,
        consistencyScore: 1.0,
        paradoxScore: 1.0,
        driftSeverity: "STABLE",
        interactionCount: 100,
      }
      expect(computeQualityWeight(quality)).toBe(1.0)
    })

    it("낮은 품질 → 0.7에 가까움", () => {
      const quality: QualitySignal = {
        qualityScore: 0.0,
        consistencyScore: 0.5,
        paradoxScore: 0.3,
        driftSeverity: "CRITICAL",
        interactionCount: 5,
      }
      expect(computeQualityWeight(quality)).toBe(0.7)
    })
  })

  describe("computeConsumptionMatch", () => {
    it("완전 일치 → 1.0", () => {
      expect(computeConsumptionMatch(["a", "b"], ["a", "b"])).toBe(1.0)
    })

    it("부분 일치 → 0~1 사이", () => {
      const match = computeConsumptionMatch(["a", "b", "c"], ["b", "c", "d"])
      expect(match).toBeGreaterThan(0)
      expect(match).toBeLessThan(1)
    })

    it("불일치 → 0", () => {
      expect(computeConsumptionMatch(["a"], ["b"])).toBe(0)
    })

    it("빈 배열 → 0", () => {
      expect(computeConsumptionMatch([], ["a"])).toBe(0)
      expect(computeConsumptionMatch(["a"], [])).toBe(0)
    })
  })

  describe("computeTopologyModifier", () => {
    it("HUB → +0.1", () => {
      const topo: TopologySignal = {
        classification: "HUB",
        isSuspectedBot: false,
        connectivityScore: 0.9,
      }
      expect(computeTopologyModifier(topo)).toBe(0.1)
    })

    it("ISOLATE → -0.1", () => {
      const topo: TopologySignal = {
        classification: "ISOLATE",
        isSuspectedBot: false,
        connectivityScore: 0,
      }
      expect(computeTopologyModifier(topo)).toBe(-0.1)
    })

    it("봇 의심 → -0.5", () => {
      const topo: TopologySignal = {
        classification: "NORMAL",
        isSuspectedBot: true,
        connectivityScore: 0.5,
      }
      expect(computeTopologyModifier(topo)).toBe(-0.5)
    })

    it("NORMAL → 0", () => {
      const topo: TopologySignal = {
        classification: "NORMAL",
        isSuspectedBot: false,
        connectivityScore: 0.5,
      }
      expect(computeTopologyModifier(topo)).toBe(0)
    })
  })

  describe("computeEmotionalModifier", () => {
    it("유저 mood 낮고 페르소나 mood 높으면 → +0.05", () => {
      expect(computeEmotionalModifier(0.2, 0.8)).toBe(0.05)
    })

    it("유저 mood 높으면 → 0", () => {
      expect(computeEmotionalModifier(0.8, 0.9)).toBe(0)
    })

    it("유저 mood 낮지만 페르소나도 낮으면 → 0", () => {
      expect(computeEmotionalModifier(0.2, 0.3)).toBe(0)
    })
  })

  describe("computeDynamicPressure", () => {
    it("세션 < 10 → 0.0", () => {
      expect(computeDynamicPressure(5)).toBe(0.0)
    })

    it("세션 10~29 → 0.1", () => {
      expect(computeDynamicPressure(20)).toBe(0.1)
    })

    it("세션 30~49 → 0.25", () => {
      expect(computeDynamicPressure(40)).toBe(0.25)
    })

    it("세션 50+ → 0.5", () => {
      expect(computeDynamicPressure(100)).toBe(0.5)
    })
  })

  describe("computeDynamicTierWeights", () => {
    it("세션 없으면 null (기본 사용)", () => {
      expect(computeDynamicTierWeights()).toBeNull()
    })

    it("신규 유저 → 탐색 우선", () => {
      const session: SessionContext = {
        timeOfDay: "morning",
        sessionCount: 5,
        isNewUser: true,
        isChurning: false,
        daysSinceLastVisit: 0,
      }
      const weights = computeDynamicTierWeights(session)
      expect(weights).not.toBeNull()
      expect(weights!.exploration).toBe(0.5) // 탐색 우선
    })

    it("이탈 위험 유저 → 세렌디피티 극대화", () => {
      const session: SessionContext = {
        timeOfDay: "evening",
        sessionCount: 25,
        isNewUser: false,
        isChurning: true,
        daysSinceLastVisit: 14,
      }
      const weights = computeDynamicTierWeights(session)
      expect(weights).not.toBeNull()
      expect(weights!.exploration).toBe(0.6)
    })

    it("숙련 유저 → 심층 추천 증가", () => {
      const session: SessionContext = {
        timeOfDay: "afternoon",
        sessionCount: 60,
        isNewUser: false,
        isChurning: false,
        daysSinceLastVisit: 0,
      }
      const weights = computeDynamicTierWeights(session)
      expect(weights).not.toBeNull()
      expect(weights!.advanced).toBe(0.4) // 심층 추천 비율 높음
    })

    it("일반 활성 유저 → null (기본 사용)", () => {
      const session: SessionContext = {
        timeOfDay: "afternoon",
        sessionCount: 30,
        isNewUser: false,
        isChurning: false,
        daysSinceLastVisit: 1,
      }
      expect(computeDynamicTierWeights(session)).toBeNull()
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// applyEnrichmentSignals — Integration
// ═══════════════════════════════════════════════════════════════

describe("applyEnrichmentSignals", () => {
  it("시그널 없으면 rawScore 그대로", () => {
    const result = applyEnrichmentSignals(0.7, "basic")
    expect(result.finalScore).toBe(0.7)
    expect(result.voiceBonus).toBe(0)
    expect(result.negativePenalty).toBe(0)
  })

  it("Voice 유사도 → Basic/Advanced에 보너스", () => {
    const signals: PersonaEnrichedSignals = {
      voiceStyleParams: sampleVoiceStyle,
    }
    const userCtx: UserEnrichedContext = {
      voiceStyleParams: sampleVoiceStyle, // 동일 → 유사도 1.0 → bonus +0.05
    }
    const result = applyEnrichmentSignals(0.7, "basic", signals, userCtx)
    expect(result.voiceBonus).toBeGreaterThan(0)
    expect(result.finalScore).toBeGreaterThan(0.7)
  })

  it("Voice 유사도 → Exploration에는 미적용", () => {
    const signals: PersonaEnrichedSignals = {
      voiceStyleParams: sampleVoiceStyle,
    }
    const userCtx: UserEnrichedContext = {
      voiceStyleParams: sampleVoiceStyle,
    }
    const result = applyEnrichmentSignals(0.7, "exploration", signals, userCtx)
    expect(result.voiceBonus).toBe(0)
  })

  it("네거티브 패널티 → 점수 감소", () => {
    const signals: PersonaEnrichedSignals = {
      negative: { reportCount: 5, isBlocked: false, highTension: true, isSuspectedBot: false },
    }
    const result = applyEnrichmentSignals(0.8, "basic", signals)
    expect(result.negativePenalty).toBeGreaterThan(0)
    expect(result.finalScore).toBeLessThan(0.8)
  })

  it("블록 → finalScore 0", () => {
    const signals: PersonaEnrichedSignals = {
      negative: { reportCount: 0, isBlocked: true, highTension: false, isSuspectedBot: false },
    }
    const result = applyEnrichmentSignals(0.8, "basic", signals)
    expect(result.negativePenalty).toBe(1.0)
    expect(result.finalScore).toBe(0)
  })

  it("품질 가중 → 낮은 품질은 점수 감소", () => {
    const signals: PersonaEnrichedSignals = {
      quality: {
        qualityScore: 0.3,
        consistencyScore: 0.5,
        paradoxScore: 0.4,
        driftSeverity: "WARNING",
        interactionCount: 20,
      },
    }
    const result = applyEnrichmentSignals(0.8, "basic", signals)
    expect(result.qualityWeight).toBeLessThan(1.0)
    expect(result.finalScore).toBeLessThan(0.8)
  })

  it("콜드스타트 → 신규 페르소나 점수 보정", () => {
    const signals: PersonaEnrichedSignals = {
      quality: {
        qualityScore: 0.8,
        consistencyScore: 0.8,
        paradoxScore: 0.7,
        driftSeverity: "STABLE",
        interactionCount: 3,
      },
    }
    const result = applyEnrichmentSignals(0.8, "basic", signals)
    expect(result.coldStartFactor).toBeLessThan(1.0)
    expect(result.coldStartFactor).toBeGreaterThan(0.5)
  })

  it("피로 감쇠 → 자주 노출되면 감쇠", () => {
    const signals: PersonaEnrichedSignals = {
      exposure: { appearanceCount7d: 8, lastShownAt: new Date(), daysSinceLastShown: 0 },
    }
    const result = applyEnrichmentSignals(0.8, "basic", signals)
    expect(result.fatigueDecay).toBeLessThan(1.0)
    expect(result.finalScore).toBeLessThan(0.8)
  })

  it("관계 깊이 → Advanced에서 더 강하게 반영", () => {
    const signals: PersonaEnrichedSignals = {
      relationship: {
        warmth: 0.9,
        tension: 0.1,
        frequency: 0.8,
        depth: 0.7,
        lastInteractionAt: new Date(),
      },
    }
    const basicResult = applyEnrichmentSignals(0.7, "basic", signals)
    const advancedResult = applyEnrichmentSignals(0.7, "advanced", signals)
    expect(advancedResult.relationshipBonus).toBeGreaterThan(basicResult.relationshipBonus)
  })

  it("관계 깊이 → Exploration에는 미적용", () => {
    const signals: PersonaEnrichedSignals = {
      relationship: {
        warmth: 0.9,
        tension: 0.1,
        frequency: 0.8,
        depth: 0.7,
        lastInteractionAt: new Date(),
      },
    }
    const result = applyEnrichmentSignals(0.7, "exploration", signals)
    expect(result.relationshipBonus).toBe(0)
  })

  it("인게이지먼트 부스트 → Basic/Advanced에만", () => {
    const signals: PersonaEnrichedSignals = {
      engagement: { avgLikes: 5, avgComments: 3, postCount30d: 10, engagementVelocity: 0.5 },
    }
    const basicResult = applyEnrichmentSignals(0.7, "basic", signals)
    const explorationResult = applyEnrichmentSignals(0.7, "exploration", signals)
    expect(basicResult.engagementBonus).toBeGreaterThan(0)
    expect(explorationResult.engagementBonus).toBe(0)
  })

  it("소비 패턴 매칭 → 일치도가 보너스", () => {
    const signals: PersonaEnrichedSignals = {
      consumption: { topTags: ["drama", "thriller"], avgRating: 4.5, contentTypeDistribution: {} },
    }
    const userCtx: UserEnrichedContext = {
      preferredTags: ["drama", "thriller", "comedy"],
    }
    const result = applyEnrichmentSignals(0.7, "basic", signals, userCtx)
    expect(result.consumptionBonus).toBeGreaterThan(0)
  })

  it("토폴로지 HUB → Exploration에서만 부스트", () => {
    const signals: PersonaEnrichedSignals = {
      topology: { classification: "HUB", isSuspectedBot: false, connectivityScore: 0.9 },
    }
    const explorationResult = applyEnrichmentSignals(0.7, "exploration", signals)
    const basicResult = applyEnrichmentSignals(0.7, "basic", signals)
    expect(explorationResult.topologyModifier).toBeGreaterThan(0) // HUB 부스트
    expect(basicResult.topologyModifier).toBe(0) // Basic에선 HUB 부스트 미적용
  })

  it("A/B 기능 토글 — 비활성 기능은 무시", () => {
    const signals: PersonaEnrichedSignals = {
      voiceStyleParams: sampleVoiceStyle,
      negative: { reportCount: 5, isBlocked: false, highTension: true, isSuspectedBot: false },
    }
    const userCtx: UserEnrichedContext = { voiceStyleParams: sampleVoiceStyle }
    const enabledFeatures = new Set<EnrichmentFeature>(["voiceSimilarity"]) // negativeSignals 미포함

    const result = applyEnrichmentSignals(0.7, "basic", signals, userCtx, enabledFeatures)
    expect(result.voiceBonus).toBeGreaterThan(0) // voice는 활성
    expect(result.negativePenalty).toBe(0) // negative는 비활성
  })

  it("모든 시그널 종합 → 최종 점수 0~1 범위", () => {
    const signals: PersonaEnrichedSignals = {
      voiceStyleParams: sampleVoiceStyle,
      relationship: {
        warmth: 0.8,
        tension: 0.2,
        frequency: 0.7,
        depth: 0.6,
        lastInteractionAt: new Date(),
      },
      negative: { reportCount: 1, isBlocked: false, highTension: false, isSuspectedBot: false },
      engagement: { avgLikes: 3, avgComments: 2, postCount30d: 8, engagementVelocity: 0.1 },
      consumption: { topTags: ["drama"], avgRating: 4.0, contentTypeDistribution: {} },
      topology: { classification: "NORMAL", isSuspectedBot: false, connectivityScore: 0.5 },
      emotional: { currentMood: 0.6, moodStability: 0.8, avgNetworkMood: 0.5 },
      quality: {
        qualityScore: 0.85,
        consistencyScore: 0.9,
        paradoxScore: 0.7,
        driftSeverity: "STABLE",
        interactionCount: 25,
      },
      exposure: { appearanceCount7d: 2, lastShownAt: new Date(), daysSinceLastShown: 3 },
    }
    const userCtx: UserEnrichedContext = {
      voiceStyleParams: sampleVoiceStyle,
      preferredTags: ["drama", "thriller"],
      session: {
        timeOfDay: "evening",
        sessionCount: 30,
        isNewUser: false,
        isChurning: false,
        daysSinceLastVisit: 1,
      },
    }

    const result = applyEnrichmentSignals(0.75, "basic", signals, userCtx)
    expect(result.finalScore).toBeGreaterThanOrEqual(0)
    expect(result.finalScore).toBeLessThanOrEqual(1)
    expect(result.baseScore).toBe(0.75)
  })
})

// ═══════════════════════════════════════════════════════════════
// Three-Tier Engine + Enrichment Integration
// ═══════════════════════════════════════════════════════════════

describe("Three-Tier Engine + Enrichment", () => {
  describe("matchAll — blocked persona filtering", () => {
    it("블록된 페르소나는 결과에서 제외", () => {
      const user = makeUserProfile()
      const personas = [
        makePersonaCandidate("p1"),
        makePersonaCandidate("p2"),
        makePersonaCandidate("p3_blocked"),
      ]

      const context: MatchingContext = {
        enrichment: {
          personaSignals: new Map([
            [
              "p3_blocked",
              {
                negative: {
                  reportCount: 0,
                  isBlocked: true,
                  highTension: false,
                  isSuspectedBot: false,
                },
              },
            ],
          ]),
        },
      }

      const results = matchAll(user, personas, DEFAULT_MATCHING_CONFIG, context)
      const personaIds = results.map((r) => r.personaId)
      expect(personaIds).not.toContain("p3_blocked")
    })

    it("봇 의심 페르소나도 제외", () => {
      const user = makeUserProfile()
      const personas = [makePersonaCandidate("p1"), makePersonaCandidate("p_bot")]

      const context: MatchingContext = {
        enrichment: {
          personaSignals: new Map([
            [
              "p_bot",
              {
                negative: {
                  reportCount: 0,
                  isBlocked: false,
                  highTension: false,
                  isSuspectedBot: true,
                },
              },
            ],
          ]),
        },
      }

      const results = matchAll(user, personas, DEFAULT_MATCHING_CONFIG, context)
      const personaIds = results.map((r) => r.personaId)
      expect(personaIds).not.toContain("p_bot")
    })
  })

  describe("matchAll — dynamic tier weights", () => {
    it("신규 유저 → 기본 설정과 다른 결과 (동적 가중치 적용)", () => {
      const user = makeUserProfile()
      // 다양한 성향의 페르소나로 exploration에서도 점수 차이 발생
      const personas = Array.from({ length: 10 }, (_, i) =>
        makePersonaCandidate(`p${i}`, {
          depth: 0.1 + (i % 10) * 0.09,
          taste: 0.1 + (i % 5) * 0.2,
        })
      )

      const newUserContext: MatchingContext = {
        enrichment: {
          personaSignals: new Map(),
          userContext: {
            session: {
              timeOfDay: "morning",
              sessionCount: 3,
              isNewUser: true,
              isChurning: false,
              daysSinceLastVisit: 0,
            },
          },
        },
      }

      const defaultResults = matchAll(user, personas, { ...DEFAULT_MATCHING_CONFIG, topN: 10 })
      const newUserResults = matchAll(
        user,
        personas,
        { ...DEFAULT_MATCHING_CONFIG, topN: 10 },
        newUserContext
      )

      // 동적 가중치 적용 시 결과가 기본 설정과 달라야 함 (tier 분포 또는 순서 차이)
      const defaultIds = defaultResults.map((r) => `${r.personaId}:${r.tier}`)
      const newUserIds = newUserResults.map((r) => `${r.personaId}:${r.tier}`)
      // 완전히 동일하지 않아야 (동적 가중치가 적용되었다는 증거)
      const isDifferent = defaultIds.some((id, i) => id !== newUserIds[i])
      expect(isDifferent).toBe(true)
    })
  })

  describe("matchPersona — enrichment signals propagation", () => {
    it("enrichment 시그널이 breakdown에 포함", () => {
      const user = makeUserProfile()
      const persona = makePersonaCandidate("p1")
      const signals: PersonaEnrichedSignals = {
        voiceStyleParams: sampleVoiceStyle,
        quality: {
          qualityScore: 0.8,
          consistencyScore: 0.9,
          paradoxScore: 0.7,
          driftSeverity: "STABLE",
          interactionCount: 20,
        },
      }
      const userCtx: UserEnrichedContext = {
        voiceStyleParams: sampleVoiceStyle,
      }

      const result = matchPersona(user, persona, "basic", {
        personaSignals: signals,
        userContext: userCtx,
      })
      expect(result.breakdown.enrichment).toBeDefined()
      expect(result.breakdown.enrichment!.voiceBonus).toBeGreaterThan(0)
    })

    it("enrichment 없으면 enrichment 필드에 기본값", () => {
      const user = makeUserProfile()
      const persona = makePersonaCandidate("p1")

      const result = matchPersona(user, persona, "basic")
      expect(result.breakdown.enrichment).toBeDefined()
      expect(result.breakdown.enrichment!.voiceBonus).toBe(0)
      expect(result.breakdown.enrichment!.negativePenalty).toBe(0)
    })
  })

  describe("calculateBasicScore — enrichment integration", () => {
    it("enrichment 시그널이 최종 점수에 반영", () => {
      const v = [0.7, 0.8, 0.6, 0.7, 0.4, 0.6, 0.3]
      const cap = makeCrossAxisProfile()
      const signals: PersonaEnrichedSignals = {
        negative: { reportCount: 3, isBlocked: false, highTension: true, isSuspectedBot: false },
      }

      const { score: withPenalty } = calculateBasicScore(v, v, cap, cap, undefined, undefined, {
        personaSignals: signals,
      })
      const { score: noPenalty } = calculateBasicScore(v, v, cap, cap)
      expect(withPenalty).toBeLessThan(noPenalty)
    })
  })

  describe("calculateExplorationScore — enrichment integration", () => {
    it("HUB 토폴로지 → Exploration에서 부스트", () => {
      const cap = makeCrossAxisProfile()
      const eps = makeParadoxProfile(0.5)
      const signals: PersonaEnrichedSignals = {
        topology: { classification: "HUB", isSuspectedBot: false, connectivityScore: 0.9 },
      }

      const { score: withHub } = calculateExplorationScore(
        cap,
        cap,
        eps,
        eps,
        [],
        "p1",
        undefined,
        [],
        { personaSignals: signals }
      )
      const { score: noHub } = calculateExplorationScore(cap, cap, eps, eps, [], "p1")
      expect(withHub).toBeGreaterThanOrEqual(noHub)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// XAI Enrichment Explanation
// ═══════════════════════════════════════════════════════════════

describe("XAI Enrichment Explanation", () => {
  it("여러 시그널이 적용되면 모두 설명에 포함", () => {
    const adjustment = applyEnrichmentSignals(
      0.7,
      "basic",
      {
        voiceStyleParams: sampleVoiceStyle,
        relationship: {
          warmth: 0.8,
          tension: 0.1,
          frequency: 0.7,
          depth: 0.6,
          lastInteractionAt: new Date(),
        },
        negative: { reportCount: 2, isBlocked: false, highTension: false, isSuspectedBot: false },
      },
      {
        voiceStyleParams: sampleVoiceStyle,
      }
    )

    const explanation = generateEnrichmentExplanation(adjustment)
    expect(explanation.appliedSignals.length).toBeGreaterThan(0)
    expect(explanation.appliedSignals).toContain("보이스 유사도")
    expect(explanation.appliedSignals).toContain("관계 깊이")
    expect(explanation.positiveFactors.length).toBeGreaterThan(0)
  })

  it("시그널 없으면 빈 설명", () => {
    const adjustment = applyEnrichmentSignals(0.7, "basic")
    const explanation = generateEnrichmentExplanation(adjustment)
    expect(explanation.appliedSignals).toHaveLength(0)
    expect(explanation.positiveFactors).toHaveLength(0)
    expect(explanation.negativeFactors).toHaveLength(0)
  })

  it("실험 ID가 있으면 포함", () => {
    const adjustment = applyEnrichmentSignals(0.7, "basic")
    const explanation = generateEnrichmentExplanation(adjustment, "exp_123")
    expect(explanation.experimentId).toBe("exp_123")
  })
})

// ═══════════════════════════════════════════════════════════════
// Analytics — Experiment Tracking
// ═══════════════════════════════════════════════════════════════

describe("Analytics — Experiment Tracking", () => {
  it("uplift 계산: variant이 더 좋으면 양수", () => {
    const control: MatchingKPIs = {
      matchAccuracy: 0.7,
      avgMatchScore: 0.6,
      top1Accuracy: 0.4,
      diversityIndex: 0.5,
      ctr: 0.2,
      avgDwellTime: 30,
      returnRate: 0.3,
      nps: 40,
    }
    const variant: MatchingKPIs = {
      matchAccuracy: 0.8,
      avgMatchScore: 0.7,
      top1Accuracy: 0.5,
      diversityIndex: 0.6,
      ctr: 0.25,
      avgDwellTime: 40,
      returnRate: 0.35,
      nps: 50,
    }

    const uplift = calculateExperimentUplift(control, variant)
    expect(uplift.matchAccuracy).toBeGreaterThan(0) // 0.7 → 0.8 = +14%
    expect(uplift.ctr).toBeGreaterThan(0) // 0.2 → 0.25 = +25%
  })

  it("uplift 계산: variant이 더 나쁘면 음수", () => {
    const control: MatchingKPIs = {
      matchAccuracy: 0.8,
      avgMatchScore: 0.7,
      top1Accuracy: 0.5,
      diversityIndex: 0.6,
      ctr: 0.3,
      avgDwellTime: 40,
      returnRate: 0.4,
      nps: 50,
    }
    const variant: MatchingKPIs = {
      matchAccuracy: 0.6,
      avgMatchScore: 0.5,
      top1Accuracy: 0.3,
      diversityIndex: 0.4,
      ctr: 0.2,
      avgDwellTime: 25,
      returnRate: 0.25,
      nps: 30,
    }

    const uplift = calculateExperimentUplift(control, variant)
    expect(uplift.matchAccuracy).toBeLessThan(0)
    expect(uplift.ctr).toBeLessThan(0)
  })
})
