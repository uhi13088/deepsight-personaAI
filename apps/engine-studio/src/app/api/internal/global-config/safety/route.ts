import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import { createSafetyFilter, addForbiddenWord } from "@/lib/global-config"
import type { SafetyFilter, ForbiddenWord } from "@/lib/global-config"

// GET — returns safety filter state with defaults
export async function GET() {
  try {
    const filter = createSafetyFilter()

    return NextResponse.json<ApiResponse<SafetyFilter>>({
      success: true,
      data: filter,
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

// POST — adds a forbidden word
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { word: ForbiddenWord }

    if (!body.word || !body.word.word || !body.word.category) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "word와 category는 필수입니다" },
        },
        { status: 400 }
      )
    }

    let filter = createSafetyFilter()
    filter = addForbiddenWord(filter, body.word)

    return NextResponse.json<ApiResponse<SafetyFilter>>({
      success: true,
      data: filter,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "금기어 추가 실패"
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 }
    )
  }
}
