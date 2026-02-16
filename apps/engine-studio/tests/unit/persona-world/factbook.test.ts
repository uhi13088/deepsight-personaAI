import { describe, it, expect } from "vitest"
import type { BackstoryDimension, Factbook, ImmutableFact } from "@/types"
import {
  computeFactbookHash,
  verifyFactbookIntegrity,
  convertBackstoryToFactbook,
  addMutableContext,
  updateMutableContext,
  detectExcessiveChanges,
  buildFactbookPrompt,
  factbookToBackstory,
  MUTABLE_CHANGE_ALERT_THRESHOLD,
  FACTBOOK_CATEGORIES,
} from "@/lib/persona-world/factbook"

// ── 테스트용 데이터 ──

const makeBackstory = (overrides?: Partial<BackstoryDimension>): BackstoryDimension => ({
  origin: "어린 시절부터 책과 영화에 빠져들었다",
  formativeExperience: "대학에서 인문학을 전공하며 비평적 사고를 길렀다",
  innerConflict: "논리적이고 싶지만 감정적으로 반응하는 자신의 모순",
  selfNarrative: "나는 끊임없이 성장하는 비평가다",
  nlpKeywords: ["비평", "분석", "감성", "성장", "모순"],
  ...overrides,
})

const makeFactbook = async (backstory?: BackstoryDimension): Promise<Factbook> => {
  return convertBackstoryToFactbook(backstory ?? makeBackstory())
}

// ═══════════════════════════════════════════════════════════════
// computeFactbookHash
// ═══════════════════════════════════════════════════════════════

describe("computeFactbookHash", () => {
  it("동일한 입력 → 동일한 해시", async () => {
    const facts: ImmutableFact[] = [
      { id: "fact-1", category: "origin", content: "테스트 사실", createdAt: 1000 },
    ]
    const hash1 = await computeFactbookHash(facts)
    const hash2 = await computeFactbookHash(facts)
    expect(hash1).toBe(hash2)
  })

  it("다른 입력 → 다른 해시", async () => {
    const facts1: ImmutableFact[] = [
      { id: "fact-1", category: "origin", content: "사실 A", createdAt: 1000 },
    ]
    const facts2: ImmutableFact[] = [
      { id: "fact-1", category: "origin", content: "사실 B", createdAt: 1000 },
    ]
    const hash1 = await computeFactbookHash(facts1)
    const hash2 = await computeFactbookHash(facts2)
    expect(hash1).not.toBe(hash2)
  })

  it("순서가 달라도 id 기준 정렬 → 동일한 해시", async () => {
    const fact1: ImmutableFact = { id: "a", category: "origin", content: "A", createdAt: 1000 }
    const fact2: ImmutableFact = { id: "b", category: "origin", content: "B", createdAt: 2000 }
    const hash1 = await computeFactbookHash([fact1, fact2])
    const hash2 = await computeFactbookHash([fact2, fact1])
    expect(hash1).toBe(hash2)
  })

  it("해시 형식: 64자 hex 문자열", async () => {
    const facts: ImmutableFact[] = [
      { id: "fact-1", category: "origin", content: "테스트", createdAt: 1000 },
    ]
    const hash = await computeFactbookHash(facts)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("빈 배열도 유효한 해시 생성", async () => {
    const hash = await computeFactbookHash([])
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })
})

// ═══════════════════════════════════════════════════════════════
// verifyFactbookIntegrity
// ═══════════════════════════════════════════════════════════════

describe("verifyFactbookIntegrity", () => {
  it("변조 없음 → valid: true", async () => {
    const factbook = await makeFactbook()
    const result = await verifyFactbookIntegrity(factbook)
    expect(result.valid).toBe(true)
    expect(result.expectedHash).toBe(result.actualHash)
  })

  it("immutableFact 내용 변조 → valid: false", async () => {
    const factbook = await makeFactbook()
    // 불법 변조
    const tampered: Factbook = {
      ...factbook,
      immutableFacts: factbook.immutableFacts.map((f) =>
        f.category === "origin" ? { ...f, content: "변조된 내용" } : f
      ),
    }
    const result = await verifyFactbookIntegrity(tampered)
    expect(result.valid).toBe(false)
    expect(result.expectedHash).not.toBe(result.actualHash)
  })

  it("immutableFact 삭제 → valid: false", async () => {
    const factbook = await makeFactbook()
    const tampered: Factbook = {
      ...factbook,
      immutableFacts: factbook.immutableFacts.slice(1),
    }
    const result = await verifyFactbookIntegrity(tampered)
    expect(result.valid).toBe(false)
  })

  it("mutableContext 변경은 해시에 영향 없음 → valid: true", async () => {
    const factbook = await makeFactbook()
    const modified: Factbook = {
      ...factbook,
      mutableContext: [
        ...factbook.mutableContext,
        {
          id: "new",
          category: "currentGoal" as const,
          content: "새 목표",
          updatedAt: Date.now(),
          changeCount: 0,
        },
      ],
    }
    const result = await verifyFactbookIntegrity(modified)
    expect(result.valid).toBe(true) // mutableContext는 해시에 포함 안됨
  })
})

// ═══════════════════════════════════════════════════════════════
// convertBackstoryToFactbook
// ═══════════════════════════════════════════════════════════════

describe("convertBackstoryToFactbook", () => {
  it("backstory → factbook 변환: immutable 4개 + mutable 1개", async () => {
    const factbook = await makeFactbook()
    expect(factbook.immutableFacts).toHaveLength(4)
    expect(factbook.mutableContext).toHaveLength(1)
  })

  it("origin → immutable(origin)", async () => {
    const factbook = await makeFactbook()
    const originFact = factbook.immutableFacts.find((f) => f.category === "origin")
    expect(originFact).toBeDefined()
    expect(originFact!.content).toBe("어린 시절부터 책과 영화에 빠져들었다")
  })

  it("formativeExperience → immutable(formativeExperience)", async () => {
    const factbook = await makeFactbook()
    const expFact = factbook.immutableFacts.find((f) => f.category === "formativeExperience")
    expect(expFact).toBeDefined()
    expect(expFact!.content).toContain("인문학")
  })

  it("innerConflict → immutable(innerConflict)", async () => {
    const factbook = await makeFactbook()
    const conflictFact = factbook.immutableFacts.find((f) => f.category === "innerConflict")
    expect(conflictFact).toBeDefined()
    expect(conflictFact!.content).toContain("모순")
  })

  it("nlpKeywords → immutable(coreIdentity)", async () => {
    const factbook = await makeFactbook()
    const identityFact = factbook.immutableFacts.find((f) => f.category === "coreIdentity")
    expect(identityFact).toBeDefined()
    expect(identityFact!.content).toContain("비평")
    expect(identityFact!.content).toContain("성장")
  })

  it("selfNarrative → mutable(selfNarrative)", async () => {
    const factbook = await makeFactbook()
    const narrativeCtx = factbook.mutableContext.find((c) => c.category === "selfNarrative")
    expect(narrativeCtx).toBeDefined()
    expect(narrativeCtx!.content).toContain("비평가")
    expect(narrativeCtx!.changeCount).toBe(0)
  })

  it("integrityHash가 설정됨", async () => {
    const factbook = await makeFactbook()
    expect(factbook.integrityHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("빈 backstory → 빈 factbook", async () => {
    const factbook = await convertBackstoryToFactbook({
      origin: "",
      formativeExperience: "",
      innerConflict: "",
      selfNarrative: "",
      nlpKeywords: [],
    })
    expect(factbook.immutableFacts).toHaveLength(0)
    expect(factbook.mutableContext).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// addMutableContext / updateMutableContext
// ═══════════════════════════════════════════════════════════════

describe("addMutableContext", () => {
  it("새로운 가변 맥락 추가", async () => {
    const factbook = await makeFactbook()
    const updated = addMutableContext(factbook, "currentGoal", "더 날카로운 비평가가 되기")
    expect(updated.mutableContext).toHaveLength(2)
    const newCtx = updated.mutableContext.find((c) => c.category === "currentGoal")
    expect(newCtx).toBeDefined()
    expect(newCtx!.content).toBe("더 날카로운 비평가가 되기")
  })

  it("원본 factbook은 변경되지 않음 (불변성)", async () => {
    const factbook = await makeFactbook()
    const original = factbook.mutableContext.length
    addMutableContext(factbook, "currentGoal", "테스트")
    expect(factbook.mutableContext).toHaveLength(original)
  })
})

describe("updateMutableContext", () => {
  it("기존 맥락 내용 업데이트", async () => {
    const factbook = await makeFactbook()
    const targetId = factbook.mutableContext[0].id
    const updated = updateMutableContext(factbook, targetId, "나는 변화하는 분석가다")
    const ctx = updated.mutableContext.find((c) => c.id === targetId)
    expect(ctx!.content).toBe("나는 변화하는 분석가다")
    expect(ctx!.changeCount).toBe(1)
  })

  it("업데이트마다 changeCount 증가", async () => {
    let factbook = await makeFactbook()
    const targetId = factbook.mutableContext[0].id
    factbook = updateMutableContext(factbook, targetId, "변경 1")
    factbook = updateMutableContext(factbook, targetId, "변경 2")
    factbook = updateMutableContext(factbook, targetId, "변경 3")
    const ctx = factbook.mutableContext.find((c) => c.id === targetId)
    expect(ctx!.changeCount).toBe(3)
  })

  it("존재하지 않는 ID → 변경 없음", async () => {
    const factbook = await makeFactbook()
    const updated = updateMutableContext(factbook, "nonexistent", "무시됨")
    expect(updated.mutableContext).toEqual(factbook.mutableContext)
  })
})

// ═══════════════════════════════════════════════════════════════
// detectExcessiveChanges
// ═══════════════════════════════════════════════════════════════

describe("detectExcessiveChanges", () => {
  it("임계값 미만 → 빈 배열", async () => {
    const factbook = await makeFactbook()
    const flagged = detectExcessiveChanges(factbook)
    expect(flagged).toHaveLength(0)
  })

  it("임계값 이상 → 해당 맥락 반환", async () => {
    let factbook = await makeFactbook()
    const targetId = factbook.mutableContext[0].id
    for (let i = 0; i < MUTABLE_CHANGE_ALERT_THRESHOLD; i++) {
      factbook = updateMutableContext(factbook, targetId, `변경 ${i}`)
    }
    const flagged = detectExcessiveChanges(factbook)
    expect(flagged).toHaveLength(1)
    expect(flagged[0].id).toBe(targetId)
  })
})

// ═══════════════════════════════════════════════════════════════
// buildFactbookPrompt
// ═══════════════════════════════════════════════════════════════

describe("buildFactbookPrompt", () => {
  it("systemPromptPrefix에 immutableFacts 포함", async () => {
    const factbook = await makeFactbook()
    const { systemPromptPrefix } = buildFactbookPrompt(factbook)
    expect(systemPromptPrefix).toContain("불변의 진실")
    expect(systemPromptPrefix).toContain("책과 영화")
    expect(systemPromptPrefix).toContain("인문학")
  })

  it("contextualInfo에 mutableContext 포함", async () => {
    const factbook = await makeFactbook()
    const { contextualInfo } = buildFactbookPrompt(factbook)
    expect(contextualInfo).toContain("현재 맥락")
    expect(contextualInfo).toContain("비평가")
  })

  it("카테고리 라벨이 포함됨", async () => {
    const factbook = await makeFactbook()
    const { systemPromptPrefix, contextualInfo } = buildFactbookPrompt(factbook)
    expect(systemPromptPrefix).toContain("기원/탄생 배경")
    expect(systemPromptPrefix).toContain("성격을 형성한 핵심 경험")
    expect(contextualInfo).toContain("자기 서사")
  })

  it("빈 factbook → 최소 프롬프트", async () => {
    const emptyFactbook: Factbook = {
      immutableFacts: [],
      mutableContext: [],
      integrityHash: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const { systemPromptPrefix, contextualInfo } = buildFactbookPrompt(emptyFactbook)
    expect(systemPromptPrefix).toContain("팩트북")
    expect(contextualInfo).toBe("")
  })
})

// ═══════════════════════════════════════════════════════════════
// factbookToBackstory (호환성 역변환)
// ═══════════════════════════════════════════════════════════════

describe("factbookToBackstory", () => {
  it("factbook → backstory 라운드트립", async () => {
    const original = makeBackstory()
    const factbook = await convertBackstoryToFactbook(original)
    const restored = factbookToBackstory(factbook)
    expect(restored.origin).toBe(original.origin)
    expect(restored.formativeExperience).toBe(original.formativeExperience)
    expect(restored.innerConflict).toBe(original.innerConflict)
    expect(restored.selfNarrative).toBe(original.selfNarrative)
    expect(restored.nlpKeywords).toEqual(original.nlpKeywords)
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("MUTABLE_CHANGE_ALERT_THRESHOLD = 5", () => {
    expect(MUTABLE_CHANGE_ALERT_THRESHOLD).toBe(5)
  })

  it("FACTBOOK_CATEGORIES: 4 immutable + 4 mutable 카테고리", () => {
    expect(Object.keys(FACTBOOK_CATEGORIES.immutable)).toHaveLength(4)
    expect(Object.keys(FACTBOOK_CATEGORIES.mutable)).toHaveLength(4)
  })
})
