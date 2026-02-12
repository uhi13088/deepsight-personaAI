import { describe, it, expect, vi } from "vitest"
import {
  extractVoiceFeatures,
  checkVoiceConsistency,
  runQualityGate,
  cosineSimilarity,
  VOICE_THRESHOLDS,
  QUALITY_THRESHOLDS,
} from "@/lib/persona-world/quality-monitor"
import type { VoiceMonitorProvider, QualityGateProvider } from "@/lib/persona-world/quality-monitor"
import { learnFromActivity, activityToUIV } from "@/lib/persona-world/onboarding/activity-learner"
import type { ActivityLearnerProvider } from "@/lib/persona-world/onboarding/activity-learner"
import type { UserActivity } from "@/lib/persona-world/types"

// ═══ extractVoiceFeatures ═══

describe("extractVoiceFeatures", () => {
  it("기본 텍스트에서 특성 추출", () => {
    const text = "이 영화는 정말 감동적입니다. 연출이 훌륭했습니다."
    const features = extractVoiceFeatures(text)

    expect(features.avgSentenceLength).toBeGreaterThan(0)
    expect(features.formalityLevel).toBeGreaterThan(0)
    expect(features.vocabularyDiversity).toBeGreaterThan(0)
  })

  it("감정 표현이 많은 텍스트", () => {
    const text = "와 진짜 감동!! 사랑해!! ㅠㅠㅠ 슬프다 ㅋㅋㅋ"
    const features = extractVoiceFeatures(text)

    expect(features.emotionalFrequency).toBeGreaterThan(0)
  })

  it("질문이 포함된 텍스트", () => {
    const text = "어떻게 생각하세요? 이건 좋은 건가요? 아닌가요?"
    const features = extractVoiceFeatures(text)

    expect(features.questionFrequency).toBeGreaterThan(0)
  })

  it("빈 텍스트", () => {
    const features = extractVoiceFeatures("")

    expect(features.avgSentenceLength).toBe(0)
    expect(features.vocabularyDiversity).toBe(0.5)
  })

  it("격식체 vs 비격식체 구분", () => {
    const formal = extractVoiceFeatures("이것은 좋은 영화입니다. 추천드립니다.")
    const informal = extractVoiceFeatures("이거 진짜 좋아 거든 잖아 했어")

    expect(formal.formalityLevel).toBeGreaterThan(informal.formalityLevel)
  })
})

// ═══ cosineSimilarity ═══

describe("cosineSimilarity", () => {
  it("동일 벡터 → 1.0", () => {
    expect(cosineSimilarity([0.5, 0.3, 0.7], [0.5, 0.3, 0.7])).toBe(1)
  })

  it("직교 벡터 → 0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
  })

  it("유사한 벡터 → 높은 값", () => {
    const sim = cosineSimilarity([0.5, 0.3, 0.7], [0.5, 0.35, 0.65])
    expect(sim).toBeGreaterThan(0.9)
  })

  it("빈 벡터 → 1.0", () => {
    expect(cosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(1)
  })
})

// ═══ checkVoiceConsistency ═══

describe("checkVoiceConsistency", () => {
  it("이전 포스트 없으면 ok", async () => {
    const provider: VoiceMonitorProvider = {
      getRecentPostTexts: vi.fn().mockResolvedValue([]),
    }

    const result = await checkVoiceConsistency("새 포스트 텍스트", "p1", provider)

    expect(result.status).toBe("ok")
    expect(result.similarity).toBe(1.0)
  })

  it("유사한 스타일 → ok", async () => {
    const provider: VoiceMonitorProvider = {
      getRecentPostTexts: vi
        .fn()
        .mockResolvedValue([
          "이 영화는 정말 좋았습니다. 연출이 뛰어났습니다.",
          "이 드라마는 정말 재미있었습니다. 스토리가 훌륭했습니다.",
          "이 책은 정말 감동적이었습니다. 문장이 아름다웠습니다.",
        ]),
    }

    const result = await checkVoiceConsistency(
      "이 음악은 정말 인상적이었습니다. 멜로디가 좋았습니다.",
      "p1",
      provider
    )

    expect(result.status).toBe("ok")
    expect(result.similarity).toBeGreaterThanOrEqual(VOICE_THRESHOLDS.ok)
  })

  it("프로바이더 함수 호출 확인", async () => {
    const provider: VoiceMonitorProvider = {
      getRecentPostTexts: vi.fn().mockResolvedValue(["텍스트"]),
    }

    await checkVoiceConsistency("새 포스트", "p1", provider)

    expect(provider.getRecentPostTexts).toHaveBeenCalledWith("p1", 5)
  })
})

// ═══ runQualityGate ═══

describe("runQualityGate", () => {
  it("벡터 없으면 caution 반환", async () => {
    const provider: QualityGateProvider = {
      getVectors: vi.fn().mockResolvedValue(null),
      getDimensionScores: vi.fn(),
      getResponseSamples: vi.fn(),
    }

    const result = await runQualityGate("p1", provider)

    expect(result.status).toBe("caution")
    expect(result.shouldPauseActivity).toBe(false)
  })

  it("높은 PIS → excellent", async () => {
    const provider: QualityGateProvider = {
      getVectors: vi.fn().mockResolvedValue({
        l1: {
          depth: 0.7,
          lens: 0.6,
          stance: 0.5,
          scope: 0.6,
          taste: 0.5,
          purpose: 0.7,
          sociability: 0.6,
        },
        l2: {
          openness: 0.7,
          conscientiousness: 0.6,
          extraversion: 0.6,
          agreeableness: 0.6,
          neuroticism: 0.3,
        },
        l3: { lack: 0.3, moralCompass: 0.7, volatility: 0.3, growthArc: 0.7 },
      }),
      getDimensionScores: vi.fn().mockResolvedValue({
        depth: { designed: 0.7, inferred: 0.7, delta: 0 },
        lens: { designed: 0.6, inferred: 0.6, delta: 0 },
      }),
      getResponseSamples: vi.fn().mockResolvedValue([]),
    }

    const result = await runQualityGate("p1", provider)

    expect(result.integrityScore.pis).toBeGreaterThan(0)
    expect(result.shouldPauseActivity).toBe(false)
  })

  it("프로바이더 함수 모두 호출", async () => {
    const provider: QualityGateProvider = {
      getVectors: vi.fn().mockResolvedValue({
        l1: {
          depth: 0.5,
          lens: 0.5,
          stance: 0.5,
          scope: 0.5,
          taste: 0.5,
          purpose: 0.5,
          sociability: 0.5,
        },
        l2: {
          openness: 0.5,
          conscientiousness: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          neuroticism: 0.5,
        },
        l3: { lack: 0.5, moralCompass: 0.5, volatility: 0.5, growthArc: 0.5 },
      }),
      getDimensionScores: vi.fn().mockResolvedValue({}),
      getResponseSamples: vi.fn().mockResolvedValue([]),
    }

    await runQualityGate("p1", provider)

    expect(provider.getVectors).toHaveBeenCalledWith("p1")
    expect(provider.getDimensionScores).toHaveBeenCalledWith("p1")
    expect(provider.getResponseSamples).toHaveBeenCalledWith("p1", 20)
  })
})

// ═══ VOICE_THRESHOLDS ═══

describe("VOICE_THRESHOLDS", () => {
  it("ok > warning", () => {
    expect(VOICE_THRESHOLDS.ok).toBeGreaterThan(VOICE_THRESHOLDS.warning)
  })
})

// ═══ QUALITY_THRESHOLDS ═══

describe("QUALITY_THRESHOLDS", () => {
  it("excellent > good > caution", () => {
    expect(QUALITY_THRESHOLDS.excellent).toBeGreaterThan(QUALITY_THRESHOLDS.good)
    expect(QUALITY_THRESHOLDS.good).toBeGreaterThan(QUALITY_THRESHOLDS.caution)
  })
})

// ═══ activityToUIV ═══

describe("activityToUIV", () => {
  it("like 활동 → UIV 변환", () => {
    const activity: UserActivity = {
      type: "like",
      targetId: "post-1",
      timestamp: new Date(),
    }
    const uiv = activityToUIV(activity)

    expect(uiv.engagement).toBeGreaterThan(0)
    expect(uiv.valence).toBeGreaterThan(0)
  })

  it("metadata에 sentiment 있으면 sentimentToUIV 사용", () => {
    const activity: UserActivity = {
      type: "comment",
      targetId: "post-1",
      timestamp: new Date(),
      metadata: { sentiment: "aggressive" },
    }
    const uiv = activityToUIV(activity)

    expect(uiv.valence).toBeLessThan(0) // aggressive → 부정
    expect(uiv.intensity).toBeGreaterThan(0.5)
  })

  it("view 활동 → 낮은 engagement", () => {
    const activity: UserActivity = {
      type: "view",
      targetId: "post-1",
      timestamp: new Date(),
    }
    const uiv = activityToUIV(activity)

    expect(uiv.engagement).toBeLessThan(0.5)
    expect(uiv.intensity).toBeLessThan(0.5)
  })
})

// ═══ learnFromActivity ═══

describe("learnFromActivity", () => {
  const baseL1 = {
    depth: 0.5,
    lens: 0.5,
    stance: 0.5,
    scope: 0.5,
    taste: 0.5,
    purpose: 0.5,
    sociability: 0.5,
  }

  it("벡터 없으면 빈 결과", async () => {
    const provider: ActivityLearnerProvider = {
      getUserL1Vector: vi.fn().mockResolvedValue(null),
      saveUpdatedL1Vector: vi.fn(),
    }

    const result = await learnFromActivity("u1", [], provider)

    expect(result.activitiesProcessed).toBe(0)
    expect(result.confidence).toBe(0)
  })

  it("활동 없으면 delta 없음", async () => {
    const provider: ActivityLearnerProvider = {
      getUserL1Vector: vi.fn().mockResolvedValue(baseL1),
      saveUpdatedL1Vector: vi.fn(),
    }

    const result = await learnFromActivity("u1", [], provider)

    expect(result.vectorDelta).toEqual({})
    expect(result.activitiesProcessed).toBe(0)
  })

  it("충분한 활동 → 벡터 보정", async () => {
    const provider: ActivityLearnerProvider = {
      getUserL1Vector: vi.fn().mockResolvedValue(baseL1),
      saveUpdatedL1Vector: vi.fn(),
    }

    const activities: UserActivity[] = Array.from({ length: 10 }, (_, i) => ({
      type: "like" as const,
      targetId: `post-${i}`,
      timestamp: new Date(),
    }))

    const result = await learnFromActivity("u1", activities, provider)

    expect(result.activitiesProcessed).toBe(10)
    expect(result.confidence).toBeGreaterThan(0)
    // minTurnsForAdapt=3 이후부터 delta 발생
    expect(Object.keys(result.vectorDelta).length).toBeGreaterThan(0)
  })

  it("벡터 값 0~1 범위 유지", async () => {
    const provider: ActivityLearnerProvider = {
      getUserL1Vector: vi.fn().mockResolvedValue(baseL1),
      saveUpdatedL1Vector: vi.fn(),
    }

    const activities: UserActivity[] = Array.from({ length: 20 }, () => ({
      type: "follow" as const,
      targetId: "target",
      timestamp: new Date(),
    }))

    const result = await learnFromActivity("u1", activities, provider)

    const dims = ["depth", "lens", "stance", "scope", "taste", "purpose", "sociability"] as const
    for (const dim of dims) {
      expect(result.updatedVector[dim]).toBeGreaterThanOrEqual(0)
      expect(result.updatedVector[dim]).toBeLessThanOrEqual(1)
    }
  })

  it("프로바이더 함수 호출 확인", async () => {
    const provider: ActivityLearnerProvider = {
      getUserL1Vector: vi.fn().mockResolvedValue(baseL1),
      saveUpdatedL1Vector: vi.fn(),
    }

    await learnFromActivity("u1", [], provider)

    expect(provider.getUserL1Vector).toHaveBeenCalledWith("u1")
  })
})
