import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * DELETE /api/public/posts/[postId]/comments/[commentId]
 *
 * 본인 댓글 삭제.
 *
 * Body:
 * - userId: string (필수 — 본인 확인)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const { postId, commentId } = await params
    const body = await request.json()
    const { userId } = body as { userId?: string }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    // 댓글 조회 — 본인 확인
    const comment = await prisma.personaComment.findUnique({
      where: { id: commentId, postId },
      select: { id: true, userId: true, isHidden: true },
    })

    if (!comment) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "댓글을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    if (comment.userId !== userId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "본인 댓글만 삭제할 수 있습니다" } },
        { status: 403 }
      )
    }

    // 댓글 삭제 + commentCount 감소 (트랜잭션)
    await prisma.$transaction([
      prisma.personaComment.delete({ where: { id: commentId } }),
      prisma.personaPost.update({
        where: { id: postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ])

    return NextResponse.json({ success: true, data: { deleted: true, commentId } })
  } catch (error) {
    // P2025: 이미 삭제된 댓글
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ success: true, data: { deleted: true, commentId: "" } })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "DELETE_COMMENT_ERROR", message } },
      { status: 500 }
    )
  }
}
