// ═══════════════════════════════════════════════════════════════
// Dashboard Tests
// T70: system health, health score grading, matching performance,
//      tier distribution, activity feed, quick actions
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

import {
  // Health
  calculateOverallStatus,
  buildSystemHealth,
  healthScoreToGrade,
  calculateHealthScore,
  // Matching Performance
  scoreToTier,
  calculateTierDistribution,
  calculateTrend,
  comparePeriods,
  buildMatchingPerformance,
  // Activity Feed
  buildActivityFeed,
  filterActivities,
  getActivitySummary,
  // Quick Actions
  getAvailableActions,
  groupActionsByCategory,
  executeQuickAction,
  DEFAULT_QUICK_ACTIONS,
  // Full Dashboard
  buildDashboard,
  getDashboardSummary,
  type ServiceStatus,
  type ActivityEntry,
  type MatchingTrendPoint,
} from "@/lib/dashboard"

// ── Helpers ─────────────────────────────────────────────────────

function makeService(
  name: string,
  status: ServiceStatus["status"],
  uptime = 0.99,
  responseTimeMs = 50,
  errorRate = 0.01
): ServiceStatus {
  return { name, status, uptime, responseTimeMs, errorRate }
}

function makeActivity(
  type: ActivityEntry["type"],
  title: string,
  actorId: string,
  timestamp: number
): ActivityEntry {
  return {
    id: `act_${timestamp}`,
    type,
    title,
    description: `${title} description`,
    actorId,
    timestamp,
    metadata: {},
  }
}

// ═══════════════════════════════════════════════════════════════
// AC1: System Health
// ═══════════════════════════════════════════════════════════════

describe("Dashboard — calculateOverallStatus", () => {
  it("should return 'healthy' when all services healthy", () => {
    const services = [makeService("A", "healthy"), makeService("B", "healthy")]
    expect(calculateOverallStatus(services)).toBe("healthy")
  })

  it("should return 'degraded' when any service degraded", () => {
    const services = [makeService("A", "healthy"), makeService("B", "degraded")]
    expect(calculateOverallStatus(services)).toBe("degraded")
  })

  it("should return 'down' when any service down", () => {
    const services = [makeService("A", "healthy"), makeService("B", "down")]
    expect(calculateOverallStatus(services)).toBe("down")
  })

  it("should return 'down' for empty services", () => {
    expect(calculateOverallStatus([])).toBe("down")
  })
})

describe("Dashboard — buildSystemHealth", () => {
  it("should build system health with correct overall status", () => {
    const services = [makeService("API", "healthy"), makeService("DB", "healthy")]
    const health = buildSystemHealth(services)
    expect(health.overallStatus).toBe("healthy")
    expect(health.services).toHaveLength(2)
    expect(health.lastChecked).toBeGreaterThan(0)
  })
})

describe("Dashboard — healthScoreToGrade", () => {
  it("should grade 95 as A", () => expect(healthScoreToGrade(95)).toBe("A"))
  it("should grade 90 as A", () => expect(healthScoreToGrade(90)).toBe("A"))
  it("should grade 80 as B", () => expect(healthScoreToGrade(80)).toBe("B"))
  it("should grade 65 as C", () => expect(healthScoreToGrade(65)).toBe("C"))
  it("should grade 50 as D", () => expect(healthScoreToGrade(50)).toBe("D"))
  it("should grade 20 as F", () => expect(healthScoreToGrade(20)).toBe("F"))
  it("should clamp score above 100", () => expect(healthScoreToGrade(150)).toBe("A"))
  it("should clamp score below 0", () => expect(healthScoreToGrade(-10)).toBe("F"))
})

describe("Dashboard — calculateHealthScore", () => {
  it("should return 0 for empty services", () => {
    expect(calculateHealthScore([])).toBe(0)
  })

  it("should return high score for perfect services", () => {
    const services = [makeService("A", "healthy", 1.0, 50, 0)]
    const score = calculateHealthScore(services)
    expect(score).toBeGreaterThanOrEqual(90)
  })

  it("should return low score for poor services", () => {
    const services = [makeService("A", "down", 0.5, 2000, 0.1)]
    const score = calculateHealthScore(services)
    expect(score).toBeLessThan(50)
  })

  it("should penalize high error rates", () => {
    const goodService = makeService("A", "healthy", 0.99, 50, 0.01)
    const badService = makeService("B", "healthy", 0.99, 50, 0.05)
    const goodScore = calculateHealthScore([goodService])
    const badScore = calculateHealthScore([badService])
    expect(goodScore).toBeGreaterThan(badScore)
  })

  it("should penalize high response times", () => {
    const fast = makeService("A", "healthy", 0.99, 50, 0.01)
    const slow = makeService("B", "healthy", 0.99, 900, 0.01)
    const fastScore = calculateHealthScore([fast])
    const slowScore = calculateHealthScore([slow])
    expect(fastScore).toBeGreaterThan(slowScore)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: Matching Performance
// ═══════════════════════════════════════════════════════════════

describe("Dashboard — scoreToTier", () => {
  it("should classify 0.95 as S", () => expect(scoreToTier(0.95)).toBe("S"))
  it("should classify 0.90 as S", () => expect(scoreToTier(0.9)).toBe("S"))
  it("should classify 0.80 as A", () => expect(scoreToTier(0.8)).toBe("A"))
  it("should classify 0.65 as B", () => expect(scoreToTier(0.65)).toBe("B"))
  it("should classify 0.50 as C", () => expect(scoreToTier(0.5)).toBe("C"))
  it("should classify 0.30 as D", () => expect(scoreToTier(0.3)).toBe("D"))
  it("should clamp above 1 as S", () => expect(scoreToTier(1.5)).toBe("S"))
  it("should clamp below 0 as D", () => expect(scoreToTier(-0.1)).toBe("D"))
})

describe("Dashboard — calculateTierDistribution", () => {
  it("should return all tiers with correct counts", () => {
    const scores = [0.95, 0.8, 0.65, 0.5, 0.3]
    const dist = calculateTierDistribution(scores)
    expect(dist).toHaveLength(5)
    expect(dist.find((d) => d.tier === "S")!.count).toBe(1)
    expect(dist.find((d) => d.tier === "A")!.count).toBe(1)
    expect(dist.find((d) => d.tier === "B")!.count).toBe(1)
    expect(dist.find((d) => d.tier === "C")!.count).toBe(1)
    expect(dist.find((d) => d.tier === "D")!.count).toBe(1)
  })

  it("should return all zeros for empty scores", () => {
    const dist = calculateTierDistribution([])
    expect(dist.every((d) => d.count === 0)).toBe(true)
    expect(dist.every((d) => d.percentage === 0)).toBe(true)
  })

  it("should sum percentages to 100", () => {
    const scores = [0.95, 0.95, 0.8, 0.8, 0.6]
    const dist = calculateTierDistribution(scores)
    const totalPct = dist.reduce((s, d) => s + d.percentage, 0)
    expect(totalPct).toBeCloseTo(100, 0)
  })
})

describe("Dashboard — calculateTrend", () => {
  it("should return 'up' for increasing values", () => {
    const points: MatchingTrendPoint[] = [
      { period: "W1", value: 0.5 },
      { period: "W2", value: 0.6 },
      { period: "W3", value: 0.7 },
      { period: "W4", value: 0.8 },
    ]
    expect(calculateTrend(points)).toBe("up")
  })

  it("should return 'down' for decreasing values", () => {
    const points: MatchingTrendPoint[] = [
      { period: "W1", value: 0.8 },
      { period: "W2", value: 0.7 },
      { period: "W3", value: 0.5 },
      { period: "W4", value: 0.3 },
    ]
    expect(calculateTrend(points)).toBe("down")
  })

  it("should return 'stable' for flat values", () => {
    const points: MatchingTrendPoint[] = [
      { period: "W1", value: 0.5 },
      { period: "W2", value: 0.51 },
      { period: "W3", value: 0.49 },
      { period: "W4", value: 0.5 },
    ]
    expect(calculateTrend(points)).toBe("stable")
  })

  it("should return 'stable' for fewer than 2 points", () => {
    expect(calculateTrend([{ period: "W1", value: 0.5 }])).toBe("stable")
    expect(calculateTrend([])).toBe("stable")
  })
})

describe("Dashboard — comparePeriods", () => {
  it("should calculate period comparison correctly", () => {
    const result = comparePeriods([0.8, 0.9], [0.5, 0.6])
    expect(result.currentAvg).toBeCloseTo(0.85, 1)
    expect(result.previousAvg).toBeCloseTo(0.55, 1)
    expect(result.change).toBeGreaterThan(0)
    expect(result.direction).toBe("up")
  })

  it("should handle empty arrays", () => {
    const result = comparePeriods([], [])
    expect(result.currentAvg).toBe(0)
    expect(result.previousAvg).toBe(0)
    expect(result.direction).toBe("stable")
  })
})

describe("Dashboard — buildMatchingPerformance", () => {
  it("should build matching performance summary", () => {
    const scores = [0.9, 0.8, 0.7, 0.6, 0.5]
    const trend: MatchingTrendPoint[] = [
      { period: "D1", value: 0.6 },
      { period: "D2", value: 0.7 },
    ]
    const perf = buildMatchingPerformance(scores, trend, 7)
    expect(perf.totalMatches).toBe(5)
    expect(perf.averageScore).toBeCloseTo(0.7, 1)
    expect(perf.tierDistribution).toHaveLength(5)
    expect(perf.periodDays).toBe(7)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Activity Feed
// ═══════════════════════════════════════════════════════════════

describe("Dashboard — buildActivityFeed", () => {
  it("should sort entries by timestamp descending", () => {
    const entries = [
      makeActivity("persona_created", "Old", "u1", 1000),
      makeActivity("persona_created", "New", "u1", 3000),
      makeActivity("persona_created", "Mid", "u1", 2000),
    ]
    const feed = buildActivityFeed(entries)
    expect(feed.entries[0].title).toBe("New")
    expect(feed.entries[2].title).toBe("Old")
  })

  it("should paginate correctly", () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      makeActivity("persona_created", `Entry ${i}`, "u1", i)
    )
    const feed = buildActivityFeed(entries, 1, 10)
    expect(feed.entries).toHaveLength(10)
    expect(feed.pagination.page).toBe(1)
    expect(feed.pagination.totalPages).toBe(3)
    expect(feed.pagination.hasNext).toBe(true)
    expect(feed.pagination.hasPrev).toBe(false)
  })

  it("should handle page 2", () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      makeActivity("persona_created", `Entry ${i}`, "u1", i)
    )
    const feed = buildActivityFeed(entries, 2, 10)
    expect(feed.entries).toHaveLength(10)
    expect(feed.pagination.hasNext).toBe(true)
    expect(feed.pagination.hasPrev).toBe(true)
  })

  it("should clamp pageSize between 1 and 100", () => {
    const entries = [makeActivity("persona_created", "A", "u1", 1000)]
    const feed = buildActivityFeed(entries, 1, 200)
    expect(feed.pagination.pageSize).toBe(100)
  })
})

describe("Dashboard — filterActivities", () => {
  const entries = [
    makeActivity("persona_created", "Created", "u1", 1000),
    makeActivity("matching_executed", "Matched", "u2", 2000),
    makeActivity("system_event", "System", "u1", 3000),
  ]

  it("should filter by type", () => {
    const filtered = filterActivities(entries, { types: ["persona_created"] })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].type).toBe("persona_created")
  })

  it("should filter by actorId", () => {
    const filtered = filterActivities(entries, { actorId: "u1" })
    expect(filtered).toHaveLength(2)
  })

  it("should filter by time range", () => {
    const filtered = filterActivities(entries, { startTime: 1500, endTime: 2500 })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].title).toBe("Matched")
  })
})

describe("Dashboard — getActivitySummary", () => {
  it("should summarize activity entries", () => {
    const entries = [
      makeActivity("persona_created", "A", "u1", 1000),
      makeActivity("persona_created", "B", "u1", 2000),
      makeActivity("matching_executed", "C", "u2", 3000),
    ]
    const summary = getActivitySummary(entries)
    expect(summary.totalCount).toBe(3)
    expect(summary.countByType.persona_created).toBe(2)
    expect(summary.countByType.matching_executed).toBe(1)
    expect(summary.uniqueActors).toBe(2)
    expect(summary.mostRecentAt).toBe(3000)
  })

  it("should handle empty entries", () => {
    const summary = getActivitySummary([])
    expect(summary.totalCount).toBe(0)
    expect(summary.mostRecentAt).toBeNull()
    expect(summary.uniqueActors).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: Quick Actions
// ═══════════════════════════════════════════════════════════════

describe("Dashboard — Quick Actions", () => {
  it("should have default quick actions defined", () => {
    expect(DEFAULT_QUICK_ACTIONS.length).toBeGreaterThanOrEqual(6)
  })

  it("should filter available actions by permissions", () => {
    const available = getAvailableActions(["persona:create", "matching:simulate"])
    expect(available.length).toBeGreaterThan(0)
    expect(available.some((a) => a.id === "qa_persona_create")).toBe(true)
    expect(available.some((a) => a.id === "qa_matching_simulate")).toBe(true)
  })

  it("should exclude disabled actions", () => {
    const customActions = [{ ...DEFAULT_QUICK_ACTIONS[0], enabled: false }]
    const available = getAvailableActions(["persona:create"], customActions)
    expect(available).toHaveLength(0)
  })

  it("should group actions by category", () => {
    const grouped = groupActionsByCategory(DEFAULT_QUICK_ACTIONS)
    expect(grouped.persona.length).toBeGreaterThan(0)
    expect(grouped.matching.length).toBeGreaterThan(0)
    expect(grouped.incubator.length).toBeGreaterThan(0)
    expect(grouped.system.length).toBeGreaterThan(0)
  })

  it("should execute known action successfully", () => {
    const result = executeQuickAction("qa_persona_create")
    expect(result.status).toBe("success")
    expect(result.redirectUrl).toBe("/personas/new")
  })

  it("should return error for unknown action", () => {
    const result = executeQuickAction("qa_nonexistent")
    expect(result.status).toBe("error")
    expect(result.message).toContain("알 수 없는")
  })
})

// ═══════════════════════════════════════════════════════════════
// Full Dashboard
// ═══════════════════════════════════════════════════════════════

describe("Dashboard — buildDashboard & getDashboardSummary", () => {
  it("should build complete dashboard state", () => {
    const state = buildDashboard({
      services: [makeService("API", "healthy"), makeService("DB", "healthy")],
      matchingScores: [0.9, 0.8, 0.7],
      trendPoints: [
        { period: "D1", value: 0.7 },
        { period: "D2", value: 0.8 },
      ],
      periodDays: 7,
      activities: [makeActivity("persona_created", "Test", "u1", Date.now())],
      userPermissions: ["persona:create"],
    })
    expect(state.health.overallStatus).toBe("healthy")
    expect(state.matchingPerformance.totalMatches).toBe(3)
    expect(state.activityFeed.entries).toHaveLength(1)
    expect(state.quickActions.length).toBeGreaterThan(0)
  })

  it("should extract dashboard summary", () => {
    const state = buildDashboard({
      services: [makeService("API", "healthy", 1.0, 50, 0)],
      matchingScores: [0.95, 0.8, 0.7],
      trendPoints: [
        { period: "D1", value: 0.7 },
        { period: "D2", value: 0.85 },
      ],
      periodDays: 7,
      activities: [makeActivity("persona_created", "Test", "u1", Date.now())],
      userPermissions: ["persona:create", "matching:simulate"],
    })

    const summary = getDashboardSummary(state)
    expect(summary.healthGrade).toBeDefined()
    expect(summary.healthScore).toBeGreaterThan(0)
    expect(summary.totalMatches).toBe(3)
    expect(summary.recentActivityCount).toBe(1)
    expect(summary.availableActionCount).toBeGreaterThan(0)
  })
})
