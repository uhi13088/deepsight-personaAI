import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey, type ValidatedApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"

// ============================================================================
// Types
// ============================================================================

type MatchingTier = "basic" | "advanced" | "exploration"

interface MatchRequestBody {
  user_id: string
  context?: {
    category?: string
    time_of_day?: string
    device?: string
    custom?: Record<string, unknown>
  }
  options?: {
    top_n?: number
    matching_tier?: MatchingTier
    include_score?: boolean
    include_explanation?: boolean
  }
}

// ============================================================================
// Rate Limit Helpers
// ============================================================================

function getRateLimitHeaders(apiKey: ValidatedApiKey) {
  const limit = apiKey.rateLimit
  const resetTime = Math.floor(Date.now() / 60000) * 60 + 60
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(Math.max(0, limit - 1)),
    "X-RateLimit-Reset": String(resetTime),
  }
}

// ============================================================================
// Vector Utilities (v3 3-Layer)
// ============================================================================

function cosineSimilarity(v1: number[], v2: number[]): number {
  let dotProduct = 0
  let magnitude1 = 0
  let magnitude2 = 0

  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i]
    magnitude1 += v1[i] ** 2
    magnitude2 += v2[i] ** 2
  }

  magnitude1 = Math.sqrt(magnitude1)
  magnitude2 = Math.sqrt(magnitude2)

  if (magnitude1 === 0 || magnitude2 === 0) return 0

  return dotProduct / (magnitude1 * magnitude2)
}

/** Neutral fallback vector (used when UserVector not found) */
const NEUTRAL_L1 = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
const NEUTRAL_L2 = [0.5, 0.5, 0.5, 0.5, 0.5]
const NEUTRAL_L3 = [0.5, 0.5, 0.5, 0.5]

/** Fetch real user vector from DB, fallback to neutral */
async function getUserVector(
  userId: string,
  organizationId: string
): Promise<{ l1: number[]; l2: number[] | null; l3: number[] | null }> {
  const uv = await prisma.userVector.findFirst({
    where: { userId, organizationId },
  })

  if (!uv) {
    return { l1: NEUTRAL_L1, l2: null, l3: null }
  }

  const l1 = [
    Number(uv.depth),
    Number(uv.lens),
    Number(uv.stance),
    Number(uv.scope),
    Number(uv.taste),
    Number(uv.purpose),
    Number(uv.sociability),
  ]

  const l2 =
    uv.openness !== null
      ? [
          Number(uv.openness),
          Number(uv.conscientiousness),
          Number(uv.extraversion),
          Number(uv.agreeableness),
          Number(uv.neuroticism),
        ]
      : null

  return { l1, l2, l3: null }
}

/**
 * Compute overall match score based on matching tier
 * - basic: L1 similarity only (7D)
 * - advanced: L1 70% + L2 20% + EPS 10%
 * - exploration: L1 50% + L2 20% + L3 20% + EPS 10%
 */
function computeMatchScore(
  persona: {
    l1: number[]
    l2: number[] | null
    l3: number[] | null
    eps: number | null
  },
  userVector: { l1: number[]; l2: number[] | null; l3: number[] | null },
  tier: MatchingTier
): {
  overallScore: number
  similarityScore: number
  paradoxCompatibility: number | null
} {
  const l1Score = cosineSimilarity(persona.l1, userVector.l1)

  if (tier === "basic") {
    return {
      overallScore: Math.round(l1Score * 1000) / 10,
      similarityScore: Math.round(l1Score * 1000) / 10,
      paradoxCompatibility: null,
    }
  }

  let l2Score = 0
  if (persona.l2) {
    const userL2 = userVector.l2 ?? NEUTRAL_L2
    l2Score = cosineSimilarity(persona.l2, userL2)
  }

  const epsScore = persona.eps ?? 0

  if (tier === "advanced") {
    const overall = l1Score * 0.7 + l2Score * 0.2 + epsScore * 0.1
    return {
      overallScore: Math.round(overall * 1000) / 10,
      similarityScore: Math.round(l1Score * 1000) / 10,
      paradoxCompatibility: Math.round(epsScore * 1000) / 10,
    }
  }

  // Exploration
  let l3Score = 0
  if (persona.l3) {
    const userL3 = userVector.l3 ?? NEUTRAL_L3
    l3Score = cosineSimilarity(persona.l3, userL3)
  }

  const overall = l1Score * 0.5 + l2Score * 0.2 + l3Score * 0.2 + epsScore * 0.1
  return {
    overallScore: Math.round(overall * 1000) / 10,
    similarityScore: Math.round(l1Score * 1000) / 10,
    paradoxCompatibility: Math.round(epsScore * 1000) / 10,
  }
}

// ============================================================================
// POST /api/v1/match — v3 3-Layer Matching (스펙 §9.3.1)
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = "req_" + crypto.randomBytes(12).toString("hex")

  try {
    // Validate API key
    const validation = await validateApiKey(request)
    if (!validation.valid || !validation.apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: validation.error?.code || "UNAUTHORIZED",
            message: validation.error?.message || "Invalid API key",
          },
          meta: { request_id: requestId },
        },
        { status: 401 }
      )
    }

    // Parse request body
    const body: MatchRequestBody = await request.json()
    const { user_id, context, options = {} } = body

    // Validate user_id
    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_USER_ID",
            message: "user_id is required and must be a string",
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    const topN = Math.min(Math.max(options.top_n || 5, 1), 20)
    const matchingTier: MatchingTier = options.matching_tier || "basic"
    const includeScore = options.include_score !== false
    const includeExplanation = options.include_explanation === true

    if (!["basic", "advanced", "exploration"].includes(matchingTier)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MATCHING_TIER",
            message: "matching_tier must be one of: basic, advanced, exploration",
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Fetch user vector from DB (real vectors, not hardcoded)
    const userVector = await getUserVector(user_id, validation.apiKey.organizationId)

    // Fetch active personas
    const personas = await prisma.persona.findMany({
      where: {
        active: true,
        ...(context?.category ? { category: context.category } : {}),
      },
    })

    // Compute match scores
    const matches = personas
      .map((persona) => {
        const l1 = [
          Number(persona.depth),
          Number(persona.lens),
          Number(persona.stance),
          Number(persona.scope),
          Number(persona.taste),
          Number(persona.purpose),
          Number(persona.sociability),
        ]

        const l2 =
          persona.openness !== null
            ? [
                Number(persona.openness),
                Number(persona.conscientiousness),
                Number(persona.extraversion),
                Number(persona.agreeableness),
                Number(persona.neuroticism),
              ]
            : null

        const l3 =
          persona.lack !== null
            ? [
                Number(persona.lack),
                Number(persona.moralCompass),
                Number(persona.volatility),
                Number(persona.growthArc),
              ]
            : null

        const eps = persona.extendedParadoxScore ? Number(persona.extendedParadoxScore) : null

        const scores = computeMatchScore({ l1, l2, l3, eps }, userVector, matchingTier)

        return {
          persona_id: persona.id,
          persona_name: persona.name,
          score: includeScore ? scores.overallScore : undefined,
          explanation: includeExplanation
            ? `${matchingTier} tier matching — similarity ${scores.similarityScore}%`
            : undefined,
          ...(matchingTier !== "basic" && includeScore
            ? {
                details: {
                  similarity_score: scores.similarityScore,
                  paradox_compatibility: scores.paradoxCompatibility,
                },
              }
            : {}),
        }
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, topN)

    const processingTime = Date.now() - startTime

    // Store top match in database (async)
    if (matches.length > 0) {
      prisma.matchResult
        .create({
          data: {
            requestId,
            userId: user_id,
            personaId: matches[0].persona_id,
            matchingTier: matchingTier.toUpperCase() as "BASIC" | "ADVANCED" | "EXPLORATION",
            overallScore: matches[0].score,
            context: context as object | undefined,
            processingTimeMs: processingTime,
          },
        })
        .catch((err: Error) => console.error("Failed to store match result:", err))
    }

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      "/api/v1/match",
      200,
      processingTime,
      { user_id, matching_tier: matchingTier, top_n: topN },
      { matches_found: matches.length }
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          matches,
          user_archetype: null, // Populated when UserVector exists
        },
        meta: {
          request_id: requestId,
          processing_time_ms: processingTime,
          matching_tier: matchingTier,
        },
      },
      {
        headers: getRateLimitHeaders(validation.apiKey),
      }
    )
  } catch (error) {
    console.error("Match API error:", error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while processing the match request",
        },
        meta: {
          request_id: requestId,
          processing_time_ms: processingTime,
        },
      },
      { status: 500 }
    )
  }
}
