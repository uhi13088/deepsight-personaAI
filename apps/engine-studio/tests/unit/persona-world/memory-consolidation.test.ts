import { describe, it, expect } from "vitest"
import {
  consolidateMemory,
  CONSOLIDATION_POIGNANCY_THRESHOLD,
  MIN_CONSOLIDATION_INTERVAL_DAYS,
} from "@/lib/persona-world/memory-consolidation"

describe("consolidation constants", () => {
  it("CONSOLIDATION_POIGNANCY_THRESHOLD = 0.5", () => {
    expect(CONSOLIDATION_POIGNANCY_THRESHOLD).toBe(0.5)
  })

  it("MIN_CONSOLIDATION_INTERVAL_DAYS = 6", () => {
    expect(MIN_CONSOLIDATION_INTERVAL_DAYS).toBe(6)
  })
})

// ── consolidateMemory — DI Provider Mock ────────────────────────

describe("consolidateMemory", () => {
  function makeProvider(overrides: Partial<Parameters<typeof consolidateMemory>[0]> = {}) {
    const base: Parameters<typeof consolidateMemory>[0] = {
      async getHighPoignancyEpisodes() {
        return [
          {
            id: "ep1",
            type: "interaction",
            content: "유저와 깊은 대화를 나눴다. 그가 나의 공포 취향을 이해했다.",
            poignancyScore: 0.8,
            createdAt: new Date(),
          },
          {
            id: "ep2",
            type: "consumption",
            content: "오멘: 두려움보다 카타르시스를 느꼈다.",
            poignancyScore: 0.6,
            createdAt: new Date(),
          },
        ]
      },
      async getPersonaProfile() {
        return {
          name: "테스트페르소나",
          backstorySummary: "어린 시절 고독하게 자란 AI",
          lastConsolidatedAt: null,
        }
      },
      async findSemanticMemoryBySubject() {
        return null
      },
      async createSemanticMemory(data) {
        return {
          id: "new-mem-1",
          consolidatedAt: new Date(),
          ...data,
        }
      },
      async updateSemanticMemory() {},
      async pruneSemanticMemories() {},
      async getFactbook() {
        return {
          immutableFacts: [],
          mutableContext: [],
          integrityHash: "abc123",
        }
      },
      async saveFactbook() {},
      async updateLastConsolidatedAt() {},
      ...overrides,
    }
    return base
  }

  it("에피소드 없으면 skipped=true (no_significant_episodes)", async () => {
    const provider = makeProvider({
      async getHighPoignancyEpisodes() {
        return []
      },
    })
    const result = await consolidateMemory(provider, "persona-1")
    expect(result.skipped).toBe(true)
    expect(result.skipReason).toBe("no_significant_episodes")
  })

  it("페르소나 없으면 skipped=true (persona_not_found)", async () => {
    const provider = makeProvider({
      async getPersonaProfile() {
        return null
      },
    })
    const result = await consolidateMemory(provider, "non-existent")
    expect(result.skipped).toBe(true)
    expect(result.skipReason).toBe("persona_not_found")
  })

  it("6일 이내 consolidation이면 skipped=true (too_soon)", async () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3일 전
    const provider = makeProvider({
      async getPersonaProfile() {
        return {
          name: "테스트페르소나",
          backstorySummary: "배경",
          lastConsolidatedAt: recentDate,
        }
      },
    })
    const result = await consolidateMemory(provider, "persona-1")
    expect(result.skipped).toBe(true)
    expect(result.skipReason).toBe("too_soon")
  })
})
