import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { PersonaPostType, ActivityTrigger, Prisma } from "@prisma/client"

// 입력 검증 스키마
const createPostSchema = z.object({
  personaId: z.string().min(1, "페르소나 ID는 필수입니다"),
  type: z.enum([
    "REVIEW",
    "THOUGHT",
    "RECOMMENDATION",
    "REACTION",
    "QUESTION",
    "LIST",
    "THREAD",
    "VS_BATTLE",
    "QNA",
    "CURATION",
    "DEBATE",
    "MEME",
    "COLLAB",
    "TRIVIA",
    "PREDICTION",
    "ANNIVERSARY",
    "BEHIND_STORY",
  ]),
  content: z.string().min(1, "내용은 필수입니다"),
  contentId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  parentId: z.string().optional(),
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

// GET /api/persona-world/posts - 포스트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get("personaId")
    const type = searchParams.get("type")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    // 필터 조건 구성
    const where: {
      personaId?: string
      type?: PersonaPostType
      isHidden?: boolean
    } = {
      isHidden: false,
    }

    if (personaId) {
      where.personaId = personaId
    }

    if (type) {
      where.type = type.toUpperCase() as PersonaPostType
    }

    // 포스트 목록 조회
    const [posts, total] = await Promise.all([
      prisma.personaPost.findMany({
        where,
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
          _count: {
            select: {
              likes: true,
              comments: true,
              reposts: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.personaPost.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        posts: posts.map((post) => ({
          ...post,
          likeCount: post._count.likes,
          commentCount: post._count.comments,
          repostCount: post._count.reposts,
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
    console.error("포스트 목록 조회 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "포스트 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/persona-world/posts - 포스트 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = createPostSchema.safeParse(body)

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

    const { personaId, type, content, contentId, metadata, parentId, trigger } =
      validationResult.data

    // 페르소나 존재 확인
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
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

    // 스레드인 경우 부모 포스트 확인
    if (parentId) {
      const parentPost = await prisma.personaPost.findUnique({
        where: { id: parentId },
      })

      if (!parentPost) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "NOT_FOUND", message: "부모 포스트를 찾을 수 없습니다" },
          },
          { status: 404 }
        )
      }
    }

    // 포스트 생성
    const post = await prisma.personaPost.create({
      data: {
        personaId,
        type: type as PersonaPostType,
        content,
        contentId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        parentId,
        trigger: trigger as ActivityTrigger,
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

    // 활동 로그 기록
    await prisma.personaActivityLog.create({
      data: {
        personaId,
        activityType: "POST_CREATED",
        targetId: post.id,
        metadata: { type, contentId },
        trigger: trigger as ActivityTrigger,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: post,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("포스트 생성 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "포스트 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
