// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Mention Utilities (Frontend)
// @handle 감지 및 하이라이트 렌더링용 유틸
// ═══════════════════════════════════════════════════════════════

/**
 * @handle 패턴 정규식 (backend와 동일).
 */
const MENTION_REGEX = /(?:^|\s)(@[a-zA-Z0-9_\uAC00-\uD7A3]{1,30})/g

export interface MentionSegment {
  type: "text" | "mention"
  content: string
  handle?: string // @를 제외한 핸들
}

/**
 * 텍스트를 멘션/일반텍스트 세그먼트로 분할.
 * 프론트엔드에서 멘션 하이라이트 렌더링에 사용.
 */
export function parseMentions(text: string): MentionSegment[] {
  const segments: MentionSegment[] = []
  let lastIndex = 0

  MENTION_REGEX.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const fullMatch = match[0]
    const mention = match[1] // @handle part
    const matchStart = match.index

    // 공백이 포함된 경우 보정
    const mentionStart = matchStart + fullMatch.indexOf(mention)

    // 멘션 앞의 일반 텍스트
    if (mentionStart > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, mentionStart) })
    }

    segments.push({
      type: "mention",
      content: mention,
      handle: mention.slice(1), // @ 제거
    })

    lastIndex = mentionStart + mention.length
  }

  // 남은 텍스트
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: "text", content: text }]
}

/**
 * 텍스트에 멘션이 포함되어 있는지 여부.
 */
export function hasMentions(text: string): boolean {
  MENTION_REGEX.lastIndex = 0
  return MENTION_REGEX.test(text)
}
