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
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma"

// ── Prisma-backed persistence ────────────────────────────────

async function loadSafetyFilter(): Promise<SafetyFilter> {
  const rows = await prisma.systemConfig.findMany({ where: { category: "SAFETY" } })
  if (rows.length === 0) return createSafetyFilter()

  const configMap = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  const defaults = createSafetyFilter()
  return {
    config: (configMap.config ?? defaults.config) as SafetyFilter["config"],
    logs: (configMap.logs ?? defaults.logs) as SafetyFilter["logs"],
  }
}

async function saveSafetyFilter(filter: SafetyFilter): Promise<void> {
  await Promise.all([
    prisma.systemConfig.upsert({
      where: { category_key: { category: "SAFETY", key: "config" } },
      update: { value: filter.config as unknown as Prisma.InputJsonValue },
      create: {
        category: "SAFETY",
        key: "config",
        value: filter.config as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.systemConfig.upsert({
      where: { category_key: { category: "SAFETY", key: "logs" } },
      update: { value: filter.logs as unknown as Prisma.InputJsonValue },
      create: {
        category: "SAFETY",
        key: "logs",
        value: filter.logs as unknown as Prisma.InputJsonValue,
      },
    }),
  ])
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
    const filter = await loadSafetyFilter()

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
    const filter = await loadSafetyFilter()

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
        const updated = addForbiddenWord(filter, body.word)
        await saveSafetyFilter(updated)
        return NextResponse.json<ApiResponse<SafetyFilterResponse>>({
          success: true,
          data: serialize(updated),
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
        const updated = removeForbiddenWord(filter, body.word, body.category)
        await saveSafetyFilter(updated)
        return NextResponse.json<ApiResponse<SafetyFilterResponse>>({
          success: true,
          data: serialize(updated),
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
        const updated: SafetyFilter = {
          ...filter,
          config: { ...filter.config, level: body.level },
        }
        await saveSafetyFilter(updated)
        return NextResponse.json<ApiResponse<SafetyFilterResponse>>({
          success: true,
          data: serialize(updated),
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
        await saveSafetyFilter(updatedFilter)
        return NextResponse.json<ApiResponse<EvaluateResponse>>({
          success: true,
          data: {
            result,
            filter: serialize(updatedFilter),
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
