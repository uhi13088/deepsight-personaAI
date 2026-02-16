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
import { DEMO_PERSONA_ARCHETYPES } from "@/lib/demo-fixtures"

// ── Module-level store (persists during server session) ─────────

let personaStore: PersonaCandidate[] | null = null

function getPersonaStore(): PersonaCandidate[] {
  if (!personaStore) {
    personaStore = createSamplePersonas()
  }
  return personaStore
}

function createSamplePersonas(): PersonaCandidate[] {
  return DEMO_PERSONA_ARCHETYPES.map((a, i) => {
    const crossAxisProfile = calculateCrossAxisProfile(a.l1, a.l2, a.l3)
    const paradoxProfile = calculateExtendedParadoxScore(a.l1, a.l2, a.l3)
    return {
      id: `persona_sim_${i}`,
      name: a.name,
      l1: a.l1,
      l2: a.l2,
      l3: a.l3,
      crossAxisProfile,
      paradoxProfile,
      archetype: a.archetype,
    }
  })
}

// ── Types ───────────────────────────────────────────────────────

interface SimulateRequest {
  mode: "single" | "batch"
  user?: {
    l1: SocialPersonaVector
    l2: CoreTemperamentVector
    l3: NarrativeDriveVector
  }
  personas?: PersonaCandidate[]
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

interface PersonaListResponse {
  personas: PersonaCandidate[]
}

// ── GET — 시뮬레이션용 샘플 페르소나 목록 반환 ─────────────────

export async function GET() {
  try {
    const personas = getPersonaStore()

    return NextResponse.json<ApiResponse<PersonaListResponse>>({
      success: true,
      data: { personas },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "페르소나 목록 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── POST — 시뮬레이션 실행 ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SimulateRequest

    // Use provided personas or fall back to the stored ones
    const personas = body.personas && body.personas.length > 0 ? body.personas : getPersonaStore()

    if (personas.length === 0) {
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

      const results = matchAll(userProfile, personas, config)
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

      const results = matchAll(up, personas, config)
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
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "시뮬레이션 실행 실패" },
      },
      { status: 500 }
    )
  }
}
