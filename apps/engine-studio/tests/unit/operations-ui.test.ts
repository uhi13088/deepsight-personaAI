// ═══════════════════════════════════════════════════════════════
// Operations UI — Page Integration Tests
// T99: Monitoring + Incidents + Backup UI 로직 검증
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

// ── AC1: Monitoring 관련 ─────────────────────────────────────

import {
  createMetricDataPoint,
  evaluateThresholds,
  acknowledgeThresholdAlert,
  searchLogs,
  buildMonitoringDashboard,
  DEFAULT_METRIC_THRESHOLDS,
  DEFAULT_DASHBOARD_LAYOUT,
} from "@/lib/operations"
import type { LogEntry, LogSearchFilter, MetricDataPoint } from "@/lib/operations"

// ── AC2: Incidents 관련 ──────────────────────────────────────

import {
  createIncident,
  triageIncident,
  advanceIncidentPhase,
  resolveIncident,
  calculateMTTR,
  createPostMortem,
  buildIncidentDashboard,
  INCIDENT_SEVERITY_DEFINITIONS,
} from "@/lib/operations"
import type { Incident } from "@/lib/operations"

// ── AC3: Backup/DR/Capacity 관련 ─────────────────────────────

import {
  DEFAULT_BACKUP_POLICIES,
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
  createResourceUsage,
  getUsagePercent,
  forecastLinear,
  generateCostOptimizations,
  generateScalingRecommendations,
  buildCapacityReport,
} from "@/lib/operations"
import type { UsageSnapshot, ResourceUsage } from "@/lib/operations"

// ── 헬퍼 ──────────────────────────────────────────────────────

function buildSampleLogs(): LogEntry[] {
  const now = Date.now()
  return [
    {
      id: "log-1",
      timestamp: now - 1000,
      level: "error",
      service: "api-gateway",
      message: "Connection timeout to database pool",
      metadata: { host: "db-primary" },
      traceId: "trace-001",
    },
    {
      id: "log-2",
      timestamp: now - 5000,
      level: "warn",
      service: "worker",
      message: "Queue depth exceeding threshold",
      metadata: { queue: "persona-processing" },
      traceId: "trace-002",
    },
    {
      id: "log-3",
      timestamp: now - 10000,
      level: "info",
      service: "api-gateway",
      message: "Health check passed",
      metadata: {},
      traceId: null,
    },
    {
      id: "log-4",
      timestamp: now - 20000,
      level: "debug",
      service: "worker",
      message: "Processing batch item 42",
      metadata: {},
      traceId: null,
    },
  ]
}

function buildResolvedIncident(): Incident {
  const now = Date.now()
  return {
    id: "INC-resolved",
    title: "테스트 장애",
    severity: "P2",
    phase: "resolved",
    detectedAt: now - 60 * 60 * 1000,
    resolvedAt: now - 30 * 60 * 1000,
    commander: "운영자",
    affectedServices: ["api-gateway"],
    timeline: [
      {
        timestamp: now - 60 * 60 * 1000,
        phase: "detected",
        actor: "system",
        description: "장애 탐지",
      },
      { timestamp: now - 30 * 60 * 1000, phase: "resolved", actor: "운영자", description: "해결" },
    ],
    rootCause: "DB 커넥션 부족",
    mitigation: "커넥션 풀 확장",
  }
}

// ═══════════════════════════════════════════════════════════════
// AC1: Monitoring Page Logic
// ═══════════════════════════════════════════════════════════════

describe("Monitoring Page Logic", () => {
  describe("메트릭 데이터 포인트 생성", () => {
    it("llm_error_rate 메트릭을 올바르게 생성해야 한다", () => {
      const dp = createMetricDataPoint("llm_error_rate", 72.5, "server-1", { env: "prod" })
      expect(dp.metricType).toBe("llm_error_rate")
      expect(dp.value).toBe(72.5)
      expect(dp.source).toBe("server-1")
      expect(dp.labels.env).toBe("prod")
      expect(dp.timestamp).toBeGreaterThan(0)
    })

    it("소수점 이하 2자리까지 반올림해야 한다", () => {
      const dp = createMetricDataPoint("llm_cost", 68.333333, "server-1")
      expect(dp.value).toBe(68.33)
    })

    it("라벨 없이도 생성 가능해야 한다", () => {
      const dp = createMetricDataPoint("avg_latency", 50, "server-1")
      expect(dp.labels).toEqual({})
    })
  })

  describe("임계값 평가", () => {
    it("임계값 초과 시 warning 알림을 생성해야 한다", () => {
      const points = [createMetricDataPoint("llm_error_rate", 10, "server-1")]
      const alerts = evaluateThresholds(points, DEFAULT_METRIC_THRESHOLDS)
      expect(alerts.length).toBe(1)
      expect(alerts[0].level).toBe("warning")
      expect(alerts[0].metricType).toBe("llm_error_rate")
    })

    it("critical 임계값 초과 시 critical 알림을 생성해야 한다", () => {
      const points = [createMetricDataPoint("llm_error_rate", 20, "server-1")]
      const alerts = evaluateThresholds(points, DEFAULT_METRIC_THRESHOLDS)
      expect(alerts.length).toBe(1)
      expect(alerts[0].level).toBe("critical")
    })

    it("임계값 미만이면 알림이 없어야 한다", () => {
      const points = [createMetricDataPoint("llm_error_rate", 2, "server-1")]
      const alerts = evaluateThresholds(points, DEFAULT_METRIC_THRESHOLDS)
      expect(alerts.length).toBe(0)
    })

    it("다수 메트릭에서 복합 알림을 생성해야 한다", () => {
      const points = [
        createMetricDataPoint("llm_error_rate", 20, "server-1"),
        createMetricDataPoint("llm_cost", 200, "server-1"),
        createMetricDataPoint("avg_latency", 3000, "server-1"),
      ]
      const alerts = evaluateThresholds(points, DEFAULT_METRIC_THRESHOLDS)
      expect(alerts.length).toBe(2) // llm_error_rate critical + llm_cost warning
    })
  })

  describe("알림 확인", () => {
    it("알림을 확인(acknowledged) 처리할 수 있어야 한다", () => {
      const points = [createMetricDataPoint("llm_error_rate", 20, "server-1")]
      const alerts = evaluateThresholds(points, DEFAULT_METRIC_THRESHOLDS)
      expect(alerts[0].acknowledged).toBe(false)
      const acked = acknowledgeThresholdAlert(alerts[0])
      expect(acked.acknowledged).toBe(true)
    })
  })

  describe("로그 검색", () => {
    it("레벨 필터로 검색해야 한다", () => {
      const logs = buildSampleLogs()
      const filter: LogSearchFilter = {
        startTime: null,
        endTime: null,
        levels: ["error"],
        services: [],
        keyword: null,
        traceId: null,
        limit: 50,
      }
      const results = searchLogs(logs, filter)
      expect(results.every((l) => l.level === "error")).toBe(true)
      expect(results.length).toBe(1)
    })

    it("서비스 필터로 검색해야 한다", () => {
      const logs = buildSampleLogs()
      const filter: LogSearchFilter = {
        startTime: null,
        endTime: null,
        levels: [],
        services: ["api-gateway"],
        keyword: null,
        traceId: null,
        limit: 50,
      }
      const results = searchLogs(logs, filter)
      expect(results.every((l) => l.service === "api-gateway")).toBe(true)
    })

    it("키워드 필터로 검색해야 한다", () => {
      const logs = buildSampleLogs()
      const filter: LogSearchFilter = {
        startTime: null,
        endTime: null,
        levels: [],
        services: [],
        keyword: "timeout",
        traceId: null,
        limit: 50,
      }
      const results = searchLogs(logs, filter)
      expect(results.length).toBe(1)
      expect(results[0].message).toContain("timeout")
    })

    it("시간 범위 필터로 검색해야 한다", () => {
      const logs = buildSampleLogs()
      const now = Date.now()
      const filter: LogSearchFilter = {
        startTime: now - 6000,
        endTime: now,
        levels: [],
        services: [],
        keyword: null,
        traceId: null,
        limit: 50,
      }
      const results = searchLogs(logs, filter)
      expect(results.every((l) => l.timestamp >= now - 6000 && l.timestamp <= now)).toBe(true)
    })

    it("결과를 최신 순으로 정렬해야 한다", () => {
      const logs = buildSampleLogs()
      const filter: LogSearchFilter = {
        startTime: null,
        endTime: null,
        levels: [],
        services: [],
        keyword: null,
        traceId: null,
        limit: 50,
      }
      const results = searchLogs(logs, filter)
      for (let i = 1; i < results.length; i++) {
        expect(results[i].timestamp).toBeLessThanOrEqual(results[i - 1].timestamp)
      }
    })

    it("limit를 적용해야 한다", () => {
      const logs = buildSampleLogs()
      const filter: LogSearchFilter = {
        startTime: null,
        endTime: null,
        levels: [],
        services: [],
        keyword: null,
        traceId: null,
        limit: 2,
      }
      const results = searchLogs(logs, filter)
      expect(results.length).toBe(2)
    })
  })

  describe("대시보드 빌드", () => {
    it("대시보드 데이터를 올바르게 빌드해야 한다", () => {
      const metrics = [
        createMetricDataPoint("llm_error_rate", 10, "server-1"),
        createMetricDataPoint("llm_cost", 600, "server-1"),
      ]
      const logs = buildSampleLogs()
      const dashboard = buildMonitoringDashboard(metrics, logs)

      expect(dashboard.layout).toBeTruthy()
      expect(dashboard.dataPoints.length).toBe(2)
      expect(dashboard.activeAlerts.length).toBeGreaterThan(0)
      expect(dashboard.recentLogs.length).toBeGreaterThan(0) // warn + error
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: Incidents Page Logic
// ═══════════════════════════════════════════════════════════════

describe("Incidents Page Logic", () => {
  describe("장애 생성", () => {
    it("장애를 올바르게 생성해야 한다", () => {
      const incident = createIncident("테스트 장애", "P1", ["api-gateway"], "operator")
      expect(incident.id).toMatch(/^INC-/)
      expect(incident.title).toBe("테스트 장애")
      expect(incident.severity).toBe("P1")
      expect(incident.phase).toBe("detected")
      expect(incident.resolvedAt).toBeNull()
      expect(incident.commander).toBeNull()
      expect(incident.timeline.length).toBe(1)
    })
  })

  describe("장애 분류 (Triage)", () => {
    it("triage 후 commander와 severity를 설정해야 한다", () => {
      const incident = createIncident("테스트", "P2", ["worker"], "bot")
      const triaged = triageIncident(incident, "김운영", "P1")
      expect(triaged.phase).toBe("triaged")
      expect(triaged.commander).toBe("김운영")
      expect(triaged.severity).toBe("P1")
      expect(triaged.timeline.length).toBe(2)
    })
  })

  describe("단계 전환", () => {
    it("detected → triaged → investigating 전환이 가능해야 한다", () => {
      let incident = createIncident("테스트", "P1", ["api"], "bot")
      incident = advanceIncidentPhase(incident, "triaged", "ops", "분류")
      expect(incident.phase).toBe("triaged")
      incident = advanceIncidentPhase(incident, "investigating", "ops", "조사 시작")
      expect(incident.phase).toBe("investigating")
    })

    it("이전 단계로의 전환은 에러를 발생시켜야 한다", () => {
      let incident = createIncident("테스트", "P1", ["api"], "bot")
      incident = advanceIncidentPhase(incident, "triaged", "ops", "분류")
      expect(() => advanceIncidentPhase(incident, "detected", "ops", "되돌리기")).toThrow()
    })

    it("resolved 전환 시 resolvedAt이 설정되어야 한다", () => {
      let incident = createIncident("테스트", "P1", ["api"], "bot")
      incident = advanceIncidentPhase(incident, "triaged", "ops", "분류")
      incident = advanceIncidentPhase(incident, "investigating", "ops", "조사")
      incident = advanceIncidentPhase(incident, "mitigating", "ops", "완화")
      incident = advanceIncidentPhase(incident, "resolved", "ops", "해결")
      expect(incident.phase).toBe("resolved")
      expect(incident.resolvedAt).not.toBeNull()
    })
  })

  describe("장애 해결", () => {
    it("resolveIncident으로 rootCause와 mitigation을 설정해야 한다", () => {
      const incident = createIncident("테스트", "P1", ["api"], "bot")
      const resolved = resolveIncident(incident, "ops", "메모리 릭", "GC 튜닝")
      expect(resolved.phase).toBe("resolved")
      expect(resolved.rootCause).toBe("메모리 릭")
      expect(resolved.mitigation).toBe("GC 튜닝")
      expect(resolved.resolvedAt).not.toBeNull()
    })
  })

  describe("Post-Mortem 생성", () => {
    it("Post-Mortem을 올바르게 생성해야 한다", () => {
      const incident = buildResolvedIncident()
      const pm = createPostMortem(
        incident,
        "DB 커넥션 부족",
        500,
        30,
        false,
        [
          {
            description: "커넥션 풀 확장",
            assignee: "DBA",
            dueDate: Date.now() + 86400000,
            priority: "high",
          },
        ],
        ["모니터링 추가 필요"]
      )

      expect(pm.incidentId).toBe(incident.id)
      expect(pm.rootCause).toBe("DB 커넥션 부족")
      expect(pm.impact.affectedUsers).toBe(500)
      expect(pm.impact.downtimeMinutes).toBe(30)
      expect(pm.impact.dataLoss).toBe(false)
      expect(pm.actionItems.length).toBe(1)
      expect(pm.actionItems[0].completed).toBe(false)
      expect(pm.lessonsLearned.length).toBe(1)
    })
  })

  describe("MTTR 계산", () => {
    it("해결된 장애들의 평균 복구 시간을 계산해야 한다", () => {
      const now = Date.now()
      const incidents: Incident[] = [
        {
          ...buildResolvedIncident(),
          id: "INC-1",
          detectedAt: now - 60 * 60 * 1000,
          resolvedAt: now - 30 * 60 * 1000,
        },
        {
          ...buildResolvedIncident(),
          id: "INC-2",
          detectedAt: now - 120 * 60 * 1000,
          resolvedAt: now - 60 * 60 * 1000,
        },
      ]
      // First incident: 30 minutes, Second: 60 minutes → average 45
      const mttr = calculateMTTR(incidents)
      expect(mttr).toBe(45)
    })

    it("해결된 장애가 없으면 0을 반환해야 한다", () => {
      const incidents: Incident[] = [createIncident("진행 중", "P1", ["api"], "bot")]
      expect(calculateMTTR(incidents)).toBe(0)
    })
  })

  describe("장애 대시보드 빌드", () => {
    it("대시보드 데이터를 올바르게 빌드해야 한다", () => {
      const incidents = [createIncident("활성 장애", "P1", ["api"], "bot"), buildResolvedIncident()]
      const dashboard = buildIncidentDashboard(incidents, [])
      expect(dashboard.activeIncidents.length).toBe(1)
      expect(dashboard.recentResolved.length).toBe(1)
      expect(dashboard.stats.totalIncidents).toBe(2)
      expect(dashboard.stats.incidentsBySeverity.P1).toBe(1)
      expect(dashboard.stats.incidentsBySeverity.P2).toBe(1)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Backup/DR/Capacity Page Logic
// ═══════════════════════════════════════════════════════════════

describe("Backup Page Logic", () => {
  describe("백업 정책", () => {
    it("기본 정책이 3개 이상 존재해야 한다", () => {
      expect(DEFAULT_BACKUP_POLICIES.length).toBeGreaterThanOrEqual(3)
      const methods = DEFAULT_BACKUP_POLICIES.map((p) => p.method)
      expect(methods).toContain("full")
      expect(methods).toContain("incremental")
      expect(methods).toContain("differential")
    })

    it("커스텀 백업 정책을 생성할 수 있어야 한다", () => {
      const policy = createBackupPolicy(
        "테스트 백업",
        "full",
        "database",
        "0 3 * * *",
        30,
        "/backups/test"
      )
      expect(policy.name).toBe("테스트 백업")
      expect(policy.method).toBe("full")
      expect(policy.target).toBe("database")
      expect(policy.enabled).toBe(true)
      expect(policy.encryptionEnabled).toBe(true) // 기본값
    })
  })

  describe("백업 레코드", () => {
    it("백업 레코드 생성 시 running 상태여야 한다", () => {
      const policy = DEFAULT_BACKUP_POLICIES[0]
      const record = createBackupRecord(policy, "/backups/test.bak")
      expect(record.status).toBe("running")
      expect(record.policyId).toBe(policy.id)
      expect(record.sizeBytes).toBe(0)
      expect(record.completedAt).toBeNull()
    })

    it("백업 완료 시 completed 상태와 크기가 설정되어야 한다", () => {
      const policy = DEFAULT_BACKUP_POLICIES[0]
      const record = createBackupRecord(policy, "/backups/test.bak")
      const completed = completeBackupRecord(record, 1024 * 1024 * 100, "sha256-abc123")
      expect(completed.status).toBe("completed")
      expect(completed.sizeBytes).toBe(1024 * 1024 * 100)
      expect(completed.checksum).toBe("sha256-abc123")
      expect(completed.completedAt).not.toBeNull()
    })

    it("백업 실패 시 failed 상태와 에러가 설정되어야 한다", () => {
      const policy = DEFAULT_BACKUP_POLICIES[0]
      const record = createBackupRecord(policy, "/backups/test.bak")
      const failed = failBackupRecord(record, "디스크 부족")
      expect(failed.status).toBe("failed")
      expect(failed.error).toBe("디스크 부족")
      expect(failed.completedAt).not.toBeNull()
    })
  })

  describe("백업 모니터링", () => {
    it("정책별 모니터링 데이터를 계산해야 한다", () => {
      const policy = DEFAULT_BACKUP_POLICIES[0]
      const record = createBackupRecord(policy, "/backups/test.bak")
      const completed = completeBackupRecord(record, 1024 * 1024 * 100, "sha256-abc")
      const monitoring = computeBackupMonitoring(policy, [completed])
      expect(monitoring.policyId).toBe(policy.id)
      expect(monitoring.totalBackups).toBe(1)
      expect(monitoring.successRate).toBe(100)
      expect(monitoring.lastBackupStatus).toBe("completed")
    })

    it("빈 레코드에서 기본 모니터링 값을 반환해야 한다", () => {
      const policy = DEFAULT_BACKUP_POLICIES[0]
      const monitoring = computeBackupMonitoring(policy, [])
      expect(monitoring.totalBackups).toBe(0)
      expect(monitoring.successRate).toBe(0)
      expect(monitoring.lastBackupAt).toBeNull()
    })
  })

  describe("백업 지연 확인", () => {
    it("마지막 백업이 없으면 overdue로 판단해야 한다", () => {
      const policy = DEFAULT_BACKUP_POLICIES[0]
      const monitoring = computeBackupMonitoring(policy, [])
      expect(isBackupOverdue(monitoring, 86400000)).toBe(true)
    })
  })
})

describe("DR Plan & Drill Logic", () => {
  describe("DR 계획 생성", () => {
    it("DR 계획을 올바르게 생성해야 한다", () => {
      const plan = createDRPlan(
        "DB 복구",
        "database_failure",
        30,
        5,
        [
          {
            description: "페일오버",
            responsible: "DBA",
            estimatedMinutes: 10,
            prerequisites: [],
            verificationCommand: null,
          },
        ],
        [
          {
            name: "김DBA",
            role: "Lead",
            phone: "010-0000-0000",
            email: "dba@test.ai",
            isPrimary: true,
          },
        ]
      )
      expect(plan.name).toBe("DB 복구")
      expect(plan.rtoMinutes).toBe(30)
      expect(plan.rpoMinutes).toBe(5)
      expect(plan.steps.length).toBe(1)
      expect(plan.steps[0].order).toBe(1)
      expect(plan.contacts.length).toBe(1)
    })
  })

  describe("DR 훈련 예약 및 실행", () => {
    it("훈련을 예약하면 scheduled 상태여야 한다", () => {
      const drill = scheduleDRDrill("plan-1", "database_failure", Date.now() + 86400000)
      expect(drill.status).toBe("scheduled")
      expect(drill.executedAt).toBeNull()
    })

    it("훈련을 시작하면 in_progress로 전환되어야 한다", () => {
      const drill = scheduleDRDrill("plan-1", "database_failure", Date.now())
      const started = startDRDrill(drill)
      expect(started.status).toBe("in_progress")
      expect(started.executedAt).not.toBeNull()
    })

    it("scheduled가 아닌 상태에서 시작하면 에러가 발생해야 한다", () => {
      const drill = scheduleDRDrill("plan-1", "database_failure", Date.now())
      const started = startDRDrill(drill)
      expect(() => startDRDrill(started)).toThrow()
    })
  })

  describe("DR 훈련 완료", () => {
    it("훈련 완료 시 결과가 설정되어야 한다", () => {
      let drill = scheduleDRDrill("plan-1", "database_failure", Date.now())
      drill = startDRDrill(drill)
      const completed = completeDRDrill(drill, 25, 3, ["지연 확인"], ["스크립트 개선"])
      expect(completed.status).toBe("completed")
      expect(completed.actualRtoMinutes).toBe(25)
      expect(completed.actualRpoMinutes).toBe(3)
      expect(completed.findings.length).toBe(1)
      expect(completed.actionItems.length).toBe(1)
    })

    it("in_progress가 아닌 상태에서 완료하면 에러가 발생해야 한다", () => {
      const drill = scheduleDRDrill("plan-1", "database_failure", Date.now())
      expect(() => completeDRDrill(drill, 25, 3, [], [])).toThrow()
    })
  })

  describe("DR 훈련 결과 평가", () => {
    it("RTO/RPO 모두 충족 시 pass여야 한다", () => {
      const plan = createDRPlan("테스트", "database_failure", 30, 5, [], [])
      let drill = scheduleDRDrill(plan.id, "database_failure", Date.now())
      drill = startDRDrill(drill)
      drill = completeDRDrill(drill, 25, 3, [], [])
      const result = evaluateDRDrillResult(drill, plan)
      expect(result.overallPass).toBe(true)
      expect(result.rtoMet).toBe(true)
      expect(result.rpoMet).toBe(true)
    })

    it("RTO 초과 시 fail이어야 한다", () => {
      const plan = createDRPlan("테스트", "database_failure", 30, 5, [], [])
      let drill = scheduleDRDrill(plan.id, "database_failure", Date.now())
      drill = startDRDrill(drill)
      drill = completeDRDrill(drill, 45, 3, [], []) // RTO 초과
      const result = evaluateDRDrillResult(drill, plan)
      expect(result.overallPass).toBe(false)
      expect(result.rtoMet).toBe(false)
      expect(result.rpoMet).toBe(true)
    })

    it("미완료 훈련은 fail을 반환해야 한다", () => {
      const plan = createDRPlan("테스트", "database_failure", 30, 5, [], [])
      const drill = scheduleDRDrill(plan.id, "database_failure", Date.now())
      const result = evaluateDRDrillResult(drill, plan)
      expect(result.overallPass).toBe(false)
    })
  })
})

describe("Capacity & Cost Logic", () => {
  describe("리소스 사용률", () => {
    it("사용률 퍼센트를 올바르게 계산해야 한다", () => {
      const resource = createResourceUsage("llm_error_rate", 60, 100, "%")
      expect(getUsagePercent(resource)).toBe(60)
    })

    it("maxCapacity가 0이면 0을 반환해야 한다", () => {
      const resource = createResourceUsage("llm_error_rate", 60, 0, "%")
      expect(getUsagePercent(resource)).toBe(0)
    })
  })

  describe("용량 예측", () => {
    it("증가 추세 데이터에서 increasing을 반환해야 한다", () => {
      const msPerDay = 86400000
      const baseTime = Date.now() - 30 * msPerDay
      const snapshots: UsageSnapshot[] = []
      for (let day = 0; day < 30; day++) {
        const resources: ResourceUsage[] = [
          createResourceUsage("llm_error_rate", 40 + day * 1.5, 100, "%"),
        ]
        snapshots.push({ timestamp: baseTime + day * msPerDay, resources })
      }
      const forecast = forecastLinear(snapshots, "llm_error_rate", 90)
      expect(forecast.trend).toBe("increasing")
      expect(forecast.projectedUsagePercent).toBeGreaterThan(forecast.currentUsagePercent)
      expect(forecast.confidence).toBeGreaterThan(0)
    })

    it("데이터 포인트가 1개일 때 stable을 반환해야 한다", () => {
      const snapshots: UsageSnapshot[] = [
        { timestamp: Date.now(), resources: [createResourceUsage("llm_error_rate", 50, 100, "%")] },
      ]
      const forecast = forecastLinear(snapshots, "llm_error_rate", 90)
      expect(forecast.trend).toBe("stable")
      expect(forecast.confidence).toBe(0)
    })
  })

  describe("비용 최적화", () => {
    it("과소 사용 리소스에 대해 다운사이징을 제안해야 한다", () => {
      const resources = [createResourceUsage("llm_error_rate", 10, 100, "%")]
      const optimizations = generateCostOptimizations(resources, [])
      const rightsizing = optimizations.find((o) => o.category === "rightsizing")
      expect(rightsizing).toBeTruthy()
      expect(rightsizing!.estimatedSavingsPercent).toBeGreaterThan(0)
    })

    it("비업무 시간 스케일 다운 제안을 항상 포함해야 한다", () => {
      const resources = [createResourceUsage("llm_error_rate", 50, 100, "%")]
      const optimizations = generateCostOptimizations(resources, [])
      const scheduling = optimizations.find((o) => o.category === "scheduling")
      expect(scheduling).toBeTruthy()
    })
  })

  describe("스케일링 권고", () => {
    it("90% 초과 시 scale_up immediate를 권고해야 한다", () => {
      const resources = [createResourceUsage("llm_error_rate", 95, 100, "%")]
      const recommendations = generateScalingRecommendations(resources, [])
      expect(recommendations[0].direction).toBe("scale_up")
      expect(recommendations[0].urgency).toBe("immediate")
    })

    it("적정 사용률에서 no_change를 권고해야 한다", () => {
      const resources = [createResourceUsage("llm_error_rate", 50, 100, "%")]
      const recommendations = generateScalingRecommendations(resources, [])
      expect(recommendations[0].direction).toBe("no_change")
    })
  })

  describe("용량 리포트 빌드", () => {
    it("전체 리포트를 올바르게 빌드해야 한다", () => {
      const msPerDay = 86400000
      const baseTime = Date.now() - 30 * msPerDay
      const snapshots: UsageSnapshot[] = []
      for (let day = 0; day < 30; day++) {
        const resources: ResourceUsage[] = [
          createResourceUsage("llm_error_rate", 50 + day * 0.5, 100, "%"),
          createResourceUsage("llm_cost", 60, 100, "%"),
          createResourceUsage("avg_latency", 40 + day * 0.8, 100, "%"),
          createResourceUsage("llm_calls", 30, 100, "%"),
          createResourceUsage("matching_count", 200, 5000, "ms"),
          createResourceUsage("active_personas", 0.5, 100, "%"),
        ]
        snapshots.push({ timestamp: baseTime + day * msPerDay, resources })
      }

      const currentResources: ResourceUsage[] = [
        createResourceUsage("llm_error_rate", 65, 100, "%"),
        createResourceUsage("llm_cost", 60, 100, "%"),
        createResourceUsage("avg_latency", 64, 100, "%"),
        createResourceUsage("llm_calls", 30, 100, "%"),
        createResourceUsage("matching_count", 200, 5000, "ms"),
        createResourceUsage("active_personas", 0.5, 100, "%"),
      ]

      const report = buildCapacityReport(snapshots, currentResources, 90, 80)
      expect(report.generatedAt).toBeGreaterThan(0)
      expect(report.currentUsage.length).toBe(6)
      expect(report.forecasts.length).toBeGreaterThan(0)
      expect(report.optimizations.length).toBeGreaterThan(0)
      expect(report.scalingRecommendations.length).toBeGreaterThan(0)
      expect(report.summary.overallHealthScore).toBeGreaterThanOrEqual(0)
      expect(report.summary.overallHealthScore).toBeLessThanOrEqual(100)
    })
  })
})
