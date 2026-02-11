import { describe, it, expect } from "vitest"
import { clamp, validateVector, euclideanDistance, cosineSimilarity } from "@/lib/vector/utils"

describe("clamp", () => {
  it("returns value when in range", () => {
    expect(clamp(0.5)).toBe(0.5)
    expect(clamp(0)).toBe(0)
    expect(clamp(1)).toBe(1)
  })

  it("clamps negative values to 0", () => {
    expect(clamp(-0.1)).toBe(0)
    expect(clamp(-100)).toBe(0)
  })

  it("clamps values above 1 to 1", () => {
    expect(clamp(1.1)).toBe(1)
    expect(clamp(100)).toBe(1)
  })
})

describe("validateVector", () => {
  it("validates a correct vector", () => {
    const result = validateVector({ a: 0.5, b: 0.0, c: 1.0 }, "test")
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("rejects out-of-range values", () => {
    const result = validateVector({ a: -0.1, b: 1.5 }, "test")
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(2)
  })

  it("rejects NaN values", () => {
    const result = validateVector({ a: NaN }, "test")
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain("NaN")
  })
})

describe("euclideanDistance", () => {
  it("returns 0 for identical vectors", () => {
    expect(euclideanDistance([0.5, 0.5], [0.5, 0.5])).toBe(0)
  })

  it("computes correct distance", () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5)
  })

  it("throws on mismatched lengths", () => {
    expect(() => euclideanDistance([1], [1, 2])).toThrow("length mismatch")
  })
})

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1)
  })

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
  })

  it("returns 0 for zero vector", () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })
})
