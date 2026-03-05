import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyExternalApiKey } from "@/lib/external-auth"
import { matchAll } from "@/lib/matching/three-tier-engine"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import { calculateVFinal } from "@/lib/vector/v-final"
import { rankContents } from "@/lib/content/content-ranking"
import { DEFAULT_L1_VECTOR, DEFAULT_L2_VECTOR, DEFAULT_L3_VECTOR } from "@/constants/v3/dimensions"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import type { UserProfile, PersonaCandidate } from "@/lib/matching/three-tier-engine"
import type { ContentItemForRanking } from "@/lib/content/content-ranking"

/**
 * POST /api/v1/recommendations
 *
 * B2B 추천 API — 유저 벡터 × 페르소나 큐레이션 기반 ContentItem 랭킹
 * Developer Console API Key 인증 필요.
 */

const L1_KEYS = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"] as const
const L2_KEYS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const
const L3_KEYS = ["lack", "moralCompass", "volatility", "growthArc"] as const

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const TOP_PERSONA_COUNT = 5

export async function POST(request: NextRequest) {
  // ── 인증 ─────────────────────────────────────────────────────
  const authResult = await verifyExternalApiKey(request)
  if (authResult instanceof NextResponse) return authResult
  const { tenantId } = authResult

  try {
    const body = await request.json()
    const userId = body.userId

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId는 필수입니다" } },
        { status: 400 }
      )
    }

    const limit = Math.min(
      Math.max(parseInt(body.limit ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    )

    // ── 1. PersonaWorldUser 벡터 조회 ─────────────────────────────
    const pwUser = await prisma.personaWorldUser.findUnique({
      where: { id: userId },
      select: {
        depth: true,
        lens: true,
        stance: true,
        scope: true,
        taste: true,
        purpose: true,
        sociability: true,
        openness: true,
        conscientiousness: true,
        extraversion: true,
        agreeableness: true,
        neuroticism: true,
        hasOceanProfile: true,
      },
    })

    // 벡터 없으면 fallback (최신 콘텐츠 반환)
    if (!pwUser || pwUser.depth === null) {
      return fallbackResponse(tenantId, limit)
    }

    // ── 2. UserProfile 조립 ───────────────────────────────────────
    const l1: SocialPersonaVector = Object.fromEntries(
      L1_KEYS.map((k) => [k, Number(pwUser[k] ?? DEFAULT_L1_VECTOR[k])])
    ) as unknown as SocialPersonaVector

    const l2: CoreTemperamentVector = pwUser.hasOceanProfile
      ? (Object.fromEntries(
          L2_KEYS.map((k) => [k, Number(pwUser[k] ?? DEFAULT_L2_VECTOR[k])])
        ) as unknown as CoreTemperamentVector)
      : { ...DEFAULT_L2_VECTOR }

    const l3: NarrativeDriveVector = { ...DEFAULT_L3_VECTOR }
    const vFinal = calculateVFinal(l1, l2, l3)
    const crossAxisProfile = calculateCrossAxisProfile(l1, l2, l3)
    const paradoxProfile = calculateExtendedParadoxScore(l1, l2, l3)

    const userProfile: UserProfile = {
      id: userId,
      l1,
      l2,
      l3,
      vFinal,
      crossAxisProfile,
      paradoxProfile,
    }

    // ── 3. 활성 페르소나 조회 ─────────────────────────────────────
    const personas = await prisma.persona.findMany({
      where: { status: { in: ["ACTIVE", "STANDARD"] } },
      select: {
        id: true,
        name: true,
        archetypeId: true,
        layerVectors: {
          select: {
            layerType: true,
            dim1: true,
            dim2: true,
            dim3: true,
            dim4: true,
            dim5: true,
            dim6: true,
            dim7: true,
          },
        },
      },
    })

    const candidates: PersonaCandidate[] = personas.map((p) => {
      const socialVec = p.layerVectors.find((v) => v.layerType === "SOCIAL")
      const tempVec = p.layerVectors.find((v) => v.layerType === "TEMPERAMENT")
      const narrVec = p.layerVectors.find((v) => v.layerType === "NARRATIVE")

      const pL1 = socialVec
        ? (Object.fromEntries(
            L1_KEYS.map((k, i) => [
              k,
              Number(socialVec[`dim${i + 1}` as keyof typeof socialVec] ?? DEFAULT_L1_VECTOR[k]),
            ])
          ) as unknown as SocialPersonaVector)
        : { ...DEFAULT_L1_VECTOR }

      const pL2 = tempVec
        ? (Object.fromEntries(
            L2_KEYS.map((k, i) => [
              k,
              Number(tempVec[`dim${i + 1}` as keyof typeof tempVec] ?? DEFAULT_L2_VECTOR[k]),
            ])
          ) as unknown as CoreTemperamentVector)
        : { ...DEFAULT_L2_VECTOR }

      const pL3 = narrVec
        ? (Object.fromEntries(
            L3_KEYS.map((k, i) => [
              k,
              Number(narrVec[`dim${i + 1}` as keyof typeof narrVec] ?? DEFAULT_L3_VECTOR[k]),
            ])
          ) as unknown as NarrativeDriveVector)
        : { ...DEFAULT_L3_VECTOR }

      return {
        id: p.id,
        name: p.name,
        l1: pL1,
        l2: pL2,
        l3: pL3,
        crossAxisProfile: calculateCrossAxisProfile(pL1, pL2, pL3),
        paradoxProfile: calculateExtendedParadoxScore(pL1, pL2, pL3),
        archetype: p.archetypeId ?? undefined,
      } satisfies PersonaCandidate
    })

    if (candidates.length === 0) {
      return fallbackResponse(tenantId, limit)
    }

    // ── 4. matchAll → 상위 5개 페르소나 ──────────────────────────
    const matchResults = matchAll(userProfile, candidates)
    const topResults = matchResults.slice(0, TOP_PERSONA_COUNT)
    const topPersonaIds = topResults.map((r) => r.personaId)
    const personaScoreMap = new Map(topResults.map((r) => [r.personaId, r.score]))

    // ── 5. APPROVED 큐레이션 + ContentItem 조회 ───────────────────
    const curations = await prisma.personaCuratedContent.findMany({
      where: {
        personaId: { in: topPersonaIds },
        status: "APPROVED",
        contentItem: { tenantId },
      },
      select: {
        personaId: true,
        curationScore: true,
        contentItem: {
          select: {
            id: true,
            contentType: true,
            title: true,
            description: true,
            sourceUrl: true,
            genres: true,
            tags: true,
            contentVector: true,
            narrativeTheme: true,
          },
        },
      },
    })

    if (curations.length === 0) {
      return fallbackResponse(tenantId, limit)
    }

    // ── 6. ContentItemForRanking 조립 ─────────────────────────────
    const personaNameMap = new Map(personas.map((p) => [p.id, p.name]))

    const contentsForRanking: ContentItemForRanking[] = curations.map((c) => {
      const ci = c.contentItem
      const personaMatchScore = personaScoreMap.get(c.personaId) ?? 0

      return {
        id: ci.id,
        contentVector: ci.contentVector as SocialPersonaVector | null,
        narrativeTheme: ci.narrativeTheme as NarrativeDriveVector | null,
        curationScore: Number(c.curationScore),
        personaId: c.personaId,
        personaName: personaNameMap.get(c.personaId) ?? "Unknown",
        personaMatchScore,
        contentType: ci.contentType,
        title: ci.title,
        description: ci.description,
        sourceUrl: ci.sourceUrl,
        genres: ci.genres,
        tags: ci.tags,
      }
    })

    // ── 7. 랭킹 계산 ──────────────────────────────────────────────
    const ranked = rankContents(l1, contentsForRanking, limit)

    return NextResponse.json({
      success: true,
      data: {
        items: ranked.map((r) => ({
          contentItem: {
            id: r.contentItemId,
            contentType: r.contentType,
            title: r.title,
            description: r.description,
            sourceUrl: r.sourceUrl,
            genres: r.genres,
            tags: r.tags,
          },
          recommendedBy: r.recommendedBy,
          finalScore: r.finalScore,
          matchScore: r.matchScore,
        })),
        total: ranked.length,
        userId,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "RECOMMENDATIONS_ERROR", message } },
      { status: 500 }
    )
  }
}

// ── Fallback: 최신 ContentItem 반환 ──────────────────────────

async function fallbackResponse(tenantId: string, limit: number): Promise<NextResponse> {
  const items = await prisma.contentItem.findMany({
    where: { tenantId, vectorizedAt: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      contentType: true,
      title: true,
      description: true,
      sourceUrl: true,
      genres: true,
      tags: true,
    },
  })

  return NextResponse.json({
    success: true,
    data: {
      items: items.map((ci) => ({
        contentItem: ci,
        recommendedBy: [],
        finalScore: null,
        matchScore: null,
      })),
      total: items.length,
      userId: null,
      isFallback: true,
    },
  })
}
