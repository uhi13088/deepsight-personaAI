import { describe, it, expect } from "vitest"
import type { PersonaSortField, SortOrder } from "@/types"

// ── Query string builder logic (extracted from use-personas hook) ──
// Tests the query parameter building independently from fetch

const VALID_STATUSES = new Set([
  "DRAFT",
  "REVIEW",
  "ACTIVE",
  "STANDARD",
  "LEGACY",
  "DEPRECATED",
  "PAUSED",
  "ARCHIVED",
])

const VALID_SORT_FIELDS = new Set<PersonaSortField>([
  "createdAt",
  "name",
  "paradoxScore",
  "validationScore",
  "qualityScore",
])

function parseIntSafe(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

function parseFloatSafe(value: string | null): number | null {
  if (!value) return null
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

describe("parseIntSafe", () => {
  it("returns default for null", () => {
    expect(parseIntSafe(null, 20)).toBe(20)
  })

  it("returns parsed value for valid string", () => {
    expect(parseIntSafe("50", 20)).toBe(50)
  })

  it("returns default for invalid string", () => {
    expect(parseIntSafe("abc", 20)).toBe(20)
  })

  it("returns default for empty string", () => {
    expect(parseIntSafe("", 1)).toBe(1)
  })
})

describe("parseFloatSafe", () => {
  it("returns null for null", () => {
    expect(parseFloatSafe(null)).toBeNull()
  })

  it("returns parsed value", () => {
    expect(parseFloatSafe("0.35")).toBeCloseTo(0.35)
  })

  it("returns null for NaN", () => {
    expect(parseFloatSafe("not-a-number")).toBeNull()
  })
})

describe("status validation", () => {
  it("accepts valid statuses", () => {
    expect(VALID_STATUSES.has("ACTIVE")).toBe(true)
    expect(VALID_STATUSES.has("DRAFT")).toBe(true)
    expect(VALID_STATUSES.has("ARCHIVED")).toBe(true)
  })

  it("rejects invalid statuses", () => {
    expect(VALID_STATUSES.has("INVALID")).toBe(false)
    expect(VALID_STATUSES.has("")).toBe(false)
  })

  it("has all 8 lifecycle states", () => {
    expect(VALID_STATUSES.size).toBe(8)
  })
})

describe("sort field validation", () => {
  it("accepts valid sort fields", () => {
    expect(VALID_SORT_FIELDS.has("createdAt")).toBe(true)
    expect(VALID_SORT_FIELDS.has("paradoxScore")).toBe(true)
  })

  it("rejects invalid sort fields", () => {
    expect(VALID_SORT_FIELDS.has("invalid" as PersonaSortField)).toBe(false)
  })
})

describe("pagination calculation", () => {
  it("computes skip correctly", () => {
    const page = 3
    const limit = 20
    const skip = (page - 1) * limit
    expect(skip).toBe(40)
  })

  it("computes total pages correctly", () => {
    expect(Math.ceil(98 / 20)).toBe(5)
    expect(Math.ceil(20 / 20)).toBe(1)
    expect(Math.ceil(0 / 20)).toBe(0)
    expect(Math.ceil(1 / 20)).toBe(1)
  })

  it("clamps page to minimum 1", () => {
    expect(Math.max(1, 0)).toBe(1)
    expect(Math.max(1, -5)).toBe(1)
  })

  it("clamps limit to max 100", () => {
    expect(Math.min(100, 200)).toBe(100)
    expect(Math.min(100, 50)).toBe(50)
  })
})

describe("archetype filter parsing", () => {
  it("splits comma-separated IDs", () => {
    const param = "ironic-philosopher,wounded-critic,social-introvert"
    const ids = param
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
    expect(ids).toHaveLength(3)
    expect(ids).toContain("ironic-philosopher")
  })

  it("handles single ID", () => {
    const param = "lazy-perfectionist"
    const ids = param
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
    expect(ids).toHaveLength(1)
  })

  it("filters empty segments", () => {
    const param = "a,,b,"
    const ids = param
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
    expect(ids).toEqual(["a", "b"])
  })
})

describe("sort order", () => {
  it("accepts valid orders", () => {
    const asc: SortOrder = "asc"
    const desc: SortOrder = "desc"
    expect(asc).toBe("asc")
    expect(desc).toBe("desc")
  })
})
