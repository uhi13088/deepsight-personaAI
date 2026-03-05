// ═══════════════════════════════════════════════════════════════
// Phase NB — News Reaction Trigger (T255: 동적 스케일링 + 비용 안전장치)
// 뉴스 기사 → 관심 페르소나 선정 → TRENDING 트리거로 포스트 생성 예약
// ═══════════════════════════════════════════════════════════════

import type { CoreTemperamentVector } from "@/types/persona-v3"
import {
  selectPersonasForArticle,
  allocateDailyReactions,
  getImportanceGrade,
  getGradeConfig,
  INTEREST_THRESHOLD,
} from "./news-interest-matcher"
import type {
  PersonaForMatching,
  ArticleForMatching,
  AllocateDailyReactionsOptions,
} from "./news-interest-matcher"
import { checkDailyBudget } from "../cost/budget-alert"

// ── 타입 ────────────────────────────────────────────────────────

export interface NewsArticleForTrigger {
  id: string
  title: string
  summary: string
  topicTags: string[]
  region: string // T199: "KR" | "JP" | "US" | "EU" | "CN" | "GLOBAL"
  importanceScore: number // T255: 기사 중요도 (0.00~1.00)
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
  /** T255: 이 포스트에 댓글 허용 여부 (기사당 상위 N개만 true) */
  commentEligible: boolean
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
    commentEligible: boolean
  }): Promise<void>

  /** 기사 트리거 횟수 기록 */
  markArticleTriggered(articleId: string, triggerCount: number): Promise<void>
}

// ── 단일 기사 트리거 ─────────────────────────────────────────────

/**
 * 단일 뉴스 기사에 대한 페르소나 반응 트리거 (수동).
 *
 * importance 등급 기반 퍼센트 캡 적용:
 * - BREAKING(≥0.9): 상위 40%, HIGH(≥0.7): 상위 20%
 * - NORMAL(≥0.5): 상위 15%, LOW: 상위 10%
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
    importanceScore: article.importanceScore,
  }

  // 수동 트리거: importance 등급 기반 퍼센트 캡
  const grade = getImportanceGrade(article.importanceScore)
  const config = getGradeConfig(grade, personasForMatching.length, 20)
  const selected = selectPersonasForArticle(
    articleForMatching,
    personasForMatching,
    config.threshold
  ).slice(0, config.maxReactors)

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
      commentEligible: true, // 수동 트리거는 모두 댓글 허용
    })

    reactions.push({
      personaId: result.personaId,
      articleId: article.id,
      interestScore: result.score,
      scheduledAt: new Date(),
      commentEligible: true,
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

/** T255: 비용 체크 콜백 (배치 간 budget-alert 연동) */
export interface CostCheckProvider {
  /** 오늘 현재까지 지출 (USD) */
  getTodaySpending(): Promise<number>
  /** 일일 비용 예산 (USD) */
  getDailyBudgetUsd(): Promise<number>
}

/** T255: 배치 크기 */
const BATCH_SIZE = 20

/**
 * T255: 일일 자동 뉴스 반응 파이프라인 (동적 스케일링 + 비용 안전장치).
 *
 * 설계 원칙:
 * - importance 등급별 동적 threshold/cap (BREAKING→×3, HIGH→×2)
 * - BREAKING 일일 최대 횟수 제한 (초과 시 HIGH로 다운그레이드)
 * - 배치 처리(20건씩) + 배치 간 budget-alert 체크 (CRITICAL 시 중단)
 * - 기사당 댓글 허용 포스트 제한 (commentEligible)
 */
export async function runDailyNewsReactions(
  dataProvider: DailyNewsDataProvider,
  options: {
    withinHours?: number
    dailyBudget?: number
    maxPerPersona?: number
    maxBreakingPerDay?: number
    commentThrottlePerArticle?: number
    costCheck?: CostCheckProvider
  } = {}
): Promise<ScheduledReaction[]> {
  const withinHours = options.withinHours ?? 24
  const dailyBudget = options.dailyBudget ?? 20
  const maxPerPersona = options.maxPerPersona ?? 2
  const maxBreakingPerDay = options.maxBreakingPerDay ?? 3
  const commentThrottlePerArticle = options.commentThrottlePerArticle ?? 5

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

  // T255: 동적 스케일링 옵션
  const allocOptions: AllocateDailyReactionsOptions = {
    dailyBudget,
    maxPerPersona,
    maxBreakingPerDay,
    commentThrottlePerArticle,
  }

  const pairs = allocateDailyReactions(
    articles.map((a) => ({
      id: a.id,
      article: {
        topicTags: a.topicTags,
        summary: a.summary,
        region: a.region,
        importanceScore: a.importanceScore,
      },
    })),
    personasForMatching,
    allocOptions
  )

  // T255: 배치 처리 + budget-alert 연동
  const reactions: ScheduledReaction[] = []
  let batchCount = 0

  for (const pair of pairs) {
    // 배치 경계마다 비용 체크
    if (options.costCheck && reactions.length > 0 && reactions.length % BATCH_SIZE === 0) {
      batchCount++
      const isBudgetExceeded = await checkCostBudget(options.costCheck)
      if (isBudgetExceeded) {
        console.log(
          `[daily-news] 비용 CRITICAL — 배치 ${batchCount}에서 중단 (${reactions.length}건 처리)`
        )
        break
      }
    }

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
      commentEligible: pair.commentEligible,
    })

    reactions.push({
      personaId: pair.personaId,
      articleId: pair.articleId,
      interestScore: pair.score,
      scheduledAt: new Date(),
      commentEligible: pair.commentEligible,
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

  // T255: 등급별 로그 출력
  const gradeDistribution = articles.reduce(
    (acc, a) => {
      const g = getImportanceGrade(a.importanceScore)
      acc[g] = (acc[g] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  console.log(
    `[daily-news] ${articles.length}개 기사 (${formatGradeDist(gradeDistribution)}) × ` +
      `${personas.length}명 페르소나 → ${reactions.length}개 반응 예약`
  )

  return reactions
}

// ── 비용 체크 헬퍼 ──────────────────────────────────────────────

/**
 * T255: 배치 간 비용 체크. CRITICAL 이상이면 true 반환.
 */
async function checkCostBudget(costCheck: CostCheckProvider): Promise<boolean> {
  const [spending, budget] = await Promise.all([
    costCheck.getTodaySpending(),
    costCheck.getDailyBudgetUsd(),
  ])
  const alert = checkDailyBudget(spending, budget)
  return alert !== null && (alert.level === "CRITICAL" || alert.level === "EMERGENCY")
}

function formatGradeDist(dist: Record<string, number>): string {
  return Object.entries(dist)
    .map(([g, n]) => `${g}:${n}`)
    .join(" ")
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
