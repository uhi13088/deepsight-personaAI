/**
 * 페르소나 자동 생성 파이프라인
 *
 * 완전 자동화된 페르소나 생성 시스템입니다.
 * 6D 벡터 → 캐릭터 속성 → 활동성 → 콘텐츠 설정 → 프롬프트 → 검증 → 샘플 콘텐츠
 */

import { prisma } from "@/lib/prisma"
import type { Persona, Prisma } from "@prisma/client"

// 모듈 임포트 및 재내보내기
export {
  type Vector6D,
  analyzeDiversity,
  assignVectorForDiversity,
  generateTargetDistribution,
  describeVector,
} from "./vector-diversity"

export {
  type CharacterAttributes,
  type CharacterGenerationOptions,
  generateCharacterAttributes,
} from "./character-generator"

export {
  type ActivityTraits,
  type ActivitySchedule,
  deriveActivityTraits,
  deriveActivitySchedule,
  getExpectedPostsPerDay,
  calculateActivityScore,
  describeActivityTraits,
} from "./activity-inference"

export {
  type ContentSettings,
  type RelationshipSettings,
  type PreferredPostType,
  type ContentStyle,
  type ReviewStyle,
  type InteractionStyle,
  type RelationshipStyle,
  type ConflictStyle,
  type CollaborationStyle,
  deriveContentSettings,
  deriveRelationshipSettings,
} from "./content-settings-inference"

export {
  type PromptTemplates,
  type PromptBuildContext,
  buildPromptTemplates,
  buildSinglePromptTemplate,
} from "./prompt-builder"

export {
  type ConsistencyValidationInput,
  type ConsistencyResult,
  type ConsistencyIssue,
  validateConsistency,
  suggestFixes,
  autoFix,
} from "./consistency-validator"

export {
  type SampleContents,
  type SampleReview,
  type SamplePost,
  type SampleComment,
  type GenerationOptions,
  generateSampleContents,
} from "./sample-content-generator"

import type { Vector6D } from "./vector-diversity"
import { assignVectorForDiversity } from "./vector-diversity"
import { generateCharacterAttributes, type CharacterGenerationOptions } from "./character-generator"
import { deriveActivityTraits, deriveActivitySchedule } from "./activity-inference"
import { deriveContentSettings, deriveRelationshipSettings } from "./content-settings-inference"
import { buildPromptTemplates, buildSinglePromptTemplate } from "./prompt-builder"
import { validateConsistency, autoFix } from "./consistency-validator"
import { generateSampleContents } from "./sample-content-generator"

// ============================================
// 메인 파이프라인 타입
// ============================================

export interface PersonaGenerationInput {
  vector6d?: Partial<Vector6D> // 6D 벡터 (없으면 다양성 기반 자동 배정)
  country?: string // 목표 국가
  generation?: "GEN_Z" | "MILLENNIAL" | "GEN_X" | "BOOMER"
  preferredGender?: "male" | "female" | "neutral"
  organizationId?: string
  createdById: string // 생성자 ID (필수)
}

export interface PersonaGenerationResult {
  success: boolean
  persona?: Persona
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata: {
    vector6d: Vector6D
    consistencyScore: number
    generationTime: number // ms
    regenerationCount: number
  }
}

// ============================================
// 메인 파이프라인
// ============================================

const MAX_REGENERATION_ATTEMPTS = 3
const CONSISTENCY_PASS_THRESHOLD = 70

/**
 * 페르소나 자동 생성 메인 함수
 */
export async function generatePersonaAutomatically(
  input: PersonaGenerationInput
): Promise<PersonaGenerationResult> {
  const startTime = Date.now()
  let regenerationCount = 0

  try {
    // ═══════════════════════════════════════════════════════════════
    // Step 1: 6D 벡터 (입력 또는 다양성 기반 자동 배정)
    // ═══════════════════════════════════════════════════════════════
    let vector6d: Vector6D

    if (input.vector6d && isCompleteVector(input.vector6d)) {
      vector6d = input.vector6d as Vector6D
    } else {
      vector6d = await assignVectorForDiversity({
        preferredRegion: input.vector6d,
      })
    }

    // ═══════════════════════════════════════════════════════════════
    // Step 2-8: 속성 생성 및 검증 (재시도 루프)
    // ═══════════════════════════════════════════════════════════════
    let finalAttributes: Awaited<ReturnType<typeof generateAllAttributes>> | null = null
    let consistencyScore = 0

    while (regenerationCount < MAX_REGENERATION_ATTEMPTS) {
      const attributes = await generateAllAttributes(vector6d, {
        targetCountry: input.country,
        targetGeneration: input.generation,
        preferredGender: input.preferredGender,
      })

      // 일관성 검증
      const validationResult = validateConsistency({
        vector6d,
        characterAttrs: attributes.characterAttrs,
        activityTraits: attributes.activityTraits,
        contentSettings: attributes.contentSettings,
        relationshipSettings: attributes.relationshipSettings,
      })

      consistencyScore = validationResult.score

      if (validationResult.passed) {
        finalAttributes = attributes
        break
      }

      // 자동 수정 시도
      const fixedInput = autoFix({
        vector6d,
        characterAttrs: attributes.characterAttrs,
        activityTraits: attributes.activityTraits,
        contentSettings: attributes.contentSettings,
        relationshipSettings: attributes.relationshipSettings,
      })

      const fixedValidation = validateConsistency(fixedInput)
      if (fixedValidation.passed) {
        finalAttributes = {
          ...attributes,
          characterAttrs: fixedInput.characterAttrs,
          activityTraits: fixedInput.activityTraits,
        }
        consistencyScore = fixedValidation.score
        break
      }

      regenerationCount++

      // 벡터 약간 변형하여 재시도
      if (regenerationCount < MAX_REGENERATION_ATTEMPTS) {
        vector6d = addSmallNoise(vector6d)
      }
    }

    if (!finalAttributes) {
      return {
        success: false,
        error: {
          code: "CONSISTENCY_FAILED",
          message: `일관성 검증 실패 (점수: ${consistencyScore}/${CONSISTENCY_PASS_THRESHOLD})`,
        },
        metadata: {
          vector6d,
          consistencyScore,
          generationTime: Date.now() - startTime,
          regenerationCount,
        },
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // Step 9: 최종 페르소나 저장
    // ═══════════════════════════════════════════════════════════════
    const persona = await savePersona(input, vector6d, finalAttributes, consistencyScore)

    return {
      success: true,
      persona,
      metadata: {
        vector6d,
        consistencyScore,
        generationTime: Date.now() - startTime,
        regenerationCount,
      },
    }
  } catch (error) {
    console.error("페르소나 자동 생성 실패:", error)
    return {
      success: false,
      error: {
        code: "GENERATION_ERROR",
        message: error instanceof Error ? error.message : "알 수 없는 오류",
        details: error,
      },
      metadata: {
        vector6d: (input.vector6d as Vector6D) || {
          depth: 0,
          lens: 0,
          stance: 0,
          scope: 0,
          taste: 0,
          purpose: 0,
        },
        consistencyScore: 0,
        generationTime: Date.now() - startTime,
        regenerationCount,
      },
    }
  }
}

/**
 * 모든 속성 생성 (단일 시도)
 */
async function generateAllAttributes(vector6d: Vector6D, options: CharacterGenerationOptions) {
  // 캐릭터 속성 생성
  const characterAttrs = await generateCharacterAttributes(vector6d, options)

  // 활동성 속성 추론
  const activityTraits = deriveActivityTraits(vector6d)
  const activitySchedule = deriveActivitySchedule(activityTraits, {
    timezone: characterAttrs.country === "US" ? "America/Los_Angeles" : "Asia/Seoul",
  })

  // 콘텐츠/관계 설정 추론
  const contentSettings = deriveContentSettings(vector6d, activityTraits)
  const relationshipSettings = deriveRelationshipSettings(vector6d, characterAttrs)

  // 프롬프트 템플릿 생성
  const promptTemplates = buildPromptTemplates({
    vector6d,
    characterAttrs,
    activityTraits,
    contentSettings,
    relationshipSettings,
  })

  // 샘플 콘텐츠 생성
  const sampleContents = await generateSampleContents(promptTemplates, characterAttrs, vector6d, {
    reviewCount: 2,
    postCount: 1,
    commentCount: 2,
  })

  return {
    characterAttrs,
    activityTraits,
    activitySchedule,
    contentSettings,
    relationshipSettings,
    promptTemplates,
    sampleContents,
  }
}

/**
 * 페르소나 DB 저장
 */
async function savePersona(
  input: PersonaGenerationInput,
  vector6d: Vector6D,
  attributes: Awaited<ReturnType<typeof generateAllAttributes>>,
  consistencyScore: number
): Promise<Persona> {
  const {
    characterAttrs,
    activityTraits,
    activitySchedule,
    contentSettings,
    relationshipSettings,
    promptTemplates,
    sampleContents,
  } = attributes

  // 기본 프롬프트 (호환성)
  const promptTemplate = buildSinglePromptTemplate({
    vector6d,
    characterAttrs,
    activityTraits,
    contentSettings,
    relationshipSettings,
  })

  const persona = await prisma.persona.create({
    data: {
      // 기본 정보
      name: characterAttrs.name,
      role: "REVIEWER",
      expertise: characterAttrs.favoriteGenres.slice(0, 3),
      description: characterAttrs.tagline,
      profileImageUrl: null,
      organizationId: input.organizationId,

      // Layer 2: 캐릭터 속성
      handle: characterAttrs.handle,
      tagline: characterAttrs.tagline,
      birthDate: characterAttrs.birthDate,
      country: characterAttrs.country,
      region: characterAttrs.region,
      warmth: characterAttrs.warmth,
      expertiseLevel: characterAttrs.expertiseLevel,
      speechPatterns: characterAttrs.speechPatterns,
      quirks: characterAttrs.quirks,
      background: characterAttrs.background,
      favoriteGenres: characterAttrs.favoriteGenres,
      dislikedGenres: characterAttrs.dislikedGenres,
      viewingHabits: characterAttrs.viewingHabits,

      // 활동성 속성
      sociability: activityTraits.sociability,
      initiative: activityTraits.initiative,
      expressiveness: activityTraits.expressiveness,
      interactivity: activityTraits.interactivity,
      postFrequency: activitySchedule.postFrequency,
      timezone: activitySchedule.timezone,
      activeHours: activitySchedule.activeHours,
      peakHours: activitySchedule.peakHours,

      // JSON 설정
      contentSettings: contentSettings as unknown as Prisma.InputJsonValue,
      relationshipSettings: relationshipSettings as unknown as Prisma.InputJsonValue,

      // 프롬프트 템플릿
      promptTemplate,
      promptVersion: "2.0",
      basePrompt: promptTemplates.basePrompt,
      reviewPrompt: promptTemplates.reviewPrompt,
      postPrompt: promptTemplates.postPrompt,
      commentPrompt: promptTemplates.commentPrompt,
      interactionPrompt: promptTemplates.interactionPrompt,
      specialPrompts: promptTemplates.specialPrompts as unknown as Prisma.InputJsonValue,

      // 품질/상태
      status: "DRAFT",
      consistencyScore,
      source: "AUTO_GENERATED",
      generationConfig: {
        inputVector: vector6d,
        country: input.country,
        generation: characterAttrs.birthDate
          ? getGenerationFromDate(characterAttrs.birthDate)
          : null,
      } as unknown as Prisma.InputJsonValue,

      // 샘플 콘텐츠
      sampleContents: sampleContents as unknown as Prisma.InputJsonValue,

      // 메타
      createdById: input.createdById,

      // 6D 벡터 (별도 테이블)
      vectors: {
        create: {
          version: 1,
          depth: vector6d.depth,
          lens: vector6d.lens,
          stance: vector6d.stance,
          scope: vector6d.scope,
          taste: vector6d.taste,
          purpose: vector6d.purpose,
        },
      },
    },
    include: {
      vectors: true,
    },
  })

  return persona
}

// ============================================
// 유틸리티 함수
// ============================================

function isCompleteVector(v: Partial<Vector6D>): v is Vector6D {
  return (
    v.depth !== undefined &&
    v.lens !== undefined &&
    v.stance !== undefined &&
    v.scope !== undefined &&
    v.taste !== undefined &&
    v.purpose !== undefined
  )
}

function addSmallNoise(vector: Vector6D): Vector6D {
  const noise = 0.05
  return {
    depth: clamp(vector.depth + (Math.random() - 0.5) * noise * 2),
    lens: clamp(vector.lens + (Math.random() - 0.5) * noise * 2),
    stance: clamp(vector.stance + (Math.random() - 0.5) * noise * 2),
    scope: clamp(vector.scope + (Math.random() - 0.5) * noise * 2),
    taste: clamp(vector.taste + (Math.random() - 0.5) * noise * 2),
    purpose: clamp(vector.purpose + (Math.random() - 0.5) * noise * 2),
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function getGenerationFromDate(birthDate: Date): string {
  const year = birthDate.getFullYear()
  if (year >= 2000) return "GEN_Z"
  if (year >= 1985) return "MILLENNIAL"
  if (year >= 1970) return "GEN_X"
  return "BOOMER"
}

// ============================================
// 배치 생성 함수
// ============================================

export interface BatchGenerationOptions {
  count: number
  country?: string
  organizationId?: string
  createdById: string
}

/**
 * 다양성을 고려한 배치 페르소나 생성
 */
export async function generatePersonaBatch(options: BatchGenerationOptions): Promise<{
  success: boolean
  created: Persona[]
  failed: Array<{ index: number; error: string }>
  summary: {
    total: number
    successful: number
    failed: number
    avgConsistencyScore: number
    avgGenerationTime: number
  }
}> {
  const created: Persona[] = []
  const failed: Array<{ index: number; error: string }> = []
  const metrics: { consistencyScore: number; generationTime: number }[] = []

  for (let i = 0; i < options.count; i++) {
    const result = await generatePersonaAutomatically({
      country: options.country,
      organizationId: options.organizationId,
      createdById: options.createdById,
    })

    if (result.success && result.persona) {
      created.push(result.persona)
      metrics.push({
        consistencyScore: result.metadata.consistencyScore,
        generationTime: result.metadata.generationTime,
      })
    } else {
      failed.push({
        index: i,
        error: result.error?.message || "Unknown error",
      })
    }
  }

  const avgConsistencyScore =
    metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.consistencyScore, 0) / metrics.length
      : 0

  const avgGenerationTime =
    metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.generationTime, 0) / metrics.length : 0

  return {
    success: failed.length === 0,
    created,
    failed,
    summary: {
      total: options.count,
      successful: created.length,
      failed: failed.length,
      avgConsistencyScore: Math.round(avgConsistencyScore),
      avgGenerationTime: Math.round(avgGenerationTime),
    },
  }
}
