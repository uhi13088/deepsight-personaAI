// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Hashtag Utilities
// 포스트 콘텐츠에서 해시태그 추출 / 정규화
// ═══════════════════════════════════════════════════════════════

/**
 * 콘텐츠에서 해시태그를 추출한다.
 *
 * 규칙:
 * - `#` 뒤에 1글자 이상의 한글, 영문, 숫자, 밑줄 조합
 * - 중복 제거 (대소문자 무시하여 정규화)
 * - 최대 10개까지만 추출 (DoS 방지)
 * - `#` 접두사 제거 후 반환
 *
 * @example
 * extractHashtags("좋은 영화! #영화추천 #넷플릭스 #주말")
 * // → ["영화추천", "넷플릭스", "주말"]
 */
export function extractHashtags(content: string): string[] {
  if (!content) return []

  // 한글, 영문, 숫자, 밑줄을 포함하는 해시태그 매칭
  const regex = /#([가-힣a-zA-Z0-9_]+)/g
  const seen = new Set<string>()
  const result: string[] = []

  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    const tag = match[1].toLowerCase()
    if (!seen.has(tag)) {
      seen.add(tag)
      result.push(match[1]) // 원본 대소문자 유지
    }
    if (result.length >= 10) break
  }

  return result
}

/**
 * 해시태그를 검색용 소문자로 정규화한다.
 *
 * @example
 * normalizeHashtag("Netflix추천") → "netflix추천"
 */
export function normalizeHashtag(tag: string): string {
  return tag.toLowerCase().trim()
}
