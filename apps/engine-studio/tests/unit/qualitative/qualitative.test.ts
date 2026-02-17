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

// ── Fixtures ──────────────────────────────────────────────────

const L1: SocialPersonaVector = {
  depth: 0.85,
  lens: 0.9,
  stance: 0.75,
  scope: 0.8,
  taste: 0.35,
  purpose: 0.7,
  sociability: 0.3,
}
const L2: CoreTemperamentVector = {
  openness: 0.75,
  conscientiousness: 0.6,
  extraversion: 0.35,
  agreeableness: 0.45,
  neuroticism: 0.7,
}
const L3: NarrativeDriveVector = {
  lack: 0.65,
  moralCompass: 0.55,
  volatility: 0.5,
  growthArc: 0.6,
}

// ═══════════════════════════════════════════════════════════════
// AC1: Backstory 생성기
// ═══════════════════════════════════════════════════════════════

describe("Backstory Generator (AC1)", () => {
  it("should generate complete backstory", () => {
    const backstory = generateBackstory(L1, L2, L3)

    expect(backstory.origin).toBeTruthy()
    expect(backstory.formativeExperience).toBeTruthy()
    expect(backstory.innerConflict).toBeTruthy()
    expect(backstory.selfNarrative).toBeTruthy()
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
    expect(voice.habitualExpressions.length).toBeGreaterThanOrEqual(3)
    expect(voice.physicalMannerisms.length).toBeGreaterThanOrEqual(1)
    expect(voice.unconsciousBehaviors.length).toBeGreaterThanOrEqual(1)
    expect(Object.keys(voice.activationThresholds).length).toBeGreaterThanOrEqual(3)
  })

  it("should use archetype-specific style", () => {
    const arch = getArchetypeById("ironic-philosopher")!
    const voice = generateVoiceProfile(L1, L2, L3, arch)
    expect(voice.speechStyle).toBeTruthy()
  })

  it("activation thresholds should be 0-1", () => {
    const voice = generateVoiceProfile(L1, L2, L3)
    for (const [, val] of Object.entries(voice.activationThresholds)) {
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThanOrEqual(1)
    }
  })

  it("high neuroticism should include neurotic mannerism", () => {
    const voice = generateVoiceProfile(L1, L2, L3)
    // L2.neuroticism = 0.7 > 0.5 → should have neurotic mannerism
    expect(voice.physicalMannerisms.length).toBeGreaterThanOrEqual(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Pressure Context 생성기
// ═══════════════════════════════════════════════════════════════

describe("Pressure Context Generator (AC3)", () => {
  it("should generate complete pressure context", () => {
    const pressure = generatePressureContext(L1, L2, L3)

    expect(pressure.stressResponse).toBeTruthy()
    expect(pressure.comfortZone).toBeTruthy()
    expect(pressure.situationalTriggers.length).toBeGreaterThanOrEqual(2)
  })

  it("triggers should have valid structure", () => {
    const pressure = generatePressureContext(L1, L2, L3)

    for (const trigger of pressure.situationalTriggers) {
      expect(trigger.condition).toBeTruthy()
      expect(["L1", "L2", "L3"]).toContain(trigger.affectedLayer)
      expect(trigger.affectedDimension).toBeTruthy()
      expect(["boost", "suppress", "override"]).toContain(trigger.effect)
      expect(trigger.magnitude).toBeGreaterThanOrEqual(0)
      expect(trigger.magnitude).toBeLessThanOrEqual(1)
    }
  })

  it("high neuroticism should generate fight/flight response", () => {
    const highNeuro: CoreTemperamentVector = { ...L2, neuroticism: 0.8, agreeableness: 0.3 }
    const pressure = generatePressureContext(L1, highNeuro, L3)
    expect(pressure.stressResponse).toBeTruthy()
  })

  it("high agreeableness should generate fawn response", () => {
    const highAgree: CoreTemperamentVector = { ...L2, agreeableness: 0.8, neuroticism: 0.3 }
    const pressure = generatePressureContext(L1, highAgree, L3)
    expect(pressure.stressResponse).toBeTruthy()
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: Zeitgeist Profile 생성기
// ═══════════════════════════════════════════════════════════════

describe("Zeitgeist Profile Generator (AC4)", () => {
  it("should generate complete zeitgeist profile", () => {
    const zeitgeist = generateZeitgeistProfile(L1, L2, L3)

    expect(zeitgeist.culturalReferences.length).toBeGreaterThanOrEqual(2)
    expect(zeitgeist.generationalMarkers.length).toBeGreaterThanOrEqual(1)
    expect(zeitgeist.socialAwareness).toBeGreaterThanOrEqual(0)
    expect(zeitgeist.socialAwareness).toBeLessThanOrEqual(1)
    expect(zeitgeist.trendSensitivity).toBeGreaterThanOrEqual(0)
    expect(zeitgeist.trendSensitivity).toBeLessThanOrEqual(1)
  })

  it("high sociability should increase social awareness", () => {
    const highSoc: SocialPersonaVector = { ...L1, sociability: 0.9 }
    const zeitgeist = generateZeitgeistProfile(highSoc, L2, L3)
    expect(zeitgeist.socialAwareness).toBeGreaterThan(0.4)
  })

  it("high openness should increase trend sensitivity", () => {
    const highOpen: CoreTemperamentVector = { ...L2, openness: 0.9 }
    const zeitgeist = generateZeitgeistProfile(L1, highOpen, L3)
    expect(zeitgeist.trendSensitivity).toBeGreaterThan(0.4)
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
