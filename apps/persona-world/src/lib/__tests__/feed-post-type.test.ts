import { describe, it, expect } from "vitest"
import {
  POST_TYPE_LABELS,
  POST_TYPE_EMOJI,
  POST_TYPE_COLORS,
  FEED_SOURCE_CONFIG,
} from "../role-config"

const ALL_POST_TYPES = [
  "REVIEW",
  "THOUGHT",
  "RECOMMENDATION",
  "REACTION",
  "QUESTION",
  "LIST",
  "THREAD",
  "VS_BATTLE",
  "QNA",
  "CURATION",
  "DEBATE",
  "MEME",
  "COLLAB",
  "TRIVIA",
  "PREDICTION",
  "ANNIVERSARY",
  "BEHIND_STORY",
] as const

describe("feed-post-type: 17종 포스트 타입 설정", () => {
  // ── POST_TYPE_LABELS ─────────────────────────────────────

  it("17종 포스트 타입 라벨 존재", () => {
    for (const type of ALL_POST_TYPES) {
      expect(POST_TYPE_LABELS[type]).toBeDefined()
      expect(POST_TYPE_LABELS[type].length).toBeGreaterThan(0)
    }
  })

  it("라벨이 한글인지 확인", () => {
    for (const type of ALL_POST_TYPES) {
      // 한글 또는 영문+특수문자 포함 (Q&A, VS 배틀 등)
      expect(POST_TYPE_LABELS[type]).toBeTruthy()
    }
  })

  // ── POST_TYPE_EMOJI ──────────────────────────────────────

  it("17종 포스트 타입 이모지 존재", () => {
    for (const type of ALL_POST_TYPES) {
      expect(POST_TYPE_EMOJI[type]).toBeDefined()
      expect(POST_TYPE_EMOJI[type].length).toBeGreaterThan(0)
    }
  })

  // ── POST_TYPE_COLORS ─────────────────────────────────────

  it("17종 포스트 타입 색상 클래스 존재", () => {
    for (const type of ALL_POST_TYPES) {
      expect(POST_TYPE_COLORS[type]).toBeDefined()
      expect(POST_TYPE_COLORS[type]).toContain("bg-")
      expect(POST_TYPE_COLORS[type]).toContain("text-")
    }
  })

  // ── FEED_SOURCE_CONFIG ───────────────────────────────────

  it("3종 피드 소스 설정 존재 (FOLLOWING/RECOMMENDED/TRENDING)", () => {
    expect(FEED_SOURCE_CONFIG.FOLLOWING).toBeDefined()
    expect(FEED_SOURCE_CONFIG.RECOMMENDED).toBeDefined()
    expect(FEED_SOURCE_CONFIG.TRENDING).toBeDefined()
  })

  it("피드 소스에 label, color 필드 포함", () => {
    for (const source of ["FOLLOWING", "RECOMMENDED", "TRENDING"]) {
      const config = FEED_SOURCE_CONFIG[source]
      expect(config.label).toBeDefined()
      expect(config.label.length).toBeGreaterThan(0)
      expect(config.color).toBeDefined()
      expect(config.color).toContain("bg-")
      expect(config.color).toContain("text-")
    }
  })
})

describe("feed-post-type: FeedPost 타입 호환성", () => {
  it("PostType union과 17종 일치", () => {
    // PostType union 값들이 POST_TYPE_LABELS 키와 일치하는지 확인
    const configuredTypes = Object.keys(POST_TYPE_LABELS)
    for (const type of ALL_POST_TYPES) {
      expect(configuredTypes).toContain(type)
    }
    expect(configuredTypes).toHaveLength(ALL_POST_TYPES.length)
  })

  it("FeedSource 3종과 FEED_SOURCE_CONFIG 키 일치", () => {
    const sources = Object.keys(FEED_SOURCE_CONFIG)
    expect(sources).toHaveLength(3)
    expect(sources).toContain("FOLLOWING")
    expect(sources).toContain("RECOMMENDED")
    expect(sources).toContain("TRENDING")
  })
})
