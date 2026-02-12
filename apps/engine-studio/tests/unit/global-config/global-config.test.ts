// ═══════════════════════════════════════════════════════════════
// Global Config Tests — T68
// AC1: Model Config, AC2: Safety Filter, AC3: API Endpoint,
// Cost Dashboard, Config Validation
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
  getEndpointsByVersion,
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
  ModelConfig,
  ModelSpec,
  MonthlyBudget,
  SafetyFilter,
  ForbiddenWord,
  APIEndpoint,
  APIEndpointManager,
  GlobalConfig,
  SupportedModel,
  TaskType,
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

/** Register an endpoint and return the manager + assigned ID */
function registerAndGetId(
  manager: APIEndpointManager,
  ep: Omit<APIEndpoint, "id">
): { manager: APIEndpointManager; id: string } {
  const updated = registerEndpoint(manager, ep)
  const added = updated.endpoints[updated.endpoints.length - 1]
  return { manager: updated, id: added.id }
}

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC1: Model Config                                            ║
// ╚═══════════════════════════════════════════════════════════════╝

describe("AC1: Model Config", () => {
  // ── createModelConfig ──────────────────────────────────────

  describe("createModelConfig", () => {
    it("returns default values when no overrides provided", () => {
      const config = createModelConfig()

      expect(config.defaultModel).toBe("claude-sonnet")
      expect(config.models).toHaveLength(DEFAULT_MODELS.length)
      expect(config.routingRules).toHaveLength(DEFAULT_ROUTING_RULES.length)
      expect(config.budget.limitUsd).toBe(500)
      expect(config.budget.currentSpendUsd).toBe(0)
      expect(config.budget.alertThresholds).toHaveLength(3)
      expect(config.budget.alertThresholds.map((t) => t.percent)).toEqual([80, 90, 100])
    })

    it("accepts partial overrides", () => {
      const config = createModelConfig({ defaultModel: "gpt-4o" })

      expect(config.defaultModel).toBe("gpt-4o")
      // other fields remain default
      expect(config.models).toHaveLength(DEFAULT_MODELS.length)
    })
  })

  // ── resolveModel ───────────────────────────────────────────

  describe("resolveModel", () => {
    it("finds the primary model for a task type", () => {
      const config = createModelConfig()
      const model = resolveModel(config, "generation")

      // generation's primary is claude-sonnet (enabled)
      expect(model.id).toBe("claude-sonnet")
    })

    it("falls to fallback when primary is disabled", () => {
      const models = DEFAULT_MODELS.map((m) =>
        m.id === "claude-sonnet" ? { ...m, enabled: false } : { ...m }
      )
      const config = createModelConfig({ models })
      const model = resolveModel(config, "generation")

      // generation fallback is gpt-4o
      expect(model.id).toBe("gpt-4o")
    })

    it("throws when no model is available (primary and fallback disabled)", () => {
      const models = DEFAULT_MODELS.map((m) =>
        m.id === "claude-sonnet" || m.id === "gpt-4o" ? { ...m, enabled: false } : { ...m }
      )
      const config = createModelConfig({ models })

      expect(() => resolveModel(config, "generation")).toThrow()
    })

    it("returns default model when no routing rule exists for task type", () => {
      const config = createModelConfig({ routingRules: [] })
      const model = resolveModel(config, "generation")

      expect(model.id).toBe("claude-sonnet")
    })
  })

  // ── estimateCost ───────────────────────────────────────────

  describe("estimateCost", () => {
    it("calculates cost correctly", () => {
      const sonnet = DEFAULT_MODELS.find((m) => m.id === "claude-sonnet")!
      // 1000 input tokens + 500 output tokens
      const cost = estimateCost(sonnet, 1000, 500)

      // (1000/1000)*0.003 + (500/1000)*0.015 = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 6)
    })

    it("returns 0 for zero tokens", () => {
      const sonnet = DEFAULT_MODELS.find((m) => m.id === "claude-sonnet")!
      expect(estimateCost(sonnet, 0, 0)).toBe(0)
    })
  })

  // ── recordSpend ────────────────────────────────────────────

  describe("recordSpend", () => {
    it("updates currentSpendUsd immutably", () => {
      const budget = makeBudget()
      const updated = recordSpend(budget, 100)

      expect(updated.currentSpendUsd).toBe(100)
      expect(budget.currentSpendUsd).toBe(0) // original unchanged
    })

    it("triggers alert thresholds when spend crosses them", () => {
      const budget = makeBudget({ limitUsd: 100 })

      // Spend $85 => crosses 80%
      const after85 = recordSpend(budget, 85)
      expect(after85.alertThresholds[0].notified).toBe(true) // 80%
      expect(after85.alertThresholds[0].notifiedAt).not.toBeNull()
      expect(after85.alertThresholds[1].notified).toBe(false) // 90% not yet
      expect(after85.alertThresholds[2].notified).toBe(false) // 100% not yet

      // Spend another $10 => total 95, crosses 90%
      const after95 = recordSpend(after85, 10)
      expect(after95.alertThresholds[1].notified).toBe(true) // 90%
      expect(after95.alertThresholds[2].notified).toBe(false) // 100% not yet

      // Spend another $5 => total 100, crosses 100%
      const after100 = recordSpend(after95, 5)
      expect(after100.alertThresholds[2].notified).toBe(true) // 100%
    })

    it("does not re-trigger already notified thresholds", () => {
      const budget = makeBudget({ limitUsd: 100 })
      const after85 = recordSpend(budget, 85)
      const firstNotifiedAt = after85.alertThresholds[0].notifiedAt

      // Spend more but stay above 80%
      const after90 = recordSpend(after85, 5)
      expect(after90.alertThresholds[0].notifiedAt).toBe(firstNotifiedAt)
    })
  })

  // ── getBudgetStatus ────────────────────────────────────────

  describe("getBudgetStatus", () => {
    it("returns correct usage percent and remaining", () => {
      const budget = makeBudget({ limitUsd: 200, currentSpendUsd: 50 })
      const status = getBudgetStatus(budget)

      expect(status.usagePercent).toBe(25)
      expect(status.remainingUsd).toBe(150)
      expect(status.exceeded).toBe(false)
    })

    it("shows exceeded when spend >= limit", () => {
      const budget = makeBudget({ limitUsd: 100, currentSpendUsd: 100 })
      const status = getBudgetStatus(budget)

      expect(status.exceeded).toBe(true)
      expect(status.remainingUsd).toBe(0)
    })

    it("returns triggered alerts", () => {
      const budget = makeBudget({
        limitUsd: 100,
        alertThresholds: [
          { percent: 80, notified: true, notifiedAt: Date.now() },
          { percent: 90, notified: true, notifiedAt: Date.now() },
          { percent: 100, notified: false, notifiedAt: null },
        ],
      })
      const status = getBudgetStatus(budget)

      expect(status.triggeredAlerts).toEqual([80, 90])
    })

    it("handles zero budget limit without division error", () => {
      const budget = makeBudget({ limitUsd: 0, currentSpendUsd: 0 })
      const status = getBudgetStatus(budget)

      expect(status.usagePercent).toBe(0)
    })
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC2: Safety Filter                                           ║
// ╚═══════════════════════════════════════════════════════════════╝

describe("AC2: Safety Filter", () => {
  // ── createSafetyFilter ─────────────────────────────────────

  describe("createSafetyFilter", () => {
    it("returns default values", () => {
      const filter = createSafetyFilter()

      expect(filter.config.level).toBe("moderate")
      expect(filter.config.forbiddenWords).toHaveLength(DEFAULT_FORBIDDEN_WORDS.length)
      expect(filter.config.maxLogEntries).toBe(10_000)
      expect(filter.config.enableLogging).toBe(true)
      expect(filter.logs).toEqual([])
    })

    it("accepts partial overrides", () => {
      const filter = createSafetyFilter({ level: "strict" })

      expect(filter.config.level).toBe("strict")
      // rest remains default
      expect(filter.config.maxLogEntries).toBe(10_000)
    })
  })

  // ── evaluateFilter ─────────────────────────────────────────

  describe("evaluateFilter", () => {
    it("blocks critical words on all filter levels", () => {
      const levels = ["strict", "moderate", "permissive"] as const
      for (const level of levels) {
        const filter = createSafetyFilter({ level })
        // "폭력" is critical severity
        const { result } = evaluateFilter(filter, "폭력적인 내용")

        expect(result.action).toBe("block")
        expect(result.passed).toBe(false)
      }
    })

    it("passes when no forbidden word matches", () => {
      const filter = createSafetyFilter()
      const { result } = evaluateFilter(filter, "좋은 하루 되세요")

      expect(result.action).toBe("pass")
      expect(result.passed).toBe(true)
      expect(result.matchedWords).toHaveLength(0)
    })

    it("uses highest severity to determine action (severity hierarchy)", () => {
      // Input contains both critical and medium severity words
      const filter = createSafetyFilter({ level: "moderate" })
      // "폭력" (critical) + "도박" (medium) both present
      const { result } = evaluateFilter(filter, "폭력과 도박 이야기")

      // critical => block in moderate
      expect(result.action).toBe("block")
      expect(result.matchedWords.length).toBeGreaterThanOrEqual(2)
    })

    it("permissive level allows high-severity through as flag", () => {
      const filter = createSafetyFilter({ level: "permissive" })
      // "차별" is high severity
      const { result } = evaluateFilter(filter, "차별에 대한 글")

      // permissive + high => flag
      expect(result.action).toBe("flag")
      expect(result.passed).toBe(true)
    })

    it("strict level blocks high-severity words", () => {
      const filter = createSafetyFilter({ level: "strict" })
      const { result } = evaluateFilter(filter, "차별에 대한 글")

      expect(result.action).toBe("block")
      expect(result.passed).toBe(false)
    })

    it("moderate level warns on high-severity words", () => {
      const filter = createSafetyFilter({ level: "moderate" })
      // "혐오" is high severity
      const { result } = evaluateFilter(filter, "혐오 표현")

      expect(result.action).toBe("warn")
      expect(result.passed).toBe(false)
    })

    it("creates log entries when logging is enabled", () => {
      const filter = createSafetyFilter({ enableLogging: true })
      const { result, updatedFilter } = evaluateFilter(filter, "안녕하세요")

      expect(result.logEntry).not.toBeNull()
      expect(result.logEntry!.action).toBe("pass")
      expect(updatedFilter.logs).toHaveLength(1)
    })

    it("does not create log entries when logging is disabled", () => {
      const filter = createSafetyFilter({ enableLogging: false })
      const { result, updatedFilter } = evaluateFilter(filter, "안녕하세요")

      expect(result.logEntry).toBeNull()
      expect(updatedFilter.logs).toHaveLength(0)
    })

    it("respects exactMatch flag", () => {
      const filter = createSafetyFilter({
        forbiddenWords: [{ word: "bad", category: "test", severity: "critical", exactMatch: true }],
      })

      // Exact match should trigger
      const { result: exactResult } = evaluateFilter(filter, "bad")
      expect(exactResult.action).toBe("block")

      // Partial match should NOT trigger for exactMatch: true
      const { result: partialResult } = evaluateFilter(filter, "badminton")
      expect(partialResult.action).toBe("pass")
    })

    it("truncates long input in log entry", () => {
      const filter = createSafetyFilter()
      const longInput = "a".repeat(300)
      const { result } = evaluateFilter(filter, longInput)

      expect(result.logEntry).not.toBeNull()
      expect(result.logEntry!.input.length).toBeLessThanOrEqual(203) // 200 + "..."
      expect(result.logEntry!.input.endsWith("...")).toBe(true)
    })
  })

  // ── addForbiddenWord ───────────────────────────────────────

  describe("addForbiddenWord", () => {
    it("adds a new forbidden word to the list", () => {
      const filter = createSafetyFilter({ forbiddenWords: [] })
      const word: ForbiddenWord = {
        word: "테스트",
        category: "test",
        severity: "low",
        exactMatch: false,
      }
      const updated = addForbiddenWord(filter, word)

      expect(updated.config.forbiddenWords).toHaveLength(1)
      expect(updated.config.forbiddenWords[0].word).toBe("테스트")
    })

    it("throws on duplicate word+category", () => {
      const filter = createSafetyFilter()
      // "폭력" in "violence" already exists in default list
      const duplicate: ForbiddenWord = {
        word: "폭력",
        category: "violence",
        severity: "high",
        exactMatch: true,
      }

      expect(() => addForbiddenWord(filter, duplicate)).toThrow("이미 존재합니다")
    })

    it("allows same word in different category", () => {
      const filter = createSafetyFilter({ forbiddenWords: [] })
      const word1: ForbiddenWord = {
        word: "test",
        category: "cat1",
        severity: "low",
        exactMatch: false,
      }
      const word2: ForbiddenWord = {
        word: "test",
        category: "cat2",
        severity: "medium",
        exactMatch: false,
      }

      const updated1 = addForbiddenWord(filter, word1)
      const updated2 = addForbiddenWord(updated1, word2)

      expect(updated2.config.forbiddenWords).toHaveLength(2)
    })
  })

  // ── removeForbiddenWord ────────────────────────────────────

  describe("removeForbiddenWord", () => {
    it("removes an existing forbidden word", () => {
      const filter = createSafetyFilter()
      const initialLength = filter.config.forbiddenWords.length
      const updated = removeForbiddenWord(filter, "폭력", "violence")

      expect(updated.config.forbiddenWords).toHaveLength(initialLength - 1)
      expect(updated.config.forbiddenWords.some((fw) => fw.word === "폭력")).toBe(false)
    })

    it("throws when word is not found", () => {
      const filter = createSafetyFilter()

      expect(() => removeForbiddenWord(filter, "존재하지않는단어", "unknown")).toThrow(
        "찾을 수 없습니다"
      )
    })
  })

  // ── getFilterLogSummary ────────────────────────────────────

  describe("getFilterLogSummary", () => {
    it("returns correct action counts", () => {
      let filter = createSafetyFilter({ level: "strict" })

      // Generate some log entries
      ;({ updatedFilter: filter } = evaluateFilter(filter, "안녕하세요")) // pass
      ;({ updatedFilter: filter } = evaluateFilter(filter, "좋은 날씨")) // pass
      ;({ updatedFilter: filter } = evaluateFilter(filter, "폭력적인")) // block (critical)
      ;({ updatedFilter: filter } = evaluateFilter(filter, "도박 관련")) // warn (medium, strict)

      const summary = getFilterLogSummary(filter)

      expect(summary.totalEntries).toBe(4)
      expect(summary.byAction.pass).toBe(2)
      expect(summary.byAction.block).toBe(1)
      expect(summary.byAction.warn).toBe(1)
    })

    it("returns recent blocks (up to 10)", () => {
      let filter = createSafetyFilter({ level: "moderate" })

      // Create multiple blocks
      for (let i = 0; i < 12; i++) {
        ;({ updatedFilter: filter } = evaluateFilter(filter, "폭력 콘텐츠"))
      }

      const summary = getFilterLogSummary(filter)

      expect(summary.recentBlocks).toHaveLength(10) // capped at 10
    })

    it("returns empty summary for fresh filter", () => {
      const filter = createSafetyFilter()
      const summary = getFilterLogSummary(filter)

      expect(summary.totalEntries).toBe(0)
      expect(summary.byAction.block).toBe(0)
      expect(summary.byAction.warn).toBe(0)
      expect(summary.byAction.flag).toBe(0)
      expect(summary.byAction.pass).toBe(0)
      expect(summary.recentBlocks).toEqual([])
    })
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║ AC3: API Endpoint Management                                 ║
// ╚═══════════════════════════════════════════════════════════════╝

describe("AC3: API Endpoint Management", () => {
  // ── createAPIEndpointManager ───────────────────────────────

  describe("createAPIEndpointManager", () => {
    it("starts with empty endpoints and default versions", () => {
      const manager = createAPIEndpointManager()

      expect(manager.endpoints).toEqual([])
      expect(manager.versions).toHaveLength(DEFAULT_API_VERSIONS.length)
      expect(manager.healthResults.size).toBe(0)
    })
  })

  // ── registerEndpoint ───────────────────────────────────────

  describe("registerEndpoint", () => {
    it("adds endpoint with generated id", () => {
      const manager = createAPIEndpointManager()
      const ep = makeEndpoint()
      const updated = registerEndpoint(manager, ep)

      expect(updated.endpoints).toHaveLength(1)
      expect(updated.endpoints[0].id).toMatch(/^ep_/)
      expect(updated.endpoints[0].name).toBe("Test Endpoint")
    })

    it("throws on duplicate path+method+version", () => {
      const manager = createAPIEndpointManager()
      const ep = makeEndpoint({ path: "/api/users", method: "GET", version: "v2" })
      const updated = registerEndpoint(manager, ep)

      expect(() =>
        registerEndpoint(
          updated,
          makeEndpoint({ path: "/api/users", method: "GET", version: "v2" })
        )
      ).toThrow("이미 존재합니다")
    })

    it("allows same path+method on different version", () => {
      const manager = createAPIEndpointManager()
      const ep1 = makeEndpoint({ path: "/api/users", method: "GET", version: "v2" })
      const ep2 = makeEndpoint({ path: "/api/users", method: "GET", version: "v3" })

      const m1 = registerEndpoint(manager, ep1)
      const m2 = registerEndpoint(m1, ep2)

      expect(m2.endpoints).toHaveLength(2)
    })

    it("throws on unsupported version", () => {
      const manager = createAPIEndpointManager([], [])

      expect(() => registerEndpoint(manager, makeEndpoint({ version: "v2" }))).toThrow(
        "지원하지 않는 API 버전"
      )
    })
  })

  // ── updateEndpointStatus ───────────────────────────────────

  describe("updateEndpointStatus", () => {
    it("changes endpoint status", () => {
      const manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint())

      const updated = updateEndpointStatus(m, id, "deprecated")

      expect(updated.endpoints[0].status).toBe("deprecated")
    })

    it("throws when endpoint not found", () => {
      const manager = createAPIEndpointManager()

      expect(() => updateEndpointStatus(manager, "nonexistent_id", "disabled")).toThrow(
        "찾을 수 없습니다"
      )
    })
  })

  // ── updateRateLimit ────────────────────────────────────────

  describe("updateRateLimit", () => {
    it("partially updates rate limit config", () => {
      const manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint())

      const updated = updateRateLimit(m, id, { requestsPerMinute: 1200 })
      const ep = updated.endpoints[0]

      expect(ep.rateLimit.requestsPerMinute).toBe(1200)
      // unchanged fields remain
      expect(ep.rateLimit.burstLimit).toBe(DEFAULT_RATE_LIMITS.internal.burstLimit)
      expect(ep.rateLimit.windowMs).toBe(DEFAULT_RATE_LIMITS.internal.windowMs)
    })

    it("throws when endpoint not found", () => {
      const manager = createAPIEndpointManager()

      expect(() => updateRateLimit(manager, "nonexistent", { requestsPerMinute: 100 })).toThrow(
        "찾을 수 없습니다"
      )
    })
  })

  // ── recordHealthCheck ──────────────────────────────────────

  describe("recordHealthCheck", () => {
    it("records healthy status for successful fast response", () => {
      const manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint())

      const updated = recordHealthCheck(m, id, 100, true)
      const result = updated.healthResults.get(id)

      expect(result).toBeDefined()
      expect(result!.status).toBe("healthy")
      expect(result!.consecutiveFailures).toBe(0)
      expect(result!.lastSuccessAt).not.toBeNull()
    })

    it("records degraded status for single failure", () => {
      const manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint())

      const updated = recordHealthCheck(m, id, 0, false, "timeout")
      const result = updated.healthResults.get(id)

      expect(result!.status).toBe("degraded")
      expect(result!.consecutiveFailures).toBe(1)
      expect(result!.errorMessage).toBe("timeout")
    })

    it("records down status after consecutive failures reach threshold", () => {
      const manager = createAPIEndpointManager()
      // Default unhealthyThreshold is 3
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint())

      let current = m
      for (let i = 0; i < 3; i++) {
        current = recordHealthCheck(current, id, 0, false, "error")
      }

      const result = current.healthResults.get(id)
      expect(result!.status).toBe("down")
      expect(result!.consecutiveFailures).toBe(3)
    })

    it("resets consecutive failures on success", () => {
      const manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint())

      // Fail twice
      let current = recordHealthCheck(m, id, 0, false)
      current = recordHealthCheck(current, id, 0, false)
      expect(current.healthResults.get(id)!.consecutiveFailures).toBe(2)

      // Succeed
      current = recordHealthCheck(current, id, 100, true)
      expect(current.healthResults.get(id)!.consecutiveFailures).toBe(0)
      expect(current.healthResults.get(id)!.status).toBe("healthy")
    })

    it("marks degraded when response time exceeds 80% of timeout", () => {
      const healthCheck = { ...DEFAULT_HEALTH_CHECK, timeoutMs: 5000 }
      const manager = createAPIEndpointManager()
      const { manager: m, id } = registerAndGetId(manager, makeEndpoint({ healthCheck }))

      // 80% of 5000 = 4000, so 4100 should be degraded
      const updated = recordHealthCheck(m, id, 4100, true)
      expect(updated.healthResults.get(id)!.status).toBe("degraded")
    })

    it("throws when endpoint not found", () => {
      const manager = createAPIEndpointManager()

      expect(() => recordHealthCheck(manager, "nonexistent", 100, true)).toThrow("찾을 수 없습니다")
    })
  })

  // ── getEndpointsByVersion ──────────────────────────────────

  describe("getEndpointsByVersion", () => {
    it("filters endpoints by version", () => {
      let manager = createAPIEndpointManager()
      manager = registerEndpoint(manager, makeEndpoint({ path: "/a", version: "v2" }))
      manager = registerEndpoint(manager, makeEndpoint({ path: "/b", version: "v2" }))
      manager = registerEndpoint(manager, makeEndpoint({ path: "/c", version: "v3" }))

      const v2 = getEndpointsByVersion(manager, "v2")
      const v3 = getEndpointsByVersion(manager, "v3")

      expect(v2).toHaveLength(2)
      expect(v3).toHaveLength(1)
    })

    it("returns empty array when no endpoints for version", () => {
      const manager = createAPIEndpointManager()
      const result = getEndpointsByVersion(manager, "v1")

      expect(result).toEqual([])
    })
  })

  // ── getDeprecatedEndpoints ─────────────────────────────────

  describe("getDeprecatedEndpoints", () => {
    it("finds endpoints by deprecated status", () => {
      let manager = createAPIEndpointManager()
      const { manager: m1, id: id1 } = registerAndGetId(
        manager,
        makeEndpoint({ path: "/a", version: "v2" })
      )
      manager = registerEndpoint(m1, makeEndpoint({ path: "/b", version: "v2" }))
      manager = updateEndpointStatus(manager, id1, "deprecated")

      const deprecated = getDeprecatedEndpoints(manager)

      expect(deprecated.length).toBeGreaterThanOrEqual(1)
      expect(deprecated.some((e) => e.id === id1)).toBe(true)
    })

    it("finds endpoints on deprecated versions (v1 is deprecated)", () => {
      let manager = createAPIEndpointManager()
      // v1 is deprecated in default versions
      manager = registerEndpoint(
        manager,
        makeEndpoint({ path: "/legacy", version: "v1", status: "active" })
      )

      const deprecated = getDeprecatedEndpoints(manager)

      expect(deprecated).toHaveLength(1)
      expect(deprecated[0].path).toBe("/legacy")
    })
  })

  // ── getHealthSummary ───────────────────────────────────────

  describe("getHealthSummary", () => {
    it("counts endpoints by health status", () => {
      const manager = createAPIEndpointManager()
      const { manager: m1, id: id1 } = registerAndGetId(manager, makeEndpoint({ path: "/a" }))
      const { manager: m2, id: id2 } = registerAndGetId(m1, makeEndpoint({ path: "/b" }))
      const { manager: m3, id: id3 } = registerAndGetId(m2, makeEndpoint({ path: "/c" }))

      // /a = healthy, /b = degraded, /c = unknown (no health check)
      let current = recordHealthCheck(m3, id1, 100, true)
      current = recordHealthCheck(current, id2, 0, false)

      const summary = getHealthSummary(current)

      expect(summary.total).toBe(3)
      expect(summary.healthy).toBe(1)
      expect(summary.degraded).toBe(1)
      expect(summary.unknown).toBe(1)
      expect(summary.down).toBe(0)
    })

    it("reports all unknown when no health checks recorded", () => {
      let manager = createAPIEndpointManager()
      manager = registerEndpoint(manager, makeEndpoint({ path: "/a" }))
      manager = registerEndpoint(manager, makeEndpoint({ path: "/b" }))

      const summary = getHealthSummary(manager)

      expect(summary.total).toBe(2)
      expect(summary.unknown).toBe(2)
    })
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║ Cost Dashboard                                               ║
// ╚═══════════════════════════════════════════════════════════════╝

describe("Cost Dashboard", () => {
  const sonnet = DEFAULT_MODELS.find((m) => m.id === "claude-sonnet")!
  const haiku = DEFAULT_MODELS.find((m) => m.id === "claude-haiku")!

  // ── createCostDashboard ────────────────────────────────────

  describe("createCostDashboard", () => {
    it("starts with empty entries and alerts", () => {
      const budget = makeBudget()
      const dashboard = createCostDashboard(budget)

      expect(dashboard.entries).toEqual([])
      expect(dashboard.alerts).toEqual([])
      expect(dashboard.budget).toBe(budget)
    })
  })

  // ── recordCostEntry ────────────────────────────────────────

  describe("recordCostEntry", () => {
    it("adds entry and updates budget spend", () => {
      const budget = makeBudget({ limitUsd: 1000 })
      const dashboard = createCostDashboard(budget)

      const updated = recordCostEntry(dashboard, "claude-sonnet", "generation", 1000, 500, sonnet)

      expect(updated.entries).toHaveLength(1)
      expect(updated.entries[0].model).toBe("claude-sonnet")
      expect(updated.entries[0].costUsd).toBeCloseTo(0.0105, 6)
      expect(updated.budget.currentSpendUsd).toBeCloseTo(0.0105, 6)
    })

    it("triggers budget alerts when threshold crossed", () => {
      const budget = makeBudget({ limitUsd: 0.01 }) // very low budget
      const dashboard = createCostDashboard(budget)

      // This should cost ~0.0105 => over 100% of 0.01
      const updated = recordCostEntry(dashboard, "claude-sonnet", "generation", 1000, 500, sonnet)

      expect(updated.alerts.length).toBeGreaterThan(0)
      // All thresholds should have triggered
      const alertPercents = updated.alerts.map((a) => a.thresholdPercent)
      expect(alertPercents).toContain(80)
      expect(alertPercents).toContain(90)
      expect(alertPercents).toContain(100)
    })

    it("does not create duplicate alerts for already-triggered thresholds", () => {
      const budget = makeBudget({ limitUsd: 0.005 }) // very low
      const dashboard = createCostDashboard(budget)

      const first = recordCostEntry(dashboard, "claude-sonnet", "generation", 1000, 500, sonnet)
      const second = recordCostEntry(first, "claude-sonnet", "generation", 1000, 500, sonnet)

      // Alerts from first recording should not be duplicated
      const alertAt100 = second.alerts.filter((a) => a.thresholdPercent === 100)
      expect(alertAt100).toHaveLength(1)
    })
  })

  // ── aggregateCosts ─────────────────────────────────────────

  describe("aggregateCosts", () => {
    function buildDashboardWithEntries(): {
      dashboard: ReturnType<typeof createCostDashboard>
      refDate: number
    } {
      const now = new Date()
      const refDate = now.getTime()
      const budget = makeBudget({ limitUsd: 10000 })
      let dashboard = createCostDashboard(budget)

      // Record entries at a known time (today)
      dashboard = recordCostEntry(dashboard, "claude-sonnet", "generation", 2000, 1000, sonnet)
      dashboard = recordCostEntry(dashboard, "claude-haiku", "matching", 5000, 2000, haiku)

      return { dashboard, refDate }
    }

    it("aggregates daily costs correctly", () => {
      const { dashboard, refDate } = buildDashboardWithEntries()
      const agg = aggregateCosts(dashboard, "daily", refDate)

      expect(agg.period).toBe("daily")
      expect(agg.requestCount).toBe(2)
      expect(agg.totalCostUsd).toBeGreaterThan(0)
      expect(agg.totalInputTokens).toBe(7000)
      expect(agg.totalOutputTokens).toBe(3000)
    })

    it("aggregates weekly costs", () => {
      const { dashboard, refDate } = buildDashboardWithEntries()
      const agg = aggregateCosts(dashboard, "weekly", refDate)

      expect(agg.period).toBe("weekly")
      expect(agg.requestCount).toBe(2)
    })

    it("aggregates monthly costs", () => {
      const { dashboard, refDate } = buildDashboardWithEntries()
      const agg = aggregateCosts(dashboard, "monthly", refDate)

      expect(agg.period).toBe("monthly")
      expect(agg.requestCount).toBe(2)
    })

    it("provides per-model breakdown with percentOfTotal", () => {
      const { dashboard, refDate } = buildDashboardWithEntries()
      const agg = aggregateCosts(dashboard, "daily", refDate)

      expect(agg.perModel["claude-sonnet"]).toBeDefined()
      expect(agg.perModel["claude-haiku"]).toBeDefined()

      const sonnetBreakdown = agg.perModel["claude-sonnet"]
      const haikuBreakdown = agg.perModel["claude-haiku"]

      expect(sonnetBreakdown.requestCount).toBe(1)
      expect(haikuBreakdown.requestCount).toBe(1)

      // percentOfTotal should sum to ~100
      const totalPercent = sonnetBreakdown.percentOfTotal + haikuBreakdown.percentOfTotal
      expect(totalPercent).toBeCloseTo(100, 0)
    })

    it("returns zero counts when no entries in period", () => {
      const budget = makeBudget()
      const dashboard = createCostDashboard(budget)
      // reference a date far in the future where no entries exist
      const farFuture = new Date("2099-01-01").getTime()
      const agg = aggregateCosts(dashboard, "daily", farFuture)

      expect(agg.requestCount).toBe(0)
      expect(agg.totalCostUsd).toBe(0)
    })
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║ Config Validation                                            ║
// ╚═══════════════════════════════════════════════════════════════╝

describe("Config Validation", () => {
  // ── createGlobalConfig ─────────────────────────────────────

  describe("createGlobalConfig", () => {
    it("combines all sub-configs into one global config", () => {
      const config = createGlobalConfig()

      expect(config.modelConfig).toBeDefined()
      expect(config.safetyFilter).toBeDefined()
      expect(config.apiManager).toBeDefined()
      expect(config.costDashboard).toBeDefined()

      expect(config.modelConfig.defaultModel).toBe("claude-sonnet")
      expect(config.safetyFilter.config.level).toBe("moderate")
      expect(config.apiManager.endpoints).toEqual([])
    })
  })

  // ── validateConfig ─────────────────────────────────────────

  describe("validateConfig", () => {
    it("valid config has no errors", () => {
      const config = createGlobalConfig()
      const result = validateConfig(config)

      expect(result.valid).toBe(true)
      const errors = result.issues.filter((i) => i.severity === "error")
      expect(errors).toHaveLength(0)
    })

    it("detects disabled default model", () => {
      const models = DEFAULT_MODELS.map((m) =>
        m.id === "claude-sonnet" ? { ...m, enabled: false } : { ...m }
      )
      const config = createGlobalConfig({ modelConfig: { models } })
      const result = validateConfig(config)

      const issue = result.issues.find((i) => i.code === "MODEL_DEFAULT_DISABLED")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("error")
    })

    it("detects missing routing model", () => {
      // Remove claude-haiku from models but keep routing rules referencing it
      const models = DEFAULT_MODELS.filter((m) => m.id !== "claude-haiku")
      const config = createGlobalConfig({ modelConfig: { models } })
      const result = validateConfig(config)

      const issue = result.issues.find((i) => i.code === "ROUTING_MODEL_MISSING")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("error")
    })

    it("detects routing capability mismatch", () => {
      // claude-haiku does not have "generation" capability
      const routingRules = [
        {
          taskType: "generation" as TaskType,
          primaryModel: "claude-haiku" as SupportedModel,
          fallbackModel: null,
          strategy: "balanced" as const,
          maxRetries: 2,
          timeoutMs: 10_000,
        },
      ]
      const config = createGlobalConfig({ modelConfig: { routingRules } })
      const result = validateConfig(config)

      const issue = result.issues.find((i) => i.code === "ROUTING_CAPABILITY_MISMATCH")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("error")
    })

    it("detects permissive safety filter", () => {
      const config = createGlobalConfig({
        safetyFilter: { level: "permissive" },
      })
      const result = validateConfig(config)

      const issue = result.issues.find((i) => i.code === "SAFETY_LEVEL_PERMISSIVE")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("warning")
    })

    it("detects exceeded budget", () => {
      const now = Date.now()
      const budget: MonthlyBudget = {
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
      const config = createGlobalConfig()
      config.costDashboard.budget = budget

      const result = validateConfig(config)

      const issue = result.issues.find((i) => i.code === "COST_BUDGET_EXCEEDED")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("error")
      expect(result.valid).toBe(false)
    })

    it("detects sunset-past API versions with active endpoints", () => {
      const config = createGlobalConfig()
      // v1 sunset is 2025-07-01, which is in the past
      config.apiManager = registerEndpoint(
        config.apiManager,
        makeEndpoint({ path: "/old", version: "v1", status: "active" })
      )

      const result = validateConfig(config)

      const issue = result.issues.find((i) => i.code === "API_PAST_SUNSET")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("error")
    })

    it("detects high budget usage (80%+) as warning", () => {
      const now = Date.now()
      const budget: MonthlyBudget = {
        limitUsd: 100,
        currentSpendUsd: 85,
        periodStart: now,
        periodEnd: now + 30 * 24 * 60 * 60 * 1000,
        alertThresholds: [
          { percent: 80, notified: true, notifiedAt: now },
          { percent: 90, notified: false, notifiedAt: null },
          { percent: 100, notified: false, notifiedAt: null },
        ],
      }
      const config = createGlobalConfig()
      config.costDashboard.budget = budget

      const result = validateConfig(config)

      const issue = result.issues.find((i) => i.code === "COST_BUDGET_HIGH")
      expect(issue).toBeDefined()
      expect(issue!.severity).toBe("warning")
    })
  })

  // ── suggestOptimizations ───────────────────────────────────

  describe("suggestOptimizations", () => {
    it("suggests cost optimization when matching uses expensive model", () => {
      const routingRules = DEFAULT_ROUTING_RULES.map((r) =>
        r.taskType === "matching"
          ? { ...r, primaryModel: "claude-opus" as SupportedModel }
          : { ...r }
      )
      const models = DEFAULT_MODELS.map((m) =>
        m.id === "claude-opus" ? { ...m, enabled: true } : { ...m }
      )
      const config = createGlobalConfig({ modelConfig: { routingRules, models } })
      const suggestions = suggestOptimizations(config)

      const costSuggestion = suggestions.find((s) => s.category === "cost" && s.priority === "high")
      expect(costSuggestion).toBeDefined()
      expect(costSuggestion!.title).toContain("매칭")
    })

    it("suggests performance improvement for low generation timeout", () => {
      const routingRules = DEFAULT_ROUTING_RULES.map((r) =>
        r.taskType === "generation" ? { ...r, timeoutMs: 10_000 } : { ...r }
      )
      const config = createGlobalConfig({ modelConfig: { routingRules } })
      const suggestions = suggestOptimizations(config)

      const perfSuggestion = suggestions.find((s) => s.category === "performance")
      expect(perfSuggestion).toBeDefined()
      expect(perfSuggestion!.title).toContain("타임아웃")
    })

    it("suggests safety improvement for permissive filter", () => {
      const config = createGlobalConfig({ safetyFilter: { level: "permissive" } })
      const suggestions = suggestOptimizations(config)

      const safetySuggestion = suggestions.find((s) => s.category === "safety")
      expect(safetySuggestion).toBeDefined()
      expect(safetySuggestion!.priority).toBe("high")
    })

    it("suggests reliability improvement when no fallback model", () => {
      const routingRules = DEFAULT_ROUTING_RULES.map((r) => ({
        ...r,
        fallbackModel: null,
      }))
      const config = createGlobalConfig({ modelConfig: { routingRules } })
      const suggestions = suggestOptimizations(config)

      const reliabilitySuggestion = suggestions.find(
        (s) => s.category === "reliability" && s.title.includes("대체 모델")
      )
      expect(reliabilitySuggestion).toBeDefined()
    })

    it("suggests budget setup when limit is 0", () => {
      const config = createGlobalConfig()
      config.modelConfig.budget.limitUsd = 0

      const suggestions = suggestOptimizations(config)

      const budgetSuggestion = suggestions.find(
        (s) => s.category === "cost" && s.title.includes("예산")
      )
      expect(budgetSuggestion).toBeDefined()
      expect(budgetSuggestion!.priority).toBe("high")
    })

    it("returns no suggestions for well-configured setup", () => {
      // Default config with generation timeout 30s, moderate filter,
      // fallback models set, budget > 0 => should be minimal suggestions
      const config = createGlobalConfig()
      const suggestions = suggestOptimizations(config)

      // No cost optimization (haiku is cheap for matching)
      // No performance issue (generation timeout is 30s)
      // No safety issue (moderate level)
      // No reliability issue (fallbacks are set)
      // No budget issue (limit is 500)
      expect(suggestions).toHaveLength(0)
    })

    it("suggests health check enablement for active endpoints without it", () => {
      const config = createGlobalConfig()
      config.apiManager = registerEndpoint(
        config.apiManager,
        makeEndpoint({
          path: "/api/no-health",
          healthCheck: { ...DEFAULT_HEALTH_CHECK, enabled: false },
        })
      )

      const suggestions = suggestOptimizations(config)

      const healthSuggestion = suggestions.find(
        (s) => s.category === "reliability" && s.title.includes("헬스체크")
      )
      expect(healthSuggestion).toBeDefined()
    })
  })
})
