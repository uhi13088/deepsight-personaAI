import { describe, it, expect, vi } from "vitest"
import {
  OPERATION_SCHEDULES,
  startJobExecution,
  completeJobExecution,
  failJobExecution,
  getNextRunTime,
  getJobsByCategory,
  shouldRunNow,
  summarizeExecutions,
} from "@/lib/persona-world/admin/scheduled-jobs"
import {
  computeServiceKPIs,
  computeUserExperienceKPIs,
  computeKPISummary,
  analyzeKPITrend,
} from "@/lib/persona-world/admin/kpi-tracker"
import type { JobDataProvider } from "@/lib/persona-world/admin/job-runner"
import {
  runDailyInterview,
  runWeeklyPISReport,
  runDailyPatternAnalysis,
  runHourlyMetrics,
  runDailyCostReport,
  runWeeklyArena,
  runDailyLogCleanup,
  runDailyQuarantineExpiry,
  executeJob,
  executeDueJobs,
} from "@/lib/persona-world/admin/job-runner"
import type { KPIDataProvider } from "@/lib/persona-world/admin/kpi-aggregator"
import {
  aggregateServiceKPIInput,
  aggregateUXKPIInput,
  aggregateAllKPIInputs,
} from "@/lib/persona-world/admin/kpi-aggregator"

// ── Mock Providers ──────────────────────────────────────────

function createMockJobProvider(overrides?: Partial<JobDataProvider>): JobDataProvider {
  return {
    getInterviewCandidateCount: vi.fn().mockResolvedValue(50),
    runAutoInterviews: vi.fn().mockResolvedValue({ processed: 10, alerts: 2 }),
    computeAllPIS: vi.fn().mockResolvedValue({ count: 50, avgScore: 0.82, belowThreshold: 3 }),
    detectPatternAnomalies: vi.fn().mockResolvedValue({ checked: 100, anomalies: 1 }),
    aggregateHourlyMetrics: vi.fn().mockResolvedValue({
      posts: 5,
      comments: 12,
      likes: 30,
      follows: 3,
      llmCalls: 8,
      tokenUsage: 1200,
    }),
    generateDailyCostReport: vi.fn().mockResolvedValue({
      totalCost: 1.5,
      budgetUsagePercent: 15,
      alerts: 0,
    }),
    getWarningPersonaIds: vi.fn().mockResolvedValue(["p1", "p2"]),
    scheduleArenaSessions: vi.fn().mockResolvedValue({ scheduled: 2 }),
    archiveExpiredLogs: vi.fn().mockResolvedValue({ archived: 150 }),
    expireQuarantinedContent: vi.fn().mockResolvedValue({ expired: 3, rejected: 3 }),
    ...overrides,
  }
}

function createMockKPIProvider(overrides?: Partial<KPIDataProvider>): KPIDataProvider {
  return {
    countActivePersonas: vi.fn().mockResolvedValue(45),
    countTotalPersonas: vi.fn().mockResolvedValue(50),
    getAveragePIS: vi.fn().mockResolvedValue(0.82),
    countTotalPosts: vi.fn().mockResolvedValue(200),
    countTotalComments: vi.fn().mockResolvedValue(500),
    countTotalLikes: vi.fn().mockResolvedValue(1500),
    countTotalFollows: vi.fn().mockResolvedValue(80),
    countFactbookViolations: vi.fn().mockResolvedValue(1),
    countQuarantinedContent: vi.fn().mockResolvedValue(3),
    countTotalContent: vi.fn().mockResolvedValue(700),
    getAvgReportResolutionMinutes: vi.fn().mockResolvedValue(25),
    countKillSwitchActivations: vi.fn().mockResolvedValue(0),
    countCacheHits: vi.fn().mockResolvedValue(80),
    countTotalLLMCalls: vi.fn().mockResolvedValue(100),
    getAvgSessionDurationMinutes: vi.fn().mockResolvedValue(12),
    getAvgFeedScrollCount: vi.fn().mockResolvedValue(25),
    countProfileVisits: vi.fn().mockResolvedValue(100),
    countUserFollows: vi.fn().mockResolvedValue(25),
    countFeedImpressions: vi.fn().mockResolvedValue(5000),
    countUserComments: vi.fn().mockResolvedValue(100),
    countOnboardingStarted: vi.fn().mockResolvedValue(200),
    countOnboardingCompleted: vi.fn().mockResolvedValue(150),
    countModeratedContent: vi.fn().mockResolvedValue(5),
    ...overrides,
  }
}

// ═══ Scheduled Jobs ═══

describe("Scheduled Jobs", () => {
  it("8종 스케줄 등록", () => {
    expect(OPERATION_SCHEDULES).toHaveLength(8)
  })

  it("카테고리별 분류: 품질 3, 운영 3, 정리 2", () => {
    const quality = getJobsByCategory("QUALITY")
    const ops = getJobsByCategory("OPERATIONS")
    const cleanup = getJobsByCategory("CLEANUP")
    expect(quality).toHaveLength(3)
    expect(ops).toHaveLength(3)
    expect(cleanup).toHaveLength(2)
  })

  it("Job 실행 시작 → RUNNING", () => {
    const exec = startJobExecution("daily-interview")
    expect(exec.status).toBe("RUNNING")
    expect(exec.jobId).toBe("daily-interview")
  })

  it("Job 실행 완료 → COMPLETED", () => {
    const exec = startJobExecution("daily-interview")
    const completed = completeJobExecution(exec, {
      processedCount: 20,
      alertsGenerated: 2,
      details: "20 personas interviewed",
    })
    expect(completed.status).toBe("COMPLETED")
    expect(completed.result?.processedCount).toBe(20)
    expect(completed.durationMs).toBeGreaterThanOrEqual(0)
  })

  it("Job 실행 실패 → FAILED", () => {
    const exec = startJobExecution("daily-interview")
    const failed = failJobExecution(exec, "DB connection error")
    expect(failed.status).toBe("FAILED")
    expect(failed.error).toBe("DB connection error")
  })

  it("shouldRunNow — 매시간 Job", () => {
    const hourlyJob = OPERATION_SCHEDULES.find((j) => j.id === "hourly-metrics")!
    const now = new Date("2026-02-17T10:00:00Z")
    expect(shouldRunNow(hourlyJob, now)).toBe(true)

    const notNow = new Date("2026-02-17T10:30:00Z")
    expect(shouldRunNow(hourlyJob, notNow)).toBe(false)
  })

  it("shouldRunNow — 매일 새벽 3시 Job", () => {
    const dailyJob = OPERATION_SCHEDULES.find((j) => j.id === "daily-interview")!
    const at3am = new Date("2026-02-17T03:00:00Z")
    expect(shouldRunNow(dailyJob, at3am)).toBe(true)

    const at4am = new Date("2026-02-17T04:00:00Z")
    expect(shouldRunNow(dailyJob, at4am)).toBe(false)
  })

  it("getNextRunTime — 매시간", () => {
    const from = new Date("2026-02-17T10:30:00Z")
    const next = getNextRunTime("0 * * * *", from)
    expect(next.getHours()).toBe(11)
    expect(next.getMinutes()).toBe(0)
  })

  it("getNextRunTime — 매일", () => {
    const from = new Date("2026-02-17T10:00:00Z")
    const next = getNextRunTime("0 3 * * *", from)
    // 이미 3시 지났으므로 다음날
    expect(next.getDate()).toBe(18)
    expect(next.getHours()).toBe(3)
  })

  it("실행 이력 요약", () => {
    const executions = [
      completeJobExecution(startJobExecution("test"), {
        processedCount: 10,
        alertsGenerated: 0,
        details: "",
      }),
      completeJobExecution(startJobExecution("test"), {
        processedCount: 15,
        alertsGenerated: 1,
        details: "",
      }),
      failJobExecution(startJobExecution("test"), "error"),
    ]

    const summary = summarizeExecutions(executions)
    expect(summary.totalRuns).toBe(3)
    expect(summary.successCount).toBe(2)
    expect(summary.failureCount).toBe(1)
  })

  it("빈 실행 이력 요약", () => {
    const summary = summarizeExecutions([])
    expect(summary.totalRuns).toBe(0)
  })
})

// ═══ KPI Tracker ═══

describe("Service KPIs", () => {
  it("정상 상태 → 전부 HEALTHY", () => {
    const kpis = computeServiceKPIs({
      activePersonas: 95,
      totalPersonas: 100,
      averagePIS: 0.85,
      totalLikes: 500,
      totalComments: 500,
      totalPosts: 50,
      factbookViolations: 0,
      quarantinedContent: 1,
      totalContent: 200,
      avgReportResolutionMinutes: 15,
      killSwitchActivations: 0,
      cacheHits: 400,
      totalLLMCalls: 500,
    })

    expect(kpis.personaActiveRate.status).toBe("HEALTHY")
    expect(kpis.averagePIS.status).toBe("HEALTHY")
    expect(kpis.engagementPerPost.status).toBe("HEALTHY")
    expect(kpis.factbookViolationRate.status).toBe("HEALTHY")
    expect(kpis.quarantineRate.status).toBe("HEALTHY")
    expect(kpis.reportResolutionTime.status).toBe("HEALTHY")
  })

  it("활성률 저하 → WARNING", () => {
    const kpis = computeServiceKPIs({
      activePersonas: 87,
      totalPersonas: 100,
      averagePIS: 0.85,
      totalLikes: 0,
      totalComments: 0,
      totalPosts: 0,
      factbookViolations: 0,
      quarantinedContent: 0,
      totalContent: 0,
      avgReportResolutionMinutes: 0,
      killSwitchActivations: 0,
      cacheHits: 0,
      totalLLMCalls: 0,
    })
    expect(kpis.personaActiveRate.status).toBe("WARNING")
  })

  it("PIS 임계 → CRITICAL", () => {
    const kpis = computeServiceKPIs({
      activePersonas: 100,
      totalPersonas: 100,
      averagePIS: 0.6,
      totalLikes: 0,
      totalComments: 0,
      totalPosts: 0,
      factbookViolations: 0,
      quarantinedContent: 0,
      totalContent: 0,
      avgReportResolutionMinutes: 0,
      killSwitchActivations: 0,
      cacheHits: 0,
      totalLLMCalls: 0,
    })
    expect(kpis.averagePIS.status).toBe("CRITICAL")
  })

  it("Kill Switch 발동 → CRITICAL", () => {
    const kpis = computeServiceKPIs({
      activePersonas: 100,
      totalPersonas: 100,
      averagePIS: 0.85,
      totalLikes: 0,
      totalComments: 0,
      totalPosts: 0,
      factbookViolations: 0,
      quarantinedContent: 0,
      totalContent: 0,
      avgReportResolutionMinutes: 0,
      killSwitchActivations: 1,
      cacheHits: 0,
      totalLLMCalls: 0,
    })
    expect(kpis.killSwitchCount.status).toBe("CRITICAL")
  })

  it("lower_is_better: 위반율 높으면 WARNING/CRITICAL", () => {
    const kpis = computeServiceKPIs({
      activePersonas: 100,
      totalPersonas: 100,
      averagePIS: 0.85,
      totalLikes: 0,
      totalComments: 0,
      totalPosts: 100,
      factbookViolations: 3, // 3% > 2% alert threshold
      quarantinedContent: 0,
      totalContent: 0,
      avgReportResolutionMinutes: 0,
      killSwitchActivations: 0,
      cacheHits: 0,
      totalLLMCalls: 0,
    })
    expect(kpis.factbookViolationRate.status).toBe("CRITICAL")
  })
})

describe("UX KPIs", () => {
  it("정상 UX → HEALTHY", () => {
    const kpis = computeUserExperienceKPIs({
      avgSessionDurationMinutes: 15,
      avgFeedScrollCount: 40,
      profileVisits: 100,
      follows: 25,
      feedImpressions: 1000,
      commentsWritten: 60,
      onboardingStarted: 100,
      onboardingCompleted: 80,
      totalContent: 1000,
      moderatedContent: 5,
    })

    expect(kpis.avgSessionDuration.status).toBe("HEALTHY")
    expect(kpis.feedScrollCount.status).toBe("HEALTHY")
    expect(kpis.followConversionRate.status).toBe("HEALTHY")
    expect(kpis.commentParticipationRate.status).toBe("HEALTHY")
    expect(kpis.onboardingCompletionRate.status).toBe("HEALTHY")
    expect(kpis.moderationRate.status).toBe("HEALTHY")
  })

  it("체류시간 부족 → CRITICAL", () => {
    const kpis = computeUserExperienceKPIs({
      avgSessionDurationMinutes: 3,
      avgFeedScrollCount: 10,
      profileVisits: 0,
      follows: 0,
      feedImpressions: 0,
      commentsWritten: 0,
      onboardingStarted: 0,
      onboardingCompleted: 0,
      totalContent: 0,
      moderatedContent: 0,
    })
    expect(kpis.avgSessionDuration.status).toBe("CRITICAL")
  })

  it("모더레이션 비율 높으면 CRITICAL", () => {
    const kpis = computeUserExperienceKPIs({
      avgSessionDurationMinutes: 15,
      avgFeedScrollCount: 30,
      profileVisits: 100,
      follows: 20,
      feedImpressions: 1000,
      commentsWritten: 50,
      onboardingStarted: 100,
      onboardingCompleted: 70,
      totalContent: 100,
      moderatedContent: 5, // 5% > 3% alert
    })
    expect(kpis.moderationRate.status).toBe("CRITICAL")
  })
})

describe("KPI Summary", () => {
  it("전체 요약 계산", () => {
    const summary = computeKPISummary(
      {
        activePersonas: 95,
        totalPersonas: 100,
        averagePIS: 0.85,
        totalLikes: 500,
        totalComments: 500,
        totalPosts: 50,
        factbookViolations: 0,
        quarantinedContent: 1,
        totalContent: 200,
        avgReportResolutionMinutes: 15,
        killSwitchActivations: 0,
        cacheHits: 400,
        totalLLMCalls: 500,
      },
      {
        avgSessionDurationMinutes: 15,
        avgFeedScrollCount: 40,
        profileVisits: 100,
        follows: 25,
        feedImpressions: 1000,
        commentsWritten: 60,
        onboardingStarted: 100,
        onboardingCompleted: 80,
        totalContent: 1000,
        moderatedContent: 5,
      }
    )

    expect(summary.healthyCount + summary.warningCount + summary.criticalCount).toBe(14)
    expect(summary.overallHealth).toBeDefined()
  })

  it("CRITICAL 있으면 overallHealth = CRITICAL", () => {
    const summary = computeKPISummary(
      {
        activePersonas: 50,
        totalPersonas: 100,
        averagePIS: 0.5,
        totalLikes: 0,
        totalComments: 0,
        totalPosts: 0,
        factbookViolations: 0,
        quarantinedContent: 0,
        totalContent: 0,
        avgReportResolutionMinutes: 0,
        killSwitchActivations: 1,
        cacheHits: 0,
        totalLLMCalls: 0,
      },
      {
        avgSessionDurationMinutes: 3,
        avgFeedScrollCount: 5,
        profileVisits: 0,
        follows: 0,
        feedImpressions: 0,
        commentsWritten: 0,
        onboardingStarted: 0,
        onboardingCompleted: 0,
        totalContent: 0,
        moderatedContent: 0,
      }
    )

    expect(summary.overallHealth).toBe("CRITICAL")
  })
})

describe("KPI Trend", () => {
  it("상승 추세 감지", () => {
    const trend = analyzeKPITrend(
      "페르소나 활성률",
      [
        { date: "2026-02-14", value: 85 },
        { date: "2026-02-15", value: 88 },
        { date: "2026-02-16", value: 92 },
      ],
      "higher_is_better"
    )
    expect(trend.trend).toBe("improving")
  })

  it("하락 추세 감지", () => {
    const trend = analyzeKPITrend(
      "평균 PIS",
      [
        { date: "2026-02-14", value: 0.85 },
        { date: "2026-02-15", value: 0.78 },
        { date: "2026-02-16", value: 0.72 },
      ],
      "higher_is_better"
    )
    expect(trend.trend).toBe("declining")
  })

  it("안정 추세 감지", () => {
    const trend = analyzeKPITrend(
      "Cache Hit",
      [
        { date: "2026-02-14", value: 80 },
        { date: "2026-02-15", value: 81 },
        { date: "2026-02-16", value: 80 },
      ],
      "higher_is_better"
    )
    expect(trend.trend).toBe("stable")
  })

  it("lower_is_better — 위반율 감소 = improving", () => {
    const trend = analyzeKPITrend(
      "팩트북 위반율",
      [
        { date: "2026-02-14", value: 3 },
        { date: "2026-02-15", value: 2 },
        { date: "2026-02-16", value: 1 },
      ],
      "lower_is_better"
    )
    expect(trend.trend).toBe("improving")
  })

  it("데이터 부족 → stable", () => {
    const trend = analyzeKPITrend("test", [{ date: "2026-02-16", value: 10 }], "higher_is_better")
    expect(trend.trend).toBe("stable")
  })
})

// ═══ Job Runner ═══

describe("Job Runner", () => {
  it("dailyInterview — 20% 인터뷰 실행", async () => {
    const provider = createMockJobProvider()
    const result = await runDailyInterview(provider)
    expect(provider.getInterviewCandidateCount).toHaveBeenCalled()
    expect(provider.runAutoInterviews).toHaveBeenCalledWith(10)
    expect(result.processedCount).toBe(10)
    expect(result.alertsGenerated).toBe(2)
  })

  it("weeklyPISReport — PIS 계산", async () => {
    const provider = createMockJobProvider()
    const result = await runWeeklyPISReport(provider)
    expect(result.processedCount).toBe(50)
    expect(result.alertsGenerated).toBe(3)
    expect(result.details).toContain("0.82")
  })

  it("dailyPatternAnalysis — 이상 탐지", async () => {
    const provider = createMockJobProvider()
    const result = await runDailyPatternAnalysis(provider)
    expect(result.processedCount).toBe(100)
    expect(result.alertsGenerated).toBe(1)
  })

  it("hourlyMetrics — 메트릭 집계", async () => {
    const provider = createMockJobProvider()
    const result = await runHourlyMetrics(provider)
    expect(result.processedCount).toBe(50)
    expect(result.details).toContain("P5")
  })

  it("dailyCostReport — 비용 리포트", async () => {
    const provider = createMockJobProvider()
    const result = await runDailyCostReport(provider)
    expect(result.processedCount).toBe(1)
    expect(result.details).toContain("$1.50")
  })

  it("weeklyArena — WARNING 페르소나 예약", async () => {
    const provider = createMockJobProvider()
    const result = await runWeeklyArena(provider)
    expect(result.processedCount).toBe(2)
  })

  it("weeklyArena — WARNING 없으면 스킵", async () => {
    const provider = createMockJobProvider({
      getWarningPersonaIds: vi.fn().mockResolvedValue([]),
    })
    const result = await runWeeklyArena(provider)
    expect(result.processedCount).toBe(0)
    expect(result.details).toContain("불필요")
  })

  it("dailyLogCleanup — 90일 로그 아카이빙", async () => {
    const provider = createMockJobProvider()
    const result = await runDailyLogCleanup(provider)
    expect(provider.archiveExpiredLogs).toHaveBeenCalledWith(90)
    expect(result.processedCount).toBe(150)
  })

  it("dailyQuarantineExpiry — 격리 만료", async () => {
    const provider = createMockJobProvider()
    const result = await runDailyQuarantineExpiry(provider)
    expect(result.processedCount).toBe(3)
    expect(result.alertsGenerated).toBe(3)
  })

  it("executeJob — 유효한 ID → COMPLETED", async () => {
    const provider = createMockJobProvider()
    const exec = await executeJob("daily-interview", provider)
    expect(exec.status).toBe("COMPLETED")
    expect(exec.result?.processedCount).toBe(10)
  })

  it("executeJob — 존재하지 않는 ID → FAILED", async () => {
    const provider = createMockJobProvider()
    const exec = await executeJob("nonexistent", provider)
    expect(exec.status).toBe("FAILED")
    expect(exec.error).toContain("Unknown job")
  })

  it("executeJob — 에러 → FAILED", async () => {
    const provider = createMockJobProvider({
      getInterviewCandidateCount: vi.fn().mockRejectedValue(new Error("DB down")),
    })
    const exec = await executeJob("daily-interview", provider)
    expect(exec.status).toBe("FAILED")
    expect(exec.error).toContain("DB down")
  })

  it("executeDueJobs — 03:00에 daily-interview 실행", async () => {
    const provider = createMockJobProvider()
    const now = new Date("2026-02-21T03:00:00Z")
    const results = await executeDueJobs(provider, now)
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results.every((r) => r.status === "COMPLETED")).toBe(true)
  })

  it("executeDueJobs — 01:30에 실행할 Job 없음", async () => {
    const provider = createMockJobProvider()
    const now = new Date("2026-02-21T01:30:00Z")
    const results = await executeDueJobs(provider, now)
    expect(results).toHaveLength(0)
  })
})

// ═══ KPI Aggregator ═══

describe("KPI Aggregator", () => {
  it("서비스 KPI 입력 집계", async () => {
    const provider = createMockKPIProvider()
    const result = await aggregateServiceKPIInput(provider)

    expect(provider.countActivePersonas).toHaveBeenCalled()
    expect(provider.countTotalPersonas).toHaveBeenCalled()
    expect(provider.getAveragePIS).toHaveBeenCalled()
    expect(result.activePersonas).toBe(45)
    expect(result.totalPersonas).toBe(50)
    expect(result.averagePIS).toBe(0.82)
  })

  it("UX KPI 입력 집계", async () => {
    const provider = createMockKPIProvider()
    const result = await aggregateUXKPIInput(provider)

    expect(provider.getAvgSessionDurationMinutes).toHaveBeenCalled()
    expect(provider.countOnboardingStarted).toHaveBeenCalled()
    expect(result.avgSessionDurationMinutes).toBe(12)
    expect(result.follows).toBe(25)
  })

  it("전체 KPI 동시 집계", async () => {
    const provider = createMockKPIProvider()
    const { serviceInput, uxInput } = await aggregateAllKPIInputs(provider)

    expect(serviceInput.activePersonas).toBe(45)
    expect(uxInput.avgSessionDurationMinutes).toBe(12)
  })
})
