import { describe, it, expect } from "vitest"
import {
  extractCorrectionSuggestions,
  buildStyleBookPatch,
  validatePatch,
  applyVoiceProfilePatch,
  applyStyleParamsPatch,
  applyFactbookPatch,
  executeCorrectionLoop,
  createStyleSnapshot,
  buildHistoryEntry,
  summarizeSnapshotDiff,
  detectOverCorrection,
  MAX_DAILY_CORRECTIONS,
  MAX_OPERATIONS_PER_PATCH,
  MAX_HABITUAL_EXPRESSIONS,
  MIN_CONFIDENCE_THRESHOLD,
  AUTO_APPLY_MAX_SEVERITY,
} from "@/lib/arena/correction-loop"
import type {
  StyleBookPatch,
  PersonaStyleSnapshot,
  CorrectionHistoryEntry,
} from "@/lib/arena/correction-loop"
import type { CorrectionRequest } from "@/lib/arena/arena-cost-control"
import type { ArenaJudgment, ArenaSession, TurnIssue } from "@/lib/arena/arena-engine"
import type { VoiceProfile, Factbook } from "@/types"
import type { VoiceStyleParams } from "@/lib/persona-world/types"

// ── 헬퍼 ────────────────────────────────────────────────────

function makeVoiceProfile(overrides: Partial<VoiceProfile> = {}): VoiceProfile {
  return {
    speechStyle: "정제된 학술적 어투로 논리적으로 표현",
    habitualExpressions: ["구조적으로 보면...", "핵심은 이거야."],
    physicalMannerisms: ["테이블을 두드림"],
    unconsciousBehaviors: ["며칠 후 진짜 의견 형성"],
    activationThresholds: { anger: 0.7, joy: 0.5 },
    ...overrides,
  }
}

function makeStyleParams(overrides: Partial<VoiceStyleParams> = {}): VoiceStyleParams {
  return {
    formality: 0.7,
    humor: 0.3,
    sentenceLength: 0.6,
    emotionExpression: 0.4,
    assertiveness: 0.5,
    vocabularyLevel: 0.6,
    ...overrides,
  }
}

function makeFactbook(overrides: Partial<Factbook> = {}): Factbook {
  return {
    immutableFacts: [
      {
        id: "fact-1",
        category: "origin",
        content: "서울 출생",
        createdAt: Date.now() - 100000,
      },
    ],
    mutableContext: [
      {
        id: "ctx-1",
        category: "selfNarrative",
        content: "현재 영화 비평에 관심",
        updatedAt: Date.now(),
        changeCount: 1,
      },
    ],
    integrityHash: "abc123",
    createdAt: Date.now() - 100000,
    updatedAt: Date.now(),
    ...overrides,
  }
}

function makeCorrection(overrides: Partial<CorrectionRequest> = {}): CorrectionRequest {
  return {
    id: "corr-1",
    sessionId: "session-1",
    turnNumber: 1,
    originalContent: "네.",
    correctedContent:
      "이 부분에 대해서는 '구조적으로 보면' 좀 더 깊이 있는 분석이 필요하다고 생각합니다.",
    issueCategory: "voice",
    reason: "말투가 너무 짧고 캐릭터 특유의 학술적 표현이 빠져있음",
    status: "APPROVED",
    createdAt: Date.now(),
    reviewedAt: Date.now(),
    reviewedBy: "admin-1",
    ...overrides,
  }
}

function makeSession(): ArenaSession {
  return {
    id: "session-1",
    mode: "SPARRING_1V1",
    participants: ["persona-a", "persona-b"],
    profileLoadLevel: "STANDARD",
    topic: "영화 토론",
    maxTurns: 6,
    budgetTokens: 10000,
    usedTokens: 500,
    status: "COMPLETED",
    turns: [
      {
        turnNumber: 1,
        speakerId: "persona-a",
        content: "네.",
        tokensUsed: 10,
        timestamp: Date.now(),
      },
      {
        turnNumber: 2,
        speakerId: "persona-b",
        content: "이 영화는 서사적으로 풍부한 작품입니다.",
        tokensUsed: 100,
        timestamp: Date.now(),
      },
    ],
    createdAt: Date.now(),
    completedAt: Date.now(),
  }
}

function makeJudgment(issues: TurnIssue[] = []): ArenaJudgment {
  return {
    sessionId: "session-1",
    scores: {
      characterConsistency: 0.6,
      l2Emergence: 0.5,
      paradoxEmergence: 0.5,
      triggerResponse: 0.7,
    },
    overallScore: 0.58,
    issues,
    summary: "테스트 판정",
    judgedAt: Date.now(),
  }
}

function makePatch(overrides: Partial<StyleBookPatch> = {}): StyleBookPatch {
  return {
    correctionId: "corr-1",
    sessionId: "session-1",
    turnNumber: 1,
    category: "voice",
    operations: [
      {
        field: "voiceProfile.speechStyle",
        action: "replace",
        oldValue: "기존 스타일",
        newValue: "수정된 스타일",
        reason: "테스트",
      },
    ],
    confidence: 0.7,
    createdAt: Date.now(),
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// extractCorrectionSuggestions
// ═══════════════════════════════════════════════════════════════

describe("extractCorrectionSuggestions", () => {
  it("이슈 없으면 빈 배열", () => {
    const judgment = makeJudgment([])
    const session = makeSession()
    const suggestions = extractCorrectionSuggestions(judgment, session)
    expect(suggestions).toHaveLength(0)
  })

  it("voice 이슈 → voice 제안", () => {
    const issues: TurnIssue[] = [
      {
        turnNumber: 1,
        personaId: "persona-a",
        category: "voice",
        severity: "major",
        description: "말투 불일치",
        suggestion: "학술적 어투 유지",
      },
    ]
    const suggestions = extractCorrectionSuggestions(makeJudgment(issues), makeSession())
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].category).toBe("voice")
    expect(suggestions[0].autoApplicable).toBe(false) // major → not auto
  })

  it("consistency 이슈 → consistency 제안", () => {
    const issues: TurnIssue[] = [
      {
        turnNumber: 1,
        personaId: "persona-a",
        category: "consistency",
        severity: "minor",
        description: "짧은 응답",
        suggestion: "표현 보강",
      },
    ]
    const suggestions = extractCorrectionSuggestions(makeJudgment(issues), makeSession())
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].category).toBe("consistency")
    expect(suggestions[0].autoApplicable).toBe(true) // minor → auto
  })

  it("여러 이슈 → 여러 제안", () => {
    const issues: TurnIssue[] = [
      {
        turnNumber: 1,
        personaId: "persona-a",
        category: "voice",
        severity: "major",
        description: "말투",
        suggestion: "개선",
      },
      {
        turnNumber: 2,
        personaId: "persona-b",
        category: "l2",
        severity: "minor",
        description: "L2 부족",
        suggestion: "개선",
      },
    ]
    const suggestions = extractCorrectionSuggestions(makeJudgment(issues), makeSession())
    expect(suggestions).toHaveLength(2)
  })

  it("minor 이슈만 autoApplicable", () => {
    expect(AUTO_APPLY_MAX_SEVERITY).toBe("minor")
  })
})

// ═══════════════════════════════════════════════════════════════
// buildStyleBookPatch
// ═══════════════════════════════════════════════════════════════

describe("buildStyleBookPatch", () => {
  it("voice 교정 → speechStyle + habitualExpressions 패치", () => {
    const correction = makeCorrection({ issueCategory: "voice" })
    const patch = buildStyleBookPatch(correction, makeVoiceProfile(), makeStyleParams())
    expect(patch.category).toBe("voice")
    expect(patch.operations.length).toBeGreaterThan(0)
    expect(patch.operations.some((op) => op.field.includes("voiceProfile"))).toBe(true)
  })

  it("consistency 교정 → factbook 패치", () => {
    const correction = makeCorrection({ issueCategory: "consistency" })
    const patch = buildStyleBookPatch(correction, makeVoiceProfile(), makeStyleParams())
    expect(patch.category).toBe("consistency")
    expect(patch.operations.some((op) => op.field.includes("factbook"))).toBe(true)
  })

  it("l2 교정 → emotionExpression 패치", () => {
    const correction = makeCorrection({ issueCategory: "l2" })
    const patch = buildStyleBookPatch(correction, makeVoiceProfile(), makeStyleParams())
    expect(patch.operations.some((op) => op.field.includes("emotionExpression"))).toBe(true)
  })

  it("paradox 교정 → assertiveness 패치", () => {
    const correction = makeCorrection({ issueCategory: "paradox" })
    const patch = buildStyleBookPatch(correction, makeVoiceProfile(), makeStyleParams())
    expect(patch.operations.some((op) => op.field.includes("assertiveness"))).toBe(true)
  })

  it("trigger 교정 → triggerMap 패치", () => {
    const correction = makeCorrection({ issueCategory: "trigger" })
    const patch = buildStyleBookPatch(correction, makeVoiceProfile(), makeStyleParams())
    expect(patch.operations.some((op) => op.field.includes("triggerMap"))).toBe(true)
  })

  it("confidence 계산 포함", () => {
    const correction = makeCorrection()
    const patch = buildStyleBookPatch(correction, makeVoiceProfile(), makeStyleParams())
    expect(patch.confidence).toBeGreaterThan(0)
    expect(patch.confidence).toBeLessThanOrEqual(1)
  })

  it("교정 내용이 원본과 같으면 낮은 confidence", () => {
    const correction = makeCorrection({
      originalContent: "동일한 내용",
      correctedContent: "동일한 내용",
    })
    const patch = buildStyleBookPatch(correction, makeVoiceProfile(), makeStyleParams())
    expect(patch.confidence).toBeLessThan(0.7)
  })

  it("교정 내용이 짧으면 낮은 confidence", () => {
    const correction = makeCorrection({ correctedContent: "짧음" })
    const patch = buildStyleBookPatch(correction, makeVoiceProfile(), makeStyleParams())
    const normalCorrection = makeCorrection()
    const normalPatch = buildStyleBookPatch(normalCorrection, makeVoiceProfile(), makeStyleParams())
    expect(patch.confidence).toBeLessThan(normalPatch.confidence)
  })

  it("MAX_OPERATIONS_PER_PATCH 초과 방지", () => {
    const correction = makeCorrection()
    const patch = buildStyleBookPatch(correction, makeVoiceProfile(), makeStyleParams())
    expect(patch.operations.length).toBeLessThanOrEqual(MAX_OPERATIONS_PER_PATCH)
  })
})

// ═══════════════════════════════════════════════════════════════
// validatePatch
// ═══════════════════════════════════════════════════════════════

describe("validatePatch", () => {
  it("유효한 패치 → valid true", () => {
    const patch = makePatch({ confidence: 0.7 })
    const result = validatePatch(patch, makeVoiceProfile(), 0)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("낮은 confidence → invalid", () => {
    const patch = makePatch({ confidence: 0.1 })
    const result = validatePatch(patch, makeVoiceProfile(), 0)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("확신도"))).toBe(true)
  })

  it("일일 교정 한도 초과 → invalid", () => {
    const patch = makePatch()
    const result = validatePatch(patch, makeVoiceProfile(), MAX_DAILY_CORRECTIONS)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("일일 교정 한도"))).toBe(true)
  })

  it("빈 오퍼레이션 → invalid", () => {
    const patch = makePatch({ operations: [] })
    const result = validatePatch(patch, makeVoiceProfile(), 0)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("오퍼레이션이 없습니다"))).toBe(true)
  })

  it("speechStyle 500자 초과 → invalid", () => {
    const patch = makePatch({
      operations: [
        {
          field: "voiceProfile.speechStyle",
          action: "replace",
          oldValue: "짧은",
          newValue: "가".repeat(501),
          reason: "테스트",
        },
      ],
    })
    const result = validatePatch(patch, makeVoiceProfile(), 0)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("speechStyle 길이"))).toBe(true)
  })

  it("습관 표현 상한 초과 → invalid", () => {
    const patch = makePatch({
      operations: [
        {
          field: "voiceProfile.habitualExpressions",
          action: "append",
          oldValue: [],
          newValue: Array.from({ length: MAX_HABITUAL_EXPRESSIONS + 1 }, (_, i) => `표현${i}`),
          reason: "테스트",
        },
      ],
    })
    const result = validatePatch(patch, makeVoiceProfile(), 0)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("습관 표현 상한"))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// applyVoiceProfilePatch
// ═══════════════════════════════════════════════════════════════

describe("applyVoiceProfilePatch", () => {
  it("speechStyle 교체", () => {
    const patch = makePatch({
      operations: [
        {
          field: "voiceProfile.speechStyle",
          action: "replace",
          oldValue: null,
          newValue: "새로운 말투 스타일",
          reason: "교정",
        },
      ],
    })
    const result = applyVoiceProfilePatch(makeVoiceProfile(), patch)
    expect(result.speechStyle).toBe("새로운 말투 스타일")
  })

  it("habitualExpressions 추가", () => {
    const patch = makePatch({
      operations: [
        {
          field: "voiceProfile.habitualExpressions",
          action: "append",
          oldValue: [],
          newValue: ["구조적으로 보면...", "핵심은 이거야.", "사실상..."],
          reason: "교정",
        },
      ],
    })
    const result = applyVoiceProfilePatch(makeVoiceProfile(), patch)
    expect(result.habitualExpressions).toContain("사실상...")
  })

  it("habitualExpressions 삭제", () => {
    const patch = makePatch({
      operations: [
        {
          field: "voiceProfile.habitualExpressions",
          action: "remove",
          oldValue: "핵심은 이거야.",
          newValue: null,
          reason: "불필요한 표현 제거",
        },
      ],
    })
    const result = applyVoiceProfilePatch(makeVoiceProfile(), patch)
    expect(result.habitualExpressions).not.toContain("핵심은 이거야.")
  })

  it("관련 없는 패치 → 변경 없음", () => {
    const patch = makePatch({
      operations: [
        {
          field: "styleParams.formality",
          action: "adjust",
          oldValue: 0.7,
          newValue: 0.8,
          reason: "테스트",
        },
      ],
    })
    const original = makeVoiceProfile()
    const result = applyVoiceProfilePatch(original, patch)
    expect(result.speechStyle).toBe(original.speechStyle)
  })

  it("불변성 유지", () => {
    const original = makeVoiceProfile()
    const patch = makePatch({
      operations: [
        {
          field: "voiceProfile.speechStyle",
          action: "replace",
          oldValue: null,
          newValue: "변경됨",
          reason: "테스트",
        },
      ],
    })
    applyVoiceProfilePatch(original, patch)
    expect(original.speechStyle).toBe("정제된 학술적 어투로 논리적으로 표현")
  })

  it("MAX_HABITUAL_EXPRESSIONS 초과 시 잘림", () => {
    const longList = Array.from({ length: 15 }, (_, i) => `표현${i}`)
    const patch = makePatch({
      operations: [
        {
          field: "voiceProfile.habitualExpressions",
          action: "append",
          oldValue: [],
          newValue: longList,
          reason: "테스트",
        },
      ],
    })
    const result = applyVoiceProfilePatch(makeVoiceProfile(), patch)
    expect(result.habitualExpressions.length).toBeLessThanOrEqual(MAX_HABITUAL_EXPRESSIONS)
  })
})

// ═══════════════════════════════════════════════════════════════
// applyStyleParamsPatch
// ═══════════════════════════════════════════════════════════════

describe("applyStyleParamsPatch", () => {
  it("emotionExpression 조정", () => {
    const patch = makePatch({
      operations: [
        {
          field: "styleParams.emotionExpression",
          action: "adjust",
          oldValue: 0.4,
          newValue: 0.45,
          reason: "L2 발현 보강",
        },
      ],
    })
    const result = applyStyleParamsPatch(makeStyleParams(), patch)
    expect(result.emotionExpression).toBe(0.45)
  })

  it("assertiveness 교체", () => {
    const patch = makePatch({
      operations: [
        {
          field: "styleParams.assertiveness",
          action: "replace",
          oldValue: 0.5,
          newValue: 0.6,
          reason: "역설 발현 강화",
        },
      ],
    })
    const result = applyStyleParamsPatch(makeStyleParams(), patch)
    expect(result.assertiveness).toBe(0.6)
  })

  it("0~1 범위 클램핑", () => {
    const patch = makePatch({
      operations: [
        {
          field: "styleParams.formality",
          action: "adjust",
          oldValue: 0.9,
          newValue: 1.5,
          reason: "테스트",
        },
      ],
    })
    const result = applyStyleParamsPatch(makeStyleParams(), patch)
    expect(result.formality).toBe(1.0)
  })

  it("음수 클램핑", () => {
    const patch = makePatch({
      operations: [
        {
          field: "styleParams.humor",
          action: "adjust",
          oldValue: 0.1,
          newValue: -0.2,
          reason: "테스트",
        },
      ],
    })
    const result = applyStyleParamsPatch(makeStyleParams(), patch)
    expect(result.humor).toBe(0)
  })

  it("관련 없는 필드 → 무시", () => {
    const patch = makePatch({
      operations: [
        {
          field: "voiceProfile.speechStyle",
          action: "replace",
          oldValue: null,
          newValue: "변경",
          reason: "테스트",
        },
      ],
    })
    const original = makeStyleParams()
    const result = applyStyleParamsPatch(original, patch)
    expect(result.formality).toBe(original.formality)
  })

  it("불변성 유지", () => {
    const original = makeStyleParams({ emotionExpression: 0.4 })
    const patch = makePatch({
      operations: [
        {
          field: "styleParams.emotionExpression",
          action: "adjust",
          oldValue: 0.4,
          newValue: 0.9,
          reason: "테스트",
        },
      ],
    })
    applyStyleParamsPatch(original, patch)
    expect(original.emotionExpression).toBe(0.4)
  })
})

// ═══════════════════════════════════════════════════════════════
// applyFactbookPatch
// ═══════════════════════════════════════════════════════════════

describe("applyFactbookPatch", () => {
  it("mutableContext 추가", () => {
    const factbook = makeFactbook()
    const patch = makePatch({
      category: "consistency",
      operations: [
        {
          field: "factbook.mutableContext",
          action: "append",
          oldValue: null,
          newValue: "아레나에서 발견된 새로운 관점",
          reason: "교정",
        },
      ],
    })
    const result = applyFactbookPatch(factbook, patch)
    expect(result.mutableContext.length).toBe(factbook.mutableContext.length + 1)
    expect(result.mutableContext[result.mutableContext.length - 1].category).toBe(
      "evolvedPerspective"
    )
  })

  it("updatedAt 갱신", () => {
    const factbook = makeFactbook({ updatedAt: Date.now() - 10000 })
    const patch = makePatch({
      operations: [
        {
          field: "factbook.mutableContext",
          action: "append",
          oldValue: null,
          newValue: "새 맥락",
          reason: "교정",
        },
      ],
    })
    const result = applyFactbookPatch(factbook, patch)
    expect(result.updatedAt).toBeGreaterThan(factbook.updatedAt)
  })

  it("immutableFacts 변경 없음", () => {
    const factbook = makeFactbook()
    const patch = makePatch({
      operations: [
        {
          field: "factbook.mutableContext",
          action: "append",
          oldValue: null,
          newValue: "새 맥락",
          reason: "교정",
        },
      ],
    })
    const result = applyFactbookPatch(factbook, patch)
    expect(result.immutableFacts).toEqual(factbook.immutableFacts)
    expect(result.integrityHash).toBe(factbook.integrityHash)
  })

  it("관련 없는 오퍼레이션 → 변경 없음 (mutableContext 수 동일)", () => {
    const factbook = makeFactbook()
    const patch = makePatch({
      operations: [
        {
          field: "voiceProfile.speechStyle",
          action: "replace",
          oldValue: null,
          newValue: "변경",
          reason: "테스트",
        },
      ],
    })
    const result = applyFactbookPatch(factbook, patch)
    expect(result.mutableContext.length).toBe(factbook.mutableContext.length)
  })

  it("불변성 유지", () => {
    const factbook = makeFactbook()
    const originalLength = factbook.mutableContext.length
    const patch = makePatch({
      operations: [
        {
          field: "factbook.mutableContext",
          action: "append",
          oldValue: null,
          newValue: "추가",
          reason: "테스트",
        },
      ],
    })
    applyFactbookPatch(factbook, patch)
    expect(factbook.mutableContext.length).toBe(originalLength)
  })
})

// ═══════════════════════════════════════════════════════════════
// executeCorrectionLoop
// ═══════════════════════════════════════════════════════════════

describe("executeCorrectionLoop", () => {
  it("정상 교정 루프 → applied true", () => {
    const result = executeCorrectionLoop(
      makeCorrection(),
      makeVoiceProfile(),
      makeStyleParams(),
      makeFactbook(),
      0
    )
    expect(result.applied).toBe(true)
    expect(result.validationErrors).toHaveLength(0)
    expect(result.updatedSnapshot).not.toBeNull()
  })

  it("factbook null → 정상 동작", () => {
    const result = executeCorrectionLoop(
      makeCorrection(),
      makeVoiceProfile(),
      makeStyleParams(),
      null,
      0
    )
    expect(result.applied).toBe(true)
  })

  it("일일 한도 초과 → applied false", () => {
    const result = executeCorrectionLoop(
      makeCorrection(),
      makeVoiceProfile(),
      makeStyleParams(),
      makeFactbook(),
      MAX_DAILY_CORRECTIONS
    )
    expect(result.applied).toBe(false)
    expect(result.validationErrors.length).toBeGreaterThan(0)
  })

  it("업데이트 스냅샷 포함", () => {
    const result = executeCorrectionLoop(
      makeCorrection(),
      makeVoiceProfile(),
      makeStyleParams(),
      makeFactbook(),
      0
    )
    expect(result.updatedSnapshot).not.toBeNull()
    expect(result.updatedSnapshot!.voiceProfile).toBeDefined()
    expect(result.updatedSnapshot!.styleParams).toBeDefined()
  })

  it("consistency 교정 → factbookContextCount 증가", () => {
    const factbook = makeFactbook()
    const result = executeCorrectionLoop(
      makeCorrection({ issueCategory: "consistency" }),
      makeVoiceProfile(),
      makeStyleParams(),
      factbook,
      0
    )
    expect(result.applied).toBe(true)
    if (result.updatedSnapshot) {
      expect(result.updatedSnapshot.factbookContextCount).toBeGreaterThanOrEqual(
        factbook.mutableContext.length
      )
    }
  })

  it("l2 교정 → emotionExpression 변경", () => {
    const params = makeStyleParams({ emotionExpression: 0.4 })
    const result = executeCorrectionLoop(
      makeCorrection({ issueCategory: "l2" }),
      makeVoiceProfile(),
      params,
      null,
      0
    )
    expect(result.applied).toBe(true)
    if (result.updatedSnapshot) {
      expect(result.updatedSnapshot.styleParams.emotionExpression).not.toBe(0.4)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 스냅샷 및 이력
// ═══════════════════════════════════════════════════════════════

describe("createStyleSnapshot", () => {
  it("스냅샷 생성", () => {
    const snapshot = createStyleSnapshot(makeVoiceProfile(), makeStyleParams(), makeFactbook(), 3)
    expect(snapshot.voiceProfile.speechStyle).toBeDefined()
    expect(snapshot.styleParams.formality).toBeDefined()
    expect(snapshot.factbookContextCount).toBe(1)
    expect(snapshot.triggerRuleCount).toBe(3)
    expect(snapshot.snapshotAt).toBeGreaterThan(0)
  })

  it("factbook null → contextCount 0", () => {
    const snapshot = createStyleSnapshot(makeVoiceProfile(), makeStyleParams(), null, 0)
    expect(snapshot.factbookContextCount).toBe(0)
  })
})

describe("summarizeSnapshotDiff", () => {
  it("동일 스냅샷 → 변경 없음", () => {
    const snapshot = createStyleSnapshot(makeVoiceProfile(), makeStyleParams(), makeFactbook(), 0)
    const diffs = summarizeSnapshotDiff(snapshot, snapshot)
    expect(diffs).toContain("변경 사항 없음")
  })

  it("speechStyle 변경 감지", () => {
    const before = createStyleSnapshot(makeVoiceProfile(), makeStyleParams(), null, 0)
    const after = createStyleSnapshot(
      makeVoiceProfile({ speechStyle: "변경된 스타일" }),
      makeStyleParams(),
      null,
      0
    )
    const diffs = summarizeSnapshotDiff(before, after)
    expect(diffs.some((d) => d.includes("speechStyle"))).toBe(true)
  })

  it("styleParams 변경 감지", () => {
    const before = createStyleSnapshot(makeVoiceProfile(), makeStyleParams(), null, 0)
    const after = createStyleSnapshot(
      makeVoiceProfile(),
      makeStyleParams({ formality: 0.9 }),
      null,
      0
    )
    const diffs = summarizeSnapshotDiff(before, after)
    expect(diffs.some((d) => d.includes("formality"))).toBe(true)
  })

  it("factbookContext 변경 감지", () => {
    const before = createStyleSnapshot(makeVoiceProfile(), makeStyleParams(), makeFactbook(), 0)
    const moreContexts = makeFactbook({
      mutableContext: [
        ...makeFactbook().mutableContext,
        {
          id: "ctx-2",
          category: "evolvedPerspective",
          content: "추가",
          updatedAt: Date.now(),
          changeCount: 1,
        },
      ],
    })
    const after = createStyleSnapshot(makeVoiceProfile(), makeStyleParams(), moreContexts, 0)
    const diffs = summarizeSnapshotDiff(before, after)
    expect(diffs.some((d) => d.includes("factbookContext"))).toBe(true)
  })
})

describe("buildHistoryEntry", () => {
  it("이력 엔트리 생성", () => {
    const before = createStyleSnapshot(makeVoiceProfile(), makeStyleParams(), null, 0)
    const after = createStyleSnapshot(
      makeVoiceProfile({ speechStyle: "변경" }),
      makeStyleParams(),
      null,
      0
    )
    const loopResult = executeCorrectionLoop(
      makeCorrection(),
      makeVoiceProfile(),
      makeStyleParams(),
      null,
      0
    )
    const entry = buildHistoryEntry(loopResult, before, after)
    expect(entry.correctionId).toBe("corr-1")
    expect(entry.sessionId).toBe("session-1")
    expect(entry.beforeSnapshot).toBe(before)
    expect(entry.afterSnapshot).toBe(after)
  })
})

// ═══════════════════════════════════════════════════════════════
// detectOverCorrection
// ═══════════════════════════════════════════════════════════════

describe("detectOverCorrection", () => {
  function makeHistoryEntries(
    count: number,
    category: "voice" | "consistency" = "voice"
  ): CorrectionHistoryEntry[] {
    return Array.from({ length: count }, (_, i) => ({
      correctionId: `corr-${i}`,
      sessionId: `session-${i}`,
      category,
      patchOperations: 1,
      appliedAt: Date.now() - (count - i) * 1000, // 최근 entries
      beforeSnapshot: createStyleSnapshot(makeVoiceProfile(), makeStyleParams(), null, 0),
      afterSnapshot: createStyleSnapshot(makeVoiceProfile(), makeStyleParams(), null, 0),
    }))
  }

  it("적은 교정 → 과교정 아님", () => {
    const result = detectOverCorrection(makeHistoryEntries(2))
    expect(result.detected).toBe(false)
  })

  it("MAX_DAILY_CORRECTIONS 도달 → 과교정 감지", () => {
    const result = detectOverCorrection(makeHistoryEntries(MAX_DAILY_CORRECTIONS))
    expect(result.detected).toBe(true)
    expect(result.reason).toContain(`${MAX_DAILY_CORRECTIONS}회 교정`)
  })

  it("동일 카테고리 3회 연속 → 과교정 감지", () => {
    const result = detectOverCorrection(makeHistoryEntries(3, "voice"))
    expect(result.detected).toBe(true)
    expect(result.reason).toContain("동일 카테고리")
  })

  it("다른 카테고리 3회 → 과교정 아님", () => {
    const entries: CorrectionHistoryEntry[] = [
      ...makeHistoryEntries(1, "voice"),
      ...makeHistoryEntries(1, "consistency"),
      ...makeHistoryEntries(1, "voice"),
    ]
    const result = detectOverCorrection(entries)
    expect(result.detected).toBe(false)
  })

  it("24시간 이전 기록 → 무시", () => {
    const oldEntries = makeHistoryEntries(MAX_DAILY_CORRECTIONS, "voice").map((e) => ({
      ...e,
      appliedAt: Date.now() - 25 * 60 * 60 * 1000, // 25시간 전
    }))
    const result = detectOverCorrection(oldEntries)
    expect(result.detected).toBe(false)
  })

  it("빈 이력 → 과교정 아님", () => {
    const result = detectOverCorrection([])
    expect(result.detected).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("MAX_DAILY_CORRECTIONS > 0", () => {
    expect(MAX_DAILY_CORRECTIONS).toBeGreaterThan(0)
  })

  it("MAX_OPERATIONS_PER_PATCH > 0", () => {
    expect(MAX_OPERATIONS_PER_PATCH).toBeGreaterThan(0)
  })

  it("MIN_CONFIDENCE_THRESHOLD 0~1 범위", () => {
    expect(MIN_CONFIDENCE_THRESHOLD).toBeGreaterThan(0)
    expect(MIN_CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(1)
  })

  it("MAX_HABITUAL_EXPRESSIONS > 0", () => {
    expect(MAX_HABITUAL_EXPRESSIONS).toBeGreaterThan(0)
  })
})
