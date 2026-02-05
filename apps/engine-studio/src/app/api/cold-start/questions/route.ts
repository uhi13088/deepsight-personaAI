import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { OnboardingLevel, QuestionType } from "@prisma/client"

// GET /api/cold-start/questions - 질문 목록 조회
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

    const where: Record<string, unknown> = {}
    if (level) {
      where.onboardingLevel = level
    }

    const questions = await prisma.psychProfileTemplate.findMany({
      where,
      orderBy: [{ onboardingLevel: "asc" }, { questionOrder: "asc" }],
    })

    // 레벨별로 그룹화
    const grouped = {
      LIGHT: questions.filter((q) => q.onboardingLevel === "LIGHT"),
      MEDIUM: questions.filter((q) => q.onboardingLevel === "MEDIUM"),
      DEEP: questions.filter((q) => q.onboardingLevel === "DEEP"),
    }

    return NextResponse.json({
      success: true,
      data: {
        questions,
        grouped,
        counts: {
          LIGHT: grouped.LIGHT.length,
          MEDIUM: grouped.MEDIUM.length,
          DEEP: grouped.DEEP.length,
          total: questions.length,
        },
      },
    })
  } catch (error) {
    console.error("[API] GET /api/cold-start/questions error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "질문 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/cold-start/questions - 질문 생성
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
      name,
      onboardingLevel,
      questionText,
      questionType,
      options,
      targetDimensions = [],
      weightFormula,
      isRequired = true,
    } = body

    // 필수 필드 검증
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_NAME", message: "name은 필수입니다" } },
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

    if (!questionText || typeof questionText !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_QUESTION_TEXT", message: "questionText는 필수입니다" },
        },
        { status: 400 }
      )
    }

    if (
      !questionType ||
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

    // 해당 레벨의 마지막 순서 조회
    const lastQuestion = await prisma.psychProfileTemplate.findFirst({
      where: { onboardingLevel: onboardingLevel as OnboardingLevel },
      orderBy: { questionOrder: "desc" },
    })

    const nextOrder = (lastQuestion?.questionOrder ?? 0) + 1

    const question = await prisma.psychProfileTemplate.create({
      data: {
        name,
        onboardingLevel: onboardingLevel as OnboardingLevel,
        questionOrder: nextOrder,
        questionText,
        questionType: questionType as QuestionType,
        options: options || null,
        targetDimensions,
        weightFormula: weightFormula || null,
        isRequired,
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: { question },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API] POST /api/cold-start/questions error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "질문 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PUT /api/cold-start/questions - 질문 순서 일괄 업데이트
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { questions } = body

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_QUESTIONS", message: "questions 배열이 필요합니다" },
        },
        { status: 400 }
      )
    }

    // 트랜잭션으로 순서 업데이트
    await prisma.$transaction(
      questions.map((q: { id: string; questionOrder: number }) =>
        prisma.psychProfileTemplate.update({
          where: { id: q.id },
          data: { questionOrder: q.questionOrder },
        })
      )
    )

    return NextResponse.json({
      success: true,
      data: { message: "질문 순서가 업데이트되었습니다" },
    })
  } catch (error) {
    console.error("[API] PUT /api/cold-start/questions error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "질문 순서 업데이트에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
