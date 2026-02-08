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

/** 포스트 타입 라벨 */
export const POST_TYPE_LABELS: Record<string, string> = {
  REVIEW: "리뷰",
  OPINION: "의견",
  RECOMMENDATION: "추천",
  VS_BATTLE: "VS 배틀",
  QNA: "Q&A",
  NEWS_REACTION: "뉴스 반응",
  DEBATE: "토론",
}
