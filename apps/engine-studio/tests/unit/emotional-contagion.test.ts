// ═══════════════════════════════════════════════════════════════
// Emotional Contagion — 단위 테스트
// T156: 감정 전염 시스템
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
  DEFAULT_CONTAGION_CONFIG,
  RELATIONSHIP_WEIGHTS,
  computeRelationshipWeight,
  computeResistance,
  canReceiveContagion,
  computeSingleEffect,
  runContagionRound,
  applyContagionResult,
  applyContagionRound,
  hasConverged,
  computeContagionStats,
  checkMoodSafety,
  type ContagionPersonaState,
  type ContagionEdge,
  type ContagionSensitivity,
  type ContagionConfig,
  type NodeTopology,
  type ContagionEffect,
  type PersonaContagionResult,
  type ContagionRoundResult,
} from "@/lib/emotional-contagion"

// ── 헬퍼 ──────────────────────────────────────────────────────

function makePersona(overrides: Partial<ContagionPersonaState> = {}): ContagionPersonaState {
  return {
    personaId: "p-1",
    mood: 0.5,
    energy: 0.6,
    socialBattery: 0.5,
    paradoxTension: 0.3,
    ...overrides,
  }
}

function makeEdge(overrides: Partial<ContagionEdge> = {}): ContagionEdge {
  return {
    sourceId: "p-1",
    targetId: "p-2",
    warmth: 0.7,
    tension: 0.2,
    frequency: 0.5,
    ...overrides,
  }
}

function makeSensitivity(overrides: Partial<ContagionSensitivity> = {}): ContagionSensitivity {
  return {
    moodSensitivity: 1.0,
    socialOpenness: 0.7,
    agreeableness: 0.6,
    ...overrides,
  }
}

function makeTopology(overrides: Partial<NodeTopology> = {}): NodeTopology {
  return {
    personaId: "p-1",
    totalDegree: 5,
    clusteringCoefficient: 0.4,
    isHub: false,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("DEFAULT_CONTAGION_CONFIG 기본값 확인", () => {
    expect(DEFAULT_CONTAGION_CONFIG.baseIntensity).toBe(0.15)
    expect(DEFAULT_CONTAGION_CONFIG.hubAmplifier).toBe(1.3)
    expect(DEFAULT_CONTAGION_CONFIG.clusterAmplifier).toBe(1.2)
    expect(DEFAULT_CONTAGION_CONFIG.maxDelta).toBe(0.15)
    expect(DEFAULT_CONTAGION_CONFIG.isolateDamping).toBe(0.3)
    expect(DEFAULT_CONTAGION_CONFIG.tensionResistanceThreshold).toBe(0.7)
    expect(DEFAULT_CONTAGION_CONFIG.minEnergyForReception).toBe(0.2)
    expect(DEFAULT_CONTAGION_CONFIG.minSocialBatteryForReception).toBe(0.1)
  })

  it("RELATIONSHIP_WEIGHTS 합산 = 1.0", () => {
    const sum =
      RELATIONSHIP_WEIGHTS.warmth +
      RELATIONSHIP_WEIGHTS.frequency +
      RELATIONSHIP_WEIGHTS.inverseTension
    expect(sum).toBe(1.0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. computeRelationshipWeight
// ═══════════════════════════════════════════════════════════════

describe("computeRelationshipWeight", () => {
  it("완전 친밀 + 높은 빈도 + 낮은 갈등 → 높은 가중치", () => {
    const edge = makeEdge({ warmth: 1.0, frequency: 1.0, tension: 0.0 })
    const weight = computeRelationshipWeight(edge)
    expect(weight).toBe(1.0)
  })

  it("낮은 친밀 + 낮은 빈도 + 높은 갈등 → 낮은 가중치", () => {
    const edge = makeEdge({ warmth: 0.0, frequency: 0.0, tension: 1.0 })
    const weight = computeRelationshipWeight(edge)
    expect(weight).toBe(0) // all zeros
  })

  it("중간값 관계 → 중간 가중치", () => {
    const edge = makeEdge({ warmth: 0.5, frequency: 0.5, tension: 0.5 })
    const weight = computeRelationshipWeight(edge)
    // 0.5*0.5 + 0.3*0.5 + 0.2*0.5 = 0.25 + 0.15 + 0.1 = 0.5
    expect(weight).toBe(0.5)
  })

  it("0~1 범위 보장", () => {
    const edge1 = makeEdge({ warmth: 1.0, frequency: 1.0, tension: 0.0 })
    expect(computeRelationshipWeight(edge1)).toBeLessThanOrEqual(1)
    expect(computeRelationshipWeight(edge1)).toBeGreaterThanOrEqual(0)

    const edge2 = makeEdge({ warmth: 0.0, frequency: 0.0, tension: 1.0 })
    expect(computeRelationshipWeight(edge2)).toBeGreaterThanOrEqual(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. computeResistance
// ═══════════════════════════════════════════════════════════════

describe("computeResistance", () => {
  it("낮은 긴장 + 높은 동조 + 높은 개방성 → 낮은 저항", () => {
    const receiver = makePersona({ paradoxTension: 0.1 })
    const sensitivity = makeSensitivity({ agreeableness: 0.9, socialOpenness: 0.9 })
    const resistance = computeResistance(receiver, sensitivity, DEFAULT_CONTAGION_CONFIG)
    expect(resistance).toBeLessThan(0.2)
  })

  it("높은 긴장 → 높은 저항", () => {
    const receiver = makePersona({ paradoxTension: 0.9 })
    const sensitivity = makeSensitivity({ agreeableness: 0.5, socialOpenness: 0.5 })
    const resistance = computeResistance(receiver, sensitivity, DEFAULT_CONTAGION_CONFIG)
    expect(resistance).toBeGreaterThan(0.4)
  })

  it("낮은 동조성 → 저항 증가", () => {
    const receiver = makePersona({ paradoxTension: 0.3 })
    const lowAgree = makeSensitivity({ agreeableness: 0.1 })
    const highAgree = makeSensitivity({ agreeableness: 0.9 })
    const rLow = computeResistance(receiver, lowAgree, DEFAULT_CONTAGION_CONFIG)
    const rHigh = computeResistance(receiver, highAgree, DEFAULT_CONTAGION_CONFIG)
    expect(rLow).toBeGreaterThan(rHigh)
  })

  it("0~1 범위 보장", () => {
    const receiver = makePersona({ paradoxTension: 1.0 })
    const sensitivity = makeSensitivity({ agreeableness: 0.0, socialOpenness: 0.0 })
    const resistance = computeResistance(receiver, sensitivity, DEFAULT_CONTAGION_CONFIG)
    expect(resistance).toBeGreaterThanOrEqual(0)
    expect(resistance).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. canReceiveContagion
// ═══════════════════════════════════════════════════════════════

describe("canReceiveContagion", () => {
  it("충분한 에너지 + 소셜배터리 → 수신 가능", () => {
    const persona = makePersona({ energy: 0.5, socialBattery: 0.5 })
    expect(canReceiveContagion(persona, DEFAULT_CONTAGION_CONFIG)).toBe(true)
  })

  it("에너지 부족 → 수신 불가", () => {
    const persona = makePersona({ energy: 0.1, socialBattery: 0.5 })
    expect(canReceiveContagion(persona, DEFAULT_CONTAGION_CONFIG)).toBe(false)
  })

  it("소셜배터리 부족 → 수신 불가", () => {
    const persona = makePersona({ energy: 0.5, socialBattery: 0.05 })
    expect(canReceiveContagion(persona, DEFAULT_CONTAGION_CONFIG)).toBe(false)
  })

  it("경계값: 정확히 최소치 → 수신 가능", () => {
    const persona = makePersona({ energy: 0.2, socialBattery: 0.1 })
    expect(canReceiveContagion(persona, DEFAULT_CONTAGION_CONFIG)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. computeSingleEffect
// ═══════════════════════════════════════════════════════════════

describe("computeSingleEffect", () => {
  it("높은 mood 소스 → 낮은 mood 타겟: 양의 전파", () => {
    const effect = computeSingleEffect({
      source: makePersona({ personaId: "s-1", mood: 0.9 }),
      target: makePersona({ personaId: "t-1", mood: 0.3 }),
      edge: makeEdge({
        sourceId: "s-1",
        targetId: "t-1",
        warmth: 0.8,
        tension: 0.1,
        frequency: 0.6,
      }),
      targetSensitivity: makeSensitivity({ moodSensitivity: 1.0 }),
      sourceTopology: makeTopology({ personaId: "s-1" }),
      targetTopology: makeTopology({ personaId: "t-1" }),
      config: DEFAULT_CONTAGION_CONFIG,
    })
    expect(effect.moodDelta).toBeGreaterThan(0)
    expect(effect.sourceId).toBe("s-1")
    expect(effect.targetId).toBe("t-1")
  })

  it("낮은 mood 소스 → 높은 mood 타겟: 음의 전파", () => {
    const effect = computeSingleEffect({
      source: makePersona({ personaId: "s-1", mood: 0.1 }),
      target: makePersona({ personaId: "t-1", mood: 0.8 }),
      edge: makeEdge({
        sourceId: "s-1",
        targetId: "t-1",
        warmth: 0.8,
        tension: 0.1,
        frequency: 0.6,
      }),
      targetSensitivity: makeSensitivity({ moodSensitivity: 1.0 }),
      sourceTopology: makeTopology({ personaId: "s-1" }),
      targetTopology: makeTopology({ personaId: "t-1" }),
      config: DEFAULT_CONTAGION_CONFIG,
    })
    expect(effect.moodDelta).toBeLessThan(0)
  })

  it("동일 mood → delta 0", () => {
    const effect = computeSingleEffect({
      source: makePersona({ personaId: "s-1", mood: 0.5 }),
      target: makePersona({ personaId: "t-1", mood: 0.5 }),
      edge: makeEdge({ sourceId: "s-1", targetId: "t-1" }),
      targetSensitivity: makeSensitivity(),
      sourceTopology: makeTopology({ personaId: "s-1" }),
      targetTopology: makeTopology({ personaId: "t-1" }),
      config: DEFAULT_CONTAGION_CONFIG,
    })
    expect(effect.moodDelta).toBe(0)
  })

  it("허브 소스 → 증폭 효과", () => {
    const baseEffect = computeSingleEffect({
      source: makePersona({ personaId: "s-1", mood: 0.9 }),
      target: makePersona({ personaId: "t-1", mood: 0.3 }),
      edge: makeEdge({ sourceId: "s-1", targetId: "t-1" }),
      targetSensitivity: makeSensitivity(),
      sourceTopology: makeTopology({ personaId: "s-1", isHub: false }),
      targetTopology: makeTopology({ personaId: "t-1" }),
      config: DEFAULT_CONTAGION_CONFIG,
    })

    const hubEffect = computeSingleEffect({
      source: makePersona({ personaId: "s-1", mood: 0.9 }),
      target: makePersona({ personaId: "t-1", mood: 0.3 }),
      edge: makeEdge({ sourceId: "s-1", targetId: "t-1" }),
      targetSensitivity: makeSensitivity(),
      sourceTopology: makeTopology({ personaId: "s-1", isHub: true }),
      targetTopology: makeTopology({ personaId: "t-1" }),
      config: DEFAULT_CONTAGION_CONFIG,
    })

    expect(Math.abs(hubEffect.moodDelta)).toBeGreaterThan(Math.abs(baseEffect.moodDelta))
  })

  it("고립 타겟 → 감쇠 효과", () => {
    const normalEffect = computeSingleEffect({
      source: makePersona({ personaId: "s-1", mood: 0.9 }),
      target: makePersona({ personaId: "t-1", mood: 0.3 }),
      edge: makeEdge({ sourceId: "s-1", targetId: "t-1" }),
      targetSensitivity: makeSensitivity(),
      sourceTopology: makeTopology({ personaId: "s-1" }),
      targetTopology: makeTopology({ personaId: "t-1", totalDegree: 5 }),
      config: DEFAULT_CONTAGION_CONFIG,
    })

    const isolateEffect = computeSingleEffect({
      source: makePersona({ personaId: "s-1", mood: 0.9 }),
      target: makePersona({ personaId: "t-1", mood: 0.3 }),
      edge: makeEdge({ sourceId: "s-1", targetId: "t-1" }),
      targetSensitivity: makeSensitivity(),
      sourceTopology: makeTopology({ personaId: "s-1" }),
      targetTopology: makeTopology({ personaId: "t-1", totalDegree: 1 }),
      config: DEFAULT_CONTAGION_CONFIG,
    })

    expect(Math.abs(isolateEffect.moodDelta)).toBeLessThan(Math.abs(normalEffect.moodDelta))
  })

  it("높은 클러스터링 → 증폭 효과", () => {
    const lowCluster = computeSingleEffect({
      source: makePersona({ personaId: "s-1", mood: 0.9 }),
      target: makePersona({ personaId: "t-1", mood: 0.3 }),
      edge: makeEdge({ sourceId: "s-1", targetId: "t-1" }),
      targetSensitivity: makeSensitivity(),
      sourceTopology: makeTopology({ personaId: "s-1" }),
      targetTopology: makeTopology({
        personaId: "t-1",
        clusteringCoefficient: 0.3,
        totalDegree: 5,
      }),
      config: DEFAULT_CONTAGION_CONFIG,
    })

    const highCluster = computeSingleEffect({
      source: makePersona({ personaId: "s-1", mood: 0.9 }),
      target: makePersona({ personaId: "t-1", mood: 0.3 }),
      edge: makeEdge({ sourceId: "s-1", targetId: "t-1" }),
      targetSensitivity: makeSensitivity(),
      sourceTopology: makeTopology({ personaId: "s-1" }),
      targetTopology: makeTopology({
        personaId: "t-1",
        clusteringCoefficient: 0.9,
        totalDegree: 5,
      }),
      config: DEFAULT_CONTAGION_CONFIG,
    })

    expect(Math.abs(highCluster.moodDelta)).toBeGreaterThan(Math.abs(lowCluster.moodDelta))
  })

  it("maxDelta 제한 준수", () => {
    const effect = computeSingleEffect({
      source: makePersona({ personaId: "s-1", mood: 1.0 }),
      target: makePersona({ personaId: "t-1", mood: 0.0 }),
      edge: makeEdge({
        sourceId: "s-1",
        targetId: "t-1",
        warmth: 1.0,
        tension: 0.0,
        frequency: 1.0,
      }),
      targetSensitivity: makeSensitivity({ moodSensitivity: 1.5 }),
      sourceTopology: makeTopology({ personaId: "s-1", isHub: true }),
      targetTopology: makeTopology({
        personaId: "t-1",
        clusteringCoefficient: 1.0,
        totalDegree: 10,
      }),
      config: DEFAULT_CONTAGION_CONFIG,
    })
    expect(effect.moodDelta).toBeLessThanOrEqual(DEFAULT_CONTAGION_CONFIG.maxDelta)
    expect(effect.moodDelta).toBeGreaterThanOrEqual(-DEFAULT_CONTAGION_CONFIG.maxDelta)
  })

  it("높은 moodSensitivity → 더 강한 전파", () => {
    const params = {
      source: makePersona({ personaId: "s-1", mood: 0.8 }),
      target: makePersona({ personaId: "t-1", mood: 0.4 }),
      edge: makeEdge({ sourceId: "s-1", targetId: "t-1" }),
      sourceTopology: makeTopology({ personaId: "s-1" }),
      targetTopology: makeTopology({ personaId: "t-1" }),
      config: DEFAULT_CONTAGION_CONFIG,
    }

    const lowSens = computeSingleEffect({
      ...params,
      targetSensitivity: makeSensitivity({ moodSensitivity: 0.5 }),
    })

    const highSens = computeSingleEffect({
      ...params,
      targetSensitivity: makeSensitivity({ moodSensitivity: 1.5 }),
    })

    expect(Math.abs(highSens.moodDelta)).toBeGreaterThan(Math.abs(lowSens.moodDelta))
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. runContagionRound
// ═══════════════════════════════════════════════════════════════

describe("runContagionRound", () => {
  function makeSimpleScenario() {
    const personas: ContagionPersonaState[] = [
      makePersona({ personaId: "p-1", mood: 0.8 }),
      makePersona({ personaId: "p-2", mood: 0.3 }),
      makePersona({ personaId: "p-3", mood: 0.5 }),
    ]

    const edges: ContagionEdge[] = [
      makeEdge({ sourceId: "p-1", targetId: "p-2", warmth: 0.7, tension: 0.1, frequency: 0.5 }),
      makeEdge({ sourceId: "p-2", targetId: "p-1", warmth: 0.7, tension: 0.1, frequency: 0.5 }),
      makeEdge({ sourceId: "p-1", targetId: "p-3", warmth: 0.5, tension: 0.3, frequency: 0.3 }),
    ]

    const sensitivities = new Map<string, ContagionSensitivity>()
    sensitivities.set("p-1", makeSensitivity())
    sensitivities.set("p-2", makeSensitivity())
    sensitivities.set("p-3", makeSensitivity())

    const topologies = new Map<string, NodeTopology>()
    topologies.set("p-1", makeTopology({ personaId: "p-1", totalDegree: 3 }))
    topologies.set("p-2", makeTopology({ personaId: "p-2", totalDegree: 2 }))
    topologies.set("p-3", makeTopology({ personaId: "p-3", totalDegree: 1 }))

    return { personas, edges, sensitivities, topologies }
  }

  it("기본 시나리오: 전파 실행", () => {
    const result = runContagionRound(makeSimpleScenario())
    expect(result.timestamp).toBeGreaterThan(0)
    expect(result.effects.length).toBeGreaterThan(0)
    expect(result.personaResults.length).toBeGreaterThan(0)
    expect(result.averageMoodBefore).toBeGreaterThan(0)
    expect(result.averageMoodAfter).toBeGreaterThan(0)
  })

  it("높은 mood → 낮은 mood 전파: p-2의 mood 상승", () => {
    const result = runContagionRound(makeSimpleScenario())
    const p2Result = result.personaResults.find((r) => r.personaId === "p-2")
    expect(p2Result).toBeDefined()
    if (p2Result) {
      expect(p2Result.totalMoodDelta).toBeGreaterThan(0) // p-1(0.8) → p-2(0.3) 양의 전파
      expect(p2Result.projectedMood).toBeGreaterThan(0.3)
    }
  })

  it("역방향 전파: p-1의 mood 하락 (p-2가 낮으므로)", () => {
    const result = runContagionRound(makeSimpleScenario())
    const p1Result = result.personaResults.find((r) => r.personaId === "p-1")
    expect(p1Result).toBeDefined()
    if (p1Result) {
      expect(p1Result.totalMoodDelta).toBeLessThan(0) // p-2(0.3) → p-1(0.8) 음의 전파
      expect(p1Result.projectedMood).toBeLessThan(0.8)
    }
  })

  it("에너지 부족 → 전파 미수신", () => {
    const scenario = makeSimpleScenario()
    scenario.personas[1] = makePersona({ personaId: "p-2", mood: 0.3, energy: 0.1 })
    const result = runContagionRound(scenario)
    const p2Result = result.personaResults.find((r) => r.personaId === "p-2")
    expect(p2Result).toBeUndefined() // 에너지 부족으로 제외
  })

  it("빈 엣지 → 전파 없음", () => {
    const scenario = makeSimpleScenario()
    scenario.edges = []
    const result = runContagionRound(scenario)
    expect(result.effects.length).toBe(0)
    expect(result.personaResults.length).toBe(0)
    expect(result.affectedCount).toBe(0)
  })

  it("빈 페르소나 → 빈 결과", () => {
    const result = runContagionRound({
      personas: [],
      edges: [],
      sensitivities: new Map(),
      topologies: new Map(),
    })
    expect(result.effects.length).toBe(0)
    expect(result.personaResults.length).toBe(0)
    expect(result.averageMoodBefore).toBe(0)
    expect(result.averageMoodAfter).toBe(0)
  })

  it("커스텀 config 적용", () => {
    const scenario = makeSimpleScenario()
    const customConfig: ContagionConfig = {
      ...DEFAULT_CONTAGION_CONFIG,
      baseIntensity: 0.01, // 매우 약한 전파
    }
    const result = runContagionRound({ ...scenario, config: customConfig })
    // 전파가 매우 약함
    for (const r of result.personaResults) {
      expect(Math.abs(r.totalMoodDelta)).toBeLessThan(0.01)
    }
  })

  it("분산 통계 계산", () => {
    const result = runContagionRound(makeSimpleScenario())
    expect(result.moodVarianceBefore).toBeGreaterThanOrEqual(0)
    expect(result.moodVarianceAfter).toBeGreaterThanOrEqual(0)
  })

  it("dominantSource 설정됨", () => {
    const result = runContagionRound(makeSimpleScenario())
    for (const r of result.personaResults) {
      expect(r.dominantSource).toBeTruthy()
      expect(r.sourceCount).toBeGreaterThan(0)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. applyContagionResult
// ═══════════════════════════════════════════════════════════════

describe("applyContagionResult", () => {
  it("양의 delta 적용", () => {
    const state = makePersona({ personaId: "p-1", mood: 0.5 })
    const result: PersonaContagionResult = {
      personaId: "p-1",
      totalMoodDelta: 0.1,
      sourceCount: 1,
      dominantSource: "p-2",
      projectedMood: 0.6,
    }
    const newState = applyContagionResult(state, result)
    expect(newState.mood).toBe(0.6)
    expect(newState.personaId).toBe("p-1")
  })

  it("음의 delta 적용", () => {
    const state = makePersona({ personaId: "p-1", mood: 0.5 })
    const result: PersonaContagionResult = {
      personaId: "p-1",
      totalMoodDelta: -0.1,
      sourceCount: 1,
      dominantSource: "p-2",
      projectedMood: 0.4,
    }
    const newState = applyContagionResult(state, result)
    expect(newState.mood).toBe(0.4)
  })

  it("mood 0 미만 방지", () => {
    const state = makePersona({ personaId: "p-1", mood: 0.05 })
    const result: PersonaContagionResult = {
      personaId: "p-1",
      totalMoodDelta: -0.15,
      sourceCount: 1,
      dominantSource: "p-2",
      projectedMood: 0,
    }
    const newState = applyContagionResult(state, result)
    expect(newState.mood).toBeGreaterThanOrEqual(0)
  })

  it("mood 1 초과 방지", () => {
    const state = makePersona({ personaId: "p-1", mood: 0.95 })
    const result: PersonaContagionResult = {
      personaId: "p-1",
      totalMoodDelta: 0.15,
      sourceCount: 1,
      dominantSource: "p-2",
      projectedMood: 1,
    }
    const newState = applyContagionResult(state, result)
    expect(newState.mood).toBeLessThanOrEqual(1)
  })

  it("원본 상태 불변", () => {
    const state = makePersona({ personaId: "p-1", mood: 0.5 })
    const snapshot = JSON.stringify(state)
    const result: PersonaContagionResult = {
      personaId: "p-1",
      totalMoodDelta: 0.1,
      sourceCount: 1,
      dominantSource: "p-2",
      projectedMood: 0.6,
    }
    applyContagionResult(state, result)
    expect(JSON.stringify(state)).toBe(snapshot)
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. applyContagionRound
// ═══════════════════════════════════════════════════════════════

describe("applyContagionRound", () => {
  it("라운드 결과 일괄 적용", () => {
    const personas = [
      makePersona({ personaId: "p-1", mood: 0.5 }),
      makePersona({ personaId: "p-2", mood: 0.3 }),
    ]
    const roundResult: ContagionRoundResult = {
      timestamp: Date.now(),
      personaResults: [
        {
          personaId: "p-1",
          totalMoodDelta: -0.05,
          sourceCount: 1,
          dominantSource: "p-2",
          projectedMood: 0.45,
        },
      ],
      effects: [],
      averageMoodBefore: 0.4,
      averageMoodAfter: 0.375,
      moodVarianceBefore: 0.01,
      moodVarianceAfter: 0.008,
      affectedCount: 1,
    }
    const updated = applyContagionRound(personas, roundResult)
    expect(updated.length).toBe(2)
    expect(updated[0].mood).toBe(0.45) // p-1 적용됨
    expect(updated[1].mood).toBe(0.3) // p-2 변경 없음
  })

  it("원본 배열 불변", () => {
    const personas = [makePersona({ personaId: "p-1", mood: 0.5 })]
    const snapshot = JSON.stringify(personas)
    const roundResult: ContagionRoundResult = {
      timestamp: Date.now(),
      personaResults: [
        {
          personaId: "p-1",
          totalMoodDelta: 0.1,
          sourceCount: 1,
          dominantSource: "p-2",
          projectedMood: 0.6,
        },
      ],
      effects: [],
      averageMoodBefore: 0.5,
      averageMoodAfter: 0.6,
      moodVarianceBefore: 0,
      moodVarianceAfter: 0,
      affectedCount: 1,
    }
    applyContagionRound(personas, roundResult)
    expect(JSON.stringify(personas)).toBe(snapshot)
  })
})

// ═══════════════════════════════════════════════════════════════
// 9. hasConverged
// ═══════════════════════════════════════════════════════════════

describe("hasConverged", () => {
  it("차이가 threshold 미만이면 수렴", () => {
    const result: ContagionRoundResult = {
      timestamp: Date.now(),
      personaResults: [],
      effects: [],
      averageMoodBefore: 0.5,
      averageMoodAfter: 0.5005,
      moodVarianceBefore: 0,
      moodVarianceAfter: 0,
      affectedCount: 0,
    }
    expect(hasConverged(result)).toBe(true)
  })

  it("차이가 threshold 이상이면 미수렴", () => {
    const result: ContagionRoundResult = {
      timestamp: Date.now(),
      personaResults: [],
      effects: [],
      averageMoodBefore: 0.5,
      averageMoodAfter: 0.51,
      moodVarianceBefore: 0,
      moodVarianceAfter: 0,
      affectedCount: 0,
    }
    expect(hasConverged(result)).toBe(false)
  })

  it("커스텀 threshold", () => {
    const result: ContagionRoundResult = {
      timestamp: Date.now(),
      personaResults: [],
      effects: [],
      averageMoodBefore: 0.5,
      averageMoodAfter: 0.55,
      moodVarianceBefore: 0,
      moodVarianceAfter: 0,
      affectedCount: 0,
    }
    expect(hasConverged(result, 0.1)).toBe(true) // 0.05 < 0.1
    expect(hasConverged(result, 0.01)).toBe(false) // 0.05 > 0.01
  })
})

// ═══════════════════════════════════════════════════════════════
// 10. computeContagionStats
// ═══════════════════════════════════════════════════════════════

describe("computeContagionStats", () => {
  it("빈 결과에서 기본 통계", () => {
    const result: ContagionRoundResult = {
      timestamp: Date.now(),
      personaResults: [],
      effects: [],
      averageMoodBefore: 0.5,
      averageMoodAfter: 0.5,
      moodVarianceBefore: 0,
      moodVarianceAfter: 0,
      affectedCount: 0,
    }
    const stats = computeContagionStats(result)
    expect(stats.totalEffects).toBe(0)
    expect(stats.positiveEffects).toBe(0)
    expect(stats.negativeEffects).toBe(0)
    expect(stats.topInfluencer).toBeNull()
    expect(stats.mostAffected).toBeNull()
  })

  it("양/음 효과 분류", () => {
    const result: ContagionRoundResult = {
      timestamp: Date.now(),
      personaResults: [
        {
          personaId: "p-2",
          totalMoodDelta: 0.05,
          sourceCount: 2,
          dominantSource: "p-1",
          projectedMood: 0.55,
        },
      ],
      effects: [
        {
          sourceId: "p-1",
          targetId: "p-2",
          moodDelta: 0.08,
          rawInfluence: 0.1,
          resistance: 0.1,
          weight: 0.6,
        },
        {
          sourceId: "p-3",
          targetId: "p-2",
          moodDelta: -0.03,
          rawInfluence: -0.04,
          resistance: 0.1,
          weight: 0.4,
        },
      ],
      averageMoodBefore: 0.5,
      averageMoodAfter: 0.52,
      moodVarianceBefore: 0.01,
      moodVarianceAfter: 0.008,
      affectedCount: 1,
    }
    const stats = computeContagionStats(result)
    expect(stats.totalEffects).toBe(2)
    expect(stats.positiveEffects).toBe(1)
    expect(stats.negativeEffects).toBe(1)
    expect(stats.topInfluencer).toBe("p-1") // 더 큰 |delta|
    expect(stats.mostAffected).toBe("p-2")
    expect(stats.averageAbsDelta).toBeGreaterThan(0)
    expect(stats.maxAbsDelta).toBe(0.08)
  })
})

// ═══════════════════════════════════════════════════════════════
// 11. checkMoodSafety
// ═══════════════════════════════════════════════════════════════

describe("checkMoodSafety", () => {
  it("안전한 mood → safe", () => {
    const result: ContagionRoundResult = {
      timestamp: Date.now(),
      personaResults: [],
      effects: [],
      averageMoodBefore: 0.6,
      averageMoodAfter: 0.55,
      moodVarianceBefore: 0,
      moodVarianceAfter: 0,
      affectedCount: 0,
    }
    const safety = checkMoodSafety(result)
    expect(safety.status).toBe("safe")
    expect(safety.reason).toBe("")
  })

  it("낮은 mood → warning", () => {
    const result: ContagionRoundResult = {
      timestamp: Date.now(),
      personaResults: [],
      effects: [],
      averageMoodBefore: 0.4,
      averageMoodAfter: 0.25,
      moodVarianceBefore: 0,
      moodVarianceAfter: 0,
      affectedCount: 0,
    }
    const safety = checkMoodSafety(result)
    expect(safety.status).toBe("warning")
    expect(safety.reason).toContain("주의")
  })

  it("매우 낮은 mood → critical", () => {
    const result: ContagionRoundResult = {
      timestamp: Date.now(),
      personaResults: [],
      effects: [],
      averageMoodBefore: 0.3,
      averageMoodAfter: 0.1,
      moodVarianceBefore: 0,
      moodVarianceAfter: 0,
      affectedCount: 0,
    }
    const safety = checkMoodSafety(result)
    expect(safety.status).toBe("critical")
    expect(safety.reason).toContain("위험")
  })

  it("커스텀 threshold", () => {
    const result: ContagionRoundResult = {
      timestamp: Date.now(),
      personaResults: [],
      effects: [],
      averageMoodBefore: 0.5,
      averageMoodAfter: 0.45,
      moodVarianceBefore: 0,
      moodVarianceAfter: 0,
      affectedCount: 0,
    }
    const safety = checkMoodSafety(result, 0.5, 0.4)
    expect(safety.status).toBe("warning") // 0.45 ≤ 0.5
  })
})

// ═══════════════════════════════════════════════════════════════
// 12. 불변성 검증
// ═══════════════════════════════════════════════════════════════

describe("불변성 검증", () => {
  it("runContagionRound는 입력 배열을 변경하지 않음", () => {
    const personas = [
      makePersona({ personaId: "p-1", mood: 0.8 }),
      makePersona({ personaId: "p-2", mood: 0.3 }),
    ]
    const edges = [makeEdge({ sourceId: "p-1", targetId: "p-2" })]
    const sensitivities = new Map<string, ContagionSensitivity>()
    sensitivities.set("p-1", makeSensitivity())
    sensitivities.set("p-2", makeSensitivity())
    const topologies = new Map<string, NodeTopology>()
    topologies.set("p-1", makeTopology({ personaId: "p-1" }))
    topologies.set("p-2", makeTopology({ personaId: "p-2" }))

    const snapshotP = JSON.stringify(personas)
    const snapshotE = JSON.stringify(edges)

    runContagionRound({ personas, edges, sensitivities, topologies })

    expect(JSON.stringify(personas)).toBe(snapshotP)
    expect(JSON.stringify(edges)).toBe(snapshotE)
  })

  it("applyContagionRound는 원본 배열 불변", () => {
    const personas = [makePersona({ personaId: "p-1", mood: 0.5 })]
    const snapshot = JSON.stringify(personas)
    const roundResult: ContagionRoundResult = {
      timestamp: Date.now(),
      personaResults: [
        {
          personaId: "p-1",
          totalMoodDelta: 0.1,
          sourceCount: 1,
          dominantSource: "p-2",
          projectedMood: 0.6,
        },
      ],
      effects: [],
      averageMoodBefore: 0.5,
      averageMoodAfter: 0.6,
      moodVarianceBefore: 0,
      moodVarianceAfter: 0,
      affectedCount: 1,
    }
    applyContagionRound(personas, roundResult)
    expect(JSON.stringify(personas)).toBe(snapshot)
  })
})

// ═══════════════════════════════════════════════════════════════
// 13. 엣지 케이스
// ═══════════════════════════════════════════════════════════════

describe("엣지 케이스", () => {
  it("존재하지 않는 소스/타겟 엣지는 무시", () => {
    const personas = [makePersona({ personaId: "p-1" })]
    const edges = [makeEdge({ sourceId: "p-1", targetId: "p-999" })] // p-999 없음
    const sensitivities = new Map<string, ContagionSensitivity>()
    sensitivities.set("p-1", makeSensitivity())
    const topologies = new Map<string, NodeTopology>()

    const result = runContagionRound({ personas, edges, sensitivities, topologies })
    expect(result.effects.length).toBe(0)
  })

  it("sensitivity 없는 타겟은 무시", () => {
    const personas = [
      makePersona({ personaId: "p-1", mood: 0.8 }),
      makePersona({ personaId: "p-2", mood: 0.3 }),
    ]
    const edges = [makeEdge({ sourceId: "p-1", targetId: "p-2" })]
    const sensitivities = new Map<string, ContagionSensitivity>()
    sensitivities.set("p-1", makeSensitivity()) // p-2 없음
    const topologies = new Map<string, NodeTopology>()

    const result = runContagionRound({ personas, edges, sensitivities, topologies })
    expect(result.effects.length).toBe(0)
  })

  it("topology 없으면 기본값 사용", () => {
    const personas = [
      makePersona({ personaId: "p-1", mood: 0.8 }),
      makePersona({ personaId: "p-2", mood: 0.3 }),
    ]
    const edges = [makeEdge({ sourceId: "p-1", targetId: "p-2" })]
    const sensitivities = new Map<string, ContagionSensitivity>()
    sensitivities.set("p-1", makeSensitivity())
    sensitivities.set("p-2", makeSensitivity())
    const topologies = new Map<string, NodeTopology>() // 빈 map

    const result = runContagionRound({ personas, edges, sensitivities, topologies })
    // 기본 topology (degree=0, cc=0, isHub=false)로 실행되므로 isolateDamping 적용
    expect(result.effects.length).toBeGreaterThan(0)
  })

  it("자기 자신에게 전파 (self-edge)", () => {
    const personas = [makePersona({ personaId: "p-1", mood: 0.5 })]
    const edges = [makeEdge({ sourceId: "p-1", targetId: "p-1" })]
    const sensitivities = new Map<string, ContagionSensitivity>()
    sensitivities.set("p-1", makeSensitivity())
    const topologies = new Map<string, NodeTopology>()

    const result = runContagionRound({ personas, edges, sensitivities, topologies })
    // mood 차이 0 → delta 0 → 전파 없음
    expect(result.effects.length).toBe(0)
  })
})
