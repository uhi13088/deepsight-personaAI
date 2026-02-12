// ═══════════════════════════════════════════════════════════════
// System Integration UI — Page Integration Tests
// T98: Deployment + Versions + Event Bus UI 로직 검증
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

// ── Deploy imports ────────────────────────────────────────────
import {
  ENVIRONMENT_CONFIGS,
  createDeployWorkflow,
  approveDeployWorkflow,
  advanceDeployStage,
  cancelDeployWorkflow,
  rollbackDeployWorkflow,
  // Canary
  createCanaryRelease,
  updateCanaryMetrics,
  evaluateCanaryRollback,
  advanceCanaryPhase,
  rollbackCanaryRelease,
  DEFAULT_CANARY_ROLLBACK_TRIGGERS,
  // Version
  createVersion,
  bumpVersion,
  parseVersion,
  formatVersion,
  compareVersions,
  diffVersions,
  rollbackVersion,
  setVersionTesting,
  activateVersion,
  deprecateVersion,
  DEFAULT_VERSION_POLICY,
  // Event Bus
  createEventBus,
  subscribe,
  unsubscribe,
  createEvent,
  publish,
  getEventLog,
  getEventStats,
  markEventFailed,
  retryEvent,
  measureSyncDelay,
  generateSyncDelayReport,
  SYNC_DELAY_TARGETS,
} from "@/lib/system-integration"

// ═══════════════════════════════════════════════════════════════
// Deployment Pipeline Page 로직
// ═══════════════════════════════════════════════════════════════

describe("Deployment Pipeline Page Logic", () => {
  describe("환경 구성", () => {
    it("3개 환경(DEV/STG/PROD)이 존재해야 한다", () => {
      expect(ENVIRONMENT_CONFIGS.length).toBe(3)
      const envNames = ENVIRONMENT_CONFIGS.map((e) => e.environment)
      expect(envNames).toContain("development")
      expect(envNames).toContain("staging")
      expect(envNames).toContain("production")
    })

    it("PROD 환경은 승인이 필요해야 한다", () => {
      const prod = ENVIRONMENT_CONFIGS.find((e) => e.environment === "production")
      expect(prod?.requiresApproval).toBe(true)
    })

    it("DEV 환경은 승인이 필요하지 않아야 한다", () => {
      const dev = ENVIRONMENT_CONFIGS.find((e) => e.environment === "development")
      expect(dev?.requiresApproval).toBe(false)
    })
  })

  describe("배포 워크플로우 생성 및 진행", () => {
    it("워크플로우 생성 시 pending 상태여야 한다", () => {
      const wf = createDeployWorkflow("algorithm", "v1.0.0", "development", "admin")
      expect(wf.status).toBe("pending")
      expect(wf.stages.length).toBe(4)
      expect(wf.stages.every((s) => s.status === "pending")).toBe(true)
    })

    it("4단계(build→test→deploy→verify)가 순서대로 생성되어야 한다", () => {
      const wf = createDeployWorkflow("algorithm", "v1.0.0", "development", "admin")
      const stageNames = wf.stages.map((s) => s.stage)
      expect(stageNames).toEqual(["build", "test", "deploy", "verify"])
    })

    it("build 단계 성공 후 in_progress 상태여야 한다", () => {
      const wf = createDeployWorkflow("algorithm", "v1.0.0", "development", "admin")
      const updated = advanceDeployStage(wf, "build", true, ["Build completed"])
      expect(updated.status).toBe("in_progress")
      expect(updated.stages[0].status).toBe("passed")
    })

    it("모든 단계 성공 후 succeeded 상태여야 한다", () => {
      let wf = createDeployWorkflow("algorithm", "v1.0.0", "development", "admin")
      wf = advanceDeployStage(wf, "build", true)
      wf = advanceDeployStage(wf, "test", true)
      wf = advanceDeployStage(wf, "deploy", true)
      wf = advanceDeployStage(wf, "verify", true)
      expect(wf.status).toBe("succeeded")
      expect(wf.completedAt).not.toBeNull()
    })

    it("단계 실패 시 failed 상태여야 한다", () => {
      let wf = createDeployWorkflow("algorithm", "v1.0.0", "development", "admin")
      wf = advanceDeployStage(wf, "build", false, [], "Build error")
      expect(wf.status).toBe("failed")
      expect(wf.stages[0].error).toBe("Build error")
    })

    it("이전 단계가 미완료인 경우 다음 단계 진행 시 에러 발생", () => {
      const wf = createDeployWorkflow("algorithm", "v1.0.0", "development", "admin")
      expect(() => advanceDeployStage(wf, "test", true)).toThrow()
    })

    it("PROD 환경은 미승인 시 단계 진행 에러 발생", () => {
      const wf = createDeployWorkflow("algorithm", "v1.0.0", "production", "admin")
      expect(() => advanceDeployStage(wf, "build", true)).toThrow()
    })

    it("PROD 환경 승인 후 진행 가능해야 한다", () => {
      let wf = createDeployWorkflow("algorithm", "v1.0.0", "production", "admin")
      wf = approveDeployWorkflow(wf, "cto@deepsight.ai")
      const updated = advanceDeployStage(wf, "build", true)
      expect(updated.stages[0].status).toBe("passed")
    })
  })

  describe("워크플로우 취소 및 롤백", () => {
    it("진행 중 워크플로우 취소 시 cancelled 상태여야 한다", () => {
      let wf = createDeployWorkflow("algorithm", "v1.0.0", "development", "admin")
      wf = advanceDeployStage(wf, "build", true)
      const cancelled = cancelDeployWorkflow(wf)
      expect(cancelled.status).toBe("cancelled")
      expect(cancelled.stages.filter((s) => s.status === "skipped").length).toBe(3)
    })

    it("성공한 워크플로우 취소 시 에러 발생", () => {
      let wf = createDeployWorkflow("algorithm", "v1.0.0", "development", "admin")
      wf = advanceDeployStage(wf, "build", true)
      wf = advanceDeployStage(wf, "test", true)
      wf = advanceDeployStage(wf, "deploy", true)
      wf = advanceDeployStage(wf, "verify", true)
      expect(() => cancelDeployWorkflow(wf)).toThrow()
    })

    it("성공한 워크플로우 롤백 시 rolled_back 상태여야 한다", () => {
      let wf = createDeployWorkflow("algorithm", "v1.0.0", "development", "admin")
      wf = advanceDeployStage(wf, "build", true)
      wf = advanceDeployStage(wf, "test", true)
      wf = advanceDeployStage(wf, "deploy", true)
      wf = advanceDeployStage(wf, "verify", true)
      const rolledBack = rollbackDeployWorkflow(wf, "Performance issue")
      expect(rolledBack.status).toBe("rolled_back")
      expect(rolledBack.rollbackReason).toBe("Performance issue")
    })
  })

  describe("Canary Release", () => {
    it("Canary 생성 시 10_percent 단계여야 한다", () => {
      const canary = createCanaryRelease("wf_123", 30)
      expect(canary.phase).toBe("10_percent")
      expect(canary.configs["10_percent"]).not.toBeNull()
      expect(canary.configs["50_percent"]).not.toBeNull()
      expect(canary.configs["100_percent"]).not.toBeNull()
    })

    it("정상 메트릭으로 단계 진행 가능해야 한다", () => {
      let canary = createCanaryRelease("wf_123", 30)
      canary = updateCanaryMetrics(canary, {
        errorRatePercent: 1,
        avgResponseTimeMs: 50,
        matchingSatisfactionScore: 80,
      })
      const advanced = advanceCanaryPhase(canary)
      expect(advanced.phase).toBe("50_percent")
    })

    it("50% → 100% → completed 순서대로 진행되어야 한다", () => {
      let canary = createCanaryRelease("wf_123", 30)
      const goodMetrics = {
        errorRatePercent: 1,
        avgResponseTimeMs: 50,
        matchingSatisfactionScore: 80,
      }
      canary = updateCanaryMetrics(canary, goodMetrics)
      canary = advanceCanaryPhase(canary) // 50%
      canary = updateCanaryMetrics(canary, goodMetrics)
      canary = advanceCanaryPhase(canary) // 100%
      canary = updateCanaryMetrics(canary, goodMetrics)
      canary = advanceCanaryPhase(canary) // completed
      expect(canary.phase).toBe("completed")
      expect(canary.completedAt).not.toBeNull()
    })

    it("롤백 트리거가 발동되면 진행 에러 발생", () => {
      let canary = createCanaryRelease("wf_123", 30)
      canary = updateCanaryMetrics(canary, {
        errorRatePercent: 10,
        avgResponseTimeMs: 300,
        matchingSatisfactionScore: -20,
      })
      expect(() => advanceCanaryPhase(canary)).toThrow()
    })

    it("evaluateCanaryRollback이 올바른 트리거를 감지해야 한다", () => {
      let canary = createCanaryRelease("wf_123", 30)
      canary = updateCanaryMetrics(canary, {
        errorRatePercent: 10,
        avgResponseTimeMs: 50,
        matchingSatisfactionScore: 80,
      })
      const evaluation = evaluateCanaryRollback(canary)
      expect(evaluation.shouldRollback).toBe(true)
      expect(evaluation.triggeredReasons.length).toBeGreaterThan(0)
    })

    it("Canary 롤백 시 rolled_back 상태여야 한다", () => {
      const canary = createCanaryRelease("wf_123", 30)
      const rolledBack = rollbackCanaryRelease(canary, "Error rate too high")
      expect(rolledBack.phase).toBe("rolled_back")
      expect(rolledBack.rollbackReason).toBe("Error rate too high")
    })

    it("완료된 Canary는 롤백 불가해야 한다", () => {
      let canary = createCanaryRelease("wf_123", 30)
      const goodMetrics = {
        errorRatePercent: 1,
        avgResponseTimeMs: 50,
        matchingSatisfactionScore: 80,
      }
      canary = updateCanaryMetrics(canary, goodMetrics)
      canary = advanceCanaryPhase(canary)
      canary = updateCanaryMetrics(canary, goodMetrics)
      canary = advanceCanaryPhase(canary)
      canary = updateCanaryMetrics(canary, goodMetrics)
      canary = advanceCanaryPhase(canary) // completed
      expect(() => rollbackCanaryRelease(canary, "Too late")).toThrow()
    })

    it("기본 롤백 트리거가 3종이어야 한다", () => {
      expect(DEFAULT_CANARY_ROLLBACK_TRIGGERS.length).toBe(3)
      const metrics = DEFAULT_CANARY_ROLLBACK_TRIGGERS.map((t) => t.metric)
      expect(metrics).toContain("error_rate")
      expect(metrics).toContain("response_time")
      expect(metrics).toContain("satisfaction")
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Version Control Page 로직
// ═══════════════════════════════════════════════════════════════

describe("Version Control Page Logic", () => {
  describe("버전 생성 및 파싱", () => {
    it("버전 생성 시 draft 상태여야 한다", () => {
      const ver = createVersion("matching", "v1.0.0", "admin", "Initial", "First", {}, {})
      expect(ver.status).toBe("draft")
      expect(ver.category).toBe("matching")
      expect(ver.version).toBe("v1.0.0")
    })

    it("버전 파싱이 올바르게 동작해야 한다", () => {
      const parsed = parseVersion("v1.2.3")
      expect(parsed.major).toBe(1)
      expect(parsed.minor).toBe(2)
      expect(parsed.patch).toBe(3)
    })

    it("빌드 번호 포함 버전 파싱이 올바르게 동작해야 한다", () => {
      const parsed = parseVersion("v1.2.3-007")
      expect(parsed.build).toBe(7)
    })

    it("잘못된 버전 형식에서 에러 발생", () => {
      expect(() => parseVersion("invalid")).toThrow()
      expect(() => parseVersion("v1.2")).toThrow()
    })
  })

  describe("Semantic Version Bump", () => {
    it("Major bump 시 마이너/패치가 0으로 리셋되어야 한다", () => {
      const result = bumpVersion("v1.2.3", "major")
      expect(result).toBe("v2.0.0")
    })

    it("Minor bump 시 패치가 0으로 리셋되어야 한다", () => {
      const result = bumpVersion("v1.2.3", "minor")
      expect(result).toBe("v1.3.0")
    })

    it("Patch bump 시 패치만 증가해야 한다", () => {
      const result = bumpVersion("v1.2.3", "patch")
      expect(result).toBe("v1.2.4")
    })

    it("v0.0.0에서 bump 동작해야 한다", () => {
      expect(bumpVersion("v0.0.0", "major")).toBe("v1.0.0")
      expect(bumpVersion("v0.0.0", "minor")).toBe("v0.1.0")
      expect(bumpVersion("v0.0.0", "patch")).toBe("v0.0.1")
    })
  })

  describe("버전 비교", () => {
    it("major가 큰 버전이 더 커야 한다", () => {
      expect(compareVersions("v2.0.0", "v1.0.0")).toBeGreaterThan(0)
    })

    it("같은 버전은 0을 반환해야 한다", () => {
      expect(compareVersions("v1.0.0", "v1.0.0")).toBe(0)
    })

    it("minor가 큰 버전이 더 커야 한다", () => {
      expect(compareVersions("v1.2.0", "v1.1.0")).toBeGreaterThan(0)
    })
  })

  describe("버전 Diff", () => {
    it("config/weight 변경을 올바르게 감지해야 한다", () => {
      const v1 = createVersion(
        "matching",
        "v1.0.0",
        "admin",
        "v1",
        "v1",
        { a: 1, b: 2 },
        { w1: 0.5 }
      )
      const v2 = createVersion(
        "matching",
        "v1.1.0",
        "admin",
        "v2",
        "v2",
        { a: 1, b: 3, c: 4 },
        { w1: 0.6 }
      )
      const diff = diffVersions(v1, v2)

      expect(diff.entries.length).toBeGreaterThan(0)
      expect(diff.configChanges).toBeGreaterThanOrEqual(1)
      expect(diff.weightChanges).toBeGreaterThanOrEqual(1)
    })

    it("같은 config/weight에서는 변경이 없어야 한다", () => {
      const v1 = createVersion("matching", "v1.0.0", "admin", "v1", "v1", { a: 1 }, { w: 0.5 })
      const v2 = createVersion("matching", "v1.1.0", "admin", "v2", "v2", { a: 1 }, { w: 0.5 })
      const diff = diffVersions(v1, v2)
      expect(diff.entries.length).toBe(0)
    })

    it("다른 카테고리 비교 시 에러 발생", () => {
      const v1 = createVersion("matching", "v1.0.0", "admin", "v1", "v1", {}, {})
      const v2 = createVersion("persona_generator", "v1.0.0", "admin", "v2", "v2", {}, {})
      expect(() => diffVersions(v1, v2)).toThrow()
    })
  })

  describe("버전 롤백", () => {
    it("active → deprecated 롤백이 동작해야 한다", () => {
      let v1 = createVersion("matching", "v1.0.0", "admin", "v1", "v1", {}, {})
      v1 = { ...v1, status: "deprecated" }
      let v2 = createVersion("matching", "v1.1.0", "admin", "v2", "v2", {}, {}, "v1.0.0")
      v2 = { ...v2, status: "active" }

      const result = rollbackVersion(v2, v1, "Regression", "admin", ["development"])
      expect(result.updatedCurrent.status).toBe("rolled_back")
      expect(result.updatedTarget.status).toBe("active")
      expect(result.rollback.reason).toBe("Regression")
    })

    it("롤백 대상이 현재보다 높은 버전이면 에러 발생", () => {
      const v1 = {
        ...createVersion("matching", "v1.0.0", "admin", "v1", "v1", {}, {}),
        status: "active" as const,
      }
      const v2 = {
        ...createVersion("matching", "v1.1.0", "admin", "v2", "v2", {}, {}),
        status: "active" as const,
      }
      expect(() => rollbackVersion(v1, v2, "Can't rollback forward", "admin", [])).toThrow()
    })
  })

  describe("버전 상태 전이", () => {
    it("draft → testing 전이가 동작해야 한다", () => {
      const ver = createVersion("matching", "v1.0.0", "admin", "v1", "v1", {}, {})
      const testing = setVersionTesting(ver)
      expect(testing.status).toBe("testing")
    })

    it("testing이 아닌 상태에서 activate 시 에러 발생 (requireTestBeforeActivation)", () => {
      const ver = createVersion("matching", "v1.0.0", "admin", "v1", "v1", {}, {})
      expect(() => activateVersion(ver, [], DEFAULT_VERSION_POLICY)).toThrow()
    })

    it("testing → active 전이가 동작해야 한다", () => {
      let ver = createVersion("matching", "v1.0.0", "admin", "v1", "v1", {}, {})
      ver = setVersionTesting(ver)
      const active = activateVersion(ver, [], DEFAULT_VERSION_POLICY)
      expect(active.status).toBe("active")
    })

    it("active → deprecated 전이가 동작해야 한다", () => {
      let ver = createVersion("matching", "v1.0.0", "admin", "v1", "v1", {}, {})
      ver = setVersionTesting(ver)
      ver = activateVersion(ver, [], DEFAULT_VERSION_POLICY)
      const deprecated = deprecateVersion(ver, "Old version")
      expect(deprecated.status).toBe("deprecated")
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// Event Bus Monitor Page 로직
// ═══════════════════════════════════════════════════════════════

describe("Event Bus Monitor Page Logic", () => {
  const source = { service: "test-service", instance: "test-001" }
  const metadata = { userId: "admin", userRole: "engineer", environment: "development" as const }

  describe("이벤트 버스 생성 및 구독", () => {
    it("빈 이벤트 버스 생성이 동작해야 한다", () => {
      const bus = createEventBus(100)
      expect(bus.subscriptions.length).toBe(0)
      expect(bus.eventLog.length).toBe(0)
    })

    it("구독 추가 후 구독자 목록에 포함되어야 한다", () => {
      let bus = createEventBus(100)
      bus = subscribe(bus, "sub-1", ["persona.created", "persona.updated"], "https://example.com")
      expect(bus.subscriptions.length).toBe(1)
      expect(bus.subscriptions[0].active).toBe(true)
      expect(bus.subscriptions[0].subscriberId).toBe("sub-1")
    })

    it("구독 해제 시 inactive로 전환되어야 한다", () => {
      let bus = createEventBus(100)
      bus = subscribe(bus, "sub-1", ["persona.created"], "https://example.com")
      const subId = bus.subscriptions[0].id
      bus = unsubscribe(bus, subId)
      expect(bus.subscriptions[0].active).toBe(false)
    })

    it("존재하지 않는 구독 해제 시 에러 발생", () => {
      const bus = createEventBus(100)
      expect(() => unsubscribe(bus, "nonexistent")).toThrow()
    })
  })

  describe("이벤트 발행 및 로그", () => {
    it("구독자가 있는 이벤트 발행 시 delivered 상태여야 한다", () => {
      let bus = createEventBus(100)
      bus = subscribe(bus, "sub-1", ["persona.created"], "https://example.com")
      const event = createEvent("persona.created", { id: "p_1" }, source, metadata)
      bus = publish(bus, event)

      expect(bus.eventLog.length).toBe(1)
      expect(bus.eventLog[0].status).toBe("delivered")
      expect(bus.eventLog[0].subscribers).toContain("sub-1")
    })

    it("구독자가 없는 이벤트 발행 시 pending 상태여야 한다", () => {
      let bus = createEventBus(100)
      const event = createEvent("system.alert", { level: "warn" }, source, metadata)
      bus = publish(bus, event)

      expect(bus.eventLog.length).toBe(1)
      expect(bus.eventLog[0].status).toBe("pending")
    })

    it("maxLogEntries를 초과하면 오래된 로그가 잘려야 한다", () => {
      let bus = createEventBus(3)
      for (let i = 0; i < 5; i++) {
        const event = createEvent("system.health_check", { i }, source, metadata)
        bus = publish(bus, event)
      }
      expect(bus.eventLog.length).toBe(3)
    })
  })

  describe("이벤트 통계", () => {
    it("빈 버스의 통계가 올바르게 반환되어야 한다", () => {
      const bus = createEventBus(100)
      const stats = getEventStats(bus)
      expect(stats.totalEvents).toBe(0)
      expect(stats.byStatus.delivered).toBe(0)
      expect(stats.byStatus.failed).toBe(0)
      expect(stats.avgDeliveryTimeMs).toBe(0)
    })

    it("여러 이벤트 발행 후 통계가 올바르게 계산되어야 한다", () => {
      let bus = createEventBus(100)
      bus = subscribe(bus, "sub-1", ["persona.created", "persona.updated"], "https://example.com")

      const event1 = createEvent("persona.created", {}, source, metadata)
      const event2 = createEvent("persona.updated", {}, source, metadata)
      const event3 = createEvent("system.alert", {}, source, metadata) // no subscriber

      bus = publish(bus, event1)
      bus = publish(bus, event2)
      bus = publish(bus, event3)

      const stats = getEventStats(bus)
      expect(stats.totalEvents).toBe(3)
      expect(stats.byStatus.delivered).toBe(2)
      expect(stats.byStatus.pending).toBe(1)
    })
  })

  describe("이벤트 필터링", () => {
    it("타입별 필터링이 동작해야 한다", () => {
      let bus = createEventBus(100)
      bus = subscribe(bus, "sub-1", ["persona.created", "system.alert"], "https://example.com")

      bus = publish(bus, createEvent("persona.created", {}, source, metadata))
      bus = publish(bus, createEvent("system.alert", {}, source, metadata))
      bus = publish(bus, createEvent("persona.created", {}, source, metadata))

      const filtered = getEventLog(bus, { eventTypes: ["persona.created"] })
      expect(filtered.length).toBe(2)
      expect(filtered.every((e) => e.event.eventType === "persona.created")).toBe(true)
    })

    it("상태별 필터링이 동작해야 한다", () => {
      let bus = createEventBus(100)
      bus = subscribe(bus, "sub-1", ["persona.created"], "https://example.com")

      bus = publish(bus, createEvent("persona.created", {}, source, metadata))
      bus = publish(bus, createEvent("system.alert", {}, source, metadata)) // pending

      const delivered = getEventLog(bus, { status: ["delivered"] })
      expect(delivered.length).toBe(1)
      expect(delivered[0].status).toBe("delivered")

      const pending = getEventLog(bus, { status: ["pending"] })
      expect(pending.length).toBe(1)
    })

    it("limit 필터링이 동작해야 한다", () => {
      let bus = createEventBus(100)
      for (let i = 0; i < 10; i++) {
        bus = publish(bus, createEvent("system.health_check", { i }, source, metadata))
      }
      const limited = getEventLog(bus, { limit: 3 })
      expect(limited.length).toBe(3)
    })

    it("빈 필터에서 전체 로그를 반환해야 한다", () => {
      let bus = createEventBus(100)
      bus = publish(bus, createEvent("system.alert", {}, source, metadata))
      bus = publish(bus, createEvent("persona.created", {}, source, metadata))

      const all = getEventLog(bus)
      expect(all.length).toBe(2)
    })
  })

  describe("Sync Delay Report", () => {
    it("전달된 이벤트의 지연 시간을 측정할 수 있어야 한다", () => {
      const now = Date.now()
      const metric = measureSyncDelay("evt_1", now - 100, now, SYNC_DELAY_TARGETS[0])
      expect(metric.delayMs).toBe(100)
      expect(metric.slaMet).toBe(true)
    })

    it("미전달 이벤트의 지연 시간은 null이어야 한다", () => {
      const metric = measureSyncDelay("evt_1", Date.now(), null, SYNC_DELAY_TARGETS[0])
      expect(metric.delayMs).toBeNull()
      expect(metric.slaMet).toBeNull()
    })

    it("SLA 위반 시 slaMet이 false여야 한다", () => {
      const now = Date.now()
      const metric = measureSyncDelay("evt_1", now - 10000, now, SYNC_DELAY_TARGETS[0])
      // SYNC_DELAY_TARGETS[0].slaMs = 5000
      expect(metric.slaMet).toBe(false)
    })

    it("리포트 생성이 올바르게 동작해야 한다", () => {
      const now = Date.now()
      const target = SYNC_DELAY_TARGETS[0]
      const metrics = [
        measureSyncDelay("evt_1", now - 100, now, target),
        measureSyncDelay("evt_2", now - 200, now, target),
        measureSyncDelay("evt_3", now - 50, now, target),
      ]
      const report = generateSyncDelayReport(metrics, target.name)
      expect(report.totalEvents).toBe(3)
      expect(report.deliveredEvents).toBe(3)
      expect(report.averageDelayMs).toBeGreaterThan(0)
      expect(report.slaCompliancePercent).toBe(100)
      expect(report.violations.length).toBe(0)
    })

    it("SLA 위반이 있는 리포트가 올바르게 생성되어야 한다", () => {
      const now = Date.now()
      const target = SYNC_DELAY_TARGETS[0]
      const metrics = [
        measureSyncDelay("evt_1", now - 100, now, target), // OK
        measureSyncDelay("evt_2", now - 8000, now, target), // violation
      ]
      const report = generateSyncDelayReport(metrics, target.name)
      expect(report.violations.length).toBe(1)
      expect(report.slaCompliancePercent).toBe(50)
    })
  })
})
