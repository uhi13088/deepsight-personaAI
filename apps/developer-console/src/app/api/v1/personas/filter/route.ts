import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import prisma from "@/lib/prisma"
import { validateApiKey, type ValidatedApiKey } from "@/lib/api-key-validator"
import { trackApiUsage } from "@/lib/usage-tracker"

// ============================================================================
// Constants
// ============================================================================

const VALID_ARCHETYPES = [
  "ironic-philosopher",
  "wounded-critic",
  "social-introvert",
  "lazy-perfectionist",
  "conservative-hipster",
  "empathetic-arguer",
  "free-guardian",
  "quiet-enthusiast",
  "emotional-pragmatist",
  "dangerous-mentor",
  "volatile-intellectual",
  "growing-cynic",
] as const

const L1_DIMENSIONS = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
] as const
const L2_DIMENSIONS = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
] as const
const L3_DIMENSIONS = ["lack", "moralCompass", "volatility", "growthArc"] as const

const SORTABLE_FIELDS = ["paradox.extendedScore", "paradox.l1l2Score", "createdAt", "name"] as const

// ============================================================================
// Types
// ============================================================================

interface VectorRange {
  min?: number
  max?: number
}

interface FilterRequest {
  filters?: {
    archetype?: {
      include?: string[]
      exclude?: string[]
    }
    vectors?: {
      l1?: Record<string, VectorRange>
      l2?: Record<string, VectorRange>
      l3?: Record<string, VectorRange>
    }
    paradox?: {
      extendedScore?: VectorRange
      l1l2Score?: VectorRange
      l1l3Score?: VectorRange
      l2l3Score?: VectorRange
    }
    crossAxis?: {
      patterns?: Array<{
        axisId: string
        relationship: string
        scoreRange?: VectorRange
      }>
    }
    matchingTier?: string
    role?: string
    expertise?: string[]
    status?: string
  }
  sort?: {
    field?: string
    order?: "asc" | "desc"
  }
  pagination?: {
    page?: number
    limit?: number
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
// Validation Helpers
// ============================================================================

function validateVectorRange(range: VectorRange, fieldPath: string): string | null {
  if (range.min !== undefined && (range.min < 0 || range.min > 1)) {
    return `INVALID_FIELD: vector range must be 0.0~1.0 for ${fieldPath}.min`
  }
  if (range.max !== undefined && (range.max < 0 || range.max > 1)) {
    return `INVALID_FIELD: vector range must be 0.0~1.0 for ${fieldPath}.max`
  }
  if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
    return `INVALID_FIELD: min (${range.min}) cannot be greater than max (${range.max}) for ${fieldPath}`
  }
  return null
}

function isValidDimension(dim: string, layer: "l1" | "l2" | "l3"): boolean {
  if (layer === "l1") return (L1_DIMENSIONS as readonly string[]).includes(dim)
  if (layer === "l2") return (L2_DIMENSIONS as readonly string[]).includes(dim)
  if (layer === "l3") return (L3_DIMENSIONS as readonly string[]).includes(dim)
  return false
}

// ============================================================================
// POST /api/v1/personas/filter — v3 다차원 필터 (스펙 §9.3.9)
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
    const body: FilterRequest = await request.json()
    const { filters = {}, sort, pagination } = body

    // Pagination
    const page = Math.max(1, pagination?.page || 1)
    const limit = Math.min(Math.max(1, pagination?.limit || 20), 100)

    // ========================================================================
    // Validate filters
    // ========================================================================

    // Validate archetype IDs
    if (filters.archetype?.include) {
      for (const id of filters.archetype.include) {
        if (!(VALID_ARCHETYPES as readonly string[]).includes(id)) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "INVALID_FIELD",
                message: `archetype "${id}" is not valid`,
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
    }

    if (filters.archetype?.exclude) {
      for (const id of filters.archetype.exclude) {
        if (!(VALID_ARCHETYPES as readonly string[]).includes(id)) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "INVALID_FIELD",
                message: `archetype "${id}" is not valid`,
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
    }

    // Validate vector ranges
    let vectorRangesCount = 0
    if (filters.vectors) {
      for (const layer of ["l1", "l2", "l3"] as const) {
        const layerFilters = filters.vectors[layer]
        if (layerFilters) {
          for (const [dim, range] of Object.entries(layerFilters)) {
            if (!isValidDimension(dim, layer)) {
              return NextResponse.json(
                {
                  success: false,
                  error: {
                    code: "INVALID_FIELD",
                    message: `dimension "${dim}" is not valid for layer ${layer}`,
                  },
                  meta: { request_id: requestId },
                },
                {
                  status: 400,
                  headers: getRateLimitHeaders(validation.apiKey),
                }
              )
            }
            const error = validateVectorRange(range, `vectors.${layer}.${dim}`)
            if (error) {
              return NextResponse.json(
                {
                  success: false,
                  error: { code: "INVALID_FIELD", message: error },
                  meta: { request_id: requestId },
                },
                {
                  status: 400,
                  headers: getRateLimitHeaders(validation.apiKey),
                }
              )
            }
            vectorRangesCount++
          }
        }
      }
    }

    // Validate paradox ranges
    let paradoxRangeApplied = false
    if (filters.paradox) {
      paradoxRangeApplied = true
      for (const [key, range] of Object.entries(filters.paradox)) {
        const error = validateVectorRange(range as VectorRange, `paradox.${key}`)
        if (error) {
          return NextResponse.json(
            {
              success: false,
              error: { code: "INVALID_FIELD", message: error },
              meta: { request_id: requestId },
            },
            {
              status: 400,
              headers: getRateLimitHeaders(validation.apiKey),
            }
          )
        }
      }
    }

    // ========================================================================
    // Build query
    // ========================================================================

    const where: Record<string, unknown> = { active: true }

    // Status filter
    if (filters.status) {
      where.status = filters.status.toUpperCase()
    }

    // Role filter
    if (filters.role) {
      where.role = filters.role.toUpperCase()
    }

    // Expertise filter (OR)
    if (filters.expertise && filters.expertise.length > 0) {
      where.expertise = { hasSome: filters.expertise }
    }

    // Archetype include filter
    if (filters.archetype?.include && filters.archetype.include.length > 0) {
      where.archetypeId = { in: filters.archetype.include }
    }

    // Archetype exclude filter
    if (filters.archetype?.exclude && filters.archetype.exclude.length > 0) {
      if (where.archetypeId) {
        // Both include and exclude: need AND
        where.AND = [
          { archetypeId: where.archetypeId },
          { archetypeId: { notIn: filters.archetype.exclude } },
        ]
        delete where.archetypeId
      } else {
        where.archetypeId = { notIn: filters.archetype.exclude }
      }
    }

    // ========================================================================
    // Sort
    // ========================================================================

    let orderBy: Record<string, string> = { createdAt: "desc" }
    if (sort?.field) {
      const sortOrder = sort.order || "desc"

      if (sort.field === "paradox.extendedScore") {
        orderBy = { extendedParadoxScore: sortOrder }
      } else if (sort.field === "paradox.l1l2Score") {
        orderBy = { l1l2Score: sortOrder }
      } else if (sort.field === "createdAt") {
        orderBy = { createdAt: sortOrder }
      } else if (sort.field === "name") {
        orderBy = { name: sortOrder }
      } else if (sort.field.startsWith("vectors.")) {
        // e.g. vectors.l1.depth → field: depth
        const parts = sort.field.split(".")
        if (parts.length === 3) {
          const dim = parts[2]
          orderBy = { [dim]: sortOrder }
        }
      }
    }

    // ========================================================================
    // Fetch from database
    // ========================================================================

    const [allPersonas, total] = await Promise.all([
      prisma.persona.findMany({
        where,
        orderBy,
      }),
      prisma.persona.count({ where }),
    ])

    // ========================================================================
    // Apply in-memory vector/paradox/crossAxis filters
    // ========================================================================

    const filtered = allPersonas.filter((persona) => {
      // Vector L1 range filters
      if (filters.vectors?.l1) {
        for (const [dim, range] of Object.entries(filters.vectors.l1)) {
          const val = Number((persona as Record<string, unknown>)[dim])
          if (range.min !== undefined && val < range.min) return false
          if (range.max !== undefined && val > range.max) return false
        }
      }

      // Vector L2 range filters
      if (filters.vectors?.l2) {
        for (const [dim, range] of Object.entries(filters.vectors.l2)) {
          const val = (persona as Record<string, unknown>)[dim]
          if (val === null || val === undefined) return false
          if (range.min !== undefined && Number(val) < range.min) return false
          if (range.max !== undefined && Number(val) > range.max) return false
        }
      }

      // Vector L3 range filters
      if (filters.vectors?.l3) {
        for (const [dim, range] of Object.entries(filters.vectors.l3)) {
          const val = (persona as Record<string, unknown>)[dim]
          if (val === null || val === undefined) return false
          if (range.min !== undefined && Number(val) < range.min) return false
          if (range.max !== undefined && Number(val) > range.max) return false
        }
      }

      // Paradox range filters
      if (filters.paradox) {
        if (filters.paradox.extendedScore) {
          const eps = persona.extendedParadoxScore ? Number(persona.extendedParadoxScore) : null
          if (eps === null) return false
          if (
            filters.paradox.extendedScore.min !== undefined &&
            eps < filters.paradox.extendedScore.min
          )
            return false
          if (
            filters.paradox.extendedScore.max !== undefined &&
            eps > filters.paradox.extendedScore.max
          )
            return false
        }
        if (filters.paradox.l1l2Score) {
          const val = persona.l1l2Score ? Number(persona.l1l2Score) : null
          if (val === null) return false
          if (filters.paradox.l1l2Score.min !== undefined && val < filters.paradox.l1l2Score.min)
            return false
          if (filters.paradox.l1l2Score.max !== undefined && val > filters.paradox.l1l2Score.max)
            return false
        }
        if (filters.paradox.l1l3Score) {
          const val = persona.l1l3Score ? Number(persona.l1l3Score) : null
          if (val === null) return false
          if (filters.paradox.l1l3Score.min !== undefined && val < filters.paradox.l1l3Score.min)
            return false
          if (filters.paradox.l1l3Score.max !== undefined && val > filters.paradox.l1l3Score.max)
            return false
        }
        if (filters.paradox.l2l3Score) {
          const val = persona.l2l3Score ? Number(persona.l2l3Score) : null
          if (val === null) return false
          if (filters.paradox.l2l3Score.min !== undefined && val < filters.paradox.l2l3Score.min)
            return false
          if (filters.paradox.l2l3Score.max !== undefined && val > filters.paradox.l2l3Score.max)
            return false
        }
      }

      return true
    })

    // ========================================================================
    // Paginate
    // ========================================================================

    const totalMatched = filtered.length
    const paginatedPersonas = filtered.slice((page - 1) * limit, page * limit)

    // ========================================================================
    // Build archetype distribution
    // ========================================================================

    const archetypeDistribution: Record<string, number> = {}
    for (const p of filtered) {
      const archId = p.archetypeId || "unknown"
      archetypeDistribution[archId] = (archetypeDistribution[archId] || 0) + 1
    }

    // ========================================================================
    // Transform response
    // ========================================================================

    const personas = paginatedPersonas.map((persona) => {
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

      const result: Record<string, unknown> = {
        id: persona.id,
        name: persona.name,
        role: persona.role,
        expertise: persona.expertise,
        description: persona.description || "",
        vectors,
        status: persona.status,
        createdAt: persona.createdAt.toISOString(),
      }

      // Archetype info
      if (persona.archetypeId) {
        result.archetype = {
          id: persona.archetypeId,
        }
      }

      // Paradox
      if (persona.extendedParadoxScore !== null) {
        result.paradox = {
          extendedScore: Number(persona.extendedParadoxScore),
          l1l2Score: persona.l1l2Score ? Number(persona.l1l2Score) : null,
          l1l3Score: persona.l1l3Score ? Number(persona.l1l3Score) : null,
          l2l3Score: persona.l2l3Score ? Number(persona.l2l3Score) : null,
        }
      }

      return result
    })

    const processingTime = Date.now() - startTime

    // Track usage
    await trackApiUsage(
      request,
      validation.apiKey,
      requestId,
      "/api/v1/personas/filter",
      200,
      processingTime,
      { filters_count: Object.keys(filters).length, page, limit },
      { total_matched: totalMatched }
    )

    return NextResponse.json(
      {
        success: true,
        data: {
          personas,
          appliedFilters: {
            archetype: filters.archetype || null,
            vectorRanges: vectorRangesCount,
            paradoxRange: paradoxRangeApplied,
            crossAxisPatterns: filters.crossAxis?.patterns?.length || 0,
          },
          filterStats: {
            totalMatched,
            archetypeDistribution,
          },
        },
        meta: {
          request_id: requestId,
          pagination: {
            current_page: page,
            total_pages: Math.ceil(totalMatched / limit),
            total_count: totalMatched,
          },
          processing_time_ms: processingTime,
        },
      },
      {
        headers: getRateLimitHeaders(validation.apiKey),
      }
    )
  } catch (error) {
    console.error("Persona Filter API error:", error)

    const processingTime = Date.now() - startTime

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An error occurred while filtering personas",
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
