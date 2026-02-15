import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePersona } from "@/lib/persona-generation"
import { buildAllPrompts } from "@/lib/prompt-builder"
import { generateAllQualitativeDimensions } from "@/lib/qualitative"
import { computeActivityTraits, computeActiveHours } from "@/lib/persona-world/activity-mapper"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import type { ApiResponse } from "@/types"
import type { PersonaRole, PersonaStatus } from "@/generated/prisma"

interface GenerateRandomBody {
  archetypeId?: string
  status?: string
}

// ── 벡터 기반 PersonaRole 추론 ──────────────────────────────
function inferPersonaRole(
  l1: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    sociability: number
  },
  l2: { agreeableness: number; openness: number }
): PersonaRole {
  if (l1.depth > 0.7 && l1.lens > 0.6) return "ANALYST"
  if (l1.taste > 0.65 && l1.scope > 0.6) return "CURATOR"
  if (l2.agreeableness > 0.65 && l1.sociability > 0.5) return "COMPANION"
  if (l1.stance > 0.6 && l1.depth > 0.5) return "REVIEWER"
  if (l2.openness > 0.65 && l1.scope > 0.5) return "EDUCATOR"
  // 기본값: 벡터 기반 최다 적합 역할
  const scores = {
    REVIEWER: l1.depth * 0.4 + l1.stance * 0.3 + l1.lens * 0.3,
    CURATOR: l1.taste * 0.4 + l1.scope * 0.3 + l2.openness * 0.3,
    EDUCATOR: l1.scope * 0.3 + l2.openness * 0.4 + l1.depth * 0.3,
    COMPANION: l1.sociability * 0.4 + l2.agreeableness * 0.4 + (1 - l1.stance) * 0.2,
    ANALYST: l1.depth * 0.4 + l1.lens * 0.4 + l1.scope * 0.2,
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as PersonaRole
}

// ═══════════════════════════════════════════════════════════════
// POST /api/internal/personas/generate-random
// 전체 파이프라인: 벡터→Paradox→캐릭터→정성적→프롬프트→활동성→DB저장
// ═══════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRandomBody = await request.json().catch(() => ({}))

    // ── Stage 1: 기존 페르소나 벡터 조회 (다양성 보장) ────────
    const existingPersonas = await prisma.persona.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: { layerVectors: true },
    })

    const existingVectors = existingPersonas
      .filter((p) => p.layerVectors.length === 3)
      .map((p) => {
        const social = p.layerVectors.find((v) => v.layerType === "SOCIAL")
        const temp = p.layerVectors.find((v) => v.layerType === "TEMPERAMENT")
        const narr = p.layerVectors.find((v) => v.layerType === "NARRATIVE")
        if (!social || !temp || !narr) return null
        return {
          l1: {
            depth: Number(social.dim1),
            lens: Number(social.dim2),
            stance: Number(social.dim3),
            scope: Number(social.dim4),
            taste: Number(social.dim5),
            purpose: Number(social.dim6),
            sociability: Number(social.dim7),
          },
          l2: {
            openness: Number(temp.dim1),
            conscientiousness: Number(temp.dim2),
            extraversion: Number(temp.dim3),
            agreeableness: Number(temp.dim4),
            neuroticism: Number(temp.dim5),
          },
          l3: {
            lack: Number(narr.dim1),
            moralCompass: Number(narr.dim2),
            volatility: Number(narr.dim3),
            growthArc: Number(narr.dim4),
          },
        }
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)

    // ── Stage 2: 페르소나 생성 파이프라인 ─────────────────────
    const generated = generatePersona({
      archetypeId: body.archetypeId,
      existingPersonas: existingVectors,
      diversityWeight: 0.5,
    })

    const { l1, l2, l3 } = generated.vectors

    // ── Stage 3: 정성적 4차원 생성 ─────────────────────────────
    const qualitative = generateAllQualitativeDimensions(l1, l2, l3, generated.archetype)

    // ── Stage 4: 프롬프트 5종 자동 빌드 ────────────────────────
    const role = inferPersonaRole(l1, l2)
    const prompts = buildAllPrompts({
      name: generated.character.name,
      role: generated.character.role,
      expertise: generated.character.expertise,
      l1,
      l2,
      l3,
    })

    // ── Stage 5: 활동성 8특성 + 활동시간 ───────────────────────
    const crossAxisProfile = calculateCrossAxisProfile(l1, l2, l3)
    const paradoxProfile = calculateExtendedParadoxScore(l1, l2, l3, crossAxisProfile)
    const threeLayerVector = { social: l1, temperament: l2, narrative: l3 }
    const activityTraits = computeActivityTraits(threeLayerVector, paradoxProfile.overall)
    const activeHours = computeActiveHours(threeLayerVector, activityTraits)

    // ── Stage 6: DB 저장 (트랜잭션) ────────────────────────────
    const persona = await prisma.$transaction(async (tx) => {
      const systemUser = await tx.user.findFirst({ select: { id: true } })
      if (!systemUser) {
        throw new Error("시스템 사용자가 없습니다. 초기 사용자를 생성해주세요.")
      }

      const created = await tx.persona.create({
        data: {
          name: generated.character.name,
          role,
          expertise: generated.character.expertise,
          description: generated.character.description,
          status: (body.status === "DRAFT" ? "DRAFT" : "ACTIVE") as PersonaStatus,
          source: "MANUAL",
          archetypeId: generated.archetype?.id ?? null,
          paradoxScore: paradoxProfile.overall,
          dimensionalityScore: paradoxProfile.dimensionality,
          engineVersion: "3.0",
          promptTemplate: prompts.base,
          promptVersion: "1.0",
          basePrompt: prompts.base,
          createdById: systemUser.id,
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

    const response: ApiResponse<{
      id: string
      name: string
      role: string
      archetypeId: string | null
      paradoxScore: number
      dimensionalityScore: number
      character: typeof generated.character
      activityTraits: typeof activityTraits
      activeHours: number[]
      qualitative: {
        backstory: typeof qualitative.backstory
        voice: typeof qualitative.voice
      }
      quality: typeof generated.quality
    }> = {
      success: true,
      data: {
        id: persona.id,
        name: persona.name,
        role: persona.role,
        archetypeId: generated.archetype?.id ?? null,
        paradoxScore: paradoxProfile.overall,
        dimensionalityScore: paradoxProfile.dimensionality,
        character: generated.character,
        activityTraits,
        activeHours,
        qualitative: {
          backstory: qualitative.backstory,
          voice: qualitative.voice,
        },
        quality: generated.quality,
      },
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: `랜덤 페르소나 생성 실패: ${message}`,
      },
    }
    return NextResponse.json(response, { status: 500 })
  }
}
