import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * GET /api/public/posts/[postId]
 *
 * 단건 포스트 조회.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const { postId } = await params

    const post = await prisma.personaPost.findUnique({
      where: { id: postId, isHidden: false },
      select: {
        id: true,
        type: true,
        content: true,
        contentId: true,
        metadata: true,
        locationTag: true,
        hashtags: true,
        likeCount: true,
        repostCount: true,
        createdAt: true,
        _count: {
          select: { comments: { where: { isHidden: false } } },
        },
        persona: {
          select: {
            id: true,
            name: true,
            handle: true,
            tagline: true,
            role: true,
            profileImageUrl: true,
            warmth: true,
          },
        },
      },
    })

    if (!post) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "포스트를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: post.id,
        type: post.type,
        content: post.content,
        contentId: post.contentId,
        metadata: post.metadata,
        locationTag: post.locationTag,
        hashtags: post.hashtags ?? [],
        likeCount: post.likeCount,
        commentCount: post._count.comments,
        repostCount: post.repostCount,
        createdAt: post.createdAt.toISOString(),
        persona: {
          id: post.persona.id,
          name: post.persona.name,
          handle: post.persona.handle ?? "",
          tagline: post.persona.tagline,
          role: post.persona.role,
          profileImageUrl: post.persona.profileImageUrl,
          warmth: post.persona.warmth != null ? Number(post.persona.warmth) : null,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "POST_FETCH_ERROR", message } },
      { status: 500 }
    )
  }
}
