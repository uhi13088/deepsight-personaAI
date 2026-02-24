// ═══════════════════════════════════════════════════════════════
// Quality Module Tests
// T54-AC5: Auto-Interview + Integrity Score + Quality Score + Manual Review
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import { QUALITY_L1 as testL1, QUALITY_L2 as testL2, QUALITY_L3 as testL3 } from "../fixtures"

// ── Auto-Interview ─────────────────────────────────────────────

import {
  generateInterviewQuestions,
  inferScoreFromResponse,
  compareDimensionScores,
  evaluateInterview,
  DEFAULT_INTERVIEW_CONFIG,
} from "@/lib/quality/auto-interview"

// ── Integrity Score ────────────────────────────────────────────

import {
  calculateConsistencyRate,
  crToScore,
  calculateStabilityCoefficient,
  scToScore,
  calculateCoherenceScore,
  csToScore,
  calculatePIS,
  evaluateIntegrity,
} from "@/lib/quality/integrity-score"
import type { ResponseSample } from "@/lib/quality/integrity-score"

// ── Quality Score ──────────────────────────────────────────────

import {
  calculateVectorBalance,
  calculatePromptCompleteness,
  calculateInterviewScore,
  calculateCoherenceComponent,
  calculateQualityScore,
} from "@/lib/quality/quality-score"

// ── Manual Review ──────────────────────────────────────────────

import {
  DEFAULT_CHECK_ITEMS,
  createReviewRequest,
  assignReviewer,
  toggleCheckItem,
  addComment,
  submitDecision,
  calculateReviewProgress,
  getReviewSummaryByCategory,
} from "@/lib/quality/manual-review"

// ═══════════════════════════════════════════════════════════════
// Auto-Interview
// ═══════════════════════════════════════════════════════════════

describe("Auto-Interview", () => {
  describe("generateInterviewQuestions", () => {
    it("returns 20 questions", () => {
      const questions = generateInterviewQuestions()
      expect(questions).toHaveLength(20)
    })

    it("has 7 L1, 5 L2, 4 L3, 4 paradox questions", () => {
      const questions = generateInterviewQuestions()
      expect(questions.filter((q) => q.targetLayer === "L1")).toHaveLength(7)
      expect(questions.filter((q) => q.targetLayer === "L2")).toHaveLength(5)
      expect(questions.filter((q) => q.targetLayer === "L3")).toHaveLength(4)
      expect(questions.filter((q) => q.targetLayer === "paradox")).toHaveLength(4)
    })

    it("all questions have scoring guides", () => {
      const questions = generateInterviewQuestions()
      for (const q of questions) {
        expect(q.scoringGuide.lowSignals.length).toBeGreaterThan(0)
        expect(q.scoringGuide.midSignals.length).toBeGreaterThan(0)
        expect(q.scoringGuide.highSignals.length).toBeGreaterThan(0)
      }
    })

    it("all questions have unique IDs", () => {
      const questions = generateInterviewQuestions()
      const ids = questions.map((q) => q.id)
      expect(new Set(ids).size).toBe(20)
    })
  })

  describe("inferScoreFromResponse", () => {
    it("returns 0.5 for empty response", () => {
      const question = generateInterviewQuestions()[0]
      expect(inferScoreFromResponse(question, "모르겠습니다")).toBe(0.5)
    })

    it("returns low score for low signals", () => {
      const question = generateInterviewQuestions()[0] // depth
      const score = inferScoreFromResponse(question, "간단히 대충 느낌만 봅니다")
      expect(score).toBeLessThan(0.4)
    })

    it("returns high score for high signals", () => {
      const question = generateInterviewQuestions()[0] // depth
      const score = inferScoreFromResponse(question, "깊이 있게 구조적으로 분석적으로 살펴봅니다")
      expect(score).toBeGreaterThan(0.6)
    })

    it("returns mid score for mixed signals", () => {
      const question = generateInterviewQuestions()[0]
      const score = inferScoreFromResponse(question, "적절히 균형 잡힌 분석을 합니다")
      expect(score).toBeGreaterThanOrEqual(0.4)
      expect(score).toBeLessThanOrEqual(0.6)
    })
  })

  describe("compareDimensionScores", () => {
    it("returns scores for all 16 dimensions", () => {
      const inferred: Record<string, number> = {}
      const questions = generateInterviewQuestions()
      for (const q of questions) {
        if (q.targetLayer !== "paradox") {
          inferred[q.targetDimension] = 0.5
        }
      }

      const result = compareDimensionScores(testL1, testL2, testL3, inferred)
      expect(Object.keys(result)).toHaveLength(16)
    })

    it("calculates delta correctly", () => {
      const inferred = { depth: 0.6, lens: 0.7 }
      const result = compareDimensionScores(testL1, testL2, testL3, inferred)
      expect(result.depth.delta).toBe(0.2) // |0.8 - 0.6|
      expect(result.lens.delta).toBe(0) // |0.7 - 0.7|
    })

    it("defaults missing inferred to 0.5", () => {
      const result = compareDimensionScores(testL1, testL2, testL3, {})
      expect(result.depth.inferred).toBe(0.5)
    })
  })

  describe("evaluateInterview", () => {
    it("returns pass for high similarity", () => {
      const scores: Record<string, { designed: number; inferred: number; delta: number }> = {}
      for (const dim of ["depth", "lens", "stance"]) {
        scores[dim] = { designed: 0.8, inferred: 0.78, delta: 0.02 }
      }
      const result = evaluateInterview(scores)
      expect(result.verdict).toBe("pass")
      expect(result.overallSimilarity).toBeGreaterThanOrEqual(0.85)
    })

    it("returns warning for moderate similarity", () => {
      const scores: Record<string, { designed: number; inferred: number; delta: number }> = {}
      for (const dim of ["depth", "lens", "stance"]) {
        scores[dim] = { designed: 0.8, inferred: 0.55, delta: 0.25 }
      }
      const result = evaluateInterview(scores)
      expect(result.verdict).toBe("warning")
    })

    it("returns fail for low similarity", () => {
      const scores: Record<string, { designed: number; inferred: number; delta: number }> = {}
      for (const dim of ["depth", "lens", "stance"]) {
        scores[dim] = { designed: 0.8, inferred: 0.2, delta: 0.6 }
      }
      const result = evaluateInterview(scores)
      expect(result.verdict).toBe("fail")
    })

    it("identifies failed dimensions", () => {
      const scores = {
        depth: { designed: 0.8, inferred: 0.5, delta: 0.3 },
        lens: { designed: 0.7, inferred: 0.69, delta: 0.01 },
      }
      const result = evaluateInterview(scores)
      expect(result.failedDimensions).toContain("depth")
      expect(result.failedDimensions).not.toContain("lens")
    })

    it("uses custom config thresholds", () => {
      const scores = {
        depth: { designed: 0.8, inferred: 0.78, delta: 0.02 },
      }
      const result = evaluateInterview(scores, {
        passThreshold: 0.99,
        warningThreshold: 0.95,
        dimensionFailThreshold: 0.01,
      })
      expect(result.verdict).toBe("warning")
    })
  })

  describe("DEFAULT_INTERVIEW_CONFIG", () => {
    it("has expected thresholds", () => {
      expect(DEFAULT_INTERVIEW_CONFIG.passThreshold).toBe(0.85)
      expect(DEFAULT_INTERVIEW_CONFIG.warningThreshold).toBe(0.7)
      expect(DEFAULT_INTERVIEW_CONFIG.dimensionFailThreshold).toBe(0.15)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Integrity Score
// ═══════════════════════════════════════════════════════════════

describe("Integrity Score", () => {
  describe("calculateConsistencyRate", () => {
    it("returns perfect consistency for zero deltas", () => {
      const scores = {
        depth: { designed: 0.8, inferred: 0.8, delta: 0 },
        lens: { designed: 0.7, inferred: 0.7, delta: 0 },
        openness: { designed: 0.7, inferred: 0.7, delta: 0 },
      }
      const cr = calculateConsistencyRate(scores)
      expect(cr.l1Consistency).toBe(1)
      expect(cr.l2Consistency).toBe(1)
    })

    it("decreases with higher deltas", () => {
      const scores = {
        depth: { designed: 0.8, inferred: 0.4, delta: 0.4 },
        lens: { designed: 0.7, inferred: 0.3, delta: 0.4 },
      }
      const cr = calculateConsistencyRate(scores)
      expect(cr.l1Consistency).toBe(0.6)
    })

    it("returns per-dimension scores", () => {
      const scores = {
        depth: { designed: 0.8, inferred: 0.6, delta: 0.2 },
        openness: { designed: 0.7, inferred: 0.5, delta: 0.2 },
      }
      const cr = calculateConsistencyRate(scores)
      expect(cr.dimensionScores.depth).toBe(0.8)
      expect(cr.dimensionScores.openness).toBe(0.8)
    })
  })

  describe("crToScore", () => {
    it("returns weighted average", () => {
      const breakdown = {
        l1Consistency: 0.9,
        l2Consistency: 0.8,
        l3Consistency: 0.7,
        dimensionScores: {},
      }
      // 0.9*0.45 + 0.8*0.30 + 0.7*0.25 = 0.405 + 0.24 + 0.175 = 0.82
      expect(crToScore(breakdown)).toBe(0.82)
    })
  })

  describe("calculateStabilityCoefficient", () => {
    it("returns perfect stability with < 2 samples", () => {
      const result = calculateStabilityCoefficient([])
      expect(result.responseVariance).toBe(1)
      expect(result.temporalStability).toBe(1)
      expect(result.crossContextStability).toBe(1)
    })

    it("returns high stability for consistent samples", () => {
      const samples: ResponseSample[] = [
        { dimensionScores: { depth: 0.8, lens: 0.7 }, timestamp: 100, context: "review" },
        { dimensionScores: { depth: 0.79, lens: 0.71 }, timestamp: 200, context: "review" },
        { dimensionScores: { depth: 0.81, lens: 0.69 }, timestamp: 300, context: "comment" },
      ]
      const result = calculateStabilityCoefficient(samples)
      expect(result.responseVariance).toBeGreaterThan(0.9)
      expect(result.temporalStability).toBeGreaterThan(0.9)
    })

    it("returns low stability for inconsistent samples", () => {
      const samples: ResponseSample[] = [
        { dimensionScores: { depth: 0.1, lens: 0.9 }, timestamp: 100, context: "a" },
        { dimensionScores: { depth: 0.9, lens: 0.1 }, timestamp: 200, context: "b" },
      ]
      const result = calculateStabilityCoefficient(samples)
      expect(result.responseVariance).toBeLessThan(0.5)
      expect(result.temporalStability).toBeLessThan(0.5)
    })
  })

  describe("scToScore", () => {
    it("returns weighted average", () => {
      const breakdown = {
        responseVariance: 1,
        temporalStability: 1,
        crossContextStability: 1,
      }
      expect(scToScore(breakdown)).toBe(1)
    })
  })

  describe("calculateCoherenceScore", () => {
    it("returns high coherence for well-aligned vectors", () => {
      const l1: SocialPersonaVector = {
        depth: 0.8,
        lens: 0.7,
        stance: 0.7,
        scope: 0.7,
        taste: 0.7,
        purpose: 0.8,
        sociability: 0.3,
      }
      const l2: CoreTemperamentVector = {
        openness: 0.7,
        conscientiousness: 0.8,
        extraversion: 0.3,
        agreeableness: 0.3,
        neuroticism: 0.3,
      }
      const l3: NarrativeDriveVector = {
        lack: 0.2,
        moralCompass: 0.7,
        volatility: 0.3,
        growthArc: 0.8,
      }
      const result = calculateCoherenceScore(l1, l2, l3)
      expect(result.l1l2Coherence).toBeGreaterThan(0.6)
      expect(result.paradoxAlignment).toBe(1)
    })

    it("returns lower coherence for misaligned vectors", () => {
      const l1: SocialPersonaVector = {
        depth: 0.9,
        lens: 0.9,
        stance: 0.9,
        scope: 0.9,
        taste: 0.9,
        purpose: 0.9,
        sociability: 0.9,
      }
      const l2: CoreTemperamentVector = {
        openness: 0.1,
        conscientiousness: 0.1,
        extraversion: 0.1,
        agreeableness: 0.9,
        neuroticism: 0.1,
      }
      const l3: NarrativeDriveVector = {
        lack: 0.9,
        moralCompass: 0.1,
        volatility: 0.9,
        growthArc: 0.1,
      }
      const result = calculateCoherenceScore(l1, l2, l3)
      expect(result.l1l2Coherence).toBeLessThan(0.5)
    })

    it("considers designed paradox alignment", () => {
      const result = calculateCoherenceScore(testL1, testL2, testL3, {
        l1l2: 0.3,
        l1l3: 0.2,
        l2l3: 0.2,
      })
      expect(result.paradoxAlignment).toBeLessThanOrEqual(1)
      expect(result.paradoxAlignment).toBeGreaterThanOrEqual(0)
    })
  })

  describe("csToScore", () => {
    it("returns weighted average", () => {
      const breakdown = {
        l1l2Coherence: 1,
        l1l3Coherence: 1,
        l2l3Coherence: 1,
        paradoxAlignment: 1,
      }
      expect(csToScore(breakdown)).toBe(1)
    })
  })

  describe("calculatePIS", () => {
    it("calculates PIS formula correctly", () => {
      const { pis } = calculatePIS(0.9, 0.8, 0.7)
      // 0.9*0.35 + 0.8*0.35 + 0.7*0.30 = 0.315 + 0.28 + 0.21 = 0.805
      expect(pis).toBeCloseTo(0.81, 1)
    })

    it("assigns grade A for >= 0.9", () => {
      expect(calculatePIS(1, 1, 1).grade).toBe("A")
    })

    it("assigns grade B for >= 0.8", () => {
      expect(calculatePIS(0.9, 0.8, 0.7).grade).toBe("B")
    })

    it("assigns grade C for >= 0.7", () => {
      expect(calculatePIS(0.8, 0.7, 0.6).grade).toBe("C")
    })

    it("assigns grade D for >= 0.6", () => {
      expect(calculatePIS(0.7, 0.6, 0.5).grade).toBe("D")
    })

    it("assigns grade F for < 0.6", () => {
      expect(calculatePIS(0.3, 0.3, 0.3).grade).toBe("F")
    })
  })

  describe("evaluateIntegrity", () => {
    it("returns complete integrity result", () => {
      const dimScores = {
        depth: { designed: 0.8, inferred: 0.78, delta: 0.02 },
        lens: { designed: 0.7, inferred: 0.68, delta: 0.02 },
        openness: { designed: 0.7, inferred: 0.72, delta: 0.02 },
      }
      const samples: ResponseSample[] = [
        { dimensionScores: { depth: 0.78, lens: 0.68 }, timestamp: 100, context: "a" },
        { dimensionScores: { depth: 0.79, lens: 0.67 }, timestamp: 200, context: "a" },
      ]

      const result = evaluateIntegrity(dimScores, samples, testL1, testL2, testL3)
      expect(result.pis).toBeGreaterThan(0)
      expect(result.pis).toBeLessThanOrEqual(1)
      expect(result.grade).toBeDefined()
      expect(result.details.crBreakdown).toBeDefined()
      expect(result.details.scBreakdown).toBeDefined()
      expect(result.details.csBreakdown).toBeDefined()
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Quality Score
// ═══════════════════════════════════════════════════════════════

describe("Quality Score", () => {
  describe("calculateVectorBalance", () => {
    it("returns high score for well-distributed vectors", () => {
      const result = calculateVectorBalance(testL1, testL2, testL3)
      expect(result.score).toBeGreaterThan(50)
      expect(result.weight).toBe(0.3)
    })

    it("penalizes uniform vectors", () => {
      const uniform: SocialPersonaVector = {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      }
      const uniformL2: CoreTemperamentVector = {
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
      }
      const uniformL3: NarrativeDriveVector = {
        lack: 0.5,
        moralCompass: 0.5,
        volatility: 0.5,
        growthArc: 0.5,
      }
      const result = calculateVectorBalance(uniform, uniformL2, uniformL3)
      expect(result.score).toBeLessThan(80)
      expect(result.details.length).toBeGreaterThan(0)
    })
  })

  describe("calculatePromptCompleteness", () => {
    it("returns 100 for fully complete prompts", () => {
      const result = calculatePromptCompleteness({
        basePrompt: "A".repeat(60),
        reviewPrompt: "A".repeat(40),
        postPrompt: "A".repeat(40),
        commentPrompt: "A".repeat(40),
        interactionPrompt: "A".repeat(40),
      })
      expect(result.score).toBe(100)
    })

    it("returns 40 for base prompt only", () => {
      const result = calculatePromptCompleteness({
        basePrompt: "A".repeat(60),
        reviewPrompt: "",
        postPrompt: "",
        commentPrompt: "",
        interactionPrompt: "",
      })
      expect(result.score).toBe(40)
    })

    it("returns 0 for empty prompts", () => {
      const result = calculatePromptCompleteness({
        basePrompt: "",
        reviewPrompt: "",
        postPrompt: "",
        commentPrompt: "",
        interactionPrompt: "",
      })
      expect(result.score).toBe(0)
    })

    it("gives partial credit for short prompts", () => {
      const result = calculatePromptCompleteness({
        basePrompt: "short",
        reviewPrompt: "short",
        postPrompt: "",
        commentPrompt: "",
        interactionPrompt: "",
      })
      expect(result.score).toBeGreaterThan(0)
      expect(result.score).toBeLessThan(50)
    })
  })

  describe("calculateInterviewScore", () => {
    it("returns 0 for null interview", () => {
      const result = calculateInterviewScore(null, null)
      expect(result.score).toBe(0)
    })

    it("returns similarity as percentage", () => {
      const result = calculateInterviewScore(0.85, "pass")
      expect(result.score).toBe(85)
    })

    it("includes verdict in details", () => {
      const result = calculateInterviewScore(0.75, "warning")
      expect(result.details[0]).toContain("WARNING")
    })
  })

  describe("calculateCoherenceComponent", () => {
    it("returns 0 for null", () => {
      const result = calculateCoherenceComponent(null)
      expect(result.score).toBe(0)
    })

    it("converts to percentage", () => {
      const result = calculateCoherenceComponent(0.85)
      expect(result.score).toBe(85)
    })
  })

  describe("calculateQualityScore", () => {
    it("calculates overall score", () => {
      const result = calculateQualityScore(
        testL1,
        testL2,
        testL3,
        {
          basePrompt: "A".repeat(60),
          reviewPrompt: "A".repeat(40),
          postPrompt: "A".repeat(40),
          commentPrompt: "A".repeat(40),
          interactionPrompt: "A".repeat(40),
        },
        0.9,
        "pass",
        0.85
      )
      expect(result.overallScore).toBeGreaterThan(0)
      expect(result.verdict).toBeDefined()
      expect(result.components).toBeDefined()
    })

    it("returns fail for minimal data", () => {
      const result = calculateQualityScore(testL1, testL2, testL3, {
        basePrompt: "",
        reviewPrompt: "",
        postPrompt: "",
        commentPrompt: "",
        interactionPrompt: "",
      })
      expect(result.verdict).toBe("fail")
      expect(result.recommendations.length).toBeGreaterThan(0)
    })

    it("provides recommendations", () => {
      const result = calculateQualityScore(testL1, testL2, testL3, {
        basePrompt: "short",
        reviewPrompt: "",
        postPrompt: "",
        commentPrompt: "",
        interactionPrompt: "",
      })
      expect(result.recommendations).toContain("프롬프트를 더 상세하게 작성하세요")
      expect(result.recommendations).toContain("Auto-Interview를 실시하세요")
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Manual Review
// ═══════════════════════════════════════════════════════════════

describe("Manual Review", () => {
  describe("DEFAULT_CHECK_ITEMS", () => {
    it("has 11 check items", () => {
      expect(DEFAULT_CHECK_ITEMS).toHaveLength(11)
    })

    it("has required items", () => {
      const required = DEFAULT_CHECK_ITEMS.filter((i) => i.required)
      expect(required.length).toBeGreaterThanOrEqual(4)
    })

    it("covers all categories", () => {
      const cats = new Set(DEFAULT_CHECK_ITEMS.map((i) => i.category))
      expect(cats.size).toBe(4)
    })
  })

  describe("createReviewRequest", () => {
    it("creates a pending review", () => {
      const req = createReviewRequest("p1", "테스트 페르소나", "user1")
      expect(req.status).toBe("pending")
      expect(req.personaId).toBe("p1")
      expect(req.reviewerId).toBeNull()
      expect(req.checkItems).toHaveLength(11)
      expect(req.comments).toHaveLength(0)
    })

    it("includes quality/integrity scores if provided", () => {
      const req = createReviewRequest("p1", "테스트", "user1", 85, 0.9)
      expect(req.qualityScore).toBe(85)
      expect(req.integrityScore).toBe(0.9)
    })
  })

  describe("assignReviewer", () => {
    it("assigns reviewer and changes status to in_review", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const updated = assignReviewer(req, "reviewer1")
      expect(updated.reviewerId).toBe("reviewer1")
      expect(updated.status).toBe("in_review")
    })

    it("throws if not in pending status", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const inReview = assignReviewer(req, "reviewer1")
      expect(() => assignReviewer(inReview, "reviewer2")).toThrow()
    })
  })

  describe("toggleCheckItem", () => {
    it("toggles a check item", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const inReview = assignReviewer(req, "reviewer1")
      const toggled = toggleCheckItem(inReview, "ck_vec_01")
      const item = toggled.checkItems.find((i) => i.id === "ck_vec_01")
      expect(item?.checked).toBe(true)
    })

    it("toggles back to unchecked", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const inReview = assignReviewer(req, "reviewer1")
      const toggled1 = toggleCheckItem(inReview, "ck_vec_01")
      const toggled2 = toggleCheckItem(toggled1, "ck_vec_01")
      const item = toggled2.checkItems.find((i) => i.id === "ck_vec_01")
      expect(item?.checked).toBe(false)
    })

    it("throws if not in_review", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      expect(() => toggleCheckItem(req, "ck_vec_01")).toThrow()
    })
  })

  describe("addComment", () => {
    it("adds a comment", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const updated = addComment(req, "user1", "코멘트 테스트", "general")
      expect(updated.comments).toHaveLength(1)
      expect(updated.comments[0].content).toBe("코멘트 테스트")
    })

    it("preserves existing comments", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const c1 = addComment(req, "user1", "첫 번째")
      const c2 = addComment(c1, "user1", "두 번째")
      expect(c2.comments).toHaveLength(2)
    })
  })

  describe("submitDecision", () => {
    it("approves when all required items checked", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const inReview = assignReviewer(req, "reviewer1")
      const requiredIds = DEFAULT_CHECK_ITEMS.filter((i) => i.required).map((i) => i.id)
      const allIds = DEFAULT_CHECK_ITEMS.map((i) => i.id)

      const approved = submitDecision(inReview, {
        status: "approved",
        comment: "좋습니다",
        checkedItems: allIds,
      })
      expect(approved.status).toBe("approved")
      expect(approved.completedAt).not.toBeNull()
    })

    it("throws when approving without required items", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const inReview = assignReviewer(req, "reviewer1")

      expect(() =>
        submitDecision(inReview, {
          status: "approved",
          comment: "좋습니다",
          checkedItems: [],
        })
      ).toThrow("필수 체크항목 미확인")
    })

    it("allows rejection without all required items", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const inReview = assignReviewer(req, "reviewer1")

      const rejected = submitDecision(inReview, {
        status: "rejected",
        comment: "수정 필요",
        checkedItems: [],
      })
      expect(rejected.status).toBe("rejected")
    })

    it("allows revision request", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const inReview = assignReviewer(req, "reviewer1")

      const revision = submitDecision(inReview, {
        status: "revision_requested",
        comment: "L1 벡터 수정 필요",
        checkedItems: ["ck_vec_01"],
      })
      expect(revision.status).toBe("revision_requested")
      expect(revision.completedAt).toBeNull()
    })

    it("throws if not in_review", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      expect(() =>
        submitDecision(req, { status: "approved", comment: "", checkedItems: [] })
      ).toThrow()
    })
  })

  describe("calculateReviewProgress", () => {
    it("returns 0% for new review", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const progress = calculateReviewProgress(req)
      expect(progress.checked).toBe(0)
      expect(progress.percentage).toBe(0)
      expect(progress.total).toBe(11)
    })

    it("calculates percentage correctly", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const inReview = assignReviewer(req, "reviewer1")
      const toggled = toggleCheckItem(inReview, "ck_vec_01")
      const progress = calculateReviewProgress(toggled)
      expect(progress.checked).toBe(1)
      expect(progress.percentage).toBe(Math.round((1 / 11) * 100))
    })
  })

  describe("getReviewSummaryByCategory", () => {
    it("returns summary for all 4 categories", () => {
      const req = createReviewRequest("p1", "테스트", "user1")
      const summary = getReviewSummaryByCategory(req)
      expect(Object.keys(summary)).toHaveLength(4)
      expect(summary.vector_design.total).toBeGreaterThan(0)
      expect(summary.prompt_quality.total).toBeGreaterThan(0)
      expect(summary.behavioral_test.total).toBeGreaterThan(0)
      expect(summary.overall_coherence.total).toBeGreaterThan(0)
    })
  })
})
