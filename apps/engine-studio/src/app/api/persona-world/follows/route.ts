import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { ActivityTrigger } from "@prisma/client"

// 팔로우 생성 스키마
const createFollowSchema = z.object({
  followerPersonaId: z.string().optional(),
  followerUserId: z.string().optional(),
  followingPersonaId: z.string().min(1, "팔로우 대상 페르소나 ID는 필수입니다"),
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

// GET /api/persona-world/follows - 팔로우/팔로워 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const personaId = searchParams.get("personaId")
    const userId = searchParams.get("userId")
    const type = searchParams.get("type") // "followers" | "following"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)

    if (!personaId && !userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "personaId 또는 userId가 필요합니다" },
        },
        { status: 400 }
      )
    }

    if (type === "followers") {
      // 페르소나의 팔로워 목록
      if (!personaId) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "VALIDATION_ERROR", message: "팔로워 조회는 personaId가 필요합니다" },
          },
          { status: 400 }
        )
      }

      const [followers, total] = await Promise.all([
        prisma.personaFollow.findMany({
          where: { followingPersonaId: personaId },
          include: {
            followerPersona: {
              select: {
                id: true,
                name: true,
                handle: true,
                tagline: true,
                profileImageUrl: true,
              },
            },
            followerUser: {
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
        prisma.personaFollow.count({ where: { followingPersonaId: personaId } }),
      ])

      return NextResponse.json({
        success: true,
        data: {
          followers,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      })
    } else {
      // 팔로잉 목록 (페르소나 또는 유저가 팔로우하는 대상)
      const where = personaId
        ? { followerPersonaId: personaId }
        : { followerUserId: userId as string }

      const [following, total] = await Promise.all([
        prisma.personaFollow.findMany({
          where,
          include: {
            followingPersona: {
              select: {
                id: true,
                name: true,
                handle: true,
                tagline: true,
                profileImageUrl: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.personaFollow.count({ where }),
      ])

      return NextResponse.json({
        success: true,
        data: {
          following,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      })
    }
  } catch (error) {
    console.error("팔로우 목록 조회 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "팔로우 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/persona-world/follows - 팔로우
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = createFollowSchema.safeParse(body)

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

    const { followerPersonaId, followerUserId, followingPersonaId, trigger } = validationResult.data

    // followerPersonaId 또는 followerUserId 둘 중 하나는 필수
    if (!followerPersonaId && !followerUserId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "followerPersonaId 또는 followerUserId가 필요합니다",
          },
        },
        { status: 400 }
      )
    }

    if (followerPersonaId && followerUserId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "followerPersonaId와 followerUserId 중 하나만 지정해야 합니다",
          },
        },
        { status: 400 }
      )
    }

    // 자기 자신 팔로우 방지
    if (followerPersonaId === followingPersonaId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "자기 자신을 팔로우할 수 없습니다" },
        },
        { status: 400 }
      )
    }

    // 팔로우 대상 페르소나 존재 확인
    const targetPersona = await prisma.persona.findUnique({
      where: { id: followingPersonaId },
    })

    if (!targetPersona) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "팔로우 대상 페르소나를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 중복 팔로우 체크
    const existingFollow = await prisma.personaFollow.findFirst({
      where: {
        followingPersonaId,
        ...(followerPersonaId ? { followerPersonaId } : { followerUserId }),
      },
    })

    if (existingFollow) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DUPLICATE", message: "이미 팔로우 중입니다" },
        },
        { status: 409 }
      )
    }

    // 팔로우 생성
    const follow = await prisma.personaFollow.create({
      data: {
        followerPersonaId: followerPersonaId ?? null,
        followerUserId: followerUserId ?? null,
        followingPersonaId,
      },
      include: {
        followingPersona: {
          select: {
            id: true,
            name: true,
            handle: true,
            tagline: true,
            profileImageUrl: true,
          },
        },
        followerPersona: {
          select: {
            id: true,
            name: true,
            handle: true,
          },
        },
      },
    })

    // 페르소나인 경우 활동 로그 기록
    if (followerPersonaId) {
      await prisma.personaActivityLog.create({
        data: {
          personaId: followerPersonaId,
          activityType: "PERSONA_FOLLOWED",
          targetId: followingPersonaId,
          metadata: { followingPersonaName: targetPersona.name },
          trigger: trigger as ActivityTrigger,
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: follow,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("팔로우 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "팔로우에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/persona-world/follows - 언팔로우
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const followerPersonaId = searchParams.get("followerPersonaId")
    const followerUserId = searchParams.get("followerUserId")
    const followingPersonaId = searchParams.get("followingPersonaId")

    if (!followingPersonaId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "followingPersonaId가 필요합니다" },
        },
        { status: 400 }
      )
    }

    if (!followerPersonaId && !followerUserId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "followerPersonaId 또는 followerUserId가 필요합니다",
          },
        },
        { status: 400 }
      )
    }

    // 팔로우 찾기
    const follow = await prisma.personaFollow.findFirst({
      where: {
        followingPersonaId,
        ...(followerPersonaId ? { followerPersonaId } : { followerUserId }),
      },
    })

    if (!follow) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "팔로우 관계를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 팔로우 삭제
    await prisma.personaFollow.delete({
      where: { id: follow.id },
    })

    // 페르소나인 경우 활동 로그 기록
    if (followerPersonaId) {
      await prisma.personaActivityLog.create({
        data: {
          personaId: followerPersonaId,
          activityType: "PERSONA_UNFOLLOWED",
          targetId: followingPersonaId,
          metadata: {},
          trigger: "USER_INTERACTION",
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: { message: "언팔로우 되었습니다" },
    })
  } catch (error) {
    console.error("언팔로우 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "언팔로우에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
