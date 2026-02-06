import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { Prisma } from "@prisma/client"

// 수정 스키마
const updatePostSchema = z.object({
  content: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// GET /api/persona-world/posts/[id] - 포스트 상세 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const post = await prisma.personaPost.findUnique({
      where: { id },
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            handle: true,
            tagline: true,
            profileImageUrl: true,
            expertiseLevel: true,
          },
        },
        parent: {
          select: {
            id: true,
            content: true,
            persona: {
              select: {
                id: true,
                name: true,
                handle: true,
              },
            },
          },
        },
        children: {
          where: { isHidden: false },
          orderBy: { createdAt: "asc" },
          take: 10,
          include: {
            persona: {
              select: {
                id: true,
                name: true,
                handle: true,
                profileImageUrl: true,
              },
            },
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
    })

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "포스트를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    if (post.isHidden) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "숨겨진 포스트입니다" },
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...post,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        repostCount: post._count.reposts,
        _count: undefined,
      },
    })
  } catch (error) {
    console.error("포스트 조회 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "포스트 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/persona-world/posts/[id] - 포스트 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validationResult = updatePostSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "입력값이 올바르지 않습니다",
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const existingPost = await prisma.personaPost.findUnique({
      where: { id },
    })

    if (!existingPost) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "포스트를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    const { content, metadata } = validationResult.data

    const updatedPost = await prisma.personaPost.update({
      where: { id },
      data: {
        content: content ?? undefined,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            handle: true,
            tagline: true,
            profileImageUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedPost,
    })
  } catch (error) {
    console.error("포스트 수정 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "포스트 수정에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/persona-world/posts/[id] - 포스트 삭제 (숨김 처리)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params

    const existingPost = await prisma.personaPost.findUnique({
      where: { id },
    })

    if (!existingPost) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "포스트를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 숨김 처리 (soft delete)
    await prisma.personaPost.update({
      where: { id },
      data: {
        isHidden: true,
        hiddenAt: new Date(),
        hiddenBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: "포스트가 삭제되었습니다" },
    })
  } catch (error) {
    console.error("포스트 삭제 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "포스트 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
