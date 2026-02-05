import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { OnboardingLevel } from "@prisma/client"

// GET /api/surveys - 설문 목록 조회
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
    const level = searchParams.get("level") as OnboardingLevel | null
    const activeOnly = searchParams.get("active") !== "false"

    const where: Record<string, unknown> = {}
    if (level) where.onboardingLevel = level
    if (activeOnly) where.isActive = true

    const surveys = await prisma.survey.findMany({
      where,
      include: {
        questions: {
          include: { template: true },
          orderBy: { questionOrder: "asc" },
        },
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      data: { surveys },
    })
  } catch (error) {
    console.error("[API] GET /api/surveys error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "설문 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/surveys - 설문 생성
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
    const { title, description, onboardingLevel, questionIds } = body

    // 필수 필드 검증
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_TITLE", message: "title은 필수입니다" } },
        { status: 400 }
      )
    }

    if (!onboardingLevel || !["LIGHT", "MEDIUM", "DEEP"].includes(onboardingLevel)) {
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

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_QUESTIONS", message: "최소 1개의 질문이 필요합니다" },
        },
        { status: 400 }
      )
    }

    // 질문 템플릿 존재 확인
    const templates = await prisma.psychProfileTemplate.findMany({
      where: { id: { in: questionIds } },
    })

    if (templates.length !== questionIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "QUESTION_NOT_FOUND", message: "존재하지 않는 질문이 포함되어 있습니다" },
        },
        { status: 400 }
      )
    }

    // 트랜잭션으로 설문 + 질문 연결 생성
    const survey = await prisma.$transaction(async (tx) => {
      const created = await tx.survey.create({
        data: {
          title: title.trim(),
          description: description || null,
          onboardingLevel: onboardingLevel as OnboardingLevel,
        },
      })

      // 질문 연결 (순서 유지)
      await tx.surveyQuestion.createMany({
        data: questionIds.map((templateId: string, index: number) => ({
          surveyId: created.id,
          templateId,
          questionOrder: index + 1,
          isRequired: templates.find((t) => t.id === templateId)?.isRequired ?? true,
        })),
      })

      return tx.survey.findUnique({
        where: { id: created.id },
        include: {
          questions: {
            include: { template: true },
            orderBy: { questionOrder: "asc" },
          },
        },
      })
    })

    return NextResponse.json({ success: true, data: { survey } }, { status: 201 })
  } catch (error) {
    console.error("[API] POST /api/surveys error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "설문 생성에 실패했습니다" } },
      { status: 500 }
    )
  }
}
