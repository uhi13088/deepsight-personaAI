import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"

// ═══════════════════════════════════════════════════════════════
// GET /api/internal/incubator/golden-samples — 목록 조회
// POST /api/internal/incubator/golden-samples — 새 샘플 생성
// ═══════════════════════════════════════════════════════════════

interface GoldenSampleListItem {
  id: string
  contentTitle: string
  contentType: string | null
  genre: string | null
  description: string | null
  testQuestion: string
  expectedReactions: Record<string, string> | null
  difficultyLevel: string
  validationDimensions: string[]
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface GoldenSampleListResponse {
  items: GoldenSampleListItem[]
  total: number
  page: number
  pageSize: number
}

export async function GET(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "50")))
    const difficulty = searchParams.get("difficulty") // EASY, MEDIUM, HARD
    const activeOnly = searchParams.get("activeOnly") === "true"
    const search = searchParams.get("search") ?? ""

    const where: Record<string, unknown> = {}

    if (difficulty && ["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
      where.difficultyLevel = difficulty
    }

    if (activeOnly) {
      where.isActive = true
    }

    if (search) {
      where.OR = [
        { contentTitle: { contains: search, mode: "insensitive" } },
        { genre: { contains: search, mode: "insensitive" } },
        { testQuestion: { contains: search, mode: "insensitive" } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.goldenSample.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.goldenSample.count({ where }),
    ])

    const response: GoldenSampleListResponse = {
      items: items.map((item) => ({
        id: item.id,
        contentTitle: item.contentTitle,
        contentType: item.contentType,
        genre: item.genre,
        description: item.description,
        testQuestion: item.testQuestion,
        expectedReactions: item.expectedReactions as Record<string, string> | null,
        difficultyLevel: item.difficultyLevel,
        validationDimensions: item.validationDimensions,
        version: item.version,
        isActive: item.isActive,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    }

    return NextResponse.json({
      success: true,
      data: response,
    } satisfies ApiResponse<GoldenSampleListResponse>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `골든 샘플 목록 조회 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()

    const {
      contentTitle,
      contentType,
      genre,
      description,
      testQuestion,
      expectedReactions,
      difficultyLevel,
      validationDimensions,
    } = body as {
      contentTitle?: string
      contentType?: string
      genre?: string
      description?: string
      testQuestion?: string
      expectedReactions?: Record<string, string>
      difficultyLevel?: string
      validationDimensions?: string[]
    }

    // 필수 필드 검증
    if (!contentTitle || !contentTitle.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "contentTitle은 필수입니다" },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    if (!testQuestion || !testQuestion.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "testQuestion은 필수입니다" },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    const validDifficulties = ["EASY", "MEDIUM", "HARD"]
    const difficulty = validDifficulties.includes(difficultyLevel ?? "")
      ? (difficultyLevel as "EASY" | "MEDIUM" | "HARD")
      : "MEDIUM"

    const validDimensions = ["depth", "lens", "purpose", "stance", "scope", "taste"]
    const dims = (validationDimensions ?? []).filter((d: string) => validDimensions.includes(d))

    const sample = await prisma.goldenSample.create({
      data: {
        contentTitle: contentTitle.trim(),
        contentType: contentType?.trim() || null,
        genre: genre?.trim() || null,
        description: description?.trim() || null,
        testQuestion: testQuestion.trim(),
        expectedReactions: expectedReactions ?? {},
        difficultyLevel: difficulty,
        validationDimensions: dims,
        version: 1,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: sample.id,
          contentTitle: sample.contentTitle,
          contentType: sample.contentType,
          genre: sample.genre,
          description: sample.description,
          testQuestion: sample.testQuestion,
          expectedReactions: sample.expectedReactions as Record<string, string> | null,
          difficultyLevel: sample.difficultyLevel,
          validationDimensions: sample.validationDimensions,
          version: sample.version,
          isActive: sample.isActive,
          createdAt: sample.createdAt.toISOString(),
          updatedAt: sample.updatedAt.toISOString(),
        },
      } satisfies ApiResponse<GoldenSampleListItem>,
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `골든 샘플 생성 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
