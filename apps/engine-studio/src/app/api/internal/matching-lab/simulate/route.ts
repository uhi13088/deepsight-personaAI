// ═══════════════════════════════════════════════════════════════
// 매칭 시뮬레이션 — DB에서 실제 페르소나를 로드하여 매칭 테스트
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
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
import { DEFAULT_L1_VECTOR, DEFAULT_L2_VECTOR, DEFAULT_L3_VECTOR } from "@/constants/v3/dimensions"

// ── DB에서 페르소나 로드 ─────────────────────────────────────

const L1_KEYS = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"] as const
const L2_KEYS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const
const L3_KEYS = ["lack", "moralCompass", "volatility", "growthArc"] as const

async function loadPersonasFromDB(): Promise<PersonaCandidate[]> {
  const personas = await prisma.persona.findMany({
    where: { status: { in: ["ACTIVE", "STANDARD", "REVIEW"] } },
    include: {
      layerVectors: {
        orderBy: { version: "desc" },
      },
    },
    take: 100,
  })

  if (personas.length === 0) {
    return []
  }

  return personas.map((p) => {
    const socialVec = p.layerVectors.find((v) => v.layerType === "SOCIAL")
    const tempVec = p.layerVectors.find((v) => v.layerType === "TEMPERAMENT")
    const narrVec = p.layerVectors.find((v) => v.layerType === "NARRATIVE")

    const l1: SocialPersonaVector = socialVec
      ? (Object.fromEntries(
          L1_KEYS.map((k, i) => [
            k,
            Number(socialVec[`dim${i + 1}` as keyof typeof socialVec] ?? 0.5),
          ])
        ) as unknown as SocialPersonaVector)
      : { ...DEFAULT_L1_VECTOR }

    const l2: CoreTemperamentVector = tempVec
      ? (Object.fromEntries(
          L2_KEYS.map((k, i) => [k, Number(tempVec[`dim${i + 1}` as keyof typeof tempVec] ?? 0.5)])
        ) as unknown as CoreTemperamentVector)
      : { ...DEFAULT_L2_VECTOR }

    const l3: NarrativeDriveVector = narrVec
      ? (Object.fromEntries(
          L3_KEYS.map((k, i) => [k, Number(narrVec[`dim${i + 1}` as keyof typeof narrVec] ?? 0)])
        ) as unknown as NarrativeDriveVector)
      : { ...DEFAULT_L3_VECTOR }

    const crossAxisProfile = calculateCrossAxisProfile(l1, l2, l3)
    const paradoxProfile = calculateExtendedParadoxScore(l1, l2, l3)

    return {
      id: p.id,
      name: p.name,
      l1,
      l2,
      l3,
      crossAxisProfile,
      paradoxProfile,
      archetype: p.archetypeId ?? undefined,
    }
  })
}

// ── 데모 페르소나 (DB에 데이터 없을 때 폴백) ────────────────

function createDemoPersonas(): PersonaCandidate[] {
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
  personaSource: "db" | "demo"
}

interface PersonaListResponse {
  personas: PersonaCandidate[]
  source: "db" | "demo"
}

// ── GET — 시뮬레이션용 페르소나 목록 반환 ───────────────────────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    let personas = await loadPersonasFromDB()
    let source: "db" | "demo" = "db"

    if (personas.length === 0) {
      personas = createDemoPersonas()
      source = "demo"
    }

    return NextResponse.json<ApiResponse<PersonaListResponse>>({
      success: true,
      data: { personas, source },
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
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as SimulateRequest

    // 커스텀 페르소나가 없으면 DB에서 로드
    let personas: PersonaCandidate[]
    let personaSource: "db" | "demo" = "db"

    if (body.personas && body.personas.length > 0) {
      personas = body.personas
    } else {
      personas = await loadPersonasFromDB()
      if (personas.length === 0) {
        personas = createDemoPersonas()
        personaSource = "demo"
      }
    }

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
        data: { mode: "single", results, personaSource },
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
        personaSource,
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
