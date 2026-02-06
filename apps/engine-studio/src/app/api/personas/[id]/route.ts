import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { PersonaRole, PersonaStatus } from "@prisma/client"

// 업데이트 스키마
const updatePersonaSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["REVIEWER", "CURATOR", "EDUCATOR", "COMPANION", "ANALYST"]).optional(),
  expertise: z.array(z.string()).optional(),
  description: z.string().optional(),
  promptTemplate: z.string().optional(),
  status: z
    .enum(["DRAFT", "REVIEW", "ACTIVE", "STANDARD", "LEGACY", "DEPRECATED", "PAUSED", "ARCHIVED"])
    .optional(),
  vector: z
    .object({
      depth: z.number().min(0).max(1),
      lens: z.number().min(0).max(1),
      stance: z.number().min(0).max(1),
      scope: z.number().min(0).max(1),
      taste: z.number().min(0).max(1),
      purpose: z.number().min(0).max(1),
    })
    .optional(),
})

// 응답 데이터 변환 헬퍼
function transformPersona(persona: Awaited<ReturnType<typeof getPersonaWithRelations>>) {
  if (!persona) return null
  const latestVector = persona.vectors[0]
  return {
    id: persona.id,
    name: persona.name,
    role: persona.role,
    expertise: persona.expertise ?? [],
    description: persona.description,
    status: persona.status,
    visibility: persona.visibility,
    profileImageUrl: persona.profileImageUrl,
    qualityScore: persona.qualityScore ? Number(persona.qualityScore) : null,
    vector: latestVector
      ? {
          depth: Number(latestVector.depth),
          lens: Number(latestVector.lens),
          stance: Number(latestVector.stance),
          scope: Number(latestVector.scope),
          taste: Number(latestVector.taste),
          purpose: Number(latestVector.purpose),
        }
      : null,
    promptTemplate: persona.promptTemplate,
    versions: persona.vectors.map((v) => ({
      id: v.id,
      version: v.version,
      depth: Number(v.depth),
      lens: Number(v.lens),
      stance: Number(v.stance),
      scope: Number(v.scope),
      taste: Number(v.taste),
      purpose: Number(v.purpose),
      createdAt: v.createdAt.toISOString(),
    })),
    createdBy: persona.createdBy,
    createdAt: persona.createdAt.toISOString(),
    updatedAt: persona.updatedAt.toISOString(),
  }
}

async function getPersonaWithRelations(id: string) {
  return prisma.persona.findUnique({
    where: { id },
    include: {
      vectors: { orderBy: { version: "desc" } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })
}

// GET /api/personas/[id] - 페르소나 상세 조회
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
    const persona = await getPersonaWithRelations(id)

    if (!persona) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 성과 지표 계산
    const [selectionCount, likes, dislikes] = await Promise.all([
      prisma.matchingLog.count({ where: { selectedPersonaId: id } }).catch(() => 0),
      prisma.feedback.count({ where: { personaId: id, feedbackType: "LIKE" } }).catch(() => 0),
      prisma.feedback.count({ where: { personaId: id, feedbackType: "DISLIKE" } }).catch(() => 0),
    ])

    const totalFeedback = likes + dislikes
    const hasMetrics = totalFeedback > 0 || selectionCount > 0
    const metrics = hasMetrics
      ? {
          impressions: selectionCount,
          clicks: selectionCount,
          ctr: 0,
          likes,
          dislikes,
          satisfactionRate: totalFeedback > 0 ? (likes / totalFeedback) * 100 : 0,
          avgEngagementTime: 0,
        }
      : null

    return NextResponse.json({
      success: true,
      data: {
        ...transformPersona(persona),
        metrics,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/personas/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "페르소나 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PUT /api/personas/[id] - 페르소나 전체 수정
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updatePersonaSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const existing = await prisma.persona.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    const { vector, ...personaData } = parsed.data

    // 트랜잭션으로 업데이트
    await prisma.$transaction(async (tx) => {
      // 페르소나 업데이트
      await tx.persona.update({
        where: { id },
        data: {
          ...(personaData.name && { name: personaData.name }),
          ...(personaData.role && { role: personaData.role as PersonaRole }),
          ...(personaData.expertise && { expertise: personaData.expertise }),
          ...(personaData.description !== undefined && { description: personaData.description }),
          ...(personaData.promptTemplate && { promptTemplate: personaData.promptTemplate }),
          ...(personaData.status && { status: personaData.status as PersonaStatus }),
        },
      })

      // 벡터 업데이트 (새 버전 생성)
      if (vector) {
        const latestVector = await tx.personaVector.findFirst({
          where: { personaId: id },
          orderBy: { version: "desc" },
        })

        await tx.personaVector.create({
          data: {
            personaId: id,
            version: (latestVector?.version ?? 0) + 1,
            depth: vector.depth,
            lens: vector.lens,
            stance: vector.stance,
            scope: vector.scope,
            taste: vector.taste,
            purpose: vector.purpose,
          },
        })
      }
    })

    const updatedPersona = await getPersonaWithRelations(id)

    return NextResponse.json({
      success: true,
      data: transformPersona(updatedPersona),
    })
  } catch (error) {
    console.error("[API] PUT /api/personas/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "페르소나 수정에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/personas/[id] - 페르소나 부분 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params })
}

// DELETE /api/personas/[id] - 페르소나 삭제
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

    const { id } = await params

    const existing = await prisma.persona.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    // 권한 체크: 생성자 또는 관리자만 삭제 가능
    if (existing.createdById !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "삭제 권한이 없습니다" } },
        { status: 403 }
      )
    }

    // 소프트 삭제 (ARCHIVED 상태로 변경)
    await prisma.persona.update({
      where: { id },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: "페르소나가 삭제되었습니다",
    })
  } catch (error) {
    console.error("[API] DELETE /api/personas/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "페르소나 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
