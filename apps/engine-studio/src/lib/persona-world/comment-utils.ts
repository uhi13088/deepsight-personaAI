// ═══════════════════════════════════════════════════════════════
// PersonaWorld — User Comment Utilities
// 벡터 기반 톤 분류 + 키워드 fallback + 입력 검증
// ═══════════════════════════════════════════════════════════════

import type { ThreeLayerVector } from "@/types/persona-v3"
import type { CommentTone, PersonaStateData } from "./types"
import { decideCommentTone } from "./interactions/comment-tone"

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

/** 유저 DB 벡터 데이터 */
export interface UserVectorData {
  depth?: number | null
  lens?: number | null
  stance?: number | null
  scope?: number | null
  taste?: number | null
  purpose?: number | null
  openness?: number | null
  conscientiousness?: number | null
  extraversion?: number | null
  agreeableness?: number | null
  neuroticism?: number | null
}

/** 유저 벡터가 충분한지 판단 (L1 6D 중 최소 3개 이상) */
export function hasUserVectors(data: UserVectorData): boolean {
  const l1Dims = [data.depth, data.lens, data.stance, data.scope, data.taste, data.purpose]
  return l1Dims.filter((v) => v != null).length >= 3
}

/** 유저 DB 벡터 → ThreeLayerVector 변환 (없는 차원은 0.5 중립값) */
export function buildUserThreeLayerVector(data: UserVectorData): ThreeLayerVector {
  return {
    social: {
      depth: Number(data.depth ?? 0.5),
      lens: Number(data.lens ?? 0.5),
      stance: Number(data.stance ?? 0.5),
      scope: Number(data.scope ?? 0.5),
      taste: Number(data.taste ?? 0.5),
      purpose: Number(data.purpose ?? 0.5),
      sociability: Number(data.extraversion ?? 0.5),
    },
    temperament: {
      openness: Number(data.openness ?? 0.5),
      conscientiousness: Number(data.conscientiousness ?? 0.5),
      extraversion: Number(data.extraversion ?? 0.5),
      agreeableness: Number(data.agreeableness ?? 0.5),
      neuroticism: Number(data.neuroticism ?? 0.5),
    },
    narrative: {
      lack: 0.5,
      moralCompass: 0.5,
      volatility: 0.5,
      growthArc: 0.5,
    },
  }
}

/** 유저 기본 상태 (중립값) */
const DEFAULT_USER_STATE: PersonaStateData = {
  mood: 0.5,
  energy: 0.5,
  socialBattery: 0.5,
  paradoxTension: 0,
}

/**
 * 벡터 기반 톤 분류 (유저 댓글용).
 * 유저 벡터 데이터가 충분하면 decideCommentTone 사용,
 * 부족하면 키워드 기반 classifyTone fallback.
 */
export function classifyToneWithVectors(
  content: string,
  userVectors: UserVectorData | null
): CommentTone {
  if (userVectors && hasUserVectors(userVectors)) {
    const vectors = buildUserThreeLayerVector(userVectors)
    const decision = decideCommentTone(vectors, DEFAULT_USER_STATE, null, 0)
    if (decision.confidence > 0.15) {
      return decision.tone
    }
  }
  return classifyTone(content)
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
