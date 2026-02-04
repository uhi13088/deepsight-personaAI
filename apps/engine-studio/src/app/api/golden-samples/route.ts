import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { DifficultyLevel } from "@prisma/client"

// GET /api/golden-samples - 골든 샘플 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const contentType = searchParams.get("contentType")
    const genre = searchParams.get("genre")
    const difficulty = searchParams.get("difficulty") as DifficultyLevel | null
    const isActive = searchParams.get("isActive")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const where: Record<string, unknown> = {}

    if (contentType) {
      where.contentType = contentType
    }
    if (genre) {
      where.genre = genre
    }
    if (difficulty) {
      where.difficultyLevel = difficulty
    }
    if (isActive !== null) {
      where.isActive = isActive === "true"
    }

    const [samples, total] = await Promise.all([
      prisma.goldenSample.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.goldenSample.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        samples,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error("[API] GET /api/golden-samples error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "골든 샘플 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/golden-samples - 골든 샘플 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      contentTitle,
      contentType,
      genre,
      description,
      testQuestion,
      expectedReactions,
      difficultyLevel = "MEDIUM",
      validationDimensions = [],
    } = body

    // 필수 필드 검증
    if (!contentTitle || typeof contentTitle !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_CONTENT_TITLE", message: "contentTitle은 필수입니다" },
        },
        { status: 400 }
      )
    }

    if (!testQuestion || typeof testQuestion !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_TEST_QUESTION", message: "testQuestion은 필수입니다" },
        },
        { status: 400 }
      )
    }

    // 난이도 검증
    if (!["EASY", "MEDIUM", "HARD"].includes(difficultyLevel)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_DIFFICULTY",
            message: "difficultyLevel은 EASY, MEDIUM, HARD 중 하나여야 합니다",
          },
        },
        { status: 400 }
      )
    }

    const sample = await prisma.goldenSample.create({
      data: {
        contentTitle,
        contentType: contentType || null,
        genre: genre || null,
        description: description || null,
        testQuestion,
        expectedReactions: expectedReactions || null,
        difficultyLevel: difficultyLevel as DifficultyLevel,
        validationDimensions,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: { sample },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API] POST /api/golden-samples error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "골든 샘플 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
