import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import {
  convertResponsesToVector,
  type QuestionMeta,
  type AnswerInput,
  type QuestionOptionMeta,
} from "@/lib/survey/vector-converter"
import type { VectorDimension } from "@/types"

// POST /api/surveys/:id/responses - 설문 응답 제출
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id: surveyId } = await params
    const userId = session.user.id as string

    // 설문 존재 및 활성 확인
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: {
          include: { template: true },
          orderBy: { questionOrder: "asc" },
        },
      },
    })

    if (!survey) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "설문을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    if (!survey.isActive) {
      return NextResponse.json(
        { success: false, error: { code: "SURVEY_INACTIVE", message: "비활성 설문입니다" } },
        { status: 400 }
      )
    }

    // 이미 응답한 설문인지 확인
    const existingResponse = await prisma.surveyResponse.findUnique({
      where: { surveyId_userId: { surveyId, userId } },
    })

    if (existingResponse?.completedAt) {
      return NextResponse.json(
        { success: false, error: { code: "ALREADY_COMPLETED", message: "이미 완료한 설문입니다" } },
        { status: 409 }
      )
    }

    const body = await request.json()
    const { answers } = body

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ANSWERS", message: "answers 배열이 필요합니다" },
        },
        { status: 400 }
      )
    }

    // 필수 질문 응답 여부 확인
    const requiredQuestionIds = survey.questions.filter((sq) => sq.isRequired).map((sq) => sq.id)

    const answeredQuestionIds = new Set(answers.map((a: { questionId: string }) => a.questionId))

    const missingRequired = requiredQuestionIds.filter((qid) => !answeredQuestionIds.has(qid))
    if (missingRequired.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_REQUIRED",
            message: `필수 질문 ${missingRequired.length}개에 응답하지 않았습니다`,
            details: { missingQuestionIds: missingRequired },
          },
        },
        { status: 400 }
      )
    }

    // 벡터 변환용 질문 메타데이터 구성
    const questionMetas: QuestionMeta[] = survey.questions.map((sq) => ({
      id: sq.id,
      questionType: sq.template.questionType as QuestionMeta["questionType"],
      targetDimensions: (sq.template.targetDimensions || []) as VectorDimension[],
      weightFormula: sq.template.weightFormula as QuestionMeta["weightFormula"],
      options: sq.template.options as QuestionOptionMeta[] | null,
    }))

    // 응답 → 6D 벡터 변환
    const answerInputs: AnswerInput[] = answers.map(
      (a: { questionId: string; value: number | string }) => ({
        questionId: a.questionId,
        value: a.value,
      })
    )

    const conversionResult = convertResponsesToVector(answerInputs, questionMetas)

    // Prisma JSON 필드에 전달하기 위해 spread로 인덱스 시그니처 호환 객체 생성
    const vectorJson = { ...conversionResult.vector }
    const confidenceJson = { ...conversionResult.confidenceScores }

    // 트랜잭션: 응답 저장 + UserVector 업데이트
    const response = await prisma.$transaction(async (tx) => {
      // 기존 미완료 응답이 있으면 업데이트, 없으면 생성
      const surveyResponse = existingResponse
        ? await tx.surveyResponse.update({
            where: { id: existingResponse.id },
            data: {
              computedVector: vectorJson,
              completedAt: new Date(),
            },
          })
        : await tx.surveyResponse.create({
            data: {
              surveyId,
              userId,
              computedVector: vectorJson,
              completedAt: new Date(),
            },
          })

      // 기존 답변 삭제 후 재생성
      if (existingResponse) {
        await tx.surveyAnswer.deleteMany({ where: { responseId: surveyResponse.id } })
      }

      await tx.surveyAnswer.createMany({
        data: answers.map((a: { questionId: string; value: unknown }) => ({
          responseId: surveyResponse.id,
          questionId: a.questionId,
          value: a.value as never,
        })),
      })

      // UserVector 업데이트 (upsert)
      await tx.userVector.upsert({
        where: { userId },
        create: {
          userId,
          onboardingLevel: survey.onboardingLevel,
          depth: conversionResult.vector.depth,
          lens: conversionResult.vector.lens,
          stance: conversionResult.vector.stance,
          scope: conversionResult.vector.scope,
          taste: conversionResult.vector.taste,
          purpose: conversionResult.vector.purpose,
          confidenceScores: confidenceJson,
        },
        update: {
          onboardingLevel: survey.onboardingLevel,
          depth: conversionResult.vector.depth,
          lens: conversionResult.vector.lens,
          stance: conversionResult.vector.stance,
          scope: conversionResult.vector.scope,
          taste: conversionResult.vector.taste,
          purpose: conversionResult.vector.purpose,
          confidenceScores: confidenceJson,
        },
      })

      return surveyResponse
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          responseId: response.id,
          vector: conversionResult.vector,
          confidenceScores: conversionResult.confidenceScores,
          answeredCount: conversionResult.answeredCount,
          totalQuestions: conversionResult.totalQuestions,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API] POST /api/surveys/:id/responses error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "설문 응답 제출에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// GET /api/surveys/:id/responses - 설문 응답 목록 조회 (관리자용)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id: surveyId } = await params

    const survey = await prisma.survey.findUnique({ where: { id: surveyId } })
    if (!survey) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "설문을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    const responses = await prisma.surveyResponse.findMany({
      where: { surveyId },
      include: {
        answers: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      success: true,
      data: {
        surveyId,
        totalResponses: responses.length,
        completedResponses: responses.filter((r) => r.completedAt).length,
        responses,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/surveys/:id/responses error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "응답 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
