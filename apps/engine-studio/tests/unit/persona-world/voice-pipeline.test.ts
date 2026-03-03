import { describe, it, expect } from "vitest"
import {
  sttLanguageToBcp47,
  buildTTSConfig,
  DEFAULT_TTS_CONFIG,
} from "@/lib/persona-world/voice-pipeline"

// ═══════════════════════════════════════════════════════════════
// Voice Pipeline: 언어 자동 인식 + TTS config 테스트
// ═══════════════════════════════════════════════════════════════

describe("sttLanguageToBcp47", () => {
  it("주요 언어 코드를 BCP-47로 변환한다", () => {
    expect(sttLanguageToBcp47("ko")).toBe("ko-KR")
    expect(sttLanguageToBcp47("en")).toBe("en-US")
    expect(sttLanguageToBcp47("ja")).toBe("ja-JP")
    expect(sttLanguageToBcp47("zh")).toBe("zh-CN")
    expect(sttLanguageToBcp47("fr")).toBe("fr-FR")
    expect(sttLanguageToBcp47("de")).toBe("de-DE")
    expect(sttLanguageToBcp47("es")).toBe("es-ES")
    expect(sttLanguageToBcp47("pt")).toBe("pt-BR")
    expect(sttLanguageToBcp47("th")).toBe("th-TH")
    expect(sttLanguageToBcp47("vi")).toBe("vi-VN")
  })

  it("매핑에 없는 언어는 fallback 패턴을 사용한다", () => {
    expect(sttLanguageToBcp47("nl")).toBe("nl-NL")
    expect(sttLanguageToBcp47("sv")).toBe("sv-SV")
    expect(sttLanguageToBcp47("pl")).toBe("pl-PL")
  })
})

describe("buildTTSConfig", () => {
  it("페르소나 TTS 필드로 config를 생성한다", () => {
    const config = buildTTSConfig({
      ttsProvider: "openai",
      ttsVoiceId: "nova",
      ttsPitch: 0.5,
      ttsSpeed: 1.2,
      ttsLanguage: "en-US",
    })

    expect(config.provider).toBe("openai")
    expect(config.voiceId).toBe("nova")
    expect(config.pitch).toBe(0.5)
    expect(config.speed).toBe(1.2)
    expect(config.language).toBe("en-US")
  })

  it("null 필드는 기본값을 사용한다", () => {
    const config = buildTTSConfig({
      ttsProvider: null,
      ttsVoiceId: null,
      ttsPitch: null,
      ttsSpeed: null,
      ttsLanguage: null,
    })

    expect(config.provider).toBe(DEFAULT_TTS_CONFIG.provider)
    expect(config.voiceId).toBe(DEFAULT_TTS_CONFIG.voiceId)
    expect(config.speed).toBe(DEFAULT_TTS_CONFIG.speed)
    expect(config.language).toBe(DEFAULT_TTS_CONFIG.language)
  })

  it("language를 외부에서 오버라이드할 수 있다", () => {
    const config = buildTTSConfig({
      ttsProvider: "openai",
      ttsVoiceId: "nova",
      ttsPitch: null,
      ttsSpeed: 1.1,
      ttsLanguage: "ko-KR",
    })

    // 페르소나 프로필 기반 config 생성 후 유저 언어로 오버라이드
    config.language = sttLanguageToBcp47("en")

    expect(config.voiceId).toBe("nova") // 페르소나 음성 유지
    expect(config.speed).toBe(1.1) // 페르소나 속도 유지
    expect(config.language).toBe("en-US") // 유저 언어로 변경됨
  })
})
