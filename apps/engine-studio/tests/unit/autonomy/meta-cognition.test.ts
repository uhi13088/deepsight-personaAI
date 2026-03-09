import { describe, it, expect } from "vitest"
import { determineSelfAssessment } from "@/lib/autonomy/meta-cognition"
import { shouldSendAlert } from "@/lib/autonomy/meta-cognition-alert"

describe("determineSelfAssessment", () => {
  it("PIS ≥ 0.7 + STABLE → HEALTHY", () => {
    expect(determineSelfAssessment(0.85, "STABLE")).toBe("HEALTHY")
  })

  it("PIS < 0.7 → DRIFTING", () => {
    expect(determineSelfAssessment(0.65, "STABLE")).toBe("DRIFTING")
  })

  it("driftSeverity=MILD → DRIFTING", () => {
    expect(determineSelfAssessment(0.8, "MILD")).toBe("DRIFTING")
  })

  it("PIS < 0.6 → NEEDS_ATTENTION", () => {
    expect(determineSelfAssessment(0.55, "STABLE")).toBe("NEEDS_ATTENTION")
  })

  it("driftSeverity=WARNING → NEEDS_ATTENTION", () => {
    expect(determineSelfAssessment(0.8, "WARNING")).toBe("NEEDS_ATTENTION")
  })

  it("PIS < 0.5 → CRITICAL", () => {
    expect(determineSelfAssessment(0.45, "STABLE")).toBe("CRITICAL")
  })

  it("driftSeverity=CRITICAL → CRITICAL", () => {
    expect(determineSelfAssessment(0.8, "CRITICAL")).toBe("CRITICAL")
  })

  it("null driftSeverity → PIS만으로 판정", () => {
    expect(determineSelfAssessment(0.85, null)).toBe("HEALTHY")
    expect(determineSelfAssessment(0.45, null)).toBe("CRITICAL")
  })
})

describe("shouldSendAlert", () => {
  it("HEALTHY → false", () => {
    expect(shouldSendAlert("HEALTHY")).toBe(false)
  })

  it("DRIFTING → false", () => {
    expect(shouldSendAlert("DRIFTING")).toBe(false)
  })

  it("NEEDS_ATTENTION → true", () => {
    expect(shouldSendAlert("NEEDS_ATTENTION")).toBe(true)
  })

  it("CRITICAL → true", () => {
    expect(shouldSendAlert("CRITICAL")).toBe(true)
  })
})
