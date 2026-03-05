import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"
import { createQuestionSet } from "@/lib/user-insight/cold-start"
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
      // enum 불일치 감지 시 사용자 친화적 에러
      if (msg.includes("enum") || msg.includes("OnboardingLevel")) {
        console.error(`[Cold Start] DB enum mismatch — migration 필요: ${msg}`)
        throw new Error(
          "온보딩 데이터베이스 설정이 최신 상태가 아닙니다. 관리자에게 DB 업데이트를 요청하세요."
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

    // 사용자에게 이미 친화적으로 변환된 메시지는 그대로 전달
    const isUserFriendly = errMsg.includes("관리자에게") || errMsg.includes("요청하세요")
    const userMessage = isUserFriendly
      ? errMsg
      : "온보딩 질문 데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: userMessage,
        },
      },
      { status: 500 }
    )
  }
}
