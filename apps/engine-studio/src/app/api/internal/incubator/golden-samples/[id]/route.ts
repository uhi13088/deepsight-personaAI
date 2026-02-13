import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"

// ═══════════════════════════════════════════════════════════════
// GET    /api/internal/incubator/golden-samples/[id] — 단일 조회
// PUT    /api/internal/incubator/golden-samples/[id] — 수정
// DELETE /api/internal/incubator/golden-samples/[id] — 삭제 (비활성화)
// ═══════════════════════════════════════════════════════════════

interface GoldenSampleDetail {
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

function toDetail(item: {
  id: string
  contentTitle: string
  contentType: string | null
  genre: string | null
  description: string | null
  testQuestion: string
  expectedReactions: unknown
  difficultyLevel: string
  validationDimensions: string[]
  version: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): GoldenSampleDetail {
  return {
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
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const sample = await prisma.goldenSample.findUnique({ where: { id } })

    if (!sample) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "골든 샘플을 찾을 수 없습니다" },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: toDetail(sample),
    } satisfies ApiResponse<GoldenSampleDetail>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `골든 샘플 조회 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.goldenSample.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "골든 샘플을 찾을 수 없습니다" },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    const {
      contentTitle,
      contentType,
      genre,
      description,
      testQuestion,
      expectedReactions,
      difficultyLevel,
      validationDimensions,
      isActive,
    } = body as {
      contentTitle?: string
      contentType?: string | null
      genre?: string | null
      description?: string | null
      testQuestion?: string
      expectedReactions?: Record<string, string>
      difficultyLevel?: string
      validationDimensions?: string[]
      isActive?: boolean
    }

    const validDifficulties = ["EASY", "MEDIUM", "HARD"]
    const validDimensions = ["depth", "lens", "purpose", "stance", "scope", "taste"]

    const updateData: Record<string, unknown> = {}

    if (contentTitle !== undefined) updateData.contentTitle = contentTitle.trim()
    if (contentType !== undefined) updateData.contentType = contentType?.trim() || null
    if (genre !== undefined) updateData.genre = genre?.trim() || null
    if (description !== undefined) updateData.description = description?.trim() || null
    if (testQuestion !== undefined) updateData.testQuestion = testQuestion.trim()
    if (expectedReactions !== undefined) updateData.expectedReactions = expectedReactions
    if (difficultyLevel !== undefined && validDifficulties.includes(difficultyLevel)) {
      updateData.difficultyLevel = difficultyLevel
    }
    if (validationDimensions !== undefined) {
      updateData.validationDimensions = validationDimensions.filter((d: string) =>
        validDimensions.includes(d)
      )
    }
    if (isActive !== undefined) updateData.isActive = isActive

    // 내용이 변경되면 버전 증가
    const contentChanged =
      contentTitle !== undefined ||
      testQuestion !== undefined ||
      expectedReactions !== undefined ||
      validationDimensions !== undefined
    if (contentChanged) {
      updateData.version = existing.version + 1
    }

    const updated = await prisma.goldenSample.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: toDetail(updated),
    } satisfies ApiResponse<GoldenSampleDetail>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `골든 샘플 수정 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.goldenSample.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "골든 샘플을 찾을 수 없습니다" },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    // Soft delete — isActive = false
    await prisma.goldenSample.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({
      success: true,
      data: { id, deleted: true },
    } satisfies ApiResponse<{ id: string; deleted: boolean }>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `골든 샘플 삭제 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
