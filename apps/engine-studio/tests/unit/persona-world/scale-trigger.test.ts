// ═══════════════════════════════════════════════════════════════
// Scale Trigger Tests — T331
// 페르소나 수 기반 최적화 자동 트리거 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

import {
  checkScaleTrigger,
  buildScaleTriggerState,
  formatChangeForActivity,
  getCheckIntervalMs,
  type ScaleTriggerState,
} from "@/lib/persona-world/scale-trigger"

// ── checkScaleTrigger ────────────────────────────────────────

describe("checkScaleTrigger", () => {
  it("이전 상태 없으면 현재 활성 기능 모두 activated로 반환", () => {
    const result = checkScaleTrigger(50, null)

    expect(result.hasChanges).toBe(true)
    expect(
      result.changes.some((c) => c.feature === "batch_comment" && c.action === "activated")
    ).toBe(true)
    expect(
      result.changes.some((c) => c.feature === "haiku_routing" && c.action === "activated")
    ).toBe(true)
  })

  it("페르소나 수 변화 없으면 변경 없음", () => {
    const state: ScaleTriggerState = {
      lastPersonaCount: 50,
      activeFeatures: ["batch_comment", "haiku_routing"],
      lastCheckedAt: Date.now() - 60000,
    }

    const result = checkScaleTrigger(50, state)
    expect(result.hasChanges).toBe(false)
    expect(result.changes).toHaveLength(0)
  })

  it("페르소나 수 증가 → 새 기능 활성화 감지", () => {
    const state: ScaleTriggerState = {
      lastPersonaCount: 50,
      activeFeatures: ["batch_comment", "haiku_routing"],
      lastCheckedAt: Date.now() - 60000,
    }

    // 50 → 100: vector_cache 활성화
    const result = checkScaleTrigger(100, state)

    expect(result.hasChanges).toBe(true)
    expect(result.changes).toHaveLength(1)
    expect(result.changes[0].feature).toBe("vector_cache")
    expect(result.changes[0].action).toBe("activated")
    expect(result.changes[0].personaCount).toBe(100)
  })

  it("페르소나 수 감소 → 기능 비활성화 감지", () => {
    const state: ScaleTriggerState = {
      lastPersonaCount: 100,
      activeFeatures: ["batch_comment", "haiku_routing", "vector_cache"],
      lastCheckedAt: Date.now() - 60000,
    }

    // 100 → 40: haiku_routing + vector_cache 비활성화
    const result = checkScaleTrigger(40, state)

    expect(result.hasChanges).toBe(true)
    expect(
      result.changes.some((c) => c.feature === "haiku_routing" && c.action === "deactivated")
    ).toBe(true)
    expect(
      result.changes.some((c) => c.feature === "vector_cache" && c.action === "deactivated")
    ).toBe(true)
  })

  it("0 페르소나에서 시작 → 변경 없음", () => {
    const result = checkScaleTrigger(0, null)
    expect(result.hasChanges).toBe(false)
  })

  it("500+ 페르소나 → 모든 기능 활성화", () => {
    const result = checkScaleTrigger(500, null)

    expect(result.currentStatus.activeFeatures).toHaveLength(5)
    expect(result.changes.length).toBe(5)
    expect(result.changes.every((c) => c.action === "activated")).toBe(true)
  })

  it("checkedAt 타임스탬프 포함", () => {
    const before = Date.now()
    const result = checkScaleTrigger(50, null)
    const after = Date.now()

    expect(result.checkedAt).toBeGreaterThanOrEqual(before)
    expect(result.checkedAt).toBeLessThanOrEqual(after)
  })
})

// ── buildScaleTriggerState ───────────────────────────────────

describe("buildScaleTriggerState", () => {
  it("상태 객체를 올바르게 생성", () => {
    const state = buildScaleTriggerState(50, ["batch_comment", "haiku_routing"])

    expect(state.lastPersonaCount).toBe(50)
    expect(state.activeFeatures).toEqual(["batch_comment", "haiku_routing"])
    expect(state.lastCheckedAt).toBeGreaterThan(0)
  })

  it("빈 기능 목록도 허용", () => {
    const state = buildScaleTriggerState(0, [])
    expect(state.activeFeatures).toHaveLength(0)
  })
})

// ── formatChangeForActivity ──────────────────────────────────

describe("formatChangeForActivity", () => {
  it("활성화 이벤트 포맷", () => {
    const event = formatChangeForActivity({
      feature: "haiku_routing",
      action: "activated",
      threshold: 50,
      personaCount: 52,
    })

    expect(event.title).toContain("활성화")
    expect(event.title).toContain("Haiku")
    expect(event.description).toContain("52개")
    expect(event.description).toContain("50개")
    expect(event.metadata.autoTriggered).toBe(true)
  })

  it("비활성화 이벤트 포맷", () => {
    const event = formatChangeForActivity({
      feature: "batch_comment",
      action: "deactivated",
      threshold: 10,
      personaCount: 8,
    })

    expect(event.title).toContain("비활성화")
    expect(event.title).toContain("배치")
    expect(event.metadata.action).toBe("deactivated")
  })

  it("metadata에 feature, action, threshold, personaCount 포함", () => {
    const event = formatChangeForActivity({
      feature: "vector_cache",
      action: "activated",
      threshold: 100,
      personaCount: 100,
    })

    expect(event.metadata.feature).toBe("vector_cache")
    expect(event.metadata.action).toBe("activated")
    expect(event.metadata.threshold).toBe(100)
    expect(event.metadata.personaCount).toBe(100)
  })
})

// ── getCheckIntervalMs ───────────────────────────────────────

describe("getCheckIntervalMs", () => {
  it("모든 최적화 활성화 → 10분 간격", () => {
    const interval = getCheckIntervalMs(1000)
    expect(interval).toBe(10 * 60 * 1000)
  })

  it("임계값 직전 (5개 이하 남음) → 1분 간격", () => {
    // batch_comment 임계값 = 10, 현재 7개 → 3개 남음
    const interval = getCheckIntervalMs(7)
    expect(interval).toBe(60 * 1000)
  })

  it("임계값 근처 (20개 이하 남음) → 3분 간격", () => {
    // haiku_routing 임계값 = 50, 현재 35개 → 15개 남음
    const interval = getCheckIntervalMs(35)
    expect(interval).toBe(3 * 60 * 1000)
  })

  it("기본값 → 5분 간격", () => {
    // haiku_routing 임계값 = 50, 현재 15개 → 35개 남음 (> 20)
    const interval = getCheckIntervalMs(15)
    expect(interval).toBe(5 * 60 * 1000)
  })

  it("0 페르소나 → 임계값까지 10개 남음 → 3분 간격", () => {
    const interval = getCheckIntervalMs(0)
    // 다음 임계값 = 10, 남은 수 = 10 → ≤ 20 → 3분
    expect(interval).toBe(3 * 60 * 1000)
  })
})
