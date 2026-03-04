import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  validateTTSResult,
  getTTSValidationMetrics,
  resetTTSValidationMetrics,
} from "@/lib/persona-world/voice-pipeline"
import type { TTSResult } from "@/lib/persona-world/voice-pipeline"

// ═══════════════════════════════════════════════════════════════
// TTS 자체검증 단위 테스트 (T366)
//
// L1: 크기 기반 빠른 거부
// L2: MP3 포맷 유효성
// L3: 무음 비율 감지
// L4: 텍스트-오디오 길이 정합성
// ═══════════════════════════════════════════════════════════════

// ── 테스트용 오디오 데이터 생성 헬퍼 ─────────────────────────

/** 유효한 MP3 프레임 헤더 (0xFF 0xFB) + 랜덤 데이터 */
function createValidMp3Base64(sizeBytes: number): string {
  const buf = Buffer.alloc(sizeBytes)
  // MP3 프레임 싱크 바이트
  buf[0] = 0xff
  buf[1] = 0xfb
  buf[2] = 0x90
  buf[3] = 0x00
  // 랜덤 데이터로 채우기 (무음이 아님을 보장)
  for (let i = 4; i < sizeBytes; i++) {
    buf[i] = Math.floor(Math.random() * 256)
  }
  return buf.toString("base64")
}

/** ID3v2 헤더 + MP3 데이터 */
function createId3Mp3Base64(sizeBytes: number): string {
  const buf = Buffer.alloc(sizeBytes)
  // ID3v2 헤더
  buf[0] = 0x49 // 'I'
  buf[1] = 0x44 // 'D'
  buf[2] = 0x33 // '3'
  buf[3] = 0x04 // version
  buf[4] = 0x00
  buf[5] = 0x00 // flags
  // ID3 크기: 10 바이트 (synchsafe)
  buf[6] = 0x00
  buf[7] = 0x00
  buf[8] = 0x00
  buf[9] = 0x0a
  // ID3 데이터 (10 바이트)
  for (let i = 10; i < 20; i++) buf[i] = 0x00
  // MP3 프레임 싱크 + 랜덤 데이터
  if (sizeBytes > 20) {
    buf[20] = 0xff
    buf[21] = 0xfb
  }
  for (let i = 22; i < sizeBytes; i++) {
    buf[i] = Math.floor(Math.random() * 256)
  }
  return buf.toString("base64")
}

/** 무음 MP3 (대부분 0x00) */
function createSilentMp3Base64(sizeBytes: number): string {
  const buf = Buffer.alloc(sizeBytes)
  // 유효한 MP3 헤더
  buf[0] = 0xff
  buf[1] = 0xfb
  buf[2] = 0x90
  buf[3] = 0x00
  // 나머지는 전부 0x00 (무음)
  return buf.toString("base64")
}

/** 깨진 포맷 (유효하지 않은 매직 바이트) */
function createInvalidFormatBase64(sizeBytes: number): string {
  const buf = Buffer.alloc(sizeBytes)
  buf[0] = 0x00
  buf[1] = 0x01
  buf[2] = 0x02
  for (let i = 3; i < sizeBytes; i++) {
    buf[i] = Math.floor(Math.random() * 256)
  }
  return buf.toString("base64")
}

function makeTTSResult(audioBase64: string): TTSResult {
  return {
    audioBase64,
    contentType: "audio/mpeg",
    durationEstimateSec: 3,
  }
}

// ── L1: 크기 기반 빠른 거부 ─────────────────────────────────

describe("L1: 크기 기반 거부", () => {
  it("정상 크기 MP3는 PASS", () => {
    // 3자 텍스트 → 예상 ~0.72초 → L4 스킵 (0.5초 미만 체크)
    const audio = createValidMp3Base64(5000)
    const result = validateTTSResult(makeTTSResult(audio), 3)
    expect(result.valid).toBe(true)
  })

  it("빈 오디오(base64 < 100)는 EMPTY_AUDIO", () => {
    const result = validateTTSResult(makeTTSResult(""), 20)
    expect(result.valid).toBe(false)
    expect(result.failureCode).toBe("EMPTY_AUDIO")
  })

  it("매우 짧은 오디오는 EMPTY_AUDIO", () => {
    const result = validateTTSResult(makeTTSResult("AAAA"), 10)
    expect(result.valid).toBe(false)
    expect(result.failureCode).toBe("EMPTY_AUDIO")
  })

  it("과대 오디오(> 10MB base64)는 OVERSIZED", () => {
    // 10MB+ base64 문자열 시뮬레이션
    const hugeBase64 = "A".repeat(10_000_001)
    const result = validateTTSResult(makeTTSResult(hugeBase64), 20)
    expect(result.valid).toBe(false)
    expect(result.failureCode).toBe("OVERSIZED")
  })

  it("텍스트가 빈 문자열이면 검증 스킵", () => {
    const result = validateTTSResult(makeTTSResult(""), 0)
    expect(result.valid).toBe(true)
  })
})

// ── L2: MP3 포맷 유효성 ────────────────────────────────────

describe("L2: MP3 포맷 유효성", () => {
  it("MP3 프레임 싱크(0xFF 0xFB)는 유효", () => {
    // 적절한 비율: 2자 → L4 스킵
    const audio = createValidMp3Base64(2000)
    const result = validateTTSResult(makeTTSResult(audio), 2)
    expect(result.valid).toBe(true)
  })

  it("ID3v2 헤더(0x49 0x44 0x33)는 유효", () => {
    const audio = createId3Mp3Base64(2000)
    const result = validateTTSResult(makeTTSResult(audio), 2)
    expect(result.valid).toBe(true)
  })

  it("깨진 포맷(무효 매직 바이트)은 INVALID_FORMAT", () => {
    const audio = createInvalidFormatBase64(2000)
    const result = validateTTSResult(makeTTSResult(audio), 2)
    expect(result.valid).toBe(false)
    expect(result.failureCode).toBe("INVALID_FORMAT")
  })
})

// ── L3: 무음 비율 감지 ──────────────────────────────────────

describe("L3: 무음 비율 감지", () => {
  it("랜덤 데이터가 있는 MP3는 정상", () => {
    // 3자 → L4 스킵 범위
    const audio = createValidMp3Base64(5000)
    const result = validateTTSResult(makeTTSResult(audio), 3)
    expect(result.valid).toBe(true)
  })

  it("전부 0x00인 MP3(무음)는 SILENT_AUDIO", () => {
    // 충분히 큰 무음 데이터 (1KB+ 필요)
    const audio = createSilentMp3Base64(5000)
    const result = validateTTSResult(makeTTSResult(audio), 10)
    expect(result.valid).toBe(false)
    expect(result.failureCode).toBe("SILENT_AUDIO")
  })

  it("1KB 미만은 무음 분석 스킵", () => {
    // 짧은 무음이지만 L1 크기 통과, L4도 스킵 (1자 텍스트)
    const buf = Buffer.alloc(500)
    buf[0] = 0xff
    buf[1] = 0xfb
    const audio = buf.toString("base64")
    const result = validateTTSResult(makeTTSResult(audio), 1)
    expect(result.valid).toBe(true) // 너무 짧아서 무음 분석 + L4 스킵
  })
})

// ── L4: 텍스트-오디오 길이 정합성 ────────────────────────────

describe("L4: 텍스트-오디오 길이 정합성", () => {
  it("적절한 비율은 PASS", () => {
    // 20자 텍스트 → 예상 ~4.8초 (250자/분 기준)
    // 5000바이트 MP3 → ~0.3초 (128kbps) → ratio ≈ 0.06... → too low
    // 좀 더 큰 데이터로
    const audio = createValidMp3Base64(80_000) // ~60KB → ~3.75초
    const result = validateTTSResult(makeTTSResult(audio), 20)
    expect(result.valid).toBe(true)
  })

  it("짧은 텍스트(< 2자)에 대해서는 검증 스킵", () => {
    // 매우 짧은 텍스트 → 예상 0.48초 미만 → 스킵
    const audio = createValidMp3Base64(200)
    const result = validateTTSResult(makeTTSResult(audio), 1)
    expect(result.valid).toBe(true)
  })

  it("텍스트 대비 과도하게 큰 오디오는 DURATION_MISMATCH", () => {
    // 5자 텍스트 → 예상 ~1.2초
    // 2MB 오디오 → ~125초 → ratio ≈ 104 → 범위 초과
    const audio = createValidMp3Base64(2_000_000)
    const result = validateTTSResult(makeTTSResult(audio), 5)
    expect(result.valid).toBe(false)
    expect(result.failureCode).toBe("DURATION_MISMATCH")
  })

  it("텍스트 대비 과도하게 작은 오디오는 DURATION_MISMATCH", () => {
    // 500자 텍스트 → 예상 ~120초
    // 2000바이트 오디오 → ~0.125초 → ratio ≈ 0.001 → 범위 미달
    const audio = createValidMp3Base64(2000)
    const result = validateTTSResult(makeTTSResult(audio), 500)
    expect(result.valid).toBe(false)
    expect(result.failureCode).toBe("DURATION_MISMATCH")
  })
})

// ── 메트릭 ───────────────────────────────────────────────────

describe("검증 메트릭", () => {
  beforeEach(() => {
    resetTTSValidationMetrics()
  })

  it("초기 메트릭은 전부 0", () => {
    const metrics = getTTSValidationMetrics()
    expect(metrics.totalChecks).toBe(0)
    expect(metrics.failures).toBe(0)
    expect(metrics.retries).toBe(0)
    expect(metrics.fallbacks).toBe(0)
  })

  it("resetTTSValidationMetrics()로 초기화", () => {
    resetTTSValidationMetrics()
    const metrics = getTTSValidationMetrics()
    expect(metrics.totalChecks).toBe(0)
    expect(metrics.failures).toBe(0)
    expect(Object.keys(metrics.failuresByCode)).toHaveLength(0)
  })

  it("getTTSValidationMetrics()는 불변 사본을 반환", () => {
    const m1 = getTTSValidationMetrics()
    const m2 = getTTSValidationMetrics()
    expect(m1).not.toBe(m2) // 서로 다른 객체
    expect(m1).toEqual(m2) // 값은 동일
  })
})

// ── 통합: audioFailed 플래그 ────────────────────────────────

describe("TTSResult audioFailed 플래그", () => {
  it("정상 TTSResult에는 audioFailed가 없음", () => {
    const result: TTSResult = {
      audioBase64: createValidMp3Base64(5000),
      contentType: "audio/mpeg",
      durationEstimateSec: 3,
    }
    expect(result.audioFailed).toBeUndefined()
  })

  it("실패 TTSResult에는 audioFailed: true", () => {
    const result: TTSResult = {
      audioBase64: "",
      contentType: "audio/mpeg",
      durationEstimateSec: 0,
      audioFailed: true,
    }
    expect(result.audioFailed).toBe(true)
    expect(result.audioBase64).toBe("")
  })
})
