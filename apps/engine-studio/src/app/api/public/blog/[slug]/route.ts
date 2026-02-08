import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/public/blog/:slug - 블로그 포스트 상세
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const post = await prisma.blogPost.findUnique({
      where: { slug, published: true },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        coverImageUrl: true,
        category: true,
        tags: true,
        publishedAt: true,
        viewCount: true,
        author: {
          select: { name: true },
        },
      },
    })

    if (!post) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "포스트를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 조회수 증가 (비동기)
    prisma.blogPost
      .update({ where: { slug }, data: { viewCount: { increment: 1 } } })
      .catch(() => {})

    return NextResponse.json({
      success: true,
      data: {
        ...post,
        authorName: post.author.name,
        author: undefined,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/public/blog/[slug] error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "포스트 조회에 실패했습니다" } },
      { status: 500 }
    )
  }
}
