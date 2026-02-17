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
