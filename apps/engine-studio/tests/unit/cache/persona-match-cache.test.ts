// ═══════════════════════════════════════════════════════════════
// PersonaMatchCache Tests — T377
// get/set/invalidate/bulkGet + cache-aside 패턴 검증
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { PrecomputedMatchData } from "@/lib/cache/persona-match-cache"

// ── Hoisted mocks (vi.mock factory에서 참조 가능) ────────────

const { mockRedisStore, mockRedis, mockPipeline, mockPrisma } = vi.hoisted(() => {
  const mockRedisStore = new Map<string, unknown>()

  const mockPipeline = {
    get: vi.fn(),
    exec: vi.fn(),
  }

  const mockRedis = {
    get: vi.fn(async (key: string) => mockRedisStore.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      mockRedisStore.set(key, value)
      return "OK"
    }),
    del: vi.fn(async (key: string) => {
      mockRedisStore.delete(key)
      return 1
    }),
    pipeline: vi.fn(() => mockPipeline),
  }

  const mockPrisma = {
    personaLayerVector: { findMany: vi.fn() },
    persona: { findUnique: vi.fn() },
  }

  return { mockRedisStore, mockRedis, mockPipeline, mockPrisma }
})

vi.mock("@/lib/redis", () => ({
  redis: mockRedis,
  default: mockRedis,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}))

vi.mock("@/lib/vector/v-final", () => ({
  calculateVFinal: vi.fn(() => ({
    vector: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    pressure: 0.3,
    layerContributions: { l1Weight: 0.7, l2Weight: 0.18, l3Weight: 0.12 },
    l2Projected: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    l3Projected: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  })),
}))

vi.mock("@/lib/vector/cross-axis", () => ({
  calculateCrossAxisProfile: vi.fn(() => ({
    axes: [],
    byType: { l1l2: [], l1l3: [], l2l3: [] },
    summary: {
      paradoxCount: 0,
      reinforcingCount: 0,
      modulatingIntensity: 0,
      dominantRelationship: "neutral",
      characterComplexity: 0,
    },
  })),
}))

vi.mock("@/lib/vector/paradox", () => ({
  calculateExtendedParadoxScore: vi.fn(() => ({
    l1l2: 0.3,
    l1l3: 0.2,
    l2l3: 0.1,
    overall: 0.22,
    dimensionality: 0.8,
    dominant: { layer: "L1xL2", score: 0.3 },
  })),
}))

// ── Import after mocks ───────────────────────────────────────

import {
  getMatchData,
  setMatchData,
  invalidateMatchData,
  bulkGetMatchData,
  computeAndCache,
  getOrCompute,
} from "@/lib/cache/persona-match-cache"

// ── Test Data ────────────────────────────────────────────────

function makeMatchData(overrides?: Partial<PrecomputedMatchData>): PrecomputedMatchData {
  return {
    vFinal: {
      vector: [0.6, 0.7, 0.5, 0.6, 0.4, 0.5, 0.3],
      pressure: 0.3,
      layerContributions: { l1Weight: 0.7, l2Weight: 0.18, l3Weight: 0.12 },
      l2Projected: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      l3Projected: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    },
    crossAxisProfile: {
      axes: [],
      byType: { l1l2: [], l1l3: [], l2l3: [] },
      summary: {
        paradoxCount: 3,
        reinforcingCount: 5,
        modulatingIntensity: 0.4,
        dominantRelationship: "reinforcing" as const,
        characterComplexity: 0.35,
      },
    },
    paradoxProfile: {
      l1l2: 0.35,
      l1l3: 0.2,
      l2l3: 0.15,
      overall: 0.255,
      dimensionality: 0.82,
      dominant: { layer: "L1xL2" as const, score: 0.35 },
    },
    archetype: "analyst",
    updatedAt: "2026-03-09T00:00:00.000Z",
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────

describe("PersonaMatchCache", () => {
  beforeEach(() => {
    mockRedisStore.clear()
    vi.clearAllMocks()
    // Restore default implementations after clearAllMocks
    mockRedis.get.mockImplementation(async (key: string) => mockRedisStore.get(key) ?? null)
    mockRedis.set.mockImplementation(async (key: string, value: unknown) => {
      mockRedisStore.set(key, value)
      return "OK"
    })
    mockRedis.del.mockImplementation(async (key: string) => {
      mockRedisStore.delete(key)
      return 1
    })
    mockRedis.pipeline.mockReturnValue(mockPipeline)
  })

  describe("getMatchData", () => {
    it("캐시 히트 시 데이터 반환", async () => {
      const data = makeMatchData()
      mockRedisStore.set("persona:p1:match", data)

      const result = await getMatchData("p1")
      expect(result).toEqual(data)
      expect(mockRedis.get).toHaveBeenCalledWith("persona:p1:match")
    })

    it("캐시 미스 시 null 반환", async () => {
      const result = await getMatchData("nonexistent")
      expect(result).toBeNull()
    })

    it("Redis 에러 시 null 반환 (graceful)", async () => {
      mockRedis.get.mockRejectedValueOnce(new Error("Connection refused"))
      const result = await getMatchData("p1")
      expect(result).toBeNull()
    })
  })

  describe("setMatchData", () => {
    it("캐시에 데이터 저장 (TTL 7일)", async () => {
      const data = makeMatchData()
      await setMatchData("p1", data)

      expect(mockRedis.set).toHaveBeenCalledWith("persona:p1:match", data, {
        ex: 7 * 24 * 60 * 60,
      })
    })

    it("Redis 에러 시 예외 전파 안 함", async () => {
      mockRedis.set.mockRejectedValueOnce(new Error("Write failed"))
      await expect(setMatchData("p1", makeMatchData())).resolves.not.toThrow()
    })
  })

  describe("invalidateMatchData", () => {
    it("캐시 키 삭제", async () => {
      mockRedisStore.set("persona:p1:match", makeMatchData())

      await invalidateMatchData("p1")
      expect(mockRedis.del).toHaveBeenCalledWith("persona:p1:match")
    })

    it("존재하지 않는 키 삭제 시에도 에러 없음", async () => {
      await expect(invalidateMatchData("nonexistent")).resolves.not.toThrow()
    })
  })

  describe("bulkGetMatchData", () => {
    it("여러 페르소나 일괄 조회 — 히트/미스 분리", async () => {
      const data1 = makeMatchData({ archetype: "creator" })
      const data2 = makeMatchData({ archetype: "rebel" })

      mockPipeline.get.mockReturnValue(mockPipeline)
      mockPipeline.exec.mockResolvedValueOnce([data1, null, data2])

      const { hits, misses } = await bulkGetMatchData(["p1", "p2", "p3"])

      expect(hits.size).toBe(2)
      expect(hits.get("p1")).toEqual(data1)
      expect(hits.get("p3")).toEqual(data2)
      expect(misses).toEqual(["p2"])
    })

    it("빈 배열 시 즉시 반환", async () => {
      const { hits, misses } = await bulkGetMatchData([])
      expect(hits.size).toBe(0)
      expect(misses).toEqual([])
    })

    it("pipeline 에러 시 전체 미스 반환", async () => {
      mockPipeline.get.mockReturnValue(mockPipeline)
      mockPipeline.exec.mockRejectedValueOnce(new Error("Pipeline failed"))

      const { hits, misses } = await bulkGetMatchData(["p1", "p2"])
      expect(hits.size).toBe(0)
      expect(misses).toEqual(["p1", "p2"])
    })
  })

  describe("computeAndCache", () => {
    it("DB에서 벡터 로드 → 계산 → 캐시 저장", async () => {
      mockPrisma.personaLayerVector.findMany.mockResolvedValueOnce([
        {
          layerType: "SOCIAL",
          dim1: 0.7,
          dim2: 0.8,
          dim3: 0.6,
          dim4: 0.7,
          dim5: 0.4,
          dim6: 0.6,
          dim7: 0.3,
        },
        {
          layerType: "TEMPERAMENT",
          dim1: 0.7,
          dim2: 0.6,
          dim3: 0.4,
          dim4: 0.5,
          dim5: 0.3,
          dim6: null,
          dim7: null,
        },
      ])

      mockPrisma.persona.findUnique.mockResolvedValueOnce({
        archetypeId: "analyst",
      })

      const result = await computeAndCache("p1")

      expect(result).not.toBeNull()
      expect(result?.archetype).toBe("analyst")
      expect(mockRedis.set).toHaveBeenCalled()
    })

    it("벡터 없는 페르소나 → null 반환", async () => {
      mockPrisma.personaLayerVector.findMany.mockResolvedValueOnce([])

      const result = await computeAndCache("nonexistent")
      expect(result).toBeNull()
      expect(mockRedis.set).not.toHaveBeenCalled()
    })
  })

  describe("getOrCompute (cache-aside)", () => {
    it("캐시 히트 → DB 조회 안 함", async () => {
      const data = makeMatchData()
      mockRedisStore.set("persona:p1:match", data)

      const result = await getOrCompute("p1")

      expect(result).toEqual(data)
      expect(mockPrisma.personaLayerVector.findMany).not.toHaveBeenCalled()
    })

    it("캐시 미스 → 계산 + 캐시 저장", async () => {
      mockPrisma.personaLayerVector.findMany.mockResolvedValueOnce([
        {
          layerType: "SOCIAL",
          dim1: 0.5,
          dim2: 0.5,
          dim3: 0.5,
          dim4: 0.5,
          dim5: 0.5,
          dim6: 0.5,
          dim7: 0.5,
        },
      ])

      mockPrisma.persona.findUnique.mockResolvedValueOnce({
        archetypeId: null,
      })

      const result = await getOrCompute("p1")

      expect(result).not.toBeNull()
      expect(mockPrisma.personaLayerVector.findMany).toHaveBeenCalled()
      expect(mockRedis.set).toHaveBeenCalled()
    })
  })
})
