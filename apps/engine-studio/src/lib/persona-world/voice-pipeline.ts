// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Voice Pipeline (T337)
// STT (Whisper API) + TTS (OpenAI/Google Neural) 통합 모듈
// ═══════════════════════════════════════════════════════════════

// ── 타입 정의 ─────────────────────────────────────────────────

export type TTSProvider = "openai" | "google" | "elevenlabs"

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

// ElevenLabs 프리셋 음성 카탈로그
export const ELEVENLABS_VOICES = [
  // Male
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "male", desc: "남성 · 권위 · 깊은" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", gender: "male", desc: "남성 · 내레이터" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", gender: "male", desc: "남성 · 캐주얼" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", gender: "male", desc: "남성 · 젊은" },
  { id: "pNInz6obpgDQGcFmaJgB", name: "Adam", gender: "male", desc: "남성 · 깊은 톤" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "male", desc: "남성 · 젊은 내레이터" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "male", desc: "남성 · 따뜻한" },
  { id: "g5CIjZEefAph4nQFvHAz", name: "Ethan", gender: "male", desc: "남성 · 내레이션" },
  // Female
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "female", desc: "여성 · 차분한" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", gender: "female", desc: "여성 · 세련된" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female", desc: "여성 · 부드러운" },
  { id: "9BWtsMINqrJLrRacOk9x", name: "Aria", gender: "female", desc: "여성 · 표현력" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female", desc: "여성 · 따뜻한" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "female", desc: "여성 · 온화한" },
  { id: "LcfcDJNUP1GQjkzn1xUU", name: "Emily", gender: "female", desc: "여성 · 차분한" },
  { id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy", gender: "female", desc: "여성 · 밝은" },
  // Non-binary
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River", gender: "neutral", desc: "중성 · 자연스러운" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", gender: "neutral", desc: "중성 · 캐주얼" },
] as const

// ── STT 언어 → BCP-47 매핑 (Google TTS용) ────────────────

const STT_LANG_TO_BCP47: Record<string, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
  it: "it-IT",
  ru: "ru-RU",
  ar: "ar-SA",
  hi: "hi-IN",
  th: "th-TH",
  vi: "vi-VN",
  id: "id-ID",
}

/**
 * STT 언어 코드(ISO 639-1) → BCP-47 변환.
 * Google TTS languageCode에 사용.
 */
export function sttLanguageToBcp47(sttLang: string): string {
  return STT_LANG_TO_BCP47[sttLang] ?? `${sttLang}-${sttLang.toUpperCase()}`
}

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
  // language 미지정 → Whisper가 자동 인식 (유저 언어 적응)
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

// ── TTS: ElevenLabs ──────────────────────────────────────────

/**
 * ElevenLabs TTS API를 통해 텍스트 → 음성 변환.
 * eleven_multilingual_v2 모델로 한국어 포함 다국어 지원.
 * 반환: { audioBase64, contentType, durationEstimateSec }
 */
export async function textToSpeechElevenLabs(
  text: string,
  config: TTSVoiceConfig
): Promise<TTSResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured for TTS")
  }

  const voiceId = config.voiceId || "21m00Tcm4TlvDq8ikWAM" // Rachel (기본)

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${errText}`)
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

// ── 통합 TTS 디스패처 ─────────────────────────────────────────

/**
 * provider 설정에 따라 OpenAI 또는 Google TTS를 호출.
 */
export async function textToSpeech(
  text: string,
  config: TTSVoiceConfig = DEFAULT_TTS_CONFIG
): Promise<TTSResult> {
  if (config.provider === "elevenlabs") {
    return textToSpeechElevenLabs(text, config)
  }
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
    tts: !!(
      process.env.OPENAI_API_KEY ||
      process.env.GOOGLE_TTS_API_KEY ||
      process.env.ELEVENLABS_API_KEY
    ),
  }
}
