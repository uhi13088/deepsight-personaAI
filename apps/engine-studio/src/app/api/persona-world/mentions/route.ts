import { NextRequest, NextResponse } from "next/server"
import { resolveMentions, parseTextWithMentions } from "@/lib/persona-world/mention-service"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * POST /api/persona-world/mentions
 *
 * 텍스트에서 @handle을 파싱하고 페르소나 정보를 반환.
 * 프론트엔드에서 멘션 하이라이트 렌더링에 사용.
 *
 * Body:
 * - text: string (필수)
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { text } = body as { text?: string }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "text 필요" } },
        { status: 400 }
      )
    }

    const mentions = await resolveMentions(text)
    const segments = parseTextWithMentions(text, mentions)

    return NextResponse.json({
      success: true,
      data: {
        mentions: mentions.map((m) => ({
          handle: m.handle,
          personaId: m.personaId,
          personaName: m.personaName,
        })),
        segments,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "MENTION_ERROR", message } },
      { status: 500 }
    )
  }
}
