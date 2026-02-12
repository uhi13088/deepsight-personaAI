import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import {
  createTuningProfile,
  DEFAULT_HYPERPARAMETERS,
  DEFAULT_GENRE_WEIGHTS,
} from "@/lib/matching/tuning"
import type { TuningProfile, HyperParameter, GenreWeightTable } from "@/lib/matching/tuning"

interface TuningResponse {
  profile: TuningProfile
}

// GET — 기본 튜닝 프로필 반환
export async function GET() {
  const profile = createTuningProfile("기본 프로필", DEFAULT_HYPERPARAMETERS, DEFAULT_GENRE_WEIGHTS)

  return NextResponse.json<ApiResponse<TuningResponse>>({
    success: true,
    data: { profile },
  })
}

interface CreateTuningRequest {
  name: string
  parameters?: HyperParameter[]
  genreWeights?: GenreWeightTable
}

// POST — 커스텀 튜닝 프로필 생성
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateTuningRequest

    if (!body.name?.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "프로필 이름이 필요합니다" },
        },
        { status: 400 }
      )
    }

    const profile = createTuningProfile(
      body.name.trim(),
      body.parameters ?? DEFAULT_HYPERPARAMETERS,
      body.genreWeights ?? DEFAULT_GENRE_WEIGHTS
    )

    return NextResponse.json<ApiResponse<TuningResponse>>(
      {
        success: true,
        data: { profile },
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "튜닝 프로필 생성 실패" },
      },
      { status: 500 }
    )
  }
}
