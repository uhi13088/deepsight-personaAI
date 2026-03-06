// ═══════════════════════════════════════════════════════════════
// Phase CON-EXT — KOPIS 공연/전시 콘텐츠 페처 (T355)
// 공연예술통합전산망 Open API (완전 무료)
// https://www.kopis.or.kr/openApi/restful/pblprfr
// 환경변수: KOPIS_API_KEY
// ═══════════════════════════════════════════════════════════════

import type { MediaItemForUpsert } from "../media-auto-fetch"

const KOPIS_BASE = "https://www.kopis.or.kr/openApi/restful"
const TIMEOUT_MS = 10_000

// ── 공연 장르 코드 ──────────────────────────────────────────────
// KOPIS shcate 코드
const PERFORMANCE_GENRES: Record<string, string> = {
  AAAA: "연극",
  BBBC: "무용",
  BBBD: "대중무용",
  CCCA: "서양음악(클래식)",
  CCCB: "한국음악(국악)",
  CCCC: "팝음악",
  CCCD: "재즈",
  CCCE: "월드뮤직",
  CCCF: "뮤지컬",
  CCCK: "오페라",
  DDDH: "서커스/마술",
  EEEA: "뮤지컬",
  GGGA: "전시",
  GGBB: "전시",
}

const TIMEOUT_DATE_OFFSET_DAYS = 60 // 앞으로 60일 내 공연

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

function toKopisDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "")
}

/**
 * KOPIS XML 응답 파싱 (뉴스 페처 parseRssXml 패턴과 동일 방식).
 * news-fetcher.ts의 XML 파싱 방식(정규식) 재사용.
 */
function parseKopisXml(xml: string): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = []

  // <db>...</db> 블록 추출
  const dbRegex = /<db>([\s\S]*?)<\/db>/gi
  let match: RegExpExecArray | null

  while ((match = dbRegex.exec(xml)) !== null) {
    const block = match[1]
    const item: Record<string, string> = {}

    // 각 태그 추출
    const fieldRegex = /<(\w+)>([\s\S]*?)<\/\1>/g
    let fieldMatch: RegExpExecArray | null

    while ((fieldMatch = fieldRegex.exec(block)) !== null) {
      item[fieldMatch[1]] = fieldMatch[2].trim()
    }

    if (item["mt20id"]) items.push(item)
  }

  return items
}

function parseKopisDate(dateStr: string): Date | null {
  // KOPIS 날짜 형식: 2025.03.15 또는 20250315
  if (!dateStr || dateStr === "~") return null
  const clean = dateStr.replace(/\./g, "-")
  const d = new Date(clean)
  return isNaN(d.getTime()) ? null : d
}

function importanceFromGenre(genreNm: string): number {
  // 뮤지컬/오페라는 인기도 높음
  if (genreNm.includes("뮤지컬") || genreNm.includes("오페라")) return 0.7
  if (genreNm.includes("연극") || genreNm.includes("클래식")) return 0.6
  if (genreNm.includes("국악") || genreNm.includes("무용")) return 0.5
  return 0.45
}

// ── 공연 페처 ────────────────────────────────────────────────

/**
 * KOPIS 공연 목록 수집 (앞으로 60일 내 공연).
 * shcate 파라미터로 공연 장르 필터링.
 */
export async function fetchKopisPerformances(
  apiKey: string,
  sourceId: string
): Promise<MediaItemForUpsert[]> {
  const today = new Date()
  const future = new Date(today)
  future.setDate(future.getDate() + TIMEOUT_DATE_OFFSET_DAYS)

  const stdate = toKopisDate(today)
  const eddate = toKopisDate(future)

  // 연극, 뮤지컬, 클래식, 국악, 무용 수집
  const shcates = ["AAAA", "EEEA", "CCCA", "CCCB", "BBBC"]
  const items: MediaItemForUpsert[] = []
  const seen = new Set<string>()

  for (const shcate of shcates) {
    const url =
      `${KOPIS_BASE}/pblprfr?service=${apiKey}&stdate=${stdate}&eddate=${eddate}` +
      `&shcate=${shcate}&rows=10&signgucode=11&newsql=Y`

    let res: Response
    try {
      res = await fetchWithTimeout(url)
    } catch {
      continue
    }

    if (!res.ok) continue

    const xml = await res.text()
    const records = parseKopisXml(xml)

    for (const rec of records) {
      const originalId = `kopis_perf_${rec["mt20id"]}`
      if (seen.has(originalId)) continue
      seen.add(originalId)

      const genreNm = rec["genrenm"] ?? "공연"
      const genres = [genreNm, "공연"]

      items.push({
        sourceId,
        mediaType: "PERFORMANCE",
        title: rec["prfnm"] ?? "공연명 미상",
        originalId,
        description: rec["entrpsnm"] ? `제작사: ${rec["entrpsnm"]}` : null,
        releaseDate: parseKopisDate(rec["prfpdfrom"] ?? ""),
        venue: rec["fcltynm"] ?? null,
        creator: null,
        genres,
        tags: ["공연", "서울", genreNm],
        region: "KR",
        importanceScore: importanceFromGenre(genreNm),
        rawData: {
          mt20id: rec["mt20id"],
          prfpdfrom: rec["prfpdfrom"],
          prfpdto: rec["prfpdto"],
          openrun: rec["openrun"],
        },
      })
    }
  }

  return items
}

/**
 * KOPIS 전시 목록 수집.
 * shcate=GGGA (전시/박람회) 카테고리.
 */
export async function fetchKopisExhibitions(
  apiKey: string,
  sourceId: string
): Promise<MediaItemForUpsert[]> {
  const today = new Date()
  const future = new Date(today)
  future.setDate(future.getDate() + TIMEOUT_DATE_OFFSET_DAYS)

  const stdate = toKopisDate(today)
  const eddate = toKopisDate(future)

  const url =
    `${KOPIS_BASE}/pblprfr?service=${apiKey}&stdate=${stdate}&eddate=${eddate}` +
    `&shcate=GGGA&rows=15&signgucode=11&newsql=Y`

  let res: Response
  try {
    res = await fetchWithTimeout(url)
  } catch {
    return []
  }

  if (!res.ok) return []

  const xml = await res.text()
  const records = parseKopisXml(xml)

  return records.slice(0, 15).map((rec) => ({
    sourceId,
    mediaType: "EXHIBITION" as const,
    title: rec["prfnm"] ?? "전시명 미상",
    originalId: `kopis_exh_${rec["mt20id"]}`,
    description: null,
    releaseDate: parseKopisDate(rec["prfpdfrom"] ?? ""),
    venue: rec["fcltynm"] ?? null,
    creator: null,
    genres: ["전시", "현대미술"],
    tags: ["전시", "서울"],
    region: "KR",
    importanceScore: 0.5,
    rawData: {
      mt20id: rec["mt20id"],
      prfpdfrom: rec["prfpdfrom"],
      prfpdto: rec["prfpdto"],
    },
  }))
}
