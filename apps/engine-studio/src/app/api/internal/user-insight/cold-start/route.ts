import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createQuestionSet,
  addQuestion,
  removeQuestion,
  reorderQuestions,
  MODE_CONFIG,
} from "@/lib/user-insight/cold-start"
import type { OnboardingMode, QuestionSet, QuestionType } from "@/lib/user-insight/cold-start"
import type { SocialDimension, TemperamentDimension } from "@/types"

// ── In-memory store ─────────────────────────────────────────────

interface ColdStartStore {
  sets: Record<OnboardingMode, QuestionSet>
}

let store: ColdStartStore | null = null

function getStore(): ColdStartStore {
  if (!store) {
    store = {
      sets: {
        quick: createQuestionSet("Quick Mode 기본", "quick"),
        standard: createQuestionSet("Standard Mode 기본", "standard"),
        deep: createQuestionSet("Deep Mode 기본", "deep"),
      },
    }
  }
  return store
}

// ── Response type ───────────────────────────────────────────────

interface ColdStartResponse {
  sets: Record<OnboardingMode, QuestionSet>
}

// ── GET: Return all question sets ───────────────────────────────

export async function GET() {
  try {
    const s = getStore()

    return NextResponse.json<ApiResponse<ColdStartResponse>>({
      success: true,
      data: { sets: s.sets },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "콜드 스타트 데이터 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── POST: Mutations (add, remove, reorder questions) ────────────

interface ColdStartPostRequest {
  action: "add_question" | "remove_question" | "reorder_questions"
  mode: OnboardingMode
  // For add_question
  question?: {
    text: string
    type: QuestionType
    targetDimension: string
    targetLayer: "L1" | "L2"
    options: Array<{ id: string; text: string; vectorDelta: Record<string, number> }>
  }
  // For remove_question
  questionId?: string
  // For reorder_questions
  questionIds?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ColdStartPostRequest
    const s = getStore()

    if (!body.mode || !s.sets[body.mode]) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "유효한 mode가 필요합니다" },
        },
        { status: 400 }
      )
    }

    if (body.action === "add_question") {
      if (!body.question || !body.question.text?.trim()) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "질문 데이터가 필요합니다" },
          },
          { status: 400 }
        )
      }

      const currentSet = s.sets[body.mode]
      const config = MODE_CONFIG[body.mode]

      if (currentSet.questions.length >= config.questionCount) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: "LIMIT_EXCEEDED",
              message: `${body.mode} 모드 최대 질문 수 (${config.questionCount}) 초과`,
            },
          },
          { status: 400 }
        )
      }

      const updated = addQuestion(currentSet, {
        text: body.question.text.trim(),
        type: body.question.type,
        targetDimension: body.question.targetDimension as SocialDimension | TemperamentDimension,
        targetLayer: body.question.targetLayer,
        options: body.question.options,
      })

      s.sets[body.mode] = updated

      return NextResponse.json<ApiResponse<ColdStartResponse>>({
        success: true,
        data: { sets: s.sets },
      })
    }

    if (body.action === "remove_question") {
      if (!body.questionId) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "questionId가 필요합니다" },
          },
          { status: 400 }
        )
      }

      s.sets[body.mode] = removeQuestion(s.sets[body.mode], body.questionId)

      return NextResponse.json<ApiResponse<ColdStartResponse>>({
        success: true,
        data: { sets: s.sets },
      })
    }

    if (body.action === "reorder_questions") {
      if (!body.questionIds || body.questionIds.length === 0) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "questionIds가 필요합니다" },
          },
          { status: 400 }
        )
      }

      s.sets[body.mode] = reorderQuestions(s.sets[body.mode], body.questionIds)

      return NextResponse.json<ApiResponse<ColdStartResponse>>({
        success: true,
        data: { sets: s.sets },
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "유효한 action이 필요합니다: add_question, remove_question, reorder_questions",
        },
      },
      { status: 400 }
    )
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "콜드 스타트 작업 실패" },
      },
      { status: 500 }
    )
  }
}
