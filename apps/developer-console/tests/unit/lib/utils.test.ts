import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  cn,
  formatNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  truncateString,
  maskApiKey,
  generateId,
  sleep,
  getStatusColor,
  getHttpStatusColor,
} from "@/lib/utils"

describe("cn", () => {
  it("merges class names", () => {
    const result = cn("px-4", "py-2")
    expect(result).toContain("px-4")
    expect(result).toContain("py-2")
  })

  it("resolves conflicting tailwind classes", () => {
    const result = cn("px-4", "px-8")
    expect(result).toBe("px-8")
  })

  it("handles conditional classes", () => {
    const result = cn("base", false && "hidden", "active")
    expect(result).toContain("base")
    expect(result).toContain("active")
    expect(result).not.toContain("hidden")
  })

  it("handles undefined/null inputs", () => {
    const result = cn("base", undefined, null)
    expect(result).toBe("base")
  })
})

describe("formatNumber", () => {
  it("formats integers with commas", () => {
    expect(formatNumber(1000)).toBe("1,000")
    expect(formatNumber(1000000)).toBe("1,000,000")
  })

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0")
  })

  it("formats negative numbers", () => {
    expect(formatNumber(-1234)).toBe("-1,234")
  })

  it("formats small numbers without commas", () => {
    expect(formatNumber(42)).toBe("42")
  })
})

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    const result = formatCurrency(199.99)
    expect(result).toContain("199.99")
    expect(result).toContain("$")
  })

  it("formats zero", () => {
    const result = formatCurrency(0)
    expect(result).toContain("0")
  })

  it("formats large amounts", () => {
    const result = formatCurrency(15000)
    expect(result).toContain("15,000")
  })

  it("respects custom currency", () => {
    const result = formatCurrency(1000, "EUR")
    expect(result).toBeTruthy()
  })
})

describe("formatDate", () => {
  it("formats a date string", () => {
    const result = formatDate("2025-01-15")
    expect(result).toContain("Jan")
    expect(result).toContain("15")
    expect(result).toContain("2025")
  })

  it("formats a Date object", () => {
    const date = new Date(2025, 0, 15) // Jan 15, 2025
    const result = formatDate(date)
    expect(result).toContain("Jan")
    expect(result).toContain("15")
  })
})

describe("formatDateTime", () => {
  it("includes date and time", () => {
    const date = new Date(2025, 0, 15, 14, 30) // Jan 15, 2025 14:30
    const result = formatDateTime(date)
    expect(result).toContain("Jan")
    expect(result).toContain("15")
    expect(result).toContain("2025")
  })
})

describe("formatRelativeTime", () => {
  let now: Date

  beforeEach(() => {
    now = new Date()
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns 'just now' for very recent", () => {
    const recent = new Date(now.getTime() - 5000) // 5 seconds ago
    expect(formatRelativeTime(recent)).toBe("just now")
  })

  it("returns minutes ago", () => {
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5m ago")
  })

  it("returns hours ago", () => {
    const threeHoursAgo = new Date(now.getTime() - 3 * 3600 * 1000)
    expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago")
  })

  it("returns days ago", () => {
    const twoDaysAgo = new Date(now.getTime() - 2 * 86400 * 1000)
    expect(formatRelativeTime(twoDaysAgo)).toBe("2d ago")
  })

  it("returns formatted date for old dates", () => {
    const oldDate = new Date(now.getTime() - 30 * 86400 * 1000) // 30 days ago
    const result = formatRelativeTime(oldDate)
    expect(result).not.toContain("ago")
  })
})

describe("truncateString", () => {
  it("returns full string if under limit", () => {
    expect(truncateString("hello", 10)).toBe("hello")
  })

  it("truncates with ellipsis", () => {
    expect(truncateString("hello world", 5)).toBe("hello...")
  })

  it("returns exact length string unchanged", () => {
    expect(truncateString("hello", 5)).toBe("hello")
  })
})

describe("maskApiKey", () => {
  it("masks middle of long keys", () => {
    const key = "ds_live_abcdefghijklmnop"
    const masked = maskApiKey(key)
    expect(masked).toContain("ds_live_")
    expect(masked).toContain("...")
    expect(masked.endsWith("mnop")).toBe(true)
  })

  it("returns short keys unmasked", () => {
    const shortKey = "abc123"
    expect(maskApiKey(shortKey)).toBe("abc123")
  })
})

describe("generateId", () => {
  it("returns a string", () => {
    const id = generateId()
    expect(typeof id).toBe("string")
    expect(id.length).toBeGreaterThan(0)
  })

  it("generates unique ids", () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
  })
})

describe("sleep", () => {
  it("resolves after the specified time", async () => {
    const start = Date.now()
    await sleep(50)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(40) // Some tolerance
  })
})

describe("getStatusColor", () => {
  it("returns green for active status", () => {
    expect(getStatusColor("active")).toContain("green")
  })

  it("returns green for success", () => {
    expect(getStatusColor("success")).toContain("green")
  })

  it("returns yellow for pending", () => {
    expect(getStatusColor("pending")).toContain("yellow")
  })

  it("returns red for error", () => {
    expect(getStatusColor("error")).toContain("red")
  })

  it("returns gray for inactive", () => {
    expect(getStatusColor("inactive")).toContain("gray")
  })

  it("returns blue for unknown status", () => {
    expect(getStatusColor("unknown")).toContain("blue")
  })
})

describe("getHttpStatusColor", () => {
  it("returns green for 2xx", () => {
    expect(getHttpStatusColor(200)).toContain("green")
    expect(getHttpStatusColor(201)).toContain("green")
    expect(getHttpStatusColor(204)).toContain("green")
  })

  it("returns yellow for 4xx", () => {
    expect(getHttpStatusColor(400)).toContain("yellow")
    expect(getHttpStatusColor(404)).toContain("yellow")
    expect(getHttpStatusColor(429)).toContain("yellow")
  })

  it("returns red for 5xx", () => {
    expect(getHttpStatusColor(500)).toContain("red")
    expect(getHttpStatusColor(503)).toContain("red")
  })

  it("returns gray for other codes", () => {
    expect(getHttpStatusColor(100)).toContain("gray")
    expect(getHttpStatusColor(301)).toContain("gray")
  })
})
