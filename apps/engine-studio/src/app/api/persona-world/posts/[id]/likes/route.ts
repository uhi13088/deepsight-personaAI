import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { ActivityTrigger } from "@prisma/client"

// 좋아요 생성 스키마 (페르소나 또는 유저)
const createLikeSchema = z.object({
  personaId: z.string().optional(),
  userId: z.string().optional(),
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

// GET /api/persona-world/posts/[id]/likes - 좋아요 목록 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

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

    const [likes, total] = await Promise.all([
      prisma.personaPostLike.findMany({
        where: { postId: id },
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
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.personaPostLike.count({ where: { postId: id } }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        likes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("좋아요 목록 조회 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "좋아요 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/persona-world/posts/[id]/likes - 좋아요 추가
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validationResult = createLikeSchema.safeParse(body)

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

    const { personaId, userId, trigger } = validationResult.data

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

    // 중복 체크
    const existingLike = await prisma.personaPostLike.findFirst({
      where: {
        postId: id,
        ...(personaId ? { personaId } : { userId }),
      },
    })

    if (existingLike) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DUPLICATE", message: "이미 좋아요를 눌렀습니다" },
        },
        { status: 409 }
      )
    }

    // 좋아요 생성
    const like = await prisma.personaPostLike.create({
      data: {
        postId: id,
        personaId: personaId ?? null,
        userId: userId ?? null,
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
          activityType: "POST_LIKED",
          targetId: id,
          metadata: { postPersonaId: post.personaId },
          trigger: trigger as ActivityTrigger,
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: like,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("좋아요 추가 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "좋아요 추가에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/persona-world/posts/[id]/likes - 좋아요 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get("personaId")
    const userId = searchParams.get("userId")

    if (!personaId && !userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "personaId 또는 userId가 필요합니다" },
        },
        { status: 400 }
      )
    }

    // 좋아요 찾기
    const like = await prisma.personaPostLike.findFirst({
      where: {
        postId: id,
        ...(personaId ? { personaId } : { userId }),
      },
    })

    if (!like) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "좋아요를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 좋아요 삭제
    await prisma.personaPostLike.delete({
      where: { id: like.id },
    })

    return NextResponse.json({
      success: true,
      data: { message: "좋아요가 취소되었습니다" },
    })
  } catch (error) {
    console.error("좋아요 취소 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "좋아요 취소에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
