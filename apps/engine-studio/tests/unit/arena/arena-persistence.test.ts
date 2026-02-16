// ═══════════════════════════════════════════════════════════════
// T154: Arena Persistence 단위 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
  // 타입
  type ArenaSessionRecord,
  type ArenaTurnRecord,
  type ArenaJudgmentRecord,
  type ArenaCorrectionRecord,
  type ArenaTokenUsageRecord,
  type ArenaIsolationPolicy,
  type IsolationViolation,
  type ArenaRecordSet,
  type SessionLifecycle,
  type ArenaScopedQuery,
  type ArenaTimeRangeQuery,
  type SessionTokenSummary,
  type ArchiveSummary,
  type ArenaWriteOperation,
  // 상수
  DEFAULT_ISOLATION_POLICY,
  // 함수
  sessionToRecord,
  turnToRecord,
  judgmentToRecord,
  correctionToRecord,
  sessionToRecordSet,
  determineSessionLifecycle,
  identifyExpiredSessions,
  identifyArchivableSessions,
  validateIsolation,
  validateWriteOperation,
  createScopedQuery,
  createTimeRangeQuery,
  createTokenUsageRecord,
  summarizeTokenUsage,
  computeArchiveSummary,
  summarizeCleanup,
} from "@/lib/arena/arena-persistence"
import type { ArenaSession, ArenaTurn, ArenaJudgment } from "@/lib/arena/arena-engine"
import type { CorrectionRequest } from "@/lib/arena/arena-cost-control"

// ── 헬퍼 ────────────────────────────────────────────────────

const NOW = Date.now()
const DAY_MS = 24 * 60 * 60 * 1000

function makeSession(overrides: Partial<ArenaSession> = {}): ArenaSession {
  return {
    id: "sess-001",
    mode: "SPARRING_1V1",
    participants: ["p-001", "p-002"],
    profileLoadLevel: "STANDARD",
    topic: "영화 비평 토론",
    maxTurns: 6,
    budgetTokens: 10000,
    usedTokens: 3000,
    status: "COMPLETED",
    turns: [
      {
        turnNumber: 1,
        speakerId: "p-001",
        content: "첫 발언",
        tokensUsed: 500,
        timestamp: NOW - 60000,
      },
      {
        turnNumber: 2,
        speakerId: "p-002",
        content: "두 번째 발언",
        tokensUsed: 600,
        timestamp: NOW - 30000,
      },
    ],
    createdAt: NOW - 120000,
    completedAt: NOW,
    ...overrides,
  }
}

function makeJudgment(): ArenaJudgment {
  return {
    sessionId: "sess-001",
    scores: {
      characterConsistency: 0.8,
      l2Emergence: 0.7,
      paradoxEmergence: 0.6,
      triggerResponse: 0.75,
    },
    overallScore: 0.74,
    issues: [
      {
        turnNumber: 1,
        personaId: "p-001",
        category: "consistency",
        severity: "minor",
        description: "약간의 톤 불일치",
        suggestion: "분석적 톤 유지 필요",
      },
    ],
    summary: "전반적으로 양호한 스파링",
    judgedAt: NOW,
  }
}

function makeCorrection(): CorrectionRequest {
  return {
    id: "corr-001",
    sessionId: "sess-001",
    turnNumber: 1,
    issueCategory: "consistency",
    originalContent: "기존 스타일",
    correctedContent: "수정된 스타일",
    reason: "톤 불일치 교정",
    status: "PENDING",
    createdAt: NOW,
    reviewedAt: null,
    reviewedBy: null,
  }
}

function makeSessionRecord(overrides: Partial<ArenaSessionRecord> = {}): ArenaSessionRecord {
  return {
    id: "sess-001",
    mode: "SPARRING_1V1",
    participantA: "p-001",
    participantB: "p-002",
    profileLoadLevel: "STANDARD",
    topic: "테스트 토론",
    maxTurns: 6,
    budgetTokens: 10000,
    usedTokens: 3000,
    status: "COMPLETED",
    createdAt: NOW - DAY_MS * 10,
    startedAt: NOW - DAY_MS * 10 + 1000,
    completedAt: NOW - DAY_MS * 10 + 60000,
    ...overrides,
  }
}

// ══════════════════════════════════════════════════════════════
// 상수 검증
// ══════════════════════════════════════════════════════════════

describe("상수", () => {
  it("DEFAULT_ISOLATION_POLICY 기본값", () => {
    expect(DEFAULT_ISOLATION_POLICY.namespace).toBe("arena")
    expect(DEFAULT_ISOLATION_POLICY.retentionDays).toBe(90)
    expect(DEFAULT_ISOLATION_POLICY.archiveRetentionDays).toBe(365)
    expect(DEFAULT_ISOLATION_POLICY.maxTurnsPerSession).toBe(20)
    expect(DEFAULT_ISOLATION_POLICY.correctionRetentionDays).toBe(180)
    expect(DEFAULT_ISOLATION_POLICY.judgmentRetentionDays).toBe(365)
  })
})

// ══════════════════════════════════════════════════════════════
// sessionToRecord
// ══════════════════════════════════════════════════════════════

describe("sessionToRecord", () => {
  it("세션 → 레코드 변환", () => {
    const record = sessionToRecord(makeSession())
    expect(record.id).toBe("sess-001")
    expect(record.mode).toBe("SPARRING_1V1")
    expect(record.participantA).toBe("p-001")
    expect(record.participantB).toBe("p-002")
    expect(record.status).toBe("COMPLETED")
    expect(record.usedTokens).toBe(3000)
  })

  it("startedAt = 첫 턴의 timestamp", () => {
    const record = sessionToRecord(makeSession())
    expect(record.startedAt).toBe(NOW - 60000)
  })

  it("턴 없으면 startedAt = null", () => {
    const record = sessionToRecord(makeSession({ turns: [] }))
    expect(record.startedAt).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════
// turnToRecord
// ══════════════════════════════════════════════════════════════

describe("turnToRecord", () => {
  it("턴 → 레코드 변환", () => {
    const turn: ArenaTurn = {
      turnNumber: 1,
      speakerId: "p-001",
      content: "발언",
      tokensUsed: 500,
      timestamp: NOW,
    }
    const record = turnToRecord("sess-001", turn)
    expect(record.id).toBe("sess-001_turn_1")
    expect(record.sessionId).toBe("sess-001")
    expect(record.turnNumber).toBe(1)
    expect(record.speakerId).toBe("p-001")
  })
})

// ══════════════════════════════════════════════════════════════
// judgmentToRecord
// ══════════════════════════════════════════════════════════════

describe("judgmentToRecord", () => {
  it("판정 → 레코드 변환", () => {
    const record = judgmentToRecord("sess-001", makeJudgment(), "rule_based")
    expect(record.id).toBe("sess-001_judgment")
    expect(record.sessionId).toBe("sess-001")
    expect(record.overallScore).toBe(0.74)
    expect(record.method).toBe("rule_based")
    expect(record.issues).toHaveLength(1)
  })

  it("기본 method = rule_based", () => {
    const record = judgmentToRecord("sess-001", makeJudgment())
    expect(record.method).toBe("rule_based")
  })
})

// ══════════════════════════════════════════════════════════════
// correctionToRecord
// ══════════════════════════════════════════════════════════════

describe("correctionToRecord", () => {
  it("교정 → 레코드 변환", () => {
    const record = correctionToRecord("sess-001", "judg-001", makeCorrection())
    expect(record.id).toBe("corr-001")
    expect(record.sessionId).toBe("sess-001")
    expect(record.judgmentId).toBe("judg-001")
    expect(record.category).toBe("consistency")
    expect(record.status).toBe("PENDING")
  })
})

// ══════════════════════════════════════════════════════════════
// sessionToRecordSet
// ══════════════════════════════════════════════════════════════

describe("sessionToRecordSet", () => {
  it("전체 레코드 세트 생성", () => {
    const set = sessionToRecordSet(makeSession(), makeJudgment(), [makeCorrection()])
    expect(set.session.id).toBe("sess-001")
    expect(set.turns).toHaveLength(2)
    expect(set.judgment).not.toBeNull()
    expect(set.corrections).toHaveLength(1)
  })

  it("판정 없으면 judgment = null", () => {
    const set = sessionToRecordSet(makeSession())
    expect(set.judgment).toBeNull()
  })

  it("교정 없으면 corrections 빈 배열", () => {
    const set = sessionToRecordSet(makeSession(), makeJudgment())
    expect(set.corrections).toEqual([])
  })
})

// ══════════════════════════════════════════════════════════════
// determineSessionLifecycle
// ══════════════════════════════════════════════════════════════

describe("determineSessionLifecycle", () => {
  it("PENDING → active", () => {
    const result = determineSessionLifecycle(makeSessionRecord({ status: "PENDING" }))
    expect(result).toBe("active")
  })

  it("RUNNING → active", () => {
    const result = determineSessionLifecycle(makeSessionRecord({ status: "RUNNING" }))
    expect(result).toBe("active")
  })

  it("COMPLETED 최근 → completed", () => {
    const result = determineSessionLifecycle(makeSessionRecord({ completedAt: NOW - DAY_MS * 5 }))
    expect(result).toBe("completed")
  })

  it("COMPLETED 90일+ → archived", () => {
    const result = determineSessionLifecycle(makeSessionRecord({ completedAt: NOW - DAY_MS * 100 }))
    expect(result).toBe("archived")
  })

  it("COMPLETED 365일+ → expired", () => {
    const result = determineSessionLifecycle(makeSessionRecord({ completedAt: NOW - DAY_MS * 400 }))
    expect(result).toBe("expired")
  })

  it("CANCELLED 최근 → cancelled", () => {
    const result = determineSessionLifecycle(
      makeSessionRecord({ status: "CANCELLED", createdAt: NOW - DAY_MS * 5 })
    )
    expect(result).toBe("cancelled")
  })

  it("CANCELLED 90일+ → archived", () => {
    const result = determineSessionLifecycle(
      makeSessionRecord({ status: "CANCELLED", createdAt: NOW - DAY_MS * 100 })
    )
    expect(result).toBe("archived")
  })

  it("CANCELLED 365일+ → expired", () => {
    const result = determineSessionLifecycle(
      makeSessionRecord({ status: "CANCELLED", createdAt: NOW - DAY_MS * 400 })
    )
    expect(result).toBe("expired")
  })

  it("커스텀 정책: retentionDays=30", () => {
    const policy: ArenaIsolationPolicy = {
      ...DEFAULT_ISOLATION_POLICY,
      retentionDays: 30,
    }
    const result = determineSessionLifecycle(
      makeSessionRecord({ completedAt: NOW - DAY_MS * 40 }),
      policy
    )
    expect(result).toBe("archived")
  })
})

// ══════════════════════════════════════════════════════════════
// identifyExpiredSessions / identifyArchivableSessions
// ══════════════════════════════════════════════════════════════

describe("세션 식별", () => {
  const sessions: ArenaSessionRecord[] = [
    makeSessionRecord({ id: "s1", completedAt: NOW - DAY_MS * 5 }), // completed
    makeSessionRecord({ id: "s2", completedAt: NOW - DAY_MS * 100 }), // archived
    makeSessionRecord({ id: "s3", completedAt: NOW - DAY_MS * 400 }), // expired
    makeSessionRecord({ id: "s4", status: "RUNNING" }), // active
  ]

  it("만료 세션 식별", () => {
    const expired = identifyExpiredSessions(sessions)
    expect(expired).toHaveLength(1)
    expect(expired[0].id).toBe("s3")
  })

  it("아카이브 세션 식별", () => {
    const archivable = identifyArchivableSessions(sessions)
    expect(archivable).toHaveLength(1)
    expect(archivable[0].id).toBe("s2")
  })
})

// ══════════════════════════════════════════════════════════════
// validateIsolation
// ══════════════════════════════════════════════════════════════

describe("validateIsolation", () => {
  it("정상 레코드 세트 → 위반 없음", () => {
    const set = sessionToRecordSet(makeSession(), makeJudgment(), [makeCorrection()])
    const violations = validateIsolation(set)
    expect(violations).toHaveLength(0)
  })

  it("턴 sessionId 불일치 → orphan_record", () => {
    const set = sessionToRecordSet(makeSession())
    const badSet: ArenaRecordSet = {
      ...set,
      turns: [{ ...set.turns[0], sessionId: "wrong-session" }],
    }
    const violations = validateIsolation(badSet)
    expect(violations.some((v) => v.type === "orphan_record")).toBe(true)
  })

  it("판정 sessionId 불일치 → orphan_record", () => {
    const set = sessionToRecordSet(makeSession(), makeJudgment())
    const badSet: ArenaRecordSet = {
      ...set,
      judgment: { ...set.judgment!, sessionId: "wrong-session" },
    }
    const violations = validateIsolation(badSet)
    expect(violations.some((v) => v.type === "orphan_record")).toBe(true)
  })

  it("교정 sessionId 불일치 → orphan_record", () => {
    const set = sessionToRecordSet(makeSession(), makeJudgment(), [makeCorrection()])
    const badSet: ArenaRecordSet = {
      ...set,
      corrections: [{ ...set.corrections[0], sessionId: "wrong-session" }],
    }
    const violations = validateIsolation(badSet)
    expect(violations.some((v) => v.type === "orphan_record")).toBe(true)
  })

  it("턴 수 초과 → retention_exceeded", () => {
    const manyTurns = Array.from(
      { length: 25 },
      (_, i): ArenaTurn => ({
        turnNumber: i + 1,
        speakerId: `p-00${(i % 2) + 1}`,
        content: `발언 ${i + 1}`,
        tokensUsed: 100,
        timestamp: NOW + i * 1000,
      })
    )
    const session = makeSession({ turns: manyTurns })
    const set = sessionToRecordSet(session)
    const violations = validateIsolation(set)
    expect(violations.some((v) => v.type === "retention_exceeded")).toBe(true)
  })

  it("참가자 비어있음 → cross_namespace_write", () => {
    const session = makeSession({ participants: ["", "p-002"] as [string, string] })
    const set = sessionToRecordSet(session)
    const violations = validateIsolation(set)
    expect(violations.some((v) => v.type === "cross_namespace_write")).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// validateWriteOperation
// ══════════════════════════════════════════════════════════════

describe("validateWriteOperation", () => {
  it("아레나 테이블 + 세션 ID → 위반 없음", () => {
    const op: ArenaWriteOperation = {
      targetTable: "ArenaSession",
      sessionId: "sess-001",
      operationType: "INSERT",
      description: "세션 생성",
    }
    const violations = validateWriteOperation(op)
    expect(violations).toHaveLength(0)
  })

  it("Persona 직접 변경 → direct_persona_mutation", () => {
    const op: ArenaWriteOperation = {
      targetTable: "Persona",
      sessionId: "sess-001",
      operationType: "UPDATE",
      description: "페르소나 직접 수정",
    }
    const violations = validateWriteOperation(op)
    expect(violations.some((v) => v.type === "direct_persona_mutation")).toBe(true)
  })

  it("PersonaVector 직접 변경 → direct_persona_mutation", () => {
    const op: ArenaWriteOperation = {
      targetTable: "PersonaVector",
      sessionId: "sess-001",
      operationType: "UPDATE",
      description: "벡터 직접 수정",
    }
    const violations = validateWriteOperation(op)
    expect(violations.some((v) => v.type === "direct_persona_mutation")).toBe(true)
  })

  it("세션 ID 없이 아레나 쓰기 → unscoped_query", () => {
    const op: ArenaWriteOperation = {
      targetTable: "ArenaTurn",
      operationType: "INSERT",
      description: "스코프 없는 턴 삽입",
    }
    const violations = validateWriteOperation(op)
    expect(violations.some((v) => v.type === "unscoped_query")).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// 쿼리 스코프
// ══════════════════════════════════════════════════════════════

describe("쿼리 스코프", () => {
  it("createScopedQuery 기본값", () => {
    const query = createScopedQuery("sess-001")
    expect(query.sessionId).toBe("sess-001")
    expect(query.includeRelations.turns).toBe(true)
    expect(query.includeRelations.judgment).toBe(true)
    expect(query.includeRelations.corrections).toBe(false)
    expect(query.includeRelations.tokenUsage).toBe(false)
  })

  it("createScopedQuery 커스텀", () => {
    const query = createScopedQuery("sess-001", { corrections: true, tokenUsage: true })
    expect(query.includeRelations.corrections).toBe(true)
    expect(query.includeRelations.tokenUsage).toBe(true)
  })

  it("createTimeRangeQuery 기본값 (30일)", () => {
    const query = createTimeRangeQuery()
    const thirtyDays = 30 * DAY_MS
    expect(query.toTimestamp - query.fromTimestamp).toBeCloseTo(thirtyDays, -3)
    expect(query.limit).toBe(50)
    expect(query.offset).toBe(0)
  })

  it("createTimeRangeQuery 커스텀", () => {
    const query = createTimeRangeQuery({
      statusFilter: ["COMPLETED"],
      participantFilter: "p-001",
      limit: 20,
    })
    expect(query.statusFilter).toEqual(["COMPLETED"])
    expect(query.participantFilter).toBe("p-001")
    expect(query.limit).toBe(20)
  })
})

// ══════════════════════════════════════════════════════════════
// 토큰 사용 추적
// ══════════════════════════════════════════════════════════════

describe("토큰 사용 추적", () => {
  it("createTokenUsageRecord 기본", () => {
    const record = createTokenUsageRecord("sess-001", "turn", 500, 200, 0.0021, "turn-1")
    expect(record.sessionId).toBe("sess-001")
    expect(record.phase).toBe("turn")
    expect(record.inputTokens).toBe(500)
    expect(record.outputTokens).toBe(200)
    expect(record.estimatedCostUSD).toBe(0.0021)
    expect(record.turnId).toBe("turn-1")
  })

  it("turnId 없으면 null", () => {
    const record = createTokenUsageRecord("sess-001", "judgment", 1000, 500, 0.01)
    expect(record.turnId).toBeNull()
  })

  it("summarizeTokenUsage 집계", () => {
    const records: ArenaTokenUsageRecord[] = [
      createTokenUsageRecord("sess-001", "profile_load", 1800, 0, 0.0054),
      createTokenUsageRecord("sess-001", "turn", 500, 200, 0.0021, "t1"),
      createTokenUsageRecord("sess-001", "turn", 600, 250, 0.0025, "t2"),
      createTokenUsageRecord("sess-001", "judgment", 2000, 500, 0.0135),
      createTokenUsageRecord("sess-002", "turn", 300, 100, 0.001), // 다른 세션
    ]

    const summary = summarizeTokenUsage("sess-001", records)
    expect(summary.sessionId).toBe("sess-001")
    expect(summary.totalInputTokens).toBe(1800 + 500 + 600 + 2000)
    expect(summary.totalOutputTokens).toBe(0 + 200 + 250 + 500)
    expect(summary.byPhase.turn.tokens).toBe(500 + 200 + 600 + 250)
    expect(summary.byPhase.judgment.tokens).toBe(2000 + 500)
    expect(summary.byPhase.profile_load.tokens).toBe(1800)
  })

  it("빈 레코드 → 모두 0", () => {
    const summary = summarizeTokenUsage("sess-001", [])
    expect(summary.totalTokens).toBe(0)
    expect(summary.totalCostUSD).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════
// 아카이브 요약
// ══════════════════════════════════════════════════════════════

describe("아카이브 요약", () => {
  it("computeArchiveSummary 기본", () => {
    const sessions: ArenaSessionRecord[] = [
      makeSessionRecord({ id: "s1", completedAt: NOW - DAY_MS * 5 }), // completed
      makeSessionRecord({ id: "s2", completedAt: NOW - DAY_MS * 100 }), // archived
      makeSessionRecord({ id: "s3", completedAt: NOW - DAY_MS * 400 }), // expired
    ]
    const turnCounts = new Map([
      ["s2", 4],
      ["s3", 6],
    ])
    const judgmentIds = new Set(["s2", "s3"])
    const correctionCounts = new Map([["s3", 2]])

    const summary = computeArchiveSummary(
      sessions,
      DEFAULT_ISOLATION_POLICY,
      turnCounts,
      judgmentIds,
      correctionCounts
    )
    expect(summary.expiredSessionCount).toBe(1)
    expect(summary.archivableSessionCount).toBe(1)
    expect(summary.totalTurnRecords).toBe(10) // 4 + 6
    expect(summary.totalJudgmentRecords).toBe(2)
    expect(summary.totalCorrectionRecords).toBe(2)
    expect(summary.oldestSessionDate).not.toBeNull()
  })

  it("빈 세션 → 모두 0", () => {
    const summary = computeArchiveSummary([])
    expect(summary.expiredSessionCount).toBe(0)
    expect(summary.archivableSessionCount).toBe(0)
    expect(summary.oldestSessionDate).toBeNull()
  })

  it("summarizeCleanup 문자열", () => {
    const summary: ArchiveSummary = {
      expiredSessionCount: 3,
      archivableSessionCount: 5,
      totalTurnRecords: 24,
      totalJudgmentRecords: 8,
      totalCorrectionRecords: 4,
      oldestSessionDate: NOW - DAY_MS * 400,
      newestSessionDate: NOW - DAY_MS * 100,
    }
    const text = summarizeCleanup(summary)
    expect(text).toContain("만료 세션: 3건")
    expect(text).toContain("아카이브 세션: 5건")
    expect(text).toContain("영향 턴: 24건")
    expect(text).toContain("가장 오래된 세션")
  })
})

// ══════════════════════════════════════════════════════════════
// 불변성 검증
// ══════════════════════════════════════════════════════════════

describe("불변성", () => {
  it("sessionToRecord → 원본 변경 없음", () => {
    const session = makeSession()
    const original = JSON.stringify(session)
    sessionToRecord(session)
    expect(JSON.stringify(session)).toBe(original)
  })

  it("sessionToRecordSet → 원본 변경 없음", () => {
    const session = makeSession()
    const judgment = makeJudgment()
    const corrections = [makeCorrection()]
    const origSession = JSON.stringify(session)
    const origJudgment = JSON.stringify(judgment)
    sessionToRecordSet(session, judgment, corrections)
    expect(JSON.stringify(session)).toBe(origSession)
    expect(JSON.stringify(judgment)).toBe(origJudgment)
  })

  it("validateIsolation → 원본 변경 없음", () => {
    const set = sessionToRecordSet(makeSession(), makeJudgment())
    const original = JSON.stringify(set)
    validateIsolation(set)
    expect(JSON.stringify(set)).toBe(original)
  })
})
