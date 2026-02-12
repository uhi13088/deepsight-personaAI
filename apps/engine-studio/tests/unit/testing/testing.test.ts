// ═══════════════════════════════════════════════════════════════
// Testing Module Tests
// T55-AC6: Single/Batch/AB/Simulator/Monitoring
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import type { SocialPersonaVector } from "@/types"

// ── Single Content Test ────────────────────────────────────────

import {
  analyzeTone,
  checkProhibitedWords,
  evaluateVectorAlignment,
  evaluateLengthScore,
  evaluateResponse,
  createSingleTestResult,
} from "@/lib/testing/single-content-test"

// ── Batch Test ─────────────────────────────────────────────────

import {
  calculateConsistency,
  detectAnomalies,
  calculateStats,
  createBatchTestResult,
} from "@/lib/testing/batch-test"

// ── A/B Test ───────────────────────────────────────────────────

import {
  parseTrafficSplit,
  createABTestConfig,
  startABTest,
  pauseABTest,
  cancelABTest,
  compareMetric,
  calculateABTestResult,
  isTestExpired,
} from "@/lib/testing/ab-test"

// ── Persona Simulator ──────────────────────────────────────────

import {
  createSimulationSession,
  estimatePressureLevel,
  analyzeTurn,
  addTurn,
  generateConsistencyReport,
} from "@/lib/testing/persona-simulator"

// ── Monitoring ─────────────────────────────────────────────────

import {
  computeMetrics,
  checkAlerts,
  acknowledgeAlert,
  generateSuggestions,
  buildDashboardData,
  DEFAULT_ALERT_THRESHOLDS,
} from "@/lib/testing/monitoring"
import type { PerformanceMetrics } from "@/lib/testing/monitoring"

// ── 테스트 데이터 ──────────────────────────────────────────────

const testL1: SocialPersonaVector = {
  depth: 0.8,
  lens: 0.7,
  stance: 0.6,
  scope: 0.7,
  taste: 0.5,
  purpose: 0.8,
  sociability: 0.3,
}

// ═══════════════════════════════════════════════════════════════
// Single Content Test
// ═══════════════════════════════════════════════════════════════

describe("Single Content Test", () => {
  describe("analyzeTone", () => {
    it("detects logical tone", () => {
      const tone = analyzeTone("이 작품의 구조적 분석과 논리적 근거를 체계적으로 검토하겠습니다")
      expect(tone.dominantTone).toBe("logical")
      expect(tone.logicScore).toBeGreaterThan(tone.emotionScore)
    })

    it("detects emotional tone", () => {
      const tone = analyzeTone("정말 감동적이고 아름다운 작품이네요. 가슴이 벅찬 느낌입니다")
      expect(tone.dominantTone).toBe("emotional")
      expect(tone.emotionScore).toBeGreaterThan(tone.logicScore)
    })

    it("detects balanced tone when no keywords", () => {
      const tone = analyzeTone("좋은 작품입니다")
      expect(tone.dominantTone).toBe("balanced")
    })
  })

  describe("checkProhibitedWords", () => {
    it("returns empty for clean text", () => {
      expect(checkProhibitedWords("깨끗한 리뷰")).toHaveLength(0)
    })

    it("detects prohibited words", () => {
      expect(checkProhibitedWords("정치적 편향이 있다").length).toBeGreaterThan(0)
    })
  })

  describe("evaluateVectorAlignment", () => {
    it("returns score between 0 and 100", () => {
      const score = evaluateVectorAlignment("분석적으로 구조를 살펴보겠습니다", testL1)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it("higher for aligned response", () => {
      // testL1.depth=0.8 → deep response should align
      const deepScore = evaluateVectorAlignment(
        "심층적으로 분석하면 이 작품의 구조적 층위와 맥락이 드러납니다",
        testL1
      )
      const shallowScore = evaluateVectorAlignment("그냥 재미있었어요", testL1)
      expect(deepScore).toBeGreaterThan(shallowScore)
    })
  })

  describe("evaluateLengthScore", () => {
    it("returns 100 for ideal length", () => {
      expect(evaluateLengthScore("A".repeat(300))).toBe(100)
    })

    it("returns lower for very short", () => {
      expect(evaluateLengthScore("짧은")).toBeLessThan(50)
    })
  })

  describe("evaluateResponse", () => {
    it("returns complete evaluation", () => {
      const eval_ = evaluateResponse("A".repeat(250), testL1)
      expect(eval_.toneAnalysis).toBeDefined()
      expect(eval_.vectorAlignment).toBeGreaterThanOrEqual(0)
      expect(eval_.lengthScore).toBe(100)
      expect(eval_.overallQuality).toBeGreaterThan(0)
    })

    it("penalizes prohibited words", () => {
      const clean = evaluateResponse("좋은 분석 글입니다. ".repeat(15), testL1)
      const dirty = evaluateResponse("시발 이 영화 분석입니다. ".repeat(15), testL1)
      expect(clean.overallQuality).toBeGreaterThan(dirty.overallQuality)
    })
  })

  describe("createSingleTestResult", () => {
    it("creates result with timestamp", () => {
      const result = createSingleTestResult(
        { contentTitle: "테스트", contentGenre: "영화", contentDescription: "설명" },
        "분석적 응답입니다. ".repeat(20),
        testL1
      )
      expect(result.contentInput.contentTitle).toBe("테스트")
      expect(result.evaluation).toBeDefined()
      expect(result.timestamp).toBeGreaterThan(0)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Batch Test
// ═══════════════════════════════════════════════════════════════

describe("Batch Test", () => {
  const contents = [
    { contentTitle: "영화A", contentGenre: "드라마", contentDescription: "설명A" },
    { contentTitle: "영화B", contentGenre: "액션", contentDescription: "설명B" },
    { contentTitle: "영화C", contentGenre: "코미디", contentDescription: "설명C" },
  ]
  const responses = [
    "분석적 관점에서 이 작품의 구조를 살펴보면 매우 흥미롭습니다. 논리적으로 탄탄합니다. ".repeat(
      3
    ),
    "구조적 분석을 통해 이 작품의 논리적 기반을 검토합니다. 체계적 관점이 필요합니다. ".repeat(3),
    "이 작품을 분석하면 깊이 있는 맥락이 드러납니다. 구조적으로 뛰어납니다. ".repeat(3),
  ]

  describe("calculateConsistency", () => {
    it("returns 100 for single result", () => {
      const results = [createSingleTestResult(contents[0], responses[0], testL1)]
      expect(calculateConsistency(results)).toBe(100)
    })

    it("returns high for consistent responses", () => {
      const results = contents.map((c, i) => createSingleTestResult(c, responses[i], testL1))
      expect(calculateConsistency(results)).toBeGreaterThan(50)
    })
  })

  describe("detectAnomalies", () => {
    it("returns empty for clean results", () => {
      const results = contents.map((c, i) => createSingleTestResult(c, responses[i], testL1))
      const anomalies = detectAnomalies(results)
      // No prohibited words, similar quality
      const highSeverity = anomalies.filter((a) => a.severity === "high")
      expect(highSeverity).toHaveLength(0)
    })

    it("detects short response anomaly", () => {
      const results = [
        createSingleTestResult(contents[0], responses[0], testL1),
        createSingleTestResult(contents[1], "짧은", testL1),
      ]
      const anomalies = detectAnomalies(results)
      expect(anomalies.some((a) => a.reason.includes("길이 부족"))).toBe(true)
    })
  })

  describe("calculateStats", () => {
    it("returns stats for results", () => {
      const results = contents.map((c, i) => createSingleTestResult(c, responses[i], testL1))
      const stats = calculateStats(results)
      expect(stats.avgResponseLength).toBeGreaterThan(0)
      expect(stats.avgQualityScore).toBeGreaterThan(0)
    })

    it("returns zeros for empty", () => {
      const stats = calculateStats([])
      expect(stats.avgResponseLength).toBe(0)
    })
  })

  describe("createBatchTestResult", () => {
    it("creates complete batch result", () => {
      const result = createBatchTestResult("p1", contents, responses, testL1)
      expect(result.personaId).toBe("p1")
      expect(result.results).toHaveLength(3)
      expect(result.consistencyScore).toBeGreaterThanOrEqual(0)
      expect(result.stats).toBeDefined()
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// A/B Test
// ═══════════════════════════════════════════════════════════════

describe("A/B Test", () => {
  describe("parseTrafficSplit", () => {
    it("parses 50:50", () => {
      expect(parseTrafficSplit("50:50")).toEqual([0.5, 0.5])
    })

    it("parses 70:30", () => {
      expect(parseTrafficSplit("70:30")).toEqual([0.7, 0.3])
    })

    it("parses 90:10", () => {
      expect(parseTrafficSplit("90:10")).toEqual([0.9, 0.1])
    })
  })

  describe("createABTestConfig", () => {
    it("creates pending config", () => {
      const config = createABTestConfig("테스트", "pA", "pB")
      expect(config.status).toBe("pending")
      expect(config.personaAId).toBe("pA")
      expect(config.personaBId).toBe("pB")
      expect(config.trafficSplit).toBe("50:50")
      expect(config.metrics).toContain("ctr")
    })
  })

  describe("startABTest", () => {
    it("starts pending test", () => {
      const config = createABTestConfig("테스트", "pA", "pB")
      const started = startABTest(config)
      expect(started.status).toBe("running")
      expect(started.startedAt).not.toBeNull()
    })

    it("throws on completed test", () => {
      const config = { ...createABTestConfig("t", "a", "b"), status: "completed" as const }
      expect(() => startABTest(config)).toThrow()
    })
  })

  describe("pauseABTest", () => {
    it("pauses running test", () => {
      const running = startABTest(createABTestConfig("t", "a", "b"))
      expect(pauseABTest(running).status).toBe("paused")
    })

    it("throws on pending", () => {
      expect(() => pauseABTest(createABTestConfig("t", "a", "b"))).toThrow()
    })
  })

  describe("cancelABTest", () => {
    it("cancels running test", () => {
      const running = startABTest(createABTestConfig("t", "a", "b"))
      expect(cancelABTest(running).status).toBe("cancelled")
    })

    it("throws on already cancelled", () => {
      const config = { ...createABTestConfig("t", "a", "b"), status: "cancelled" as const }
      expect(() => cancelABTest(config)).toThrow()
    })
  })

  describe("compareMetric", () => {
    it("detects B winner", () => {
      const result = compareMetric("ctr", 10, 15, 100, 100)
      expect(result.winner).toBe("B")
      expect(result.delta).toBe(5)
      expect(result.significant).toBe(true)
    })

    it("detects A winner", () => {
      const result = compareMetric("satisfaction", 80, 60, 50, 50)
      expect(result.winner).toBe("A")
    })

    it("detects tie for small difference", () => {
      const result = compareMetric("ctr", 10, 10.1, 100, 100)
      expect(result.winner).toBe("tie")
    })

    it("not significant with small sample", () => {
      const result = compareMetric("ctr", 10, 20, 5, 5)
      expect(result.significant).toBe(false)
    })
  })

  describe("calculateABTestResult", () => {
    it("determines overall winner", () => {
      const result = calculateABTestResult("cfg1", 1000, 1000, [
        { metric: "ctr", valueA: 10, valueB: 15 },
        { metric: "satisfaction", valueA: 70, valueB: 80 },
      ])
      expect(result.overallWinner).toBe("B")
      expect(result.confidence).toBeGreaterThan(0)
    })

    it("returns inconclusive for mixed results", () => {
      const result = calculateABTestResult("cfg1", 100, 100, [
        { metric: "ctr", valueA: 15, valueB: 10 },
        { metric: "satisfaction", valueA: 60, valueB: 80 },
      ])
      expect(result.overallWinner).toBe("inconclusive")
    })
  })

  describe("isTestExpired", () => {
    it("returns false for pending", () => {
      expect(isTestExpired(createABTestConfig("t", "a", "b"))).toBe(false)
    })

    it("returns false for recently started", () => {
      const config = startABTest(createABTestConfig("t", "a", "b"))
      expect(isTestExpired(config)).toBe(false)
    })

    it("returns true for expired", () => {
      const config = {
        ...startABTest(createABTestConfig("t", "a", "b", "50:50", 1)),
        startedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      }
      expect(isTestExpired(config)).toBe(true)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Persona Simulator
// ═══════════════════════════════════════════════════════════════

describe("Persona Simulator", () => {
  describe("createSimulationSession", () => {
    it("creates empty session", () => {
      const session = createSimulationSession("p1", "테스트 페르소나")
      expect(session.personaId).toBe("p1")
      expect(session.turns).toHaveLength(0)
      expect(session.consistencyReport).toBeNull()
    })
  })

  describe("estimatePressureLevel", () => {
    it("returns low for normal message", () => {
      expect(estimatePressureLevel("이 영화 어떻게 생각하세요?")).toBeLessThan(0.5)
    })

    it("returns high for challenging message", () => {
      expect(
        estimatePressureLevel("왜 그렇게 생각하세요? 근거가 뭔데요? 틀렸잖아요")
      ).toBeGreaterThan(0.5)
    })
  })

  describe("analyzeTurn", () => {
    it("returns complete analysis", () => {
      const analysis = analyzeTurn(
        "이 영화 좋아요?",
        "분석적 관점에서 매우 훌륭한 작품입니다",
        testL1
      )
      expect(analysis.tone).toBeDefined()
      expect(analysis.vectorAlignment).toBeGreaterThanOrEqual(0)
      expect(analysis.pressureLevel).toBeGreaterThanOrEqual(0)
      expect(analysis.responseLength).toBeGreaterThan(0)
    })
  })

  describe("addTurn", () => {
    it("adds turn to session", () => {
      const session = createSimulationSession("p1", "테스트")
      const updated = addTurn(session, "안녕하세요?", "반갑습니다", testL1)
      expect(updated.turns).toHaveLength(1)
      expect(updated.turns[0].turnNumber).toBe(1)
    })

    it("generates consistency report after 3 turns", () => {
      let session = createSimulationSession("p1", "테스트")
      session = addTurn(session, "Q1", "분석적 응답 1", testL1)
      session = addTurn(session, "Q2", "분석적 응답 2", testL1)
      expect(session.consistencyReport).toBeNull()
      session = addTurn(session, "Q3", "분석적 응답 3", testL1)
      expect(session.consistencyReport).not.toBeNull()
    })
  })

  describe("generateConsistencyReport", () => {
    it("returns default for < 2 turns", () => {
      const report = generateConsistencyReport([])
      expect(report.overallConsistency).toBe(100)
    })

    it("generates meaningful report for multiple turns", () => {
      const session = createSimulationSession("p1", "테스트")
      let updated = session
      for (let i = 0; i < 5; i++) {
        updated = addTurn(updated, `질문 ${i}`, `분석적 답변 ${i}`, testL1)
      }
      const report = updated.consistencyReport!
      expect(report.turnCount).toBe(5)
      expect(report.vectorAlignmentTrend).toBeDefined()
      expect(report.pressureResponsePattern).toBeDefined()
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Monitoring
// ═══════════════════════════════════════════════════════════════

describe("Monitoring", () => {
  const rawMetrics: PerformanceMetrics = {
    personaId: "p1",
    impressions: 1000,
    clicks: 80,
    likes: 60,
    dislikes: 10,
    engagementTimeTotal: 5000,
    conversions: 20,
    period: { startDate: 1000, endDate: 2000 },
  }

  describe("computeMetrics", () => {
    it("calculates CTR correctly", () => {
      const m = computeMetrics(rawMetrics)
      expect(m.ctr).toBe(8) // 80/1000 * 100
    })

    it("calculates satisfaction correctly", () => {
      const m = computeMetrics(rawMetrics)
      expect(m.satisfaction).toBeCloseTo(85.71, 1) // 60/70 * 100
    })

    it("calculates engagement avg", () => {
      const m = computeMetrics(rawMetrics)
      expect(m.engagementTimeAvg).toBe(5) // 5000/1000
    })

    it("returns zeros for no impressions", () => {
      const m = computeMetrics({ ...rawMetrics, impressions: 0 })
      expect(m.ctr).toBe(0)
      expect(m.conversionRate).toBe(0)
    })
  })

  describe("checkAlerts", () => {
    it("generates low CTR alert", () => {
      const lowCtr: PerformanceMetrics = { ...rawMetrics, clicks: 10 } // 1% CTR
      const computed = computeMetrics(lowCtr)
      const alerts = checkAlerts(lowCtr, computed)
      expect(alerts.some((a) => a.type === "low_ctr")).toBe(true)
    })

    it("generates dissatisfaction alert", () => {
      const lowSat: PerformanceMetrics = { ...rawMetrics, likes: 10, dislikes: 30 }
      const computed = computeMetrics(lowSat)
      const alerts = checkAlerts(lowSat, computed)
      expect(alerts.some((a) => a.type === "user_dissatisfaction")).toBe(true)
    })

    it("generates traffic spike alert", () => {
      const computed = computeMetrics(rawMetrics)
      const alerts = checkAlerts(rawMetrics, computed, 100) // avg=100, actual=1000
      expect(alerts.some((a) => a.type === "traffic_spike")).toBe(true)
    })

    it("no alerts for good metrics", () => {
      const computed = computeMetrics(rawMetrics)
      const alerts = checkAlerts(rawMetrics, computed, 500)
      expect(alerts.filter((a) => a.severity === "critical")).toHaveLength(0)
    })
  })

  describe("acknowledgeAlert", () => {
    it("marks alert as acknowledged", () => {
      const alert = checkAlerts(
        { ...rawMetrics, clicks: 10 },
        computeMetrics({ ...rawMetrics, clicks: 10 })
      )[0]
      expect(acknowledgeAlert(alert).acknowledged).toBe(true)
    })
  })

  describe("generateSuggestions", () => {
    it("suggests for low CTR", () => {
      const suggestions = generateSuggestions({
        ctr: 3,
        satisfaction: 80,
        engagementTimeAvg: 15,
        conversionRate: 5,
      })
      expect(suggestions.some((s) => s.affectedMetric === "ctr")).toBe(true)
    })

    it("suggests for low satisfaction", () => {
      const suggestions = generateSuggestions({
        ctr: 10,
        satisfaction: 40,
        engagementTimeAvg: 15,
        conversionRate: 5,
      })
      expect(suggestions.some((s) => s.affectedMetric === "satisfaction")).toBe(true)
    })

    it("no suggestions for good metrics", () => {
      const suggestions = generateSuggestions({
        ctr: 15,
        satisfaction: 90,
        engagementTimeAvg: 20,
        conversionRate: 5,
      })
      expect(suggestions).toHaveLength(0)
    })
  })

  describe("DEFAULT_ALERT_THRESHOLDS", () => {
    it("has expected defaults", () => {
      expect(DEFAULT_ALERT_THRESHOLDS.minCtr).toBe(5)
      expect(DEFAULT_ALERT_THRESHOLDS.maxDislikeRatio).toBe(0.3)
    })
  })

  describe("buildDashboardData", () => {
    it("builds complete dashboard", () => {
      const dashboard = buildDashboardData([rawMetrics], 500)
      expect(dashboard.summaryMetrics.ctr).toBeGreaterThan(0)
      expect(dashboard.personaMetrics).toHaveLength(1)
    })

    it("returns empty for no data", () => {
      const dashboard = buildDashboardData([])
      expect(dashboard.summaryMetrics.ctr).toBe(0)
      expect(dashboard.personaMetrics).toHaveLength(0)
    })
  })
})
