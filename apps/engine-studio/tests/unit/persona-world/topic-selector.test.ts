import { describe, it, expect, vi } from "vitest"
import {
  selectTopic,
  isTriggerBasedTopic,
  type TopicDataProvider,
} from "@/lib/persona-world/topic-selector"

// ── Mock Provider ──

function makeMockProvider(overrides?: Partial<TopicDataProvider>): TopicDataProvider {
  return {
    getTopicFromTrigger: vi.fn().mockResolvedValue(null),
    getInterestContinuityTopic: vi.fn().mockResolvedValue(null),
    getVectorMatchingTopic: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

// ═══ selectTopic ═══

describe("selectTopic", () => {
  it("CONTENT_RELEASE 트리거 → trigger 소스", async () => {
    const provider = makeMockProvider({
      getTopicFromTrigger: vi.fn().mockResolvedValue("새 영화 '듄3' 개봉"),
    })

    const result = await selectTopic("persona-1", "CONTENT_RELEASE", provider, {
      contentId: "movie-123",
    })

    expect(result.source).toBe("trigger")
    expect(result.topic).toBe("새 영화 '듄3' 개봉")
    expect(result.confidence).toBe(1.0)
    expect(provider.getTopicFromTrigger).toHaveBeenCalledWith("CONTENT_RELEASE", {
      contentId: "movie-123",
    })
  })

  it("TRENDING 트리거 → trigger 소스", async () => {
    const provider = makeMockProvider({
      getTopicFromTrigger: vi.fn().mockResolvedValue("AI 규제 논란"),
    })

    const result = await selectTopic("persona-1", "TRENDING", provider, {
      topicId: "topic-456",
    })

    expect(result.source).toBe("trigger")
    expect(result.topic).toBe("AI 규제 논란")
    expect(result.confidence).toBe(1.0)
  })

  it("SCHEDULED 트리거 → trigger 스킵, 관심사 연속", async () => {
    const provider = makeMockProvider({
      getInterestContinuityTopic: vi.fn().mockResolvedValue("최근 좋아요한 음악 리뷰"),
    })

    const result = await selectTopic("persona-1", "SCHEDULED", provider)

    expect(result.source).toBe("interest_continuity")
    expect(result.topic).toBe("최근 좋아요한 음악 리뷰")
    expect(result.confidence).toBe(0.8)
    expect(provider.getTopicFromTrigger).not.toHaveBeenCalled()
  })

  it("트리거가 null 반환 → 관심사 연속으로 fallback", async () => {
    const provider = makeMockProvider({
      getTopicFromTrigger: vi.fn().mockResolvedValue(null),
      getInterestContinuityTopic: vi.fn().mockResolvedValue("영화 토론 시리즈"),
    })

    const result = await selectTopic("persona-1", "CONTENT_RELEASE", provider, {
      contentId: "movie-789",
    })

    expect(result.source).toBe("interest_continuity")
    expect(result.topic).toBe("영화 토론 시리즈")
  })

  it("관심사도 null → 벡터 매칭으로 fallback", async () => {
    const provider = makeMockProvider({
      getVectorMatchingTopic: vi.fn().mockResolvedValue("인디 음악 추천"),
    })

    const result = await selectTopic("persona-1", "SCHEDULED", provider)

    expect(result.source).toBe("vector_matching")
    expect(result.topic).toBe("인디 음악 추천")
    expect(result.confidence).toBe(0.6)
  })

  it("모든 소스 null → 자유 주제 (topic null)", async () => {
    const provider = makeMockProvider()

    const result = await selectTopic("persona-1", "SCHEDULED", provider)

    expect(result.source).toBe("free")
    expect(result.topic).toBeNull()
    expect(result.confidence).toBe(0.4)
  })

  it("우선순위 순서 보장 — trigger > interest > vector > free", async () => {
    // 모두 값이 있어도 trigger 우선
    const provider = makeMockProvider({
      getTopicFromTrigger: vi.fn().mockResolvedValue("트리거 주제"),
      getInterestContinuityTopic: vi.fn().mockResolvedValue("관심사 주제"),
      getVectorMatchingTopic: vi.fn().mockResolvedValue("벡터 주제"),
    })

    const result = await selectTopic("persona-1", "TRENDING", provider, {
      topicId: "topic-1",
    })

    expect(result.source).toBe("trigger")
    expect(result.topic).toBe("트리거 주제")
    // interest, vector는 호출되지 않아야 함
    expect(provider.getInterestContinuityTopic).not.toHaveBeenCalled()
    expect(provider.getVectorMatchingTopic).not.toHaveBeenCalled()
  })
})

// ═══ isTriggerBasedTopic ═══

describe("isTriggerBasedTopic", () => {
  it("CONTENT_RELEASE → true", () => {
    expect(isTriggerBasedTopic("CONTENT_RELEASE")).toBe(true)
  })

  it("TRENDING → true", () => {
    expect(isTriggerBasedTopic("TRENDING")).toBe(true)
  })

  it("SCHEDULED → false", () => {
    expect(isTriggerBasedTopic("SCHEDULED")).toBe(false)
  })

  it("USER_INTERACTION → false", () => {
    expect(isTriggerBasedTopic("USER_INTERACTION")).toBe(false)
  })

  it("SOCIAL_EVENT → false", () => {
    expect(isTriggerBasedTopic("SOCIAL_EVENT")).toBe(false)
  })
})
