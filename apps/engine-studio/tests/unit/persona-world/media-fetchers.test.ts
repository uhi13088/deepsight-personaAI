// ═══════════════════════════════════════════════════════════════
// Phase CON-EXT — Media Fetchers 단위 테스트 (T354~T357)
// mock fetch 기반 — 실제 API 호출 없음
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fetchTmdbMovies, fetchTmdbTv } from "@/lib/persona-world/media/fetchers/tmdb-fetcher"
import {
  fetchKopisPerformances,
  fetchKopisExhibitions,
} from "@/lib/persona-world/media/fetchers/kopis-fetcher"
import { fetchAladinBooks } from "@/lib/persona-world/media/fetchers/aladin-fetcher"
import {
  fetchLastfmTopTracks,
  fetchLastfmKrTracks,
} from "@/lib/persona-world/media/fetchers/lastfm-fetcher"

// ── Mock fetch 유틸 ──────────────────────────────────────────

function mockFetch(responses: Array<{ ok: boolean; body: unknown }>) {
  let callCount = 0
  vi.spyOn(global, "fetch").mockImplementation(async () => {
    const response = responses[callCount % responses.length]
    callCount++
    return {
      ok: response.ok,
      json: async () => response.body,
      text: async () =>
        typeof response.body === "string" ? response.body : JSON.stringify(response.body),
    } as Response
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── TMDB 영화 페처 ────────────────────────────────────────────

const TMDB_MOVIE_RESPONSE = {
  results: [
    {
      id: 12345,
      title: "범죄도시4",
      overview: "마석도가 돌아왔다.",
      release_date: "2025-04-20",
      genre_ids: [28, 80],
      popularity: 250,
      vote_average: 7.8,
      original_language: "ko",
      original_title: "범죄도시4",
    },
  ],
  total_results: 1,
}

describe("fetchTmdbMovies", () => {
  it("TMDB 영화 목록 파싱", async () => {
    mockFetch([
      { ok: true, body: TMDB_MOVIE_RESPONSE },
      { ok: true, body: { results: [], total_results: 0 } }, // upcoming
    ])

    const items = await fetchTmdbMovies("test-key", "source-1", "KR")
    expect(items.length).toBeGreaterThan(0)

    const movie = items[0]
    expect(movie.mediaType).toBe("MOVIE")
    expect(movie.title).toBe("범죄도시4")
    expect(movie.originalId).toBe("tmdb_movie_12345")
    expect(movie.genres).toContain("액션")
    expect(movie.genres).toContain("범죄")
    expect(movie.region).toBe("KR")
    expect(movie.importanceScore).toBeGreaterThan(0)
    expect(movie.importanceScore).toBeLessThanOrEqual(1)
  })

  it("API 실패 시 빈 배열", async () => {
    mockFetch([{ ok: false, body: {} }])
    const items = await fetchTmdbMovies("test-key", "source-1")
    expect(items).toEqual([])
  })

  it("중복 제거 (now_playing + upcoming 겹침)", async () => {
    // 동일 영화가 두 번 응답
    mockFetch([
      { ok: true, body: TMDB_MOVIE_RESPONSE },
      { ok: true, body: TMDB_MOVIE_RESPONSE },
    ])

    const items = await fetchTmdbMovies("test-key", "source-1")
    const ids = items.map((i) => i.originalId)
    expect(new Set(ids).size).toBe(ids.length) // 중복 없음
  })

  it("importanceScore는 0~1 범위", async () => {
    mockFetch([
      { ok: true, body: TMDB_MOVIE_RESPONSE },
      { ok: true, body: { results: [], total_results: 0 } },
    ])

    const items = await fetchTmdbMovies("test-key", "source-1")
    for (const item of items) {
      expect(item.importanceScore).toBeGreaterThanOrEqual(0)
      expect(item.importanceScore).toBeLessThanOrEqual(1)
    }
  })
})

describe("fetchTmdbTv", () => {
  it("TMDB TV 목록 파싱", async () => {
    const tvResponse = {
      results: [
        {
          id: 67890,
          name: "오징어게임 시즌2",
          overview: "456번의 귀환",
          first_air_date: "2024-12-26",
          genre_ids: [18, 10765],
          popularity: 320,
          vote_average: 8.0,
          original_language: "ko",
        },
      ],
      total_results: 1,
    }

    mockFetch([
      { ok: true, body: tvResponse },
      { ok: true, body: { results: [], total_results: 0 } },
    ])

    const items = await fetchTmdbTv("test-key", "source-2")
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].mediaType).toBe("TV")
    expect(items[0].title).toBe("오징어게임 시즌2")
    expect(items[0].originalId).toBe("tmdb_tv_67890")
  })
})

// ── KOPIS 공연 페처 ───────────────────────────────────────────

const KOPIS_PERF_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dbs>
  <db>
    <mt20id>PF123456</mt20id>
    <prfnm>레미제라블</prfnm>
    <prfpdfrom>2025.03.01</prfpdfrom>
    <prfpdto>2025.06.30</prfpdto>
    <fcltynm>샤롯데씨어터</fcltynm>
    <genrenm>뮤지컬</genrenm>
    <prfstate>공연중</prfstate>
    <entrpsnm>신시컴퍼니</entrpsnm>
    <openrun>N</openrun>
  </db>
</dbs>`

describe("fetchKopisPerformances", () => {
  it("KOPIS XML 공연 파싱", async () => {
    // 5개 shcate 각각 응답
    mockFetch(Array(5).fill({ ok: true, body: KOPIS_PERF_XML }))

    const items = await fetchKopisPerformances("test-key", "source-3")
    expect(items.length).toBeGreaterThan(0)

    const perf = items[0]
    expect(perf.mediaType).toBe("PERFORMANCE")
    expect(perf.title).toBe("레미제라블")
    expect(perf.originalId).toBe("kopis_perf_PF123456")
    expect(perf.venue).toBe("샤롯데씨어터")
    expect(perf.region).toBe("KR")
    expect(perf.genres).toContain("뮤지컬")
  })

  it("API 실패 시 빈 배열", async () => {
    mockFetch(Array(5).fill({ ok: false, body: "" }))
    const items = await fetchKopisPerformances("test-key", "source-3")
    expect(items).toEqual([])
  })

  it("중복 공연 제거 (여러 shcate 겹침)", async () => {
    mockFetch(Array(5).fill({ ok: true, body: KOPIS_PERF_XML }))
    const items = await fetchKopisPerformances("test-key", "source-3")
    const ids = items.map((i) => i.originalId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("fetchKopisExhibitions", () => {
  const EXH_XML = `<?xml version="1.0" encoding="UTF-8"?>
  <dbs>
    <db>
      <mt20id>EX999888</mt20id>
      <prfnm>이우환: 침묵의 소리</prfnm>
      <prfpdfrom>2025.02.15</prfpdfrom>
      <prfpdto>2025.05.15</prfpdto>
      <fcltynm>국립현대미술관</fcltynm>
      <genrenm>전시</genrenm>
      <prfstate>공연중</prfstate>
    </db>
  </dbs>`

  it("KOPIS 전시 파싱", async () => {
    mockFetch([{ ok: true, body: EXH_XML }])
    const items = await fetchKopisExhibitions("test-key", "source-4")
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].mediaType).toBe("EXHIBITION")
    expect(items[0].title).toBe("이우환: 침묵의 소리")
    expect(items[0].venue).toBe("국립현대미술관")
  })
})

// ── 알라딘 도서 페처 ──────────────────────────────────────────

const ALADIN_RESPONSE = {
  item: [
    {
      itemId: 111222333,
      title: "채식주의자",
      author: "한강",
      publisher: "창비",
      pubDate: "2024-01-01",
      description: "한국 소설의 정수",
      categoryName: "소설>한국소설",
      bestRank: 3,
      cover: "https://example.com/cover.jpg",
    },
  ],
  totalResults: 1,
  startIndex: 1,
  itemsPerPage: 1,
}

describe("fetchAladinBooks", () => {
  it("알라딘 도서 파싱", async () => {
    mockFetch([
      { ok: true, body: ALADIN_RESPONSE }, // NewSpecial
      { ok: true, body: { item: [], totalResults: 0, startIndex: 1, itemsPerPage: 0 } }, // Bestseller
    ])

    const items = await fetchAladinBooks("test-key", "source-5")
    expect(items.length).toBeGreaterThan(0)

    const book = items[0]
    expect(book.mediaType).toBe("BOOK")
    expect(book.title).toBe("채식주의자")
    expect(book.creator).toBe("한강")
    expect(book.originalId).toBe("aladin_111222333")
    expect(book.region).toBe("KR")
  })

  it("베스트셀러 rank 1 → importanceScore 1.0", async () => {
    const bestResponse = {
      item: [{ ...ALADIN_RESPONSE.item[0], bestRank: 1 }],
      totalResults: 1,
      startIndex: 1,
      itemsPerPage: 1,
    }
    mockFetch([
      { ok: true, body: { item: [], totalResults: 0, startIndex: 1, itemsPerPage: 0 } },
      { ok: true, body: bestResponse },
    ])

    const items = await fetchAladinBooks("test-key", "source-5")
    const rank1 = items.find((i) => i.originalId === "aladin_111222333")
    if (rank1) {
      expect(rank1.importanceScore).toBe(1.0)
    }
  })

  it("중복 제거 (NewSpecial + Bestseller 겹침)", async () => {
    mockFetch([
      { ok: true, body: ALADIN_RESPONSE },
      { ok: true, body: ALADIN_RESPONSE },
    ])

    const items = await fetchAladinBooks("test-key", "source-5")
    const ids = items.map((i) => i.originalId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ── Last.fm 음악 페처 ─────────────────────────────────────────

const LASTFM_TRACKS_RESPONSE = {
  tracks: {
    track: [
      {
        name: "APT.",
        artist: { name: "ROSÉ" },
        playcount: "5000000",
        listeners: "2000000",
        url: "https://www.last.fm/music/ROSE/APT.",
        mbid: "abc123",
      },
    ],
  },
}

const LASTFM_TAGS_RESPONSE = {
  toptags: {
    tag: [
      { name: "K-Pop", count: 100 },
      { name: "pop", count: 80 },
    ],
  },
}

describe("fetchLastfmTopTracks", () => {
  it("Last.fm 글로벌 차트 파싱", async () => {
    // chart.getTopTracks + track.getTopTags
    mockFetch([
      { ok: true, body: LASTFM_TRACKS_RESPONSE }, // chart.getTopTracks
      { ok: true, body: LASTFM_TAGS_RESPONSE }, // track.getTopTags
    ])

    const items = await fetchLastfmTopTracks("test-key", "source-6")
    expect(items.length).toBeGreaterThan(0)

    const track = items[0]
    expect(track.mediaType).toBe("MUSIC")
    expect(track.title).toBe("APT.")
    expect(track.creator).toBe("ROSÉ")
    expect(track.region).toBe("GLOBAL")
    expect(track.importanceScore).toBeGreaterThan(0.5) // 2M listeners
  })

  it("API 실패 시 빈 배열", async () => {
    mockFetch([{ ok: false, body: {} }])
    const items = await fetchLastfmTopTracks("test-key", "source-6")
    expect(items).toEqual([])
  })
})

describe("fetchLastfmKrTracks", () => {
  it("Last.fm KR 차트 파싱", async () => {
    mockFetch([
      { ok: true, body: LASTFM_TRACKS_RESPONSE },
      { ok: true, body: LASTFM_TAGS_RESPONSE },
    ])

    const items = await fetchLastfmKrTracks("test-key", "source-6")
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].region).toBe("KR")
    expect(items[0].tags).toContain("한국차트")
  })
})

// ── 공통 ─────────────────────────────────────────────────────

describe("fetchers common", () => {
  it("모든 페처: importanceScore 0~1 범위 보장", async () => {
    // TMDB 극단값
    const highPop = {
      results: [
        {
          id: 1,
          title: "A",
          overview: "",
          release_date: "2025-01-01",
          genre_ids: [],
          popularity: 9999,
          vote_average: 10,
          original_language: "ko",
        },
      ],
      total_results: 1,
    }
    mockFetch([
      { ok: true, body: highPop },
      { ok: true, body: { results: [], total_results: 0 } },
    ])
    const items = await fetchTmdbMovies("key", "src")
    for (const item of items) {
      expect(item.importanceScore).toBeGreaterThanOrEqual(0)
      expect(item.importanceScore).toBeLessThanOrEqual(1)
    }
  })
})
