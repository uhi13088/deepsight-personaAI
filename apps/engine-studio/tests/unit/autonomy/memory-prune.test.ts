import { describe, it, expect } from "vitest"
import { selectMemoriesToPrune, type PrunableMemory } from "@/lib/autonomy/memory-prune"

function makeMem(overrides: Partial<PrunableMemory> = {}): PrunableMemory {
  return {
    id: `mem-${Math.random().toString(36).slice(2, 8)}`,
    personaId: "p1",
    category: "BELIEF",
    subject: "test",
    confidence: 0.5,
    evidenceCount: 1,
    ...overrides,
  }
}

describe("selectMemoriesToPrune", () => {
  describe("Rule 1: Low Confidence", () => {
    it("confidence < threshold → 삭제 대상", () => {
      const memories = [
        makeMem({ confidence: 0.1, subject: "low" }),
        makeMem({ confidence: 0.5, subject: "high" }),
      ]
      const result = selectMemoriesToPrune(memories, {
        pruneConfidenceThreshold: 0.2,
        maxPerCategory: 100,
      })
      expect(result.prunedCount).toBe(1)
      expect(result.decisions[0].rule).toBe("low_confidence")
    })

    it("evidenceCount ≥ 3 → 보호", () => {
      const memories = [makeMem({ confidence: 0.1, evidenceCount: 5 })]
      const result = selectMemoriesToPrune(memories, {
        pruneConfidenceThreshold: 0.2,
        maxPerCategory: 100,
      })
      expect(result.prunedCount).toBe(0)
      expect(result.skippedProtected).toBe(1)
    })
  })

  describe("Rule 2: Duplicate Subject", () => {
    it("같은 subject 2개 → 낮은 confidence 삭제", () => {
      const memories = [
        makeMem({ subject: "same", confidence: 0.3, category: "BELIEF" }),
        makeMem({ subject: "same", confidence: 0.8, category: "BELIEF" }),
      ]
      const result = selectMemoriesToPrune(memories, {
        pruneConfidenceThreshold: 0.1,
        maxPerCategory: 100,
      })
      expect(result.prunedCount).toBe(1)
      expect(result.decisions[0].rule).toBe("duplicate")
    })

    it("다른 카테고리의 같은 subject → 중복 아님", () => {
      const memories = [
        makeMem({ subject: "same", confidence: 0.3, category: "BELIEF" }),
        makeMem({ subject: "same", confidence: 0.3, category: "LEARNED_PATTERN" }),
      ]
      const result = selectMemoriesToPrune(memories, {
        pruneConfidenceThreshold: 0.1,
        maxPerCategory: 100,
      })
      expect(result.prunedCount).toBe(0)
    })
  })

  describe("Rule 3: Overflow", () => {
    it("maxPerCategory 초과 → 낮은 confidence부터 삭제", () => {
      const memories = Array.from({ length: 5 }, (_, i) =>
        makeMem({ subject: `s${i}`, confidence: (i + 1) * 0.1, category: "BELIEF" })
      )
      const result = selectMemoriesToPrune(memories, {
        pruneConfidenceThreshold: 0.05,
        maxPerCategory: 3,
      })
      expect(result.prunedCount).toBe(2)
      expect(result.decisions.every((d) => d.rule === "overflow")).toBe(true)
    })
  })

  describe("안전 장치", () => {
    it("1회 최대 10개까지만 삭제", () => {
      const memories = Array.from({ length: 20 }, (_, i) =>
        makeMem({ subject: `s${i}`, confidence: 0.05 })
      )
      const result = selectMemoriesToPrune(memories, {
        pruneConfidenceThreshold: 0.2,
        maxPerCategory: 100,
      })
      expect(result.prunedCount).toBeLessThanOrEqual(10)
    })
  })

  describe("config=null → 기본값 사용", () => {
    it("기본값으로 동작", () => {
      const memories = [makeMem({ confidence: 0.1 })]
      const result = selectMemoriesToPrune(memories, null)
      expect(result.prunedCount).toBe(1) // 기본 threshold 0.2
    })
  })
})
