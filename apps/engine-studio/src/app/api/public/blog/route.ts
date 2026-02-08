import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/public/blog - 공개 블로그 포스트 목록
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50)
    const page = parseInt(searchParams.get("page") || "1")
    const category = searchParams.get("category")

    const where = {
      published: true,
      ...(category
        ? { category: category as "TECH" | "PRODUCT" | "INSIGHT" | "ANNOUNCEMENT" }
        : {}),
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          coverImageUrl: true,
          category: true,
          tags: true,
          publishedAt: true,
          viewCount: true,
          author: {
            select: { name: true },
          },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        posts: posts.map((p) => ({
          ...p,
          authorName: p.author.name,
          author: undefined,
        })),
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/public/blog error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "블로그 조회에 실패했습니다" } },
      { status: 500 }
    )
  }
}
