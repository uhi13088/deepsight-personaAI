import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"
import type { PersonaVector } from "@deepsight/shared-types"

// GET /api/v1/personas/:id - Get a single persona by ID
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
          requestId,
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
          requestId,
        },
        { status: 404 }
      )
    }

    // Transform to API response format
    const transformedPersona = {
      id: persona.id,
      name: persona.name,
      category: persona.category || "General",
      description: persona.description || "",
      active: persona.active,
      dimensions: {
        depth: Number(persona.depth),
        lens: Number(persona.lens),
        stance: Number(persona.stance),
        scope: Number(persona.scope),
        taste: Number(persona.taste),
        purpose: Number(persona.purpose),
      } satisfies PersonaVector,
      createdAt: persona.createdAt.toISOString(),
      updatedAt: persona.updatedAt.toISOString(),
    }

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

    return NextResponse.json({
      success: true,
      requestId,
      data: {
        persona: transformedPersona,
      },
      meta: {
        processingTimeMs: latencyMs,
      },
    })
  } catch (error) {
    console.error("Persona GET API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while fetching the persona",
        },
        requestId,
      },
      { status: 500 }
    )
  }
}
