// ═══════════════════════════════════════════════════════════════
// Security Dashboard — 단위 테스트
// T155: 관리자 보안 대시보드
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import type { GateResult, GateVerdict, RuleViolation } from "@/types"
import type { IntegrityMonitorResult } from "@/lib/security/integrity-monitor"
import type { OutputSentinelResult, QuarantineEntry } from "@/lib/security/output-sentinel"
import type { SystemSafetyConfig, AutoTriggerResult } from "@/lib/security/kill-switch"
import type { ProvenanceData } from "@/lib/security/data-provenance"
import {
  aggregateGateGuardMetrics,
  extractIntegrityMetrics,
  aggregateOutputSentinelMetrics,
  extractKillSwitchMetrics,
  aggregateProvenanceMetrics,
  generateGateGuardAlerts,
  generateIntegrityAlerts,
  generateOutputSentinelAlerts,
  generateKillSwitchAlerts,
  determineOverallStatus,
  generateSecuritySummary,
  buildSecurityDashboard,
  filterAlertsByLayer,
  filterAlertsBySeverity,
  summarizeAlerts,
  filterAlertsByTimeRange,
  filterAlertsByPersona,
  compareSecuritySnapshots,
  type SecurityAlert,
  type SecurityDashboard,
  type GateGuardMetrics,
  type IntegrityMetrics,
  type OutputSentinelMetrics,
  type KillSwitchMetrics,
  type BuildSecurityDashboardInput,
} from "@/lib/security/security-dashboard"

// ── 헬퍼 ──────────────────────────────────────────────────────

function makeGateResult(overrides: Partial<GateResult> = {}): GateResult {
  return {
    verdict: "pass",
    ruleResult: { passed: true, violations: [] },
    processingTimeMs: 5,
    ...overrides,
  }
}

function makeBlockedGateResult(): GateResult {
  return makeGateResult({
    verdict: "blocked",
    ruleResult: {
      passed: false,
      violations: [
        {
          rule: "injection:ignore_previous",
          category: "injection",
          severity: "high",
          detail: "Injection pattern detected",
        },
      ],
    },
    processingTimeMs: 3,
  })
}

function makeSuspiciousGateResult(): GateResult {
  return makeGateResult({
    verdict: "suspicious",
    ruleResult: {
      passed: false,
      violations: [
        {
          rule: "structural:too_many_urls",
          category: "structural",
          severity: "medium",
          detail: "Too many URLs",
        },
      ],
    },
    processingTimeMs: 8,
  })
}

function makeIntegrityResult(
  overrides: Partial<IntegrityMonitorResult> = {}
): IntegrityMonitorResult {
  return {
    alertLevel: "ok",
    factbookIntegrity: { verified: true, hashMatch: true },
    drift: { status: "stable", similarity: 0.98, dominantDrift: null },
    changeLog: { flaggedContextIds: [], totalDailyChanges: 3, totalLimitExceeded: false },
    collective: { anomaly: "none", averageMood: 0.6, sampleSize: 5, isSufficientSample: true },
    alerts: [],
    ...overrides,
  }
}

function makeOutputResult(overrides: Partial<OutputSentinelResult> = {}): OutputSentinelResult {
  return {
    verdict: "clean",
    violations: [],
    shouldQuarantine: false,
    processingTimeMs: 2,
    ...overrides,
  }
}

function makeQuarantineEntry(overrides: Partial<QuarantineEntry> = {}): QuarantineEntry {
  return {
    id: "q-1",
    content: "test content",
    source: "post",
    personaId: "p-1",
    reason: "pii:email",
    violations: [],
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: Date.now(),
    ...overrides,
  }
}

function makeSafetyConfig(overrides: Partial<SystemSafetyConfig> = {}): SystemSafetyConfig {
  return {
    emergencyFreeze: false,
    featureToggles: {
      diffusion: { key: "diffusion", enabled: false, disabledReason: "v4.2 예정" },
      reflection: { key: "reflection", enabled: false, disabledReason: "v4.1 예정" },
      emotionalContagion: {
        key: "emotionalContagion",
        enabled: false,
        disabledReason: "v4.2 예정",
      },
      arena: { key: "arena", enabled: true },
      evolution: { key: "evolution", enabled: true },
      autonomousPosting: { key: "autonomousPosting", enabled: true },
    },
    autoTriggers: {
      quarantineThreshold: 50,
      quarantineWindowMs: 600000,
      collectiveMoodWarning: 0.2,
      driftCriticalRatio: 0.2,
      driftCriticalThreshold: 0.7,
    },
    updatedAt: Date.now(),
    updatedBy: "admin",
    ...overrides,
  }
}

function makeProvenance(overrides: Partial<ProvenanceData> = {}): ProvenanceData {
  return {
    source: "DIRECT",
    trustLevel: 1.0,
    propagationDepth: 0,
    originPersonaId: null,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. Gate Guard 메트릭 집계
// ═══════════════════════════════════════════════════════════════

describe("aggregateGateGuardMetrics", () => {
  it("빈 배열에서 기본 메트릭 반환", () => {
    const metrics = aggregateGateGuardMetrics([])
    expect(metrics.totalChecks).toBe(0)
    expect(metrics.blockRate).toBe(0)
    expect(metrics.avgProcessingTimeMs).toBe(0)
    expect(metrics.verdictCounts.pass).toBe(0)
    expect(metrics.verdictCounts.blocked).toBe(0)
  })

  it("판정별 카운트 집계", () => {
    const results = [
      makeGateResult({ verdict: "pass" }),
      makeGateResult({ verdict: "pass" }),
      makeBlockedGateResult(),
      makeSuspiciousGateResult(),
    ]
    const metrics = aggregateGateGuardMetrics(results)
    expect(metrics.totalChecks).toBe(4)
    expect(metrics.verdictCounts.pass).toBe(2)
    expect(metrics.verdictCounts.blocked).toBe(1)
    expect(metrics.verdictCounts.suspicious).toBe(1)
  })

  it("차단률 계산", () => {
    const results = [
      makeBlockedGateResult(),
      makeBlockedGateResult(),
      makeGateResult({ verdict: "pass" }),
      makeGateResult({ verdict: "pass" }),
      makeGateResult({ verdict: "pass" }),
    ]
    const metrics = aggregateGateGuardMetrics(results)
    expect(metrics.blockRate).toBe(0.4)
  })

  it("카테고리별 위반 집계", () => {
    const results = [
      makeBlockedGateResult(), // injection
      makeBlockedGateResult(), // injection
      makeSuspiciousGateResult(), // structural
    ]
    const metrics = aggregateGateGuardMetrics(results)
    expect(metrics.violationsByCategory["injection"]).toBe(2)
    expect(metrics.violationsByCategory["structural"]).toBe(1)
  })

  it("평균 처리 시간 계산", () => {
    const results = [
      makeGateResult({ processingTimeMs: 10 }),
      makeGateResult({ processingTimeMs: 20 }),
    ]
    const metrics = aggregateGateGuardMetrics(results)
    expect(metrics.avgProcessingTimeMs).toBe(15)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Integrity Monitor 메트릭 추출
// ═══════════════════════════════════════════════════════════════

describe("extractIntegrityMetrics", () => {
  it("정상 상태 추출", () => {
    const result = makeIntegrityResult()
    const metrics = extractIntegrityMetrics(result)
    expect(metrics.factbookIntact).toBe(true)
    expect(metrics.driftStatus).toBe("stable")
    expect(metrics.driftSimilarity).toBe(0.98)
    expect(metrics.flaggedContextCount).toBe(0)
    expect(metrics.collectiveAnomaly).toBe("none")
    expect(metrics.alertLevel).toBe("ok")
  })

  it("위험 상태 추출", () => {
    const result = makeIntegrityResult({
      alertLevel: "critical",
      factbookIntegrity: { verified: false, hashMatch: false },
      drift: {
        status: "critical",
        similarity: 0.65,
        dominantDrift: { dimension: "depth", delta: 0.4 },
      },
      changeLog: {
        flaggedContextIds: ["ctx-1", "ctx-2"],
        totalDailyChanges: 25,
        totalLimitExceeded: true,
      },
      collective: {
        anomaly: "depression",
        averageMood: 0.2,
        sampleSize: 10,
        isSufficientSample: true,
      },
    })
    const metrics = extractIntegrityMetrics(result)
    expect(metrics.factbookIntact).toBe(false)
    expect(metrics.driftStatus).toBe("critical")
    expect(metrics.flaggedContextCount).toBe(2)
    expect(metrics.dailyTotalChanges).toBe(25)
    expect(metrics.collectiveAnomaly).toBe("depression")
    expect(metrics.collectiveAverageMood).toBe(0.2)
    expect(metrics.alertLevel).toBe("critical")
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Output Sentinel 메트릭 집계
// ═══════════════════════════════════════════════════════════════

describe("aggregateOutputSentinelMetrics", () => {
  it("빈 배열에서 기본 메트릭 반환", () => {
    const metrics = aggregateOutputSentinelMetrics([], [])
    expect(metrics.totalChecks).toBe(0)
    expect(metrics.pendingQuarantineCount).toBe(0)
    expect(metrics.totalQuarantineCount).toBe(0)
  })

  it("판정별 카운트 집계", () => {
    const results = [
      makeOutputResult({ verdict: "clean" }),
      makeOutputResult({ verdict: "clean" }),
      makeOutputResult({
        verdict: "blocked",
        violations: [{ category: "pii", rule: "pii:email", severity: "high", detail: "PII" }],
      }),
      makeOutputResult({
        verdict: "flagged",
        violations: [
          { category: "profanity", rule: "profanity:test", severity: "medium", detail: "Bad" },
        ],
      }),
    ]
    const metrics = aggregateOutputSentinelMetrics(results, [])
    expect(metrics.verdictCounts.clean).toBe(2)
    expect(metrics.verdictCounts.blocked).toBe(1)
    expect(metrics.verdictCounts.flagged).toBe(1)
    expect(metrics.violationsByCategory["pii"]).toBe(1)
    expect(metrics.violationsByCategory["profanity"]).toBe(1)
  })

  it("격리 상태별 카운트 집계", () => {
    const entries = [
      makeQuarantineEntry({ status: "pending" }),
      makeQuarantineEntry({ status: "pending" }),
      makeQuarantineEntry({ status: "approved" }),
      makeQuarantineEntry({ status: "rejected" }),
    ]
    const metrics = aggregateOutputSentinelMetrics([], entries)
    expect(metrics.pendingQuarantineCount).toBe(2)
    expect(metrics.totalQuarantineCount).toBe(4)
    expect(metrics.quarantineByStatus.pending).toBe(2)
    expect(metrics.quarantineByStatus.approved).toBe(1)
    expect(metrics.quarantineByStatus.rejected).toBe(1)
    expect(metrics.quarantineByStatus.deleted).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Kill Switch 메트릭 추출
// ═══════════════════════════════════════════════════════════════

describe("extractKillSwitchMetrics", () => {
  it("정상 상태 추출", () => {
    const config = makeSafetyConfig()
    const metrics = extractKillSwitchMetrics(config, [])
    expect(metrics.emergencyFreeze).toBe(false)
    expect(metrics.freezeReason).toBeNull()
    expect(metrics.enabledFeatureCount).toBe(3) // arena, evolution, autonomousPosting
    expect(metrics.totalFeatureCount).toBe(6)
    expect(metrics.featureStatuses.length).toBe(6)
  })

  it("동결 상태에서는 활성 기능 0", () => {
    const config = makeSafetyConfig({
      emergencyFreeze: true,
      freezeReason: "긴급 상황",
    })
    const metrics = extractKillSwitchMetrics(config, [])
    expect(metrics.emergencyFreeze).toBe(true)
    expect(metrics.freezeReason).toBe("긴급 상황")
    expect(metrics.enabledFeatureCount).toBe(0)
  })

  it("자동 트리거 결과 포함", () => {
    const triggers: AutoTriggerResult[] = [
      { action: "warning", reason: "격리 25건", triggeredAt: 1000 },
      { action: "freeze", reason: "드리프트 25%", triggeredAt: 2000 },
    ]
    const metrics = extractKillSwitchMetrics(makeSafetyConfig(), triggers)
    expect(metrics.autoTriggerResults.length).toBe(2)
    expect(metrics.autoTriggerResults[0].action).toBe("warning")
    expect(metrics.autoTriggerResults[1].action).toBe("freeze")
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Provenance 메트릭 집계
// ═══════════════════════════════════════════════════════════════

describe("aggregateProvenanceMetrics", () => {
  it("빈 배열에서 기본 메트릭 반환", () => {
    const metrics = aggregateProvenanceMetrics([])
    expect(metrics.totalEntries).toBe(0)
    expect(metrics.averageTrust).toBe(0)
    expect(metrics.quarantinedCount).toBe(0)
    expect(metrics.maxPropagationDepth).toBe(0)
    expect(metrics.trustDistribution.high).toBe(0)
  })

  it("신뢰도 분포 올바르게 분류", () => {
    const entries = [
      makeProvenance({ trustLevel: 1.0 }), // high
      makeProvenance({ trustLevel: 0.8 }), // high
      makeProvenance({ trustLevel: 0.7 }), // medium
      makeProvenance({ trustLevel: 0.5 }), // medium
      makeProvenance({ trustLevel: 0.3 }), // low
      makeProvenance({ trustLevel: 0.1 }), // minimal
    ]
    const metrics = aggregateProvenanceMetrics(entries)
    expect(metrics.totalEntries).toBe(6)
    expect(metrics.trustDistribution.high).toBe(2)
    expect(metrics.trustDistribution.medium).toBe(2)
    expect(metrics.trustDistribution.low).toBe(1)
    expect(metrics.trustDistribution.minimal).toBe(1)
  })

  it("격리 대상 카운트 (depth >= 3 또는 trust === 0)", () => {
    const entries = [
      makeProvenance({ propagationDepth: 3, trustLevel: 0 }),
      makeProvenance({ propagationDepth: 0, trustLevel: 0 }),
      makeProvenance({ propagationDepth: 4, trustLevel: 0.5 }),
      makeProvenance({ propagationDepth: 1, trustLevel: 0.8 }),
    ]
    const metrics = aggregateProvenanceMetrics(entries)
    expect(metrics.quarantinedCount).toBe(3) // depth>=3: 2건, trust===0: 1건 (1건 중복)
    expect(metrics.maxPropagationDepth).toBe(4)
  })

  it("평균 신뢰도 계산", () => {
    const entries = [makeProvenance({ trustLevel: 1.0 }), makeProvenance({ trustLevel: 0.5 })]
    const metrics = aggregateProvenanceMetrics(entries)
    expect(metrics.averageTrust).toBe(0.75)
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. Gate Guard 알림 생성
// ═══════════════════════════════════════════════════════════════

describe("generateGateGuardAlerts", () => {
  it("정상 상태에서 알림 없음", () => {
    const metrics: GateGuardMetrics = {
      totalChecks: 100,
      verdictCounts: { pass: 95, suspicious: 5, blocked: 0 },
      violationsByCategory: {},
      blockRate: 0,
      avgProcessingTimeMs: 5,
    }
    const alerts = generateGateGuardAlerts(metrics)
    expect(alerts.length).toBe(0)
  })

  it("차단률 10% 초과 시 경고 알림", () => {
    const metrics: GateGuardMetrics = {
      totalChecks: 100,
      verdictCounts: { pass: 85, suspicious: 0, blocked: 15 },
      violationsByCategory: {},
      blockRate: 0.15,
      avgProcessingTimeMs: 5,
    }
    const alerts = generateGateGuardAlerts(metrics)
    expect(alerts.some((a) => a.severity === "warning")).toBe(true)
  })

  it("차단률 30% 초과 시 critical 알림", () => {
    const metrics: GateGuardMetrics = {
      totalChecks: 100,
      verdictCounts: { pass: 60, suspicious: 0, blocked: 40 },
      violationsByCategory: {},
      blockRate: 0.4,
      avgProcessingTimeMs: 5,
    }
    const alerts = generateGateGuardAlerts(metrics)
    expect(alerts.some((a) => a.severity === "critical")).toBe(true)
  })

  it("인젝션 공격 감지 알림", () => {
    const metrics: GateGuardMetrics = {
      totalChecks: 10,
      verdictCounts: { pass: 7, suspicious: 0, blocked: 3 },
      violationsByCategory: { injection: 3 },
      blockRate: 0.3,
      avgProcessingTimeMs: 5,
    }
    const alerts = generateGateGuardAlerts(metrics)
    const injectionAlert = alerts.find((a) => a.title === "인젝션 공격 감지")
    expect(injectionAlert).toBeDefined()
  })

  it("인젝션 5건 이상이면 critical", () => {
    const metrics: GateGuardMetrics = {
      totalChecks: 20,
      verdictCounts: { pass: 15, suspicious: 0, blocked: 5 },
      violationsByCategory: { injection: 5 },
      blockRate: 0.25,
      avgProcessingTimeMs: 5,
    }
    const alerts = generateGateGuardAlerts(metrics)
    const injectionAlert = alerts.find((a) => a.title === "인젝션 공격 감지")
    expect(injectionAlert?.severity).toBe("critical")
  })

  it("검사 10건 미만이면 차단률 알림 미발생", () => {
    const metrics: GateGuardMetrics = {
      totalChecks: 5,
      verdictCounts: { pass: 2, suspicious: 0, blocked: 3 },
      violationsByCategory: {},
      blockRate: 0.6,
      avgProcessingTimeMs: 5,
    }
    const alerts = generateGateGuardAlerts(metrics)
    const blockAlerts = alerts.filter((a) => a.title.includes("차단률"))
    expect(blockAlerts.length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Integrity 알림 생성
// ═══════════════════════════════════════════════════════════════

describe("generateIntegrityAlerts", () => {
  it("정상 상태에서 알림 없음", () => {
    const metrics: IntegrityMetrics = {
      factbookIntact: true,
      driftStatus: "stable",
      driftSimilarity: 0.98,
      flaggedContextCount: 0,
      dailyTotalChanges: 3,
      collectiveAnomaly: "none",
      collectiveAverageMood: 0.6,
      alertLevel: "ok",
    }
    const alerts = generateIntegrityAlerts(metrics)
    expect(alerts.length).toBe(0)
  })

  it("팩트북 변조 시 critical 알림", () => {
    const metrics: IntegrityMetrics = {
      factbookIntact: false,
      driftStatus: "stable",
      driftSimilarity: 0.98,
      flaggedContextCount: 0,
      dailyTotalChanges: 0,
      collectiveAnomaly: "none",
      collectiveAverageMood: 0.6,
      alertLevel: "critical",
    }
    const alerts = generateIntegrityAlerts(metrics)
    expect(alerts.length).toBe(1)
    expect(alerts[0].severity).toBe("critical")
    expect(alerts[0].layer).toBe("integrity_monitor")
  })

  it("드리프트 critical 시 알림", () => {
    const metrics: IntegrityMetrics = {
      factbookIntact: true,
      driftStatus: "critical",
      driftSimilarity: 0.65,
      flaggedContextCount: 0,
      dailyTotalChanges: 0,
      collectiveAnomaly: "none",
      collectiveAverageMood: 0.6,
      alertLevel: "critical",
    }
    const alerts = generateIntegrityAlerts(metrics)
    const driftAlert = alerts.find((a) => a.title.includes("드리프트"))
    expect(driftAlert).toBeDefined()
    expect(driftAlert?.severity).toBe("critical")
  })

  it("드리프트 warning 시 알림 (autoResolvable)", () => {
    const metrics: IntegrityMetrics = {
      factbookIntact: true,
      driftStatus: "warning",
      driftSimilarity: 0.82,
      flaggedContextCount: 0,
      dailyTotalChanges: 0,
      collectiveAnomaly: "none",
      collectiveAverageMood: 0.6,
      alertLevel: "warning",
    }
    const alerts = generateIntegrityAlerts(metrics)
    expect(alerts.length).toBe(1)
    expect(alerts[0].severity).toBe("warning")
    expect(alerts[0].autoResolvable).toBe(true)
  })

  it("집단 우울 경고", () => {
    const metrics: IntegrityMetrics = {
      factbookIntact: true,
      driftStatus: "stable",
      driftSimilarity: 0.98,
      flaggedContextCount: 0,
      dailyTotalChanges: 0,
      collectiveAnomaly: "depression",
      collectiveAverageMood: 0.2,
      alertLevel: "warning",
    }
    const alerts = generateIntegrityAlerts(metrics)
    expect(alerts.some((a) => a.title.includes("우울"))).toBe(true)
  })

  it("집단 흥분 경고", () => {
    const metrics: IntegrityMetrics = {
      factbookIntact: true,
      driftStatus: "stable",
      driftSimilarity: 0.98,
      flaggedContextCount: 0,
      dailyTotalChanges: 0,
      collectiveAnomaly: "euphoria",
      collectiveAverageMood: 0.95,
      alertLevel: "warning",
    }
    const alerts = generateIntegrityAlerts(metrics)
    expect(alerts.some((a) => a.title.includes("흥분"))).toBe(true)
  })

  it("과도한 변경 경고", () => {
    const metrics: IntegrityMetrics = {
      factbookIntact: true,
      driftStatus: "stable",
      driftSimilarity: 0.98,
      flaggedContextCount: 3,
      dailyTotalChanges: 15,
      collectiveAnomaly: "none",
      collectiveAverageMood: 0.6,
      alertLevel: "warning",
    }
    const alerts = generateIntegrityAlerts(metrics)
    expect(alerts.some((a) => a.title.includes("변경"))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. Output Sentinel 알림 생성
// ═══════════════════════════════════════════════════════════════

describe("generateOutputSentinelAlerts", () => {
  it("정상 상태에서 알림 없음", () => {
    const metrics: OutputSentinelMetrics = {
      totalChecks: 50,
      verdictCounts: { clean: 50, flagged: 0, blocked: 0 },
      violationsByCategory: {},
      pendingQuarantineCount: 0,
      totalQuarantineCount: 0,
      quarantineByStatus: { pending: 0, approved: 0, rejected: 0, deleted: 0 },
    }
    const alerts = generateOutputSentinelAlerts(metrics)
    expect(alerts.length).toBe(0)
  })

  it("PII 유출 시 critical 알림", () => {
    const metrics: OutputSentinelMetrics = {
      totalChecks: 50,
      verdictCounts: { clean: 48, flagged: 0, blocked: 2 },
      violationsByCategory: { pii: 2 },
      pendingQuarantineCount: 2,
      totalQuarantineCount: 2,
      quarantineByStatus: { pending: 2, approved: 0, rejected: 0, deleted: 0 },
    }
    const alerts = generateOutputSentinelAlerts(metrics)
    expect(alerts.some((a) => a.title.includes("PII") && a.severity === "critical")).toBe(true)
  })

  it("시스템 유출 시 critical 알림", () => {
    const metrics: OutputSentinelMetrics = {
      totalChecks: 50,
      verdictCounts: { clean: 49, flagged: 0, blocked: 1 },
      violationsByCategory: { system_leak: 1 },
      pendingQuarantineCount: 1,
      totalQuarantineCount: 1,
      quarantineByStatus: { pending: 1, approved: 0, rejected: 0, deleted: 0 },
    }
    const alerts = generateOutputSentinelAlerts(metrics)
    expect(alerts.some((a) => a.title.includes("시스템 정보") && a.severity === "critical")).toBe(
      true
    )
  })

  it("격리 대기 10건 이상 시 경고", () => {
    const metrics: OutputSentinelMetrics = {
      totalChecks: 100,
      verdictCounts: { clean: 90, flagged: 10, blocked: 0 },
      violationsByCategory: {},
      pendingQuarantineCount: 15,
      totalQuarantineCount: 20,
      quarantineByStatus: { pending: 15, approved: 3, rejected: 2, deleted: 0 },
    }
    const alerts = generateOutputSentinelAlerts(metrics)
    expect(alerts.some((a) => a.title.includes("격리"))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. Kill Switch 알림 생성
// ═══════════════════════════════════════════════════════════════

describe("generateKillSwitchAlerts", () => {
  it("정상 상태에서 알림 없음", () => {
    const metrics: KillSwitchMetrics = {
      emergencyFreeze: false,
      freezeReason: null,
      enabledFeatureCount: 3,
      totalFeatureCount: 6,
      featureStatuses: [],
      autoTriggerResults: [],
    }
    const alerts = generateKillSwitchAlerts(metrics)
    expect(alerts.length).toBe(0)
  })

  it("긴급 동결 시 critical 알림", () => {
    const metrics: KillSwitchMetrics = {
      emergencyFreeze: true,
      freezeReason: "공격 감지",
      enabledFeatureCount: 0,
      totalFeatureCount: 6,
      featureStatuses: [],
      autoTriggerResults: [],
    }
    const alerts = generateKillSwitchAlerts(metrics)
    expect(alerts.length).toBe(1)
    expect(alerts[0].severity).toBe("critical")
    expect(alerts[0].message).toContain("공격 감지")
  })

  it("자동 트리거 freeze 시 critical 알림", () => {
    const metrics: KillSwitchMetrics = {
      emergencyFreeze: false,
      freezeReason: null,
      enabledFeatureCount: 3,
      totalFeatureCount: 6,
      featureStatuses: [],
      autoTriggerResults: [{ action: "freeze", reason: "드리프트 25%", triggeredAt: 1000 }],
    }
    const alerts = generateKillSwitchAlerts(metrics)
    expect(alerts.some((a) => a.severity === "critical")).toBe(true)
  })

  it("자동 트리거 warning 시 경고 알림", () => {
    const metrics: KillSwitchMetrics = {
      emergencyFreeze: false,
      freezeReason: null,
      enabledFeatureCount: 3,
      totalFeatureCount: 6,
      featureStatuses: [],
      autoTriggerResults: [{ action: "warning", reason: "격리 25건", triggeredAt: 1000 }],
    }
    const alerts = generateKillSwitchAlerts(metrics)
    expect(alerts.length).toBe(1)
    expect(alerts[0].severity).toBe("warning")
  })

  it("action=none 트리거는 무시", () => {
    const metrics: KillSwitchMetrics = {
      emergencyFreeze: false,
      freezeReason: null,
      enabledFeatureCount: 3,
      totalFeatureCount: 6,
      featureStatuses: [],
      autoTriggerResults: [{ action: "none", reason: "", triggeredAt: 1000 }],
    }
    const alerts = generateKillSwitchAlerts(metrics)
    expect(alerts.length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 10. 전체 보안 상태 판정
// ═══════════════════════════════════════════════════════════════

describe("determineOverallStatus", () => {
  it("동결 시 frozen", () => {
    expect(determineOverallStatus([], true)).toBe("frozen")
  })

  it("critical 알림 시 critical", () => {
    const alerts: SecurityAlert[] = [
      {
        id: "a1",
        layer: "gate_guard",
        severity: "critical",
        title: "test",
        message: "test",
        timestamp: Date.now(),
        personaId: null,
        autoResolvable: false,
      },
    ]
    expect(determineOverallStatus(alerts, false)).toBe("critical")
  })

  it("warning 알림 시 warning", () => {
    const alerts: SecurityAlert[] = [
      {
        id: "a1",
        layer: "gate_guard",
        severity: "warning",
        title: "test",
        message: "test",
        timestamp: Date.now(),
        personaId: null,
        autoResolvable: true,
      },
    ]
    expect(determineOverallStatus(alerts, false)).toBe("warning")
  })

  it("알림 없으면 healthy", () => {
    expect(determineOverallStatus([], false)).toBe("healthy")
  })

  it("동결 + critical 알림이면 frozen 우선", () => {
    const alerts: SecurityAlert[] = [
      {
        id: "a1",
        layer: "gate_guard",
        severity: "critical",
        title: "test",
        message: "test",
        timestamp: Date.now(),
        personaId: null,
        autoResolvable: false,
      },
    ]
    expect(determineOverallStatus(alerts, true)).toBe("frozen")
  })
})

// ═══════════════════════════════════════════════════════════════
// 11. 보안 대시보드 빌드
// ═══════════════════════════════════════════════════════════════

describe("buildSecurityDashboard", () => {
  function makeDefaultInput(): BuildSecurityDashboardInput {
    return {
      gateResults: [makeGateResult(), makeGateResult()],
      integrityResult: makeIntegrityResult(),
      outputResults: [makeOutputResult(), makeOutputResult()],
      quarantineEntries: [],
      safetyConfig: makeSafetyConfig(),
      triggerResults: [],
      provenanceEntries: [makeProvenance()],
    }
  }

  it("정상 상태에서 healthy 대시보드 생성", () => {
    const dashboard = buildSecurityDashboard(makeDefaultInput())
    expect(dashboard.overallStatus).toBe("healthy")
    expect(dashboard.gateGuard.totalChecks).toBe(2)
    expect(dashboard.integrity.factbookIntact).toBe(true)
    expect(dashboard.outputSentinel.totalChecks).toBe(2)
    expect(dashboard.killSwitch.emergencyFreeze).toBe(false)
    expect(dashboard.provenance.totalEntries).toBe(1)
    expect(dashboard.alerts.length).toBe(0)
    expect(dashboard.summary).toContain("정상")
  })

  it("위험 상태에서 critical 대시보드 생성", () => {
    const input = makeDefaultInput()
    input.integrityResult = makeIntegrityResult({
      alertLevel: "critical",
      factbookIntegrity: { verified: false, hashMatch: false },
    })
    const dashboard = buildSecurityDashboard(input)
    expect(dashboard.overallStatus).toBe("critical")
    expect(dashboard.alerts.length).toBeGreaterThan(0)
    expect(dashboard.alerts[0].severity).toBe("critical")
  })

  it("긴급 동결 시 frozen 대시보드 생성", () => {
    const input = makeDefaultInput()
    input.safetyConfig = makeSafetyConfig({
      emergencyFreeze: true,
      freezeReason: "테스트 동결",
    })
    const dashboard = buildSecurityDashboard(input)
    expect(dashboard.overallStatus).toBe("frozen")
    expect(dashboard.killSwitch.emergencyFreeze).toBe(true)
  })

  it("알림이 심각도 순으로 정렬됨", () => {
    const input = makeDefaultInput()
    // Integrity: warning (drift warning)
    input.integrityResult = makeIntegrityResult({
      alertLevel: "warning",
      drift: { status: "warning", similarity: 0.82, dominantDrift: null },
    })
    // Output: critical (PII)
    input.outputResults = [
      makeOutputResult({
        verdict: "blocked",
        violations: [{ category: "pii", rule: "pii:email", severity: "high", detail: "PII" }],
      }),
    ]
    const dashboard = buildSecurityDashboard(input)
    if (dashboard.alerts.length >= 2) {
      // critical이 먼저 와야 함
      const firstCriticalIdx = dashboard.alerts.findIndex((a) => a.severity === "critical")
      const firstWarningIdx = dashboard.alerts.findIndex((a) => a.severity === "warning")
      if (firstCriticalIdx >= 0 && firstWarningIdx >= 0) {
        expect(firstCriticalIdx).toBeLessThan(firstWarningIdx)
      }
    }
  })

  it("summary 텍스트 생성", () => {
    const dashboard = buildSecurityDashboard(makeDefaultInput())
    expect(dashboard.summary.length).toBeGreaterThan(0)
    expect(dashboard.summary).toContain("보안 상태")
  })

  it("updatedAt이 현재 시각 부근", () => {
    const before = Date.now()
    const dashboard = buildSecurityDashboard(makeDefaultInput())
    const after = Date.now()
    expect(dashboard.updatedAt).toBeGreaterThanOrEqual(before)
    expect(dashboard.updatedAt).toBeLessThanOrEqual(after)
  })
})

// ═══════════════════════════════════════════════════════════════
// 12. 요약 텍스트 생성
// ═══════════════════════════════════════════════════════════════

describe("generateSecuritySummary", () => {
  it("healthy 상태 요약", () => {
    const dashboard = buildSecurityDashboard({
      gateResults: [makeGateResult()],
      integrityResult: makeIntegrityResult(),
      outputResults: [makeOutputResult()],
      quarantineEntries: [],
      safetyConfig: makeSafetyConfig(),
      triggerResults: [],
      provenanceEntries: [],
    })
    const summary = generateSecuritySummary(dashboard)
    expect(summary).toContain("정상")
    expect(summary).toContain("입력 보안")
    expect(summary).toContain("무결성")
    expect(summary).toContain("출력 보안")
    expect(summary).toContain("킬 스위치")
  })

  it("동결 상태 요약", () => {
    const dashboard = buildSecurityDashboard({
      gateResults: [],
      integrityResult: makeIntegrityResult(),
      outputResults: [],
      quarantineEntries: [],
      safetyConfig: makeSafetyConfig({ emergencyFreeze: true, freezeReason: "공격" }),
      triggerResults: [],
      provenanceEntries: [],
    })
    const summary = generateSecuritySummary(dashboard)
    expect(summary).toContain("긴급 동결")
  })
})

// ═══════════════════════════════════════════════════════════════
// 13. 알림 필터링 유틸리티
// ═══════════════════════════════════════════════════════════════

describe("filterAlertsByLayer", () => {
  const alerts: SecurityAlert[] = [
    {
      id: "a1",
      layer: "gate_guard",
      severity: "warning",
      title: "GG",
      message: "",
      timestamp: 1000,
      personaId: null,
      autoResolvable: false,
    },
    {
      id: "a2",
      layer: "integrity_monitor",
      severity: "critical",
      title: "IM",
      message: "",
      timestamp: 2000,
      personaId: null,
      autoResolvable: false,
    },
    {
      id: "a3",
      layer: "output_sentinel",
      severity: "warning",
      title: "OS",
      message: "",
      timestamp: 3000,
      personaId: "p-1",
      autoResolvable: true,
    },
  ]

  it("계층별 필터링", () => {
    expect(filterAlertsByLayer(alerts, "gate_guard").length).toBe(1)
    expect(filterAlertsByLayer(alerts, "integrity_monitor").length).toBe(1)
    expect(filterAlertsByLayer(alerts, "output_sentinel").length).toBe(1)
    expect(filterAlertsByLayer(alerts, "kill_switch").length).toBe(0)
  })
})

describe("filterAlertsBySeverity", () => {
  const alerts: SecurityAlert[] = [
    {
      id: "a1",
      layer: "gate_guard",
      severity: "info",
      title: "Info",
      message: "",
      timestamp: 1000,
      personaId: null,
      autoResolvable: false,
    },
    {
      id: "a2",
      layer: "gate_guard",
      severity: "warning",
      title: "Warn",
      message: "",
      timestamp: 2000,
      personaId: null,
      autoResolvable: false,
    },
    {
      id: "a3",
      layer: "gate_guard",
      severity: "critical",
      title: "Crit",
      message: "",
      timestamp: 3000,
      personaId: null,
      autoResolvable: false,
    },
  ]

  it("info 이상 → 전체", () => {
    expect(filterAlertsBySeverity(alerts, "info").length).toBe(3)
  })

  it("warning 이상 → warning + critical", () => {
    expect(filterAlertsBySeverity(alerts, "warning").length).toBe(2)
  })

  it("critical 이상 → critical만", () => {
    expect(filterAlertsBySeverity(alerts, "critical").length).toBe(1)
  })
})

describe("summarizeAlerts", () => {
  it("알림 요약 통계", () => {
    const alerts: SecurityAlert[] = [
      {
        id: "a1",
        layer: "gate_guard",
        severity: "warning",
        title: "T1",
        message: "",
        timestamp: 1000,
        personaId: null,
        autoResolvable: true,
      },
      {
        id: "a2",
        layer: "integrity_monitor",
        severity: "critical",
        title: "T2",
        message: "",
        timestamp: 2000,
        personaId: null,
        autoResolvable: false,
      },
      {
        id: "a3",
        layer: "gate_guard",
        severity: "warning",
        title: "T3",
        message: "",
        timestamp: 3000,
        personaId: null,
        autoResolvable: true,
      },
    ]
    const summary = summarizeAlerts(alerts)
    expect(summary.total).toBe(3)
    expect(summary.bySeverity.warning).toBe(2)
    expect(summary.bySeverity.critical).toBe(1)
    expect(summary.bySeverity.info).toBe(0)
    expect(summary.byLayer.gate_guard).toBe(2)
    expect(summary.byLayer.integrity_monitor).toBe(1)
    expect(summary.autoResolvableCount).toBe(2)
  })
})

describe("filterAlertsByTimeRange", () => {
  const alerts: SecurityAlert[] = [
    {
      id: "a1",
      layer: "gate_guard",
      severity: "info",
      title: "T1",
      message: "",
      timestamp: 1000,
      personaId: null,
      autoResolvable: false,
    },
    {
      id: "a2",
      layer: "gate_guard",
      severity: "info",
      title: "T2",
      message: "",
      timestamp: 5000,
      personaId: null,
      autoResolvable: false,
    },
    {
      id: "a3",
      layer: "gate_guard",
      severity: "info",
      title: "T3",
      message: "",
      timestamp: 9000,
      personaId: null,
      autoResolvable: false,
    },
  ]

  it("시간 범위 필터링", () => {
    expect(filterAlertsByTimeRange(alerts, 2000, 8000).length).toBe(1)
    expect(filterAlertsByTimeRange(alerts, 0, 10000).length).toBe(3)
    expect(filterAlertsByTimeRange(alerts, 6000, 10000).length).toBe(1)
  })
})

describe("filterAlertsByPersona", () => {
  const alerts: SecurityAlert[] = [
    {
      id: "a1",
      layer: "gate_guard",
      severity: "info",
      title: "T1",
      message: "",
      timestamp: 1000,
      personaId: "p-1",
      autoResolvable: false,
    },
    {
      id: "a2",
      layer: "gate_guard",
      severity: "info",
      title: "T2",
      message: "",
      timestamp: 2000,
      personaId: "p-2",
      autoResolvable: false,
    },
    {
      id: "a3",
      layer: "gate_guard",
      severity: "info",
      title: "T3",
      message: "",
      timestamp: 3000,
      personaId: null,
      autoResolvable: false,
    },
  ]

  it("페르소나별 필터링", () => {
    expect(filterAlertsByPersona(alerts, "p-1").length).toBe(1)
    expect(filterAlertsByPersona(alerts, "p-2").length).toBe(1)
    expect(filterAlertsByPersona(alerts, "p-3").length).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 14. 스냅샷 비교
// ═══════════════════════════════════════════════════════════════

describe("compareSecuritySnapshots", () => {
  function makeBaseDashboard(overrides: Partial<SecurityDashboard> = {}): SecurityDashboard {
    return {
      overallStatus: "healthy",
      updatedAt: Date.now(),
      gateGuard: {
        totalChecks: 10,
        verdictCounts: { pass: 10, suspicious: 0, blocked: 0 },
        violationsByCategory: {},
        blockRate: 0,
        avgProcessingTimeMs: 5,
      },
      integrity: {
        factbookIntact: true,
        driftStatus: "stable",
        driftSimilarity: 0.98,
        flaggedContextCount: 0,
        dailyTotalChanges: 0,
        collectiveAnomaly: "none",
        collectiveAverageMood: 0.6,
        alertLevel: "ok",
      },
      outputSentinel: {
        totalChecks: 10,
        verdictCounts: { clean: 10, flagged: 0, blocked: 0 },
        violationsByCategory: {},
        pendingQuarantineCount: 0,
        totalQuarantineCount: 0,
        quarantineByStatus: { pending: 0, approved: 0, rejected: 0, deleted: 0 },
      },
      killSwitch: {
        emergencyFreeze: false,
        freezeReason: null,
        enabledFeatureCount: 3,
        totalFeatureCount: 6,
        featureStatuses: [],
        autoTriggerResults: [],
      },
      provenance: {
        totalEntries: 0,
        averageTrust: 0,
        quarantinedCount: 0,
        maxPropagationDepth: 0,
        trustDistribution: { high: 0, medium: 0, low: 0, minimal: 0 },
      },
      alerts: [],
      summary: "",
      ...overrides,
    }
  }

  it("동일 상태면 변경 없음", () => {
    const a = makeBaseDashboard()
    const b = makeBaseDashboard()
    const diff = compareSecuritySnapshots(a, b)
    expect(diff.statusChanged).toBe(false)
    expect(diff.newAlertCount).toBe(0)
    expect(diff.resolvedAlertCount).toBe(0)
    expect(diff.degraded).toBe(false)
  })

  it("상태 악화 감지", () => {
    const a = makeBaseDashboard({ overallStatus: "healthy" })
    const b = makeBaseDashboard({
      overallStatus: "critical",
      alerts: [
        {
          id: "new-1",
          layer: "gate_guard",
          severity: "critical",
          title: "T",
          message: "",
          timestamp: 1000,
          personaId: null,
          autoResolvable: false,
        },
      ],
    })
    const diff = compareSecuritySnapshots(a, b)
    expect(diff.statusChanged).toBe(true)
    expect(diff.degraded).toBe(true)
    expect(diff.newAlertCount).toBe(1)
    expect(diff.previousStatus).toBe("healthy")
    expect(diff.currentStatus).toBe("critical")
  })

  it("상태 개선 감지", () => {
    const a = makeBaseDashboard({
      overallStatus: "warning",
      alerts: [
        {
          id: "old-1",
          layer: "gate_guard",
          severity: "warning",
          title: "T",
          message: "",
          timestamp: 1000,
          personaId: null,
          autoResolvable: false,
        },
      ],
    })
    const b = makeBaseDashboard({ overallStatus: "healthy" })
    const diff = compareSecuritySnapshots(a, b)
    expect(diff.statusChanged).toBe(true)
    expect(diff.degraded).toBe(false)
    expect(diff.resolvedAlertCount).toBe(1)
  })

  it("새 알림 + 해결된 알림 동시 추적", () => {
    const a = makeBaseDashboard({
      overallStatus: "warning",
      alerts: [
        {
          id: "old-1",
          layer: "gate_guard",
          severity: "warning",
          title: "T1",
          message: "",
          timestamp: 1000,
          personaId: null,
          autoResolvable: false,
        },
      ],
    })
    const b = makeBaseDashboard({
      overallStatus: "warning",
      alerts: [
        {
          id: "new-1",
          layer: "integrity_monitor",
          severity: "warning",
          title: "T2",
          message: "",
          timestamp: 2000,
          personaId: null,
          autoResolvable: false,
        },
      ],
    })
    const diff = compareSecuritySnapshots(a, b)
    expect(diff.statusChanged).toBe(false)
    expect(diff.newAlertCount).toBe(1)
    expect(diff.resolvedAlertCount).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// 15. 불변성 검증
// ═══════════════════════════════════════════════════════════════

describe("불변성 검증", () => {
  it("aggregateGateGuardMetrics는 입력을 변경하지 않음", () => {
    const results = [makeGateResult(), makeBlockedGateResult()]
    const snapshot = JSON.stringify(results)
    aggregateGateGuardMetrics(results)
    expect(JSON.stringify(results)).toBe(snapshot)
  })

  it("extractIntegrityMetrics는 입력을 변경하지 않음", () => {
    const result = makeIntegrityResult()
    const snapshot = JSON.stringify(result)
    extractIntegrityMetrics(result)
    expect(JSON.stringify(result)).toBe(snapshot)
  })

  it("aggregateOutputSentinelMetrics는 입력을 변경하지 않음", () => {
    const results = [makeOutputResult()]
    const entries = [makeQuarantineEntry()]
    const snapshotR = JSON.stringify(results)
    const snapshotE = JSON.stringify(entries)
    aggregateOutputSentinelMetrics(results, entries)
    expect(JSON.stringify(results)).toBe(snapshotR)
    expect(JSON.stringify(entries)).toBe(snapshotE)
  })

  it("aggregateProvenanceMetrics는 입력을 변경하지 않음", () => {
    const entries = [makeProvenance(), makeProvenance({ trustLevel: 0.5 })]
    const snapshot = JSON.stringify(entries)
    aggregateProvenanceMetrics(entries)
    expect(JSON.stringify(entries)).toBe(snapshot)
  })

  it("buildSecurityDashboard는 입력을 변경하지 않음", () => {
    const input: BuildSecurityDashboardInput = {
      gateResults: [makeGateResult()],
      integrityResult: makeIntegrityResult(),
      outputResults: [makeOutputResult()],
      quarantineEntries: [],
      safetyConfig: makeSafetyConfig(),
      triggerResults: [],
      provenanceEntries: [makeProvenance()],
    }
    const snapshot = JSON.stringify(input)
    buildSecurityDashboard(input)
    expect(JSON.stringify(input)).toBe(snapshot)
  })
})
