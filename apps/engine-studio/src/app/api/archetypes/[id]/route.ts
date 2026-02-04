import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const updateArchetypeSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  depthMin: z.number().min(0).max(1).optional(),
  depthMax: z.number().min(0).max(1).optional(),
  lensMin: z.number().min(0).max(1).optional(),
  lensMax: z.number().min(0).max(1).optional(),
  stanceMin: z.number().min(0).max(1).optional(),
  stanceMax: z.number().min(0).max(1).optional(),
  scopeMin: z.number().min(0).max(1).optional(),
  scopeMax: z.number().min(0).max(1).optional(),
  tasteMin: z.number().min(0).max(1).optional(),
  tasteMax: z.number().min(0).max(1).optional(),
  purposeMin: z.number().min(0).max(1).optional(),
  purposeMax: z.number().min(0).max(1).optional(),
  recommendedPersonaIds: z.array(z.string()).optional(),
})

// GET /api/archetypes/[id] - 단일 아키타입 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params

    const archetype = await prisma.archetype.findUnique({
      where: { id },
    })

    if (!archetype) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "아키타입을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 추천 페르소나 조회
    const recommendedPersonas =
      archetype.recommendedPersonaIds.length > 0
        ? await prisma.persona.findMany({
            where: { id: { in: archetype.recommendedPersonaIds } },
            select: { id: true, name: true, role: true, qualityScore: true },
          })
        : []

    return NextResponse.json({
      success: true,
      data: {
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
        recommendedPersonaIds: archetype.recommendedPersonaIds,
        recommendedPersonas,
        createdAt: archetype.createdAt.toISOString(),
        updatedAt: archetype.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] GET /api/archetypes/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "아키타입 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/archetypes/[id] - 아키타입 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const body = await request.json()
    const parsed = updateArchetypeSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const existing = await prisma.archetype.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "아키타입을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    const archetype = await prisma.archetype.update({
      where: { id },
      data: {
        ...(parsed.data.name && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.depthMin !== undefined && { depthMin: parsed.data.depthMin }),
        ...(parsed.data.depthMax !== undefined && { depthMax: parsed.data.depthMax }),
        ...(parsed.data.lensMin !== undefined && { lensMin: parsed.data.lensMin }),
        ...(parsed.data.lensMax !== undefined && { lensMax: parsed.data.lensMax }),
        ...(parsed.data.stanceMin !== undefined && { stanceMin: parsed.data.stanceMin }),
        ...(parsed.data.stanceMax !== undefined && { stanceMax: parsed.data.stanceMax }),
        ...(parsed.data.scopeMin !== undefined && { scopeMin: parsed.data.scopeMin }),
        ...(parsed.data.scopeMax !== undefined && { scopeMax: parsed.data.scopeMax }),
        ...(parsed.data.tasteMin !== undefined && { tasteMin: parsed.data.tasteMin }),
        ...(parsed.data.tasteMax !== undefined && { tasteMax: parsed.data.tasteMax }),
        ...(parsed.data.purposeMin !== undefined && { purposeMin: parsed.data.purposeMin }),
        ...(parsed.data.purposeMax !== undefined && { purposeMax: parsed.data.purposeMax }),
        ...(parsed.data.recommendedPersonaIds && {
          recommendedPersonaIds: parsed.data.recommendedPersonaIds,
        }),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ARCHETYPE_UPDATE",
        targetType: "ARCHETYPE",
        targetId: id,
        details: { changes: Object.keys(parsed.data) },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: archetype.id,
        name: archetype.name,
        description: archetype.description,
        updatedAt: archetype.updatedAt.toISOString(),
      },
      message: "아키타입이 수정되었습니다",
    })
  } catch (error) {
    console.error("[API] PATCH /api/archetypes/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "아키타입 수정에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/archetypes/[id] - 아키타입 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const { id } = await params

    await prisma.archetype.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ARCHETYPE_DELETE",
        targetType: "ARCHETYPE",
        targetId: id,
      },
    })

    return NextResponse.json({
      success: true,
      message: "아키타입이 삭제되었습니다",
    })
  } catch (error) {
    console.error("[API] DELETE /api/archetypes/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "아키타입 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
