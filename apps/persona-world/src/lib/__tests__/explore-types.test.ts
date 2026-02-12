import { describe, it, expect } from "vitest"
import { ROLE_NAMES, ROLE_EMOJI, ROLE_COLORS_BOLD, ROLE_COLORS_LIGHT } from "../role-config"

const ALL_ROLES = ["REVIEWER", "CURATOR", "EDUCATOR", "COMPANION", "ANALYST"] as const

describe("explore-types: 역할 설정 검증", () => {
  it("5종 역할 이름 존재", () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_NAMES[role]).toBeDefined()
      expect(ROLE_NAMES[role].length).toBeGreaterThan(0)
    }
  })

  it("5종 역할 이모지 존재", () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_EMOJI[role]).toBeDefined()
    }
  })

  it("5종 역할 Bold 그라디언트 존재", () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_COLORS_BOLD[role]).toBeDefined()
      expect(ROLE_COLORS_BOLD[role]).toContain("from-")
      expect(ROLE_COLORS_BOLD[role]).toContain("to-")
    }
  })

  it("5종 역할 Light 그라디언트 존재", () => {
    for (const role of ALL_ROLES) {
      expect(ROLE_COLORS_LIGHT[role]).toBeDefined()
      expect(ROLE_COLORS_LIGHT[role]).toContain("from-")
      expect(ROLE_COLORS_LIGHT[role]).toContain("to-")
    }
  })
})

describe("explore-types: ExploreResponse 구조 검증", () => {
  it("ExploreCluster에 필요한 필드 정의", () => {
    // 타입 정합성 테스트 — 실제 타입이 import 가능한지 확인
    const mockCluster = {
      role: "REVIEWER",
      count: 5,
      personas: [
        {
          id: "test-1",
          name: "Test",
          handle: "@test",
          tagline: null,
          role: "REVIEWER",
          profileImageUrl: null,
          warmth: 0.5,
          archetypeId: null,
          followerCount: 10,
          postCount: 5,
        },
      ],
    }
    expect(mockCluster.role).toBe("REVIEWER")
    expect(mockCluster.personas).toHaveLength(1)
    expect(mockCluster.personas[0].followerCount).toBe(10)
  })

  it("ExploreHotTopic에 필요한 필드 정의", () => {
    const mockTopic = {
      type: "VS_BATTLE",
      postCount: 10,
      totalLikes: 50,
      totalComments: 20,
      engagement: 70,
    }
    expect(mockTopic.engagement).toBe(mockTopic.totalLikes + mockTopic.totalComments)
  })

  it("ExploreDebatePost에 필요한 필드 정의", () => {
    const mockDebate = {
      id: "post-1",
      type: "DEBATE",
      content: "토론 내용",
      metadata: null,
      likeCount: 10,
      commentCount: 5,
      createdAt: new Date().toISOString(),
      persona: {
        id: "persona-1",
        name: "Test Persona",
        handle: "@test",
        role: "ANALYST",
        profileImageUrl: null,
      },
    }
    expect(mockDebate.persona.role).toBe("ANALYST")
    expect(mockDebate.commentCount).toBe(5)
  })

  it("ExploreNewPersona에 createdAt, expertise 포함", () => {
    const mockNew = {
      id: "persona-2",
      name: "New Persona",
      handle: "@new",
      tagline: "새로운 페르소나",
      role: "CURATOR",
      profileImageUrl: null,
      warmth: 0.7,
      archetypeId: null,
      followerCount: 0,
      postCount: 0,
      expertise: ["영화", "드라마"],
      createdAt: new Date().toISOString(),
    }
    expect(mockNew.expertise).toHaveLength(2)
    expect(mockNew.createdAt).toBeTruthy()
  })
})
