import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  applyAndTrackCorrection,
  processQualityTriggers,
  evaluatePendingCorrections,
  summarizeCorrectionEffectiveness,
} from "@/lib/persona-world/quality/arena-feedback"
import type { ArenaFeedbackDataProvider } from "@/lib/persona-world/quality/arena-feedback"
import type { CorrectionRequest } from "@/lib/arena/arena-cost-control"
import type { ArenaTrigger, CorrectionTracking } from "@/lib/persona-world/quality/arena-bridge"

// ── vi.mock ──────────────────────────────────────────────────

vi.mock("@/lib/arena/correction-loop", () => ({
  executeCorrectionLoop: vi.fn(),
  createStyleSnapshot: vi.fn(() => ({
    voiceProfile: {
      speechStyle: "before",
      habitualExpressions: [],
      physicalMannerisms: [],
      unconsciousBehaviors: [],
      activationThresholds: {},
    },
    styleParams: {
      formality: 0.5,
      humor: 0.5,
      sentenceLength: 0.5,
      emotionExpression: 0.5,
      assertiveness: 0.5,
      vocabularyLevel: 0.5,
    },
    factbookContextCount: 0,
    triggerRuleCount: 0,
    snapshotAt: Date.now(),
  })),
  buildHistoryEntry: vi.fn(() => ({
    correctionId: "corr-1",
    sessionId: "sess-1",
    category: "voice",
    patchOperations: 1,
    appliedAt: Date.now(),
    beforeSnapshot: {},
    afterSnapshot: {},
  })),
}))

// ── 헬퍼 ────────────────────────────────────────────────────

function createMockProvider(
  overrides?: Partial<ArenaFeedbackDataProvider>
): ArenaFeedbackDataProvider {
  return {
    getPersonaInstruction: vi.fn().mockResolvedValue({
      voiceProfile: {
        speechStyle: "~해요체",
        habitualExpressions: ["그런데 말이야"],
        physicalMannerisms: [],
        unconsciousBehaviors: [],
        activationThresholds: {},
      },
      voiceStyleParams: {
        formality: 0.5,
        humor: 0.5,
        sentenceLength: 0.5,
        emotionExpression: 0.5,
        assertiveness: 0.5,
        vocabularyLevel: 0.5,
      },
      factbook: null,
    }),
    getDailyCorrectionCount: vi.fn().mockResolvedValue(0),
    updatePersonaInstruction: vi.fn().mockResolvedValue(undefined),
    saveCorrectionTracking: vi.fn().mockResolvedValue(undefined),
    getPendingTrackings: vi.fn().mockResolvedValue([]),
    updateCorrectionTracking: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeCorrection(overrides?: Partial<CorrectionRequest>): CorrectionRequest {
  return {
    id: "corr-1",
    sessionId: "sess-1",
    turnNumber: 3,
    originalContent: "원본 텍스트",
    correctedContent: "교정 교정된 텍스트입니다 충분히 긴 교정 내용이 들어갑니다",
    issueCategory: "voice",
    reason: "보이스 일관성 부족 — 교정 사유가 충분히 구체적으로 작성되었습니다",
    status: "APPROVED",
    createdAt: Date.now(),
    reviewedAt: Date.now(),
    reviewedBy: "admin-1",
    ...overrides,
  }
}

function makeTrigger(overrides?: Partial<ArenaTrigger>): ArenaTrigger {
  return {
    type: "PIS_CRITICAL",
    priority: "CRITICAL",
    maxDelayHours: 0,
    personaId: "p-1",
    reason: "PIS 0.45 < 0.60",
    detectedAt: new Date(),
    ...overrides,
  }
}

function makeTracking(overrides?: Partial<CorrectionTracking>): CorrectionTracking {
  return {
    correctionId: "corr-1",
    personaId: "p-1",
    before: {
      pis: 0.55,
      failedDimensions: ["stance", "depth"],
      triggeredBy: "PIS_CRITICAL",
    },
    correction: {
      arenaSessionId: "sess-1",
      patchCategories: ["voice"],
      appliedAt: new Date(),
      approvedBy: "admin-1",
    },
    ...overrides,
  }
}

// ── 테스트 ──────────────────────────────────────────────────

describe("arena-feedback: applyAndTrackCorrection", () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // 기본: executeCorrectionLoop가 패치 적용 성공 반환
    const { executeCorrectionLoop } = await import("@/lib/arena/correction-loop")
    vi.mocked(executeCorrectionLoop).mockReturnValue({
      correctionId: "corr-1",
      sessionId: "sess-1",
      patch: {
        correctionId: "corr-1",
        sessionId: "sess-1",
        turnNumber: 3,
        category: "voice",
        operations: [
          {
            field: "voiceProfile.speechStyle",
            action: "replace",
            oldValue: "~해요체",
            newValue: "~해요체 (아레나 교정)",
            reason: "test",
          },
        ],
        confidence: 0.85,
        createdAt: Date.now(),
      },
      applied: true,
      validationErrors: [],
      updatedSnapshot: {
        voiceProfile: {
          speechStyle: "~해요체 (교정됨)",
          habitualExpressions: [],
          physicalMannerisms: [],
          unconsciousBehaviors: [],
          activationThresholds: {},
        },
        styleParams: {
          formality: 0.5,
          humor: 0.5,
          sentenceLength: 0.5,
          emotionExpression: 0.55,
          assertiveness: 0.5,
          vocabularyLevel: 0.5,
        },
        factbookContextCount: 0,
        triggerRuleCount: 0,
        snapshotAt: Date.now(),
      },
      appliedAt: Date.now(),
    })
  })

  it("교정 적용 성공 → DB 업데이트 + CorrectionTracking 생성", async () => {
    const provider = createMockProvider()

    const result = await applyAndTrackCorrection(
      {
        correction: makeCorrection(),
        personaId: "p-1",
        triggeredBy: "PIS_CRITICAL",
        beforePIS: 0.55,
        failedDimensions: ["stance"],
        arenaSessionId: "sess-1",
        approvedBy: "admin-1",
      },
      provider
    )

    expect(result.applied).toBe(true)
    expect(provider.updatePersonaInstruction).toHaveBeenCalledWith(
      "p-1",
      expect.objectContaining({
        voiceProfile: expect.objectContaining({ speechStyle: "~해요체 (교정됨)" }),
      })
    )
    expect(provider.saveCorrectionTracking).toHaveBeenCalledWith(
      expect.objectContaining({
        correctionId: "corr-1",
        personaId: "p-1",
        before: expect.objectContaining({ pis: 0.55 }),
      })
    )
    expect(result.historyEntry).not.toBeNull()
  })

  it("검증 실패(confidence 부족) → applied=false, DB 미업데이트", async () => {
    const { executeCorrectionLoop } = await import("@/lib/arena/correction-loop")
    vi.mocked(executeCorrectionLoop).mockReturnValue({
      correctionId: "corr-1",
      sessionId: "sess-1",
      patch: {
        correctionId: "corr-1",
        sessionId: "sess-1",
        turnNumber: 3,
        category: "voice",
        operations: [],
        confidence: 0.3,
        createdAt: Date.now(),
      },
      applied: false,
      validationErrors: ["교정 확신도 부족: 0.3 < 0.7"],
      updatedSnapshot: null,
      appliedAt: Date.now(),
    })

    const provider = createMockProvider()

    const result = await applyAndTrackCorrection(
      {
        correction: makeCorrection(),
        personaId: "p-1",
        triggeredBy: "PIS_CRITICAL",
        beforePIS: 0.55,
        failedDimensions: [],
        arenaSessionId: "sess-1",
        approvedBy: "admin-1",
      },
      provider
    )

    expect(result.applied).toBe(false)
    expect(provider.updatePersonaInstruction).not.toHaveBeenCalled()
    // 실패해도 CorrectionTracking은 기록 (추적 목적)
    expect(provider.saveCorrectionTracking).toHaveBeenCalled()
    expect(result.historyEntry).toBeNull()
  })

  it("voiceProfile null → 기본값으로 교정 실행", async () => {
    const provider = createMockProvider({
      getPersonaInstruction: vi.fn().mockResolvedValue({
        voiceProfile: null,
        voiceStyleParams: null,
        factbook: null,
      }),
    })

    const result = await applyAndTrackCorrection(
      {
        correction: makeCorrection(),
        personaId: "p-1",
        triggeredBy: "INTERVIEW_FAIL",
        beforePIS: 0.65,
        failedDimensions: [],
        arenaSessionId: "sess-1",
        approvedBy: "admin-1",
      },
      provider
    )

    // 기본값으로 executeCorrectionLoop 호출됨
    const { executeCorrectionLoop } = await import("@/lib/arena/correction-loop")
    expect(executeCorrectionLoop).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ speechStyle: "" }), // DEFAULT_VOICE_PROFILE
      expect.objectContaining({ formality: 0.5 }), // DEFAULT_STYLE_PARAMS
      null,
      0
    )

    expect(result.applied).toBe(true)
  })

  it("일일 교정 횟수 provider에서 조회", async () => {
    const provider = createMockProvider({
      getDailyCorrectionCount: vi.fn().mockResolvedValue(3),
    })

    await applyAndTrackCorrection(
      {
        correction: makeCorrection(),
        personaId: "p-1",
        triggeredBy: "PIS_CRITICAL",
        beforePIS: 0.55,
        failedDimensions: [],
        arenaSessionId: "sess-1",
        approvedBy: "admin-1",
      },
      provider
    )

    const { executeCorrectionLoop } = await import("@/lib/arena/correction-loop")
    // dailyCorrectionCount=3이 전달됨 (5번째 인자)
    const callArgs = vi.mocked(executeCorrectionLoop).mock.calls[0]
    expect(callArgs[4]).toBe(3)
  })
})

describe("arena-feedback: processQualityTriggers", () => {
  it("빈 트리거 → processed=0", () => {
    const result = processQualityTriggers([])
    expect(result.processed).toBe(0)
    expect(result.criticalCount).toBe(0)
    expect(result.triggers).toHaveLength(0)
  })

  it("CRITICAL 트리거 카운트", () => {
    const triggers: ArenaTrigger[] = [
      makeTrigger({ type: "PIS_CRITICAL", priority: "CRITICAL" }),
      makeTrigger({ type: "PIS_DROP_SUDDEN", priority: "HIGH", personaId: "p-2" }),
      makeTrigger({ type: "BOT_PATTERN_DETECTED", priority: "HIGH", personaId: "p-3" }),
    ]

    const result = processQualityTriggers(triggers)
    expect(result.processed).toBe(3)
    expect(result.criticalCount).toBe(1)
    expect(result.triggers).toHaveLength(3)
  })

  it("트리거 정보(personaId, type, priority) 보존", () => {
    const triggers: ArenaTrigger[] = [
      makeTrigger({ type: "FACTBOOK_VIOLATION", priority: "MEDIUM", personaId: "p-5" }),
    ]

    const result = processQualityTriggers(triggers)
    expect(result.triggers[0]).toEqual({
      personaId: "p-5",
      type: "FACTBOOK_VIOLATION",
      priority: "MEDIUM",
    })
  })
})

describe("arena-feedback: evaluatePendingCorrections", () => {
  it("미평가 교정이 없으면 빈 결과", async () => {
    const provider = createMockProvider({
      getPendingTrackings: vi.fn().mockResolvedValue([]),
    })

    const result = await evaluatePendingCorrections("p-1", 0.75, [], [], provider)
    expect(result.evaluated).toBe(0)
    expect(result.verdicts).toHaveLength(0)
  })

  it("PIS 개선 > 0.05 → EFFECTIVE verdict", async () => {
    const tracking = makeTracking() // before.pis = 0.55

    const provider = createMockProvider({
      getPendingTrackings: vi.fn().mockResolvedValue([tracking]),
    })

    const result = await evaluatePendingCorrections(
      "p-1",
      0.75, // afterPIS: 0.75 - 0.55 = 0.20 > 0.05
      ["stance"],
      [],
      provider
    )

    expect(result.evaluated).toBe(1)
    expect(result.verdicts[0].verdict).toBe("EFFECTIVE")
    expect(result.verdicts[0].improvement).toBe(0.2)
    expect(provider.updateCorrectionTracking).toHaveBeenCalledWith(
      "corr-1",
      expect.objectContaining({
        verdict: "EFFECTIVE",
        after: expect.objectContaining({ pis: 0.75 }),
      })
    )
  })

  it("PIS 변화 미미 → INEFFECTIVE verdict", async () => {
    const tracking = makeTracking()

    const provider = createMockProvider({
      getPendingTrackings: vi.fn().mockResolvedValue([tracking]),
    })

    const result = await evaluatePendingCorrections(
      "p-1",
      0.55, // same as before
      [],
      ["stance", "depth"],
      provider
    )

    expect(result.verdicts[0].verdict).toBe("INEFFECTIVE")
  })

  it("PIS 하락 → REGRESSED verdict", async () => {
    const tracking = makeTracking()

    const provider = createMockProvider({
      getPendingTrackings: vi.fn().mockResolvedValue([tracking]),
    })

    const result = await evaluatePendingCorrections(
      "p-1",
      0.45, // dropped from 0.55
      [],
      ["stance", "depth"],
      provider
    )

    expect(result.verdicts[0].verdict).toBe("REGRESSED")
  })

  it("이미 평가된 tracking(after 존재) skip", async () => {
    const alreadyEvaluated = makeTracking({
      after: {
        pis: 0.75,
        improvement: 0.2,
        resolvedDimensions: ["stance"],
        remainingIssues: [],
        measuredAt: new Date(),
      },
      verdict: "EFFECTIVE",
    })

    const provider = createMockProvider({
      getPendingTrackings: vi.fn().mockResolvedValue([alreadyEvaluated]),
    })

    const result = await evaluatePendingCorrections("p-1", 0.8, [], [], provider)
    expect(result.evaluated).toBe(0)
    expect(provider.updateCorrectionTracking).not.toHaveBeenCalled()
  })

  it("복수 미평가 교정 동시 평가", async () => {
    const trackings = [
      makeTracking({ correctionId: "corr-1" }),
      makeTracking({
        correctionId: "corr-2",
        before: { pis: 0.5, failedDimensions: [], triggeredBy: "INTERVIEW_FAIL" },
      }),
    ]

    const provider = createMockProvider({
      getPendingTrackings: vi.fn().mockResolvedValue(trackings),
    })

    const result = await evaluatePendingCorrections("p-1", 0.7, [], [], provider)
    expect(result.evaluated).toBe(2)
    expect(provider.updateCorrectionTracking).toHaveBeenCalledTimes(2)
  })
})

describe("arena-feedback: summarizeCorrectionEffectiveness", () => {
  it("빈 목록 → 0 요약", () => {
    const summary = summarizeCorrectionEffectiveness([])
    expect(summary.total).toBe(0)
    expect(summary.successRate).toBe(0)
  })

  it("verdict가 없는 항목 제외", () => {
    const trackings: CorrectionTracking[] = [
      makeTracking(), // verdict undefined
    ]

    const summary = summarizeCorrectionEffectiveness(trackings)
    expect(summary.total).toBe(0)
  })

  it("verdict 분포 올바르게 집계", () => {
    const trackings: CorrectionTracking[] = [
      makeTracking({
        verdict: "EFFECTIVE",
        after: {
          pis: 0.75,
          improvement: 0.2,
          resolvedDimensions: [],
          remainingIssues: [],
          measuredAt: new Date(),
        },
      }),
      makeTracking({
        correctionId: "c2",
        verdict: "PARTIAL",
        after: {
          pis: 0.58,
          improvement: 0.03,
          resolvedDimensions: [],
          remainingIssues: [],
          measuredAt: new Date(),
        },
      }),
      makeTracking({
        correctionId: "c3",
        verdict: "INEFFECTIVE",
        after: {
          pis: 0.55,
          improvement: 0.0,
          resolvedDimensions: [],
          remainingIssues: [],
          measuredAt: new Date(),
        },
      }),
      makeTracking({
        correctionId: "c4",
        verdict: "REGRESSED",
        after: {
          pis: 0.5,
          improvement: -0.05,
          resolvedDimensions: [],
          remainingIssues: [],
          measuredAt: new Date(),
        },
      }),
    ]

    const summary = summarizeCorrectionEffectiveness(trackings)
    expect(summary.total).toBe(4)
    expect(summary.effective).toBe(1)
    expect(summary.partial).toBe(1)
    expect(summary.ineffective).toBe(1)
    expect(summary.regressed).toBe(1)
    expect(summary.successRate).toBe(0.5) // (1+1)/4
    expect(summary.avgImprovement).toBe(0.05) // (0.20+0.03+0.00-0.05)/4 = 0.045 → rounded
  })

  it("전부 EFFECTIVE → successRate=1.0", () => {
    const trackings: CorrectionTracking[] = [
      makeTracking({
        verdict: "EFFECTIVE",
        after: {
          pis: 0.8,
          improvement: 0.25,
          resolvedDimensions: [],
          remainingIssues: [],
          measuredAt: new Date(),
        },
      }),
      makeTracking({
        correctionId: "c2",
        verdict: "EFFECTIVE",
        after: {
          pis: 0.9,
          improvement: 0.35,
          resolvedDimensions: [],
          remainingIssues: [],
          measuredAt: new Date(),
        },
      }),
    ]

    const summary = summarizeCorrectionEffectiveness(trackings)
    expect(summary.successRate).toBe(1)
    expect(summary.avgImprovement).toBe(0.3) // (0.25+0.35)/2
  })
})
