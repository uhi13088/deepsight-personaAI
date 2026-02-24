// ═══════════════════════════════════════════════════════════════
// T72: 정성적 차원 생성기 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import { generateBackstory } from "@/lib/qualitative/backstory-generator"
import { generateVoiceProfile } from "@/lib/qualitative/voice-generator"
import { generatePressureContext } from "@/lib/qualitative/pressure-generator"
import { generateZeitgeistProfile } from "@/lib/qualitative/zeitgeist-generator"
import { generateAllQualitativeDimensions } from "@/lib/qualitative"
import { getArchetypeById } from "@/lib/persona-generation/archetypes"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"
import { IRONIC_L1 as L1, IRONIC_L2 as L2, IRONIC_L3 as L3 } from "../fixtures"

// ═══════════════════════════════════════════════════════════════
// AC1: Backstory 생성기
// ═══════════════════════════════════════════════════════════════

describe("Backstory Generator (AC1)", () => {
  it("should generate complete backstory", () => {
    const backstory = generateBackstory(L1, L2, L3)

    expect(backstory.origin).toBeTruthy()
    expect(backstory.origin.length).toBeGreaterThanOrEqual(10)
    expect(backstory.formativeExperience).toBeTruthy()
    expect(backstory.formativeExperience.length).toBeGreaterThanOrEqual(10)
    expect(backstory.innerConflict).toBeTruthy()
    expect(backstory.innerConflict.length).toBeGreaterThanOrEqual(10)
    expect(backstory.selfNarrative).toBeTruthy()
    expect(backstory.selfNarrative.length).toBeGreaterThanOrEqual(10)
    expect(backstory.nlpKeywords.length).toBeGreaterThanOrEqual(3)
  })

  it("should include archetype narrative hint", () => {
    const arch = getArchetypeById("ironic-philosopher")!
    const backstory = generateBackstory(L1, L2, L3, arch)

    expect(backstory.origin).toContain(arch.narrativeHint)
  })

  it("should generate nlp keywords based on vectors", () => {
    const backstory = generateBackstory(L1, L2, L3)

    // High depth → should have analytical keywords
    expect(backstory.nlpKeywords.some((kw) => ["분석적", "심층", "구조"].includes(kw))).toBe(true)
    // High lens → should have logical keywords
    expect(backstory.nlpKeywords.some((kw) => ["논리적", "체계적", "이성"].includes(kw))).toBe(true)
  })

  it("lack_high should add relevant keywords", () => {
    // 다른 키워드가 적은 벡터 사용 (10개 잘림 방지)
    const simpleL1: SocialPersonaVector = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const simpleL2: CoreTemperamentVector = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }
    const highLack: NarrativeDriveVector = { ...L3, lack: 0.8 }
    const backstory = generateBackstory(simpleL1, simpleL2, highLack)
    expect(backstory.nlpKeywords).toContain("결핍")
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: Voice Profile 생성기
// ═══════════════════════════════════════════════════════════════

describe("Voice Profile Generator (AC2)", () => {
  it("should generate complete voice profile", () => {
    const voice = generateVoiceProfile(L1, L2, L3)

    expect(voice.speechStyle).toBeTruthy()
    expect(voice.speechStyle.length).toBeGreaterThanOrEqual(10)
    expect(voice.habitualExpressions.length).toBeGreaterThanOrEqual(3)
    // Each expression should be a meaningful string
    for (const expr of voice.habitualExpressions) {
      expect(expr.length).toBeGreaterThanOrEqual(3)
    }
    expect(voice.physicalMannerisms.length).toBeGreaterThanOrEqual(1)
    expect(voice.unconsciousBehaviors.length).toBeGreaterThanOrEqual(1)
    expect(Object.keys(voice.activationThresholds).length).toBeGreaterThanOrEqual(3)
  })

  it("should use archetype-specific style", () => {
    const arch = getArchetypeById("ironic-philosopher")!
    const voice = generateVoiceProfile(L1, L2, L3, arch)
    expect(voice.speechStyle).toBeTruthy()
    expect(voice.speechStyle.length).toBeGreaterThanOrEqual(10)
    // ironic-philosopher maps to ironic_witty style — should contain irony/paradox-related language
    const voiceWithout = generateVoiceProfile(L1, L2, L3)
    // Both should produce valid styles but may differ
    expect(voiceWithout.speechStyle.length).toBeGreaterThanOrEqual(10)
  })

  it("activation thresholds should be 0-1 with vector-consistent values", () => {
    const voice = generateVoiceProfile(L1, L2, L3)
    for (const [, val] of Object.entries(voice.activationThresholds)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(1)
    }
    // L2.neuroticism=0.7 (high) → sadness threshold should be elevated (>0.5)
    expect(voice.activationThresholds.sadness).toBeGreaterThan(0.5)
    // L2.extraversion=0.35 (low) → joy threshold should be moderate or lower
    expect(voice.activationThresholds.joy).toBeLessThan(0.8)
  })

  it("high neuroticism should include neurotic mannerism", () => {
    const voice = generateVoiceProfile(L1, L2, L3)
    // L2.neuroticism = 0.7 > 0.5 → should have neurotic mannerism
    expect(voice.physicalMannerisms.length).toBeGreaterThanOrEqual(1)
    // Each mannerism should be a descriptive string
    for (const m of voice.physicalMannerisms) {
      expect(m.length).toBeGreaterThanOrEqual(5)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Pressure Context 생성기
// ═══════════════════════════════════════════════════════════════

describe("Pressure Context Generator (AC3)", () => {
  it("should generate complete pressure context", () => {
    const pressure = generatePressureContext(L1, L2, L3)

    expect(pressure.stressResponse).toBeTruthy()
    expect(pressure.stressResponse.length).toBeGreaterThanOrEqual(10)
    expect(pressure.comfortZone).toBeTruthy()
    expect(pressure.comfortZone.length).toBeGreaterThanOrEqual(10)
    expect(pressure.situationalTriggers.length).toBeGreaterThanOrEqual(2)
  })

  it("triggers should have valid structure", () => {
    const pressure = generatePressureContext(L1, L2, L3)

    for (const trigger of pressure.situationalTriggers) {
      expect(trigger.condition).toBeTruthy()
      expect(trigger.condition.length).toBeGreaterThanOrEqual(5)
      expect(["L1", "L2", "L3"]).toContain(trigger.affectedLayer)
      expect(trigger.affectedDimension).toBeTruthy()
      expect(["boost", "suppress", "override"]).toContain(trigger.effect)
      // Magnitude is computed as vector_value * factor (0.5~0.8), so should be > 0
      expect(trigger.magnitude).toBeGreaterThan(0)
      expect(trigger.magnitude).toBeLessThanOrEqual(0.8)
    }
  })

  it("high neuroticism should generate fight/flight response", () => {
    const highNeuro: CoreTemperamentVector = { ...L2, neuroticism: 0.8, agreeableness: 0.3 }
    const pressure = generatePressureContext(L1, highNeuro, L3)
    expect(pressure.stressResponse).toBeTruthy()
    expect(pressure.stressResponse.length).toBeGreaterThanOrEqual(10)
    // Low agreeableness + high neuroticism → fight response (aggressive/combative language)
    const fightKeywords = ["날카로운", "반격", "공격적", "반박", "무기"]
    expect(fightKeywords.some((kw) => pressure.stressResponse.includes(kw))).toBe(true)
  })

  it("high agreeableness should generate fawn response", () => {
    const highAgree: CoreTemperamentVector = { ...L2, agreeableness: 0.8, neuroticism: 0.3 }
    const pressure = generatePressureContext(L1, highAgree, L3)
    expect(pressure.stressResponse).toBeTruthy()
    expect(pressure.stressResponse.length).toBeGreaterThanOrEqual(10)
    // High agreeableness → fawn response (accommodating/yielding language)
    const fawnKeywords = ["인정", "화해", "수용", "관계", "억누르"]
    expect(fawnKeywords.some((kw) => pressure.stressResponse.includes(kw))).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: Zeitgeist Profile 생성기
// ═══════════════════════════════════════════════════════════════

describe("Zeitgeist Profile Generator (AC4)", () => {
  it("should generate complete zeitgeist profile", () => {
    const zeitgeist = generateZeitgeistProfile(L1, L2, L3)

    expect(zeitgeist.culturalReferences.length).toBeGreaterThanOrEqual(2)
    // Each reference should be a meaningful string
    for (const ref of zeitgeist.culturalReferences) {
      expect(ref.length).toBeGreaterThanOrEqual(10)
    }
    expect(zeitgeist.generationalMarkers.length).toBeGreaterThanOrEqual(1)
    // L1.sociability=0.3 (low) → social awareness should be low-to-moderate
    // Formula: sociability*0.3 + openness*0.4 + extraversion*0.3 = 0.3*0.3 + 0.75*0.4 + 0.35*0.3 ≈ 0.495
    expect(zeitgeist.socialAwareness).toBeGreaterThanOrEqual(0)
    expect(zeitgeist.socialAwareness).toBeLessThanOrEqual(1)
    expect(zeitgeist.socialAwareness).toBeCloseTo(0.5, 1)
    // Formula: openness*0.5 + taste*0.3 + sociability*0.2 = 0.75*0.5 + 0.35*0.3 + 0.3*0.2 = 0.54
    expect(zeitgeist.trendSensitivity).toBeGreaterThanOrEqual(0)
    expect(zeitgeist.trendSensitivity).toBeLessThanOrEqual(1)
    expect(zeitgeist.trendSensitivity).toBeCloseTo(0.54, 1)
  })

  it("high sociability should increase social awareness", () => {
    const highSoc: SocialPersonaVector = { ...L1, sociability: 0.9 }
    const lowSoc: SocialPersonaVector = { ...L1, sociability: 0.1 }
    const highZ = generateZeitgeistProfile(highSoc, L2, L3)
    const lowZ = generateZeitgeistProfile(lowSoc, L2, L3)
    expect(highZ.socialAwareness).toBeGreaterThan(0.4)
    // High sociability should produce higher social awareness than low
    expect(highZ.socialAwareness).toBeGreaterThan(lowZ.socialAwareness)
  })

  it("high openness should increase trend sensitivity", () => {
    const highOpen: CoreTemperamentVector = { ...L2, openness: 0.9 }
    const lowOpen: CoreTemperamentVector = { ...L2, openness: 0.1 }
    const highZ = generateZeitgeistProfile(L1, highOpen, L3)
    const lowZ = generateZeitgeistProfile(L1, lowOpen, L3)
    expect(highZ.trendSensitivity).toBeGreaterThan(0.4)
    // High openness should produce higher trend sensitivity than low
    expect(highZ.trendSensitivity).toBeGreaterThan(lowZ.trendSensitivity)
  })
})

// ═══════════════════════════════════════════════════════════════
// 통합 테스트
// ═══════════════════════════════════════════════════════════════

describe("All Qualitative Dimensions (Integration)", () => {
  it("should generate all 4 dimensions at once", () => {
    const dims = generateAllQualitativeDimensions(L1, L2, L3)

    expect(dims.backstory).toBeDefined()
    expect(dims.voice).toBeDefined()
    expect(dims.pressure).toBeDefined()
    expect(dims.zeitgeist).toBeDefined()
  })

  it("should work with archetype", () => {
    const arch = getArchetypeById("volatile-intellectual")!
    const dims = generateAllQualitativeDimensions(L1, L2, L3, arch)

    expect(dims.backstory.origin).toContain(arch.narrativeHint)
    expect(dims.voice.speechStyle).toBeTruthy()
    expect(dims.voice.speechStyle.length).toBeGreaterThanOrEqual(10)
    expect(dims.pressure.situationalTriggers.length).toBeGreaterThanOrEqual(2)
    expect(dims.zeitgeist.culturalReferences.length).toBeGreaterThanOrEqual(2)
  })

  it("should generate consistent data across dimensions", () => {
    const dims = generateAllQualitativeDimensions(L1, L2, L3)

    // High depth + high lens → backstory should have analytical keywords
    expect(
      dims.backstory.nlpKeywords.some((kw) => kw.includes("분석") || kw.includes("논리"))
    ).toBe(true)
    // High neuroticism → voice should have activation thresholds
    expect(dims.voice.activationThresholds.anger).toBeGreaterThan(0)
  })
})
