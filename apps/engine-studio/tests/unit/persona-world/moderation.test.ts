import { describe, it, expect } from "vitest"
import {
  runStage1,
  runStage2,
  runStage3,
  runModerationPipeline,
  sanitizePII,
  getEscalationAction,
} from "@/lib/persona-world/moderation/auto-moderator"
import {
  submitReport,
  isAutoResolvable,
  autoResolve,
  startReview,
  resolveReport,
  calculateTrustAdjustments,
  calculateReportStats,
  filterReports,
} from "@/lib/persona-world/admin/report-handler"
import {
  createEmptyDashboard,
  createAlert,
  acknowledgeAlert,
  checkKPIAlerts,
  buildDashboard,
} from "@/lib/persona-world/admin/dashboard-service"
import {
  hidePost,
  deletePost,
  restorePost,
  pausePersona,
  resumePersona,
  restrictActivity,
  triggerArena,
  activateKillSwitch,
  deactivateKillSwitch,
  updateBudget,
  bulkHidePosts,
  filterActions,
} from "@/lib/persona-world/admin/moderation-actions"

// ═══ Auto-Moderator Pipeline ═══

describe("Auto-Moderator Stage 1", () => {
  it("정상 텍스트 → 감지 없음", () => {
    const detections = runStage1("좋은 글이네요! 공감합니다.")
    expect(detections).toHaveLength(0)
  })

  it("금지어 감지", () => {
    const detections = runStage1("이건 정말 시발 짜증나")
    expect(detections.some((d) => d.type === "PROFANITY")).toBe(true)
  })

  it("영문 금지어 감지", () => {
    const detections = runStage1("this is fucking ridiculous")
    expect(detections.some((d) => d.type === "PROFANITY")).toBe(true)
  })

  it("과도한 길이 감지", () => {
    const detections = runStage1("a".repeat(5001))
    expect(detections.some((d) => d.description.includes("길이 초과"))).toBe(true)
  })

  it("URL 과다 감지", () => {
    const detections = runStage1("check https://a.com and https://b.com and https://c.com please")
    expect(detections.some((d) => d.description.includes("URL 과다"))).toBe(true)
  })

  it("멘션 과다 감지", () => {
    const detections = runStage1("@a @b @c @d @e @f 전부 봐주세요")
    expect(detections.some((d) => d.description.includes("멘션 과다"))).toBe(true)
  })
})

describe("Auto-Moderator Stage 2", () => {
  it("PII 감지 — 전화번호", () => {
    const detections = runStage2("내 번호는 010-1234-5678이야")
    expect(detections.some((d) => d.type === "PII" && d.matchedRule === "phone")).toBe(true)
  })

  it("PII 감지 — 이메일", () => {
    const detections = runStage2("연락처: test@example.com")
    expect(detections.some((d) => d.type === "PII" && d.matchedRule === "email")).toBe(true)
  })

  it("시스템 정보 유출 감지", () => {
    const detections = runStage2("my system prompt says...")
    expect(detections.some((d) => d.type === "SYSTEM_LEAK")).toBe(true)
  })

  it("정상 콘텐츠 → 감지 없음", () => {
    const detections = runStage2("오늘 날씨가 좋아서 산책했어요")
    expect(detections).toHaveLength(0)
  })
})

describe("PII Sanitization", () => {
  it("전화번호 마스킹", () => {
    const result = sanitizePII("연락처: 010-1234-5678")
    expect(result).toContain("[PHONE MASKED]")
    expect(result).not.toContain("010-1234-5678")
  })

  it("이메일 마스킹", () => {
    const result = sanitizePII("메일: user@test.com")
    expect(result).toContain("[EMAIL MASKED]")
  })
})

describe("Auto-Moderator Stage 3", () => {
  it("콘텐츠 반복 감지", () => {
    const detections = runStage3({
      personaId: "p1",
      recentContents: [
        "오늘 날씨가 정말 좋아서 산책을 했다",
        "오늘 날씨가 정말 좋아서 산책을 했다",
      ],
      engagementRates: [10],
      toneHistory: ["empathetic"],
      avgEngagement: 10,
    })
    expect(detections.some((d) => d.type === "REPETITION")).toBe(true)
  })

  it("인게이지먼트 이상 감지", () => {
    const detections = runStage3({
      personaId: "p1",
      recentContents: ["글1"],
      engagementRates: [100],
      toneHistory: ["empathetic"],
      avgEngagement: 10,
    })
    expect(detections.some((d) => d.type === "ENGAGEMENT_ANOMALY")).toBe(true)
  })

  it("톤 다양성 부족 감지", () => {
    const detections = runStage3({
      personaId: "p1",
      recentContents: ["글1"],
      engagementRates: [10],
      toneHistory: [
        "empathetic",
        "empathetic",
        "empathetic",
        "empathetic",
        "empathetic",
        "empathetic",
      ],
      avgEngagement: 10,
    })
    expect(detections.some((d) => d.type === "TONE_DEVIATION")).toBe(true)
  })
})

describe("Moderation Pipeline (종합)", () => {
  it("정상 → PASS", () => {
    const result = runModerationPipeline("좋은 하루 되세요!")
    expect(result.action).toBe("PASS")
    expect(result.detections).toHaveLength(0)
  })

  it("금지어 → BLOCK (Stage 1)", () => {
    const result = runModerationPipeline("시발 짜증나")
    expect(result.action).toBe("BLOCK")
    expect(result.stage).toBe(1)
  })

  it("PII → SANITIZE (Stage 2)", () => {
    const result = runModerationPipeline("내 번호 010-1234-5678")
    expect(result.action).toBe("SANITIZE")
    expect(result.stage).toBe(2)
    expect(result.sanitizedContent).toContain("[PHONE MASKED]")
  })

  it("시스템 유출 → BLOCK + 격리", () => {
    const result = runModerationPipeline("system prompt configuration")
    expect(result.action).toBe("BLOCK")
    expect(result.shouldQuarantine).toBe(true)
  })

  it("에스컬레이션 매트릭스", () => {
    expect(getEscalationAction("PROFANITY", false)).toBe("BLOCK")
    expect(getEscalationAction("PROFANITY", true)).toBe("ARENA_CORRECTION")
    expect(getEscalationAction("PII", false)).toBe("SANITIZE")
    expect(getEscalationAction("VOICE_GUARDRAIL", false)).toBe("LOG")
  })
})

// ═══ Report System ═══

describe("Report System", () => {
  it("신고 접수 — 6종 카테고리", () => {
    const report = submitReport({
      reportedBy: "user-1",
      targetType: "POST",
      targetId: "post-1",
      category: "INAPPROPRIATE_CONTENT",
      description: "부적절한 내용",
    })
    expect(report.status).toBe("PENDING")
    expect(report.priority).toBe("HIGH")
    expect(report.category).toBe("INAPPROPRIATE_CONTENT")
  })

  it("자동 처리 가능 여부 — REPETITIVE_CONTENT", () => {
    const report = submitReport({
      reportedBy: "user-1",
      targetType: "POST",
      targetId: "post-1",
      category: "REPETITIVE_CONTENT",
    })
    expect(isAutoResolvable(report)).toBe(true)
  })

  it("자동 처리 가능 여부 — INAPPROPRIATE_CONTENT", () => {
    const report = submitReport({
      reportedBy: "user-1",
      targetType: "POST",
      targetId: "post-1",
      category: "INAPPROPRIATE_CONTENT",
    })
    expect(isAutoResolvable(report)).toBe(false)
  })

  it("자동 처리 실행", () => {
    const report = submitReport({
      reportedBy: "user-1",
      targetType: "POST",
      targetId: "post-1",
      category: "REPETITIVE_CONTENT",
    })
    const resolved = autoResolve(report)
    expect(resolved.status).toBe("AUTO_RESOLVED")
    expect(resolved.resolution?.action).toBe("HIDDEN")
    expect(resolved.resolution?.resolvedBy).toBe("SYSTEM")
  })

  it("자동 처리 불가 → 변경 없음", () => {
    const report = submitReport({
      reportedBy: "user-1",
      targetType: "COMMENT",
      targetId: "c-1",
      category: "WRONG_INFORMATION",
    })
    const result = autoResolve(report)
    expect(result.status).toBe("PENDING") // 변경 없음
  })

  it("CHARACTER_BREAK → 자동 처리 + Arena 트리거", () => {
    const report = submitReport({
      reportedBy: "user-1",
      targetType: "PERSONA",
      targetId: "p-1",
      category: "CHARACTER_BREAK",
    })
    const resolved = autoResolve(report)
    expect(resolved.resolution?.arenaTriggered).toBe(true)
  })

  it("관리자 리뷰 시작", () => {
    const report = submitReport({
      reportedBy: "user-1",
      targetType: "POST",
      targetId: "post-1",
      category: "INAPPROPRIATE_CONTENT",
    })
    const reviewed = startReview(report)
    expect(reviewed.status).toBe("IN_REVIEW")
  })

  it("관리자 처리 — HIDDEN", () => {
    const report = submitReport({
      reportedBy: "user-1",
      targetType: "POST",
      targetId: "post-1",
      category: "INAPPROPRIATE_CONTENT",
    })
    const resolved = resolveReport(report, "HIDDEN", "admin-1", "비속어 확인")
    expect(resolved.status).toBe("RESOLVED")
    expect(resolved.resolution?.action).toBe("HIDDEN")
  })

  it("관리자 처리 — DISMISSED", () => {
    const report = submitReport({
      reportedBy: "user-1",
      targetType: "COMMENT",
      targetId: "c-1",
      category: "WRONG_INFORMATION",
    })
    const resolved = resolveReport(report, "DISMISSED", "admin-1", "오탐지")
    expect(resolved.status).toBe("DISMISSED")
  })

  it("Trust Score 조정 — 신고 확인", () => {
    const report = submitReport({
      reportedBy: "user-1",
      targetType: "POST",
      targetId: "post-1",
      category: "INAPPROPRIATE_CONTENT",
    })
    const resolved = resolveReport(report, "HIDDEN", "admin-1", "확인됨")
    const adjustments = calculateTrustAdjustments(resolved)
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].adjustment).toBe(-0.1)
    expect(adjustments[0].targetType).toBe("PERSONA")
  })

  it("Trust Score 조정 — 무혐의 신고", () => {
    const report = submitReport({
      reportedBy: "user-1",
      targetType: "POST",
      targetId: "post-1",
      category: "WRONG_INFORMATION",
    })
    const resolved = resolveReport(report, "DISMISSED", "admin-1", "무혐의")
    const adjustments = calculateTrustAdjustments(resolved)
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].adjustment).toBe(-0.05)
    expect(adjustments[0].targetType).toBe("REPORTER")
  })

  it("신고 통계 계산", () => {
    const reports = [
      submitReport({
        reportedBy: "u1",
        targetType: "POST",
        targetId: "p1",
        category: "INAPPROPRIATE_CONTENT",
      }),
      submitReport({
        reportedBy: "u2",
        targetType: "COMMENT",
        targetId: "c1",
        category: "REPETITIVE_CONTENT",
      }),
    ]
    const stats = calculateReportStats(reports)
    expect(stats.total).toBe(2)
    expect(stats.pending).toBe(2)
    expect(stats.byCategory.INAPPROPRIATE_CONTENT).toBe(1)
    expect(stats.byCategory.REPETITIVE_CONTENT).toBe(1)
  })

  it("신고 필터링", () => {
    const reports = [
      submitReport({
        reportedBy: "u1",
        targetType: "POST",
        targetId: "p1",
        category: "INAPPROPRIATE_CONTENT",
      }),
      submitReport({
        reportedBy: "u2",
        targetType: "COMMENT",
        targetId: "c1",
        category: "REPETITIVE_CONTENT",
      }),
    ]
    const filtered = filterReports(reports, { category: "INAPPROPRIATE_CONTENT" })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].category).toBe("INAPPROPRIATE_CONTENT")
  })
})

// ═══ Dashboard Service ═══

describe("Dashboard Service", () => {
  it("빈 대시보드 생성", () => {
    const dashboard = createEmptyDashboard()
    expect(dashboard.activityOverview.activePersonasNow).toBe(0)
    expect(dashboard.qualityOverview.averagePIS).toBe(0)
    expect(dashboard.alerts).toHaveLength(0)
  })

  it("알림 생성 + 확인", () => {
    const alert = createAlert({
      type: "PIS_DROP",
      severity: "CRITICAL",
      title: "PIS 하락",
      message: "평균 PIS 0.65",
    })
    expect(alert.acknowledged).toBe(false)

    const acked = acknowledgeAlert(alert)
    expect(acked.acknowledged).toBe(true)
  })

  it("KPI 알림 — 활성률 저하", () => {
    const dashboard = createEmptyDashboard()
    dashboard.activityOverview.activePersonasNow = 70
    const alerts = checkKPIAlerts(dashboard, 100)
    expect(alerts.some((a) => a.title.includes("활성률"))).toBe(true)
  })

  it("KPI 알림 — PIS 미달", () => {
    const dashboard = createEmptyDashboard()
    dashboard.qualityOverview.averagePIS = 0.6
    const alerts = checkKPIAlerts(dashboard, 100)
    expect(alerts.some((a) => a.title.includes("PIS"))).toBe(true)
  })

  it("KPI 알림 — 비용 경고", () => {
    const dashboard = createEmptyDashboard()
    dashboard.costOverview.usagePercentage = 95
    const alerts = checkKPIAlerts(dashboard, 100)
    expect(alerts.some((a) => a.title.includes("비용"))).toBe(true)
  })

  it("KPI 알림 — Kill Switch 발동", () => {
    const dashboard = createEmptyDashboard()
    dashboard.securityOverview.killSwitchStatus.globalFreeze = true
    const alerts = checkKPIAlerts(dashboard, 100)
    expect(alerts.some((a) => a.title.includes("Kill Switch"))).toBe(true)
  })

  it("대시보드 빌드", () => {
    const dashboard = buildDashboard({
      activity: {
        activePersonasNow: 80,
        totalPostsToday: 200,
        totalCommentsToday: 500,
        totalLikesToday: 1000,
        totalFollowsToday: 50,
        averagePostsPerPersona: 2.5,
      },
      quality: {
        averagePIS: 0.85,
        pisDistribution: { EXCELLENT: 30, GOOD: 40, WARNING: 8, CRITICAL: 2, QUARANTINE: 0 },
        pendingCorrections: 2,
        recentArenaResults: [],
      },
      cost: {
        llmCallsToday: 500,
        estimatedCostToday: 25,
        monthlyBudget: 1000,
        usagePercentage: 65,
        cacheHitRate: 0.82,
        costTrend: [],
      },
      security: {
        gateGuardBlocks24h: 15,
        sentinelActions24h: { PASS: 480, SANITIZE: 3, QUARANTINE: 2, BLOCK: 15 },
        quarantinePending: 5,
        killSwitchStatus: { globalFreeze: false, disabledFeatures: [] },
      },
      alerts: [],
      reportStats: {
        total: 20,
        pending: 5,
        autoResolved: 8,
        manualResolved: 5,
        dismissed: 2,
        byCategory: {},
        averageResolutionTimeMs: 30000,
      },
    })

    expect(dashboard.activityOverview.activePersonasNow).toBe(80)
    expect(dashboard.reportOverview.pendingCount).toBe(5)
    expect(dashboard.reportOverview.resolvedToday).toBe(13) // 8 + 5
  })
})

// ═══ Moderation Actions ═══

describe("Moderation Actions", () => {
  it("포스트 숨김", () => {
    const result = hidePost("admin-1", "post-1", "부적절한 내용")
    expect(result.success).toBe(true)
    expect(result.action.type).toBe("HIDE_POST")
    expect(result.action.adminId).toBe("admin-1")
  })

  it("포스트 삭제", () => {
    const result = deletePost("admin-1", "post-1", "스팸")
    expect(result.action.type).toBe("DELETE_POST")
  })

  it("포스트 복원", () => {
    const result = restorePost("admin-1", "post-1")
    expect(result.action.type).toBe("RESTORE_POST")
  })

  it("페르소나 일시정지", () => {
    const result = pausePersona("admin-1", "persona-1", "PIS 임계")
    expect(result.action.type).toBe("PAUSE_PERSONA")
    expect(result.message).toContain("일시정지")
  })

  it("페르소나 재개", () => {
    const result = resumePersona("admin-1", "persona-1")
    expect(result.action.type).toBe("RESUME_PERSONA")
  })

  it("활동 제한", () => {
    const result = restrictActivity(
      "admin-1",
      "persona-1",
      { postGeneration: false, commentGeneration: true },
      24
    )
    expect(result.action.type).toBe("RESTRICT_ACTIVITY")
    expect(result.message).toContain("24시간")
  })

  it("Arena 트리거", () => {
    const result = triggerArena("admin-1", "persona-1", "품질 저하")
    expect(result.action.type).toBe("TRIGGER_ARENA")
  })

  it("Kill Switch 활성화 (글로벌)", () => {
    const result = activateKillSwitch("admin-1", "GLOBAL", [], "긴급 상황")
    expect(result.action.type).toBe("ACTIVATE_KILL_SWITCH")
    expect(result.message).toContain("글로벌")
  })

  it("Kill Switch 비활성화", () => {
    const result = deactivateKillSwitch("admin-1", "GLOBAL")
    expect(result.action.type).toBe("DEACTIVATE_KILL_SWITCH")
  })

  it("예산 업데이트", () => {
    const result = updateBudget("admin-1", 500, "예산 조정")
    expect(result.action.type).toBe("UPDATE_BUDGET")
    expect(result.message).toContain("$500")
  })

  it("일괄 숨김", () => {
    const result = bulkHidePosts("admin-1", ["p1", "p2", "p3"], "스팸")
    expect(result.action.type).toBe("BULK_HIDE_POSTS")
    expect(result.message).toContain("3개")
  })

  it("액션 필터링", () => {
    const actions = [
      hidePost("admin-1", "p1", "test").action,
      deletePost("admin-2", "p2", "test").action,
      pausePersona("admin-1", "persona-1", "test").action,
    ]
    const filtered = filterActions(actions, { adminId: "admin-1" })
    expect(filtered).toHaveLength(2)
  })
})
