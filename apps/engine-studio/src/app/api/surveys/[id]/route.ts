import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { OnboardingLevel } from "@prisma/client"

// GET /api/surveys/:id - 설문 상세 조회
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params

    const survey = await prisma.survey.findUnique({
      where: { id },
      include: {
        questions: {
          include: { template: true },
          orderBy: { questionOrder: "asc" },
        },
        _count: { select: { responses: true } },
      },
    })

    if (!survey) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "설문을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: { survey } })
  } catch (error) {
    console.error("[API] GET /api/surveys/:id error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "설문 조회에 실패했습니다" } },
      { status: 500 }
    )
  }
}

// PUT /api/surveys/:id - 설문 수정
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
    const { title, description, onboardingLevel, isActive, questionIds } = body

    // 설문 존재 확인
    const existing = await prisma.survey.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "설문을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // onboardingLevel 검증
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

    const survey = await prisma.$transaction(async (tx) => {
      // 기본 정보 업데이트
      const updateData: Record<string, unknown> = {}
      if (title !== undefined) updateData.title = title.trim()
      if (description !== undefined) updateData.description = description || null
      if (onboardingLevel !== undefined)
        updateData.onboardingLevel = onboardingLevel as OnboardingLevel
      if (isActive !== undefined) updateData.isActive = isActive

      await tx.survey.update({
        where: { id },
        data: updateData,
      })

      // 질문 목록 교체 (제공된 경우)
      if (questionIds && Array.isArray(questionIds)) {
        if (questionIds.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: { code: "INVALID_QUESTIONS", message: "최소 1개의 질문이 필요합니다" },
            },
            { status: 400 }
          )
        }

        // 질문 템플릿 존재 확인
        const templates = await tx.psychProfileTemplate.findMany({
          where: { id: { in: questionIds } },
        })
        if (templates.length !== questionIds.length) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "QUESTION_NOT_FOUND",
                message: "존재하지 않는 질문이 포함되어 있습니다",
              },
            },
            { status: 400 }
          )
        }

        // 기존 질문 삭제 후 재생성
        await tx.surveyQuestion.deleteMany({ where: { surveyId: id } })
        await tx.surveyQuestion.createMany({
          data: questionIds.map((templateId: string, index: number) => ({
            surveyId: id,
            templateId,
            questionOrder: index + 1,
            isRequired: templates.find((t) => t.id === templateId)?.isRequired ?? true,
          })),
        })
      }

      return tx.survey.findUnique({
        where: { id },
        include: {
          questions: {
            include: { template: true },
            orderBy: { questionOrder: "asc" },
          },
        },
      })
    })

    // 트랜잭션 내부에서 NextResponse를 반환한 경우 처리
    if (survey instanceof NextResponse) return survey

    return NextResponse.json({ success: true, data: { survey } })
  } catch (error) {
    console.error("[API] PUT /api/surveys/:id error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "설문 수정에 실패했습니다" } },
      { status: 500 }
    )
  }
}

// DELETE /api/surveys/:id - 설문 삭제
export async function DELETE(
  _request: NextRequest,
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

    const existing = await prisma.survey.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "설문을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    await prisma.survey.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      data: { message: "설문이 삭제되었습니다" },
    })
  } catch (error) {
    console.error("[API] DELETE /api/surveys/:id error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "설문 삭제에 실패했습니다" } },
      { status: 500 }
    )
  }
}
