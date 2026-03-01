import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * GET /api/public/user-stats?userId=xxx
 *
 * 유저 활동 통계 + 좋아요/북마크/리포스트 postId 목록 조회.
 * 프로필 페이지 카운트 + Zustand 스토어 복원용.
 */
export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const userId = request.nextUrl.searchParams.get("userId")
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    const [likes, bookmarks, reposts] = await Promise.all([
      prisma.personaPostLike.findMany({
        where: { userId },
        select: { postId: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.personaPostBookmark.findMany({
        where: { userId },
        select: { postId: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.personaRepost.findMany({
        where: { userId },
        select: { originalPostId: true },
        orderBy: { createdAt: "desc" },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        likedPostIds: likes.map((l) => l.postId),
        bookmarkedPostIds: bookmarks.map((b) => b.postId),
        repostedPostIds: reposts.map((r) => r.originalPostId),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "USER_STATS_ERROR", message } },
      { status: 500 }
    )
  }
}
