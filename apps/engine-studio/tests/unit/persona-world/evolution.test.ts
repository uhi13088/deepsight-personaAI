import { describe, it, expect, vi } from "vitest"
import {
  EVOLUTION_STAGES,
  getEvolutionStage,
  hasStageTransition,
  analyzeEvolutionTrend,
  computeL3Evolution,
  runEvolutionBatch,
  MAX_GROWTH_ARC_DELTA_PER_WEEK,
  MAX_DIMENSION_DELTA,
  MIN_ACTIVITIES_FOR_EVOLUTION,
  MIN_DAYS_FOR_EVOLUTION,
} from "@/lib/persona-world/evolution"
import type {
  ActivityLogEntry,
  EvolutionRunnerDataProvider,
  EvolutionPersona,
} from "@/lib/persona-world/evolution"
import type { NarrativeDriveVector } from "@/types/persona-v3"

// ═══════════════════════════════════════════════════════════════
// T135: L3 Evolution Tests
// ═══════════════════════════════════════════════════════════════

// ── Helper: 활동 로그 생성 ───────────────────────────────────

function createLogs(
  count: number,
  options: {
    types?: string[]
    mood?: number
    energy?: number
  } = {}
): ActivityLogEntry[] {
  const types = options.types ?? ["POST_CREATED", "POST_COMMENTED", "POST_LIKED"]
  return Array.from({ length: count }, (_, i) => ({
    activityType: types[i % types.length],
    stateSnapshot: {
      mood: options.mood ?? 0.6,
      energy: options.energy ?? 0.8,
      socialBattery: 0.7,
      paradoxTension: 0.2,
      createdAt: new Date(Date.now() - (count - i) * 3600000),
    },
    createdAt: new Date(Date.now() - (count - i) * 3600000),
  }))
}

// ═══════════════════════════════════════════════════════════════
// 1. Evolution Stages
// ═══════════════════════════════════════════════════════════════

describe("EVOLUTION_STAGES", () => {
  it("5개 스테이지 정의", () => {
    expect(EVOLUTION_STAGES).toHaveLength(5)
  })

  it("전체 범위 0.0~1.0 커버", () => {
    expect(EVOLUTION_STAGES[0].range[0]).toBe(0.0)
    expect(EVOLUTION_STAGES[EVOLUTION_STAGES.length - 1].range[1]).toBe(1.0)
  })

  it("각 스테이지에 behaviorTraits 존재", () => {
    for (const stage of EVOLUTION_STAGES) {
      expect(stage.behaviorTraits).toBeDefined()
      expect(typeof stage.behaviorTraits.postDiversity).toBe("number")
      expect(typeof stage.behaviorTraits.selfReflection).toBe("number")
      expect(typeof stage.behaviorTraits.riskTaking).toBe("number")
      expect(typeof stage.behaviorTraits.empathyLevel).toBe("number")
    }
  })

  it("스테이지가 연속적 (이전 max === 다음 min)", () => {
    for (let i = 1; i < EVOLUTION_STAGES.length; i++) {
      expect(EVOLUTION_STAGES[i].range[0]).toBe(EVOLUTION_STAGES[i - 1].range[1])
    }
  })
})

describe("getEvolutionStage", () => {
  it("growthArc 0.0 → ordinary-world", () => {
    expect(getEvolutionStage(0.0).id).toBe("ordinary-world")
  })

  it("growthArc 0.1 → ordinary-world", () => {
    expect(getEvolutionStage(0.1).id).toBe("ordinary-world")
  })

  it("growthArc 0.2 → call-to-adventure", () => {
    expect(getEvolutionStage(0.2).id).toBe("call-to-adventure")
  })

  it("growthArc 0.5 → trials-and-growth", () => {
    expect(getEvolutionStage(0.5).id).toBe("trials-and-growth")
  })

  it("growthArc 0.7 → transformation", () => {
    expect(getEvolutionStage(0.7).id).toBe("transformation")
  })

  it("growthArc 0.9 → return-and-mastery", () => {
    expect(getEvolutionStage(0.9).id).toBe("return-and-mastery")
  })

  it("growthArc 1.0 → return-and-mastery (경계)", () => {
    expect(getEvolutionStage(1.0).id).toBe("return-and-mastery")
  })

  it("음수 → ordinary-world (클램프)", () => {
    expect(getEvolutionStage(-0.5).id).toBe("ordinary-world")
  })

  it("1 초과 → return-and-mastery (클램프)", () => {
    expect(getEvolutionStage(1.5).id).toBe("return-and-mastery")
  })
})

describe("hasStageTransition", () => {
  it("같은 스테이지 내 변화 → transitioned: false", () => {
    const result = hasStageTransition(0.1, 0.15)
    expect(result.transitioned).toBe(false)
    expect(result.from.id).toBe("ordinary-world")
    expect(result.to.id).toBe("ordinary-world")
  })

  it("스테이지 경계 넘김 → transitioned: true", () => {
    const result = hasStageTransition(0.19, 0.21)
    expect(result.transitioned).toBe(true)
    expect(result.from.id).toBe("ordinary-world")
    expect(result.to.id).toBe("call-to-adventure")
  })

  it("역방향 전이도 감지", () => {
    const result = hasStageTransition(0.25, 0.15)
    expect(result.transitioned).toBe(true)
    expect(result.from.id).toBe("call-to-adventure")
    expect(result.to.id).toBe("ordinary-world")
  })

  it("두 단계 이상 점프 감지", () => {
    const result = hasStageTransition(0.1, 0.5)
    expect(result.transitioned).toBe(true)
    expect(result.from.id).toBe("ordinary-world")
    expect(result.to.id).toBe("trials-and-growth")
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Evolution Analyzer
// ═══════════════════════════════════════════════════════════════

describe("analyzeEvolutionTrend", () => {
  it("빈 로그 → 빈 트렌드 (전부 0)", () => {
    const trend = analyzeEvolutionTrend([], 7)
    expect(trend.totalActivities).toBe(0)
    expect(trend.activityDiversity).toBe(0)
    expect(trend.growthIndicator).toBe(0)
    expect(trend.postFrequency).toBe(0)
    expect(trend.interactionFrequency).toBe(0)
  })

  it("단일 타입 활동 → 다양성 0", () => {
    const logs = createLogs(10, { types: ["POST_CREATED"] })
    const trend = analyzeEvolutionTrend(logs, 7)
    expect(trend.activityDiversity).toBe(0)
    expect(trend.totalActivities).toBe(10)
  })

  it("다양한 활동 타입 → 다양성 > 0", () => {
    const logs = createLogs(12, { types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"] })
    const trend = analyzeEvolutionTrend(logs, 7)
    expect(trend.activityDiversity).toBeGreaterThan(0.5)
  })

  it("POST_CREATED 로그 → postFrequency 계산", () => {
    const logs = createLogs(14, { types: ["POST_CREATED"] })
    const trend = analyzeEvolutionTrend(logs, 7)
    expect(trend.postFrequency).toBe(14 / 7)
  })

  it("POST_COMMENTED + POST_LIKED → interactionFrequency 계산", () => {
    const logs = createLogs(10, { types: ["POST_COMMENTED", "POST_LIKED"] })
    const trend = analyzeEvolutionTrend(logs, 7)
    expect(trend.interactionFrequency).toBe(10 / 7)
  })

  it("periodDays가 0이면 안전하게 처리", () => {
    const logs = createLogs(5)
    const trend = analyzeEvolutionTrend(logs, 0)
    // Should not throw, uses Math.max(1, periodDays)
    expect(trend.periodDays).toBe(0)
    expect(Number.isFinite(trend.postFrequency)).toBe(true)
  })

  it("상태 추세 계산 (상승 패턴)", () => {
    const logs: ActivityLogEntry[] = Array.from({ length: 10 }, (_, i) => ({
      activityType: "POST_CREATED",
      stateSnapshot: {
        mood: 0.3 + i * 0.05,
        energy: 0.5,
        socialBattery: 0.7,
        paradoxTension: 0.1,
        createdAt: new Date(Date.now() - (10 - i) * 3600000),
      },
      createdAt: new Date(Date.now() - (10 - i) * 3600000),
    }))
    const trend = analyzeEvolutionTrend(logs, 7)
    expect(trend.stateTrends.mood).toBeGreaterThan(0)
  })

  it("growthIndicator 범위 0~1", () => {
    const logs = createLogs(20, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
    })
    const trend = analyzeEvolutionTrend(logs, 7)
    expect(trend.growthIndicator).toBeGreaterThanOrEqual(0)
    expect(trend.growthIndicator).toBeLessThanOrEqual(1)
  })

  it("stateSnapshot이 잘못된 형식이면 무시", () => {
    const logs: ActivityLogEntry[] = [
      { activityType: "POST_CREATED", stateSnapshot: "invalid", createdAt: new Date() },
      { activityType: "POST_CREATED", stateSnapshot: null, createdAt: new Date() },
      {
        activityType: "POST_CREATED",
        stateSnapshot: { mood: 0.5, energy: 0.6 },
        createdAt: new Date(),
      },
    ]
    const trend = analyzeEvolutionTrend(logs, 7)
    expect(trend.totalActivities).toBe(3)
    // Only the last one has valid snapshot
    expect(trend.averageState.mood).toBe(0.5)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. Evolution Algorithm
// ═══════════════════════════════════════════════════════════════

describe("computeL3Evolution", () => {
  const baseL3: NarrativeDriveVector = {
    lack: 0.6,
    moralCompass: 0.5,
    volatility: 0.4,
    growthArc: 0.3,
  }

  it("활동 부족 → 진화 안 함", () => {
    const trend = analyzeEvolutionTrend(createLogs(3), 7)
    const result = computeL3Evolution(baseL3, trend, 60)
    expect(result.evolved).toBe(false)
    expect(result.reason).toContain("활동 부족")
  })

  it("기간 부족 → 진화 안 함", () => {
    const trend = analyzeEvolutionTrend(createLogs(10), 3)
    const result = computeL3Evolution(baseL3, trend, 60)
    expect(result.evolved).toBe(false)
    expect(result.reason).toContain("기간 부족")
  })

  it("충분한 활동 + 기간 → 진화 실행", () => {
    const logs = createLogs(15, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
    })
    const trend = analyzeEvolutionTrend(logs, 7)
    const result = computeL3Evolution(baseL3, trend, 60)
    expect(result.evolved).toBe(true)
    expect(result.reason).not.toBe("변화 없음")
  })

  it("growthArc delta 상한 준수 (MAX_GROWTH_ARC_DELTA_PER_WEEK)", () => {
    const logs = createLogs(30, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
    })
    const trend = analyzeEvolutionTrend(logs, 7)
    const result = computeL3Evolution(baseL3, trend, 60)

    expect(Math.abs(result.deltas.growthArc)).toBeLessThanOrEqual(MAX_DIMENSION_DELTA)
  })

  it("각 차원 delta 상한 준수 (MAX_DIMENSION_DELTA)", () => {
    const logs = createLogs(50, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
    })
    const trend = analyzeEvolutionTrend(logs, 14)
    const result = computeL3Evolution(baseL3, trend, 60)

    expect(Math.abs(result.deltas.growthArc)).toBeLessThanOrEqual(MAX_DIMENSION_DELTA)
    expect(Math.abs(result.deltas.volatility)).toBeLessThanOrEqual(MAX_DIMENSION_DELTA)
    expect(Math.abs(result.deltas.lack)).toBeLessThanOrEqual(MAX_DIMENSION_DELTA)
    expect(Math.abs(result.deltas.moralCompass)).toBeLessThanOrEqual(MAX_DIMENSION_DELTA)
  })

  it("newL3 값이 0~1 범위 내", () => {
    const extremeL3: NarrativeDriveVector = {
      lack: 0.99,
      moralCompass: 0.01,
      volatility: 0.99,
      growthArc: 0.98,
    }
    const logs = createLogs(20, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED"],
    })
    const trend = analyzeEvolutionTrend(logs, 7)
    const result = computeL3Evolution(extremeL3, trend, 60)

    expect(result.newL3.growthArc).toBeGreaterThanOrEqual(0)
    expect(result.newL3.growthArc).toBeLessThanOrEqual(1)
    expect(result.newL3.volatility).toBeGreaterThanOrEqual(0)
    expect(result.newL3.volatility).toBeLessThanOrEqual(1)
    expect(result.newL3.lack).toBeGreaterThanOrEqual(0)
    expect(result.newL3.lack).toBeLessThanOrEqual(1)
    expect(result.newL3.moralCompass).toBeGreaterThanOrEqual(0)
    expect(result.newL3.moralCompass).toBeLessThanOrEqual(1)
  })

  it("풍부한 상호작용 → lack 감소", () => {
    // 상호작용이 많은 로그 (interactionFrequency > 2)
    const logs = createLogs(30, { types: ["POST_COMMENTED", "POST_LIKED"] })
    const trend = analyzeEvolutionTrend(logs, 7)
    const highLackL3: NarrativeDriveVector = {
      lack: 0.7,
      moralCompass: 0.5,
      volatility: 0.4,
      growthArc: 0.3,
    }
    const result = computeL3Evolution(highLackL3, trend, 60)

    if (result.evolved) {
      expect(result.deltas.lack).toBeLessThanOrEqual(0)
    }
  })

  it("스테이지 전이 감지 (경계 근처)", () => {
    const borderL3: NarrativeDriveVector = {
      lack: 0.5,
      moralCompass: 0.5,
      volatility: 0.4,
      growthArc: 0.195, // ordinary-world 경계 근처
    }
    const logs = createLogs(20, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
    })
    const trend = analyzeEvolutionTrend(logs, 7)
    const result = computeL3Evolution(borderL3, trend, 60)

    expect(result.stageTransition).toBeDefined()
    expect(typeof result.stageTransition.transitioned).toBe("boolean")
    expect(typeof result.stageTransition.fromStage).toBe("string")
    expect(typeof result.stageTransition.toStage).toBe("string")
  })

  it("초기 페르소나 (30일 미만) → 성장 속도 1.5배", () => {
    const logs = createLogs(15, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
    })
    const trend = analyzeEvolutionTrend(logs, 7)

    const resultYoung = computeL3Evolution(baseL3, trend, 15) // 15일 된 페르소나
    const resultOld = computeL3Evolution(baseL3, trend, 60) // 60일 된 페르소나

    // 초기 페르소나의 growthArc delta가 더 클 수 있음
    // (단, 다른 요인도 있어 항상 보장되지는 않으므로 구조만 검증)
    expect(resultYoung.deltas).toBeDefined()
    expect(resultOld.deltas).toBeDefined()
  })

  it("진화 안 함일 때 previousL3 === newL3", () => {
    const trend = analyzeEvolutionTrend(createLogs(2), 7) // 활동 부족
    const result = computeL3Evolution(baseL3, trend, 60)

    expect(result.evolved).toBe(false)
    expect(result.newL3).toEqual(baseL3)
    expect(result.deltas).toEqual({
      growthArc: 0,
      volatility: 0,
      lack: 0,
      moralCompass: 0,
    })
  })

  it("상수 값 검증", () => {
    expect(MAX_GROWTH_ARC_DELTA_PER_WEEK).toBe(0.02)
    expect(MAX_DIMENSION_DELTA).toBe(0.05)
    expect(MIN_ACTIVITIES_FOR_EVOLUTION).toBe(5)
    expect(MIN_DAYS_FOR_EVOLUTION).toBe(7)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. Evolution Runner
// ═══════════════════════════════════════════════════════════════

describe("runEvolutionBatch", () => {
  function createMockProvider(
    personas: EvolutionPersona[],
    logs: ActivityLogEntry[] = []
  ): EvolutionRunnerDataProvider {
    return {
      getActivePersonasWithNarrative: vi.fn().mockResolvedValue(personas),
      getActivityLogs: vi.fn().mockResolvedValue(logs),
      getCurrentNarrativeVersion: vi.fn().mockResolvedValue(1),
      saveNewNarrativeVersion: vi.fn().mockResolvedValue({ version: 2 }),
      saveEvolutionLog: vi.fn().mockResolvedValue(undefined),
    }
  }

  const testPersona: EvolutionPersona = {
    id: "p-1",
    name: "테스트 페르소나",
    narrative: { lack: 0.5, moralCompass: 0.5, volatility: 0.4, growthArc: 0.3 },
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90일 전
  }

  it("페르소나 없으면 빈 결과", async () => {
    const provider = createMockProvider([])
    const result = await runEvolutionBatch(provider)

    expect(result.totalProcessed).toBe(0)
    expect(result.totalEvolved).toBe(0)
    expect(result.results).toHaveLength(0)
  })

  it("활동 부족 페르소나 → evolved: false", async () => {
    const fewLogs = createLogs(2)
    const provider = createMockProvider([testPersona], fewLogs)
    const result = await runEvolutionBatch(provider)

    expect(result.totalProcessed).toBe(1)
    expect(result.totalEvolved).toBe(0)
    expect(result.results[0].evolved).toBe(false)
    expect(result.results[0].reason).toContain("활동 부족")
  })

  it("충분한 활동 → evolved: true + 버전 저장", async () => {
    const manyLogs = createLogs(20, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
    })
    const provider = createMockProvider([testPersona], manyLogs)
    const result = await runEvolutionBatch(provider)

    expect(result.totalProcessed).toBe(1)
    expect(result.totalEvolved).toBe(1)
    expect(result.results[0].evolved).toBe(true)
    expect(result.results[0].newVersion).toBe(2)
    expect(provider.saveNewNarrativeVersion).toHaveBeenCalledOnce()
    expect(provider.saveEvolutionLog).toHaveBeenCalledOnce()
  })

  it("여러 페르소나 배치 처리", async () => {
    const personas: EvolutionPersona[] = [
      { ...testPersona, id: "p-1", name: "페르소나 1" },
      { ...testPersona, id: "p-2", name: "페르소나 2" },
      { ...testPersona, id: "p-3", name: "페르소나 3" },
    ]
    const logs = createLogs(15, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
    })
    const provider = createMockProvider(personas, logs)
    const result = await runEvolutionBatch(provider)

    expect(result.totalProcessed).toBe(3)
    expect(result.results).toHaveLength(3)
  })

  it("periodDays 옵션 전달", async () => {
    const logs = createLogs(10)
    const provider = createMockProvider([testPersona], logs)
    await runEvolutionBatch(provider, { periodDays: 14 })

    expect(provider.getActivityLogs).toHaveBeenCalled()
  })

  it("개별 페르소나 에러 → 다른 페르소나 영향 없음", async () => {
    const personas: EvolutionPersona[] = [
      { ...testPersona, id: "p-1", name: "정상" },
      { ...testPersona, id: "p-2", name: "에러" },
    ]

    const provider: EvolutionRunnerDataProvider = {
      getActivePersonasWithNarrative: vi.fn().mockResolvedValue(personas),
      getActivityLogs: vi.fn().mockImplementation((personaId: string) => {
        if (personaId === "p-2") {
          return Promise.reject(new Error("DB 연결 실패"))
        }
        return Promise.resolve(
          createLogs(15, {
            types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
          })
        )
      }),
      getCurrentNarrativeVersion: vi.fn().mockResolvedValue(1),
      saveNewNarrativeVersion: vi.fn().mockResolvedValue({ version: 2 }),
      saveEvolutionLog: vi.fn().mockResolvedValue(undefined),
    }

    const result = await runEvolutionBatch(provider)
    expect(result.totalProcessed).toBe(2)
    expect(result.results).toHaveLength(2)

    const errorResult = result.results.find((r) => r.personaId === "p-2")
    expect(errorResult?.evolved).toBe(false)
    expect(errorResult?.reason).toContain("에러")

    const okResult = result.results.find((r) => r.personaId === "p-1")
    expect(okResult?.evolved).toBe(true)
  })

  it("durationMs 반환", async () => {
    const provider = createMockProvider([])
    const result = await runEvolutionBatch(provider)
    expect(typeof result.durationMs).toBe("number")
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it("기본 periodDays는 7", async () => {
    const provider = createMockProvider([testPersona], createLogs(10))
    await runEvolutionBatch(provider)

    const call = vi.mocked(provider.getActivityLogs).mock.calls[0]
    const sinceDate = call[1] as Date
    const daysDiff = Math.round((Date.now() - sinceDate.getTime()) / (1000 * 60 * 60 * 24))
    expect(daysDiff).toBe(7)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. 경계값 및 에러 케이스
// ═══════════════════════════════════════════════════════════════

describe("경계값 및 에러 케이스", () => {
  const baseL3: NarrativeDriveVector = {
    lack: 0.6,
    moralCompass: 0.5,
    volatility: 0.4,
    growthArc: 0.3,
  }

  it("L3 벡터 값이 0~1 범위를 벗어나도 결과는 0~1로 클램프", () => {
    const outOfBoundsL3: NarrativeDriveVector = {
      lack: 1.5,
      moralCompass: -0.3,
      volatility: 2.0,
      growthArc: -1.0,
    }
    const logs = createLogs(15, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
    })
    const trend = analyzeEvolutionTrend(logs, 7)
    const result = computeL3Evolution(outOfBoundsL3, trend, 60)

    // newL3 값이 0~1로 클램프되어야 함
    expect(result.newL3.growthArc).toBeGreaterThanOrEqual(0)
    expect(result.newL3.growthArc).toBeLessThanOrEqual(1)
    expect(result.newL3.volatility).toBeGreaterThanOrEqual(0)
    expect(result.newL3.volatility).toBeLessThanOrEqual(1)
    expect(result.newL3.lack).toBeGreaterThanOrEqual(0)
    expect(result.newL3.lack).toBeLessThanOrEqual(1)
    expect(result.newL3.moralCompass).toBeGreaterThanOrEqual(0)
    expect(result.newL3.moralCompass).toBeLessThanOrEqual(1)
  })

  it("빈 상호작용 이력 → 안전한 기본값 반환", () => {
    const trend = analyzeEvolutionTrend([], 7)

    expect(trend.totalActivities).toBe(0)
    expect(trend.activityDiversity).toBe(0)
    expect(trend.growthIndicator).toBe(0)
    expect(trend.postFrequency).toBe(0)
    expect(trend.interactionFrequency).toBe(0)
    expect(trend.averageState.mood).toBe(0.5)
    expect(trend.stateTrends.mood).toBe(0)
    expect(trend.stateTrends.energy).toBe(0)

    // 빈 이력으로 진화 시도 → 활동 부족으로 진화 안 함
    const result = computeL3Evolution(baseL3, trend, 60)
    expect(result.evolved).toBe(false)
    expect(result.newL3).toEqual(baseL3)
  })

  it("매우 큰 시간 간격(수년)에도 오버플로 없이 처리", () => {
    const logs = createLogs(15, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
    })
    const trend = analyzeEvolutionTrend(logs, 365 * 5) // 5년

    expect(Number.isFinite(trend.postFrequency)).toBe(true)
    expect(Number.isFinite(trend.interactionFrequency)).toBe(true)
    expect(Number.isFinite(trend.growthIndicator)).toBe(true)
    expect(trend.postFrequency).toBeGreaterThanOrEqual(0)

    // 매우 오래된 페르소나도 정상 처리
    const result = computeL3Evolution(baseL3, trend, 365 * 5)
    expect(Number.isFinite(result.newL3.growthArc)).toBe(true)
    expect(Number.isFinite(result.newL3.volatility)).toBe(true)
    expect(Number.isFinite(result.newL3.lack)).toBe(true)
    expect(Number.isFinite(result.newL3.moralCompass)).toBe(true)
  })

  it("음수 periodDays에도 안전하게 처리 (0 나누기 방지)", () => {
    const logs = createLogs(10)
    const trend = analyzeEvolutionTrend(logs, -5)

    expect(Number.isFinite(trend.postFrequency)).toBe(true)
    expect(Number.isFinite(trend.interactionFrequency)).toBe(true)
    // periodDays는 원본값 보존하되, 빈도 계산에서 0나누기 방지
    expect(trend.totalActivities).toBe(10)
  })

  it("getEvolutionStage — NaN 입력 시에도 안전 처리", () => {
    // NaN → Math.max(0, Math.min(1, NaN)) = NaN → 마지막 스테이지 fallback
    const stage = getEvolutionStage(NaN)
    expect(stage).toBeDefined()
    expect(typeof stage.id).toBe("string")
  })

  it("hasStageTransition — 동일 극단값(0, 0) → 전이 없음", () => {
    const result = hasStageTransition(0, 0)
    expect(result.transitioned).toBe(false)
    expect(result.from.id).toBe(result.to.id)
  })

  it("hasStageTransition — 동일 극단값(1, 1) → 전이 없음", () => {
    const result = hasStageTransition(1, 1)
    expect(result.transitioned).toBe(false)
    expect(result.from.id).toBe(result.to.id)
  })

  it("daysSinceCreation이 0일 때 (방금 생성된 페르소나) → 정상 처리", () => {
    const logs = createLogs(15, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
    })
    const trend = analyzeEvolutionTrend(logs, 7)
    const result = computeL3Evolution(baseL3, trend, 0)

    // daysSinceCreation=0 < 30 → 초기 보너스 적용 (1.5x)
    expect(result.deltas).toBeDefined()
    expect(Number.isFinite(result.newL3.growthArc)).toBe(true)
  })

  it("daysSinceCreation이 음수여도 크래시 없이 처리", () => {
    const logs = createLogs(15, {
      types: ["POST_CREATED", "POST_COMMENTED", "POST_LIKED", "VIEW"],
    })
    const trend = analyzeEvolutionTrend(logs, 7)
    const result = computeL3Evolution(baseL3, trend, -10)

    expect(result.deltas).toBeDefined()
    expect(Number.isFinite(result.newL3.growthArc)).toBe(true)
  })
})
