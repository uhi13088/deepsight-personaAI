// ═══════════════════════════════════════════════════════════════
// Phase CON-EXT — Last.fm 음악 콘텐츠 페처 (T357)
// Last.fm API (완전 무료)
// https://www.last.fm/api
// 환경변수: LASTFM_API_KEY
// ═══════════════════════════════════════════════════════════════

import type { MediaItemForUpsert } from "../media-auto-fetch"

const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0/"
const TIMEOUT_MS = 10_000

// ── Last.fm API 응답 타입 ─────────────────────────────────────

interface LastfmTrack {
  name: string
  artist: { name: string } | string
  playcount?: string
  listeners?: string
  url?: string
  mbid?: string
}

interface LastfmTopTracksResponse {
  tracks: {
    track: LastfmTrack[]
  }
}

interface LastfmGeoTracksResponse {
  tracks: {
    track: LastfmTrack[]
  }
}

interface LastfmTag {
  name: string
  count?: number
}

interface LastfmTopTagsResponse {
  toptags: {
    tag: LastfmTag[]
  }
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

function getArtistName(artist: { name: string } | string): string {
  return typeof artist === "string" ? artist : artist.name
}

function normalizeListeners(listenersStr?: string): number {
  if (!listenersStr) return 0.4
  const n = parseInt(listenersStr, 10)
  if (isNaN(n)) return 0.4
  // 1M+ → 1.0, 100K → 0.7, 10K → 0.5
  if (n >= 1_000_000) return 1.0
  if (n >= 500_000) return 0.85
  if (n >= 100_000) return 0.7
  if (n >= 50_000) return 0.6
  if (n >= 10_000) return 0.5
  return 0.4
}

/**
 * 트랙 태그 수집 (장르 추출용). 과도한 API 호출 방지를 위해 캐시 사용.
 * 오류 시 기본 태그 ["음악"] 반환.
 */
async function fetchTrackTags(apiKey: string, artist: string, track: string): Promise<string[]> {
  const url =
    `${LASTFM_BASE}?method=track.getTopTags&artist=${encodeURIComponent(artist)}` +
    `&track=${encodeURIComponent(track)}&api_key=${apiKey}&format=json&limit=5`

  try {
    const res = await fetchWithTimeout(url)
    if (!res.ok) return ["음악"]
    const data = (await res.json()) as LastfmTopTagsResponse
    const tags = data.toptags?.tag?.slice(0, 3).map((t) => t.name) ?? []
    return tags.length > 0 ? tags : ["음악"]
  } catch {
    return ["음악"]
  }
}

// ── 음악 페처 ────────────────────────────────────────────────

/**
 * Last.fm 글로벌 차트 top tracks 수집.
 */
export async function fetchLastfmTopTracks(
  apiKey: string,
  sourceId: string
): Promise<MediaItemForUpsert[]> {
  const url = `${LASTFM_BASE}?method=chart.getTopTracks&api_key=${apiKey}&format=json&limit=20`

  let res: Response
  try {
    res = await fetchWithTimeout(url)
  } catch {
    return []
  }

  if (!res.ok) return []

  let data: LastfmTopTracksResponse
  try {
    data = (await res.json()) as LastfmTopTracksResponse
  } catch {
    return []
  }

  const tracks = data.tracks?.track ?? []
  const items: MediaItemForUpsert[] = []

  for (const track of tracks.slice(0, 15)) {
    const artistName = getArtistName(track.artist)
    const genres = await fetchTrackTags(apiKey, artistName, track.name)

    items.push({
      sourceId,
      mediaType: "MUSIC",
      title: track.name,
      originalId: `lastfm_${encodeURIComponent(artistName)}_${encodeURIComponent(track.name)}`,
      description: null,
      releaseDate: null,
      creator: artistName,
      venue: null,
      genres,
      tags: ["음악", "차트", "글로벌차트"],
      region: "GLOBAL",
      importanceScore: normalizeListeners(track.listeners),
      rawData: {
        playcount: track.playcount,
        listeners: track.listeners,
        url: track.url,
        mbid: track.mbid,
      },
    })
  }

  return items
}

/**
 * Last.fm 국가별 차트 (KR) 수집.
 */
export async function fetchLastfmKrTracks(
  apiKey: string,
  sourceId: string
): Promise<MediaItemForUpsert[]> {
  // Last.fm geo.getTopTracks — South Korea
  const url = `${LASTFM_BASE}?method=geo.getTopTracks&country=south+korea&api_key=${apiKey}&format=json&limit=15`

  let res: Response
  try {
    res = await fetchWithTimeout(url)
  } catch {
    return []
  }

  if (!res.ok) return []

  let data: LastfmGeoTracksResponse
  try {
    data = (await res.json()) as LastfmGeoTracksResponse
  } catch {
    return []
  }

  const tracks = data.tracks?.track ?? []
  const items: MediaItemForUpsert[] = []

  for (const track of tracks.slice(0, 10)) {
    const artistName = getArtistName(track.artist)
    const genres = await fetchTrackTags(apiKey, artistName, track.name)

    items.push({
      sourceId,
      mediaType: "MUSIC",
      title: track.name,
      originalId: `lastfm_kr_${encodeURIComponent(artistName)}_${encodeURIComponent(track.name)}`,
      description: null,
      releaseDate: null,
      creator: artistName,
      venue: null,
      genres,
      tags: ["음악", "K-Chart", "한국차트"],
      region: "KR",
      importanceScore: normalizeListeners(track.listeners),
      rawData: {
        playcount: track.playcount,
        listeners: track.listeners,
      },
    })
  }

  return items
}
