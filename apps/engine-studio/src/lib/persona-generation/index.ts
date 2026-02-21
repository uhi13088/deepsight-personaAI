// ═══════════════════════════════════════════════════════════════
// 페르소나 생성 파이프라인 v3
// T52: 아키타입 → 벡터 생성 → Paradox 설계 → 캐릭터 → 검증
// ═══════════════════════════════════════════════════════════════

import type {
  SocialPersonaVector,
  CoreTemperamentVector,
  NarrativeDriveVector,
  ParadoxProfile,
  PersonaArchetype,
} from "@/types"
import { ARCHETYPES, getArchetypeById, generateVectorsFromArchetype } from "./archetypes"
import {
  generateDiverseVectors,
  suggestUnderrepresentedArchetypes,
  type ExistingPersonaVectors,
} from "./vector-generator"
import { designParadox, type ParadoxDesignResult } from "./paradox-designer"
import { generateCharacter, type CharacterProfile } from "./character-generator"
import {
  inferActivitySettings,
  inferContentSettings,
  type ActivitySettings,
  type ContentSettings,
} from "./activity-inference"
import { validateConsistency, type ValidationResult } from "./consistency-validator"

// ── 타입 정의 ─────────────────────────────────────────────────

export interface GenerationConfig {
  archetypeId?: string
  l1Override?: Partial<SocialPersonaVector>
  l2Override?: Partial<CoreTemperamentVector>
  l3Override?: Partial<NarrativeDriveVector>
  existingPersonas?: ExistingPersonaVectors[]
  diversityWeight?: number
  existingNames?: string[]
}

export interface GeneratedPersona {
  vectors: {
    l1: SocialPersonaVector
    l2: CoreTemperamentVector
    l3: NarrativeDriveVector
  }
  archetype: PersonaArchetype | undefined
  paradox: ParadoxDesignResult
  character: CharacterProfile
  activity: ActivitySettings
  content: ContentSettings
  validation: ValidationResult
  quality: {
    paradoxScore: number
    dimensionality: number
    consistencyScore: number
  }
  /** T161: 벡터 생성 시 최소 거리 재생성 횟수 (0 = 첫 시도 성공) */
  retryCount: number
}

// ── 메인 파이프라인 ───────────────────────────────────────────

export function generatePersona(config: GenerationConfig): GeneratedPersona {
  const archetype = config.archetypeId ? getArchetypeById(config.archetypeId) : undefined

  // Stage 1: 벡터 생성 (T161: 아키타입 미지정 시 Beta 분포 + 최소 거리 재생성)
  let retryCount = 0
  let vectors: { l1: SocialPersonaVector; l2: CoreTemperamentVector; l3: NarrativeDriveVector }
  if (archetype) {
    vectors = generateVectorsFromArchetype(archetype)
  } else {
    const result = generateDiverseVectors({
      existingPersonas: config.existingPersonas,
      diversityWeight: config.diversityWeight,
    })
    vectors = { l1: result.l1, l2: result.l2, l3: result.l3 }
    retryCount = result.retryCount
  }

  // Override 적용
  if (config.l1Override) {
    vectors.l1 = { ...vectors.l1, ...config.l1Override }
  }
  if (config.l2Override) {
    vectors.l2 = { ...vectors.l2, ...config.l2Override }
  }
  if (config.l3Override) {
    vectors.l3 = { ...vectors.l3, ...config.l3Override }
  }

  // Stage 2: Paradox 설계 (벡터 미세 조정 포함)
  const paradox = designParadox(vectors.l1, vectors.l2, vectors.l3, archetype)
  vectors = {
    l1: paradox.adjustedL1,
    l2: paradox.adjustedL2,
    l3: paradox.adjustedL3,
  }

  // Stage 3: 캐릭터 생성
  const character = generateCharacter(
    vectors.l1,
    vectors.l2,
    vectors.l3,
    archetype,
    config.existingNames
  )

  // Stage 4: 활동성/콘텐츠 설정 추론
  const activity = inferActivitySettings(vectors.l1, vectors.l2, vectors.l3)
  const content = inferContentSettings(vectors.l1, vectors.l2, vectors.l3)

  // Stage 5: 일관성 검증
  const validation = validateConsistency(vectors.l1, vectors.l2, vectors.l3, archetype, {
    backstory: character.background,
    speechPatterns: character.speechPatterns,
  })

  // Quality summary
  const quality = {
    paradoxScore: paradox.paradoxProfile.overall,
    dimensionality: paradox.paradoxProfile.dimensionality,
    consistencyScore: validation.overallScore,
  }

  return {
    vectors,
    archetype,
    paradox,
    character,
    activity,
    content,
    validation,
    quality,
    retryCount,
  }
}

// ── 배치 생성 (다양성 보장) ───────────────────────────────────

export function generatePersonaBatch(
  count: number,
  config?: {
    archetypeIds?: string[]
    existingPersonas?: ExistingPersonaVectors[]
    existingArchetypeIds?: (string | null)[]
    diversityWeight?: number
  }
): GeneratedPersona[] {
  const results: GeneratedPersona[] = []
  const existingVectors: ExistingPersonaVectors[] = config?.existingPersonas ?? []
  const usedArchetypeIds: (string | null)[] = [...(config?.existingArchetypeIds ?? [])]

  // 미사용/저사용 아키타입 우선 배정 (균등 분배)
  const availableArchetypes = config?.archetypeIds
    ? ARCHETYPES.filter((a) => config.archetypeIds!.includes(a.id))
    : ARCHETYPES

  for (let i = 0; i < count; i++) {
    // 매 반복마다 부족한 아키타입 재계산하여 우선 배정
    const suggestions = suggestUnderrepresentedArchetypes(usedArchetypeIds, availableArchetypes)
    const archetypeId =
      suggestions.length > 0
        ? suggestions[0].archetypeId
        : availableArchetypes[i % availableArchetypes.length].id

    const persona = generatePersona({
      archetypeId,
      existingPersonas: existingVectors,
      diversityWeight: config?.diversityWeight ?? 0.3,
    })

    results.push(persona)
    existingVectors.push(persona.vectors)
    usedArchetypeIds.push(archetypeId)
  }

  return results
}

// ── Re-exports ────────────────────────────────────────────────

export {
  ARCHETYPES,
  getArchetypeById,
  getArchetypeIds,
  generateVectorsFromArchetype,
} from "./archetypes"
export {
  generateDiverseVectors,
  analyzeCoverage,
  calculateVectorDistance,
  checkMinDistance,
  suggestUnderrepresentedArchetypes,
  buildCoverageReport,
  sampleBeta,
} from "./vector-generator"
export { designParadox, analyzeParadoxPatterns } from "./paradox-designer"
export { generateCharacter } from "./character-generator"
export { generateCharacterWithLLM } from "./llm-character-generator"
export { inferActivitySettings, inferContentSettings } from "./activity-inference"
export {
  inferBirthDate,
  inferAgeRange,
  inferRegion,
  expandActiveHours,
  expandPeakHours,
  generateStructuredFields,
} from "./structured-fields"
export { validateConsistency } from "./consistency-validator"
export type {
  ExistingPersonaVectors,
  CoverageReport,
  ArchetypeSuggestion,
} from "./vector-generator"
export type { ParadoxDesignResult } from "./paradox-designer"
export type { CharacterProfile, RelationshipSeed } from "./character-generator"
export type { ActivitySettings, ContentSettings, PostFrequency } from "./activity-inference"
export type { StructuredFields } from "./structured-fields"
export type {
  ValidationResult,
  ValidationIssue,
  ValidationCategory,
  ValidationSeverity,
} from "./consistency-validator"
