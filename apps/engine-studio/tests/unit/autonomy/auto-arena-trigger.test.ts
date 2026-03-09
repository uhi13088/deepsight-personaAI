import { describe, it, expect } from "vitest"
import { checkAutoArenaTrigger } from "@/lib/autonomy/auto-arena-trigger"
import type { AutonomyPolicy } from "@/lib/autonomy/autonomy-policy"
import { DEFAULT_AUTONOMY_POLICY } from "@/lib/autonomy/autonomy-policy"

const makePolicy = (autoCorrection = true): AutonomyPolicy => ({
  ...DEFAULT_AUTONOMY_POLICY,
  autoCorrection,
})

describe("checkAutoArenaTrigger", () => {
  it("autoCorrection=false → 스킵", () => {
    const result = checkAutoArenaTrigger({
      personaId: "p1",
      currentPIS: 0.5,
      policy: makePolicy(false),
      hasRecentArena: false,
      withinBudget: true,
    })
    expect(result.shouldTrigger).toBe(false)
  })

  it("PIS ≥ 0.7 → 스킵", () => {
    const result = checkAutoArenaTrigger({
      personaId: "p1",
      currentPIS: 0.75,
      policy: makePolicy(),
      hasRecentArena: false,
      withinBudget: true,
    })
    expect(result.shouldTrigger).toBe(false)
  })

  it("최근 24h Arena 실행 → 스킵", () => {
    const result = checkAutoArenaTrigger({
      personaId: "p1",
      currentPIS: 0.5,
      policy: makePolicy(),
      hasRecentArena: true,
      withinBudget: true,
    })
    expect(result.shouldTrigger).toBe(false)
    expect(result.reason).toContain("이미 실행")
  })

  it("예산 초과 → 스킵 + 관리자 알림", () => {
    const result = checkAutoArenaTrigger({
      personaId: "p1",
      currentPIS: 0.5,
      policy: makePolicy(),
      hasRecentArena: false,
      withinBudget: false,
    })
    expect(result.shouldTrigger).toBe(false)
    expect(result.notifyAdmin).toBe(true)
  })

  it("PIS < 0.6 (CRITICAL) → 트리거 + 알림", () => {
    const result = checkAutoArenaTrigger({
      personaId: "p1",
      currentPIS: 0.55,
      policy: makePolicy(),
      hasRecentArena: false,
      withinBudget: true,
    })
    expect(result.shouldTrigger).toBe(true)
    expect(result.severity).toBe("CRITICAL")
    expect(result.notifyAdmin).toBe(true)
  })

  it("PIS 0.6~0.7 (WARNING) → 트리거", () => {
    const result = checkAutoArenaTrigger({
      personaId: "p1",
      currentPIS: 0.65,
      policy: makePolicy(),
      hasRecentArena: false,
      withinBudget: true,
    })
    expect(result.shouldTrigger).toBe(true)
    expect(result.severity).toBe("WARNING")
    expect(result.notifyAdmin).toBe(false)
  })

  it("policy=null → 스킵", () => {
    const result = checkAutoArenaTrigger({
      personaId: "p1",
      currentPIS: 0.5,
      policy: null,
      hasRecentArena: false,
      withinBudget: true,
    })
    expect(result.shouldTrigger).toBe(false)
  })
})
