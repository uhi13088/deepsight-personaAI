/**
 * 페르소나 역할(Role) 관련 공통 설정
 * feed, explore, persona 상세 등 여러 페이지에서 공유
 */

/** 역할별 한글명 */
export const ROLE_NAMES: Record<string, string> = {
  REVIEWER: "리뷰어",
  CURATOR: "큐레이터",
  EDUCATOR: "에듀케이터",
  COMPANION: "컴패니언",
  ANALYST: "애널리스트",
}

/** 역할별 이모지 */
export const ROLE_EMOJI: Record<string, string> = {
  REVIEWER: "📝",
  CURATOR: "🎯",
  EDUCATOR: "📚",
  COMPANION: "💬",
  ANALYST: "📊",
}

/** 역할별 배경 그라디언트 (light - 피드 포스트 아바타 배경용) */
export const ROLE_COLORS_LIGHT: Record<string, string> = {
  REVIEWER: "from-purple-100 to-pink-100",
  CURATOR: "from-blue-100 to-indigo-100",
  EDUCATOR: "from-green-100 to-teal-100",
  COMPANION: "from-orange-100 to-red-100",
  ANALYST: "from-cyan-100 to-blue-100",
}

/** 역할별 배경 그라디언트 (bold - 탐색/뱃지용) */
export const ROLE_COLORS_BOLD: Record<string, string> = {
  REVIEWER: "from-purple-400 to-pink-400",
  CURATOR: "from-blue-400 to-indigo-400",
  EDUCATOR: "from-green-400 to-teal-400",
  COMPANION: "from-orange-400 to-red-400",
  ANALYST: "from-cyan-400 to-blue-400",
}

/** 포스트 타입 라벨 (v3: 17종) */
export const POST_TYPE_LABELS: Record<string, string> = {
  REVIEW: "리뷰",
  THOUGHT: "생각",
  RECOMMENDATION: "추천",
  REACTION: "리액션",
  QUESTION: "질문",
  LIST: "리스트",
  THREAD: "스레드",
  VS_BATTLE: "VS 배틀",
  QNA: "Q&A",
  CURATION: "큐레이션",
  DEBATE: "토론",
  MEME: "밈",
  COLLAB: "콜라보",
  TRIVIA: "트리비아",
  PREDICTION: "예측",
  ANNIVERSARY: "기념일",
  BEHIND_STORY: "비하인드",
}

/** 포스트 타입별 이모지 */
export const POST_TYPE_EMOJI: Record<string, string> = {
  REVIEW: "\u2B50",
  THOUGHT: "\uD83D\uDCAD",
  RECOMMENDATION: "\uD83D\uDC4D",
  REACTION: "\uD83D\uDE2E",
  QUESTION: "\u2753",
  LIST: "\uD83D\uDCCB",
  THREAD: "\uD83E\uDDF5",
  VS_BATTLE: "\u2694\uFE0F",
  QNA: "\uD83D\uDCE9",
  CURATION: "\uD83D\uDC8E",
  DEBATE: "\uD83D\uDE4B",
  MEME: "\uD83D\uDE02",
  COLLAB: "\uD83E\uDD1D",
  TRIVIA: "\uD83E\uDDE0",
  PREDICTION: "\uD83D\uDD2E",
  ANNIVERSARY: "\uD83C\uDF89",
  BEHIND_STORY: "\uD83C\uDFAC",
}

/** 포스트 타입별 배경색 */
export const POST_TYPE_COLORS: Record<string, string> = {
  REVIEW: "bg-yellow-50 text-yellow-700",
  THOUGHT: "bg-gray-50 text-gray-600",
  RECOMMENDATION: "bg-green-50 text-green-700",
  REACTION: "bg-orange-50 text-orange-700",
  QUESTION: "bg-blue-50 text-blue-700",
  LIST: "bg-indigo-50 text-indigo-700",
  THREAD: "bg-purple-50 text-purple-700",
  VS_BATTLE: "bg-red-50 text-red-700",
  QNA: "bg-teal-50 text-teal-700",
  CURATION: "bg-violet-50 text-violet-700",
  DEBATE: "bg-rose-50 text-rose-700",
  MEME: "bg-amber-50 text-amber-700",
  COLLAB: "bg-cyan-50 text-cyan-700",
  TRIVIA: "bg-fuchsia-50 text-fuchsia-700",
  PREDICTION: "bg-indigo-50 text-indigo-700",
  ANNIVERSARY: "bg-pink-50 text-pink-700",
  BEHIND_STORY: "bg-slate-50 text-slate-700",
}

/** 피드 소스 라벨 */
export const FEED_SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  FOLLOWING: { label: "팔로잉", color: "bg-blue-50 text-blue-600" },
  RECOMMENDED: { label: "추천", color: "bg-purple-50 text-purple-600" },
  TRENDING: { label: "트렌딩", color: "bg-pink-50 text-pink-600" },
}

/** 댓글 톤 뱃지 설정 (8종) */
export const COMMENT_TONE_CONFIG: Record<string, { label: string; emoji: string; color: string }> =
  {
    empathetic: { label: "공감", emoji: "\uD83E\uDD17", color: "bg-pink-50 text-pink-600" },
    analytical: { label: "분석", emoji: "\uD83E\uDDD0", color: "bg-blue-50 text-blue-600" },
    counter_argument: {
      label: "반론",
      emoji: "\u2694\uFE0F",
      color: "bg-red-50 text-red-600",
    },
    humorous: { label: "유머", emoji: "\uD83D\uDE04", color: "bg-amber-50 text-amber-600" },
    supportive: { label: "지지", emoji: "\uD83D\uDC4F", color: "bg-green-50 text-green-600" },
    questioning: { label: "질문", emoji: "\uD83E\uDD14", color: "bg-violet-50 text-violet-600" },
    informative: { label: "정보", emoji: "\uD83D\uDCDA", color: "bg-cyan-50 text-cyan-600" },
    provocative: { label: "도발", emoji: "\uD83D\uDD25", color: "bg-orange-50 text-orange-600" },
  }

/** SNS 플랫폼 설정 (8개) */
export const SNS_PROVIDER_CONFIG: Record<
  string,
  { label: string; emoji: string; color: string; description: string }
> = {
  twitter: {
    label: "X (Twitter)",
    emoji: "\uD83D\uDC26",
    color: "bg-sky-50 text-sky-700",
    description: "트윗/리트윗 분석",
  },
  instagram: {
    label: "Instagram",
    emoji: "\uD83D\uDCF8",
    color: "bg-pink-50 text-pink-700",
    description: "좋아요/저장 패턴 분석",
  },
  threads: {
    label: "Threads",
    emoji: "\uD83E\uDDF5",
    color: "bg-gray-50 text-gray-700",
    description: "스레드 활동 분석",
  },
  naver_blog: {
    label: "네이버 블로그",
    emoji: "\uD83D\uDCDD",
    color: "bg-green-50 text-green-700",
    description: "블로그 카테고리/관심사 분석",
  },
  youtube: {
    label: "YouTube",
    emoji: "\u25B6\uFE0F",
    color: "bg-red-50 text-red-700",
    description: "시청 기록/구독 분석",
  },
  youtube_music: {
    label: "YouTube Music",
    emoji: "\uD83C\uDFB5",
    color: "bg-red-50 text-red-600",
    description: "음악 취향 분석",
  },
  spotify: {
    label: "Spotify",
    emoji: "\uD83C\uDFA7",
    color: "bg-emerald-50 text-emerald-700",
    description: "청취 패턴/장르 분석",
  },
  netflix: {
    label: "Netflix",
    emoji: "\uD83C\uDFAC",
    color: "bg-rose-50 text-rose-700",
    description: "시청 장르/패턴 분석",
  },
}
