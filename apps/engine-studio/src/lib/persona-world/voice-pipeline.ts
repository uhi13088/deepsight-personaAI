// ═══════════════════════════════════════════════════════════════
// PersonaWorld — Voice Pipeline (T337)
// STT (Whisper API) + TTS (OpenAI/Google/ElevenLabs) 통합 모듈
// + 인메모리 LRU 캐시 (동일 음성+텍스트 조합 재사용)
// ═══════════════════════════════════════════════════════════════

import { createHash } from "crypto"

// ── 타입 정의 ─────────────────────────────────────────────────

export type TTSProvider = "openai" | "google" | "elevenlabs"

export interface TTSVoiceConfig {
  provider: TTSProvider
  voiceId: string
  pitch?: number
  speed?: number
  language?: string
  /** ElevenLabs voice_settings — Voice Engine 10D에서 자동 계산 */
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
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
        stability: config.stability ?? 0.5,
        similarity_boost: config.similarityBoost ?? 0.75,
        style: config.style ?? 0.0,
        use_speaker_boost: config.useSpeakerBoost ?? true,
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

// ── TTS 캐시 (인메모리 LRU) ──────────────────────────────────
//
// 동일 (provider + voiceId + speed + text) 조합의 오디오를 캐싱.
// 1000+ 페르소나 × 다수 유저 대화 시, 같은 페르소나의 동일 응답을
// 반복 생성하지 않아 API 비용을 대폭 절감합니다.
//
// 스케일업 시 Redis/S3로 교체 가능 (인터페이스 동일).
// ─────────────────────────────────────────────────────────────

const TTS_CACHE_MAX_ENTRIES = parseInt(process.env.TTS_CACHE_MAX_ENTRIES ?? "5000", 10)

export interface TtsCacheStats {
  entries: number
  hits: number
  misses: number
  hitRate: string
  estimatedMemoryMB: string
}

interface CacheEntry {
  result: TTSResult
  sizeBytes: number
  lastUsed: number
}

class TtsCacheStore {
  private cache = new Map<string, CacheEntry>()
  private hits = 0
  private misses = 0
  private totalSizeBytes = 0

  /** provider + voiceId + speed + voice_settings + text → SHA-256 키 (16자) */
  generateKey(text: string, config: TTSVoiceConfig): string {
    const raw = `${config.provider}|${config.voiceId}|${config.speed ?? 1}|${config.stability ?? ""}|${config.similarityBoost ?? ""}|${config.style ?? ""}|${text}`
    return createHash("sha256").update(raw).digest("hex").slice(0, 16)
  }

  get(key: string): TTSResult | null {
    const entry = this.cache.get(key)
    if (!entry) {
      this.misses++
      return null
    }
    // LRU: 최근 사용 갱신
    entry.lastUsed = Date.now()
    this.hits++
    return entry.result
  }

  set(key: string, result: TTSResult): void {
    // 이미 캐시에 있으면 스킵
    if (this.cache.has(key)) return

    const sizeBytes = Math.ceil(result.audioBase64.length * 0.75) // base64 → 실제 바이트

    // LRU eviction: 용량 초과 시 가장 오래된 항목 제거
    while (this.cache.size >= TTS_CACHE_MAX_ENTRIES) {
      this.evictOldest()
    }

    this.cache.set(key, { result, sizeBytes, lastUsed: Date.now() })
    this.totalSizeBytes += sizeBytes
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity
    for (const [key, entry] of this.cache) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed
        oldestKey = key
      }
    }
    if (oldestKey) {
      const evicted = this.cache.get(oldestKey)
      if (evicted) this.totalSizeBytes -= evicted.sizeBytes
      this.cache.delete(oldestKey)
    }
  }

  stats(): TtsCacheStats {
    const total = this.hits + this.misses
    return {
      entries: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : "0%",
      estimatedMemoryMB: `${(this.totalSizeBytes / (1024 * 1024)).toFixed(1)}MB`,
    }
  }

  clear(): void {
    this.cache.clear()
    this.totalSizeBytes = 0
    this.hits = 0
    this.misses = 0
  }
}

/** 싱글턴 TTS 캐시 — 모듈 레벨에서 공유 */
export const ttsCache = new TtsCacheStore()

// ── 통합 TTS 디스패처 (캐시 적용) ────────────────────────────

/**
 * provider 설정에 따라 TTS API를 호출하되, 캐시에 있으면 바로 반환.
 * 동일 텍스트+음성 조합은 한 번만 API 호출 → 비용 절감.
 */
export async function textToSpeech(
  text: string,
  config: TTSVoiceConfig = DEFAULT_TTS_CONFIG
): Promise<TTSResult> {
  // 1. 캐시 조회
  const cacheKey = ttsCache.generateKey(text, config)
  const cached = ttsCache.get(cacheKey)
  if (cached) return cached

  // 2. 캐시 미스 → API 호출
  let result: TTSResult
  if (config.provider === "elevenlabs") {
    result = await textToSpeechElevenLabs(text, config)
  } else if (config.provider === "google") {
    result = await textToSpeechGoogle(text, config)
  } else {
    result = await textToSpeechOpenAI(text, config)
  }

  // 3. 캐시 저장
  ttsCache.set(cacheKey, result)

  return result
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
  ttsStability?: number | null
  ttsSimilarityBoost?: number | null
  ttsStyle?: number | null
}): TTSVoiceConfig {
  return {
    provider: (persona.ttsProvider as TTSProvider) || DEFAULT_TTS_CONFIG.provider,
    voiceId: persona.ttsVoiceId || DEFAULT_TTS_CONFIG.voiceId,
    pitch: persona.ttsPitch != null ? Number(persona.ttsPitch) : DEFAULT_TTS_CONFIG.pitch,
    speed: persona.ttsSpeed != null ? Number(persona.ttsSpeed) : DEFAULT_TTS_CONFIG.speed,
    language: persona.ttsLanguage || DEFAULT_TTS_CONFIG.language,
    stability: persona.ttsStability != null ? Number(persona.ttsStability) : undefined,
    similarityBoost:
      persona.ttsSimilarityBoost != null ? Number(persona.ttsSimilarityBoost) : undefined,
    style: persona.ttsStyle != null ? Number(persona.ttsStyle) : undefined,
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
