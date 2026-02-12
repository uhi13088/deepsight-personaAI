// ═══════════════════════════════════════════════════════════════
// Matching Lab Tests
// T57-AC6: ThreeTier/Simulator/Tuning/Guardrails/Scenario
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  CrossAxisProfile,
  ParadoxProfile,
  VFinalResult,
} from "@/types"

// ── Three-Tier Engine ────────────────────────────────────────

import {
  calculateBasicScore,
  calculateAdvancedScore,
  calculateExplorationScore,
  calculateCrossAxisSimilarity,
  calculateCrossAxisDivergence,
  calculateParadoxCompatibility,
  calculateParadoxDiversity,
  calculateFreshness,
  generateExplanation,
  matchPersona,
  matchAll,
  DEFAULT_MATCHING_CONFIG,
} from "@/lib/matching/three-tier-engine"
import type { PersonaCandidate, UserProfile } from "@/lib/matching/three-tier-engine"

// ── Simulator ────────────────────────────────────────────────

import {
  createManualVirtualUser,
  createRandomVirtualUser,
  calculateBatchStats,
  generateDimensionExplanations,
} from "@/lib/matching/simulator"
import type { SimulationRun } from "@/lib/matching/simulator"

// ── Tuning ───────────────────────────────────────────────────

import {
  DEFAULT_HYPERPARAMETERS,
  DEFAULT_GENRE_WEIGHTS,
  createTuningProfile,
  updateParameter,
  updateGenreWeight,
  addGenre,
  removeGenre,
  createTuningExperiment,
  startExperiment,
  recordExperimentIteration,
  failExperiment,
  generateGridSearchCombinations,
  applyGenreWeights,
} from "@/lib/matching/tuning"

// ── Guardrails ───────────────────────────────────────────────

import {
  createMatchingABTest,
  startMatchingABTest,
  pauseMatchingABTest,
  completeMatchingABTest,
  rollbackMatchingABTest,
  checkGuardrails,
  evaluateABTestResult,
  shouldAutoRollback,
  DEFAULT_GUARDRAIL_CONFIG,
} from "@/lib/matching/guardrails"
import type { ABTestMetrics } from "@/lib/matching/guardrails"

// ── Scenario ─────────────────────────────────────────────────

import {
  createScenario,
  updateScenario,
  saveResults,
  generateShareToken,
  addSharedUser,
  removeSharedUser,
  revokeShareToken,
  toListItem,
  duplicateScenario,
  validateScenario,
} from "@/lib/matching/scenario"

// ── 공통 테스트 데이터 ───────────────────────────────────────

const sampleL1: SocialPersonaVector = {
  depth: 0.7,
  lens: 0.8,
  stance: 0.6,
  scope: 0.7,
  taste: 0.4,
  purpose: 0.6,
  sociability: 0.3,
}

const sampleL2: CoreTemperamentVector = {
  openness: 0.7,
  conscientiousness: 0.6,
  extraversion: 0.4,
  agreeableness: 0.5,
  neuroticism: 0.3,
}

const sampleL3: NarrativeDriveVector = {
  lack: 0.4,
  moralCompass: 0.6,
  volatility: 0.3,
  growthArc: 0.7,
}

function makeCrossAxisProfile(): CrossAxisProfile {
  return {
    axes: Array.from({ length: 83 }, (_, i) => ({
      axisId: `axis_${i}`,
      type: i < 35 ? ("L1xL2" as const) : i < 63 ? ("L1xL3" as const) : ("L2xL3" as const),
      relationship: i % 4 === 0 ? ("paradox" as const) : ("reinforcing" as const),
      score: 0.3 + (i % 7) * 0.1,
      dimA: { layer: "L1" as const, key: "depth", value: 0.5 },
      dimB: { layer: "L2" as const, key: "openness", value: 0.6 },
      interpretation: "test",
    })),
    byType: {
      l1l2: [],
      l1l3: [],
      l2l3: [],
    },
    summary: {
      paradoxCount: 5,
      reinforcingCount: 10,
      modulatingIntensity: 0.4,
      dominantRelationship: "reinforcing",
      characterComplexity: 0.5,
    },
  }
}

function makeParadoxProfile(overall: number = 0.35): ParadoxProfile {
  return {
    l1l2: overall,
    l1l3: 0.2,
    l2l3: 0.1,
    overall,
    dimensionality: 0.8,
    dominant: { layer: "L1xL2", score: overall },
  }
}

function makeVFinalResult(): VFinalResult {
  return {
    vector: [0.7, 0.8, 0.6, 0.7, 0.4, 0.6, 0.3],
    pressure: 0.2,
    layerContributions: { l1Weight: 0.8, l2Weight: 0.12, l3Weight: 0.08 },
    l2Projected: [0.5, 0.6, 0.4, 0.5, 0.3, 0.5, 0.4],
    l3Projected: [0.4, 0.5, 0.3, 0.6, 0.3, 0.7, 0.3],
  }
}

function makeUserProfile(): UserProfile {
  return {
    id: "user_1",
    l1: sampleL1,
    l2: sampleL2,
    l3: sampleL3,
    vFinal: makeVFinalResult(),
    crossAxisProfile: makeCrossAxisProfile(),
    paradoxProfile: makeParadoxProfile(),
    recentPersonaIds: [],
  }
}

function makePersonaCandidate(
  id: string,
  override?: Partial<SocialPersonaVector>
): PersonaCandidate {
  return {
    id,
    name: `Persona ${id}`,
    l1: { ...sampleL1, ...override },
    l2: sampleL2,
    l3: sampleL3,
    crossAxisProfile: makeCrossAxisProfile(),
    paradoxProfile: makeParadoxProfile(),
  }
}

// ═══════════════════════════════════════════════════════════════
// Three-Tier Engine Tests
// ═══════════════════════════════════════════════════════════════

describe("Three-Tier Engine", () => {
  describe("calculateBasicScore", () => {
    it("동일 벡터면 높은 점수", () => {
      const v = [0.7, 0.8, 0.6, 0.7, 0.4, 0.6, 0.3]
      const cap = makeCrossAxisProfile()
      const { score } = calculateBasicScore(v, v, cap, cap)
      expect(score).toBeGreaterThan(0.8)
    })

    it("다른 벡터면 상대적으로 낮은 점수", () => {
      // 직교에 가까운 벡터 사용 (코사인 유사도가 낮으려면 방향이 달라야 함)
      const a = [0.9, 0.1, 0.9, 0.1, 0.9, 0.1, 0.9]
      const b = [0.1, 0.9, 0.1, 0.9, 0.1, 0.9, 0.1]
      const cap = makeCrossAxisProfile()
      const { score } = calculateBasicScore(a, b, cap, cap)
      const { score: sameScore } = calculateBasicScore(a, a, cap, cap)
      expect(score).toBeLessThan(sameScore)
    })

    it("breakdown 포함", () => {
      const v = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
      const cap = makeCrossAxisProfile()
      const { breakdown } = calculateBasicScore(v, v, cap, cap)
      expect(breakdown.vectorScore).toBeGreaterThan(0)
      expect(breakdown.paradoxCompatibility).toBe(0) // Basic에는 없음
    })
  })

  describe("calculateAdvancedScore", () => {
    it("역설 호환성 포함", () => {
      const v = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
      const cap = makeCrossAxisProfile()
      const eps = makeParadoxProfile()
      const { breakdown } = calculateAdvancedScore(v, v, cap, cap, eps, eps)
      expect(breakdown.paradoxCompatibility).toBeGreaterThan(0)
    })
  })

  describe("calculateExplorationScore", () => {
    it("다양성 기반 점수 (차이가 클수록 높음)", () => {
      const cap = makeCrossAxisProfile()
      const userEPS = makeParadoxProfile(0.2)
      const personaEPS = makeParadoxProfile(0.8)
      const { score } = calculateExplorationScore(cap, cap, userEPS, personaEPS, [], "p1")
      expect(score).toBeGreaterThan(0)
    })

    it("최근 본 페르소나면 신선도 낮음", () => {
      const cap = makeCrossAxisProfile()
      const eps = makeParadoxProfile()
      const { breakdown: fresh } = calculateExplorationScore(cap, cap, eps, eps, [], "p1")
      const { breakdown: stale } = calculateExplorationScore(cap, cap, eps, eps, ["p1"], "p1")
      expect(fresh.qualitativeBonus).toBeGreaterThan(stale.qualitativeBonus)
    })
  })

  describe("Utility Functions", () => {
    it("calculateParadoxCompatibility: 같으면 1", () => {
      const eps = makeParadoxProfile(0.5)
      expect(calculateParadoxCompatibility(eps, eps)).toBe(1)
    })

    it("calculateParadoxDiversity: 같으면 0", () => {
      const eps = makeParadoxProfile(0.5)
      expect(calculateParadoxDiversity(eps, eps)).toBe(0)
    })

    it("calculateFreshness: 새 페르소나면 1", () => {
      expect(calculateFreshness("p_new", [], undefined, [])).toBe(1)
    })

    it("calculateFreshness: 최근 본 것이면 감점", () => {
      expect(calculateFreshness("p1", ["p1"], undefined, [])).toBe(0.5)
    })

    it("generateExplanation: 비어있지 않은 설명", () => {
      const breakdown = {
        vectorScore: 0.8,
        crossAxisScore: 0.7,
        paradoxCompatibility: 0,
        qualitativeBonus: 0,
      }
      const ex = generateExplanation("basic", breakdown, sampleL1, sampleL1)
      expect(ex.length).toBeGreaterThan(0)
    })
  })

  describe("matchPersona", () => {
    it("basic tier로 매칭", () => {
      const user = makeUserProfile()
      const persona = makePersonaCandidate("p1")
      const result = matchPersona(user, persona, "basic")
      expect(result.tier).toBe("basic")
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.personaId).toBe("p1")
    })

    it("advanced tier로 매칭", () => {
      const user = makeUserProfile()
      const persona = makePersonaCandidate("p2")
      const result = matchPersona(user, persona, "advanced")
      expect(result.tier).toBe("advanced")
    })

    it("exploration tier로 매칭", () => {
      const user = makeUserProfile()
      const persona = makePersonaCandidate("p3")
      const result = matchPersona(user, persona, "exploration")
      expect(result.tier).toBe("exploration")
    })
  })

  describe("matchAll", () => {
    it("여러 페르소나에서 추천 목록 생성", () => {
      const user = makeUserProfile()
      const personas = [
        makePersonaCandidate("p1"),
        makePersonaCandidate("p2", { taste: 0.9 }),
        makePersonaCandidate("p3", { depth: 0.2 }),
      ]
      const results = matchAll(user, personas)
      expect(results.length).toBeGreaterThan(0)
      expect(results.length).toBeLessThanOrEqual(DEFAULT_MATCHING_CONFIG.topN + 3) // 중복 제거 후
    })

    it("중복 페르소나 제거", () => {
      const user = makeUserProfile()
      const personas = [makePersonaCandidate("p1")]
      const results = matchAll(user, personas)
      const personaIds = results.map((r) => r.personaId)
      expect(new Set(personaIds).size).toBe(personaIds.length)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Simulator Tests
// ═══════════════════════════════════════════════════════════════

describe("Simulator", () => {
  describe("Virtual User Creation", () => {
    it("수동 생성", () => {
      const vu = createManualVirtualUser("테스트", sampleL1, sampleL2, sampleL3, "analyst")
      expect(vu.source).toBe("manual")
      expect(vu.archetype).toBe("analyst")
      expect(vu.l1.depth).toBe(0.7)
    })

    it("랜덤 생성", () => {
      const vu = createRandomVirtualUser()
      expect(vu.source).toBe("random")
      expect(vu.l1.depth).toBeGreaterThanOrEqual(0)
      expect(vu.l1.depth).toBeLessThanOrEqual(1)
    })
  })

  describe("calculateBatchStats", () => {
    it("빈 배열이면 기본값", () => {
      const stats = calculateBatchStats([])
      expect(stats.totalUsers).toBe(0)
      expect(stats.avgMatchScore).toBe(0)
    })

    it("통계 계산", () => {
      const runs: SimulationRun[] = [
        {
          id: "r1",
          virtualUser: createRandomVirtualUser(),
          results: [],
          topPersonaId: "p1",
          topScore: 0.8,
          avgScore: 0.6,
          timestamp: Date.now(),
        },
        {
          id: "r2",
          virtualUser: createRandomVirtualUser(),
          results: [],
          topPersonaId: "p2",
          topScore: 0.3,
          avgScore: 0.2,
          timestamp: Date.now(),
        },
        {
          id: "r3",
          virtualUser: createRandomVirtualUser(),
          results: [],
          topPersonaId: "p1",
          topScore: 0.7,
          avgScore: 0.5,
          timestamp: Date.now(),
        },
      ]

      const stats = calculateBatchStats(runs)
      expect(stats.totalUsers).toBe(3)
      expect(stats.avgMatchScore).toBeGreaterThan(0)
      expect(stats.failureRate).toBeGreaterThan(0) // 0.3 < 0.5
      expect(stats.topPersonaDistribution.length).toBeGreaterThan(0)
      expect(stats.scoreDistribution.buckets.length).toBe(5)
    })
  })

  describe("generateDimensionExplanations", () => {
    it("7개 차원별 설명 생성", () => {
      const explanations = generateDimensionExplanations(sampleL1, sampleL1)
      expect(explanations).toHaveLength(7)
      expect(explanations[0].similarity).toBe(1) // 같은 벡터이므로
    })

    it("유사도 순 정렬", () => {
      const other: SocialPersonaVector = {
        depth: 0.2,
        lens: 0.8,
        stance: 0.9,
        scope: 0.1,
        taste: 0.4,
        purpose: 0.6,
        sociability: 0.3,
      }
      const explanations = generateDimensionExplanations(sampleL1, other)
      for (let i = 1; i < explanations.length; i++) {
        expect(explanations[i - 1].similarity).toBeGreaterThanOrEqual(explanations[i].similarity)
      }
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Tuning Tests
// ═══════════════════════════════════════════════════════════════

describe("Tuning", () => {
  describe("DEFAULT_HYPERPARAMETERS", () => {
    it("6개 파라미터 정의", () => {
      expect(DEFAULT_HYPERPARAMETERS).toHaveLength(6)
    })
  })

  describe("DEFAULT_GENRE_WEIGHTS", () => {
    it("6개 장르 정의", () => {
      expect(DEFAULT_GENRE_WEIGHTS).toHaveLength(6)
    })

    it("각 장르에 7D 가중치가 있음", () => {
      for (const g of DEFAULT_GENRE_WEIGHTS) {
        expect(Object.keys(g.weights)).toHaveLength(7)
      }
    })
  })

  describe("createTuningProfile", () => {
    it("프로필 생성", () => {
      const profile = createTuningProfile("테스트")
      expect(profile.name).toBe("테스트")
      expect(profile.parameters).toHaveLength(6)
      expect(profile.genreWeights).toHaveLength(6)
    })
  })

  describe("updateParameter", () => {
    it("파라미터 업데이트", () => {
      const profile = createTuningProfile("테스트")
      const updated = updateParameter(profile, "top_n", 10)
      const param = updated.parameters.find((p) => p.key === "top_n")
      expect(param?.value).toBe(10)
    })

    it("범위 클램핑", () => {
      const profile = createTuningProfile("테스트")
      const updated = updateParameter(profile, "top_n", 999)
      const param = updated.parameters.find((p) => p.key === "top_n")
      expect(param?.value).toBe(20) // max
    })

    it("존재하지 않는 파라미터 시 에러", () => {
      const profile = createTuningProfile("테스트")
      expect(() => updateParameter(profile, "nonexistent", 1)).toThrow("찾을 수 없습니다")
    })
  })

  describe("updateGenreWeight", () => {
    it("장르 가중치 업데이트", () => {
      const profile = createTuningProfile("테스트")
      const updated = updateGenreWeight(profile, "thriller", "depth", 1.5)
      const thriller = updated.genreWeights.find((g) => g.genre === "thriller")
      expect(thriller?.weights.depth).toBe(1.5)
    })
  })

  describe("addGenre / removeGenre", () => {
    it("장르 추가", () => {
      const profile = createTuningProfile("테스트")
      const updated = addGenre(profile, "horror")
      expect(updated.genreWeights).toHaveLength(7)
    })

    it("중복 장르 추가 시 에러", () => {
      const profile = createTuningProfile("테스트")
      expect(() => addGenre(profile, "thriller")).toThrow("이미 존재")
    })

    it("장르 삭제", () => {
      const profile = createTuningProfile("테스트")
      const updated = removeGenre(profile, "thriller")
      expect(updated.genreWeights).toHaveLength(5)
    })
  })

  describe("Tuning Experiment", () => {
    it("실험 생성 및 시작", () => {
      const exp = createTuningExperiment("tp_1", "grid_search", [
        { key: "top_n", values: [3, 5, 10] },
      ])
      expect(exp.status).toBe("pending")

      const started = startExperiment(exp)
      expect(started.status).toBe("running")
    })

    it("이터레이션 기록 및 완료", () => {
      let exp = createTuningExperiment("tp_1", "bayesian", [], 3)
      exp = startExperiment(exp)

      exp = recordExperimentIteration(exp, DEFAULT_HYPERPARAMETERS, 0.7)
      expect(exp.iterations).toBe(1)
      expect(exp.bestScore).toBe(0.7)

      exp = recordExperimentIteration(exp, DEFAULT_HYPERPARAMETERS, 0.8)
      expect(exp.bestScore).toBe(0.8)

      exp = recordExperimentIteration(exp, DEFAULT_HYPERPARAMETERS, 0.6)
      expect(exp.status).toBe("completed") // maxIterations = 3
      expect(exp.bestScore).toBe(0.8) // 여전히 0.8이 최고
    })

    it("실패 처리", () => {
      let exp = createTuningExperiment("tp_1", "grid_search", [])
      exp = startExperiment(exp)
      exp = failExperiment(exp)
      expect(exp.status).toBe("failed")
    })
  })

  describe("generateGridSearchCombinations", () => {
    it("조합 생성", () => {
      const combos = generateGridSearchCombinations([
        { key: "a", values: [1, 2] },
        { key: "b", values: [10, 20] },
      ])
      expect(combos).toHaveLength(4) // 2 × 2
      expect(combos).toContainEqual({ a: 1, b: 10 })
      expect(combos).toContainEqual({ a: 2, b: 20 })
    })

    it("빈 공간이면 빈 조합", () => {
      const combos = generateGridSearchCombinations([])
      expect(combos).toHaveLength(1)
    })
  })

  describe("applyGenreWeights", () => {
    it("장르 가중치 적용", () => {
      const vector = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
      const result = applyGenreWeights(vector, "thriller", DEFAULT_GENRE_WEIGHTS)
      expect(result[0]).toBeCloseTo(0.5 * 1.2) // depth * 1.2
    })

    it("없는 장르면 원본 반환", () => {
      const vector = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
      const result = applyGenreWeights(vector, "nonexistent", DEFAULT_GENRE_WEIGHTS)
      expect(result).toEqual(vector)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Guardrails Tests
// ═══════════════════════════════════════════════════════════════

describe("Guardrails", () => {
  describe("createMatchingABTest", () => {
    it("테스트 설정 생성", () => {
      const test = createMatchingABTest(
        "Tier 비교",
        "tier",
        "Basic vs Advanced",
        "Basic",
        "Advanced"
      )
      expect(test.status).toBe("draft")
      expect(test.type).toBe("tier")
      expect(test.trafficSplit).toEqual([50, 50])
    })

    it("트래픽 합 != 100이면 에러", () => {
      expect(() => createMatchingABTest("Test", "tier", "", "A", "B", [60, 60])).toThrow(
        "100이 아닙니다"
      )
    })
  })

  describe("State Transitions", () => {
    it("draft → running → paused → running → completed", () => {
      let test = createMatchingABTest("Test", "tier", "", "A", "B")
      test = startMatchingABTest(test)
      expect(test.status).toBe("running")

      test = pauseMatchingABTest(test)
      expect(test.status).toBe("paused")

      test = startMatchingABTest(test) // resume
      expect(test.status).toBe("running")

      test = completeMatchingABTest(test)
      expect(test.status).toBe("completed")
    })

    it("running → rolled_back", () => {
      let test = createMatchingABTest("Test", "tier", "", "A", "B")
      test = startMatchingABTest(test)
      test = rollbackMatchingABTest(test)
      expect(test.status).toBe("rolled_back")
    })

    it("잘못된 상태 전환 시 에러", () => {
      const test = createMatchingABTest("Test", "tier", "", "A", "B")
      expect(() => pauseMatchingABTest(test)).toThrow()
      expect(() => completeMatchingABTest(test)).toThrow()
    })
  })

  describe("checkGuardrails", () => {
    const safeMetrics: ABTestMetrics = {
      controlSamples: 100,
      treatmentSamples: 100,
      controlSatisfaction: 0.8,
      treatmentSatisfaction: 0.75,
      controlErrorRate: 0.02,
      treatmentErrorRate: 0.03,
      controlCtr: 0.1,
      treatmentCtr: 0.12,
      dimensionMetrics: [],
    }

    it("안전한 메트릭이면 safe", () => {
      const result = checkGuardrails(safeMetrics)
      expect(result.safe).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it("만족도 대폭 하락 시 violation", () => {
      const badMetrics: ABTestMetrics = {
        ...safeMetrics,
        treatmentSatisfaction: 0.5, // 0.8 → 0.5 = 37.5% 하락
      }
      const result = checkGuardrails(badMetrics)
      expect(result.violations.some((v) => v.type === "satisfaction_drop")).toBe(true)
    })

    it("에러율 급증 시 violation", () => {
      const badMetrics: ABTestMetrics = {
        ...safeMetrics,
        treatmentErrorRate: 0.1, // 0.02 → 0.1 = 5배
      }
      const result = checkGuardrails(badMetrics)
      expect(result.violations.some((v) => v.type === "error_spike")).toBe(true)
    })
  })

  describe("evaluateABTestResult", () => {
    it("treatment이 우수하면 treatment 승리", () => {
      const metrics: ABTestMetrics = {
        controlSamples: 100,
        treatmentSamples: 100,
        controlSatisfaction: 0.7,
        treatmentSatisfaction: 0.75,
        controlErrorRate: 0.02,
        treatmentErrorRate: 0.01,
        controlCtr: 0.08,
        treatmentCtr: 0.12,
        dimensionMetrics: [
          {
            dimension: "depth",
            controlValue: 70,
            treatmentValue: 80,
            diff: 10,
            pValue: 0.03,
            significant: true,
          },
          {
            dimension: "lens",
            controlValue: 75,
            treatmentValue: 78,
            diff: 3,
            pValue: 0.4,
            significant: false,
          },
        ],
      }

      const verdict = evaluateABTestResult(metrics)
      expect(verdict.winner).toBe("treatment")
    })

    it("샘플 부족 시 inconclusive", () => {
      const metrics: ABTestMetrics = {
        controlSamples: 10,
        treatmentSamples: 10,
        controlSatisfaction: 0.7,
        treatmentSatisfaction: 0.75,
        controlErrorRate: 0.02,
        treatmentErrorRate: 0.01,
        controlCtr: 0.08,
        treatmentCtr: 0.12,
        dimensionMetrics: [],
      }

      const verdict = evaluateABTestResult(metrics)
      expect(verdict.winner).toBe("inconclusive")
    })
  })

  describe("shouldAutoRollback", () => {
    it("critical violation이면 true", () => {
      expect(
        shouldAutoRollback({
          safe: false,
          violations: [
            {
              type: "satisfaction_drop",
              severity: "critical",
              message: "",
              value: 0.4,
              threshold: 0.2,
            },
          ],
          checkedAt: Date.now(),
        })
      ).toBe(true)
    })

    it("warning만이면 false", () => {
      expect(
        shouldAutoRollback({
          safe: true,
          violations: [
            {
              type: "satisfaction_drop",
              severity: "warning",
              message: "",
              value: 0.22,
              threshold: 0.2,
            },
          ],
          checkedAt: Date.now(),
        })
      ).toBe(false)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Scenario Tests
// ═══════════════════════════════════════════════════════════════

describe("Scenario", () => {
  const baseScenario = () =>
    createScenario(
      "테스트 시나리오",
      "설명",
      "user_1",
      {
        l1: sampleL1,
        l2: sampleL2,
        l3: sampleL3,
        archetype: "analyst",
      },
      { tier: "basic", parameters: { top_n: 5 } }
    )

  describe("createScenario", () => {
    it("시나리오 생성", () => {
      const sc = baseScenario()
      expect(sc.id).toMatch(/^sc_/)
      expect(sc.name).toBe("테스트 시나리오")
      expect(sc.results).toBeNull()
      expect(sc.shareToken).toBeNull()
    })
  })

  describe("updateScenario", () => {
    it("이름 변경", () => {
      const sc = baseScenario()
      const updated = updateScenario(sc, { name: "수정됨" })
      expect(updated.name).toBe("수정됨")
    })
  })

  describe("saveResults", () => {
    it("결과 저장", () => {
      const sc = baseScenario()
      const results = [
        {
          personaId: "p1",
          score: 0.8,
          tier: "basic" as const,
          breakdown: {
            vectorScore: 0.8,
            crossAxisScore: 0.7,
            paradoxCompatibility: 0,
            qualitativeBonus: 0,
          },
          explanation: "test",
        },
      ]
      const updated = saveResults(sc, results)
      expect(updated.results).toHaveLength(1)
    })
  })

  describe("Sharing", () => {
    it("공유 토큰 생성", () => {
      const sc = baseScenario()
      const shared = generateShareToken(sc)
      expect(shared.shareToken).toMatch(/^share_/)
    })

    it("유저 추가/삭제", () => {
      let sc = baseScenario()
      sc = addSharedUser(sc, "user_2")
      expect(sc.sharedWith).toContain("user_2")

      sc = removeSharedUser(sc, "user_2")
      expect(sc.sharedWith).not.toContain("user_2")
    })

    it("중복 추가 방지", () => {
      let sc = baseScenario()
      sc = addSharedUser(sc, "user_2")
      sc = addSharedUser(sc, "user_2")
      expect(sc.sharedWith.filter((id) => id === "user_2")).toHaveLength(1)
    })

    it("토큰 취소", () => {
      let sc = baseScenario()
      sc = generateShareToken(sc)
      sc = revokeShareToken(sc)
      expect(sc.shareToken).toBeNull()
    })
  })

  describe("toListItem", () => {
    it("목록 변환", () => {
      const sc = baseScenario()
      const item = toListItem(sc)
      expect(item.name).toBe("테스트 시나리오")
      expect(item.isShared).toBe(false)
    })
  })

  describe("duplicateScenario", () => {
    it("시나리오 복제", () => {
      const sc = baseScenario()
      const dup = duplicateScenario(sc, "user_2")
      expect(dup.id).not.toBe(sc.id)
      expect(dup.name).toBe("테스트 시나리오 (복사본)")
      expect(dup.createdBy).toBe("user_2")
      expect(dup.results).toBeNull()
    })
  })

  describe("validateScenario", () => {
    it("유효한 시나리오", () => {
      const sc = baseScenario()
      const { valid } = validateScenario(sc)
      expect(valid).toBe(true)
    })

    it("이름이 비어있으면 invalid", () => {
      const sc = baseScenario()
      const invalid = updateScenario(sc, { name: "  " })
      const { valid, errors } = validateScenario(invalid)
      expect(valid).toBe(false)
      expect(errors.some((e) => e.includes("이름"))).toBe(true)
    })
  })
})
