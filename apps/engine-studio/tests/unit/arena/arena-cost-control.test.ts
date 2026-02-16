import { describe, it, expect } from "vitest"
import {
  estimateSessionCost,
  checkSessionApproval,
  computeMonthlySpending,
  createCorrection,
  approveCorrection,
  rejectCorrection,
  buildCorrectionApplyResult,
  computeAdminStats,
  validateBudgetPolicy,
  getBudgetAlertLevel,
  DEFAULT_BUDGET_POLICY,
  JUDGMENT_TOKEN_ESTIMATE,
  AVG_TOKENS_PER_TURN,
} from "@/lib/arena/arena-cost-control"
import type { ArenaBudgetPolicy, CreateCorrectionParams } from "@/lib/arena/arena-cost-control"
import type { ArenaSession, ArenaJudgment } from "@/lib/arena/arena-engine"
import {
  createArenaSession,
  startSession,
  addTurn,
  PROFILE_TOKEN_ESTIMATES,
} from "@/lib/arena/arena-engine"

// ── 헬퍼 ────────────────────────────────────────────────────

function makeSession(
  overrides: Partial<{
    maxTurns: number
    budgetTokens: number
    usedTokens: number
    status: ArenaSession["status"]
  }> = {}
): ArenaSession {
  let session = startSession(
    createArenaSession({
      id: `session-${Date.now()}`,
      participants: ["persona-a", "persona-b"],
      topic: "테스트 주제",
      maxTurns: overrides.maxTurns ?? 6,
      budgetTokens: overrides.budgetTokens ?? 10000,
    })
  )
  if (overrides.usedTokens) {
    session = { ...session, usedTokens: overrides.usedTokens }
  }
  if (overrides.status) {
    session = { ...session, status: overrides.status }
  }
  return session
}

function makeJudgment(
  sessionId: string,
  overallScore: number,
  issues: ArenaJudgment["issues"] = []
): ArenaJudgment {
  return {
    sessionId,
    scores: {
      characterConsistency: overallScore,
      l2Emergence: overallScore,
      paradoxEmergence: overallScore,
      triggerResponse: overallScore,
    },
    overallScore,
    issues,
    summary: "테스트 판정",
    judgedAt: Date.now(),
  }
}

function makeCorrectionParams(
  overrides: Partial<CreateCorrectionParams> = {}
): CreateCorrectionParams {
  return {
    id: "corr-1",
    sessionId: "session-1",
    turnNumber: 1,
    originalContent: "원본 내용",
    correctedContent: "교정된 내용",
    issueCategory: "voice",
    reason: "말투 불일치",
    ...overrides,
  }
}

function makePolicy(overrides: Partial<ArenaBudgetPolicy> = {}): ArenaBudgetPolicy {
  return { ...DEFAULT_BUDGET_POLICY, ...overrides }
}

// ═══════════════════════════════════════════════════════════════
// estimateSessionCost
// ═══════════════════════════════════════════════════════════════

describe("estimateSessionCost", () => {
  it("STANDARD 프로필 + 6턴 → 정확한 추정", () => {
    const estimate = estimateSessionCost("STANDARD", 6, 0)
    expect(estimate.profileTokens).toBe(PROFILE_TOKEN_ESTIMATES.STANDARD) // 1800
    expect(estimate.turnTokens).toBe(6 * AVG_TOKENS_PER_TURN) // 3000
    expect(estimate.judgmentTokens).toBe(JUDGMENT_TOKEN_ESTIMATE) // 2000
    expect(estimate.totalEstimatedTokens).toBe(1800 + 3000 + 2000) // 6800
  })

  it("FULL 프로필 → 더 높은 토큰", () => {
    const full = estimateSessionCost("FULL", 6, 0)
    const standard = estimateSessionCost("STANDARD", 6, 0)
    expect(full.totalEstimatedTokens).toBeGreaterThan(standard.totalEstimatedTokens)
  })

  it("LITE 프로필 → 더 낮은 토큰", () => {
    const lite = estimateSessionCost("LITE", 6, 0)
    const standard = estimateSessionCost("STANDARD", 6, 0)
    expect(lite.totalEstimatedTokens).toBeLessThan(standard.totalEstimatedTokens)
  })

  it("턴 수 증가 → 비용 증가", () => {
    const short = estimateSessionCost("STANDARD", 2, 0)
    const long = estimateSessionCost("STANDARD", 20, 0)
    expect(long.totalEstimatedTokens).toBeGreaterThan(short.totalEstimatedTokens)
  })

  it("예산 내 → withinBudget true", () => {
    const estimate = estimateSessionCost("LITE", 2, 0)
    expect(estimate.withinBudget).toBe(true)
    expect(estimate.remainingAfter).toBeGreaterThan(0)
  })

  it("예산 초과 → withinBudget false", () => {
    const policy = makePolicy({ monthlyBudgetTokens: 1000 })
    const estimate = estimateSessionCost("FULL", 20, 0, policy)
    expect(estimate.withinBudget).toBe(false)
    expect(estimate.remainingAfter).toBe(0)
  })

  it("이미 사용한 토큰 반영", () => {
    const estimate = estimateSessionCost("STANDARD", 6, 490000)
    // 500000 - 490000 - 6800 = 3200
    expect(estimate.remainingAfter).toBe(3200)
    expect(estimate.withinBudget).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// checkSessionApproval
// ═══════════════════════════════════════════════════════════════

describe("checkSessionApproval", () => {
  it("정상 조건 → 승인", () => {
    const result = checkSessionApproval(0, 0, "STANDARD", 6)
    expect(result.approved).toBe(true)
    expect(result.reasons).toHaveLength(0)
  })

  it("일일 세션 한도 초과 → 거부", () => {
    const result = checkSessionApproval(0, 10, "STANDARD", 6)
    expect(result.approved).toBe(false)
    expect(result.reasons.some((r) => r.includes("일일 세션 한도"))).toBe(true)
  })

  it("세션 토큰 한도 초과 → 거부", () => {
    const policy = makePolicy({ maxTokensPerSession: 3000 })
    const result = checkSessionApproval(0, 0, "FULL", 20, policy)
    expect(result.approved).toBe(false)
    expect(result.reasons.some((r) => r.includes("세션 토큰 한도"))).toBe(true)
  })

  it("월간 예산 차단 → 거부", () => {
    const policy = makePolicy({ monthlyBudgetTokens: 10000 })
    const result = checkSessionApproval(9000, 0, "STANDARD", 6, policy)
    expect(result.approved).toBe(false)
    expect(result.reasons.some((r) => r.includes("월간 예산 차단"))).toBe(true)
  })

  it("여러 사유 동시 발생", () => {
    const policy = makePolicy({
      monthlyBudgetTokens: 1000,
      dailySessionLimit: 1,
      maxTokensPerSession: 100,
    })
    const result = checkSessionApproval(900, 1, "FULL", 20, policy)
    expect(result.approved).toBe(false)
    expect(result.reasons.length).toBeGreaterThanOrEqual(2)
  })

  it("커스텀 정책 적용", () => {
    const policy = makePolicy({ dailySessionLimit: 100 })
    const result = checkSessionApproval(0, 50, "STANDARD", 6, policy)
    expect(result.approved).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeMonthlySpending
// ═══════════════════════════════════════════════════════════════

describe("computeMonthlySpending", () => {
  it("빈 세션 → 0 지출", () => {
    const summary = computeMonthlySpending([], "2026-02")
    expect(summary.totalTokensUsed).toBe(0)
    expect(summary.totalSessions).toBe(0)
    expect(summary.usagePercent).toBe(0)
    expect(summary.status).toBe("NORMAL")
  })

  it("세션 지출 합산", () => {
    const sessions = [
      makeSession({ usedTokens: 5000, status: "COMPLETED" }),
      makeSession({ usedTokens: 3000, status: "COMPLETED" }),
    ]
    const summary = computeMonthlySpending(sessions, "2026-02")
    expect(summary.totalTokensUsed).toBe(8000)
    expect(summary.completedSessions).toBe(2)
  })

  it("취소 세션 별도 카운트", () => {
    const sessions = [
      makeSession({ usedTokens: 1000, status: "COMPLETED" }),
      makeSession({ usedTokens: 500, status: "CANCELLED" }),
    ]
    const summary = computeMonthlySpending(sessions, "2026-02")
    expect(summary.completedSessions).toBe(1)
    expect(summary.cancelledSessions).toBe(1)
  })

  it("WARNING 상태 판정", () => {
    const policy = makePolicy({ monthlyBudgetTokens: 10000 })
    const sessions = [makeSession({ usedTokens: 8500, status: "COMPLETED" })]
    const summary = computeMonthlySpending(sessions, "2026-02", policy)
    expect(summary.status).toBe("WARNING")
  })

  it("BLOCKED 상태 판정", () => {
    const policy = makePolicy({ monthlyBudgetTokens: 10000 })
    const sessions = [makeSession({ usedTokens: 10000, status: "COMPLETED" })]
    const summary = computeMonthlySpending(sessions, "2026-02", policy)
    expect(summary.status).toBe("BLOCKED")
  })

  it("평균 토큰/세션 계산", () => {
    const sessions = [
      makeSession({ usedTokens: 4000, status: "COMPLETED" }),
      makeSession({ usedTokens: 6000, status: "COMPLETED" }),
    ]
    const summary = computeMonthlySpending(sessions, "2026-02")
    expect(summary.avgTokensPerSession).toBe(5000)
  })

  it("일별 분류 포함", () => {
    const sessions = [
      makeSession({ usedTokens: 3000, status: "COMPLETED" }),
      makeSession({ usedTokens: 2000, status: "COMPLETED" }),
    ]
    const summary = computeMonthlySpending(sessions, "2026-02")
    expect(summary.dailyBreakdown.length).toBeGreaterThanOrEqual(1)
    expect(summary.dailyBreakdown[0].sessionCount).toBeGreaterThanOrEqual(1)
  })

  it("remainingTokens 정확", () => {
    const policy = makePolicy({ monthlyBudgetTokens: 100000 })
    const sessions = [makeSession({ usedTokens: 30000, status: "COMPLETED" })]
    const summary = computeMonthlySpending(sessions, "2026-02", policy)
    expect(summary.remainingTokens).toBe(70000)
  })
})

// ═══════════════════════════════════════════════════════════════
// 교정 관리
// ═══════════════════════════════════════════════════════════════

describe("createCorrection", () => {
  it("PENDING 상태로 생성", () => {
    const correction = createCorrection(makeCorrectionParams())
    expect(correction.status).toBe("PENDING")
    expect(correction.reviewedAt).toBeNull()
    expect(correction.reviewedBy).toBeNull()
    expect(correction.createdAt).toBeGreaterThan(0)
  })

  it("파라미터 정확 반영", () => {
    const params = makeCorrectionParams({ issueCategory: "l2", reason: "L2 기질 미달" })
    const correction = createCorrection(params)
    expect(correction.issueCategory).toBe("l2")
    expect(correction.reason).toBe("L2 기질 미달")
  })
})

describe("approveCorrection", () => {
  it("PENDING → APPROVED", () => {
    const correction = createCorrection(makeCorrectionParams())
    const approved = approveCorrection(correction, "admin-1")
    expect(approved.status).toBe("APPROVED")
    expect(approved.reviewedBy).toBe("admin-1")
    expect(approved.reviewedAt).not.toBeNull()
  })

  it("이미 APPROVED → 변경 없음", () => {
    const correction = createCorrection(makeCorrectionParams())
    const approved = approveCorrection(correction, "admin-1")
    const result = approveCorrection(approved, "admin-2")
    expect(result.reviewedBy).toBe("admin-1") // 원래 승인자 유지
  })

  it("REJECTED → 변경 없음", () => {
    const correction = createCorrection(makeCorrectionParams())
    const rejected = rejectCorrection(correction, "admin-1")
    const result = approveCorrection(rejected, "admin-2")
    expect(result.status).toBe("REJECTED")
  })

  it("불변성 유지", () => {
    const correction = createCorrection(makeCorrectionParams())
    approveCorrection(correction, "admin-1")
    expect(correction.status).toBe("PENDING")
  })
})

describe("rejectCorrection", () => {
  it("PENDING → REJECTED", () => {
    const correction = createCorrection(makeCorrectionParams())
    const rejected = rejectCorrection(correction, "admin-1")
    expect(rejected.status).toBe("REJECTED")
    expect(rejected.reviewedBy).toBe("admin-1")
  })

  it("이미 APPROVED → 변경 없음", () => {
    const correction = createCorrection(makeCorrectionParams())
    const approved = approveCorrection(correction, "admin-1")
    const result = rejectCorrection(approved, "admin-2")
    expect(result.status).toBe("APPROVED")
  })
})

// ═══════════════════════════════════════════════════════════════
// buildCorrectionApplyResult
// ═══════════════════════════════════════════════════════════════

describe("buildCorrectionApplyResult", () => {
  it("APPROVED → 적용 결과 반환", () => {
    const correction = approveCorrection(createCorrection(makeCorrectionParams()), "admin-1")
    const result = buildCorrectionApplyResult(correction)
    expect(result).not.toBeNull()
    expect(result!.correctionId).toBe("corr-1")
    expect(result!.updatedFields.length).toBeGreaterThan(0)
  })

  it("PENDING → null", () => {
    const correction = createCorrection(makeCorrectionParams())
    expect(buildCorrectionApplyResult(correction)).toBeNull()
  })

  it("REJECTED → null", () => {
    const correction = rejectCorrection(createCorrection(makeCorrectionParams()), "admin-1")
    expect(buildCorrectionApplyResult(correction)).toBeNull()
  })

  it("voice 카테고리 → voiceProfile 필드", () => {
    const correction = approveCorrection(
      createCorrection(makeCorrectionParams({ issueCategory: "voice" })),
      "admin-1"
    )
    const result = buildCorrectionApplyResult(correction)!
    expect(result.updatedFields.some((f) => f.includes("voiceProfile"))).toBe(true)
  })

  it("consistency 카테고리 → factbook 필드", () => {
    const correction = approveCorrection(
      createCorrection(makeCorrectionParams({ issueCategory: "consistency" })),
      "admin-1"
    )
    const result = buildCorrectionApplyResult(correction)!
    expect(result.updatedFields).toContain("factbook")
  })

  it("l2 카테고리 → coreTemperament 필드", () => {
    const correction = approveCorrection(
      createCorrection(makeCorrectionParams({ issueCategory: "l2" })),
      "admin-1"
    )
    const result = buildCorrectionApplyResult(correction)!
    expect(result.updatedFields).toContain("coreTemperament")
  })

  it("paradox 카테고리 → narrativeDrive 필드", () => {
    const correction = approveCorrection(
      createCorrection(makeCorrectionParams({ issueCategory: "paradox" })),
      "admin-1"
    )
    const result = buildCorrectionApplyResult(correction)!
    expect(result.updatedFields.some((f) => f.includes("narrativeDrive"))).toBe(true)
  })

  it("trigger 카테고리 → triggerMap 필드", () => {
    const correction = approveCorrection(
      createCorrection(makeCorrectionParams({ issueCategory: "trigger" })),
      "admin-1"
    )
    const result = buildCorrectionApplyResult(correction)!
    expect(result.updatedFields).toContain("triggerMap")
  })
})

// ═══════════════════════════════════════════════════════════════
// computeAdminStats
// ═══════════════════════════════════════════════════════════════

describe("computeAdminStats", () => {
  it("빈 데이터 → 0 통계", () => {
    const stats = computeAdminStats([], [], [])
    expect(stats.totalSessions).toBe(0)
    expect(stats.avgOverallScore).toBe(0)
    expect(stats.pendingCorrections).toBe(0)
  })

  it("세션 통계 정확", () => {
    const sessions = [
      makeSession({ usedTokens: 5000, status: "COMPLETED" }),
      makeSession({ usedTokens: 3000, status: "RUNNING" }),
      makeSession({ status: "PENDING" }),
    ]
    const stats = computeAdminStats(sessions, [], [])
    expect(stats.totalSessions).toBe(3)
    expect(stats.activeSessions).toBe(2) // RUNNING + PENDING
    expect(stats.completedSessions).toBe(1)
    expect(stats.totalTokensUsed).toBe(8000)
  })

  it("판정 점수 평균 계산", () => {
    const judgments = [makeJudgment("s1", 0.8), makeJudgment("s2", 0.6)]
    const stats = computeAdminStats([], judgments, [])
    expect(stats.avgOverallScore).toBe(0.7)
  })

  it("이슈 카운트", () => {
    const judgments = [
      makeJudgment("s1", 0.5, [
        {
          turnNumber: 1,
          personaId: "p1",
          category: "consistency",
          severity: "minor",
          description: "이슈1",
          suggestion: "제안1",
        },
        {
          turnNumber: 2,
          personaId: "p1",
          category: "consistency",
          severity: "critical",
          description: "이슈2",
          suggestion: "제안2",
        },
      ]),
    ]
    const stats = computeAdminStats([], judgments, [])
    expect(stats.issueCount).toBe(2)
    expect(stats.criticalIssueCount).toBe(1)
  })

  it("대기 중 교정 카운트", () => {
    const corrections = [
      createCorrection(makeCorrectionParams({ id: "c1" })),
      createCorrection(makeCorrectionParams({ id: "c2" })),
      approveCorrection(createCorrection(makeCorrectionParams({ id: "c3" })), "admin"),
    ]
    const stats = computeAdminStats([], [], corrections)
    expect(stats.pendingCorrections).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════
// validateBudgetPolicy
// ═══════════════════════════════════════════════════════════════

describe("validateBudgetPolicy", () => {
  it("유효한 정책 → valid true", () => {
    const result = validateBudgetPolicy(DEFAULT_BUDGET_POLICY)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("월간 예산 0 → 에러", () => {
    const result = validateBudgetPolicy(makePolicy({ monthlyBudgetTokens: 0 }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("월간 예산"))).toBe(true)
  })

  it("일일 세션 한도 0 → 에러", () => {
    const result = validateBudgetPolicy(makePolicy({ dailySessionLimit: 0 }))
    expect(result.valid).toBe(false)
  })

  it("세션당 최대 토큰 음수 → 에러", () => {
    const result = validateBudgetPolicy(makePolicy({ maxTokensPerSession: -1 }))
    expect(result.valid).toBe(false)
  })

  it("경고 임계 ≥ 차단 임계 → 에러", () => {
    const result = validateBudgetPolicy(makePolicy({ warningThreshold: 1.0, blockThreshold: 0.8 }))
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("경고 임계값"))).toBe(true)
  })

  it("경고 임계 0 → 에러", () => {
    const result = validateBudgetPolicy(makePolicy({ warningThreshold: 0 }))
    expect(result.valid).toBe(false)
  })

  it("차단 임계 > 1 → 에러", () => {
    const result = validateBudgetPolicy(makePolicy({ blockThreshold: 1.5 }))
    expect(result.valid).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// getBudgetAlertLevel
// ═══════════════════════════════════════════════════════════════

describe("getBudgetAlertLevel", () => {
  it("0% 사용 → NORMAL", () => {
    expect(getBudgetAlertLevel(0, DEFAULT_BUDGET_POLICY)).toBe("NORMAL")
  })

  it("50% 사용 → NORMAL", () => {
    expect(getBudgetAlertLevel(250000, DEFAULT_BUDGET_POLICY)).toBe("NORMAL")
  })

  it("80% 사용 → WARNING", () => {
    expect(getBudgetAlertLevel(400000, DEFAULT_BUDGET_POLICY)).toBe("WARNING")
  })

  it("90% 사용 → CRITICAL", () => {
    expect(getBudgetAlertLevel(450000, DEFAULT_BUDGET_POLICY)).toBe("CRITICAL")
  })

  it("100% 사용 → BLOCKED", () => {
    expect(getBudgetAlertLevel(500000, DEFAULT_BUDGET_POLICY)).toBe("BLOCKED")
  })

  it("예산 0 → BLOCKED", () => {
    const policy = makePolicy({ monthlyBudgetTokens: 0 })
    expect(getBudgetAlertLevel(0, policy)).toBe("BLOCKED")
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("DEFAULT_BUDGET_POLICY 유효", () => {
    const result = validateBudgetPolicy(DEFAULT_BUDGET_POLICY)
    expect(result.valid).toBe(true)
  })

  it("JUDGMENT_TOKEN_ESTIMATE > 0", () => {
    expect(JUDGMENT_TOKEN_ESTIMATE).toBeGreaterThan(0)
  })

  it("AVG_TOKENS_PER_TURN > 0", () => {
    expect(AVG_TOKENS_PER_TURN).toBeGreaterThan(0)
  })

  it("warningThreshold < blockThreshold", () => {
    expect(DEFAULT_BUDGET_POLICY.warningThreshold).toBeLessThan(
      DEFAULT_BUDGET_POLICY.blockThreshold
    )
  })
})
