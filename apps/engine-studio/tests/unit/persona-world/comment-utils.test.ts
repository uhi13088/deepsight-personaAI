import { describe, it, expect } from "vitest"
import {
  classifyTone,
  validateCommentContent,
  MAX_COMMENT_LENGTH,
} from "@/lib/persona-world/comment-utils"

// ── classifyTone ────────────────────────────────────────────────

describe("classifyTone", () => {
  it("direct_rebuttal 키워드를 감지한다", () => {
    expect(classifyTone("그건 완전 반대 의견인데")).toBe("direct_rebuttal")
    expect(classifyTone("그건 아니지 않나?")).toBe("direct_rebuttal")
  })

  it("soft_rebuttal 키워드를 감지한다", () => {
    expect(classifyTone("그런데 이건 좀 달라")).toBe("soft_rebuttal")
    expect(classifyTone("하지만 다른 시각도 있어")).toBe("soft_rebuttal")
  })

  it("deep_analysis 키워드를 감지한다", () => {
    expect(classifyTone("데이터를 보면 알 수 있어")).toBe("deep_analysis")
    expect(classifyTone("통계적으로 유의미한 결과")).toBe("deep_analysis")
  })

  it("empathetic 키워드를 감지한다", () => {
    expect(classifyTone("나도 그랬어 정말")).toBe("empathetic")
    expect(classifyTone("공감해 진짜")).toBe("empathetic")
  })

  it("light_reaction 키워드를 감지한다", () => {
    expect(classifyTone("ㅋㅋ 웃기다")).toBe("light_reaction")
    expect(classifyTone("진짜? 대박")).toBe("light_reaction")
  })

  it("intimate_joke 키워드를 감지한다", () => {
    // "ㅋㅋㅋㅋ"는 "ㅋㅋ"(light_reaction)에 먼저 매칭 → 고유 키워드로 테스트
    expect(classifyTone("너답다 진짜")).toBe("intimate_joke")
    expect(classifyTone("역시 대단해")).toBe("intimate_joke")
  })

  it("unique_perspective 키워드를 감지한다", () => {
    expect(classifyTone("다른 관점에서 보면")).toBe("unique_perspective")
    expect(classifyTone("흥미롭네요")).toBe("unique_perspective")
  })

  it("over_agreement 키워드를 감지한다", () => {
    // "맞아맞아"는 "맞아"(empathetic)에 먼저 매칭 → 고유 키워드로 테스트
    expect(classifyTone("그니까 동감이야")).toBe("over_agreement")
    expect(classifyTone("인정합니다")).toBe("over_agreement")
  })

  it("formal_analysis 키워드를 감지한다", () => {
    expect(classifyTone("정리하면 이렇습니다")).toBe("formal_analysis")
    expect(classifyTone("요약하면 핵심은")).toBe("formal_analysis")
  })

  it("paradox_response 키워드를 감지한다", () => {
    expect(classifyTone("솔직히 말하면")).toBe("paradox_response")
    expect(classifyTone("사실은 좀 달라")).toBe("paradox_response")
  })

  it("키워드 없으면 supportive를 반환한다", () => {
    expect(classifyTone("좋은 글이네요")).toBe("supportive")
    expect(classifyTone("응원합니다")).toBe("supportive")
    expect(classifyTone("")).toBe("supportive")
  })

  it("첫 번째 매칭 톤을 반환한다 (우선순위)", () => {
    // "반대"는 direct_rebuttal, "하지만"은 soft_rebuttal → direct_rebuttal이 먼저
    expect(classifyTone("반대 의견이지만 하지만 이해해")).toBe("direct_rebuttal")
  })
})

// ── validateCommentContent ──────────────────────────────────────

describe("validateCommentContent", () => {
  it("정상 댓글은 null을 반환한다", () => {
    expect(validateCommentContent("좋은 글이네요")).toBeNull()
  })

  it("null 입력 시 에러를 반환한다", () => {
    const error = validateCommentContent(null)
    expect(error).not.toBeNull()
    expect(error!.code).toBe("INVALID_REQUEST")
  })

  it("undefined 입력 시 에러를 반환한다", () => {
    const error = validateCommentContent(undefined)
    expect(error).not.toBeNull()
    expect(error!.code).toBe("INVALID_REQUEST")
  })

  it("빈 문자열 시 에러를 반환한다", () => {
    const error = validateCommentContent("")
    expect(error).not.toBeNull()
    expect(error!.code).toBe("INVALID_REQUEST")
  })

  it("공백만 있는 경우 에러를 반환한다", () => {
    const error = validateCommentContent("   ")
    expect(error).not.toBeNull()
    expect(error!.code).toBe("INVALID_REQUEST")
  })

  it(`${MAX_COMMENT_LENGTH}자 초과 시 CONTENT_TOO_LONG 에러`, () => {
    const longContent = "가".repeat(MAX_COMMENT_LENGTH + 1)
    const error = validateCommentContent(longContent)
    expect(error).not.toBeNull()
    expect(error!.code).toBe("CONTENT_TOO_LONG")
  })

  it(`${MAX_COMMENT_LENGTH}자 정확히는 통과한다`, () => {
    const exactContent = "가".repeat(MAX_COMMENT_LENGTH)
    expect(validateCommentContent(exactContent)).toBeNull()
  })

  it("1자 댓글은 통과한다", () => {
    expect(validateCommentContent("A")).toBeNull()
  })

  it("앞뒤 공백 제거 후 길이를 검사한다", () => {
    const padded = "  " + "가".repeat(MAX_COMMENT_LENGTH) + "  "
    // trim 후 1000자 → 통과
    expect(validateCommentContent(padded)).toBeNull()
  })
})

// ── MAX_COMMENT_LENGTH ──────────────────────────────────────────

describe("MAX_COMMENT_LENGTH", () => {
  it("1000으로 설정되어 있다", () => {
    expect(MAX_COMMENT_LENGTH).toBe(1000)
  })
})
