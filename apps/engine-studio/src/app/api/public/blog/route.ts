import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const limit = Math.min(Number(searchParams.get("limit") || "10"), 50)
    const page = Math.max(Number(searchParams.get("page") || "1"), 1)
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
          author: { select: { name: true } },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ])

    const data = {
      posts: posts.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        content: "",
        coverImageUrl: p.coverImageUrl,
        category: p.category,
        tags: p.tags,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        viewCount: p.viewCount,
        authorName: p.author.name ?? "DeepSight",
      })),
      total,
      page,
      hasMore: page * limit < total,
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "BLOG_LIST_ERROR", message } },
      { status: 500 }
    )
  }
}
