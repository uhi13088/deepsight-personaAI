import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * T394: auto-curation — ConsumptionLog → PersonaCuratedContent 단위 테스트
 * Prisma mock으로 DB 접근 대체.
 */

// ── Prisma mock (vi.hoisted로 호이스팅) ──────────────────────

const {
  mockFindManyLogs,
  mockFindUniqueContentItem,
  mockFindUniqueCuration,
  mockCreateCuration,
  mockFindManyPersonas,
} = vi.hoisted(() => ({
  mockFindManyLogs: vi.fn(),
  mockFindUniqueContentItem: vi.fn(),
  mockFindUniqueCuration: vi.fn(),
  mockCreateCuration: vi.fn(),
  mockFindManyPersonas: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    consumptionLog: {
      findMany: mockFindManyLogs,
    },
    contentItem: {
      findUnique: mockFindUniqueContentItem,
    },
    personaCuratedContent: {
      findUnique: mockFindUniqueCuration,
      create: mockCreateCuration,
    },
    persona: {
      findMany: mockFindManyPersonas,
    },
  },
}))

import { runAutoCuration, runAutoCurationAll } from "@/lib/content/auto-curation"

beforeEach(() => {
  vi.clearAllMocks()
})

// ── runAutoCuration ───────────────────────────────────────────

describe("runAutoCuration — rating 필터", () => {
  it("rating >= 0.7 + contentId 있는 로그만 처리", async () => {
    mockFindManyLogs.mockResolvedValue([
      { contentId: "content-1", rating: 0.7, impression: "좋았음" },
      { contentId: "content-2", rating: 0.9, impression: "최고" },
    ])
    mockFindUniqueContentItem.mockResolvedValue({ id: "content-1" })
    mockFindUniqueCuration.mockResolvedValue(null) // 기존 없음
    mockCreateCuration.mockResolvedValue({})

    const result = await runAutoCuration("persona-1")

    // findMany 호출 시 rating >= 0.7 조건이 포함되어야 함
    const [query] = mockFindManyLogs.mock.calls[0]
    expect(query.where.rating).toEqual({ gte: 0.7 })
    expect(query.where.contentId).toEqual({ not: null })

    expect(result.personaId).toBe("persona-1")
  })

  it("ContentItem이 없는 contentId → skipped 카운트", async () => {
    mockFindManyLogs.mockResolvedValue([
      { contentId: "nonexistent", rating: 0.8, impression: "좋음" },
    ])
    mockFindUniqueContentItem.mockResolvedValue(null) // ContentItem 없음

    const result = await runAutoCuration("persona-1")

    expect(result.created).toBe(0)
    expect(result.skipped).toBe(1)
    expect(mockCreateCuration).not.toHaveBeenCalled()
  })

  it("이미 큐레이션 존재 → skipped (업데이트 없음)", async () => {
    mockFindManyLogs.mockResolvedValue([
      { contentId: "content-1", rating: 0.9, impression: "좋음" },
    ])
    mockFindUniqueContentItem.mockResolvedValue({ id: "content-1" })
    mockFindUniqueCuration.mockResolvedValue({ id: "curation-existing" }) // 기존 존재

    const result = await runAutoCuration("persona-1")

    expect(result.created).toBe(0)
    expect(result.skipped).toBe(1)
    expect(mockCreateCuration).not.toHaveBeenCalled()
  })

  it("신규 ContentItem → PersonaCuratedContent PENDING 생성", async () => {
    mockFindManyLogs.mockResolvedValue([
      { contentId: "content-new", rating: 0.85, impression: "인상적인 작품" },
    ])
    mockFindUniqueContentItem.mockResolvedValue({ id: "content-new" })
    mockFindUniqueCuration.mockResolvedValue(null)
    mockCreateCuration.mockResolvedValue({ id: "new-curation" })

    const result = await runAutoCuration("persona-1")

    expect(result.created).toBe(1)
    expect(result.skipped).toBe(0)

    const [createArgs] = mockCreateCuration.mock.calls[0]
    expect(createArgs.data.status).toBe("PENDING")
    expect(Number(createArgs.data.curationScore)).toBe(0.85)
    expect(createArgs.data.curationReason).toBe("인상적인 작품")
  })

  it("로그 없으면 created=0, skipped=0", async () => {
    mockFindManyLogs.mockResolvedValue([])

    const result = await runAutoCuration("persona-1")

    expect(result.created).toBe(0)
    expect(result.skipped).toBe(0)
  })

  it("일부 성공 일부 스킵 혼재", async () => {
    mockFindManyLogs.mockResolvedValue([
      { contentId: "c1", rating: 0.9, impression: "좋음" },
      { contentId: "c2", rating: 0.75, impression: "그냥저냥" },
      { contentId: "c3", rating: 0.8, impression: "훌륭" },
    ])
    mockFindUniqueContentItem
      .mockResolvedValueOnce({ id: "c1" }) // c1: ContentItem 있음
      .mockResolvedValueOnce(null) // c2: ContentItem 없음
      .mockResolvedValueOnce({ id: "c3" }) // c3: ContentItem 있음
    mockFindUniqueCuration
      .mockResolvedValueOnce(null) // c1: 기존 없음 → 생성
      .mockResolvedValueOnce({ id: "existing" }) // c3: 기존 존재 → 스킵

    const result = await runAutoCuration("persona-1")

    expect(result.created).toBe(1)
    expect(result.skipped).toBe(2)
  })
})

// ── runAutoCurationAll ────────────────────────────────────────

describe("runAutoCurationAll — 전체 페르소나", () => {
  it("ACTIVE 페르소나만 조회", async () => {
    mockFindManyPersonas.mockResolvedValue([])

    await runAutoCurationAll()

    const [query] = mockFindManyPersonas.mock.calls[0]
    expect(query.where.status).toBe("ACTIVE")
  })

  it("2개 페르소나 순회 → 집계 합산", async () => {
    mockFindManyPersonas.mockResolvedValue([{ id: "p1" }, { id: "p2" }])
    mockFindManyLogs
      .mockResolvedValueOnce([{ contentId: "c1", rating: 0.9, impression: "좋음" }])
      .mockResolvedValueOnce([])
    mockFindUniqueContentItem.mockResolvedValue({ id: "c1" })
    mockFindUniqueCuration.mockResolvedValue(null)
    mockCreateCuration.mockResolvedValue({})

    const result = await runAutoCurationAll()

    expect(result.totalPersonas).toBe(2)
    expect(result.created).toBe(1)
    expect(result.skipped).toBe(0)
    expect(result.errors).toBe(0)
  })

  it("페르소나 처리 중 에러 → errors 카운트, 다음 페르소나 계속", async () => {
    mockFindManyPersonas.mockResolvedValue([{ id: "p1" }, { id: "p2" }])
    mockFindManyLogs
      .mockRejectedValueOnce(new Error("DB 오류")) // p1 실패
      .mockResolvedValueOnce([]) // p2 정상

    const result = await runAutoCurationAll()

    expect(result.errors).toBe(1)
    expect(result.totalPersonas).toBe(2)
  })

  it("페르소나 없으면 빈 결과", async () => {
    mockFindManyPersonas.mockResolvedValue([])

    const result = await runAutoCurationAll()

    expect(result.totalPersonas).toBe(0)
    expect(result.created).toBe(0)
  })
})
