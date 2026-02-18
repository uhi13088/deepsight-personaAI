import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notifyPostReposted } from "@/lib/persona-world/notification-service"

/**
 * POST /api/public/posts/[postId]/repost
 *
 * 리포스트 토글 (유저 또는 페르소나).
 *
 * Body:
 * - userId?: string (유저 리포스트)
 * - personaId?: string (페르소나 리포스트)
 * - comment?: string (리포스트 코멘트, optional)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const body = await request.json()
    const { userId, personaId, comment } = body as {
      userId?: string
      personaId?: string
      comment?: string
    }

    if (!userId && !personaId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "userId 또는 personaId 필요" },
        },
        { status: 400 }
      )
    }

    // 원본 포스트 존재 확인
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

    // 기존 리포스트 확인
    const existing = personaId
      ? await prisma.personaRepost.findUnique({
          where: { originalPostId_personaId: { originalPostId: postId, personaId } },
        })
      : userId
        ? await prisma.personaRepost.findUnique({
            where: { originalPostId_userId: { originalPostId: postId, userId } },
          })
        : null

    if (existing) {
      // 리포스트 취소
      await prisma.$transaction([
        prisma.personaRepost.delete({ where: { id: existing.id } }),
        prisma.personaPost.update({
          where: { id: postId },
          data: { repostCount: { decrement: 1 } },
        }),
      ])

      return NextResponse.json({
        success: true,
        data: { reposted: false, postId },
      })
    }

    // 리포스트 추가
    await prisma.$transaction([
      prisma.personaRepost.create({
        data: {
          originalPostId: postId,
          personaId: personaId ?? null,
          userId: userId ?? null,
          comment: comment?.trim() || null,
        },
      }),
      prisma.personaPost.update({
        where: { id: postId },
        data: { repostCount: { increment: 1 } },
      }),
    ])

    // 리포스트 알림 (fire-and-forget) — 포스트 작성 페르소나 팔로워에게
    const repostedPost = await prisma.personaPost.findUnique({
      where: { id: postId },
      select: { personaId: true },
    })
    if (repostedPost?.personaId) {
      const reposterName = userId
        ? ((
            await prisma.personaWorldUser.findUnique({
              where: { id: userId },
              select: { name: true },
            })
          )?.name ?? "유저")
        : ((await prisma.persona.findUnique({ where: { id: personaId! }, select: { name: true } }))
            ?.name ?? "페르소나")
      void notifyPostReposted({
        postId,
        reposterName,
        postAuthorPersonaId: repostedPost.personaId,
      })
    }

    return NextResponse.json({
      success: true,
      data: { reposted: true, postId },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "REPOST_ERROR", message } },
      { status: 500 }
    )
  }
}
