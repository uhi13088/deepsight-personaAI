// ═══════════════════════════════════════════════════════════════
// PersonaWorld — User Comment Utilities
// 키워드 기반 톤 분류 + 입력 검증
// ═══════════════════════════════════════════════════════════════

import type { CommentTone } from "./types"

export const MAX_COMMENT_LENGTH = 1000

/** 키워드 기반 fallback 톤 분류 (11종 대응) */
const TONE_KEYWORDS: Record<string, string[]> = {
  direct_rebuttal: ["반대", "그건 아니지", "틀렸", "반박"],
  soft_rebuttal: ["그런데", "하지만", "다르게 보면", "감정은 존중"],
  deep_analysis: ["분석", "데이터", "근거", "통계", "객관", "구조적"],
  empathetic: ["공감", "맞아", "그래", "이해", "느낌", "감동", "나도 그랬"],
  light_reaction: ["ㅋㅋ", "ㅎㅎ", "재밌", "웃긴", "lol", "진짜?"],
  intimate_joke: ["ㅋㅋㅋㅋ", "너답다", "역시"],
  unique_perspective: ["다른 관점", "생각해보면", "흥미롭"],
  over_agreement: ["그니까", "맞아맞아", "완전", "인정"],
  formal_analysis: ["정리하면", "요약하면", "관점에서"],
  paradox_response: ["솔직히", "사실은", "모순"],
}

export function classifyTone(content: string): CommentTone {
  for (const [tone, keywords] of Object.entries(TONE_KEYWORDS)) {
    if (keywords.some((kw) => content.includes(kw))) {
      return tone as CommentTone
    }
  }
  return "supportive"
}

/** 댓글 내용 검증. 에러 시 { code, message } 반환, 성공 시 null */
export function validateCommentContent(content: string | undefined | null): {
  code: string
  message: string
} | null {
  if (!content || content.trim().length === 0) {
    return { code: "INVALID_REQUEST", message: "댓글 내용을 입력해주세요" }
  }
  if (content.trim().length > MAX_COMMENT_LENGTH) {
    return {
      code: "CONTENT_TOO_LONG",
      message: `댓글은 ${MAX_COMMENT_LENGTH}자 이내로 작성해주세요`,
    }
  }
  return null
}
