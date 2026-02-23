// ═══════════════════════════════════════════════════════════════
// Phase NB — News Interest Matcher
// 뉴스 기사 × 페르소나 → 관심도 점수 (입장/찬반 아님)
// "이 뉴스에 얼마나 관심을 가질 것인가"
// ═══════════════════════════════════════════════════════════════

import type { CoreTemperamentVector } from "@/types/persona-v3"

// ── 타입 ────────────────────────────────────────────────────────

export interface ArticleForMatching {
  topicTags: string[] // ["AI", "규제", ...]
  summary: string
}

export interface PersonaForMatching {
  id: string
  expertise: string[] // ["technology", "AI ethics", ...]
  role?: string | null
  temperament: CoreTemperamentVector
}

export interface NewsInterestResult {
  personaId: string
  score: number // 0~1
  breakdown: {
    tagOverlap: number // 키워드 오버랩 (40%)
    openness: number // 새 이슈 수용성 (30%)
    extraversion: number // 공개 반응 의지 (30%)
  }
}

// ── 상수 ────────────────────────────────────────────────────────

/** 이 점수 미만이면 반응하지 않음 */
export const INTEREST_THRESHOLD = 0.25

/** 최대 반응 페르소나 수 (기본값) */
export const DEFAULT_MAX_REACTORS = 5

// ── 관심도 점수 계산 ─────────────────────────────────────────────

/**
 * 뉴스 기사와 페르소나 간 관심도 점수 계산.
 *
 * score = tagOverlap(40%) + openness(30%) + extraversion(30%)
 *
 * - tagOverlap: 기사 주제태그와 페르소나 전문분야 키워드 오버랩
 * - openness: L2 OCEAN 개방성 (새로운 주제/이슈에 관심 가질 가능성)
 * - extraversion: L2 OCEAN 외향성 (SNS에 공개 반응 올릴 의지)
 */
export function computeNewsInterestScore(
  article: ArticleForMatching,
  persona: PersonaForMatching
): NewsInterestResult {
  const tagOverlap = computeTagOverlap(article.topicTags, persona.expertise, persona.role)
  const openness = persona.temperament.openness
  const extraversion = persona.temperament.extraversion

  const score = tagOverlap * 0.4 + openness * 0.3 + extraversion * 0.3

  return {
    personaId: persona.id,
    score: Math.min(1, Math.max(0, score)),
    breakdown: { tagOverlap, openness, extraversion },
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

  // 페르소나 키워드 집합 (전문분야 + 역할에서 추출)
  const personaKeywords = buildPersonaKeywords(expertise, role)
  const articleKeywords = articleTags.map((t) => t.toLowerCase())

  // 직접 매칭
  let directMatches = 0
  for (const tag of articleKeywords) {
    if (personaKeywords.has(tag)) directMatches++
  }

  if (directMatches > 0) {
    const union = new Set([...articleKeywords, ...personaKeywords]).size
    return Math.min(1, directMatches / Math.sqrt(union)) // Jaccard 변형
  }

  // 부분 키워드 매칭 (예: "AI 규제" → "AI" 매칭)
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
    // "AI Ethics" → ["ai", "ethics", "ai ethics"]
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
 * 1. 각 페르소나 관심도 점수 계산
 * 2. threshold 미만 제외
 * 3. 상위 topN 반환
 */
export function selectPersonasForArticle(
  article: ArticleForMatching,
  personas: PersonaForMatching[],
  topN = DEFAULT_MAX_REACTORS
): NewsInterestResult[] {
  return personas
    .map((p) => computeNewsInterestScore(article, p))
    .filter((r) => r.score >= INTEREST_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}
