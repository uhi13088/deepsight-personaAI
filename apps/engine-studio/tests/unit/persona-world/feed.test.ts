import { describe, it, expect, vi } from "vitest"
import type { FeedPost } from "@/lib/persona-world/types"
import {
  getFollowingPosts,
  type FollowingPostsProvider,
} from "@/lib/persona-world/feed/following-posts"
import {
  distributeTiers,
  applyQualitativeBonus,
  getRecommendedPosts,
  type RecommendedCandidate,
  type RecommendedPostsProvider,
} from "@/lib/persona-world/feed/recommended-posts"
import {
  getTrendingPosts,
  type TrendingPostsProvider,
} from "@/lib/persona-world/feed/trending-posts"
import { interleaveFeed } from "@/lib/persona-world/feed/interleaver"
import { generateFeed, type FeedDataProvider } from "@/lib/persona-world/feed/feed-engine"

// ═══ getFollowingPosts ═══

describe("getFollowingPosts", () => {
  it("팔로잉 페르소나의 포스트 반환", async () => {
    const provider: FollowingPostsProvider = {
      getFollowingPersonaIds: vi.fn().mockResolvedValue(["p1", "p2"]),
      getRecentPostsByPersonas: vi.fn().mockResolvedValue(["post-1", "post-2", "post-3"]),
    }

    const result = await getFollowingPosts("user-1", 10, provider)
    expect(result).toHaveLength(3)
    expect(result[0].source).toBe("following")
    expect(result[0].postId).toBe("post-1")
  })

  it("팔로잉 없으면 빈 배열", async () => {
    const provider: FollowingPostsProvider = {
      getFollowingPersonaIds: vi.fn().mockResolvedValue([]),
      getRecentPostsByPersonas: vi.fn(),
    }

    const result = await getFollowingPosts("user-1", 10, provider)
    expect(result).toHaveLength(0)
    expect(provider.getRecentPostsByPersonas).not.toHaveBeenCalled()
  })

  it("cursor 전달", async () => {
    const provider: FollowingPostsProvider = {
      getFollowingPersonaIds: vi.fn().mockResolvedValue(["p1"]),
      getRecentPostsByPersonas: vi.fn().mockResolvedValue([]),
    }

    await getFollowingPosts("user-1", 10, provider, "cursor-123")
    expect(provider.getRecentPostsByPersonas).toHaveBeenCalledWith(["p1"], 10, "cursor-123")
  })
})

// ═══ applyQualitativeBonus ═══

describe("applyQualitativeBonus", () => {
  it("보정 적용: voice 0.05 + narrative 0.05", () => {
    const result = applyQualitativeBonus(0.7, 1.0, 1.0)
    expect(result).toBeCloseTo(0.7 + 0.05 + 0.05, 5)
  })

  it("기본값 0 → 보정 없음", () => {
    const result = applyQualitativeBonus(0.7)
    expect(result).toBeCloseTo(0.7, 5)
  })
})

// ═══ distributeTiers ═══

describe("distributeTiers", () => {
  const makeCandidates = (count: number): RecommendedCandidate[] =>
    Array.from({ length: count }, (_, i) => ({
      postId: `post-${i}`,
      personaId: `persona-${i}`,
      basicScore: 0.8 - i * 0.05,
      explorationScore: 0.6 + i * 0.03,
      advancedScore: 0.7 - i * 0.04,
    }))

  it("Tier 비율 배분: Basic 60% + Exploration 30% + Advanced 10%", () => {
    const candidates = makeCandidates(20)
    const result = distributeTiers(candidates, 10)

    expect(result.basic.length).toBe(6) // 60%
    expect(result.exploration.length).toBe(3) // 30%
    expect(result.advanced.length).toBe(1) // 10%
  })

  it("Basic → basicScore 순 정렬", () => {
    const candidates = makeCandidates(10)
    const result = distributeTiers(candidates, 5)

    for (let i = 1; i < result.basic.length; i++) {
      expect(result.basic[i - 1].matchingScore).toBeGreaterThanOrEqual(
        result.basic[i].matchingScore ?? 0
      )
    }
  })

  it("중복 방지: 같은 postId가 다른 Tier에 나오지 않음", () => {
    const candidates = makeCandidates(20)
    const result = distributeTiers(candidates, 10)

    const allIds = [
      ...result.basic.map((p) => p.postId),
      ...result.exploration.map((p) => p.postId),
      ...result.advanced.map((p) => p.postId),
    ]
    const uniqueIds = new Set(allIds)
    expect(uniqueIds.size).toBe(allIds.length)
  })

  it("source 라벨 정확", () => {
    const candidates = makeCandidates(10)
    const result = distributeTiers(candidates, 5)

    expect(result.basic.every((p) => p.source === "basic")).toBe(true)
    expect(result.exploration.every((p) => p.source === "exploration")).toBe(true)
    expect(result.advanced.every((p) => p.source === "advanced")).toBe(true)
  })
})

it("T385: basicScore 높은 후보가 Basic에, explorationScore 높은 후보가 Exploration에 선택됨", () => {
  // 후보 A: basicScore 압도적으로 높음 → Basic 선택
  // 후보 B: explorationScore 압도적으로 높음 → Exploration 선택
  const candidates: RecommendedCandidate[] = [
    {
      postId: "basic-winner",
      personaId: "p1",
      basicScore: 0.95,
      explorationScore: 0.2,
      advancedScore: 0.5,
    },
    {
      postId: "basic-2",
      personaId: "p2",
      basicScore: 0.9,
      explorationScore: 0.2,
      advancedScore: 0.5,
    },
    {
      postId: "basic-3",
      personaId: "p3",
      basicScore: 0.88,
      explorationScore: 0.2,
      advancedScore: 0.5,
    },
    {
      postId: "basic-4",
      personaId: "p4",
      basicScore: 0.85,
      explorationScore: 0.2,
      advancedScore: 0.5,
    },
    {
      postId: "basic-5",
      personaId: "p5",
      basicScore: 0.83,
      explorationScore: 0.2,
      advancedScore: 0.5,
    },
    {
      postId: "basic-6",
      personaId: "p6",
      basicScore: 0.81,
      explorationScore: 0.2,
      advancedScore: 0.5,
    },
    {
      postId: "exploration-winner",
      personaId: "p7",
      basicScore: 0.1,
      explorationScore: 0.99,
      advancedScore: 0.1,
    },
    {
      postId: "exploration-2",
      personaId: "p8",
      basicScore: 0.1,
      explorationScore: 0.95,
      advancedScore: 0.1,
    },
    {
      postId: "exploration-3",
      personaId: "p9",
      basicScore: 0.1,
      explorationScore: 0.91,
      advancedScore: 0.1,
    },
    {
      postId: "advanced-winner",
      personaId: "p10",
      basicScore: 0.3,
      explorationScore: 0.3,
      advancedScore: 0.97,
    },
  ]
  const result = distributeTiers(candidates, 10)

  // Basic: basicScore 상위 6개 선택됨
  expect(result.basic.map((p) => p.postId)).toContain("basic-winner")
  expect(result.basic[0].postId).toBe("basic-winner")

  // Exploration: explorationScore 상위 3개 선택됨 (Basic과 중복 제거 후)
  expect(result.exploration.map((p) => p.postId)).toContain("exploration-winner")
  expect(result.exploration[0].postId).toBe("exploration-winner")

  // Advanced: advancedScore 최상위
  expect(result.advanced.map((p) => p.postId)).toContain("advanced-winner")

  // Tier 간 중복 없음
  const allIds = [
    ...result.basic.map((p) => p.postId),
    ...result.exploration.map((p) => p.postId),
    ...result.advanced.map((p) => p.postId),
  ]
  expect(new Set(allIds).size).toBe(allIds.length)
})

// ═══ getRecommendedPosts ═══

describe("getRecommendedPosts", () => {
  it("프로바이더에서 후보 조회 후 Tier 분배", async () => {
    const candidates: RecommendedCandidate[] = Array.from({ length: 10 }, (_, i) => ({
      postId: `post-${i}`,
      personaId: `persona-${i}`,
      basicScore: 0.8,
      explorationScore: 0.6,
      advancedScore: 0.7,
    }))

    const provider: RecommendedPostsProvider = {
      getCandidates: vi.fn().mockResolvedValue(candidates),
    }

    const result = await getRecommendedPosts("user-1", 10, provider)
    expect(result.basic.length).toBeGreaterThan(0)
    expect(provider.getCandidates).toHaveBeenCalledWith("user-1", 30, [])
  })

  it("후보 0개 → 빈 결과", async () => {
    const provider: RecommendedPostsProvider = {
      getCandidates: vi.fn().mockResolvedValue([]),
    }

    const result = await getRecommendedPosts("user-1", 10, provider)
    expect(result.basic).toHaveLength(0)
    expect(result.exploration).toHaveLength(0)
    expect(result.advanced).toHaveLength(0)
  })
})

// ═══ getTrendingPosts ═══

describe("getTrendingPosts", () => {
  it("프로바이더에서 인기 포스트 조회", async () => {
    const provider: TrendingPostsProvider = {
      getTrendingPostIds: vi.fn().mockResolvedValue(["t1", "t2"]),
    }

    const result = await getTrendingPosts(5, provider)
    expect(result).toHaveLength(2)
    expect(result[0].source).toBe("trending")
  })

  it("timeWindow 기본값 48시간", async () => {
    const provider: TrendingPostsProvider = {
      getTrendingPostIds: vi.fn().mockResolvedValue([]),
    }

    await getTrendingPosts(5, provider)
    expect(provider.getTrendingPostIds).toHaveBeenCalledWith(5, 48, [])
  })
})

// ═══ interleaveFeed ═══

describe("interleaveFeed", () => {
  const makePost = (source: FeedPost["source"], id: string): FeedPost => ({
    postId: id,
    source,
  })

  it("Following 2개 + non-following 1개 패턴", () => {
    const following = [
      makePost("following", "f1"),
      makePost("following", "f2"),
      makePost("following", "f3"),
      makePost("following", "f4"),
    ]
    const basic = [makePost("basic", "b1")]
    const exploration = [makePost("exploration", "e1")]

    const result = interleaveFeed(following, basic, exploration, [], [])
    // f1, f2, b1, f3, f4, e1 (또는 유사 패턴)
    expect(result.length).toBe(6)
    expect(result[0].source).toBe("following")
  })

  it("Following 없으면 non-following만", () => {
    const basic = [makePost("basic", "b1"), makePost("basic", "b2")]
    const trending = [makePost("trending", "t1")]

    const result = interleaveFeed([], basic, [], [], trending)
    expect(result.length).toBe(3)
  })

  it("non-following 없으면 Following만", () => {
    const following = [makePost("following", "f1"), makePost("following", "f2")]

    const result = interleaveFeed(following, [], [], [], [])
    expect(result).toHaveLength(2)
  })

  it("모두 비어있으면 빈 배열", () => {
    const result = interleaveFeed([], [], [], [], [])
    expect(result).toHaveLength(0)
  })

  it("다양한 source가 섞여 있음", () => {
    const following = Array.from({ length: 6 }, (_, i) => makePost("following", `f${i}`))
    const basic = [makePost("basic", "b1"), makePost("basic", "b2")]
    const exploration = [makePost("exploration", "e1")]
    const trending = [makePost("trending", "t1")]

    const result = interleaveFeed(following, basic, exploration, [], trending)
    const sources = new Set(result.map((p) => p.source))
    expect(sources.size).toBeGreaterThan(1)
  })
})

// ═══ generateFeed ═══

describe("generateFeed", () => {
  const makeFeedProvider = (): FeedDataProvider => ({
    getFollowingPersonaIds: vi.fn().mockResolvedValue(["p1", "p2"]),
    getRecentPostsByPersonas: vi
      .fn()
      .mockResolvedValue(Array.from({ length: 10 }, (_, i) => `fp-${i}`)),
    getCandidates: vi.fn().mockResolvedValue(
      Array.from({ length: 15 }, (_, i) => ({
        postId: `rp-${i}`,
        personaId: `persona-${i}`,
        basicScore: 0.8 - i * 0.02,
        explorationScore: 0.6 + i * 0.01,
        advancedScore: 0.7 - i * 0.03,
      }))
    ),
    getTrendingPostIds: vi.fn().mockResolvedValue(Array.from({ length: 5 }, (_, i) => `tp-${i}`)),
  })

  it("FeedResponse 구조 반환", async () => {
    const provider = makeFeedProvider()

    const result = await generateFeed({ userId: "user-1", limit: 20 }, provider)

    expect(result.posts).toBeDefined()
    expect(result.meta.tierDistribution).toBeDefined()
    expect(typeof result.meta.tierDistribution.following).toBe("number")
    expect(typeof result.meta.tierDistribution.basic).toBe("number")
  })

  it("tierDistribution 합 = 총 포스트 수", async () => {
    const provider = makeFeedProvider()

    const result = await generateFeed({ userId: "user-1", limit: 20 }, provider)

    const { following, basic, exploration, advanced, trending } = result.meta.tierDistribution
    const tierSum = following + basic + exploration + advanced + trending
    expect(result.posts.length).toBe(tierSum)
  })

  it("기본 limit = 60", async () => {
    const provider = makeFeedProvider()

    await generateFeed({ userId: "user-1", limit: 60 }, provider)

    // getRecentPostsByPersonas는 limit * 0.6 = 36으로 호출
    expect(provider.getRecentPostsByPersonas).toHaveBeenCalledWith(["p1", "p2"], 36, undefined)
  })
})
