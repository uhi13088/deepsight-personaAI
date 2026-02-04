import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { OnboardingLevel, QuestionType } from "@prisma/client"

// GET /api/cold-start/questions/[id] - 질문 상세 조회
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

    const question = await prisma.psychProfileTemplate.findUnique({
      where: { id },
    })

    if (!question) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "질문을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { question },
    })
  } catch (error) {
    console.error("[API] GET /api/cold-start/questions/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "질문 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PUT /api/cold-start/questions/[id] - 질문 수정
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
      name,
      onboardingLevel,
      questionOrder,
      questionText,
      questionType,
      options,
      targetDimensions,
      weightFormula,
      isRequired,
    } = body

    // 존재 여부 확인
    const existing = await prisma.psychProfileTemplate.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "질문을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 레벨 검증
    if (onboardingLevel && !["LIGHT", "MEDIUM", "DEEP"].includes(onboardingLevel)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_LEVEL",
            message: "onboardingLevel은 LIGHT, MEDIUM, DEEP 중 하나여야 합니다",
          },
        },
        { status: 400 }
      )
    }

    // 타입 검증
    if (
      questionType &&
      !["SLIDER", "MULTIPLE_CHOICE", "RANKING", "TEXT", "IMAGE"].includes(questionType)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_QUESTION_TYPE",
            message:
              "questionType은 SLIDER, MULTIPLE_CHOICE, RANKING, TEXT, IMAGE 중 하나여야 합니다",
          },
        },
        { status: 400 }
      )
    }

    const question = await prisma.psychProfileTemplate.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        onboardingLevel: (onboardingLevel as OnboardingLevel) ?? existing.onboardingLevel,
        questionOrder: questionOrder ?? existing.questionOrder,
        questionText: questionText ?? existing.questionText,
        questionType: (questionType as QuestionType) ?? existing.questionType,
        options: options !== undefined ? options : existing.options,
        targetDimensions: targetDimensions ?? existing.targetDimensions,
        weightFormula: weightFormula !== undefined ? weightFormula : existing.weightFormula,
        isRequired: isRequired !== undefined ? isRequired : existing.isRequired,
      },
    })

    return NextResponse.json({
      success: true,
      data: { question },
    })
  } catch (error) {
    console.error("[API] PUT /api/cold-start/questions/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "질문 수정에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/cold-start/questions/[id] - 질문 삭제
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
    const existing = await prisma.psychProfileTemplate.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "질문을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    await prisma.psychProfileTemplate.delete({
      where: { id },
    })

    // 남은 질문들의 순서 재정렬
    const remainingQuestions = await prisma.psychProfileTemplate.findMany({
      where: { onboardingLevel: existing.onboardingLevel },
      orderBy: { questionOrder: "asc" },
    })

    await prisma.$transaction(
      remainingQuestions.map((q, index) =>
        prisma.psychProfileTemplate.update({
          where: { id: q.id },
          data: { questionOrder: index + 1 },
        })
      )
    )

    return NextResponse.json({
      success: true,
      data: { message: "질문이 삭제되었습니다" },
    })
  } catch (error) {
    console.error("[API] DELETE /api/cold-start/questions/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "질문 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
