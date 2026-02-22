import { describe, it, expect } from "vitest"
import {
  classifyTone,
  classifyToneWithVectors,
  hasUserVectors,
  buildUserThreeLayerVector,
  validateCommentContent,
  MAX_COMMENT_LENGTH,
  type UserVectorData,
} from "@/lib/persona-world/comment-utils"
import { softThreshold, decideCommentTone } from "@/lib/persona-world/interactions/comment-tone"
import type { ThreeLayerVector } from "@/types/persona-v3"
import type { PersonaStateData, RelationshipScore } from "@/lib/persona-world/types"

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

// ── softThreshold ──────────────────────────────────────────────

describe("softThreshold", () => {
  it("값이 threshold를 크게 넘으면 ~1.0에 수렴한다 (>)", () => {
    expect(softThreshold(0.9, 0.5, ">")).toBeGreaterThan(0.95)
  })

  it("값이 threshold에 못 미치면 ~0.0에 수렴한다 (>)", () => {
    expect(softThreshold(0.1, 0.5, ">")).toBeLessThan(0.05)
  })

  it("값이 threshold와 같으면 ~0.5이다 (>)", () => {
    const score = softThreshold(0.5, 0.5, ">")
    expect(score).toBeGreaterThan(0.45)
    expect(score).toBeLessThan(0.55)
  })

  it("< 연산자에서 값이 threshold 미만이면 ~1.0이다", () => {
    expect(softThreshold(0.2, 0.5, "<")).toBeGreaterThan(0.95)
  })

  it("< 연산자에서 값이 threshold 초과이면 ~0.0이다", () => {
    expect(softThreshold(0.8, 0.5, "<")).toBeLessThan(0.05)
  })
})

// ── decideCommentTone ──────────────────────────────────────────

describe("decideCommentTone", () => {
  const baseVectors: ThreeLayerVector = {
    social: {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    },
    temperament: {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    },
    narrative: {
      lack: 0.5,
      moralCompass: 0.5,
      volatility: 0.5,
      growthArc: 0.5,
    },
  }

  const neutralState: PersonaStateData = {
    mood: 0.5,
    energy: 0.5,
    socialBattery: 0.5,
    paradoxTension: 0,
  }

  it("높은 paradoxTension → paradox_response 톤", () => {
    const highTensionState: PersonaStateData = {
      ...neutralState,
      paradoxTension: 0.85,
    }
    const decision = decideCommentTone(baseVectors, highTensionState, null, 0.8)
    expect(decision.tone).toBe("paradox_response")
    expect(decision.paradoxInfluence).toBe(true)
  })

  it("높은 sociability → light_reaction 톤", () => {
    const socialVectors: ThreeLayerVector = {
      ...baseVectors,
      social: { ...baseVectors.social, sociability: 0.85 },
    }
    const decision = decideCommentTone(socialVectors, neutralState, null, 0)
    expect(decision.tone).toBe("light_reaction")
  })

  it("높은 depth+purpose → deep_analysis 톤", () => {
    const deepVectors: ThreeLayerVector = {
      ...baseVectors,
      social: { ...baseVectors.social, depth: 0.85, purpose: 0.8 },
    }
    const decision = decideCommentTone(deepVectors, neutralState, null, 0)
    expect(decision.tone).toBe("deep_analysis")
  })

  it("높은 taste → unique_perspective 톤", () => {
    const tasteVectors: ThreeLayerVector = {
      ...baseVectors,
      social: { ...baseVectors.social, taste: 0.85 },
    }
    const decision = decideCommentTone(tasteVectors, neutralState, null, 0)
    expect(decision.tone).toBe("unique_perspective")
  })

  it("높은 agreeableness + 높은 mood → empathetic 톤", () => {
    const agreeableVectors: ThreeLayerVector = {
      ...baseVectors,
      temperament: { ...baseVectors.temperament, agreeableness: 0.85 },
    }
    const highMoodState: PersonaStateData = { ...neutralState, mood: 0.85 }
    const decision = decideCommentTone(agreeableVectors, highMoodState, null, 0)
    expect(decision.tone).toBe("empathetic")
  })

  it("RIVAL 관계(높은 tension) + 높은 stance → direct_rebuttal 톤", () => {
    const stanceVectors: ThreeLayerVector = {
      ...baseVectors,
      social: { ...baseVectors.social, stance: 0.85 },
    }
    const rivalRelation: RelationshipScore = {
      warmth: 0.2,
      tension: 0.8,
      frequency: 0.5,
      depth: 0,
      lastInteractionAt: new Date(),
    }
    const decision = decideCommentTone(stanceVectors, neutralState, rivalRelation, 0)
    expect(decision.tone).toBe("direct_rebuttal")
  })

  it("CLOSE 관계(높은 warmth) + 좋은 mood → intimate_joke 톤", () => {
    const closeRelation: RelationshipScore = {
      warmth: 0.85,
      tension: 0.1,
      frequency: 0.8,
      depth: 0,
      lastInteractionAt: new Date(),
    }
    const happyState: PersonaStateData = { ...neutralState, mood: 0.8 }
    const decision = decideCommentTone(baseVectors, happyState, closeRelation, 0)
    expect(decision.tone).toBe("intimate_joke")
  })

  it("모든 값이 중립이면 낮은 confidence 반환", () => {
    const decision = decideCommentTone(baseVectors, neutralState, null, 0)
    // 중립 벡터에서는 단일 조건 규칙이 soft scoring으로 일부 매칭 → 낮은 confidence
    expect(decision.confidence).toBeLessThan(0.5)
    expect(typeof decision.tone).toBe("string")
  })

  it("반환 구조: tone, confidence, reason, paradoxInfluence", () => {
    const decision = decideCommentTone(baseVectors, neutralState, null, 0)
    expect(decision).toHaveProperty("tone")
    expect(decision).toHaveProperty("confidence")
    expect(decision).toHaveProperty("reason")
    expect(decision).toHaveProperty("paradoxInfluence")
    expect(typeof decision.confidence).toBe("number")
    expect(decision.confidence).toBeGreaterThanOrEqual(0)
    expect(decision.confidence).toBeLessThanOrEqual(1)
  })

  it("커스텀 매트릭스를 주입할 수 있다 (DI)", () => {
    const customMatrix = [
      {
        tone: "light_reaction" as const,
        conditions: [
          {
            source: "commenter" as const,
            dimension: "depth",
            operator: ">" as const,
            threshold: 0.1,
          },
        ],
        weight: 2.0,
      },
    ]
    const decision = decideCommentTone(baseVectors, neutralState, null, 0, customMatrix)
    expect(decision.tone).toBe("light_reaction")
  })
})

// ── hasUserVectors ─────────────────────────────────────────────

describe("hasUserVectors", () => {
  it("L1 6D 중 3개 이상이면 true", () => {
    expect(hasUserVectors({ depth: 0.5, lens: 0.6, stance: 0.7 })).toBe(true)
  })

  it("L1 6D 중 2개만 있으면 false", () => {
    expect(hasUserVectors({ depth: 0.5, lens: 0.6 })).toBe(false)
  })

  it("모두 null이면 false", () => {
    expect(hasUserVectors({})).toBe(false)
  })

  it("6D 모두 있으면 true", () => {
    expect(
      hasUserVectors({
        depth: 0.5,
        lens: 0.5,
        stance: 0.5,
        scope: 0.5,
        taste: 0.5,
        purpose: 0.5,
      })
    ).toBe(true)
  })
})

// ── buildUserThreeLayerVector ──────────────────────────────────

describe("buildUserThreeLayerVector", () => {
  it("유저 벡터를 ThreeLayerVector로 변환한다", () => {
    const result = buildUserThreeLayerVector({
      depth: 0.8,
      lens: 0.3,
      stance: 0.9,
      scope: 0.2,
      taste: 0.7,
      purpose: 0.6,
      openness: 0.8,
      conscientiousness: 0.4,
      extraversion: 0.6,
      agreeableness: 0.7,
      neuroticism: 0.3,
    })
    expect(result.social.depth).toBe(0.8)
    expect(result.social.lens).toBe(0.3)
    expect(result.temperament.openness).toBe(0.8)
    expect(result.temperament.agreeableness).toBe(0.7)
    expect(result.social.sociability).toBe(0.6) // extraversion → sociability
  })

  it("null 차원은 0.5 기본값으로 채운다", () => {
    const result = buildUserThreeLayerVector({ depth: 0.8 })
    expect(result.social.depth).toBe(0.8)
    expect(result.social.lens).toBe(0.5) // null → 0.5
    expect(result.temperament.openness).toBe(0.5)
    expect(result.narrative.lack).toBe(0.5)
  })

  it("L3 narrative는 항상 0.5 중립값", () => {
    const result = buildUserThreeLayerVector({
      depth: 0.9,
      lens: 0.9,
      stance: 0.9,
      scope: 0.9,
      taste: 0.9,
      purpose: 0.9,
    })
    expect(result.narrative.lack).toBe(0.5)
    expect(result.narrative.moralCompass).toBe(0.5)
    expect(result.narrative.volatility).toBe(0.5)
    expect(result.narrative.growthArc).toBe(0.5)
  })
})

// ── classifyToneWithVectors ────────────────────────────────────

describe("classifyToneWithVectors", () => {
  it("벡터가 없으면 키워드 기반 fallback을 사용한다", () => {
    expect(classifyToneWithVectors("반대 의견입니다", null)).toBe("direct_rebuttal")
    expect(classifyToneWithVectors("좋은 글이네요", null)).toBe("supportive")
  })

  it("벡터가 부족하면 (3개 미만) 키워드 fallback", () => {
    const sparse: UserVectorData = { depth: 0.8 }
    expect(classifyToneWithVectors("좋은 글이네요", sparse)).toBe("supportive")
  })

  it("벡터가 충분하면 벡터 기반 톤을 반환한다", () => {
    const highDepthPurpose: UserVectorData = {
      depth: 0.9,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.85,
    }
    const tone = classifyToneWithVectors("일반적인 댓글입니다", highDepthPurpose)
    expect(tone).toBe("deep_analysis")
  })

  it("높은 sociability 벡터 → light_reaction", () => {
    const socialUser: UserVectorData = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      extraversion: 0.9,
    }
    const tone = classifyToneWithVectors("일반적인 댓글", socialUser)
    expect(tone).toBe("light_reaction")
  })
})
