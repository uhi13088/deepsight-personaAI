// POST /api/internal/personas/[id]/upgrade
// 오래된 엔진 버전 페르소나를 v4.0으로 업그레이드
// — voiceSpec / factbook / triggerMap 생성 후 engineVersion = "4.0" 저장

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import { buildInstructionLayer } from "@/lib/persona-generation/pipeline"
import type { ApiResponse } from "@/types"
import type { VoiceProfile, BackstoryDimension } from "@/types"
import { Prisma } from "@/generated/prisma"

const CURRENT_ENGINE_VERSION = "4.0"

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0.5
  if (typeof v === "object" && "toNumber" in (v as object)) {
    return (v as { toNumber(): number }).toNumber()
  }
  return Number(v)
}

interface UpgradeResult {
  id: string
  engineVersion: string
  upgraded: boolean
  reason?: string
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  const { id } = await params

  try {
    const persona = await prisma.persona.findUnique({
      where: { id },
      include: {
        layerVectors: { orderBy: { version: "desc" } },
      },
    })

    if (!persona) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "NOT_FOUND", message: `페르소나를 찾을 수 없습니다: ${id}` },
        },
        { status: 404 }
      )
    }

    // 이미 최신 버전이면 스킵
    if (persona.engineVersion === CURRENT_ENGINE_VERSION && persona.voiceSpec !== null) {
      return NextResponse.json<ApiResponse<UpgradeResult>>({
        success: true,
        data: {
          id,
          engineVersion: CURRENT_ENGINE_VERSION,
          upgraded: false,
          reason: "이미 최신 버전입니다",
        },
      })
    }

    // ── 레이어 벡터 로드 ─────────────────────────────────────
    const l1Row = persona.layerVectors.find((v) => v.layerType === "SOCIAL")
    const l2Row = persona.layerVectors.find((v) => v.layerType === "TEMPERAMENT")
    const l3Row = persona.layerVectors.find((v) => v.layerType === "NARRATIVE")

    const l1 = {
      depth: toNum(l1Row?.dim1),
      lens: toNum(l1Row?.dim2),
      stance: toNum(l1Row?.dim3),
      scope: toNum(l1Row?.dim4),
      taste: toNum(l1Row?.dim5),
      purpose: toNum(l1Row?.dim6),
      sociability: toNum(l1Row?.dim7),
    }
    const l2 = {
      openness: toNum(l2Row?.dim1),
      conscientiousness: toNum(l2Row?.dim2),
      extraversion: toNum(l2Row?.dim3),
      agreeableness: toNum(l2Row?.dim4),
      neuroticism: toNum(l2Row?.dim5),
    }
    const l3 = {
      lack: toNum(l3Row?.dim1),
      moralCompass: toNum(l3Row?.dim2),
      volatility: toNum(l3Row?.dim3),
      growthArc: toNum(l3Row?.dim4),
    }

    // ── 기존 v3 데이터에서 VoiceProfile / BackstoryDimension 추출 ──
    // v3 필드가 없으면 벡터 기반 기본값 사용
    const voiceProfile: VoiceProfile = (persona.voiceProfile as VoiceProfile | null) ?? {
      speechStyle: l2.conscientiousness > 0.5 ? "formal" : "casual",
      habitualExpressions: [],
      physicalMannerisms: [],
      unconsciousBehaviors: [],
      activationThresholds: {},
    }

    const backstory: BackstoryDimension = (persona.backstory as BackstoryDimension | null) ?? {
      origin: persona.description ?? "",
      formativeExperience: "",
      innerConflict: "",
      selfNarrative: "",
      nlpKeywords: persona.expertise,
    }

    // ── v4 Instruction Layer 생성 ────────────────────────────
    const { voiceSpec, factbook, triggerRules } = await buildInstructionLayer(
      voiceProfile,
      backstory,
      l1,
      l2,
      l3
    )

    // ── DB 업데이트 ──────────────────────────────────────────
    await prisma.persona.update({
      where: { id },
      data: {
        engineVersion: CURRENT_ENGINE_VERSION,
        voiceSpec: voiceSpec as unknown as Prisma.InputJsonValue,
        factbook: factbook as unknown as Prisma.InputJsonValue,
        triggerMap: (triggerRules.length > 0
          ? triggerRules
          : undefined) as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json<ApiResponse<UpgradeResult>>({
      success: true,
      data: { id, engineVersion: CURRENT_ENGINE_VERSION, upgraded: true },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "업그레이드 실패"
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 }
    )
  }
}
