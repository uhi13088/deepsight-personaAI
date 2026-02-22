import { describe, it, expect, vi } from "vitest"
import type { RelationshipScore, PersonaStateData } from "@/lib/persona-world/types"
import {
  computeLikeProbability,
  shouldLike,
  type LikeDataProvider,
} from "@/lib/persona-world/interactions/like-engine"
import {
  computeFollowScore,
  computeFollowProbability,
  shouldAnnounce,
  shouldFollow,
  type FollowDataProvider,
} from "@/lib/persona-world/interactions/follow-engine"
import {
  computeRelationshipUpdate,
  getRelationship,
  updateRelationship,
  recalculateRelationship,
  DEFAULT_RELATIONSHIP,
  type InteractionEvent,
  type RelationshipDataProvider,
} from "@/lib/persona-world/interactions/relationship-manager"

// ── 헬퍼 ──

const makeState = (overrides?: Partial<PersonaStateData>): PersonaStateData => ({
  mood: 0.5,
  energy: 0.8,
  socialBattery: 0.7,
  paradoxTension: 0.2,
  ...overrides,
})

const makeRelationship = (overrides?: Partial<RelationshipScore>): RelationshipScore => ({
  warmth: 0.5,
  tension: 0.0,
  frequency: 0.0,
  depth: 0.0,
  lastInteractionAt: null,
  ...overrides,
})

// ═══ computeLikeProbability ═══

describe("computeLikeProbability", () => {
  it("기본 확률 = likeScore × interactivity × socialBattery", () => {
    const { probability } = computeLikeProbability(0.8, 0.7, 0.9, false, null)
    expect(probability).toBeCloseTo(0.8 * 0.7 * 0.9, 5)
  })

  it("팔로잉 보너스 ×1.5", () => {
    const base = computeLikeProbability(0.5, 0.5, 0.8, false, null)
    const withFollow = computeLikeProbability(0.5, 0.5, 0.8, true, null)
    expect(withFollow.probability).toBeCloseTo(base.probability * 1.5, 5)
    expect(withFollow.modifiers.following).toBe(true)
  })

  it("긍정 이력 보너스 ×1.3 (warmth > 0.6)", () => {
    const rel = makeRelationship({ warmth: 0.7 })
    const base = computeLikeProbability(0.5, 0.5, 0.8, false, null)
    const withPositive = computeLikeProbability(0.5, 0.5, 0.8, false, rel)
    expect(withPositive.probability).toBeCloseTo(base.probability * 1.3, 5)
    expect(withPositive.modifiers.positiveHistory).toBe(true)
  })

  it("부정 이력 페널티 ×0.5 (tension > 0.5)", () => {
    const rel = makeRelationship({ tension: 0.6, warmth: 0.7 })
    const base = computeLikeProbability(0.5, 0.5, 0.8, false, null)
    const withNeg = computeLikeProbability(0.5, 0.5, 0.8, false, rel)
    // 부정 이력이 긍정보다 우선 적용
    expect(withNeg.probability).toBeCloseTo(base.probability * 0.5, 5)
    expect(withNeg.modifiers.negativeHistory).toBe(true)
  })

  it("확률 0~1 범위 클램프", () => {
    const { probability } = computeLikeProbability(1.0, 1.0, 1.0, true, null)
    expect(probability).toBeLessThanOrEqual(1)
    expect(probability).toBeGreaterThanOrEqual(0)
  })

  it("0 점수면 확률 0", () => {
    const { probability } = computeLikeProbability(0, 0.5, 0.8, false, null)
    expect(probability).toBe(0)
  })
})

// ═══ shouldLike ═══

describe("shouldLike", () => {
  const makeLikeProvider = (overrides?: {
    matchScore?: number
    following?: boolean
    relationship?: RelationshipScore | null
    state?: PersonaStateData
  }): LikeDataProvider => ({
    getBasicMatchScore: vi.fn().mockResolvedValue(overrides?.matchScore ?? 0.7),
    isFollowing: vi.fn().mockResolvedValue(overrides?.following ?? false),
    getRelationship: vi.fn().mockResolvedValue(overrides?.relationship ?? null),
    getPersonaState: vi.fn().mockResolvedValue(overrides?.state ?? makeState()),
  })

  it("높은 매칭 + 높은 interactivity → like=true", async () => {
    const provider = makeLikeProvider({ matchScore: 0.9 })
    const result = await shouldLike("p1", "p2", 0.9, provider, 0.1)
    expect(result.like).toBe(true)
    expect(result.matchingScore).toBe(0.9)
  })

  it("낮은 random → like=true", async () => {
    const provider = makeLikeProvider({ matchScore: 0.5 })
    const result = await shouldLike("p1", "p2", 0.5, provider, 0.01)
    expect(result.like).toBe(true)
  })

  it("높은 random → like=false", async () => {
    const provider = makeLikeProvider({ matchScore: 0.5 })
    const result = await shouldLike("p1", "p2", 0.5, provider, 0.99)
    expect(result.like).toBe(false)
  })

  it("프로바이더 함수 호출 확인", async () => {
    const provider = makeLikeProvider()
    await shouldLike("p1", "p2", 0.5, provider, 0.5)
    expect(provider.getBasicMatchScore).toHaveBeenCalledWith("p1", "p2")
    expect(provider.isFollowing).toHaveBeenCalledWith("p1", "p2")
    expect(provider.getRelationship).toHaveBeenCalledWith("p1", "p2")
    expect(provider.getPersonaState).toHaveBeenCalledWith("p1")
  })
})

// ═══ computeFollowScore ═══

describe("computeFollowScore", () => {
  it("가중 합 = 0.5×basic + 0.3×crossAxis + 0.2×paradox", () => {
    const score = computeFollowScore(0.8, 0.6, 0.7)
    expect(score).toBeCloseTo(0.5 * 0.8 + 0.3 * 0.6 + 0.2 * 0.7, 5)
  })

  it("모두 1.0이면 1.0", () => {
    expect(computeFollowScore(1, 1, 1)).toBeCloseTo(1.0, 5)
  })

  it("모두 0이면 0", () => {
    expect(computeFollowScore(0, 0, 0)).toBe(0)
  })
})

// ═══ computeFollowProbability ═══

describe("computeFollowProbability", () => {
  it("score > 0.6이면 확률 계산", () => {
    const prob = computeFollowProbability(0.8, 0.7)
    expect(prob).toBeCloseTo(0.8 * 0.7 * 0.5, 5)
  })

  it("score <= 0.6이면 확률 0", () => {
    expect(computeFollowProbability(0.5, 0.9)).toBe(0)
    expect(computeFollowProbability(0.6, 0.9)).toBe(0)
  })

  it("확률 최대 1.0", () => {
    const prob = computeFollowProbability(1.0, 1.0)
    expect(prob).toBeLessThanOrEqual(1)
  })
})

// ═══ shouldAnnounce ═══

describe("shouldAnnounce", () => {
  it("sociability > 0.6 AND mood > 0.5 → true", () => {
    expect(shouldAnnounce(0.7, 0.6)).toBe(true)
  })

  it("sociability <= 0.6 → false", () => {
    expect(shouldAnnounce(0.5, 0.8)).toBe(false)
  })

  it("mood <= 0.5 → false", () => {
    expect(shouldAnnounce(0.8, 0.4)).toBe(false)
  })
})

// ═══ shouldFollow ═══

describe("shouldFollow", () => {
  const makeFollowProvider = (overrides?: {
    basicMatch?: number
    crossAxis?: number
    paradoxCompat?: number
    following?: boolean
    state?: PersonaStateData
  }): FollowDataProvider => ({
    getBasicMatchScore: vi.fn().mockResolvedValue(overrides?.basicMatch ?? 0.7),
    getCrossAxisSimilarity: vi.fn().mockResolvedValue(overrides?.crossAxis ?? 0.6),
    getParadoxCompatibility: vi.fn().mockResolvedValue(overrides?.paradoxCompat ?? 0.8),
    isFollowing: vi.fn().mockResolvedValue(overrides?.following ?? false),
    getPersonaState: vi.fn().mockResolvedValue(overrides?.state ?? makeState()),
  })

  it("높은 점수 + 낮은 random → follow=true", async () => {
    const provider = makeFollowProvider({ basicMatch: 0.9, crossAxis: 0.8, paradoxCompat: 0.9 })
    const result = await shouldFollow("p1", "p2", 0.8, provider, 0.01)
    expect(result.follow).toBe(true)
    expect(result.score).toBeGreaterThan(0.6)
  })

  it("이미 팔로우 중이면 follow=false", async () => {
    const provider = makeFollowProvider({ following: true })
    const result = await shouldFollow("p1", "p2", 0.9, provider)
    expect(result.follow).toBe(false)
    expect(result.score).toBe(0)
  })

  it("score <= 0.6이면 follow=false", async () => {
    const provider = makeFollowProvider({ basicMatch: 0.3, crossAxis: 0.2, paradoxCompat: 0.1 })
    const result = await shouldFollow("p1", "p2", 0.8, provider, 0.01)
    expect(result.follow).toBe(false)
    expect(result.probability).toBe(0)
  })

  it("breakdown 반환", async () => {
    const provider = makeFollowProvider({ basicMatch: 0.8, crossAxis: 0.7, paradoxCompat: 0.6 })
    const result = await shouldFollow("p1", "p2", 0.8, provider, 0.01)
    expect(result.breakdown.basicMatch).toBe(0.8)
    expect(result.breakdown.crossAxis).toBe(0.7)
    expect(result.breakdown.paradoxCompat).toBe(0.6)
  })

  it("announcement 조건 충족", async () => {
    const provider = makeFollowProvider({
      basicMatch: 0.9,
      crossAxis: 0.8,
      paradoxCompat: 0.9,
      state: makeState({ mood: 0.8 }),
    })
    const result = await shouldFollow("p1", "p2", 0.8, provider, 0.01)
    expect(result.follow).toBe(true)
    expect(result.announcement).toBe(true)
  })
})

// ═══ computeRelationshipUpdate ═══

describe("computeRelationshipUpdate", () => {
  it("like → warmth 증가, frequency 증가", () => {
    const current = makeRelationship()
    const updated = computeRelationshipUpdate(current, { type: "like" })
    expect(updated.warmth).toBeGreaterThan(current.warmth)
    expect(updated.frequency).toBeGreaterThan(current.frequency)
  })

  it("positive comment → warmth 증가, tension 감소", () => {
    const current = makeRelationship({ tension: 0.3 })
    const updated = computeRelationshipUpdate(current, {
      type: "comment",
      sentiment: "positive",
    })
    expect(updated.warmth).toBeGreaterThan(current.warmth)
    expect(updated.tension).toBeLessThan(current.tension)
  })

  it("negative comment → tension 증가, warmth 감소", () => {
    const current = makeRelationship({ warmth: 0.5 })
    const updated = computeRelationshipUpdate(current, {
      type: "comment",
      sentiment: "negative",
    })
    expect(updated.tension).toBeGreaterThan(current.tension)
    expect(updated.warmth).toBeLessThan(current.warmth)
  })

  it("comment with chainLength → depth 업데이트", () => {
    const current = makeRelationship({ depth: 0.0 })
    const updated = computeRelationshipUpdate(current, {
      type: "comment",
      chainLength: 5,
    })
    expect(updated.depth).toBeGreaterThan(0)
  })

  it("follow → warmth 크게 증가", () => {
    const current = makeRelationship()
    const updated = computeRelationshipUpdate(current, { type: "follow" })
    expect(updated.warmth - current.warmth).toBeCloseTo(0.1, 2)
  })

  it("0~1 범위 유지", () => {
    const extreme = makeRelationship({ warmth: 0.99, tension: 0.99, frequency: 0.99, depth: 0.99 })
    const updated = computeRelationshipUpdate(extreme, {
      type: "follow",
    })
    expect(updated.warmth).toBeLessThanOrEqual(1)
    expect(updated.tension).toBeLessThanOrEqual(1)
    expect(updated.frequency).toBeLessThanOrEqual(1)
    expect(updated.depth).toBeLessThanOrEqual(1)
  })

  it("lastInteractionAt 업데이트", () => {
    const current = makeRelationship()
    const updated = computeRelationshipUpdate(current, { type: "like" })
    expect(updated.lastInteractionAt).toBeInstanceOf(Date)
  })
})

// ═══ getRelationship ═══

describe("getRelationship", () => {
  const makeRelProvider = (data: RelationshipScore | null = null): RelationshipDataProvider => ({
    findRelationship: vi.fn().mockResolvedValue(data),
    upsertRelationship: vi.fn().mockResolvedValue(undefined),
    getInteractionStats: vi.fn().mockResolvedValue({
      totalComments: 0,
      positiveComments: 0,
      negativeComments: 0,
      totalInteractions: 0,
      avgChainLength: 0,
    }),
  })

  it("관계 존재하면 반환", async () => {
    const rel = makeRelationship({ warmth: 0.8 })
    const provider = makeRelProvider(rel)
    const result = await getRelationship("p1", "p2", provider)
    expect(result.warmth).toBe(0.8)
  })

  it("관계 없으면 기본값 반환", async () => {
    const provider = makeRelProvider(null)
    const result = await getRelationship("p1", "p2", provider)
    expect(result.warmth).toBe(DEFAULT_RELATIONSHIP.warmth)
    expect(result.tension).toBe(DEFAULT_RELATIONSHIP.tension)
  })

  it("양방향 조회 (A→B, B→A)", async () => {
    const provider = makeRelProvider(null)
    await getRelationship("p1", "p2", provider)
    expect(provider.findRelationship).toHaveBeenCalledTimes(2)
    expect(provider.findRelationship).toHaveBeenCalledWith("p1", "p2")
    expect(provider.findRelationship).toHaveBeenCalledWith("p2", "p1")
  })
})

// ═══ updateRelationship ═══

describe("updateRelationship", () => {
  it("현재 관계 조회 → 업데이트 → upsert 호출", async () => {
    const rel = makeRelationship()
    const provider: RelationshipDataProvider = {
      findRelationship: vi.fn().mockResolvedValue(rel),
      upsertRelationship: vi.fn().mockResolvedValue(undefined),
      getInteractionStats: vi.fn(),
    }

    const result = await updateRelationship("p1", "p2", { type: "like" }, provider)
    expect(result.warmth).toBeGreaterThan(rel.warmth)
    expect(provider.upsertRelationship).toHaveBeenCalledWith("p1", "p2", result)
  })
})

// ═══ recalculateRelationship ═══

describe("recalculateRelationship", () => {
  it("통계 기반 재계산", async () => {
    const rel = makeRelationship()
    const provider: RelationshipDataProvider = {
      findRelationship: vi.fn().mockResolvedValue(rel),
      upsertRelationship: vi.fn().mockResolvedValue(undefined),
      getInteractionStats: vi.fn().mockResolvedValue({
        totalComments: 10,
        positiveComments: 8,
        negativeComments: 1,
        totalInteractions: 15,
        avgChainLength: 3,
      }),
    }

    const result = await recalculateRelationship("p1", "p2", provider)
    // warmth = 8/10 = 0.8
    expect(result.warmth).toBeCloseTo(0.8, 2)
    // tension = 1/10 = 0.1
    expect(result.tension).toBeCloseTo(0.1, 2)
    // frequency = 15/5 = 3.0 → clamped to 1.0
    expect(result.frequency).toBe(1.0)
    // depth = 3/10 = 0.3
    expect(result.depth).toBeCloseTo(0.3, 2)
  })

  it("인터랙션 없고 lastInteractionAt null → warmth 유지 (기준점 없음)", async () => {
    const rel = makeRelationship({ warmth: 0.8, tension: 0.5 })
    const provider: RelationshipDataProvider = {
      findRelationship: vi.fn().mockResolvedValue(rel),
      upsertRelationship: vi.fn().mockResolvedValue(undefined),
      getInteractionStats: vi.fn().mockResolvedValue({
        totalComments: 0,
        positiveComments: 0,
        negativeComments: 0,
        totalInteractions: 0,
        avgChainLength: 0,
      }),
    }

    const result = await recalculateRelationship("p1", "p2", provider)
    // lastInteractionAt null → applyWarmthDecay가 원본 반환
    expect(result.warmth).toBe(0.8)
    // tension 감쇠: 0.5 × 0.9 = 0.45
    expect(result.tension).toBeCloseTo(0.45, 2)
  })

  it("인터랙션 없고 lastInteractionAt 설정 → 시간 기반 warmth 감쇠", async () => {
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
    const rel = makeRelationship({ warmth: 0.8, tension: 0.5, lastInteractionAt: tenDaysAgo })
    const provider: RelationshipDataProvider = {
      findRelationship: vi.fn().mockResolvedValue(rel),
      upsertRelationship: vi.fn().mockResolvedValue(undefined),
      getInteractionStats: vi.fn().mockResolvedValue({
        totalComments: 0,
        positiveComments: 0,
        negativeComments: 0,
        totalInteractions: 0,
        avgChainLength: 0,
      }),
    }

    const result = await recalculateRelationship("p1", "p2", provider)
    // warmth = 0.8 × e^(-0.02 × 10) ≈ 0.8 × 0.818 ≈ 0.655
    expect(result.warmth).toBeLessThan(0.8)
    expect(result.warmth).toBeGreaterThan(0.5)
    // tension 감쇠: 0.5 × 0.9 = 0.45
    expect(result.tension).toBeCloseTo(0.45, 2)
  })
})
