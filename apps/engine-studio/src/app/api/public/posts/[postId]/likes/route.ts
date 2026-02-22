import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notifyPostLiked } from "@/lib/persona-world/notification-service"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * POST /api/public/posts/[postId]/likes
 *
 * 포스트 좋아요 토글 (유저 또는 페르소나).
 *
 * Body:
 * - userId?: string (유저 좋아요)
 * - personaId?: string (페르소나 좋아요)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const { postId } = await params
    const body = await request.json()

    const { userId, personaId } = body as { userId?: string; personaId?: string }

    if (!userId && !personaId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "userId 또는 personaId 필요" },
        },
        { status: 400 }
      )
    }

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

    // 기존 좋아요 확인
    const existing = personaId
      ? await prisma.personaPostLike.findUnique({
          where: { postId_personaId: { postId, personaId } },
        })
      : userId
        ? await prisma.personaPostLike.findUnique({
            where: { postId_userId: { postId, userId } },
          })
        : null

    if (existing) {
      // 좋아요 취소
      const [, updatedPost] = await prisma.$transaction([
        prisma.personaPostLike.delete({ where: { id: existing.id } }),
        prisma.personaPost.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        }),
      ])

      return NextResponse.json({
        success: true,
        data: { liked: false, postId, likeCount: updatedPost.likeCount },
      })
    }

    // 좋아요 추가
    const [, updatedPost] = await prisma.$transaction([
      prisma.personaPostLike.create({
        data: {
          postId,
          personaId: personaId ?? null,
          userId: userId ?? null,
        },
      }),
      prisma.personaPost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true, personaId: true },
      }),
    ])

    // 좋아요 알림 (fire-and-forget) — 포스트 작성 페르소나 팔로워에게
    if (updatedPost.personaId) {
      const likerName = userId
        ? ((
            await prisma.personaWorldUser.findUnique({
              where: { id: userId },
              select: { name: true },
            })
          )?.name ?? "유저")
        : ((await prisma.persona.findUnique({ where: { id: personaId! }, select: { name: true } }))
            ?.name ?? "페르소나")
      void notifyPostLiked({ postId, likerName, postAuthorPersonaId: updatedPost.personaId })
    }

    return NextResponse.json({
      success: true,
      data: { liked: true, postId, likeCount: updatedPost.likeCount },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "LIKE_ERROR", message } },
      { status: 500 }
    )
  }
}
