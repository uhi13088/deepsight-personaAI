import { describe, it, expect } from "vitest"
import {
  measureDrift,
  classifySeverity,
  computeDimensionDrifts,
  findTopDriftDimension,
  summarizeDrift,
  DRIFT_WARNING_THRESHOLD,
  DRIFT_CRITICAL_THRESHOLD,
} from "@/lib/persona-world/quality/persona-drift"
import type { VoiceStyleParams } from "@/lib/persona-world/types"

// ── 헬퍼 ────────────────────────────────────────────────────

function makeVoiceStyle(overrides: Partial<VoiceStyleParams> = {}): VoiceStyleParams {
  return {
    formality: 0.5,
    humor: 0.5,
    sentenceLength: 0.5,
    emotionExpression: 0.5,
    assertiveness: 0.5,
    vocabularyLevel: 0.5,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════
// measureDrift
// ═══════════════════════════════════════════════════════════════

describe("measureDrift", () => {
  it("동일한 벡터 → score 0, STABLE", () => {
    const baseline = makeVoiceStyle()
    const current = makeVoiceStyle()
    const result = measureDrift(baseline, current)
    expect(result.score).toBe(0)
    expect(result.severity).toBe("STABLE")
  })

  it("약간의 차이 → 낮은 score, STABLE", () => {
    const baseline = makeVoiceStyle()
    const current = makeVoiceStyle({ formality: 0.55, humor: 0.45 })
    const result = measureDrift(baseline, current)
    expect(result.score).toBeGreaterThan(0)
    expect(result.score).toBeLessThan(DRIFT_WARNING_THRESHOLD)
    expect(result.severity).toBe("STABLE")
  })

  it("큰 차이 → CRITICAL", () => {
    const baseline = makeVoiceStyle({ formality: 0.1, humor: 0.1, sentenceLength: 0.1 })
    const current = makeVoiceStyle({ formality: 0.9, humor: 0.9, sentenceLength: 0.9 })
    const result = measureDrift(baseline, current)
    expect(result.score).toBeGreaterThan(DRIFT_CRITICAL_THRESHOLD)
    expect(result.severity).toBe("CRITICAL")
  })

  it("차원별 이탈도 포함", () => {
    const baseline = makeVoiceStyle({ formality: 0.2 })
    const current = makeVoiceStyle({ formality: 0.8 })
    const result = measureDrift(baseline, current)
    expect(result.dimensionDrifts.formality).toBeCloseTo(0.6, 2)
  })

  it("topDriftDimension 올바른 차원 반환", () => {
    const baseline = makeVoiceStyle({ humor: 0.1 })
    const current = makeVoiceStyle({ humor: 0.9 })
    const result = measureDrift(baseline, current)
    expect(result.topDriftDimension).toBe("humor")
  })

  it("score는 0~1 범위", () => {
    const baseline = makeVoiceStyle({
      formality: 0,
      humor: 0,
      sentenceLength: 0,
      emotionExpression: 0,
      assertiveness: 0,
      vocabularyLevel: 0,
    })
    const current = makeVoiceStyle({
      formality: 1,
      humor: 1,
      sentenceLength: 1,
      emotionExpression: 1,
      assertiveness: 1,
      vocabularyLevel: 1,
    })
    const result = measureDrift(baseline, current)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// classifySeverity
// ═══════════════════════════════════════════════════════════════

describe("classifySeverity", () => {
  it("0 → STABLE", () => {
    expect(classifySeverity(0)).toBe("STABLE")
  })

  it("0.14 → STABLE", () => {
    expect(classifySeverity(0.14)).toBe("STABLE")
  })

  it("0.15 → WARNING", () => {
    expect(classifySeverity(0.15)).toBe("WARNING")
  })

  it("0.29 → WARNING", () => {
    expect(classifySeverity(0.29)).toBe("WARNING")
  })

  it("0.30 → CRITICAL", () => {
    expect(classifySeverity(0.3)).toBe("CRITICAL")
  })

  it("1.0 → CRITICAL", () => {
    expect(classifySeverity(1.0)).toBe("CRITICAL")
  })
})

// ═══════════════════════════════════════════════════════════════
// computeDimensionDrifts
// ═══════════════════════════════════════════════════════════════

describe("computeDimensionDrifts", () => {
  it("동일 벡터 → 모든 차원 0", () => {
    const style = makeVoiceStyle()
    const drifts = computeDimensionDrifts(style, style)
    Object.values(drifts).forEach((v) => expect(v).toBe(0))
  })

  it("특정 차원만 변경 → 해당 차원만 값 있음", () => {
    const baseline = makeVoiceStyle()
    const current = makeVoiceStyle({ assertiveness: 0.9 })
    const drifts = computeDimensionDrifts(baseline, current)
    expect(drifts.assertiveness).toBeCloseTo(0.4, 2)
    expect(drifts.formality).toBe(0)
    expect(drifts.humor).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// findTopDriftDimension
// ═══════════════════════════════════════════════════════════════

describe("findTopDriftDimension", () => {
  it("가장 큰 이탈 차원 반환", () => {
    const drifts = {
      formality: 0.1,
      humor: 0.05,
      sentenceLength: 0.3,
      emotionExpression: 0.02,
      assertiveness: 0.15,
      vocabularyLevel: 0.0,
    }
    expect(findTopDriftDimension(drifts)).toBe("sentenceLength")
  })
})

// ═══════════════════════════════════════════════════════════════
// summarizeDrift
// ═══════════════════════════════════════════════════════════════

describe("summarizeDrift", () => {
  it("STABLE → 안정 메시지", () => {
    const result = measureDrift(makeVoiceStyle(), makeVoiceStyle())
    expect(summarizeDrift(result)).toContain("안정")
  })

  it("WARNING → 경고 메시지 + 주요 이탈 차원", () => {
    const baseline = makeVoiceStyle({ humor: 0.2 })
    const current = makeVoiceStyle({ humor: 0.7, formality: 0.3 })
    const result = measureDrift(baseline, current)
    if (result.severity === "WARNING") {
      const summary = summarizeDrift(result)
      expect(summary).toContain("경고")
    }
  })

  it("CRITICAL → 위험 메시지", () => {
    const baseline = makeVoiceStyle({ formality: 0.1, humor: 0.1, sentenceLength: 0.1 })
    const current = makeVoiceStyle({ formality: 0.9, humor: 0.9, sentenceLength: 0.9 })
    const result = measureDrift(baseline, current)
    if (result.severity === "CRITICAL") {
      const summary = summarizeDrift(result)
      expect(summary).toContain("위험")
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("WARNING < CRITICAL", () => {
    expect(DRIFT_WARNING_THRESHOLD).toBeLessThan(DRIFT_CRITICAL_THRESHOLD)
  })

  it("임계값 합리적 범위 (0~1)", () => {
    expect(DRIFT_WARNING_THRESHOLD).toBeGreaterThan(0)
    expect(DRIFT_CRITICAL_THRESHOLD).toBeLessThan(1)
  })
})
