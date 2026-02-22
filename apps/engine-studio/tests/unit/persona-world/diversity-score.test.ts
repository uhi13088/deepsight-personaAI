import { describe, it, expect } from "vitest"
import {
  measureDiversity,
  classifyDiversitySeverity,
  extractTrigrams,
  summarizeDiversity,
  DIVERSITY_WARNING_THRESHOLD,
  DIVERSITY_CRITICAL_THRESHOLD,
} from "@/lib/persona-world/quality/diversity-score"

// ═══════════════════════════════════════════════════════════════
// extractTrigrams
// ═══════════════════════════════════════════════════════════════

describe("extractTrigrams", () => {
  it("빈 문자열 → 빈 배열", () => {
    expect(extractTrigrams("")).toEqual([])
  })

  it("2글자 → 빈 배열 (trigram 불가)", () => {
    expect(extractTrigrams("ab")).toEqual([])
  })

  it("3글자 → 1개 trigram", () => {
    const result = extractTrigrams("abc")
    expect(result).toEqual(["abc"])
  })

  it("한국어 trigram 추출", () => {
    const result = extractTrigrams("안녕하세요")
    expect(result.length).toBe(3) // 안녕하, 녕하세, 하세요
    expect(result[0]).toBe("안녕하")
  })

  it("공백/구두점 제거 후 추출", () => {
    const result = extractTrigrams("a b c, d!")
    // 정리 후: "abcd" → trigram: abc, bcd
    expect(result).toEqual(["abc", "bcd"])
  })

  it("대문자 → 소문자 변환", () => {
    const result = extractTrigrams("ABC")
    expect(result).toEqual(["abc"])
  })
})

// ═══════════════════════════════════════════════════════════════
// measureDiversity
// ═══════════════════════════════════════════════════════════════

describe("measureDiversity", () => {
  it("빈 배열 → score 1.0, DIVERSE", () => {
    const result = measureDiversity([])
    expect(result.score).toBe(1.0)
    expect(result.severity).toBe("DIVERSE")
    expect(result.selfRepetitionRate).toBe(0)
  })

  it("완전히 다른 콘텐츠 → 높은 score", () => {
    const contents = [
      "오늘은 날씨가 정말 좋습니다",
      "프로그래밍에서 함수형 패턴이 중요합니다",
      "최근 본 영화가 정말 감동적이었습니다",
    ]
    const result = measureDiversity(contents)
    expect(result.score).toBeGreaterThan(0.5)
    expect(result.severity).toBe("DIVERSE")
  })

  it("동일한 콘텐츠 반복 → 낮은 score", () => {
    const sameContent = "오늘도 좋은 하루 보내세요"
    const contents = Array(10).fill(sameContent)
    const result = measureDiversity(contents)
    expect(result.selfRepetitionRate).toBeGreaterThan(0.5)
    expect(result.score).toBeLessThan(0.5)
  })

  it("topRepeatedTrigrams 포함", () => {
    const contents = ["안녕하세요 반갑습니다", "안녕하세요 좋은하루", "안녕하세요 잘지내세요"]
    const result = measureDiversity(contents)
    expect(result.topRepeatedTrigrams.length).toBeGreaterThan(0)
    // "안녕하"가 3번 반복
    const hasCommonTrigram = result.topRepeatedTrigrams.some((t) => t.count >= 3)
    expect(hasCommonTrigram).toBe(true)
  })

  it("score 범위 0~1", () => {
    const contents = ["테스트 콘텐츠입니다", "다른 내용의 글"]
    const result = measureDiversity(contents)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })

  it("uniqueTrigramCount <= totalTrigramCount", () => {
    const contents = ["반복 테스트 문장입니다", "반복 테스트 문장입니다"]
    const result = measureDiversity(contents)
    expect(result.uniqueTrigramCount).toBeLessThanOrEqual(result.totalTrigramCount)
  })
})

// ═══════════════════════════════════════════════════════════════
// classifyDiversitySeverity
// ═══════════════════════════════════════════════════════════════

describe("classifyDiversitySeverity", () => {
  it("0.7 → DIVERSE", () => {
    expect(classifyDiversitySeverity(0.7)).toBe("DIVERSE")
  })

  it("0.5 → WARNING", () => {
    expect(classifyDiversitySeverity(0.5)).toBe("WARNING")
  })

  it("0.3 → CRITICAL", () => {
    expect(classifyDiversitySeverity(0.3)).toBe("CRITICAL")
  })

  it("1.0 → DIVERSE", () => {
    expect(classifyDiversitySeverity(1.0)).toBe("DIVERSE")
  })

  it("0.0 → CRITICAL", () => {
    expect(classifyDiversitySeverity(0.0)).toBe("CRITICAL")
  })
})

// ═══════════════════════════════════════════════════════════════
// summarizeDiversity
// ═══════════════════════════════════════════════════════════════

describe("summarizeDiversity", () => {
  it("DIVERSE → 양호 메시지", () => {
    const result = measureDiversity([
      "각각 완전히 다른 내용의 글입니다",
      "프로그래밍에 대해 이야기합니다",
    ])
    const summary = summarizeDiversity(result)
    expect(summary).toContain("양호")
  })

  it("낮은 다양성 → 반복률 포함", () => {
    const sameContent = "매일 같은 말만 반복합니다"
    const result = measureDiversity(Array(10).fill(sameContent))
    const summary = summarizeDiversity(result)
    expect(summary).toContain("반복률")
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("CRITICAL < WARNING", () => {
    expect(DIVERSITY_CRITICAL_THRESHOLD).toBeLessThan(DIVERSITY_WARNING_THRESHOLD)
  })

  it("임계값 합리적 범위 (0~1)", () => {
    expect(DIVERSITY_CRITICAL_THRESHOLD).toBeGreaterThan(0)
    expect(DIVERSITY_WARNING_THRESHOLD).toBeLessThan(1)
  })
})
