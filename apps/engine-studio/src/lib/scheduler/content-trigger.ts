/**
 * 콘텐츠 출시 트리거
 *
 * 새로운 콘텐츠(영화, 드라마 등)가 출시되면 관련 페르소나들이 자동으로 반응합니다.
 */

import type { ActivityTraits } from "./activity-scheduler"
import { calculateContentReactionDelay } from "./activity-scheduler"
import { generateAndPostAutonomously, type PersonaInfo } from "./posting-engine"

/**
 * 콘텐츠 정보
 */
export interface ContentInfo {
  id: string
  title: string
  type: "MOVIE" | "DRAMA" | "SHOW" | "DOCUMENTARY" | "ANIME" | "OTHER"
  genres: string[]
  releaseDate: Date
  description?: string
  director?: string
  cast?: string[]
  ratings?: {
    source: string
    score: number
  }[]
}

/**
 * 스케줄된 반응
 */
export interface ScheduledReaction {
  personaId: string
  contentId: string
  scheduledAt: Date
  postType: string
  priority: "HIGH" | "MEDIUM" | "LOW"
}

/**
 * 콘텐츠 관련성 점수 계산
 *
 * 페르소나의 관심 장르와 콘텐츠 장르의 매칭 점수
 */
export function calculateContentRelevance(persona: PersonaInfo, content: ContentInfo): number {
  let relevanceScore = 0

  // 장르 매칭
  const matchedGenres = content.genres.filter((genre) => persona.favoriteGenres.includes(genre))
  relevanceScore += matchedGenres.length * 0.2

  // 비선호 장르 감점
  const dislikedMatches = content.genres.filter((genre) => persona.dislikedGenres.includes(genre))
  relevanceScore -= dislikedMatches.length * 0.3

  // 전문 분야 매칭
  const expertiseMatch = persona.expertise.some(
    (exp) =>
      content.genres.some((g) => g.toLowerCase().includes(exp.toLowerCase())) ||
      content.title.toLowerCase().includes(exp.toLowerCase())
  )
  if (expertiseMatch) {
    relevanceScore += 0.3
  }

  // 점수 범위 제한 (0 ~ 1)
  return Math.max(0, Math.min(1, relevanceScore))
}

/**
 * 콘텐츠 출시에 대한 반응 결정
 *
 * 관련성이 높은 페르소나만 반응
 */
export function shouldReactToContent(persona: PersonaInfo, content: ContentInfo): boolean {
  const relevance = calculateContentRelevance(persona, content)

  // 관련성 0.3 이상이면 반응
  if (relevance >= 0.3) {
    return true
  }

  // 관련성이 낮아도 주도적인 성격이면 반응 확률 있음
  if (persona.activityTraits.initiative > 0.7 && Math.random() < 0.2) {
    return true
  }

  return false
}

/**
 * 반응 우선순위 결정
 */
export function determineReactionPriority(
  persona: PersonaInfo,
  content: ContentInfo
): "HIGH" | "MEDIUM" | "LOW" {
  const relevance = calculateContentRelevance(persona, content)
  const { initiative, sociability } = persona.activityTraits

  // 관련성 높음 + 주도적 → HIGH
  if (relevance >= 0.6 && initiative > 0.6) {
    return "HIGH"
  }

  // 관련성 중간 또는 사교적 → MEDIUM
  if (relevance >= 0.4 || sociability > 0.7) {
    return "MEDIUM"
  }

  return "LOW"
}

/**
 * 콘텐츠 출시 시 반응 스케줄링
 *
 * 관련 페르소나들의 반응 시간을 성격에 따라 분산
 */
export async function onContentRelease(
  content: ContentInfo,
  personas: PersonaInfo[]
): Promise<ScheduledReaction[]> {
  const scheduledReactions: ScheduledReaction[] = []
  const now = new Date()

  for (const persona of personas) {
    // 반응 여부 결정
    if (!shouldReactToContent(persona, content)) {
      continue
    }

    // 성격 기반 딜레이 계산
    const delayMs = calculateContentReactionDelay(persona.activityTraits)
    const scheduledAt = new Date(now.getTime() + delayMs)

    // 우선순위 결정
    const priority = determineReactionPriority(persona, content)

    // 포스트 타입 결정
    const postType = selectPostTypeForContent(persona, content)

    scheduledReactions.push({
      personaId: persona.id,
      contentId: content.id,
      scheduledAt,
      postType,
      priority,
    })
  }

  // 우선순위별 정렬 (HIGH → MEDIUM → LOW, 시간순)
  return scheduledReactions.sort((a, b) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return a.scheduledAt.getTime() - b.scheduledAt.getTime()
  })
}

/**
 * 콘텐츠에 대한 포스트 타입 선택
 */
function selectPostTypeForContent(persona: PersonaInfo, content: ContentInfo): string {
  const { initiative, expressiveness } = persona.activityTraits

  // 주도적 성향 → 리뷰
  if (initiative > 0.7) {
    return "REVIEW"
  }

  // 표현력 높음 → 큐레이션 또는 스레드
  if (expressiveness > 0.7) {
    return Math.random() > 0.5 ? "CURATION" : "THREAD"
  }

  // 기본: 추천 또는 일상 생각
  return Math.random() > 0.5 ? "RECOMMENDATION" : "THOUGHT"
}

/**
 * 스케줄된 콘텐츠 반응 실행
 */
export async function executeScheduledContentReaction(
  persona: PersonaInfo,
  content: ContentInfo
): Promise<{
  type: string
  content: string
  hashtags: string[]
  contentId: string
}> {
  const result = await generateAndPostAutonomously(persona, {
    trigger: "CONTENT_RELEASE",
    topic: content.title,
    contentId: content.id,
  })

  // 콘텐츠 관련 해시태그 추가
  const contentHashtags = generateContentHashtags(content)

  return {
    type: result.type,
    content: result.content,
    hashtags: [...result.hashtags, ...contentHashtags],
    contentId: content.id,
  }
}

/**
 * 콘텐츠 관련 해시태그 생성
 */
function generateContentHashtags(content: ContentInfo): string[] {
  const hashtags: string[] = []

  // 제목에서 해시태그 생성
  const titleWords = content.title.replace(/[^가-힣a-zA-Z0-9\s]/g, "").split(/\s+/)
  if (titleWords.length > 0) {
    hashtags.push(titleWords[0])
  }

  // 장르 해시태그
  if (content.genres.length > 0) {
    hashtags.push(content.genres[0])
  }

  // 타입별 해시태그
  const typeHashtags: Record<ContentInfo["type"], string> = {
    MOVIE: "영화",
    DRAMA: "드라마",
    SHOW: "예능",
    DOCUMENTARY: "다큐",
    ANIME: "애니메이션",
    OTHER: "콘텐츠",
  }
  hashtags.push(typeHashtags[content.type])

  // 신작 해시태그
  const daysSinceRelease = Math.floor(
    (Date.now() - content.releaseDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceRelease <= 7) {
    hashtags.push("신작")
  }

  return hashtags
}

/**
 * 기념일 콘텐츠 반응 (개봉 N주년 등)
 */
export async function checkAndReactToAnniversary(
  persona: PersonaInfo,
  content: ContentInfo
): Promise<ScheduledReaction | null> {
  const now = new Date()
  const releaseDate = new Date(content.releaseDate)

  // 년도 차이 계산
  const yearsSinceRelease = now.getFullYear() - releaseDate.getFullYear()

  // 같은 월/일인지 확인 (기념일)
  const isAnniversaryDay =
    now.getMonth() === releaseDate.getMonth() && now.getDate() === releaseDate.getDate()

  if (!isAnniversaryDay || yearsSinceRelease <= 0) {
    return null
  }

  // 5주년, 10주년 등 특별한 기념일에만 반응
  const isSpecialAnniversary = yearsSinceRelease % 5 === 0 || yearsSinceRelease === 1

  if (!isSpecialAnniversary) {
    return null
  }

  // 관련성 확인
  if (!shouldReactToContent(persona, content)) {
    return null
  }

  return {
    personaId: persona.id,
    contentId: content.id,
    scheduledAt: now,
    postType: "ANNIVERSARY",
    priority: yearsSinceRelease % 10 === 0 ? "HIGH" : "MEDIUM",
  }
}
