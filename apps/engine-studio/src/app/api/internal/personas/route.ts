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
import {
  L1_DIM_MAP,
  L2_DIM_MAP,
  L3_DIM_MAP,
  layerVectorToRecord,
  layerVectorsToMap,
} from "@/lib/vector/dim-maps"

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
    // 3단계 폴백 — 각 단계에서 실패 원인을 구조적으로 진단
    const fullQuery = () =>
      prisma.persona.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          layerVectors: { orderBy: { version: "desc" as const } },
          personaState: true,
        },
      })
    type PersonaWithRelations = Awaited<ReturnType<typeof fullQuery>>[number]

    /** 쿼리 실패 시 에러에서 누락 컬럼명 추출 */
    function extractMissingColumn(err: unknown): string | null {
      if (!(err instanceof Error)) return null
      return err.message.match(/column `([^`]+)` does not exist/)?.[1] ?? null
    }

    /** 구조화된 진단 로그 */
    function logQueryDiagnostic(level: string, err: unknown, hint: string) {
      const msg = err instanceof Error ? err.message : String(err)
      const col = extractMissingColumn(err)
      console.error(`[personas API] ${level}:`, {
        error: msg.slice(0, 200),
        ...(col ? { missingColumn: col } : {}),
        hint,
        fix: "prisma/migrations/041_production_catchup_038_040.sql 실행",
      })
    }

    let personas: PersonaWithRelations[]
    let queryDegraded: string | null = null

    // ── L1: 정상 쿼리 (Persona + layerVectors + personaState) ──
    const l1Result = await fullQuery().catch((e: unknown) => e as Error)
    if (Array.isArray(l1Result)) {
      personas = l1Result
    } else {
      logQueryDiagnostic(
        "L1 실패 (include query)",
        l1Result,
        "persona_states 또는 persona_layer_vectors에 미적용 컬럼"
      )

      // ── L2: Persona만 (관계 테이블 제외) ──
      const l2Result = await prisma.persona
        .findMany({ where, orderBy, skip, take: limit })
        .catch((e: unknown) => e as Error)
      if (Array.isArray(l2Result)) {
        personas = l2Result.map((p) => ({
          ...p,
          layerVectors: [],
          personaState: null,
        })) as PersonaWithRelations[]
        queryDegraded = `L2: 관계 쿼리 실패 → 벡터/상태 없음 (${extractMissingColumn(l1Result) ?? "관계 테이블 문제"})`
      } else {
        logQueryDiagnostic(
          "L2 실패 (Persona 단독)",
          l2Result,
          "personas 테이블에 미적용 컬럼 (TTS 등)"
        )

        // ── L3: 기존 001 스키마 컬럼만 select ──
        const l3Result = await prisma.persona
          .findMany({
            where,
            orderBy,
            skip,
            take: limit,
            select: {
              id: true,
              name: true,
              role: true,
              expertise: true,
              description: true,
              profileImageUrl: true,
              status: true,
              source: true,
              archetypeId: true,
              paradoxScore: true,
              dimensionalityScore: true,
              qualityScore: true,
              validationScore: true,
              engineVersion: true,
              createdAt: true,
              updatedAt: true,
            },
          })
          .catch((e: unknown) => e as Error)

        if (Array.isArray(l3Result)) {
          personas = l3Result.map((p) => ({
            ...p,
            layerVectors: [],
            personaState: null,
          })) as unknown as PersonaWithRelations[]
          queryDegraded = `L3: 핵심 필드만 → 벡터/상태/TTS 없음 (${extractMissingColumn(l2Result) ?? "personas 테이블 문제"})`
        } else {
          logQueryDiagnostic("L3 실패 (select 최소)", l3Result, "기본 스키마조차 문제")
          personas = []
          queryDegraded = "L3: 전체 실패 → DB 마이그레이션 필수"
        }
      }
    }

    if (queryDegraded) {
      console.warn("[personas API] ⚠️ 쿼리 저하:", queryDegraded)
    }

    const [totalCount, statusCounts] = await Promise.all([
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
      const layerMap = layerVectorsToMap(p.layerVectors)
      const l1Vector = layerMap.get("SOCIAL")
      const l2Vector = layerMap.get("TEMPERAMENT")
      const l3Vector = layerMap.get("NARRATIVE")

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
        ...(queryDegraded ? { _migrationWarning: queryDegraded } : {}),
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const stack = error instanceof Error ? error.stack : undefined
    console.error("[personas API] Error:", message, stack)
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
