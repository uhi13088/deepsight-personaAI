import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import type { OnboardingLevel, Prisma } from "@prisma/client"
import {
  mergeVectors,
  calculateProfileQuality,
  getQuestionCountForLevel,
  getEstimatedTimeForLevel,
  type Vector6D,
  type DataSourceInfo,
} from "@/lib/onboarding"
import {
  convertResponsesToVector,
  type AnswerInput,
  type QuestionMeta,
} from "@/lib/survey/vector-converter"

// 설문 응답 제출 스키마
const submitSurveySchema = z.object({
  userId: z.string().min(1, "유저 ID는 필수입니다"),
  level: z.enum(["LIGHT", "MEDIUM", "DEEP"]),
  answers: z.array(
    z.object({
      questionId: z.string(),
      value: z.union([z.string(), z.number()]),
    })
  ),
})

// GET /api/persona-world/onboarding/cold-start - 설문 질문 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const level = (searchParams.get("level") || "LIGHT") as OnboardingLevel
    const userId = searchParams.get("userId")

    // 레벨 정보
    const questionCount = getQuestionCountForLevel(level)
    const estimatedMinutes = getEstimatedTimeForLevel(level)

    // 해당 레벨에 맞는 설문 조회
    const survey = await prisma.survey.findFirst({
      where: {
        onboardingLevel: level,
        isActive: true,
      },
      include: {
        questions: {
          orderBy: { questionOrder: "asc" },
          include: {
            template: true,
          },
        },
      },
    })

    if (!survey) {
      // 설문이 없으면 기본 질문 템플릿 조회
      const templates = await prisma.psychProfileTemplate.findMany({
        where: {
          onboardingLevel: level,
        },
        orderBy: { questionOrder: "asc" },
        take: questionCount,
      })

      return NextResponse.json({
        success: true,
        data: {
          surveyId: null,
          level,
          questionCount: templates.length,
          expectedQuestionCount: questionCount,
          estimatedMinutes,
          questions: templates.map((t) => ({
            id: t.id,
            questionOrder: t.questionOrder,
            questionText: t.questionText,
            questionType: t.questionType,
            options: t.options,
            targetDimensions: t.targetDimensions,
            isRequired: t.isRequired,
          })),
          progress: userId ? await getProgress(userId, level) : null,
        },
      })
    }

    // 유저 진행 상황 확인
    let progress = null
    if (userId) {
      progress = await getProgress(userId, level)
    }

    return NextResponse.json({
      success: true,
      data: {
        surveyId: survey.id,
        level,
        title: survey.title,
        description: survey.description,
        questionCount: survey.questions.length,
        expectedQuestionCount: questionCount,
        estimatedMinutes,
        questions: survey.questions.map((q) => ({
          id: q.template.id,
          questionOrder: q.questionOrder,
          questionText: q.template.questionText,
          questionType: q.template.questionType,
          options: q.template.options,
          targetDimensions: q.template.targetDimensions,
          isRequired: q.isRequired,
        })),
        progress,
      },
    })
  } catch (error) {
    console.error("설문 조회 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "설문 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/persona-world/onboarding/cold-start - 설문 응답 제출
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = submitSurveySchema.safeParse(body)

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

    const { userId, level, answers } = validationResult.data

    // 유저 존재 확인
    const user = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
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

    // 질문 메타 정보 조회
    const questionIds = answers.map((a) => a.questionId)
    const templates = await prisma.psychProfileTemplate.findMany({
      where: { id: { in: questionIds } },
    })

    const questions: QuestionMeta[] = templates.map((t) => ({
      id: t.id,
      questionType: t.questionType as QuestionMeta["questionType"],
      targetDimensions: t.targetDimensions as QuestionMeta["targetDimensions"],
      weightFormula: t.weightFormula as QuestionMeta["weightFormula"],
      options: t.options as QuestionMeta["options"],
    }))

    // 6D 벡터 계산
    const answerInputs: AnswerInput[] = answers.map((a) => ({
      questionId: a.questionId,
      value: a.value,
    }))

    const conversionResult = convertResponsesToVector(answerInputs, questions)

    // 기존 벡터와 병합
    const existingVector: Partial<Vector6D> | null =
      user.depth !== null
        ? {
            depth: Number(user.depth),
            lens: Number(user.lens),
            stance: Number(user.stance),
            scope: Number(user.scope),
            taste: Number(user.taste),
            purpose: Number(user.purpose),
          }
        : null

    const mergedVector = mergeVectors(existingVector, conversionResult.vector, {
      existingWeight: existingVector ? 0.4 : 0,
      newWeight: existingVector ? 0.6 : 1,
    })

    // 설문 응답 저장
    await prisma.pWUserSurveyResponse.upsert({
      where: {
        userId_surveyLevel: {
          userId,
          surveyLevel: level as OnboardingLevel,
        },
      },
      create: {
        userId,
        surveyLevel: level as OnboardingLevel,
        answers: answers as unknown as Prisma.InputJsonValue,
        computedVector: conversionResult.vector as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
      update: {
        answers: answers as unknown as Prisma.InputJsonValue,
        computedVector: conversionResult.vector as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    })

    // 데이터 소스 정보 업데이트
    const existingDataSources = (user.dataSources as DataSourceInfo) || {}
    const updatedDataSources: DataSourceInfo = {
      ...existingDataSources,
      coldStart: {
        level: level as OnboardingLevel,
        completedAt: new Date(),
        questionCount: answers.length,
      },
    }

    // 프로필 품질 계산
    const qualityResult = calculateProfileQuality(updatedDataSources)

    // 유저 프로필 업데이트
    await prisma.personaWorldUser.update({
      where: { id: userId },
      data: {
        depth: mergedVector.depth,
        lens: mergedVector.lens,
        stance: mergedVector.stance,
        scope: mergedVector.scope,
        taste: mergedVector.taste,
        purpose: mergedVector.purpose,
        profileQuality: qualityResult.quality,
        confidenceScore: qualityResult.confidenceScore,
        dataSources: updatedDataSources as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        message: "설문 응답이 저장되었습니다",
        vector: mergedVector,
        confidenceScores: conversionResult.confidenceScores,
        profileQuality: qualityResult.quality,
        confidenceScore: qualityResult.confidenceScore,
        upgradePath: qualityResult.upgradePath,
        answeredCount: conversionResult.answeredCount,
        totalQuestions: conversionResult.totalQuestions,
      },
    })
  } catch (error) {
    console.error("설문 응답 제출 실패:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "설문 응답 제출에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// 진행 상황 조회 헬퍼
async function getProgress(
  userId: string,
  level: OnboardingLevel
): Promise<{ completed: boolean; answeredCount: number; completedAt: Date | null } | null> {
  const response = await prisma.pWUserSurveyResponse.findUnique({
    where: {
      userId_surveyLevel: {
        userId,
        surveyLevel: level,
      },
    },
  })

  if (!response) return null

  const answers = response.answers as { questionId: string; value: unknown }[] | null
  return {
    completed: !!response.completedAt,
    answeredCount: Array.isArray(answers) ? answers.length : 0,
    completedAt: response.completedAt,
  }
}
