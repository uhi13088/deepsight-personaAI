// ═══════════════════════════════════════════════════════════════
// Phase NB — News Interest Matcher (T255: 동적 스케일링)
// 뉴스 기사 × 페르소나 → 관심도 점수 (입장/찬반 아님)
// "이 뉴스에 얼마나 관심을 가질 것인가"
// ═══════════════════════════════════════════════════════════════

import type { CoreTemperamentVector } from "@/types/persona-v3"

// ── 타입 ────────────────────────────────────────────────────────

export interface ArticleForMatching {
  topicTags: string[] // ["AI", "규제", ...]
  summary: string
  region: string // "KR" | "JP" | "US" | "EU" | "CN" | "GLOBAL"
  importanceScore: number // T255: 기사 중요도 (0.00~1.00, Claude 분석)
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

// ── T255: Importance 등급 ─────────────────────────────────────

export type ImportanceGrade = "BREAKING" | "HIGH" | "NORMAL" | "LOW"

export interface DynamicGradeConfig {
  grade: ImportanceGrade
  threshold: number // 관심도 임계값
  maxReactors: number // 이 기사에 반응 가능한 최대 페르소나 수
}

/**
 * importanceScore → 등급 판정.
 *
 * BREAKING (≥0.9): 전쟁, 팬데믹, 금융위기 등 전 세계적 이슈
 * HIGH (0.7~0.9): 국가 단위 주요 이슈 (대선, 대형사고)
 * NORMAL (0.5~0.7): 일반 뉴스 (산업 동향, 기업 발표)
 * LOW (<0.5): 지역·소규모 뉴스
 */
export function getImportanceGrade(score: number): ImportanceGrade {
  if (score >= 0.9) return "BREAKING"
  if (score >= 0.7) return "HIGH"
  if (score >= 0.5) return "NORMAL"
  return "LOW"
}

/**
 * 등급별 동적 threshold + maxReactors 결정.
 *
 * BREAKING: threshold 0.15 (거의 모든 페르소나 참여), cap = normalBudget×3
 * HIGH:     threshold 0.25, cap = 활성 페르소나의 50%
 * NORMAL:   threshold 0.35, cap = normalBudget
 * LOW:      threshold 0.45 (정확 매칭만), cap = normalBudget/2
 */
export function getGradeConfig(
  grade: ImportanceGrade,
  activePersonaCount: number,
  normalBudget: number
): DynamicGradeConfig {
  switch (grade) {
    case "BREAKING":
      return { grade, threshold: 0.15, maxReactors: normalBudget * 3 }
    case "HIGH":
      return { grade, threshold: 0.25, maxReactors: Math.floor(activePersonaCount * 0.5) }
    case "NORMAL":
      return { grade, threshold: 0.35, maxReactors: normalBudget }
    case "LOW":
      return { grade, threshold: 0.45, maxReactors: Math.max(1, Math.floor(normalBudget * 0.5)) }
  }
}

/**
 * 기사 목록 기반 effective daily budget 결정.
 *
 * BREAKING 기사 존재 → normalBudget×3
 * HIGH 기사 존재 → normalBudget×2
 * 그 외 → normalBudget
 *
 * BREAKING 일일 최대 횟수 초과 시 무시.
 */
export function computeEffectiveDailyBudget(
  articles: Array<{ importanceScore: number }>,
  normalBudget: number,
  maxBreakingPerDay: number
): number {
  let breakingCount = 0
  let hasHigh = false

  for (const a of articles) {
    if (a.importanceScore >= 0.9) breakingCount++
    else if (a.importanceScore >= 0.7) hasHigh = true
  }

  if (Math.min(breakingCount, maxBreakingPerDay) > 0) return normalBudget * 3
  if (hasHigh) return normalBudget * 2
  return normalBudget
}

// ── 상수 ────────────────────────────────────────────────────────

/** 수동 트리거 임계값 */
export const INTEREST_THRESHOLD = 0.25

/** 자동 daily_news 모드 임계값 (더 엄격) — T255 이전 기본값, 하위호환 */
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
  /** T255: 이 포스트에 다른 페르소나가 댓글을 달 수 있는지 (기사당 상위 N개만 true) */
  commentEligible: boolean
}

export interface AllocateDailyReactionsOptions {
  /** @deprecated T255 이전 호환용. 동적 스케일링이 기사별 threshold를 결정하므로 무시됨 */
  threshold?: number
  /** 기본 일일 예산 (기본 20). BREAKING/HIGH 시 자동 증액 */
  dailyBudget?: number
  /** 페르소나당 최대 반응 수 (기본 2) */
  maxPerPersona?: number
  /** T255: BREAKING 일일 최대 횟수 (기본 3). 초과 시 HIGH로 다운그레이드 */
  maxBreakingPerDay?: number
  /** T255: 기사당 댓글 허용 포스트 수 (기본 5) */
  commentThrottlePerArticle?: number
}

/**
 * T255: 여러 기사 × 여러 페르소나 → importance 등급 기반 동적 할당.
 *
 * 알고리즘:
 * 1. 기사별 ImportanceGrade 판정 (BREAKING/HIGH/NORMAL/LOW)
 * 2. 등급별 동적 threshold + maxReactors 적용
 * 3. BREAKING 일일 제한(maxBreakingPerDay) 초과 시 HIGH로 다운그레이드
 * 4. 전체 effectiveDailyBudget 내에서 importance 가중 점수 순 선택
 * 5. 기사당 상위 N개만 commentEligible (댓글 연쇄 비용 제어)
 */
export function allocateDailyReactions(
  articlesWithIds: Array<{ id: string; article: ArticleForMatching }>,
  personas: PersonaForMatching[],
  options: AllocateDailyReactionsOptions = {}
): ArticleReactionPair[] {
  const normalBudget = options.dailyBudget ?? 20
  const maxPerPersona = options.maxPerPersona ?? 2
  const maxBreakingPerDay = options.maxBreakingPerDay ?? 3
  const commentThrottlePerArticle = options.commentThrottlePerArticle ?? 5

  // T255: effective daily budget (BREAKING→×3, HIGH→×2)
  const effectiveBudget = computeEffectiveDailyBudget(
    articlesWithIds.map((a) => a.article),
    normalBudget,
    maxBreakingPerDay
  )

  // T255: 기사별 동적 threshold + cap으로 후보 쌍 계산
  let breakingCount = 0
  const allPairs: ArticleReactionPair[] = []

  for (const { id, article } of articlesWithIds) {
    let grade = getImportanceGrade(article.importanceScore)

    // BREAKING 일일 제한: 초과 시 HIGH로 다운그레이드
    if (grade === "BREAKING") {
      breakingCount++
      if (breakingCount > maxBreakingPerDay) grade = "HIGH"
    }

    const config = getGradeConfig(grade, personas.length, normalBudget)
    const results = selectPersonasForArticle(article, personas, config.threshold)

    // 기사별 maxReactors cap 적용
    const capped = results.slice(0, config.maxReactors)
    for (const r of capped) {
      allPairs.push({
        articleId: id,
        article,
        personaId: r.personaId,
        score: r.score,
        commentEligible: true, // 임시, 아래에서 재계산
      })
    }
  }

  // 중요도 가중 점수로 내림차순 정렬
  // adjustedScore = interestScore × (0.6 + 0.4 × importanceScore)
  allPairs.sort((a, b) => {
    const adjA = a.score * (0.6 + 0.4 * a.article.importanceScore)
    const adjB = b.score * (0.6 + 0.4 * b.article.importanceScore)
    return adjB - adjA
  })

  // 전체 예산 내 선택 (페르소나당 maxPerPersona 제한)
  const personaCount = new Map<string, number>()
  const selected: ArticleReactionPair[] = []

  for (const pair of allPairs) {
    if (selected.length >= effectiveBudget) break
    const count = personaCount.get(pair.personaId) ?? 0
    if (count >= maxPerPersona) continue
    personaCount.set(pair.personaId, count + 1)
    selected.push(pair)
  }

  // T255: 댓글 쓰로틀링 — 기사당 상위 N개만 commentEligible
  const articlePostCount = new Map<string, number>()
  for (const pair of selected) {
    const count = articlePostCount.get(pair.articleId) ?? 0
    pair.commentEligible = count < commentThrottlePerArticle
    articlePostCount.set(pair.articleId, count + 1)
  }

  return selected
}
