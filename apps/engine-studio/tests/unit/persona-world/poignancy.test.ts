import { describe, it, expect } from "vitest"
import {
  calculatePoignancy,
  derivePressureFromState,
  computeEmotionalDelta,
  computeRAGSearchScore,
  calculatePostPoignancy,
  calculateInteractionPoignancy,
  RAG_SEARCH_WEIGHTS,
  POIGNANCY_THRESHOLDS,
} from "@/lib/persona-world/poignancy"
import type { PersonaStateData } from "@/lib/persona-world/types"

// ── 테스트용 상태 ──

const makeState = (overrides?: Partial<PersonaStateData>): PersonaStateData => ({
  mood: 0.5,
  energy: 1.0,
  socialBattery: 1.0,
  paradoxTension: 0.0,
  ...overrides,
})

// ═══════════════════════════════════════════════════════════════
// calculatePoignancy
// ═══════════════════════════════════════════════════════════════

describe("calculatePoignancy", () => {
  it("기본 공식: pressure × (1 + volatility) × emotionalDelta", () => {
    const result = calculatePoignancy({
      pressure: 0.5,
      volatility: 0.5,
      emotionalDelta: 0.4,
    })
    // 0.5 × (1 + 0.5) × 0.4 = 0.5 × 1.5 × 0.4 = 0.3
    expect(result).toBeCloseTo(0.3, 2)
  })

  it("모든 값이 0이면 결과도 0", () => {
    const result = calculatePoignancy({
      pressure: 0,
      volatility: 0,
      emotionalDelta: 0,
    })
    expect(result).toBe(0)
  })

  it("높은 압박 + 높은 폭발성 + 큰 감정 변화 → 최대", () => {
    const result = calculatePoignancy({
      pressure: 1.0,
      volatility: 1.0,
      emotionalDelta: 1.0,
    })
    // 1.0 × (1 + 1.0) × 1.0 = 2.0 → clamp → 1.0
    expect(result).toBe(1.0)
  })

  it("결과는 0~1 범위로 클램핑", () => {
    const result = calculatePoignancy({
      pressure: 0.9,
      volatility: 0.9,
      emotionalDelta: 0.9,
    })
    // 0.9 × 1.9 × 0.9 = 1.539 → clamp → 1.0
    expect(result).toBe(1.0)
  })

  it("pressure가 0이면 항상 0 (자극 없는 상태)", () => {
    const result = calculatePoignancy({
      pressure: 0,
      volatility: 0.8,
      emotionalDelta: 0.9,
    })
    expect(result).toBe(0)
  })

  it("emotionalDelta가 0이면 항상 0 (감정 변화 없음)", () => {
    const result = calculatePoignancy({
      pressure: 0.8,
      volatility: 0.8,
      emotionalDelta: 0,
    })
    expect(result).toBe(0)
  })

  it("volatility가 높으면 같은 자극에도 더 강하게 반응", () => {
    const lowVol = calculatePoignancy({
      pressure: 0.5,
      volatility: 0.2,
      emotionalDelta: 0.3,
    })
    const highVol = calculatePoignancy({
      pressure: 0.5,
      volatility: 0.8,
      emotionalDelta: 0.3,
    })
    expect(highVol).toBeGreaterThan(lowVol)
  })
})

// ═══════════════════════════════════════════════════════════════
// derivePressureFromState
// ═══════════════════════════════════════════════════════════════

describe("derivePressureFromState", () => {
  it("중립 상태 → 낮은 pressure", () => {
    const result = derivePressureFromState(makeState())
    // paradoxTension=0×0.6 + (1-1.0)×0.2 + |0.5-0.5|×2×0.2 = 0
    expect(result).toBeCloseTo(0.0, 2)
  })

  it("높은 paradoxTension → 높은 pressure", () => {
    const result = derivePressureFromState(makeState({ paradoxTension: 0.8 }))
    // 0.8×0.6 + 0×0.2 + 0×0.2 = 0.48
    expect(result).toBeCloseTo(0.48, 2)
  })

  it("낮은 energy → pressure 증가", () => {
    const result = derivePressureFromState(makeState({ energy: 0.2 }))
    // 0×0.6 + (1-0.2)×0.2 + 0×0.2 = 0.8×0.2 = 0.16
    expect(result).toBeCloseTo(0.16, 2)
  })

  it("극단적 mood → pressure 증가 (매우 행복하거나 매우 슬프면 감정적 민감)", () => {
    const highMood = derivePressureFromState(makeState({ mood: 1.0 }))
    // 0×0.6 + 0×0.2 + |1.0-0.5|×2×0.2 = 1.0×0.2 = 0.2
    expect(highMood).toBeCloseTo(0.2, 2)

    const lowMood = derivePressureFromState(makeState({ mood: 0.0 }))
    // 0×0.6 + 0×0.2 + |0-0.5|×2×0.2 = 1.0×0.2 = 0.2
    expect(lowMood).toBeCloseTo(0.2, 2)
  })

  it("모든 스트레스 요인 복합 → 높은 pressure", () => {
    const result = derivePressureFromState(
      makeState({
        paradoxTension: 0.9,
        energy: 0.1,
        mood: 0.0,
      })
    )
    // 0.9×0.6 + 0.9×0.2 + 1.0×0.2 = 0.54+0.18+0.20 = 0.92
    expect(result).toBeCloseTo(0.92, 2)
  })

  it("결과는 0~1 클램핑", () => {
    const result = derivePressureFromState(
      makeState({
        paradoxTension: 1.0,
        energy: 0.0,
        mood: 0.0,
      })
    )
    expect(result).toBeLessThanOrEqual(1.0)
    expect(result).toBeGreaterThanOrEqual(0.0)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeEmotionalDelta
// ═══════════════════════════════════════════════════════════════

describe("computeEmotionalDelta", () => {
  it("공격적 댓글 → 높은 emotionalDelta", () => {
    const result = computeEmotionalDelta("comment_received_aggressive", 0.5, 0.5)
    // base 0.50, actualMoodChange=0 → max(0.50, 0) = 0.50
    expect(result).toBe(0.5)
  })

  it("중립 댓글 → 낮은 emotionalDelta", () => {
    const result = computeEmotionalDelta("comment_received_neutral", 0.5, 0.5)
    expect(result).toBe(0.05)
  })

  it("실제 mood 변화가 크면 base보다 우선", () => {
    // like_received base=0.08, but mood changed 0.3→0.7=0.4 변화
    const result = computeEmotionalDelta("like_received", 0.3, 0.7)
    // max(0.08, 0.4×2=0.8) = 0.8
    expect(result).toBeCloseTo(0.8, 2)
  })

  it("paradox_situation → 매우 높은 기본 영향", () => {
    const result = computeEmotionalDelta("paradox_situation", 0.5, 0.5)
    expect(result).toBe(0.6)
  })

  it("결과는 0~1 클램핑", () => {
    const result = computeEmotionalDelta("comment_received_aggressive", 0.0, 1.0)
    // max(0.50, 1.0×2=2.0) → clamp → 1.0
    expect(result).toBe(1.0)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeRAGSearchScore
// ═══════════════════════════════════════════════════════════════

describe("computeRAGSearchScore", () => {
  it("가중치 합이 1.0", () => {
    const sum =
      RAG_SEARCH_WEIGHTS.recency + RAG_SEARCH_WEIGHTS.similarity + RAG_SEARCH_WEIGHTS.poignancy
    expect(sum).toBe(1.0)
  })

  it("모든 요소 1.0이면 결과도 1.0", () => {
    const result = computeRAGSearchScore({
      recency: 1.0,
      similarity: 1.0,
      poignancy: 1.0,
    })
    expect(result).toBeCloseTo(1.0, 2)
  })

  it("poignancy가 높으면 전체 점수 상승", () => {
    const withoutPoignancy = computeRAGSearchScore({
      recency: 0.5,
      similarity: 0.5,
      poignancy: 0.0,
    })
    const withPoignancy = computeRAGSearchScore({
      recency: 0.5,
      similarity: 0.5,
      poignancy: 1.0,
    })
    expect(withPoignancy).toBeGreaterThan(withoutPoignancy)
    // 차이 = 1.0 × 0.3 = 0.3
    expect(withPoignancy - withoutPoignancy).toBeCloseTo(0.3, 2)
  })

  it("오래된 기억도 poignancy가 높으면 상위 랭크 가능", () => {
    // 오래된 + 감정적으로 중요한 기억
    const oldButPoignant = computeRAGSearchScore({
      recency: 0.1, // 매우 오래됨
      similarity: 0.5,
      poignancy: 1.0, // 매우 감정적
    })
    // 최근 + 일상적 기억
    const recentButBoring = computeRAGSearchScore({
      recency: 0.9, // 매우 최근
      similarity: 0.5,
      poignancy: 0.0, // 감정 없음
    })
    // 0.1×0.3 + 0.5×0.4 + 1.0×0.3 = 0.03 + 0.20 + 0.30 = 0.53
    // 0.9×0.3 + 0.5×0.4 + 0.0×0.3 = 0.27 + 0.20 + 0.00 = 0.47
    expect(oldButPoignant).toBeGreaterThan(recentButBoring)
  })

  it("similarity가 가장 큰 가중치 (0.4)", () => {
    expect(RAG_SEARCH_WEIGHTS.similarity).toBe(0.4)
    expect(RAG_SEARCH_WEIGHTS.similarity).toBeGreaterThan(RAG_SEARCH_WEIGHTS.recency)
    expect(RAG_SEARCH_WEIGHTS.similarity).toBeGreaterThan(RAG_SEARCH_WEIGHTS.poignancy)
  })
})

// ═══════════════════════════════════════════════════════════════
// calculatePostPoignancy
// ═══════════════════════════════════════════════════════════════

describe("calculatePostPoignancy", () => {
  it("중립 상태 + 낮은 volatility → 낮은 poignancy", () => {
    const result = calculatePostPoignancy(makeState(), 0.2)
    // pressure≈0, so result≈0
    expect(result).toBeLessThan(0.1)
  })

  it("긴장 상태 + 높은 volatility → 높은 poignancy", () => {
    const result = calculatePostPoignancy(
      makeState({ paradoxTension: 0.8, energy: 0.3, mood: 0.2 }),
      0.8
    )
    expect(result).toBeGreaterThan(0.1)
  })

  it("결과는 0~1 범위", () => {
    const result = calculatePostPoignancy(
      makeState({ paradoxTension: 1.0, energy: 0.0, mood: 0.0 }),
      1.0
    )
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(1.0)
  })
})

// ═══════════════════════════════════════════════════════════════
// calculateInteractionPoignancy
// ═══════════════════════════════════════════════════════════════

describe("calculateInteractionPoignancy", () => {
  it("공격적 댓글 수신 + 긴장 상태 → 높은 poignancy", () => {
    const result = calculateInteractionPoignancy(
      "comment_received_aggressive",
      makeState({ paradoxTension: 0.7, energy: 0.4 }),
      0.7,
      0.6, // moodBefore
      0.3 // moodAfter (기분 급락)
    )
    expect(result).toBeGreaterThan(0.2)
  })

  it("좋아요 수신 + 안정 상태 → 낮은 poignancy", () => {
    const result = calculateInteractionPoignancy(
      "like_received",
      makeState(),
      0.3,
      0.5, // moodBefore
      0.52 // moodAfter (미미한 변화)
    )
    expect(result).toBeLessThan(0.1)
  })

  it("역설 상황 → 매우 높은 poignancy", () => {
    const result = calculateInteractionPoignancy(
      "paradox_situation",
      makeState({ paradoxTension: 0.9, energy: 0.3, mood: 0.2 }),
      0.9,
      0.5,
      0.2
    )
    expect(result).toBeGreaterThan(0.3)
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("POIGNANCY_THRESHOLDS: core > significant > minimum", () => {
    expect(POIGNANCY_THRESHOLDS.core).toBeGreaterThan(POIGNANCY_THRESHOLDS.significant)
    expect(POIGNANCY_THRESHOLDS.significant).toBeGreaterThan(POIGNANCY_THRESHOLDS.minimum)
  })

  it("RAG_SEARCH_WEIGHTS 가중치 합 = 1.0", () => {
    const sum =
      RAG_SEARCH_WEIGHTS.recency + RAG_SEARCH_WEIGHTS.similarity + RAG_SEARCH_WEIGHTS.poignancy
    expect(sum).toBe(1.0)
  })
})
