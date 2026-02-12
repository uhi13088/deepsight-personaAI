import { NextRequest, NextResponse } from "next/server"
import type { ApiResponse } from "@/types"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import { matchAll, DEFAULT_MATCHING_CONFIG } from "@/lib/matching/three-tier-engine"
import type {
  MatchResult,
  UserProfile,
  PersonaCandidate,
  MatchingConfig,
} from "@/lib/matching/three-tier-engine"
import { createRandomVirtualUser } from "@/lib/matching/simulator"
import { calculateVFinal } from "@/lib/vector/v-final"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"

interface SimulateRequest {
  mode: "single" | "batch"
  user?: {
    l1: SocialPersonaVector
    l2: CoreTemperamentVector
    l3: NarrativeDriveVector
  }
  personas: PersonaCandidate[]
  config?: Partial<MatchingConfig>
  batchSize?: number
}

interface SimulateResponse {
  mode: "single" | "batch"
  results?: MatchResult[]
  stats?: {
    totalUsers: number
    avgMatchScore: number
    failureRate: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SimulateRequest

    if (!body.personas || body.personas.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "페르소나 후보가 필요합니다" },
        },
        { status: 400 }
      )
    }

    const config: MatchingConfig = {
      ...DEFAULT_MATCHING_CONFIG,
      ...body.config,
    }

    if (body.mode === "single") {
      if (!body.user) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "유저 벡터가 필요합니다" },
          },
          { status: 400 }
        )
      }

      const vFinal = calculateVFinal(body.user.l1, body.user.l2, body.user.l3)
      const crossAxisProfile = calculateCrossAxisProfile(body.user.l1, body.user.l2, body.user.l3)
      const paradoxProfile = calculateExtendedParadoxScore(body.user.l1, body.user.l2, body.user.l3)

      const userProfile: UserProfile = {
        id: "api_user",
        l1: body.user.l1,
        l2: body.user.l2,
        l3: body.user.l3,
        vFinal,
        crossAxisProfile,
        paradoxProfile,
      }

      const results = matchAll(userProfile, body.personas, config)
      results.sort((a, b) => b.score - a.score)

      return NextResponse.json<ApiResponse<SimulateResponse>>({
        success: true,
        data: { mode: "single", results },
      })
    }

    // 배치 모드
    const batchSize = Math.min(body.batchSize ?? 20, 200)
    const scores: number[] = []

    for (let i = 0; i < batchSize; i++) {
      const vu = createRandomVirtualUser()
      const vFinal = calculateVFinal(vu.l1, vu.l2, vu.l3)
      const crossAxisProfile = calculateCrossAxisProfile(vu.l1, vu.l2, vu.l3)
      const paradoxProfile = calculateExtendedParadoxScore(vu.l1, vu.l2, vu.l3)

      const up: UserProfile = {
        id: vu.id,
        l1: vu.l1,
        l2: vu.l2,
        l3: vu.l3,
        vFinal,
        crossAxisProfile,
        paradoxProfile,
      }

      const results = matchAll(up, body.personas, config)
      if (results.length > 0) {
        results.sort((a, b) => b.score - a.score)
        scores.push(results[0].score)
      }
    }

    const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0
    const failures = scores.filter((s) => s < config.similarityThreshold).length

    return NextResponse.json<ApiResponse<SimulateResponse>>({
      success: true,
      data: {
        mode: "batch",
        stats: {
          totalUsers: batchSize,
          avgMatchScore: Math.round(avg * 100) / 100,
          failureRate: scores.length > 0 ? Math.round((failures / scores.length) * 100) / 100 : 0,
        },
      },
    })
  } catch (error) {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "시뮬레이션 실행 실패" },
      },
      { status: 500 }
    )
  }
}
