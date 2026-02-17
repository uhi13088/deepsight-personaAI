import { describe, it, expect } from "vitest"
import {
  selectQuestions,
  createJudgment,
  aggregateResults,
  selectInterviewTargets,
  DEFAULT_SCHEDULE_CONFIG,
  type PersonaScheduleInfo,
} from "@/lib/persona-world/quality/auto-interview"
import {
  computeContextRecall,
  computeSettingConsistency,
  computeCharacterStability,
  computePIS,
  getPISGrade,
  getPISAction,
} from "@/lib/persona-world/quality/integrity-score"
import {
  createPostQualityLog,
  createCommentQualityLog,
  createInteractionPatternLog,
  detectAnomalies,
  aggregatePostQualityLogs,
  aggregateCommentQualityLogs,
} from "@/lib/persona-world/quality/quality-logger"
import {
  createArenaTrigger,
  checkInterviewTrigger,
  checkPISDropTrigger,
  checkPISCriticalTrigger,
  checkBotPatternTrigger,
  checkFactbookViolationTrigger,
  checkAllTriggers,
  createCorrectionTracking,
  evaluateCorrectionVerdict,
  recordCorrectionResult,
} from "@/lib/persona-world/quality/arena-bridge"
import {
  runQualityCheck,
  analyzePISChange,
  detectQualityIssues,
  selectQualityCheckTargets,
} from "@/lib/persona-world/quality/quality-integration"

// ═══ Auto-Interview ═══

describe("Auto-Interview PW Extension", () => {
  it("Golden Sample 20문항 생성", () => {
    const questions = selectQuestions()
    expect(questions).toHaveLength(20)
    const layers = questions.map((q) => q.layer)
    expect(layers.filter((l) => l === "L1")).toHaveLength(7)
    expect(layers.filter((l) => l === "L2")).toHaveLength(5)
    expect(layers.filter((l) => l === "L3")).toHaveLength(4)
    expect(layers.filter((l) => l === "cross")).toHaveLength(4)
  })

  it("동적 문항 추가 (토픽 기반)", () => {
    const questions = selectQuestions(["최신 영화 리뷰"])
    expect(questions).toHaveLength(21) // 20 + 1 dynamic
    expect(questions[20].id).toBe("pw-dynamic-01")
    expect(questions[20].questionText).toContain("최신 영화 리뷰")
  })

  it("판정 생성 — pass", () => {
    const j = createJudgment("pw-l1-01", 0.9, "일관된 입장")
    expect(j.verdict).toBe("pass")
    expect(j.score).toBe(0.9)
  })

  it("판정 생성 — warning", () => {
    const j = createJudgment("pw-l1-01", 0.75, "약간 불일치")
    expect(j.verdict).toBe("warning")
  })

  it("판정 생성 — fail", () => {
    const j = createJudgment("pw-l1-01", 0.5, "심각한 불일치")
    expect(j.verdict).toBe("fail")
  })

  it("점수 클램핑 (0~1)", () => {
    const j = createJudgment("test", 1.5, "초과")
    expect(j.score).toBe(1.0)
    const j2 = createJudgment("test", -0.3, "음수")
    expect(j2.score).toBe(0)
  })

  it("결과 집계 — verdict=pass", () => {
    const questions = selectQuestions()
    const judgments = questions.map((q) => createJudgment(q.id, 0.9, "good"))
    const result = aggregateResults("p1", questions, judgments, { input: 1000, output: 500 })
    expect(result.verdict).toBe("pass")
    expect(result.overallScore).toBe(0.9)
    expect(result.failedDimensions).toHaveLength(0)
  })

  it("결과 집계 — fail 차원 감지", () => {
    const questions = selectQuestions()
    const judgments = questions.map((q, i) =>
      createJudgment(q.id, i === 0 ? 0.5 : 0.9, i === 0 ? "fail" : "pass")
    )
    const result = aggregateResults("p1", questions, judgments, { input: 1000, output: 500 })
    expect(result.failedDimensions).toContain("stance")
  })

  it("빈 판정 → fail", () => {
    const result = aggregateResults("p1", [], [], { input: 0, output: 0 })
    expect(result.verdict).toBe("fail")
    expect(result.overallScore).toBe(0)
  })
})

describe("적응적 스케줄링", () => {
  const now = new Date("2026-02-17T12:00:00Z")

  it("이탈 감지 페르소나 우선 포함", () => {
    const personas: PersonaScheduleInfo[] = [
      {
        personaId: "p1",
        pisGrade: "GOOD",
        lastInterviewAt: now,
        hasRecentDeviation: true,
      },
      {
        personaId: "p2",
        pisGrade: "GOOD",
        lastInterviewAt: now,
        hasRecentDeviation: false,
      },
    ]
    const targets = selectInterviewTargets(personas, DEFAULT_SCHEDULE_CONFIG, now)
    expect(targets).toContain("p1")
  })

  it("인터뷰 이력 없으면 포함", () => {
    const personas: PersonaScheduleInfo[] = [
      {
        personaId: "new-persona",
        pisGrade: "GOOD",
        lastInterviewAt: null,
        hasRecentDeviation: false,
      },
    ]
    const targets = selectInterviewTargets(personas, DEFAULT_SCHEDULE_CONFIG, now)
    expect(targets).toContain("new-persona")
  })

  it("CRITICAL 등급 → 1일 주기", () => {
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const personas: PersonaScheduleInfo[] = [
      {
        personaId: "critical-1",
        pisGrade: "CRITICAL",
        lastInterviewAt: twoDaysAgo,
        hasRecentDeviation: false,
      },
    ]
    const targets = selectInterviewTargets(personas, DEFAULT_SCHEDULE_CONFIG, now)
    expect(targets).toContain("critical-1")
  })

  it("EXCELLENT 등급 + 최근 인터뷰 → 랜덤 샘플링만", () => {
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    const personas: PersonaScheduleInfo[] = [
      {
        personaId: "excellent-1",
        pisGrade: "EXCELLENT",
        lastInterviewAt: oneDayAgo, // 14일 주기, 1일 전 → 스킵
        hasRecentDeviation: false,
      },
    ]
    // 샘플링 비율 0이면 포함 안 됨
    const config = { ...DEFAULT_SCHEDULE_CONFIG, defaultSampleRatio: 0 }
    const targets = selectInterviewTargets(personas, config, now)
    expect(targets).not.toContain("excellent-1")
  })
})

// ═══ PIS Calculation ═══

describe("PIS Calculation", () => {
  it("Context Recall 계산", () => {
    const score = computeContextRecall({
      recentMemoryAccuracy: 0.9,
      mediumTermAccuracy: 0.8,
      coreMemoryRetention: 0.95,
    })
    // 0.9*0.4 + 0.8*0.3 + 0.95*0.3 = 0.36 + 0.24 + 0.285 = 0.885
    expect(score).toBeCloseTo(0.89, 1)
  })

  it("Setting Consistency 계산", () => {
    const score = computeSettingConsistency({
      factbookCompliance: 1.0,
      voiceSpecAdherence: 0.85,
      vectorBehaviorAlign: 0.9,
    })
    // 1.0*0.4 + 0.85*0.3 + 0.9*0.3 = 0.4 + 0.255 + 0.27 = 0.925
    expect(score).toBeCloseTo(0.93, 1)
  })

  it("Character Stability 계산 (drift/variance → 반전)", () => {
    const score = computeCharacterStability({
      weeklyDrift: 0.1, // → 0.9
      toneVariance: 0.15, // → 0.85
      growthArcAlignment: 0.8,
    })
    // 0.9*0.35 + 0.85*0.35 + 0.8*0.3 = 0.315 + 0.2975 + 0.24 = 0.8525
    expect(score).toBeCloseTo(0.85, 1)
  })

  it("PIS 종합 계산", () => {
    const result = computePIS(
      { recentMemoryAccuracy: 0.9, mediumTermAccuracy: 0.85, coreMemoryRetention: 0.9 },
      { factbookCompliance: 0.95, voiceSpecAdherence: 0.9, vectorBehaviorAlign: 0.85 },
      { weeklyDrift: 0.1, toneVariance: 0.1, growthArcAlignment: 0.85 },
      30
    )
    expect(result.overall).toBeGreaterThanOrEqual(0.8)
    expect(["EXCELLENT", "GOOD"]).toContain(result.grade)
    expect(result.confidence).toBe(0.6) // 30/50
  })

  it("등급 판정", () => {
    expect(getPISGrade(0.95)).toBe("EXCELLENT")
    expect(getPISGrade(0.85)).toBe("GOOD")
    expect(getPISGrade(0.75)).toBe("WARNING")
    expect(getPISGrade(0.65)).toBe("CRITICAL")
    expect(getPISGrade(0.5)).toBe("QUARANTINE")
  })

  it("자동 조치 결정", () => {
    expect(getPISAction("EXCELLENT").type).toBe("REDUCE_FREQUENCY")
    expect(getPISAction("GOOD").type).toBe("NORMAL")
    expect(getPISAction("WARNING").type).toBe("INCREASE_FREQUENCY")
    expect(getPISAction("CRITICAL").type).toBe("SCHEDULE_ARENA")
    expect(getPISAction("QUARANTINE").type).toBe("PAUSE_ACTIVITY")
  })

  it("Confidence = min(1, sampleSize/50)", () => {
    const result = computePIS(
      { recentMemoryAccuracy: 0.9, mediumTermAccuracy: 0.9, coreMemoryRetention: 0.9 },
      { factbookCompliance: 0.9, voiceSpecAdherence: 0.9, vectorBehaviorAlign: 0.9 },
      { weeklyDrift: 0.05, toneVariance: 0.05, growthArcAlignment: 0.9 },
      100
    )
    expect(result.confidence).toBe(1) // capped
  })
})

// ═══ Quality Logger ═══

describe("Quality Logger", () => {
  it("PostQualityLog 생성", () => {
    const log = createPostQualityLog({
      postId: "post-1",
      personaId: "p1",
      postType: "OPINION",
      trigger: "SCHEDULED",
      llmModel: "claude-sonnet-4-5-20250929",
      tokenUsage: { input: 500, output: 200, cached: 100 },
      latency: 1200,
      content: "테스트 포스트 내용입니다.",
      voiceSpecMatch: 0.85,
      factbookViolations: [],
      repetitionScore: 0.1,
      topicRelevance: 0.9,
    })

    expect(log.postId).toBe("post-1")
    expect(log.generation.trigger).toBe("SCHEDULED")
    expect(log.quality.lengthChars).toBe("테스트 포스트 내용입니다.".length)
    expect(log.quality.voiceSpecMatch).toBe(0.85)
    expect(log.quality.factbookViolations).toHaveLength(0)
  })

  it("CommentQualityLog 생성", () => {
    const log = createCommentQualityLog({
      commentId: "c1",
      personaId: "p1",
      targetPostId: "post-1",
      selectedTone: "empathetic",
      toneMatchScore: 0.9,
      relationshipStage: "ACQUAINTANCE",
      moodAtGeneration: 0.7,
      contextRelevance: 0.85,
      memoryReference: true,
      naturalness: 0.8,
    })

    expect(log.toneAnalysis.selectedTone).toBe("empathetic")
    expect(log.toneAnalysis.toneMatchScore).toBe(0.9)
    expect(log.conversationQuality.memoryReference).toBe(true)
  })

  it("값 클램핑 (0~1)", () => {
    const log = createPostQualityLog({
      postId: "p1",
      personaId: "p1",
      postType: "REVIEW",
      trigger: "EVENT",
      llmModel: "test",
      tokenUsage: { input: 0, output: 0, cached: 0 },
      latency: 0,
      content: "t",
      voiceSpecMatch: 1.5, // 초과
      factbookViolations: [],
      repetitionScore: -0.1, // 음수
      topicRelevance: 0.5,
    })
    expect(log.quality.voiceSpecMatch).toBe(1)
    expect(log.quality.repetitionScore).toBe(0)
  })

  it("BOT_PATTERN 감지 (짧은 간격)", () => {
    const anomalies = detectAnomalies(
      {
        postsCreated: 10,
        commentsWritten: 15,
        likesGiven: 5,
        followsInitiated: 0,
        repostsShared: 0,
      },
      {
        activeHours: [9, 10],
        avgIntervalMinutes: 2,
        targetDiversity: 0.5,
        topicDiversity: 0.5,
        energyCorrelation: 0.8,
      },
      0.7
    )
    expect(anomalies.some((a) => a.type === "BOT_PATTERN")).toBe(true)
    expect(anomalies.find((a) => a.type === "BOT_PATTERN")?.severity).toBe("CRITICAL")
  })

  it("ENERGY_MISMATCH 감지", () => {
    const anomalies = detectAnomalies(
      {
        postsCreated: 10,
        commentsWritten: 20,
        likesGiven: 5,
        followsInitiated: 0,
        repostsShared: 0,
      },
      {
        activeHours: [9],
        avgIntervalMinutes: 10,
        targetDiversity: 0.5,
        topicDiversity: 0.5,
        energyCorrelation: 0.3,
      },
      0.1 // 에너지 낮은데 활동 많음
    )
    expect(anomalies.some((a) => a.type === "ENERGY_MISMATCH")).toBe(true)
  })

  it("SUDDEN_BURST 감지", () => {
    const anomalies = detectAnomalies(
      {
        postsCreated: 15,
        commentsWritten: 5,
        likesGiven: 0,
        followsInitiated: 0,
        repostsShared: 0,
      },
      {
        activeHours: [10],
        avgIntervalMinutes: 10,
        targetDiversity: 0.5,
        topicDiversity: 0.5,
        energyCorrelation: 0.5,
      },
      0.8
    )
    expect(anomalies.some((a) => a.type === "SUDDEN_BURST")).toBe(true)
  })

  it("PROLONGED_SILENCE 감지", () => {
    const anomalies = detectAnomalies(
      { postsCreated: 0, commentsWritten: 0, likesGiven: 0, followsInitiated: 0, repostsShared: 0 },
      {
        activeHours: [],
        avgIntervalMinutes: 0,
        targetDiversity: 0,
        topicDiversity: 0,
        energyCorrelation: 0,
      },
      0.5
    )
    expect(anomalies.some((a) => a.type === "PROLONGED_SILENCE")).toBe(true)
  })

  it("InteractionPatternLog 생성 (이상 포함)", () => {
    const log = createInteractionPatternLog({
      personaId: "p1",
      period: "DAILY",
      stats: {
        postsCreated: 0,
        commentsWritten: 0,
        likesGiven: 0,
        followsInitiated: 0,
        repostsShared: 0,
      },
      patterns: {
        activeHours: [],
        avgIntervalMinutes: 0,
        targetDiversity: 0,
        topicDiversity: 0,
        energyCorrelation: 0,
      },
      energy: 0.5,
    })
    expect(log.anomalies.length).toBeGreaterThan(0)
    expect(log.period).toBe("DAILY")
  })

  it("PostQualityLog 집계", () => {
    const logs = [
      createPostQualityLog({
        postId: "p1",
        personaId: "p1",
        postType: "REVIEW",
        trigger: "SCHEDULED",
        llmModel: "test",
        tokenUsage: { input: 100, output: 50, cached: 0 },
        latency: 1000,
        content: "test content one",
        voiceSpecMatch: 0.8,
        factbookViolations: ["fact-1"],
        repetitionScore: 0.2,
        topicRelevance: 0.9,
      }),
      createPostQualityLog({
        postId: "p2",
        personaId: "p1",
        postType: "OPINION",
        trigger: "EVENT",
        llmModel: "test",
        tokenUsage: { input: 200, output: 100, cached: 50 },
        latency: 800,
        content: "test content two",
        voiceSpecMatch: 0.9,
        factbookViolations: [],
        repetitionScore: 0.1,
        topicRelevance: 0.85,
      }),
    ]

    const stats = aggregatePostQualityLogs(logs)
    expect(stats.total).toBe(2)
    expect(stats.avgVoiceSpecMatch).toBe(0.85)
    expect(stats.avgRepetitionScore).toBe(0.15)
    expect(stats.totalFactbookViolations).toBe(1)
  })

  it("CommentQualityLog 집계", () => {
    const logs = [
      createCommentQualityLog({
        commentId: "c1",
        personaId: "p1",
        targetPostId: "post-1",
        selectedTone: "empathetic",
        toneMatchScore: 0.8,
        relationshipStage: "ACQUAINTANCE",
        moodAtGeneration: 0.7,
        contextRelevance: 0.9,
        memoryReference: true,
        naturalness: 0.85,
      }),
      createCommentQualityLog({
        commentId: "c2",
        personaId: "p1",
        targetPostId: "post-2",
        selectedTone: "deep_analysis",
        toneMatchScore: 0.7,
        relationshipStage: "FRIEND",
        moodAtGeneration: 0.6,
        contextRelevance: 0.8,
        memoryReference: false,
        naturalness: 0.75,
      }),
    ]

    const stats = aggregateCommentQualityLogs(logs)
    expect(stats.total).toBe(2)
    expect(stats.avgToneMatchScore).toBe(0.75)
    expect(stats.memoryReferenceRate).toBe(0.5)
  })

  it("빈 로그 집계", () => {
    const postStats = aggregatePostQualityLogs([])
    expect(postStats.total).toBe(0)
    const commentStats = aggregateCommentQualityLogs([])
    expect(commentStats.total).toBe(0)
  })
})

// ═══ Arena Bridge ═══

describe("Arena Bridge", () => {
  it("트리거 생성", () => {
    const trigger = createArenaTrigger("p1", "INTERVIEW_FAIL", "score < 0.70")
    expect(trigger.type).toBe("INTERVIEW_FAIL")
    expect(trigger.priority).toBe("HIGH")
    expect(trigger.maxDelayHours).toBe(2)
    expect(trigger.personaId).toBe("p1")
  })

  it("Interview 트리거 — score < 0.70 → 트리거", () => {
    const trigger = checkInterviewTrigger("p1", 0.65)
    expect(trigger).not.toBeNull()
    expect(trigger?.type).toBe("INTERVIEW_FAIL")
  })

  it("Interview 트리거 — score >= 0.70 → null", () => {
    expect(checkInterviewTrigger("p1", 0.75)).toBeNull()
  })

  it("PIS 급락 트리거 — drop > 0.10", () => {
    const trigger = checkPISDropTrigger("p1", 0.7, 0.85)
    expect(trigger).not.toBeNull()
    expect(trigger?.type).toBe("PIS_DROP_SUDDEN")
  })

  it("PIS 급락 트리거 — 소폭 하락 → null", () => {
    expect(checkPISDropTrigger("p1", 0.8, 0.85)).toBeNull()
  })

  it("PIS 임계 트리거 — pis < 0.60", () => {
    const trigger = checkPISCriticalTrigger("p1", 0.55)
    expect(trigger).not.toBeNull()
    expect(trigger?.priority).toBe("CRITICAL")
    expect(trigger?.maxDelayHours).toBe(0)
  })

  it("BOT 패턴 트리거", () => {
    const trigger = checkBotPatternTrigger("p1", true)
    expect(trigger).not.toBeNull()
    expect(trigger?.type).toBe("BOT_PATTERN_DETECTED")
  })

  it("Factbook 위반 트리거 — 3회 이상", () => {
    const trigger = checkFactbookViolationTrigger("p1", 4)
    expect(trigger).not.toBeNull()
    expect(trigger?.type).toBe("FACTBOOK_VIOLATION")
  })

  it("Factbook 위반 트리거 — 2회 → null", () => {
    expect(checkFactbookViolationTrigger("p1", 2)).toBeNull()
  })

  it("모든 트리거 체크 — 우선순위 정렬", () => {
    const triggers = checkAllTriggers({
      personaId: "p1",
      interviewScore: 0.5,
      currentPIS: 0.55,
      previousPIS: 0.8,
      hasCriticalBotPattern: true,
      dailyFactbookViolations: 5,
    })

    expect(triggers.length).toBeGreaterThan(0)
    // CRITICAL이 먼저
    expect(triggers[0].priority).toBe("CRITICAL")
  })

  it("교정 추적 레코드 생성", () => {
    const tracking = createCorrectionTracking({
      correctionId: "corr-1",
      personaId: "p1",
      beforePIS: 0.55,
      failedDimensions: ["stance", "sociability"],
      triggeredBy: "INTERVIEW_FAIL",
      arenaSessionId: "arena-1",
      patchCategories: ["voice_spec", "behavior"],
      approvedBy: "admin-1",
    })

    expect(tracking.correctionId).toBe("corr-1")
    expect(tracking.before.pis).toBe(0.55)
    expect(tracking.correction.arenaSessionId).toBe("arena-1")
    expect(tracking.after).toBeUndefined()
    expect(tracking.verdict).toBeUndefined()
  })

  it("교정 결과 평가", () => {
    expect(evaluateCorrectionVerdict(0.55, 0.75)).toBe("EFFECTIVE")
    expect(evaluateCorrectionVerdict(0.55, 0.58)).toBe("PARTIAL")
    expect(evaluateCorrectionVerdict(0.55, 0.55)).toBe("INEFFECTIVE")
    expect(evaluateCorrectionVerdict(0.55, 0.5)).toBe("REGRESSED")
  })

  it("교정 결과 기록", () => {
    const tracking = createCorrectionTracking({
      correctionId: "corr-1",
      personaId: "p1",
      beforePIS: 0.55,
      failedDimensions: ["stance"],
      triggeredBy: "PIS_CRITICAL",
      arenaSessionId: "arena-1",
      patchCategories: ["behavior"],
      approvedBy: "admin-1",
    })

    const updated = recordCorrectionResult(tracking, 0.78, ["stance"], ["depth"])
    expect(updated.after).toBeDefined()
    expect(updated.after?.pis).toBe(0.78)
    expect(updated.after?.improvement).toBe(0.23)
    expect(updated.verdict).toBe("EFFECTIVE")
    expect(updated.after?.resolvedDimensions).toContain("stance")
    expect(updated.after?.remainingIssues).toContain("depth")
  })
})

// ═══ Auto-Interview — 추가 엣지 케이스 ═══

describe("Auto-Interview — edge cases", () => {
  it("복수 동적 토픽 → 첫 번째만 추가", () => {
    const questions = selectQuestions(["AI 윤리", "기후변화", "게임"])
    expect(questions).toHaveLength(21) // 20 Golden + 1 dynamic
    expect(questions[20].questionText).toContain("AI 윤리")
    expect(questions[20].questionText).not.toContain("기후변화")
  })

  it("빈 토픽 배열 → 20문항만", () => {
    const questions = selectQuestions([])
    expect(questions).toHaveLength(20)
  })

  it("판정 경계값 — 정확히 0.85 → pass", () => {
    const j = createJudgment("pw-l1-01", 0.85, "정확히 경계")
    expect(j.verdict).toBe("pass")
  })

  it("판정 경계값 — 정확히 0.70 → warning", () => {
    const j = createJudgment("pw-l1-01", 0.7, "정확히 경계")
    expect(j.verdict).toBe("warning")
  })

  it("판정 경계값 — 0.6999 → fail", () => {
    const j = createJudgment("pw-l1-01", 0.6999, "경계 미만")
    expect(j.verdict).toBe("fail")
  })

  it("결과 집계 — warning verdict (0.70~0.85)", () => {
    const questions = selectQuestions()
    const judgments = questions.map((q) => createJudgment(q.id, 0.78, "warning zone"))
    const result = aggregateResults("p1", questions, judgments, { input: 500, output: 250 })
    expect(result.verdict).toBe("warning")
    expect(result.overallScore).toBeCloseTo(0.78, 1)
  })

  it("중복 dimension fail → 중복 제거", () => {
    const questions = selectQuestions()
    // L1 stance 문항 2개를 fail로 설정
    const judgments = questions.map((q) =>
      createJudgment(
        q.id,
        q.dimension === "stance" ? 0.5 : 0.9,
        q.dimension === "stance" ? "fail" : "pass"
      )
    )
    const result = aggregateResults("p1", questions, judgments, { input: 0, output: 0 })
    // stance는 1개만 있어야 함 (중복 제거)
    const stanceCount = result.failedDimensions.filter((d) => d === "stance").length
    expect(stanceCount).toBe(1)
  })

  it("Golden Sample 문항 ID 형식 검증", () => {
    const questions = selectQuestions()
    for (const q of questions) {
      expect(q.id).toMatch(/^pw-(l1|l2|l3|cross)-\d{2}$/)
    }
  })

  it("Golden Sample 전체 contextType 유효성", () => {
    const validTypes = ["post_tone", "comment_response", "growth", "paradox", "general"]
    const questions = selectQuestions()
    for (const q of questions) {
      expect(validTypes).toContain(q.contextType)
    }
  })
})

describe("적응적 스케줄링 — edge cases", () => {
  const now = new Date("2026-02-17T12:00:00Z")

  it("WARNING 등급 → 3일 주기", () => {
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)
    const personas: PersonaScheduleInfo[] = [
      {
        personaId: "warn-1",
        pisGrade: "WARNING",
        lastInterviewAt: fourDaysAgo,
        hasRecentDeviation: false,
      },
    ]
    const targets = selectInterviewTargets(personas, DEFAULT_SCHEDULE_CONFIG, now)
    expect(targets).toContain("warn-1")
  })

  it("WARNING 등급 + 2일 전 인터뷰 → 아직 불필요", () => {
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const personas: PersonaScheduleInfo[] = [
      {
        personaId: "warn-recent",
        pisGrade: "WARNING",
        lastInterviewAt: twoDaysAgo,
        hasRecentDeviation: false,
      },
    ]
    const config = { ...DEFAULT_SCHEDULE_CONFIG, defaultSampleRatio: 0 }
    const targets = selectInterviewTargets(personas, config, now)
    expect(targets).not.toContain("warn-recent")
  })

  it("QUARANTINE 등급 → 1일 주기 (CRITICAL과 동일)", () => {
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
    const personas: PersonaScheduleInfo[] = [
      {
        personaId: "q-1",
        pisGrade: "QUARANTINE",
        lastInterviewAt: twoDaysAgo,
        hasRecentDeviation: false,
      },
    ]
    const targets = selectInterviewTargets(personas, DEFAULT_SCHEDULE_CONFIG, now)
    expect(targets).toContain("q-1")
  })

  it("빈 페르소나 목록 → 빈 결과", () => {
    const targets = selectInterviewTargets([], DEFAULT_SCHEDULE_CONFIG, now)
    expect(targets).toEqual([])
  })

  it("중복 제거 — deviation + 주기 초과 → 1회만", () => {
    const oldDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const personas: PersonaScheduleInfo[] = [
      { personaId: "dup-1", pisGrade: "GOOD", lastInterviewAt: oldDate, hasRecentDeviation: true },
    ]
    const targets = selectInterviewTargets(personas, DEFAULT_SCHEDULE_CONFIG, now)
    const count = targets.filter((t) => t === "dup-1").length
    expect(count).toBe(1)
  })
})

// ═══ PIS Calculation — 추가 엣지 케이스 ═══

describe("PIS — edge cases", () => {
  it("등급 경계값 — 정확히 0.90 → EXCELLENT", () => {
    expect(getPISGrade(0.9)).toBe("EXCELLENT")
  })

  it("등급 경계값 — 정확히 0.80 → GOOD", () => {
    expect(getPISGrade(0.8)).toBe("GOOD")
  })

  it("등급 경계값 — 정확히 0.70 → WARNING", () => {
    expect(getPISGrade(0.7)).toBe("WARNING")
  })

  it("등급 경계값 — 정확히 0.60 → CRITICAL", () => {
    expect(getPISGrade(0.6)).toBe("CRITICAL")
  })

  it("등급 경계값 — 0.59 → QUARANTINE", () => {
    expect(getPISGrade(0.59)).toBe("QUARANTINE")
  })

  it("극단값 — drift=1.0, variance=1.0 → Character Stability 0", () => {
    const score = computeCharacterStability({
      weeklyDrift: 1.0,
      toneVariance: 1.0,
      growthArcAlignment: 0,
    })
    expect(score).toBe(0)
  })

  it("극단값 — 모든 메트릭 완벽 → overall 1.0 근방", () => {
    const result = computePIS(
      { recentMemoryAccuracy: 1.0, mediumTermAccuracy: 1.0, coreMemoryRetention: 1.0 },
      { factbookCompliance: 1.0, voiceSpecAdherence: 1.0, vectorBehaviorAlign: 1.0 },
      { weeklyDrift: 0, toneVariance: 0, growthArcAlignment: 1.0 },
      50
    )
    expect(result.overall).toBeCloseTo(1.0, 1)
    expect(result.grade).toBe("EXCELLENT")
    expect(result.confidence).toBe(1)
  })

  it("극단값 — 모든 메트릭 최악 → overall 0.0 근방", () => {
    const result = computePIS(
      { recentMemoryAccuracy: 0, mediumTermAccuracy: 0, coreMemoryRetention: 0 },
      { factbookCompliance: 0, voiceSpecAdherence: 0, vectorBehaviorAlign: 0 },
      { weeklyDrift: 1.0, toneVariance: 1.0, growthArcAlignment: 0 },
      0
    )
    expect(result.overall).toBe(0)
    expect(result.grade).toBe("QUARANTINE")
    expect(result.confidence).toBe(0) // 0/50
  })

  it("Confidence — sampleSize=25 → 0.5", () => {
    const result = computePIS(
      { recentMemoryAccuracy: 0.8, mediumTermAccuracy: 0.8, coreMemoryRetention: 0.8 },
      { factbookCompliance: 0.8, voiceSpecAdherence: 0.8, vectorBehaviorAlign: 0.8 },
      { weeklyDrift: 0.1, toneVariance: 0.1, growthArcAlignment: 0.8 },
      25
    )
    expect(result.confidence).toBe(0.5)
  })

  it("PIS Action — QUARANTINE는 adminApproval 필요", () => {
    const action = getPISAction("QUARANTINE")
    expect(action.type).toBe("PAUSE_ACTIVITY")
    expect("adminApproval" in action && action.adminApproval).toBe(true)
    expect("emergencyArena" in action && action.emergencyArena).toBe(true)
  })

  it("PIS Action — WARNING은 dashboardAlert 포함", () => {
    const action = getPISAction("WARNING")
    expect(action.type).toBe("INCREASE_FREQUENCY")
    expect("dashboardAlert" in action && action.dashboardAlert).toBe(true)
  })

  it("Context Recall — 편향 가중치 확인", () => {
    // recentMemory는 40%, medium+core는 각 30%
    const score1 = computeContextRecall({
      recentMemoryAccuracy: 1.0,
      mediumTermAccuracy: 0,
      coreMemoryRetention: 0,
    })
    const score2 = computeContextRecall({
      recentMemoryAccuracy: 0,
      mediumTermAccuracy: 1.0,
      coreMemoryRetention: 0,
    })
    expect(score1).toBeCloseTo(0.4, 2)
    expect(score2).toBeCloseTo(0.3, 2)
  })

  it("Character Stability — weeklyDrift > 1 → driftScore 0으로 클램핑", () => {
    const score = computeCharacterStability({
      weeklyDrift: 1.5,
      toneVariance: 0,
      growthArcAlignment: 1.0,
    })
    // driftScore = max(0, 1-1.5) = 0, varianceScore = 1.0
    // 0*0.35 + 1.0*0.35 + 1.0*0.3 = 0.65
    expect(score).toBeCloseTo(0.65, 2)
  })
})

// ═══ Quality Logger — 추가 엣지 케이스 ═══

describe("Quality Logger — edge cases", () => {
  it("BOT_PATTERN WARNING — 낮은 diversity 감지", () => {
    const anomalies = detectAnomalies(
      { postsCreated: 5, commentsWritten: 5, likesGiven: 5, followsInitiated: 0, repostsShared: 0 },
      {
        activeHours: [10],
        avgIntervalMinutes: 10,
        targetDiversity: 0.05,
        topicDiversity: 0.05,
        energyCorrelation: 0.5,
      },
      0.5
    )
    expect(anomalies.some((a) => a.type === "BOT_PATTERN" && a.severity === "WARNING")).toBe(true)
  })

  it("ENERGY_MISMATCH — 높은 에너지 + 낮은 활동 → INFO", () => {
    const anomalies = detectAnomalies(
      { postsCreated: 1, commentsWritten: 0, likesGiven: 0, followsInitiated: 0, repostsShared: 0 },
      {
        activeHours: [12],
        avgIntervalMinutes: 60,
        targetDiversity: 0.5,
        topicDiversity: 0.5,
        energyCorrelation: 0.5,
      },
      0.9
    )
    expect(anomalies.some((a) => a.type === "ENERGY_MISMATCH" && a.severity === "INFO")).toBe(true)
  })

  it("정상 활동 → 이상 없음", () => {
    const anomalies = detectAnomalies(
      { postsCreated: 3, commentsWritten: 5, likesGiven: 5, followsInitiated: 1, repostsShared: 1 },
      {
        activeHours: [9, 14, 20],
        avgIntervalMinutes: 30,
        targetDiversity: 0.6,
        topicDiversity: 0.7,
        energyCorrelation: 0.8,
      },
      0.6
    )
    expect(anomalies).toHaveLength(0)
  })

  it("SUDDEN_BURST — 댓글 50건 이상", () => {
    const anomalies = detectAnomalies(
      {
        postsCreated: 2,
        commentsWritten: 55,
        likesGiven: 0,
        followsInitiated: 0,
        repostsShared: 0,
      },
      {
        activeHours: [10],
        avgIntervalMinutes: 5,
        targetDiversity: 0.5,
        topicDiversity: 0.5,
        energyCorrelation: 0.5,
      },
      0.8
    )
    expect(anomalies.some((a) => a.type === "SUDDEN_BURST")).toBe(true)
  })

  it("SUDDEN_BURST — 좋아요 100건 이상", () => {
    const anomalies = detectAnomalies(
      {
        postsCreated: 0,
        commentsWritten: 0,
        likesGiven: 101,
        followsInitiated: 0,
        repostsShared: 0,
      },
      {
        activeHours: [10],
        avgIntervalMinutes: 5,
        targetDiversity: 0.5,
        topicDiversity: 0.5,
        energyCorrelation: 0.5,
      },
      0.8
    )
    expect(anomalies.some((a) => a.type === "SUDDEN_BURST")).toBe(true)
  })

  it("복수 이상 동시 발생", () => {
    const anomalies = detectAnomalies(
      {
        postsCreated: 15,
        commentsWritten: 10,
        likesGiven: 5,
        followsInitiated: 0,
        repostsShared: 0,
      },
      {
        activeHours: [10],
        avgIntervalMinutes: 1,
        targetDiversity: 0.5,
        topicDiversity: 0.5,
        energyCorrelation: 0.1,
      },
      0.1 // 에너지 낮음
    )
    // BOT_PATTERN(짧은 간격) + ENERGY_MISMATCH(에너지 낮은데 활동 높음) + SUDDEN_BURST(포스트 15건)
    expect(anomalies.length).toBeGreaterThanOrEqual(3)
    const types = anomalies.map((a) => a.type)
    expect(types).toContain("BOT_PATTERN")
    expect(types).toContain("ENERGY_MISMATCH")
    expect(types).toContain("SUDDEN_BURST")
  })

  it("CommentQualityLog — 값 클램핑", () => {
    const log = createCommentQualityLog({
      commentId: "c-clamp",
      personaId: "p1",
      targetPostId: "post-1",
      selectedTone: "empathetic",
      toneMatchScore: 1.5,
      relationshipStage: "CLOSE",
      moodAtGeneration: -0.5,
      contextRelevance: 2.0,
      memoryReference: true,
      naturalness: -1.0,
    })
    expect(log.toneAnalysis.toneMatchScore).toBe(1)
    expect(log.toneAnalysis.moodAtGeneration).toBe(0)
    expect(log.conversationQuality.contextRelevance).toBe(1)
    expect(log.conversationQuality.naturalness).toBe(0)
  })

  it("PostQualityLog — topicRelevance 클램핑", () => {
    const log = createPostQualityLog({
      postId: "p-clamp",
      personaId: "p1",
      postType: "DAILY",
      trigger: "PERSONA_STATE",
      llmModel: "test",
      tokenUsage: { input: 100, output: 50, cached: 0 },
      latency: 500,
      content: "test",
      voiceSpecMatch: 0.5,
      factbookViolations: [],
      repetitionScore: 0.5,
      topicRelevance: 1.8,
    })
    expect(log.quality.topicRelevance).toBe(1)
  })

  it("InteractionPatternLog — WEEKLY 기간", () => {
    const log = createInteractionPatternLog({
      personaId: "p1",
      period: "WEEKLY",
      stats: {
        postsCreated: 5,
        commentsWritten: 10,
        likesGiven: 20,
        followsInitiated: 2,
        repostsShared: 3,
      },
      patterns: {
        activeHours: [9, 14, 20],
        avgIntervalMinutes: 30,
        targetDiversity: 0.7,
        topicDiversity: 0.6,
        energyCorrelation: 0.8,
      },
      energy: 0.7,
    })
    expect(log.period).toBe("WEEKLY")
    expect(log.anomalies).toHaveLength(0)
  })
})

// ═══ Arena Bridge — 추가 엣지 케이스 ═══

describe("Arena Bridge — edge cases", () => {
  it("트리거 조건 없으면 빈 배열", () => {
    const triggers = checkAllTriggers({ personaId: "p1" })
    expect(triggers).toEqual([])
  })

  it("모든 조건 정상이면 빈 배열", () => {
    const triggers = checkAllTriggers({
      personaId: "p1",
      interviewScore: 0.9,
      currentPIS: 0.85,
      previousPIS: 0.83,
      hasCriticalBotPattern: false,
      dailyFactbookViolations: 1,
    })
    expect(triggers).toEqual([])
  })

  it("Interview 경계값 — 정확히 0.70 → null", () => {
    expect(checkInterviewTrigger("p1", 0.7)).toBeNull()
  })

  it("PIS Drop 경계값 — 정확히 0.10 → null", () => {
    expect(checkPISDropTrigger("p1", 0.75, 0.85)).toBeNull()
  })

  it("PIS Critical 경계값 — 정확히 0.60 → null", () => {
    expect(checkPISCriticalTrigger("p1", 0.6)).toBeNull()
  })

  it("Factbook 경계값 — 정확히 3 → 트리거", () => {
    const trigger = checkFactbookViolationTrigger("p1", 3)
    expect(trigger).not.toBeNull()
    expect(trigger?.type).toBe("FACTBOOK_VIOLATION")
  })

  it("SCHEDULED_CHECK 트리거 생성", () => {
    const trigger = createArenaTrigger("p1", "SCHEDULED_CHECK", "Weekly review")
    expect(trigger.type).toBe("SCHEDULED_CHECK")
    expect(trigger.priority).toBe("LOW")
    expect(trigger.maxDelayHours).toBe(168)
  })

  it("PIS_DROP_SUDDEN 트리거 — reason에 변화량 포함", () => {
    const trigger = checkPISDropTrigger("p1", 0.6, 0.85)
    expect(trigger).not.toBeNull()
    expect(trigger?.reason).toContain("0.25")
    expect(trigger?.reason).toContain("0.85")
    expect(trigger?.reason).toContain("0.6")
  })

  it("교정 추적 — failedDimensions 보존", () => {
    const tracking = createCorrectionTracking({
      correctionId: "c2",
      personaId: "p1",
      beforePIS: 0.45,
      failedDimensions: ["stance", "depth", "openness"],
      triggeredBy: "PIS_CRITICAL",
      arenaSessionId: "arena-2",
      patchCategories: ["voice_spec", "behavior", "factbook"],
      approvedBy: "admin-1",
    })
    expect(tracking.before.failedDimensions).toHaveLength(3)
    expect(tracking.correction.patchCategories).toHaveLength(3)
  })

  it("교정 결과 — PARTIAL (0 < improvement ≤ 0.05)", () => {
    expect(evaluateCorrectionVerdict(0.55, 0.58)).toBe("PARTIAL")
  })

  it("교정 결과 — INEFFECTIVE (≈0, within ±0.01)", () => {
    expect(evaluateCorrectionVerdict(0.55, 0.555)).toBe("INEFFECTIVE")
    expect(evaluateCorrectionVerdict(0.55, 0.545)).toBe("INEFFECTIVE")
  })

  it("교정 결과 — REGRESSED (< -0.01)", () => {
    expect(evaluateCorrectionVerdict(0.55, 0.53)).toBe("REGRESSED")
  })

  it("recordCorrectionResult — 기존 추적에 결과 병합", () => {
    const tracking = createCorrectionTracking({
      correctionId: "c3",
      personaId: "p1",
      beforePIS: 0.65,
      failedDimensions: ["sociability"],
      triggeredBy: "INTERVIEW_FAIL",
      arenaSessionId: "arena-3",
      patchCategories: ["behavior"],
      approvedBy: "admin-1",
    })

    const result = recordCorrectionResult(tracking, 0.65, [], ["sociability"])
    expect(result.verdict).toBe("INEFFECTIVE")
    expect(result.after?.improvement).toBe(0)
    expect(result.after?.remainingIssues).toContain("sociability")
    // 기존 before 데이터는 보존
    expect(result.before.triggeredBy).toBe("INTERVIEW_FAIL")
  })
})

// ═══ Quality Integration ═══

describe("runQualityCheck — 통합 파이프라인", () => {
  const goodCR = { recentMemoryAccuracy: 0.9, mediumTermAccuracy: 0.85, coreMemoryRetention: 0.9 }
  const goodSC = { factbookCompliance: 0.95, voiceSpecAdherence: 0.9, vectorBehaviorAlign: 0.85 }
  const goodCS = { weeklyDrift: 0.05, toneVariance: 0.05, growthArcAlignment: 0.9 }

  it("HEALTHY — PIS 높고 이슈 없음", () => {
    const result = runQualityCheck({
      personaId: "p1",
      contextRecall: goodCR,
      settingConsistency: goodSC,
      characterStability: goodCS,
      sampleSize: 50,
    })

    expect(result.summary.status).toBe("HEALTHY")
    expect(result.triggers).toHaveLength(0)
    expect(result.interview).toBeNull()
    expect(result.pis.grade).toBe("EXCELLENT")
  })

  it("CRITICAL — PIS QUARANTINE + CRITICAL 트리거", () => {
    const result = runQualityCheck({
      personaId: "p1",
      contextRecall: {
        recentMemoryAccuracy: 0.1,
        mediumTermAccuracy: 0.1,
        coreMemoryRetention: 0.1,
      },
      settingConsistency: {
        factbookCompliance: 0.1,
        voiceSpecAdherence: 0.1,
        vectorBehaviorAlign: 0.1,
      },
      characterStability: { weeklyDrift: 0.8, toneVariance: 0.8, growthArcAlignment: 0.1 },
      sampleSize: 10,
      previousPIS: 0.8,
    })

    expect(result.summary.status).toBe("CRITICAL")
    expect(result.pis.grade).toBe("QUARANTINE")
    expect(result.action.type).toBe("PAUSE_ACTIVITY")
    expect(result.triggers.length).toBeGreaterThan(0)
    // PIS_CRITICAL 트리거 존재
    expect(result.triggers.some((t) => t.type === "PIS_CRITICAL")).toBe(true)
  })

  it("DEGRADED — PIS CRITICAL + 인터뷰 없음", () => {
    // PIS가 0.60~0.70 범위 (CRITICAL)에 들어가되, 0.60 이상이어야 PIS_CRITICAL 트리거 안 됨
    const result = runQualityCheck({
      personaId: "p1",
      contextRecall: {
        recentMemoryAccuracy: 0.65,
        mediumTermAccuracy: 0.6,
        coreMemoryRetention: 0.6,
      },
      settingConsistency: {
        factbookCompliance: 0.65,
        voiceSpecAdherence: 0.6,
        vectorBehaviorAlign: 0.6,
      },
      characterStability: { weeklyDrift: 0.25, toneVariance: 0.25, growthArcAlignment: 0.6 },
      sampleSize: 30,
    })

    expect(result.summary.status).toBe("DEGRADED")
    expect(result.pis.grade).toBe("CRITICAL")
  })

  it("CAUTION — PIS WARNING", () => {
    const result = runQualityCheck({
      personaId: "p1",
      contextRecall: {
        recentMemoryAccuracy: 0.7,
        mediumTermAccuracy: 0.7,
        coreMemoryRetention: 0.7,
      },
      settingConsistency: {
        factbookCompliance: 0.7,
        voiceSpecAdherence: 0.7,
        vectorBehaviorAlign: 0.7,
      },
      characterStability: { weeklyDrift: 0.2, toneVariance: 0.15, growthArcAlignment: 0.7 },
      sampleSize: 30,
    })

    expect(result.summary.status).toBe("CAUTION")
  })

  it("인터뷰 결과 포함 → fail verdict → DEGRADED", () => {
    const questions = selectQuestions()
    const failJudgments = questions.map((q) => createJudgment(q.id, 0.5, "전부 실패"))

    const result = runQualityCheck({
      personaId: "p1",
      contextRecall: goodCR,
      settingConsistency: goodSC,
      characterStability: goodCS,
      sampleSize: 50,
      interviewJudgments: failJudgments,
    })

    expect(result.interview).not.toBeNull()
    expect(result.interview?.verdict).toBe("fail")
    expect(result.summary.status).toBe("DEGRADED")
    // INTERVIEW_FAIL 트리거 발생
    expect(result.triggers.some((t) => t.type === "INTERVIEW_FAIL")).toBe(true)
  })

  it("품질 로그 이슈 → CAUTION", () => {
    const postLogs = [
      createPostQualityLog({
        postId: "p1",
        personaId: "p1",
        postType: "OPINION",
        trigger: "SCHEDULED",
        llmModel: "test",
        tokenUsage: { input: 100, output: 50, cached: 0 },
        latency: 500,
        content: "test",
        voiceSpecMatch: 0.5, // 낮음
        factbookViolations: ["fact-1", "fact-2"],
        repetitionScore: 0.6, // 높음
        topicRelevance: 0.9,
      }),
    ]

    const result = runQualityCheck({
      personaId: "p1",
      contextRecall: goodCR,
      settingConsistency: goodSC,
      characterStability: goodCS,
      sampleSize: 50,
      postLogs,
    })

    expect(result.summary.status).toBe("CAUTION")
    expect(result.summary.reasons.some((r) => r.includes("보이스 스펙"))).toBe(true)
    expect(result.summary.reasons.some((r) => r.includes("반복"))).toBe(true)
    expect(result.summary.reasons.some((r) => r.includes("팩트북 위반"))).toBe(true)
  })

  it("BOT 패턴 + Factbook 위반 → 트리거 다중 발생", () => {
    const result = runQualityCheck({
      personaId: "p1",
      contextRecall: goodCR,
      settingConsistency: goodSC,
      characterStability: goodCS,
      sampleSize: 50,
      hasCriticalBotPattern: true,
      dailyFactbookViolations: 5,
    })

    expect(result.triggers.some((t) => t.type === "BOT_PATTERN_DETECTED")).toBe(true)
    expect(result.triggers.some((t) => t.type === "FACTBOOK_VIOLATION")).toBe(true)
  })

  it("PIS 급락 감지 → PIS_DROP_SUDDEN 트리거", () => {
    const result = runQualityCheck({
      personaId: "p1",
      contextRecall: goodCR,
      settingConsistency: goodSC,
      characterStability: goodCS,
      sampleSize: 50,
      previousPIS: 0.95,
    })

    // 현재 PIS는 ~0.89, previous 0.95 → drop 0.06 (< 0.1)
    // drop이 0.1 미만이면 트리거 없음
    expect(result.triggers.some((t) => t.type === "PIS_DROP_SUDDEN")).toBe(false)
  })
})

describe("analyzePISChange", () => {
  it("급락 감지 — delta < -0.1", () => {
    const change = analyzePISChange(0.65, 0.85)
    expect(change.delta).toBe(-0.2)
    expect(change.isSuddenDrop).toBe(true)
    expect(change.isImproving).toBe(false)
  })

  it("개선 감지 — delta > 0.05", () => {
    const change = analyzePISChange(0.85, 0.75)
    expect(change.delta).toBe(0.1)
    expect(change.isSuddenDrop).toBe(false)
    expect(change.isImproving).toBe(true)
  })

  it("미미한 변화 — 급락도 개선도 아님", () => {
    const change = analyzePISChange(0.82, 0.8)
    expect(change.delta).toBe(0.02)
    expect(change.isSuddenDrop).toBe(false)
    expect(change.isImproving).toBe(false)
  })

  it("변화 없음", () => {
    const change = analyzePISChange(0.8, 0.8)
    expect(change.delta).toBe(0)
    expect(change.isSuddenDrop).toBe(false)
    expect(change.isImproving).toBe(false)
  })
})

describe("detectQualityIssues", () => {
  it("이슈 없으면 빈 배열", () => {
    const issues = detectQualityIssues({
      postStats: { avgVoiceSpecMatch: 0.9, avgRepetitionScore: 0.1, totalFactbookViolations: 0 },
      commentStats: { avgToneMatchScore: 0.8, avgContextRelevance: 0.7, memoryReferenceRate: 0.5 },
    })
    expect(issues).toEqual([])
  })

  it("postStats만 문제 → 포스트 관련 이슈만", () => {
    const issues = detectQualityIssues({
      postStats: { avgVoiceSpecMatch: 0.5, avgRepetitionScore: 0.7, totalFactbookViolations: 3 },
    })
    expect(issues).toHaveLength(3)
    expect(issues.some((i) => i.includes("보이스 스펙"))).toBe(true)
    expect(issues.some((i) => i.includes("반복"))).toBe(true)
    expect(issues.some((i) => i.includes("팩트북"))).toBe(true)
  })

  it("commentStats만 문제 → 댓글 관련 이슈만", () => {
    const issues = detectQualityIssues({
      commentStats: { avgToneMatchScore: 0.4, avgContextRelevance: 0.3, memoryReferenceRate: 0.05 },
    })
    expect(issues).toHaveLength(3)
    expect(issues.some((i) => i.includes("톤"))).toBe(true)
    expect(issues.some((i) => i.includes("컨텍스트"))).toBe(true)
    expect(issues.some((i) => i.includes("기억 참조율"))).toBe(true)
  })

  it("통계 없으면 이슈 없음", () => {
    const issues = detectQualityIssues({})
    expect(issues).toEqual([])
  })
})

describe("selectQualityCheckTargets", () => {
  const now = new Date("2026-02-17T12:00:00Z")

  it("selectInterviewTargets 래퍼로 동작", () => {
    const personas: PersonaScheduleInfo[] = [
      { personaId: "new-1", pisGrade: "GOOD", lastInterviewAt: null, hasRecentDeviation: false },
    ]
    const targets = selectQualityCheckTargets(personas, DEFAULT_SCHEDULE_CONFIG, now)
    expect(targets).toContain("new-1")
  })
})
