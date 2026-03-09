import { describe, it, expect } from "vitest"
import {
  getAutoApplyConfig,
  checkAutoApply,
  isAutoApplicable,
} from "@/lib/autonomy/auto-correction"
import type { AutonomyPolicy } from "@/lib/autonomy/autonomy-policy"
import { DEFAULT_AUTONOMY_POLICY } from "@/lib/autonomy/autonomy-policy"

const makePolicy = (overrides: Partial<AutonomyPolicy> = {}): AutonomyPolicy => ({
  ...DEFAULT_AUTONOMY_POLICY,
  autoCorrection: true,
  ...overrides,
})

describe("getAutoApplyConfig", () => {
  it("policy=null → 기존 동작(minor만)", () => {
    const config = getAutoApplyConfig(null)
    expect(config.maxSeverity).toBe("minor")
  })

  it("autoCorrection=false → minor만", () => {
    const config = getAutoApplyConfig(makePolicy({ autoCorrection: false }))
    expect(config.maxSeverity).toBe("minor")
  })

  it("autoCorrection=true → policy의 correctionConfig 사용", () => {
    const policy = makePolicy({
      correctionConfig: { maxAutoSeverity: "major", minConfidence: 0.85, dailyLimit: 5 },
    })
    const config = getAutoApplyConfig(policy)
    expect(config.maxSeverity).toBe("major")
    expect(config.minConfidence).toBe(0.85)
    expect(config.dailyLimit).toBe(5)
  })
})

describe("checkAutoApply", () => {
  it("critical은 항상 불가", () => {
    const result = checkAutoApply({
      severity: "critical",
      confidence: 1.0,
      dailyCorrectionCount: 0,
      policy: makePolicy(),
    })
    expect(result.canAutoApply).toBe(false)
    expect(result.reason).toContain("critical")
  })

  it("major + maxAutoSeverity=minor → 불가", () => {
    const result = checkAutoApply({
      severity: "major",
      confidence: 0.95,
      dailyCorrectionCount: 0,
      policy: makePolicy({
        correctionConfig: { maxAutoSeverity: "minor", minConfidence: 0.9, dailyLimit: 3 },
      }),
    })
    expect(result.canAutoApply).toBe(false)
  })

  it("major + maxAutoSeverity=major + confidence ≥ 0.9 → 가능", () => {
    const result = checkAutoApply({
      severity: "major",
      confidence: 0.95,
      dailyCorrectionCount: 0,
      policy: makePolicy(),
    })
    expect(result.canAutoApply).toBe(true)
  })

  it("confidence 부족 → 불가", () => {
    const result = checkAutoApply({
      severity: "minor",
      confidence: 0.5,
      dailyCorrectionCount: 0,
      policy: makePolicy(),
    })
    expect(result.canAutoApply).toBe(false)
    expect(result.reason).toContain("confidence")
  })

  it("일일 한도 초과 → 불가", () => {
    const result = checkAutoApply({
      severity: "minor",
      confidence: 0.95,
      dailyCorrectionCount: 3,
      policy: makePolicy(),
    })
    expect(result.canAutoApply).toBe(false)
    expect(result.reason).toContain("한도")
  })

  it("모든 조건 충족 → 가능", () => {
    const result = checkAutoApply({
      severity: "minor",
      confidence: 0.95,
      dailyCorrectionCount: 0,
      policy: makePolicy(),
    })
    expect(result.canAutoApply).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it("policy=null + minor → 기존 동작(minor 가능)", () => {
    const result = checkAutoApply({
      severity: "minor",
      confidence: 0.95,
      dailyCorrectionCount: 0,
      policy: null,
    })
    expect(result.canAutoApply).toBe(true)
  })

  it("policy=null + major → 기존 동작(major 불가)", () => {
    const result = checkAutoApply({
      severity: "major",
      confidence: 0.95,
      dailyCorrectionCount: 0,
      policy: null,
    })
    expect(result.canAutoApply).toBe(false)
  })
})

describe("isAutoApplicable", () => {
  it("편의 래퍼로 동일하게 동작", () => {
    const result = isAutoApplicable("minor", 0.95, 0, makePolicy())
    expect(result).toBe(true)
  })

  it("critical → false", () => {
    const result = isAutoApplicable("critical", 1.0, 0, makePolicy())
    expect(result).toBe(false)
  })
})
