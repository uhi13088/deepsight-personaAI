import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { prisma } from "@/lib/prisma"
import { textToSpeech, isVoiceConfigured } from "@/lib/persona-world/voice-pipeline"
import type { TTSVoiceConfig, TTSProvider } from "@/lib/persona-world/voice-pipeline"
import type { ApiResponse } from "@/types"

// ═══════════════════════════════════════════════════════════════
// POST /api/internal/personas/[id]/tts-preview
// TTS 음성 프리뷰 — 샘플 텍스트를 현재 TTS 설정으로 음성 합성
// ═══════════════════════════════════════════════════════════════

interface TtsPreviewBody {
  text?: string
  provider?: string
  voiceId?: string
  speed?: number
  pitch?: number
  language?: string
}

interface TtsPreviewResponse {
  audioBase64: string
  contentType: string
  durationEstimateSec: number
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { tts } = isVoiceConfigured()
    if (!tts) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TTS_NOT_CONFIGURED",
            message:
              "TTS API 키가 설정되지 않았습니다. OPENAI_API_KEY, GOOGLE_TTS_API_KEY, 또는 ELEVENLABS_API_KEY를 확인해주세요.",
          },
        } satisfies ApiResponse<never>,
        { status: 503 }
      )
    }

    const { id } = await params
    const body: TtsPreviewBody = await request.json()

    // 페르소나 조회
    const persona = await prisma.persona.findUnique({
      where: { id },
      select: {
        name: true,
        ttsProvider: true,
        ttsVoiceId: true,
        ttsSpeed: true,
        ttsPitch: true,
        ttsLanguage: true,
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

    // TTS 설정: body override → DB 값 → 기본값
    const config: TTSVoiceConfig = {
      provider: (body.provider ?? persona.ttsProvider ?? "openai") as TTSProvider,
      voiceId: body.voiceId ?? persona.ttsVoiceId ?? "alloy",
      speed: body.speed ?? (persona.ttsSpeed ? Number(persona.ttsSpeed) : 1.0),
      pitch: body.pitch ?? (persona.ttsPitch ? Number(persona.ttsPitch) : 0),
      language: body.language ?? persona.ttsLanguage ?? "ko-KR",
    }

    // 샘플 텍스트: body.text 또는 페르소나 이름 기반 기본 문장
    const sampleText =
      body.text?.trim() || `안녕하세요, 저는 ${persona.name}입니다. 만나서 반갑습니다.`

    const result = await textToSpeech(sampleText, config)

    return NextResponse.json({
      success: true,
      data: {
        audioBase64: result.audioBase64,
        contentType: result.contentType,
        durationEstimateSec: result.durationEstimateSec,
      },
    } satisfies ApiResponse<TtsPreviewResponse>)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: `TTS 프리뷰 실패: ${message}` },
      } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
