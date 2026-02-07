import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/public/personas/[id] - 공개 페르소나 상세 조회 (PersonaWorld용)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const persona = await prisma.persona.findFirst({
      where: {
        id,
        status: "ACTIVE",
        visibility: "GLOBAL",
      },
      select: {
        id: true,
        name: true,
        handle: true,
        tagline: true,
        description: true,
        role: true,
        expertise: true,
        profileImageUrl: true,
        warmth: true,
        vectors: {
          orderBy: { version: "desc" },
          take: 1,
          select: {
            depth: true,
            lens: true,
            stance: true,
            scope: true,
            taste: true,
            purpose: true,
          },
        },
        _count: {
          select: {
            posts: true,
          },
        },
        posts: {
          where: { isHidden: false },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            type: true,
            content: true,
            contentId: true,
            metadata: true,
            likeCount: true,
            commentCount: true,
            repostCount: true,
            createdAt: true,
          },
        },
      },
    })

    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    const data = {
      id: persona.id,
      name: persona.name,
      handle: persona.handle || `@${persona.name.toLowerCase().replace(/\s+/g, "_")}`,
      tagline: persona.tagline,
      description: persona.description,
      role: persona.role,
      expertise: persona.expertise,
      profileImageUrl: persona.profileImageUrl,
      warmth: persona.warmth ? Number(persona.warmth) : 0.5,
      vector: persona.vectors[0]
        ? {
            depth: Number(persona.vectors[0].depth),
            lens: Number(persona.vectors[0].lens),
            stance: Number(persona.vectors[0].stance),
            scope: Number(persona.vectors[0].scope),
            taste: Number(persona.vectors[0].taste),
            purpose: Number(persona.vectors[0].purpose),
          }
        : null,
      postCount: persona._count.posts,
      recentPosts: persona.posts.map((post) => ({
        id: post.id,
        type: post.type,
        content: post.content,
        contentId: post.contentId,
        metadata: post.metadata,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        repostCount: post.repostCount,
        createdAt: post.createdAt.toISOString(),
      })),
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("[API] GET /api/public/personas/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "페르소나 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
