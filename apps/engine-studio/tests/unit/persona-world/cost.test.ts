import { describe, it, expect } from "vitest"
import {
  createUsageLog,
  computeDailyCostReport,
  computeMonthlyCostReport,
} from "@/lib/persona-world/cost/usage-tracker"
import type { LlmUsageLog, LLMCallType } from "@/lib/persona-world/cost/usage-tracker"
import {
  checkDailyBudget,
  checkMonthlyBudget,
  checkBudgetAlerts,
  getCostOverrunAction,
  DAILY_THRESHOLDS,
  MONTHLY_THRESHOLDS,
} from "@/lib/persona-world/cost/budget-alert"
import {
  getCostModeConfig,
  getAllCostModes,
  applyCostMode,
  estimateCost,
  compareModes,
} from "@/lib/persona-world/cost/cost-mode"
import {
  getInterviewRateByGrade,
  computeAdaptiveInterviewCost,
  computeBatchCommentCost,
  computeCacheOptimizationCost,
  computeFullOptimization,
  optimizeLlmCallOrdering,
  DEFAULT_BATCH_CONFIG,
} from "@/lib/persona-world/cost/optimizer"
import type { PISGrade } from "@/lib/persona-world/quality/integrity-score"

// ═══ Usage Tracker ═══

describe("Usage Tracker", () => {
  it("LLM 사용 로그 생성 — 비용 계산", () => {
    const log = createUsageLog({
      personaId: "p-1",
      callType: "POST",
      inputTotal: 2000,
      inputCached: 1000,
      output: 500,
      latencyMs: 300,
      model: "claude-sonnet",
    })

    expect(log.personaId).toBe("p-1")
    expect(log.callType).toBe("POST")
    expect(log.tokens.inputTotal).toBe(2000)
    expect(log.tokens.inputCached).toBe(1000)
    expect(log.tokens.output).toBe(500)
    expect(log.cacheHit).toBe(true)
    // inputCost = (1000 / 1M) * 3.0 = 0.003
    expect(log.cost.inputCost).toBeCloseTo(0.003, 4)
    // cacheCost = (1000 / 1M) * 0.3 = 0.0003
    expect(log.cost.cacheCost).toBeCloseTo(0.0003, 4)
    // outputCost = (500 / 1M) * 15.0 = 0.0075
    expect(log.cost.outputCost).toBeCloseTo(0.0075, 4)
    expect(log.cost.totalCost).toBeGreaterThan(0)
    expect(log.id).toMatch(/^llm-/)
  })

  it("캐시 미사용 로그 — cacheHit false", () => {
    const log = createUsageLog({
      personaId: "p-2",
      callType: "COMMENT",
      inputTotal: 1500,
      inputCached: 0,
      output: 200,
      latencyMs: 150,
      model: "claude-sonnet",
    })

    expect(log.cacheHit).toBe(false)
    expect(log.cost.cacheCost).toBe(0)
    // inputCost = (1500 / 1M) * 3.0 = 0.0045
    expect(log.cost.inputCost).toBeCloseTo(0.0045, 4)
  })

  it("일간 비용 리포트 — callType/persona별 집계", () => {
    const now = new Date("2026-02-17T10:00:00Z")
    const logs: LlmUsageLog[] = [
      {
        id: "l1",
        personaId: "p-1",
        callType: "POST",
        tokens: { inputTotal: 2000, inputCached: 1000, output: 500 },
        cost: { inputCost: 0.003, cacheCost: 0.0003, outputCost: 0.0075, totalCost: 0.0108 },
        latencyMs: 300,
        model: "claude-sonnet",
        cacheHit: true,
        timestamp: now,
      },
      {
        id: "l2",
        personaId: "p-1",
        callType: "COMMENT",
        tokens: { inputTotal: 1000, inputCached: 500, output: 200 },
        cost: { inputCost: 0.0015, cacheCost: 0.00015, outputCost: 0.003, totalCost: 0.00465 },
        latencyMs: 150,
        model: "claude-sonnet",
        cacheHit: true,
        timestamp: now,
      },
      {
        id: "l3",
        personaId: "p-2",
        callType: "POST",
        tokens: { inputTotal: 2000, inputCached: 0, output: 500 },
        cost: { inputCost: 0.006, cacheCost: 0, outputCost: 0.0075, totalCost: 0.0135 },
        latencyMs: 400,
        model: "claude-sonnet",
        cacheHit: false,
        timestamp: now,
      },
    ]

    const report = computeDailyCostReport(logs, 10)

    expect(report.totalCalls).toBe(3)
    expect(report.totalCost).toBeGreaterThan(0)
    expect(report.byCallType.length).toBeGreaterThanOrEqual(2) // POST, COMMENT
    expect(report.byPersona.length).toBe(2) // p-1, p-2
    expect(report.cacheEfficiency.totalInputTokens).toBe(5000)
    expect(report.cacheEfficiency.cachedTokens).toBe(1500)
    expect(report.cacheEfficiency.cacheHitRate).toBeCloseTo(0.3, 1)
    expect(report.budgetUsage).toBeDefined()
    expect(report.budgetUsage!.budget).toBe(10)
  })

  it("일간 리포트 — 빈 로그", () => {
    const report = computeDailyCostReport([])
    expect(report.totalCost).toBe(0)
    expect(report.totalCalls).toBe(0)
    expect(report.byCallType).toHaveLength(0)
    expect(report.byPersona).toHaveLength(0)
    expect(report.cacheEfficiency.cacheHitRate).toBe(0)
  })

  it("월간 비용 리포트 — 일별 트렌드 + 프로젝션", () => {
    const dailyReports = [
      {
        date: "2026-02-01",
        totalCost: 5.0,
        totalCalls: 100,
        byCallType: [],
        byPersona: [],
        cacheEfficiency: {
          totalInputTokens: 0,
          cachedTokens: 0,
          cacheHitRate: 0,
          estimatedSavings: 0,
        },
      },
      {
        date: "2026-02-02",
        totalCost: 6.0,
        totalCalls: 120,
        byCallType: [],
        byPersona: [],
        cacheEfficiency: {
          totalInputTokens: 0,
          cachedTokens: 0,
          cacheHitRate: 0,
          estimatedSavings: 0,
        },
      },
    ]

    const report = computeMonthlyCostReport(dailyReports, 200, 28)

    expect(report.totalCost).toBeCloseTo(11.0, 1)
    expect(report.totalCalls).toBe(220)
    expect(report.dailyTrend).toHaveLength(2)
    // avgDaily = 11/2 = 5.5, remaining = 26, projected = 11 + 5.5*26 = 154
    expect(report.projectedEndOfMonth).toBeGreaterThan(100)
    expect(report.budgetUsage).toBeDefined()
    expect(report.budgetUsage!.budget).toBe(200)
  })
})

// ═══ Budget Alert ═══

describe("Budget Alert", () => {
  it("임계값 상수 검증", () => {
    expect(DAILY_THRESHOLDS.info).toBe(0.5)
    expect(DAILY_THRESHOLDS.warning).toBe(0.8)
    expect(DAILY_THRESHOLDS.critical).toBe(1.0)
    expect(DAILY_THRESHOLDS.emergency).toBe(1.5)

    expect(MONTHLY_THRESHOLDS.info).toBe(0.6)
    expect(MONTHLY_THRESHOLDS.emergency).toBe(1.0)
  })

  it("일일 예산 50% → INFO", () => {
    const alert = checkDailyBudget(5, 10) // 50%
    expect(alert).not.toBeNull()
    expect(alert!.level).toBe("INFO")
    expect(alert!.period).toBe("DAILY")
    expect(alert!.autoAction).toBeNull()
  })

  it("일일 예산 80% → WARNING + 자동 조치", () => {
    const alert = checkDailyBudget(8, 10) // 80%
    expect(alert).not.toBeNull()
    expect(alert!.level).toBe("WARNING")
    expect(alert!.autoAction).not.toBeNull()
    expect(alert!.autoAction!.type).toBe("REDUCE_POST_FREQUENCY")
  })

  it("일일 예산 100% → CRITICAL", () => {
    const alert = checkDailyBudget(10, 10) // 100%
    expect(alert).not.toBeNull()
    expect(alert!.level).toBe("CRITICAL")
    expect(alert!.autoAction!.type).toBe("FREEZE_GENERATION")
  })

  it("일일 예산 150% → EMERGENCY + GLOBAL_FREEZE", () => {
    const alert = checkDailyBudget(15, 10) // 150%
    expect(alert).not.toBeNull()
    expect(alert!.level).toBe("EMERGENCY")
    expect(alert!.autoAction!.type).toBe("GLOBAL_FREEZE")
  })

  it("일일 예산 30% → null (임계값 미만)", () => {
    const alert = checkDailyBudget(3, 10) // 30%
    expect(alert).toBeNull()
  })

  it("월간 예산 체크 — 90% → CRITICAL", () => {
    const alert = checkMonthlyBudget(180, 200) // 90%
    expect(alert).not.toBeNull()
    expect(alert!.level).toBe("CRITICAL")
    expect(alert!.period).toBe("MONTHLY")
  })

  it("전체 예산 체크 — 심각도 정렬", () => {
    const alerts = checkBudgetAlerts({
      dailySpending: 15, // 150% → EMERGENCY
      dailyBudget: 10,
      monthlySpending: 160, // 80% → WARNING
      monthlyBudget: 200,
    })

    expect(alerts.length).toBe(2)
    // EMERGENCY가 먼저
    expect(alerts[0].level).toBe("EMERGENCY")
    expect(alerts[1].level).toBe("WARNING")
  })

  it("비용 초과 액션 — 구간별", () => {
    expect(getCostOverrunAction(70)).toBeNull()
    expect(getCostOverrunAction(80)!.type).toBe("REDUCE_POST_FREQUENCY")
    expect(getCostOverrunAction(100)!.type).toBe("FREEZE_GENERATION")
    expect(getCostOverrunAction(120)!.type).toBe("FREEZE_AUTONOMOUS")
    expect(getCostOverrunAction(150)!.type).toBe("GLOBAL_FREEZE")
  })

  it("예산 0 → null 반환", () => {
    expect(checkDailyBudget(5, 0)).toBeNull()
    expect(checkMonthlyBudget(100, 0)).toBeNull()
  })
})

// ═══ Cost Mode ═══

describe("Cost Mode", () => {
  it("3종 모드 설정 조회", () => {
    const modes = getAllCostModes()
    expect(modes).toHaveLength(3)

    const labels = modes.map((m) => m.mode)
    expect(labels).toContain("QUALITY")
    expect(labels).toContain("BALANCE")
    expect(labels).toContain("COST_PRIORITY")
  })

  it("QUALITY 모드 — 최대 활동", () => {
    const config = getCostModeConfig("QUALITY")
    expect(config.frequencies.postsPerDay).toBe(2)
    expect(config.frequencies.commentsPerDay).toBe(5)
    expect(config.frequencies.interviewSampleRate).toBe(0.2)
    expect(config.estimates.perPersonaMonthly).toBe(2.4)
    expect(config.estimates.expectedMinPIS).toBe(0.85)
  })

  it("COST_PRIORITY 모드 — 최소 비용", () => {
    const config = getCostModeConfig("COST_PRIORITY")
    expect(config.frequencies.postsPerDay).toBe(1)
    expect(config.frequencies.commentsPerDay).toBe(2)
    expect(config.estimates.perPersonaMonthly).toBe(1.2)
    expect(config.estimates.expectedMinPIS).toBe(0.75)
  })

  it("모드 적용 — 100 페르소나", () => {
    const result = applyCostMode("BALANCE", 100)
    expect(result.mode).toBe("BALANCE")
    expect(result.schedulerUpdates.postFrequency).toBe(1.5)
    expect(result.schedulerUpdates.commentFrequency).toBe(3)
    expect(result.interviewSampling).toBe(0.1)
    // BALANCE: 120/100*100 = 120/month
    expect(result.estimatedBudget.monthlyBudget).toBe(120)
    expect(result.estimatedBudget.dailyBudget).toBeGreaterThan(0)
  })

  it("비용 추정 — 인프라 포함", () => {
    const estimate = estimateCost("QUALITY", 200)
    expect(estimate.mode).toBe("QUALITY")
    expect(estimate.personaCount).toBe(200)
    // LLM: 190/100*200 = 380
    expect(estimate.monthlyLlmCost).toBe(380)
    // Infra: 50 + 200*0.1 = 70
    expect(estimate.monthlyInfra).toBe(70)
    expect(estimate.monthlyTotal).toBe(450)
    expect(estimate.perPersonaCost).toBeCloseTo(2.25, 2)
  })

  it("모드 비교 — 3종 비교표", () => {
    const comparison = compareModes(100)
    expect(comparison).toHaveLength(3)

    // QUALITY > BALANCE > COST_PRIORITY (비용 순)
    const costs = comparison.map((c) => c.monthlyTotal)
    expect(costs[0]).toBeGreaterThan(costs[1])
    expect(costs[1]).toBeGreaterThan(costs[2])
  })

  it("0 페르소나 — perPersonaCost 0", () => {
    const estimate = estimateCost("BALANCE", 0)
    expect(estimate.perPersonaCost).toBe(0)
    expect(estimate.monthlyLlmCost).toBe(0)
  })
})

// ═══ Optimizer ═══

describe("Optimizer", () => {
  it("PIS 등급별 인터뷰 비율", () => {
    expect(getInterviewRateByGrade("EXCELLENT")).toBeCloseTo(1 / 14, 4)
    expect(getInterviewRateByGrade("GOOD")).toBeCloseTo(1 / 7, 4)
    expect(getInterviewRateByGrade("WARNING")).toBeCloseTo(2 / 7, 4)
    expect(getInterviewRateByGrade("CRITICAL")).toBe(1)
    expect(getInterviewRateByGrade("QUARANTINE")).toBe(1)
  })

  it("적응적 인터뷰 비용 — EXCELLENT 다수 시 절감", () => {
    const personas = Array.from({ length: 100 }, (_, i) => ({
      personaId: `p-${i}`,
      grade: "EXCELLENT" as PISGrade,
    }))

    const result = computeAdaptiveInterviewCost(personas)
    expect(result.strategy).toContain("적응적 인터뷰")
    expect(result.savings).toBeGreaterThan(0)
    expect(result.savingsPercentage).toBeGreaterThan(0)
    expect(result.afterCost).toBeLessThan(result.beforeCost)
  })

  it("적응적 인터뷰 — CRITICAL 다수 시 비용 증가 가능", () => {
    const personas = Array.from({ length: 100 }, (_, i) => ({
      personaId: `p-${i}`,
      grade: "CRITICAL" as PISGrade,
    }))

    const result = computeAdaptiveInterviewCost(personas)
    // CRITICAL은 매일 인터뷰 → 20% 샘플링보다 비용 높을 수 있음
    expect(result.afterCost).toBeGreaterThanOrEqual(result.beforeCost)
    expect(result.savings).toBe(0) // Math.max(0, savings)
  })

  it("댓글 배치 처리 — 비용 절감", () => {
    const result = computeBatchCommentCost(500)
    expect(result.strategy).toContain("배치")
    expect(result.savings).toBeGreaterThan(0)
    expect(result.savingsPercentage).toBeGreaterThan(0)
    expect(result.afterCost).toBeLessThan(result.beforeCost)
  })

  it("배치 설정 기본값", () => {
    expect(DEFAULT_BATCH_CONFIG.maxBatchSize).toBe(3)
    expect(DEFAULT_BATCH_CONFIG.avgBatchSize).toBe(2)
    expect(DEFAULT_BATCH_CONFIG.batchCostMultiplier).toBe(1.35)
  })

  it("캐시 최적화 — 적중률 향상", () => {
    const result = computeCacheOptimizationCost(300, 0.0081, 0.95, 0.98)
    expect(result.strategy).toContain("캐시")
    expect(result.savings).toBeGreaterThan(0)
    expect(result.afterCost).toBeLessThan(result.beforeCost)
  })

  it("전체 최적화 — 3전략 종합", () => {
    const personas = Array.from({ length: 100 }, (_, i) => ({
      personaId: `p-${i}`,
      grade: (i < 70 ? "EXCELLENT" : i < 90 ? "GOOD" : "WARNING") as PISGrade,
    }))

    const summary = computeFullOptimization({
      personas,
      dailyComments: 500,
      dailyPosts: 300,
    })

    expect(summary.strategies).toHaveLength(3)
    expect(summary.totalSavings).toBeGreaterThan(0)
    expect(summary.totalSavingsPercentage).toBeGreaterThan(0)
    expect(summary.totalAfterCost).toBeLessThan(summary.totalBeforeCost)
  })

  it("LLM 호출 순서 최적화 — Static 블록 그룹핑", () => {
    const calls = [
      { personaId: "p-1", callType: "POST", staticBlockHash: "hash-A", scheduledAt: new Date() },
      { personaId: "p-2", callType: "POST", staticBlockHash: "hash-B", scheduledAt: new Date() },
      { personaId: "p-3", callType: "POST", staticBlockHash: "hash-A", scheduledAt: new Date() },
      { personaId: "p-4", callType: "POST", staticBlockHash: "hash-A", scheduledAt: new Date() },
      { personaId: "p-5", callType: "POST", staticBlockHash: "hash-B", scheduledAt: new Date() },
    ]

    const optimized = optimizeLlmCallOrdering(calls)

    expect(optimized).toHaveLength(5)
    // hash-A 그룹 (3개)이 먼저, hash-B 그룹 (2개)이 뒤에
    expect(optimized[0].staticBlockHash).toBe("hash-A")
    expect(optimized[1].staticBlockHash).toBe("hash-A")
    expect(optimized[2].staticBlockHash).toBe("hash-A")
    expect(optimized[3].staticBlockHash).toBe("hash-B")
    expect(optimized[4].staticBlockHash).toBe("hash-B")
  })

  it("빈 호출 목록 최적화", () => {
    const optimized = optimizeLlmCallOrdering([])
    expect(optimized).toHaveLength(0)
  })
})

// ═══ Cost Integration ═══

import { vi } from "vitest"
import type { CostDataProvider } from "@/lib/persona-world/cost/cost-integration"
import { buildCostDashboard, changeCostMode } from "@/lib/persona-world/cost/cost-integration"
import type { CostMode } from "@/lib/persona-world/cost/cost-mode"

function createMockCostDataProvider(overrides?: Partial<CostDataProvider>): CostDataProvider {
  const mockLogs: LlmUsageLog[] = [
    {
      id: "log-1",
      personaId: "p-1",
      callType: "POST",
      tokens: { inputTotal: 4100, inputCached: 3900, output: 300 },
      cost: { inputCost: 0.0006, cacheCost: 0.00117, outputCost: 0.0045, totalCost: 0.00627 },
      latencyMs: 500,
      model: "claude-sonnet",
      cacheHit: true,
      timestamp: new Date("2026-02-21T10:00:00Z"),
    },
    {
      id: "log-2",
      personaId: "p-1",
      callType: "COMMENT",
      tokens: { inputTotal: 2800, inputCached: 2500, output: 150 },
      cost: { inputCost: 0.0009, cacheCost: 0.00075, outputCost: 0.00225, totalCost: 0.0039 },
      latencyMs: 300,
      model: "claude-sonnet",
      cacheHit: true,
      timestamp: new Date("2026-02-21T10:30:00Z"),
    },
    {
      id: "log-3",
      personaId: "p-2",
      callType: "INTERVIEW",
      tokens: { inputTotal: 2500, inputCached: 2000, output: 200 },
      cost: { inputCost: 0.0015, cacheCost: 0.0006, outputCost: 0.003, totalCost: 0.0051 },
      latencyMs: 800,
      model: "claude-sonnet",
      cacheHit: true,
      timestamp: new Date("2026-02-21T11:00:00Z"),
    },
  ]

  let currentMode: CostMode = "QUALITY"

  return {
    getTodayUsageLogs: vi.fn().mockResolvedValue(mockLogs),
    getMonthDailyReports: vi.fn().mockResolvedValue([]),
    getCurrentCostMode: vi.fn().mockImplementation(() => Promise.resolve(currentMode)),
    setCostMode: vi.fn().mockImplementation((mode: CostMode) => {
      currentMode = mode
      return Promise.resolve()
    }),
    getDailyBudget: vi.fn().mockResolvedValue(8),
    getMonthlyBudget: vi.fn().mockResolvedValue(240),
    getMonthlySpending: vi.fn().mockResolvedValue(95),
    getActivePersonaCount: vi.fn().mockResolvedValue(100),
    getPersonaPISDistribution: vi.fn().mockResolvedValue(
      Array.from({ length: 100 }, (_, i) => ({
        personaId: `p-${i}`,
        grade: i < 45 ? "EXCELLENT" : i < 83 ? "GOOD" : i < 95 ? "WARNING" : "CRITICAL",
      }))
    ),
    getDailyCommentCount: vi.fn().mockResolvedValue(500),
    getDailyPostCount: vi.fn().mockResolvedValue(200),
    ...overrides,
  }
}

describe("Cost Integration", () => {
  it("대시보드 빌드 — 전체 데이터 수집", async () => {
    const provider = createMockCostDataProvider()
    const dashboard = await buildCostDashboard(provider)

    // 일간 리포트
    expect(dashboard.dailyReport.totalCalls).toBe(3)
    expect(dashboard.dailyReport.totalCost).toBeGreaterThan(0)
    expect(dashboard.dailyReport.byCallType.length).toBeGreaterThanOrEqual(2)
    expect(dashboard.dailyReport.budgetUsage).toBeDefined()

    // 월간 리포트
    expect(dashboard.monthlyReport).toBeDefined()
    expect(dashboard.monthlyReport.month).toBeDefined()

    // 비용 모드
    expect(dashboard.currentMode.mode).toBe("QUALITY")
    expect(dashboard.currentMode.frequencies.postsPerDay).toBe(2)

    // 모드 적용
    expect(dashboard.modeApplication.mode).toBe("QUALITY")
    expect(dashboard.modeApplication.estimatedBudget.monthlyBudget).toBeGreaterThan(0)

    // 모드 비교
    expect(dashboard.modeComparison).toHaveLength(3)

    // 최적화
    expect(dashboard.optimization.strategies).toHaveLength(3)
    expect(dashboard.optimization.totalSavings).toBeGreaterThanOrEqual(0)
  })

  it("대시보드 — 예산 알림 생성", async () => {
    const provider = createMockCostDataProvider({
      // 일일 예산의 80% 이상 사용 시 WARNING 발생하도록
      getTodayUsageLogs: vi.fn().mockResolvedValue(
        Array.from({ length: 200 }, (_, i) => ({
          id: `log-${i}`,
          personaId: "p-1",
          callType: "POST" as LLMCallType,
          tokens: { inputTotal: 4000, inputCached: 3000, output: 300 },
          cost: { inputCost: 0.003, cacheCost: 0.0009, outputCost: 0.0045, totalCost: 0.05 },
          latencyMs: 300,
          model: "claude-sonnet",
          cacheHit: true,
          timestamp: new Date("2026-02-21T10:00:00Z"),
        }))
      ),
    })

    const dashboard = await buildCostDashboard(provider)

    // 200 * $0.05 = $10 → 일일 예산 $8 기준 125% → CRITICAL
    expect(dashboard.alerts.length).toBeGreaterThan(0)
    const dailyAlert = dashboard.alerts.find((a) => a.period === "DAILY")
    expect(dailyAlert).toBeDefined()
    expect(dailyAlert!.level).toBe("CRITICAL")
  })

  it("비용 모드 변경 — QUALITY → BALANCE", async () => {
    const provider = createMockCostDataProvider()
    const result = await changeCostMode(provider, "BALANCE")

    expect(result.mode).toBe("BALANCE")
    expect(result.schedulerUpdates.postFrequency).toBe(1.5)
    expect(result.schedulerUpdates.commentFrequency).toBe(3)
    expect(result.interviewSampling).toBe(0.1)
    expect(result.estimatedBudget.monthlyBudget).toBe(120) // 100명 × $1.2
    expect(provider.setCostMode).toHaveBeenCalledWith("BALANCE")
  })

  it("비용 모드 변경 — COST_PRIORITY", async () => {
    const provider = createMockCostDataProvider()
    const result = await changeCostMode(provider, "COST_PRIORITY")

    expect(result.mode).toBe("COST_PRIORITY")
    expect(result.schedulerUpdates.postFrequency).toBe(1)
    expect(result.schedulerUpdates.commentFrequency).toBe(2)
    expect(result.interviewSampling).toBe(0.05)
    expect(result.estimatedBudget.monthlyBudget).toBe(70) // 100명 × $0.7
  })

  it("대시보드 — 빈 사용 로그", async () => {
    const provider = createMockCostDataProvider({
      getTodayUsageLogs: vi.fn().mockResolvedValue([]),
    })

    const dashboard = await buildCostDashboard(provider)

    expect(dashboard.dailyReport.totalCalls).toBe(0)
    expect(dashboard.dailyReport.totalCost).toBe(0)
    expect(dashboard.alerts).toHaveLength(0) // 지출 없으면 알림 없음
  })

  it("대시보드 — 모든 provider 메서드 호출됨", async () => {
    const provider = createMockCostDataProvider()
    await buildCostDashboard(provider)

    expect(provider.getTodayUsageLogs).toHaveBeenCalled()
    expect(provider.getMonthDailyReports).toHaveBeenCalled()
    expect(provider.getCurrentCostMode).toHaveBeenCalled()
    expect(provider.getDailyBudget).toHaveBeenCalled()
    expect(provider.getMonthlyBudget).toHaveBeenCalled()
    expect(provider.getMonthlySpending).toHaveBeenCalled()
    expect(provider.getActivePersonaCount).toHaveBeenCalled()
    expect(provider.getPersonaPISDistribution).toHaveBeenCalled()
    expect(provider.getDailyCommentCount).toHaveBeenCalled()
    expect(provider.getDailyPostCount).toHaveBeenCalled()
  })

  it("대시보드 — 캐시 효율 집계", async () => {
    const provider = createMockCostDataProvider()
    const dashboard = await buildCostDashboard(provider)

    const cache = dashboard.dailyReport.cacheEfficiency
    expect(cache.totalInputTokens).toBe(4100 + 2800 + 2500) // 9400
    expect(cache.cachedTokens).toBe(3900 + 2500 + 2000) // 8400
    expect(cache.cacheHitRate).toBeGreaterThan(0.85) // 8400/9400 ≈ 0.894
    expect(cache.estimatedSavings).toBeGreaterThan(0)
  })

  it("대시보드 — 최적화 전략 절감액", async () => {
    const provider = createMockCostDataProvider()
    const dashboard = await buildCostDashboard(provider)

    const strategies = dashboard.optimization.strategies
    expect(strategies).toHaveLength(3)

    // 적응적 인터뷰 전략 존재
    expect(strategies.some((s) => s.strategy.includes("인터뷰"))).toBe(true)
    // 배치 처리 전략 존재
    expect(strategies.some((s) => s.strategy.includes("배치"))).toBe(true)
    // 캐시 최적화 전략 존재
    expect(strategies.some((s) => s.strategy.includes("캐시"))).toBe(true)
  })
})
