import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey, type ValidatedApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"

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
// Persona v3 Response Transformer
// ============================================================================

function transformPersonaToV3(persona: {
  id: string
  name: string
  description: string | null
  role: string
  expertise: string[]
  depth: unknown
  lens: unknown
  stance: unknown
  scope: unknown
  taste: unknown
  purpose: unknown
  sociability: unknown
  openness: unknown
  conscientiousness: unknown
  extraversion: unknown
  agreeableness: unknown
  neuroticism: unknown
  lack: unknown
  moralCompass: unknown
  volatility: unknown
  growthArc: unknown
  archetypeId: string | null
  extendedParadoxScore: unknown
  l1l2Score: unknown
  l1l3Score: unknown
  l2l3Score: unknown
  createdAt: Date
  updatedAt: Date
}) {
  const result: Record<string, unknown> = {
    id: persona.id,
    name: persona.name,
    role: persona.role,
    expertise: persona.expertise,
    description: persona.description || "",
  }

  // Vectors: L1 always, L2/L3 optional
  const vectors: Record<string, unknown> = {
    l1: {
      depth: Number(persona.depth),
      lens: Number(persona.lens),
      stance: Number(persona.stance),
      scope: Number(persona.scope),
      taste: Number(persona.taste),
      purpose: Number(persona.purpose),
      sociability: Number(persona.sociability),
    },
  }

  if (persona.openness !== null) {
    vectors.l2 = {
      openness: Number(persona.openness),
      conscientiousness: Number(persona.conscientiousness),
      extraversion: Number(persona.extraversion),
      agreeableness: Number(persona.agreeableness),
      neuroticism: Number(persona.neuroticism),
    }
  }

  if (persona.lack !== null) {
    vectors.l3 = {
      lack: Number(persona.lack),
      moralCompass: Number(persona.moralCompass),
      volatility: Number(persona.volatility),
      growthArc: Number(persona.growthArc),
    }
  }

  result.vectors = vectors

  // Paradox profile — optional
  if (persona.extendedParadoxScore !== null) {
    result.paradox = {
      archetype_id: persona.archetypeId,
      extended_score: Number(persona.extendedParadoxScore),
      l1_l2_score: persona.l1l2Score ? Number(persona.l1l2Score) : null,
      l1_l3_score: persona.l1l3Score ? Number(persona.l1l3Score) : null,
      l2_l3_score: persona.l2l3Score ? Number(persona.l2l3Score) : null,
    }
  }

  return result
}

// ============================================================================
// GET /api/v1/personas — v3 페르소나 목록 (스펙 §9.3.2)
// ============================================================================

export async function GET(request: NextRequest) {
  const requestId = "req_" + crypto.randomBytes(12).toString("hex")
  const startTime = Date.now()

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

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20")), 100)
    const role = searchParams.get("role")
    const expertise = searchParams.get("expertise")

    // Build query filters
    const where: Record<string, unknown> = { active: true }
    if (role) {
      where.role = role.toUpperCase()
    }
    if (expertise) {
      where.expertise = { has: expertise }
    }

    // Fetch personas from database
    const [personas, total] = await Promise.all([
      prisma.persona.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.persona.count({ where }),
    ])

    // Transform to v3 API response format
    const transformedPersonas = personas.map(transformPersonaToV3)

    const latencyMs = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      "/api/v1/personas",
      200,
      latencyMs,
      { page, limit, role, expertise },
      { personas_count: transformedPersonas.length }
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          personas: transformedPersonas,
        },
        meta: {
          request_id: requestId,
          pagination: {
            current_page: page,
            total_pages: Math.ceil(total / limit),
            total_count: total,
          },
          processing_time_ms: latencyMs,
        },
      },
      {
        headers: getRateLimitHeaders(validation.apiKey),
      }
    )
  } catch (error) {
    console.error("Personas API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while fetching personas",
        },
        meta: { request_id: requestId },
      },
      { status: 500 }
    )
  }
}
