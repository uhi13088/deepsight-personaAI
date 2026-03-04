import { describe, it, expect } from "vitest"

/**
 * T386: ConsumptionLog 공개 API — taste 엔드포인트 단위 테스트
 *
 * API 레이어는 Prisma를 직접 호출하므로 통합 테스트가 아닌
 * 비즈니스 로직(필터, 집계)에 집중한 단위 테스트.
 */

// ─── 태그 집계 로직 ───

function aggregateTopTags(logs: { tags: string[] }[], limit = 5): { tag: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const log of logs) {
    for (const tag of log.tags) {
      counts[tag] = (counts[tag] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }))
}

// ─── rating 필터 로직 ───

function filterPositiveConsumptions<T extends { rating: number | null }>(
  logs: T[],
  minRating = 0.6
): T[] {
  return logs.filter((l) => l.rating !== null && l.rating >= minRating)
}

// ─── cursor 페이지네이션 로직 ───

function paginateWithCursor<T extends { id: string }>(
  items: T[],
  limit: number
): { page: T[]; nextCursor: string | null; hasMore: boolean } {
  const hasMore = items.length > limit
  const page = hasMore ? items.slice(0, limit) : items
  const nextCursor = hasMore ? page[page.length - 1].id : null
  return { page, nextCursor, hasMore }
}

// ─── 테스트 ───

describe("taste API — rating 필터", () => {
  const logs = [
    { id: "1", title: "기묘한 이야기", rating: 0.9 },
    { id: "2", title: "지루한 다큐", rating: 0.3 },
    { id: "3", title: "보통 영화", rating: 0.6 },
    { id: "4", title: "못본 것", rating: null },
    { id: "5", title: "좋은 책", rating: 0.8 },
  ]

  it("rating >= 0.6 항목만 반환", () => {
    const result = filterPositiveConsumptions(logs)
    expect(result).toHaveLength(3)
    expect(result.map((l) => l.id)).toEqual(["1", "3", "5"])
  })

  it("rating < 0.6 항목 제외 확인", () => {
    const result = filterPositiveConsumptions(logs)
    expect(result.find((l) => l.id === "2")).toBeUndefined()
  })

  it("rating null 항목 제외 확인", () => {
    const result = filterPositiveConsumptions(logs)
    expect(result.find((l) => l.id === "4")).toBeUndefined()
  })
})

describe("taste API — 태그 집계", () => {
  const logs = [
    { tags: ["SF", "스릴러", "Netflix"] },
    { tags: ["SF", "호러"] },
    { tags: ["SF", "스릴러", "Disney+"] },
    { tags: ["인간드라마"] },
    { tags: ["인간드라마", "감동"] },
    { tags: ["감동", "SF"] },
  ]

  it("태그 빈도 내림차순 정렬", () => {
    const result = aggregateTopTags(logs)
    expect(result[0].tag).toBe("SF") // 4회
    expect(result[0].count).toBe(4)
  })

  it("상위 5개만 반환", () => {
    const result = aggregateTopTags(logs, 5)
    expect(result.length).toBeLessThanOrEqual(5)
  })

  it("빈 로그 → 빈 태그 배열", () => {
    const result = aggregateTopTags([])
    expect(result).toHaveLength(0)
  })

  it("태그 없는 로그 → 집계 결과 없음", () => {
    const result = aggregateTopTags([{ tags: [] }, { tags: [] }])
    expect(result).toHaveLength(0)
  })
})

describe("taste API — cursor 페이지네이션", () => {
  const items = Array.from({ length: 25 }, (_, i) => ({ id: `item-${i}` }))

  it("limit=20, 25개 → hasMore=true", () => {
    const { hasMore, page, nextCursor } = paginateWithCursor(items.slice(0, 21), 20)
    expect(hasMore).toBe(true)
    expect(page).toHaveLength(20)
    expect(nextCursor).toBe("item-19")
  })

  it("마지막 페이지 → hasMore=false, nextCursor=null", () => {
    const { hasMore, nextCursor } = paginateWithCursor(items.slice(0, 5), 20)
    expect(hasMore).toBe(false)
    expect(nextCursor).toBeNull()
  })

  it("정확히 limit 개수 → hasMore=false", () => {
    const { hasMore } = paginateWithCursor(items.slice(0, 20), 20)
    expect(hasMore).toBe(false)
  })
})
