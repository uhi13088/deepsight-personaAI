// ═══════════════════════════════════════════════════════════════
// Phase CON-EXT — Media Auto-Fetch Service (T358)
// 프리셋 자동 시드 + 4개 소스 배치 수집 + 오류 추적
// ═══════════════════════════════════════════════════════════════

import { fetchTmdbMovies, fetchTmdbTv } from "./fetchers/tmdb-fetcher"
import { fetchKopisPerformances, fetchKopisExhibitions } from "./fetchers/kopis-fetcher"
import { fetchAladinBooks } from "./fetchers/aladin-fetcher"
import { fetchLastfmTopTracks, fetchLastfmKrTracks } from "./fetchers/lastfm-fetcher"
import type { MediaItemForTrigger } from "./media-reaction-trigger"

// ── 공유 타입 ─────────────────────────────────────────────────

export type MediaSourceType =
  | "TMDB_MOVIE"
  | "TMDB_TV"
  | "KOPIS_PERFORMANCE"
  | "KOPIS_EXHIBITION"
  | "ALADIN_BOOK"
  | "LASTFM_MUSIC"

/** 페처에서 upsert로 넘기는 아이템 공통 형태 */
export interface MediaItemForUpsert {
  sourceId: string
  mediaType: "MOVIE" | "TV" | "PERFORMANCE" | "EXHIBITION" | "BOOK" | "MUSIC"
  title: string
  originalId: string // sourceId + external ID로 unique
  description?: string | null
  releaseDate?: Date | null
  venue?: string | null
  creator?: string | null
  genres: string[]
  tags: string[]
  region: string
  importanceScore: number
  rawData?: Record<string, unknown> | null
}

/** 자동 수집 결과 */
export interface AutoFetchResult {
  fetchedCount: number // API에서 받아온 아이템 수
  newItems: number // DB에 새로 저장된 아이템 수
  updatedItems: number // 기존 아이템 업데이트 수
  triggeredReactions: number
  errors: Array<{ sourceId: string; error: string }>
}

// ── 프리셋 소스 ──────────────────────────────────────────────

export interface MediaSourcePreset {
  name: string
  sourceType: MediaSourceType
  region: string
  apiEndpoint?: string
}

export const PRESET_MEDIA_SOURCES: MediaSourcePreset[] = [
  { name: "TMDB 영화 (KR)", sourceType: "TMDB_MOVIE", region: "KR" },
  { name: "TMDB TV (KR)", sourceType: "TMDB_TV", region: "KR" },
  { name: "KOPIS 공연", sourceType: "KOPIS_PERFORMANCE", region: "KR" },
  { name: "KOPIS 전시", sourceType: "KOPIS_EXHIBITION", region: "KR" },
  { name: "알라딘 도서", sourceType: "ALADIN_BOOK", region: "KR" },
  { name: "Last.fm 글로벌 차트", sourceType: "LASTFM_MUSIC", region: "GLOBAL" },
]

// ── 연속 실패 임계치 ─────────────────────────────────────────

const AUTO_DISABLE_THRESHOLD = 3

// ── 데이터 프로바이더 인터페이스 ─────────────────────────────────

export interface MediaAutoFetchDataProvider {
  /** 등록된 소스 수 조회 */
  getSourceCount(): Promise<number>

  /** 프리셋 소스 일괄 등록 */
  seedPresets(presets: MediaSourcePreset[]): Promise<{ added: number }>

  /** 활성 소스 목록 조회 */
  getActiveSources(): Promise<
    Array<{
      id: string
      name: string
      sourceType: MediaSourceType
      region: string
    }>
  >

  /** 미디어 아이템 upsert (sourceId + originalId unique) */
  upsertMediaItem(data: MediaItemForUpsert): Promise<{ id: string; isNew: boolean }>

  /** 소스 수집 성공 기록 */
  markSourceSuccess(sourceId: string): Promise<void>

  /** 소스 수집 실패 기록 (consecutiveFailures 증가) */
  markSourceFailure(sourceId: string, error: string): Promise<void>

  /** 소스 비활성화 */
  disableSource(sourceId: string): Promise<void>
}

/** 반응 트리거 콜백 (외부 주입) */
export type ReactionRunner = (item: MediaItemForTrigger) => Promise<number> // 반환: 트리거된 반응 수

// ── 프리셋 시드 ──────────────────────────────────────────────

/**
 * DB에 소스가 없으면 6개 프리셋 자동 등록.
 */
export async function ensureMediaPresetsSeeded(
  provider: MediaAutoFetchDataProvider
): Promise<{ seeded: boolean; added: number }> {
  const count = await provider.getSourceCount()
  if (count > 0) return { seeded: false, added: 0 }

  const result = await provider.seedPresets(PRESET_MEDIA_SOURCES)
  console.log(`[media-auto-fetch] 프리셋 ${result.added}개 등록 완료`)
  return { seeded: true, added: result.added }
}

// ── 소스별 페처 라우팅 ────────────────────────────────────────

async function fetchFromSource(
  sourceType: MediaSourceType,
  sourceId: string
): Promise<MediaItemForUpsert[]> {
  const apiKeys = {
    tmdb: process.env["TMDB_API_KEY"] ?? "",
    kopis: process.env["KOPIS_API_KEY"] ?? "",
    aladin: process.env["ALADIN_API_KEY"] ?? "",
    lastfm: process.env["LASTFM_API_KEY"] ?? "",
  }

  switch (sourceType) {
    case "TMDB_MOVIE":
      if (!apiKeys.tmdb) return []
      return fetchTmdbMovies(apiKeys.tmdb, sourceId, "KR")

    case "TMDB_TV":
      if (!apiKeys.tmdb) return []
      return fetchTmdbTv(apiKeys.tmdb, sourceId, "KR")

    case "KOPIS_PERFORMANCE":
      if (!apiKeys.kopis) return []
      return fetchKopisPerformances(apiKeys.kopis, sourceId)

    case "KOPIS_EXHIBITION":
      if (!apiKeys.kopis) return []
      return fetchKopisExhibitions(apiKeys.kopis, sourceId)

    case "ALADIN_BOOK":
      if (!apiKeys.aladin) return []
      return fetchAladinBooks(apiKeys.aladin, sourceId)

    case "LASTFM_MUSIC": {
      if (!apiKeys.lastfm) return []
      const [global, kr] = await Promise.all([
        fetchLastfmTopTracks(apiKeys.lastfm, sourceId),
        fetchLastfmKrTracks(apiKeys.lastfm, sourceId),
      ])
      return [...global, ...kr]
    }
  }
}

// ── 메인 자동 수집 실행 ──────────────────────────────────────

/**
 * 활성 소스 전체를 순회하며 콘텐츠 수집 + 반응 트리거.
 *
 * 소스당 연속 실패 3회 이상 → 자동 비활성화.
 */
export async function executeMediaAutoFetch(
  provider: MediaAutoFetchDataProvider,
  reactionRunner?: ReactionRunner
): Promise<AutoFetchResult> {
  await ensureMediaPresetsSeeded(provider)

  const sources = await provider.getActiveSources()

  const result: AutoFetchResult = {
    fetchedCount: 0,
    newItems: 0,
    updatedItems: 0,
    triggeredReactions: 0,
    errors: [],
  }

  for (const source of sources) {
    let items: MediaItemForUpsert[] = []

    try {
      items = await fetchFromSource(source.sourceType, source.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[media-auto-fetch] ${source.name} 수집 실패: ${msg}`)
      await provider.markSourceFailure(source.id, msg)
      result.errors.push({ sourceId: source.id, error: msg })
      continue
    }

    if (items.length === 0) {
      await provider.markSourceFailure(source.id, "수집 결과 없음")
      result.errors.push({ sourceId: source.id, error: "수집 결과 없음" })
      continue
    }

    await provider.markSourceSuccess(source.id)
    result.fetchedCount += items.length

    for (const item of items) {
      try {
        const upsertResult = await provider.upsertMediaItem(item)
        if (upsertResult.isNew) {
          result.newItems++

          // 신규 아이템에만 반응 트리거
          if (reactionRunner) {
            const count = await reactionRunner({
              id: upsertResult.id,
              mediaType: item.mediaType,
              title: item.title,
              description: item.description ?? null,
              creator: item.creator ?? null,
              venue: item.venue ?? null,
              genres: item.genres,
              tags: item.tags,
              region: item.region,
              importanceScore: item.importanceScore,
            })
            result.triggeredReactions += count
          }
        } else {
          result.updatedItems++
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[media-auto-fetch] upsert 실패 (${item.title}): ${msg}`)
      }
    }

    console.log(
      `[media-auto-fetch] ${source.name}: ${items.length}개 수집, ` +
        `신규=${result.newItems}, 갱신=${result.updatedItems}`
    )
  }

  return result
}
