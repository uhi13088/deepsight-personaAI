// ═══════════════════════════════════════════════════════════════
// Global Config UI — Page Integration Tests
// T100: Model Settings + Safety Filters + API Endpoints UI 로직 검증
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

import {
  // AC1: Model Config
  createModelConfig,
  resolveModel,
  estimateCost,
  recordSpend,
  getBudgetStatus,
  DEFAULT_MODELS,
  DEFAULT_ROUTING_RULES,

  // AC2: Safety Filter
  createSafetyFilter,
  evaluateFilter,
  addForbiddenWord,
  removeForbiddenWord,
  getFilterLogSummary,
  DEFAULT_FORBIDDEN_WORDS,

  // AC3: API Endpoint Management
  createAPIEndpointManager,
  registerEndpoint,
  updateEndpointStatus,
  updateRateLimit,
  recordHealthCheck,
  getDeprecatedEndpoints,
  getHealthSummary,
  DEFAULT_RATE_LIMITS,
  DEFAULT_HEALTH_CHECK,
  DEFAULT_API_VERSIONS,

  // Cost Dashboard
  createCostDashboard,
  recordCostEntry,
  aggregateCosts,

  // Config Validation
  createGlobalConfig,
  validateConfig,
  suggestOptimizations,
} from "@/lib/global-config"

import type {
  MonthlyBudget,
  ForbiddenWord,
  APIEndpoint,
  APIEndpointManager,
  SupportedModel,
} from "@/lib/global-config"

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function makeEndpoint(overrides?: Partial<Omit<APIEndpoint, "id">>): Omit<APIEndpoint, "id"> {
  return {
    name: overrides?.name ?? "Test Endpoint",
    path: overrides?.path ?? "/api/test",
    method: overrides?.method ?? "GET",
    scope: overrides?.scope ?? "internal",
    version: overrides?.version ?? "v2",
    status: overrides?.status ?? "active",
    description: overrides?.description ?? "A test endpoint",
    rateLimit: overrides?.rateLimit ?? { ...DEFAULT_RATE_LIMITS.internal },
    healthCheck: overrides?.healthCheck ?? { ...DEFAULT_HEALTH_CHECK },
    tags: overrides?.tags ?? ["test"],
  }
}

function makeBudget(overrides?: Partial<MonthlyBudget>): MonthlyBudget {
  const now = Date.now()
  return {
    limitUsd: overrides?.limitUsd ?? 500,
    currentSpendUsd: overrides?.currentSpendUsd ?? 0,
    periodStart: overrides?.periodStart ?? now,
    periodEnd: overrides?.periodEnd ?? now + 30 * 24 * 60 * 60 * 1000,
    alertThresholds: overrides?.alertThresholds ?? [
      { percent: 80, notified: false, notifiedAt: null },
      { percent: 90, notified: false, notifiedAt: null },
      { percent: 100, notified: false, notifiedAt: null },
    ],
  }
}

function registerAndGetId(
  manager: APIEndpointManager,
  ep: Omit<APIEndpoint, "id">
): { manager: APIEndpointManager; id: string } {
  const updated = registerEndpoint(manager, ep)
  const added = updated.endpoints[updated.endpoints.length - 1]
  return { manager: updated, id: added.id }
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC1: Model Settings Page — Model Config Logic                ║
// ╚═══════════════════════════════════════════════════════════════╝

describe("AC1: Model Settings Page Logic", () => {
  describe("Model config creation and initialization", () => {
    it("creates model config with default 4 models", () => {
      const config = createModelConfig()
      expect(config.models).toHaveLength(4)
      expect(config.models.map((m) => m.id)).toEqual([
        "claude-sonnet",
        "claude-haiku",
        "claude-opus",
        "gpt-4o",
      ])
    })

    it("each model has displayName, provider, cost, and maxContextTokens", () => {
      const config = createModelConfig()
      for (const model of config.models) {
        expect(model.displayName).toBeTruthy()
        expect(["anthropic", "openai"]).toContain(model.provider)
        expect(model.costPer1kInputTokens).toBeGreaterThan(0)
        expect(model.costPer1kOutputTokens).toBeGreaterThan(0)
        expect(model.maxContextTokens).toBeGreaterThan(0)
      }
    })

    it("claude-opus is disabled by default", () => {
      const config = createModelConfig()
      const opus = config.models.find((m) => m.id === "claude-opus")
      expect(opus?.enabled).toBe(false)
    })
  })

  describe("Model resolution by task type", () => {
    it("resolves generation to claude-sonnet (quality_first strategy)", () => {
      const config = createModelConfig()
      const model = resolveModel(config, "generation")
      expect(model.id).toBe("claude-sonnet")
    })

    it("resolves matching to claude-haiku (cost_optimized strategy)", () => {
      const config = createModelConfig()
      const model = resolveModel(config, "matching")
      expect(model.id).toBe("claude-haiku")
    })

    it("resolves validation to claude-haiku (balanced strategy)", () => {
      const config = createModelConfig()
      const model = resolveModel(config, "validation")
      expect(model.id).toBe("claude-haiku")
    })

    it("uses fallback when primary is disabled", () => {
      const models = DEFAULT_MODELS.map((m) =>
        m.id === "claude-haiku" ? { ...m, enabled: false } : { ...m }
      )
      const config = createModelConfig({ models })
      const model = resolveModel(config, "matching")
      // matching fallback is claude-sonnet
      expect(model.id).toBe("claude-sonnet")
    })
  })

  describe("Cost estimation", () => {
    it("calculates cost for claude-sonnet correctly", () => {
      const sonnet = DEFAULT_MODELS.find((m) => m.id === "claude-sonnet")!
      const cost = estimateCost(sonnet, 1000, 1000)
      // (1000/1000)*0.003 + (1000/1000)*0.015 = 0.018
      expect(cost).toBeCloseTo(0.018, 6)
    })

    it("calculates cost for claude-haiku as cheaper than sonnet", () => {
      const sonnet = DEFAULT_MODELS.find((m) => m.id === "claude-sonnet")!
      const haiku = DEFAULT_MODELS.find((m) => m.id === "claude-haiku")!
      const sonnetCost = estimateCost(sonnet, 1000, 1000)
      const haikuCost = estimateCost(haiku, 1000, 1000)
      expect(haikuCost).toBeLessThan(sonnetCost)
    })

    it("returns 0 for zero tokens", () => {
      const sonnet = DEFAULT_MODELS.find((m) => m.id === "claude-sonnet")!
      expect(estimateCost(sonnet, 0, 0)).toBe(0)
    })
  })

  describe("Budget recording and status", () => {
    it("recordSpend updates currentSpendUsd immutably", () => {
      const budget = makeBudget({ limitUsd: 500 })
      const updated = recordSpend(budget, 100)
      expect(updated.currentSpendUsd).toBe(100)
      expect(budget.currentSpendUsd).toBe(0) // original unchanged
    })

    it("getBudgetStatus returns correct usage percent", () => {
      const budget = makeBudget({ limitUsd: 500, currentSpendUsd: 127.5 })
      const status = getBudgetStatus(budget)
      expect(status.usagePercent).toBe(25.5)
      expect(status.remainingUsd).toBe(372.5)
      expect(status.exceeded).toBe(false)
    })

    it("budget exceeded detection works", () => {
      const budget = makeBudget({ limitUsd: 100, currentSpendUsd: 150 })
      const status = getBudgetStatus(budget)
      expect(status.exceeded).toBe(true)
      expect(status.remainingUsd).toBe(0)
    })

    it("alert thresholds trigger at 80%, 90%, 100%", () => {
      const budget = makeBudget({ limitUsd: 100 })
      const after85 = recordSpend(budget, 85)
      expect(after85.alertThresholds[0].notified).toBe(true) // 80%
      expect(after85.alertThresholds[1].notified).toBe(false) // 90%

      const after95 = recordSpend(after85, 10)
      expect(after95.alertThresholds[1].notified).toBe(true) // 90%

      const after100 = recordSpend(after95, 5)
      expect(after100.alertThresholds[2].notified).toBe(true) // 100%
    })

    it("triggeredAlerts list from getBudgetStatus is accurate", () => {
      const budget = makeBudget({ limitUsd: 100 })
      const afterSpend = recordSpend(budget, 95)
      const status = getBudgetStatus(afterSpend)
      expect(status.triggeredAlerts).toContain(80)
      expect(status.triggeredAlerts).toContain(90)
      expect(status.triggeredAlerts).not.toContain(100)
    })

    it("handles zero budget limit without division error", () => {
      const budget = makeBudget({ limitUsd: 0, currentSpendUsd: 0 })
      const status = getBudgetStatus(budget)
      expect(status.usagePercent).toBe(0)
    })
  })

  describe("Routing rules display", () => {
    it("default routing rules cover all 3 task types", () => {
      const config = createModelConfig()
      const taskTypes = config.routingRules.map((r) => r.taskType)
      expect(taskTypes).toContain("generation")
      expect(taskTypes).toContain("matching")
      expect(taskTypes).toContain("validation")
    })

    it("each routing rule has primary model, fallback, and strategy", () => {
      const config = createModelConfig()
      for (const rule of config.routingRules) {
        expect(rule.primaryModel).toBeTruthy()
        expect(["cost_optimized", "quality_first", "balanced"]).toContain(rule.strategy)
        expect(rule.maxRetries).toBeGreaterThanOrEqual(0)
        expect(rule.timeoutMs).toBeGreaterThan(0)
      }
    })
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC2: Safety Filters Page — Filter Logic                      ║
// ╚═══════════════════════════════════════════════════════════════╝

describe("AC2: Safety Filters Page Logic", () => {
  describe("Safety filter creation", () => {
    it("creates filter with moderate level by default", () => {
      const filter = createSafetyFilter()
      expect(filter.config.level).toBe("moderate")
      expect(filter.config.enableLogging).toBe(true)
    })

    it("initializes with 8 default forbidden words", () => {
      const filter = createSafetyFilter()
      expect(filter.config.forbiddenWords).toHaveLength(DEFAULT_FORBIDDEN_WORDS.length)
      expect(filter.config.forbiddenWords.length).toBe(8)
    })
  })

  describe("Forbidden word add/remove", () => {
    it("adds a new forbidden word successfully", () => {
      const filter = createSafetyFilter({ forbiddenWords: [] })
      const word: ForbiddenWord = {
        word: "테스트",
        category: "test",
        severity: "medium",
        exactMatch: false,
      }
      const updated = addForbiddenWord(filter, word)
      expect(updated.config.forbiddenWords).toHaveLength(1)
      expect(updated.config.forbiddenWords[0].word).toBe("테스트")
    })

    it("throws on duplicate word+category", () => {
      const filter = createSafetyFilter()
      const duplicate: ForbiddenWord = {
        word: "폭력",
        category: "violence",
        severity: "high",
        exactMatch: true,
      }
      expect(() => addForbiddenWord(filter, duplicate)).toThrow()
    })

    it("removes an existing forbidden word", () => {
      const filter = createSafetyFilter()
      const before = filter.config.forbiddenWords.length
      const updated = removeForbiddenWord(filter, "폭력", "violence")
      expect(updated.config.forbiddenWords).toHaveLength(before - 1)
    })

    it("throws when removing non-existent word", () => {
      const filter = createSafetyFilter()
      expect(() => removeForbiddenWord(filter, "없는단어", "none")).toThrow()
    })
  })

  describe("Filter evaluation (block/warn/flag/pass)", () => {
    it("blocks critical words on all levels", () => {
      for (const level of ["strict", "moderate", "permissive"] as const) {
        const filter = createSafetyFilter({ level })
        const { result } = evaluateFilter(filter, "폭력적인 내용")
        expect(result.action).toBe("block")
        expect(result.passed).toBe(false)
      }
    })

    it("passes clean text with no matches", () => {
      const filter = createSafetyFilter()
      const { result } = evaluateFilter(filter, "좋은 하루 되세요")
      expect(result.action).toBe("pass")
      expect(result.passed).toBe(true)
      expect(result.matchedWords).toHaveLength(0)
    })

    it("moderate warns on high severity (차별)", () => {
      const filter = createSafetyFilter({ level: "moderate" })
      const { result } = evaluateFilter(filter, "차별 발언")
      expect(result.action).toBe("warn")
    })

    it("permissive flags on high severity", () => {
      const filter = createSafetyFilter({ level: "permissive" })
      const { result } = evaluateFilter(filter, "차별 발언")
      expect(result.action).toBe("flag")
      expect(result.passed).toBe(true)
    })

    it("strict blocks on high severity", () => {
      const filter = createSafetyFilter({ level: "strict" })
      const { result } = evaluateFilter(filter, "혐오 표현")
      expect(result.action).toBe("block")
    })

    it("creates log entry when logging is enabled", () => {
      const filter = createSafetyFilter({ enableLogging: true })
      const { result, updatedFilter } = evaluateFilter(filter, "테스트 입력")
      expect(result.logEntry).not.toBeNull()
      expect(updatedFilter.logs).toHaveLength(1)
    })

    it("does not create log when logging is disabled", () => {
      const filter = createSafetyFilter({ enableLogging: false })
      const { result, updatedFilter } = evaluateFilter(filter, "테스트 입력")
      expect(result.logEntry).toBeNull()
      expect(updatedFilter.logs).toHaveLength(0)
    })
  })

  describe("Filter log summary", () => {
    it("returns correct action counts after multiple evaluations", () => {
      let filter = createSafetyFilter({ level: "strict" })
      ;({ updatedFilter: filter } = evaluateFilter(filter, "안녕하세요")) // pass
      ;({ updatedFilter: filter } = evaluateFilter(filter, "폭력적인")) // block
      ;({ updatedFilter: filter } = evaluateFilter(filter, "도박 관련")) // warn (medium, strict)

      const summary = getFilterLogSummary(filter)
      expect(summary.totalEntries).toBe(3)
      expect(summary.byAction.pass).toBe(1)
      expect(summary.byAction.block).toBe(1)
      expect(summary.byAction.warn).toBe(1)
    })

    it("returns empty summary for fresh filter", () => {
      const filter = createSafetyFilter()
      const summary = getFilterLogSummary(filter)
      expect(summary.totalEntries).toBe(0)
      expect(summary.recentBlocks).toEqual([])
    })

    it("caps recent blocks at 10", () => {
      let filter = createSafetyFilter({ level: "moderate" })
      for (let i = 0; i < 15; i++) {
        ;({ updatedFilter: filter } = evaluateFilter(filter, "폭력 콘텐츠"))
      }
      const summary = getFilterLogSummary(filter)
      expect(summary.recentBlocks).toHaveLength(10)
    })
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC3: API Endpoints Page — Endpoint Manager Logic             ║
// ╚═══════════════════════════════════════════════════════════════╝

describe("AC3: API Endpoints Page Logic", () => {
  describe("API endpoint manager creation", () => {
    it("starts with empty endpoints and default versions", () => {
      const manager = createAPIEndpointManager()
      expect(manager.endpoints).toEqual([])
      expect(manager.versions).toHaveLength(DEFAULT_API_VERSIONS.length)
      expect(manager.healthResults.size).toBe(0)
    })
  })

  describe("Endpoint registration", () => {
    it("registers endpoint with auto-generated id", () => {
      const manager = createAPIEndpointManager()
      const updated = registerEndpoint(manager, makeEndpoint())
      expect(updated.endpoints).toHaveLength(1)
      expect(updated.endpoints[0].id).toMatch(/^ep_/)
    })

    it("throws on duplicate path+method+version", () => {
      const manager = createAPIEndpointManager()
      const ep = makeEndpoint({ path: "/api/v2/users", method: "GET", version: "v2" })
      const updated = registerEndpoint(manager, ep)
      expect(() =>
        registerEndpoint(
          updated,
          makeEndpoint({ path: "/api/v2/users", method: "GET", version: "v2" })
        )
      ).toThrow()
    })

    it("allows same path on different versions", () => {
      let manager = createAPIEndpointManager()
      manager = registerEndpoint(manager, makeEndpoint({ path: "/api/users", version: "v2" }))
      manager = registerEndpoint(manager, makeEndpoint({ path: "/api/users", version: "v3" }))
      expect(manager.endpoints).toHaveLength(2)
    })
  })

  describe("Endpoint status update", () => {
    it("changes status from active to deprecated", () => {
      const manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint())
      const updated = updateEndpointStatus(m, id, "deprecated")
      expect(updated.endpoints[0].status).toBe("deprecated")
    })

    it("throws for nonexistent endpoint", () => {
      const manager = createAPIEndpointManager()
      expect(() => updateEndpointStatus(manager, "fake_id", "disabled")).toThrow()
    })
  })

  describe("Rate limit update", () => {
    it("partially updates rate limit config", () => {
      const manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint())
      const updated = updateRateLimit(m, id, { requestsPerMinute: 1200 })
      expect(updated.endpoints[0].rateLimit.requestsPerMinute).toBe(1200)
      // unchanged fields remain
      expect(updated.endpoints[0].rateLimit.burstLimit).toBe(
        DEFAULT_RATE_LIMITS.internal.burstLimit
      )
    })
  })

  describe("Health check recording", () => {
    it("records healthy status for successful fast response", () => {
      const manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint())
      const updated = recordHealthCheck(m, id, 100, true)
      const result = updated.healthResults.get(id)
      expect(result?.status).toBe("healthy")
      expect(result?.consecutiveFailures).toBe(0)
    })

    it("records degraded status for single failure", () => {
      const manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint())
      const updated = recordHealthCheck(m, id, 0, false, "timeout")
      expect(updated.healthResults.get(id)?.status).toBe("degraded")
    })

    it("records down after reaching unhealthy threshold", () => {
      const manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint())
      let current = m
      for (let i = 0; i < 3; i++) {
        current = recordHealthCheck(current, id, 0, false)
      }
      expect(current.healthResults.get(id)?.status).toBe("down")
      expect(current.healthResults.get(id)?.consecutiveFailures).toBe(3)
    })

    it("resets failures on success after failures", () => {
      const manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint())
      let current = recordHealthCheck(m, id, 0, false)
      current = recordHealthCheck(current, id, 0, false)
      current = recordHealthCheck(current, id, 100, true)
      expect(current.healthResults.get(id)?.consecutiveFailures).toBe(0)
      expect(current.healthResults.get(id)?.status).toBe("healthy")
    })
  })

  describe("Health summary", () => {
    it("counts endpoints by health status", () => {
      let manager = createAPIEndpointManager()
      const { manager: m1, id: id1 } = registerAndGetId(manager, makeEndpoint({ path: "/a" }))
      const { manager: m2, id: id2 } = registerAndGetId(m1, makeEndpoint({ path: "/b" }))
      const { manager: m3 } = registerAndGetId(m2, makeEndpoint({ path: "/c" }))

      let current = recordHealthCheck(m3, id1, 100, true) // healthy
      current = recordHealthCheck(current, id2, 0, false) // degraded
      // /c = unknown (no health check)

      const summary = getHealthSummary(current)
      expect(summary.total).toBe(3)
      expect(summary.healthy).toBe(1)
      expect(summary.degraded).toBe(1)
      expect(summary.unknown).toBe(1)
    })

    it("reports all unknown when no health checks recorded", () => {
      let manager = createAPIEndpointManager()
      manager = registerEndpoint(manager, makeEndpoint({ path: "/a" }))
      manager = registerEndpoint(manager, makeEndpoint({ path: "/b" }))
      const summary = getHealthSummary(manager)
      expect(summary.total).toBe(2)
      expect(summary.unknown).toBe(2)
    })

    it("all endpoints down case", () => {
      let manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint({ path: "/a" }))
      let current = m
      for (let i = 0; i < 3; i++) {
        current = recordHealthCheck(current, id, 0, false)
      }
      const summary = getHealthSummary(current)
      expect(summary.down).toBe(1)
      expect(summary.healthy).toBe(0)
    })
  })

  describe("Deprecated endpoints listing", () => {
    it("finds endpoints on deprecated versions", () => {
      let manager = createAPIEndpointManager()
      manager = registerEndpoint(
        manager,
        makeEndpoint({ path: "/legacy", version: "v1", status: "active" })
      )
      const deprecated = getDeprecatedEndpoints(manager)
      expect(deprecated).toHaveLength(1)
      expect(deprecated[0].path).toBe("/legacy")
    })

    it("finds endpoints with deprecated status", () => {
      let manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(
        manager,
        makeEndpoint({ path: "/old", version: "v2" })
      )
      const updated = updateEndpointStatus(m, id, "deprecated")
      const deprecated = getDeprecatedEndpoints(updated)
      expect(deprecated.some((e) => e.id === id)).toBe(true)
    })
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║ Cost Dashboard                                               ║
// ╚═══════════════════════════════════════════════════════════════╝

describe("Cost Dashboard Logic", () => {
  const sonnet = DEFAULT_MODELS.find((m) => m.id === "claude-sonnet")!
  const haiku = DEFAULT_MODELS.find((m) => m.id === "claude-haiku")!

  it("creates dashboard with empty entries", () => {
    const budget = makeBudget()
    const dashboard = createCostDashboard(budget)
    expect(dashboard.entries).toEqual([])
    expect(dashboard.alerts).toEqual([])
  })

  it("records cost entry and updates budget", () => {
    const budget = makeBudget({ limitUsd: 1000 })
    const dashboard = createCostDashboard(budget)
    const updated = recordCostEntry(dashboard, "claude-sonnet", "generation", 1000, 500, sonnet)
    expect(updated.entries).toHaveLength(1)
    expect(updated.budget.currentSpendUsd).toBeGreaterThan(0)
  })

  it("aggregates costs by daily period", () => {
    const budget = makeBudget({ limitUsd: 10000 })
    let dashboard = createCostDashboard(budget)
    dashboard = recordCostEntry(dashboard, "claude-sonnet", "generation", 2000, 1000, sonnet)
    dashboard = recordCostEntry(dashboard, "claude-haiku", "matching", 5000, 2000, haiku)

    const agg = aggregateCosts(dashboard, "daily")
    expect(agg.requestCount).toBe(2)
    expect(agg.totalCostUsd).toBeGreaterThan(0)
    expect(agg.totalInputTokens).toBe(7000)
  })

  it("returns zero counts when no entries in period", () => {
    const budget = makeBudget()
    const dashboard = createCostDashboard(budget)
    const agg = aggregateCosts(dashboard, "daily", new Date("2099-01-01").getTime())
    expect(agg.requestCount).toBe(0)
    expect(agg.totalCostUsd).toBe(0)
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║ Config Validation & Optimization                             ║
// ╚═══════════════════════════════════════════════════════════════╝

describe("Config Validation & Optimization", () => {
  it("valid default config has no errors", () => {
    const config = createGlobalConfig()
    const result = validateConfig(config)
    expect(result.valid).toBe(true)
    const errors = result.issues.filter((i) => i.severity === "error")
    expect(errors).toHaveLength(0)
  })

  it("detects disabled default model as error", () => {
    const models = DEFAULT_MODELS.map((m) =>
      m.id === "claude-sonnet" ? { ...m, enabled: false } : { ...m }
    )
    const config = createGlobalConfig({ modelConfig: { models } })
    const result = validateConfig(config)
    expect(result.issues.some((i) => i.code === "MODEL_DEFAULT_DISABLED")).toBe(true)
  })

  it("well-configured setup returns no optimization suggestions", () => {
    const config = createGlobalConfig()
    const suggestions = suggestOptimizations(config)
    expect(suggestions).toHaveLength(0)
  })

  it("suggests cost optimization for expensive matching model", () => {
    const routingRules = DEFAULT_ROUTING_RULES.map((r) =>
      r.taskType === "matching" ? { ...r, primaryModel: "claude-opus" as SupportedModel } : { ...r }
    )
    const models = DEFAULT_MODELS.map((m) =>
      m.id === "claude-opus" ? { ...m, enabled: true } : { ...m }
    )
    const config = createGlobalConfig({ modelConfig: { routingRules, models } })
    const suggestions = suggestOptimizations(config)
    const costSuggestion = suggestions.find((s) => s.category === "cost" && s.priority === "high")
    expect(costSuggestion).toBeDefined()
  })

  describe("Edge cases", () => {
    it("empty config — no models enabled", () => {
      const models = DEFAULT_MODELS.map((m) => ({ ...m, enabled: false }))
      const config = createGlobalConfig({ modelConfig: { models } })
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.issues.some((i) => i.code === "MODEL_NONE_ENABLED")).toBe(true)
    })

    it("budget exceeded detection", () => {
      const config = createGlobalConfig()
      const now = Date.now()
      config.costDashboard.budget = {
        limitUsd: 100,
        currentSpendUsd: 150,
        periodStart: now,
        periodEnd: now + 30 * 24 * 60 * 60 * 1000,
        alertThresholds: [
          { percent: 80, notified: true, notifiedAt: now },
          { percent: 90, notified: true, notifiedAt: now },
          { percent: 100, notified: true, notifiedAt: now },
        ],
      }
      const result = validateConfig(config)
      expect(result.valid).toBe(false)
      expect(result.issues.some((i) => i.code === "COST_BUDGET_EXCEEDED")).toBe(true)
    })

    it("all endpoints down triggers error issues", () => {
      const config = createGlobalConfig()
      const { manager: m, id } = registerAndGetId(
        config.apiManager,
        makeEndpoint({ path: "/down-ep" })
      )
      let current = m
      for (let i = 0; i < 3; i++) {
        current = recordHealthCheck(current, id, 0, false)
      }
      config.apiManager = current
      const result = validateConfig(config)
      expect(result.issues.some((i) => i.code === "API_ENDPOINT_DOWN")).toBe(true)
    })
  })
})
