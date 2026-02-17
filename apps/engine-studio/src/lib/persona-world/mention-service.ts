// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Mention Service
// @handle 파싱 + 멘션 알림 생성
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma"
import { createNotification } from "./notification-service"

/**
 * @handle 패턴 정규식.
 * - @ 뒤에 영문/숫자/밑줄/한글 1~30자
 * - 문장 시작이나 공백 뒤에 위치
 */
const MENTION_REGEX = /(?:^|\s)@([a-zA-Z0-9_\uAC00-\uD7A3]{1,30})/g

export interface MentionInfo {
  handle: string
  personaId: string
  personaName: string
  startIndex: number
  endIndex: number
}

/**
 * 텍스트에서 @handle 추출.
 */
export function extractMentionHandles(text: string): string[] {
  const handles: string[] = []
  let match: RegExpExecArray | null

  // Reset regex state
  MENTION_REGEX.lastIndex = 0

  while ((match = MENTION_REGEX.exec(text)) !== null) {
    const handle = match[1]
    if (!handles.includes(handle)) {
      handles.push(handle)
    }
  }

  return handles
}

/**
 * 추출된 핸들을 DB에서 조회하여 실제 페르소나 매칭.
 */
export async function resolveMentions(text: string): Promise<MentionInfo[]> {
  const handles = extractMentionHandles(text)
  if (handles.length === 0) return []

  const personas = await prisma.persona.findMany({
    where: { handle: { in: handles } },
    select: { id: true, name: true, handle: true },
  })

  const mentions: MentionInfo[] = []

  for (const persona of personas) {
    if (!persona.handle) continue

    // 텍스트에서 해당 핸들의 위치 찾기
    const pattern = new RegExp(`@${escapeRegex(persona.handle)}`, "g")
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      mentions.push({
        handle: persona.handle,
        personaId: persona.id,
        personaName: persona.name,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      })
    }
  }

  return mentions
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * 멘션된 페르소나의 팔로워들에게 알림 전송 (fire-and-forget).
 */
export async function notifyMentions(params: {
  mentions: MentionInfo[]
  mentionerName: string
  postId?: string
  commentId?: string
}): Promise<void> {
  for (const mention of params.mentions) {
    // 멘션된 페르소나의 팔로워 유저들에게 알림
    const followers = await prisma.personaFollow.findMany({
      where: { followingPersonaId: mention.personaId, followerUserId: { not: null } },
      select: { followerUserId: true },
      take: 100,
    })

    for (const f of followers) {
      if (f.followerUserId) {
        void createNotification({
          userId: f.followerUserId,
          type: "mention",
          message: `${params.mentionerName}님이 ${mention.personaName}을(를) 멘션했습니다`,
          personaId: mention.personaId,
          personaName: mention.personaName,
          postId: params.postId,
          commentId: params.commentId,
        })
      }
    }
  }
}

/**
 * 텍스트에서 @handle 부분을 하이라이트용 마크업으로 변환.
 * 프론트엔드에서 사용할 수 있는 구조화된 세그먼트 반환.
 */
export interface TextSegment {
  type: "text" | "mention"
  content: string
  personaId?: string
  handle?: string
}

export function parseTextWithMentions(
  text: string,
  resolvedMentions: MentionInfo[]
): TextSegment[] {
  if (resolvedMentions.length === 0) {
    return [{ type: "text", content: text }]
  }

  // 위치순 정렬
  const sorted = [...resolvedMentions].sort((a, b) => a.startIndex - b.startIndex)
  const segments: TextSegment[] = []
  let cursor = 0

  for (const mention of sorted) {
    // 멘션 앞의 일반 텍스트
    if (mention.startIndex > cursor) {
      segments.push({ type: "text", content: text.slice(cursor, mention.startIndex) })
    }

    segments.push({
      type: "mention",
      content: text.slice(mention.startIndex, mention.endIndex),
      personaId: mention.personaId,
      handle: mention.handle,
    })

    cursor = mention.endIndex
  }

  // 마지막 멘션 이후 남은 텍스트
  if (cursor < text.length) {
    segments.push({ type: "text", content: text.slice(cursor) })
  }

  return segments
}
