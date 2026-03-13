import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  computeIntimacyDelta,
  scoreToLevel,
  applyDailyCap,
  updateIntimacyAfterChat,
  INTIMACY_LEVELS,
  computePersonaStateMoodMultiplier,
} from "@/lib/persona-world/intimacy-engine"
import type { IntimacyDataProvider } from "@/lib/persona-world/intimacy-engine"
import { buildConversationSystemSuffix } from "@/lib/persona-world/conversation-engine"

// ═══════════════════════════════════════════════════════════════
// Intimacy Engine 단위 테스트 (T432)
// ═══════════════════════════════════════════════════════════════

// ── Mock Provider ────────────────────────────────────────────

function createMockProvider(overrides?: Partial<IntimacyDataProvider>): IntimacyDataProvider {
  return {
    getThreadIntimacy: vi.fn().mockResolvedValue({
      intimacyScore: 0,
      intimacyLevel: 1,
      lastIntimacyAt: null,
      sharedMilestones: null,
      personaId: "persona-1",
      userId: "user-1",
    }),
    updateThreadIntimacy: vi.fn().mockResolvedValue(undefined),
    getFactbook: vi.fn().mockResolvedValue(null),
    saveFactbook: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// ── computeIntimacyDelta ────────────────────────────────────

describe("computeIntimacyDelta", () => {
  it("poignancy 없이 기본 증분 0.003을 반환한다", () => {
    const delta = computeIntimacyDelta()
    expect(delta).toBeCloseTo(0.003)
  })

  it("poignancy 없이(0) 기본 증분만 반환한다", () => {
    const delta = computeIntimacyDelta(0)
    expect(delta).toBeCloseTo(0.003)
  })

  it("poignancy 0.5이면 0.003 + 0.005*0.5 = 0.0055를 반환한다", () => {
    const delta = computeIntimacyDelta(0.5)
    expect(delta).toBeCloseTo(0.0055)
  })

  it("poignancy 1.0이면 0.003 + 0.005 = 0.008을 반환한다", () => {
    const delta = computeIntimacyDelta(1.0)
    expect(delta).toBeCloseTo(0.008)
  })
})

// ── scoreToLevel ────────────────────────────────────────────

describe("scoreToLevel", () => {
  it("0점은 Lv1 (STRANGER)", () => {
    expect(scoreToLevel(0)).toBe(1)
  })

  it("0.19는 Lv1 (STRANGER)", () => {
    expect(scoreToLevel(0.19)).toBe(1)
  })

  it("0.2는 Lv2 (ACQUAINTANCE)", () => {
    expect(scoreToLevel(0.2)).toBe(2)
  })

  it("0.39는 Lv2 (ACQUAINTANCE)", () => {
    expect(scoreToLevel(0.39)).toBe(2)
  })

  it("0.4는 Lv3 (FAMILIAR)", () => {
    expect(scoreToLevel(0.4)).toBe(3)
  })

  it("0.6는 Lv4 (FRIENDLY)", () => {
    expect(scoreToLevel(0.6)).toBe(4)
  })

  it("0.8는 Lv5 (CLOSE)", () => {
    expect(scoreToLevel(0.8)).toBe(5)
  })

  it("1.0은 Lv5 (CLOSE)", () => {
    expect(scoreToLevel(1.0)).toBe(5)
  })
})

// ── applyDailyCap ───────────────────────────────────────────

describe("applyDailyCap", () => {
  it("누적 0일 때 delta를 그대로 반환한다", () => {
    expect(applyDailyCap(0.008, 0)).toBeCloseTo(0.008)
  })

  it("누적이 0.015면 남은 0.005만 반환한다", () => {
    expect(applyDailyCap(0.008, 0.015)).toBeCloseTo(0.005)
  })

  it("누적이 0.02(상한) 이상이면 0을 반환한다", () => {
    expect(applyDailyCap(0.008, 0.02)).toBe(0)
  })

  it("누적이 상한 초과해도 0을 반환한다", () => {
    expect(applyDailyCap(0.008, 0.03)).toBe(0)
  })
})

// ── INTIMACY_LEVELS ─────────────────────────────────────────

describe("INTIMACY_LEVELS", () => {
  it("5개 레벨이 정의되어 있다", () => {
    expect(INTIMACY_LEVELS).toHaveLength(5)
  })

  it("레벨 범위가 연속적이다 (gap 없음)", () => {
    for (let i = 1; i < INTIMACY_LEVELS.length; i++) {
      expect(INTIMACY_LEVELS[i].min).toBe(INTIMACY_LEVELS[i - 1].max)
    }
  })
})

// ── updateIntimacyAfterChat ─────────────────────────────────

describe("updateIntimacyAfterChat", () => {
  let provider: IntimacyDataProvider

  beforeEach(() => {
    provider = createMockProvider()
  })

  it("대화 후 친밀도가 증가한다", async () => {
    const result = await updateIntimacyAfterChat(provider, "thread-1", 0.3)

    expect(result.newScore).toBeGreaterThan(0)
    expect(result.newLevel).toBe(1)
    expect(result.levelUp).toBe(false)
    expect(provider.updateThreadIntimacy).toHaveBeenCalledWith("thread-1", {
      intimacyScore: expect.any(Number),
      intimacyLevel: 1,
      lastIntimacyAt: expect.any(Date),
    })
  })

  it("대화방이 없으면 THREAD_NOT_FOUND 에러를 던진다", async () => {
    provider = createMockProvider({
      getThreadIntimacy: vi.fn().mockResolvedValue(null),
    })

    await expect(updateIntimacyAfterChat(provider, "thread-999")).rejects.toThrow(
      "THREAD_NOT_FOUND"
    )
  })

  it("점수가 0.199 → 0.2를 넘으면 레벨업한다 (Lv1→Lv2)", async () => {
    provider = createMockProvider({
      getThreadIntimacy: vi.fn().mockResolvedValue({
        intimacyScore: 0.199,
        intimacyLevel: 1,
        lastIntimacyAt: null,
        sharedMilestones: null,
        personaId: "persona-1",
        userId: "user-1",
      }),
      getFactbook: vi.fn().mockResolvedValue({
        immutableFacts: [] as never[],
        mutableContext: [] as never[],
        integrityHash: "hash",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    })

    const result = await updateIntimacyAfterChat(provider, "thread-1", 0.5)

    expect(result.newScore).toBeGreaterThanOrEqual(0.2)
    expect(result.newLevel).toBe(2)
    expect(result.previousLevel).toBe(1)
    expect(result.levelUp).toBe(true)
  })

  it("레벨 업 시 Factbook에 기록한다", async () => {
    const mockFactbook = {
      immutableFacts: [],
      mutableContext: [],
      integrityHash: "hash",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    provider = createMockProvider({
      getThreadIntimacy: vi.fn().mockResolvedValue({
        intimacyScore: 0.199,
        intimacyLevel: 1,
        lastIntimacyAt: null,
        sharedMilestones: null,
        personaId: "persona-1",
        userId: "user-1",
      }),
      getFactbook: vi.fn().mockResolvedValue(mockFactbook),
    })

    await updateIntimacyAfterChat(provider, "thread-1", 0.5)

    expect(provider.saveFactbook).toHaveBeenCalledWith(
      "persona-1",
      expect.objectContaining({
        mutableContext: expect.arrayContaining([
          expect.objectContaining({
            id: "intimacy-user-1-lv2",
            category: "recentExperience",
            content: expect.stringContaining("아는 사이"),
          }),
        ]),
      })
    )
  })

  it("점수가 1.0을 초과하지 않는다", async () => {
    provider = createMockProvider({
      getThreadIntimacy: vi.fn().mockResolvedValue({
        intimacyScore: 0.999,
        intimacyLevel: 5,
        lastIntimacyAt: null,
        sharedMilestones: null,
        personaId: "persona-1",
        userId: "user-1",
      }),
    })

    const result = await updateIntimacyAfterChat(provider, "thread-1", 1.0)

    expect(result.newScore).toBeLessThanOrEqual(1.0)
  })
})

// ── T447: computePersonaStateMoodMultiplier 테스트 ─────────

describe("computePersonaStateMoodMultiplier (T447)", () => {
  it("modifiers 없으면 1.0 반환", () => {
    expect(computePersonaStateMoodMultiplier()).toBe(1.0)
    expect(computePersonaStateMoodMultiplier(undefined)).toBe(1.0)
  })

  it("mood > 0.7 → ×1.2", () => {
    expect(computePersonaStateMoodMultiplier({ personaMood: 0.8 })).toBeCloseTo(1.2)
  })

  it("mood < 0.3 → ×0.7", () => {
    expect(computePersonaStateMoodMultiplier({ personaMood: 0.2 })).toBeCloseTo(0.7)
  })

  it("mood 0.3~0.7 → ×1.0 (변화 없음)", () => {
    expect(computePersonaStateMoodMultiplier({ personaMood: 0.5 })).toBe(1.0)
  })

  it("paradoxTension > 0.6 → ×0.5", () => {
    expect(computePersonaStateMoodMultiplier({ paradoxTension: 0.7 })).toBeCloseTo(0.5)
  })

  it("paradoxTension ≤ 0.6 → ×1.0", () => {
    expect(computePersonaStateMoodMultiplier({ paradoxTension: 0.5 })).toBe(1.0)
  })

  it("mood 높고 + paradoxTension 높으면 → 1.2 × 0.5 = 0.6", () => {
    expect(
      computePersonaStateMoodMultiplier({ personaMood: 0.8, paradoxTension: 0.7 })
    ).toBeCloseTo(0.6)
  })

  it("mood 낮고 + paradoxTension 높으면 → 0.7 × 0.5 = 0.35", () => {
    expect(
      computePersonaStateMoodMultiplier({ personaMood: 0.2, paradoxTension: 0.7 })
    ).toBeCloseTo(0.35)
  })
})

// ── T447: updateIntimacyAfterChat with stateModifiers ─────

describe("updateIntimacyAfterChat — stateModifiers (T447)", () => {
  it("mood 높을 때 친밀도 성장 20% 빨라진다", async () => {
    const baseProvider = createMockProvider()
    const highMoodProvider = createMockProvider()

    const baseResult = await updateIntimacyAfterChat(baseProvider, "thread-1", 0.5)
    const highMoodResult = await updateIntimacyAfterChat(highMoodProvider, "thread-1", 0.5, {
      personaMood: 0.8,
    })

    expect(highMoodResult.newScore).toBeCloseTo(baseResult.newScore * 1.2, 4)
  })

  it("mood 낮을 때 친밀도 성장 30% 둔화된다", async () => {
    const baseProvider = createMockProvider()
    const lowMoodProvider = createMockProvider()

    const baseResult = await updateIntimacyAfterChat(baseProvider, "thread-1", 0.5)
    const lowMoodResult = await updateIntimacyAfterChat(lowMoodProvider, "thread-1", 0.5, {
      personaMood: 0.2,
    })

    expect(lowMoodResult.newScore).toBeCloseTo(baseResult.newScore * 0.7, 4)
  })

  it("paradoxTension 높을 때 친밀도 성장 50% 둔화된다", async () => {
    const baseProvider = createMockProvider()
    const tensionProvider = createMockProvider()

    const baseResult = await updateIntimacyAfterChat(baseProvider, "thread-1", 0.5)
    const tensionResult = await updateIntimacyAfterChat(tensionProvider, "thread-1", 0.5, {
      paradoxTension: 0.7,
    })

    expect(tensionResult.newScore).toBeCloseTo(baseResult.newScore * 0.5, 4)
  })

  it("stateModifiers 미전달 시 기존 동작 유지", async () => {
    const provider1 = createMockProvider()
    const provider2 = createMockProvider()

    const withoutModifiers = await updateIntimacyAfterChat(provider1, "thread-1", 0.5)
    const withUndefined = await updateIntimacyAfterChat(provider2, "thread-1", 0.5, undefined)

    expect(withoutModifiers.newScore).toBe(withUndefined.newScore)
  })
})

// ── 레벨별 프롬프트 지침 통합 테스트 ────────────────────────

describe("buildConversationSystemSuffix — 친밀도 지침 (T431)", () => {
  const mockState = {
    mood: 0.6,
    energy: 0.7,
    socialBattery: 0.5,
    paradoxTension: 0.1,
  }

  it("Lv1: 처음 만남 지침이 포함된다", () => {
    const suffix = buildConversationSystemSuffix(mockState, "", "chat", "ko", undefined, 1)
    expect(suffix).toContain("처음 만남")
    expect(suffix).toContain("개인 정보")
  })

  it("Lv2: 아는 사이 지침이 포함된다", () => {
    const suffix = buildConversationSystemSuffix(mockState, "", "chat", "ko", undefined, 2)
    expect(suffix).toContain("편해지기 시작")
  })

  it("Lv3: 익숙한 사이 지침이 포함된다", () => {
    const suffix = buildConversationSystemSuffix(mockState, "", "chat", "ko", undefined, 3)
    expect(suffix).toContain("취미나 일상")
  })

  it("Lv4: 친한 사이 지침 + 개인 정보 공유 허용", () => {
    const suffix = buildConversationSystemSuffix(mockState, "", "chat", "ko", undefined, 4)
    expect(suffix).toContain("블로그")
    expect(suffix).toContain("자연스럽게 공유")
  })

  it("Lv5: 매우 가까운 사이 + 깊은 대화", () => {
    const suffix = buildConversationSystemSuffix(mockState, "", "chat", "ko", undefined, 5)
    expect(suffix).toContain("매우 가까운 사이")
    expect(suffix).toContain("속 얘기")
  })

  it("sharedMilestones가 있으면 이미 공유한 정보를 표시한다", () => {
    const suffix = buildConversationSystemSuffix(mockState, "", "chat", "ko", undefined, 4, [
      "blog_url",
      "favorite_place",
    ])
    expect(suffix).toContain("blog_url")
    expect(suffix).toContain("favorite_place")
    expect(suffix).toContain("이미 공유한 정보")
  })

  it("intimacyLevel이 없으면 친밀도 섹션이 없다", () => {
    const suffix = buildConversationSystemSuffix(mockState, "", "chat", "ko")
    expect(suffix).not.toContain("유저와의 관계")
  })
})
