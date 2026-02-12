import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  // AC1: System Monitoring
  createMetricDataPoint,
  evaluateThresholds,
  searchLogs,
  buildMonitoringDashboard,
  DEFAULT_METRIC_THRESHOLDS,
  DEFAULT_DASHBOARD_LAYOUT,
  acknowledgeThresholdAlert,
  // AC2: Incident Response
  createIncident,
  triageIncident,
  advanceIncidentPhase,
  resolveIncident,
  createPostMortem,
  calculateMTTR,
  buildIncidentDashboard,
  evaluateDetectionRules,
  // AC3: Rollback/Recovery
  createRollbackRequest,
  analyzeRollbackImpact,
  approveRollback,
  executeRollbackStep,
  completeRollback,
  cancelRollback,
  createDataRecoveryProcedure,
  advanceDataRecovery,
  // AC4: Backup/DR
  createBackupPolicy,
  createBackupRecord,
  completeBackupRecord,
  failBackupRecord,
  computeBackupMonitoring,
  isBackupOverdue,
  createDRPlan,
  scheduleDRDrill,
  startDRDrill,
  completeDRDrill,
  evaluateDRDrillResult,
  DEFAULT_BACKUP_POLICIES,
  // AC5: Capacity Planning
  createResourceUsage,
  getUsagePercent,
  forecastLinear,
  generateCostOptimizations,
  generateScalingRecommendations,
  buildCapacityReport,
} from "@/lib/operations"
import type {
  MetricDataPoint,
  MetricThreshold,
  LogEntry,
  LogSearchFilter,
  Incident,
  DetectionRule,
  RollbackRequest,
  DataRecoveryProcedure,
  BackupPolicy,
  BackupRecord,
  ResourceUsage,
  UsageSnapshot,
  ForecastResult,
  DRPlan,
  DRDrill,
} from "@/lib/operations"

// ═══════════════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════════════

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: `log_${Date.now()}_${Math.random()}`,
    timestamp: Date.now(),
    level: "info",
    service: "api-gateway",
    message: "Request processed successfully",
    metadata: {},
    traceId: null,
    ...overrides,
  }
}

function makeDataPoint(overrides: Partial<MetricDataPoint> = {}): MetricDataPoint {
  return {
    timestamp: Date.now(),
    value: 50,
    metricType: "cpu",
    source: "server-1",
    labels: {},
    ...overrides,
  }
}

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  const now = Date.now()
  return {
    id: `INC-${now}`,
    title: "Test Incident",
    severity: "P1",
    phase: "detected",
    detectedAt: now,
    resolvedAt: null,
    commander: null,
    affectedServices: ["api-gateway"],
    timeline: [
      {
        timestamp: now,
        phase: "detected",
        actor: "system",
        description: "Test incident detected",
      },
    ],
    rootCause: null,
    mitigation: null,
    ...overrides,
  }
}

function makeResourceUsage(overrides: Partial<ResourceUsage> = {}): ResourceUsage {
  return {
    metricType: "cpu",
    currentValue: 50,
    maxCapacity: 100,
    unit: "%",
    timestamp: Date.now(),
    ...overrides,
  }
}

function makeUsageSnapshot(timestamp: number, resources: ResourceUsage[]): UsageSnapshot {
  return { timestamp, resources }
}

// ═══════════════════════════════════════════════════════════════
// AC1: System Monitoring
// ═══════════════════════════════════════════════════════════════

describe("AC1: System Monitoring", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── createMetricDataPoint ──────────────────────────────────

  describe("createMetricDataPoint", () => {
    it("returns correct structure with all fields", () => {
      const point = createMetricDataPoint("cpu", 72.567, "server-1", { env: "prod" })

      expect(point.metricType).toBe("cpu")
      expect(point.value).toBe(72.57) // rounded to 2 decimals
      expect(point.source).toBe("server-1")
      expect(point.labels).toEqual({ env: "prod" })
      expect(point.timestamp).toBe(Date.now())
    })

    it("defaults labels to empty object", () => {
      const point = createMetricDataPoint("memory", 80, "server-2")
      expect(point.labels).toEqual({})
    })

    it("rounds value to 2 decimal places", () => {
      const point = createMetricDataPoint("api_latency", 123.456789, "api")
      expect(point.value).toBe(123.46)
    })
  })

  // ── evaluateThresholds ─────────────────────────────────────

  describe("evaluateThresholds", () => {
    it("detects critical level when value exceeds critical threshold", () => {
      const dataPoints: MetricDataPoint[] = [makeDataPoint({ metricType: "cpu", value: 95 })]

      const alerts = evaluateThresholds(dataPoints)
      expect(alerts).toHaveLength(1)
      expect(alerts[0].level).toBe("critical")
      expect(alerts[0].metricType).toBe("cpu")
      expect(alerts[0].currentValue).toBe(95)
      expect(alerts[0].threshold).toBe(90) // CPU critical threshold
      expect(alerts[0].acknowledged).toBe(false)
    })

    it("detects warning level when value between warning and critical", () => {
      const dataPoints: MetricDataPoint[] = [makeDataPoint({ metricType: "cpu", value: 75 })]

      const alerts = evaluateThresholds(dataPoints)
      expect(alerts).toHaveLength(1)
      expect(alerts[0].level).toBe("warning")
      expect(alerts[0].threshold).toBe(70) // CPU warning threshold
    })

    it("returns no alerts when values are below thresholds", () => {
      const dataPoints: MetricDataPoint[] = [
        makeDataPoint({ metricType: "cpu", value: 30 }),
        makeDataPoint({ metricType: "memory", value: 40 }),
        makeDataPoint({ metricType: "disk", value: 50 }),
      ]

      const alerts = evaluateThresholds(dataPoints)
      expect(alerts).toHaveLength(0)
    })

    it("uses custom thresholds when provided", () => {
      const customThresholds: MetricThreshold[] = [
        { metricType: "cpu", warningLevel: 50, criticalLevel: 70, comparison: "above" },
      ]

      const dataPoints: MetricDataPoint[] = [makeDataPoint({ metricType: "cpu", value: 55 })]

      const alerts = evaluateThresholds(dataPoints, customThresholds)
      expect(alerts).toHaveLength(1)
      expect(alerts[0].level).toBe("warning")
    })

    it("handles 'below' comparison mode", () => {
      const thresholds: MetricThreshold[] = [
        { metricType: "cpu", warningLevel: 30, criticalLevel: 10, comparison: "below" },
      ]

      const dataPoints: MetricDataPoint[] = [makeDataPoint({ metricType: "cpu", value: 5 })]

      const alerts = evaluateThresholds(dataPoints, thresholds)
      expect(alerts).toHaveLength(1)
      expect(alerts[0].level).toBe("critical")
    })

    it("handles multiple data points with mixed alert levels", () => {
      const dataPoints: MetricDataPoint[] = [
        makeDataPoint({ metricType: "cpu", value: 95 }), // critical
        makeDataPoint({ metricType: "memory", value: 80 }), // warning
        makeDataPoint({ metricType: "disk", value: 50 }), // no alert
        makeDataPoint({ metricType: "error_rate", value: 6 }), // critical
      ]

      const alerts = evaluateThresholds(dataPoints)
      expect(alerts).toHaveLength(3)

      const cpuAlert = alerts.find((a) => a.metricType === "cpu")
      expect(cpuAlert?.level).toBe("critical")

      const memAlert = alerts.find((a) => a.metricType === "memory")
      expect(memAlert?.level).toBe("warning")

      const errorAlert = alerts.find((a) => a.metricType === "error_rate")
      expect(errorAlert?.level).toBe("critical")
    })

    it("skips data points with no matching threshold", () => {
      const thresholds: MetricThreshold[] = [
        { metricType: "cpu", warningLevel: 70, criticalLevel: 90, comparison: "above" },
      ]

      const dataPoints: MetricDataPoint[] = [makeDataPoint({ metricType: "memory", value: 99 })]

      const alerts = evaluateThresholds(dataPoints, thresholds)
      expect(alerts).toHaveLength(0)
    })
  })

  // ── searchLogs ─────────────────────────────────────────────

  describe("searchLogs", () => {
    const baseLogs: LogEntry[] = [
      makeLogEntry({
        id: "1",
        timestamp: 1000,
        level: "info",
        service: "api",
        message: "request started",
        traceId: "trace-1",
      }),
      makeLogEntry({
        id: "2",
        timestamp: 2000,
        level: "error",
        service: "db",
        message: "connection timeout",
        traceId: "trace-2",
      }),
      makeLogEntry({
        id: "3",
        timestamp: 3000,
        level: "warn",
        service: "api",
        message: "slow query detected",
        traceId: "trace-1",
      }),
      makeLogEntry({
        id: "4",
        timestamp: 4000,
        level: "fatal",
        service: "worker",
        message: "out of memory error",
        traceId: null,
      }),
      makeLogEntry({
        id: "5",
        timestamp: 5000,
        level: "debug",
        service: "api",
        message: "debug info",
        traceId: null,
      }),
    ]

    const defaultFilter: LogSearchFilter = {
      startTime: null,
      endTime: null,
      levels: [],
      services: [],
      keyword: null,
      traceId: null,
      limit: 100,
    }

    it("filters by level", () => {
      const result = searchLogs(baseLogs, { ...defaultFilter, levels: ["error", "fatal"] })
      expect(result).toHaveLength(2)
      expect(result.every((l) => l.level === "error" || l.level === "fatal")).toBe(true)
    })

    it("filters by keyword (case-insensitive)", () => {
      const result = searchLogs(baseLogs, { ...defaultFilter, keyword: "TIMEOUT" })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("2")
    })

    it("filters by service", () => {
      const result = searchLogs(baseLogs, { ...defaultFilter, services: ["api"] })
      expect(result).toHaveLength(3)
      expect(result.every((l) => l.service === "api")).toBe(true)
    })

    it("filters by traceId", () => {
      const result = searchLogs(baseLogs, { ...defaultFilter, traceId: "trace-1" })
      expect(result).toHaveLength(2)
      expect(result.every((l) => l.traceId === "trace-1")).toBe(true)
    })

    it("filters by time range", () => {
      const result = searchLogs(baseLogs, {
        ...defaultFilter,
        startTime: 2000,
        endTime: 4000,
      })
      expect(result).toHaveLength(3)
      expect(result.every((l) => l.timestamp >= 2000 && l.timestamp <= 4000)).toBe(true)
    })

    it("returns results sorted by timestamp descending", () => {
      const result = searchLogs(baseLogs, defaultFilter)
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].timestamp).toBeGreaterThanOrEqual(result[i + 1].timestamp)
      }
    })

    it("respects limit parameter", () => {
      const result = searchLogs(baseLogs, { ...defaultFilter, limit: 2 })
      expect(result).toHaveLength(2)
    })

    it("combines multiple filters", () => {
      const result = searchLogs(baseLogs, {
        ...defaultFilter,
        levels: ["warn", "error"],
        services: ["api"],
        keyword: "slow",
      })
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe("3")
    })
  })

  // ── buildMonitoringDashboard ───────────────────────────────

  describe("buildMonitoringDashboard", () => {
    it("combines data points, alerts, and logs into dashboard", () => {
      const dataPoints: MetricDataPoint[] = [makeDataPoint({ metricType: "cpu", value: 95 })]
      const logs: LogEntry[] = [
        makeLogEntry({ level: "error", message: "server error" }),
        makeLogEntry({ level: "info", message: "normal log" }),
      ]

      const dashboard = buildMonitoringDashboard(dataPoints, logs)

      expect(dashboard.layout).toBeDefined()
      expect(dashboard.layout.id).toBe("default")
      expect(dashboard.dataPoints).toEqual(dataPoints)
      expect(dashboard.activeAlerts).toHaveLength(1) // cpu 95 -> critical
      // recentLogs only includes warn/error/fatal
      expect(dashboard.recentLogs).toHaveLength(1)
      expect(dashboard.recentLogs[0].level).toBe("error")
    })

    it("uses custom layout and thresholds", () => {
      const customLayout = { ...DEFAULT_DASHBOARD_LAYOUT, id: "custom", name: "Custom" }
      const customThresholds: MetricThreshold[] = [
        { metricType: "cpu", warningLevel: 50, criticalLevel: 80, comparison: "above" },
      ]

      const dataPoints: MetricDataPoint[] = [makeDataPoint({ metricType: "cpu", value: 60 })]

      const dashboard = buildMonitoringDashboard(dataPoints, [], customThresholds, customLayout)

      expect(dashboard.layout.id).toBe("custom")
      expect(dashboard.activeAlerts).toHaveLength(1)
      expect(dashboard.activeAlerts[0].level).toBe("warning")
    })
  })

  // ── DEFAULT_METRIC_THRESHOLDS ──────────────────────────────

  describe("DEFAULT_METRIC_THRESHOLDS", () => {
    it("has thresholds for all 6 metric types", () => {
      expect(DEFAULT_METRIC_THRESHOLDS).toHaveLength(6)
      const types = DEFAULT_METRIC_THRESHOLDS.map((t) => t.metricType)
      expect(types).toContain("cpu")
      expect(types).toContain("memory")
      expect(types).toContain("disk")
      expect(types).toContain("network")
      expect(types).toContain("api_latency")
      expect(types).toContain("error_rate")
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: Incident Response
// ═══════════════════════════════════════════════════════════════

describe("AC2: Incident Response", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── createIncident ─────────────────────────────────────────

  describe("createIncident", () => {
    it("creates incident with correct initial state (detected phase)", () => {
      const incident = createIncident(
        "DB Connection Pool Exhausted",
        "P0",
        ["db", "api"],
        "monitoring-bot"
      )

      expect(incident.id).toMatch(/^INC-/)
      expect(incident.title).toBe("DB Connection Pool Exhausted")
      expect(incident.severity).toBe("P0")
      expect(incident.phase).toBe("detected")
      expect(incident.detectedAt).toBe(Date.now())
      expect(incident.resolvedAt).toBeNull()
      expect(incident.commander).toBeNull()
      expect(incident.affectedServices).toEqual(["db", "api"])
      expect(incident.rootCause).toBeNull()
      expect(incident.mitigation).toBeNull()
      expect(incident.timeline).toHaveLength(1)
      expect(incident.timeline[0].phase).toBe("detected")
      expect(incident.timeline[0].actor).toBe("monitoring-bot")
    })
  })

  // ── triageIncident ─────────────────────────────────────────

  describe("triageIncident", () => {
    it("sets commander and changes phase to triaged", () => {
      const incident = createIncident("Test", "P1", ["api"], "system")
      const triaged = triageIncident(incident, "alice", "P0")

      expect(triaged.phase).toBe("triaged")
      expect(triaged.commander).toBe("alice")
      expect(triaged.severity).toBe("P0")
      expect(triaged.timeline).toHaveLength(2)
      expect(triaged.timeline[1].phase).toBe("triaged")
      expect(triaged.timeline[1].actor).toBe("alice")
    })
  })

  // ── advanceIncidentPhase ───────────────────────────────────

  describe("advanceIncidentPhase", () => {
    it("advances forward through phases", () => {
      const incident = makeIncident({ phase: "triaged" })
      const advanced = advanceIncidentPhase(
        incident,
        "investigating",
        "bob",
        "Starting investigation"
      )

      expect(advanced.phase).toBe("investigating")
      expect(advanced.timeline).toHaveLength(2)
      expect(advanced.timeline[1].description).toBe("Starting investigation")
    })

    it("throws when trying to go backward", () => {
      const incident = makeIncident({ phase: "investigating" })
      expect(() => advanceIncidentPhase(incident, "triaged", "bob", "Going back")).toThrow()
    })

    it("throws when trying to stay at same phase", () => {
      const incident = makeIncident({ phase: "mitigating" })
      expect(() => advanceIncidentPhase(incident, "mitigating", "bob", "Same")).toThrow()
    })

    it("sets resolvedAt when advancing to resolved", () => {
      const incident = makeIncident({ phase: "mitigating" })
      const resolved = advanceIncidentPhase(incident, "resolved", "bob", "Fixed")

      expect(resolved.resolvedAt).toBe(Date.now())
    })

    it("sets resolvedAt when advancing to postmortem", () => {
      const incident = makeIncident({ phase: "mitigating" })
      const pm = advanceIncidentPhase(incident, "postmortem", "bob", "Post-mortem phase")

      expect(pm.resolvedAt).toBe(Date.now())
    })

    it("does not set resolvedAt for non-resolved phases", () => {
      const incident = makeIncident({ phase: "triaged" })
      const advanced = advanceIncidentPhase(incident, "investigating", "bob", "Investigating")

      expect(advanced.resolvedAt).toBeNull()
    })
  })

  // ── resolveIncident ────────────────────────────────────────

  describe("resolveIncident", () => {
    it("sets rootCause, mitigation, and resolvedAt", () => {
      const incident = makeIncident({ phase: "mitigating" })
      const resolved = resolveIncident(
        incident,
        "alice",
        "Memory leak in connection pool",
        "Increased pool size and restarted service"
      )

      expect(resolved.phase).toBe("resolved")
      expect(resolved.rootCause).toBe("Memory leak in connection pool")
      expect(resolved.mitigation).toBe("Increased pool size and restarted service")
      expect(resolved.resolvedAt).toBe(Date.now())
      expect(resolved.timeline.length).toBe(incident.timeline.length + 1)
    })
  })

  // ── createPostMortem ───────────────────────────────────────

  describe("createPostMortem", () => {
    it("maps incident data and creates action items", () => {
      const incident = makeIncident({
        id: "INC-1001",
        title: "DB Outage",
        severity: "P0",
        affectedServices: ["db", "api", "worker"],
      })

      const actionItems = [
        {
          description: "Add connection pool monitoring",
          assignee: "bob",
          dueDate: Date.now() + 86400000,
          priority: "high" as const,
        },
        {
          description: "Update runbook",
          assignee: "alice",
          dueDate: Date.now() + 172800000,
          priority: "medium" as const,
        },
      ]

      const pm = createPostMortem(incident, "Memory leak", 5000, 45, false, actionItems, [
        "Need better monitoring",
        "Runbook was outdated",
      ])

      expect(pm.incidentId).toBe("INC-1001")
      expect(pm.title).toBe("Post-Mortem: DB Outage")
      expect(pm.summary).toContain("P0")
      expect(pm.rootCause).toBe("Memory leak")
      expect(pm.impact.affectedUsers).toBe(5000)
      expect(pm.impact.affectedServices).toEqual(["db", "api", "worker"])
      expect(pm.impact.downtimeMinutes).toBe(45)
      expect(pm.impact.dataLoss).toBe(false)
      expect(pm.actionItems).toHaveLength(2)
      expect(pm.actionItems[0].id).toBe("action_INC-1001_0")
      expect(pm.actionItems[0].completed).toBe(false)
      expect(pm.actionItems[1].id).toBe("action_INC-1001_1")
      expect(pm.lessonsLearned).toHaveLength(2)
      expect(pm.timeline).toEqual(incident.timeline)
    })
  })

  // ── calculateMTTR ──────────────────────────────────────────

  describe("calculateMTTR", () => {
    it("averages resolution time for resolved incidents", () => {
      const now = Date.now()
      const incidents: Incident[] = [
        makeIncident({ detectedAt: now - 60 * 60 * 1000, resolvedAt: now }), // 60 min
        makeIncident({ detectedAt: now - 30 * 60 * 1000, resolvedAt: now }), // 30 min
      ]

      const mttr = calculateMTTR(incidents)
      expect(mttr).toBe(45) // (60 + 30) / 2
    })

    it("returns 0 when no resolved incidents", () => {
      const incidents: Incident[] = [
        makeIncident({ resolvedAt: null }),
        makeIncident({ resolvedAt: null }),
      ]

      expect(calculateMTTR(incidents)).toBe(0)
    })

    it("ignores unresolved incidents in calculation", () => {
      const now = Date.now()
      const incidents: Incident[] = [
        makeIncident({ detectedAt: now - 60 * 60 * 1000, resolvedAt: now }),
        makeIncident({ resolvedAt: null }),
      ]

      const mttr = calculateMTTR(incidents)
      expect(mttr).toBe(60)
    })

    it("returns 0 for empty array", () => {
      expect(calculateMTTR([])).toBe(0)
    })
  })

  // ── buildIncidentDashboard ─────────────────────────────────

  describe("buildIncidentDashboard", () => {
    it("separates active vs resolved incidents", () => {
      const now = Date.now()
      const incidents: Incident[] = [
        makeIncident({ id: "INC-1", phase: "investigating", severity: "P0" }),
        makeIncident({ id: "INC-2", phase: "mitigating", severity: "P1" }),
        makeIncident({ id: "INC-3", phase: "resolved", severity: "P2", resolvedAt: now }),
        makeIncident({ id: "INC-4", phase: "postmortem", severity: "P0", resolvedAt: now - 1000 }),
      ]
      const rules: DetectionRule[] = []

      const dashboard = buildIncidentDashboard(incidents, rules)

      expect(dashboard.activeIncidents).toHaveLength(2)
      expect(dashboard.activeIncidents.map((i) => i.id)).toContain("INC-1")
      expect(dashboard.activeIncidents.map((i) => i.id)).toContain("INC-2")

      expect(dashboard.recentResolved).toHaveLength(2)
      expect(dashboard.recentResolved[0].id).toBe("INC-3") // more recent resolvedAt

      expect(dashboard.stats.totalIncidents).toBe(4)
      expect(dashboard.stats.incidentsBySeverity.P0).toBe(2)
      expect(dashboard.stats.incidentsBySeverity.P1).toBe(1)
      expect(dashboard.stats.incidentsBySeverity.P2).toBe(1)
      expect(dashboard.stats.incidentsBySeverity.P3).toBe(0)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Rollback/Recovery
// ═══════════════════════════════════════════════════════════════

describe("AC3: Rollback/Recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── createRollbackRequest ──────────────────────────────────

  describe("createRollbackRequest", () => {
    it("creates config rollback with 5 steps", () => {
      const req = createRollbackRequest("config", "Bad config change", "v1.2", "v1.1", "alice")

      expect(req.id).toMatch(/^RB-/)
      expect(req.type).toBe("config")
      expect(req.status).toBe("pending")
      expect(req.steps).toHaveLength(5)
      expect(req.impactAnalysis).toBeNull()
      expect(req.executedAt).toBeNull()
      expect(req.completedAt).toBeNull()
      expect(req.verifiedBy).toBeNull()
      expect(req.steps.every((s) => s.status === "pending")).toBe(true)
    })

    it("creates code rollback with 7 steps", () => {
      const req = createRollbackRequest("code", "Regression", "v2.0", "v1.9", "bob")
      expect(req.type).toBe("code")
      expect(req.steps).toHaveLength(7)
    })

    it("creates data rollback with 6 steps", () => {
      const req = createRollbackRequest("data", "Data corruption", "snap-2", "snap-1", "charlie")
      expect(req.type).toBe("data")
      expect(req.steps).toHaveLength(6)
    })
  })

  // ── analyzeRollbackImpact ──────────────────────────────────

  describe("analyzeRollbackImpact", () => {
    it("returns critical risk for data rollback", () => {
      const req = createRollbackRequest("data", "Corruption", "v2", "v1", "alice")
      const analyzed = analyzeRollbackImpact(req, 1000, ["db"], 10)

      expect(analyzed.status).toBe("analyzing")
      expect(analyzed.impactAnalysis).not.toBeNull()
      expect(analyzed.impactAnalysis!.riskLevel).toBe("critical") // data type always critical
      expect(analyzed.impactAnalysis!.dataImpact).toBe("partial_loss")
    })

    it("returns critical risk for high downtime", () => {
      const req = createRollbackRequest("config", "Bad config", "v2", "v1", "alice")
      const analyzed = analyzeRollbackImpact(req, 500, ["api"], 90)

      expect(analyzed.impactAnalysis!.riskLevel).toBe("critical") // >60 min downtime
    })

    it("returns high risk for many services or moderate downtime", () => {
      const req = createRollbackRequest("config", "Config issue", "v2", "v1", "alice")
      const analyzed = analyzeRollbackImpact(req, 500, ["a", "b", "c", "d"], 20)

      expect(analyzed.impactAnalysis!.riskLevel).toBe("high") // >3 services
    })

    it("returns medium risk for code rollback with moderate impact", () => {
      const req = createRollbackRequest("code", "Regression", "v2", "v1", "alice")
      const analyzed = analyzeRollbackImpact(req, 500, ["api"], 5)

      expect(analyzed.impactAnalysis!.riskLevel).toBe("medium") // code type
    })

    it("returns low risk for config with minimal impact", () => {
      const req = createRollbackRequest("config", "Minor fix", "v2", "v1", "alice")
      const analyzed = analyzeRollbackImpact(req, 100, ["api"], 5)

      expect(analyzed.impactAnalysis!.riskLevel).toBe("low")
    })

    it("generates warnings for data rollback", () => {
      const req = createRollbackRequest("data", "Corruption", "v2", "v1", "alice")
      const analyzed = analyzeRollbackImpact(req, 1000, ["db"], 10)

      expect(analyzed.impactAnalysis!.warnings.length).toBeGreaterThan(0)
      expect(analyzed.impactAnalysis!.warnings.some((w) => w.includes("데이터"))).toBe(true)
    })

    it("generates warning for downtime > 30 minutes", () => {
      const req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      const analyzed = analyzeRollbackImpact(req, 500, ["api"], 45)

      expect(analyzed.impactAnalysis!.warnings.some((w) => w.includes("30분"))).toBe(true)
    })

    it("generates warning for >3 affected services", () => {
      const req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      const analyzed = analyzeRollbackImpact(req, 500, ["a", "b", "c", "d"], 5)

      expect(analyzed.impactAnalysis!.warnings.some((w) => w.includes("3개"))).toBe(true)
    })
  })

  // ── approveRollback ────────────────────────────────────────

  describe("approveRollback", () => {
    it("throws if no impact analysis", () => {
      const req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      expect(() => approveRollback(req, "manager")).toThrow()
    })

    it("approves rollback with impact analysis", () => {
      const req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      const analyzed = analyzeRollbackImpact(req, 500, ["api"], 5)
      const approved = approveRollback(analyzed, "manager")

      expect(approved.status).toBe("approved")
      expect(approved.verifiedBy).toBe("manager")
    })
  })

  // ── executeRollbackStep ────────────────────────────────────

  describe("executeRollbackStep", () => {
    it("transitions step to completed on success", () => {
      const req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      const analyzed = analyzeRollbackImpact(req, 500, ["api"], 5)
      const approved = approveRollback(analyzed, "manager")

      const executed = executeRollbackStep(approved, 1, true)
      const step1 = executed.steps.find((s) => s.order === 1)!

      expect(step1.status).toBe("completed")
      expect(step1.completedAt).not.toBeNull()
      expect(step1.error).toBeNull()
      expect(executed.status).toBe("executing")
    })

    it("transitions step to failed on failure", () => {
      const req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      const analyzed = analyzeRollbackImpact(req, 500, ["api"], 5)
      const approved = approveRollback(analyzed, "manager")

      const executed = executeRollbackStep(approved, 1, false, "Backup failed")
      const step1 = executed.steps.find((s) => s.order === 1)!

      expect(step1.status).toBe("failed")
      expect(step1.error).toBe("Backup failed")
      expect(executed.status).toBe("failed")
    })

    it("transitions to verifying when all steps complete", () => {
      let req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      req = analyzeRollbackImpact(req, 500, ["api"], 5)
      req = approveRollback(req, "manager")

      // Complete all 5 config steps
      for (let i = 1; i <= 5; i++) {
        req = executeRollbackStep(req, i, true)
      }

      expect(req.status).toBe("verifying")
    })

    it("throws if rollback is not in approved or executing state", () => {
      const req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      expect(() => executeRollbackStep(req, 1, true)).toThrow()
    })
  })

  // ── completeRollback ───────────────────────────────────────

  describe("completeRollback", () => {
    it("completes rollback in verifying state", () => {
      let req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      req = analyzeRollbackImpact(req, 500, ["api"], 5)
      req = approveRollback(req, "manager")
      for (let i = 1; i <= 5; i++) {
        req = executeRollbackStep(req, i, true)
      }

      const completed = completeRollback(req, "qa-lead")
      expect(completed.status).toBe("completed")
      expect(completed.completedAt).toBe(Date.now())
      expect(completed.verifiedBy).toBe("qa-lead")
    })

    it("throws if not in verifying state", () => {
      const req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      expect(() => completeRollback(req, "qa-lead")).toThrow()
    })
  })

  // ── cancelRollback ─────────────────────────────────────────

  describe("cancelRollback", () => {
    it("cancels a pending rollback", () => {
      const req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      const cancelled = cancelRollback(req)

      expect(cancelled.status).toBe("cancelled")
      expect(cancelled.steps.every((s) => s.status === "skipped")).toBe(true)
    })

    it("throws if already completed", () => {
      let req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      req = analyzeRollbackImpact(req, 500, ["api"], 5)
      req = approveRollback(req, "manager")
      for (let i = 1; i <= 5; i++) {
        req = executeRollbackStep(req, i, true)
      }
      req = completeRollback(req, "qa")

      expect(() => cancelRollback(req)).toThrow()
    })

    it("throws if already failed", () => {
      let req = createRollbackRequest("config", "Issue", "v2", "v1", "alice")
      req = analyzeRollbackImpact(req, 500, ["api"], 5)
      req = approveRollback(req, "manager")
      req = executeRollbackStep(req, 1, false, "Error")

      expect(() => cancelRollback(req)).toThrow()
    })
  })

  // ── createDataRecoveryProcedure ────────────────────────────

  describe("createDataRecoveryProcedure", () => {
    it("creates with correct structure and defaults", () => {
      const proc = createDataRecoveryProcedure("users", "point_in_time", 500, Date.now() - 3600000)

      expect(proc.id).toMatch(/^DR-/)
      expect(proc.targetTable).toBe("users")
      expect(proc.recoveryType).toBe("point_in_time")
      expect(proc.affectedRows).toBe(500)
      expect(proc.targetTimestamp).not.toBeNull()
      expect(proc.backupId).toBeNull()
      expect(proc.status).toBe("pending")
      expect(proc.startedAt).toBeNull()
      expect(proc.completedAt).toBeNull()
    })

    it("accepts backupId for backup_restore type", () => {
      const proc = createDataRecoveryProcedure("orders", "backup_restore", 1000, null, "backup-123")

      expect(proc.recoveryType).toBe("backup_restore")
      expect(proc.backupId).toBe("backup-123")
      expect(proc.targetTimestamp).toBeNull()
    })
  })

  // ── advanceDataRecovery ────────────────────────────────────

  describe("advanceDataRecovery", () => {
    it("transitions pending to executing", () => {
      const proc = createDataRecoveryProcedure("users", "point_in_time", 500)
      const executing = advanceDataRecovery(proc, "executing")

      expect(executing.status).toBe("executing")
      expect(executing.startedAt).toBe(Date.now())
      expect(executing.completedAt).toBeNull()
    })

    it("transitions executing to verifying", () => {
      let proc = createDataRecoveryProcedure("users", "point_in_time", 500)
      proc = advanceDataRecovery(proc, "executing")
      const verifying = advanceDataRecovery(proc, "verifying")

      expect(verifying.status).toBe("verifying")
      expect(verifying.startedAt).not.toBeNull() // preserves original startedAt
      expect(verifying.completedAt).toBeNull()
    })

    it("sets completedAt when transitioning to completed", () => {
      let proc = createDataRecoveryProcedure("users", "point_in_time", 500)
      proc = advanceDataRecovery(proc, "executing")
      proc = advanceDataRecovery(proc, "verifying")
      const completed = advanceDataRecovery(proc, "completed")

      expect(completed.status).toBe("completed")
      expect(completed.completedAt).toBe(Date.now())
    })

    it("sets completedAt when transitioning to failed", () => {
      let proc = createDataRecoveryProcedure("users", "point_in_time", 500)
      proc = advanceDataRecovery(proc, "executing")
      const failed = advanceDataRecovery(proc, "failed")

      expect(failed.status).toBe("failed")
      expect(failed.completedAt).toBe(Date.now())
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: Backup/DR
// ═══════════════════════════════════════════════════════════════

describe("AC4: Backup/DR", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── createBackupPolicy ─────────────────────────────────────

  describe("createBackupPolicy", () => {
    it("creates policy with correct defaults (encryption and compression enabled)", () => {
      const policy = createBackupPolicy(
        "Test Policy",
        "full",
        "database",
        "0 2 * * *",
        30,
        "/backups/test"
      )

      expect(policy.id).toMatch(/^policy_/)
      expect(policy.name).toBe("Test Policy")
      expect(policy.method).toBe("full")
      expect(policy.target).toBe("database")
      expect(policy.cronSchedule).toBe("0 2 * * *")
      expect(policy.retentionDays).toBe(30)
      expect(policy.encryptionEnabled).toBe(true) // default
      expect(policy.compressionEnabled).toBe(true) // default
      expect(policy.destinationPath).toBe("/backups/test")
      expect(policy.enabled).toBe(true)
    })

    it("allows overriding encryption and compression", () => {
      const policy = createBackupPolicy(
        "Unencrypted",
        "incremental",
        "files",
        "0 3 * * *",
        7,
        "/backups/files",
        { encryptionEnabled: false, compressionEnabled: false }
      )

      expect(policy.encryptionEnabled).toBe(false)
      expect(policy.compressionEnabled).toBe(false)
    })
  })

  // ── createBackupRecord + complete/fail ─────────────────────

  describe("createBackupRecord + complete/fail flow", () => {
    it("creates running record then completes it", () => {
      const policy = DEFAULT_BACKUP_POLICIES[0]
      const record = createBackupRecord(policy, "/backups/db/full/2025-01-15.bak")

      expect(record.id).toMatch(/^backup_/)
      expect(record.policyId).toBe(policy.id)
      expect(record.status).toBe("running")
      expect(record.sizeBytes).toBe(0)
      expect(record.checksum).toBeNull()
      expect(record.error).toBeNull()

      const completed = completeBackupRecord(record, 1024 * 1024, "sha256-abc123")

      expect(completed.status).toBe("completed")
      expect(completed.sizeBytes).toBe(1024 * 1024)
      expect(completed.checksum).toBe("sha256-abc123")
      expect(completed.completedAt).toBe(Date.now())
    })

    it("creates running record then fails it", () => {
      const policy = DEFAULT_BACKUP_POLICIES[0]
      const record = createBackupRecord(policy, "/backups/db/full/2025-01-15.bak")

      const failed = failBackupRecord(record, "Disk full")

      expect(failed.status).toBe("failed")
      expect(failed.error).toBe("Disk full")
      expect(failed.completedAt).toBe(Date.now())
    })
  })

  // ── computeBackupMonitoring ────────────────────────────────

  describe("computeBackupMonitoring", () => {
    it("calculates success rate and averages", () => {
      const policy = DEFAULT_BACKUP_POLICIES[0]
      const now = Date.now()

      const records: BackupRecord[] = [
        {
          id: "b1",
          policyId: policy.id,
          method: "full",
          target: "database",
          status: "completed",
          startedAt: now - 3600000,
          completedAt: now - 3500000,
          sizeBytes: 1000,
          checksum: "abc",
          storagePath: "/backups/1",
          error: null,
        },
        {
          id: "b2",
          policyId: policy.id,
          method: "full",
          target: "database",
          status: "completed",
          startedAt: now - 7200000,
          completedAt: now - 7000000,
          sizeBytes: 2000,
          checksum: "def",
          storagePath: "/backups/2",
          error: null,
        },
        {
          id: "b3",
          policyId: policy.id,
          method: "full",
          target: "database",
          status: "failed",
          startedAt: now - 10800000,
          completedAt: now - 10700000,
          sizeBytes: 0,
          checksum: null,
          storagePath: "/backups/3",
          error: "disk full",
        },
      ]

      const monitoring = computeBackupMonitoring(policy, records)

      expect(monitoring.policyId).toBe(policy.id)
      expect(monitoring.totalBackups).toBe(3)
      expect(monitoring.successRate).toBeCloseTo(66.67, 1) // 2/3 = 66.67%
      expect(monitoring.totalStorageBytes).toBe(3000)
      expect(monitoring.lastBackupAt).toBe(now - 3600000) // most recent
      expect(monitoring.lastBackupStatus).toBe("completed")
      expect(monitoring.averageDurationMs).toBeGreaterThan(0)
    })

    it("returns zero values for no records", () => {
      const policy = DEFAULT_BACKUP_POLICIES[0]
      const monitoring = computeBackupMonitoring(policy, [])

      expect(monitoring.totalBackups).toBe(0)
      expect(monitoring.successRate).toBe(0)
      expect(monitoring.averageDurationMs).toBe(0)
      expect(monitoring.totalStorageBytes).toBe(0)
      expect(monitoring.lastBackupAt).toBeNull()
      expect(monitoring.lastBackupStatus).toBeNull()
    })
  })

  // ── isBackupOverdue ────────────────────────────────────────

  describe("isBackupOverdue", () => {
    it("returns true when backup is overdue (last backup > 1.5x interval)", () => {
      const now = Date.now()
      const dailyIntervalMs = 24 * 60 * 60 * 1000

      const monitoring = computeBackupMonitoring(DEFAULT_BACKUP_POLICIES[0], [
        {
          id: "b1",
          policyId: DEFAULT_BACKUP_POLICIES[0].id,
          method: "full",
          target: "database",
          status: "completed",
          startedAt: now - dailyIntervalMs * 2,
          completedAt: now - dailyIntervalMs * 2 + 1000,
          sizeBytes: 1000,
          checksum: "abc",
          storagePath: "/backups/1",
          error: null,
        },
      ])

      expect(isBackupOverdue(monitoring, dailyIntervalMs)).toBe(true)
    })

    it("returns false when backup is not overdue", () => {
      const now = Date.now()
      const dailyIntervalMs = 24 * 60 * 60 * 1000

      const monitoring = computeBackupMonitoring(DEFAULT_BACKUP_POLICIES[0], [
        {
          id: "b1",
          policyId: DEFAULT_BACKUP_POLICIES[0].id,
          method: "full",
          target: "database",
          status: "completed",
          startedAt: now - 1000,
          completedAt: now,
          sizeBytes: 1000,
          checksum: "abc",
          storagePath: "/backups/1",
          error: null,
        },
      ])

      expect(isBackupOverdue(monitoring, dailyIntervalMs)).toBe(false)
    })

    it("returns true when no backup has been made (lastBackupAt is null)", () => {
      const monitoring = computeBackupMonitoring(DEFAULT_BACKUP_POLICIES[0], [])
      expect(isBackupOverdue(monitoring, 86400000)).toBe(true)
    })
  })

  // ── createDRPlan ───────────────────────────────────────────

  describe("createDRPlan", () => {
    it("creates plan with ordered steps", () => {
      const steps = [
        {
          description: "Failover DB",
          responsible: "dba",
          estimatedMinutes: 10,
          prerequisites: [],
          verificationCommand: "pg_isready",
        },
        {
          description: "Redirect traffic",
          responsible: "ops",
          estimatedMinutes: 5,
          prerequisites: ["Failover DB"],
          verificationCommand: null,
        },
        {
          description: "Verify services",
          responsible: "qa",
          estimatedMinutes: 15,
          prerequisites: ["Redirect traffic"],
          verificationCommand: "curl health",
        },
      ]
      const contacts = [
        { name: "Alice", role: "DBA", phone: "010-1234", email: "alice@test.com", isPrimary: true },
      ]

      const plan = createDRPlan("DB Failover Plan", "database_failure", 30, 5, steps, contacts)

      expect(plan.id).toMatch(/^drplan_/)
      expect(plan.name).toBe("DB Failover Plan")
      expect(plan.scenario).toBe("database_failure")
      expect(plan.rtoMinutes).toBe(30)
      expect(plan.rpoMinutes).toBe(5)
      expect(plan.steps).toHaveLength(3)
      expect(plan.steps[0].order).toBe(1)
      expect(plan.steps[1].order).toBe(2)
      expect(plan.steps[2].order).toBe(3)
      expect(plan.contacts).toHaveLength(1)
      expect(plan.lastTestedAt).toBeNull()
    })
  })

  // ── scheduleDRDrill -> startDRDrill -> completeDRDrill flow ─

  describe("DR Drill lifecycle", () => {
    it("flows from scheduled -> in_progress -> completed", () => {
      const futureTime = Date.now() + 86400000
      const drill = scheduleDRDrill("drplan_1", "database_failure", futureTime)

      expect(drill.status).toBe("scheduled")
      expect(drill.scheduledAt).toBe(futureTime)
      expect(drill.executedAt).toBeNull()
      expect(drill.completedAt).toBeNull()

      const started = startDRDrill(drill)
      expect(started.status).toBe("in_progress")
      expect(started.executedAt).toBe(Date.now())

      const completed = completeDRDrill(started, 25, 3, ["Issue found"], ["Fix failover"])
      expect(completed.status).toBe("completed")
      expect(completed.completedAt).toBe(Date.now())
      expect(completed.actualRtoMinutes).toBe(25)
      expect(completed.actualRpoMinutes).toBe(3)
      expect(completed.findings).toEqual(["Issue found"])
      expect(completed.actionItems).toEqual(["Fix failover"])
    })

    it("throws when starting non-scheduled drill", () => {
      const drill = scheduleDRDrill("drplan_1", "database_failure", Date.now())
      const started = startDRDrill(drill)
      expect(() => startDRDrill(started)).toThrow()
    })

    it("throws when completing non-in-progress drill", () => {
      const drill = scheduleDRDrill("drplan_1", "database_failure", Date.now())
      expect(() => completeDRDrill(drill, 25, 3, [], [])).toThrow()
    })
  })

  // ── evaluateDRDrillResult ──────────────────────────────────

  describe("evaluateDRDrillResult", () => {
    const plan: DRPlan = {
      id: "drplan_1",
      name: "Test Plan",
      scenario: "database_failure",
      rtoMinutes: 30,
      rpoMinutes: 5,
      steps: [],
      contacts: [],
      lastTestedAt: null,
      lastUpdatedAt: Date.now(),
    }

    it("returns pass when both RTO and RPO are met", () => {
      const drill: DRDrill = {
        id: "drill_1",
        planId: "drplan_1",
        scenario: "database_failure",
        scheduledAt: Date.now(),
        executedAt: Date.now(),
        completedAt: Date.now(),
        status: "completed",
        actualRtoMinutes: 20,
        actualRpoMinutes: 3,
        findings: [],
        actionItems: [],
      }

      const result = evaluateDRDrillResult(drill, plan)
      expect(result.rtoMet).toBe(true)
      expect(result.rpoMet).toBe(true)
      expect(result.overallPass).toBe(true)
      expect(result.summary).toContain("통과")
    })

    it("returns fail when RTO is not met", () => {
      const drill: DRDrill = {
        id: "drill_1",
        planId: "drplan_1",
        scenario: "database_failure",
        scheduledAt: Date.now(),
        executedAt: Date.now(),
        completedAt: Date.now(),
        status: "completed",
        actualRtoMinutes: 45,
        actualRpoMinutes: 3,
        findings: [],
        actionItems: [],
      }

      const result = evaluateDRDrillResult(drill, plan)
      expect(result.rtoMet).toBe(false)
      expect(result.rpoMet).toBe(true)
      expect(result.overallPass).toBe(false)
    })

    it("returns fail when RPO is not met", () => {
      const drill: DRDrill = {
        id: "drill_1",
        planId: "drplan_1",
        scenario: "database_failure",
        scheduledAt: Date.now(),
        executedAt: Date.now(),
        completedAt: Date.now(),
        status: "completed",
        actualRtoMinutes: 20,
        actualRpoMinutes: 10,
        findings: [],
        actionItems: [],
      }

      const result = evaluateDRDrillResult(drill, plan)
      expect(result.rtoMet).toBe(true)
      expect(result.rpoMet).toBe(false)
      expect(result.overallPass).toBe(false)
    })

    it("returns all false for incomplete drill", () => {
      const drill: DRDrill = {
        id: "drill_1",
        planId: "drplan_1",
        scenario: "database_failure",
        scheduledAt: Date.now(),
        executedAt: null,
        completedAt: null,
        status: "scheduled",
        actualRtoMinutes: null,
        actualRpoMinutes: null,
        findings: [],
        actionItems: [],
      }

      const result = evaluateDRDrillResult(drill, plan)
      expect(result.rtoMet).toBe(false)
      expect(result.rpoMet).toBe(false)
      expect(result.overallPass).toBe(false)
      expect(result.summary).toContain("완료되지 않았습니다")
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC5: Capacity Planning
// ═══════════════════════════════════════════════════════════════

describe("AC5: Capacity Planning", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-15T12:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── createResourceUsage ────────────────────────────────────

  describe("createResourceUsage", () => {
    it("creates resource with rounded currentValue", () => {
      const resource = createResourceUsage("cpu", 72.567, 100, "%")

      expect(resource.metricType).toBe("cpu")
      expect(resource.currentValue).toBe(72.57) // rounded
      expect(resource.maxCapacity).toBe(100)
      expect(resource.unit).toBe("%")
      expect(resource.timestamp).toBe(Date.now())
    })
  })

  // ── getUsagePercent ────────────────────────────────────────

  describe("getUsagePercent", () => {
    it("calculates usage percentage correctly", () => {
      const resource = makeResourceUsage({ currentValue: 60, maxCapacity: 100 })
      expect(getUsagePercent(resource)).toBe(60)
    })

    it("returns 0 for zero maxCapacity (division by zero)", () => {
      const resource = makeResourceUsage({ currentValue: 50, maxCapacity: 0 })
      expect(getUsagePercent(resource)).toBe(0)
    })

    it("returns 0 for negative maxCapacity", () => {
      const resource = makeResourceUsage({ currentValue: 50, maxCapacity: -10 })
      expect(getUsagePercent(resource)).toBe(0)
    })

    it("rounds result to 2 decimal places", () => {
      const resource = makeResourceUsage({ currentValue: 33.333, maxCapacity: 100 })
      const percent = getUsagePercent(resource)
      const decimalPlaces = percent.toString().split(".")[1]?.length ?? 0
      expect(decimalPlaces).toBeLessThanOrEqual(2)
    })
  })

  // ── forecastLinear ─────────────────────────────────────────

  describe("forecastLinear", () => {
    const msPerDay = 86400000
    const baseTime = new Date("2025-01-01T00:00:00Z").getTime()

    it("detects increasing trend", () => {
      const snapshots: UsageSnapshot[] = []
      for (let day = 0; day < 10; day++) {
        snapshots.push(
          makeUsageSnapshot(baseTime + day * msPerDay, [
            makeResourceUsage({ metricType: "cpu", currentValue: 30 + day * 3, maxCapacity: 100 }),
          ])
        )
      }

      const forecast = forecastLinear(snapshots, "cpu", 30)

      expect(forecast.trend).toBe("increasing")
      expect(forecast.projectedUsagePercent).toBeGreaterThan(forecast.currentUsagePercent)
      expect(forecast.projectedDataPoints).toHaveLength(30)
      expect(forecast.confidence).toBeGreaterThan(0)
    })

    it("detects stable trend", () => {
      const snapshots: UsageSnapshot[] = []
      for (let day = 0; day < 10; day++) {
        snapshots.push(
          makeUsageSnapshot(baseTime + day * msPerDay, [
            makeResourceUsage({ metricType: "memory", currentValue: 50, maxCapacity: 100 }),
          ])
        )
      }

      const forecast = forecastLinear(snapshots, "memory", 30)
      expect(forecast.trend).toBe("stable")
    })

    it("detects decreasing trend", () => {
      const snapshots: UsageSnapshot[] = []
      for (let day = 0; day < 10; day++) {
        snapshots.push(
          makeUsageSnapshot(baseTime + day * msPerDay, [
            makeResourceUsage({ metricType: "disk", currentValue: 80 - day * 3, maxCapacity: 100 }),
          ])
        )
      }

      const forecast = forecastLinear(snapshots, "disk", 30)
      expect(forecast.trend).toBe("decreasing")
    })

    it("predicts daysUntilThreshold for increasing usage", () => {
      const snapshots: UsageSnapshot[] = []
      for (let day = 0; day < 10; day++) {
        snapshots.push(
          makeUsageSnapshot(baseTime + day * msPerDay, [
            makeResourceUsage({ metricType: "cpu", currentValue: 30 + day * 5, maxCapacity: 100 }),
          ])
        )
      }

      const forecast = forecastLinear(snapshots, "cpu", 60, 80)

      expect(forecast.daysUntilThreshold).not.toBeNull()
      expect(forecast.daysUntilThreshold!).toBeGreaterThan(0)
      expect(forecast.thresholdPercent).toBe(80)
    })

    it("returns null daysUntilThreshold for stable/decreasing usage", () => {
      const snapshots: UsageSnapshot[] = []
      for (let day = 0; day < 10; day++) {
        snapshots.push(
          makeUsageSnapshot(baseTime + day * msPerDay, [
            makeResourceUsage({ metricType: "cpu", currentValue: 50, maxCapacity: 100 }),
          ])
        )
      }

      const forecast = forecastLinear(snapshots, "cpu", 30, 80)
      expect(forecast.daysUntilThreshold).toBeNull()
    })

    it("handles insufficient data (< 2 points)", () => {
      const snapshots: UsageSnapshot[] = [
        makeUsageSnapshot(baseTime, [
          makeResourceUsage({ metricType: "cpu", currentValue: 50, maxCapacity: 100 }),
        ]),
      ]

      const forecast = forecastLinear(snapshots, "cpu", 30)

      expect(forecast.trend).toBe("stable")
      expect(forecast.confidence).toBe(0)
      expect(forecast.projectedDataPoints).toHaveLength(0)
      expect(forecast.daysUntilThreshold).toBeNull()
      expect(forecast.currentUsagePercent).toBe(50)
    })

    it("handles no data points for the metric type", () => {
      const snapshots: UsageSnapshot[] = [
        makeUsageSnapshot(baseTime, [
          makeResourceUsage({ metricType: "memory", currentValue: 50, maxCapacity: 100 }),
        ]),
      ]

      const forecast = forecastLinear(snapshots, "cpu", 30)
      expect(forecast.currentUsagePercent).toBe(0)
      expect(forecast.confidence).toBe(0)
    })

    it("clamps projected values between 0 and 100", () => {
      const snapshots: UsageSnapshot[] = []
      for (let day = 0; day < 10; day++) {
        snapshots.push(
          makeUsageSnapshot(baseTime + day * msPerDay, [
            makeResourceUsage({ metricType: "cpu", currentValue: 90 + day, maxCapacity: 100 }),
          ])
        )
      }

      const forecast = forecastLinear(snapshots, "cpu", 365)
      expect(forecast.projectedUsagePercent).toBeLessThanOrEqual(100)
      expect(forecast.projectedDataPoints.every((p) => p.value <= 100 && p.value >= 0)).toBe(true)
    })
  })

  // ── generateCostOptimizations ──────────────────────────────

  describe("generateCostOptimizations", () => {
    it("recommends rightsizing for underutilized resources (< 20%)", () => {
      const resources: ResourceUsage[] = [
        makeResourceUsage({ metricType: "cpu", currentValue: 10, maxCapacity: 100 }),
      ]
      const forecasts: ForecastResult[] = []

      const opts = generateCostOptimizations(resources, forecasts)

      const rightsizing = opts.filter((o) => o.category === "rightsizing")
      expect(rightsizing.length).toBeGreaterThan(0)
      expect(rightsizing[0].title).toContain("cpu")
    })

    it("does not recommend rightsizing for well-utilized resources", () => {
      const resources: ResourceUsage[] = [
        makeResourceUsage({ metricType: "cpu", currentValue: 60, maxCapacity: 100 }),
      ]
      const forecasts: ForecastResult[] = []

      const opts = generateCostOptimizations(resources, forecasts)
      const rightsizing = opts.filter((o) => o.category === "rightsizing")
      expect(rightsizing).toHaveLength(0)
    })

    it("recommends reserved capacity for stable forecasts with high confidence", () => {
      const resources: ResourceUsage[] = []
      const forecasts: ForecastResult[] = [
        {
          metricType: "cpu",
          currentUsagePercent: 50,
          projectedUsagePercent: 50,
          daysUntilThreshold: null,
          thresholdPercent: 80,
          trend: "stable",
          confidence: 0.9,
          projectedDataPoints: [],
        },
      ]

      const opts = generateCostOptimizations(resources, forecasts)
      const reserved = opts.filter((o) => o.category === "reserved_capacity")
      expect(reserved.length).toBeGreaterThan(0)
    })

    it("always includes scheduling optimization", () => {
      const opts = generateCostOptimizations([], [])
      const scheduling = opts.filter((o) => o.category === "scheduling")
      expect(scheduling).toHaveLength(1)
    })

    it("recommends storage tiering when disk usage > 50%", () => {
      const resources: ResourceUsage[] = [
        makeResourceUsage({ metricType: "disk", currentValue: 60, maxCapacity: 100 }),
      ]

      const opts = generateCostOptimizations(resources, [])
      const tiering = opts.filter((o) => o.category === "storage_tiering")
      expect(tiering).toHaveLength(1)
    })
  })

  // ── generateScalingRecommendations ─────────────────────────

  describe("generateScalingRecommendations", () => {
    it("recommends immediate scale up for usage > 90%", () => {
      const resources: ResourceUsage[] = [
        makeResourceUsage({ metricType: "cpu", currentValue: 95, maxCapacity: 100 }),
      ]

      const recs = generateScalingRecommendations(resources, [])

      expect(recs).toHaveLength(1)
      expect(recs[0].direction).toBe("scale_up")
      expect(recs[0].urgency).toBe("immediate")
      expect(recs[0].recommendedCapacity).toBe(150) // 100 * 1.5
    })

    it("recommends soon scale up for usage > 75%", () => {
      const resources: ResourceUsage[] = [
        makeResourceUsage({ metricType: "memory", currentValue: 80, maxCapacity: 100 }),
      ]

      const recs = generateScalingRecommendations(resources, [])

      expect(recs).toHaveLength(1)
      expect(recs[0].direction).toBe("scale_up")
      expect(recs[0].urgency).toBe("soon")
    })

    it("recommends scale down for usage < 20% with decreasing trend", () => {
      const resources: ResourceUsage[] = [
        makeResourceUsage({ metricType: "cpu", currentValue: 10, maxCapacity: 100 }),
      ]
      const forecasts: ForecastResult[] = [
        {
          metricType: "cpu",
          currentUsagePercent: 10,
          projectedUsagePercent: 5,
          daysUntilThreshold: null,
          thresholdPercent: 80,
          trend: "decreasing",
          confidence: 0.9,
          projectedDataPoints: [],
        },
      ]

      const recs = generateScalingRecommendations(resources, forecasts)
      expect(recs[0].direction).toBe("scale_down")
      expect(recs[0].urgency).toBe("planned")
      expect(recs[0].recommendedCapacity).toBe(50) // 100 * 0.5
    })

    it("recommends no change for moderate usage", () => {
      const resources: ResourceUsage[] = [
        makeResourceUsage({ metricType: "cpu", currentValue: 50, maxCapacity: 100 }),
      ]

      const recs = generateScalingRecommendations(resources, [])
      expect(recs[0].direction).toBe("no_change")
      expect(recs[0].recommendedCapacity).toBe(100)
    })

    it("recommends soon scale up when forecast shows threshold approaching within 30 days", () => {
      const resources: ResourceUsage[] = [
        makeResourceUsage({ metricType: "cpu", currentValue: 60, maxCapacity: 100 }),
      ]
      const forecasts: ForecastResult[] = [
        {
          metricType: "cpu",
          currentUsagePercent: 60,
          projectedUsagePercent: 85,
          daysUntilThreshold: 15,
          thresholdPercent: 80,
          trend: "increasing",
          confidence: 0.9,
          projectedDataPoints: [],
        },
      ]

      const recs = generateScalingRecommendations(resources, forecasts)
      expect(recs[0].direction).toBe("scale_up")
      expect(recs[0].urgency).toBe("soon")
    })
  })

  // ── buildCapacityReport ────────────────────────────────────

  describe("buildCapacityReport", () => {
    const msPerDay = 86400000
    const baseTime = new Date("2025-01-01T00:00:00Z").getTime()

    it("combines all data into a comprehensive report", () => {
      const snapshots: UsageSnapshot[] = []
      for (let day = 0; day < 10; day++) {
        snapshots.push(
          makeUsageSnapshot(baseTime + day * msPerDay, [
            makeResourceUsage({ metricType: "cpu", currentValue: 50 + day, maxCapacity: 100 }),
            makeResourceUsage({ metricType: "memory", currentValue: 40, maxCapacity: 100 }),
          ])
        )
      }

      const currentResources: ResourceUsage[] = [
        makeResourceUsage({ metricType: "cpu", currentValue: 60, maxCapacity: 100 }),
        makeResourceUsage({ metricType: "memory", currentValue: 40, maxCapacity: 100 }),
      ]

      const report = buildCapacityReport(snapshots, currentResources, 30, 80)

      expect(report.generatedAt).toBe(Date.now())
      expect(report.currentUsage).toEqual(currentResources)
      expect(report.forecasts.length).toBeGreaterThan(0)
      expect(report.optimizations.length).toBeGreaterThan(0)
      expect(report.scalingRecommendations.length).toBeGreaterThan(0)
      expect(report.summary.overallHealthScore).toBeGreaterThanOrEqual(0)
      expect(report.summary.overallHealthScore).toBeLessThanOrEqual(100)
      expect(Array.isArray(report.summary.criticalResources)).toBe(true)
      expect(typeof report.summary.estimatedTotalSavingsPercent).toBe("number")
    })

    it("identifies critical resources (usage > 90%)", () => {
      const snapshots: UsageSnapshot[] = [
        makeUsageSnapshot(baseTime, [
          makeResourceUsage({ metricType: "cpu", currentValue: 95, maxCapacity: 100 }),
        ]),
        makeUsageSnapshot(baseTime + msPerDay, [
          makeResourceUsage({ metricType: "cpu", currentValue: 96, maxCapacity: 100 }),
        ]),
      ]

      const currentResources: ResourceUsage[] = [
        makeResourceUsage({ metricType: "cpu", currentValue: 95, maxCapacity: 100 }),
      ]

      const report = buildCapacityReport(snapshots, currentResources)

      expect(report.summary.criticalResources).toContain("cpu")
    })

    it("returns healthy score when all resources are moderate", () => {
      const snapshots: UsageSnapshot[] = [
        makeUsageSnapshot(baseTime, [
          makeResourceUsage({ metricType: "cpu", currentValue: 40, maxCapacity: 100 }),
        ]),
        makeUsageSnapshot(baseTime + msPerDay, [
          makeResourceUsage({ metricType: "cpu", currentValue: 41, maxCapacity: 100 }),
        ]),
      ]

      const currentResources: ResourceUsage[] = [
        makeResourceUsage({ metricType: "cpu", currentValue: 40, maxCapacity: 100 }),
      ]

      const report = buildCapacityReport(snapshots, currentResources)
      expect(report.summary.overallHealthScore).toBeGreaterThanOrEqual(80)
    })
  })
})
