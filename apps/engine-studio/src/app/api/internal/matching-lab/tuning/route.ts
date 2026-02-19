import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import type { SocialDimension } from "@/types"
import {
  createTuningProfile,
  updateParameter,
  updateGenreWeight,
  addGenre,
  removeGenre,
  DEFAULT_HYPERPARAMETERS,
  DEFAULT_GENRE_WEIGHTS,
} from "@/lib/matching/tuning"
import type { TuningProfile, HyperParameter, GenreWeightTable } from "@/lib/matching/tuning"

// ── Module-level store (persists during server session) ─────────

let profileStore: TuningProfile | null = null

function getProfileStore(): TuningProfile {
  if (!profileStore) {
    profileStore = createTuningProfile(
      "기본 프로필",
      DEFAULT_HYPERPARAMETERS,
      DEFAULT_GENRE_WEIGHTS
    )
  }
  return profileStore
}

// ── Types ───────────────────────────────────────────────────────

interface TuningResponse {
  profile: TuningProfile
}

interface CreateTuningRequest {
  name: string
  parameters?: HyperParameter[]
  genreWeights?: GenreWeightTable
}

interface UpdateTuningRequest {
  action: "update_parameter" | "update_genre_weight" | "add_genre" | "remove_genre"
  key?: string
  value?: number
  genre?: string
  dimension?: SocialDimension
  weight?: number
}

// ── GET — 현재 튜닝 프로필 반환 ────────────────────────────────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  const profile = getProfileStore()

  return NextResponse.json<ApiResponse<TuningResponse>>({
    success: true,
    data: { profile },
  })
}

// ── POST — 커스텀 튜닝 프로필 생성 ─────────────────────────────

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

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

    // Update the store with the new profile
    profileStore = profile

    return NextResponse.json<ApiResponse<TuningResponse>>(
      {
        success: true,
        data: { profile },
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "튜닝 프로필 생성 실패" },
      },
      { status: 500 }
    )
  }
}

// ── PUT — 현재 프로필 업데이트 ──────────────────────────────────

export async function PUT(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as UpdateTuningRequest
    let profile = getProfileStore()

    switch (body.action) {
      case "update_parameter": {
        if (!body.key || body.value === undefined) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "INVALID_INPUT", message: "key와 value가 필요합니다" },
            },
            { status: 400 }
          )
        }
        profile = updateParameter(profile, body.key, body.value)
        break
      }
      case "update_genre_weight": {
        if (!body.genre || !body.dimension || body.weight === undefined) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "INVALID_INPUT", message: "genre, dimension, weight가 필요합니다" },
            },
            { status: 400 }
          )
        }
        profile = updateGenreWeight(profile, body.genre, body.dimension, body.weight)
        break
      }
      case "add_genre": {
        if (!body.genre) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "INVALID_INPUT", message: "genre가 필요합니다" },
            },
            { status: 400 }
          )
        }
        profile = addGenre(profile, body.genre)
        break
      }
      case "remove_genre": {
        if (!body.genre) {
          return NextResponse.json<ApiResponse<never>>(
            {
              success: false,
              error: { code: "INVALID_INPUT", message: "genre가 필요합니다" },
            },
            { status: 400 }
          )
        }
        profile = removeGenre(profile, body.genre)
        break
      }
      default:
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "유효하지 않은 action입니다" },
          },
          { status: 400 }
        )
    }

    profileStore = profile

    return NextResponse.json<ApiResponse<TuningResponse>>({
      success: true,
      data: { profile },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "프로필 업데이트 실패" },
      },
      { status: 500 }
    )
  }
}
