// ═══════════════════════════════════════════════════════════════
// System Integration Tests
// T66: deploy workflows, canary release, version management,
//      event bus, API docs, test pipelines
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

import {
  // Deploy
  ENVIRONMENT_CONFIGS,
  createDeployWorkflow,
  approveDeployWorkflow,
  advanceDeployStage,
  cancelDeployWorkflow,
  rollbackDeployWorkflow,
  getDeployHistoryByEnvironment,
  getActiveDeployments,
  // Canary
  createCanaryRelease,
  updateCanaryMetrics,
  evaluateCanaryRollback,
  advanceCanaryPhase,
  rollbackCanaryRelease,
  executeCanaryRelease,
  DEFAULT_CANARY_ROLLBACK_TRIGGERS,
  // Version
  parseVersion,
  formatVersion,
  bumpVersion,
  compareVersions,
  createVersion,
  activateVersion,
  deprecateVersion,
  setVersionTesting,
  deployVersionToEnvironment,
  diffVersions,
  rollbackVersion,
  getVersionHistory,
  DEFAULT_VERSION_POLICY,
  // Event Bus
  createEventBus,
  subscribe,
  unsubscribe,
  createEvent,
  publish,
  retryEvent,
  markEventDelivered,
  markEventFailed,
  getEventLog,
  getEventStats,
  measureSyncDelay,
  generateSyncDelayReport,
  SYNC_DELAY_TARGETS,
  // API Docs
  createAPIDocSpec,
  addDocEndpoint,
  addDocSchema,
  deprecateDocEndpoint,
  generateAPIDocs,
  // Changelog
  createChangelog,
  addChangelogEntry,
  generateChangelog,
  formatChangelogMarkdown,
  // Integration
  createDeveloperConsoleIntegration,
  syncUsageStats,
  updateConnectionStatus,
  getIntegrationHealthSummary,
  // Test Pipeline
  createTestScenario,
  readyTestScenario,
  runTestScenario,
  createTestPipeline,
  startTestPipeline,
  updatePipelineScenario,
  cancelTestPipeline,
  generateTestReport,
  formatTestReportMarkdown,
  createPersonaTestScenarios,
  createAlgorithmTestScenarios,
  createIntegrationTestScenarios,
  type DeployWorkflow,
  type DeployHistory,
  type AlgorithmVersion,
  type EventBusState,
  type EventMetadata,
  type EventSource,
} from "@/lib/system-integration"

// ── Helpers ─────────────────────────────────────────────────────

const testSource: EventSource = { service: "engine-studio", instance: "test-1" }
const testMetadata: EventMetadata = {
  userId: "user_1",
  userRole: "admin",
  environment: "development",
}

let algoVersionCounter = 0
function makeAlgoVersion(
  version: string,
  status: AlgorithmVersion["status"] = "draft",
  category: AlgorithmVersion["category"] = "matching"
): AlgorithmVersion {
  return {
    id: `algo_${category}_${Date.now()}_${algoVersionCounter++}`,
    category,
    version,
    parentVersion: null,
    status,
    createdBy: "test",
    createdAt: Date.now(),
    description: "test version",
    changelog: "initial",
    deployedEnvironments: [],
    config: { threshold: 0.5 },
    weights: { l1: 0.4, l2: 0.35, l3: 0.25 },
  }
}

// ═══════════════════════════════════════════════════════════════
// AC1: Deploy Workflows
// ═══════════════════════════════════════════════════════════════

describe("System Integration — Deploy Workflows", () => {
  it("should create a deploy workflow with 4 pending stages", () => {
    const wf = createDeployWorkflow("persona", "v1.0.0", "development", "user_1")
    expect(wf.id).toMatch(/^deploy_/)
    expect(wf.status).toBe("pending")
    expect(wf.stages).toHaveLength(4)
    expect(wf.stages.every((s) => s.status === "pending")).toBe(true)
    expect(wf.approvedBy).toBeNull()
  })

  it("should throw for invalid environment", () => {
    expect(() =>
      createDeployWorkflow("persona", "v1.0.0", "invalid" as "development", "user_1")
    ).toThrow()
  })

  it("should approve production workflow", () => {
    const wf = createDeployWorkflow("persona", "v1.0.0", "production", "user_1")
    const approved = approveDeployWorkflow(wf, "approver_1")
    expect(approved.approvedBy).toBe("approver_1")
    expect(approved.approvedAt).toBeGreaterThan(0)
  })

  it("should reject approval for non-production environment", () => {
    const wf = createDeployWorkflow("persona", "v1.0.0", "development", "user_1")
    expect(() => approveDeployWorkflow(wf, "approver_1")).toThrow()
  })

  it("should advance stages sequentially", () => {
    let wf = createDeployWorkflow("persona", "v1.0.0", "development", "user_1")
    wf = advanceDeployStage(wf, "build", true, ["build OK"])
    expect(wf.stages[0].status).toBe("passed")
    expect(wf.status).toBe("in_progress")

    wf = advanceDeployStage(wf, "test", true, ["tests passed"])
    wf = advanceDeployStage(wf, "deploy", true, ["deployed"])
    wf = advanceDeployStage(wf, "verify", true, ["verified"])
    expect(wf.status).toBe("succeeded")
    expect(wf.completedAt).toBeGreaterThan(0)
  })

  it("should fail workflow when a stage fails", () => {
    let wf = createDeployWorkflow("persona", "v1.0.0", "development", "user_1")
    wf = advanceDeployStage(wf, "build", false, [], "compilation error")
    expect(wf.status).toBe("failed")
    expect(wf.stages[0].error).toBe("compilation error")
  })

  it("should prevent advancing when previous stage not passed", () => {
    const wf = createDeployWorkflow("persona", "v1.0.0", "development", "user_1")
    expect(() => advanceDeployStage(wf, "test", true)).toThrow()
  })

  it("should require approval for production deploy", () => {
    const wf = createDeployWorkflow("persona", "v1.0.0", "production", "user_1")
    expect(() => advanceDeployStage(wf, "build", true)).toThrow("승인이 필요합니다")
  })

  it("should cancel a pending workflow", () => {
    const wf = createDeployWorkflow("persona", "v1.0.0", "development", "user_1")
    const cancelled = cancelDeployWorkflow(wf)
    expect(cancelled.status).toBe("cancelled")
    expect(cancelled.stages.every((s) => s.status === "skipped")).toBe(true)
  })

  it("should not cancel a succeeded workflow", () => {
    let wf = createDeployWorkflow("persona", "v1.0.0", "development", "user_1")
    wf = advanceDeployStage(wf, "build", true)
    wf = advanceDeployStage(wf, "test", true)
    wf = advanceDeployStage(wf, "deploy", true)
    wf = advanceDeployStage(wf, "verify", true)
    expect(() => cancelDeployWorkflow(wf)).toThrow()
  })

  it("should rollback a succeeded workflow", () => {
    let wf = createDeployWorkflow("persona", "v1.0.0", "development", "user_1")
    wf = advanceDeployStage(wf, "build", true)
    wf = advanceDeployStage(wf, "test", true)
    wf = advanceDeployStage(wf, "deploy", true)
    wf = advanceDeployStage(wf, "verify", true)
    const rolled = rollbackDeployWorkflow(wf, "found bug")
    expect(rolled.status).toBe("rolled_back")
    expect(rolled.rollbackReason).toBe("found bug")
  })

  it("should filter deploy history by environment", () => {
    const wf1 = createDeployWorkflow("persona", "v1.0.0", "development", "user_1")
    const wf2 = createDeployWorkflow("persona", "v1.0.0", "staging", "user_1")
    const history: DeployHistory = { workflows: [wf1, wf2], canaryReleases: [] }
    const devOnly = getDeployHistoryByEnvironment(history, "development")
    expect(devOnly).toHaveLength(1)
    expect(devOnly[0].environment).toBe("development")
  })

  it("should get active deployments", () => {
    const wf1 = createDeployWorkflow("persona", "v1.0.0", "development", "user_1")
    const wf2 = {
      ...createDeployWorkflow("persona", "v2.0.0", "development", "user_1"),
      status: "succeeded" as const,
    }
    const history: DeployHistory = { workflows: [wf1, wf2], canaryReleases: [] }
    expect(getActiveDeployments(history)).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// Canary Release
// ═══════════════════════════════════════════════════════════════

describe("System Integration — Canary Release", () => {
  it("should create a canary release starting at 10%", () => {
    const canary = createCanaryRelease("wf_1", 30)
    expect(canary.phase).toBe("10_percent")
    expect(canary.configs["10_percent"]).toBeDefined()
    expect(canary.configs["10_percent"]!.percentage).toBe(10)
  })

  it("should update canary metrics", () => {
    const canary = createCanaryRelease("wf_1")
    const updated = updateCanaryMetrics(canary, {
      errorRatePercent: 1,
      avgResponseTimeMs: 50,
      matchingSatisfactionScore: 80,
    })
    expect(updated.currentMetrics!.errorRatePercent).toBe(1)
  })

  it("should trigger rollback when error rate exceeds threshold", () => {
    let canary = createCanaryRelease("wf_1")
    canary = updateCanaryMetrics(canary, {
      errorRatePercent: 10,
      avgResponseTimeMs: 50,
      matchingSatisfactionScore: 80,
    })
    const evaluation = evaluateCanaryRollback(canary)
    expect(evaluation.shouldRollback).toBe(true)
    expect(evaluation.triggeredReasons.length).toBeGreaterThan(0)
  })

  it("should not trigger rollback for healthy metrics", () => {
    let canary = createCanaryRelease("wf_1")
    canary = updateCanaryMetrics(canary, {
      errorRatePercent: 1,
      avgResponseTimeMs: 50,
      matchingSatisfactionScore: 80,
    })
    const evaluation = evaluateCanaryRollback(canary)
    expect(evaluation.shouldRollback).toBe(false)
  })

  it("should advance canary phase from 10% to 50%", () => {
    let canary = createCanaryRelease("wf_1")
    canary = updateCanaryMetrics(canary, {
      errorRatePercent: 0,
      avgResponseTimeMs: 50,
      matchingSatisfactionScore: 80,
    })
    const advanced = advanceCanaryPhase(canary)
    expect(advanced.phase).toBe("50_percent")
  })

  it("should prevent advance when rollback triggers are active", () => {
    let canary = createCanaryRelease("wf_1")
    canary = updateCanaryMetrics(canary, {
      errorRatePercent: 10,
      avgResponseTimeMs: 50,
      matchingSatisfactionScore: 80,
    })
    expect(() => advanceCanaryPhase(canary)).toThrow("롤백 트리거")
  })

  it("should rollback a canary release", () => {
    const canary = createCanaryRelease("wf_1")
    const rolled = rollbackCanaryRelease(canary, "high error rate")
    expect(rolled.phase).toBe("rolled_back")
    expect(rolled.rollbackReason).toBe("high error rate")
  })

  it("should not rollback completed canary", () => {
    let canary = createCanaryRelease("wf_1")
    // Advance to completion
    canary = updateCanaryMetrics(canary, {
      errorRatePercent: 0,
      avgResponseTimeMs: 50,
      matchingSatisfactionScore: 80,
    })
    canary = advanceCanaryPhase(canary) // 50%
    canary = {
      ...canary,
      configs: {
        ...canary.configs,
        "50_percent": {
          ...canary.configs["50_percent"]!,
          rollbackTriggers: canary.configs["50_percent"]!.rollbackTriggers.map((t) => ({
            ...t,
            triggered: false,
          })),
        },
      },
    }
    canary = advanceCanaryPhase(canary) // 100%
    canary = {
      ...canary,
      configs: {
        ...canary.configs,
        "100_percent": {
          ...canary.configs["100_percent"]!,
          rollbackTriggers: canary.configs["100_percent"]!.rollbackTriggers.map((t) => ({
            ...t,
            triggered: false,
          })),
        },
      },
    }
    canary = advanceCanaryPhase(canary) // completed
    expect(canary.phase).toBe("completed")
    expect(() => rollbackCanaryRelease(canary, "too late")).toThrow()
  })

  it("executeCanaryRelease should return combined result", () => {
    const result = executeCanaryRelease("wf_1", {
      errorRatePercent: 1,
      avgResponseTimeMs: 50,
      matchingSatisfactionScore: 80,
    })
    expect(result.canary).toBeDefined()
    expect(result.shouldRollback).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: Version Management
// ═══════════════════════════════════════════════════════════════

describe("System Integration — Version Management", () => {
  it("should parse valid version strings", () => {
    const v = parseVersion("v1.2.3")
    expect(v).toEqual({ major: 1, minor: 2, patch: 3, build: null })
  })

  it("should parse version with build number", () => {
    const v = parseVersion("v1.0.0-001")
    expect(v).toEqual({ major: 1, minor: 0, patch: 0, build: 1 })
  })

  it("should throw on invalid version format", () => {
    expect(() => parseVersion("invalid")).toThrow()
    expect(() => parseVersion("v1.2")).toThrow()
  })

  it("should format version correctly", () => {
    expect(formatVersion(1, 2, 3)).toBe("v1.2.3")
    expect(formatVersion(1, 0, 0, 1)).toBe("v1.0.0-001")
  })

  it("should bump major version", () => {
    expect(bumpVersion("v1.2.3", "major")).toBe("v2.0.0")
  })

  it("should bump minor version", () => {
    expect(bumpVersion("v1.2.3", "minor")).toBe("v1.3.0")
  })

  it("should bump patch version", () => {
    expect(bumpVersion("v1.2.3", "patch")).toBe("v1.2.4")
  })

  it("should compare versions correctly", () => {
    expect(compareVersions("v1.0.0", "v2.0.0")).toBeLessThan(0)
    expect(compareVersions("v1.1.0", "v1.0.0")).toBeGreaterThan(0)
    expect(compareVersions("v1.0.0", "v1.0.0")).toBe(0)
    expect(compareVersions("v1.0.0-001", "v1.0.0-002")).toBeLessThan(0)
  })

  it("should create a draft version", () => {
    const v = createVersion(
      "matching",
      "v1.0.0",
      "user_1",
      "Initial",
      "First release",
      { threshold: 0.5 },
      { l1: 0.4 }
    )
    expect(v.status).toBe("draft")
    expect(v.category).toBe("matching")
    expect(v.config.threshold).toBe(0.5)
  })

  it("should transition draft → testing", () => {
    const v = makeAlgoVersion("v1.0.0", "draft")
    const testing = setVersionTesting(v)
    expect(testing.status).toBe("testing")
  })

  it("should activate testing version", () => {
    const v = makeAlgoVersion("v1.0.0", "testing")
    const activated = activateVersion(v, [])
    expect(activated.status).toBe("active")
  })

  it("should reject activating draft when requireTestBeforeActivation", () => {
    const v = makeAlgoVersion("v1.0.0", "draft")
    expect(() => activateVersion(v, [])).toThrow("테스트 단계")
  })

  it("should limit max active versions", () => {
    const existing = [makeAlgoVersion("v1.0.0", "active"), makeAlgoVersion("v1.1.0", "active")]
    const v = makeAlgoVersion("v1.2.0", "testing")
    const strictPolicy = {
      ...DEFAULT_VERSION_POLICY,
      rules: { ...DEFAULT_VERSION_POLICY.rules, maxActiveVersions: 2 },
    }
    expect(() => activateVersion(v, existing, strictPolicy)).toThrow("최대 활성 버전 수")
  })

  it("should deprecate an active version", () => {
    const v = makeAlgoVersion("v1.0.0", "active")
    const deprecated = deprecateVersion(v, "obsolete")
    expect(deprecated.status).toBe("deprecated")
    expect(deprecated.changelog).toContain("[Deprecated]")
  })

  it("should deploy version to environment", () => {
    const v = makeAlgoVersion("v1.0.0", "active")
    const deployed = deployVersionToEnvironment(v, "staging")
    expect(deployed.deployedEnvironments).toContain("staging")
    // Idempotent
    const deployed2 = deployVersionToEnvironment(deployed, "staging")
    expect(deployed2.deployedEnvironments.filter((e) => e === "staging")).toHaveLength(1)
  })

  it("should diff two versions", () => {
    const v1 = makeAlgoVersion("v1.0.0")
    const v2 = {
      ...makeAlgoVersion("v2.0.0"),
      config: { threshold: 0.7 },
      weights: { l1: 0.5, l2: 0.35, l3: 0.25, newWeight: 0.1 },
    }
    const diff = diffVersions(v1, v2)
    expect(diff.entries.length).toBeGreaterThan(0)
    expect(diff.summary).toContain("→")
  })

  it("should rollback version", () => {
    const current = { ...makeAlgoVersion("v2.0.0", "active"), parentVersion: "v1.0.0" }
    const target = makeAlgoVersion("v1.0.0", "deprecated")
    const result = rollbackVersion(current, target, "regression", "user_1", ["staging"])
    expect(result.rollback.fromVersion).toBe("v2.0.0")
    expect(result.rollback.toVersion).toBe("v1.0.0")
    expect(result.updatedCurrent.status).toBe("rolled_back")
    expect(result.updatedTarget.status).toBe("active")
  })

  it("should get version history sorted by version descending", () => {
    const versions = [
      makeAlgoVersion("v1.0.0"),
      makeAlgoVersion("v2.0.0"),
      makeAlgoVersion("v1.5.0"),
    ]
    const history = getVersionHistory(versions, "matching")
    expect(history[0].version).toBe("v2.0.0")
    expect(history[1].version).toBe("v1.5.0")
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Event Bus
// ═══════════════════════════════════════════════════════════════

describe("System Integration — Event Bus", () => {
  it("should create an empty event bus", () => {
    const bus = createEventBus(100)
    expect(bus.subscriptions).toHaveLength(0)
    expect(bus.eventLog).toHaveLength(0)
    expect(bus.maxLogEntries).toBe(100)
  })

  it("should subscribe to events", () => {
    let bus = createEventBus()
    bus = subscribe(bus, "sub_1", ["persona.created", "persona.updated"], "http://test.com/hook")
    expect(bus.subscriptions).toHaveLength(1)
    expect(bus.subscriptions[0].active).toBe(true)
  })

  it("should unsubscribe", () => {
    let bus = createEventBus()
    bus = subscribe(bus, "sub_1", ["persona.created"], "http://test.com/hook")
    const subId = bus.subscriptions[0].id
    bus = unsubscribe(bus, subId)
    expect(bus.subscriptions[0].active).toBe(false)
  })

  it("should publish event and log it", () => {
    let bus = createEventBus()
    bus = subscribe(bus, "sub_1", ["persona.created"], "http://test.com")
    const event = createEvent("persona.created", { name: "Test" }, testSource, testMetadata)
    bus = publish(bus, event)
    expect(bus.eventLog).toHaveLength(1)
    expect(bus.eventLog[0].status).toBe("delivered")
    expect(bus.eventLog[0].subscribers).toContain("sub_1")
  })

  it("should mark event as pending when no active subscribers", () => {
    let bus = createEventBus()
    const event = createEvent("persona.created", {}, testSource, testMetadata)
    bus = publish(bus, event)
    expect(bus.eventLog[0].status).toBe("pending")
  })

  it("should mark event as failed and retry", () => {
    let bus = createEventBus()
    const event = createEvent("persona.created", {}, testSource, testMetadata)
    bus = publish(bus, event)
    const eventId = bus.eventLog[0].event.eventId
    bus = markEventFailed(bus, eventId, "network error")
    expect(bus.eventLog[0].status).toBe("failed")
    bus = retryEvent(bus, eventId)
    expect(bus.eventLog[0].status).toBe("retrying")
    expect(bus.eventLog[0].attempts).toBe(2)
  })

  it("should mark event delivered", () => {
    let bus = createEventBus()
    const event = createEvent("persona.created", {}, testSource, testMetadata)
    bus = publish(bus, event)
    const eventId = bus.eventLog[0].event.eventId
    bus = markEventDelivered(bus, eventId)
    expect(bus.eventLog[0].status).toBe("delivered")
  })

  it("should filter event log by type and status", () => {
    let bus = createEventBus()
    bus = subscribe(bus, "sub_1", ["persona.created"], "http://test.com")
    bus = publish(bus, createEvent("persona.created", {}, testSource, testMetadata))
    bus = publish(bus, createEvent("algorithm.deployed", {}, testSource, testMetadata))

    const personaLogs = getEventLog(bus, { eventTypes: ["persona.created"] })
    expect(personaLogs).toHaveLength(1)

    const deliveredLogs = getEventLog(bus, { status: ["delivered"] })
    expect(deliveredLogs).toHaveLength(1)
  })

  it("should get event stats", () => {
    let bus = createEventBus()
    bus = subscribe(bus, "sub_1", ["persona.created"], "http://test.com")
    bus = publish(bus, createEvent("persona.created", {}, testSource, testMetadata))
    bus = publish(bus, createEvent("persona.created", {}, testSource, testMetadata))

    const stats = getEventStats(bus)
    expect(stats.totalEvents).toBe(2)
    expect(stats.byStatus.delivered).toBe(2)
  })

  it("should truncate event log when exceeding maxLogEntries", () => {
    let bus = createEventBus(3)
    for (let i = 0; i < 5; i++) {
      bus = publish(bus, createEvent("persona.created", { i }, testSource, testMetadata))
    }
    expect(bus.eventLog).toHaveLength(3)
  })

  it("should measure sync delay", () => {
    const metric = measureSyncDelay("evt_1", 1000, 4000, SYNC_DELAY_TARGETS[0])
    expect(metric.delayMs).toBe(3000)
    expect(metric.slaMet).toBe(true) // 3000 <= 5000
  })

  it("should generate sync delay report", () => {
    const metrics = [
      measureSyncDelay("evt_1", 1000, 2000, SYNC_DELAY_TARGETS[0]),
      measureSyncDelay("evt_2", 1000, 7000, SYNC_DELAY_TARGETS[0]),
    ]
    const report = generateSyncDelayReport(metrics, "API Engine")
    expect(report.totalEvents).toBe(2)
    expect(report.deliveredEvents).toBe(2)
    expect(report.violations).toHaveLength(1) // evt_2 exceeds SLA
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: API Docs & Changelog
// ═══════════════════════════════════════════════════════════════

describe("System Integration — API Docs", () => {
  it("should create empty API doc spec", () => {
    const spec = createAPIDocSpec("Test API", "v1", "Test", "https://api.test.com")
    expect(spec.endpoints).toHaveLength(0)
    expect(spec.title).toBe("Test API")
  })

  it("should add and update endpoints", () => {
    let spec = createAPIDocSpec("API", "v1", "desc", "url")
    const endpoint = {
      path: "/test",
      method: "GET" as const,
      summary: "Test",
      description: "Test endpoint",
      tags: ["test"],
      parameters: [],
      responses: [],
      deprecated: false,
    }
    spec = addDocEndpoint(spec, endpoint)
    expect(spec.endpoints).toHaveLength(1)

    // Update existing endpoint
    spec = addDocEndpoint(spec, { ...endpoint, summary: "Updated" })
    expect(spec.endpoints).toHaveLength(1)
    expect(spec.endpoints[0].summary).toBe("Updated")
  })

  it("should deprecate an endpoint", () => {
    let spec = createAPIDocSpec("API", "v1", "desc", "url")
    spec = addDocEndpoint(spec, {
      path: "/old",
      method: "GET",
      summary: "Old",
      description: "",
      tags: [],
      parameters: [],
      responses: [],
      deprecated: false,
    })
    spec = deprecateDocEndpoint(spec, "/old", "GET")
    expect(spec.endpoints[0].deprecated).toBe(true)
  })

  it("should generate API docs with persona and matching endpoints", () => {
    const personas = [
      { id: "p1", name: "Cinephile", status: "ACTIVE" },
      { id: "p2", name: "SF Mania", status: "TESTING" },
    ]
    const spec = generateAPIDocs(personas, "v3.0.0", "https://api.deepsight.ai")
    expect(spec.endpoints.length).toBeGreaterThanOrEqual(2)
    const paths = spec.endpoints.map((e) => e.path)
    expect(paths).toContain("/api/v3/personas")
    expect(paths).toContain("/api/v3/matching")
  })
})

describe("System Integration — Changelog", () => {
  it("should create empty changelog", () => {
    const cl = createChangelog()
    expect(cl.entries).toHaveLength(0)
  })

  it("should generate changelog from events", () => {
    const events = [
      createEvent("persona.created", { name: "TestPersona" }, testSource, testMetadata),
      createEvent("algorithm.deployed", { version: "v2" }, testSource, testMetadata),
    ]
    const entry = generateChangelog(events, "v1.1.0")
    expect(entry.changes).toHaveLength(2)
    expect(entry.changes[0].category).toBe("added")
    expect(entry.changes[1].category).toBe("changed")
  })

  it("should format changelog to markdown", () => {
    let cl = createChangelog()
    const entry = generateChangelog(
      [createEvent("persona.activated", { name: "P1" }, testSource, testMetadata)],
      "v1.0.0"
    )
    cl = addChangelogEntry(cl, entry)
    const md = formatChangelogMarkdown(cl)
    expect(md).toContain("# Changelog")
    expect(md).toContain("v1.0.0")
    expect(md).toContain("Added")
  })
})

describe("System Integration — Developer Console Integration", () => {
  it("should create integration with default config", () => {
    const integration = createDeveloperConsoleIntegration()
    expect(integration.connectionStatus).toBe("disconnected")
    expect(integration.usageConfig.enabled).toBe(true)
  })

  it("should fail usage sync when disconnected", () => {
    const integration = createDeveloperConsoleIntegration()
    const result = syncUsageStats(integration, [
      { timestamp: Date.now(), apiCalls: 100, tokenUsage: 5000, costUsd: 0.5, modelBreakdown: {} },
    ])
    expect(result.usageSyncStatus.pendingRecords).toBe(1)
    expect(result.usageSyncStatus.errors.length).toBeGreaterThan(0)
  })

  it("should sync usage when connected", () => {
    let integration = createDeveloperConsoleIntegration()
    integration = updateConnectionStatus(integration, "connected")
    const result = syncUsageStats(integration, [
      { timestamp: Date.now(), apiCalls: 50, tokenUsage: 2000, costUsd: 0.2, modelBreakdown: {} },
    ])
    expect(result.usageSyncStatus.lastSyncSuccess).toBe(true)
    expect(result.usageSyncStatus.totalSynced).toBe(1)
  })

  it("should report health status correctly", () => {
    const integration = createDeveloperConsoleIntegration()
    const health = getIntegrationHealthSummary(integration)
    expect(health.status).toBe("error") // disconnected + no API doc = 2 issues, disconnected alone = error
    expect(health.issues.length).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC5: Test Pipelines
// ═══════════════════════════════════════════════════════════════

describe("System Integration — Test Pipeline", () => {
  it("should create a test scenario with ordered steps", () => {
    const scenario = createTestScenario(
      "Test Scenario",
      "A test",
      "persona",
      "integration",
      "dev_deploy",
      [
        { name: "Step 1", description: "First", action: "do A", expectedResult: "result A" },
        { name: "Step 2", description: "Second", action: "do B", expectedResult: "result B" },
      ],
      ["tag1"]
    )
    expect(scenario.steps).toHaveLength(2)
    expect(scenario.steps[0].order).toBe(1)
    expect(scenario.steps[1].order).toBe(2)
    expect(scenario.status).toBe("draft")
  })

  it("should ready a scenario with steps", () => {
    const scenario = createTestScenario("T", "d", "persona", "unit", "manual", [
      { name: "S1", description: "d", action: "a", expectedResult: "r" },
    ])
    const ready = readyTestScenario(scenario)
    expect(ready.status).toBe("ready")
  })

  it("should reject readying a scenario with no steps", () => {
    const scenario = createTestScenario("T", "d", "persona", "unit", "manual", [])
    expect(() => readyTestScenario(scenario)).toThrow()
  })

  it("should run a test scenario and mark as passed", () => {
    const scenario = createTestScenario("T", "d", "persona", "unit", "manual", [
      { name: "S1", description: "d", action: "a", expectedResult: "r" },
    ])
    const ran = runTestScenario(scenario, [
      { order: 1, passed: true, actualResult: "ok", durationMs: 100 },
    ])
    expect(ran.status).toBe("passed")
    expect(ran.steps[0].status).toBe("passed")
  })

  it("should run a test scenario and mark as failed", () => {
    const scenario = createTestScenario("T", "d", "persona", "unit", "manual", [
      { name: "S1", description: "d", action: "a", expectedResult: "r" },
    ])
    const ran = runTestScenario(scenario, [
      { order: 1, passed: false, actualResult: "fail", durationMs: 50, error: "assertion failed" },
    ])
    expect(ran.status).toBe("failed")
  })

  it("should create and start a test pipeline", () => {
    const scenarios = createPersonaTestScenarios()
    expect(scenarios.length).toBeGreaterThan(0)
    const pipeline = createTestPipeline(
      "Test Run",
      "development",
      scenarios,
      "dev_deploy",
      "user_1"
    )
    expect(pipeline.status).toBe("pending")
    const started = startTestPipeline(pipeline)
    expect(started.status).toBe("running")
    expect(started.startedAt).toBeGreaterThan(0)
  })

  it("should generate test report from completed pipeline", () => {
    const scenario = createTestScenario("T", "d", "persona", "unit", "manual", [
      { name: "S", description: "d", action: "a", expectedResult: "r" },
    ])
    let pipeline = createTestPipeline("Run", "development", [scenario], "manual", "user_1")
    pipeline = startTestPipeline(pipeline)
    const ran = runTestScenario(pipeline.scenarios[0], [
      { order: 1, passed: true, actualResult: "ok", durationMs: 50 },
    ])
    pipeline = updatePipelineScenario(pipeline, pipeline.scenarios[0].id, ran)
    expect(pipeline.status).toBe("passed")

    const report = generateTestReport(pipeline)
    expect(report.summary.passed).toBe(1)
    expect(report.summary.failed).toBe(0)
    expect(report.summary.passRate).toBe(100)
  })

  it("should cancel a running pipeline", () => {
    const scenario = createTestScenario("T", "d", "persona", "unit", "manual", [
      { name: "S", description: "d", action: "a", expectedResult: "r" },
    ])
    let pipeline = createTestPipeline("Run", "development", [scenario], "manual", "user_1")
    pipeline = startTestPipeline(pipeline)
    const cancelled = cancelTestPipeline(pipeline)
    expect(cancelled.status).toBe("cancelled")
  })

  it("should create predefined test scenario sets", () => {
    expect(createPersonaTestScenarios().length).toBeGreaterThan(0)
    expect(createAlgorithmTestScenarios().length).toBeGreaterThan(0)
    expect(createIntegrationTestScenarios().length).toBeGreaterThan(0)
  })

  it("should format test report as markdown", () => {
    const scenario = createTestScenario("T", "d", "persona", "unit", "manual", [
      { name: "S", description: "d", action: "a", expectedResult: "r" },
    ])
    let pipeline = createTestPipeline("Run", "staging", [scenario], "manual", "user_1")
    pipeline = startTestPipeline(pipeline)
    const ran = runTestScenario(pipeline.scenarios[0], [
      { order: 1, passed: true, actualResult: "ok", durationMs: 10 },
    ])
    pipeline = updatePipelineScenario(pipeline, pipeline.scenarios[0].id, ran)
    const report = generateTestReport(pipeline)
    const md = formatTestReportMarkdown(report)
    expect(md).toContain("# 통합 테스트 리포트")
    expect(md).toContain("staging")
  })
})
