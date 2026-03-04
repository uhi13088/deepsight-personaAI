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
  /** TTS 검증 실패 시 true — 클라이언트에서 텍스트 폴백 처리 */
  audioFailed?: boolean
}

// ── TTS 검증 결과 ────────────────────────────────────────────

export interface TTSValidationResult {
  valid: boolean
  /** 실패 원인 코드 */
  failureCode?:
    | "EMPTY_AUDIO"
    | "OVERSIZED"
    | "INVALID_FORMAT"
    | "SILENT_AUDIO"
    | "DURATION_MISMATCH"
  /** 상세 메시지 */
  message?: string
}

/** 검증 실패 메트릭 (프로바이더별 추적) */
export interface TTSValidationMetrics {
  totalChecks: number
  failures: number
  retries: number
  fallbacks: number
  failuresByCode: Record<string, number>
  failuresByProvider: Record<string, number>
}

const validationMetrics: TTSValidationMetrics = {
  totalChecks: 0,
  failures: 0,
  retries: 0,
  fallbacks: 0,
  failuresByCode: {},
  failuresByProvider: {},
}

/** 검증 메트릭 조회 */
export function getTTSValidationMetrics(): TTSValidationMetrics {
  return { ...validationMetrics }
}

/** 검증 메트릭 초기화 (테스트용) */
export function resetTTSValidationMetrics(): void {
  validationMetrics.totalChecks = 0
  validationMetrics.failures = 0
  validationMetrics.retries = 0
  validationMetrics.fallbacks = 0
  validationMetrics.failuresByCode = {}
  validationMetrics.failuresByProvider = {}
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

// ── TTS 자체검증 (Voice Self-Verification) ──────────────────
//
// L1: 크기 기반 빠른 거부 (빈 오디오 / 과대 응답)
// L2: MP3 포맷 유효성 (프레임 싱크 바이트 / ID3 헤더)
// L3: 무음 비율 감지 (MP3 프레임 바이트 패턴 분석)
// L4: 텍스트-오디오 길이 정합성 (예상 vs 실제 비율)
//
// 모든 검증이 순수 바이트 연산 → 추가 API 비용 없음 (~1ms)
// ─────────────────────────────────────────────────────────────

/** 최소 오디오 크기 (base64 기준, ~75바이트 실제 데이터) */
const MIN_AUDIO_BASE64_LENGTH = 100
/** 최대 오디오 크기 (base64 기준, ~7.5MB 실제 데이터) */
const MAX_AUDIO_BASE64_LENGTH = 10_000_000
/** 무음 프레임 비율 임계값 — 이 이상이면 무음 판정 */
const SILENT_FRAME_RATIO_THRESHOLD = 0.9
/** 길이 정합성 허용 비율 범위 (실제/예상) */
const DURATION_RATIO_MIN = 0.3
const DURATION_RATIO_MAX = 3.0
/** 한국어 평균 발화 속도 (분당 글자 수) */
const CHARS_PER_MINUTE = 250

/**
 * TTS 결과의 오디오 품질을 로컬에서 검증.
 * L1~L4 4단계 검증으로 빈 오디오, 깨진 포맷, 무음, 길이 불일치를 감지.
 * 추가 API 비용 없이 ~1ms 내 완료.
 */
export function validateTTSResult(result: TTSResult, inputTextLength: number): TTSValidationResult {
  const { audioBase64 } = result

  // L1: 크기 기반 빠른 거부
  if (inputTextLength > 0 && audioBase64.length < MIN_AUDIO_BASE64_LENGTH) {
    return {
      valid: false,
      failureCode: "EMPTY_AUDIO",
      message: `Audio too small: ${audioBase64.length} chars (min ${MIN_AUDIO_BASE64_LENGTH})`,
    }
  }
  if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
    return {
      valid: false,
      failureCode: "OVERSIZED",
      message: `Audio too large: ${audioBase64.length} chars (max ${MAX_AUDIO_BASE64_LENGTH})`,
    }
  }

  // 빈 텍스트에 대한 TTS는 검증 스킵 (빈 인사말 등)
  if (inputTextLength === 0) {
    return { valid: true }
  }

  // L2: MP3 포맷 유효성 — 첫 몇 바이트로 매직 넘버 확인
  const formatCheck = validateMp3Format(audioBase64)
  if (!formatCheck.valid) {
    return formatCheck
  }

  // L3: 무음 비율 감지 — MP3 프레임의 데이터 밀도 분석
  const silenceCheck = checkSilentAudio(audioBase64)
  if (!silenceCheck.valid) {
    return silenceCheck
  }

  // L4: 텍스트-오디오 길이 정합성
  const durationCheck = checkDurationConsistency(audioBase64, inputTextLength)
  if (!durationCheck.valid) {
    return durationCheck
  }

  return { valid: true }
}

/**
 * L2: MP3 포맷 유효성 검증.
 * MP3 프레임 싱크(0xFF 0xFx) 또는 ID3v2 헤더(0x49 0x44 0x33) 확인.
 */
function validateMp3Format(audioBase64: string): TTSValidationResult {
  try {
    // 첫 4바이트만 디코딩하여 확인
    const headerBytes = Buffer.from(audioBase64.slice(0, 8), "base64")
    if (headerBytes.length < 3) {
      return {
        valid: false,
        failureCode: "INVALID_FORMAT",
        message: "Audio data too short for header check",
      }
    }

    const b0 = headerBytes[0]
    const b1 = headerBytes[1]
    const b2 = headerBytes[2]

    // MP3 프레임 싱크: 0xFF 0xFB/0xF3/0xF2/0xFA/0xE0 등
    const isMp3Sync = b0 === 0xff && (b1 & 0xe0) === 0xe0
    // ID3v2 헤더: "ID3"
    const isId3 = b0 === 0x49 && b1 === 0x44 && b2 === 0x33

    if (!isMp3Sync && !isId3) {
      return {
        valid: false,
        failureCode: "INVALID_FORMAT",
        message: `Invalid MP3 header: 0x${b0.toString(16)} 0x${b1.toString(16)} 0x${b2.toString(16)}`,
      }
    }

    return { valid: true }
  } catch {
    return { valid: false, failureCode: "INVALID_FORMAT", message: "Failed to decode audio base64" }
  }
}

/**
 * L3: 무음 오디오 감지.
 * MP3 데이터의 바이트 엔트로피(다양성)를 분석하여 실질 오디오인지 판별.
 * 무음 MP3는 프레임 데이터가 거의 0x00으로 채워짐.
 */
function checkSilentAudio(audioBase64: string): TTSValidationResult {
  try {
    const buf = Buffer.from(audioBase64, "base64")

    // 최소 1KB 이상이어야 의미 있는 분석 가능
    if (buf.length < 1024) {
      return { valid: true } // 너무 짧으면 스킵 (L1에서 이미 크기 검증)
    }

    // ID3 태그 건너뛰기
    let offset = 0
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33 && buf.length > 10) {
      // ID3v2 크기: synchsafe integer (4바이트)
      const id3Size =
        ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f)
      offset = 10 + id3Size
    }

    // 오디오 데이터 영역에서 샘플링 (256바이트 간격으로 스캔)
    const sampleInterval = 256
    let totalSamples = 0
    let silentSamples = 0

    for (let i = offset; i < buf.length - sampleInterval; i += sampleInterval) {
      totalSamples++
      // 256바이트 블록의 바이트 분산을 계산
      let zeroCount = 0
      for (let j = 0; j < sampleInterval && i + j < buf.length; j++) {
        if (buf[i + j] === 0x00) zeroCount++
      }
      // 블록의 80% 이상이 0x00이면 무음 블록
      if (zeroCount / sampleInterval > 0.8) {
        silentSamples++
      }
    }

    if (totalSamples > 0 && silentSamples / totalSamples > SILENT_FRAME_RATIO_THRESHOLD) {
      return {
        valid: false,
        failureCode: "SILENT_AUDIO",
        message: `Audio is ${Math.round((silentSamples / totalSamples) * 100)}% silent (threshold: ${SILENT_FRAME_RATIO_THRESHOLD * 100}%)`,
      }
    }

    return { valid: true }
  } catch {
    return { valid: true } // 분석 실패 시 통과 (보수적)
  }
}

/**
 * L4: 텍스트-오디오 길이 정합성 검증.
 * MP3 비트레이트 기반으로 실제 오디오 길이를 추정하고,
 * 텍스트 길이 기반 예상 길이와 비교.
 */
function checkDurationConsistency(audioBase64: string, textLength: number): TTSValidationResult {
  // 예상 길이 (초)
  const expectedDurationSec = (textLength / CHARS_PER_MINUTE) * 60

  // MP3 비트레이트 기반 실제 길이 추정
  // MP3 평균 비트레이트: 128kbps → 16KB/s
  const audioBytes = Math.ceil(audioBase64.length * 0.75) // base64 → 실제 바이트
  const estimatedBitrate = 128_000 // 128kbps (일반적인 TTS 출력)
  const actualDurationSec = (audioBytes * 8) / estimatedBitrate

  // 예상 길이가 0.5초 미만이면 정합성 체크 스킵 (너무 짧은 텍스트)
  if (expectedDurationSec < 0.5) {
    return { valid: true }
  }

  const ratio = actualDurationSec / expectedDurationSec
  if (ratio < DURATION_RATIO_MIN || ratio > DURATION_RATIO_MAX) {
    return {
      valid: false,
      failureCode: "DURATION_MISMATCH",
      message: `Duration ratio ${ratio.toFixed(2)} out of range [${DURATION_RATIO_MIN}, ${DURATION_RATIO_MAX}] (expected: ${expectedDurationSec.toFixed(1)}s, estimated: ${actualDurationSec.toFixed(1)}s)`,
    }
  }

  return { valid: true }
}

/** TTS 프로바이더 간 fallback 순서 */
const PROVIDER_FALLBACK: Record<TTSProvider, TTSProvider | null> = {
  elevenlabs: "openai",
  openai: "google",
  google: null,
}

/** fallback 시 provider에 맞는 기본 voiceId */
const FALLBACK_VOICE_IDS: Record<TTSProvider, string> = {
  openai: "alloy",
  google: "ko-KR-Neural2-A",
  elevenlabs: "21m00Tcm4TlvDq8ikWAM", // Rachel
}

/** 검증 실패 시 메트릭에 기록 */
function recordValidationFailure(provider: string, failureCode: string): void {
  validationMetrics.failures++
  validationMetrics.failuresByCode[failureCode] =
    (validationMetrics.failuresByCode[failureCode] ?? 0) + 1
  validationMetrics.failuresByProvider[provider] =
    (validationMetrics.failuresByProvider[provider] ?? 0) + 1
  console.warn(`[TTS Validation] FAIL — provider: ${provider}, code: ${failureCode}`)
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

  /** 특정 캐시 항목 제거 (검증 실패 시 불량 캐시 삭제) */
  remove(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    this.totalSizeBytes -= entry.sizeBytes
    this.cache.delete(key)
    return true
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

// ── 통합 TTS 디스패처 (캐시 + 자체검증 적용) ────────────────

/** provider에 따라 적절한 TTS 함수를 호출 */
async function callTTSProvider(text: string, config: TTSVoiceConfig): Promise<TTSResult> {
  if (config.provider === "elevenlabs") {
    return textToSpeechElevenLabs(text, config)
  } else if (config.provider === "google") {
    return textToSpeechGoogle(text, config)
  } else {
    return textToSpeechOpenAI(text, config)
  }
}

/**
 * provider 설정에 따라 TTS API를 호출하되, 캐시 + 자체검증을 적용.
 *
 * 파이프라인:
 * 1. 캐시 조회 → HIT → 검증 → PASS → 반환 / FAIL → 캐시 제거 → 재생성
 * 2. API 호출 → 검증 → PASS → 캐시 저장 → 반환
 * 3. 검증 FAIL → 1회 재시도 → 검증 → PASS → 캐시 저장 → 반환
 * 4. 재시도 FAIL → fallback provider → 검증 → PASS → 반환
 * 5. 전부 FAIL → { audioFailed: true }
 */
export async function textToSpeech(
  text: string,
  config: TTSVoiceConfig = DEFAULT_TTS_CONFIG
): Promise<TTSResult> {
  const textLength = text.length

  // 1. 캐시 조회
  const cacheKey = ttsCache.generateKey(text, config)
  const cached = ttsCache.get(cacheKey)
  if (cached) {
    // 캐시된 항목도 검증 (이전에 불량이 캐시되었을 수 있음)
    validationMetrics.totalChecks++
    const validation = validateTTSResult(cached, textLength)
    if (validation.valid) return cached

    // 캐시된 불량 항목 제거
    ttsCache.remove(cacheKey)
    recordValidationFailure(config.provider, validation.failureCode ?? "UNKNOWN")
  }

  // 2. API 호출 + 검증
  let result: TTSResult
  try {
    result = await callTTSProvider(text, config)
  } catch (err) {
    console.error(`[TTS] Provider ${config.provider} call failed:`, err)
    // API 호출 자체가 실패하면 바로 fallback으로
    return await attemptFallback(text, config, textLength)
  }

  validationMetrics.totalChecks++
  const validation = validateTTSResult(result, textLength)
  if (validation.valid) {
    ttsCache.set(cacheKey, result)
    return result
  }

  // 3. 검증 실패 → 1회 재시도
  recordValidationFailure(config.provider, validation.failureCode ?? "UNKNOWN")
  validationMetrics.retries++

  try {
    result = await callTTSProvider(text, config)
    validationMetrics.totalChecks++
    const retryValidation = validateTTSResult(result, textLength)
    if (retryValidation.valid) {
      ttsCache.set(cacheKey, result)
      return result
    }
    recordValidationFailure(config.provider, retryValidation.failureCode ?? "UNKNOWN")
  } catch {
    // 재시도도 실패
  }

  // 4. Fallback provider
  return await attemptFallback(text, config, textLength)
}

/** Fallback provider로 TTS 시도 */
async function attemptFallback(
  text: string,
  originalConfig: TTSVoiceConfig,
  textLength: number
): Promise<TTSResult> {
  const fallbackProvider = PROVIDER_FALLBACK[originalConfig.provider]

  if (!fallbackProvider) {
    // fallback 없음 → 실패 반환
    return {
      audioBase64: "",
      contentType: "audio/mpeg",
      durationEstimateSec: 0,
      audioFailed: true,
    }
  }

  validationMetrics.fallbacks++
  const fallbackConfig: TTSVoiceConfig = {
    ...originalConfig,
    provider: fallbackProvider,
    voiceId: FALLBACK_VOICE_IDS[fallbackProvider],
    // fallback 시 ElevenLabs 전용 설정 제거
    stability: undefined,
    similarityBoost: undefined,
    style: undefined,
    useSpeakerBoost: undefined,
  }

  try {
    const result = await callTTSProvider(text, fallbackConfig)
    validationMetrics.totalChecks++
    const validation = validateTTSResult(result, textLength)
    if (validation.valid) {
      // fallback 결과는 캐시하지 않음 (원본 config과 다른 provider이므로)
      return result
    }
    recordValidationFailure(fallbackProvider, validation.failureCode ?? "UNKNOWN")
  } catch {
    // fallback도 API 호출 실패
  }

  // 모든 시도 실패
  return {
    audioBase64: "",
    contentType: "audio/mpeg",
    durationEstimateSec: 0,
    audioFailed: true,
  }
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
