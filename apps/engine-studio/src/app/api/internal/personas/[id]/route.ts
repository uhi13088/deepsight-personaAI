import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import type {
  ApiResponse,
  PersonaDetail,
  UpdatePersonaBody,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from "@/types"
import {
  L1_DIM_MAP,
  L2_DIM_MAP,
  L3_DIM_MAP,
  layerVectorToRecord,
  layerVectorsToMap,
} from "@/lib/vector/dim-maps"

// ═══════════════════════════════════════════════════════════════
// GET /api/internal/personas/[id]
// ═══════════════════════════════════════════════════════════════

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params

    const persona = await prisma.persona.findUnique({
      where: { id },
      include: {
        layerVectors: true,
      },
    })

    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다." },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    const layerMap = layerVectorsToMap(persona.layerVectors)
    const l1Vector = layerMap.get("SOCIAL")
    const l2Vector = layerMap.get("TEMPERAMENT")
    const l3Vector = layerMap.get("NARRATIVE")

    const detail: PersonaDetail = {
      id: persona.id,
      name: persona.name,
      role: persona.role,
      expertise: persona.expertise,
      description: persona.description,
      profileImageUrl: persona.profileImageUrl,
      status: persona.status,
      source: persona.source,
      archetypeId: persona.archetypeId,
      parentPersonaId: persona.parentPersonaId,
      paradoxScore: persona.paradoxScore ? Number(persona.paradoxScore) : null,
      dimensionalityScore: persona.dimensionalityScore ? Number(persona.dimensionalityScore) : null,
      qualityScore: persona.qualityScore ? Number(persona.qualityScore) : null,
      validationScore: persona.validationScore ? Number(persona.validationScore) : null,
      vectors: {
        l1: l1Vector ? layerVectorToRecord(l1Vector, L1_DIM_MAP) : null,
        l2: l2Vector ? layerVectorToRecord(l2Vector, L2_DIM_MAP) : null,
        l3: l3Vector ? layerVectorToRecord(l3Vector, L3_DIM_MAP) : null,
      },
      basePrompt: persona.basePrompt ?? persona.promptTemplate,
      promptVersion: persona.promptVersion,
      createdAt: persona.createdAt.toISOString(),
      updatedAt: persona.updatedAt.toISOString(),
      activatedAt: persona.activatedAt?.toISOString() ?? null,
      archivedAt: persona.archivedAt?.toISOString() ?? null,
      // T174: 인구통계 프로필
      gender: persona.gender ?? null,
      birthDate: persona.birthDate?.toISOString() ?? null,
      nationality: persona.nationality ?? null,
      region: persona.region ?? null,
      height: persona.height ?? null,
      educationLevel: persona.educationLevel ?? null,
      languages: persona.languages ?? [],
      knowledgeAreas: persona.knowledgeAreas ?? [],
    }

    return NextResponse.json({ success: true, data: detail } satisfies ApiResponse<PersonaDetail>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message } } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════
// PUT /api/internal/personas/[id]
// ═══════════════════════════════════════════════════════════════

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params
    const body: UpdatePersonaBody = await request.json()

    // Check persona exists
    const existing = await prisma.persona.findUnique({
      where: { id },
      include: { layerVectors: true },
    })

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다." },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    if (existing.status === "ARCHIVED") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "보관된 페르소나는 수정할 수 없습니다." },
        } satisfies ApiResponse<never>,
        { status: 403 }
      )
    }

    // Validate name
    if (body.name !== undefined) {
      const trimmed = body.name.trim()
      if (trimmed.length < 2 || trimmed.length > 30) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "VALIDATION_ERROR", message: "이름은 2~30자여야 합니다." },
          } satisfies ApiResponse<never>,
          { status: 400 }
        )
      }
    }

    // Validate prompt
    if (body.basePrompt !== undefined && body.basePrompt.trim().length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "프롬프트는 최소 50자 이상이어야 합니다." },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.role !== undefined) updateData.role = body.role
    if (body.expertise !== undefined) updateData.expertise = body.expertise
    if (body.description !== undefined) updateData.description = body.description
    if (body.profileImageUrl !== undefined) updateData.profileImageUrl = body.profileImageUrl
    if (body.archetypeId !== undefined) updateData.archetypeId = body.archetypeId
    if (body.basePrompt !== undefined) {
      updateData.basePrompt = body.basePrompt
      updateData.promptTemplate = body.basePrompt
    }

    // Recompute paradox if vectors changed
    let newParadox: { overall: number; dimensionality: number } | null = null
    if (body.vectors) {
      const { l1, l2, l3 } = body.vectors
      const crossAxisProfile = calculateCrossAxisProfile(
        l1 as unknown as SocialPersonaVector,
        l2 as unknown as CoreTemperamentVector,
        l3 as unknown as NarrativeDriveVector
      )
      const paradoxProfile = calculateExtendedParadoxScore(
        l1 as unknown as SocialPersonaVector,
        l2 as unknown as CoreTemperamentVector,
        l3 as unknown as NarrativeDriveVector,
        crossAxisProfile
      )
      newParadox = {
        overall: paradoxProfile.overall,
        dimensionality: paradoxProfile.dimensionality,
      }
      updateData.paradoxScore = paradoxProfile.overall
      updateData.dimensionalityScore = paradoxProfile.dimensionality
    }

    // Transaction: update persona + vectors
    await prisma.$transaction(async (tx) => {
      await tx.persona.update({
        where: { id },
        data: updateData,
      })

      if (body.vectors) {
        const { l1, l2, l3 } = body.vectors

        // Upsert layer vectors
        const existingLayerMap = layerVectorsToMap(existing.layerVectors)
        const existingL1 = existingLayerMap.get("SOCIAL")
        const existingL2 = existingLayerMap.get("TEMPERAMENT")
        const existingL3 = existingLayerMap.get("NARRATIVE")

        if (existingL1) {
          await tx.personaLayerVector.update({
            where: { id: existingL1.id },
            data: {
              dim1: l1.depth ?? l1["depth"],
              dim2: l1.lens ?? l1["lens"],
              dim3: l1.stance ?? l1["stance"],
              dim4: l1.scope ?? l1["scope"],
              dim5: l1.taste ?? l1["taste"],
              dim6: l1.purpose ?? l1["purpose"],
              dim7: l1.sociability ?? l1["sociability"],
            },
          })
        }

        if (existingL2) {
          await tx.personaLayerVector.update({
            where: { id: existingL2.id },
            data: {
              dim1: l2.openness ?? l2["openness"],
              dim2: l2.conscientiousness ?? l2["conscientiousness"],
              dim3: l2.extraversion ?? l2["extraversion"],
              dim4: l2.agreeableness ?? l2["agreeableness"],
              dim5: l2.neuroticism ?? l2["neuroticism"],
            },
          })
        }

        if (existingL3) {
          await tx.personaLayerVector.update({
            where: { id: existingL3.id },
            data: {
              dim1: l3.lack ?? l3["lack"],
              dim2: l3.moralCompass ?? l3["moralCompass"],
              dim3: l3.volatility ?? l3["volatility"],
              dim4: l3.growthArc ?? l3["growthArc"],
            },
          })
        }
      }
    })

    return NextResponse.json({ success: true, data: { id } } satisfies ApiResponse<{ id: string }>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `수정 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════
// DELETE /api/internal/personas/[id]
// ═══════════════════════════════════════════════════════════════

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params

    const persona = await prisma.persona.findUnique({
      where: { id },
      select: { id: true, status: true },
    })

    if (!persona) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "페르소나를 찾을 수 없습니다." },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    // 관련 레코드 삭제 (트랜잭션)
    await prisma.$transaction(async (tx) => {
      await tx.personaLayerVector.deleteMany({ where: { personaId: id } })
      await tx.persona.delete({ where: { id } })
    })

    return NextResponse.json({ success: true, data: { id } } satisfies ApiResponse<{ id: string }>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `삭제 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
