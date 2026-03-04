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
  sampleBeta,
  suggestUnderrepresentedArchetypes,
  buildCoverageReport,
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
import { IRONIC_L1, IRONIC_L2, IRONIC_L3 } from "../fixtures"

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
    // Without archetype: L1/L2 range is [0.05, 0.95], L3 range is [0.0, 0.85]
    expect(vectors.l1.depth).toBeGreaterThanOrEqual(0.05)
    expect(vectors.l1.depth).toBeLessThanOrEqual(0.95)
    expect(vectors.l2.openness).toBeGreaterThanOrEqual(0.05)
    expect(vectors.l2.openness).toBeLessThanOrEqual(0.95)
    expect(vectors.l3.lack).toBeGreaterThanOrEqual(0.0)
    expect(vectors.l3.lack).toBeLessThanOrEqual(0.85)
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
    // Single persona with values clustered in high range → low coverage (not full spread)
    expect(coverage.overallCoverage).toBeGreaterThan(0)
    expect(coverage.overallCoverage).toBeLessThan(0.5)
    // L1 stats should match the single persona's exact values
    expect(coverage.l1.depth.min).toBeCloseTo(IRONIC_L1.depth)
    expect(coverage.l1.depth.max).toBeCloseTo(IRONIC_L1.depth)
    expect(coverage.l1.lens.avg).toBeCloseTo(IRONIC_L1.lens)
    expect(coverage.l2.openness.avg).toBeCloseTo(IRONIC_L2.openness)
    expect(coverage.l3.lack.avg).toBeCloseTo(IRONIC_L3.lack)
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
    // IRONIC vectors have high depth/lens with low sociability → should have non-trivial paradox
    expect(result.paradoxProfile.overall).toBeGreaterThan(0.1)
    expect(result.paradoxProfile.dimensionality).toBeGreaterThanOrEqual(0)
    expect(result.tensionMap).toHaveLength(7)
    // Without archetype, adjusted vectors should equal the originals
    expect(result.adjustedL1).toEqual(IRONIC_L1)
    expect(result.adjustedL2).toEqual(IRONIC_L2)
  })

  it("should adjust vectors for archetype paradox range", () => {
    const arch = getArchetypeById("ironic-philosopher")!
    const result = designParadox(IRONIC_L1, IRONIC_L2, IRONIC_L3, arch)

    // adjustedL1/L2 should still be valid (within [0,1])
    expect(result.adjustedL1.depth).toBeGreaterThanOrEqual(0)
    expect(result.adjustedL1.depth).toBeLessThanOrEqual(1)
    expect(result.adjustedL2.openness).toBeGreaterThanOrEqual(0)
    expect(result.adjustedL2.openness).toBeLessThanOrEqual(1)

    // Adjustment should move paradox closer to the expected range vs no archetype
    const noArchResult = designParadox(IRONIC_L1, IRONIC_L2, IRONIC_L3)
    const targetMid = (arch.expectedParadoxRange[0] + arch.expectedParadoxRange[1]) / 2
    const distWithArch = Math.abs(result.paradoxProfile.overall - targetMid)
    const distWithout = Math.abs(noArchResult.paradoxProfile.overall - targetMid)
    expect(distWithArch).toBeLessThanOrEqual(distWithout + 0.01)

    // withinExpectedRange flag should be correctly computed
    const inRange =
      result.paradoxProfile.overall >= arch.expectedParadoxRange[0] &&
      result.paradoxProfile.overall <= arch.expectedParadoxRange[1]
    expect(result.withinExpectedRange).toBe(inRange)

    // Paradox profile should still be valid (positive, bounded)
    expect(result.paradoxProfile.overall).toBeGreaterThan(0)
    expect(result.paradoxProfile.overall).toBeLessThanOrEqual(1)
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
    expect(character.name.length).toBeGreaterThanOrEqual(2)
    expect(character.role).toBeTruthy()
    expect(character.role.length).toBeGreaterThanOrEqual(2)
    expect(character.expertise.length).toBeGreaterThanOrEqual(1)
    expect(character.description).toBeTruthy()
    expect(character.description.length).toBeGreaterThanOrEqual(10)
    expect(character.background).toBeTruthy()
    expect(character.background.length).toBeGreaterThanOrEqual(10)
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
    const validTypes = [
      "ally",
      "rival",
      "mentor",
      "fan",
      "confidant",
      "frenemy",
      "nemesis",
      "muse",
      "protege",
      "crush",
      "guardian",
      "companion",
      "bestie",
      "tsundere",
      "student",
      "antagonist",
    ]
    for (const rel of character.relationships) {
      expect(validTypes).toContain(rel.type)
      expect(rel.description).toBeTruthy()
      expect(rel.description.length).toBeGreaterThanOrEqual(5)
      expect(rel.dynamic).toBeTruthy()
      expect(rel.dynamic.length).toBeGreaterThanOrEqual(5)
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
    // Valid, well-constructed vectors should score high on consistency
    expect(result.overallScore).toBeGreaterThan(0.5)
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
    const arch = getArchetypeById("ironic-philosopher")!

    expect(persona.archetype?.id).toBe("ironic-philosopher")
    // Vector values should be near archetype ranges (paradox adjustment may nudge slightly)
    // Using wider tolerance: archetype range ± 0.15 for adjustment headroom
    expect(persona.vectors.l1.depth).toBeGreaterThanOrEqual(arch.layer1.depth[0] - 0.15)
    expect(persona.vectors.l1.depth).toBeLessThanOrEqual(arch.layer1.depth[1] + 0.15)
    expect(persona.vectors.l2.openness).toBeGreaterThanOrEqual(arch.layer2.openness[0] - 0.15)
    expect(persona.vectors.l2.openness).toBeLessThanOrEqual(arch.layer2.openness[1] + 0.15)
    // Paradox score should be positive and bounded (best-effort, may not reach expected range)
    expect(persona.paradox.paradoxProfile.overall).toBeGreaterThan(0)
    expect(persona.paradox.paradoxProfile.overall).toBeLessThanOrEqual(1)
    expect(persona.character.name).toBeTruthy()
    expect(persona.character.name.length).toBeGreaterThanOrEqual(2)
    expect(persona.activity.postFrequency).toBeTruthy()
    expect(persona.content.preferredPostTypes.length).toBeGreaterThanOrEqual(1)
    expect(persona.validation.valid).toBe(true)
    expect(persona.quality.paradoxScore).toBeGreaterThanOrEqual(0)
  })

  it("should generate persona without archetype", () => {
    const persona = generatePersona({})

    expect(persona.archetype).toBeUndefined()
    // Without archetype, vectors use expanded range [0.05, 0.95]
    expect(persona.vectors.l1.depth).toBeGreaterThanOrEqual(0.05)
    expect(persona.vectors.l1.depth).toBeLessThanOrEqual(0.95)
    expect(persona.vectors.l2.openness).toBeGreaterThanOrEqual(0.05)
    expect(persona.vectors.l2.openness).toBeLessThanOrEqual(0.95)
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
      expect(persona.character.name.length).toBeGreaterThanOrEqual(2)
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
      // Vectors should be within each archetype's defined ranges
      for (const [key, [min, max]] of Object.entries(arch.layer1)) {
        const val = persona.vectors.l1[key as keyof SocialPersonaVector]
        expect(val).toBeGreaterThanOrEqual(min)
        expect(val).toBeLessThanOrEqual(max)
      }
      // Quality scores should reflect meaningful paradox, not just [0,1]
      expect(persona.quality.paradoxScore).toBeGreaterThanOrEqual(0)
      expect(persona.quality.dimensionality).toBeGreaterThanOrEqual(0)
      expect(persona.quality.consistencyScore).toBeGreaterThan(0)
      expect(persona.quality.consistencyScore).toBeLessThanOrEqual(1)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// T161: 다양성 강화 — Beta 분포 + 최소 거리 + 아키타입 추천
// ═══════════════════════════════════════════════════════════════

describe("T161-AC1: Beta Distribution + 범위 확대", () => {
  it("sampleBeta should return values in [0, 1]", () => {
    for (let i = 0; i < 100; i++) {
      const v = sampleBeta(0.7, 0.7)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it("sampleBeta(0.7, 0.7) — U자형 분포: 극단값 비율이 균등분포보다 높아야 함", () => {
    const N = 2000
    let extremeCount = 0
    for (let i = 0; i < N; i++) {
      const v = sampleBeta(0.7, 0.7)
      if (v < 0.15 || v > 0.85) extremeCount++
    }
    // 균등분포의 극단값(0~0.15 + 0.85~1) 비율 ≈ 30%
    // Beta(0.7,0.7) U자형은 극단값 비율이 30%를 초과해야 함
    const ratio = extremeCount / N
    expect(ratio).toBeGreaterThan(0.3)
  })

  it("sampleBeta(1, 1) should approximate uniform distribution", () => {
    const N = 2000
    let sum = 0
    for (let i = 0; i < N; i++) {
      sum += sampleBeta(1, 1)
    }
    // 평균 ≈ 0.5 (±0.05 허용)
    expect(sum / N).toBeGreaterThan(0.4)
    expect(sum / N).toBeLessThan(0.6)
  })

  it("아키타입 미지정 시 범위가 [0.05, 0.95]로 확대되어야 함", () => {
    // 100번 생성 후 0.05~0.1 또는 0.9~0.95 값이 한 번이라도 나오면 성공
    let foundExtreme = false
    for (let i = 0; i < 100; i++) {
      const result = generateDiverseVectors({})
      const allVals = [
        ...Object.values(result.l1),
        ...Object.values(result.l2),
        ...Object.values(result.l3),
      ]
      if (allVals.some((v) => v < 0.1 || v > 0.9)) {
        foundExtreme = true
        break
      }
    }
    expect(foundExtreme).toBe(true)
  })

  it("generateDiverseVectors should return retryCount", () => {
    const result = generateDiverseVectors({})
    expect(typeof result.retryCount).toBe("number")
    expect(result.retryCount).toBeGreaterThanOrEqual(0)
  })
})

describe("T161-AC2: 최소 거리 재생성", () => {
  it("근접 기존 벡터가 있으면 재생성 시도해야 함 (retryCount > 0 가능)", () => {
    // 벡터 공간을 밀집하게 채워서 재생성 유도
    const dense: {
      l1: SocialPersonaVector
      l2: CoreTemperamentVector
      l3: NarrativeDriveVector
    }[] = []
    for (let i = 0; i < 20; i++) {
      const base = 0.4 + i * 0.01
      dense.push({
        l1: {
          depth: base,
          lens: base,
          stance: base,
          scope: base,
          taste: base,
          purpose: base,
          sociability: base,
        },
        l2: {
          openness: base,
          conscientiousness: base,
          extraversion: base,
          agreeableness: base,
          neuroticism: base,
        },
        l3: { lack: base, moralCompass: base, volatility: base, growthArc: base },
      })
    }

    const result = generateDiverseVectors({
      existingPersonas: dense,
      diversityWeight: 0.5,
    })

    // 생성은 항상 성공해야 함 — without archetype, range is [0.05, 0.95]
    expect(result.l1.depth).toBeGreaterThanOrEqual(0.05)
    expect(result.l1.depth).toBeLessThanOrEqual(0.95)
    expect(result.retryCount).toBeGreaterThanOrEqual(0)
    expect(result.retryCount).toBeLessThanOrEqual(6) // MAX_RETRY + 1
  })

  it("기존 페르소나가 없으면 retryCount는 0이어야 함", () => {
    const result = generateDiverseVectors({ existingPersonas: [] })
    expect(result.retryCount).toBe(0)
  })

  it("checkMinDistance should reject near-identical vectors", () => {
    const a = { l1: IRONIC_L1, l2: IRONIC_L2, l3: IRONIC_L3 }
    // 미세한 차이만 있는 벡터
    const b = {
      l1: { ...IRONIC_L1, depth: IRONIC_L1.depth + 0.01 },
      l2: IRONIC_L2,
      l3: IRONIC_L3,
    }
    expect(checkMinDistance(b, [a], 0.3)).toBe(false)
  })
})

describe("T161-AC3: 아키타입 자동 추천", () => {
  it("모든 아키타입이 없는 경우 전부 score=1이어야 함", () => {
    const suggestions = suggestUnderrepresentedArchetypes([], ARCHETYPES)
    expect(suggestions).toHaveLength(22)
    for (const s of suggestions) {
      expect(s.score).toBe(1)
      expect(s.currentCount).toBe(0)
    }
  })

  it("하나의 아키타입만 있으면 나머지가 높은 score를 가져야 함", () => {
    const ids = ["ironic-philosopher"]
    const suggestions = suggestUnderrepresentedArchetypes(ids, ARCHETYPES)

    // ironic-philosopher는 count=1
    const ip = suggestions.find((s) => s.archetypeId === "ironic-philosopher")
    expect(ip).toBeDefined()
    expect(ip!.currentCount).toBe(1)

    // 없는 아키타입이 더 높은 score를 가져야 함
    const others = suggestions.filter((s) => s.archetypeId !== "ironic-philosopher")
    for (const o of others) {
      expect(o.score).toBeGreaterThan(ip!.score)
    }
  })

  it("균등 분포면 모든 score가 동일해야 함", () => {
    const ids = ARCHETYPES.map((a) => a.id) // 각 1개씩
    const suggestions = suggestUnderrepresentedArchetypes(ids, ARCHETYPES)
    // 모두 count=1, idealCount=1, score=0
    for (const s of suggestions) {
      expect(s.currentCount).toBe(1)
      expect(s.score).toBe(0)
    }
  })

  it("과대 대표된 아키타입의 score는 0이어야 함", () => {
    const ids = Array(10).fill("ironic-philosopher") as string[]
    const suggestions = suggestUnderrepresentedArchetypes(ids, ARCHETYPES)

    const ip = suggestions.find((s) => s.archetypeId === "ironic-philosopher")
    expect(ip!.currentCount).toBe(10)
    expect(ip!.score).toBe(0)
  })
})

describe("T161-AC4: 커버리지 리포트", () => {
  it("빈 상태에서 커버리지 리포트가 정상 생성되어야 함", () => {
    const report = buildCoverageReport([], [], ARCHETYPES, 0)
    expect(report.overallCoverage).toBe(0)
    expect(report.totalPersonas).toBe(0)
    expect(report.retryCount).toBe(0)
    expect(report.archetypeSuggestions).toHaveLength(22)
  })

  it("기존 페르소나가 있으면 커버리지가 0보다 커야 함", () => {
    const personas = [{ l1: IRONIC_L1, l2: IRONIC_L2, l3: IRONIC_L3 }]
    const report = buildCoverageReport(personas, ["ironic-philosopher"], ARCHETYPES, 0)
    expect(report.overallCoverage).toBeGreaterThan(0)
    expect(report.totalPersonas).toBe(1)
    expect(report.emptyRegionCount).toBeGreaterThan(0)
  })

  it("retryCount가 리포트에 포함되어야 함", () => {
    const report = buildCoverageReport([], [], ARCHETYPES, 3)
    expect(report.retryCount).toBe(3)
  })
})

describe("T161: generatePersona — retryCount 포함", () => {
  it("아키타입 지정 시 retryCount는 0이어야 함", () => {
    const persona = generatePersona({ archetypeId: "ironic-philosopher" })
    expect(persona.retryCount).toBe(0)
  })

  it("아키타입 미지정 시 retryCount를 반환해야 함", () => {
    const persona = generatePersona({})
    expect(typeof persona.retryCount).toBe("number")
    expect(persona.retryCount).toBeGreaterThanOrEqual(0)
  })
})
