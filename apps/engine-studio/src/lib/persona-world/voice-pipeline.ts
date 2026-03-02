// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Voice Pipeline (T337)
// STT (Whisper API) + TTS (OpenAI/Google Neural) 통합 모듈
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type TTSProvider = "openai" | "google"

export interface TTSVoiceConfig {
  provider: TTSProvider
  voiceId: string
  pitch?: number
  speed?: number
  language?: string
}

export interface STTResult {
  text: string
  language: string
  durationSec: number
}

export interface TTSResult {
  audioBase64: string
  contentType: string
  durationEstimateSec: number
}

// ── 기본 설정 ─────────────────────────────────────────────────

export const DEFAULT_TTS_CONFIG: TTSVoiceConfig = {
  provider: "openai",
  voiceId: "alloy",
  speed: 1.0,
  language: "ko-KR",
}

export const OPENAI_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const
export type OpenAIVoice = (typeof OPENAI_VOICES)[number]

// ── STT: Whisper API ──────────────────────────────────────────

/**
 * OpenAI Whisper API를 통해 음성 → 텍스트 변환.
 * 반환: { text, language, durationSec }
 */
export async function speechToText(
  audioBuffer: Uint8Array,
  contentType: string
): Promise<STTResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured for STT")
  }

  // Whisper는 form-data로 파일을 받음
  const ext = contentType.includes("webm")
    ? "webm"
    : contentType.includes("mp4") || contentType.includes("m4a")
      ? "m4a"
      : contentType.includes("wav")
        ? "wav"
        : "webm"

  const formData = new FormData()
  const ab = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength
  ) as ArrayBuffer
  const blob = new Blob([ab], { type: contentType })
  formData.append("file", blob, `audio.${ext}`)
  formData.append("model", "whisper-1")
  formData.append("language", "ko")
  formData.append("response_format", "verbose_json")

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Whisper STT failed (${res.status}): ${errText}`)
  }

  const data = (await res.json()) as {
    text: string
    language: string
    duration: number
  }

  return {
    text: data.text,
    language: data.language || "ko",
    durationSec: data.duration || 0,
  }
}

// ── TTS: OpenAI ───────────────────────────────────────────────

/**
 * OpenAI TTS API를 통해 텍스트 → 음성 변환.
 * 반환: { audioBase64, contentType, durationEstimateSec }
 */
export async function textToSpeechOpenAI(text: string, config: TTSVoiceConfig): Promise<TTSResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured for TTS")
  }

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: config.voiceId || "alloy",
      input: text,
      speed: config.speed ?? 1.0,
      response_format: "mp3",
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI TTS failed (${res.status}): ${errText}`)
  }

  const arrayBuffer = await res.arrayBuffer()
  const audioBase64 = Buffer.from(arrayBuffer).toString("base64")

  // 대략적인 길이 추정 (한국어 평균 분당 250자 기준)
  const estimatedDuration = Math.max(1, Math.ceil((text.length / 250) * 60))

  return {
    audioBase64,
    contentType: "audio/mpeg",
    durationEstimateSec: estimatedDuration,
  }
}

// ── TTS: Google Cloud ─────────────────────────────────────────

/**
 * Google Cloud Text-to-Speech API를 통해 텍스트 → 음성 변환.
 * 반환: { audioBase64, contentType, durationEstimateSec }
 */
export async function textToSpeechGoogle(text: string, config: TTSVoiceConfig): Promise<TTSResult> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) {
    throw new Error("GOOGLE_TTS_API_KEY is not configured for TTS")
  }

  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: config.language || "ko-KR",
        name: config.voiceId || "ko-KR-Neural2-A",
        ssmlGender: "NEUTRAL",
      },
      audioConfig: {
        audioEncoding: "MP3",
        pitch: config.pitch ?? 0,
        speakingRate: config.speed ?? 1.0,
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Google TTS failed (${res.status}): ${errText}`)
  }

  const data = (await res.json()) as { audioContent: string }
  const estimatedDuration = Math.max(1, Math.ceil((text.length / 250) * 60))

  return {
    audioBase64: data.audioContent,
    contentType: "audio/mpeg",
    durationEstimateSec: estimatedDuration,
  }
}

// ── 통합 TTS 디스패처 ─────────────────────────────────────────

/**
 * provider 설정에 따라 OpenAI 또는 Google TTS를 호출.
 */
export async function textToSpeech(
  text: string,
  config: TTSVoiceConfig = DEFAULT_TTS_CONFIG
): Promise<TTSResult> {
  if (config.provider === "google") {
    return textToSpeechGoogle(text, config)
  }
  return textToSpeechOpenAI(text, config)
}

// ── 유틸리티 ──────────────────────────────────────────────────

/**
 * Prisma Persona의 TTS 필드 → TTSVoiceConfig 변환.
 */
export function buildTTSConfig(persona: {
  ttsProvider?: string | null
  ttsVoiceId?: string | null
  ttsPitch?: number | null
  ttsSpeed?: number | null
  ttsLanguage?: string | null
}): TTSVoiceConfig {
  return {
    provider: (persona.ttsProvider as TTSProvider) || DEFAULT_TTS_CONFIG.provider,
    voiceId: persona.ttsVoiceId || DEFAULT_TTS_CONFIG.voiceId,
    pitch: persona.ttsPitch != null ? Number(persona.ttsPitch) : DEFAULT_TTS_CONFIG.pitch,
    speed: persona.ttsSpeed != null ? Number(persona.ttsSpeed) : DEFAULT_TTS_CONFIG.speed,
    language: persona.ttsLanguage || DEFAULT_TTS_CONFIG.language,
  }
}

/**
 * STT/TTS 서비스 가용 여부 확인.
 */
export function isVoiceConfigured(): { stt: boolean; tts: boolean } {
  return {
    stt: !!process.env.OPENAI_API_KEY,
    tts: !!(process.env.OPENAI_API_KEY || process.env.GOOGLE_TTS_API_KEY),
  }
}
