// ═══════════════════════════════════════════════════════════════
// Phase NB — News Reaction Trigger
// 뉴스 기사 → 관심 페르소나 선정 → TRENDING 트리거로 포스트 생성 예약
// ═══════════════════════════════════════════════════════════════

import type { CoreTemperamentVector } from "@/types/persona-v3"
import { selectPersonasForArticle } from "./news-interest-matcher"
import type { PersonaForMatching } from "./news-interest-matcher"

// ── 타입 ────────────────────────────────────────────────────────

export interface NewsArticleForTrigger {
  id: string
  title: string
  summary: string
  topicTags: string[]
}

export interface PersonaForTrigger {
  id: string
  expertise: string[]
  role?: string | null
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

  /** 뉴스 기사 수집 타임스탬프 업데이트 */
  markArticleTriggered(articleId: string, triggerCount: number): Promise<void>
}

// ── 메인 파이프라인 ──────────────────────────────────────────────

/**
 * 뉴스 기사에 대한 페르소나 반응 포스트 트리거.
 *
 * 1. 활성 페르소나 조회
 * 2. 관심도 매칭 → 상위 N명 선정
 * 3. 중복 반응 필터링
 * 4. 각 페르소나에 TRENDING 트리거로 포스트 예약
 */
export async function triggerNewsReactionPosts(
  article: NewsArticleForTrigger,
  dataProvider: NewsReactionDataProvider,
  topN = 5
): Promise<ScheduledReaction[]> {
  const personas = await dataProvider.getActivePersonas()

  // PersonaForMatching 형태로 변환
  const personasForMatching: PersonaForMatching[] = personas.map((p) => ({
    id: p.id,
    expertise: p.expertise,
    role: p.role,
    temperament: p.temperament,
  }))

  // 관심도 매칭
  const selected = selectPersonasForArticle(
    { topicTags: article.topicTags, summary: article.summary },
    personasForMatching,
    topN
  )

  if (selected.length === 0) {
    console.log(`[news-reaction] 기사 ${article.id}: 반응할 페르소나 없음 (threshold 미달)`)
    return []
  }

  // 이미 반응한 페르소나 필터링
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
    console.log(`[news-reaction] 기사 "${article.title}" → ${reactions.length}명 반응 예약`)
  }

  return reactions
}

// ── 토픽 포맷터 ─────────────────────────────────────────────────

/**
 * 뉴스 기사를 포스트 생성 topic 문자열로 변환.
 *
 * topic-selector.ts의 getTopicFromTrigger()에서 호출.
 * PostGenerationInput.topic으로 content-generator에 주입됨.
 */
export function formatNewsArticleTopic(title: string, summary: string): string {
  return `[뉴스 이슈] ${title}\n\n${summary}`
}
