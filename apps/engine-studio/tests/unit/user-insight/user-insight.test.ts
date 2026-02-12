// ═══════════════════════════════════════════════════════════════
// User Insight Engine Tests
// T56-AC6: ColdStart/Psychometric/ProgressiveProfiling/Archetype/Adaptive
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import type { SocialPersonaVector, CoreTemperamentVector, SocialDimension } from "@/types"

// ── Cold Start ───────────────────────────────────────────────

import {
  MODE_CONFIG,
  createQuestionSet,
  addQuestion,
  removeQuestion,
  reorderQuestions,
  inferVectorsFromAnswers,
  validateQuestionSet,
} from "@/lib/user-insight/cold-start"
import type { ColdStartQuestion, OnboardingMode } from "@/lib/user-insight/cold-start"

// ── Psychometric ─────────────────────────────────────────────

import {
  OCEAN_L1_MAPPINGS,
  predictL1FromL2,
  REVERSAL_THRESHOLD,
  detectReversals,
  extractLatentTraits,
  createLatentTraitProfile,
} from "@/lib/user-insight/psychometric"

// ── Progressive Profiling ────────────────────────────────────

import {
  behaviorToSignals,
  calculateDecay,
  LEARNING_RATE,
  updateVector,
  batchUpdateVector,
  shouldExplore,
  createProfileHistory,
  addSnapshot,
  measureDrift,
} from "@/lib/user-insight/progressive-profiling"
import type { BehaviorEvent } from "@/lib/user-insight/progressive-profiling"

// ── User Archetype ───────────────────────────────────────────

import {
  BASE_ARCHETYPES,
  euclideanDistance,
  matchThresholds,
  classifyUser,
  createUserArchetypeProfile,
  createCustomArchetype,
  addArchetype,
  updateArchetype,
  removeArchetype,
  computeArchetypeStats,
  DISTANCE_THRESHOLD,
} from "@/lib/user-insight/user-archetype"

// ── Adaptive Profiling ───────────────────────────────────────

import {
  REWARD_TABLE,
  calculateAxisUncertainties,
  calculateExpectedInfoGain,
  selectNextQuestions,
  createDailyCheckState,
  recordDailyAnswer,
  calculateRewards,
  applyRewards,
  validateResponse,
  calculateTrustScore,
} from "@/lib/user-insight/adaptive-profiling"
import type { UserResponseRecord } from "@/lib/user-insight/adaptive-profiling"

// ═══════════════════════════════════════════════════════════════
// Cold Start Tests
// ═══════════════════════════════════════════════════════════════

describe("Cold Start", () => {
  describe("MODE_CONFIG", () => {
    it("3가지 모드별 설정이 정의됨", () => {
      expect(MODE_CONFIG.quick.questionCount).toBe(12)
      expect(MODE_CONFIG.standard.questionCount).toBe(30)
      expect(MODE_CONFIG.deep.questionCount).toBe(60)
    })

    it("모드별 예상 소요 시간이 있음", () => {
      expect(MODE_CONFIG.quick.minutes).toBe(1.5)
      expect(MODE_CONFIG.standard.minutes).toBe(4)
      expect(MODE_CONFIG.deep.minutes).toBe(8)
    })

    it("모드별 정밀도 정의", () => {
      expect(MODE_CONFIG.quick.precision).toBeLessThan(MODE_CONFIG.standard.precision)
      expect(MODE_CONFIG.standard.precision).toBeLessThan(MODE_CONFIG.deep.precision)
    })
  })

  describe("createQuestionSet", () => {
    it("질문 세트를 생성", () => {
      const set = createQuestionSet("테스트 세트", "quick")
      expect(set.name).toBe("테스트 세트")
      expect(set.mode).toBe("quick")
      expect(set.questions).toHaveLength(0)
      expect(set.id).toMatch(/^qs_/)
      expect(set.estimatedMinutes).toBe(1.5)
    })
  })

  describe("addQuestion / removeQuestion", () => {
    it("질문을 추가하고 제거", () => {
      let set = createQuestionSet("테스트", "quick")
      set = addQuestion(set, {
        text: "다음 중 선호하는 분석 방식은?",
        type: "forced_choice",
        targetDimension: "depth",
        targetLayer: "L1",
        options: [
          { id: "o1", text: "직관적", vectorDelta: { depth: -0.3 } },
          { id: "o2", text: "심층적", vectorDelta: { depth: 0.3 } },
        ],
      })

      expect(set.questions).toHaveLength(1)
      expect(set.questions[0].order).toBe(0)

      set = removeQuestion(set, set.questions[0].id)
      expect(set.questions).toHaveLength(0)
    })

    it("최대 질문 수 초과 시 에러", () => {
      let set = createQuestionSet("테스트", "quick")
      for (let i = 0; i < 12; i++) {
        set = addQuestion(set, {
          text: `질문 ${i}`,
          type: "forced_choice",
          targetDimension: "depth",
          targetLayer: "L1",
          options: [
            { id: `a${i}`, text: "A", vectorDelta: { depth: -0.1 } },
            { id: `b${i}`, text: "B", vectorDelta: { depth: 0.1 } },
          ],
        })
      }

      expect(() =>
        addQuestion(set, {
          text: "추가 질문",
          type: "forced_choice",
          targetDimension: "depth",
          targetLayer: "L1",
          options: [
            { id: "x", text: "A", vectorDelta: { depth: 0 } },
            { id: "y", text: "B", vectorDelta: { depth: 0 } },
          ],
        })
      ).toThrow("최대 질문 수")
    })
  })

  describe("reorderQuestions", () => {
    it("질문 순서를 변경", () => {
      let set = createQuestionSet("테스트", "standard")
      set = addQuestion(set, {
        text: "Q1",
        type: "forced_choice",
        targetDimension: "depth",
        targetLayer: "L1",
        options: [
          { id: "a", text: "A", vectorDelta: { depth: 0.1 } },
          { id: "b", text: "B", vectorDelta: { depth: -0.1 } },
        ],
      })
      set = addQuestion(set, {
        text: "Q2",
        type: "scenario",
        targetDimension: "lens",
        targetLayer: "L1",
        options: [
          { id: "c", text: "C", vectorDelta: { lens: 0.2 } },
          { id: "d", text: "D", vectorDelta: { lens: -0.2 } },
        ],
      })

      const reversed = reorderQuestions(set, [set.questions[1].id, set.questions[0].id])
      expect(reversed.questions[0].text).toBe("Q2")
      expect(reversed.questions[1].text).toBe("Q1")
      expect(reversed.questions[0].order).toBe(0)
      expect(reversed.questions[1].order).toBe(1)
    })
  })

  describe("inferVectorsFromAnswers", () => {
    it("응답에서 L1 벡터를 추론", () => {
      const questions: ColdStartQuestion[] = [
        {
          id: "q1",
          text: "Q1",
          type: "forced_choice",
          targetDimension: "depth",
          targetLayer: "L1",
          options: [
            { id: "a", text: "A", vectorDelta: { depth: 0.3 } },
            { id: "b", text: "B", vectorDelta: { depth: -0.3 } },
          ],
          mode: "quick",
          order: 0,
        },
      ]

      const result = inferVectorsFromAnswers(questions, [
        { questionId: "q1", selectedOptionId: "a" },
      ])
      expect(result.depth).toBeGreaterThan(0.5) // 0.5 + 0.3 = 0.8
    })

    it("응답이 없으면 기본값 0.5", () => {
      const result = inferVectorsFromAnswers([], [])
      expect(result.depth).toBe(0.5)
    })
  })

  describe("validateQuestionSet", () => {
    it("빈 질문 세트는 invalid", () => {
      const set = createQuestionSet("빈 세트", "quick")
      const { valid, errors } = validateQuestionSet(set)
      expect(valid).toBe(false)
      expect(errors.length).toBeGreaterThan(0)
    })

    it("옵션이 2개 미만이면 에러", () => {
      const set = createQuestionSet("테스트", "quick")
      // 직접 질문 주입 (옵션 1개)
      const modified = {
        ...set,
        questions: [
          {
            id: "q1",
            text: "Q1",
            type: "forced_choice" as const,
            targetDimension: "depth" as const,
            targetLayer: "L1" as const,
            options: [{ id: "a", text: "A", vectorDelta: { depth: 0.1 } }],
            mode: "quick" as const,
            order: 0,
          },
        ],
      }
      const { errors } = validateQuestionSet(modified)
      expect(errors.some((e) => e.includes("2개 미만"))).toBe(true)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Psychometric Tests
// ═══════════════════════════════════════════════════════════════

describe("Psychometric", () => {
  describe("OCEAN_L1_MAPPINGS", () => {
    it("5가지 OCEAN 차원 매핑이 정의됨", () => {
      expect(OCEAN_L1_MAPPINGS).toHaveLength(5)
      const dims = OCEAN_L1_MAPPINGS.map((m) => m.l2Dimension)
      expect(dims).toContain("openness")
      expect(dims).toContain("conscientiousness")
      expect(dims).toContain("extraversion")
      expect(dims).toContain("agreeableness")
      expect(dims).toContain("neuroticism")
    })

    it("각 매핑에 L1 상관 관계가 있음", () => {
      for (const mapping of OCEAN_L1_MAPPINGS) {
        expect(mapping.l1Correlations.length).toBeGreaterThan(0)
        for (const corr of mapping.l1Correlations) {
          expect(corr.coefficient).toBeGreaterThanOrEqual(-1)
          expect(corr.coefficient).toBeLessThanOrEqual(1)
        }
      }
    })
  })

  describe("predictL1FromL2", () => {
    it("L2 벡터로부터 L1 예측", () => {
      const l2: CoreTemperamentVector = {
        openness: 0.9,
        conscientiousness: 0.5,
        extraversion: 0.7,
        agreeableness: 0.6,
        neuroticism: 0.3,
      }

      const predicted = predictL1FromL2(l2)
      // openness 0.9 → taste에 양의 상관
      expect(predicted.taste).toBeDefined()
      expect(predicted.taste).toBeGreaterThan(0)
      expect(predicted.taste).toBeLessThanOrEqual(1)
    })

    it("모든 차원이 0~1 범위", () => {
      const l2: CoreTemperamentVector = {
        openness: 1,
        conscientiousness: 1,
        extraversion: 1,
        agreeableness: 1,
        neuroticism: 1,
      }

      const predicted = predictL1FromL2(l2)
      for (const [, value] of Object.entries(predicted)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    })
  })

  describe("detectReversals", () => {
    it("설문과 행동 간 괴리 탐지", () => {
      const explicit = { depth: 0.8, lens: 0.3 }
      const implicit = { depth: 0.3, lens: 0.35 }

      const reversals = detectReversals(explicit, implicit)
      expect(reversals).toHaveLength(2)

      const depthReversal = reversals.find((r) => r.dimension === "depth")
      expect(depthReversal?.isReversal).toBe(true) // |0.8 - 0.3| = 0.5 ≥ 0.25
      expect(depthReversal?.delta).toBe(0.5)

      const lensReversal = reversals.find((r) => r.dimension === "lens")
      expect(lensReversal?.isReversal).toBe(false) // |0.3 - 0.35| = 0.05 < 0.25
    })

    it("커스텀 threshold 사용 가능", () => {
      const reversals = detectReversals({ depth: 0.6 }, { depth: 0.4 }, 0.1)
      expect(reversals[0].isReversal).toBe(true) // |0.6 - 0.4| = 0.2 ≥ 0.1
    })
  })

  describe("extractLatentTraits", () => {
    it("높은 명시적 특성 추출", () => {
      const traits = extractLatentTraits({ depth: 0.85 }, { depth: 0.5 })
      expect(traits.some((t) => t.name === "depth_high")).toBe(true)
    })

    it("숨은 암묵적 특성 추출", () => {
      const traits = extractLatentTraits({ depth: 0.3 }, { depth: 0.8 })
      expect(traits.some((t) => t.name === "depth_hidden")).toBe(true)
    })

    it("혼합 특성 추출", () => {
      const traits = extractLatentTraits({ lens: 0.65 }, { lens: 0.7 })
      expect(traits.some((t) => t.name === "lens_confirmed")).toBe(true)
    })
  })

  describe("createLatentTraitProfile", () => {
    it("종합 프로필 생성", () => {
      const profile = createLatentTraitProfile(
        "user_1",
        { depth: 0.9, lens: 0.3 },
        { depth: 0.4, lens: 0.8 }
      )

      expect(profile.userId).toBe("user_1")
      expect(profile.reversals.length).toBeGreaterThan(0)
      expect(profile.latentTraits.length).toBeGreaterThan(0)
      expect(profile.analyzedAt).toBeGreaterThan(0)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Progressive Profiling Tests
// ═══════════════════════════════════════════════════════════════

describe("Progressive Profiling", () => {
  describe("behaviorToSignals", () => {
    it("행동 이벤트를 피드백 신호로 변환", () => {
      const event: BehaviorEvent = {
        id: "e1",
        userId: "u1",
        type: "save",
        contentId: "c1",
        personaId: null,
        metadata: {},
        timestamp: Date.now(),
      }

      const signals = behaviorToSignals(event)
      expect(signals.length).toBeGreaterThan(0)
      expect(signals[0].source).toBe("save")
      expect(signals.some((s) => s.dimension === "purpose")).toBe(true)
    })

    it("8가지 행동 타입 모두 매핑됨", () => {
      const types = [
        "click",
        "save",
        "like",
        "dislike",
        "dwell",
        "search",
        "share",
        "skip",
      ] as const
      for (const type of types) {
        const event: BehaviorEvent = {
          id: "e",
          userId: "u",
          type,
          contentId: "c",
          personaId: null,
          metadata: {},
          timestamp: Date.now(),
        }
        const signals = behaviorToSignals(event)
        expect(signals.length).toBeGreaterThan(0)
      }
    })
  })

  describe("calculateDecay", () => {
    it("0일이면 감쇠 없음 (1.0)", () => {
      expect(calculateDecay(0)).toBe(1)
    })

    it("시간이 지날수록 감쇠", () => {
      const day1 = calculateDecay(1)
      const day10 = calculateDecay(10)
      const day30 = calculateDecay(30)

      expect(day1).toBeLessThan(1)
      expect(day10).toBeLessThan(day1)
      expect(day30).toBeLessThan(day10)
      expect(day30).toBeGreaterThan(0)
    })

    it("커스텀 lambda 적용", () => {
      const fast = calculateDecay(10, 0.1) // 빠른 감쇠
      const slow = calculateDecay(10, 0.01) // 느린 감쇠
      expect(fast).toBeLessThan(slow)
    })
  })

  describe("updateVector", () => {
    it("벡터를 업데이트", () => {
      const current = { depth: 0.5, lens: 0.5, taste: 0.5 }
      const signals = [{ dimension: "depth", delta: 0.1, weight: 0.5, source: "click" as const }]

      const result = updateVector(current, signals, 0)
      expect(result.updatedVector.depth).toBeGreaterThan(0.5) // 양의 delta
      expect(result.updatedVector.lens).toBe(0.5) // 변경 안됨
      expect(result.appliedSignals).toHaveLength(1)
    })

    it("존재하지 않는 차원은 무시", () => {
      const current = { depth: 0.5 }
      const signals = [
        { dimension: "nonexistent", delta: 0.5, weight: 1, source: "click" as const },
      ]

      const result = updateVector(current, signals, 0)
      expect(result.appliedSignals).toHaveLength(0)
    })

    it("감쇠가 적용됨", () => {
      const current = { depth: 0.5 }
      const signals = [{ dimension: "depth", delta: 0.3, weight: 1, source: "save" as const }]

      const fresh = updateVector(current, signals, 0)
      const old = updateVector(current, signals, 30)

      // 30일 전 이벤트는 더 약하게 반영
      const freshDiff = Math.abs(fresh.updatedVector.depth - 0.5)
      const oldDiff = Math.abs(old.updatedVector.depth - 0.5)
      expect(freshDiff).toBeGreaterThan(oldDiff)
    })

    it("0~1 범위 보장 (clamp)", () => {
      const high = { depth: 0.99 }
      const signals = [{ dimension: "depth", delta: 1, weight: 1, source: "save" as const }]

      const result = updateVector(high, signals, 0, 1)
      expect(result.updatedVector.depth).toBeLessThanOrEqual(1)
    })
  })

  describe("batchUpdateVector", () => {
    it("여러 이벤트를 순차 적용", () => {
      const now = Date.now()
      const events: BehaviorEvent[] = [
        {
          id: "e1",
          userId: "u1",
          type: "click",
          contentId: "c1",
          personaId: null,
          metadata: {},
          timestamp: now - 86400000, // 1일 전
        },
        {
          id: "e2",
          userId: "u1",
          type: "save",
          contentId: "c2",
          personaId: null,
          metadata: {},
          timestamp: now,
        },
      ]

      const current = { taste: 0.5, purpose: 0.5, depth: 0.5 }
      const result = batchUpdateVector(current, events, now)

      expect(result.appliedSignals.length).toBeGreaterThan(0)
      expect(result.previousVector).toEqual(current)
    })

    it("빈 이벤트 배열이면 decayFactor 1", () => {
      const result = batchUpdateVector({ depth: 0.5 }, [])
      expect(result.decayFactor).toBe(1)
      expect(result.updatedVector.depth).toBe(0.5)
    })
  })

  describe("shouldExplore", () => {
    it("0이면 항상 false", () => {
      expect(shouldExplore(0)).toBe(false)
    })

    it("1이면 항상 true", () => {
      expect(shouldExplore(1)).toBe(true)
    })
  })

  describe("Profile History", () => {
    it("히스토리 생성 및 스냅샷 추가", () => {
      let history = createProfileHistory("u1")
      expect(history.snapshots).toHaveLength(0)

      history = addSnapshot(history, { depth: 0.5 }, "초기화")
      expect(history.snapshots).toHaveLength(1)

      history = addSnapshot(history, { depth: 0.7 }, "업데이트")
      expect(history.snapshots).toHaveLength(2)
    })
  })

  describe("measureDrift", () => {
    it("스냅샷이 2개 미만이면 0", () => {
      const history = createProfileHistory("u1")
      expect(measureDrift(history)).toBe(0)
    })

    it("변화가 클수록 드리프트가 큼", () => {
      let small = createProfileHistory("u1")
      small = addSnapshot(small, { depth: 0.5, lens: 0.5 }, "시작")
      small = addSnapshot(small, { depth: 0.55, lens: 0.5 }, "조금 변경")

      let big = createProfileHistory("u2")
      big = addSnapshot(big, { depth: 0.5, lens: 0.5 }, "시작")
      big = addSnapshot(big, { depth: 0.9, lens: 0.9 }, "많이 변경")

      expect(measureDrift(big)).toBeGreaterThan(measureDrift(small))
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// User Archetype Tests
// ═══════════════════════════════════════════════════════════════

describe("User Archetype", () => {
  describe("BASE_ARCHETYPES", () => {
    it("10종 기본 아키타입이 정의됨", () => {
      expect(BASE_ARCHETYPES).toHaveLength(10)
    })

    it("각 아키타입에 7D 참조 벡터가 있음", () => {
      const dims: SocialDimension[] = [
        "depth",
        "lens",
        "stance",
        "scope",
        "taste",
        "purpose",
        "sociability",
      ]
      for (const archetype of BASE_ARCHETYPES) {
        for (const dim of dims) {
          expect(archetype.referenceVector[dim]).toBeDefined()
          expect(archetype.referenceVector[dim]).toBeGreaterThanOrEqual(0)
          expect(archetype.referenceVector[dim]).toBeLessThanOrEqual(1)
        }
      }
    })

    it("id가 고유함", () => {
      const ids = BASE_ARCHETYPES.map((a) => a.id)
      expect(new Set(ids).size).toBe(10)
    })
  })

  describe("euclideanDistance", () => {
    it("같은 벡터면 거리 0", () => {
      const v: Record<SocialDimension, number> = {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      }
      expect(euclideanDistance(v, v)).toBe(0)
    })

    it("다른 벡터면 양의 거리", () => {
      const a: Record<SocialDimension, number> = {
        depth: 0,
        lens: 0,
        stance: 0,
        scope: 0,
        taste: 0,
        purpose: 0,
        sociability: 0,
      }
      const b: Record<SocialDimension, number> = {
        depth: 1,
        lens: 1,
        stance: 1,
        scope: 1,
        taste: 1,
        purpose: 1,
        sociability: 1,
      }
      const dist = euclideanDistance(a, b)
      expect(dist).toBeGreaterThan(0)
    })
  })

  describe("matchThresholds", () => {
    it("조건 매칭", () => {
      const vector: Record<SocialDimension, number> = {
        depth: 0.8,
        lens: 0.9,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      }
      const analyst = BASE_ARCHETYPES.find((a) => a.id === "analyst")!
      const result = matchThresholds(vector, analyst.thresholds)
      expect(result.matched).toBe(2) // lens ≥ 0.7 ✓, depth ≥ 0.7 ✓
      expect(result.total).toBe(2)
    })

    it("빈 threshold면 0/0 반환", () => {
      const result = matchThresholds(
        {
          depth: 0.5,
          lens: 0.5,
          stance: 0.5,
          scope: 0.5,
          taste: 0.5,
          purpose: 0.5,
          sociability: 0.5,
        },
        []
      )
      expect(result.matched).toBe(0)
      expect(result.total).toBe(0)
    })
  })

  describe("classifyUser", () => {
    it("분석가 유형 벡터 → Analyst", () => {
      const vector: SocialPersonaVector = {
        depth: 0.85,
        lens: 0.9,
        stance: 0.6,
        scope: 0.8,
        taste: 0.4,
        purpose: 0.6,
        sociability: 0.3,
      }
      const result = classifyUser(vector)
      expect(result.primaryArchetype.archetypeId).toBe("analyst")
    })

    it("균형잡힌 벡터 → Balancer", () => {
      const vector: SocialPersonaVector = {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      }
      const result = classifyUser(vector)
      expect(result.primaryArchetype.archetypeId).toBe("balancer")
    })

    it("secondary 아키타입도 제공", () => {
      const vector: SocialPersonaVector = {
        depth: 0.8,
        lens: 0.8,
        stance: 0.7,
        scope: 0.7,
        taste: 0.3,
        purpose: 0.6,
        sociability: 0.3,
      }
      const result = classifyUser(vector)
      expect(result.secondaryArchetype).not.toBeNull()
    })

    it("allScores에 모든 아키타입 점수 포함", () => {
      const vector: SocialPersonaVector = {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      }
      const result = classifyUser(vector)
      // hybrid는 fallback이므로 스킵 → 9개
      expect(result.allScores.length).toBeGreaterThanOrEqual(9)
    })
  })

  describe("createUserArchetypeProfile", () => {
    it("userId가 설정됨", () => {
      const profile = createUserArchetypeProfile("user_42", {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      })
      expect(profile.userId).toBe("user_42")
    })
  })

  describe("Custom Archetype CRUD", () => {
    it("커스텀 아키타입 생성", () => {
      const custom = createCustomArchetype("Nerd", "너드", "테크와 과학 중시", {
        depth: 0.9,
        lens: 0.95,
        stance: 0.7,
        scope: 0.8,
        taste: 0.6,
        purpose: 0.7,
        sociability: 0.2,
      })
      expect(custom.isCustom).toBe(true)
      expect(custom.id).toMatch(/^custom_/)
    })

    it("아키타입 목록에 추가", () => {
      const custom = createCustomArchetype("Nerd", "너드", "테크 중시", {
        depth: 0.9,
        lens: 0.95,
        stance: 0.7,
        scope: 0.8,
        taste: 0.6,
        purpose: 0.7,
        sociability: 0.2,
      })
      const updated = addArchetype(BASE_ARCHETYPES, custom)
      expect(updated).toHaveLength(11)
    })

    it("중복 ID 추가 시 에러", () => {
      const dup = { ...BASE_ARCHETYPES[0] }
      expect(() => addArchetype(BASE_ARCHETYPES, dup)).toThrow("이미 존재")
    })

    it("아키타입 수정", () => {
      const updated = updateArchetype(BASE_ARCHETYPES, "analyst", { nameKo: "슈퍼 분석가" })
      const analyst = updated.find((a) => a.id === "analyst")
      expect(analyst?.nameKo).toBe("슈퍼 분석가")
    })

    it("존재하지 않는 아키타입 수정 시 에러", () => {
      expect(() => updateArchetype(BASE_ARCHETYPES, "nonexistent", { nameKo: "?" })).toThrow(
        "찾을 수 없습니다"
      )
    })

    it("커스텀 아키타입만 삭제 가능", () => {
      expect(() => removeArchetype(BASE_ARCHETYPES, "analyst")).toThrow(
        "기본 아키타입은 삭제할 수 없습니다"
      )

      const custom = createCustomArchetype("Test", "테스트", "테스트용", {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      })
      const withCustom = addArchetype(BASE_ARCHETYPES, custom)
      const removed = removeArchetype(withCustom, custom.id)
      expect(removed).toHaveLength(BASE_ARCHETYPES.length)
    })
  })

  describe("computeArchetypeStats", () => {
    it("아키타입별 통계 계산", () => {
      const profiles = [
        createUserArchetypeProfile("u1", {
          depth: 0.85,
          lens: 0.9,
          stance: 0.6,
          scope: 0.8,
          taste: 0.4,
          purpose: 0.6,
          sociability: 0.3,
        }),
        createUserArchetypeProfile("u2", {
          depth: 0.8,
          lens: 0.85,
          stance: 0.65,
          scope: 0.75,
          taste: 0.35,
          purpose: 0.55,
          sociability: 0.25,
        }),
      ]

      const stats = computeArchetypeStats(profiles)
      expect(stats.length).toBeGreaterThan(0)
      for (const s of stats) {
        expect(s.userCount).toBeGreaterThan(0)
        expect(s.avgConfidence).toBeGreaterThanOrEqual(0)
      }
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Adaptive Profiling Tests
// ═══════════════════════════════════════════════════════════════

describe("Adaptive Profiling", () => {
  describe("REWARD_TABLE", () => {
    it("5가지 보상 유형이 정의됨", () => {
      expect(Object.keys(REWARD_TABLE)).toHaveLength(5)
      expect(REWARD_TABLE.daily_complete.coins).toBe(2)
      expect(REWARD_TABLE.streak_7.coins).toBe(10)
      expect(REWARD_TABLE.streak_30.coins).toBe(50)
    })
  })

  describe("calculateAxisUncertainties", () => {
    it("모든 축에 대해 불확실도 계산", () => {
      const uncertainties = calculateAxisUncertainties({}, {}, {})
      // L1(7) + L2(5) = 12 axes
      expect(uncertainties).toHaveLength(12)
    })

    it("응답이 많을수록 불확실도 낮음", () => {
      const low = calculateAxisUncertainties({ depth: 0.8 }, { depth: 10 }, { depth: Date.now() })
      const high = calculateAxisUncertainties(
        { depth: 0.2 },
        { depth: 1 },
        { depth: Date.now() - 86400000 * 30 }
      )

      const lowDepth = low.find((u) => u.axis === "depth")!
      const highDepth = high.find((u) => u.axis === "depth")!
      expect(lowDepth.uncertainty).toBeLessThan(highDepth.uncertainty)
    })
  })

  describe("calculateExpectedInfoGain", () => {
    it("불확실한 축에 대한 질문이 높은 정보 이득", () => {
      const question: ColdStartQuestion = {
        id: "q1",
        text: "Q1",
        type: "forced_choice",
        targetDimension: "depth",
        targetLayer: "L1",
        options: [
          { id: "a", text: "A", vectorDelta: { depth: 0.3 } },
          { id: "b", text: "B", vectorDelta: { depth: -0.3 } },
        ],
        mode: "quick",
        order: 0,
      }

      const uncertainties = calculateAxisUncertainties({}, {}, {})
      const gain = calculateExpectedInfoGain(question, uncertainties)
      expect(gain).toBeGreaterThan(0)
    })
  })

  describe("selectNextQuestions", () => {
    it("미출제 질문 중 정보 이득 높은 것 선택", () => {
      const pool: ColdStartQuestion[] = [
        {
          id: "q1",
          text: "Q1",
          type: "forced_choice",
          targetDimension: "depth",
          targetLayer: "L1",
          options: [
            { id: "a", text: "A", vectorDelta: { depth: 0.3 } },
            { id: "b", text: "B", vectorDelta: { depth: -0.3 } },
          ],
          mode: "quick",
          order: 0,
        },
        {
          id: "q2",
          text: "Q2",
          type: "scenario",
          targetDimension: "lens",
          targetLayer: "L1",
          options: [
            { id: "c", text: "C", vectorDelta: { lens: 0.2 } },
            { id: "d", text: "D", vectorDelta: { lens: -0.2 } },
          ],
          mode: "quick",
          order: 1,
        },
      ]

      const uncertainties = calculateAxisUncertainties({}, {}, {})
      const selected = selectNextQuestions(pool, [], uncertainties, 2)
      expect(selected).toHaveLength(2)
      expect(selected[0].expectedInfoGain).toBeGreaterThanOrEqual(selected[1].expectedInfoGain)
    })

    it("이미 답한 질문은 제외", () => {
      const pool: ColdStartQuestion[] = [
        {
          id: "q1",
          text: "Q1",
          type: "forced_choice",
          targetDimension: "depth",
          targetLayer: "L1",
          options: [
            { id: "a", text: "A", vectorDelta: { depth: 0.3 } },
            { id: "b", text: "B", vectorDelta: { depth: -0.3 } },
          ],
          mode: "quick",
          order: 0,
        },
      ]

      const uncertainties = calculateAxisUncertainties({}, {}, {})
      const selected = selectNextQuestions(pool, ["q1"], uncertainties)
      expect(selected).toHaveLength(0)
    })
  })

  describe("Daily Check State", () => {
    it("데일리 체크 상태 생성", () => {
      const state = createDailyCheckState("u1")
      expect(state.userId).toBe("u1")
      expect(state.questionsAnswered).toBe(0)
      expect(state.questionsTarget).toBe(3)
      expect(state.completed).toBe(false)
    })

    it("답변 기록 시 카운트 증가", () => {
      let state = createDailyCheckState("u1")
      state = recordDailyAnswer(state)
      expect(state.questionsAnswered).toBe(1)
      expect(state.completed).toBe(false)

      state = recordDailyAnswer(state)
      state = recordDailyAnswer(state)
      expect(state.questionsAnswered).toBe(3)
      expect(state.completed).toBe(true)
    })
  })

  describe("calculateRewards", () => {
    it("미완료 시 보상 없음", () => {
      const state = createDailyCheckState("u1")
      expect(calculateRewards(state)).toHaveLength(0)
    })

    it("완료 시 기본 보상", () => {
      let state = createDailyCheckState("u1")
      state = recordDailyAnswer(state)
      state = recordDailyAnswer(state)
      state = recordDailyAnswer(state)

      const rewards = calculateRewards(state)
      expect(rewards.length).toBeGreaterThan(0)
      expect(rewards.some((r) => r.type === "daily_complete")).toBe(true)
    })

    it("3일 연속 시 streak 보상", () => {
      let state = createDailyCheckState("u1", 2) // 이미 2일 연속
      state = recordDailyAnswer(state)
      state = recordDailyAnswer(state)
      state = recordDailyAnswer(state)

      const rewards = calculateRewards(state)
      expect(rewards.some((r) => r.type === "streak_3")).toBe(true)
    })

    it("7일 연속 시 streak_7 보상", () => {
      let state = createDailyCheckState("u1", 6)
      state = recordDailyAnswer(state)
      state = recordDailyAnswer(state)
      state = recordDailyAnswer(state)

      const rewards = calculateRewards(state)
      expect(rewards.some((r) => r.type === "streak_7")).toBe(true)
    })
  })

  describe("applyRewards", () => {
    it("코인 잔액 증가 및 streak 업데이트", () => {
      let state = createDailyCheckState("u1", 0, 10)
      state = recordDailyAnswer(state)
      state = recordDailyAnswer(state)
      state = recordDailyAnswer(state)

      const rewards = calculateRewards(state)
      const updated = applyRewards(state, rewards)

      expect(updated.coinBalance).toBeGreaterThan(10)
      expect(updated.streak).toBe(1)
    })
  })

  describe("validateResponse", () => {
    const makeResponse = (overrides: Partial<UserResponseRecord> = {}): UserResponseRecord => ({
      questionId: "q1",
      selectedOptionId: "a",
      durationMs: 3000,
      axis: "depth",
      direction: 0.3,
      timestamp: Date.now(),
      isVerification: false,
      ...overrides,
    })

    it("정상 응답은 유효", () => {
      const result = validateResponse(makeResponse(), [])
      expect(result.valid).toBe(true)
      expect(result.weight).toBe(1)
    })

    it("1초 미만 응답은 too_fast", () => {
      const result = validateResponse(makeResponse({ durationMs: 500 }), [])
      expect(result.valid).toBe(false)
      expect(result.issues).toContain("too_fast")
      expect(result.weight).toBe(0.7)
    })

    it("연속 같은 선택은 same_pattern", () => {
      const recent = Array.from({ length: 4 }, () => makeResponse({ selectedOptionId: "a" }))
      const result = validateResponse(makeResponse({ selectedOptionId: "a" }), recent)
      expect(result.valid).toBe(false)
      expect(result.issues).toContain("same_pattern")
      expect(result.weight).toBe(0)
    })

    it("검증 질문에서 방향 불일치는 inconsistent", () => {
      const original = makeResponse({ direction: 0.5, axis: "depth", isVerification: false })
      const verification = makeResponse({ direction: -0.3, axis: "depth", isVerification: true })

      const result = validateResponse(verification, [original])
      expect(result.valid).toBe(false)
      expect(result.issues).toContain("inconsistent")
      expect(result.weight).toBe(0.5)
    })

    it("경고 메시지 제공", () => {
      const result = validateResponse(makeResponse({ durationMs: 200 }), [])
      expect(result.message).toBeTruthy()
    })
  })

  describe("calculateTrustScore", () => {
    const makeResponse = (overrides: Partial<UserResponseRecord> = {}): UserResponseRecord => ({
      questionId: "q1",
      selectedOptionId: "a",
      durationMs: 3000,
      axis: "depth",
      direction: 0.3,
      timestamp: Date.now(),
      isVerification: false,
      ...overrides,
    })

    it("정상 응답이면 높은 신뢰도", () => {
      const responses = Array.from({ length: 10 }, (_, i) =>
        makeResponse({
          questionId: `q${i}`,
          selectedOptionId: `o${i % 3}`,
          durationMs: 3000 + i * 100,
        })
      )
      const trust = calculateTrustScore("u1", responses)
      expect(trust.score).toBe(1)
      expect(trust.penalties).toHaveLength(0)
    })

    it("빠른 응답 4회 이상이면 페널티", () => {
      const responses = Array.from({ length: 5 }, (_, i) =>
        makeResponse({ questionId: `q${i}`, durationMs: 500 })
      )
      const trust = calculateTrustScore("u1", responses)
      expect(trust.score).toBeLessThan(1)
      expect(trust.penalties.some((p) => p.type === "too_fast")).toBe(true)
    })

    it("최소 0.5 보장", () => {
      // 모든 페널티 적용
      const responses = Array.from({ length: 10 }, (_, i) =>
        makeResponse({
          questionId: `q${i}`,
          selectedOptionId: "a", // 전부 같은 선택
          durationMs: 200, // 너무 빠름
          isVerification: i > 5,
          direction: i > 5 ? -0.5 : 0.5, // 불일치
        })
      )
      const trust = calculateTrustScore("u1", responses)
      expect(trust.score).toBeGreaterThanOrEqual(0.5)
    })
  })
})
