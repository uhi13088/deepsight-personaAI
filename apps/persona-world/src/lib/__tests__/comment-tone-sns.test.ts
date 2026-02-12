import { describe, it, expect } from "vitest"
import { COMMENT_TONE_CONFIG, SNS_PROVIDER_CONFIG } from "../role-config"

const ALL_TONES = [
  "empathetic",
  "analytical",
  "counter_argument",
  "humorous",
  "supportive",
  "questioning",
  "informative",
  "provocative",
] as const

const ALL_PROVIDERS = [
  "twitter",
  "instagram",
  "threads",
  "naver_blog",
  "youtube",
  "youtube_music",
  "spotify",
  "netflix",
] as const

describe("comment-tone: 8종 댓글 톤 뱃지 설정", () => {
  it("8종 톤 라벨 존재", () => {
    for (const tone of ALL_TONES) {
      expect(COMMENT_TONE_CONFIG[tone]).toBeDefined()
      expect(COMMENT_TONE_CONFIG[tone].label.length).toBeGreaterThan(0)
    }
  })

  it("8종 톤 이모지 존재", () => {
    for (const tone of ALL_TONES) {
      expect(COMMENT_TONE_CONFIG[tone].emoji).toBeDefined()
      expect(COMMENT_TONE_CONFIG[tone].emoji.length).toBeGreaterThan(0)
    }
  })

  it("8종 톤 색상 클래스 존재", () => {
    for (const tone of ALL_TONES) {
      expect(COMMENT_TONE_CONFIG[tone].color).toBeDefined()
      expect(COMMENT_TONE_CONFIG[tone].color).toContain("bg-")
      expect(COMMENT_TONE_CONFIG[tone].color).toContain("text-")
    }
  })

  it("톤 설정 개수 8종", () => {
    expect(Object.keys(COMMENT_TONE_CONFIG)).toHaveLength(ALL_TONES.length)
  })
})

describe("sns-provider: 8개 SNS 플랫폼 설정", () => {
  it("8개 플랫폼 라벨 존재", () => {
    for (const provider of ALL_PROVIDERS) {
      expect(SNS_PROVIDER_CONFIG[provider]).toBeDefined()
      expect(SNS_PROVIDER_CONFIG[provider].label.length).toBeGreaterThan(0)
    }
  })

  it("8개 플랫폼 이모지 존재", () => {
    for (const provider of ALL_PROVIDERS) {
      expect(SNS_PROVIDER_CONFIG[provider].emoji).toBeDefined()
      expect(SNS_PROVIDER_CONFIG[provider].emoji.length).toBeGreaterThan(0)
    }
  })

  it("8개 플랫폼 설명 존재", () => {
    for (const provider of ALL_PROVIDERS) {
      expect(SNS_PROVIDER_CONFIG[provider].description).toBeDefined()
      expect(SNS_PROVIDER_CONFIG[provider].description.length).toBeGreaterThan(0)
    }
  })

  it("8개 플랫폼 색상 클래스 존재", () => {
    for (const provider of ALL_PROVIDERS) {
      expect(SNS_PROVIDER_CONFIG[provider].color).toBeDefined()
      expect(SNS_PROVIDER_CONFIG[provider].color).toContain("bg-")
      expect(SNS_PROVIDER_CONFIG[provider].color).toContain("text-")
    }
  })

  it("플랫폼 설정 개수 8개", () => {
    expect(Object.keys(SNS_PROVIDER_CONFIG)).toHaveLength(ALL_PROVIDERS.length)
  })
})

describe("CommentTone 타입과 설정 호환성", () => {
  it("CommentTone 타입의 모든 값이 COMMENT_TONE_CONFIG에 존재", () => {
    const configuredTones = Object.keys(COMMENT_TONE_CONFIG)
    for (const tone of ALL_TONES) {
      expect(configuredTones).toContain(tone)
    }
    expect(configuredTones).toHaveLength(ALL_TONES.length)
  })
})

describe("SnsProvider 타입과 설정 호환성", () => {
  it("SnsProvider 타입의 모든 값이 SNS_PROVIDER_CONFIG에 존재", () => {
    const configuredProviders = Object.keys(SNS_PROVIDER_CONFIG)
    for (const provider of ALL_PROVIDERS) {
      expect(configuredProviders).toContain(provider)
    }
    expect(configuredProviders).toHaveLength(ALL_PROVIDERS.length)
  })
})
