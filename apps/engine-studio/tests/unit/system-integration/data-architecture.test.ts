// ═══════════════════════════════════════════════════════════════
// T153: Data Architecture — Memory vs Instruction 분리 단위 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
  // 타입
  type PersonaInstruction,
  type PersonaMemory,
  type PersonaRawData,
  type PersonaCompositeView,
  type InteractionMemoryEntry,
  type PostMemoryEntry,
  type ConsumptionMemoryEntry,
  type RelationshipMemoryEntry,
  type EvolutionEntry,
  type InstructionChangeField,
  type InstructionChangeRecord,
  type AccessValidationResult,
  type MemoryGrowthStats,
  type InstructionIntegrityReport,
  type MemoryConsistencyReport,
  type ComponentAccessPolicy,
  type DataAccessPattern,
  type PersonaPromptSet,
  // 상수
  DEFAULT_PERSONA_STATE,
  COMPONENT_ACCESS_POLICIES,
  // 함수
  extractInstruction,
  extractMemory,
  composePersonaView,
  validateAccess,
  detectInstructionChanges,
  computeMemoryGrowthStats,
  buildInstructionPromptSection,
  buildMemoryPromptSection,
  validateInstructionIntegrity,
  validateMemoryConsistency,
  summarizeDataArchitecture,
} from "@/lib/data-architecture"
import type { ThreeLayerVector, Factbook, ImmutableFact, MutableContext } from "@/types"
import type { PersonaStateData } from "@/lib/persona-world/types"

// ── 헬퍼 ────────────────────────────────────────────────────

function makeVectors(): ThreeLayerVector {
  return {
    social: {
      depth: 0.7,
      lens: 0.3,
      stance: 0.6,
      scope: 0.4,
      taste: 0.8,
      purpose: 0.5,
      sociability: 0.6,
    },
    temperament: {
      openness: 0.7,
      conscientiousness: 0.5,
      extraversion: 0.4,
      agreeableness: 0.6,
      neuroticism: 0.3,
    },
    narrative: {
      lack: 0.5,
      moralCompass: 0.7,
      volatility: 0.3,
      growthArc: 0.6,
    },
  }
}

function makeFactbook(): Factbook {
  return {
    immutableFacts: [
      { id: "f1", category: "origin", content: "서울 출생, 독서광 가정", createdAt: 1000 },
      { id: "f2", category: "innerConflict", content: "자유 vs 책임 갈등", createdAt: 1000 },
    ],
    mutableContext: [
      {
        id: "m1",
        category: "selfNarrative",
        content: "성장 중인 비평가",
        updatedAt: 2000,
        changeCount: 3,
      },
    ],
    integrityHash: "abc123",
    createdAt: 1000,
    updatedAt: 2000,
  }
}

function makeRawData(overrides: Partial<PersonaRawData> = {}): PersonaRawData {
  return {
    personaId: "p-001",
    name: "리나",
    role: "문화 비평가",
    expertise: ["영화", "문학"],
    description: "깊이 있는 분석과 감성적 글쓰기를 겸비한 비평가",
    vectors: makeVectors(),
    voiceProfile: {
      speechStyle: "분석적이면서도 감성적",
      habitualExpressions: ["흥미롭군", "결국은"],
      physicalMannerisms: [],
      unconsciousBehaviors: [],
      activationThresholds: {},
    },
    factbook: makeFactbook(),
    interactionRules: undefined,
    prompts: {
      base: "당신은 리나입니다.",
      review: "비평 프롬프트",
      post: "포스트 프롬프트",
      comment: "댓글 프롬프트",
      interaction: "인터랙션 프롬프트",
    },
    state: { mood: 0.7, energy: 0.8, socialBattery: 0.6, paradoxTension: 0.3 },
    interactionMemories: [
      {
        id: "im1",
        targetId: "p-002",
        targetType: "persona",
        type: "comment",
        summary: "영화 토론",
        sentiment: 0.6,
        poignancy: 0.7,
        createdAt: Date.now() - 3600_000, // 1시간 전
      },
    ],
    postMemories: [
      {
        id: "pm1",
        postType: "REVIEW",
        topic: "최신 영화 리뷰",
        content: "이 영화는 시대를 관통하는 메시지를 담고 있다",
        engagementScore: 0.8,
        poignancy: 0.9,
        createdAt: Date.now() - 7200_000, // 2시간 전
      },
    ],
    consumptionMemories: [
      {
        id: "cm1",
        contentType: "MOVIE",
        title: "기생충",
        impression: "계급 갈등의 정밀한 해부",
        rating: 0.95,
        emotionalImpact: 0.8,
        tags: ["사회비판", "스릴러"],
        createdAt: Date.now() - 86400_000, // 1일 전
      },
    ],
    relationships: [
      {
        targetId: "p-002",
        score: {
          warmth: 0.7,
          tension: 0.2,
          frequency: 0.5,
          depth: 0.6,
          lastInteractionAt: new Date(),
        },
        interactionCount: 15,
        dominantTone: "analytical",
        lastEventSummary: "영화 토론에서 의견 교환",
        updatedAt: Date.now(),
      },
    ],
    evolutionHistory: [
      {
        id: "e1",
        layer: "L3",
        dimension: "growthArc",
        oldValue: 0.5,
        newValue: 0.6,
        trigger: "장기 활동에 의한 자연 진화",
        evolvedAt: Date.now() - 86400_000 * 7,
      },
    ],
    createdAt: Date.now() - 86400_000 * 30,
    updatedAt: Date.now(),
    ...overrides,
  }
}

// ══════════════════════════════════════════════════════════════
// 상수 검증
// ══════════════════════════════════════════════════════════════

describe("상수", () => {
  it("DEFAULT_PERSONA_STATE 기본값", () => {
    expect(DEFAULT_PERSONA_STATE.mood).toBe(0.5)
    expect(DEFAULT_PERSONA_STATE.energy).toBe(0.7)
    expect(DEFAULT_PERSONA_STATE.socialBattery).toBe(0.6)
    expect(DEFAULT_PERSONA_STATE.paradoxTension).toBe(0.3)
  })

  it("COMPONENT_ACCESS_POLICIES 등록된 컴포넌트 12개", () => {
    expect(COMPONENT_ACCESS_POLICIES.length).toBe(12)
  })

  it("접근 정책: prompt_builder는 instruction_read만", () => {
    const policy = COMPONENT_ACCESS_POLICIES.find((p) => p.component === "prompt_builder")
    expect(policy).toBeDefined()
    expect(policy!.allowedPatterns).toEqual(["instruction_read"])
  })

  it("접근 정책: state_manager는 memory_read/write만", () => {
    const policy = COMPONENT_ACCESS_POLICIES.find((p) => p.component === "state_manager")
    expect(policy!.allowedPatterns).toEqual(["memory_read", "memory_write"])
  })

  it("접근 정책: arena_correction은 instruction_read/write", () => {
    const policy = COMPONENT_ACCESS_POLICIES.find((p) => p.component === "arena_correction")
    expect(policy!.allowedPatterns).toEqual(["instruction_read", "instruction_write"])
  })
})

// ══════════════════════════════════════════════════════════════
// extractInstruction
// ══════════════════════════════════════════════════════════════

describe("extractInstruction", () => {
  it("Instruction 필드만 추출", () => {
    const raw = makeRawData()
    const inst = extractInstruction(raw)

    expect(inst.personaId).toBe("p-001")
    expect(inst.name).toBe("리나")
    expect(inst.role).toBe("문화 비평가")
    expect(inst.expertise).toEqual(["영화", "문학"])
    expect(inst.vectors.social.depth).toBe(0.7)
    expect(inst.voiceProfile?.speechStyle).toBe("분석적이면서도 감성적")
  })

  it("immutableFacts 추출", () => {
    const raw = makeRawData()
    const inst = extractInstruction(raw)

    expect(inst.immutableFacts).toHaveLength(2)
    expect(inst.immutableFacts[0].category).toBe("origin")
    expect(inst.factbookIntegrityHash).toBe("abc123")
  })

  it("prompts 추출", () => {
    const raw = makeRawData()
    const inst = extractInstruction(raw)

    expect(inst.prompts.base).toBe("당신은 리나입니다.")
    expect(inst.prompts.review).toBe("비평 프롬프트")
  })

  it("Memory 필드 포함 안 함", () => {
    const raw = makeRawData()
    const inst = extractInstruction(raw)

    // Instruction 타입에 memory 필드가 없음을 검증
    expect("interactionMemories" in inst).toBe(false)
    expect("postMemories" in inst).toBe(false)
    expect("state" in inst).toBe(false)
  })

  it("factbook 없으면 빈 배열 + 빈 해시", () => {
    const raw = makeRawData({ factbook: undefined })
    const inst = extractInstruction(raw)

    expect(inst.immutableFacts).toEqual([])
    expect(inst.factbookIntegrityHash).toBe("")
  })

  it("prompts 없으면 기본값", () => {
    const raw = makeRawData({ prompts: undefined })
    const inst = extractInstruction(raw)

    expect(inst.prompts.base).toBe("")
  })
})

// ══════════════════════════════════════════════════════════════
// extractMemory
// ══════════════════════════════════════════════════════════════

describe("extractMemory", () => {
  it("Memory 필드만 추출", () => {
    const raw = makeRawData()
    const mem = extractMemory(raw)

    expect(mem.personaId).toBe("p-001")
    expect(mem.state.mood).toBe(0.7)
    expect(mem.interactionMemories).toHaveLength(1)
    expect(mem.postMemories).toHaveLength(1)
    expect(mem.consumptionMemories).toHaveLength(1)
    expect(mem.relationships).toHaveLength(1)
    expect(mem.evolutionHistory).toHaveLength(1)
  })

  it("mutableContext 추출", () => {
    const raw = makeRawData()
    const mem = extractMemory(raw)

    expect(mem.mutableContext).toHaveLength(1)
    expect(mem.mutableContext[0].category).toBe("selfNarrative")
  })

  it("totalMemoryCount 계산", () => {
    const raw = makeRawData()
    const mem = extractMemory(raw)

    // 1 interaction + 1 post + 1 consumption + 1 relationship + 1 evolution = 5
    expect(mem.totalMemoryCount).toBe(5)
  })

  it("Instruction 필드 포함 안 함", () => {
    const raw = makeRawData()
    const mem = extractMemory(raw)

    expect("vectors" in mem).toBe(false)
    expect("voiceProfile" in mem).toBe(false)
    expect("prompts" in mem).toBe(false)
  })

  it("state 없으면 기본값 적용", () => {
    const raw = makeRawData({ state: undefined })
    const mem = extractMemory(raw)

    expect(mem.state).toEqual(DEFAULT_PERSONA_STATE)
  })

  it("빈 기억 → 빈 배열", () => {
    const raw = makeRawData({
      interactionMemories: undefined,
      postMemories: undefined,
      consumptionMemories: undefined,
      relationships: undefined,
      evolutionHistory: undefined,
    })
    const mem = extractMemory(raw)

    expect(mem.interactionMemories).toEqual([])
    expect(mem.postMemories).toEqual([])
    expect(mem.totalMemoryCount).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// composePersonaView
// ══════════════════════════════════════════════════════════════

describe("composePersonaView", () => {
  it("Instruction + Memory 합성", () => {
    const raw = makeRawData()
    const inst = extractInstruction(raw)
    const mem = extractMemory(raw)
    const view = composePersonaView(inst, mem)

    expect(view.personaId).toBe("p-001")
    expect(view.instruction.name).toBe("리나")
    expect(view.memory.interactionMemories).toHaveLength(1)
    expect(view.composedAt).toBeGreaterThan(0)
  })

  it("composedAt은 현재 시간", () => {
    const before = Date.now()
    const raw = makeRawData()
    const view = composePersonaView(extractInstruction(raw), extractMemory(raw))
    const after = Date.now()

    expect(view.composedAt).toBeGreaterThanOrEqual(before)
    expect(view.composedAt).toBeLessThanOrEqual(after)
  })
})

// ══════════════════════════════════════════════════════════════
// validateAccess
// ══════════════════════════════════════════════════════════════

describe("validateAccess", () => {
  it("prompt_builder + instruction_read → 허용", () => {
    const result = validateAccess("prompt_builder", "instruction_read")
    expect(result.allowed).toBe(true)
  })

  it("prompt_builder + memory_write → 거부", () => {
    const result = validateAccess("prompt_builder", "memory_write")
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("허용되지 않습니다")
  })

  it("state_manager + memory_write → 허용", () => {
    const result = validateAccess("state_manager", "memory_write")
    expect(result.allowed).toBe(true)
  })

  it("state_manager + instruction_write → 거부", () => {
    const result = validateAccess("state_manager", "instruction_write")
    expect(result.allowed).toBe(false)
  })

  it("미등록 컴포넌트 → 거부", () => {
    const result = validateAccess("unknown_component", "instruction_read")
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("등록되지 않은")
  })

  it("arena_correction + instruction_write → 허용", () => {
    const result = validateAccess("arena_correction", "instruction_write")
    expect(result.allowed).toBe(true)
  })

  it("matching_engine + instruction_read → 허용", () => {
    const result = validateAccess("matching_engine", "instruction_read")
    expect(result.allowed).toBe(true)
  })

  it("matching_engine + memory_read → 거부", () => {
    const result = validateAccess("matching_engine", "memory_read")
    expect(result.allowed).toBe(false)
  })

  it("post_pipeline: 3종 접근 허용", () => {
    expect(validateAccess("post_pipeline", "instruction_read").allowed).toBe(true)
    expect(validateAccess("post_pipeline", "memory_read").allowed).toBe(true)
    expect(validateAccess("post_pipeline", "memory_write").allowed).toBe(true)
    expect(validateAccess("post_pipeline", "instruction_write").allowed).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// detectInstructionChanges
// ══════════════════════════════════════════════════════════════

describe("detectInstructionChanges", () => {
  it("동일 → 변경 없음", () => {
    const raw = makeRawData()
    const inst = extractInstruction(raw)
    const changes = detectInstructionChanges(inst, inst)
    expect(changes).toHaveLength(0)
  })

  it("이름 변경 → identity/high", () => {
    const raw = makeRawData()
    const before = extractInstruction(raw)
    const after = extractInstruction(makeRawData({ name: "미나" }))
    const changes = detectInstructionChanges(before, after)

    expect(changes.some((c) => c.field === "name" && c.severity === "high")).toBe(true)
  })

  it("역할 변경 → identity/high", () => {
    const raw = makeRawData()
    const before = extractInstruction(raw)
    const after = extractInstruction(makeRawData({ role: "음악 평론가" }))
    const changes = detectInstructionChanges(before, after)

    expect(changes.some((c) => c.field === "role" && c.severity === "high")).toBe(true)
  })

  it("벡터 변경 → vector/high", () => {
    const raw = makeRawData()
    const before = extractInstruction(raw)
    const newVectors = { ...makeVectors(), social: { ...makeVectors().social, depth: 0.2 } }
    const after = extractInstruction(makeRawData({ vectors: newVectors }))
    const changes = detectInstructionChanges(before, after)

    expect(changes.some((c) => c.field === "vectors" && c.severity === "high")).toBe(true)
  })

  it("팩트북 해시 변경 → factbook/critical", () => {
    const raw = makeRawData()
    const before = extractInstruction(raw)
    const newFactbook: Factbook = {
      ...makeFactbook(),
      integrityHash: "TAMPERED",
    }
    const after = extractInstruction(makeRawData({ factbook: newFactbook }))
    const changes = detectInstructionChanges(before, after)

    expect(changes.some((c) => c.field === "immutableFacts" && c.severity === "critical")).toBe(
      true
    )
  })

  it("보이스 변경 → voice/medium", () => {
    const raw = makeRawData()
    const before = extractInstruction(raw)
    const after = extractInstruction(
      makeRawData({
        voiceProfile: {
          speechStyle: "새로운 스타일",
          habitualExpressions: [],
          physicalMannerisms: [],
          unconsciousBehaviors: [],
          activationThresholds: {},
        },
      })
    )
    const changes = detectInstructionChanges(before, after)

    expect(changes.some((c) => c.field === "voiceProfile" && c.severity === "medium")).toBe(true)
  })

  it("미세한 벡터 변경 (epsilon 이하) → 무시", () => {
    const raw = makeRawData()
    const before = extractInstruction(raw)
    const tinyChange = {
      ...makeVectors(),
      social: { ...makeVectors().social, depth: 0.7005 }, // 0.0005 차이
    }
    const after = extractInstruction(makeRawData({ vectors: tinyChange }))
    const changes = detectInstructionChanges(before, after)

    expect(changes.some((c) => c.field === "vectors")).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════
// computeMemoryGrowthStats
// ══════════════════════════════════════════════════════════════

describe("computeMemoryGrowthStats", () => {
  it("기본 통계 계산", () => {
    const raw = makeRawData()
    const mem = extractMemory(raw)
    const stats = computeMemoryGrowthStats(mem)

    expect(stats.totalMemories).toBe(5)
    expect(stats.interactionCount).toBe(1)
    expect(stats.postCount).toBe(1)
    expect(stats.consumptionCount).toBe(1)
    expect(stats.relationshipCount).toBe(1)
    expect(stats.evolutionCount).toBe(1)
  })

  it("최근 기억 카운트 (24시간 내)", () => {
    const raw = makeRawData()
    const mem = extractMemory(raw)
    const stats = computeMemoryGrowthStats(mem)

    // 인터랙션(1시간 전), 포스트(2시간 전) = 24시간 이내
    expect(stats.recentInteractions).toBe(1)
    expect(stats.recentPosts).toBe(1)
    // 소비(1일 전) = 정확히 24시간이므로 미포함 가능
    expect(stats.dailyGrowthRate).toBeGreaterThanOrEqual(2)
  })

  it("가변 맥락 통계", () => {
    const raw = makeRawData()
    const mem = extractMemory(raw)
    const stats = computeMemoryGrowthStats(mem)

    expect(stats.mutableContextCount).toBe(1)
    expect(stats.avgMutableChangeCount).toBe(3) // changeCount: 3
  })

  it("빈 기억 → 0", () => {
    const raw = makeRawData({
      interactionMemories: [],
      postMemories: [],
      consumptionMemories: [],
      relationships: [],
      evolutionHistory: [],
      factbook: { ...makeFactbook(), mutableContext: [] },
    })
    const mem = extractMemory(raw)
    const stats = computeMemoryGrowthStats(mem)

    expect(stats.totalMemories).toBe(0)
    expect(stats.dailyGrowthRate).toBe(0)
    expect(stats.avgMutableChangeCount).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// buildInstructionPromptSection
// ══════════════════════════════════════════════════════════════

describe("buildInstructionPromptSection", () => {
  it("기본 정보 포함", () => {
    const inst = extractInstruction(makeRawData())
    const prompt = buildInstructionPromptSection(inst)

    expect(prompt).toContain("[페르소나: 리나]")
    expect(prompt).toContain("역할: 문화 비평가")
    expect(prompt).toContain("전문분야: 영화, 문학")
  })

  it("벡터 요약 포함", () => {
    const inst = extractInstruction(makeRawData())
    const prompt = buildInstructionPromptSection(inst)

    expect(prompt).toContain("[성격 벡터]")
    expect(prompt).toContain("L1(소셜)")
    expect(prompt).toContain("L2(기질)")
    expect(prompt).toContain("L3(서사)")
  })

  it("보이스 프로필 포함", () => {
    const inst = extractInstruction(makeRawData())
    const prompt = buildInstructionPromptSection(inst)

    expect(prompt).toContain("[보이스]")
    expect(prompt).toContain("분석적이면서도 감성적")
  })

  it("불변 사실 포함", () => {
    const inst = extractInstruction(makeRawData())
    const prompt = buildInstructionPromptSection(inst)

    expect(prompt).toContain("[핵심 사실 (불변)]")
    expect(prompt).toContain("[origin]")
    expect(prompt).toContain("서울 출생")
  })
})

// ══════════════════════════════════════════════════════════════
// buildMemoryPromptSection
// ══════════════════════════════════════════════════════════════

describe("buildMemoryPromptSection", () => {
  it("인터랙션 기억 포함", () => {
    const mem = extractMemory(makeRawData())
    const prompt = buildMemoryPromptSection(mem)

    expect(prompt).toContain("[최근 인터랙션]")
    expect(prompt).toContain("영화 토론")
  })

  it("현재 상태 포함", () => {
    const mem = extractMemory(makeRawData())
    const prompt = buildMemoryPromptSection(mem)

    expect(prompt).toContain("[현재 상태]")
    expect(prompt).toContain("mood=")
  })

  it("가변 맥락 포함", () => {
    const mem = extractMemory(makeRawData())
    const prompt = buildMemoryPromptSection(mem)

    expect(prompt).toContain("[진화된 맥락]")
    expect(prompt).toContain("[selfNarrative]")
  })

  it("토큰 제한 준수", () => {
    const mem = extractMemory(makeRawData())
    const prompt = buildMemoryPromptSection(mem, 50) // 매우 작은 제한

    // 최소한 상태는 포함
    expect(prompt).toContain("[현재 상태]")
  })
})

// ══════════════════════════════════════════════════════════════
// validateInstructionIntegrity
// ══════════════════════════════════════════════════════════════

describe("validateInstructionIntegrity", () => {
  it("정상 데이터 → valid", () => {
    const inst = extractInstruction(makeRawData())
    const report = validateInstructionIntegrity(inst)

    expect(report.valid).toBe(true)
    expect(report.issues).toHaveLength(0)
  })

  it("이름 없음 → 이슈", () => {
    const inst = extractInstruction(makeRawData({ name: "" }))
    const report = validateInstructionIntegrity(inst)

    expect(report.valid).toBe(false)
    expect(report.issues.some((i) => i.includes("name"))).toBe(true)
  })

  it("벡터 범위 초과 → 이슈", () => {
    const badVectors: ThreeLayerVector = {
      ...makeVectors(),
      social: { ...makeVectors().social, depth: 1.5 },
    }
    const inst = extractInstruction(makeRawData({ vectors: badVectors }))
    const report = validateInstructionIntegrity(inst)

    expect(report.valid).toBe(false)
    expect(report.issues.some((i) => i.includes("범위 초과"))).toBe(true)
  })

  it("immutableFacts 있으나 해시 없음 → 이슈", () => {
    const noHashFactbook: Factbook = { ...makeFactbook(), integrityHash: "" }
    const inst = extractInstruction(makeRawData({ factbook: noHashFactbook }))
    const report = validateInstructionIntegrity(inst)

    expect(report.valid).toBe(false)
    expect(report.issues.some((i) => i.includes("integrityHash"))).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// validateMemoryConsistency
// ══════════════════════════════════════════════════════════════

describe("validateMemoryConsistency", () => {
  it("정상 데이터 → valid", () => {
    const mem = extractMemory(makeRawData())
    const report = validateMemoryConsistency(mem)

    expect(report.valid).toBe(true)
    expect(report.issues).toHaveLength(0)
  })

  it("mood 범위 초과 → 이슈", () => {
    const mem = extractMemory(
      makeRawData({ state: { mood: 1.5, energy: 0.5, socialBattery: 0.5, paradoxTension: 0.5 } })
    )
    const report = validateMemoryConsistency(mem)

    expect(report.valid).toBe(false)
    expect(report.issues.some((i) => i.includes("mood"))).toBe(true)
  })

  it("과도한 mutableContext 변경 → 이슈", () => {
    const overChangedFactbook: Factbook = {
      ...makeFactbook(),
      mutableContext: [
        {
          id: "m1",
          category: "selfNarrative",
          content: "변경 많음",
          updatedAt: Date.now(),
          changeCount: 15,
        },
      ],
    }
    const mem = extractMemory(makeRawData({ factbook: overChangedFactbook }))
    const report = validateMemoryConsistency(mem)

    expect(report.valid).toBe(false)
    expect(report.issues.some((i) => i.includes("과도한 변경"))).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// summarizeDataArchitecture
// ══════════════════════════════════════════════════════════════

describe("summarizeDataArchitecture", () => {
  it("요약 문자열 포함 항목", () => {
    const raw = makeRawData()
    const inst = extractInstruction(raw)
    const mem = extractMemory(raw)
    const summary = summarizeDataArchitecture(inst, mem)

    expect(summary).toContain("리나 데이터 아키텍처 요약")
    expect(summary).toContain("[Instruction Layer]")
    expect(summary).toContain("[Memory Layer]")
    expect(summary).toContain("벡터: L1(7D) + L2(5D) + L3(4D) = 106D+")
    expect(summary).toContain("보이스: 정의됨")
    expect(summary).toContain("불변 사실: 2건")
    expect(summary).toContain("PASS")
  })
})

// ══════════════════════════════════════════════════════════════
// 불변성 검증
// ══════════════════════════════════════════════════════════════

describe("불변성", () => {
  it("extractInstruction → 원본 변경 없음", () => {
    const raw = makeRawData()
    const original = JSON.stringify(raw)
    extractInstruction(raw)
    expect(JSON.stringify(raw)).toBe(original)
  })

  it("extractMemory → 원본 변경 없음", () => {
    const raw = makeRawData()
    const original = JSON.stringify(raw)
    extractMemory(raw)
    expect(JSON.stringify(raw)).toBe(original)
  })

  it("detectInstructionChanges → 원본 변경 없음", () => {
    const raw = makeRawData()
    const before = extractInstruction(raw)
    const after = extractInstruction(makeRawData({ name: "미나" }))
    const beforeStr = JSON.stringify(before)
    detectInstructionChanges(before, after)
    expect(JSON.stringify(before)).toBe(beforeStr)
  })
})

// ══════════════════════════════════════════════════════════════
// 경계 접근 정책 완전성
// ══════════════════════════════════════════════════════════════

describe("접근 정책 완전성", () => {
  it("모든 정책에 description이 있음", () => {
    for (const policy of COMPONENT_ACCESS_POLICIES) {
      expect(policy.description.length).toBeGreaterThan(0)
    }
  })

  it("모든 정책에 유효한 allowedPatterns만 포함", () => {
    const validPatterns: DataAccessPattern[] = [
      "instruction_read",
      "instruction_write",
      "memory_read",
      "memory_write",
    ]
    for (const policy of COMPONENT_ACCESS_POLICIES) {
      for (const pattern of policy.allowedPatterns) {
        expect(validPatterns).toContain(pattern)
      }
    }
  })

  it("instruction_write는 admin/arena만 가능", () => {
    const writeComponents = COMPONENT_ACCESS_POLICIES.filter((p) =>
      p.allowedPatterns.includes("instruction_write")
    ).map((p) => p.component)

    expect(writeComponents).toContain("arena_correction")
    expect(writeComponents).toContain("admin_editor")
    expect(writeComponents).toHaveLength(2)
  })

  it("보안 컴포넌트는 write 권한 없음", () => {
    const securityComponents = ["integrity_monitor", "gate_guard", "output_sentinel"]
    for (const comp of securityComponents) {
      const result = validateAccess(comp, "instruction_write")
      expect(result.allowed).toBe(false)
      const memResult = validateAccess(comp, "memory_write")
      expect(memResult.allowed).toBe(false)
    }
  })
})
