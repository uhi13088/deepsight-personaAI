import { describe, it, expect } from "vitest"
import {
  buildDiversityConstraint,
  applyDiversityConstraint,
  type DiversityConstraintResult,
} from "@/lib/persona-world/quality/diversity-constraint"
import type { DiversityResult } from "@/lib/persona-world/quality/diversity-score"

// ── 헬퍼 ────────────────────────────────────────────────────

function makeDiversityResult(
  severity: DiversityResult["severity"],
  score = 0.5,
  topRepeatedTrigrams: Array<{ trigram: string; count: number }> = []
): DiversityResult {
  return {
    score,
    severity,
    selfRepetitionRate: 1 - score,
    uniqueTrigramCount: 10,
    totalTrigramCount: 20,
    topRepeatedTrigrams,
  }
}

const TOP_TRIGRAMS = [
  { trigram: "오늘도", count: 8 },
  { trigram: "열심히", count: 7 },
  { trigram: "살아가", count: 6 },
  { trigram: "최선을", count: 5 },
  { trigram: "성장해", count: 4 },
]

// ═══════════════════════════════════════════════════════════════
// buildDiversityConstraint
// ═══════════════════════════════════════════════════════════════

describe("buildDiversityConstraint", () => {
  // ── DIVERSE ────────────────────────────────────────────────

  it("DIVERSE → applied=false, constraint=null, level=NONE", () => {
    const result = buildDiversityConstraint(makeDiversityResult("DIVERSE", 0.8))
    expect(result.applied).toBe(false)
    expect(result.constraint).toBeNull()
    expect(result.level).toBe("NONE")
  })

  // ── WARNING ────────────────────────────────────────────────

  it("WARNING → applied=true, level=SOFT", () => {
    const result = buildDiversityConstraint(makeDiversityResult("WARNING", 0.5, TOP_TRIGRAMS))
    expect(result.applied).toBe(true)
    expect(result.level).toBe("SOFT")
  })

  it("WARNING → constraint에 '가급적' 포함", () => {
    const result = buildDiversityConstraint(makeDiversityResult("WARNING", 0.5, TOP_TRIGRAMS))
    expect(result.constraint).toContain("가급적")
  })

  it("WARNING → topRepeatedTrigrams Top5 패턴 포함", () => {
    const result = buildDiversityConstraint(makeDiversityResult("WARNING", 0.5, TOP_TRIGRAMS))
    expect(result.constraint).toContain("오늘도")
    expect(result.constraint).toContain("열심히")
  })

  it("WARNING + topRepeatedTrigrams 빈 배열 → constraint 생성 (패턴 없이)", () => {
    const result = buildDiversityConstraint(makeDiversityResult("WARNING", 0.55, []))
    expect(result.applied).toBe(true)
    expect(result.constraint).toBeTruthy()
    expect(result.constraint).not.toContain("반복 패턴 예시")
  })

  // ── CRITICAL ───────────────────────────────────────────────

  it("CRITICAL → applied=true, level=STRONG", () => {
    const result = buildDiversityConstraint(makeDiversityResult("CRITICAL", 0.25, TOP_TRIGRAMS))
    expect(result.applied).toBe(true)
    expect(result.level).toBe("STRONG")
  })

  it("CRITICAL → constraint에 '반드시' 포함", () => {
    const result = buildDiversityConstraint(makeDiversityResult("CRITICAL", 0.25, TOP_TRIGRAMS))
    expect(result.constraint).toContain("반드시")
  })

  it("CRITICAL → score 값이 constraint에 포함", () => {
    const result = buildDiversityConstraint(makeDiversityResult("CRITICAL", 0.28, TOP_TRIGRAMS))
    expect(result.constraint).toContain("0.28")
  })

  it("CRITICAL → topRepeatedTrigrams Top5까지만 포함 (6번째 없음)", () => {
    const sixTrigrams = [...TOP_TRIGRAMS, { trigram: "여섯번", count: 3 }]
    const result = buildDiversityConstraint(makeDiversityResult("CRITICAL", 0.25, sixTrigrams))
    expect(result.constraint).not.toContain("여섯번")
  })

  // ── 반환값 불변성 ──────────────────────────────────────────

  it("동일 입력 → 동일 결과 (순수 함수)", () => {
    const input = makeDiversityResult("CRITICAL", 0.3, TOP_TRIGRAMS)
    const r1 = buildDiversityConstraint(input)
    const r2 = buildDiversityConstraint(input)
    expect(r1).toEqual(r2)
  })
})

// ═══════════════════════════════════════════════════════════════
// applyDiversityConstraint
// ═══════════════════════════════════════════════════════════════

describe("applyDiversityConstraint", () => {
  const BASE_PROMPT = "당신은 소연입니다. 오늘의 포스트를 작성하세요."

  it("DIVERSE → 원본 프롬프트 그대로 반환", () => {
    const result = applyDiversityConstraint(BASE_PROMPT, makeDiversityResult("DIVERSE", 0.9))
    expect(result).toBe(BASE_PROMPT)
  })

  it("WARNING → 프롬프트에 constraint 블록 추가됨", () => {
    const result = applyDiversityConstraint(
      BASE_PROMPT,
      makeDiversityResult("WARNING", 0.5, TOP_TRIGRAMS)
    )
    expect(result).toContain(BASE_PROMPT)
    expect(result.length).toBeGreaterThan(BASE_PROMPT.length)
  })

  it("WARNING → 원본 프롬프트가 앞에 위치", () => {
    const result = applyDiversityConstraint(
      BASE_PROMPT,
      makeDiversityResult("WARNING", 0.5, TOP_TRIGRAMS)
    )
    expect(result.startsWith(BASE_PROMPT)).toBe(true)
  })

  it("CRITICAL → 프롬프트에 constraint 블록 추가됨", () => {
    const result = applyDiversityConstraint(
      BASE_PROMPT,
      makeDiversityResult("CRITICAL", 0.25, TOP_TRIGRAMS)
    )
    expect(result).toContain(BASE_PROMPT)
    expect(result).toContain("반드시")
  })

  it("빈 프롬프트 + CRITICAL → constraint만 반환", () => {
    const result = applyDiversityConstraint("", makeDiversityResult("CRITICAL", 0.2, TOP_TRIGRAMS))
    expect(result.trim().length).toBeGreaterThan(0)
  })

  it("WARNING과 CRITICAL의 constraint 강도 차이 존재", () => {
    const warning = applyDiversityConstraint(
      BASE_PROMPT,
      makeDiversityResult("WARNING", 0.5, TOP_TRIGRAMS)
    )
    const critical = applyDiversityConstraint(
      BASE_PROMPT,
      makeDiversityResult("CRITICAL", 0.2, TOP_TRIGRAMS)
    )
    expect(warning).not.toBe(critical)
  })
})
