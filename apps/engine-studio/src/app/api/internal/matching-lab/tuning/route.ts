import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse } from "@/types"
import type { SocialDimension } from "@/types"
import {
  createTuningProfile,
  updateParameter,
  updateGenreWeight,
  addGenre,
  removeGenre,
  applyPresetWeights,
  validateGenreWeights,
  autoCorrectGenreWeights,
  DEFAULT_HYPERPARAMETERS,
  DEFAULT_GENRE_WEIGHTS,
} from "@/lib/matching/tuning"
import type {
  TuningProfile,
  HyperParameter,
  GenreWeightTable,
  GenreWeightIssue,
} from "@/lib/matching/tuning"

// ── Prisma Helpers ──────────────────────────────────────────────

const TUNING_CATEGORY = "MATCHING_TUNING"
const TUNING_KEY = "profile"

async function loadProfile(): Promise<TuningProfile | null> {
  const row = await prisma.systemConfig.findUnique({
    where: { category_key: { category: TUNING_CATEGORY, key: TUNING_KEY } },
  })
  if (!row) return null
  return row.value as unknown as TuningProfile
}

async function saveProfile(profile: TuningProfile): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { category_key: { category: TUNING_CATEGORY, key: TUNING_KEY } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: { value: profile as any },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: { category: TUNING_CATEGORY, key: TUNING_KEY, value: profile as any },
  })
}

async function getOrCreateProfile(): Promise<TuningProfile> {
  const existing = await loadProfile()
  if (existing) return existing

  const profile = createTuningProfile("기본 프로필", DEFAULT_HYPERPARAMETERS, DEFAULT_GENRE_WEIGHTS)
  await saveProfile(profile)
  return profile
}

// ── Types ───────────────────────────────────────────────────────

interface TuningResponse {
  profile: TuningProfile
  /** 자동 보정이 실행된 경우 보정 내역 */
  corrections?: GenreWeightIssue[]
  /** 검증 이슈 (validate_weights 액션용) */
  issues?: GenreWeightIssue[]
}

interface CreateTuningRequest {
  name: string
  parameters?: HyperParameter[]
  genreWeights?: GenreWeightTable
}

interface UpdateTuningRequest {
  action:
    | "update_parameter"
    | "update_genre_weight"
    | "add_genre"
    | "remove_genre"
    | "apply_preset_weights"
    | "validate_weights"
    | "auto_correct"
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

  try {
    const profile = await getOrCreateProfile()

    return NextResponse.json<ApiResponse<TuningResponse>>({
      success: true,
      data: { profile },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "튜닝 프로필 조회 실패" },
      },
      { status: 500 }
    )
  }
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

    await saveProfile(profile)

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
    let profile = await getOrCreateProfile()

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
      case "apply_preset_weights": {
        profile = applyPresetWeights(profile)
        break
      }
      case "validate_weights": {
        const issues = validateGenreWeights(profile.genreWeights)
        return NextResponse.json<ApiResponse<TuningResponse>>({
          success: true,
          data: { profile, issues },
        })
      }
      case "auto_correct": {
        const result = autoCorrectGenreWeights(profile)
        profile = result.profile
        await saveProfile(profile)
        return NextResponse.json<ApiResponse<TuningResponse>>({
          success: true,
          data: { profile, corrections: result.corrections },
        })
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

    // 저장 전 자동 검증 (범위 이탈만 자동 보정, 경고는 응답에 포함)
    const issues = validateGenreWeights(profile.genreWeights)
    const rangeIssues = issues.filter((i) => i.type === "range")
    let corrections: GenreWeightIssue[] = []
    if (rangeIssues.length > 0) {
      const result = autoCorrectGenreWeights(profile)
      profile = result.profile
      corrections = result.corrections
    }

    await saveProfile(profile)

    return NextResponse.json<ApiResponse<TuningResponse>>({
      success: true,
      data: {
        profile,
        ...(corrections.length > 0 ? { corrections } : {}),
        ...(issues.length > 0 ? { issues } : {}),
      },
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
