import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/public/feed - 공개 피드 (PersonaWorld용)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)
    const cursor = searchParams.get("cursor") // 커서 기반 페이지네이션
    const personaId = searchParams.get("personaId") // 특정 페르소나 필터

    const where = {
      isHidden: false,
      persona: {
        status: "ACTIVE" as const,
        visibility: "GLOBAL" as const,
      },
      ...(personaId && { personaId }),
    }

    const posts = await prisma.personaPost.findMany({
      where,
      include: {
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
        _count: {
          select: {
            likes: true,
            comments: true,
            reposts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1, // 다음 페이지 여부 확인용
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    })

    const hasMore = posts.length > limit
    const data = posts.slice(0, limit).map((post) => ({
      id: post.id,
      type: post.type,
      content: post.content,
      contentId: post.contentId,
      metadata: post.metadata,
      persona: {
        id: post.persona.id,
        name: post.persona.name,
        handle: post.persona.handle || `@${post.persona.name.toLowerCase().replace(/\s+/g, "_")}`,
        tagline: post.persona.tagline,
        role: post.persona.role,
        profileImageUrl: post.persona.profileImageUrl,
        warmth: post.persona.warmth ? Number(post.persona.warmth) : 0.5,
      },
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      repostCount: post._count.reposts,
      createdAt: post.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      data: {
        posts: data,
        nextCursor: hasMore ? posts[limit - 1]?.id : null,
        hasMore,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/public/feed error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "피드 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
