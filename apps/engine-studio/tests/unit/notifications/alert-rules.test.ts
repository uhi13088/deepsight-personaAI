import { describe, it, expect } from "vitest"
import { evaluateAlertRules, ALERT_RULES, type AlertMetrics } from "@/lib/notifications/alert-rules"

describe("ALERT_RULES", () => {
  it("8개 규칙 정의됨", () => {
    expect(ALERT_RULES).toHaveLength(8)
  })

  it("모든 규칙에 필수 필드 존재", () => {
    for (const rule of ALERT_RULES) {
      expect(rule.id).toBeTruthy()
      expect(rule.category).toBeTruthy()
      expect(rule.severity).toBeTruthy()
      expect(rule.channel).toBeTruthy()
      expect(rule.title).toBeTruthy()
      expect(typeof rule.check).toBe("function")
      expect(typeof rule.buildBody).toBe("function")
    }
  })
})

describe("evaluateAlertRules", () => {
  // ── 보안 ──

  it("Trust Score < 30 → security-trust-score-low 트리거", () => {
    const metrics: AlertMetrics = { minTrustScore: 25 }
    const triggered = evaluateAlertRules(metrics)
    expect(triggered.map((r) => r.id)).toContain("security-trust-score-low")
  })

  it("Trust Score >= 30 → 트리거 안 됨", () => {
    const metrics: AlertMetrics = { minTrustScore: 50 }
    const triggered = evaluateAlertRules(metrics)
    expect(triggered.map((r) => r.id)).not.toContain("security-trust-score-low")
  })

  it("격리 건수 > 10 → security-quarantine-surge 트리거", () => {
    const metrics: AlertMetrics = { dailyQuarantineCount: 15 }
    const triggered = evaluateAlertRules(metrics)
    expect(triggered.map((r) => r.id)).toContain("security-quarantine-surge")
  })

  // ── 비용 ──

  it("일일 비용 > 임계값 → cost-daily-exceeded 트리거", () => {
    const metrics: AlertMetrics = { dailyCost: 50, dailyCostThreshold: 30 }
    const triggered = evaluateAlertRules(metrics)
    expect(triggered.map((r) => r.id)).toContain("cost-daily-exceeded")
  })

  it("일일 비용 < 임계값 → 트리거 안 됨", () => {
    const metrics: AlertMetrics = { dailyCost: 20, dailyCostThreshold: 30 }
    const triggered = evaluateAlertRules(metrics)
    expect(triggered.map((r) => r.id)).not.toContain("cost-daily-exceeded")
  })

  it("캐시 히트율 < 50% → cost-cache-hit-low 트리거", () => {
    const metrics: AlertMetrics = { cacheHitRate: 0.3 }
    const triggered = evaluateAlertRules(metrics)
    expect(triggered.map((r) => r.id)).toContain("cost-cache-hit-low")
  })

  // ── 품질 ──

  it("인터뷰 점수 < 70 → quality-interview-low 트리거", () => {
    const metrics: AlertMetrics = { avgInterviewScore: 55 }
    const triggered = evaluateAlertRules(metrics)
    expect(triggered.map((r) => r.id)).toContain("quality-interview-low")
  })

  it("Voice Drift > 0.3 → quality-voice-drift 트리거", () => {
    const metrics: AlertMetrics = { maxVoiceDrift: 0.45 }
    const triggered = evaluateAlertRules(metrics)
    expect(triggered.map((r) => r.id)).toContain("quality-voice-drift")
  })

  // ── 시스템 ──

  it("API 에러율 > 5% → system-error-rate-high 트리거", () => {
    const metrics: AlertMetrics = { apiErrorRate: 0.08 }
    const triggered = evaluateAlertRules(metrics)
    expect(triggered.map((r) => r.id)).toContain("system-error-rate-high")
  })

  it("P95 > 3초 → system-response-slow 트리거", () => {
    const metrics: AlertMetrics = { p95ResponseTimeMs: 5000 }
    const triggered = evaluateAlertRules(metrics)
    expect(triggered.map((r) => r.id)).toContain("system-response-slow")
  })

  // ── 복합 ──

  it("모든 메트릭 정상 → 빈 배열", () => {
    const metrics: AlertMetrics = {
      minTrustScore: 80,
      dailyQuarantineCount: 2,
      dailyCost: 10,
      dailyCostThreshold: 50,
      cacheHitRate: 0.9,
      avgInterviewScore: 85,
      maxVoiceDrift: 0.1,
      apiErrorRate: 0.01,
      p95ResponseTimeMs: 500,
    }
    const triggered = evaluateAlertRules(metrics)
    expect(triggered).toHaveLength(0)
  })

  it("메트릭 미제공 → 해당 규칙 스킵 (undefined 체크)", () => {
    const metrics: AlertMetrics = {} // 아무 메트릭도 없음
    const triggered = evaluateAlertRules(metrics)
    expect(triggered).toHaveLength(0)
  })

  it("복수 트리거 동시 발생", () => {
    const metrics: AlertMetrics = {
      minTrustScore: 10,
      apiErrorRate: 0.1,
      dailyCost: 100,
      dailyCostThreshold: 30,
    }
    const triggered = evaluateAlertRules(metrics)
    expect(triggered.length).toBeGreaterThanOrEqual(3)
    const ids = triggered.map((r) => r.id)
    expect(ids).toContain("security-trust-score-low")
    expect(ids).toContain("system-error-rate-high")
    expect(ids).toContain("cost-daily-exceeded")
  })

  // ── buildBody ──

  it("buildBody에 메트릭 값 포함", () => {
    const rule = ALERT_RULES.find((r) => r.id === "security-trust-score-low")!
    const body = rule.buildBody({ minTrustScore: 15 })
    expect(body).toContain("15")
    expect(body).toContain("30")
  })
})
