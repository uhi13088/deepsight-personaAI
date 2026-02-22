import { describe, it, expect } from "vitest"
import {
  computeRapportScore,
  computeLexicalAlignment,
  computeBalanceScore,
  W_LEXICAL_ALIGNMENT,
  W_BALANCE_SCORE,
  W_WARMTH,
  MIN_INTERACTIONS,
} from "@/lib/persona-world/quality/rapport-score"

// ═══════════════════════════════════════════════════════════════
// computeLexicalAlignment — 어휘 유사도
// ═══════════════════════════════════════════════════════════════

describe("computeLexicalAlignment", () => {
  it("빈 발화 → 0", () => {
    expect(computeLexicalAlignment([], [])).toBe(0)
  })

  it("한쪽만 빈 발화 → 0", () => {
    expect(computeLexicalAlignment(["안녕하세요"], [])).toBe(0)
    expect(computeLexicalAlignment([], ["안녕하세요"])).toBe(0)
  })

  it("동일한 발화 → 높은 유사도", () => {
    const utterances = ["오늘 날씨가 정말 좋습니다"]
    const alignment = computeLexicalAlignment(utterances, utterances)
    expect(alignment).toBe(1.0)
  })

  it("완전히 다른 발화 → 낮은 유사도", () => {
    const a = ["프로그래밍에서 함수형 패턴이 중요합니다"]
    const b = ["오늘 저녁은 치킨을 먹을까요"]
    const alignment = computeLexicalAlignment(a, b)
    expect(alignment).toBeLessThan(0.3)
  })

  it("부분 겹침 → 중간 유사도", () => {
    const a = ["오늘 날씨가 좋습니다"]
    const b = ["오늘 기분이 좋습니다"]
    const alignment = computeLexicalAlignment(a, b)
    expect(alignment).toBeGreaterThan(0)
    expect(alignment).toBeLessThan(1)
  })

  it("유사도 범위 0~1", () => {
    const a = ["테스트 문장입니다"]
    const b = ["다른 테스트입니다"]
    const alignment = computeLexicalAlignment(a, b)
    expect(alignment).toBeGreaterThanOrEqual(0)
    expect(alignment).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeBalanceScore — 대화 균형
// ═══════════════════════════════════════════════════════════════

describe("computeBalanceScore", () => {
  it("양쪽 빈 발화 → 1.0 (균형)", () => {
    expect(computeBalanceScore([], [])).toBe(1.0)
  })

  it("한쪽만 발화 → 0 (불균형)", () => {
    expect(computeBalanceScore(["안녕하세요"], [])).toBe(0)
    expect(computeBalanceScore([], ["안녕하세요"])).toBe(0)
  })

  it("비슷한 길이 → 높은 균형", () => {
    const a = ["안녕하세요 좋은하루"]
    const b = ["반갑습니다 감사해요"]
    const balance = computeBalanceScore(a, b)
    expect(balance).toBeGreaterThan(0.8)
  })

  it("같은 길이 → 1.0 (완전 균형)", () => {
    const a = ["12345"]
    const b = ["abcde"]
    const balance = computeBalanceScore(a, b)
    expect(balance).toBe(1.0)
  })

  it("큰 차이 → 낮은 균형", () => {
    const a = ["짧"]
    const b = ["이것은 매우 길고 상세한 발화입니다 정말로 많은 내용이 담겨있습니다"]
    const balance = computeBalanceScore(a, b)
    expect(balance).toBeLessThan(0.2)
  })

  it("균형 범위 0~1", () => {
    const a = ["테스트"]
    const b = ["테스트 문장입니다"]
    const balance = computeBalanceScore(a, b)
    expect(balance).toBeGreaterThanOrEqual(0)
    expect(balance).toBeLessThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// computeRapportScore — 통합 계산
// ═══════════════════════════════════════════════════════════════

describe("computeRapportScore", () => {
  it("빈 발화 + warmth 0 → 낮은 점수", () => {
    const result = computeRapportScore({
      utterancesA: [],
      utterancesB: [],
      warmth: 0,
    })
    // lexical=0, balance=1.0, warmth=0 → W_BALANCE * 1.0 = 0.3
    expect(result.score).toBeCloseTo(W_BALANCE_SCORE, 2)
    expect(result.isActive).toBe(false)
  })

  it("동일 발화 + warmth 1.0 → 높은 점수", () => {
    const utterances = Array(5).fill("오늘 날씨가 정말 좋습니다 즐거운 하루 보내세요")
    const result = computeRapportScore({
      utterancesA: utterances,
      utterancesB: utterances,
      warmth: 1.0,
    })
    expect(result.score).toBeGreaterThan(0.8)
    expect(result.lexicalAlignment).toBe(1.0)
    expect(result.isActive).toBe(true)
  })

  it("isActive: MIN_INTERACTIONS 미만이면 false", () => {
    const result = computeRapportScore({
      utterancesA: ["짧은 발화"],
      utterancesB: ["짧은 발화"],
      warmth: 0.5,
    })
    expect(result.isActive).toBe(false)
  })

  it("isActive: MIN_INTERACTIONS 이상이면 true", () => {
    const utterances = Array(MIN_INTERACTIONS).fill("충분한 데이터")
    const result = computeRapportScore({
      utterancesA: utterances,
      utterancesB: utterances,
      warmth: 0.5,
    })
    expect(result.isActive).toBe(true)
  })

  it("score 범위 0~1", () => {
    const result = computeRapportScore({
      utterancesA: ["테스트 문장입니다"],
      utterancesB: ["다른 내용의 글입니다"],
      warmth: 0.5,
    })
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })

  it("warmth가 클수록 점수 증가", () => {
    const utterances = Array(5).fill("공통 발화 내용입니다")
    const low = computeRapportScore({
      utterancesA: utterances,
      utterancesB: utterances,
      warmth: 0.1,
    })
    const high = computeRapportScore({
      utterancesA: utterances,
      utterancesB: utterances,
      warmth: 0.9,
    })
    expect(high.score).toBeGreaterThan(low.score)
  })

  it("warmth 클램프 (0~1 범위 초과 입력)", () => {
    const result = computeRapportScore({
      utterancesA: ["테스트"],
      utterancesB: ["테스트"],
      warmth: 1.5,
    })
    expect(result.warmth).toBe(1.0)

    const resultNeg = computeRapportScore({
      utterancesA: ["테스트"],
      utterancesB: ["테스트"],
      warmth: -0.5,
    })
    expect(resultNeg.warmth).toBe(0)
  })

  it("결과 구조 검증", () => {
    const result = computeRapportScore({
      utterancesA: ["테스트"],
      utterancesB: ["테스트"],
      warmth: 0.5,
    })
    expect(result).toHaveProperty("score")
    expect(result).toHaveProperty("lexicalAlignment")
    expect(result).toHaveProperty("balanceScore")
    expect(result).toHaveProperty("warmth")
    expect(result).toHaveProperty("isActive")
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("가중치 합 = 1.0", () => {
    const sum = W_LEXICAL_ALIGNMENT + W_BALANCE_SCORE + W_WARMTH
    expect(sum).toBeCloseTo(1.0, 5)
  })

  it("MIN_INTERACTIONS > 0", () => {
    expect(MIN_INTERACTIONS).toBeGreaterThan(0)
  })

  it("모든 가중치 양수", () => {
    expect(W_LEXICAL_ALIGNMENT).toBeGreaterThan(0)
    expect(W_BALANCE_SCORE).toBeGreaterThan(0)
    expect(W_WARMTH).toBeGreaterThan(0)
  })
})
