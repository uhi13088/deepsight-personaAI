/**
 * 트렌딩 토픽 반응 모듈
 *
 * 실시간 트렌딩 토픽을 감지하고 관련 페르소나들이 자동으로 반응합니다.
 */

import type { ActivityTraits } from "./activity-scheduler"
import { generateAndPostAutonomously, type PersonaInfo } from "./posting-engine"

/**
 * 트렌딩 토픽
 */
export interface TrendingTopic {
  id: string
  keyword: string
  hashtags: string[]
  category: "MOVIE" | "DRAMA" | "CELEBRITY" | "EVENT" | "GENERAL"
  score: number // 트렌딩 점수 (높을수록 핫함)
  postCount: number // 관련 포스트 수
  velocity: number // 상승 속도
  detectedAt: Date
}

/**
 * 트렌딩 반응 결과
 */
export interface TrendingReaction {
  personaId: string
  topicId: string
  postType: string
  content: string
  hashtags: string[]
  createdAt: Date
}

/**
 * 토픽 관련성 판단
 *
 * 페르소나의 관심사와 트렌딩 토픽의 매칭 여부
 */
export function isTopicRelevant(persona: PersonaInfo, topic: TrendingTopic): boolean {
  // 1. 키워드가 관심 장르에 포함되는지
  const keywordLower = topic.keyword.toLowerCase()
  const genreMatch = persona.favoriteGenres.some((genre) =>
    keywordLower.includes(genre.toLowerCase())
  )

  if (genreMatch) return true

  // 2. 전문 분야와 매칭되는지
  const expertiseMatch = persona.expertise.some((exp) => keywordLower.includes(exp.toLowerCase()))

  if (expertiseMatch) return true

  // 3. 해시태그 매칭
  const hashtagMatch = topic.hashtags.some(
    (tag) =>
      persona.favoriteGenres.some((g) => tag.toLowerCase().includes(g.toLowerCase())) ||
      persona.expertise.some((e) => tag.toLowerCase().includes(e.toLowerCase()))
  )

  if (hashtagMatch) return true

  // 4. 카테고리 매칭 (영화/드라마 페르소나는 MOVIE, DRAMA에 반응)
  if (topic.category === "MOVIE" || topic.category === "DRAMA" || topic.category === "CELEBRITY") {
    // 영화/드라마 관련 장르가 있으면 반응
    const movieGenres = [
      "영화",
      "드라마",
      "시리즈",
      "액션",
      "로맨스",
      "스릴러",
      "SF",
      "판타지",
      "애니메이션",
    ]
    return persona.favoriteGenres.some((g) =>
      movieGenres.some((mg) => g.toLowerCase().includes(mg.toLowerCase()))
    )
  }

  return false
}

/**
 * 트렌딩 토픽에 반응할지 결정
 *
 * 관련성 + 성격 기반 확률
 */
export function shouldReactToTrending(persona: PersonaInfo, topic: TrendingTopic): boolean {
  // 관련성 없으면 반응 안 함
  if (!isTopicRelevant(persona, topic)) {
    return false
  }

  const { sociability, initiative } = persona.activityTraits

  // 트렌딩 점수가 높을수록 반응 확률 증가
  const trendingFactor = Math.min(topic.score / 100, 1)

  // 사교성과 주도성이 높을수록 트렌딩에 빠르게 반응
  const personalityFactor = (sociability + initiative) / 2

  // 최종 반응 확률
  const reactionProbability = trendingFactor * personalityFactor

  return Math.random() < reactionProbability
}

/**
 * 트렌딩 토픽에 대한 포스트 타입 선택
 */
function selectPostTypeForTrending(persona: PersonaInfo, topic: TrendingTopic): string {
  const { initiative, expressiveness } = persona.activityTraits

  // 논쟁적인 토픽 + 주도적 성향 → 토론
  if (initiative > 0.7 && topic.postCount > 50) {
    return "DEBATE"
  }

  // 표현력 높음 → 스레드
  if (expressiveness > 0.7) {
    return "THREAD"
  }

  // 이벤트 → 반응
  if (topic.category === "EVENT") {
    return "REACTION"
  }

  // 기본: 일상 생각
  return "THOUGHT"
}

/**
 * 트렌딩 토픽에 반응
 */
export async function reactToTrendingTopic(
  persona: PersonaInfo,
  topic: TrendingTopic
): Promise<TrendingReaction | null> {
  // 반응 여부 결정
  if (!shouldReactToTrending(persona, topic)) {
    return null
  }

  // 포스트 생성
  const result = await generateAndPostAutonomously(persona, {
    trigger: "TRENDING",
    topic: topic.keyword,
  })

  // 트렌딩 해시태그 추가
  const combinedHashtags = [...new Set([...result.hashtags, ...topic.hashtags])]

  return {
    personaId: persona.id,
    topicId: topic.id,
    postType: result.type,
    content: result.content,
    hashtags: combinedHashtags,
    createdAt: new Date(),
  }
}

/**
 * 여러 트렌딩 토픽에 대해 반응
 *
 * 페르소나당 하나의 토픽에만 반응 (스팸 방지)
 */
export async function reactToTrendingTopics(
  personas: PersonaInfo[],
  topics: TrendingTopic[]
): Promise<TrendingReaction[]> {
  const reactions: TrendingReaction[] = []

  // 토픽을 점수순으로 정렬
  const sortedTopics = [...topics].sort((a, b) => b.score - a.score)

  for (const persona of personas) {
    // 각 페르소나는 가장 관련성 높은 하나의 토픽에만 반응
    for (const topic of sortedTopics) {
      if (isTopicRelevant(persona, topic)) {
        const reaction = await reactToTrendingTopic(persona, topic)
        if (reaction) {
          reactions.push(reaction)
          break // 하나만 반응
        }
      }
    }
  }

  return reactions
}

/**
 * 트렌딩 토픽 감지 (Mock)
 *
 * 실제 구현에서는 외부 API나 내부 분석을 통해 트렌딩 토픽을 감지합니다.
 * 현재는 최근 포스트의 해시태그를 분석하여 트렌딩을 추출합니다.
 */
export function detectTrendingTopics(
  recentPosts: { hashtags: string[]; likeCount: number; commentCount: number; createdAt: Date }[],
  options: { minPosts?: number; timeWindowHours?: number } = {}
): TrendingTopic[] {
  const { minPosts = 5, timeWindowHours = 24 } = options

  // 시간 필터
  const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000)
  const filteredPosts = recentPosts.filter((post) => new Date(post.createdAt) >= cutoffTime)

  // 해시태그별 집계
  const hashtagStats = new Map<
    string,
    { count: number; likes: number; comments: number; recentPosts: Date[] }
  >()

  for (const post of filteredPosts) {
    for (const tag of post.hashtags) {
      const normalizedTag = tag.toLowerCase()
      const existing = hashtagStats.get(normalizedTag) || {
        count: 0,
        likes: 0,
        comments: 0,
        recentPosts: [],
      }

      existing.count++
      existing.likes += post.likeCount
      existing.comments += post.commentCount
      existing.recentPosts.push(new Date(post.createdAt))

      hashtagStats.set(normalizedTag, existing)
    }
  }

  // 트렌딩 토픽 생성
  const topics: TrendingTopic[] = []

  for (const [tag, stats] of hashtagStats) {
    if (stats.count < minPosts) continue

    // 상승 속도 계산 (최근 1시간 대비 이전 시간)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentCount = stats.recentPosts.filter((d) => d >= oneHourAgo).length
    const olderCount = stats.count - recentCount
    const velocity = olderCount > 0 ? recentCount / olderCount : recentCount

    // 트렌딩 점수 계산
    const score = stats.count * 10 + stats.likes * 2 + stats.comments * 3 + velocity * 20

    // 카테고리 추론
    const category = inferCategory(tag)

    topics.push({
      id: `trending_${tag}`,
      keyword: tag,
      hashtags: [tag],
      category,
      score,
      postCount: stats.count,
      velocity,
      detectedAt: new Date(),
    })
  }

  // 점수순 정렬 후 상위 10개
  return topics.sort((a, b) => b.score - a.score).slice(0, 10)
}

/**
 * 해시태그에서 카테고리 추론
 */
function inferCategory(hashtag: string): TrendingTopic["category"] {
  const tag = hashtag.toLowerCase()

  // 영화 관련 키워드
  const movieKeywords = ["영화", "movie", "film", "개봉", "리뷰", "시사회", "극장"]
  if (movieKeywords.some((k) => tag.includes(k))) {
    return "MOVIE"
  }

  // 드라마 관련 키워드
  const dramaKeywords = ["드라마", "drama", "시리즈", "넷플릭스", "웨이브", "티빙"]
  if (dramaKeywords.some((k) => tag.includes(k))) {
    return "DRAMA"
  }

  // 셀럽 관련 키워드
  const celebKeywords = ["배우", "감독", "주연", "출연"]
  if (celebKeywords.some((k) => tag.includes(k))) {
    return "CELEBRITY"
  }

  // 이벤트 관련 키워드
  const eventKeywords = ["시상식", "페스티벌", "기념일", "축제", "award"]
  if (eventKeywords.some((k) => tag.includes(k))) {
    return "EVENT"
  }

  return "GENERAL"
}

/**
 * 트렌딩 토픽 중요도 평가
 */
export function evaluateTopicImportance(topic: TrendingTopic): "HIGH" | "MEDIUM" | "LOW" {
  // 점수 기준
  if (topic.score >= 500) return "HIGH"
  if (topic.score >= 200) return "MEDIUM"
  return "LOW"
}

/**
 * 페르소나별 트렌딩 반응 딜레이 계산
 *
 * 주도적인 페르소나는 빨리 반응, 내성적인 페르소나는 천천히 반응
 */
export function calculateTrendingReactionDelay(
  traits: ActivityTraits,
  topicImportance: "HIGH" | "MEDIUM" | "LOW"
): number {
  const { sociability, initiative } = traits

  // 기본 딜레이 (분)
  const baseDelays = { HIGH: 5, MEDIUM: 30, LOW: 60 }
  let delayMinutes = baseDelays[topicImportance]

  // 성격 보정 (주도적일수록 빨리)
  delayMinutes *= 2 - initiative

  // 사교적일수록 빨리
  delayMinutes *= 2 - sociability

  // 랜덤 요소 (±20%)
  delayMinutes *= 0.8 + Math.random() * 0.4

  // 최소 1분, 최대 180분
  return Math.max(1, Math.min(180, delayMinutes)) * 60 * 1000 // 밀리초로 변환
}
