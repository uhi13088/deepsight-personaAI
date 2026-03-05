import { describe, it, expect } from "vitest"

/**
 * T396: Content Ingest API — 입력 검증 로직 단위 테스트
 * (API route는 통합 테스트 범위, 여기서는 비즈니스 로직만)
 */

// ── 입력 검증 로직 (route.ts에서 추출) ──────────────────────

const VALID_CONTENT_TYPES = new Set([
  "MOVIE",
  "DRAMA",
  "MUSIC",
  "BOOK",
  "ARTICLE",
  "PRODUCT",
  "VIDEO",
  "PODCAST",
])

const MAX_BATCH_SIZE = 100

function validateIngestInput(item: {
  title?: unknown
  contentType?: unknown
  genres?: unknown
  tags?: unknown
}): string | null {
  if (!item.title || typeof item.title !== "string" || item.title.trim() === "") {
    return "title은 필수입니다"
  }
  if (!VALID_CONTENT_TYPES.has(item.contentType as string)) {
    return `유효하지 않은 contentType: ${item.contentType}`
  }
  return null
}

function validateBatchSize(items: unknown[]): string | null {
  if (items.length === 0) return "items 배열이 비어있습니다"
  if (items.length > MAX_BATCH_SIZE) {
    return `배치 최대 ${MAX_BATCH_SIZE}건까지 허용됩니다 (요청: ${items.length}건)`
  }
  return null
}

// ── 테스트 ────────────────────────────────────────────────────

describe("Ingest 단건 입력 검증", () => {
  it("title 누락 → 에러", () => {
    expect(validateIngestInput({ contentType: "MOVIE" })).toBe("title은 필수입니다")
  })

  it("title 빈 문자열 → 에러", () => {
    expect(validateIngestInput({ title: "   ", contentType: "MOVIE" })).toBe("title은 필수입니다")
  })

  it("유효하지 않은 contentType → 에러", () => {
    const err = validateIngestInput({ title: "테스트", contentType: "GAME" })
    expect(err).toContain("유효하지 않은 contentType")
  })

  it("올바른 입력 → null", () => {
    expect(validateIngestInput({ title: "기묘한 이야기", contentType: "DRAMA" })).toBeNull()
  })

  it("모든 유효 ContentType 허용", () => {
    const types = ["MOVIE", "DRAMA", "MUSIC", "BOOK", "ARTICLE", "PRODUCT", "VIDEO", "PODCAST"]
    for (const t of types) {
      expect(validateIngestInput({ title: "테스트", contentType: t })).toBeNull()
    }
  })

  it("ConsumptionContentType에만 있는 GAME → 에러", () => {
    // ContentItemType은 GAME 없음 (차이점 검증)
    const err = validateIngestInput({ title: "테스트", contentType: "GAME" })
    expect(err).not.toBeNull()
  })

  it("ConsumptionContentType에만 있는 OTHER → 에러", () => {
    const err = validateIngestInput({ title: "테스트", contentType: "OTHER" })
    expect(err).not.toBeNull()
  })
})

describe("배치 크기 검증", () => {
  it("빈 배열 → 에러", () => {
    expect(validateBatchSize([])).toBe("items 배열이 비어있습니다")
  })

  it("100건 → 정상", () => {
    expect(validateBatchSize(new Array(100).fill({}))).toBeNull()
  })

  it("101건 → 에러", () => {
    const err = validateBatchSize(new Array(101).fill({}))
    expect(err).toContain("101")
    expect(err).toContain("100")
  })

  it("1건 → 정상", () => {
    expect(validateBatchSize([{}])).toBeNull()
  })
})
