// ═══════════════════════════════════════════════════════════════
// T62 테스트: 인큐베이터 — 배치/자가발전/콜드스타트/비용/골든샘플/재검증/대시보드
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

// Batch Workflow
import {
  createBatchConfig,
  allocateGenerationSlots,
  calculateConsistencyScore,
  determineStatus,
  executeBatch,
  estimateBatchCost,
  summarizeBatch,
  generateBatchId,
  DEFAULT_BATCH_STRATEGY,
  type ConsistencyScoreBreakdown,
} from "@/lib/incubator/batch-workflow"

// Self Evolution
import {
  analyzeUserDistribution,
  findCoverageGaps,
  generateWeeklyStrategy,
  calculateVectorAdjustments,
  detectIllogicalCombinations,
  type InteractionMetrics,
} from "@/lib/incubator/self-evolution"

// Cold Start
import {
  determineColdStartPhase,
  getColdStartPolicy,
  validateGenerationConstraints,
  getColdStartArchetypes,
  COLD_START_ARCHETYPES,
} from "@/lib/incubator/cold-start"

// Cost Control
import {
  determineScalePhase,
  getCostPolicy,
  calculateMonthlyCost,
  canGenerateMore,
  detectZombie,
  runZombieGCScan,
  DEFAULT_ZOMBIE_GC_CONFIG,
} from "@/lib/incubator/cost-control"

// Golden Sample
import {
  INITIAL_GOLDEN_SAMPLES,
  getGoldenSampleConfig,
  shouldExpandGoldenSamples,
  calculateGoldenSampleMetrics,
} from "@/lib/incubator/golden-sample"

// Revalidation
import {
  classifyGrade,
  revalidatePersona,
  runRevalidationBatch,
  mutateVector,
  runEvolutionBatch,
  estimateRevalidationCost,
} from "@/lib/incubator/revalidation"

// Dashboard
import { generateAlerts, buildDashboard } from "@/lib/incubator/dashboard"

// ═══════════════════════════════════════════════════════════════
// 1. Batch Workflow (AC1)
// ═══════════════════════════════════════════════════════════════

describe("Batch Workflow", () => {
  it("배치 설정을 생성한다", () => {
    const config = createBatchConfig(50)
    expect(config.batchId).toMatch(/^batch-/)
    expect(config.dailyLimit).toBe(10)
    expect(config.passThreshold).toBe(0.9)
    expect(config.goldenSampleConfig.poolSize).toBe(10)
  })

  it("전략 가중치 합이 1.0이 되도록 정규화한다", () => {
    const config = createBatchConfig(50, {
      strategy: { userDriven: 0.5, exploration: 0.5, gapFilling: 0.5 },
    })
    const total =
      config.strategy.userDriven + config.strategy.exploration + config.strategy.gapFilling
    expect(Math.abs(total - 1.0)).toBeLessThan(0.02)
  })

  it("생성 슬롯을 전략에 따라 배분한다", () => {
    const slots = allocateGenerationSlots(10, DEFAULT_BATCH_STRATEGY)
    expect(slots.length).toBe(10)
    const userDriven = slots.filter((s) => s.type === "user_driven").length
    const exploration = slots.filter((s) => s.type === "exploration").length
    expect(userDriven).toBe(6) // 0.6 * 10
    expect(exploration).toBe(2) // 0.2 * 10
  })

  it("일관성 점수를 가중 평균으로 계산한다", () => {
    const breakdown: ConsistencyScoreBreakdown = {
      vectorAlignment: 0.9,
      toneMatch: 0.8,
      reasoningQuality: 0.7,
    }
    const score = calculateConsistencyScore(breakdown)
    // 0.9*0.4 + 0.8*0.3 + 0.7*0.3 = 0.36 + 0.24 + 0.21 = 0.81
    expect(score).toBe(0.81)
  })

  it("90점 이상이면 PASSED, 미만이면 FAILED", () => {
    expect(determineStatus(0.95, 0.9)).toBe("PASSED")
    expect(determineStatus(0.9, 0.9)).toBe("PASSED")
    expect(determineStatus(0.89, 0.9)).toBe("FAILED")
  })

  it("배치를 실행하고 결과를 반환한다", () => {
    const config = createBatchConfig(50, { dailyLimit: 5 })
    const result = executeBatch(
      config,
      () => ({
        vector: { l1: { depth: 0.5 }, l2: { openness: 0.5 }, l3: { conflictOrientation: 0.5 } },
        prompt: "test prompt",
        config: {},
      }),
      () => ({
        results: [{ passed: true }],
        breakdown: { vectorAlignment: 0.95, toneMatch: 0.92, reasoningQuality: 0.88 },
      })
    )
    expect(result.generatedCount).toBe(5)
    expect(result.logs.length).toBe(5)
    expect(result.passedCount + result.failedCount).toBe(5)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it("비용을 추정한다", () => {
    expect(estimateBatchCost(10)).toBe(70) // 10 * (5+2)
  })

  it("배치 결과를 요약한다", () => {
    const config = createBatchConfig(50, { dailyLimit: 3 })
    const result = executeBatch(
      config,
      () => ({ vector: { l1: {}, l2: {}, l3: {} }, prompt: "p", config: {} }),
      () => ({
        results: [],
        breakdown: { vectorAlignment: 0.95, toneMatch: 0.95, reasoningQuality: 0.95 },
      })
    )
    const summary = summarizeBatch(result)
    expect(summary.generated).toBe(3)
    expect(summary.passRate).toContain("%")
  })

  it("배치 ID를 날짜 기반으로 생성한다", () => {
    const id = generateBatchId(new Date("2026-02-12"))
    expect(id).toMatch(/^batch-20260212-/)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Self Evolution (AC2)
// ═══════════════════════════════════════════════════════════════

describe("Self Evolution", () => {
  it("유저 벡터 분포를 분석한다", () => {
    const vectors = [
      {
        depth: 0.8,
        lens: 0.6,
        stance: 0.3,
        scope: 0.7,
        taste: 0.5,
        purpose: 0.6,
        sociability: 0.4,
      },
      {
        depth: 0.6,
        lens: 0.4,
        stance: 0.5,
        scope: 0.5,
        taste: 0.7,
        purpose: 0.4,
        sociability: 0.6,
      },
    ]
    const dist = analyzeUserDistribution(vectors)
    expect(dist).toHaveLength(7)
    expect(dist[0].dimension).toBe("depth")
    expect(dist[0].mean).toBe(0.7) // (0.8+0.6)/2
    expect(dist[0].stdDev).toBeGreaterThan(0)
  })

  it("빈 벡터 배열에 대해 기본값을 반환한다", () => {
    const dist = analyzeUserDistribution([])
    expect(dist).toHaveLength(7)
    expect(dist[0].mean).toBe(0.5)
  })

  it("커버리지 갭을 찾는다", () => {
    const userDist = analyzeUserDistribution([
      {
        depth: 0.9,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
    ])
    const personaDist = analyzeUserDistribution([
      {
        depth: 0.2,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
    ])
    const gaps = findCoverageGaps(userDist, personaDist)
    // gaps가 존재하고 gapScore 순으로 정렬
    for (const gap of gaps) {
      expect(gap.gapScore).toBeGreaterThan(0)
    }
  })

  it("주간 전략을 생성한다", () => {
    const userVectors = Array.from({ length: 10 }, () => ({
      depth: 0.8,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }))
    const personaVectors = Array.from({ length: 5 }, () => ({
      depth: 0.3,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }))
    const strategy = generateWeeklyStrategy(userVectors, personaVectors)
    expect(strategy.recommendedStrategy).toBeDefined()
    expect(strategy.userVectorDistribution).toHaveLength(7)
  })

  it("벡터 미세 조정을 계산한다", () => {
    const metrics: InteractionMetrics = {
      personaId: "p1",
      sessionCount: 10,
      totalTurns: 50,
      avgPressure: 0.8, // 높은 pressure
      peakPressure: 0.95,
      avgIntegrity: 0.6, // 낮은 일관성
      avgVoiceDrift: 0.25, // 높은 drift
      avgContextRecall: 0.8,
    }
    const adjustments = calculateVectorAdjustments("p1", metrics, {
      stance: 0.5,
      depth: 0.5,
      sociability: 0.5,
    })
    expect(adjustments.length).toBeGreaterThan(0)
    expect(adjustments.some((a) => a.dimension === "stance")).toBe(true) // pressure 대응
    expect(adjustments.some((a) => a.dimension === "depth")).toBe(true) // 일관성 개선
  })

  it("비논리 조합을 감지한다", () => {
    const issues1 = detectIllogicalCombinations({
      depth: 0.1,
      scope: 0.95,
      lens: 0.5,
      stance: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    })
    expect(issues1.length).toBeGreaterThan(0)
    expect(issues1[0].reason).toContain("모순")

    const issues2 = detectIllogicalCombinations({
      depth: 0.5,
      scope: 0.5,
      lens: 0.5,
      stance: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    })
    expect(issues2.length).toBe(0) // 정상
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Cold Start (AC3)
// ═══════════════════════════════════════════════════════════════

describe("Cold Start", () => {
  it("유저 데이터에 따라 페이즈를 결정한다", () => {
    expect(determineColdStartPhase(0, 0)).toBe("initial")
    expect(determineColdStartPhase(999, 10)).toBe("initial")
    expect(determineColdStartPhase(1000, 30)).toBe("growing")
    expect(determineColdStartPhase(5000, 100)).toBe("mature")
    expect(determineColdStartPhase(20000, 200)).toBe("scaled")
  })

  it("페이즈별 정책을 반환한다", () => {
    const policy = getColdStartPolicy(500, 10)
    expect(policy.phase).toBe("initial")
    expect(policy.dailyLimit).toBe(10)
    expect(policy.explorationQuota).toBe(0.3)
  })

  it("벡터 제약 조건을 검증한다", () => {
    // 분산 부족 (모두 0.5)
    const result1 = validateGenerationConstraints(
      {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
      { minVariance: 0.15, maxExtremes: 3, logicalCoherence: true }
    )
    expect(result1.valid).toBe(false)
    expect(result1.issues[0]).toContain("분산")

    // 극단값 초과
    const result2 = validateGenerationConstraints(
      {
        depth: 0.95,
        lens: 0.95,
        stance: 0.95,
        scope: 0.95,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      },
      { minVariance: 0.1, maxExtremes: 3, logicalCoherence: true }
    )
    expect(result2.valid).toBe(false)
    expect(result2.issues.some((i) => i.includes("극단값"))).toBe(true)

    // 정상
    const result3 = validateGenerationConstraints(
      {
        depth: 0.8,
        lens: 0.3,
        stance: 0.6,
        scope: 0.4,
        taste: 0.7,
        purpose: 0.5,
        sociability: 0.2,
      },
      { minVariance: 0.15, maxExtremes: 3, logicalCoherence: true }
    )
    expect(result3.valid).toBe(true)
  })

  it("8개 콜드스타트 아키타입이 정의되어 있다", () => {
    expect(COLD_START_ARCHETYPES).toHaveLength(8)
    const archetypes = getColdStartArchetypes()
    expect(archetypes[0].vector).toHaveProperty("depth")
    expect(archetypes[0].vector).toHaveProperty("sociability")
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Cost Control (AC4)
// ═══════════════════════════════════════════════════════════════

describe("Cost Control", () => {
  it("유저 수에 따라 스케일 페이즈를 결정한다", () => {
    expect(determineScalePhase(0)).toBe("phase1")
    expect(determineScalePhase(999)).toBe("phase1")
    expect(determineScalePhase(1000)).toBe("phase2")
    expect(determineScalePhase(5000)).toBe("phase3")
    expect(determineScalePhase(20000)).toBe("phase4")
  })

  it("비용 정책을 반환한다", () => {
    const policy = getCostPolicy(2000)
    expect(policy.scalePhase).toBe("phase2")
    expect(policy.maxActivePersonas).toBe(50)
    expect(policy.dailyGenerationLimit).toBe(30)
    expect(policy.modelTier).toBe("economy")
  })

  it("월간 비용을 계산한다", () => {
    const usage = calculateMonthlyCost(100, 100, "economy")
    expect(usage.totalCostKRW).toBe(700) // 100*5 + 100*2
    expect(usage.currentMonth).toMatch(/^\d{4}-\d{2}$/)
  })

  it("생성 가능 여부를 판단한다", () => {
    const policy = getCostPolicy(0)
    expect(canGenerateMore(5, 50, policy).allowed).toBe(true)
    expect(canGenerateMore(10, 50, policy).allowed).toBe(false) // 한도 도달
    expect(canGenerateMore(5, 999999, policy).allowed).toBe(false) // 예산 초과
  })

  it("Zombie 페르소나를 감지한다", () => {
    const now = new Date()
    const old = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000) // 100일 전

    // 정상 페르소나
    const normal = detectZombie("p1", old, now, now, 0)
    expect(normal.zombieLevel).toBe(0)

    // Zombie 레벨 1
    const zombie1 = detectZombie("p2", old, null, null, 1)
    expect(zombie1.zombieLevel).toBe(1)

    // Zombie 레벨 2 (4주 연속)
    const zombie2 = detectZombie("p3", old, null, null, 5)
    expect(zombie2.zombieLevel).toBe(2)
  })

  it("Zombie GC 배치 스캔을 실행한다", () => {
    const now = new Date()
    const old = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000)

    const result = runZombieGCScan([
      {
        id: "p1",
        createdAt: old,
        lastExposureDate: now,
        lastSelectionDate: now,
        consecutiveWeeksZombie: 0,
      },
      {
        id: "p2",
        createdAt: old,
        lastExposureDate: null,
        lastSelectionDate: null,
        consecutiveWeeksZombie: 2,
      },
      {
        id: "p3",
        createdAt: old,
        lastExposureDate: null,
        lastSelectionDate: null,
        consecutiveWeeksZombie: 5,
      },
    ])

    expect(result.total).toBe(3)
    expect(result.zombies.length).toBeGreaterThan(0)
    expect(result.byLevel[0]).toBe(1) // p1은 정상
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Golden Sample (AC5)
// ═══════════════════════════════════════════════════════════════

describe("Golden Sample", () => {
  it("초기 골든 샘플 8개가 정의되어 있다", () => {
    expect(INITIAL_GOLDEN_SAMPLES).toHaveLength(8)
    for (const s of INITIAL_GOLDEN_SAMPLES) {
      expect(s.id).toMatch(/^gs-/)
      expect(s.contentTitle).toBeTruthy()
      expect(s.validationDimensions.length).toBeGreaterThan(0)
      expect(s.isActive).toBe(true)
    }
  })

  it("페르소나 수에 따라 골든 샘플 설정을 반환한다", () => {
    expect(getGoldenSampleConfig(50).poolSize).toBe(10)
    expect(getGoldenSampleConfig(50).samplesPerTest).toBe(1)
    expect(getGoldenSampleConfig(200).poolSize).toBe(30)
    expect(getGoldenSampleConfig(700).poolSize).toBe(100)
    expect(getGoldenSampleConfig(2000).poolSize).toBe(200)
  })

  it("확장 필요 여부를 판단한다", () => {
    const result1 = shouldExpandGoldenSamples(200, 10)
    expect(result1.shouldExpand).toBe(true)
    expect(result1.targetPoolSize).toBe(30)
    expect(result1.expansionCount).toBe(20)

    const result2 = shouldExpandGoldenSamples(50, 10)
    expect(result2.shouldExpand).toBe(false)
  })

  it("품질 메트릭을 계산한다", () => {
    const passRates = new Map([
      ["gs-001", 0.35],
      ["gs-002", 0.55],
      ["gs-003", 0.7],
    ])
    const metrics = calculateGoldenSampleMetrics(INITIAL_GOLDEN_SAMPLES, passRates)
    expect(metrics.totalSamples).toBe(8)
    expect(metrics.activeSamples).toBe(8)
    expect(metrics.avgPassRate).toBeGreaterThan(0)
    expect(metrics.dimensionCoverage).toHaveProperty("depth")
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. Revalidation (AC6)
// ═══════════════════════════════════════════════════════════════

describe("Revalidation", () => {
  it("점수에 따라 등급을 분류한다", () => {
    expect(classifyGrade(0.97)).toBe("ACTIVE")
    expect(classifyGrade(0.95)).toBe("ACTIVE")
    expect(classifyGrade(0.9)).toBe("STANDARD")
    expect(classifyGrade(0.85)).toBe("STANDARD")
    expect(classifyGrade(0.82)).toBe("LEGACY")
    expect(classifyGrade(0.79)).toBe("DEPRECATED")
  })

  it("단일 페르소나를 재검증한다", () => {
    const result = revalidatePersona("p1", "ACTIVE", 0.88, 5, 2)
    expect(result.newGrade).toBe("STANDARD")
    expect(result.gradeChanged).toBe(true)
    expect(result.testedSampleCount).toBe(5)
  })

  it("재검증 배치를 실행한다", () => {
    const personas = [
      { id: "p1", currentGrade: "ACTIVE" as const },
      { id: "p2", currentGrade: "ACTIVE" as const },
      { id: "p3", currentGrade: "STANDARD" as const },
    ]
    const result = runRevalidationBatch(
      personas,
      (id) => (id === "p1" ? 0.97 : id === "p2" ? 0.82 : 0.96),
      5,
      2
    )
    expect(result.totalTested).toBe(3)
    expect(result.downgrades).toBeGreaterThan(0) // p2: ACTIVE → LEGACY
    expect(result.upgrades).toBeGreaterThan(0) // p3: STANDARD → ACTIVE
    expect(result.estimatedCostKRW).toBe(21) // 3 * 7
  })

  it("벡터를 mutation한다", () => {
    const original = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const { mutated, deltas } = mutateVector(original, 0.1, 42)

    for (const dim of Object.keys(mutated)) {
      expect(mutated[dim]).toBeGreaterThanOrEqual(0)
      expect(mutated[dim]).toBeLessThanOrEqual(1)
      expect(Math.abs(deltas[dim])).toBeLessThanOrEqual(0.1)
    }
  })

  it("동일 seed로 동일 mutation을 생성한다", () => {
    const original = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const r1 = mutateVector(original, 0.1, 42)
    const r2 = mutateVector(original, 0.1, 42)
    expect(r1.mutated).toEqual(r2.mutated)
  })

  it("진화 배치를 실행한다", () => {
    const tops = [
      {
        personaId: "p1",
        score: 0.98,
        vector: {
          depth: 0.8,
          lens: 0.6,
          stance: 0.3,
          scope: 0.7,
          taste: 0.5,
          purpose: 0.6,
          sociability: 0.4,
        },
      },
      {
        personaId: "p2",
        score: 0.96,
        vector: {
          depth: 0.6,
          lens: 0.4,
          stance: 0.5,
          scope: 0.5,
          taste: 0.7,
          purpose: 0.4,
          sociability: 0.6,
        },
      },
    ]
    const result = runEvolutionBatch(tops, 3, 0.1)
    expect(result.topPersonas).toHaveLength(2)
    expect(result.mutations).toHaveLength(6) // 2 * 3
    expect(result.mutations[0].sourcePersonaId).toBe("p1")
  })

  it("재검증 비용을 추정한다", () => {
    const cost = estimateRevalidationCost(500)
    expect(cost.costPerQuarter).toBe(3500)
    expect(cost.costPerYear).toBe(14000)
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Dashboard (AC7)
// ═══════════════════════════════════════════════════════════════

describe("Dashboard", () => {
  it("합격률 낮을 때 알림을 생성한다", () => {
    const alerts = generateAlerts(
      0.15,
      {
        currentMonth: "2026-02",
        generationCount: 10,
        testCount: 10,
        totalCostKRW: 100,
        budgetRemaining: 9900,
        budgetUtilization: 0.01,
        isOverBudget: false,
      },
      50,
      0
    )
    expect(alerts.some((a) => a.title === "낮은 합격률")).toBe(true)
  })

  it("예산 초과 시 알림을 생성한다", () => {
    const alerts = generateAlerts(
      0.3,
      {
        currentMonth: "2026-02",
        generationCount: 100,
        testCount: 100,
        totalCostKRW: 999999,
        budgetRemaining: 0,
        budgetUtilization: 10,
        isOverBudget: true,
      },
      50,
      0
    )
    expect(alerts.some((a) => a.severity === "critical")).toBe(true)
  })

  it("Zombie 감지 시 알림을 생성한다", () => {
    const alerts = generateAlerts(
      0.3,
      {
        currentMonth: "2026-02",
        generationCount: 10,
        testCount: 10,
        totalCostKRW: 100,
        budgetRemaining: 9900,
        budgetUtilization: 0.01,
        isOverBudget: false,
      },
      50,
      5
    )
    expect(alerts.some((a) => a.title.includes("Zombie"))).toBe(true)
  })

  it("대시보드를 빌드한다", () => {
    const config = createBatchConfig(50, { dailyLimit: 3 })
    const batch = executeBatch(
      config,
      () => ({ vector: { l1: {}, l2: {}, l3: {} }, prompt: "p", config: {} }),
      () => ({
        results: [],
        breakdown: { vectorAlignment: 0.95, toneMatch: 0.9, reasoningQuality: 0.85 },
      })
    )

    const dashboard = buildDashboard({
      todayBatch: batch,
      recentBatches: [batch],
      costUsage: calculateMonthlyCost(10, 10),
      cumulativeActive: 50,
      strategy: {
        userDriven: 0.6,
        exploration: 0.2,
        gapFilling: 0.2,
        gapRegions: [],
        archetypeDistribution: {},
      },
      goldenSamples: {
        totalSamples: 8,
        activeSamples: 8,
        avgPassRate: 0.5,
        dimensionCoverage: {},
        lastExpansionDate: null,
        nextExpansionTarget: 100,
      },
      lifecycle: {
        active: 50,
        standard: 10,
        legacy: 5,
        deprecated: 2,
        archived: 1,
        zombieCount: 3,
        recentTransitions: [],
      },
    })

    expect(dashboard.todayGenerated).toBe(3)
    expect(dashboard.dailyTrend).toHaveLength(1)
    expect(dashboard.alerts).toBeDefined()
    expect(dashboard.quality.avgConsistency).toBeGreaterThan(0)
  })
})
