/**
 * SNS 데이터 분석 및 6D 벡터 변환 모듈
 *
 * 각 플랫폼별 데이터를 분석하여 6D 벡터와 확장 데이터를 추출합니다.
 */

import type { SNSPlatform } from "@prisma/client"
import type { Vector6D } from "./vector-merger"

// ============================================
// 타입 정의
// ============================================

export interface SNSExtendedData {
  platform: SNSPlatform
  extractedAt: Date

  // 인구통계 (추정)
  demographics?: {
    estimatedAge?: number
    country?: string
    region?: string
  }

  // 구체적 취향
  specificTastes: {
    favoriteDirectors: string[]
    favoriteActors: string[]
    favoriteGenres: string[]
    favoriteMovies: string[]
    dislikedGenres?: string[]
  }

  // 활동 패턴
  activityPattern: {
    peakHours: number[]
    averageSessionLength: number // 분
    frequency: "DAILY" | "WEEKLY" | "OCCASIONAL"
    contentConsumptionRate: number // 0.0~1.0
  }

  // 표현 스타일
  expressionStyle: {
    emojiUsage: "NONE" | "RARE" | "MODERATE" | "FREQUENT"
    averagePostLength: "SHORT" | "MEDIUM" | "LONG"
    formality: number // 0.0 (반말) ~ 1.0 (존댓말)
    sentimentTone: "POSITIVE" | "NEUTRAL" | "CRITICAL"
    hashtagUsage: boolean
  }

  // 소셜 성향
  socialBehavior: {
    engagementLevel: "LURKER" | "CASUAL" | "ACTIVE" | "CREATOR"
    interactionStyle: "LIKES_ONLY" | "COMMENTS" | "SHARES" | "CREATES"
    communityParticipation: string[]
  }

  // 관심사 키워드
  interests: {
    hashtags: string[]
    followedAccounts: {
      category: string
      names: string[]
    }[]
    mentionedKeywords: string[]
  }
}

export interface NetflixData {
  viewingHistory: ViewingHistoryItem[]
  ratings: RatingItem[]
  myList: string[]
  profiles: { name: string; isKids: boolean }[]
}

export interface ViewingHistoryItem {
  title: string
  date: Date
  duration: number // 분
  completed: boolean
  genres: string[]
  type: "MOVIE" | "SERIES" | "DOCUMENTARY"
  director?: string
  cast?: string[]
}

export interface RatingItem {
  title: string
  score: number // 1-5
  genres: string[]
}

export interface YouTubeData {
  watchHistory: YouTubeWatchItem[]
  likedVideos: YouTubeLikedItem[]
  subscriptions: YouTubeSubscription[]
  searchHistory: string[]
}

export interface YouTubeWatchItem {
  title: string
  channelName: string
  watchedAt: Date
  duration: number
  watchedDuration: number
  category: string
}

export interface YouTubeLikedItem {
  title: string
  channelName: string
  likedAt: Date
  category: string
}

export interface YouTubeSubscription {
  channelName: string
  category: string
  subscribedAt: Date
}

export interface InstagramData {
  posts: InstagramPost[]
  following: InstagramAccount[]
  followers: number
  activity: InstagramActivity
}

export interface InstagramPost {
  caption: string
  hashtags: string[]
  location?: string
  postedAt: Date
  likeCount: number
  commentCount: number
}

export interface InstagramAccount {
  username: string
  category: string
  isVerified: boolean
}

export interface InstagramActivity {
  likesGiven: number
  commentsGiven: number
  storiesViewed: number
  reelsWatched: number
}

export interface SNSAnalysisResult {
  vector: Partial<Vector6D>
  extendedData: SNSExtendedData
  confidence: number
}

// ============================================
// 메인 분석 함수
// ============================================

/**
 * SNS 플랫폼별 데이터 분석 진입점
 */
export async function analyzeSNSData(
  platform: SNSPlatform,
  rawData: unknown
): Promise<SNSAnalysisResult> {
  switch (platform) {
    case "NETFLIX":
      return analyzeNetflixData(rawData as NetflixData)
    case "YOUTUBE":
      return analyzeYouTubeData(rawData as YouTubeData)
    case "INSTAGRAM":
      return analyzeInstagramData(rawData as InstagramData)
    default:
      return createDefaultResult(platform)
  }
}

// ============================================
// Netflix 분석
// ============================================

function analyzeNetflixData(data: NetflixData): SNSAnalysisResult {
  const viewingHistory = data.viewingHistory || []
  const ratings = data.ratings || []

  // 장르 분석
  const genreCounts: Record<string, number> = {}
  for (const item of viewingHistory) {
    for (const genre of item.genres) {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1
    }
  }

  const sortedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre)

  // 감독 분석
  const directorCounts: Record<string, number> = {}
  for (const item of viewingHistory) {
    if (item.director) {
      directorCounts[item.director] = (directorCounts[item.director] || 0) + 1
    }
  }

  const favoriteDirectors = Object.entries(directorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name)

  // 배우 분석
  const actorCounts: Record<string, number> = {}
  for (const item of viewingHistory) {
    for (const actor of item.cast || []) {
      actorCounts[actor] = (actorCounts[actor] || 0) + 1
    }
  }

  const favoriteActors = Object.entries(actorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name)

  // 시청 패턴 분석
  const hourCounts: Record<number, number> = {}
  for (const item of viewingHistory) {
    const hour = new Date(item.date).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  }

  const peakHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => parseInt(hour))

  // 평균 평점 기반 성향 분석
  const avgRating =
    ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : 3

  // 6D 벡터 추론
  const vector: Partial<Vector6D> = {
    // depth: 다큐멘터리/예술영화 비중이 높으면 심층적
    depth: calculateDepthFromGenres(sortedGenres),
    // lens: 드라마/로맨스 비중 높으면 감성적
    lens: calculateLensFromGenres(sortedGenres),
    // stance: 평점이 낮은 평가가 많으면 비판적
    stance: avgRating < 3.5 ? 0.7 : avgRating > 4 ? 0.3 : 0.5,
    // taste: 실험적 장르 비중
    taste: calculateTasteFromGenres(sortedGenres),
    // purpose: 다큐/교양 비중이 높으면 의미추구
    purpose: calculatePurposeFromGenres(sortedGenres),
  }

  // 콘텐츠 소비 속도 (완주율)
  const completionRate =
    viewingHistory.length > 0
      ? viewingHistory.filter((v) => v.completed).length / viewingHistory.length
      : 0.5

  const extendedData: SNSExtendedData = {
    platform: "NETFLIX",
    extractedAt: new Date(),
    specificTastes: {
      favoriteDirectors,
      favoriteActors,
      favoriteGenres: sortedGenres.slice(0, 5),
      favoriteMovies: ratings.filter((r) => r.score >= 4.5).map((r) => r.title),
      dislikedGenres: analyzeDislikedGenres(ratings),
    },
    activityPattern: {
      peakHours,
      averageSessionLength: calculateAvgSession(viewingHistory),
      frequency: determineFrequency(viewingHistory),
      contentConsumptionRate: completionRate,
    },
    expressionStyle: {
      emojiUsage: "NONE",
      averagePostLength: "SHORT",
      formality: 0.5,
      sentimentTone: avgRating > 3.5 ? "POSITIVE" : avgRating < 2.5 ? "CRITICAL" : "NEUTRAL",
      hashtagUsage: false,
    },
    socialBehavior: {
      engagementLevel: ratings.length > 50 ? "ACTIVE" : ratings.length > 10 ? "CASUAL" : "LURKER",
      interactionStyle: "LIKES_ONLY",
      communityParticipation: [],
    },
    interests: {
      hashtags: [],
      followedAccounts: [],
      mentionedKeywords: extractKeywordsFromHistory(viewingHistory),
    },
  }

  return {
    vector,
    extendedData,
    confidence: calculateConfidence(viewingHistory.length, ratings.length),
  }
}

// ============================================
// YouTube 분석
// ============================================

function analyzeYouTubeData(data: YouTubeData): SNSAnalysisResult {
  const watchHistory = data.watchHistory || []
  const likedVideos = data.likedVideos || []
  const subscriptions = data.subscriptions || []

  // 카테고리 분석
  const categoryCounts: Record<string, number> = {}
  for (const item of watchHistory) {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
  }

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat)

  // 채널 분석
  const channelCounts: Record<string, number> = {}
  for (const item of watchHistory) {
    channelCounts[item.channelName] = (channelCounts[item.channelName] || 0) + 1
  }

  const favoriteChannels = Object.entries(channelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name)

  // 시청 시간대 분석
  const hourCounts: Record<number, number> = {}
  for (const item of watchHistory) {
    const hour = new Date(item.watchedAt).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  }

  const peakHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => parseInt(hour))

  // 시청 완료율
  const avgWatchRatio =
    watchHistory.length > 0
      ? watchHistory.reduce((sum, w) => sum + w.watchedDuration / w.duration, 0) /
        watchHistory.length
      : 0.5

  // 6D 벡터 추론
  const vector: Partial<Vector6D> = {
    depth: calculateDepthFromYouTubeCategories(sortedCategories),
    lens: calculateLensFromYouTubeCategories(sortedCategories),
    stance: likedVideos.length / Math.max(watchHistory.length, 1) > 0.3 ? 0.3 : 0.5,
    taste: calculateTasteFromYouTubeCategories(sortedCategories),
    purpose: calculatePurposeFromYouTubeCategories(sortedCategories),
  }

  const extendedData: SNSExtendedData = {
    platform: "YOUTUBE",
    extractedAt: new Date(),
    specificTastes: {
      favoriteDirectors: [],
      favoriteActors: [],
      favoriteGenres: sortedCategories.slice(0, 5),
      favoriteMovies: [],
    },
    activityPattern: {
      peakHours,
      averageSessionLength: calculateYouTubeAvgSession(watchHistory),
      frequency: determineYouTubeFrequency(watchHistory),
      contentConsumptionRate: avgWatchRatio,
    },
    expressionStyle: {
      emojiUsage: "NONE",
      averagePostLength: "SHORT",
      formality: 0.5,
      sentimentTone: "NEUTRAL",
      hashtagUsage: false,
    },
    socialBehavior: {
      engagementLevel:
        likedVideos.length > 100 ? "ACTIVE" : likedVideos.length > 20 ? "CASUAL" : "LURKER",
      interactionStyle: likedVideos.length > 0 ? "LIKES_ONLY" : "LIKES_ONLY",
      communityParticipation: [],
    },
    interests: {
      hashtags: [],
      followedAccounts: subscriptions.slice(0, 20).map((s) => ({
        category: s.category,
        names: [s.channelName],
      })),
      mentionedKeywords: data.searchHistory?.slice(0, 20) || [],
    },
  }

  return {
    vector,
    extendedData,
    confidence: calculateConfidence(watchHistory.length, likedVideos.length),
  }
}

// ============================================
// Instagram 분석
// ============================================

function analyzeInstagramData(data: InstagramData): SNSAnalysisResult {
  const posts = data.posts || []
  const following = data.following || []

  // 해시태그 분석
  const hashtagCounts: Record<string, number> = {}
  for (const post of posts) {
    for (const tag of post.hashtags) {
      hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1
    }
  }

  const topHashtags = Object.entries(hashtagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag]) => tag)

  // 팔로잉 카테고리 분석
  const categorizedFollowing: Record<string, string[]> = {}
  for (const account of following) {
    if (!categorizedFollowing[account.category]) {
      categorizedFollowing[account.category] = []
    }
    categorizedFollowing[account.category].push(account.username)
  }

  // 포스팅 시간대 분석
  const hourCounts: Record<number, number> = {}
  for (const post of posts) {
    const hour = new Date(post.postedAt).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  }

  const peakHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => parseInt(hour))

  // 캡션 분석
  const avgCaptionLength =
    posts.length > 0 ? posts.reduce((sum, p) => sum + p.caption.length, 0) / posts.length : 0

  const emojiPattern = /[\u{1F300}-\u{1F9FF}]/gu
  const emojiCounts = posts.map((p) => (p.caption.match(emojiPattern) || []).length)
  const avgEmojiCount =
    emojiCounts.length > 0 ? emojiCounts.reduce((a, b) => a + b, 0) / emojiCounts.length : 0

  // 6D 벡터 추론
  const vector: Partial<Vector6D> = {
    lens: avgEmojiCount > 3 ? 0.2 : avgEmojiCount > 1 ? 0.4 : 0.6,
    expressiveness: avgCaptionLength > 200 ? 0.8 : avgCaptionLength > 50 ? 0.5 : 0.3,
    stance: 0.5, // Instagram에서는 판단하기 어려움
    taste: topHashtags.some((t) => t.includes("indie") || t.includes("art")) ? 0.7 : 0.4,
  } as Partial<Vector6D>

  const extendedData: SNSExtendedData = {
    platform: "INSTAGRAM",
    extractedAt: new Date(),
    demographics: {
      region: extractLocationFromPosts(posts),
    },
    specificTastes: {
      favoriteDirectors: extractFromFollowing(following, "DIRECTOR"),
      favoriteActors: extractFromFollowing(following, "ACTOR"),
      favoriteGenres: extractGenresFromHashtags(topHashtags),
      favoriteMovies: [],
    },
    activityPattern: {
      peakHours,
      averageSessionLength: 15,
      frequency: posts.length > 30 ? "DAILY" : posts.length > 10 ? "WEEKLY" : "OCCASIONAL",
      contentConsumptionRate: 0.5,
    },
    expressionStyle: {
      emojiUsage:
        avgEmojiCount > 5
          ? "FREQUENT"
          : avgEmojiCount > 2
            ? "MODERATE"
            : avgEmojiCount > 0
              ? "RARE"
              : "NONE",
      averagePostLength:
        avgCaptionLength > 200 ? "LONG" : avgCaptionLength > 50 ? "MEDIUM" : "SHORT",
      formality: 0.4, // Instagram은 보통 캐주얼
      sentimentTone: "POSITIVE",
      hashtagUsage: topHashtags.length > 0,
    },
    socialBehavior: {
      engagementLevel: determineInstagramEngagement(data),
      interactionStyle: posts.length > 0 ? "CREATES" : "LIKES_ONLY",
      communityParticipation: [],
    },
    interests: {
      hashtags: topHashtags,
      followedAccounts: Object.entries(categorizedFollowing).map(([category, names]) => ({
        category,
        names: names.slice(0, 10),
      })),
      mentionedKeywords: extractKeywordsFromCaptions(posts),
    },
  }

  return {
    vector,
    extendedData,
    confidence: calculateConfidence(posts.length, following.length),
  }
}

// ============================================
// 헬퍼 함수들
// ============================================

function createDefaultResult(platform: SNSPlatform): SNSAnalysisResult {
  return {
    vector: { depth: 0.5, lens: 0.5, stance: 0.5, scope: 0.5, taste: 0.5, purpose: 0.5 },
    extendedData: {
      platform,
      extractedAt: new Date(),
      specificTastes: {
        favoriteDirectors: [],
        favoriteActors: [],
        favoriteGenres: [],
        favoriteMovies: [],
      },
      activityPattern: {
        peakHours: [],
        averageSessionLength: 0,
        frequency: "OCCASIONAL",
        contentConsumptionRate: 0.5,
      },
      expressionStyle: {
        emojiUsage: "NONE",
        averagePostLength: "SHORT",
        formality: 0.5,
        sentimentTone: "NEUTRAL",
        hashtagUsage: false,
      },
      socialBehavior: {
        engagementLevel: "LURKER",
        interactionStyle: "LIKES_ONLY",
        communityParticipation: [],
      },
      interests: {
        hashtags: [],
        followedAccounts: [],
        mentionedKeywords: [],
      },
    },
    confidence: 0.5,
  }
}

function calculateDepthFromGenres(genres: string[]): number {
  const deepGenres = ["Documentary", "Art House", "Foreign", "Classic", "Drama"]
  const match = genres.filter((g) =>
    deepGenres.some((dg) => g.toLowerCase().includes(dg.toLowerCase()))
  )
  return Math.min(0.3 + (match.length / genres.length) * 0.7, 1)
}

function calculateLensFromGenres(genres: string[]): number {
  const emotionalGenres = ["Romance", "Drama", "Family", "Animation"]
  const match = genres.filter((g) =>
    emotionalGenres.some((eg) => g.toLowerCase().includes(eg.toLowerCase()))
  )
  return Math.max(0.2, 1 - (match.length / Math.max(genres.length, 1)) * 0.6)
}

function calculateTasteFromGenres(genres: string[]): number {
  const experimentalGenres = ["Indie", "Experimental", "Art", "Avant-garde", "Foreign"]
  const match = genres.filter((g) =>
    experimentalGenres.some((eg) => g.toLowerCase().includes(eg.toLowerCase()))
  )
  return Math.min(0.3 + (match.length / Math.max(genres.length, 1)) * 0.7, 1)
}

function calculatePurposeFromGenres(genres: string[]): number {
  const meaningfulGenres = ["Documentary", "Biography", "History", "Drama"]
  const match = genres.filter((g) =>
    meaningfulGenres.some((mg) => g.toLowerCase().includes(mg.toLowerCase()))
  )
  return Math.min(0.3 + (match.length / Math.max(genres.length, 1)) * 0.7, 1)
}

function calculateDepthFromYouTubeCategories(categories: string[]): number {
  const deepCategories = ["Education", "Science", "Documentary", "News"]
  const match = categories.filter((c) =>
    deepCategories.some((dc) => c.toLowerCase().includes(dc.toLowerCase()))
  )
  return Math.min(0.3 + (match.length / Math.max(categories.length, 1)) * 0.7, 1)
}

function calculateLensFromYouTubeCategories(categories: string[]): number {
  const emotionalCategories = ["Music", "Entertainment", "Vlogs"]
  const match = categories.filter((c) =>
    emotionalCategories.some((ec) => c.toLowerCase().includes(ec.toLowerCase()))
  )
  return Math.max(0.2, 1 - (match.length / Math.max(categories.length, 1)) * 0.6)
}

function calculateTasteFromYouTubeCategories(categories: string[]): number {
  const experimentalCategories = ["Art", "Indie", "Underground"]
  const match = categories.filter((c) =>
    experimentalCategories.some((ec) => c.toLowerCase().includes(ec.toLowerCase()))
  )
  return Math.min(0.3 + (match.length / Math.max(categories.length, 1)) * 0.7, 1)
}

function calculatePurposeFromYouTubeCategories(categories: string[]): number {
  const meaningfulCategories = ["Education", "Science", "Documentary", "TED"]
  const match = categories.filter((c) =>
    meaningfulCategories.some((mc) => c.toLowerCase().includes(mc.toLowerCase()))
  )
  return Math.min(0.3 + (match.length / Math.max(categories.length, 1)) * 0.7, 1)
}

function analyzeDislikedGenres(ratings: RatingItem[]): string[] {
  const genreScores: Record<string, { sum: number; count: number }> = {}

  for (const rating of ratings) {
    for (const genre of rating.genres) {
      if (!genreScores[genre]) {
        genreScores[genre] = { sum: 0, count: 0 }
      }
      genreScores[genre].sum += rating.score
      genreScores[genre].count += 1
    }
  }

  return Object.entries(genreScores)
    .filter(([, data]) => data.count >= 3 && data.sum / data.count < 2.5)
    .map(([genre]) => genre)
}

function calculateAvgSession(history: ViewingHistoryItem[]): number {
  if (history.length === 0) return 0
  return history.reduce((sum, h) => sum + h.duration, 0) / history.length
}

function calculateYouTubeAvgSession(history: YouTubeWatchItem[]): number {
  if (history.length === 0) return 0
  return history.reduce((sum, h) => sum + h.watchedDuration, 0) / history.length
}

function determineFrequency(history: ViewingHistoryItem[]): "DAILY" | "WEEKLY" | "OCCASIONAL" {
  if (history.length === 0) return "OCCASIONAL"

  const daySet = new Set(history.map((h) => new Date(h.date).toDateString()))
  const avgPerWeek = daySet.size / 4

  if (avgPerWeek >= 5) return "DAILY"
  if (avgPerWeek >= 2) return "WEEKLY"
  return "OCCASIONAL"
}

function determineYouTubeFrequency(history: YouTubeWatchItem[]): "DAILY" | "WEEKLY" | "OCCASIONAL" {
  if (history.length === 0) return "OCCASIONAL"

  const daySet = new Set(history.map((h) => new Date(h.watchedAt).toDateString()))
  const avgPerWeek = daySet.size / 4

  if (avgPerWeek >= 5) return "DAILY"
  if (avgPerWeek >= 2) return "WEEKLY"
  return "OCCASIONAL"
}

function extractKeywordsFromHistory(history: ViewingHistoryItem[]): string[] {
  const keywords = new Set<string>()
  for (const item of history) {
    for (const genre of item.genres) {
      keywords.add(genre)
    }
    if (item.director) keywords.add(item.director)
  }
  return Array.from(keywords).slice(0, 20)
}

function extractLocationFromPosts(posts: InstagramPost[]): string | undefined {
  const locations = posts.map((p) => p.location).filter(Boolean) as string[]
  if (locations.length === 0) return undefined

  const locationCounts: Record<string, number> = {}
  for (const loc of locations) {
    locationCounts[loc] = (locationCounts[loc] || 0) + 1
  }

  return Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
}

function extractFromFollowing(following: InstagramAccount[], category: string): string[] {
  return following.filter((a) => a.category === category).map((a) => a.username)
}

function extractGenresFromHashtags(hashtags: string[]): string[] {
  const genreKeywords = ["movie", "film", "drama", "romance", "action", "comedy", "horror", "scifi"]
  return hashtags.filter((tag) => genreKeywords.some((g) => tag.toLowerCase().includes(g)))
}

function determineInstagramEngagement(
  data: InstagramData
): "LURKER" | "CASUAL" | "ACTIVE" | "CREATOR" {
  const postCount = data.posts?.length || 0
  const activityScore = (data.activity?.likesGiven || 0) + (data.activity?.commentsGiven || 0)

  if (postCount > 50 && activityScore > 500) return "CREATOR"
  if (postCount > 10 || activityScore > 100) return "ACTIVE"
  if (activityScore > 20) return "CASUAL"
  return "LURKER"
}

function extractKeywordsFromCaptions(posts: InstagramPost[]): string[] {
  const wordCounts: Record<string, number> = {}
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "to",
    "of",
    "in",
    "for",
    "on",
    "with",
  ])

  for (const post of posts) {
    const words = post.caption
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))

    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    }
  }

  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word)
}

function calculateConfidence(primaryCount: number, secondaryCount: number): number {
  // 데이터가 많을수록 신뢰도 증가
  const primary = Math.min(primaryCount / 100, 1) * 0.7
  const secondary = Math.min(secondaryCount / 50, 1) * 0.3
  return Math.min(0.5 + primary + secondary, 1)
}
