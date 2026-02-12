import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: { author: { select: { name: true } } },
    })

    if (!post || !post.published) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Post not found" } },
        { status: 404 }
      )
    }

    // viewCount 비동기 증가 (응답 차단 안 함)
    prisma.blogPost
      .update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {})

    return NextResponse.json({
      success: true,
      data: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverImageUrl: post.coverImageUrl,
        category: post.category,
        tags: post.tags,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        viewCount: post.viewCount,
        authorName: post.author.name ?? "DeepSight",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "BLOG_DETAIL_ERROR", message } },
      { status: 500 }
    )
  }
}
