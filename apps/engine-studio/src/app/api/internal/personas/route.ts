import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type {
  ApiResponse,
  PersonaListResponse,
  PersonaListItem,
  VectorRangeFilter,
  CrossAxisFilter,
  PersonaSortField,
  SortOrder,
} from "@/types"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import type { Prisma } from "@/generated/prisma"

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20
const DEFAULT_PAGE = 1

// ── Persona Status → PersonaStatus enum 매핑 ───────────────────
const VALID_STATUSES = new Set([
  "DRAFT",
  "REVIEW",
  "ACTIVE",
  "STANDARD",
  "LEGACY",
  "DEPRECATED",
  "PAUSED",
  "ARCHIVED",
])

const VALID_SOURCES = new Set(["MANUAL", "INCUBATOR", "MUTATION", "AUTO_GENERATED"])

const VALID_SORT_FIELDS: Record<PersonaSortField, string> = {
  createdAt: "createdAt",
  name: "name",
  paradoxScore: "paradoxScore",
  validationScore: "validationScore",
  qualityScore: "qualityScore",
}

// ── L1/L2/L3 차원 → PersonaLayerVector dim 매핑 ───────────────
const L1_DIM_MAP: Record<string, string> = {
  depth: "dim1",
  lens: "dim2",
  stance: "dim3",
  scope: "dim4",
  taste: "dim5",
  purpose: "dim6",
  sociability: "dim7",
}

const L2_DIM_MAP: Record<string, string> = {
  openness: "dim1",
  conscientiousness: "dim2",
  extraversion: "dim3",
  agreeableness: "dim4",
  neuroticism: "dim5",
}

const L3_DIM_MAP: Record<string, string> = {
  lack: "dim1",
  moralCompass: "dim2",
  volatility: "dim3",
  growthArc: "dim4",
}

function parseIntSafe(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

function parseFloatSafe(value: string | null): number | null {
  if (!value) return null
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

function parseJsonSafe<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

// ── 벡터 범위 필터 → Prisma where 조건 생성 ────────────────────
function buildVectorRangeConditions(
  filters: VectorRangeFilter
): Prisma.PersonaWhereInput["layerVectors"] {
  const conditions: Prisma.PersonaLayerVectorWhereInput[] = []

  const layerConfigs = [
    { key: "l1" as const, type: "SOCIAL" as const, dimMap: L1_DIM_MAP },
    { key: "l2" as const, type: "TEMPERAMENT" as const, dimMap: L2_DIM_MAP },
    { key: "l3" as const, type: "NARRATIVE" as const, dimMap: L3_DIM_MAP },
  ]

  for (const { key, type, dimMap } of layerConfigs) {
    const layerFilter = filters[key]
    if (!layerFilter) continue

    const dimConditions: Record<string, Prisma.DecimalNullableFilter<"PersonaLayerVector">> = {}

    for (const [dimName, range] of Object.entries(layerFilter)) {
      const dimCol = dimMap[dimName]
      if (!dimCol || !range) continue

      const condition: Prisma.DecimalNullableFilter<"PersonaLayerVector"> = {}
      if (range.min !== undefined) condition.gte = range.min
      if (range.max !== undefined) condition.lte = range.max
      dimConditions[dimCol] = condition
    }

    if (Object.keys(dimConditions).length > 0) {
      conditions.push({
        layerType: type,
        ...dimConditions,
      })
    }
  }

  if (conditions.length === 0) return undefined
  return { some: { AND: conditions } }
}

// ── PersonaLayerVector → Record<string, number> 변환 ─────────
function layerVectorToRecord(
  layerVector: {
    dim1: unknown
    dim2: unknown
    dim3: unknown
    dim4: unknown
    dim5: unknown
    dim6: unknown
    dim7: unknown
  },
  dimMap: Record<string, string>
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const [dimName, dimCol] of Object.entries(dimMap)) {
    const value = layerVector[dimCol as keyof typeof layerVector]
    if (value !== null && value !== undefined) {
      result[dimName] =
        typeof value === "object" && "toNumber" in value
          ? (value as { toNumber(): number }).toNumber()
          : Number(value)
    }
  }
  return result
}

// ═══════════════════════════════════════════════════════════════
// GET /api/internal/personas
// ═══════════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { searchParams } = request.nextUrl

    // ── Parse parameters ─────────────────────────────────────
    const page = Math.max(1, parseIntSafe(searchParams.get("page"), DEFAULT_PAGE))
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseIntSafe(searchParams.get("limit"), DEFAULT_LIMIT))
    )
    const skip = (page - 1) * limit

    const statusParam = searchParams.get("status")
    const sourceParam = searchParams.get("source")
    const searchQuery = searchParams.get("search")
    const archetypeParam = searchParams.get("archetype")
    const sortField = (searchParams.get("sort") ?? "createdAt") as PersonaSortField
    const sortOrder = (searchParams.get("order") ?? "desc") as SortOrder
    const paradoxMin = parseFloatSafe(searchParams.get("paradoxMin"))
    const paradoxMax = parseFloatSafe(searchParams.get("paradoxMax"))
    const engineVersionParam = searchParams.get("engineVersion")
    const vectorFilters = parseJsonSafe<VectorRangeFilter>(searchParams.get("vectorFilters"))
    const crossAxisFilters = parseJsonSafe<CrossAxisFilter[]>(searchParams.get("crossAxisFilters"))

    // ── Build WHERE conditions ───────────────────────────────
    const where: Prisma.PersonaWhereInput = {}

    // Status filter
    if (statusParam && VALID_STATUSES.has(statusParam)) {
      where.status = statusParam as Prisma.EnumPersonaStatusFilter["equals"]
    }

    // Source filter
    if (sourceParam && VALID_SOURCES.has(sourceParam)) {
      where.source = sourceParam as Prisma.EnumPersonaSourceFilter["equals"]
    }

    // Archetype filter (comma-separated)
    if (archetypeParam) {
      const archetypeIds = archetypeParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
      if (archetypeIds.length > 0) {
        where.archetypeId = { in: archetypeIds }
      }
    }

    // Search (name + description)
    if (searchQuery && searchQuery.trim()) {
      where.OR = [
        { name: { contains: searchQuery.trim(), mode: "insensitive" } },
        { description: { contains: searchQuery.trim(), mode: "insensitive" } },
      ]
    }

    // Engine version filter
    if (engineVersionParam) {
      if (engineVersionParam === "unknown") {
        where.engineVersion = null
      } else {
        where.engineVersion = engineVersionParam
      }
    }

    // Paradox score range
    if (paradoxMin !== null || paradoxMax !== null) {
      const paradoxCondition: Prisma.DecimalNullableFilter<"Persona"> = {}
      if (paradoxMin !== null) paradoxCondition.gte = paradoxMin
      if (paradoxMax !== null) paradoxCondition.lte = paradoxMax
      where.paradoxScore = paradoxCondition
    }

    // Vector range filters
    if (vectorFilters) {
      const vectorConditions = buildVectorRangeConditions(vectorFilters)
      if (vectorConditions) {
        where.layerVectors = vectorConditions
      }
    }

    // Cross-axis pattern filters (applied via paradoxConfig JSON)
    if (crossAxisFilters && crossAxisFilters.length > 0) {
      // Cross-axis scores are computed dynamically, not stored in DB.
      // For DB-level filtering, we use the paradoxScore range.
      // Deep cross-axis filtering is done at application level post-query.
      // This is noted in the spec as an advanced filter.
    }

    // ── Build ORDER BY ───────────────────────────────────────
    const orderByField = VALID_SORT_FIELDS[sortField] ?? "createdAt"
    const orderBy: Prisma.PersonaOrderByWithRelationInput = {
      [orderByField]: sortOrder === "asc" ? "asc" : "desc",
    }

    // ── Execute queries ──────────────────────────────────────
    const [personas, totalCount, statusCounts] = await Promise.all([
      prisma.persona.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          layerVectors: {
            orderBy: { version: "desc" },
          },
          personaState: true,
        },
      }),
      prisma.persona.count({ where }),
      prisma.persona.groupBy({
        by: ["status"],
        _count: { status: true },
        where: {
          // Base condition without status filter for distribution
          ...(where.source ? { source: where.source } : {}),
          ...(where.archetypeId ? { archetypeId: where.archetypeId } : {}),
        },
      }),
    ])

    // ── Transform to response ────────────────────────────────
    const totalPages = Math.ceil(totalCount / limit)

    const personaList: PersonaListItem[] = personas.map((p) => {
      const l1Vector = p.layerVectors.find((v) => v.layerType === "SOCIAL")
      const l2Vector = p.layerVectors.find((v) => v.layerType === "TEMPERAMENT")
      const l3Vector = p.layerVectors.find((v) => v.layerType === "NARRATIVE")

      return {
        id: p.id,
        name: p.name,
        role: p.role,
        expertise: p.expertise,
        description: p.description,
        profileImageUrl: p.profileImageUrl,
        status: p.status,
        source: p.source,
        archetypeId: p.archetypeId,
        paradoxScore: p.paradoxScore ? Number(p.paradoxScore) : null,
        dimensionalityScore: p.dimensionalityScore ? Number(p.dimensionalityScore) : null,
        qualityScore: p.qualityScore ? Number(p.qualityScore) : null,
        validationScore: p.validationScore ? Number(p.validationScore) : null,
        vectors: {
          l1: l1Vector ? layerVectorToRecord(l1Vector, L1_DIM_MAP) : null,
          l2: l2Vector ? layerVectorToRecord(l2Vector, L2_DIM_MAP) : null,
          l3: l3Vector ? layerVectorToRecord(l3Vector, L3_DIM_MAP) : null,
        },
        state: p.personaState
          ? {
              energy: Number(p.personaState.energy),
              mood: Number(p.personaState.mood),
              socialBattery: Number(p.personaState.socialBattery),
            }
          : null,
        engineVersion: p.engineVersion ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }
    })

    const statusDistribution: Record<string, number> = {}
    for (const group of statusCounts) {
      statusDistribution[group.status] = group._count.status
    }

    // ── Post-query cross-axis filtering ──────────────────────
    // If crossAxisFilters are provided, filter at application level
    // by computing cross-axis scores for each persona
    let filteredList = personaList
    if (crossAxisFilters && crossAxisFilters.length > 0) {
      const { calculateCrossAxisProfile } = await import("@/lib/vector/cross-axis")
      filteredList = personaList.filter((p) => {
        if (!p.vectors.l1 || !p.vectors.l2 || !p.vectors.l3) return false
        const profile = calculateCrossAxisProfile(
          p.vectors.l1 as unknown as SocialPersonaVector,
          p.vectors.l2 as unknown as CoreTemperamentVector,
          p.vectors.l3 as unknown as NarrativeDriveVector
        )
        return crossAxisFilters.every((filter) => {
          const axis = profile.axes.find((a) => a.axisId === filter.axisId)
          if (!axis) return false
          if (filter.minScore !== undefined && axis.score < filter.minScore) return false
          if (filter.maxScore !== undefined && axis.score > filter.maxScore) return false
          return true
        })
      })
    }

    const response: ApiResponse<PersonaListResponse> = {
      success: true,
      data: {
        personas: filteredList,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: crossAxisFilters?.length ? filteredList.length : totalCount,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        filterStats: {
          totalMatched: crossAxisFilters?.length ? filteredList.length : totalCount,
          statusDistribution,
        },
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `Failed to fetch personas: ${message}`,
      },
    }
    return NextResponse.json(response, { status: 500 })
  }
}
