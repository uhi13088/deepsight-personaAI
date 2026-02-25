import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"
import {
  createQuestionSet,
  addQuestion,
  removeQuestion,
  reorderQuestions,
  MODE_CONFIG,
} from "@/lib/user-insight/cold-start"
import type {
  OnboardingMode,
  QuestionSet,
  QuestionType,
  ColdStartQuestion,
} from "@/lib/user-insight/cold-start"

// ── L1/L2 차원 판별 ────────────────────────────────────────────

const L1_DIMS = new Set<string>([
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
])

function resolveLayer(dimension: string): "L1" | "L2" {
  return L1_DIMS.has(dimension) ? "L1" : "L2"
}

// ── Phase → Mode 매핑 ──────────────────────────────────────────
// Quick  = Phase 1 (Q1-Q8)
// Standard = Phase 1+2 (Q1-Q16)
// Deep   = Phase 1+2+3 (Q1-Q24)

interface PhaseRange {
  level: "QUICK" | "STANDARD"
  from: number
  to: number
}

const MODE_PHASE_RANGES: Record<OnboardingMode, PhaseRange[]> = {
  quick: [{ level: "QUICK", from: 1, to: 8 }],
  standard: [
    { level: "QUICK", from: 1, to: 12 },
    { level: "STANDARD", from: 13, to: 16 },
  ],
  deep: [
    { level: "QUICK", from: 1, to: 12 },
    { level: "STANDARD", from: 13, to: 24 },
  ],
}

// ── DB → ColdStartQuestion 변환 ──────────────────────────────

interface DbOption {
  key: string
  label: string
  l1Weights?: Record<string, number>
  l2Weights?: Record<string, number>
}

function dbToColdStartQuestion(
  row: {
    id: string
    questionText: string
    questionOrder: number
    targetDimensions: string[]
    options: unknown
  },
  mode: OnboardingMode
): ColdStartQuestion {
  const rawOptions = (row.options ?? []) as DbOption[]

  // 대상 차원 → 레이어 판별 (복합질문은 L1+L2 동시)
  const layers = new Set<"L1" | "L2">()
  for (const dim of row.targetDimensions) {
    layers.add(resolveLayer(dim))
  }

  return {
    id: row.id,
    text: row.questionText,
    type: "scenario" as QuestionType,
    targetDimensions: row.targetDimensions,
    targetLayers: Array.from(layers),
    options: rawOptions.map((opt) => ({
      id: opt.key,
      text: opt.label,
      l1Weights: opt.l1Weights ?? {},
      l2Weights: opt.l2Weights ?? {},
    })),
    mode,
    order: row.questionOrder,
  }
}

// ── DB에서 질문 로드 ──────────────────────────────────────────

async function loadQuestionsFromDb(mode: OnboardingMode): Promise<ColdStartQuestion[]> {
  const ranges = MODE_PHASE_RANGES[mode]
  const questions: ColdStartQuestion[] = []

  for (const range of ranges) {
    try {
      const rows = await prisma.psychProfileTemplate.findMany({
        where: {
          onboardingLevel: range.level,
          questionOrder: { gte: range.from, lte: range.to },
        },
        orderBy: { questionOrder: "asc" },
        select: {
          id: true,
          questionText: true,
          questionOrder: true,
          targetDimensions: true,
          options: true,
        },
      })
      for (const row of rows) {
        questions.push(dbToColdStartQuestion(row, mode))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(
        `[Cold Start] DB 조회 실패 (mode=${mode}, level=${range.level}, range=${range.from}-${range.to}):`,
        msg
      )
      // enum 불일치 감지 시 명확한 에러 메시지
      if (msg.includes("enum") || msg.includes("OnboardingLevel")) {
        throw new Error(
          `DB OnboardingLevel enum 값 불일치 — migration 033 적용 필요: ${msg}`
        )
      }
      throw err
    }
  }

  return questions
}

// ── In-memory store (DB 로드 후 캐시, CRUD 뮤테이션용) ─────────

interface ColdStartStore {
  sets: Record<OnboardingMode, QuestionSet>
}

let store: ColdStartStore | null = null

async function getStore(): Promise<ColdStartStore> {
  if (!store) {
    // DB 연결 + 테이블 존재 확인
    const totalCount = await prisma.psychProfileTemplate.count()
    console.info(`[Cold Start] psych_profile_templates 테이블 레코드 수: ${totalCount}`)

    const [quickQuestions, standardQuestions, deepQuestions] = await Promise.all([
      loadQuestionsFromDb("quick"),
      loadQuestionsFromDb("standard"),
      loadQuestionsFromDb("deep"),
    ])

    store = {
      sets: {
        quick: createQuestionSet("Quick Mode (Phase 1)", "quick", quickQuestions),
        standard: createQuestionSet("Standard Mode (Phase 1+2)", "standard", standardQuestions),
        deep: createQuestionSet("Deep Mode (Phase 1+2+3)", "deep", deepQuestions),
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
  const { response } = await requireAuth()
  if (response) return response

  try {
    const s = await getStore()

    return NextResponse.json<ApiResponse<ColdStartResponse>>({
      success: true,
      data: { sets: s.sets },
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    console.error("[Cold Start GET] 데이터 조회 실패:", err)
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            process.env.NODE_ENV === "development"
              ? `콜드 스타트 데이터 조회 실패: ${errMsg}`
              : "콜드 스타트 데이터 조회 실패",
        },
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
    targetDimensions: string[]
    targetLayers: ("L1" | "L2")[]
    options: Array<{
      id: string
      text: string
      l1Weights: Record<string, number>
      l2Weights: Record<string, number>
    }>
  }
  // For remove_question
  questionId?: string
  // For reorder_questions
  questionIds?: string[]
}

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as ColdStartPostRequest
    const s = await getStore()

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
        targetDimensions: body.question.targetDimensions,
        targetLayers: body.question.targetLayers,
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
  } catch (err) {
    console.error("[Cold Start POST] 작업 실패:", err)
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "콜드 스타트 작업 실패" },
      },
      { status: 500 }
    )
  }
}
