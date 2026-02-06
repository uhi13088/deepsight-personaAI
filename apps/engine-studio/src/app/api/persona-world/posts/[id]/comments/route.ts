import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { ActivityTrigger } from "@prisma/client"

// 댓글 생성 스키마
const createCommentSchema = z.object({
  content: z.string().min(1, "내용은 필수입니다"),
  personaId: z.string().optional(),
  userId: z.string().optional(),
  parentId: z.string().optional(), // 답글인 경우
  trigger: z
    .enum([
      "SCHEDULED",
      "CONTENT_RELEASE",
      "SOCIAL_EVENT",
      "USER_INTERACTION",
      "TRENDING",
      "AUTONOMOUS",
    ])
    .default("AUTONOMOUS"),
})

// GET /api/persona-world/posts/[id]/comments - 댓글 목록 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
    const includeReplies = searchParams.get("includeReplies") === "true"

    // 포스트 존재 확인
    const post = await prisma.personaPost.findUnique({
      where: { id },
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

    // 최상위 댓글만 조회 (답글은 별도 요청 또는 includeReplies)
    const where = {
      postId: id,
      isHidden: false,
      parentId: null, // 최상위 댓글만
    }

    const [comments, total] = await Promise.all([
      prisma.personaComment.findMany({
        where,
        include: {
          persona: {
            select: {
              id: true,
              name: true,
              handle: true,
              profileImageUrl: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              profileImageUrl: true,
            },
          },
          ...(includeReplies
            ? {
                replies: {
                  where: { isHidden: false },
                  orderBy: { createdAt: "asc" as const },
                  take: 5,
                  include: {
                    persona: {
                      select: {
                        id: true,
                        name: true,
                        handle: true,
                        profileImageUrl: true,
                      },
                    },
                    user: {
                      select: {
                        id: true,
                        name: true,
                        profileImageUrl: true,
                      },
                    },
                    _count: {
                      select: { replies: true },
                    },
                  },
                },
              }
            : {}),
          _count: {
            select: { replies: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.personaComment.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        comments: comments.map((comment) => ({
          ...comment,
          replyCount: comment._count.replies,
          _count: undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("댓글 목록 조회 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "댓글 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/persona-world/posts/[id]/comments - 댓글 작성
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validationResult = createCommentSchema.safeParse(body)

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

    const { content, personaId, userId, parentId, trigger } = validationResult.data

    // personaId 또는 userId 둘 중 하나는 필수
    if (!personaId && !userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "personaId 또는 userId가 필요합니다" },
        },
        { status: 400 }
      )
    }

    if (personaId && userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "personaId와 userId 중 하나만 지정해야 합니다",
          },
        },
        { status: 400 }
      )
    }

    // 포스트 존재 확인
    const post = await prisma.personaPost.findUnique({
      where: { id },
    })

    if (!post || post.isHidden) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "포스트를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 답글인 경우 부모 댓글 확인
    if (parentId) {
      const parentComment = await prisma.personaComment.findUnique({
        where: { id: parentId },
      })

      if (!parentComment || parentComment.postId !== id) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "부모 댓글을 찾을 수 없습니다" },
          },
          { status: 404 }
        )
      }
    }

    // 댓글 생성
    const comment = await prisma.personaComment.create({
      data: {
        postId: id,
        content,
        personaId: personaId ?? null,
        userId: userId ?? null,
        parentId: parentId ?? null,
      },
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            handle: true,
            profileImageUrl: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
    })

    // 페르소나인 경우 활동 로그 기록
    if (personaId) {
      await prisma.personaActivityLog.create({
        data: {
          personaId,
          activityType: "POST_COMMENTED",
          targetId: id,
          metadata: { commentId: comment.id, postPersonaId: post.personaId },
          trigger: trigger as ActivityTrigger,
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: comment,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("댓글 작성 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "댓글 작성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/persona-world/posts/[id]/comments - 댓글 수정 (commentId query param)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get("commentId")

    if (!commentId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "commentId가 필요합니다" },
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "내용은 필수입니다" },
        },
        { status: 400 }
      )
    }

    const existingComment = await prisma.personaComment.findUnique({
      where: { id: commentId },
    })

    if (!existingComment) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "댓글을 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    const updatedComment = await prisma.personaComment.update({
      where: { id: commentId },
      data: { content },
      include: {
        persona: {
          select: {
            id: true,
            name: true,
            handle: true,
            profileImageUrl: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            profileImageUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedComment,
    })
  } catch (error) {
    console.error("댓글 수정 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "댓글 수정에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/persona-world/posts/[id]/comments - 댓글 삭제 (commentId query param)
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

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get("commentId")

    if (!commentId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "commentId가 필요합니다" },
        },
        { status: 400 }
      )
    }

    const existingComment = await prisma.personaComment.findUnique({
      where: { id: commentId },
    })

    if (!existingComment) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "댓글을 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 숨김 처리 (soft delete)
    await prisma.personaComment.update({
      where: { id: commentId },
      data: {
        isHidden: true,
        hiddenAt: new Date(),
        hiddenBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: "댓글이 삭제되었습니다" },
    })
  } catch (error) {
    console.error("댓글 삭제 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "댓글 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
