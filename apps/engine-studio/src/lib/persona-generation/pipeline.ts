// ═══════════════════════════════════════════════════════════════
// 페르소나 생성 파이프라인 v4.0 — 공유 함수
// generate-random API, 인큐베이터 배치에서 공통으로 사용
// T158: VoiceSpec + Factbook + TriggerMap 통합
// ═══════════════════════════════════════════════════════════════

import { prisma } from "@/lib/prisma"
import { generatePersona } from "@/lib/persona-generation"
import { generateCharacterWithLLM } from "@/lib/persona-generation/llm-character-generator"
import { buildAllPrompts } from "@/lib/prompt-builder"
import {
  generateAllQualitativeDimensions,
  generateAllQualitativeDimensionsWithLLM,
} from "@/lib/qualitative"
import { generateExpressQuirksWithLLM } from "@/lib/interaction/llm-express-quirks"
import { computeActivityTraits, computeActiveHours } from "@/lib/persona-world/activity-mapper"
import { calculateExtendedParadoxScore } from "@/lib/vector/paradox"
import { calculateCrossAxisProfile } from "@/lib/vector/cross-axis"
import {
  buildVoiceSpec,
  computeVoiceStyleParams,
  type VoiceSpec,
} from "@/lib/qualitative/voice-spec"
import { convertBackstoryToFactbook } from "@/lib/persona-world/factbook"
import { generateInitialTriggerRules, type TriggerRuleDSL } from "@/lib/trigger/rule-dsl"
import type { BackstoryDimension, Factbook, VoiceProfile } from "@/types"
import type { QuirkDefinition } from "@/lib/interaction/express-algorithm"
import { Prisma, type PersonaRole, type PersonaStatus } from "@/generated/prisma"

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
  const scores = {
    REVIEWER: l1.depth * 0.4 + l1.stance * 0.3 + l1.lens * 0.3,
    CURATOR: l1.taste * 0.4 + l1.scope * 0.3 + l2.openness * 0.3,
    EDUCATOR: l1.scope * 0.3 + l2.openness * 0.4 + l1.depth * 0.3,
    COMPANION: l1.sociability * 0.4 + l2.agreeableness * 0.4 + (1 - l1.stance) * 0.2,
    ANALYST: l1.depth * 0.4 + l1.lens * 0.4 + l1.scope * 0.2,
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as PersonaRole
}

// ── v4 Instruction Layer 공유 빌더 ───────────────────────────

export interface InstructionLayerResult {
  voiceSpec: VoiceSpec
  factbook: Factbook | null
  triggerRules: TriggerRuleDSL[]
}

export async function buildInstructionLayer(
  voice: VoiceProfile,
  backstory: BackstoryDimension,
  l1: {
    depth: number
    lens: number
    stance: number
    scope: number
    taste: number
    purpose: number
    sociability: number
  },
  l2: {
    openness: number
    conscientiousness: number
    extraversion: number
    agreeableness: number
    neuroticism: number
  },
  l3: { lack: number; moralCompass: number; volatility: number; growthArc: number }
): Promise<InstructionLayerResult> {
  const styleParams = computeVoiceStyleParams(l1, l2, l3)
  const voiceSpec = buildVoiceSpec(voice, styleParams, l1, l2, l3)

  let factbook: Factbook | null
  try {
    factbook = await convertBackstoryToFactbook(backstory)
  } catch {
    factbook = null
  }

  const triggerRules = generateInitialTriggerRules(l1, l2, l3)

  return { voiceSpec, factbook, triggerRules }
}

// ── 결과 타입 ────────────────────────────────────────────────

export interface GeneratedPersonaResult {
  id: string
  name: string
  role: string
  archetypeId: string | null
  paradoxScore: number
  dimensionalityScore: number
}

// ── 파이프라인 실행 ──────────────────────────────────────────

export async function executePersonaGenerationPipeline(options?: {
  archetypeId?: string
  status?: PersonaStatus
}): Promise<GeneratedPersonaResult> {
  const targetStatus = options?.status ?? "ACTIVE"

  // Stage 1: 기존 페르소나 벡터 조회 (다양성 보장)
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

  // Stage 2: 페르소나 생성 파이프라인
  const existingNames = existingPersonas.map((p) => p.name)

  const generated = generatePersona({
    archetypeId: options?.archetypeId,
    existingPersonas: existingVectors,
    diversityWeight: 0.5,
    existingNames,
  })

  const { l1, l2, l3 } = generated.vectors

  // Stage 2.5: 캐릭터 LLM 생성 (LLM 우선, 실패 시 패턴매칭 fallback)
  let character = generated.character
  try {
    character = await generateCharacterWithLLM(l1, l2, l3, generated.archetype, existingNames)
  } catch {
    // LLM 실패 시 기존 패턴매칭 결과 사용
  }

  // Stage 3: 정성적 4차원 생성 (LLM 우선, 실패 시 패턴매칭 fallback)
  let qualitative
  try {
    qualitative = await generateAllQualitativeDimensionsWithLLM(l1, l2, l3, generated.archetype)
  } catch {
    qualitative = generateAllQualitativeDimensions(l1, l2, l3, generated.archetype)
  }

  // Stage 3.5: Express 퀴크 LLM 생성
  let expressQuirks: QuirkDefinition[] = []
  try {
    expressQuirks = await generateExpressQuirksWithLLM(
      l1,
      l2,
      l3,
      generated.archetype,
      qualitative.voice
    )
  } catch {
    // LLM 실패 시 빈 배열 → 런타임에서 DEFAULT_QUIRKS 사용
  }

  // Stage 4: v4 Instruction Layer — VoiceSpec + Factbook + TriggerMap
  const { voiceSpec, factbook, triggerRules } = await buildInstructionLayer(
    qualitative.voice,
    qualitative.backstory,
    l1,
    l2,
    l3
  )

  // Stage 5: 프롬프트 5종 자동 빌드
  const role = inferPersonaRole(l1, l2)
  const prompts = buildAllPrompts({
    name: character.name,
    role: character.role,
    expertise: character.expertise,
    l1,
    l2,
    l3,
  })

  // Stage 5.5: warmth 계산 (L2 agreeableness 60% + L1 sociability 40%)
  const warmth = Math.round((l2.agreeableness * 0.6 + l1.sociability * 0.4) * 100) / 100

  // Stage 6: 활동성 8특성 + 활동시간
  const crossAxisProfile = calculateCrossAxisProfile(l1, l2, l3)
  const paradoxProfile = calculateExtendedParadoxScore(l1, l2, l3, crossAxisProfile)

  // Stage 7: DB 저장 (트랜잭션)
  const persona = await prisma.$transaction(async (tx) => {
    const systemUser = await tx.user.findFirst({ select: { id: true } })
    if (!systemUser) {
      throw new Error("시스템 사용자가 없습니다. 초기 사용자를 생성해주세요.")
    }

    const created = await tx.persona.create({
      data: {
        name: character.name,
        role,
        expertise: character.expertise,
        description: character.description,
        warmth,
        status: targetStatus,
        source: "MANUAL",
        archetypeId: generated.archetype?.id ?? null,
        paradoxScore: paradoxProfile.overall,
        dimensionalityScore: paradoxProfile.dimensionality,
        engineVersion: "4.0",
        promptTemplate: prompts.base,
        promptVersion: "1.0",
        basePrompt: prompts.base,
        createdById: systemUser.id,

        // v3 호환: 기존 소비자가 직접 접근하는 필드 유지
        voiceProfile: qualitative.voice as unknown as Prisma.InputJsonValue,
        backstory: qualitative.backstory as unknown as Prisma.InputJsonValue,
        pressureContext: qualitative.pressure as unknown as Prisma.InputJsonValue,
        zeitgeist: qualitative.zeitgeist as unknown as Prisma.InputJsonValue,

        // v4 Instruction Layer: 구조화된 전체 스펙
        voiceSpec: voiceSpec as unknown as Prisma.InputJsonValue,
        factbook: factbook as unknown as Prisma.InputJsonValue,
        triggerMap: (triggerRules.length > 0
          ? triggerRules
          : undefined) as unknown as Prisma.InputJsonValue,

        generationConfig: (expressQuirks.length > 0
          ? { expressQuirks }
          : undefined) as unknown as Prisma.InputJsonValue,
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

  return {
    id: persona.id,
    name: persona.name,
    role: persona.role,
    archetypeId: generated.archetype?.id ?? null,
    paradoxScore: paradoxProfile.overall,
    dimensionalityScore: paradoxProfile.dimensionality,
  }
}
