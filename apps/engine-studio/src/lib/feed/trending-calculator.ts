/**
 * 트렌딩 점수 계산
 *
 * 좋아요, 댓글, 리포스트 수와 시간 가중치를 기반으로
 * 게시물의 트렌딩 점수를 계산
 */

export interface PostEngagement {
  id: string
  likesCount: number
  commentsCount: number
  repostsCount: number
  createdAt: Date
  [key: string]: unknown
}

export interface TrendingScore {
  postId: string
  score: number
  breakdown: {
    engagementScore: number
    timeDecay: number
    velocityBonus: number
  }
}

/**
 * 트렌딩 점수 계산에 사용되는 가중치
 */
export const TRENDING_WEIGHTS = {
  like: 1,
  comment: 3, // 댓글은 더 높은 참여도
  repost: 5, // 리포스트는 가장 높은 참여도
  timeDecayHalfLife: 6, // 6시간마다 점수 반감
  velocityWindow: 1, // 1시간 내 활동 속도 보너스
}

/**
 * 시간 경과에 따른 감쇠 계수 계산
 * 반감기 기반 지수 감쇠 (half-life decay)
 *
 * @param createdAt - 게시물 생성 시간
 * @param halfLifeHours - 반감기 (시간 단위)
 * @returns 0~1 사이의 감쇠 계수
 */
export function calculateTimeDecay(
  createdAt: Date,
  halfLifeHours: number = TRENDING_WEIGHTS.timeDecayHalfLife
): number {
  const now = new Date()
  const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

  // 지수 감쇠: decay = 0.5^(age/halfLife)
  return Math.pow(0.5, ageInHours / halfLifeHours)
}

/**
 * 참여도 점수 계산
 */
export function calculateEngagementScore(post: PostEngagement): number {
  return (
    post.likesCount * TRENDING_WEIGHTS.like +
    post.commentsCount * TRENDING_WEIGHTS.comment +
    post.repostsCount * TRENDING_WEIGHTS.repost
  )
}

/**
 * 활동 속도 보너스 계산
 * 최근 1시간 내 활동량이 많으면 추가 점수
 *
 * @param recentEngagements - 최근 시간 내 참여 수
 * @param totalEngagements - 전체 참여 수
 */
export function calculateVelocityBonus(
  recentEngagements: number,
  totalEngagements: number
): number {
  if (totalEngagements === 0) return 0

  const ratio = recentEngagements / totalEngagements
  // 최근 활동 비율이 높으면 최대 2배 보너스
  return 1 + ratio
}

/**
 * 단일 게시물의 트렌딩 점수 계산
 */
export function calculateTrendingScore(
  post: PostEngagement,
  options: {
    recentEngagements?: number
  } = {}
): TrendingScore {
  const engagementScore = calculateEngagementScore(post)
  const timeDecay = calculateTimeDecay(new Date(post.createdAt))
  const totalEngagements = post.likesCount + post.commentsCount + post.repostsCount
  const velocityBonus = calculateVelocityBonus(options.recentEngagements ?? 0, totalEngagements)

  const score = engagementScore * timeDecay * velocityBonus

  return {
    postId: post.id,
    score,
    breakdown: {
      engagementScore,
      timeDecay,
      velocityBonus,
    },
  }
}

/**
 * 게시물 목록의 트렌딩 점수 계산 및 정렬
 */
export function rankByTrending(posts: PostEngagement[]): TrendingScore[] {
  const scores = posts.map((post) => calculateTrendingScore(post))

  // 점수 높은 순으로 정렬
  scores.sort((a, b) => b.score - a.score)

  return scores
}

/**
 * 핫 토픽 추출
 * 게시물 내용에서 자주 언급되는 키워드/해시태그 분석
 */
export interface HotTopic {
  topic: string
  count: number
  recentPosts: string[]
  trendScore: number
}

export function extractHotTopics(
  posts: Array<{ id: string; content: string; createdAt: Date }>
): HotTopic[] {
  const topicMap = new Map<string, { count: number; posts: string[]; dates: Date[] }>()

  // 해시태그 및 키워드 추출
  const hashtagRegex = /#[\w가-힣]+/g

  for (const post of posts) {
    const hashtags = post.content.match(hashtagRegex) ?? []

    for (const tag of hashtags) {
      const normalizedTag = tag.toLowerCase()

      if (!topicMap.has(normalizedTag)) {
        topicMap.set(normalizedTag, { count: 0, posts: [], dates: [] })
      }

      const topic = topicMap.get(normalizedTag)!
      topic.count++
      topic.posts.push(post.id)
      topic.dates.push(new Date(post.createdAt))
    }
  }

  // HotTopic 배열로 변환
  const hotTopics: HotTopic[] = []

  for (const [topic, data] of topicMap.entries()) {
    // 최근 게시물 시간을 기반으로 트렌드 점수 계산
    const avgDecay =
      data.dates.reduce((sum, date) => {
        return sum + calculateTimeDecay(date, 12) // 12시간 반감기
      }, 0) / data.dates.length

    hotTopics.push({
      topic,
      count: data.count,
      recentPosts: data.posts.slice(0, 5),
      trendScore: data.count * avgDecay,
    })
  }

  // 트렌드 점수로 정렬
  hotTopics.sort((a, b) => b.trendScore - a.trendScore)

  return hotTopics.slice(0, 20) // 상위 20개
}

/**
 * 활발한 토론 식별
 * 댓글이 많고 최근 활동이 활발한 게시물
 */
export interface ActiveDebate {
  postId: string
  commentsCount: number
  uniqueParticipants: number
  lastActivityAt: Date
  debateScore: number
}

export function identifyActiveDebates(
  posts: Array<{
    id: string
    commentsCount: number
    createdAt: Date
    comments?: Array<{ authorId: string; createdAt: Date }>
  }>
): ActiveDebate[] {
  const debates: ActiveDebate[] = []

  for (const post of posts) {
    // 댓글이 5개 이상인 게시물만 토론으로 간주
    if (post.commentsCount < 5) continue

    const comments = post.comments ?? []
    const uniqueParticipants = new Set(comments.map((c) => c.authorId)).size
    const lastActivityAt =
      comments.length > 0
        ? new Date(Math.max(...comments.map((c) => new Date(c.createdAt).getTime())))
        : new Date(post.createdAt)

    // 토론 점수: 댓글 수 * 참여자 다양성 * 시간 가중치
    const timeWeight = calculateTimeDecay(lastActivityAt, 3) // 3시간 반감기
    const diversityBonus = uniqueParticipants / Math.max(post.commentsCount, 1)
    const debateScore = post.commentsCount * (1 + diversityBonus) * timeWeight

    debates.push({
      postId: post.id,
      commentsCount: post.commentsCount,
      uniqueParticipants,
      lastActivityAt,
      debateScore,
    })
  }

  // 토론 점수로 정렬
  debates.sort((a, b) => b.debateScore - a.debateScore)

  return debates.slice(0, 10) // 상위 10개
}
