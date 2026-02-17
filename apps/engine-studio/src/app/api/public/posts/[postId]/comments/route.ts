import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notifyNewComment } from "@/lib/persona-world/notification-service"

/**
 * GET /api/public/posts/[postId]/comments
 *
 * 포스트 댓글 목록 API — 페르소나 댓글 + 유저 댓글 모두 반환.
 * tone은 현재 content 기반 간이 분류 (T162에서 벡터 기반으로 업그레이드 예정).
 *
 * Query Parameters:
 * - limit: 조회 개수 (최대 50, 기본 20)
 * - cursor: 페이지네이션 커서 (마지막 댓글 ID)
 */

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
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const { searchParams } = request.nextUrl
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 50)
    const cursor = searchParams.get("cursor")

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
      where: { postId, isHidden: false },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        content: true,
        createdAt: true,
        parentId: true,
        personaId: true,
        userId: true,
        persona: {
          select: {
            id: true,
            name: true,
            handle: true,
            role: true,
            profileImageUrl: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
    })

    const hasMore = comments.length > limit
    const sliced = hasMore ? comments.slice(0, limit) : comments
    const nextCursor = hasMore ? (sliced[sliced.length - 1]?.id ?? null) : null

    return NextResponse.json({
      success: true,
      data: {
        comments: sliced.map((c) => {
          const isPersona = c.persona != null
          return {
            id: c.id,
            postId,
            personaId: isPersona ? c.persona!.id : null,
            personaName: isPersona ? c.persona!.name : (c.user?.name ?? "익명"),
            personaHandle: isPersona ? (c.persona!.handle ?? "") : "",
            personaRole: isPersona ? c.persona!.role : "USER",
            personaImageUrl: isPersona
              ? c.persona!.profileImageUrl
              : (c.user?.profileImageUrl ?? null),
            userId: c.userId,
            content: c.content,
            tone: classifyTone(c.content),
            parentId: c.parentId,
            likeCount: 0,
            createdAt: c.createdAt.toISOString(),
          }
        }),
        total: sliced.length,
        nextCursor,
        hasMore,
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

/**
 * POST /api/public/posts/[postId]/comments
 *
 * 유저 댓글 작성 API.
 *
 * Body:
 * - userId: string (필수)
 * - content: string (필수, 1~1000자)
 * - parentId?: string (답글인 경우 부모 댓글 ID)
 */

const MAX_COMMENT_LENGTH = 1000

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const body = await request.json()
    const { userId, content, parentId } = body as {
      userId?: string
      content?: string
      parentId?: string
    }

    // 입력 검증
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "댓글 내용을 입력해주세요" } },
        { status: 400 }
      )
    }

    const trimmedContent = content.trim()
    if (trimmedContent.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONTENT_TOO_LONG",
            message: `댓글은 ${MAX_COMMENT_LENGTH}자 이내로 작성해주세요`,
          },
        },
        { status: 400 }
      )
    }

    // 포스트 존재 확인
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

    // 유저 존재 확인
    const user = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
      select: { id: true, name: true, profileImageUrl: true },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "유저를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 부모 댓글 존재 확인 (답글인 경우)
    if (parentId) {
      const parentComment = await prisma.personaComment.findUnique({
        where: { id: parentId, postId },
        select: { id: true },
      })
      if (!parentComment) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "부모 댓글을 찾을 수 없습니다" },
          },
          { status: 404 }
        )
      }
    }

    // 댓글 생성 + commentCount 업데이트 (트랜잭션)
    const [comment] = await prisma.$transaction([
      prisma.personaComment.create({
        data: {
          postId,
          userId,
          content: trimmedContent,
          parentId: parentId ?? null,
        },
        select: {
          id: true,
          content: true,
          parentId: true,
          createdAt: true,
        },
      }),
      prisma.personaPost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ])

    // 댓글 알림 (fire-and-forget) — 포스트 작성 페르소나 팔로워에게
    const postForNotif = await prisma.personaPost.findUnique({
      where: { id: postId },
      select: { personaId: true },
    })
    if (postForNotif?.personaId) {
      void notifyNewComment({
        postId,
        commentId: comment.id,
        commenterName: user.name ?? "유저",
        postAuthorPersonaId: postForNotif.personaId,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: comment.id,
        postId,
        personaId: null,
        personaName: user.name ?? "익명",
        personaHandle: "",
        personaRole: "USER",
        personaImageUrl: user.profileImageUrl,
        userId,
        content: comment.content,
        tone: classifyTone(comment.content),
        parentId: comment.parentId,
        likeCount: 0,
        createdAt: comment.createdAt.toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "COMMENT_CREATE_ERROR", message } },
      { status: 500 }
    )
  }
}
