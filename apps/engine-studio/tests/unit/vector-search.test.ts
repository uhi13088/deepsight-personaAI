import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  findSimilarPersonas,
  dimsToVector,
  type VectorSearchLayer,
  type VectorSearchOptions,
} from "@/lib/vector-search"

// ── Mock Prisma ──────────────────────────────────────────────

function createMockPrisma(queryResult: unknown[] = []) {
  return {
    $queryRaw: vi.fn().mockResolvedValue(queryResult),
  } as unknown as Parameters<typeof findSimilarPersonas>[0]
}

// ── Decimal mock for dimsToVector tests ──────────────────────

function dec(n: number) {
  return { toNumber: () => n }
}

// ═════════════════════════════════════════════════════════════
// dimsToVector
// ═════════════════════════════════════════════════════════════

describe("dimsToVector", () => {
  it("L1(SOCIAL) → 7차원 배열 반환", () => {
    const row = {
      dim1: dec(0.5),
      dim2: dec(0.3),
      dim3: dec(0.7),
      dim4: dec(0.2),
      dim5: dec(0.8),
      dim6: dec(0.1),
      dim7: dec(0.9),
    }
    const result = dimsToVector(row, "SOCIAL")
    expect(result).toEqual([0.5, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9])
    expect(result).toHaveLength(7)
  })

  it("L2(TEMPERAMENT) → 5차원 배열 반환", () => {
    const row = { dim1: dec(0.1), dim2: dec(0.2), dim3: dec(0.3), dim4: dec(0.4), dim5: dec(0.5) }
    const result = dimsToVector(row, "TEMPERAMENT")
    expect(result).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
    expect(result).toHaveLength(5)
  })

  it("L3(NARRATIVE) → 4차원 배열 반환", () => {
    const row = { dim1: dec(0.6), dim2: dec(0.7), dim3: dec(0.8), dim4: dec(0.9), dim5: null }
    const result = dimsToVector(row, "NARRATIVE")
    expect(result).toEqual([0.6, 0.7, 0.8, 0.9])
    expect(result).toHaveLength(4)
  })

  it("null 값은 0으로 대체", () => {
    const row = {
      dim1: null,
      dim2: dec(0.5),
      dim3: null,
      dim4: dec(0.3),
      dim5: null,
      dim6: null,
      dim7: null,
    }
    const result = dimsToVector(row, "SOCIAL")
    expect(result).toEqual([0, 0.5, 0, 0.3, 0, 0, 0])
  })

  it("일반 number 값도 처리", () => {
    const row = { dim1: 0.5, dim2: 0.3, dim3: 0.7, dim4: 0.2, dim5: 0.8 }
    const result = dimsToVector(row, "TEMPERAMENT")
    expect(result).toEqual([0.5, 0.3, 0.7, 0.2, 0.8])
  })
})

// ═════════════════════════════════════════════════════════════
// findSimilarPersonas
// ═════════════════════════════════════════════════════════════

describe("findSimilarPersonas", () => {
  // ── 차원 불일치 에러 ──

  it("벡터 차원 불일치 시 에러", async () => {
    const prisma = createMockPrisma()
    await expect(
      findSimilarPersonas(prisma, {
        targetVector: [0.1, 0.2, 0.3], // 3D → SOCIAL은 7D 필요
        layer: "SOCIAL",
      })
    ).rejects.toThrow("Vector dimension mismatch: expected 7 for SOCIAL, got 3")
  })

  it("L2 벡터에 7D 넣으면 에러", async () => {
    const prisma = createMockPrisma()
    await expect(
      findSimilarPersonas(prisma, {
        targetVector: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
        layer: "TEMPERAMENT",
      })
    ).rejects.toThrow("expected 5 for TEMPERAMENT, got 7")
  })

  it("L3 벡터에 5D 넣으면 에러", async () => {
    const prisma = createMockPrisma()
    await expect(
      findSimilarPersonas(prisma, {
        targetVector: [0.1, 0.2, 0.3, 0.4, 0.5],
        layer: "NARRATIVE",
      })
    ).rejects.toThrow("expected 4 for NARRATIVE, got 5")
  })

  // ── 정상 동작 ──

  it("L1 SOCIAL 검색 — raw SQL 호출 + 결과 매핑", async () => {
    const mockResults = [
      { id: "lv-1", personaId: "p-1", distance: 0.05 },
      { id: "lv-2", personaId: "p-2", distance: 0.12 },
    ]
    const prisma = createMockPrisma(mockResults)

    const results = await findSimilarPersonas(prisma, {
      targetVector: [0.5, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9],
      layer: "SOCIAL",
      topK: 5,
    })

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      personaId: "p-1",
      layerVectorId: "lv-1",
      distance: 0.05,
    })
    expect(results[1]).toEqual({
      personaId: "p-2",
      layerVectorId: "lv-2",
      distance: 0.12,
    })
  })

  it("L2 TEMPERAMENT 검색", async () => {
    const prisma = createMockPrisma([{ id: "lv-3", personaId: "p-3", distance: 0.08 }])

    const results = await findSimilarPersonas(prisma, {
      targetVector: [0.1, 0.2, 0.3, 0.4, 0.5],
      layer: "TEMPERAMENT",
    })

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
    expect(results).toHaveLength(1)
    expect(results[0].personaId).toBe("p-3")
  })

  it("L3 NARRATIVE 검색", async () => {
    const prisma = createMockPrisma([{ id: "lv-4", personaId: "p-4", distance: 0.15 }])

    const results = await findSimilarPersonas(prisma, {
      targetVector: [0.6, 0.7, 0.8, 0.9],
      layer: "NARRATIVE",
    })

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
    expect(results).toHaveLength(1)
    expect(results[0].personaId).toBe("p-4")
  })

  it("빈 결과 반환 시 빈 배열", async () => {
    const prisma = createMockPrisma([])

    const results = await findSimilarPersonas(prisma, {
      targetVector: [0.5, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9],
      layer: "SOCIAL",
    })

    expect(results).toEqual([])
  })

  it("topK 기본값 10", async () => {
    const prisma = createMockPrisma([])

    await findSimilarPersonas(prisma, {
      targetVector: [0.5, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9],
      layer: "SOCIAL",
    })

    // SQL에 LIMIT 10이 포함되는지 확인
    const call = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[0]
    // Prisma.sql 템플릿 → strings + values에서 마지막 value가 topK
    const templateValues = call[0].values
    expect(templateValues[templateValues.length - 1]).toBe(10)
  })

  it("threshold 옵션 — SQL WHERE에 distance 조건 포함", async () => {
    const prisma = createMockPrisma([])

    await findSimilarPersonas(prisma, {
      targetVector: [0.5, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9],
      layer: "SOCIAL",
      threshold: 0.3,
    })

    const call = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[0]
    // raw SQL 문자열에 threshold 조건이 포함되어야 함
    const sqlStrings = call[0].strings.join("")
    expect(sqlStrings).toContain("< 0.3")
  })

  it("excludePersonaIds 옵션 — SQL WHERE에 NOT IN 조건 포함", async () => {
    const prisma = createMockPrisma([])

    await findSimilarPersonas(prisma, {
      targetVector: [0.5, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9],
      layer: "SOCIAL",
      excludePersonaIds: ["p-self", "p-other"],
    })

    const call = (prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[0]
    const sqlStrings = call[0].strings.join("")
    expect(sqlStrings).toContain("NOT IN")
    expect(sqlStrings).toContain("p-self")
    expect(sqlStrings).toContain("p-other")
  })

  it("distance 값이 number로 변환됨 (bigint/string 등)", async () => {
    const prisma = createMockPrisma([{ id: "lv-5", personaId: "p-5", distance: "0.123" }])

    const results = await findSimilarPersonas(prisma, {
      targetVector: [0.5, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9],
      layer: "SOCIAL",
    })

    expect(typeof results[0].distance).toBe("number")
    expect(results[0].distance).toBe(0.123)
  })
})
