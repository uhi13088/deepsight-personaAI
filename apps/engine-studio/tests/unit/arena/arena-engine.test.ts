import { describe, it, expect, vi } from "vitest"
import {
  createArenaSession,
  startSession,
  addTurn,
  cancelSession,
  getNextSpeaker,
  getRemainingBudget,
  runSession,
  judgeSessionRuleBased,
  judgeSessionLLM,
  parseJudgmentResponse,
  buildJudgmentPrompt,
  computeOverallScore,
  DEFAULT_MAX_TURNS,
  DEFAULT_BUDGET_TOKENS,
  MIN_TURNS,
  MAX_TURNS_LIMIT,
  PROFILE_TOKEN_ESTIMATES,
  JUDGMENT_WEIGHTS,
  JUDGMENT_MODEL_MAP,
} from "@/lib/arena/arena-engine"
import type {
  ArenaSession,
  ArenaLLMProvider,
  CreateSessionParams,
  JudgmentScores,
} from "@/lib/arena/arena-engine"

// ── 헬퍼 ────────────────────────────────────────────────────

function makeParams(overrides: Partial<CreateSessionParams> = {}): CreateSessionParams {
  return {
    id: "arena-test-1",
    participants: ["persona-a", "persona-b"],
    topic: "영화 취향 토론",
    ...overrides,
  }
}

function makeRunningSession(overrides: Partial<CreateSessionParams> = {}): ArenaSession {
  return startSession(createArenaSession(makeParams(overrides)))
}

function makeMockLLM(responses?: string[]): ArenaLLMProvider {
  let callCount = 0
  return {
    generateTurn: vi.fn(async (_prompt: string, _maxTokens: number) => {
      const content = responses ? responses[callCount % responses.length] : `응답 ${callCount + 1}`
      callCount++
      return { content, tokensUsed: 100 }
    }),
    generateJudgment: vi.fn(async (_prompt: string) => ({
      content: JSON.stringify({
        scores: {
          characterConsistency: 0.8,
          l2Emergence: 0.7,
          paradoxEmergence: 0.6,
          triggerResponse: 0.75,
        },
        issues: [],
      }),
      tokensUsed: 200,
    })),
  }
}

// ═══════════════════════════════════════════════════════════════
// createArenaSession
// ═══════════════════════════════════════════════════════════════

describe("createArenaSession", () => {
  it("기본 파라미터로 세션 생성", () => {
    const session = createArenaSession(makeParams())
    expect(session.id).toBe("arena-test-1")
    expect(session.mode).toBe("SPARRING_1V1")
    expect(session.participants).toEqual(["persona-a", "persona-b"])
    expect(session.topic).toBe("영화 취향 토론")
    expect(session.maxTurns).toBe(DEFAULT_MAX_TURNS)
    expect(session.budgetTokens).toBe(DEFAULT_BUDGET_TOKENS)
    expect(session.usedTokens).toBe(0)
    expect(session.status).toBe("PENDING")
    expect(session.turns).toEqual([])
    expect(session.completedAt).toBeNull()
  })

  it("커스텀 maxTurns 적용", () => {
    const session = createArenaSession(makeParams({ maxTurns: 10 }))
    expect(session.maxTurns).toBe(10)
  })

  it("maxTurns 하한 클램프 (MIN_TURNS)", () => {
    const session = createArenaSession(makeParams({ maxTurns: 1 }))
    expect(session.maxTurns).toBe(MIN_TURNS)
  })

  it("maxTurns 상한 클램프 (MAX_TURNS_LIMIT)", () => {
    const session = createArenaSession(makeParams({ maxTurns: 100 }))
    expect(session.maxTurns).toBe(MAX_TURNS_LIMIT)
  })

  it("커스텀 budgetTokens 적용", () => {
    const session = createArenaSession(makeParams({ budgetTokens: 5000 }))
    expect(session.budgetTokens).toBe(5000)
  })

  it("profileLoadLevel 기본값 STANDARD", () => {
    const session = createArenaSession(makeParams())
    expect(session.profileLoadLevel).toBe("STANDARD")
  })

  it("profileLoadLevel 커스텀 적용", () => {
    const session = createArenaSession(makeParams({ profileLoadLevel: "LITE" }))
    expect(session.profileLoadLevel).toBe("LITE")
  })

  it("createdAt 타임스탬프 포함", () => {
    const before = Date.now()
    const session = createArenaSession(makeParams())
    expect(session.createdAt).toBeGreaterThanOrEqual(before)
  })
})

// ═══════════════════════════════════════════════════════════════
// startSession
// ═══════════════════════════════════════════════════════════════

describe("startSession", () => {
  it("PENDING → RUNNING", () => {
    const session = createArenaSession(makeParams())
    const started = startSession(session)
    expect(started.status).toBe("RUNNING")
  })

  it("이미 RUNNING → 변경 없음", () => {
    const session = makeRunningSession()
    const result = startSession(session)
    expect(result).toBe(session) // 동일 참조
  })

  it("COMPLETED → 변경 없음", () => {
    const session = { ...makeRunningSession(), status: "COMPLETED" as const }
    const result = startSession(session)
    expect(result).toBe(session)
  })
})

// ═══════════════════════════════════════════════════════════════
// addTurn
// ═══════════════════════════════════════════════════════════════

describe("addTurn", () => {
  it("턴 추가 성공", () => {
    const session = makeRunningSession()
    const updated = addTurn(session, "persona-a", "안녕하세요", 50)
    expect(updated.turns).toHaveLength(1)
    expect(updated.turns[0].turnNumber).toBe(1)
    expect(updated.turns[0].speakerId).toBe("persona-a")
    expect(updated.turns[0].content).toBe("안녕하세요")
    expect(updated.turns[0].tokensUsed).toBe(50)
    expect(updated.usedTokens).toBe(50)
  })

  it("다중 턴 추가", () => {
    let session = makeRunningSession()
    session = addTurn(session, "persona-a", "첫 번째", 50)
    session = addTurn(session, "persona-b", "두 번째", 60)
    expect(session.turns).toHaveLength(2)
    expect(session.turns[1].turnNumber).toBe(2)
    expect(session.usedTokens).toBe(110)
  })

  it("RUNNING 아닌 세션 → 무시", () => {
    const session = createArenaSession(makeParams()) // PENDING
    const result = addTurn(session, "persona-a", "test", 50)
    expect(result).toBe(session)
  })

  it("참가자 아닌 발화자 → 무시", () => {
    const session = makeRunningSession()
    const result = addTurn(session, "unknown-persona", "test", 50)
    expect(result).toBe(session)
  })

  it("maxTurns 도달 → COMPLETED", () => {
    let session = makeRunningSession({ maxTurns: 2 })
    session = addTurn(session, "persona-a", "첫 턴", 50)
    session = addTurn(session, "persona-b", "두 번째 턴", 50)
    expect(session.status).toBe("COMPLETED")
    expect(session.completedAt).not.toBeNull()
  })

  it("budgetTokens 초과 → COMPLETED", () => {
    let session = makeRunningSession({ budgetTokens: 100 })
    session = addTurn(session, "persona-a", "큰 응답", 120)
    expect(session.status).toBe("COMPLETED")
    expect(session.completedAt).not.toBeNull()
  })

  it("타임스탬프 포함", () => {
    const before = Date.now()
    const session = makeRunningSession()
    const updated = addTurn(session, "persona-a", "test", 50)
    expect(updated.turns[0].timestamp).toBeGreaterThanOrEqual(before)
  })
})

// ═══════════════════════════════════════════════════════════════
// cancelSession
// ═══════════════════════════════════════════════════════════════

describe("cancelSession", () => {
  it("RUNNING → CANCELLED", () => {
    const session = makeRunningSession()
    const cancelled = cancelSession(session)
    expect(cancelled.status).toBe("CANCELLED")
    expect(cancelled.completedAt).not.toBeNull()
  })

  it("PENDING → CANCELLED", () => {
    const session = createArenaSession(makeParams())
    const cancelled = cancelSession(session)
    expect(cancelled.status).toBe("CANCELLED")
  })

  it("COMPLETED → 변경 없음", () => {
    const session = { ...makeRunningSession(), status: "COMPLETED" as const }
    const result = cancelSession(session)
    expect(result).toBe(session)
  })
})

// ═══════════════════════════════════════════════════════════════
// getNextSpeaker
// ═══════════════════════════════════════════════════════════════

describe("getNextSpeaker", () => {
  it("빈 세션 → 첫 번째 참가자", () => {
    const session = makeRunningSession()
    expect(getNextSpeaker(session)).toBe("persona-a")
  })

  it("1턴 후 → 두 번째 참가자", () => {
    let session = makeRunningSession()
    session = addTurn(session, "persona-a", "첫 턴", 50)
    expect(getNextSpeaker(session)).toBe("persona-b")
  })

  it("2턴 후 → 다시 첫 번째", () => {
    let session = makeRunningSession()
    session = addTurn(session, "persona-a", "1", 50)
    session = addTurn(session, "persona-b", "2", 50)
    expect(getNextSpeaker(session)).toBe("persona-a")
  })

  it("PENDING → null", () => {
    const session = createArenaSession(makeParams())
    expect(getNextSpeaker(session)).toBeNull()
  })

  it("maxTurns 도달 → null", () => {
    let session = makeRunningSession({ maxTurns: 2 })
    session = addTurn(session, "persona-a", "1", 50)
    session = addTurn(session, "persona-b", "2", 50)
    expect(getNextSpeaker(session)).toBeNull()
  })

  it("budgetTokens 소진 → null", () => {
    let session = makeRunningSession({ budgetTokens: 100 })
    session = addTurn(session, "persona-a", "큰 응답", 120)
    expect(getNextSpeaker(session)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════
// getRemainingBudget
// ═══════════════════════════════════════════════════════════════

describe("getRemainingBudget", () => {
  it("초기 상태 → 전체 남음", () => {
    const session = makeRunningSession()
    const budget = getRemainingBudget(session)
    expect(budget.remainingTokens).toBe(DEFAULT_BUDGET_TOKENS)
    expect(budget.remainingTurns).toBe(DEFAULT_MAX_TURNS)
    expect(budget.usagePercent).toBe(0)
  })

  it("일부 사용 후 → 정확한 잔여량", () => {
    let session = makeRunningSession({ budgetTokens: 1000, maxTurns: 10 })
    session = addTurn(session, "persona-a", "test", 200)
    const budget = getRemainingBudget(session)
    expect(budget.remainingTokens).toBe(800)
    expect(budget.remainingTurns).toBe(9)
    expect(budget.usagePercent).toBe(20)
  })

  it("전부 소진 → 0", () => {
    let session = makeRunningSession({ budgetTokens: 100, maxTurns: 2 })
    session = addTurn(session, "persona-a", "1", 60)
    session = addTurn(session, "persona-b", "2", 60)
    const budget = getRemainingBudget(session)
    expect(budget.remainingTokens).toBe(0) // max(0, 100-120)
    expect(budget.remainingTurns).toBe(0)
  })

  it("budgetTokens 0 → usagePercent 100", () => {
    const session = createArenaSession(makeParams({ budgetTokens: 0 }))
    const budget = getRemainingBudget(session)
    expect(budget.usagePercent).toBe(100)
  })
})

// ═══════════════════════════════════════════════════════════════
// runSession
// ═══════════════════════════════════════════════════════════════

describe("runSession", () => {
  it("maxTurns까지 자동 실행", async () => {
    const session = createArenaSession(makeParams({ maxTurns: 4 }))
    const llm = makeMockLLM()
    const buildPrompt = (_s: ArenaSession, _id: string) => "prompt"

    const result = await runSession(session, llm, buildPrompt)
    expect(result.totalTurns).toBe(4)
    expect(result.stoppedReason).toBe("max_turns")
    expect(result.session.status).toBe("COMPLETED")
  })

  it("예산 소진 시 중단", async () => {
    const session = createArenaSession(makeParams({ maxTurns: 20, budgetTokens: 250 }))
    const llm = makeMockLLM()
    const buildPrompt = (_s: ArenaSession, _id: string) => "prompt"

    const result = await runSession(session, llm, buildPrompt)
    // 100 tokens per turn → 3 turns = 300 ≥ 250
    expect(result.totalTurns).toBeLessThanOrEqual(3)
    expect(result.stoppedReason).toBe("budget_exhausted")
  })

  it("LLM 에러 → error로 종료", async () => {
    const session = createArenaSession(makeParams({ maxTurns: 4 }))
    const llm: ArenaLLMProvider = {
      generateTurn: vi.fn(async () => {
        throw new Error("LLM 오류")
      }),
      generateJudgment: vi.fn(async () => ({ content: "", tokensUsed: 0 })),
    }
    const buildPrompt = (_s: ArenaSession, _id: string) => "prompt"

    const result = await runSession(session, llm, buildPrompt)
    expect(result.stoppedReason).toBe("error")
    expect(result.session.status).toBe("COMPLETED")
  })

  it("buildPrompt에 세션과 speakerId 전달", async () => {
    const session = createArenaSession(makeParams({ maxTurns: 2 }))
    const llm = makeMockLLM()
    const buildPrompt = vi.fn((_s: ArenaSession, _id: string) => "prompt")

    await runSession(session, llm, buildPrompt)
    expect(buildPrompt).toHaveBeenCalledTimes(2)
    // 첫 번째 호출: persona-a
    expect(buildPrompt.mock.calls[0][1]).toBe("persona-a")
    // 두 번째 호출: persona-b
    expect(buildPrompt.mock.calls[1][1]).toBe("persona-b")
  })

  it("턴별 응답 내용 기록", async () => {
    const session = createArenaSession(makeParams({ maxTurns: 2 }))
    const llm = makeMockLLM(["첫 응답입니다", "두 번째 응답입니다"])
    const buildPrompt = (_s: ArenaSession, _id: string) => "prompt"

    const result = await runSession(session, llm, buildPrompt)
    expect(result.session.turns[0].content).toBe("첫 응답입니다")
    expect(result.session.turns[1].content).toBe("두 번째 응답입니다")
  })
})

// ═══════════════════════════════════════════════════════════════
// judgeSessionRuleBased
// ═══════════════════════════════════════════════════════════════

describe("judgeSessionRuleBased", () => {
  function makeCompletedSession(
    turns: { speaker: string; content: string; tokens: number }[]
  ): ArenaSession {
    let session = makeRunningSession({ maxTurns: 20 })
    for (const t of turns) {
      session = addTurn(session, t.speaker, t.content, t.tokens)
    }
    return { ...session, status: "COMPLETED", completedAt: Date.now() }
  }

  it("정상 세션 → 유효한 판정", () => {
    const session = makeCompletedSession([
      {
        speaker: "persona-a",
        content: "이 영화의 서사 구조가 매우 인상적이었습니다. 특히 2막의 전환이 돋보였죠.",
        tokens: 100,
      },
      {
        speaker: "persona-b",
        content: "저도 동의합니다. 하지만 캐릭터 발전이 다소 급했다고 생각해요.",
        tokens: 110,
      },
      {
        speaker: "persona-a",
        content: "흥미로운 관점이네요. 캐릭터의 변화가 빨랐지만 충분히 설득력은 있었다고 봅니다.",
        tokens: 120,
      },
      {
        speaker: "persona-b",
        content: "네, 그 부분은 감독의 의도적인 선택이었을 수도 있겠네요.",
        tokens: 90,
      },
    ])

    const judgment = judgeSessionRuleBased(session)
    expect(judgment.sessionId).toBe("arena-test-1")
    expect(judgment.overallScore).toBeGreaterThan(0)
    expect(judgment.overallScore).toBeLessThanOrEqual(1)
    expect(judgment.scores.characterConsistency).toBeGreaterThan(0)
    expect(judgment.scores.l2Emergence).toBe(0.5) // 룰 기반 기본값
    expect(judgment.scores.paradoxEmergence).toBe(0.5) // 룰 기반 기본값
    expect(judgment.judgedAt).toBeGreaterThan(0)
  })

  it("짧은 응답 → consistency 이슈 발생", () => {
    const session = makeCompletedSession([
      { speaker: "persona-a", content: "네.", tokens: 10 },
      { speaker: "persona-b", content: "그래요.", tokens: 10 },
    ])

    const judgment = judgeSessionRuleBased(session)
    const shortIssues = judgment.issues.filter(
      (i) => i.category === "consistency" && i.description.includes("짧은 응답")
    )
    expect(shortIssues.length).toBeGreaterThan(0)
    expect(shortIssues[0].severity).toBe("minor")
  })

  it("동일 내용 반복 → critical 이슈", () => {
    const session = makeCompletedSession([
      { speaker: "persona-a", content: "안녕하세요 반갑습니다", tokens: 50 },
      { speaker: "persona-a", content: "안녕하세요 반갑습니다", tokens: 50 },
    ])

    const judgment = judgeSessionRuleBased(session)
    const repeatIssues = judgment.issues.filter(
      (i) => i.category === "consistency" && i.severity === "critical"
    )
    expect(repeatIssues.length).toBeGreaterThan(0)
  })

  it("빈 세션 → 낮은 점수", () => {
    const session = makeCompletedSession([])
    const judgment = judgeSessionRuleBased(session)
    expect(judgment.overallScore).toBeLessThanOrEqual(0.7)
  })

  it("summary 포함", () => {
    const session = makeCompletedSession([
      { speaker: "persona-a", content: "이 영화는 정말 인상적인 작품이었습니다.", tokens: 100 },
      { speaker: "persona-b", content: "저도 같은 생각입니다. 특히 연출이 좋았어요.", tokens: 100 },
    ])

    const judgment = judgeSessionRuleBased(session)
    expect(judgment.summary).toContain("arena-test-1")
    expect(judgment.summary.length).toBeGreaterThan(0)
  })

  it("이슈에 suggestion 포함", () => {
    const session = makeCompletedSession([{ speaker: "persona-a", content: "네.", tokens: 10 }])

    const judgment = judgeSessionRuleBased(session)
    if (judgment.issues.length > 0) {
      expect(judgment.issues[0].suggestion.length).toBeGreaterThan(0)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// buildJudgmentPrompt
// ═══════════════════════════════════════════════════════════════

describe("buildJudgmentPrompt", () => {
  it("주제 포함", () => {
    let session = makeRunningSession()
    session = addTurn(session, "persona-a", "첫 발언", 50)
    const prompt = buildJudgmentPrompt(session)
    expect(prompt).toContain("영화 취향 토론")
  })

  it("참가자 포함", () => {
    let session = makeRunningSession()
    session = addTurn(session, "persona-a", "발언", 50)
    const prompt = buildJudgmentPrompt(session)
    expect(prompt).toContain("persona-a")
    expect(prompt).toContain("persona-b")
  })

  it("대화 기록 포함", () => {
    let session = makeRunningSession()
    session = addTurn(session, "persona-a", "이건 정말 좋은 영화입니다", 50)
    session = addTurn(session, "persona-b", "저는 조금 다른 의견이에요", 50)
    const prompt = buildJudgmentPrompt(session)
    expect(prompt).toContain("[턴 1]")
    expect(prompt).toContain("[턴 2]")
    expect(prompt).toContain("이건 정말 좋은 영화입니다")
    expect(prompt).toContain("저는 조금 다른 의견이에요")
  })

  it("4가지 평가 차원 명시", () => {
    const session = makeRunningSession()
    const prompt = buildJudgmentPrompt(session)
    expect(prompt).toContain("characterConsistency")
    expect(prompt).toContain("l2Emergence")
    expect(prompt).toContain("paradoxEmergence")
    expect(prompt).toContain("triggerResponse")
  })

  it("JSON 형식 요청", () => {
    const session = makeRunningSession()
    const prompt = buildJudgmentPrompt(session)
    expect(prompt).toContain("JSON")
  })
})

// ═══════════════════════════════════════════════════════════════
// computeOverallScore
// ═══════════════════════════════════════════════════════════════

describe("computeOverallScore", () => {
  it("모든 1.0 → 1.0", () => {
    const scores: JudgmentScores = {
      characterConsistency: 1.0,
      l2Emergence: 1.0,
      paradoxEmergence: 1.0,
      triggerResponse: 1.0,
    }
    expect(computeOverallScore(scores)).toBe(1.0)
  })

  it("모든 0.0 → 0.0", () => {
    const scores: JudgmentScores = {
      characterConsistency: 0,
      l2Emergence: 0,
      paradoxEmergence: 0,
      triggerResponse: 0,
    }
    expect(computeOverallScore(scores)).toBe(0)
  })

  it("가중 평균 정확성", () => {
    const scores: JudgmentScores = {
      characterConsistency: 0.8,
      l2Emergence: 0.6,
      paradoxEmergence: 0.4,
      triggerResponse: 0.5,
    }
    // 0.8*0.35 + 0.6*0.25 + 0.4*0.2 + 0.5*0.2 = 0.28 + 0.15 + 0.08 + 0.10 = 0.61
    const expected = 0.61
    expect(computeOverallScore(scores)).toBe(expected)
  })

  it("결과 0~1 범위", () => {
    const scores: JudgmentScores = {
      characterConsistency: 0.5,
      l2Emergence: 0.5,
      paradoxEmergence: 0.5,
      triggerResponse: 0.5,
    }
    const result = computeOverallScore(scores)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("DEFAULT_MAX_TURNS > MIN_TURNS", () => {
    expect(DEFAULT_MAX_TURNS).toBeGreaterThan(MIN_TURNS)
  })

  it("MAX_TURNS_LIMIT > DEFAULT_MAX_TURNS", () => {
    expect(MAX_TURNS_LIMIT).toBeGreaterThan(DEFAULT_MAX_TURNS)
  })

  it("JUDGMENT_WEIGHTS 합 = 1.0", () => {
    const sum = Object.values(JUDGMENT_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1.0)
  })

  it("PROFILE_TOKEN_ESTIMATES 모든 값 > 0", () => {
    for (const val of Object.values(PROFILE_TOKEN_ESTIMATES)) {
      expect(val).toBeGreaterThan(0)
    }
  })

  it("PROFILE_TOKEN_ESTIMATES: FULL > STANDARD > LITE", () => {
    expect(PROFILE_TOKEN_ESTIMATES.FULL).toBeGreaterThan(PROFILE_TOKEN_ESTIMATES.STANDARD)
    expect(PROFILE_TOKEN_ESTIMATES.STANDARD).toBeGreaterThan(PROFILE_TOKEN_ESTIMATES.LITE)
  })
})

// ═══════════════════════════════════════════════════════════════
// 불변성 검증
// ═══════════════════════════════════════════════════════════════

describe("불변성 검증", () => {
  it("addTurn은 원본 세션 변경 없음", () => {
    const session = makeRunningSession()
    const turnsLengthBefore = session.turns.length
    const tokensBefore = session.usedTokens
    addTurn(session, "persona-a", "test", 100)
    expect(session.turns.length).toBe(turnsLengthBefore)
    expect(session.usedTokens).toBe(tokensBefore)
  })

  it("startSession은 원본 세션 변경 없음", () => {
    const session = createArenaSession(makeParams())
    startSession(session)
    expect(session.status).toBe("PENDING")
  })

  it("cancelSession은 원본 세션 변경 없음", () => {
    const session = makeRunningSession()
    cancelSession(session)
    expect(session.status).toBe("RUNNING")
  })
})

// ═══════════════════════════════════════════════════════════════
// 통합 시나리오
// ═══════════════════════════════════════════════════════════════

describe("통합 시나리오", () => {
  it("생성 → 시작 → 턴 진행 → 판정 전체 플로우", () => {
    const session = createArenaSession(makeParams({ maxTurns: 4 }))

    // 시작
    let running = startSession(session)
    expect(running.status).toBe("RUNNING")

    // 4턴 진행
    running = addTurn(running, "persona-a", "이 영화의 연출이 인상적이었습니다", 100)
    running = addTurn(running, "persona-b", "저는 조금 다른 의견입니다만 연기력은 좋았어요", 120)
    running = addTurn(
      running,
      "persona-a",
      "연기력은 확실히 좋았죠. 특히 주연배우의 감정 표현이요",
      130
    )
    running = addTurn(
      running,
      "persona-b",
      "네 그 점은 동의합니다. 전반적으로 괜찮은 작품이었어요",
      110
    )

    expect(running.status).toBe("COMPLETED")
    expect(running.turns).toHaveLength(4)

    // 판정
    const judgment = judgeSessionRuleBased(running)
    expect(judgment.sessionId).toBe("arena-test-1")
    expect(judgment.overallScore).toBeGreaterThan(0)
    expect(judgment.summary.length).toBeGreaterThan(0)
  })

  it("비동기 runSession → 판정 전체 플로우", async () => {
    const session = createArenaSession(makeParams({ maxTurns: 4 }))
    const llm = makeMockLLM([
      "이 영화는 서사적으로 매우 풍부한 작품입니다.",
      "저도 서사 면에서는 인정하지만, 연출에 아쉬운 점이 있었습니다.",
      "연출 면에서 어떤 부분이 아쉬웠는지 구체적으로 알려주실 수 있을까요?",
      "특히 중반부의 시퀀스 전환이 너무 급작스러웠다고 느꼈습니다.",
    ])
    const buildPrompt = (s: ArenaSession, id: string) => `${id}가 ${s.topic}에 대해 발언하세요.`

    const result = await runSession(session, llm, buildPrompt)
    expect(result.totalTurns).toBe(4)
    expect(result.stoppedReason).toBe("max_turns")

    const judgment = judgeSessionRuleBased(result.session)
    expect(judgment.overallScore).toBeGreaterThan(0)
    expect(judgment.issues.length).toBe(0) // 정상 턴이므로 이슈 없음
  })
})

// ══════════════════════════════════════════════════════════════
// T145: LLM 판정 + 모델 선택
// ══════════════════════════════════════════════════════════════

describe("JUDGMENT_MODEL_MAP", () => {
  it("PRECISE는 Sonnet 모델이다", () => {
    expect(JUDGMENT_MODEL_MAP.PRECISE).toContain("sonnet")
  })

  it("QUICK는 Haiku 모델이다", () => {
    expect(JUDGMENT_MODEL_MAP.QUICK).toContain("haiku")
  })
})

describe("parseJudgmentResponse", () => {
  it("유효한 JSON을 파싱한다", () => {
    const json = JSON.stringify({
      scores: {
        characterConsistency: 0.8,
        l2Emergence: 0.6,
        paradoxEmergence: 0.7,
        triggerResponse: 0.9,
      },
      issues: [
        {
          turnNumber: 2,
          personaId: "p-1",
          category: "voice",
          severity: "minor",
          description: "말투 불일치",
          suggestion: "보이스 참조",
        },
      ],
    })

    const result = parseJudgmentResponse(json)
    expect(result).not.toBeNull()
    expect(result!.scores.characterConsistency).toBe(0.8)
    expect(result!.scores.l2Emergence).toBe(0.6)
    expect(result!.issues).toHaveLength(1)
    expect(result!.issues[0].category).toBe("voice")
  })

  it("scores를 0~1로 클램핑한다", () => {
    const json = JSON.stringify({
      scores: {
        characterConsistency: 1.5,
        l2Emergence: -0.3,
        paradoxEmergence: 0.5,
        triggerResponse: 2.0,
      },
      issues: [],
    })

    const result = parseJudgmentResponse(json)
    expect(result!.scores.characterConsistency).toBe(1.0)
    expect(result!.scores.l2Emergence).toBe(0)
    expect(result!.scores.triggerResponse).toBe(1.0)
  })

  it("잘못된 category를 consistency로 보정한다", () => {
    const json = JSON.stringify({
      scores: {
        characterConsistency: 0.5,
        l2Emergence: 0.5,
        paradoxEmergence: 0.5,
        triggerResponse: 0.5,
      },
      issues: [
        {
          turnNumber: 1,
          personaId: "p-1",
          category: "invalid",
          severity: "minor",
          description: "test",
          suggestion: "test",
        },
      ],
    })

    const result = parseJudgmentResponse(json)
    expect(result!.issues[0].category).toBe("consistency")
  })

  it("JSON이 없으면 null을 반환한다", () => {
    expect(parseJudgmentResponse("파싱 불가")).toBeNull()
  })

  it("scores가 없으면 null을 반환한다", () => {
    expect(parseJudgmentResponse('{ "issues": [] }')).toBeNull()
  })
})

describe("judgeSessionLLM", () => {
  it("LLM 응답을 파싱하여 판정한다", async () => {
    const session = makeRunningSession({ maxTurns: 2 })
    const withTurns = addTurn(
      addTurn(startSession(session), "persona-a", "영화 토론 시작합니다.", 100),
      "persona-b",
      "좋은 의견이네요!",
      80
    )

    const mockLLM = makeMockLLM()
    vi.mocked(mockLLM.generateJudgment).mockResolvedValueOnce({
      content: JSON.stringify({
        scores: {
          characterConsistency: 0.85,
          l2Emergence: 0.7,
          paradoxEmergence: 0.6,
          triggerResponse: 0.8,
        },
        issues: [],
      }),
      tokensUsed: 200,
    })

    const judgment = await judgeSessionLLM(withTurns, mockLLM)
    expect(judgment.scores.characterConsistency).toBe(0.85)
    expect(judgment.scores.l2Emergence).toBe(0.7)
    expect(judgment.issues).toHaveLength(0)
    expect(judgment.overallScore).toBeGreaterThan(0)
  })

  it("LLM 실패 시 룰 기반으로 폴백한다", async () => {
    const session = makeRunningSession({ maxTurns: 2 })
    const withTurns = addTurn(
      startSession(session),
      "persona-a",
      "짧은 대화입니다. 충분히 긴 텍스트.",
      100
    )

    const mockLLM = makeMockLLM()
    vi.mocked(mockLLM.generateJudgment).mockRejectedValueOnce(new Error("API 실패"))

    const judgment = await judgeSessionLLM(withTurns, mockLLM)
    // 폴백이므로 기본값
    expect(judgment.sessionId).toBe(withTurns.id)
    expect(judgment.scores.l2Emergence).toBe(0.5)
  })

  it("파싱 실패 시 룰 기반으로 폴백한다", async () => {
    const session = makeRunningSession({ maxTurns: 2 })
    const withTurns = addTurn(
      startSession(session),
      "persona-a",
      "파싱 실패 테스트. 충분히 긴 텍스트.",
      100
    )

    const mockLLM = makeMockLLM()
    vi.mocked(mockLLM.generateJudgment).mockResolvedValueOnce({
      content: "파싱 불가능한 응답",
      tokensUsed: 50,
    })

    const judgment = await judgeSessionLLM(withTurns, mockLLM)
    expect(judgment.sessionId).toBe(withTurns.id)
    expect(judgment.scores.l2Emergence).toBe(0.5)
  })
})
