// ═══════════════════════════════════════════════════════════════
// Matching Lab UI — Page Integration Tests
// T97: Simulator + Tuning + Analytics UI 로직 검증
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── Simulator 관련 테스트 ─────────────────────────────────────

import {
  createManualVirtualUser,
  createRandomVirtualUser,
  generateDimensionExplanations,
  calculateBatchStats,
} from "@/lib/matching/simulator"
import type { SimulationRun } from "@/lib/matching/simulator"
import { matchAll, DEFAULT_MATCHING_CONFIG } from "@/lib/matching/three-tier-engine"
import type { UserProfile, PersonaCandidate } from "@/lib/matching/three-tier-engine"
import { calculateVFinal } from "@/lib/vector/v-final"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"

// ── Tuning 관련 테스트 ────────────────────────────────────────

import {
  createTuningProfile,
  updateParameter,
  updateGenreWeight,
  addGenre,
  removeGenre,
  createTuningExperiment,
  startExperiment,
  generateGridSearchCombinations,
  DEFAULT_HYPERPARAMETERS,
  DEFAULT_GENRE_WEIGHTS,
} from "@/lib/matching/tuning"

// ── Guardrails/A/B Test 테스트 ────────────────────────────────

import {
  createMatchingABTest,
  startMatchingABTest,
  pauseMatchingABTest,
  completeMatchingABTest,
  rollbackMatchingABTest,
  evaluateABTestResult,
  checkGuardrails,
  DEFAULT_GUARDRAIL_CONFIG,
} from "@/lib/matching/guardrails"
import type { ABTestMetrics } from "@/lib/matching/guardrails"

// ── Analytics 테스트 ──────────────────────────────────────────

import {
  calculateMatchingKPIs,
  calculateDiversityIndex,
  analyzeTrend,
  calculateChangeRate,
  detectAnomalies,
  KPI_TARGETS,
} from "@/lib/matching/analytics"
import type { RawMatchingData, MatchingKPIs, TimeSeriesPoint } from "@/lib/matching/analytics"
import { generateRecommendations, kpisToCsvRows, csvRowsToString } from "@/lib/matching/report"

// ── 헬퍼 ──────────────────────────────────────────────────────

const sampleL1: SocialPersonaVector = {
  depth: 0.7,
  lens: 0.6,
  stance: 0.5,
  scope: 0.8,
  taste: 0.4,
  purpose: 0.6,
  sociability: 0.5,
}
const sampleL2: CoreTemperamentVector = {
  openness: 0.7,
  conscientiousness: 0.6,
  extraversion: 0.5,
  agreeableness: 0.6,
  neuroticism: 0.4,
}
const sampleL3: NarrativeDriveVector = {
  lack: 0.3,
  moralCompass: 0.5,
  volatility: 0.3,
  growthArc: 0.6,
}

function buildSampleUserProfile(): UserProfile {
  const vFinal = calculateVFinal(sampleL1, sampleL2, sampleL3)
  const crossAxisProfile = calculateCrossAxisProfile(sampleL1, sampleL2, sampleL3)
  const paradoxProfile = calculateExtendedParadoxScore(sampleL1, sampleL2, sampleL3)
  return {
    id: "test_user",
    l1: sampleL1,
    l2: sampleL2,
    l3: sampleL3,
    vFinal,
    crossAxisProfile,
    paradoxProfile,
  }
}

function buildSamplePersonas(): PersonaCandidate[] {
  const presets: Array<{
    name: string
    l1: SocialPersonaVector
    l2: CoreTemperamentVector
    l3: NarrativeDriveVector
  }> = [
    {
      name: "분석가",
      l1: {
        depth: 0.9,
        lens: 0.8,
        stance: 0.7,
        scope: 0.85,
        taste: 0.4,
        purpose: 0.8,
        sociability: 0.3,
      },
      l2: {
        openness: 0.7,
        conscientiousness: 0.9,
        extraversion: 0.3,
        agreeableness: 0.5,
        neuroticism: 0.4,
      },
      l3: { lack: 0.3, moralCompass: 0.7, volatility: 0.2, growthArc: 0.6 },
    },
    {
      name: "큐레이터",
      l1: {
        depth: 0.5,
        lens: 0.5,
        stance: 0.4,
        scope: 0.6,
        taste: 0.9,
        purpose: 0.5,
        sociability: 0.8,
      },
      l2: {
        openness: 0.9,
        conscientiousness: 0.5,
        extraversion: 0.8,
        agreeableness: 0.7,
        neuroticism: 0.3,
      },
      l3: { lack: 0.2, moralCompass: 0.4, volatility: 0.5, growthArc: 0.7 },
    },
  ]

  return presets.map((p, i) => {
    const crossAxisProfile = calculateCrossAxisProfile(p.l1, p.l2, p.l3)
    const paradoxProfile = calculateExtendedParadoxScore(p.l1, p.l2, p.l3)
    return {
      id: `persona_${i}`,
      name: p.name,
      l1: p.l1,
      l2: p.l2,
      l3: p.l3,
      crossAxisProfile,
      paradoxProfile,
    }
  })
}

// ═══════════════════════════════════════════════════════════════
// Simulator Page 로직
// ═══════════════════════════════════════════════════════════════

describe("Simulator Page Logic", () => {
  describe("유저 벡터 → 매칭 실행", () => {
    it("단일 매칭 실행 시 결과를 반환해야 한다", () => {
      const user = buildSampleUserProfile()
      const personas = buildSamplePersonas()
      const results = matchAll(user, personas)

      expect(results.length).toBeGreaterThan(0)
      results.forEach((r) => {
        expect(r.score).toBeGreaterThanOrEqual(0)
        expect(r.score).toBeLessThanOrEqual(1)
        expect(["basic", "advanced", "exploration"]).toContain(r.tier)
        expect(r.personaId).toBeTruthy()
        expect(r.explanation).toBeTruthy()
      })
    })

    it("결과는 점수 순으로 정렬 가능해야 한다", () => {
      const user = buildSampleUserProfile()
      const personas = buildSamplePersonas()
      const results = matchAll(user, personas)
      results.sort((a, b) => b.score - a.score)

      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score)
      }
    })

    it("breakdown이 벡터/교차축/역설/보정 4개 항목을 포함해야 한다", () => {
      const user = buildSampleUserProfile()
      const personas = buildSamplePersonas()
      const results = matchAll(user, personas)

      results.forEach((r) => {
        expect(r.breakdown).toHaveProperty("vectorScore")
        expect(r.breakdown).toHaveProperty("crossAxisScore")
        expect(r.breakdown).toHaveProperty("paradoxCompatibility")
        expect(r.breakdown).toHaveProperty("qualitativeBonus")
      })
    })
  })

  describe("가상 유저 생성", () => {
    it("수동 생성 시 지정한 벡터를 사용해야 한다", () => {
      const vu = createManualVirtualUser("테스트", sampleL1, sampleL2, sampleL3)
      expect(vu.label).toBe("테스트")
      expect(vu.source).toBe("manual")
      expect(vu.l1).toEqual(sampleL1)
      expect(vu.l2).toEqual(sampleL2)
    })

    it("랜덤 생성 시 0~1 범위 값이어야 한다", () => {
      const vu = createRandomVirtualUser()
      expect(vu.source).toBe("random")
      Object.values(vu.l1).forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      })
    })
  })

  describe("XAI 차원별 설명", () => {
    it("7개 L1 차원의 일치도를 반환해야 한다", () => {
      const persona = buildSamplePersonas()[0]
      const explanations = generateDimensionExplanations(sampleL1, persona.l1)

      expect(explanations.length).toBe(7)
      explanations.forEach((exp) => {
        expect(exp.similarity).toBeGreaterThanOrEqual(0)
        expect(exp.similarity).toBeLessThanOrEqual(1)
        expect(exp.label).toBeTruthy()
      })
    })

    it("유사도 내림차순으로 정렬되어야 한다", () => {
      const persona = buildSamplePersonas()[0]
      const explanations = generateDimensionExplanations(sampleL1, persona.l1)

      for (let i = 1; i < explanations.length; i++) {
        expect(explanations[i].similarity).toBeLessThanOrEqual(explanations[i - 1].similarity)
      }
    })
  })

  describe("배치 시뮬레이션 통계", () => {
    it("빈 runs에서 기본 통계를 반환해야 한다", () => {
      const stats = calculateBatchStats([])
      expect(stats.totalUsers).toBe(0)
      expect(stats.avgMatchScore).toBe(0)
      expect(stats.failureRate).toBe(0)
    })

    it("runs에서 올바른 통계를 계산해야 한다", () => {
      const runs: SimulationRun[] = Array.from({ length: 10 }, (_, i) => ({
        id: `run_${i}`,
        virtualUser: createRandomVirtualUser(),
        results: [],
        topPersonaId: `persona_${i % 3}`,
        topScore: 0.5 + i * 0.05,
        avgScore: 0.5,
        timestamp: Date.now(),
      }))

      const stats = calculateBatchStats(runs)
      expect(stats.totalUsers).toBe(10)
      expect(stats.avgMatchScore).toBeGreaterThan(0)
      expect(stats.scoreDistribution.buckets.length).toBe(5)
      expect(stats.topPersonaDistribution.length).toBeLessThanOrEqual(10)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Tuning Page 로직
// ═══════════════════════════════════════════════════════════════

describe("Tuning Page Logic", () => {
  describe("튜닝 프로필", () => {
    it("기본 프로필 생성 시 6종 파라미터를 포함해야 한다", () => {
      const profile = createTuningProfile("테스트")
      expect(profile.parameters.length).toBe(6)
      expect(profile.genreWeights.length).toBe(12)
      expect(profile.name).toBe("테스트")
    })

    it("파라미터 업데이트 시 클램핑되어야 한다", () => {
      let profile = createTuningProfile("테스트")
      profile = updateParameter(profile, "top_n", 25) // max=20
      const param = profile.parameters.find((p) => p.key === "top_n")
      expect(param?.value).toBe(20)
    })

    it("존재하지 않는 파라미터 업데이트 시 에러 발생", () => {
      const profile = createTuningProfile("테스트")
      expect(() => updateParameter(profile, "invalid_key", 1)).toThrow()
    })
  })

  describe("장르 가중치", () => {
    it("장르 추가 후 테이블에 포함되어야 한다", () => {
      let profile = createTuningProfile("테스트")
      const initialCount = profile.genreWeights.length
      profile = addGenre(profile, "musical")
      expect(profile.genreWeights.length).toBe(initialCount + 1)
      expect(profile.genreWeights.find((g) => g.genre === "musical")).toBeTruthy()
    })

    it("이미 존재하는 장르 추가 시 에러 발생", () => {
      const profile = createTuningProfile("테스트")
      expect(() => addGenre(profile, "thriller")).toThrow()
    })

    it("장르 삭제 후 목록에서 제거되어야 한다", () => {
      let profile = createTuningProfile("테스트")
      const initialCount = profile.genreWeights.length
      profile = removeGenre(profile, "thriller")
      expect(profile.genreWeights.length).toBe(initialCount - 1)
    })

    it("가중치 업데이트 시 0.5~2.0 범위로 클램핑되어야 한다", () => {
      let profile = createTuningProfile("테스트")
      profile = updateGenreWeight(profile, "thriller", "depth", 3.0)
      const entry = profile.genreWeights.find((g) => g.genre === "thriller")
      expect(entry?.weights.depth).toBe(2.0)
    })
  })

  describe("자동 튜닝 실험", () => {
    it("실험 생성 시 pending 상태여야 한다", () => {
      const exp = createTuningExperiment("tp_1", "grid_search", [], 100)
      expect(exp.status).toBe("pending")
      expect(exp.iterations).toBe(0)
      expect(exp.bestScore).toBeNull()
    })

    it("실험 시작 시 running 상태로 전환", () => {
      const exp = createTuningExperiment("tp_1", "grid_search", [], 100)
      const started = startExperiment(exp)
      expect(started.status).toBe("running")
      expect(started.startedAt).toBeTruthy()
    })

    it("Grid Search 조합 생성이 올바르게 동작해야 한다", () => {
      const space = [
        { key: "threshold", values: [0.3, 0.5, 0.7] },
        { key: "diversity", values: [0.2, 0.5] },
      ]
      const combos = generateGridSearchCombinations(space)
      expect(combos.length).toBe(6) // 3 * 2
      expect(combos[0]).toHaveProperty("threshold")
      expect(combos[0]).toHaveProperty("diversity")
    })
  })

  describe("A/B 테스트", () => {
    it("A/B 테스트 생성 시 draft 상태여야 한다", () => {
      const test = createMatchingABTest("테스트", "tier", "설명", "기존", "신규")
      expect(test.status).toBe("draft")
      expect(test.trafficSplit).toEqual([50, 50])
    })

    it("상태 전이가 올바르게 동작해야 한다", () => {
      let test = createMatchingABTest("테스트", "tier", "설명", "기존", "신규")
      test = startMatchingABTest(test)
      expect(test.status).toBe("running")

      test = pauseMatchingABTest(test)
      expect(test.status).toBe("paused")

      test = startMatchingABTest(test)
      test = completeMatchingABTest(test)
      expect(test.status).toBe("completed")
    })

    it("running 상태에서 롤백 가능해야 한다", () => {
      let test = createMatchingABTest("테스트", "tier", "설명", "기존", "신규")
      test = startMatchingABTest(test)
      test = rollbackMatchingABTest(test)
      expect(test.status).toBe("rolled_back")
    })

    it("트래픽 분배 합이 100이 아니면 에러 발생", () => {
      expect(() =>
        createMatchingABTest("테스트", "tier", "설명", "기존", "신규", [60, 50])
      ).toThrow()
    })

    it("evaluateABTestResult가 올바른 verdict를 반환해야 한다", () => {
      const metrics: ABTestMetrics = {
        controlSamples: 100,
        treatmentSamples: 100,
        controlSatisfaction: 0.7,
        treatmentSatisfaction: 0.8,
        controlErrorRate: 0.03,
        treatmentErrorRate: 0.02,
        controlCtr: 0.3,
        treatmentCtr: 0.35,
        dimensionMetrics: [
          {
            dimension: "depth",
            controlValue: 0.6,
            treatmentValue: 0.7,
            diff: 0.1,
            pValue: 0.03,
            significant: true,
          },
        ],
      }

      const verdict = evaluateABTestResult(metrics)
      expect(verdict.winner).toBeTruthy()
      expect(verdict.recommendation).toBeTruthy()
      expect(verdict.confidence).toBeGreaterThanOrEqual(0)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Analytics Page 로직
// ═══════════════════════════════════════════════════════════════

describe("Analytics Page Logic", () => {
  const rawData: RawMatchingData = {
    totalMatches: 100,
    likedMatches: 75,
    matchScores: Array.from({ length: 100 }, () => 0.5 + Math.random() * 0.4),
    top1Selections: 48,
    totalRecommendations: 100,
    clicks: 35,
    impressions: 120,
    dwellTimes: Array.from({ length: 50 }, () => 30 + Math.random() * 120),
    uniqueVisitors: 80,
    returnVisitors: 32,
    promoters: 20,
    passives: 15,
    detractors: 5,
    recommendedPersonaIds: Array.from({ length: 100 }, () => `p_${Math.floor(Math.random() * 5)}`),
  }

  describe("KPI 계산", () => {
    it("모든 KPI가 올바르게 계산되어야 한다", () => {
      const kpis = calculateMatchingKPIs(rawData)
      expect(kpis.matchAccuracy).toBe(0.75)
      expect(kpis.top1Accuracy).toBe(0.48)
      expect(kpis.ctr).toBeGreaterThan(0)
      expect(kpis.returnRate).toBe(0.4)
      expect(kpis.nps).toBeTruthy()
      expect(kpis.avgDwellTime).toBeGreaterThan(0)
    })

    it("빈 데이터에서 0을 반환해야 한다", () => {
      const empty: RawMatchingData = {
        totalMatches: 0,
        likedMatches: 0,
        matchScores: [],
        top1Selections: 0,
        totalRecommendations: 0,
        clicks: 0,
        impressions: 0,
        dwellTimes: [],
        uniqueVisitors: 0,
        returnVisitors: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        recommendedPersonaIds: [],
      }
      const kpis = calculateMatchingKPIs(empty)
      expect(kpis.matchAccuracy).toBe(0)
      expect(kpis.avgMatchScore).toBe(0)
    })
  })

  describe("다양성 지수", () => {
    it("모두 같은 ID일 때 0을 반환해야 한다", () => {
      const index = calculateDiversityIndex(["a", "a", "a", "a"])
      expect(index).toBe(0)
    })

    it("고르게 분포될 때 1에 가까워야 한다", () => {
      const ids = ["a", "b", "c", "d", "a", "b", "c", "d"]
      const index = calculateDiversityIndex(ids)
      expect(index).toBe(1)
    })

    it("빈 배열에서 0을 반환해야 한다", () => {
      expect(calculateDiversityIndex([])).toBe(0)
    })
  })

  describe("트렌드 분석", () => {
    it("상승 트렌드를 감지해야 한다", () => {
      const points: TimeSeriesPoint[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: i,
        value: 0.3 + i * 0.05,
      }))
      expect(analyzeTrend(points)).toBe("rising")
    })

    it("하락 트렌드를 감지해야 한다", () => {
      const points: TimeSeriesPoint[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: i,
        value: 0.9 - i * 0.05,
      }))
      expect(analyzeTrend(points)).toBe("falling")
    })

    it("안정 트렌드를 감지해야 한다", () => {
      const points: TimeSeriesPoint[] = Array.from({ length: 10 }, (_, i) => ({
        timestamp: i,
        value: 0.5 + (i % 2 === 0 ? 0.01 : -0.01),
      }))
      expect(analyzeTrend(points)).toBe("stable")
    })

    it("포인트가 1개일 때 stable 반환", () => {
      expect(analyzeTrend([{ timestamp: 0, value: 0.5 }])).toBe("stable")
    })
  })

  describe("이상 탐지", () => {
    it("정확도 급락 시 anomaly를 반환해야 한다", () => {
      const current: MatchingKPIs = { ...calculateMatchingKPIs(rawData), matchAccuracy: 0.5 }
      const baseline: MatchingKPIs = { ...current, matchAccuracy: 0.8 }

      const anomalies = detectAnomalies(current, baseline)
      expect(anomalies.some((a) => a.type === "accuracy_drop")).toBe(true)
    })

    it("정상 범위에서는 anomaly가 없어야 한다", () => {
      const kpis = calculateMatchingKPIs(rawData)
      const anomalies = detectAnomalies(kpis, kpis)
      expect(anomalies.length).toBe(0)
    })
  })

  describe("개선 권고", () => {
    it("목표 미달 KPI에 대해 권고를 생성해야 한다", () => {
      const lowKPIs: MatchingKPIs = {
        matchAccuracy: 0.5,
        avgMatchScore: 0.5,
        top1Accuracy: 0.3,
        diversityIndex: 0.8,
        ctr: 0.15,
        avgDwellTime: 60,
        returnRate: 0.2,
        nps: 20,
      }
      const recs = generateRecommendations(lowKPIs)
      expect(recs.length).toBeGreaterThan(0)
      recs.forEach((r) => {
        expect(["high", "medium", "low"]).toContain(r.priority)
      })
    })

    it("모든 목표 달성 시 빈 배열 반환", () => {
      const highKPIs: MatchingKPIs = {
        matchAccuracy: 0.9,
        avgMatchScore: 0.85,
        top1Accuracy: 0.6,
        diversityIndex: 0.95,
        ctr: 0.4,
        avgDwellTime: 120,
        returnRate: 0.5,
        nps: 60,
      }
      const recs = generateRecommendations(highKPIs)
      expect(recs.length).toBe(0)
    })
  })

  describe("CSV 내보내기", () => {
    it("KPI를 CSV 행으로 변환해야 한다", () => {
      const kpis = calculateMatchingKPIs(rawData)
      const rows = kpisToCsvRows(kpis)
      expect(rows.length).toBe(8) // 8종 KPI
      expect(rows[0]).toHaveProperty("metric")
      expect(rows[0]).toHaveProperty("value")
    })

    it("CSV 문자열 변환이 올바르게 동작해야 한다", () => {
      const rows = [
        { metric: "정확도", value: 0.75 },
        { metric: "CTR", value: 0.3 },
      ]
      const csv = csvRowsToString(rows)
      expect(csv).toContain("metric,value")
      expect(csv).toContain("정확도,0.75")
      expect(csv).toContain("CTR,0.3")
    })

    it("빈 행에서 빈 문자열 반환", () => {
      expect(csvRowsToString([])).toBe("")
    })
  })
})
