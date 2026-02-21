// ═══════════════════════════════════════════════════════════════
// T163: Factbook 런타임 연동 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from "vitest"
import type { Factbook, MutableContext } from "@/types"
import {
  inferContextCategory,
  summarizeInteraction,
  applyMutableContextUpdate,
  updateMutableContextRuntime,
  toStateEvent,
  type InteractionInput,
  type FactbookDataProvider,
} from "@/lib/persona-world/factbook-runtime"
import { convertBackstoryToFactbook, updateMutableContext } from "@/lib/persona-world/factbook"
import { MUTABLE_CHANGE_ALERT_THRESHOLD } from "@/lib/persona-world/factbook"

// ── Mock: state-manager (DB 의존 함수) ─────────────────────

vi.mock("@/lib/persona-world/state-manager", () => ({
  updatePersonaState: vi.fn().mockResolvedValue({
    mood: 0.5,
    energy: 0.95,
    socialBattery: 0.95,
    paradoxTension: 0.0,
    narrativeTension: 0.0,
  }),
  getPersonaState: vi.fn().mockResolvedValue({
    mood: 0.5,
    energy: 1.0,
    socialBattery: 1.0,
    paradoxTension: 0.0,
    narrativeTension: 0.0,
  }),
}))

// ── Fixtures ────────────────────────────────────────────────

const makeFactbook = async (): Promise<Factbook> => {
  return convertBackstoryToFactbook({
    origin: "어린 시절부터 책과 영화에 빠져들었다",
    formativeExperience: "대학에서 인문학을 전공하며 비평적 사고를 길렀다",
    innerConflict: "논리적이고 싶지만 감정적으로 반응하는 자신의 모순",
    selfNarrative: "나는 끊임없이 성장하는 비평가다",
    nlpKeywords: ["비평", "분석", "감성", "성장", "모순"],
  })
}

const createMockDataProvider = (factbook: Factbook | null): FactbookDataProvider => ({
  getFactbook: vi.fn().mockResolvedValue(factbook),
  saveFactbook: vi.fn().mockResolvedValue(undefined),
})

// ═══════════════════════════════════════════════════════════════
// AC1: inferContextCategory — 상호작용 → 카테고리 매핑
// ═══════════════════════════════════════════════════════════════

describe("T163-AC1: inferContextCategory", () => {
  it("comment_received → recentExperience", () => {
    expect(inferContextCategory({ type: "comment_received" })).toBe("recentExperience")
  })

  it("comment_created → evolvedPerspective", () => {
    expect(inferContextCategory({ type: "comment_created" })).toBe("evolvedPerspective")
  })

  it("post_created → currentGoal", () => {
    expect(inferContextCategory({ type: "post_created" })).toBe("currentGoal")
  })

  it("like_received → recentExperience", () => {
    expect(inferContextCategory({ type: "like_received" })).toBe("recentExperience")
  })
})

// ═══════════════════════════════════════════════════════════════
// AC1: summarizeInteraction — 상호작용 요약 생성
// ═══════════════════════════════════════════════════════════════

describe("T163-AC1: summarizeInteraction", () => {
  it("comment_received — 콘텐츠 + 감정 포함", () => {
    const summary = summarizeInteraction({
      type: "comment_received",
      content: "정말 좋은 분석이네요!",
      sentiment: "positive",
    })
    expect(summary).toContain("긍정적")
    expect(summary).toContain("좋은 분석")
  })

  it("comment_received — 공격적 감정", () => {
    const summary = summarizeInteraction({
      type: "comment_received",
      content: "무슨 소리야",
      sentiment: "aggressive",
    })
    expect(summary).toContain("공격적")
  })

  it("comment_received — 콘텐츠 없음", () => {
    const summary = summarizeInteraction({
      type: "comment_received",
      sentiment: "neutral",
    })
    expect(summary).toBe("중립적 반응을 받음")
  })

  it("comment_created — 콘텐츠 포함", () => {
    const summary = summarizeInteraction({
      type: "comment_created",
      content: "나는 이 영화가 좋다고 생각해",
    })
    expect(summary).toContain("의견을 표현함")
    expect(summary).toContain("영화가 좋다")
  })

  it("post_created — 콘텐츠 포함", () => {
    const summary = summarizeInteraction({
      type: "post_created",
      content: "올해의 영화 추천 리스트",
    })
    expect(summary).toContain("새 글을 작성함")
    expect(summary).toContain("영화 추천")
  })

  it("like_received — 고정 메시지", () => {
    const summary = summarizeInteraction({ type: "like_received" })
    expect(summary).toBe("콘텐츠가 공감을 얻음")
  })

  it("긴 콘텐츠는 100자로 잘림", () => {
    const longContent = "가".repeat(200)
    const summary = summarizeInteraction({
      type: "comment_created",
      content: longContent,
    })
    // 100자로 잘린 snippet 포함 확인
    expect(summary.length).toBeLessThan(200)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC1: applyMutableContextUpdate — 순수 함수
// ═══════════════════════════════════════════════════════════════

describe("T163-AC1: applyMutableContextUpdate", () => {
  it("기존 카테고리가 있으면 업데이트 (changeCount 증가)", async () => {
    const factbook = await makeFactbook()
    // factbook에는 selfNarrative가 이미 있음
    const updated = applyMutableContextUpdate(factbook, "selfNarrative", "나는 진화하는 분석가다")
    const ctx = updated.mutableContext.find((c) => c.category === "selfNarrative")
    expect(ctx!.content).toBe("나는 진화하는 분석가다")
    expect(ctx!.changeCount).toBe(1)
  })

  it("새 카테고리면 추가 (changeCount = 0)", async () => {
    const factbook = await makeFactbook()
    const updated = applyMutableContextUpdate(factbook, "currentGoal", "더 깊은 리뷰어가 되기")
    const ctx = updated.mutableContext.find((c) => c.category === "currentGoal")
    expect(ctx!.content).toBe("더 깊은 리뷰어가 되기")
    expect(ctx!.changeCount).toBe(0)
    expect(updated.mutableContext.length).toBe(factbook.mutableContext.length + 1)
  })

  it("immutableFacts는 변경되지 않음", async () => {
    const factbook = await makeFactbook()
    const updated = applyMutableContextUpdate(factbook, "recentExperience", "새 경험")
    expect(updated.immutableFacts).toEqual(factbook.immutableFacts)
    expect(updated.integrityHash).toBe(factbook.integrityHash)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC1+AC2+AC3: updateMutableContextRuntime — 통합 런타임
// ═══════════════════════════════════════════════════════════════

describe("T163-AC1: updateMutableContextRuntime", () => {
  it("정상 업데이트 — 결과 반환", async () => {
    const factbook = await makeFactbook()
    const provider = createMockDataProvider(factbook)

    const result = await updateMutableContextRuntime(
      "persona-1",
      { type: "comment_received", content: "좋은 글!", sentiment: "positive" },
      provider
    )

    expect(result).not.toBeNull()
    expect(result!.updatedCategory).toBe("recentExperience")
    expect(result!.integrityValid).toBe(true)
    expect(result!.excessiveChanges).toHaveLength(0)
    expect(provider.saveFactbook).toHaveBeenCalledOnce()
  })

  it("factbook 없으면 null 반환", async () => {
    const provider = createMockDataProvider(null)

    const result = await updateMutableContextRuntime(
      "persona-missing",
      { type: "like_received" },
      provider
    )

    expect(result).toBeNull()
    expect(provider.saveFactbook).not.toHaveBeenCalled()
  })

  it("DB에 업데이트된 factbook 저장", async () => {
    const factbook = await makeFactbook()
    const provider = createMockDataProvider(factbook)

    await updateMutableContextRuntime(
      "persona-1",
      { type: "post_created", content: "새 리뷰" },
      provider
    )

    expect(provider.saveFactbook).toHaveBeenCalledWith(
      "persona-1",
      expect.objectContaining({
        immutableFacts: factbook.immutableFacts,
        integrityHash: factbook.integrityHash,
      })
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: changeCount 추적 + 과도한 변경 경고
// ═══════════════════════════════════════════════════════════════

describe("T163-AC2: changeCount 추적 + 경고", () => {
  it("반복 업데이트 → changeCount 누적", async () => {
    let factbook = await makeFactbook()
    const targetId = factbook.mutableContext[0].id

    for (let i = 0; i < 3; i++) {
      factbook = updateMutableContext(factbook, targetId, `변경 ${i}`)
    }

    const ctx = factbook.mutableContext.find((c) => c.id === targetId)
    expect(ctx!.changeCount).toBe(3)
  })

  it("임계값(5) 초과 시 console.warn 호출", async () => {
    let factbook = await makeFactbook()
    const targetId = factbook.mutableContext[0].id

    // changeCount를 임계값까지 올림
    for (let i = 0; i < MUTABLE_CHANGE_ALERT_THRESHOLD; i++) {
      factbook = updateMutableContext(factbook, targetId, `변경 ${i}`)
    }

    const provider = createMockDataProvider(factbook)
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    await updateMutableContextRuntime(
      "persona-1",
      { type: "comment_created", content: "또 다른 의견" },
      provider
    )

    // selfNarrative는 comment_created로 업데이트되지 않지만,
    // 이미 changeCount가 5인 selfNarrative가 detectExcessiveChanges에 걸림
    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0][0]).toContain("[FACTBOOK-EXCESSIVE-CHANGE]")
    expect(warnSpy.mock.calls[0][0]).toContain("persona-1")

    warnSpy.mockRestore()
  })

  it("임계값 미만 → 경고 없음", async () => {
    const factbook = await makeFactbook()
    const provider = createMockDataProvider(factbook)
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    await updateMutableContextRuntime("persona-1", { type: "like_received" }, provider)

    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: integrityHash 검증
// ═══════════════════════════════════════════════════════════════

describe("T163-AC3: integrityHash 검증", () => {
  it("mutableContext 변경 후에도 integrityHash 유효", async () => {
    const factbook = await makeFactbook()
    const provider = createMockDataProvider(factbook)

    const result = await updateMutableContextRuntime(
      "persona-1",
      { type: "comment_received", sentiment: "positive" },
      provider
    )

    expect(result!.integrityValid).toBe(true)
  })

  it("immutableFacts 변조 시 integrityValid = false + console.error", async () => {
    const factbook = await makeFactbook()
    // 불법 변조
    const tampered: Factbook = {
      ...factbook,
      immutableFacts: factbook.immutableFacts.map((f) =>
        f.category === "origin" ? { ...f, content: "변조된 내용" } : f
      ),
    }
    const provider = createMockDataProvider(tampered)
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await updateMutableContextRuntime(
      "persona-tampered",
      { type: "like_received" },
      provider
    )

    expect(result!.integrityValid).toBe(false)
    expect(errorSpy).toHaveBeenCalled()
    expect(errorSpy.mock.calls[0][0]).toContain("[FACTBOOK-INTEGRITY]")
    expect(errorSpy.mock.calls[0][0]).toContain("persona-tampered")

    errorSpy.mockRestore()
  })

  it("integrityHash 값 자체는 변경되지 않음 (immutableFacts 기반)", async () => {
    const factbook = await makeFactbook()
    const provider = createMockDataProvider(factbook)

    const result = await updateMutableContextRuntime(
      "persona-1",
      { type: "post_created", content: "새 글" },
      provider
    )

    expect(result!.factbook.integrityHash).toBe(factbook.integrityHash)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: toStateEvent — PersonaState 연동
// ═══════════════════════════════════════════════════════════════

describe("T163-AC4: toStateEvent 변환", () => {
  it("comment_received → sentiment 포함", () => {
    const event = toStateEvent({ type: "comment_received", sentiment: "negative" })
    expect(event).toEqual({ type: "comment_received", sentiment: "negative" })
  })

  it("comment_received — sentiment 없으면 neutral 기본값", () => {
    const event = toStateEvent({ type: "comment_received" })
    expect(event).toEqual({ type: "comment_received", sentiment: "neutral" })
  })

  it("comment_created → tokensUsed: 0", () => {
    const event = toStateEvent({ type: "comment_created" })
    expect(event).toEqual({ type: "comment_created", tokensUsed: 0 })
  })

  it("post_created → tokensUsed: 0", () => {
    const event = toStateEvent({ type: "post_created" })
    expect(event).toEqual({ type: "post_created", tokensUsed: 0 })
  })

  it("like_received → 단순 이벤트", () => {
    const event = toStateEvent({ type: "like_received" })
    expect(event).toEqual({ type: "like_received" })
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: processInteraction — 통합 파이프라인
// ═══════════════════════════════════════════════════════════════

describe("T163-AC4: processInteraction 통합", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("factbook + state 모두 업데이트", async () => {
    const { processInteraction } = await import("@/lib/persona-world/factbook-runtime")
    const { updatePersonaState } = await import("@/lib/persona-world/state-manager")

    const factbook = await makeFactbook()
    const provider = createMockDataProvider(factbook)

    const result = await processInteraction(
      "persona-1",
      { type: "comment_received", content: "좋은 글!", sentiment: "positive" },
      provider
    )

    // factbook 업데이트 확인
    expect(result.factbookUpdate).not.toBeNull()
    expect(result.factbookUpdate!.updatedCategory).toBe("recentExperience")

    // state 업데이트 확인
    expect(updatePersonaState).toHaveBeenCalledWith("persona-1", {
      type: "comment_received",
      sentiment: "positive",
    })
    expect(result.stateUpdate).toBeDefined()
    expect(result.stateUpdate.mood).toBeDefined()
  })

  it("factbook 없어도 state는 업데이트됨", async () => {
    const { processInteraction } = await import("@/lib/persona-world/factbook-runtime")
    const { updatePersonaState } = await import("@/lib/persona-world/state-manager")

    const provider = createMockDataProvider(null)

    const result = await processInteraction("persona-missing", { type: "like_received" }, provider)

    expect(result.factbookUpdate).toBeNull()
    expect(updatePersonaState).toHaveBeenCalledWith("persona-missing", { type: "like_received" })
    expect(result.stateUpdate).toBeDefined()
  })
})
