// ═══════════════════════════════════════════════════════════════
// Phase NB — News Interest Matcher (T199: 지역 기반 확장)
// 뉴스 기사 × 페르소나 → 관심도 점수 (입장/찬반 아님)
// "이 뉴스에 얼마나 관심을 가질 것인가"
// ═══════════════════════════════════════════════════════════════

import type { CoreTemperamentVector } from "@/types/persona-v3"

// ── 타입 ────────────────────────────────────────────────────────

export interface ArticleForMatching {
  topicTags: string[] // ["AI", "규제", ...]
  summary: string
  region: string // "KR" | "JP" | "US" | "EU" | "CN" | "GLOBAL"
}

export interface PersonaForMatching {
  id: string
  expertise: string[] // ["technology", "AI ethics", ...]
  role?: string | null
  country: string // "KR", "JP", "US", ...
  languages: string[] // ["ko", "en", "ja", ...]
  temperament: CoreTemperamentVector
}

export interface NewsInterestResult {
  personaId: string
  score: number // 0~1
  breakdown: {
    tagOverlap: number // 키워드 오버랩 (35%)
    openness: number // 새 이슈 수용성 (25%)
    extraversion: number // 공개 반응 의지 (25%)
    regionalRelevance: number // 지역 연관성 (15%)
  }
}

// ── 상수 ────────────────────────────────────────────────────────

/** 수동 트리거 임계값 */
export const INTEREST_THRESHOLD = 0.25

/** 자동 daily_news 모드 임계값 (더 엄격) */
export const AUTO_INTEREST_THRESHOLD = 0.35

/** 지역 코드 → 언어 코드 매핑 */
const REGION_TO_LANG: Record<string, string> = {
  KR: "ko",
  JP: "ja",
  CN: "zh",
  US: "en",
  EU: "en", // 영어권 대표
  GB: "en",
  AU: "en",
  FR: "fr",
  DE: "de",
}

// ── 지역 연관성 점수 ─────────────────────────────────────────────

/**
 * 기사 지역과 페르소나 배경 간 연관성 점수 (0~1).
 *
 * GLOBAL 기사 → 모든 페르소나에 기본 관심 (0.3)
 * 자국 뉴스    → 강한 관심 (0.9)
 * 언어 연관    → 중간 관심 (0.5)
 * 무관 지역    → 낮은 관심 (0.05)
 */
export function computeRegionalRelevance(
  articleRegion: string,
  persona: Pick<PersonaForMatching, "country" | "languages">
): number {
  // GLOBAL 이슈: 누구나 기본 관심
  if (articleRegion === "GLOBAL") return 0.3

  // 자국 뉴스: 가장 강한 연관성
  if (articleRegion === persona.country) return 0.9

  // 언어 연관성: 해당 지역 언어를 구사하는 페르소나
  const articleLang = REGION_TO_LANG[articleRegion]
  if (articleLang && persona.languages.includes(articleLang)) return 0.5

  // 무관 지역: 최소 관심
  return 0.05
}

// ── 관심도 점수 계산 ─────────────────────────────────────────────

/**
 * 뉴스 기사와 페르소나 간 관심도 점수 계산.
 *
 * score = tagOverlap(35%) + openness(25%) + extraversion(25%) + regionalRelevance(15%)
 *
 * 설계 원칙:
 * - 전세계적 대형 이슈 (GLOBAL + 광범위 태그):
 *   개방적·외향적 페르소나들은 분야 무관하게 자연스럽게 고득점
 * - 지역 특화 뉴스 (KR 정치):
 *   한국 페르소나는 regional 보너스로 고득점, 타국 페르소나는 낮은 점수
 * - 전문 분야 일치 + 관련 지역:
 *   두 요소 모두 높아 최고점
 */
export function computeNewsInterestScore(
  article: ArticleForMatching,
  persona: PersonaForMatching
): NewsInterestResult {
  const tagOverlap = computeTagOverlap(article.topicTags, persona.expertise, persona.role)
  const openness = persona.temperament.openness
  const extraversion = persona.temperament.extraversion
  const regionalRelevance = computeRegionalRelevance(article.region, persona)

  const score = tagOverlap * 0.35 + openness * 0.25 + extraversion * 0.25 + regionalRelevance * 0.15

  return {
    personaId: persona.id,
    score: Math.min(1, Math.max(0, score)),
    breakdown: { tagOverlap, openness, extraversion, regionalRelevance },
  }
}

/**
 * 기사 태그와 페르소나 전문분야 간 오버랩 점수 (0~1).
 *
 * 정규화된 Jaccard 유사도 기반.
 * 직접 매칭 없으면 부분 키워드 매칭으로 fallback.
 */
function computeTagOverlap(
  articleTags: string[],
  expertise: string[],
  role?: string | null
): number {
  if (articleTags.length === 0 || (expertise.length === 0 && !role)) {
    return 0.1 // 최소 기본 관심도 (완전 무관심 방지)
  }

  const personaKeywords = buildPersonaKeywords(expertise, role)
  const articleKeywords = articleTags.map((t) => t.toLowerCase())

  // 직접 매칭
  let directMatches = 0
  for (const tag of articleKeywords) {
    if (personaKeywords.has(tag)) directMatches++
  }

  if (directMatches > 0) {
    const union = new Set([...articleKeywords, ...personaKeywords]).size
    return Math.min(1, directMatches / Math.sqrt(union))
  }

  // 부분 키워드 매칭
  let partialScore = 0
  for (const tag of articleKeywords) {
    for (const kw of personaKeywords) {
      if (tag.includes(kw) || kw.includes(tag)) {
        partialScore += 0.3
        break
      }
    }
  }

  return Math.min(0.5, partialScore / articleKeywords.length)
}

function buildPersonaKeywords(expertise: string[], role?: string | null): Set<string> {
  const keywords = new Set<string>()

  for (const exp of expertise) {
    const lower = exp.toLowerCase()
    keywords.add(lower)
    for (const word of lower.split(/[\s,_-]+/)) {
      if (word.length >= 2) keywords.add(word)
    }
  }

  if (role) {
    const lower = role.toLowerCase()
    for (const word of lower.split(/[\s,_-]+/)) {
      if (word.length >= 2) keywords.add(word)
    }
  }

  return keywords
}

// ── 페르소나 선정 ────────────────────────────────────────────────

/**
 * 뉴스 기사에 반응할 페르소나 선정.
 *
 * 하드코딩 상한 없음 — 점수 분포가 자연스럽게 반응 인원을 결정.
 * 대형 글로벌 이슈 → 많은 페르소나가 threshold 초과 → 많이 반응.
 * 지역 특화 뉴스  → 해당 국가 페르소나만 초과 → 소수 반응.
 *
 * @param threshold 0.25(수동) 또는 0.35(자동)
 */
export function selectPersonasForArticle(
  article: ArticleForMatching,
  personas: PersonaForMatching[],
  threshold = INTEREST_THRESHOLD
): NewsInterestResult[] {
  return personas
    .map((p) => computeNewsInterestScore(article, p))
    .filter((r) => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
}

// ── Daily Budget 할당 ────────────────────────────────────────────

export interface ArticleReactionPair {
  articleId: string
  article: ArticleForMatching
  personaId: string
  score: number
}

/**
 * 여러 기사 × 여러 페르소나 → 일일 예산 내 최적 반응 쌍 선정.
 *
 * 알고리즘:
 * 1. 모든 (기사, 페르소나) 조합 점수 계산
 * 2. 점수 내림차순 정렬
 * 3. 페르소나당 최대 maxPerPersona 반응 허용
 * 4. 총 dailyBudget 내에서 상위 쌍 선택
 *
 * 결과: 대형 이슈 → 많은 쌍이 선택, 소형 뉴스 → 적게 선택.
 */
export function allocateDailyReactions(
  articlesWithIds: Array<{ id: string; article: ArticleForMatching }>,
  personas: PersonaForMatching[],
  options: {
    threshold?: number // 기본 0.35 (자동 모드)
    dailyBudget?: number // 하루 총 포스트 수 상한 (기본 20)
    maxPerPersona?: number // 페르소나당 최대 반응 수 (기본 2)
  } = {}
): ArticleReactionPair[] {
  const threshold = options.threshold ?? AUTO_INTEREST_THRESHOLD
  const dailyBudget = options.dailyBudget ?? 20
  const maxPerPersona = options.maxPerPersona ?? 2

  // 모든 쌍 계산
  const allPairs: ArticleReactionPair[] = []
  for (const { id, article } of articlesWithIds) {
    const results = selectPersonasForArticle(article, personas, threshold)
    for (const r of results) {
      allPairs.push({ articleId: id, article, personaId: r.personaId, score: r.score })
    }
  }

  // 점수 내림차순 정렬
  allPairs.sort((a, b) => b.score - a.score)

  // 예산 내 선택 (페르소나당 maxPerPersona 제한)
  const personaCount = new Map<string, number>()
  const selected: ArticleReactionPair[] = []

  for (const pair of allPairs) {
    if (selected.length >= dailyBudget) break
    const count = personaCount.get(pair.personaId) ?? 0
    if (count >= maxPerPersona) continue
    personaCount.set(pair.personaId, count + 1)
    selected.push(pair)
  }

  return selected
}
