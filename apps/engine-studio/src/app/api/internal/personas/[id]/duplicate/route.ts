import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import type { ApiResponse, DuplicatePersonaBody } from "@/types"

// ═══════════════════════════════════════════════════════════════
// POST /api/internal/personas/[id]/duplicate
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params
    const body: DuplicatePersonaBody = await request.json()

    // Validate new name
    const newName = body.newName?.trim()
    if (!newName || newName.length < 2 || newName.length > 30) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "새 이름은 2~30자여야 합니다." },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    // Load source persona
    const source = await prisma.persona.findUnique({
      where: { id },
      include: { layerVectors: true },
    })

    if (!source) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "원본 페르소나를 찾을 수 없습니다." },
        } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    // Create duplicate in transaction
    const duplicate = await prisma.$transaction(async (tx) => {
      const created = await tx.persona.create({
        data: {
          name: newName,
          role: source.role,
          expertise: source.expertise,
          description: source.description,
          profileImageUrl: source.profileImageUrl,
          status: "DRAFT",
          source: "MUTATION",
          archetypeId: source.archetypeId,
          parentPersonaId: source.id,
          paradoxScore: source.paradoxScore,
          dimensionalityScore: source.dimensionalityScore,
          engineVersion: source.engineVersion,
          promptTemplate: source.promptTemplate,
          promptVersion: "1.0",
          basePrompt: source.basePrompt,
          reviewPrompt: source.reviewPrompt,
          postPrompt: source.postPrompt,
          commentPrompt: source.commentPrompt,
          interactionPrompt: source.interactionPrompt,
          contentSettings: source.contentSettings ?? undefined,
          relationshipSettings: source.relationshipSettings ?? undefined,
          createdById: source.createdById,
          layerVectors: {
            create: source.layerVectors.map((lv) => ({
              layerType: lv.layerType,
              dim1: lv.dim1,
              dim2: lv.dim2,
              dim3: lv.dim3,
              dim4: lv.dim4,
              dim5: lv.dim5,
              dim6: lv.dim6,
              dim7: lv.dim7,
            })),
          },
        },
      })

      return created
    })

    return NextResponse.json(
      {
        success: true,
        data: { id: duplicate.id, name: duplicate.name },
      } satisfies ApiResponse<{ id: string; name: string }>,
      { status: 201 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `복제 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
