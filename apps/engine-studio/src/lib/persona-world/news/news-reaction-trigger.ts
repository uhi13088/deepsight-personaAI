// ═══════════════════════════════════════════════════════════════
// Phase NB — News Reaction Trigger (T199: 지역 기반 확장)
// 뉴스 기사 → 관심 페르소나 선정 → TRENDING 트리거로 포스트 생성 예약
// ═══════════════════════════════════════════════════════════════

import type { CoreTemperamentVector } from "@/types/persona-v3"
import {
  selectPersonasForArticle,
  allocateDailyReactions,
  INTEREST_THRESHOLD,
  AUTO_INTEREST_THRESHOLD,
} from "./news-interest-matcher"
import type { PersonaForMatching, ArticleForMatching } from "./news-interest-matcher"

// ── 타입 ────────────────────────────────────────────────────────

export interface NewsArticleForTrigger {
  id: string
  title: string
  summary: string
  topicTags: string[]
  region: string // T199: "KR" | "JP" | "US" | "EU" | "CN" | "GLOBAL"
}

export interface PersonaForTrigger {
  id: string
  expertise: string[]
  role?: string | null
  country: string // T199
  languages: string[] // T199
  temperament: CoreTemperamentVector
}

export interface ScheduledReaction {
  personaId: string
  articleId: string
  interestScore: number
  scheduledAt: Date
}

export interface NewsReactionDataProvider {
  /** 활성 페르소나 목록 (status=ACTIVE/STANDARD) */
  getActivePersonas(): Promise<PersonaForTrigger[]>

  /** 페르소나가 이미 이 기사에 반응했는지 확인 */
  hasReactedToArticle(personaId: string, articleId: string): Promise<boolean>

  /** 뉴스 반응 포스트 예약 (TRENDING 트리거) */
  scheduleNewsReactionPost(params: {
    personaId: string
    articleId: string
    articleTitle: string
    articleSummary: string
    interestScore: number
  }): Promise<void>

  /** 기사 트리거 횟수 기록 */
  markArticleTriggered(articleId: string, triggerCount: number): Promise<void>
}

// ── 단일 기사 트리거 ─────────────────────────────────────────────

/**
 * 단일 뉴스 기사에 대한 페르소나 반응 트리거 (수동).
 *
 * 점수 분포가 반응 인원을 결정. 하드코딩 상한 없음.
 * - 대형 GLOBAL 이슈 → 개방적·외향적 페르소나 다수 반응
 * - 지역 특화 뉴스 → 해당 국가 페르소나만 반응
 */
export async function triggerNewsReactionPosts(
  article: NewsArticleForTrigger,
  dataProvider: NewsReactionDataProvider
): Promise<ScheduledReaction[]> {
  const personas = await dataProvider.getActivePersonas()

  const personasForMatching: PersonaForMatching[] = personas.map((p) => ({
    id: p.id,
    expertise: p.expertise,
    role: p.role,
    country: p.country,
    languages: p.languages,
    temperament: p.temperament,
  }))

  const articleForMatching: ArticleForMatching = {
    topicTags: article.topicTags,
    summary: article.summary,
    region: article.region,
  }

  // 수동 트리거 = 낮은 임계값 (0.25)
  const selected = selectPersonasForArticle(
    articleForMatching,
    personasForMatching,
    INTEREST_THRESHOLD
  )

  if (selected.length === 0) {
    console.log(`[news-reaction] 기사 ${article.id}: 반응할 페르소나 없음`)
    return []
  }

  const reactions: ScheduledReaction[] = []

  for (const result of selected) {
    const alreadyReacted = await dataProvider.hasReactedToArticle(result.personaId, article.id)
    if (alreadyReacted) continue

    await dataProvider.scheduleNewsReactionPost({
      personaId: result.personaId,
      articleId: article.id,
      articleTitle: article.title,
      articleSummary: article.summary,
      interestScore: result.score,
    })

    reactions.push({
      personaId: result.personaId,
      articleId: article.id,
      interestScore: result.score,
      scheduledAt: new Date(),
    })
  }

  if (reactions.length > 0) {
    await dataProvider.markArticleTriggered(article.id, reactions.length)
    console.log(
      `[news-reaction] "${article.title}" (${article.region}) → ${reactions.length}명 반응 예약`
    )
  }

  return reactions
}

// ── Daily 자동 트리거 ────────────────────────────────────────────

export interface DailyNewsDataProvider extends NewsReactionDataProvider {
  /** 최근 N시간 이내 수집된 기사 목록 */
  getRecentArticles(withinHours: number): Promise<NewsArticleForTrigger[]>

  /** 페르소나가 오늘 이미 뉴스 반응 포스트를 올렸는지 확인 */
  getPersonaNewsReactionCountToday(personaId: string): Promise<number>
}

/**
 * 일일 자동 뉴스 반응 파이프라인.
 *
 * 설계 원칙:
 * - 하드코딩 상한 없음 → allocateDailyReactions()의 점수 기반 분배
 * - 대형 이슈 → 자연스럽게 많은 페르소나가 임계값 초과 → 많이 반응
 * - 소형 뉴스 → 소수 반응
 * - dailyBudget(20)이 총량 상한, maxPerPersona(2)가 1인당 상한
 *
 * @param withinHours 최근 몇 시간 이내 기사 대상 (기본 24h)
 */
export async function runDailyNewsReactions(
  dataProvider: DailyNewsDataProvider,
  options: {
    withinHours?: number // 수집 대상 기간 (기본 24h)
    dailyBudget?: number // 하루 총 포스트 수 상한 (기본 20)
    maxPerPersona?: number // 페르소나당 최대 (기본 2)
  } = {}
): Promise<ScheduledReaction[]> {
  const withinHours = options.withinHours ?? 24
  const dailyBudget = options.dailyBudget ?? 20
  const maxPerPersona = options.maxPerPersona ?? 2

  const [articles, personas] = await Promise.all([
    dataProvider.getRecentArticles(withinHours),
    dataProvider.getActivePersonas(),
  ])

  if (articles.length === 0 || personas.length === 0) return []

  const personasForMatching: PersonaForMatching[] = personas.map((p) => ({
    id: p.id,
    expertise: p.expertise,
    role: p.role,
    country: p.country,
    languages: p.languages,
    temperament: p.temperament,
  }))

  // allocateDailyReactions: 점수 기반으로 예산 내 최적 쌍 선택
  const pairs = allocateDailyReactions(
    articles.map((a) => ({
      id: a.id,
      article: { topicTags: a.topicTags, summary: a.summary, region: a.region },
    })),
    personasForMatching,
    { threshold: AUTO_INTEREST_THRESHOLD, dailyBudget, maxPerPersona }
  )

  const reactions: ScheduledReaction[] = []

  for (const pair of pairs) {
    const alreadyReacted = await dataProvider.hasReactedToArticle(pair.personaId, pair.articleId)
    if (alreadyReacted) continue

    const article = articles.find((a) => a.id === pair.articleId)
    if (!article) continue

    await dataProvider.scheduleNewsReactionPost({
      personaId: pair.personaId,
      articleId: pair.articleId,
      articleTitle: article.title,
      articleSummary: article.summary,
      interestScore: pair.score,
    })

    reactions.push({
      personaId: pair.personaId,
      articleId: pair.articleId,
      interestScore: pair.score,
      scheduledAt: new Date(),
    })
  }

  const articleReactionCounts = reactions.reduce(
    (acc, r) => {
      acc[r.articleId] = (acc[r.articleId] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  for (const [articleId, count] of Object.entries(articleReactionCounts)) {
    await dataProvider.markArticleTriggered(articleId, count)
  }

  console.log(
    `[daily-news] ${articles.length}개 기사 × ${personas.length}명 페르소나 → ${reactions.length}개 반응 예약`
  )

  return reactions
}

// ── 토픽 포맷터 ─────────────────────────────────────────────────

/**
 * 뉴스 기사를 포스트 생성 topic 문자열로 변환.
 *
 * content-generator의 [주제] 섹션에 주입됨.
 */
export function formatNewsArticleTopic(title: string, summary: string): string {
  return `[뉴스 이슈] ${title}\n\n${summary}`
}
