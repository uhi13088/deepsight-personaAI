// ═══════════════════════════════════════════════════════════════
// Matching Analytics / XAI / Review / Report Tests
// T58: 성과 분석 + 매칭 설명 + 콘텐츠 평가 + 리포트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import type { SocialPersonaVector } from "@/types"

// ── AC1: Analytics ────────────────────────────────────────────

import {
  calculateMatchingKPIs,
  calculateDiversityIndex,
  analyzeTrend,
  calculateChangeRate,
  detectAnomalies,
  buildAnalyticsDashboard,
  KPI_TARGETS,
  ANOMALY_THRESHOLDS,
} from "@/lib/matching/analytics"
import type { RawMatchingData, MatchingKPIs, TimeSeriesPoint } from "@/lib/matching/analytics"

// ── AC2: Explanation (XAI) ────────────────────────────────────

import {
  getTopTraits,
  generateOperatorExplanation,
  generateUserExplanation,
  generateCompoundExplanation,
} from "@/lib/matching/explanation"

// ── AC3: Content Review ───────────────────────────────────────

import {
  REVIEW_STYLES,
  mapPersonaToStyle,
  getStyleInfo,
  lookupStyleReview,
  generateReviewPipeline,
  estimateCost,
  calculateCacheStats,
} from "@/lib/matching/content-review"
import type { StyleReviewEntry, ReviewGenerationConfig } from "@/lib/matching/content-review"

// ── AC4: Report ───────────────────────────────────────────────

import {
  createReportConfig,
  buildKPISummary,
  generateRecommendations,
  generateReport,
  kpisToCsvRows,
  csvRowsToString,
} from "@/lib/matching/report"
import type { ReportConfig } from "@/lib/matching/report"

// ── 공통 테스트 데이터 ────────────────────────────────────────

function makeRawData(overrides: Partial<RawMatchingData> = {}): RawMatchingData {
  return {
    totalMatches: 100,
    likedMatches: 80,
    matchScores: [0.8, 0.7, 0.9, 0.6, 0.85],
    top1Selections: 50,
    totalRecommendations: 100,
    clicks: 30,
    impressions: 100,
    dwellTimes: [120, 150, 90, 200, 60],
    uniqueVisitors: 100,
    returnVisitors: 45,
    promoters: 40,
    passives: 30,
    detractors: 10,
    recommendedPersonaIds: ["p1", "p2", "p3", "p1", "p2", "p4", "p5"],
    ...overrides,
  }
}

function makeKPIs(overrides: Partial<MatchingKPIs> = {}): MatchingKPIs {
  return {
    matchAccuracy: 0.8,
    avgMatchScore: 0.77,
    top1Accuracy: 0.5,
    diversityIndex: 0.9,
    ctr: 0.3,
    avgDwellTime: 124,
    returnRate: 0.45,
    nps: 38,
    ...overrides,
  }
}

const userL1: SocialPersonaVector = {
  depth: 0.8,
  lens: 0.7,
  stance: 0.6,
  scope: 0.4,
  taste: 0.3,
  purpose: 0.9,
  sociability: 0.2,
}

const personaL1: SocialPersonaVector = {
  depth: 0.75,
  lens: 0.65,
  stance: 0.55,
  scope: 0.45,
  taste: 0.35,
  purpose: 0.85,
  sociability: 0.25,
}

// ═══════════════════════════════════════════════════════════════
// AC1: Analytics
// ═══════════════════════════════════════════════════════════════

describe("Analytics — KPI 계산", () => {
  it("원시 데이터로부터 KPI를 올바르게 계산한다", () => {
    const data = makeRawData()
    const kpis = calculateMatchingKPIs(data)

    expect(kpis.matchAccuracy).toBe(0.8) // 80/100
    expect(kpis.avgMatchScore).toBe(0.77) // (0.8+0.7+0.9+0.6+0.85)/5
    expect(kpis.top1Accuracy).toBe(0.5) // 50/100
    expect(kpis.ctr).toBe(0.3) // 30/100
    expect(kpis.returnRate).toBe(0.45) // 45/100
    expect(kpis.nps).toBe(38) // ((40-10)/80)*100
    expect(kpis.avgDwellTime).toBe(124) // (120+150+90+200+60)/5
    expect(kpis.diversityIndex).toBeGreaterThan(0)
    expect(kpis.diversityIndex).toBeLessThanOrEqual(1)
  })

  it("빈 데이터면 모든 KPI가 0이다", () => {
    const kpis = calculateMatchingKPIs(
      makeRawData({
        totalMatches: 0,
        likedMatches: 0,
        matchScores: [],
        top1Selections: 0,
        totalRecommendations: 0,
        clicks: 0,
        impressions: 0,
        dwellTimes: [],
        uniqueVisitors: 0,
        returnVisitors: 0,
        promoters: 0,
        passives: 0,
        detractors: 0,
        recommendedPersonaIds: [],
      })
    )

    expect(kpis.matchAccuracy).toBe(0)
    expect(kpis.avgMatchScore).toBe(0)
    expect(kpis.top1Accuracy).toBe(0)
    expect(kpis.ctr).toBe(0)
    expect(kpis.avgDwellTime).toBe(0)
    expect(kpis.returnRate).toBe(0)
    expect(kpis.nps).toBe(0)
    expect(kpis.diversityIndex).toBe(0)
  })

  it("KPI_TARGETS에 주요 지표 목표가 정의되어 있다", () => {
    expect(KPI_TARGETS.matchAccuracy).toBe(0.8)
    expect(KPI_TARGETS.avgMatchScore).toBe(0.75)
    expect(KPI_TARGETS.top1Accuracy).toBe(0.5)
    expect(KPI_TARGETS.ctr).toBe(0.3)
    expect(KPI_TARGETS.returnRate).toBe(0.4)
  })
})

describe("Analytics — 다양성 지수 (Shannon Entropy)", () => {
  it("빈 배열이면 0을 반환한다", () => {
    expect(calculateDiversityIndex([])).toBe(0)
  })

  it("단일 종류면 0을 반환한다", () => {
    expect(calculateDiversityIndex(["p1", "p1", "p1"])).toBe(0)
  })

  it("균등 분포면 1.0에 가까운 값을 반환한다", () => {
    const ids = ["p1", "p2", "p3", "p4"] // 각 25%
    expect(calculateDiversityIndex(ids)).toBe(1)
  })

  it("편중 분포면 낮은 값을 반환한다", () => {
    const ids = ["p1", "p1", "p1", "p1", "p1", "p1", "p1", "p1", "p1", "p2"]
    const index = calculateDiversityIndex(ids)
    expect(index).toBeLessThan(0.6)
    expect(index).toBeGreaterThan(0)
  })
})

describe("Analytics — 트렌드 분석", () => {
  it("데이터 1개면 stable을 반환한다", () => {
    expect(analyzeTrend([{ timestamp: 1, value: 0.5 }])).toBe("stable")
  })

  it("후반부가 높으면 rising을 반환한다", () => {
    const points: TimeSeriesPoint[] = [
      { timestamp: 1, value: 0.5 },
      { timestamp: 2, value: 0.5 },
      { timestamp: 3, value: 0.7 },
      { timestamp: 4, value: 0.8 },
    ]
    expect(analyzeTrend(points)).toBe("rising")
  })

  it("후반부가 낮으면 falling을 반환한다", () => {
    const points: TimeSeriesPoint[] = [
      { timestamp: 1, value: 0.8 },
      { timestamp: 2, value: 0.8 },
      { timestamp: 3, value: 0.5 },
      { timestamp: 4, value: 0.4 },
    ]
    expect(analyzeTrend(points)).toBe("falling")
  })

  it("변화율이 5% 이내면 stable이다", () => {
    const points: TimeSeriesPoint[] = [
      { timestamp: 1, value: 0.5 },
      { timestamp: 2, value: 0.5 },
      { timestamp: 3, value: 0.51 },
      { timestamp: 4, value: 0.52 },
    ]
    expect(analyzeTrend(points)).toBe("stable")
  })

  it("calculateChangeRate가 올바른 변화율을 계산한다", () => {
    const points: TimeSeriesPoint[] = [
      { timestamp: 1, value: 1.0 },
      { timestamp: 2, value: 1.0 },
      { timestamp: 3, value: 1.5 },
      { timestamp: 4, value: 1.5 },
    ]
    expect(calculateChangeRate(points)).toBe(0.5) // 50% 상승
  })

  it("포인트 1개면 changeRate는 0이다", () => {
    expect(calculateChangeRate([{ timestamp: 1, value: 0.5 }])).toBe(0)
  })
})

describe("Analytics — 이상 탐지", () => {
  it("정확도 10% 이상 하락 시 경고를 발생시킨다", () => {
    const current = makeKPIs({ matchAccuracy: 0.65 })
    const baseline = makeKPIs({ matchAccuracy: 0.8 })

    const anomalies = detectAnomalies(current, baseline)
    expect(anomalies.length).toBeGreaterThanOrEqual(1)

    const accDrop = anomalies.find((a) => a.metric === "matchAccuracy")
    expect(accDrop).toBeDefined()
    expect(accDrop!.type).toBe("accuracy_drop")
    expect(accDrop!.severity).toBe("warning")
  })

  it("정확도 20% 이상 하락 시 critical을 발생시킨다", () => {
    const current = makeKPIs({ matchAccuracy: 0.55 })
    const baseline = makeKPIs({ matchAccuracy: 0.8 })

    const anomalies = detectAnomalies(current, baseline)
    const accDrop = anomalies.find(
      (a) => a.metric === "matchAccuracy" && a.type === "accuracy_drop"
    )
    expect(accDrop).toBeDefined()
    expect(accDrop!.severity).toBe("critical")
  })

  it("CTR 30% 이상 하락 시 traffic_anomaly를 발생시킨다", () => {
    const current = makeKPIs({ ctr: 0.1 })
    const baseline = makeKPIs({ ctr: 0.3 })

    const anomalies = detectAnomalies(current, baseline)
    const ctrAnomaly = anomalies.find((a) => a.metric === "ctr")
    expect(ctrAnomaly).toBeDefined()
    expect(ctrAnomaly!.type).toBe("traffic_anomaly")
  })

  it("2σ 이상 이탈 시 통계적 이상치를 감지한다", () => {
    const historicalAccuracies = [0.8, 0.82, 0.79, 0.81, 0.8]
    const current = makeKPIs({ matchAccuracy: 0.5 }) // 크게 벗어남
    const baseline = makeKPIs({ matchAccuracy: 0.8 })

    const anomalies = detectAnomalies(current, baseline, historicalAccuracies)
    const statAnomaly = anomalies.find((a) => a.description.includes("통계적"))
    expect(statAnomaly).toBeDefined()
  })

  it("이상 없으면 빈 배열을 반환한다", () => {
    const current = makeKPIs()
    const baseline = makeKPIs()

    const anomalies = detectAnomalies(current, baseline)
    expect(anomalies).toHaveLength(0)
  })

  it("ANOMALY_THRESHOLDS가 올바르게 정의되어 있다", () => {
    expect(ANOMALY_THRESHOLDS.accuracyDropThreshold).toBe(0.1)
    expect(ANOMALY_THRESHOLDS.deviationThreshold).toBe(2.0)
  })
})

describe("Analytics — 대시보드 빌더", () => {
  it("대시보드를 올바르게 생성한다", () => {
    const data = makeRawData()
    const baseline = makeKPIs()

    const dashboard = buildAnalyticsDashboard(data, baseline)
    expect(dashboard.kpis).toBeDefined()
    expect(dashboard.kpis.matchAccuracy).toBe(0.8)
    expect(dashboard.filter.timeRange).toBe("7d")
    expect(dashboard.generatedAt).toBeGreaterThan(0)
  })

  it("이상 탐지 결과가 포함된다", () => {
    const data = makeRawData({ likedMatches: 50, totalMatches: 100 }) // 50% accuracy
    const baseline = makeKPIs({ matchAccuracy: 0.8 }) // baseline 80%

    const dashboard = buildAnalyticsDashboard(data, baseline)
    expect(dashboard.anomalies.length).toBeGreaterThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: Explanation (XAI)
// ═══════════════════════════════════════════════════════════════

describe("Explanation — getTopTraits", () => {
  it("극단값 기준으로 상위 N개 특성을 반환한다", () => {
    const traits = getTopTraits(userL1, 3)
    expect(traits).toHaveLength(3)
    // purpose(0.9)이 가장 극단적 → 첫 번째
    expect(traits[0].dimension).toBe("purpose")
    expect(traits[0].level).toBe("high")
  })

  it("0.4~0.6 범위는 neutral로 분류한다", () => {
    const neutralVector: SocialPersonaVector = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const traits = getTopTraits(neutralVector, 7)
    expect(traits.every((t) => t.level === "neutral")).toBe(true)
  })

  it("기본 n=3개를 반환한다", () => {
    const traits = getTopTraits(userL1)
    expect(traits).toHaveLength(3)
  })

  it("high/low를 올바르게 분류한다", () => {
    const vector: SocialPersonaVector = {
      depth: 0.9,
      lens: 0.1,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const traits = getTopTraits(vector, 2)
    const depthTrait = traits.find((t) => t.dimension === "depth")
    const lensTrait = traits.find((t) => t.dimension === "lens")
    expect(depthTrait?.level).toBe("high")
    expect(lensTrait?.level).toBe("low")
  })
})

describe("Explanation — 운영자용 설명", () => {
  it("차원별 기여도 분석을 포함한다", () => {
    const explanation = generateOperatorExplanation(0.85, "basic", userL1, personaL1)
    expect(explanation.matchScore).toBe(0.85)
    expect(explanation.tier).toBe("basic")
    expect(explanation.dimensionBreakdown).toHaveLength(7)
  })

  it("기여도 순으로 정렬된다", () => {
    const explanation = generateOperatorExplanation(0.85, "basic", userL1, personaL1)
    const contributions = explanation.dimensionBreakdown.map((d) => d.contribution)
    for (let i = 1; i < contributions.length; i++) {
      expect(contributions[i]).toBeLessThanOrEqual(contributions[i - 1])
    }
  })

  it("높은 기여도는 strengthFactors에 포함된다", () => {
    const explanation = generateOperatorExplanation(0.85, "basic", userL1, personaL1)
    // userL1과 personaL1의 차이가 0.05인 차원이 많으므로 strength가 있어야 함
    expect(explanation.strengthFactors.length).toBeGreaterThan(0)
  })

  it("차이 큰 차원은 weakFactors에 포함된다", () => {
    const farPersona: SocialPersonaVector = {
      depth: 0.1,
      lens: 0.1,
      stance: 0.1,
      scope: 0.9,
      taste: 0.9,
      purpose: 0.1,
      sociability: 0.9,
    }
    const explanation = generateOperatorExplanation(0.3, "basic", userL1, farPersona)
    expect(explanation.weakFactors.length).toBeGreaterThan(0)
  })
})

describe("Explanation — 사용자용 자연어 설명", () => {
  it("headline, body, traits를 포함한다", () => {
    const result = generateUserExplanation(userL1, personaL1)
    expect(result.headline).toBeTruthy()
    expect(result.body).toBeTruthy()
    expect(result.traits.length).toBeGreaterThan(0)
  })

  it("숫자가 포함되지 않는다 (body에)", () => {
    const result = generateUserExplanation(userL1, personaL1)
    // body에 0~9 형태의 수치가 없어야 함
    expect(result.body).not.toMatch(/\d+\.\d+/)
  })

  it("모든 차원이 neutral이면 기본 메시지를 반환한다", () => {
    const neutralVector: SocialPersonaVector = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const result = generateUserExplanation(neutralVector, personaL1)
    expect(result.headline).toContain("다양한 관점")
    expect(result.traits).toContain("균형잡힌")
  })

  it("야간 컨텍스트에서 보너스 메시지가 추가된다", () => {
    const result = generateUserExplanation(userL1, personaL1, { timeOfDay: "night" })
    expect(result.body).toContain("늦은 밤")
  })
})

describe("Explanation — 복합 성향 설명", () => {
  it("특성 기반 설명을 반환한다", () => {
    const result = generateCompoundExplanation(userL1, "테스트봇")
    expect(result).toContain("유저")
    expect(result.length).toBeGreaterThan(0)
  })

  it("neutral 벡터이면 기본 설명을 반환한다", () => {
    const neutralVector: SocialPersonaVector = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const result = generateCompoundExplanation(neutralVector, "봇A")
    expect(result).toContain("봇A")
    expect(result).toContain("다양한 관점")
  })

  it("특성 조합을 + 로 연결하여 보여준다", () => {
    const result = generateCompoundExplanation(userL1, "봇B")
    expect(result).toContain("+")
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Content Review
// ═══════════════════════════════════════════════════════════════

describe("Content Review — 12종 스타일", () => {
  it("12개 스타일이 정의되어 있다", () => {
    expect(REVIEW_STYLES).toHaveLength(12)
  })

  it("S01~S12 ID가 모두 존재한다", () => {
    const ids = REVIEW_STYLES.map((s) => s.id)
    for (let i = 1; i <= 12; i++) {
      const styleId = `S${String(i).padStart(2, "0")}`
      expect(ids).toContain(styleId)
    }
  })

  it("각 스타일에 name, nameEn, combination이 있다", () => {
    for (const style of REVIEW_STYLES) {
      expect(style.name).toBeTruthy()
      expect(style.nameEn).toBeTruthy()
      expect(style.combination).toBeTruthy()
    }
  })
})

describe("Content Review — 페르소나→스타일 매핑", () => {
  it("D↑ Le↑ St↑ → S01 (시네필 비평가)", () => {
    const v: SocialPersonaVector = {
      depth: 0.8,
      lens: 0.7,
      stance: 0.6,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    expect(mapPersonaToStyle(v)).toBe("S01")
  })

  it("D↑ Le↑ St↓ → S02 (친절한 해설자)", () => {
    const v: SocialPersonaVector = {
      depth: 0.8,
      lens: 0.7,
      stance: 0.3,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    expect(mapPersonaToStyle(v)).toBe("S02")
  })

  it("D↓ Le↓ St↓ → S08 (힐링 한줄평)", () => {
    const v: SocialPersonaVector = {
      depth: 0.3,
      lens: 0.3,
      stance: 0.3,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    expect(mapPersonaToStyle(v)).toBe("S08")
  })

  it("taste ≥ 0.8 → S09 (트렌드 헌터)", () => {
    const v: SocialPersonaVector = {
      depth: 0.8,
      lens: 0.7,
      stance: 0.6,
      scope: 0.5,
      taste: 0.85,
      purpose: 0.5,
      sociability: 0.5,
    }
    expect(mapPersonaToStyle(v)).toBe("S09")
  })

  it("taste ≤ 0.2 → S10 (클래식 감정가)", () => {
    const v: SocialPersonaVector = {
      depth: 0.8,
      lens: 0.7,
      stance: 0.6,
      scope: 0.5,
      taste: 0.15,
      purpose: 0.5,
      sociability: 0.5,
    }
    expect(mapPersonaToStyle(v)).toBe("S10")
  })

  it("scope ≥ 0.8 → S11 (디테일 매니아)", () => {
    const v: SocialPersonaVector = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.9,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    expect(mapPersonaToStyle(v)).toBe("S11")
  })

  it("scope ≤ 0.2 → S12 (핵심 요약러)", () => {
    const v: SocialPersonaVector = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.1,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    expect(mapPersonaToStyle(v)).toBe("S12")
  })

  it("특화 스타일이 기본 스타일보다 우선한다", () => {
    // taste=0.85(S09 우선) + D↑Le↑St↑ (S01이 될 수 있지만 S09)
    const v: SocialPersonaVector = {
      depth: 0.8,
      lens: 0.7,
      stance: 0.6,
      scope: 0.5,
      taste: 0.85,
      purpose: 0.5,
      sociability: 0.5,
    }
    expect(mapPersonaToStyle(v)).toBe("S09")
  })
})

describe("Content Review — 스타일 조회", () => {
  it("유효한 스타일 ID로 조회하면 정보를 반환한다", () => {
    const info = getStyleInfo("S01")
    expect(info).toBeDefined()
    expect(info!.name).toBe("시네필 비평가")
  })

  it("존재하지 않는 ID면 undefined를 반환한다", () => {
    const info = getStyleInfo("S99" as never)
    expect(info).toBeUndefined()
  })
})

describe("Content Review — 캐시 조회", () => {
  const cache: StyleReviewEntry[] = [
    { styleId: "S01", contentId: "c1", review: "멋진 영화", generatedAt: 1000, source: "llm" },
    { styleId: "S02", contentId: "c1", review: "좋은 해설", generatedAt: 1001, source: "llm" },
  ]

  it("캐시에 있으면 해당 엔트리를 반환한다", () => {
    const result = lookupStyleReview(cache, "S01", "c1")
    expect(result).not.toBeNull()
    expect(result!.review).toBe("멋진 영화")
  })

  it("캐시에 없으면 null을 반환한다", () => {
    expect(lookupStyleReview(cache, "S01", "c999")).toBeNull()
    expect(lookupStyleReview(cache, "S05", "c1")).toBeNull()
  })
})

describe("Content Review — 2단계 리뷰 파이프라인", () => {
  const publicConfig: ReviewGenerationConfig = {
    visibility: "public",
    enableToneTransform: true,
    toneTransformMethod: "llm",
  }

  const privateConfig: ReviewGenerationConfig = {
    visibility: "private",
    enableToneTransform: true,
    toneTransformMethod: "llm",
  }

  const cache: StyleReviewEntry[] = [
    { styleId: "S01", contentId: "c1", review: "심층 비평", generatedAt: 1000, source: "llm" },
  ]

  it("Private 페르소나: 직접 생성 (bypass)", () => {
    const result = generateReviewPipeline("persona1", userL1, "c1", cache, privateConfig)
    expect(result.generationMethod).toBe("private_direct")
    expect(result.estimatedCost).toBe(0.002)
  })

  it("Public + 캐시 히트: 말투 변환만", () => {
    // userL1 → depth↑ lens↑ stance↑ → S01
    const v: SocialPersonaVector = {
      depth: 0.8,
      lens: 0.7,
      stance: 0.6,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const result = generateReviewPipeline("persona1", v, "c1", cache, publicConfig)
    expect(result.generationMethod).toBe("cache_hit")
    expect(result.baseReview).toBe("심층 비평")
    expect(result.estimatedCost).toBe(0.0003) // LLM tone transform cost
  })

  it("Public + 캐시 미스: LLM 생성", () => {
    const result = generateReviewPipeline("persona1", userL1, "c999", cache, publicConfig)
    expect(result.generationMethod).toBe("llm_generated")
    expect(result.estimatedCost).toBe(0.002 + 0.0003)
  })

  it("톤 변환 비활성화 시 비용 절감", () => {
    const noToneConfig: ReviewGenerationConfig = {
      visibility: "public",
      enableToneTransform: false,
      toneTransformMethod: "llm",
    }
    const v: SocialPersonaVector = {
      depth: 0.8,
      lens: 0.7,
      stance: 0.6,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const result = generateReviewPipeline("persona1", v, "c1", cache, noToneConfig)
    expect(result.estimatedCost).toBe(0) // 캐시 히트 + 톤 변환 없음
  })
})

describe("Content Review — 비용 추정", () => {
  it("스타일 기반이 전통 방식보다 비용이 낮다", () => {
    const result = estimateCost(100, 1000, 0.8, 0.8)
    expect(result.styleBased).toBeLessThan(result.traditional)
    expect(result.savings).toBeGreaterThan(0)
  })

  it("캐시 히트율이 높을수록 비용이 낮다", () => {
    const lowHit = estimateCost(100, 1000, 0.3, 0.8)
    const highHit = estimateCost(100, 1000, 0.9, 0.8)
    expect(highHit.styleBased).toBeLessThan(lowHit.styleBased)
  })

  it("traditional 비용이 올바르게 계산된다", () => {
    const result = estimateCost(10, 100, 0.5, 0.8)
    expect(result.traditional).toBe(2) // 10 * 100 * 0.002
  })
})

describe("Content Review — 캐시 통계", () => {
  it("캐시 통계를 올바르게 계산한다", () => {
    const cache: StyleReviewEntry[] = [
      { styleId: "S01", contentId: "c1", review: "test", generatedAt: 1000, source: "llm" },
      { styleId: "S02", contentId: "c1", review: "test", generatedAt: 1001, source: "llm" },
    ]
    const stats = calculateCacheStats(cache, 100, 80)
    expect(stats.totalEntries).toBe(2)
    expect(stats.hitRate).toBe(0.8)
  })

  it("조회 0건이면 hitRate가 0이다", () => {
    const stats = calculateCacheStats([], 0, 0)
    expect(stats.hitRate).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: Report
// ═══════════════════════════════════════════════════════════════

describe("Report — 설정 생성", () => {
  it("리포트 설정을 올바르게 생성한다", () => {
    const config = createReportConfig("월간 리포트", "monthly", { start: 1000, end: 2000 }, "user1")
    expect(config.id).toMatch(/^rpt_/)
    expect(config.name).toBe("월간 리포트")
    expect(config.frequency).toBe("monthly")
    expect(config.includeSections).toHaveLength(5) // 기본 5개 섹션
    expect(config.createdBy).toBe("user1")
  })

  it("커스텀 섹션을 지정할 수 있다", () => {
    const config = createReportConfig(
      "간단 리포트",
      "weekly",
      { start: 1000, end: 2000 },
      "user1",
      ["kpi_summary"]
    )
    expect(config.includeSections).toHaveLength(1)
    expect(config.includeSections[0]).toBe("kpi_summary")
  })
})

describe("Report — KPI 요약", () => {
  it("이전 데이터와 비교하여 변화율을 계산한다", () => {
    const current = makeKPIs({ matchAccuracy: 0.9, ctr: 0.4 })
    const previous = makeKPIs({ matchAccuracy: 0.8, ctr: 0.3 })

    const summary = buildKPISummary(current, previous)
    expect(summary.current).toBe(current)
    expect(summary.previous).toBe(previous)
    expect(summary.changes.matchAccuracy).toBeDefined()
    expect(summary.changes.matchAccuracy!).toBeGreaterThan(0) // 상승
    expect(summary.changes.ctr).toBeDefined()
    expect(summary.changes.ctr!).toBeGreaterThan(0)
  })

  it("이전 데이터 없으면 changes가 비어있다", () => {
    const summary = buildKPISummary(makeKPIs(), null)
    expect(Object.keys(summary.changes)).toHaveLength(0)
    expect(summary.previous).toBeNull()
  })

  it("이전 값이 0이면 해당 항목의 변화율을 계산하지 않는다", () => {
    const current = makeKPIs({ matchAccuracy: 0.5 })
    const previous = makeKPIs({ matchAccuracy: 0 })

    const summary = buildKPISummary(current, previous)
    expect(summary.changes.matchAccuracy).toBeUndefined()
  })
})

describe("Report — 개선 권고", () => {
  it("목표 미달 KPI에 대해 권고를 생성한다", () => {
    const kpis = makeKPIs({
      matchAccuracy: 0.5, // 목표 0.8 미달
      ctr: 0.1, // 목표 0.3 미달
    })
    const items = generateRecommendations(kpis)
    expect(items.length).toBeGreaterThanOrEqual(2)
  })

  it("우선순위순(high→medium→low)으로 정렬된다", () => {
    const kpis = makeKPIs({
      matchAccuracy: 0.4, // gap=0.4, high
      ctr: 0.25, // gap=0.05, low
      returnRate: 0.3, // gap=0.1, medium
    })
    const items = generateRecommendations(kpis)
    if (items.length >= 2) {
      const priorities = items.map((i) => i.priority)
      const order = { high: 0, medium: 1, low: 2 }
      for (let i = 1; i < priorities.length; i++) {
        expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]])
      }
    }
  })

  it("모든 KPI가 목표 이상이면 빈 배열을 반환한다", () => {
    const kpis = makeKPIs({
      matchAccuracy: 0.9,
      avgMatchScore: 0.85,
      top1Accuracy: 0.6,
      ctr: 0.4,
      returnRate: 0.5,
    })
    const items = generateRecommendations(kpis)
    expect(items).toHaveLength(0)
  })
})

describe("Report — 리포트 생성", () => {
  it("전체 섹션이 포함된 리포트를 생성한다", () => {
    const config = createReportConfig(
      "테스트 리포트",
      "weekly",
      { start: 1000, end: 2000 },
      "user1"
    )
    const report = generateReport(
      config,
      makeKPIs(),
      makeKPIs(),
      [
        {
          segmentName: "신규",
          segmentSize: 100,
          kpis: makeKPIs(),
          topPersonas: [],
          failureRate: 0.05,
        },
      ],
      [],
      []
    )

    expect(report.id).toMatch(/^gen_/)
    expect(report.configId).toBe(config.id)
    expect(report.sections).toHaveLength(5)
    expect(report.sections.map((s) => s.type)).toContain("kpi_summary")
    expect(report.sections.map((s) => s.type)).toContain("recommendation")
  })

  it("특정 섹션만 선택하면 해당 섹션만 포함된다", () => {
    const config = createReportConfig("요약 리포트", "daily", { start: 1000, end: 2000 }, "user1", [
      "kpi_summary",
      "anomaly_log",
    ])
    const report = generateReport(config, makeKPIs(), null, [], [], [])
    expect(report.sections).toHaveLength(2)
    expect(report.sections[0].type).toBe("kpi_summary")
    expect(report.sections[1].type).toBe("anomaly_log")
  })

  it("anomaly_log 섹션에 이벤트 카운트가 포함된다", () => {
    const config = createReportConfig(
      "이상탐지 리포트",
      "daily",
      { start: 1000, end: 2000 },
      "user1",
      ["anomaly_log"]
    )
    const anomalies = [
      {
        id: "a1",
        type: "accuracy_drop" as const,
        severity: "critical" as const,
        metric: "matchAccuracy",
        expectedValue: 0.8,
        actualValue: 0.5,
        deviation: 2.5,
        affectedSegment: "all",
        detectedAt: 1000,
        description: "테스트",
      },
      {
        id: "a2",
        type: "traffic_anomaly" as const,
        severity: "warning" as const,
        metric: "ctr",
        expectedValue: 0.3,
        actualValue: 0.1,
        deviation: 1.5,
        affectedSegment: "all",
        detectedAt: 1001,
        description: "테스트2",
      },
    ]
    const report = generateReport(config, makeKPIs(), null, [], [], anomalies)
    const anomalySection = report.sections[0].data as { totalCount: number; criticalCount: number }
    expect(anomalySection.totalCount).toBe(2)
    expect(anomalySection.criticalCount).toBe(1)
  })
})

describe("Report — CSV 내보내기", () => {
  it("KPI를 CSV 행으로 변환한다", () => {
    const rows = kpisToCsvRows(makeKPIs())
    expect(rows).toHaveLength(8) // 8개 KPI
    expect(rows[0].metric).toBe("매칭 정확도")
    expect(rows[0].value).toBe(0.8)
  })

  it("CSV 문자열을 올바르게 생성한다", () => {
    const rows = kpisToCsvRows(makeKPIs())
    const csv = csvRowsToString(rows)
    const lines = csv.split("\n")
    expect(lines[0]).toBe("metric,value")
    expect(lines.length).toBe(9) // header + 8 rows
  })

  it("빈 배열이면 빈 문자열을 반환한다", () => {
    expect(csvRowsToString([])).toBe("")
  })
})
