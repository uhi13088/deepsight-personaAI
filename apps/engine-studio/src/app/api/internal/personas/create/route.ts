import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import type {
  ApiResponse,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from "@/types"
import type { PersonaRole, PersonaStatus } from "@prisma/client"

interface CreatePersonaBody {
  name: string
  role: string
  expertise: string[]
  profileImageUrl: string | null
  description: string | null
  vectors: {
    l1: SocialPersonaVector
    l2: CoreTemperamentVector
    l3: NarrativeDriveVector
  }
  archetypeId: string | null
  basePrompt: string
  promptVersion: string
  status: string
}

// ═══════════════════════════════════════════════════════════════
// POST /api/internal/personas/create
// ═══════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const body: CreatePersonaBody = await request.json()

    // ── Validate required fields ─────────────────────────────
    if (!body.name?.trim() || body.name.trim().length < 2 || body.name.trim().length > 30) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "이름은 2~30자여야 합니다." },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    if (!body.role) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "역할을 선택하세요." },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    if (!body.basePrompt?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "프롬프트를 입력하세요." },
        } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    // ── Compute Paradox Score ─────────────────────────────────
    const { l1, l2, l3 } = body.vectors
    const crossAxisProfile = calculateCrossAxisProfile(l1, l2, l3)
    const paradoxProfile = calculateExtendedParadoxScore(l1, l2, l3, crossAxisProfile)

    // ── Create Persona + LayerVectors in transaction ─────────
    const persona = await prisma.$transaction(async (tx) => {
      // Get a system user ID (first user available)
      const systemUser = await tx.user.findFirst({ select: { id: true } })
      if (!systemUser) {
        throw new Error("시스템 사용자가 없습니다. 초기 사용자를 생성해주세요.")
      }

      const created = await tx.persona.create({
        data: {
          name: body.name.trim(),
          role: body.role as PersonaRole,
          expertise: body.expertise,
          profileImageUrl: body.profileImageUrl,
          description: body.description,
          status: (body.status === "ACTIVE" ? "ACTIVE" : "DRAFT") as PersonaStatus,
          source: "MANUAL",
          archetypeId: body.archetypeId,
          paradoxScore: paradoxProfile.overall,
          dimensionalityScore: paradoxProfile.dimensionality,
          engineVersion: "3.0",
          promptTemplate: body.basePrompt,
          promptVersion: body.promptVersion || "1.0",
          basePrompt: body.basePrompt,
          createdById: systemUser.id,
          // L1 vectors stored in PersonaLayerVector
          layerVectors: {
            create: [
              {
                layerType: "SOCIAL",
                dim1: l1.depth,
                dim2: l1.lens,
                dim3: l1.stance,
                dim4: l1.scope,
                dim5: l1.taste,
                dim6: l1.purpose,
                dim7: l1.sociability,
              },
              {
                layerType: "TEMPERAMENT",
                dim1: l2.openness,
                dim2: l2.conscientiousness,
                dim3: l2.extraversion,
                dim4: l2.agreeableness,
                dim5: l2.neuroticism,
              },
              {
                layerType: "NARRATIVE",
                dim1: l3.lack,
                dim2: l3.moralCompass,
                dim3: l3.volatility,
                dim4: l3.growthArc,
              },
            ],
          },
        },
      })

      return created
    })

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id: persona.id },
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `페르소나 생성 실패: ${message}`,
      },
    }
    return NextResponse.json(response, { status: 500 })
  }
}
