import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * POST /api/public/bookmarks
 *
 * 포스트 북마크 토글.
 *
 * Body:
 * - userId: string (필수)
 * - postId: string (필수)
 */
export async function POST(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, postId } = body as { userId?: string; postId?: string }

    if (!userId || !postId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId, postId 필요" } },
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

    const existing = await prisma.personaPostBookmark.findUnique({
      where: { userId_postId: { userId, postId } },
    })

    if (existing) {
      await prisma.personaPostBookmark.delete({ where: { id: existing.id } })
      return NextResponse.json({
        success: true,
        data: { bookmarked: false, postId },
      })
    }

    await prisma.personaPostBookmark.create({
      data: { userId, postId },
    })

    return NextResponse.json({
      success: true,
      data: { bookmarked: true, postId },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "BOOKMARK_ERROR", message } },
      { status: 500 }
    )
  }
}
