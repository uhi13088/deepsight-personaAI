import { describe, it, expect } from "vitest"
import { formatNumber, formatPercent, formatCurrency, generateId, cn } from "@/lib/utils"

describe("Utility Functions", () => {
  describe("formatNumber", () => {
    it("숫자를 한국어 형식으로 포맷해야 함", () => {
      expect(formatNumber(1000)).toBe("1,000")
      expect(formatNumber(1000000)).toBe("1,000,000")
    })

    it("0을 올바르게 포맷해야 함", () => {
      expect(formatNumber(0)).toBe("0")
    })

    it("음수를 올바르게 포맷해야 함", () => {
      expect(formatNumber(-1000)).toBe("-1,000")
    })
  })

  describe("formatPercent", () => {
    it("숫자를 퍼센트로 변환해야 함", () => {
      const result = formatPercent(50)
      expect(result).toContain("50")
      expect(result).toContain("%")
    })

    it("0%를 올바르게 포맷해야 함", () => {
      const result = formatPercent(0)
      expect(result).toContain("0")
    })

    it("100%를 올바르게 포맷해야 함", () => {
      const result = formatPercent(100)
      expect(result).toContain("100")
    })
  })

  describe("formatCurrency", () => {
    it("USD로 기본 포맷해야 함", () => {
      const result = formatCurrency(100)
      expect(result).toContain("$")
      expect(result).toContain("100")
    })

    it("다른 통화도 지원해야 함", () => {
      const result = formatCurrency(100, "EUR")
      expect(result).toContain("€")
    })

    it("소수점을 포함해야 함", () => {
      const result = formatCurrency(99.99)
      expect(result).toContain("99.99")
    })
  })

  describe("generateId", () => {
    it("고유한 ID를 생성해야 함", () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })

    it("문자열을 반환해야 함", () => {
      const id = generateId()
      expect(typeof id).toBe("string")
    })

    it("빈 문자열이 아니어야 함", () => {
      const id = generateId()
      expect(id.length).toBeGreaterThan(0)
    })
  })

  describe("cn (className utility)", () => {
    it("여러 클래스를 병합해야 함", () => {
      const result = cn("class1", "class2")
      expect(result).toContain("class1")
      expect(result).toContain("class2")
    })

    it("조건부 클래스를 처리해야 함", () => {
      const result = cn("base", true && "conditional")
      expect(result).toContain("conditional")
    })

    it("falsy 값을 무시해야 함", () => {
      const result = cn("base", false && "ignored", null, undefined)
      expect(result).toBe("base")
    })

    it("Tailwind 클래스 충돌을 해결해야 함", () => {
      const result = cn("p-2", "p-4")
      expect(result).toBe("p-4")
    })
  })
})
