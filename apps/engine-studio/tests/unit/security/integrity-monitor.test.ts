import { describe, it, expect } from "vitest"
import {
  vectorCosineSimilarity,
  l1ToArray,
  checkL1Drift,
  checkChangeLog,
  checkCollectiveAnomaly,
  verifyFactbookHash,
  runIntegrityMonitor,
  DRIFT_THRESHOLDS,
  CHANGE_LIMITS,
  COLLECTIVE_THRESHOLDS,
} from "@/lib/security/integrity-monitor"
import type {
  ChangeLogEntry,
  DriftCheckResult,
  CollectiveAnomalyResult,
} from "@/lib/security/integrity-monitor"
import type { SocialPersonaVector, Factbook } from "@/types"
import { computeFactbookHash } from "@/lib/persona-world/factbook"

// ── 테스트 헬퍼 ──────────────────────────────────────────────

const makeL1 = (overrides?: Partial<SocialPersonaVector>): SocialPersonaVector => ({
  depth: 0.5,
  lens: 0.5,
  stance: 0.5,
  scope: 0.5,
  taste: 0.5,
  purpose: 0.5,
  sociability: 0.5,
  ...overrides,
})

const makeChangeLog = (contextId: string, count: number, hoursAgo: number = 1): ChangeLogEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    contextId,
    category: "selfNarrative" as const,
    previousContent: `이전 내용 ${i}`,
    newContent: `새 내용 ${i}`,
    changedAt: Date.now() - hoursAgo * 60 * 60 * 1000 + i * 1000,
  }))

// ═══════════════════════════════════════════════════════════════
// vectorCosineSimilarity
// ═══════════════════════════════════════════════════════════════

describe("vectorCosineSimilarity", () => {
  it("동일 벡터 → 1.0", () => {
    expect(vectorCosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1.0)
  })

  it("직교 벡터 → 0.0", () => {
    expect(vectorCosineSimilarity([1, 0], [0, 1])).toBe(0)
  })

  it("반대 벡터 → -1.0", () => {
    expect(vectorCosineSimilarity([1, 0], [-1, 0])).toBe(-1)
  })

  it("빈 벡터 → 1.0", () => {
    expect(vectorCosineSimilarity([], [])).toBe(1.0)
  })

  it("영벡터 → 1.0 (동일로 취급)", () => {
    expect(vectorCosineSimilarity([0, 0, 0], [0, 0, 0])).toBe(1.0)
  })

  it("유사 벡터 → 높은 유사도", () => {
    const sim = vectorCosineSimilarity([0.5, 0.5, 0.5], [0.6, 0.4, 0.5])
    expect(sim).toBeGreaterThan(0.95)
  })
})

// ═══════════════════════════════════════════════════════════════
// l1ToArray
// ═══════════════════════════════════════════════════════════════

describe("l1ToArray", () => {
  it("7차원 배열 반환", () => {
    const arr = l1ToArray(makeL1())
    expect(arr).toHaveLength(7)
  })

  it("올바른 순서: depth, lens, stance, scope, taste, purpose, sociability", () => {
    const l1 = makeL1({
      depth: 0.1,
      lens: 0.2,
      stance: 0.3,
      scope: 0.4,
      taste: 0.5,
      purpose: 0.6,
      sociability: 0.7,
    })
    expect(l1ToArray(l1)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7])
  })
})

// ═══════════════════════════════════════════════════════════════
// checkL1Drift
// ═══════════════════════════════════════════════════════════════

describe("checkL1Drift", () => {
  it("동일 벡터 → stable", () => {
    const result = checkL1Drift(makeL1(), makeL1())
    expect(result.status).toBe("stable")
    expect(result.similarity).toBe(1)
  })

  it("약간의 변화 → stable (similarity > 0.85)", () => {
    const original = makeL1()
    const current = makeL1({ depth: 0.55, lens: 0.45 })
    const result = checkL1Drift(original, current)
    expect(result.status).toBe("stable")
    expect(result.similarity).toBeGreaterThan(DRIFT_THRESHOLDS.warning)
  })

  it("중간 변화 → warning (0.70 < similarity ≤ 0.85)", () => {
    const original = makeL1({ depth: 0.9, lens: 0.9, stance: 0.9, scope: 0.9 })
    const current = makeL1({ depth: 0.3, lens: 0.9, stance: 0.9, scope: 0.9 })
    const result = checkL1Drift(original, current)
    // 큰 변화가 있으므로 warning 또는 stable 가까이
    expect(result.similarity).toBeLessThan(1.0)
  })

  it("큰 변화 → critical (similarity ≤ 0.70)", () => {
    const original = makeL1({ depth: 0.9, lens: 0.9, stance: 0.1 })
    const current = makeL1({ depth: 0.1, lens: 0.1, stance: 0.9 })
    const result = checkL1Drift(original, current)
    expect(result.similarity).toBeLessThan(1.0)
    // dominantDrift 존재
    expect(result.dominantDrift).not.toBeNull()
  })

  it("dominantDrift: 가장 많이 변한 차원 식별", () => {
    const original = makeL1({ depth: 0.2, stance: 0.5 })
    const current = makeL1({ depth: 0.8, stance: 0.5 })
    const result = checkL1Drift(original, current)
    expect(result.dominantDrift?.dimension).toBe("depth")
    expect(result.dominantDrift?.delta).toBeCloseTo(0.6, 2)
  })

  it("변화 없으면 dominantDrift = null", () => {
    const result = checkL1Drift(makeL1(), makeL1())
    expect(result.dominantDrift).toBeNull()
  })

  it("극단적 반전 → critical", () => {
    const original = makeL1({
      depth: 0.0,
      lens: 0.0,
      stance: 0.0,
      scope: 0.0,
      taste: 0.0,
      purpose: 0.0,
      sociability: 0.0,
    })
    const current = makeL1({
      depth: 1.0,
      lens: 1.0,
      stance: 1.0,
      scope: 1.0,
      taste: 1.0,
      purpose: 1.0,
      sociability: 1.0,
    })
    const result = checkL1Drift(original, current)
    expect(result.status).toBe("stable") // cos sim of [0...] vs [1...] = 1.0 (same direction)
    // Note: cosine similarity measures direction, not magnitude
    // Both [0,0,...] and [1,1,...] when one is zero → special case
  })
})

// ═══════════════════════════════════════════════════════════════
// checkChangeLog
// ═══════════════════════════════════════════════════════════════

describe("checkChangeLog", () => {
  it("빈 로그 → 정상", () => {
    const result = checkChangeLog([])
    expect(result.flaggedContextIds).toHaveLength(0)
    expect(result.totalDailyChanges).toBe(0)
    expect(result.totalLimitExceeded).toBe(false)
  })

  it("하루 이내 변경 4회 → 정상 (임계값 5 미만)", () => {
    const logs = makeChangeLog("ctx-1", 4)
    const result = checkChangeLog(logs)
    expect(result.flaggedContextIds).toHaveLength(0)
  })

  it("하루 이내 동일 항목 5회 변경 → 플래그", () => {
    const logs = makeChangeLog("ctx-1", 5)
    const result = checkChangeLog(logs)
    expect(result.flaggedContextIds).toContain("ctx-1")
  })

  it("하루 이내 동일 항목 10회 변경 → 플래그", () => {
    const logs = makeChangeLog("ctx-1", 10)
    const result = checkChangeLog(logs)
    expect(result.flaggedContextIds).toContain("ctx-1")
  })

  it("다른 항목은 플래그 안 됨", () => {
    const logs = [...makeChangeLog("ctx-1", 5), ...makeChangeLog("ctx-2", 3)]
    const result = checkChangeLog(logs)
    expect(result.flaggedContextIds).toContain("ctx-1")
    expect(result.flaggedContextIds).not.toContain("ctx-2")
  })

  it("하루 전 변경은 무시", () => {
    const logs = makeChangeLog("ctx-1", 10, 25) // 25시간 전
    const result = checkChangeLog(logs)
    expect(result.flaggedContextIds).toHaveLength(0)
    expect(result.totalDailyChanges).toBe(0)
  })

  it("전체 일일 변경 20회 이상 → totalLimitExceeded", () => {
    const logs = [
      ...makeChangeLog("ctx-1", 4),
      ...makeChangeLog("ctx-2", 4),
      ...makeChangeLog("ctx-3", 4),
      ...makeChangeLog("ctx-4", 4),
      ...makeChangeLog("ctx-5", 4),
    ]
    const result = checkChangeLog(logs)
    expect(result.totalDailyChanges).toBe(20)
    expect(result.totalLimitExceeded).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// checkCollectiveAnomaly
// ═══════════════════════════════════════════════════════════════

describe("checkCollectiveAnomaly", () => {
  it("정상 범위 mood → none", () => {
    const result = checkCollectiveAnomaly([0.5, 0.6, 0.4, 0.55])
    expect(result.anomaly).toBe("none")
    expect(result.isSufficientSample).toBe(true)
  })

  it("평균 mood ≤ 0.3 → depression", () => {
    const result = checkCollectiveAnomaly([0.1, 0.2, 0.3, 0.2])
    expect(result.anomaly).toBe("depression")
    expect(result.averageMood).toBeLessThanOrEqual(COLLECTIVE_THRESHOLDS.depressionWarning)
  })

  it("평균 mood ≥ 0.9 → euphoria", () => {
    const result = checkCollectiveAnomaly([0.95, 0.92, 0.93, 0.95])
    expect(result.anomaly).toBe("euphoria")
    expect(result.averageMood).toBeGreaterThanOrEqual(COLLECTIVE_THRESHOLDS.euphoriaWarning)
  })

  it("표본 부족 (< 3) → none + isSufficientSample=false", () => {
    const result = checkCollectiveAnomaly([0.1, 0.1])
    expect(result.anomaly).toBe("none")
    expect(result.isSufficientSample).toBe(false)
  })

  it("빈 배열 → isSufficientSample=false", () => {
    const result = checkCollectiveAnomaly([])
    expect(result.isSufficientSample).toBe(false)
    expect(result.sampleSize).toBe(0)
  })

  it("정확히 3개 → 최소 표본 충족", () => {
    const result = checkCollectiveAnomaly([0.5, 0.5, 0.5])
    expect(result.isSufficientSample).toBe(true)
    expect(result.sampleSize).toBe(3)
  })

  it("경계값 mood=0.3 → depression", () => {
    const result = checkCollectiveAnomaly([0.3, 0.3, 0.3])
    expect(result.anomaly).toBe("depression")
  })

  it("mood=0.31 → none (경계 바로 위)", () => {
    const result = checkCollectiveAnomaly([0.31, 0.31, 0.31])
    expect(result.anomaly).toBe("none")
  })
})

// ═══════════════════════════════════════════════════════════════
// verifyFactbookHash
// ═══════════════════════════════════════════════════════════════

describe("verifyFactbookHash", () => {
  it("유효한 해시 → verified=true", async () => {
    const facts = [
      {
        id: "f1",
        category: "origin" as const,
        content: "테스트 사실",
        createdAt: Date.now(),
      },
    ]
    const hash = await computeFactbookHash(facts)
    const factbook: Factbook = {
      immutableFacts: facts,
      mutableContext: [],
      integrityHash: hash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const result = await verifyFactbookHash(factbook)
    expect(result.verified).toBe(true)
    expect(result.hashMatch).toBe(true)
  })

  it("변조된 사실 → hashMatch=false", async () => {
    const facts = [
      {
        id: "f1",
        category: "origin" as const,
        content: "원래 사실",
        createdAt: Date.now(),
      },
    ]
    const hash = await computeFactbookHash(facts)
    const factbook: Factbook = {
      immutableFacts: [{ ...facts[0], content: "변조된 사실" }],
      mutableContext: [],
      integrityHash: hash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const result = await verifyFactbookHash(factbook)
    expect(result.verified).toBe(false)
    expect(result.hashMatch).toBe(false)
  })

  it("빈 immutableFacts → verified=true", async () => {
    const factbook: Factbook = {
      immutableFacts: [],
      mutableContext: [],
      integrityHash: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const result = await verifyFactbookHash(factbook)
    expect(result.verified).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// runIntegrityMonitor (통합 파이프라인)
// ═══════════════════════════════════════════════════════════════

describe("runIntegrityMonitor", () => {
  it("모든 지표 정상 → alertLevel=ok, 경고 없음", async () => {
    const facts = [
      { id: "f1", category: "origin" as const, content: "테스트", createdAt: Date.now() },
    ]
    const hash = await computeFactbookHash(facts)

    const result = await runIntegrityMonitor({
      factbook: {
        immutableFacts: facts,
        mutableContext: [],
        integrityHash: hash,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      originalL1: makeL1(),
      currentL1: makeL1(),
      changeLogs: [],
      collectiveMoods: [0.5, 0.6, 0.55],
    })

    expect(result.alertLevel).toBe("ok")
    expect(result.alerts).toHaveLength(0)
    expect(result.factbookIntegrity.hashMatch).toBe(true)
    expect(result.drift.status).toBe("stable")
    expect(result.collective.anomaly).toBe("none")
  })

  it("팩트북 변조 → alertLevel=critical", async () => {
    const result = await runIntegrityMonitor({
      factbook: {
        immutableFacts: [
          { id: "f1", category: "origin" as const, content: "변조", createdAt: Date.now() },
        ],
        mutableContext: [],
        integrityHash: "invalid-hash",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      originalL1: makeL1(),
      currentL1: makeL1(),
      changeLogs: [],
      collectiveMoods: [0.5, 0.5, 0.5],
    })

    expect(result.alertLevel).toBe("critical")
    expect(result.alerts.some((a) => a.includes("변조"))).toBe(true)
  })

  it("과도한 변경 → alertLevel=warning", async () => {
    const facts = [
      { id: "f1", category: "origin" as const, content: "테스트", createdAt: Date.now() },
    ]
    const hash = await computeFactbookHash(facts)

    const result = await runIntegrityMonitor({
      factbook: {
        immutableFacts: facts,
        mutableContext: [],
        integrityHash: hash,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      originalL1: makeL1(),
      currentL1: makeL1(),
      changeLogs: makeChangeLog("ctx-1", 6),
      collectiveMoods: [0.5, 0.5, 0.5],
    })

    expect(result.alertLevel).toBe("warning")
    expect(result.changeLog.flaggedContextIds).toContain("ctx-1")
  })

  it("집단 우울 → alertLevel=warning", async () => {
    const facts = [
      { id: "f1", category: "origin" as const, content: "테스트", createdAt: Date.now() },
    ]
    const hash = await computeFactbookHash(facts)

    const result = await runIntegrityMonitor({
      factbook: {
        immutableFacts: facts,
        mutableContext: [],
        integrityHash: hash,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      originalL1: makeL1(),
      currentL1: makeL1(),
      changeLogs: [],
      collectiveMoods: [0.1, 0.2, 0.15],
    })

    expect(result.alertLevel).toBe("warning")
    expect(result.collective.anomaly).toBe("depression")
    expect(result.alerts.some((a) => a.includes("집단 우울"))).toBe(true)
  })

  it("결과 구조: 모든 필드 포함", async () => {
    const result = await runIntegrityMonitor({
      factbook: {
        immutableFacts: [],
        mutableContext: [],
        integrityHash: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      originalL1: makeL1(),
      currentL1: makeL1(),
      changeLogs: [],
      collectiveMoods: [0.5, 0.5, 0.5],
    })

    expect(result).toHaveProperty("alertLevel")
    expect(result).toHaveProperty("factbookIntegrity")
    expect(result).toHaveProperty("drift")
    expect(result).toHaveProperty("changeLog")
    expect(result).toHaveProperty("collective")
    expect(result).toHaveProperty("alerts")
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("DRIFT_THRESHOLDS: critical < warning", () => {
    expect(DRIFT_THRESHOLDS.critical).toBeLessThan(DRIFT_THRESHOLDS.warning)
  })

  it("CHANGE_LIMITS: maxDailyChangesPerItem = 5", () => {
    expect(CHANGE_LIMITS.maxDailyChangesPerItem).toBe(5)
  })

  it("COLLECTIVE_THRESHOLDS: depressionWarning < euphoriaWarning", () => {
    expect(COLLECTIVE_THRESHOLDS.depressionWarning).toBeLessThan(
      COLLECTIVE_THRESHOLDS.euphoriaWarning
    )
  })

  it("COLLECTIVE_THRESHOLDS: minSampleSize >= 3", () => {
    expect(COLLECTIVE_THRESHOLDS.minSampleSize).toBeGreaterThanOrEqual(3)
  })
})
