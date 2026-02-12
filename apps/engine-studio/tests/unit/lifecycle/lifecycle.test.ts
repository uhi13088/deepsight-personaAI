import { describe, it, expect } from "vitest"
import {
  getAvailableActions,
  canTransition,
  executeTransition,
  isActiveStatus,
  isEditable,
  needsEditWarning,
  STATUS_LABELS,
  ACTION_LABELS,
  DANGEROUS_ACTIONS,
} from "@/lib/lifecycle"
import type { PersonaStatus } from "@prisma/client"

// ── Status Labels ───────────────────────────────────────────

describe("STATUS_LABELS", () => {
  it("모든 8개 상태에 대해 라벨이 있어야 함", () => {
    const statuses: PersonaStatus[] = [
      "DRAFT",
      "REVIEW",
      "ACTIVE",
      "STANDARD",
      "LEGACY",
      "DEPRECATED",
      "PAUSED",
      "ARCHIVED",
    ]
    for (const s of statuses) {
      expect(STATUS_LABELS[s]).toBeDefined()
      expect(typeof STATUS_LABELS[s]).toBe("string")
    }
  })
})

// ── getAvailableActions ─────────────────────────────────────

describe("getAvailableActions", () => {
  it("DRAFT → SUBMIT_REVIEW, ARCHIVE", () => {
    const actions = getAvailableActions("DRAFT")
    expect(actions).toContain("SUBMIT_REVIEW")
    expect(actions).toContain("ARCHIVE")
    expect(actions).not.toContain("APPROVE")
  })

  it("REVIEW → APPROVE, REJECT, ARCHIVE", () => {
    const actions = getAvailableActions("REVIEW")
    expect(actions).toContain("APPROVE")
    expect(actions).toContain("REJECT")
    expect(actions).toContain("ARCHIVE")
  })

  it("ACTIVE → PAUSE, DEPRECATE, ARCHIVE", () => {
    const actions = getAvailableActions("ACTIVE")
    expect(actions).toContain("PAUSE")
    expect(actions).toContain("DEPRECATE")
    expect(actions).toContain("ARCHIVE")
  })

  it("PAUSED → RESUME, ARCHIVE", () => {
    const actions = getAvailableActions("PAUSED")
    expect(actions).toContain("RESUME")
    expect(actions).toContain("ARCHIVE")
  })

  it("ARCHIVED → RESTORE", () => {
    const actions = getAvailableActions("ARCHIVED")
    expect(actions).toEqual(["RESTORE"])
  })

  it("DEPRECATED → ARCHIVE", () => {
    const actions = getAvailableActions("DEPRECATED")
    expect(actions).toEqual(["ARCHIVE"])
  })
})

// ── canTransition ───────────────────────────────────────────

describe("canTransition", () => {
  it("DRAFT + SUBMIT_REVIEW → REVIEW (allowed)", () => {
    const result = canTransition("DRAFT", "SUBMIT_REVIEW")
    expect(result.allowed).toBe(true)
    expect(result.targetStatus).toBe("REVIEW")
  })

  it("DRAFT + APPROVE → not allowed", () => {
    const result = canTransition("DRAFT", "APPROVE")
    expect(result.allowed).toBe(false)
    expect(result.reason).toBeDefined()
  })

  it("REVIEW + APPROVE → ACTIVE (allowed)", () => {
    const result = canTransition("REVIEW", "APPROVE")
    expect(result.allowed).toBe(true)
    expect(result.targetStatus).toBe("ACTIVE")
  })

  it("REVIEW + REJECT → DRAFT (allowed)", () => {
    const result = canTransition("REVIEW", "REJECT")
    expect(result.allowed).toBe(true)
    expect(result.targetStatus).toBe("DRAFT")
  })

  it("ARCHIVED + RESTORE → DRAFT (allowed)", () => {
    const result = canTransition("ARCHIVED", "RESTORE")
    expect(result.allowed).toBe(true)
    expect(result.targetStatus).toBe("DRAFT")
  })

  it("ACTIVE + RESUME → not allowed", () => {
    const result = canTransition("ACTIVE", "RESUME")
    expect(result.allowed).toBe(false)
  })
})

// ── executeTransition ───────────────────────────────────────

describe("executeTransition", () => {
  it("유효한 전이 → success", () => {
    const result = executeTransition("DRAFT", "SUBMIT_REVIEW")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.newStatus).toBe("REVIEW")
    }
  })

  it("무효한 전이 → failure with reason", () => {
    const result = executeTransition("ARCHIVED", "APPROVE")
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.reason).toBeDefined()
    }
  })

  it("PAUSED + RESUME → ACTIVE", () => {
    const result = executeTransition("PAUSED", "RESUME")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.newStatus).toBe("ACTIVE")
    }
  })
})

// ── Helper functions ────────────────────────────────────────

describe("isActiveStatus", () => {
  it("ACTIVE/STANDARD/LEGACY → true", () => {
    expect(isActiveStatus("ACTIVE")).toBe(true)
    expect(isActiveStatus("STANDARD")).toBe(true)
    expect(isActiveStatus("LEGACY")).toBe(true)
  })

  it("DRAFT/REVIEW/PAUSED/ARCHIVED → false", () => {
    expect(isActiveStatus("DRAFT")).toBe(false)
    expect(isActiveStatus("REVIEW")).toBe(false)
    expect(isActiveStatus("PAUSED")).toBe(false)
    expect(isActiveStatus("ARCHIVED")).toBe(false)
  })
})

describe("isEditable", () => {
  it("ARCHIVED → false", () => {
    expect(isEditable("ARCHIVED")).toBe(false)
  })

  it("DRAFT/ACTIVE/PAUSED → true", () => {
    expect(isEditable("DRAFT")).toBe(true)
    expect(isEditable("ACTIVE")).toBe(true)
    expect(isEditable("PAUSED")).toBe(true)
  })
})

describe("needsEditWarning", () => {
  it("ACTIVE/STANDARD/LEGACY → true", () => {
    expect(needsEditWarning("ACTIVE")).toBe(true)
    expect(needsEditWarning("STANDARD")).toBe(true)
  })

  it("DRAFT → false", () => {
    expect(needsEditWarning("DRAFT")).toBe(false)
  })
})

// ── DANGEROUS_ACTIONS ───────────────────────────────────────

describe("DANGEROUS_ACTIONS", () => {
  it("ARCHIVE와 DEPRECATE가 위험 액션", () => {
    expect(DANGEROUS_ACTIONS.has("ARCHIVE")).toBe(true)
    expect(DANGEROUS_ACTIONS.has("DEPRECATE")).toBe(true)
  })

  it("APPROVE는 위험하지 않음", () => {
    expect(DANGEROUS_ACTIONS.has("APPROVE")).toBe(false)
  })
})
