// ═══════════════════════════════════════════════════════════════
// Phase CON-EXT — TMDB 영화/TV 콘텐츠 페처 (T354)
// The Movie Database API v3 (무료, 40req/10s)
// 환경변수: TMDB_API_KEY
// ═══════════════════════════════════════════════════════════════

import type { MediaItemForUpsert } from "../media-auto-fetch"

const TMDB_BASE = "https://api.themoviedb.org/3"
const TIMEOUT_MS = 10_000

// ── TMDB API 응답 타입 ────────────────────────────────────────

interface TmdbMovie {
  id: number
  title: string
  overview: string
  release_date?: string
  genre_ids: number[]
  popularity: number
  vote_average: number
  original_language: string
  original_title?: string
}

interface TmdbTv {
  id: number
  name: string
  overview: string
  first_air_date?: string
  genre_ids: number[]
  popularity: number
  vote_average: number
  original_language: string
}

interface TmdbListResponse<T> {
  results: T[]
  total_results: number
}

interface TmdbGenre {
  id: number
  name: string
}

// ── 장르 ID → 이름 매핑 (한국어) ─────────────────────────────

const MOVIE_GENRE_MAP: Record<number, string> = {
  28: "액션",
  12: "모험",
  16: "애니메이션",
  35: "코미디",
  80: "범죄",
  99: "다큐멘터리",
  18: "드라마",
  10751: "가족",
  14: "판타지",
  36: "역사",
  27: "공포",
  10402: "음악",
  9648: "미스터리",
  10749: "로맨스",
  878: "SF",
  10770: "TV영화",
  53: "스릴러",
  10752: "전쟁",
  37: "서부",
}

const TV_GENRE_MAP: Record<number, string> = {
  10759: "액션/어드벤처",
  16: "애니메이션",
  35: "코미디",
  80: "범죄",
  99: "다큐멘터리",
  18: "드라마",
  10751: "가족",
  10762: "키즈",
  9648: "미스터리",
  10763: "뉴스",
  10764: "리얼리티",
  10765: "SF/판타지",
  10766: "연속극",
  10767: "토크쇼",
  10768: "전쟁/정치",
  37: "서부",
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

function normalizeScore(popularity: number, voteAverage: number): number {
  // popularity 300+ → 최상위, 10 미만 → 낮음
  const popularityScore = Math.min(1, popularity / 300)
  // vote_average 0~10 → 0~1
  const voteScore = voteAverage / 10
  return Math.min(1, Math.max(0.1, popularityScore * 0.7 + voteScore * 0.3))
}

function genreIdsToNames(ids: number[], map: Record<number, string>): string[] {
  return ids.map((id) => map[id]).filter(Boolean)
}

// ── 영화 페처 ────────────────────────────────────────────────

/**
 * TMDB 현재 상영 중 + 개봉 예정 영화 수집.
 * language=ko-KR 우선, fallback en-US.
 */
export async function fetchTmdbMovies(
  apiKey: string,
  sourceId: string,
  region = "KR"
): Promise<MediaItemForUpsert[]> {
  const lang = region === "KR" ? "ko-KR" : "en-US"
  const urls = [
    `${TMDB_BASE}/movie/now_playing?api_key=${apiKey}&language=${lang}&region=${region}&page=1`,
    `${TMDB_BASE}/movie/upcoming?api_key=${apiKey}&language=${lang}&region=${region}&page=1`,
  ]

  const items: MediaItemForUpsert[] = []

  for (const url of urls) {
    let res: Response
    try {
      res = await fetchWithTimeout(url)
    } catch {
      continue
    }

    if (!res.ok) continue

    const data = (await res.json()) as TmdbListResponse<TmdbMovie>

    for (const movie of data.results.slice(0, 20)) {
      const genres = genreIdsToNames(movie.genre_ids, MOVIE_GENRE_MAP)
      items.push({
        sourceId,
        mediaType: "MOVIE",
        title: movie.title,
        originalId: `tmdb_movie_${movie.id}`,
        description: movie.overview || null,
        releaseDate: movie.release_date ? new Date(movie.release_date) : null,
        creator: null, // 감독은 상세 API 필요 (별도 요청 비용 절약)
        genres,
        tags: ["영화", region === "KR" ? "한국개봉" : ""],
        region,
        importanceScore: normalizeScore(movie.popularity, movie.vote_average),
        rawData: { tmdbId: movie.id, originalTitle: movie.original_title },
      })
    }
  }

  // 중복 제거 (now_playing + upcoming 겹침 가능)
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.originalId)) return false
    seen.add(item.originalId)
    return true
  })
}

/**
 * TMDB 방영 중 + 인기 TV 시리즈 수집.
 */
export async function fetchTmdbTv(
  apiKey: string,
  sourceId: string,
  region = "KR"
): Promise<MediaItemForUpsert[]> {
  const lang = region === "KR" ? "ko-KR" : "en-US"
  const urls = [
    `${TMDB_BASE}/tv/on_the_air?api_key=${apiKey}&language=${lang}&page=1`,
    `${TMDB_BASE}/tv/popular?api_key=${apiKey}&language=${lang}&page=1`,
  ]

  const items: MediaItemForUpsert[] = []

  for (const url of urls) {
    let res: Response
    try {
      res = await fetchWithTimeout(url)
    } catch {
      continue
    }

    if (!res.ok) continue

    const data = (await res.json()) as TmdbListResponse<TmdbTv>

    for (const tv of data.results.slice(0, 15)) {
      const genres = genreIdsToNames(tv.genre_ids, TV_GENRE_MAP)
      items.push({
        sourceId,
        mediaType: "TV",
        title: tv.name,
        originalId: `tmdb_tv_${tv.id}`,
        description: tv.overview || null,
        releaseDate: tv.first_air_date ? new Date(tv.first_air_date) : null,
        creator: null,
        genres,
        tags: ["드라마", "시리즈", tv.original_language === "ko" ? "한국드라마" : ""],
        region: tv.original_language === "ko" ? "KR" : "GLOBAL",
        importanceScore: normalizeScore(tv.popularity, tv.vote_average),
        rawData: { tmdbId: tv.id },
      })
    }
  }

  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.originalId)) return false
    seen.add(item.originalId)
    return true
  })
}
