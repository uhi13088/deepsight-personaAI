import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey, type ValidatedApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"

// ============================================================================
// Types
// ============================================================================

type MatchingTier = "basic" | "advanced" | "exploration"

interface BatchMatchItem {
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
// Vector Utilities
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

function computeScore(
  persona: {
    l1: number[]
    l2: number[] | null
    eps: number | null
  },
  tier: MatchingTier
): number {
  const defaultL1 = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
  const l1Score = cosineSimilarity(persona.l1, defaultL1)

  if (tier === "basic") {
    return Math.round(l1Score * 1000) / 10
  }

  let l2Score = 0
  if (persona.l2) {
    l2Score = cosineSimilarity(persona.l2, [0.5, 0.5, 0.5, 0.5, 0.5])
  }

  const eps = persona.eps ?? 0
  const overall = l1Score * 0.7 + l2Score * 0.2 + eps * 0.1

  return Math.round(overall * 1000) / 10
}

// ============================================================================
// POST /api/v1/batch-match — v3 배치 매칭
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
    const body = await request.json()
    const { items } = body

    // Validate items array
    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_ITEMS",
            message: "items is required and must be an array of match requests",
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMPTY_ITEMS",
            message: "items array must not be empty",
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    if (items.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_ITEMS",
            message: "items array must not exceed 100 items",
          },
          meta: { request_id: requestId },
        },
        {
          status: 400,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as BatchMatchItem
      if (!item.user_id || typeof item.user_id !== "string") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_USER_ID",
              message: `item at index ${i} must have a valid user_id`,
            },
            meta: { request_id: requestId },
          },
          {
            status: 400,
            headers: getRateLimitHeaders(validation.apiKey),
          }
        )
      }
    }

    // Fetch all active personas once (optimization)
    const personas = await prisma.persona.findMany({
      where: { active: true },
    })

    // Process each item
    const results = (items as BatchMatchItem[]).map((item) => {
      const topN = Math.min(Math.max(item.options?.top_n || 5, 1), 20)
      const tier = item.options?.matching_tier || "basic"
      const includeScore = item.options?.include_score !== false

      // Filter personas by category if specified
      const filteredPersonas = item.context?.category
        ? personas.filter((p) => p.category === item.context!.category)
        : personas

      const matches = filteredPersonas
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

          const eps = persona.extendedParadoxScore ? Number(persona.extendedParadoxScore) : null

          const score = computeScore({ l1, l2, eps }, tier)

          return {
            persona_id: persona.id,
            persona_name: persona.name,
            score: includeScore ? score : undefined,
          }
        })
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, topN)

      return {
        user_id: item.user_id,
        matching_tier: tier,
        matches,
      }
    })

    const processingTime = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      "/api/v1/batch-match",
      200,
      processingTime,
      { items_count: items.length },
      { results_count: results.length }
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          results,
        },
        meta: {
          request_id: requestId,
          total_items: items.length,
          processing_time_ms: processingTime,
        },
      },
      {
        headers: getRateLimitHeaders(validation.apiKey),
      }
    )
  } catch (error) {
    console.error("Batch Match API error:", error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while processing the batch match request",
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
