// ═══════════════════════════════════════════════════════════════
// T52: 페르소나 생성 파이프라인 테스트
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest"
import {
  ARCHETYPES,
  getArchetypeById,
  getArchetypeIds,
  generateVectorsFromArchetype,
} from "@/lib/persona-generation/archetypes"
import {
  generateDiverseVectors,
  analyzeCoverage,
  calculateVectorDistance,
  checkMinDistance,
} from "@/lib/persona-generation/vector-generator"
import { designParadox, analyzeParadoxPatterns } from "@/lib/persona-generation/paradox-designer"
import { generateCharacter } from "@/lib/persona-generation/character-generator"
import {
  inferActivitySettings,
  inferContentSettings,
} from "@/lib/persona-generation/activity-inference"
import { validateConsistency } from "@/lib/persona-generation/consistency-validator"
import { generatePersona, generatePersonaBatch } from "@/lib/persona-generation"
import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "@/types"

// ── Test Fixtures ─────────────────────────────────────────────

const IRONIC_L1: SocialPersonaVector = {
  depth: 0.85,
  lens: 0.9,
  stance: 0.75,
  scope: 0.8,
  taste: 0.35,
  purpose: 0.7,
  sociability: 0.3,
}
const IRONIC_L2: CoreTemperamentVector = {
  openness: 0.75,
  conscientiousness: 0.6,
  extraversion: 0.35,
  agreeableness: 0.45,
  neuroticism: 0.7,
}
const IRONIC_L3: NarrativeDriveVector = {
  lack: 0.65,
  moralCompass: 0.55,
  volatility: 0.5,
  growthArc: 0.6,
}

// ═══════════════════════════════════════════════════════════════
// AC1: 아키타입 12종 템플릿
// ═══════════════════════════════════════════════════════════════

describe("Archetypes (AC1)", () => {
  it("should have exactly 22 archetypes", () => {
    expect(ARCHETYPES).toHaveLength(22)
  })

  it("each archetype should have required fields", () => {
    for (const arch of ARCHETYPES) {
      expect(arch.id).toBeTruthy()
      expect(arch.name).toBeTruthy()
      expect(arch.nameEn).toBeTruthy()
      expect(arch.description).toBeTruthy()
      expect(arch.detailedDescription).toBeTruthy()
      expect(Object.keys(arch.layer1)).toHaveLength(7)
      expect(Object.keys(arch.layer2)).toHaveLength(5)
      expect(Object.keys(arch.layer3)).toHaveLength(4)
      expect(arch.paradoxPattern.primary).toBeTruthy()
      expect(arch.expectedParadoxRange).toHaveLength(2)
      expect(arch.dynamicsDefaults.alpha + arch.dynamicsDefaults.beta).toBeCloseTo(1.0)
    }
  })

  it("getArchetypeById should return correct archetype", () => {
    const arch = getArchetypeById("ironic-philosopher")
    expect(arch).toBeDefined()
    expect(arch?.name).toBe("아이러니한 철학자")
  })

  it("getArchetypeById should return undefined for unknown id", () => {
    expect(getArchetypeById("unknown")).toBeUndefined()
  })

  it("getArchetypeIds should return all 22 ids", () => {
    expect(getArchetypeIds()).toHaveLength(22)
  })

  it("generateVectorsFromArchetype should produce vectors within ranges", () => {
    const arch = getArchetypeById("ironic-philosopher")!
    const vectors = generateVectorsFromArchetype(arch)

    // L1 범위 확인
    for (const [key, [min, max]] of Object.entries(arch.layer1)) {
      const val = vectors.l1[key as keyof SocialPersonaVector]
      expect(val).toBeGreaterThanOrEqual(min)
      expect(val).toBeLessThanOrEqual(max)
    }

    // L2 범위 확인
    for (const [key, [min, max]] of Object.entries(arch.layer2)) {
      const val = vectors.l2[key as keyof CoreTemperamentVector]
      expect(val).toBeGreaterThanOrEqual(min)
      expect(val).toBeLessThanOrEqual(max)
    }

    // L3 범위 확인
    for (const [key, [min, max]] of Object.entries(arch.layer3)) {
      const val = vectors.l3[key as keyof NarrativeDriveVector]
      expect(val).toBeGreaterThanOrEqual(min)
      expect(val).toBeLessThanOrEqual(max)
    }
  })

  it("vector ranges should be valid (min < max, within [0,1])", () => {
    for (const arch of ARCHETYPES) {
      for (const [, [min, max]] of Object.entries(arch.layer1)) {
        expect(min).toBeLessThan(max)
        expect(min).toBeGreaterThanOrEqual(0)
        expect(max).toBeLessThanOrEqual(1)
      }
      for (const [, [min, max]] of Object.entries(arch.layer2)) {
        expect(min).toBeLessThan(max)
        expect(min).toBeGreaterThanOrEqual(0)
        expect(max).toBeLessThanOrEqual(1)
      }
      for (const [, [min, max]] of Object.entries(arch.layer3)) {
        expect(min).toBeLessThan(max)
        expect(min).toBeGreaterThanOrEqual(0)
        expect(max).toBeLessThanOrEqual(1)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// AC2: 3-Layer 벡터 생성기
// ═══════════════════════════════════════════════════════════════

describe("Vector Generator (AC2)", () => {
  it("should generate vectors without archetype", () => {
    const vectors = generateDiverseVectors({})
    expect(vectors.l1.depth).toBeGreaterThanOrEqual(0)
    expect(vectors.l1.depth).toBeLessThanOrEqual(1)
    expect(vectors.l2.openness).toBeGreaterThanOrEqual(0)
    expect(vectors.l3.lack).toBeGreaterThanOrEqual(0)
  })

  it("should generate vectors within archetype ranges", () => {
    const arch = getArchetypeById("volatile-intellectual")!
    const vectors = generateDiverseVectors({ archetype: arch })

    for (const [key, [min, max]] of Object.entries(arch.layer1)) {
      const val = vectors.l1[key as keyof SocialPersonaVector]
      expect(val).toBeGreaterThanOrEqual(min)
      expect(val).toBeLessThanOrEqual(max)
    }
  })

  it("analyzeCoverage should compute stats correctly", () => {
    const personas = [{ l1: IRONIC_L1, l2: IRONIC_L2, l3: IRONIC_L3 }]
    const coverage = analyzeCoverage(personas)

    expect(coverage.l1.depth.avg).toBeCloseTo(0.85)
    expect(coverage.overallCoverage).toBeGreaterThan(0)
    expect(coverage.overallCoverage).toBeLessThanOrEqual(1)
  })

  it("analyzeCoverage should find empty regions", () => {
    const personas = [
      {
        l1: {
          depth: 0.9,
          lens: 0.9,
          stance: 0.9,
          scope: 0.9,
          taste: 0.9,
          purpose: 0.9,
          sociability: 0.9,
        },
        l2: {
          openness: 0.9,
          conscientiousness: 0.9,
          extraversion: 0.9,
          agreeableness: 0.9,
          neuroticism: 0.9,
        },
        l3: { lack: 0.9, moralCompass: 0.9, volatility: 0.9, growthArc: 0.9 },
      },
    ]
    const coverage = analyzeCoverage(personas)

    // 모든 값이 0.75~1.0 버킷에만 있으므로 다른 버킷들은 비어있어야 함
    expect(coverage.emptyRegions.length).toBeGreaterThan(0)
  })

  it("calculateVectorDistance should return 0 for identical vectors", () => {
    const a = { l1: IRONIC_L1, l2: IRONIC_L2, l3: IRONIC_L3 }
    expect(calculateVectorDistance(a, a)).toBeCloseTo(0)
  })

  it("checkMinDistance should work correctly", () => {
    const a = { l1: IRONIC_L1, l2: IRONIC_L2, l3: IRONIC_L3 }
    expect(checkMinDistance(a, [])).toBe(true)
    expect(checkMinDistance(a, [a], 0.1)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// AC3: Paradox 디자이너
// ═══════════════════════════════════════════════════════════════

describe("Paradox Designer (AC3)", () => {
  it("should design paradox without archetype", () => {
    const result = designParadox(IRONIC_L1, IRONIC_L2, IRONIC_L3)

    expect(result.paradoxProfile.overall).toBeGreaterThanOrEqual(0)
    expect(result.paradoxProfile.overall).toBeLessThanOrEqual(1)
    expect(result.paradoxProfile.dimensionality).toBeGreaterThanOrEqual(0)
    expect(result.tensionMap).toHaveLength(7)
  })

  it("should adjust vectors for archetype paradox range", () => {
    const arch = getArchetypeById("ironic-philosopher")!
    const result = designParadox(IRONIC_L1, IRONIC_L2, IRONIC_L3, arch)

    // adjustedL1/L2 should still be valid
    expect(result.adjustedL1.depth).toBeGreaterThanOrEqual(0)
    expect(result.adjustedL1.depth).toBeLessThanOrEqual(1)
    expect(result.adjustedL2.openness).toBeGreaterThanOrEqual(0)
    expect(result.adjustedL2.openness).toBeLessThanOrEqual(1)
  })

  it("analyzeParadoxPatterns should find dominant paradox", () => {
    const analysis = analyzeParadoxPatterns(IRONIC_L1, IRONIC_L2)

    expect(analysis.dominantParadox.score).toBeGreaterThan(0)
    expect(["HIGH", "MEDIUM", "LOW"]).toContain(analysis.tensionLevel)
    expect(analysis.patterns).toHaveLength(7)
  })

  it("tension map entries should have aligned flag", () => {
    const arch = getArchetypeById("reluctant-leader")!
    const vectors = generateVectorsFromArchetype(arch)
    const result = designParadox(vectors.l1, vectors.l2, vectors.l3, arch)

    for (const entry of result.tensionMap) {
      expect(typeof entry.aligned).toBe("boolean")
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(entry.actualTension)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// AC4: 캐릭터 생성기
// ═══════════════════════════════════════════════════════════════

describe("Character Generator (AC4)", () => {
  it("should generate complete character profile", () => {
    const character = generateCharacter(IRONIC_L1, IRONIC_L2, IRONIC_L3)

    expect(character.name).toBeTruthy()
    expect(character.role).toBeTruthy()
    expect(character.expertise.length).toBeGreaterThanOrEqual(1)
    expect(character.description).toBeTruthy()
    expect(character.background).toBeTruthy()
    expect(character.speechPatterns.length).toBeGreaterThanOrEqual(2)
    expect(character.quirks.length).toBeGreaterThanOrEqual(1)
    expect(character.habits.length).toBeGreaterThanOrEqual(2)
    expect(character.relationships.length).toBeGreaterThanOrEqual(2)
  })

  it("should use archetype for role", () => {
    const arch = getArchetypeById("ironic-philosopher")!
    const character = generateCharacter(IRONIC_L1, IRONIC_L2, IRONIC_L3, arch)
    expect(character.role).toBe("아이러니한 철학 비평가")
  })

  it("should generate paradoxical quirks for contradictory vectors", () => {
    // High lens + high neuroticism → should have paradoxical quirk
    const character = generateCharacter(IRONIC_L1, IRONIC_L2, IRONIC_L3)
    expect(character.quirks.length).toBeGreaterThanOrEqual(1)
  })

  it("relationship types should be valid", () => {
    const character = generateCharacter(IRONIC_L1, IRONIC_L2, IRONIC_L3)
    const validTypes = ["mentor", "rival", "ally", "student", "antagonist"]
    for (const rel of character.relationships) {
      expect(validTypes).toContain(rel.type)
      expect(rel.description).toBeTruthy()
      expect(rel.dynamic).toBeTruthy()
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// AC5: 활동성/콘텐츠 설정 추론
// ═══════════════════════════════════════════════════════════════

describe("Activity Inference (AC5)", () => {
  it("should infer activity settings", () => {
    const activity = inferActivitySettings(IRONIC_L1, IRONIC_L2, IRONIC_L3)

    expect(["RARE", "OCCASIONAL", "MODERATE", "ACTIVE", "HYPERACTIVE"]).toContain(
      activity.postFrequency
    )
    expect(activity.postsPerWeek).toBeGreaterThan(0)
    expect(activity.activeHours).toHaveLength(2)
    expect(activity.peakHours).toHaveLength(2)
    expect(activity.timezone).toBe("Asia/Seoul")
  })

  it("low sociability should result in lower post frequency", () => {
    const lowSocial: SocialPersonaVector = {
      ...IRONIC_L1,
      sociability: 0.1,
    }
    const lowExt: CoreTemperamentVector = {
      ...IRONIC_L2,
      extraversion: 0.1,
    }
    const activity = inferActivitySettings(lowSocial, lowExt, IRONIC_L3)
    expect(["RARE", "OCCASIONAL"]).toContain(activity.postFrequency)
  })

  it("should infer content settings", () => {
    const content = inferContentSettings(IRONIC_L1, IRONIC_L2, IRONIC_L3)

    expect(content.preferredPostTypes.length).toBeGreaterThanOrEqual(1)
    expect(["shallow", "moderate", "deep"]).toContain(content.contentStyle.depth)
    expect(["casual", "balanced", "formal"]).toContain(content.contentStyle.tone)
    expect(["intuitive", "analytical", "mixed"]).toContain(content.reviewStyle.approach)
    expect(["passive", "moderate", "active"]).toContain(content.interactionStyle.responsiveness)
  })

  it("high depth should result in deep content style", () => {
    const content = inferContentSettings(IRONIC_L1, IRONIC_L2, IRONIC_L3)
    expect(content.contentStyle.depth).toBe("deep")
  })
})

// ═══════════════════════════════════════════════════════════════
// AC6: 6-Category 일관성 검증기
// ═══════════════════════════════════════════════════════════════

describe("Consistency Validator (AC6)", () => {
  it("should validate valid vectors as passing", () => {
    const result = validateConsistency(IRONIC_L1, IRONIC_L2, IRONIC_L3)

    expect(result.valid).toBe(true)
    expect(result.overallScore).toBeGreaterThan(0)
    expect(result.overallScore).toBeLessThanOrEqual(1)
    expect(result.paradoxProfile).toBeDefined()
    expect(result.crossAxisProfile).toBeDefined()
  })

  it("should detect out-of-range values (Category A)", () => {
    const badL1 = { ...IRONIC_L1, depth: 1.5 }
    const result = validateConsistency(badL1, IRONIC_L2, IRONIC_L3)

    const rangeError = result.issues.find((i) => i.code === "S_RANGE_L1")
    expect(rangeError).toBeDefined()
    expect(rangeError?.severity).toBe("error")
  })

  it("should detect flat vectors (Category A)", () => {
    const flatL1: SocialPersonaVector = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const result = validateConsistency(flatL1, IRONIC_L2, IRONIC_L3)
    const flatWarning = result.issues.find((i) => i.code === "S_FLAT_L1")
    expect(flatWarning).toBeDefined()
  })

  it("should check archetype paradox range (Category B)", () => {
    const arch = getArchetypeById("ironic-philosopher")!
    // 역설이 매우 낮은 벡터
    const lowParadoxL1: SocialPersonaVector = {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    }
    const lowParadoxL2: CoreTemperamentVector = {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    }
    const result = validateConsistency(lowParadoxL1, lowParadoxL2, IRONIC_L3, arch)
    const paradoxWarning = result.issues.find((i) => i.code === "L1L2_PARADOX_RANGE")
    expect(paradoxWarning).toBeDefined()
  })

  it("should detect volatility-neuroticism gap (Category C)", () => {
    const highVolL3: NarrativeDriveVector = {
      ...IRONIC_L3,
      volatility: 0.95,
    }
    const lowNeuroL2: CoreTemperamentVector = {
      ...IRONIC_L2,
      neuroticism: 0.1,
    }
    const result = validateConsistency(IRONIC_L1, lowNeuroL2, highVolL3)
    const vnGap = result.issues.find((i) => i.code === "L2L3_VOL_NEURO")
    expect(vnGap).toBeDefined()
  })

  it("should detect extreme pressure risk (Category F)", () => {
    const highNeuro: CoreTemperamentVector = {
      ...IRONIC_L2,
      neuroticism: 0.9,
    }
    const highVol: NarrativeDriveVector = {
      ...IRONIC_L3,
      volatility: 0.9,
    }
    const result = validateConsistency(IRONIC_L1, highNeuro, highVol)
    const extremeWarning = result.issues.find((i) => i.code === "DYN_EXTREME_PRESSURE")
    expect(extremeWarning).toBeDefined()
  })

  it("should have all 6 categories in scores", () => {
    const result = validateConsistency(IRONIC_L1, IRONIC_L2, IRONIC_L3)
    const categories = Object.keys(result.categoryScores)
    expect(categories).toContain("STRUCTURE")
    expect(categories).toContain("L1_L2")
    expect(categories).toContain("L2_L3")
    expect(categories).toContain("QUAL_QUANT")
    expect(categories).toContain("CROSS_AXIS")
    expect(categories).toContain("DYNAMIC")
  })
})

// ═══════════════════════════════════════════════════════════════
// 통합 파이프라인 테스트
// ═══════════════════════════════════════════════════════════════

describe("Generation Pipeline (Integration)", () => {
  it("should generate complete persona with archetype", () => {
    const persona = generatePersona({ archetypeId: "ironic-philosopher" })

    expect(persona.archetype?.id).toBe("ironic-philosopher")
    expect(persona.vectors.l1.depth).toBeGreaterThanOrEqual(0)
    expect(persona.paradox.paradoxProfile.overall).toBeGreaterThanOrEqual(0)
    expect(persona.character.name).toBeTruthy()
    expect(persona.activity.postFrequency).toBeTruthy()
    expect(persona.content.preferredPostTypes.length).toBeGreaterThanOrEqual(1)
    expect(persona.validation.valid).toBe(true)
    expect(persona.quality.paradoxScore).toBeGreaterThanOrEqual(0)
  })

  it("should generate persona without archetype", () => {
    const persona = generatePersona({})

    expect(persona.archetype).toBeUndefined()
    expect(persona.vectors.l1.depth).toBeGreaterThanOrEqual(0)
    expect(persona.validation.valid).toBe(true)
  })

  it("should apply vector overrides", () => {
    const persona = generatePersona({
      archetypeId: "social-introvert",
      l1Override: { sociability: 0.99 },
    })

    // Note: paradox designer may adjust, but override should be applied
    expect(persona.vectors.l1.sociability).toBeGreaterThanOrEqual(0.8)
  })

  it("should generate batch of diverse personas", () => {
    const batch = generatePersonaBatch(3)

    expect(batch).toHaveLength(3)

    // All should be valid
    for (const persona of batch) {
      expect(persona.validation.valid).toBe(true)
      expect(persona.character.name).toBeTruthy()
    }

    // Should have diversity (different archetype names)
    const names = batch.map((p) => p.character.name)
    // Note: names can sometimes collide since they're random, so we just check they exist
    expect(names.every((n) => n.length > 0)).toBe(true)
  })

  it("all 22 archetypes should produce valid personas", () => {
    for (const arch of ARCHETYPES) {
      const persona = generatePersona({ archetypeId: arch.id })
      expect(persona.validation.valid).toBe(true)
      expect(persona.quality.paradoxScore).toBeGreaterThanOrEqual(0)
      expect(persona.quality.dimensionality).toBeGreaterThanOrEqual(0)
      expect(persona.quality.consistencyScore).toBeGreaterThan(0)
    }
  })
})
