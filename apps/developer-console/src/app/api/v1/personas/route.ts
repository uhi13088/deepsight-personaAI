import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"
import type { PersonaVector } from "@deepsight/shared-types"
import type { Persona } from "@prisma/client"

// GET /api/v1/personas - List all available personas
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
          requestId,
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const perPage = Math.min(Math.max(1, parseInt(searchParams.get("per_page") || "10")), 100)
    const category = searchParams.get("category")
    const active = searchParams.get("active") !== "false" // Default to active only

    // Build query filters
    const where: { category?: string; active?: boolean } = {}
    if (category) {
      where.category = category
    }
    if (active) {
      where.active = true
    }

    // Fetch personas from database
    const [personas, total] = await Promise.all([
      prisma.persona.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: "desc" },
      }),
      prisma.persona.count({ where }),
    ])

    // Transform to API response format
    const transformedPersonas = personas.map((p: Persona) => ({
      id: p.id,
      name: p.name,
      category: p.category || "General",
      description: p.description || "",
      dimensions: {
        depth: Number(p.depth),
        lens: Number(p.lens),
        stance: Number(p.stance),
        scope: Number(p.scope),
        taste: Number(p.taste),
        purpose: Number(p.purpose),
      } satisfies PersonaVector,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))

    const response = {
      success: true,
      requestId,
      data: {
        personas: transformedPersonas,
      },
      meta: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        hasMore: page * perPage < total,
      },
    }

    const latencyMs = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      "/api/v1/personas",
      200,
      latencyMs,
      { page, per_page: perPage, category },
      { personas_count: transformedPersonas.length }
    )

    return NextResponse.json(response)
  } catch (error) {
    console.error("Personas API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while fetching personas",
        },
        requestId,
      },
      { status: 500 }
    )
  }
}
