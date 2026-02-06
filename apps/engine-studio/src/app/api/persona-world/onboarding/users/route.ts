import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { ProfileQuality } from "@prisma/client"

// 유저 생성 스키마
const createUserSchema = z.object({
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
  name: z.string().min(1).optional(),
  profileImageUrl: z.string().url().optional(),
})

// GET /api/persona-world/onboarding/users - 유저 프로필 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const userId = searchParams.get("userId")

    if (!email && !userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "email 또는 userId가 필요합니다" },
        },
        { status: 400 }
      )
    }

    const user = await prisma.personaWorldUser.findFirst({
      where: userId ? { id: userId } : { email: email! },
      include: {
        surveyResponses: {
          select: {
            surveyLevel: true,
            completedAt: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "유저를 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // SNS 연결 정보 조회
    const snsConnections = await prisma.sNSConnection.findMany({
      where: { userId: user.id },
      select: {
        platform: true,
        lastSyncAt: true,
      },
    })

    // 프로필 완성도 계산
    const profileCompleteness = calculateProfileCompleteness(user, snsConnections)

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
        vector: {
          depth: user.depth ? Number(user.depth) : null,
          lens: user.lens ? Number(user.lens) : null,
          stance: user.stance ? Number(user.stance) : null,
          scope: user.scope ? Number(user.scope) : null,
          taste: user.taste ? Number(user.taste) : null,
          purpose: user.purpose ? Number(user.purpose) : null,
        },
        profileQuality: user.profileQuality,
        confidenceScore: user.confidenceScore ? Number(user.confidenceScore) : null,
        dataSources: user.dataSources,
        preferences: user.preferences,
        snsConnections: snsConnections.map((c) => ({
          platform: c.platform,
          lastSyncAt: c.lastSyncAt,
        })),
        surveyResponses: user.surveyResponses,
        profileCompleteness,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    })
  } catch (error) {
    console.error("유저 조회 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "유저 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/persona-world/onboarding/users - 유저 등록
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = createUserSchema.safeParse(body)

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

    const { email, name, profileImageUrl } = validationResult.data

    // 기존 유저 확인
    const existingUser = await prisma.personaWorldUser.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DUPLICATE", message: "이미 등록된 이메일입니다" },
        },
        { status: 409 }
      )
    }

    // 유저 생성
    const user = await prisma.personaWorldUser.create({
      data: {
        email,
        name,
        profileImageUrl,
        profileQuality: "BASIC",
        confidenceScore: 0.5,
        dataSources: {},
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          profileQuality: user.profileQuality,
          message: "유저 등록이 완료되었습니다. 온보딩을 진행해주세요.",
          nextSteps: {
            coldStart: "/api/persona-world/onboarding/cold-start",
            snsConnect: "/api/persona-world/onboarding/sns/connect",
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("유저 등록 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "유저 등록에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// 프로필 완성도 계산
function calculateProfileCompleteness(
  user: {
    depth: unknown
    lens: unknown
    surveyResponses: { surveyLevel: string; completedAt: Date | null }[]
    profileQuality: ProfileQuality
  },
  snsConnections: { platform: string }[]
): {
  percentage: number
  missingItems: string[]
  suggestions: string[]
} {
  const missingItems: string[] = []
  const suggestions: string[] = []
  let score = 0
  const maxScore = 100

  // 기본 벡터 존재 여부 (30점)
  if (user.depth !== null && user.lens !== null) {
    score += 30
  } else {
    missingItems.push("6D 벡터")
    suggestions.push("Cold Start 설문 또는 SNS 연동을 진행해주세요")
  }

  // Cold Start 완료 여부 (40점)
  const completedSurvey = user.surveyResponses.find((s) => s.completedAt)
  if (completedSurvey) {
    if (completedSurvey.surveyLevel === "DEEP") {
      score += 40
    } else if (completedSurvey.surveyLevel === "MEDIUM") {
      score += 30
      suggestions.push("DEEP 설문을 완료하면 더 정확한 추천을 받을 수 있어요")
    } else {
      score += 20
      suggestions.push("추가 설문을 완료하면 프로필 정확도가 높아져요")
    }
  } else {
    missingItems.push("Cold Start 설문")
    suggestions.push("간단한 설문으로 취향을 알려주세요")
  }

  // SNS 연동 여부 (30점)
  const connectedPlatforms = snsConnections.length
  if (connectedPlatforms >= 2) {
    score += 30
  } else if (connectedPlatforms === 1) {
    score += 20
    suggestions.push("SNS를 추가 연동하면 더 정확한 분석이 가능해요")
  } else {
    missingItems.push("SNS 연동")
    suggestions.push("Netflix, YouTube, Instagram 등을 연동해보세요")
  }

  return {
    percentage: Math.round((score / maxScore) * 100),
    missingItems,
    suggestions,
  }
}
