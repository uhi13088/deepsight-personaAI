import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * GET /api/public/user-activity?userId=xxx&type=likes|bookmarks|reposts&limit=20&cursor=xxx
 *
 * 유저의 좋아요/저장/리포스트 포스트 목록 조회.
 */

const postSelect = {
  id: true,
  type: true,
  content: true,
  contentId: true,
  metadata: true,
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
} as const

type PostRow = Awaited<
  ReturnType<typeof prisma.personaPost.findMany<{ select: typeof postSelect }>>
>[number]

function formatPost(p: PostRow) {
  return {
    id: p.id,
    type: p.type,
    content: p.content,
    contentId: p.contentId,
    metadata: p.metadata,
    hashtags: p.hashtags ?? [],
    likeCount: p.likeCount,
    commentCount: p._count.comments,
    repostCount: p.repostCount,
    createdAt: p.createdAt.toISOString(),
    persona: {
      id: p.persona.id,
      name: p.persona.name,
      handle: p.persona.handle ?? "",
      tagline: p.persona.tagline,
      role: p.persona.role,
      profileImageUrl: p.persona.profileImageUrl,
      warmth: p.persona.warmth != null ? Number(p.persona.warmth) : null,
    },
  }
}

export async function GET(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const type = searchParams.get("type") // likes | bookmarks | reposts
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50)
    const cursor = searchParams.get("cursor")

    if (!userId || !type) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId, type 필요" } },
        { status: 400 }
      )
    }

    if (!["likes", "bookmarks", "reposts"].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_REQUEST", message: "type은 likes, bookmarks, reposts 중 하나" },
        },
        { status: 400 }
      )
    }

    let postIds: string[] = []

    if (type === "likes") {
      const likes = await prisma.personaPostLike.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, postId: true },
      })
      postIds = likes.map((l) => l.postId)
    } else if (type === "bookmarks") {
      const bookmarks = await prisma.personaPostBookmark.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, postId: true },
      })
      postIds = bookmarks.map((b) => b.postId)
    } else {
      const reposts = await prisma.personaRepost.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: { id: true, originalPostId: true },
      })
      postIds = reposts.map((r) => r.originalPostId)
    }

    const hasMore = postIds.length > limit
    if (hasMore) postIds = postIds.slice(0, limit)

    // postIds 순서 유지하며 포스트 조회
    const posts =
      postIds.length > 0
        ? await prisma.personaPost.findMany({
            where: { id: { in: postIds } },
            select: postSelect,
          })
        : []

    // postIds 순서대로 정렬
    const postMap = new Map(posts.map((p) => [p.id, p]))
    const ordered = postIds.map((id) => postMap.get(id)).filter(Boolean) as PostRow[]

    return NextResponse.json({
      success: true,
      data: {
        posts: ordered.map(formatPost),
        hasMore,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "USER_ACTIVITY_ERROR", message } },
      { status: 500 }
    )
  }
}
