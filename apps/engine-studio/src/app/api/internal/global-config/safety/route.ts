import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createSafetyFilter,
  addForbiddenWord,
  removeForbiddenWord,
  evaluateFilter,
  getFilterLogSummary,
} from "@/lib/global-config"
import type {
  SafetyFilter,
  ForbiddenWord,
  FilterLevel,
  FilterEvaluationResult,
} from "@/lib/global-config"

// ── In-memory store (persists within server session) ─────────
let store: SafetyFilter | null = null

function getStore(): SafetyFilter {
  if (!store) {
    // Initialize with some sample log entries
    let f = createSafetyFilter()
    const samples = ["안녕하세요", "폭력적인 내용", "좋은 하루 되세요", "차별 발언", "도박 사이트"]
    for (const text of samples) {
      const { updatedFilter } = evaluateFilter(f, text)
      f = updatedFilter
    }
    store = f
  }
  return store
}

// ── Serialized response type ─────────────────────────────────
interface SafetyFilterResponse {
  config: SafetyFilter["config"]
  logs: SafetyFilter["logs"]
  logSummary: ReturnType<typeof getFilterLogSummary>
}

function serialize(filter: SafetyFilter): SafetyFilterResponse {
  return {
    config: filter.config,
    logs: filter.logs,
    logSummary: getFilterLogSummary(filter),
  }
}

// GET — returns safety filter state with log summary
export async function GET() {
  try {
    const filter = getStore()

    return NextResponse.json<ApiResponse<SafetyFilterResponse>>({
      success: true,
      data: serialize(filter),
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "안전 필터 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// POST — handles multiple actions
type PostAction =
  | { action: "addWord"; word: ForbiddenWord }
  | { action: "removeWord"; word: string; category: string }
  | { action: "changeLevel"; level: FilterLevel }
  | { action: "evaluate"; input: string }

interface EvaluateResponse {
  result: FilterEvaluationResult
  filter: SafetyFilterResponse
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PostAction
    const filter = getStore()

    switch (body.action) {
      case "addWord": {
        if (!body.word || !body.word.word || !body.word.category) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "VALIDATION_ERROR", message: "word와 category는 필수입니다" },
            },
            { status: 400 }
          )
        }
        store = addForbiddenWord(filter, body.word)
        return NextResponse.json<ApiResponse<SafetyFilterResponse>>({
          success: true,
          data: serialize(store),
        })
      }
      case "removeWord": {
        if (!body.word || !body.category) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "VALIDATION_ERROR", message: "word와 category는 필수입니다" },
            },
            { status: 400 }
          )
        }
        store = removeForbiddenWord(filter, body.word, body.category)
        return NextResponse.json<ApiResponse<SafetyFilterResponse>>({
          success: true,
          data: serialize(store),
        })
      }
      case "changeLevel": {
        if (!body.level) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "VALIDATION_ERROR", message: "level은 필수입니다" },
            },
            { status: 400 }
          )
        }
        store = {
          ...filter,
          config: { ...filter.config, level: body.level },
        }
        return NextResponse.json<ApiResponse<SafetyFilterResponse>>({
          success: true,
          data: serialize(store),
        })
      }
      case "evaluate": {
        if (!body.input || !body.input.trim()) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "VALIDATION_ERROR", message: "input은 필수입니다" },
            },
            { status: 400 }
          )
        }
        const { result, updatedFilter } = evaluateFilter(filter, body.input)
        store = updatedFilter
        return NextResponse.json<ApiResponse<EvaluateResponse>>({
          success: true,
          data: {
            result,
            filter: serialize(store),
          },
        })
      }
      default: {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "VALIDATION_ERROR", message: "알 수 없는 action입니다" },
          },
          { status: 400 }
        )
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "안전 필터 업데이트 실패"
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 }
    )
  }
}
