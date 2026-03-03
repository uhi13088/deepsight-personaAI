// ═══════════════════════════════════════════════════════════════
// 기존 페르소나 프로필 일괄 재추론 API
// 벡터(L1/L2/L3) + 성별 기반으로 TTS 음성 + 빈 프로필 필드 일괄 채우기
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import {
  inferTTSVoiceFromVectors,
  generateCharacter,
} from "@/lib/persona-generation/character-generator"
import {
  L1_DIM_MAP,
  L2_DIM_MAP,
  L3_DIM_MAP,
  layerVectorToRecord,
  layerVectorsToMap,
} from "@/lib/vector/dim-maps"
import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  ApiResponse,
} from "@/types"

// ── POST /api/internal/personas/recalculate-tts ──────────────

interface RecalculateResult {
  total: number
  updated: number
  skipped: number
  details: Array<{
    id: string
    name: string
    gender: string
    oldVoiceId: string | null
    newVoiceId: string
    newSpeed: number
    filledFields: string[]
  }>
}

export async function POST() {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const personas = await prisma.persona.findMany({
      select: {
        id: true,
        name: true,
        gender: true,
        description: true,
        background: true,
        speechPatterns: true,
        quirks: true,
        birthDate: true,
        region: true,
        educationLevel: true,
        languages: true,
        knowledgeAreas: true,
        height: true,
        ttsProvider: true,
        ttsVoiceId: true,
        ttsSpeed: true,
        ttsLanguage: true,
        layerVectors: true,
      },
    })

    const details: RecalculateResult["details"] = []
    let updated = 0
    let skipped = 0

    // 이미 사용된 voice+speed 조합을 추적하여 중복 최소화
    const usedCombinations = new Set<string>()
    // 이미 사용된 이름 추적
    const existingNames = personas.map((p) => p.name)

    for (const p of personas) {
      // LayerVector 테이블에서 L1/L2/L3 벡터 추출
      const vectorMap = layerVectorsToMap(p.layerVectors)
      const socialVector = vectorMap.get("SOCIAL")
      const temperamentVector = vectorMap.get("TEMPERAMENT")

      // L1/L2 벡터가 없으면 스킵
      if (!socialVector || !temperamentVector) {
        skipped++
        continue
      }

      const l1Record = layerVectorToRecord(socialVector, L1_DIM_MAP)
      const l2Record = layerVectorToRecord(temperamentVector, L2_DIM_MAP)
      const narrativeVector = vectorMap.get("NARRATIVE")
      const l3Record = narrativeVector
        ? layerVectorToRecord(narrativeVector, L3_DIM_MAP)
        : { lack: 0.5, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 }

      const l1: SocialPersonaVector = {
        depth: l1Record.depth ?? 0.5,
        lens: l1Record.lens ?? 0.5,
        stance: l1Record.stance ?? 0.5,
        scope: l1Record.scope ?? 0.5,
        taste: l1Record.taste ?? 0.5,
        purpose: l1Record.purpose ?? 0.5,
        sociability: l1Record.sociability ?? 0.5,
      }

      const l2: CoreTemperamentVector = {
        openness: l2Record.openness ?? 0.5,
        conscientiousness: l2Record.conscientiousness ?? 0.5,
        extraversion: l2Record.extraversion ?? 0.5,
        agreeableness: l2Record.agreeableness ?? 0.5,
        neuroticism: l2Record.neuroticism ?? 0.5,
      }

      const l3: NarrativeDriveVector = {
        lack: l3Record.lack ?? 0.5,
        moralCompass: l3Record.moralCompass ?? 0.5,
        volatility: l3Record.volatility ?? 0.5,
        growthArc: l3Record.growthArc ?? 0.5,
      }

      const gender = (p.gender as "MALE" | "FEMALE" | "NON_BINARY") ?? "NON_BINARY"

      // ── TTS 재추론 ──────────────────────────────────────
      const ttsProfile = inferTTSVoiceFromVectors(l1, l2, gender)

      // 중복 voice+speed 조합 회피
      let finalSpeed = ttsProfile.speed
      const comboKey = `${ttsProfile.voiceId}_${finalSpeed.toFixed(2)}`
      if (usedCombinations.has(comboKey)) {
        const offsets = [0.05, -0.05, 0.1, -0.1, 0.03, -0.03]
        for (const offset of offsets) {
          const adjusted =
            Math.round(Math.max(0.85, Math.min(1.2, finalSpeed + offset)) * 100) / 100
          const newKey = `${ttsProfile.voiceId}_${adjusted.toFixed(2)}`
          if (!usedCombinations.has(newKey)) {
            finalSpeed = adjusted
            break
          }
        }
      }
      usedCombinations.add(`${ttsProfile.voiceId}_${finalSpeed.toFixed(2)}`)

      // ── 빈 프로필 필드 채우기 ──────────────────────────
      const updateData: Record<string, unknown> = {
        ttsProvider: ttsProfile.provider,
        ttsVoiceId: ttsProfile.voiceId,
        ttsSpeed: finalSpeed,
        ttsLanguage: ttsProfile.language,
      }
      const filledFields: string[] = ["tts"]

      const needsProfileFill =
        !p.description ||
        !p.background ||
        p.speechPatterns.length === 0 ||
        p.quirks.length === 0 ||
        !p.birthDate ||
        !p.region ||
        !p.educationLevel ||
        p.languages.length === 0 ||
        !p.height

      if (needsProfileFill) {
        const character = generateCharacter(l1, l2, l3, undefined, existingNames)

        if (!p.description) {
          updateData.description = character.description
          filledFields.push("description")
        }
        if (!p.background) {
          updateData.background = character.background
          filledFields.push("background")
        }
        if (p.speechPatterns.length === 0) {
          updateData.speechPatterns = character.speechPatterns
          filledFields.push("speechPatterns")
        }
        if (p.quirks.length === 0) {
          updateData.quirks = character.quirks
          filledFields.push("quirks")
        }

        // 인구통계 필드 — 벡터 기반 추론
        if (!p.birthDate) {
          const baseYear = 2000
          const ageOffset = Math.round(l1.depth * 15 + l2.conscientiousness * 10)
          const year = baseYear - ageOffset
          updateData.birthDate = new Date(`${year}-06-15`)
          filledFields.push("birthDate")
        }
        if (!p.region) {
          updateData.region = l1.sociability > 0.6 ? "서울" : l1.scope > 0.6 ? "해외" : "수도권"
          filledFields.push("region")
        }
        if (!p.educationLevel) {
          const academicScore = l1.depth * 0.4 + l1.lens * 0.3 + l2.openness * 0.3
          if (academicScore > 0.7) updateData.educationLevel = "MASTER"
          else if (academicScore > 0.5) updateData.educationLevel = "BACHELOR"
          else if (academicScore > 0.3) updateData.educationLevel = "SELF_TAUGHT"
          else updateData.educationLevel = "HIGH_SCHOOL"
          filledFields.push("educationLevel")
        }
        if (p.languages.length === 0) {
          const langs = ["ko"]
          if (l1.scope > 0.6 || l2.openness > 0.7) langs.push("en")
          if (l2.openness > 0.8) langs.push("ja")
          updateData.languages = langs
          filledFields.push("languages")
        }
        if (!p.height) {
          const baseHeight = gender === "MALE" ? 175 : gender === "FEMALE" ? 163 : 169
          const variation = Math.round((l2.extraversion - 0.5) * 10)
          updateData.height = baseHeight + variation
          filledFields.push("height")
        }
      }

      await prisma.persona.update({
        where: { id: p.id },
        data: updateData,
      })

      details.push({
        id: p.id,
        name: p.name,
        gender,
        oldVoiceId: p.ttsVoiceId,
        newVoiceId: ttsProfile.voiceId,
        newSpeed: finalSpeed,
        filledFields,
      })
      updated++
    }

    return NextResponse.json<ApiResponse<RecalculateResult>>({
      success: true,
      data: {
        total: personas.length,
        updated,
        skipped,
        details,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[recalculate-tts] 실패:", message)
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: "RECALCULATE_ERROR",
          message: "프로필 재설정 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        },
      },
      { status: 500 }
    )
  }
}
