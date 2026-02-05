import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { DifficultyLevel } from "@prisma/client"

// GET /api/golden-samples/[id] - 골든 샘플 상세 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params

    const sample = await prisma.goldenSample.findUnique({
      where: { id },
    })

    if (!sample) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "골든 샘플을 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { sample },
    })
  } catch (error) {
    console.error("[API] GET /api/golden-samples/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "골든 샘플 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PUT /api/golden-samples/[id] - 골든 샘플 수정
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    } = body

    // 존재 여부 확인
    const existing = await prisma.goldenSample.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "골든 샘플을 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    // 난이도 검증
    if (difficultyLevel && !["EASY", "MEDIUM", "HARD"].includes(difficultyLevel)) {
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

    // 버전 증가 및 업데이트
    const sample = await prisma.goldenSample.update({
      where: { id },
      data: {
        contentTitle: contentTitle ?? existing.contentTitle,
        contentType: contentType !== undefined ? contentType : existing.contentType,
        genre: genre !== undefined ? genre : existing.genre,
        description: description !== undefined ? description : existing.description,
        testQuestion: testQuestion ?? existing.testQuestion,
        expectedReactions:
          expectedReactions !== undefined ? expectedReactions : existing.expectedReactions,
        difficultyLevel: (difficultyLevel as DifficultyLevel) ?? existing.difficultyLevel,
        validationDimensions: validationDimensions ?? existing.validationDimensions,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        version: existing.version + 1,
      },
    })

    return NextResponse.json({
      success: true,
      data: { sample },
    })
  } catch (error) {
    console.error("[API] PUT /api/golden-samples/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "골든 샘플 수정에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/golden-samples/[id] - 골든 샘플 삭제
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

    // 존재 여부 확인
    const existing = await prisma.goldenSample.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "골든 샘플을 찾을 수 없습니다" },
        },
        { status: 404 }
      )
    }

    await prisma.goldenSample.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      data: { message: "골든 샘플이 삭제되었습니다" },
    })
  } catch (error) {
    console.error("[API] DELETE /api/golden-samples/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "골든 샘플 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
