import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const createArchetypeSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  description: z.string().optional(),
  depthMin: z.number().min(0).max(1),
  depthMax: z.number().min(0).max(1),
  lensMin: z.number().min(0).max(1),
  lensMax: z.number().min(0).max(1),
  stanceMin: z.number().min(0).max(1),
  stanceMax: z.number().min(0).max(1),
  scopeMin: z.number().min(0).max(1),
  scopeMax: z.number().min(0).max(1),
  tasteMin: z.number().min(0).max(1),
  tasteMax: z.number().min(0).max(1),
  purposeMin: z.number().min(0).max(1),
  purposeMax: z.number().min(0).max(1),
  recommendedPersonaIds: z.array(z.string()).optional(),
})

// GET /api/archetypes - 아키타입 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const archetypes = await prisma.archetype.findMany({
      orderBy: { name: "asc" },
    })

    // 각 아키타입에 대해 추천 페르소나 정보 조회
    const data = await Promise.all(
      archetypes.map(async (archetype) => {
        const recommendedPersonas =
          archetype.recommendedPersonaIds.length > 0
            ? await prisma.persona.findMany({
                where: { id: { in: archetype.recommendedPersonaIds } },
                select: { id: true, name: true, role: true, status: true },
              })
            : []

        return {
          id: archetype.id,
          name: archetype.name,
          description: archetype.description,
          vectorRanges: {
            depth: { min: Number(archetype.depthMin), max: Number(archetype.depthMax) },
            lens: { min: Number(archetype.lensMin), max: Number(archetype.lensMax) },
            stance: { min: Number(archetype.stanceMin), max: Number(archetype.stanceMax) },
            scope: { min: Number(archetype.scopeMin), max: Number(archetype.scopeMax) },
            taste: { min: Number(archetype.tasteMin), max: Number(archetype.tasteMax) },
            purpose: { min: Number(archetype.purposeMin), max: Number(archetype.purposeMax) },
          },
          recommendedPersonas,
          createdAt: archetype.createdAt.toISOString(),
          updatedAt: archetype.updatedAt.toISOString(),
        }
      })
    )

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    })
  } catch (error) {
    console.error("[API] GET /api/archetypes error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "아키타입 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/archetypes - 아키타입 생성
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    if (!["ADMIN", "AI_ENGINEER"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createArchetypeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const archetype = await prisma.archetype.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        depthMin: parsed.data.depthMin,
        depthMax: parsed.data.depthMax,
        lensMin: parsed.data.lensMin,
        lensMax: parsed.data.lensMax,
        stanceMin: parsed.data.stanceMin,
        stanceMax: parsed.data.stanceMax,
        scopeMin: parsed.data.scopeMin,
        scopeMax: parsed.data.scopeMax,
        tasteMin: parsed.data.tasteMin,
        tasteMax: parsed.data.tasteMax,
        purposeMin: parsed.data.purposeMin,
        purposeMax: parsed.data.purposeMax,
        recommendedPersonaIds: parsed.data.recommendedPersonaIds || [],
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ARCHETYPE_CREATE",
        targetType: "ARCHETYPE",
        targetId: archetype.id,
        details: { name: archetype.name },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: archetype.id,
        name: archetype.name,
        createdAt: archetype.createdAt.toISOString(),
      },
      message: "아키타입이 생성되었습니다",
    })
  } catch (error) {
    console.error("[API] POST /api/archetypes error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "아키타입 생성에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
