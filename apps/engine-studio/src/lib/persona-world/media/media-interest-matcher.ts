// ═══════════════════════════════════════════════════════════════
// Phase CON-EXT — Media Interest Matcher (T352)
// 미디어 아이템 × 페르소나 → 관심도 점수
// "이 영화/공연/도서/음악에 얼마나 관심을 가질 것인가"
// ═══════════════════════════════════════════════════════════════

import type { CoreTemperamentVector } from "@/types/persona-v3"

// ── 타입 ────────────────────────────────────────────────────────

export type MediaType = "MOVIE" | "TV" | "PERFORMANCE" | "EXHIBITION" | "BOOK" | "MUSIC"

export interface MediaItemForMatching {
  mediaType: MediaType
  genres: string[] // ["공포", "스릴러", ...] or ["drama", "thriller", ...]
  tags: string[] // 추가 태그 (장르 + 키워드 통합)
  region: string // "KR" | "JP" | "US" | "GLOBAL"
  importanceScore: number // 0.00~1.00 (인기도/순위 기반)
}

export interface PersonaForMediaMatching {
  id: string
  expertise: string[] // ["영화", "클래식 음악", "소설", ...]
  role?: string | null
  country: string // "KR", "JP", "US", ...
  languages: string[] // ["ko", "en", "ja", ...]
  temperament: CoreTemperamentVector
}

export interface MediaInterestResult {
  personaId: string
  score: number // 0~1
  breakdown: {
    tagOverlap: number // 태그/장르 오버랩 (40%)
    openness: number // 새 콘텐츠 수용성 (20%)
    extraversion: number // 공개 반응 의지 (15%)
    regionalRelevance: number // 지역 연관성 (15%)
    contentTypeAffinity: number // 콘텐츠 타입 친화도 (10%)
  }
}

// ── Importance 등급 ───────────────────────────────────────────

export type ImportanceGrade = "HIGH" | "NORMAL" | "LOW"

export interface MediaGradeConfig {
  grade: ImportanceGrade
  threshold: number
  maxReactors: number
}

/**
 * importanceScore → 등급 판정.
 *
 * HIGH (≥0.7): 박스오피스 1위, 베스트셀러, 차트 1위
 * NORMAL (0.4~0.7): 중간 인기 콘텐츠
 * LOW (<0.4): 신규/틈새 콘텐츠
 */
export function getImportanceGrade(score: number): ImportanceGrade {
  if (score >= 0.7) return "HIGH"
  if (score >= 0.4) return "NORMAL"
  return "LOW"
}

const GRADE_REF_COUNT = 10

function scaleByCount(count: number): number {
  return Math.sqrt(GRADE_REF_COUNT / Math.max(count, GRADE_REF_COUNT))
}

export function getGradeConfig(
  grade: ImportanceGrade,
  activePersonaCount: number
): MediaGradeConfig {
  const scale = scaleByCount(activePersonaCount)
  switch (grade) {
    case "HIGH":
      return {
        grade,
        threshold: 0.25,
        maxReactors: Math.max(1, Math.ceil(activePersonaCount * 0.25 * scale)),
      }
    case "NORMAL":
      return {
        grade,
        threshold: 0.3,
        maxReactors: Math.max(1, Math.ceil(activePersonaCount * 0.15 * scale)),
      }
    case "LOW":
      return {
        grade,
        threshold: 0.38,
        maxReactors: Math.max(1, Math.ceil(activePersonaCount * 0.08 * scale)),
      }
  }
}

// ── 상수 ────────────────────────────────────────────────────────

export const MEDIA_INTEREST_THRESHOLD = 0.28

/** 지역 코드 → 언어 코드 */
const REGION_TO_LANG: Record<string, string> = {
  KR: "ko",
  JP: "ja",
  CN: "zh",
  US: "en",
  EU: "en",
  GB: "en",
}

// ── 지역 연관성 ──────────────────────────────────────────────────

/**
 * 미디어 아이템 지역과 페르소나 배경 간 연관성 점수 (0~1).
 *
 * GLOBAL → 0.35 (엔터테인먼트는 글로벌 콘텐츠 관심도가 뉴스보다 높음)
 * 자국   → 0.9
 * 언어권 → 0.5
 * 무관   → 0.08
 */
export function computeRegionalRelevance(
  region: string,
  persona: Pick<PersonaForMediaMatching, "country" | "languages">
): number {
  if (region === "GLOBAL") return 0.35
  if (region === persona.country) return 0.9
  const lang = REGION_TO_LANG[region]
  if (lang && persona.languages.includes(lang)) return 0.5
  return 0.08
}

// ── 콘텐츠 타입 친화도 ───────────────────────────────────────────

/**
 * 페르소나 성향과 미디어 타입 간 친화도 (0~1).
 *
 * openness ↑   → EXHIBITION, BOOK 선호 (탐구형 콘텐츠)
 * extraversion ↑ → PERFORMANCE, MOVIE, MUSIC 선호 (사교적 경험)
 * 균형형         → TV, 전반적 미디어
 */
export function computeContentTypeAffinity(
  mediaType: MediaType,
  temperament: CoreTemperamentVector
): number {
  const { openness, extraversion } = temperament
  switch (mediaType) {
    case "EXHIBITION":
      return openness * 0.8 + 0.1
    case "BOOK":
      return openness * 0.7 + 0.1
    case "PERFORMANCE":
      return extraversion * 0.6 + openness * 0.3 + 0.05
    case "MOVIE":
      return extraversion * 0.4 + openness * 0.3 + 0.2
    case "MUSIC":
      return extraversion * 0.5 + 0.2
    case "TV":
      return 0.35 // 장르 무관, 누구나 시청
  }
}

// ── 관심도 점수 계산 ─────────────────────────────────────────────

/**
 * 미디어 아이템과 페르소나 간 관심도 점수 계산.
 *
 * score = tagOverlap(40%) + openness(20%) + extraversion(15%)
 *       + regionalRelevance(15%) + contentTypeAffinity(10%)
 */
export function computeMediaInterestScore(
  item: MediaItemForMatching,
  persona: PersonaForMediaMatching
): MediaInterestResult {
  const allTags = [...item.genres, ...item.tags]
  const tagOverlap = computeTagOverlap(allTags, persona.expertise, persona.role)
  const openness = persona.temperament.openness
  const extraversion = persona.temperament.extraversion
  const regionalRelevance = computeRegionalRelevance(item.region, persona)
  const contentTypeAffinity = computeContentTypeAffinity(item.mediaType, persona.temperament)

  const score =
    tagOverlap * 0.4 +
    openness * 0.2 +
    extraversion * 0.15 +
    regionalRelevance * 0.15 +
    contentTypeAffinity * 0.1

  return {
    personaId: persona.id,
    score: Math.min(1, Math.max(0, score)),
    breakdown: { tagOverlap, openness, extraversion, regionalRelevance, contentTypeAffinity },
  }
}

/**
 * 미디어 태그와 페르소나 전문분야 간 오버랩 점수 (0~1).
 *
 * 정규화된 Jaccard 유사도 기반 (뉴스 매처 동일 로직).
 */
function computeTagOverlap(itemTags: string[], expertise: string[], role?: string | null): number {
  if (itemTags.length === 0 && expertise.length === 0 && !role) return 0.1

  const personaKeywords = buildPersonaKeywords(expertise, role)
  const tagKeywords = itemTags.map((t) => t.toLowerCase())

  let directMatches = 0
  for (const tag of tagKeywords) {
    if (personaKeywords.has(tag)) directMatches++
  }

  if (directMatches > 0) {
    const union = new Set([...tagKeywords, ...personaKeywords]).size
    return Math.min(1, directMatches / Math.sqrt(union))
  }

  let partialScore = 0
  for (const tag of tagKeywords) {
    for (const kw of personaKeywords) {
      if (tag.includes(kw) || kw.includes(tag)) {
        partialScore += 0.3
        break
      }
    }
  }

  return tagKeywords.length > 0 ? Math.min(0.5, partialScore / tagKeywords.length) : 0.1
}

function buildPersonaKeywords(expertise: string[], role?: string | null): Set<string> {
  const keywords = new Set<string>()
  for (const exp of expertise) {
    const lower = exp.toLowerCase()
    keywords.add(lower)
    for (const word of lower.split(/[\s,_\-]+/)) {
      if (word.length >= 2) keywords.add(word)
    }
  }
  if (role) {
    for (const word of role.toLowerCase().split(/[\s,_\-]+/)) {
      if (word.length >= 2) keywords.add(word)
    }
  }
  return keywords
}

// ── 페르소나 선정 ────────────────────────────────────────────────

/**
 * 미디어 아이템에 반응할 페르소나 선정 (점수 내림차순).
 */
export function selectPersonasForMediaItem(
  item: MediaItemForMatching,
  personas: PersonaForMediaMatching[],
  threshold = MEDIA_INTEREST_THRESHOLD
): MediaInterestResult[] {
  return personas
    .map((p) => computeMediaInterestScore(item, p))
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
}

// ── Daily Budget 할당 ────────────────────────────────────────────

export interface MediaReactionPair {
  itemId: string
  item: MediaItemForMatching
  personaId: string
  score: number
}

export interface AllocateDailyMediaOptions {
  dailyBudget?: number // 기본 15 (뉴스보다 적게 — 콘텐츠 소비는 선택적)
  maxPerPersona?: number // 기본 2
}

/**
 * 여러 미디어 아이템 × 여러 페르소나 → importance 등급 기반 동적 할당.
 *
 * 알고리즘:
 * 1. 아이템별 ImportanceGrade 판정 (HIGH/NORMAL/LOW)
 * 2. 등급별 동적 threshold + maxReactors 적용
 * 3. 전체 dailyBudget 내에서 importance 가중 점수 순 선택
 */
export function allocateDailyMediaReactions(
  itemsWithIds: Array<{ id: string; item: MediaItemForMatching }>,
  personas: PersonaForMediaMatching[],
  options: AllocateDailyMediaOptions = {}
): MediaReactionPair[] {
  const dailyBudget = options.dailyBudget ?? 15
  const maxPerPersona = options.maxPerPersona ?? 2

  const allPairs: MediaReactionPair[] = []

  for (const { id, item } of itemsWithIds) {
    const grade = getImportanceGrade(item.importanceScore)
    const config = getGradeConfig(grade, personas.length)
    const results = selectPersonasForMediaItem(item, personas, config.threshold)
    const capped = results.slice(0, config.maxReactors)

    for (const r of capped) {
      allPairs.push({ itemId: id, item, personaId: r.personaId, score: r.score })
    }
  }

  // importance 가중 점수 내림차순
  allPairs.sort((a, b) => {
    const adjA = a.score * (0.6 + 0.4 * a.item.importanceScore)
    const adjB = b.score * (0.6 + 0.4 * b.item.importanceScore)
    return adjB - adjA
  })

  const personaCount = new Map<string, number>()
  const selected: MediaReactionPair[] = []

  for (const pair of allPairs) {
    if (selected.length >= dailyBudget) break
    const count = personaCount.get(pair.personaId) ?? 0
    if (count >= maxPerPersona) continue
    personaCount.set(pair.personaId, count + 1)
    selected.push(pair)
  }

  return selected
}
