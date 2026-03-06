// ═══════════════════════════════════════════════════════════════
// Phase CON-EXT — 알라딘 도서 콘텐츠 페처 (T356)
// 알라딘 Open API (무료)
// https://www.aladin.co.kr/ttb/api/ItemList.aspx
// 환경변수: ALADIN_API_KEY (ttbKey)
// ═══════════════════════════════════════════════════════════════

import type { MediaItemForUpsert } from "../media-auto-fetch"

const ALADIN_BASE = "https://www.aladin.co.kr/ttb/api/ItemList.aspx"
const TIMEOUT_MS = 10_000

// ── 알라딘 API 응답 타입 ──────────────────────────────────────

interface AladinItem {
  itemId: number
  title: string
  author: string
  publisher?: string
  pubDate?: string
  description?: string
  categoryName?: string
  bestRank?: number
  cover?: string
  link?: string
}

interface AladinResponse {
  item: AladinItem[]
  totalResults: number
  startIndex: number
  itemsPerPage: number
}

// ── 카테고리 → 장르 태그 변환 ─────────────────────────────────

function categoryToGenres(categoryName?: string): string[] {
  if (!categoryName) return ["도서"]

  const genres: string[] = ["도서"]

  const lower = categoryName.toLowerCase()
  if (lower.includes("소설")) genres.push("소설")
  if (lower.includes("시") || lower.includes("에세이")) genres.push("에세이")
  if (lower.includes("경제") || lower.includes("경영")) genres.push("경제/경영")
  if (lower.includes("자기계발")) genres.push("자기계발")
  if (lower.includes("과학")) genres.push("과학")
  if (lower.includes("역사")) genres.push("역사")
  if (lower.includes("철학")) genres.push("철학")
  if (lower.includes("sf") || lower.includes("판타지")) genres.push("SF/판타지")
  if (lower.includes("만화")) genres.push("만화")
  if (lower.includes("어린이") || lower.includes("청소년")) genres.push("어린이/청소년")

  return genres.length > 1 ? genres : ["도서", "기타"]
}

// ── importanceScore 계산 ──────────────────────────────────────

function computeBookImportance(item: AladinItem): number {
  if (item.bestRank !== undefined && item.bestRank > 0) {
    // 베스트셀러: 1위=1.0, 10위=0.55, 100위=0.3
    return Math.max(0.3, 1 - (item.bestRank - 1) * 0.007)
  }
  return 0.35 // 신간 (비베스트셀러)
}

// ── 유틸 ─────────────────────────────────────────────────────

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ── 도서 페처 ────────────────────────────────────────────────

/**
 * 알라딘 신간 특별 + 베스트셀러 수집.
 */
export async function fetchAladinBooks(
  apiKey: string,
  sourceId: string
): Promise<MediaItemForUpsert[]> {
  // NewSpecial: 주목 신간, Bestseller: 베스트셀러
  const queryTypes = ["NewSpecial", "Bestseller"]
  const items: MediaItemForUpsert[] = []
  const seen = new Set<string>()

  for (const queryType of queryTypes) {
    const url =
      `${ALADIN_BASE}?ttbkey=${apiKey}&QueryType=${queryType}` +
      `&MaxResults=20&start=1&SearchTarget=Book&output=js&Version=20131101`

    let res: Response
    try {
      res = await fetchWithTimeout(url)
    } catch {
      continue
    }

    if (!res.ok) continue

    let data: AladinResponse
    try {
      data = (await res.json()) as AladinResponse
    } catch {
      continue
    }

    const bookList = data.item ?? []

    for (const book of bookList) {
      const originalId = `aladin_${book.itemId}`
      if (seen.has(originalId)) continue
      seen.add(originalId)

      const genres = categoryToGenres(book.categoryName)
      const tags = [
        "도서",
        queryType === "Bestseller" ? "베스트셀러" : "신간",
        ...(book.publisher ? [book.publisher] : []),
      ]

      items.push({
        sourceId,
        mediaType: "BOOK",
        title: book.title,
        originalId,
        description: book.description ?? null,
        releaseDate: book.pubDate ? new Date(book.pubDate) : null,
        creator: book.author,
        venue: null,
        genres,
        tags,
        region: "KR",
        importanceScore: computeBookImportance(book),
        rawData: {
          itemId: book.itemId,
          publisher: book.publisher,
          categoryName: book.categoryName,
          bestRank: book.bestRank,
          cover: book.cover,
        },
      })
    }
  }

  return items
}
