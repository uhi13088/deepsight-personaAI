import { describe, it, expect } from "vitest"
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
