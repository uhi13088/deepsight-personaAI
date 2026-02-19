import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import type { ApiResponse } from "@/types"
import type { SocialDimension } from "@/types"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma"
import { BASE_ARCHETYPES, createCustomArchetype } from "@/lib/user-insight/user-archetype"
import type { UserArchetype, ArchetypeThreshold } from "@/lib/user-insight/user-archetype"

// ── DB → UserArchetype conversion ────────────────────────────

const SOCIAL_DIMENSIONS: SocialDimension[] = [
  "depth",
  "lens",
  "stance",
  "scope",
  "taste",
  "purpose",
  "sociability",
]

interface ArchetypeRow {
  id: string
  name: string
  nameKo: string | null
  description: string | null
  depthMin: unknown
  depthMax: unknown
  lensMin: unknown
  lensMax: unknown
  stanceMin: unknown
  stanceMax: unknown
  scopeMin: unknown
  scopeMax: unknown
  tasteMin: unknown
  tasteMax: unknown
  purposeMin: unknown
  purposeMax: unknown
  referenceVector: unknown
  thresholdConfig: unknown
  isBuiltin: boolean
}

function dbRowToUserArchetype(row: ArchetypeRow): UserArchetype {
  // Prefer referenceVector JSON if present, otherwise derive from min/max columns
  let referenceVector: Record<SocialDimension, number>

  if (row.referenceVector && typeof row.referenceVector === "object") {
    referenceVector = row.referenceVector as Record<SocialDimension, number>
  } else {
    referenceVector = {
      depth: Number(row.depthMin),
      lens: Number(row.lensMin),
      stance: Number(row.stanceMin),
      scope: Number(row.scopeMin),
      taste: Number(row.tasteMin),
      purpose: Number(row.purposeMin),
      sociability: 0.5, // sociability not in DB columns, default
    }
  }

  // Ensure all dimensions are plain numbers (Decimal → number)
  for (const dim of SOCIAL_DIMENSIONS) {
    if (referenceVector[dim] !== undefined) {
      referenceVector[dim] = Number(referenceVector[dim])
    } else {
      referenceVector[dim] = 0.5
    }
  }

  // Thresholds from JSON column
  let thresholds: ArchetypeThreshold[] = []
  if (Array.isArray(row.thresholdConfig)) {
    thresholds = row.thresholdConfig as ArchetypeThreshold[]
  }

  return {
    id: row.id,
    name: row.name,
    nameKo: row.nameKo ?? row.name,
    description: row.description ?? "",
    referenceVector,
    thresholds,
    isCustom: !row.isBuiltin,
  }
}

// ── Response type ───────────────────────────────────────────────

interface ArchetypeResponse {
  archetypes: UserArchetype[]
}

// ── GET: Return all archetypes ──────────────────────────────────

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const rows = await prisma.archetype.findMany({
      orderBy: { createdAt: "asc" },
    })

    let archetypes: UserArchetype[]

    if (rows.length === 0) {
      // Fallback to BASE_ARCHETYPES fixture when DB is empty
      archetypes = BASE_ARCHETYPES
    } else {
      archetypes = rows.map((row) => dbRowToUserArchetype(row as unknown as ArchetypeRow))
    }

    return NextResponse.json<ApiResponse<ArchetypeResponse>>({
      success: true,
      data: { archetypes },
    })
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "아키타입 데이터 조회 실패" },
      },
      { status: 500 }
    )
  }
}

// ── POST: Mutations (add, remove archetypes) ────────────────────

interface ArchetypePostRequest {
  action: "add_custom" | "remove"
  // For add_custom
  name?: string
  nameKo?: string
  description?: string
  referenceVector?: Record<SocialDimension, number>
  thresholds?: ArchetypeThreshold[]
  // For remove
  archetypeId?: string
}

export async function POST(request: NextRequest) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const body = (await request.json()) as ArchetypePostRequest

    if (body.action === "add_custom") {
      if (!body.name?.trim() || !body.nameKo?.trim()) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "이름 (EN/KO)이 필요합니다" },
          },
          { status: 400 }
        )
      }

      const defaultVector: Record<SocialDimension, number> = {
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
        sociability: 0.5,
      }

      const custom = createCustomArchetype(
        body.name.trim(),
        body.nameKo.trim(),
        body.description?.trim() || `${body.nameKo} 커스텀 아키타입`,
        body.referenceVector ?? defaultVector,
        body.thresholds ?? []
      )

      const refVec = custom.referenceVector

      try {
        await prisma.archetype.create({
          data: {
            id: custom.id,
            name: custom.name,
            nameKo: custom.nameKo,
            description: custom.description,
            depthMin: refVec.depth,
            depthMax: refVec.depth,
            lensMin: refVec.lens,
            lensMax: refVec.lens,
            stanceMin: refVec.stance,
            stanceMax: refVec.stance,
            scopeMin: refVec.scope,
            scopeMax: refVec.scope,
            tasteMin: refVec.taste,
            tasteMax: refVec.taste,
            purposeMin: refVec.purpose,
            purposeMax: refVec.purpose,
            referenceVector: refVec as Record<string, number>,
            thresholdConfig: custom.thresholds as unknown as Prisma.InputJsonValue,
            isBuiltin: false,
          },
        })
      } catch {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "DUPLICATE_ID", message: "중복된 아키타입 ID입니다" },
          },
          { status: 400 }
        )
      }

      // Return full list after creation
      const rows = await prisma.archetype.findMany({
        orderBy: { createdAt: "asc" },
      })
      const archetypes = rows.map((row) => dbRowToUserArchetype(row as unknown as ArchetypeRow))

      return NextResponse.json<ApiResponse<ArchetypeResponse>>({
        success: true,
        data: { archetypes },
      })
    }

    if (body.action === "remove") {
      if (!body.archetypeId) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_INPUT", message: "archetypeId가 필요합니다" },
          },
          { status: 400 }
        )
      }

      // Find the archetype first
      const target = await prisma.archetype.findUnique({
        where: { id: body.archetypeId },
      })

      if (!target) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: "INVALID_OPERATION",
              message: `아키타입 '${body.archetypeId}'를 찾을 수 없습니다`,
            },
          },
          { status: 400 }
        )
      }

      if (target.isBuiltin) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: { code: "INVALID_OPERATION", message: "기본 아키타입은 삭제할 수 없습니다" },
          },
          { status: 400 }
        )
      }

      await prisma.archetype.delete({
        where: { id: body.archetypeId },
      })

      // Return full list after deletion
      const rows = await prisma.archetype.findMany({
        orderBy: { createdAt: "asc" },
      })

      let archetypes: UserArchetype[]
      if (rows.length === 0) {
        archetypes = BASE_ARCHETYPES
      } else {
        archetypes = rows.map((row) => dbRowToUserArchetype(row as unknown as ArchetypeRow))
      }

      return NextResponse.json<ApiResponse<ArchetypeResponse>>({
        success: true,
        data: { archetypes },
      })
    }

    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "유효한 action이 필요합니다: add_custom, remove",
        },
      },
      { status: 400 }
    )
  } catch {
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "아키타입 작업 실패" },
      },
      { status: 500 }
    )
  }
}
