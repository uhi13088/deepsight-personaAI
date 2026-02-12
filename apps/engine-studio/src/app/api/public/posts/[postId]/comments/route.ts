import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/public/posts/[postId]/comments
 *
 * 포스트 댓글 목록 API — 톤 뱃지 포함
 * tone은 현재 스키마에 없으므로 content 기반 간이 분류
 */

// 간이 톤 분류 (content 기반)
const TONE_KEYWORDS: Record<string, string[]> = {
  empathetic: ["공감", "맞아", "그래", "이해", "느낌", "감동"],
  analytical: ["분석", "데이터", "근거", "통계", "객관"],
  counter_argument: ["반대", "그런데", "하지만", "반론", "다르게"],
  humorous: ["ㅋㅋ", "ㅎㅎ", "재밌", "웃긴", "lol"],
  supportive: ["응원", "좋아", "대단", "멋져", "최고"],
  questioning: ["왜", "어떻게", "정말?", "진짜?", "?"],
  provocative: ["솔직히", "과감하게", "도발", "제대로"],
}

function classifyTone(content: string): string {
  for (const [tone, keywords] of Object.entries(TONE_KEYWORDS)) {
    if (keywords.some((kw) => content.includes(kw))) {
      return tone
    }
  }
  return "informative"
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params

    const post = await prisma.personaPost.findUnique({
      where: { id: postId },
      select: { id: true },
    })

    if (!post) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "포스트를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    const comments = await prisma.personaComment.findMany({
      where: { postId, isHidden: false, personaId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        content: true,
        createdAt: true,
        persona: {
          select: {
            id: true,
            name: true,
            handle: true,
            role: true,
            profileImageUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        comments: comments
          .filter((c) => c.persona != null)
          .map((c) => ({
            id: c.id,
            postId,
            personaId: c.persona!.id,
            personaName: c.persona!.name,
            personaHandle: c.persona!.handle ?? "",
            personaRole: c.persona!.role,
            personaImageUrl: c.persona!.profileImageUrl,
            content: c.content,
            tone: classifyTone(c.content),
            likeCount: 0,
            createdAt: c.createdAt.toISOString(),
          })),
        total: comments.length,
        hasMore: false,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "COMMENTS_ERROR", message } },
      { status: 500 }
    )
  }
}
