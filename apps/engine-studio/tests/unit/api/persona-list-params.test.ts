import { describe, it, expect } from "vitest"
import type {
  PersonaListParams,
  VectorRangeFilter,
  CrossAxisFilter,
  PersonaListItem,
  PaginationMeta,
  PersonaListResponse,
  ApiResponse,
} from "@/types"

// ── API Types Validation Tests ──────────────────────────────
// These tests validate the type contracts and query string building
// that the persona list API consumes.

describe("PersonaListParams", () => {
  it("accepts all valid query params", () => {
    const params: PersonaListParams = {
      status: "ACTIVE",
      source: "MANUAL",
      search: "철학자",
      archetype: "ironic-philosopher,wounded-critic",
      vectorFilters: JSON.stringify({ l1: { depth: { min: 0.5, max: 0.9 } } }),
      paradoxMin: "0.3",
      paradoxMax: "0.7",
      crossAxisFilters: JSON.stringify([{ axisId: "l1_stance__l2_agreeableness", minScore: 0.5 }]),
      sort: "paradoxScore",
      order: "desc",
      page: "1",
      limit: "20",
    }

    expect(params.status).toBe("ACTIVE")
    expect(params.sort).toBe("paradoxScore")
    expect(params.page).toBe("1")
  })

  it("accepts minimal params", () => {
    const params: PersonaListParams = {}
    expect(params.status).toBeUndefined()
    expect(params.page).toBeUndefined()
  })
})

describe("VectorRangeFilter", () => {
  it("supports all 3 layers", () => {
    const filter: VectorRangeFilter = {
      l1: {
        depth: { min: 0.3, max: 0.8 },
        lens: { max: 0.5 },
      },
      l2: {
        openness: { min: 0.6 },
        neuroticism: { min: 0.2, max: 0.7 },
      },
      l3: {
        lack: { min: 0.0, max: 0.5 },
      },
    }

    expect(filter.l1?.depth?.min).toBe(0.3)
    expect(filter.l2?.neuroticism?.max).toBe(0.7)
    expect(filter.l3?.lack?.min).toBe(0.0)
  })

  it("supports empty filter", () => {
    const filter: VectorRangeFilter = {}
    expect(Object.keys(filter)).toHaveLength(0)
  })
})

describe("CrossAxisFilter", () => {
  it("accepts axis ID with score range", () => {
    const filter: CrossAxisFilter = {
      axisId: "l1_stance__l2_agreeableness",
      minScore: 0.5,
      maxScore: 0.9,
    }

    expect(filter.axisId).toContain("l1_stance")
    expect(filter.minScore).toBe(0.5)
  })

  it("accepts partial score range", () => {
    const filter: CrossAxisFilter = {
      axisId: "l1_depth__l2_openness",
      minScore: 0.3,
    }

    expect(filter.maxScore).toBeUndefined()
  })
})

describe("PersonaListItem", () => {
  it("has correct structure", () => {
    const item: PersonaListItem = {
      id: "test_123",
      name: "아이러니한 철학자 #42",
      role: "REVIEWER",
      expertise: ["영화", "도서"],
      description: "논리적으로 분석하지만 결론에서 불안을 드러내는 비평가",
      profileImageUrl: null,
      status: "ACTIVE",
      source: "MANUAL",
      archetypeId: "ironic-philosopher",
      paradoxScore: 0.72,
      dimensionalityScore: 0.85,
      qualityScore: 85.5,
      validationScore: 0.92,
      vectors: {
        l1: {
          depth: 0.85,
          lens: 0.9,
          stance: 0.75,
          scope: 0.8,
          taste: 0.35,
          purpose: 0.7,
          sociability: 0.3,
        },
        l2: {
          openness: 0.75,
          conscientiousness: 0.6,
          extraversion: 0.35,
          agreeableness: 0.45,
          neuroticism: 0.7,
        },
        l3: { lack: 0.65, moralCompass: 0.55, volatility: 0.5, growthArc: 0.6 },
      },
      createdAt: "2026-01-15T09:30:00Z",
      updatedAt: "2026-02-01T14:00:00Z",
    }

    expect(item.id).toBe("test_123")
    expect(item.vectors.l1).not.toBeNull()
    expect(Object.keys(item.vectors.l1!)).toHaveLength(7)
    expect(Object.keys(item.vectors.l2!)).toHaveLength(5)
    expect(Object.keys(item.vectors.l3!)).toHaveLength(4)
    expect(item.archetypeId).toBe("ironic-philosopher")
  })

  it("allows null vectors for incomplete personas", () => {
    const item: PersonaListItem = {
      id: "draft_1",
      name: "초안 페르소나",
      role: "CURATOR",
      expertise: [],
      description: null,
      profileImageUrl: null,
      status: "DRAFT",
      source: "MANUAL",
      archetypeId: null,
      paradoxScore: null,
      dimensionalityScore: null,
      qualityScore: null,
      validationScore: null,
      vectors: { l1: null, l2: null, l3: null },
      createdAt: "2026-02-11T00:00:00Z",
      updatedAt: "2026-02-11T00:00:00Z",
    }

    expect(item.vectors.l1).toBeNull()
    expect(item.paradoxScore).toBeNull()
  })
})

describe("PersonaListResponse", () => {
  it("has correct pagination structure", () => {
    const pagination: PaginationMeta = {
      currentPage: 2,
      totalPages: 5,
      totalCount: 98,
      hasNext: true,
      hasPrev: true,
    }

    expect(pagination.totalPages).toBe(5)
    expect(pagination.hasNext).toBe(true)
  })

  it("has filter stats", () => {
    const response: PersonaListResponse = {
      personas: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        hasNext: false,
        hasPrev: false,
      },
      filterStats: {
        totalMatched: 0,
        statusDistribution: {
          ACTIVE: 42,
          DRAFT: 15,
          ARCHIVED: 8,
        },
      },
    }

    expect(response.filterStats.statusDistribution.ACTIVE).toBe(42)
  })
})

describe("ApiResponse wrapper", () => {
  it("wraps success response", () => {
    const response: ApiResponse<PersonaListResponse> = {
      success: true,
      data: {
        personas: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNext: false,
          hasPrev: false,
        },
        filterStats: {
          totalMatched: 0,
          statusDistribution: {},
        },
      },
    }

    expect(response.success).toBe(true)
    expect(response.data?.personas).toHaveLength(0)
  })

  it("wraps error response", () => {
    const response: ApiResponse<PersonaListResponse> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch",
      },
    }

    expect(response.success).toBe(false)
    expect(response.error?.code).toBe("INTERNAL_ERROR")
  })
})
