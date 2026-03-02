// ═══════════════════════════════════════════════════════════════
// Optimization Config Tests — T327
// Haiku 화이트리스트, 스케일 트리거, 배치 설정, A/B 모니터링 설정
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"

import {
  // Haiku 화이트리스트
  HAIKU_WHITELIST,
  isHaikuWhitelisted,

  // 스케일 기반 최적화
  OPTIMIZATION_THRESHOLDS,
  getActiveOptimizations,
  isOptimizationActive,
  getNextOptimizationTarget,

  // 배치 댓글 설정
  DEFAULT_BATCH_COMMENT_CONFIG,

  // A/B 모니터링 설정
  DEFAULT_AB_MONITOR_CONFIG,

  // 최적화 상태
  getOptimizationStatus,
} from "@/lib/global-config/optimization-config"

// ── Haiku 화이트리스트 ─────────────────────────────────────────

describe("Haiku 화이트리스트", () => {
  it("화이트리스트에 최소 1개 이상의 callType이 있어야 함", () => {
    expect(HAIKU_WHITELIST.length).toBeGreaterThan(0)
  })

  it("pw:news_analysis는 화이트리스트에 포함", () => {
    expect(isHaikuWhitelisted("pw:news_analysis")).toBe(true)
  })

  it("pw:impression은 화이트리스트에 포함", () => {
    expect(isHaikuWhitelisted("pw:impression")).toBe(true)
  })

  it("cold_start_summary는 화이트리스트에 포함", () => {
    expect(isHaikuWhitelisted("cold_start_summary")).toBe(true)
  })

  it("pw:post_generation은 화이트리스트에 미포함 (창의적 작업)", () => {
    expect(isHaikuWhitelisted("pw:post_generation")).toBe(false)
  })

  it("pw:comment는 화이트리스트에 미포함 (톤 유지 필요)", () => {
    expect(isHaikuWhitelisted("pw:comment")).toBe(false)
  })

  it("pw:user_response는 화이트리스트에 미포함 (유저 대면)", () => {
    expect(isHaikuWhitelisted("pw:user_response")).toBe(false)
  })

  it("arena_judgment는 화이트리스트에 미포함 (평가 정확도 필요)", () => {
    expect(isHaikuWhitelisted("arena_judgment")).toBe(false)
  })

  it("알 수 없는 callType은 화이트리스트에 미포함", () => {
    expect(isHaikuWhitelisted("unknown:call_type")).toBe(false)
  })

  it("빈 문자열은 화이트리스트에 미포함", () => {
    expect(isHaikuWhitelisted("")).toBe(false)
  })
})

// ── 스케일 기반 최적화 임계값 ──────────────────────────────────

describe("스케일 기반 최적화 임계값", () => {
  it("임계값이 오름차순으로 정렬되어 있어야 함", () => {
    for (let i = 1; i < OPTIMIZATION_THRESHOLDS.length; i++) {
      expect(OPTIMIZATION_THRESHOLDS[i].minPersonaCount).toBeGreaterThanOrEqual(
        OPTIMIZATION_THRESHOLDS[i - 1].minPersonaCount
      )
    }
  })

  it("페르소나 0개 — 아무 최적화도 활성화 안 됨", () => {
    const active = getActiveOptimizations(0)
    expect(active).toHaveLength(0)
  })

  it("페르소나 5개 — 아무 최적화도 활성화 안 됨", () => {
    const active = getActiveOptimizations(5)
    expect(active).toHaveLength(0)
  })

  it("페르소나 10개 — batch_comment만 활성화", () => {
    const active = getActiveOptimizations(10)
    expect(active).toContain("batch_comment")
    expect(active).not.toContain("haiku_routing")
  })

  it("페르소나 50개 — batch_comment + haiku_routing 활성화", () => {
    const active = getActiveOptimizations(50)
    expect(active).toContain("batch_comment")
    expect(active).toContain("haiku_routing")
    expect(active).not.toContain("vector_cache")
  })

  it("페르소나 100개 — vector_cache 포함", () => {
    const active = getActiveOptimizations(100)
    expect(active).toContain("vector_cache")
  })

  it("페르소나 200개 — arena_auto_schedule 포함", () => {
    const active = getActiveOptimizations(200)
    expect(active).toContain("arena_auto_schedule")
  })

  it("페르소나 500개 — 모든 최적화 활성화", () => {
    const active = getActiveOptimizations(500)
    expect(active).toHaveLength(OPTIMIZATION_THRESHOLDS.length)
    expect(active).toContain("memory_index")
  })

  it("페르소나 1000개 — 모든 최적화 활성화", () => {
    const active = getActiveOptimizations(1000)
    expect(active).toHaveLength(OPTIMIZATION_THRESHOLDS.length)
  })
})

describe("isOptimizationActive", () => {
  it("batch_comment — 10개 미만이면 비활성", () => {
    expect(isOptimizationActive("batch_comment", 9)).toBe(false)
  })

  it("batch_comment — 10개 이상이면 활성", () => {
    expect(isOptimizationActive("batch_comment", 10)).toBe(true)
  })

  it("haiku_routing — 49개이면 비활성", () => {
    expect(isOptimizationActive("haiku_routing", 49)).toBe(false)
  })

  it("haiku_routing — 50개이면 활성", () => {
    expect(isOptimizationActive("haiku_routing", 50)).toBe(true)
  })
})

describe("getNextOptimizationTarget", () => {
  it("페르소나 0개 — 다음 타겟은 batch_comment (10개 필요)", () => {
    const next = getNextOptimizationTarget(0)
    expect(next).not.toBeNull()
    expect(next!.feature).toBe("batch_comment")
    expect(next!.minPersonaCount).toBe(10)
    expect(next!.remaining).toBe(10)
  })

  it("페르소나 10개 — 다음 타겟은 haiku_routing (40개 더 필요)", () => {
    const next = getNextOptimizationTarget(10)
    expect(next).not.toBeNull()
    expect(next!.feature).toBe("haiku_routing")
    expect(next!.remaining).toBe(40)
  })

  it("페르소나 500개 이상 — 다음 타겟 없음 (모두 활성화)", () => {
    const next = getNextOptimizationTarget(500)
    expect(next).toBeNull()
  })

  it("페르소나 1000개 — 다음 타겟 없음", () => {
    const next = getNextOptimizationTarget(1000)
    expect(next).toBeNull()
  })
})

// ── 배치 댓글 설정 ─────────────────────────────────────────────

describe("배치 댓글 설정", () => {
  it("기본 배치 크기는 3", () => {
    expect(DEFAULT_BATCH_COMMENT_CONFIG.maxBatchSize).toBe(3)
  })

  it("품질 임계값은 0.9", () => {
    expect(DEFAULT_BATCH_COMMENT_CONFIG.qualityThreshold).toBe(0.9)
  })

  it("최대 재생성 횟수는 2", () => {
    expect(DEFAULT_BATCH_COMMENT_CONFIG.maxRegenerationAttempts).toBe(2)
  })

  it("재생성 모델은 Sonnet", () => {
    expect(DEFAULT_BATCH_COMMENT_CONFIG.regenerationModel).toContain("sonnet")
  })
})

// ── A/B 모니터링 설정 ──────────────────────────────────────────

describe("A/B 모니터링 설정", () => {
  it("비교 기간은 7일", () => {
    expect(DEFAULT_AB_MONITOR_CONFIG.comparisonWindowDays).toBe(7)
  })

  it("최소 샘플 수는 30", () => {
    expect(DEFAULT_AB_MONITOR_CONFIG.minSampleSize).toBe(30)
  })

  it("품질 하락 경고 기준은 0.05 (5%)", () => {
    expect(DEFAULT_AB_MONITOR_CONFIG.qualityDropThreshold).toBe(0.05)
  })

  it("비용 절감 보고 기준은 0.1 (10%)", () => {
    expect(DEFAULT_AB_MONITOR_CONFIG.savingsReportThreshold).toBe(0.1)
  })
})

// ── 최적화 상태 ────────────────────────────────────────────────

describe("getOptimizationStatus", () => {
  it("페르소나 5개 — 모든 최적화 비활성", () => {
    const status = getOptimizationStatus(5)
    expect(status.activePersonaCount).toBe(5)
    expect(status.activeFeatures).toHaveLength(0)
    expect(status.haikuRoutingEnabled).toBe(false)
    expect(status.batchCommentEnabled).toBe(false)
    expect(status.nextTarget).not.toBeNull()
    expect(status.nextTarget!.feature).toBe("batch_comment")
  })

  it("페르소나 50개 — Haiku + 배치 활성", () => {
    const status = getOptimizationStatus(50)
    expect(status.haikuRoutingEnabled).toBe(true)
    expect(status.batchCommentEnabled).toBe(true)
    expect(status.nextTarget!.feature).toBe("vector_cache")
  })

  it("페르소나 500개 — 모든 최적화 활성, 다음 타겟 없음", () => {
    const status = getOptimizationStatus(500)
    expect(status.activeFeatures).toHaveLength(OPTIMIZATION_THRESHOLDS.length)
    expect(status.nextTarget).toBeNull()
  })
})
