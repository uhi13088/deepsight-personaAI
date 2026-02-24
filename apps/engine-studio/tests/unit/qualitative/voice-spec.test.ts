import { describe, it, expect } from "vitest"
import {
  generateGuardrails,
  generateAdaptations,
  applyAdaptations,
  checkGuardrailViolations,
  checkToneBoundaries,
  buildVoiceSpec,
  summarizeVoiceSpec,
  computeVoiceStyleParams,
  DEFAULT_CONSISTENCY_CONFIG,
} from "@/lib/qualitative/voice-spec"
import type {
  VoiceProfile,
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
} from "@/types"
import type { VoiceStyleParams, PersonaStateData } from "@/lib/persona-world/types"
import {
  FORMAL_L1 as formalL1,
  INTROVERT_L2 as introvertL2,
  STABLE_L3 as stableL3,
  CASUAL_L1 as casualL1,
  EXTROVERT_L2 as extrovertL2,
  VOLATILE_L3 as volatileL3,
} from "../fixtures"

// ── 테스트 데이터 ────────────────────────────────────────────

const baseProfile: VoiceProfile = {
  speechStyle: "정제된 학술적 어투",
  habitualExpressions: ["구조적으로 보면...", "핵심은 이거야."],
  physicalMannerisms: ["감상 노트를 체계적으로 정리한다"],
  unconsciousBehaviors: ["감상 후 며칠이 지나서야 진짜 의견이 형성된다"],
  activationThresholds: { anger: 0.5, joy: 0.6, sadness: 0.4 },
}

const baseStyleParams: VoiceStyleParams = {
  formality: 0.7,
  humor: 0.3,
  sentenceLength: 0.6,
  emotionExpression: 0.3,
  assertiveness: 0.35,
  vocabularyLevel: 0.7,
}

// ═══════════════════════════════════════════════════════════════
// generateGuardrails
// ═══════════════════════════════════════════════════════════════

describe("generateGuardrails", () => {
  it("격식적 페르소나 → 속어 패턴 금지", () => {
    const guardrails = generateGuardrails(formalL1, introvertL2, stableL3)
    expect(guardrails.forbiddenPatterns.length).toBeGreaterThan(0)
    expect(guardrails.forbiddenPatterns).toContain("ㅋㅋ")
  })

  it("캐주얼 페르소나 → 속어 패턴 없음", () => {
    const guardrails = generateGuardrails(casualL1, extrovertL2, volatileL3)
    expect(guardrails.forbiddenPatterns).not.toContain("ㅋㅋ")
  })

  it("내향적 → 과도한 감탄 금지", () => {
    const guardrails = generateGuardrails(formalL1, introvertL2, stableL3)
    expect(guardrails.forbiddenPatterns).toContain("!!!")
  })

  it("분석적 (depth 높음) → 근거 없는 단정 금지", () => {
    const guardrails = generateGuardrails(formalL1, introvertL2, stableL3)
    expect(guardrails.forbiddenBehaviors).toContain("근거 없는 단정적 표현")
  })

  it("친화적 → 인신공격 금지", () => {
    const guardrails = generateGuardrails(formalL1, introvertL2, stableL3)
    expect(guardrails.forbiddenBehaviors).toContain("직접적인 인신공격")
  })

  it("도덕적 → 비윤리 옹호 금지", () => {
    const guardrails = generateGuardrails(formalL1, introvertL2, stableL3)
    expect(guardrails.forbiddenBehaviors).toContain("비윤리적 행위 옹호")
  })

  it("톤 경계 포함", () => {
    const guardrails = generateGuardrails(formalL1, introvertL2, stableL3)
    expect(guardrails.toneBoundaries.maxFormality).toBeGreaterThan(0)
    expect(guardrails.toneBoundaries.minFormality).toBeLessThan(1)
    expect(guardrails.toneBoundaries.maxAggression).toBeGreaterThan(0)
  })

  it("친화적 페르소나 → 낮은 공격성 상한", () => {
    const guardrails = generateGuardrails(formalL1, introvertL2, stableL3)
    expect(guardrails.toneBoundaries.maxAggression).toBeLessThanOrEqual(0.5)
  })
})

// ═══════════════════════════════════════════════════════════════
// generateAdaptations
// ═══════════════════════════════════════════════════════════════

describe("generateAdaptations", () => {
  it("기본 적응 규칙 3개 이상", () => {
    const adaptations = generateAdaptations(introvertL2, stableL3)
    expect(adaptations.length).toBeGreaterThanOrEqual(3)
  })

  it("기분 저조 적응 포함", () => {
    const adaptations = generateAdaptations(introvertL2, stableL3)
    const moodAdapt = adaptations.find(
      (a) => a.condition.field === "mood" && a.condition.op === "<"
    )
    expect(moodAdapt).toBeDefined()
  })

  it("에너지 부족 적응 포함", () => {
    const adaptations = generateAdaptations(introvertL2, stableL3)
    const energyAdapt = adaptations.find((a) => a.condition.field === "energy")
    expect(energyAdapt).toBeDefined()
  })

  it("사회적 배터리 적응 포함", () => {
    const adaptations = generateAdaptations(introvertL2, stableL3)
    const socialAdapt = adaptations.find((a) => a.condition.field === "socialBattery")
    expect(socialAdapt).toBeDefined()
  })

  it("변동성 높은 L3 → paradoxTension 적응 포함", () => {
    const adaptations = generateAdaptations(extrovertL2, volatileL3)
    const paradoxAdapt = adaptations.find((a) => a.condition.field === "paradoxTension")
    expect(paradoxAdapt).toBeDefined()
  })

  it("변동성 낮은 L3 → paradoxTension 적응 없음", () => {
    const adaptations = generateAdaptations(introvertL2, stableL3)
    const paradoxAdapt = adaptations.find((a) => a.condition.field === "paradoxTension")
    expect(paradoxAdapt).toBeUndefined()
  })

  it("신경성 낮으면 기분 좋을 때 유머 적응 포함", () => {
    const adaptations = generateAdaptations(introvertL2, stableL3)
    const humorAdapt = adaptations.find(
      (a) => a.condition.field === "mood" && a.condition.op === ">"
    )
    expect(humorAdapt).toBeDefined()
  })
})

// ═══════════════════════════════════════════════════════════════
// applyAdaptations
// ═══════════════════════════════════════════════════════════════

describe("applyAdaptations", () => {
  it("정상 상태 → 변경 없음", () => {
    const state: PersonaStateData = {
      mood: 0.5,
      energy: 0.5,
      socialBattery: 0.5,
      paradoxTension: 0.3,
    }
    const adaptations = generateAdaptations(introvertL2, stableL3)
    const result = applyAdaptations(baseStyleParams, state, adaptations)
    expect(result.formality).toBe(baseStyleParams.formality)
    expect(result.humor).toBe(baseStyleParams.humor)
  })

  it("기분 저조 → 감정 표현 증가", () => {
    const state: PersonaStateData = {
      mood: 0.2,
      energy: 0.5,
      socialBattery: 0.5,
      paradoxTension: 0.3,
    }
    const adaptations = generateAdaptations(introvertL2, stableL3)
    const result = applyAdaptations(baseStyleParams, state, adaptations)
    expect(result.emotionExpression).toBeGreaterThan(baseStyleParams.emotionExpression)
  })

  it("에너지 부족 → 문장 짧아짐", () => {
    const state: PersonaStateData = {
      mood: 0.5,
      energy: 0.15,
      socialBattery: 0.5,
      paradoxTension: 0.3,
    }
    const adaptations = generateAdaptations(introvertL2, stableL3)
    const result = applyAdaptations(baseStyleParams, state, adaptations)
    expect(result.sentenceLength).toBeLessThan(baseStyleParams.sentenceLength)
  })

  it("사회적 배터리 방전 → 격식 증가", () => {
    const state: PersonaStateData = {
      mood: 0.5,
      energy: 0.5,
      socialBattery: 0.1,
      paradoxTension: 0.3,
    }
    const adaptations = generateAdaptations(introvertL2, stableL3)
    const result = applyAdaptations(baseStyleParams, state, adaptations)
    expect(result.formality).toBeGreaterThan(baseStyleParams.formality)
  })

  it("결과값 0~1 범위 유지", () => {
    const state: PersonaStateData = {
      mood: 0.1,
      energy: 0.1,
      socialBattery: 0.1,
      paradoxTension: 0.9,
    }
    const adaptations = generateAdaptations(extrovertL2, volatileL3)
    const result = applyAdaptations(baseStyleParams, state, adaptations)
    for (const val of Object.values(result)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(1)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// checkGuardrailViolations
// ═══════════════════════════════════════════════════════════════

describe("checkGuardrailViolations", () => {
  const guardrails = generateGuardrails(formalL1, introvertL2, stableL3)

  it("정상 텍스트 → 위반 없음", () => {
    const violations = checkGuardrailViolations("이 영화의 서사 구조가 인상적입니다", guardrails)
    expect(violations).toHaveLength(0)
  })

  it("금지 패턴 포함 → 위반 감지", () => {
    const violations = checkGuardrailViolations("ㅋㅋ 재밌었음", guardrails)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0]).toContain("ㅋㅋ")
  })

  it("복수 패턴 위반", () => {
    const violations = checkGuardrailViolations("ㅋㅋ 대박!!! 미쳤다!", guardrails)
    expect(violations.length).toBeGreaterThanOrEqual(2)
  })
})

// ═══════════════════════════════════════════════════════════════
// checkToneBoundaries
// ═══════════════════════════════════════════════════════════════

describe("checkToneBoundaries", () => {
  const guardrails = generateGuardrails(formalL1, introvertL2, stableL3)

  it("범위 내 → 위반 없음", () => {
    const violations = checkToneBoundaries(baseStyleParams, guardrails)
    expect(violations).toHaveLength(0)
  })

  it("격식도 상한 초과 → 위반", () => {
    const params = { ...baseStyleParams, formality: 0.99 }
    const violations = checkToneBoundaries(params, guardrails)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0]).toContain("격식도 상한")
  })

  it("격식도 하한 미달 → 위반", () => {
    const params = { ...baseStyleParams, formality: 0.01 }
    const violations = checkToneBoundaries(params, guardrails)
    expect(violations.length).toBeGreaterThan(0)
    expect(violations[0]).toContain("격식도 하한")
  })
})

// ═══════════════════════════════════════════════════════════════
// buildVoiceSpec
// ═══════════════════════════════════════════════════════════════

describe("buildVoiceSpec", () => {
  it("전체 VoiceSpec 생성", () => {
    const spec = buildVoiceSpec(baseProfile, baseStyleParams, formalL1, introvertL2, stableL3)
    expect(spec.profile).toBe(baseProfile)
    expect(spec.styleParams).toBe(baseStyleParams)
    expect(spec.guardrails).toBeDefined()
    expect(spec.adaptations.length).toBeGreaterThan(0)
    expect(spec.consistency).toEqual(DEFAULT_CONSISTENCY_CONFIG)
    expect(spec.createdAt).toBeGreaterThan(0)
  })

  it("guardrails 포함", () => {
    const spec = buildVoiceSpec(baseProfile, baseStyleParams, formalL1, introvertL2, stableL3)
    expect(spec.guardrails.forbiddenPatterns.length).toBeGreaterThan(0)
    expect(spec.guardrails.toneBoundaries).toBeDefined()
  })

  it("adaptations 포함", () => {
    const spec = buildVoiceSpec(baseProfile, baseStyleParams, formalL1, introvertL2, stableL3)
    expect(spec.adaptations.length).toBeGreaterThanOrEqual(3)
  })
})

// ═══════════════════════════════════════════════════════════════
// summarizeVoiceSpec
// ═══════════════════════════════════════════════════════════════

describe("summarizeVoiceSpec", () => {
  it("말투 포함", () => {
    const spec = buildVoiceSpec(baseProfile, baseStyleParams, formalL1, introvertL2, stableL3)
    const summary = summarizeVoiceSpec(spec)
    expect(summary).toContain("[말투]")
    expect(summary).toContain(baseProfile.speechStyle)
  })

  it("습관적 표현 포함", () => {
    const spec = buildVoiceSpec(baseProfile, baseStyleParams, formalL1, introvertL2, stableL3)
    const summary = summarizeVoiceSpec(spec)
    expect(summary).toContain("[습관적 표현]")
  })

  it("극단 스타일 표시", () => {
    const extremeParams: VoiceStyleParams = {
      ...baseStyleParams,
      formality: 0.9,
      humor: 0.1,
    }
    const spec = buildVoiceSpec(baseProfile, extremeParams, formalL1, introvertL2, stableL3)
    const summary = summarizeVoiceSpec(spec)
    expect(summary).toContain("격식적")
    expect(summary).toContain("진지함")
  })

  it("금지 행동 포함", () => {
    const spec = buildVoiceSpec(baseProfile, baseStyleParams, formalL1, introvertL2, stableL3)
    const summary = summarizeVoiceSpec(spec)
    expect(summary).toContain("[금지]")
  })
})

// ═══════════════════════════════════════════════════════════════
// computeVoiceStyleParams
// ═══════════════════════════════════════════════════════════════

describe("computeVoiceStyleParams", () => {
  it("모든 6개 파라미터 생성", () => {
    const params = computeVoiceStyleParams(formalL1, introvertL2, stableL3)
    expect(params.formality).toBeDefined()
    expect(params.humor).toBeDefined()
    expect(params.sentenceLength).toBeDefined()
    expect(params.emotionExpression).toBeDefined()
    expect(params.assertiveness).toBeDefined()
    expect(params.vocabularyLevel).toBeDefined()
  })

  it("모든 값 0~1 범위", () => {
    const params = computeVoiceStyleParams(formalL1, introvertL2, stableL3)
    for (const val of Object.values(params)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(1)
    }
  })

  it("격식적 벡터 → 높은 formality", () => {
    const formal = computeVoiceStyleParams(formalL1, introvertL2, stableL3)
    const casual = computeVoiceStyleParams(casualL1, extrovertL2, volatileL3)
    expect(formal.formality).toBeGreaterThan(casual.formality)
  })

  it("외향적 벡터 → 높은 humor", () => {
    const introvert = computeVoiceStyleParams(formalL1, introvertL2, stableL3)
    const extrovert = computeVoiceStyleParams(casualL1, extrovertL2, volatileL3)
    expect(extrovert.humor).toBeGreaterThan(introvert.humor)
  })

  it("깊이 높은 벡터 → 높은 vocabularyLevel", () => {
    const deep = computeVoiceStyleParams(formalL1, introvertL2, stableL3)
    const shallow = computeVoiceStyleParams(casualL1, extrovertL2, volatileL3)
    expect(deep.vocabularyLevel).toBeGreaterThan(shallow.vocabularyLevel)
  })

  it("stance 높은 벡터 → 높은 assertiveness", () => {
    const highStance: SocialPersonaVector = { ...formalL1, stance: 0.9 }
    const lowStance: SocialPersonaVector = { ...casualL1, stance: 0.1 }
    const high = computeVoiceStyleParams(highStance, introvertL2, stableL3)
    const low = computeVoiceStyleParams(lowStance, introvertL2, stableL3)
    expect(high.assertiveness).toBeGreaterThan(low.assertiveness)
  })

  it("극단 벡터에서도 범위 유지", () => {
    const extremeL1: SocialPersonaVector = {
      depth: 1,
      lens: 1,
      stance: 1,
      scope: 1,
      taste: 1,
      purpose: 1,
      sociability: 1,
    }
    const extremeL2: CoreTemperamentVector = {
      openness: 1,
      conscientiousness: 1,
      extraversion: 1,
      agreeableness: 1,
      neuroticism: 1,
    }
    const extremeL3: NarrativeDriveVector = {
      lack: 1,
      moralCompass: 1,
      volatility: 1,
      growthArc: 1,
    }
    const params = computeVoiceStyleParams(extremeL1, extremeL2, extremeL3)
    for (const val of Object.values(params)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(1)
    }
  })

  it("제로 벡터에서도 범위 유지", () => {
    const zeroL1: SocialPersonaVector = {
      depth: 0,
      lens: 0,
      stance: 0,
      scope: 0,
      taste: 0,
      purpose: 0,
      sociability: 0,
    }
    const zeroL2: CoreTemperamentVector = {
      openness: 0,
      conscientiousness: 0,
      extraversion: 0,
      agreeableness: 0,
      neuroticism: 0,
    }
    const zeroL3: NarrativeDriveVector = {
      lack: 0,
      moralCompass: 0,
      volatility: 0,
      growthArc: 0,
    }
    const params = computeVoiceStyleParams(zeroL1, zeroL2, zeroL3)
    for (const val of Object.values(params)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(1)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// 상수 검증
// ═══════════════════════════════════════════════════════════════

describe("상수 검증", () => {
  it("DEFAULT_CONSISTENCY_CONFIG 임계값 유효", () => {
    expect(DEFAULT_CONSISTENCY_CONFIG.warningThreshold).toBeGreaterThan(
      DEFAULT_CONSISTENCY_CONFIG.criticalThreshold
    )
    expect(DEFAULT_CONSISTENCY_CONFIG.checkWindowTokens).toBeGreaterThan(0)
  })
})
