/**
 * AI/LLM 관련 유틸리티
 * @module lib/ai
 */

// OpenAI 클라이언트 설정 (추후 구현)
export const AI_CONFIG = {
  defaultModel: "gpt-4-turbo-preview",
  embeddingModel: "text-embedding-3-small",
  maxTokens: 4096,
  temperature: 0.7,
} as const

/**
 * 프롬프트 템플릿 생성
 */
export function createPromptTemplate(
  systemPrompt: string,
  userMessage: string
): { role: string; content: string }[] {
  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ]
}

/**
 * 토큰 수 추정 (대략적인 계산)
 * 평균적으로 영어 4자 = 1토큰, 한글 2자 = 1토큰
 */
export function estimateTokenCount(text: string): number {
  const koreanChars = (text.match(/[\uac00-\ud7af]/g) || []).length
  const otherChars = text.length - koreanChars

  return Math.ceil(koreanChars / 2 + otherChars / 4)
}

/**
 * 스타일 캐시 키 생성
 */
export function generateStyleCacheKey(
  tenantId: string,
  personaId: string,
  contentType: string
): string {
  return `${tenantId}:${personaId}:${contentType}`
}
