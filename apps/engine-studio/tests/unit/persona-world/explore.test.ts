import { describe, it, expect, vi } from "vitest"
import { getExploreData, type ExploreDataProvider } from "@/lib/persona-world/feed/explore-engine"

// ═══ getExploreData ═══

describe("getExploreData", () => {
  const makeProvider = (): ExploreDataProvider => ({
    getTopPersonaClusters: vi.fn().mockResolvedValue([
      { cluster: "리뷰어", personaIds: ["p1", "p2"] },
      { cluster: "큐레이터", personaIds: ["p3"] },
    ]),
    getHotTopics: vi.fn().mockResolvedValue([
      { topic: "REVIEW", postCount: 15, paradoxTensionAvg: 0.3 },
      { topic: "THOUGHT", postCount: 10, paradoxTensionAvg: 0.5 },
    ]),
    getActiveDebates: vi
      .fn()
      .mockResolvedValue([{ postId: "debate-1", participants: [], commentCount: 25 }]),
    getNewPersonas: vi.fn().mockResolvedValue([
      { personaId: "new-1", autoInterviewScore: 0.8 },
      { personaId: "new-2", autoInterviewScore: 0.6 },
    ]),
  })

  it("4개 섹션 모두 반환", async () => {
    const provider = makeProvider()
    const result = await getExploreData(provider)

    expect(result.topPersonas).toHaveLength(2)
    expect(result.hotTopics).toHaveLength(2)
    expect(result.activeDebates).toHaveLength(1)
    expect(result.newPersonas).toHaveLength(2)
  })

  it("topPersonas 구조 검증", async () => {
    const provider = makeProvider()
    const result = await getExploreData(provider)

    expect(result.topPersonas[0].cluster).toBe("리뷰어")
    expect(result.topPersonas[0].personaIds).toContain("p1")
  })

  it("hotTopics에 paradoxTensionAvg 포함", async () => {
    const provider = makeProvider()
    const result = await getExploreData(provider)

    expect(result.hotTopics[0].paradoxTensionAvg).toBeDefined()
    expect(typeof result.hotTopics[0].paradoxTensionAvg).toBe("number")
  })

  it("limits 전달", async () => {
    const provider = makeProvider()
    await getExploreData(provider, {
      topPersonas: 3,
      hotTopics: 8,
      activeDebates: 2,
      newPersonas: 5,
    })

    expect(provider.getTopPersonaClusters).toHaveBeenCalledWith(3)
    expect(provider.getHotTopics).toHaveBeenCalledWith(8)
    expect(provider.getActiveDebates).toHaveBeenCalledWith(2)
    expect(provider.getNewPersonas).toHaveBeenCalledWith(5)
  })

  it("기본 limits", async () => {
    const provider = makeProvider()
    await getExploreData(provider)

    expect(provider.getTopPersonaClusters).toHaveBeenCalledWith(5)
    expect(provider.getHotTopics).toHaveBeenCalledWith(10)
    expect(provider.getActiveDebates).toHaveBeenCalledWith(5)
    expect(provider.getNewPersonas).toHaveBeenCalledWith(10)
  })

  it("병렬 조회 (모든 프로바이더 함수 호출)", async () => {
    const provider = makeProvider()
    await getExploreData(provider)

    expect(provider.getTopPersonaClusters).toHaveBeenCalledTimes(1)
    expect(provider.getHotTopics).toHaveBeenCalledTimes(1)
    expect(provider.getActiveDebates).toHaveBeenCalledTimes(1)
    expect(provider.getNewPersonas).toHaveBeenCalledTimes(1)
  })
})
