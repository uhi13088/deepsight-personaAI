// ═══════════════════════════════════════════════════════════════
// PersonaWorld — SNS Analyzer
// 설계서 §12.3, 구현계획서 §8.3
// 플랫폼 API → SNSExtendedData (메타데이터 추출 + 성향 추론)
// ═══════════════════════════════════════════════════════════════

import type { SNSPlatform } from "@/generated/prisma"

// ── 분석 결과 타입 ───────────────────────────────────────────

export interface SnsAnalysisResult {
  /** 플랫폼 원본 데이터 */
  raw: Record<string, unknown>
  /** 추출·정제된 데이터 (SNSExtendedData.extractedData 에 매핑) */
  extracted: SnsExtractedProfile
}

/**
 * 설계서 §12.3 — 플랫폼별 확장 데이터 공통 구조.
 */
export interface SnsExtractedProfile {
  platform: string
  extractedAt: string

  /** 인구통계 (추정) */
  demographics?: {
    estimatedAge?: number
    country?: string
    region?: string
  }

  /** 구체적 취향 */
  specificTastes: {
    favoriteGenres: string[]
    favoriteDirectors: string[]
    favoriteActors: string[]
    favoriteMovies: string[]
    dislikedGenres?: string[]
  }

  /** 활동 패턴 */
  activityPattern: {
    peakHours: number[]
    averageSessionLength: number
    frequency: "DAILY" | "WEEKLY" | "OCCASIONAL"
    contentConsumptionRate: number
  }

  /** 표현 스타일 */
  expressionStyle: {
    emojiUsage?: "NONE" | "RARE" | "MODERATE" | "FREQUENT"
    averagePostLength?: "SHORT" | "MEDIUM" | "LONG"
    formality?: number
    sentimentTone?: "POSITIVE" | "NEUTRAL" | "CRITICAL"
    hashtagUsage?: boolean
  }

  /** 소셜 성향 */
  socialBehavior?: {
    engagementLevel: "LURKER" | "CASUAL" | "ACTIVE" | "CREATOR"
    interactionStyle: "LIKES_ONLY" | "COMMENTS" | "SHARES" | "CREATES"
    communityParticipation: string[]
  }

  /** 관심사 키워드 */
  interests: {
    hashtags: string[]
    followedAccounts: Array<{ category: string; names: string[] }>
    mentionedKeywords: string[]
  }
}

// ── 플랫폼별 분석 진입점 ─────────────────────────────────────

/**
 * SNS 프로필 분석.
 *
 * 설계서 §8.3:
 * Stage 1: 메타데이터 자동 추출
 * Stage 2: 성향 추론 (키워드 기반)
 *
 * @param platform 대상 플랫폼
 * @param accessToken OAuth access token
 * @returns 원본 + 추출 데이터
 */
export async function analyzeSnsProfile(
  platform: SNSPlatform,
  accessToken: string
): Promise<SnsAnalysisResult> {
  switch (platform) {
    case "YOUTUBE":
      return analyzeYoutube(accessToken)
    case "SPOTIFY":
      return analyzeSpotify(accessToken)
    case "INSTAGRAM":
      return analyzeInstagram(accessToken)
    case "TWITTER":
      return analyzeTwitter(accessToken)
    case "TIKTOK":
      return analyzeTikTok(accessToken)
    case "NETFLIX":
    case "LETTERBOXD":
      // 데이터 업로드 방식 — 별도 엔드포인트에서 처리
      return { raw: {}, extracted: emptyExtracted(platform) }
  }
}

// ── YouTube 분석 ─────────────────────────────────────────────

async function analyzeYoutube(accessToken: string): Promise<SnsAnalysisResult> {
  const headers = { Authorization: `Bearer ${accessToken}` }

  // 구독 채널 목록
  const subsRes = await fetch(
    "https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50",
    { headers }
  )
  const subsData = subsRes.ok ? await subsRes.json() : { items: [] }

  // 좋아요 동영상
  const likesRes = await fetch(
    "https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=50",
    { headers }
  )
  const likesData = likesRes.ok ? await likesRes.json() : { items: [] }

  // 채널 정보
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
    { headers }
  )
  const channelData = channelRes.ok ? await channelRes.json() : { items: [] }

  const raw = { subscriptions: subsData, likedVideos: likesData, channel: channelData }

  // Stage 1: 메타데이터 추출
  const subNames: string[] = (subsData.items ?? []).map(
    (item: Record<string, Record<string, string>>) => item.snippet?.title ?? ""
  )
  const likedTitles: string[] = (likesData.items ?? []).map(
    (item: Record<string, Record<string, string>>) => item.snippet?.title ?? ""
  )
  const likedTags: string[] = (likesData.items ?? []).flatMap(
    (item: Record<string, Record<string, string[]>>) => item.snippet?.tags ?? []
  )

  // Stage 2: 성향 추론
  const genres = inferGenresFromTitles([...likedTitles, ...subNames])
  const keywords = extractTopKeywords([...likedTags, ...subNames])

  const extracted: SnsExtractedProfile = {
    platform: "YOUTUBE",
    extractedAt: new Date().toISOString(),
    specificTastes: {
      favoriteGenres: genres,
      favoriteDirectors: [], // YouTube에서는 채널명으로 대체
      favoriteActors: [],
      favoriteMovies: [],
    },
    activityPattern: {
      peakHours: [],
      averageSessionLength: 0,
      frequency: subsData.items?.length > 30 ? "DAILY" : "WEEKLY",
      contentConsumptionRate: likesData.items?.length ?? 0,
    },
    expressionStyle: {},
    interests: {
      hashtags: likedTags.slice(0, 20),
      followedAccounts: categorizeChannels(subNames),
      mentionedKeywords: keywords,
    },
  }

  return { raw, extracted }
}

// ── Spotify 분석 ─────────────────────────────────────────────

async function analyzeSpotify(accessToken: string): Promise<SnsAnalysisResult> {
  const headers = { Authorization: `Bearer ${accessToken}` }

  // 최근 재생
  const recentRes = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=50", {
    headers,
  })
  const recentData = recentRes.ok ? await recentRes.json() : { items: [] }

  // 탑 아티스트
  const topArtistsRes = await fetch(
    "https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=50",
    { headers }
  )
  const topArtistsData = topArtistsRes.ok ? await topArtistsRes.json() : { items: [] }

  // 탑 트랙
  const topTracksRes = await fetch(
    "https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=50",
    { headers }
  )
  const topTracksData = topTracksRes.ok ? await topTracksRes.json() : { items: [] }

  // 유저 프로필
  const profileRes = await fetch("https://api.spotify.com/v1/me", { headers })
  const profileData = profileRes.ok ? await profileRes.json() : {}

  const raw = {
    recentlyPlayed: recentData,
    topArtists: topArtistsData,
    topTracks: topTracksData,
    profile: profileData,
  }

  // 장르 추출 (아티스트 장르에서)
  const allGenres: string[] = (topArtistsData.items ?? []).flatMap(
    (artist: Record<string, string[]>) => artist.genres ?? []
  )
  const genreCounts = countItems(allGenres)
  const topGenres = Object.entries(genreCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([genre]) => genre)

  // 아티스트명
  const artistNames: string[] = (topArtistsData.items ?? []).map(
    (a: Record<string, string>) => a.name ?? ""
  )

  const extracted: SnsExtractedProfile = {
    platform: "SPOTIFY",
    extractedAt: new Date().toISOString(),
    specificTastes: {
      favoriteGenres: topGenres,
      favoriteDirectors: [], // 음악에서는 프로듀서 해당 (미추출)
      favoriteActors: [], // 음악에서는 보컬리스트 (artistNames에 포함)
      favoriteMovies: [], // 해당 없음
    },
    activityPattern: {
      peakHours: extractSpotifyPeakHours(recentData.items ?? []),
      averageSessionLength: 0,
      frequency: (recentData.items?.length ?? 0) > 30 ? "DAILY" : "WEEKLY",
      contentConsumptionRate: recentData.items?.length ?? 0,
    },
    expressionStyle: {
      sentimentTone: inferMoodFromGenres(topGenres),
    },
    interests: {
      hashtags: topGenres,
      followedAccounts: [{ category: "아티스트", names: artistNames.slice(0, 20) }],
      mentionedKeywords: topGenres.slice(0, 10),
    },
  }

  return { raw, extracted }
}

// ── Instagram 분석 ───────────────────────────────────────────

async function analyzeInstagram(accessToken: string): Promise<SnsAnalysisResult> {
  // Instagram Basic Display API
  const profileRes = await fetch(
    `https://graph.instagram.com/me?fields=id,username,media_count&access_token=${accessToken}`
  )
  const profileData = profileRes.ok ? await profileRes.json() : {}

  const mediaRes = await fetch(
    `https://graph.instagram.com/me/media?fields=id,caption,media_type,timestamp,permalink&limit=50&access_token=${accessToken}`
  )
  const mediaData = mediaRes.ok ? await mediaRes.json() : { data: [] }

  const raw = { profile: profileData, media: mediaData }

  // 캡션 분석
  const captions: string[] = (mediaData.data ?? [])
    .map((m: Record<string, string>) => m.caption ?? "")
    .filter(Boolean)
  const hashtags = extractHashtags(captions)
  const keywords = extractTopKeywords(captions)

  // 활동 시간 분석
  const timestamps: string[] = (mediaData.data ?? []).map(
    (m: Record<string, string>) => m.timestamp ?? ""
  )
  const peakHours = extractPeakHoursFromTimestamps(timestamps)

  // 포스팅 빈도
  const mediaCount = profileData.media_count ?? 0
  const frequency: "DAILY" | "WEEKLY" | "OCCASIONAL" =
    mediaCount > 365 ? "DAILY" : mediaCount > 52 ? "WEEKLY" : "OCCASIONAL"

  // 표현 스타일
  const avgCaptionLength =
    captions.length > 0 ? captions.reduce((sum, c) => sum + c.length, 0) / captions.length : 0
  const emojiCount = captions.reduce((sum, c) => sum + countEmojis(c), 0)

  const extracted: SnsExtractedProfile = {
    platform: "INSTAGRAM",
    extractedAt: new Date().toISOString(),
    specificTastes: {
      favoriteGenres: inferGenresFromTitles(captions),
      favoriteDirectors: [],
      favoriteActors: [],
      favoriteMovies: [],
    },
    activityPattern: {
      peakHours,
      averageSessionLength: 0,
      frequency,
      contentConsumptionRate: mediaCount,
    },
    expressionStyle: {
      emojiUsage:
        emojiCount === 0
          ? "NONE"
          : emojiCount < captions.length
            ? "RARE"
            : emojiCount < captions.length * 3
              ? "MODERATE"
              : "FREQUENT",
      averagePostLength:
        avgCaptionLength < 50 ? "SHORT" : avgCaptionLength < 200 ? "MEDIUM" : "LONG",
      hashtagUsage: hashtags.length > 0,
    },
    socialBehavior: {
      engagementLevel:
        mediaCount > 500
          ? "CREATOR"
          : mediaCount > 100
            ? "ACTIVE"
            : mediaCount > 10
              ? "CASUAL"
              : "LURKER",
      interactionStyle: mediaCount > 100 ? "CREATES" : "LIKES_ONLY",
      communityParticipation: [],
    },
    interests: {
      hashtags: hashtags.slice(0, 20),
      followedAccounts: [],
      mentionedKeywords: keywords,
    },
  }

  return { raw, extracted }
}

// ── Twitter 분석 ─────────────────────────────────────────────

async function analyzeTwitter(accessToken: string): Promise<SnsAnalysisResult> {
  const headers = { Authorization: `Bearer ${accessToken}` }

  // 유저 정보
  const meRes = await fetch(
    "https://api.twitter.com/2/users/me?user.fields=public_metrics,description,created_at",
    { headers }
  )
  const meData = meRes.ok ? await meRes.json() : { data: {} }

  // 최근 트윗
  const userId = meData.data?.id
  let tweetsData: Record<string, unknown> = { data: [] }
  if (userId) {
    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=100&tweet.fields=created_at,public_metrics,entities`,
      { headers }
    )
    tweetsData = tweetsRes.ok ? await tweetsRes.json() : { data: [] }
  }

  // 좋아요
  let likesData: Record<string, unknown> = { data: [] }
  if (userId) {
    const likesRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/liked_tweets?max_results=100&tweet.fields=text,entities`,
      { headers }
    )
    likesData = likesRes.ok ? await likesRes.json() : { data: [] }
  }

  const raw = { user: meData, tweets: tweetsData, likes: likesData }

  // 트윗 텍스트 추출
  const tweetTexts: string[] = ((tweetsData.data ?? []) as Record<string, string>[]).map(
    (t) => t.text ?? ""
  )
  const likeTexts: string[] = ((likesData.data ?? []) as Record<string, string>[]).map(
    (t) => t.text ?? ""
  )
  const allTexts = [...tweetTexts, ...likeTexts]

  const hashtags = extractHashtags(allTexts)
  const keywords = extractTopKeywords(allTexts)
  const metrics = meData.data?.public_metrics ?? {}

  // 표현 스타일
  const avgLength =
    tweetTexts.length > 0 ? tweetTexts.reduce((sum, t) => sum + t.length, 0) / tweetTexts.length : 0
  const emojiTotal = tweetTexts.reduce((sum, t) => sum + countEmojis(t), 0)

  const extracted: SnsExtractedProfile = {
    platform: "TWITTER",
    extractedAt: new Date().toISOString(),
    specificTastes: {
      favoriteGenres: inferGenresFromTitles(allTexts),
      favoriteDirectors: [],
      favoriteActors: [],
      favoriteMovies: [],
    },
    activityPattern: {
      peakHours: [],
      averageSessionLength: 0,
      frequency: tweetTexts.length > 50 ? "DAILY" : "WEEKLY",
      contentConsumptionRate: tweetTexts.length,
    },
    expressionStyle: {
      emojiUsage:
        emojiTotal === 0
          ? "NONE"
          : emojiTotal < tweetTexts.length
            ? "RARE"
            : emojiTotal < tweetTexts.length * 3
              ? "MODERATE"
              : "FREQUENT",
      averagePostLength: avgLength < 80 ? "SHORT" : avgLength < 200 ? "MEDIUM" : "LONG",
      hashtagUsage: hashtags.length > 0,
    },
    socialBehavior: {
      engagementLevel:
        (metrics.tweet_count ?? 0) > 5000
          ? "CREATOR"
          : (metrics.tweet_count ?? 0) > 500
            ? "ACTIVE"
            : (metrics.tweet_count ?? 0) > 50
              ? "CASUAL"
              : "LURKER",
      interactionStyle: (metrics.tweet_count ?? 0) > 1000 ? "CREATES" : "COMMENTS",
      communityParticipation: [],
    },
    interests: {
      hashtags: hashtags.slice(0, 20),
      followedAccounts: [],
      mentionedKeywords: keywords,
    },
  }

  return { raw, extracted }
}

// ── TikTok 분석 ──────────────────────────────────────────────

async function analyzeTikTok(accessToken: string): Promise<SnsAnalysisResult> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  }

  // 유저 정보
  const userRes = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count,following_count,likes_count,video_count",
    { headers }
  )
  const userData = userRes.ok ? await userRes.json() : { data: { user: {} } }

  // 비디오 목록
  const videoRes = await fetch(
    "https://open.tiktokapis.com/v2/video/list/?fields=title,create_time,like_count,comment_count,share_count",
    { method: "POST", headers, body: JSON.stringify({ max_count: 20 }) }
  )
  const videoData = videoRes.ok ? await videoRes.json() : { data: { videos: [] } }

  const raw = { user: userData, videos: videoData }

  const videoTitles: string[] = (videoData.data?.videos ?? []).map(
    (v: Record<string, string>) => v.title ?? ""
  )
  const keywords = extractTopKeywords(videoTitles)
  const userInfo = userData.data?.user ?? {}
  const videoCount = userInfo.video_count ?? 0

  const extracted: SnsExtractedProfile = {
    platform: "TIKTOK",
    extractedAt: new Date().toISOString(),
    specificTastes: {
      favoriteGenres: inferGenresFromTitles(videoTitles),
      favoriteDirectors: [],
      favoriteActors: [],
      favoriteMovies: [],
    },
    activityPattern: {
      peakHours: [],
      averageSessionLength: 0,
      frequency: videoCount > 100 ? "DAILY" : videoCount > 20 ? "WEEKLY" : "OCCASIONAL",
      contentConsumptionRate: videoCount,
    },
    expressionStyle: {},
    socialBehavior: {
      engagementLevel:
        videoCount > 200
          ? "CREATOR"
          : videoCount > 50
            ? "ACTIVE"
            : videoCount > 5
              ? "CASUAL"
              : "LURKER",
      interactionStyle: videoCount > 50 ? "CREATES" : "LIKES_ONLY",
      communityParticipation: [],
    },
    interests: {
      hashtags: extractHashtags(videoTitles).slice(0, 20),
      followedAccounts: [],
      mentionedKeywords: keywords,
    },
  }

  return { raw, extracted }
}

// ── 공용 유틸리티 ────────────────────────────────────────────

function emptyExtracted(platform: string): SnsExtractedProfile {
  return {
    platform,
    extractedAt: new Date().toISOString(),
    specificTastes: {
      favoriteGenres: [],
      favoriteDirectors: [],
      favoriteActors: [],
      favoriteMovies: [],
    },
    activityPattern: {
      peakHours: [],
      averageSessionLength: 0,
      frequency: "OCCASIONAL",
      contentConsumptionRate: 0,
    },
    expressionStyle: {},
    interests: {
      hashtags: [],
      followedAccounts: [],
      mentionedKeywords: [],
    },
  }
}

/** 텍스트에서 해시태그 추출 */
function extractHashtags(texts: string[]): string[] {
  const tagCounts = new Map<string, number>()
  const regex = /#[\w가-힣]+/g

  for (const text of texts) {
    const matches = text.match(regex) ?? []
    for (const tag of matches) {
      const lower = tag.toLowerCase()
      tagCounts.set(lower, (tagCounts.get(lower) ?? 0) + 1)
    }
  }

  return [...tagCounts.entries()].sort(([, a], [, b]) => b - a).map(([tag]) => tag)
}

/** 텍스트에서 상위 키워드 추출 (불용어 제거) */
function extractTopKeywords(texts: string[], limit: number = 20): string[] {
  const STOPWORDS = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "shall",
    "and",
    "but",
    "or",
    "nor",
    "not",
    "no",
    "so",
    "for",
    "yet",
    "in",
    "on",
    "at",
    "to",
    "from",
    "by",
    "with",
    "of",
    "up",
    "out",
    "off",
    "over",
    "into",
    "onto",
    "about",
    "after",
    "before",
    "between",
    "through",
    "during",
    "without",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "my",
    "your",
    "his",
    "her",
    "our",
    "their",
    "i",
    "you",
    "he",
    "she",
    "we",
    "they",
    "me",
    "him",
    "us",
    "them",
    // 한국어 불용어
    "이",
    "그",
    "저",
    "것",
    "수",
    "등",
    "때",
    "중",
    "더",
    "잘",
    "또",
    "및",
    "를",
    "을",
    "에",
    "의",
    "가",
    "는",
    "은",
    "도",
    "와",
    "과",
    "로",
    "으로",
  ])

  const wordCounts = new Map<string, number>()

  for (const text of texts) {
    const words = text
      .toLowerCase()
      .replace(/[^\w가-힣\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))

    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1)
    }
  }

  return [...wordCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([word]) => word)
}

/** 제목/텍스트에서 장르 추론 */
function inferGenresFromTitles(titles: string[]): string[] {
  const GENRE_KEYWORDS: Record<string, string[]> = {
    "영화/드라마": ["movie", "film", "drama", "영화", "드라마", "시리즈"],
    음악: ["music", "song", "album", "음악", "노래", "앨범", "뮤직"],
    게임: ["game", "gaming", "게임", "플레이"],
    기술: ["tech", "code", "programming", "기술", "개발", "코딩"],
    요리: ["cook", "recipe", "food", "요리", "레시피", "맛집"],
    여행: ["travel", "trip", "여행", "관광"],
    패션: ["fashion", "style", "outfit", "패션", "스타일"],
    뷰티: ["beauty", "makeup", "skincare", "뷰티", "메이크업"],
    "운동/피트니스": ["fitness", "workout", "gym", "운동", "헬스"],
    독서: ["book", "reading", "책", "독서", "도서"],
    예술: ["art", "design", "illustration", "예술", "디자인"],
    과학: ["science", "research", "과학", "연구"],
    "뉴스/시사": ["news", "politics", "뉴스", "시사", "정치"],
    교육: ["education", "learn", "tutorial", "교육", "강의"],
    코미디: ["comedy", "funny", "humor", "코미디", "웃긴"],
  }

  const genreCounts = new Map<string, number>()
  const combined = titles.join(" ").toLowerCase()

  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    let count = 0
    for (const kw of keywords) {
      const matches = combined.split(kw).length - 1
      count += matches
    }
    if (count > 0) {
      genreCounts.set(genre, count)
    }
  }

  return [...genreCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([genre]) => genre)
}

/** YouTube 구독 채널을 카테고리별로 분류 */
function categorizeChannels(channelNames: string[]): Array<{ category: string; names: string[] }> {
  // 단순 구현: 전체를 "구독 채널"로 묶음
  if (channelNames.length === 0) return []
  return [{ category: "구독 채널", names: channelNames.slice(0, 20) }]
}

/** 아이템 빈도 카운트 */
function countItems(items: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const lower = item.toLowerCase()
    counts[lower] = (counts[lower] ?? 0) + 1
  }
  return counts
}

/** Spotify 최근 재생에서 피크 시간대 추출 */
function extractSpotifyPeakHours(items: Array<Record<string, string>>): number[] {
  const hourCounts = new Map<number, number>()

  for (const item of items) {
    const playedAt = item.played_at
    if (!playedAt) continue
    try {
      const hour = new Date(playedAt).getHours()
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
    } catch {
      // 파싱 실패 시 무시
    }
  }

  return [...hourCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([hour]) => hour)
}

/** 타임스탬프에서 피크 시간대 추출 */
function extractPeakHoursFromTimestamps(timestamps: string[]): number[] {
  const hourCounts = new Map<number, number>()

  for (const ts of timestamps) {
    if (!ts) continue
    try {
      const hour = new Date(ts).getHours()
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
    } catch {
      // 파싱 실패 시 무시
    }
  }

  return [...hourCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([hour]) => hour)
}

/** 음악 장르에서 분위기 추론 */
function inferMoodFromGenres(genres: string[]): "POSITIVE" | "NEUTRAL" | "CRITICAL" {
  const positiveGenres = ["pop", "dance", "happy", "k-pop", "disco", "funk"]
  const criticalGenres = ["metal", "punk", "industrial", "emo", "grunge"]

  let positiveCount = 0
  let criticalCount = 0

  for (const genre of genres) {
    const lower = genre.toLowerCase()
    if (positiveGenres.some((pg) => lower.includes(pg))) positiveCount++
    if (criticalGenres.some((cg) => lower.includes(cg))) criticalCount++
  }

  if (positiveCount > criticalCount) return "POSITIVE"
  if (criticalCount > positiveCount) return "CRITICAL"
  return "NEUTRAL"
}

/** 이모지 개수 카운트 */
function countEmojis(text: string): number {
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu
  return (text.match(emojiRegex) ?? []).length
}

// ── 데이터 업로드 파싱 ───────────────────────────────────────

/**
 * Netflix/Letterboxd 등 데이터 업로드 파싱.
 *
 * 유저가 직접 업로드한 시청 데이터를 SNSExtendedData로 변환.
 */
export function parseUploadedData(
  platform: SNSPlatform,
  uploadedData: Record<string, unknown>
): SnsExtractedProfile {
  switch (platform) {
    case "NETFLIX":
      return parseNetflixData(uploadedData)
    case "LETTERBOXD":
      return parseLetterboxdData(uploadedData)
    default:
      return emptyExtracted(platform)
  }
}

function parseNetflixData(data: Record<string, unknown>): SnsExtractedProfile {
  // Netflix 시청 기록 CSV 파싱 결과 기대
  const viewingHistory = (data.viewingHistory ?? []) as Array<Record<string, string>>
  const titles = viewingHistory.map((item) => item.Title ?? item.title ?? "")
  const genres = inferGenresFromTitles(titles)
  const keywords = extractTopKeywords(titles)

  return {
    platform: "NETFLIX",
    extractedAt: new Date().toISOString(),
    specificTastes: {
      favoriteGenres: genres,
      favoriteDirectors: [],
      favoriteActors: [],
      favoriteMovies: titles.slice(0, 20),
    },
    activityPattern: {
      peakHours: [],
      averageSessionLength: 0,
      frequency: titles.length > 100 ? "DAILY" : titles.length > 30 ? "WEEKLY" : "OCCASIONAL",
      contentConsumptionRate: titles.length,
    },
    expressionStyle: {
      sentimentTone: "NEUTRAL",
    },
    interests: {
      hashtags: [],
      followedAccounts: [],
      mentionedKeywords: keywords,
    },
  }
}

function parseLetterboxdData(data: Record<string, unknown>): SnsExtractedProfile {
  // Letterboxd CSV 파싱 결과 기대
  const watchedFilms = (data.watchedFilms ?? []) as Array<Record<string, string>>
  const titles = watchedFilms.map((item) => item.Name ?? item.name ?? "")
  const ratings = watchedFilms
    .filter((item) => item.Rating ?? item.rating)
    .map((item) => Number(item.Rating ?? item.rating ?? 0))
  const avgRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0
  const genres = inferGenresFromTitles(titles)

  return {
    platform: "LETTERBOXD",
    extractedAt: new Date().toISOString(),
    specificTastes: {
      favoriteGenres: genres,
      favoriteDirectors: [],
      favoriteActors: [],
      favoriteMovies: watchedFilms
        .filter((item) => Number(item.Rating ?? item.rating ?? 0) >= 4)
        .map((item) => item.Name ?? item.name ?? "")
        .slice(0, 20),
    },
    activityPattern: {
      peakHours: [],
      averageSessionLength: 0,
      frequency: titles.length > 200 ? "DAILY" : titles.length > 50 ? "WEEKLY" : "OCCASIONAL",
      contentConsumptionRate: titles.length,
    },
    expressionStyle: {
      sentimentTone: avgRating > 3.5 ? "POSITIVE" : avgRating > 2.5 ? "NEUTRAL" : "CRITICAL",
    },
    interests: {
      hashtags: [],
      followedAccounts: [],
      mentionedKeywords: extractTopKeywords(titles),
    },
  }
}
