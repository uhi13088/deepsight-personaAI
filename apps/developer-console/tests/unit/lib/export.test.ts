import { describe, it, expect } from "vitest"
import { convertToCSV, generateFilename } from "@/lib/export"

describe("convertToCSV", () => {
  it("returns empty string for empty data", () => {
    expect(convertToCSV([])).toBe("")
  })

  it("converts simple data to CSV", () => {
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]
    const csv = convertToCSV(data)
    const lines = csv.split("\n")
    expect(lines[0]).toBe("name,age")
    expect(lines[1]).toBe("Alice,30")
    expect(lines[2]).toBe("Bob,25")
  })

  it("uses custom column labels", () => {
    const data = [{ name: "Alice", age: 30 }]
    const columns = [
      { key: "name", label: "Name" },
      { key: "age", label: "Age" },
    ]
    const csv = convertToCSV(data, columns)
    expect(csv.startsWith("Name,Age")).toBe(true)
  })

  it("escapes commas in values", () => {
    const data = [{ name: "Last, First", age: 30 }]
    const csv = convertToCSV(data)
    expect(csv).toContain('"Last, First"')
  })

  it("escapes quotes in values", () => {
    const data = [{ name: 'He said "hello"', age: 30 }]
    const csv = convertToCSV(data)
    expect(csv).toContain('"He said ""hello"""')
  })

  it("handles null and undefined values", () => {
    const data = [{ name: null, age: undefined }] as unknown as Record<string, unknown>[]
    const csv = convertToCSV(data)
    expect(csv).toContain(",")
  })

  it("handles nested objects by serializing to JSON", () => {
    const data = [{ name: "Alice", meta: { role: "admin" } }]
    const csv = convertToCSV(data)
    // JSON contains quotes which get CSV-escaped (doubled quotes, wrapped in quotes)
    expect(csv).toContain("Alice")
    expect(csv).toContain("role")
    expect(csv).toContain("admin")
  })

  it("handles Date values", () => {
    const date = new Date("2025-01-15T00:00:00Z")
    const data = [{ name: "Alice", created: date }]
    const csv = convertToCSV(data)
    expect(csv).toContain("2025-01-15")
  })

  it("selects only specified columns", () => {
    const data = [{ name: "Alice", age: 30, email: "alice@example.com" }]
    const columns = [{ key: "name", label: "Name" }]
    const csv = convertToCSV(data, columns)
    const lines = csv.split("\n")
    expect(lines[0]).toBe("Name")
    expect(lines[1]).toBe("Alice")
  })
})

describe("generateFilename", () => {
  it("includes the prefix", () => {
    const filename = generateFilename("usage_data")
    expect(filename.startsWith("usage_data_")).toBe(true)
  })

  it("includes date in YYYY-MM-DD format", () => {
    const filename = generateFilename("test")
    expect(filename).toMatch(/test_\d{4}-\d{2}-\d{2}/)
  })

  it("generates different prefixes correctly", () => {
    const f1 = generateFilename("logs")
    const f2 = generateFilename("usage")
    expect(f1).toContain("logs")
    expect(f2).toContain("usage")
  })
})
