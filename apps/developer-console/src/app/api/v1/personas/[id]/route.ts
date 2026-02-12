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
// GET /api/v1/personas/:id — v3 페르소나 상세 (스펙 §9.3.3)
// ============================================================================

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params

    // Fetch persona from database
    const persona = await prisma.persona.findUnique({
      where: { id },
    })

    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Persona with id '${id}' not found`,
          },
          meta: { request_id: requestId },
        },
        {
          status: 404,
          headers: getRateLimitHeaders(validation.apiKey),
        }
      )
    }

    // Build v3 response with full 3-Layer vectors + paradox + archetype
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

    const data: Record<string, unknown> = {
      id: persona.id,
      name: persona.name,
      role: persona.role,
      expertise: persona.expertise,
      description: persona.description || "",
      category: persona.category || "General",
      active: persona.active,
      status: persona.status,
      vector: vectors,
    }

    // Paradox profile
    if (persona.extendedParadoxScore !== null) {
      data.paradox = {
        archetype_id: persona.archetypeId,
        extended_score: Number(persona.extendedParadoxScore),
        l1_l2_score: persona.l1l2Score ? Number(persona.l1l2Score) : null,
        l1_l3_score: persona.l1l3Score ? Number(persona.l1l3Score) : null,
        l2_l3_score: persona.l2l3Score ? Number(persona.l2l3Score) : null,
      }
    }

    // Character attributes
    data.character = {
      handle: persona.handle,
      tagline: persona.tagline,
      warmth: persona.warmth ? Number(persona.warmth) : null,
      expertise_level: persona.expertiseLevel,
    }

    data.created_at = persona.createdAt.toISOString()
    data.updated_at = persona.updatedAt.toISOString()

    const latencyMs = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      `/api/v1/personas/${id}`,
      200,
      latencyMs,
      { id },
      { found: true }
    )

    return NextResponse.json(
      {
        success: true,
        data,
        meta: {
          request_id: requestId,
          processing_time_ms: latencyMs,
        },
      },
      {
        headers: getRateLimitHeaders(validation.apiKey),
      }
    )
  } catch (error) {
    console.error("Persona GET API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while fetching the persona",
        },
        meta: { request_id: requestId },
      },
      { status: 500 }
    )
  }
}
