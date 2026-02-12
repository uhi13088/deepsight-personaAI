// ═══════════════════════════════════════════════════════════════
// Persona Create/Edit Form Types
// 스펙 §3.1.2 기준 — 4-Step Create Flow
// ═══════════════════════════════════════════════════════════════

import type { SocialPersonaVector, CoreTemperamentVector, NarrativeDriveVector } from "./persona-v3"

// ── Step 1: Basic Info ──────────────────────────────────────
export interface BasicInfoFormData {
  name: string // 2~30자
  role: PersonaRoleValue
  expertise: string[] // 선택한 전문분야
  profileImageUrl: string // URL or empty
  description: string // max 100자
}

export type PersonaRoleValue = "REVIEWER" | "CURATOR" | "EDUCATOR" | "COMPANION" | "ANALYST"

export const PERSONA_ROLES: { value: PersonaRoleValue; label: string; description: string }[] = [
  { value: "REVIEWER", label: "Reviewer", description: "콘텐츠 리뷰 및 평가" },
  { value: "CURATOR", label: "Curator", description: "콘텐츠 큐레이션 및 추천" },
  { value: "EDUCATOR", label: "Educator", description: "교육 및 가이드" },
  { value: "COMPANION", label: "Companion", description: "대화 및 동반자" },
  { value: "ANALYST", label: "Analyst", description: "분석 및 인사이트" },
]

export const EXPERTISE_OPTIONS = [
  "영화",
  "음악",
  "도서",
  "게임",
  "패션",
  "여행",
  "음식",
  "테크",
  "스포츠",
  "미술",
  "사진",
  "건축",
  "공연",
  "애니메이션",
  "웹툰",
  "드라마",
] as const

// ── Step 2: 3-Layer Vectors ─────────────────────────────────
export interface VectorFormData {
  l1: SocialPersonaVector
  l2: CoreTemperamentVector
  l3: NarrativeDriveVector
  archetypeId: string | null
}

// ── Step 3: Prompt Engineering ──────────────────────────────
export interface PromptFormData {
  basePrompt: string
  reviewPrompt: string
  postPrompt: string
  commentPrompt: string
  interactionPrompt: string
  promptVersion: string
}

// ── Step 4: Review Options ──────────────────────────────────
export type SaveAction = "DRAFT" | "ACTIVATE"

// ── Combined Form State ─────────────────────────────────────
export interface PersonaFormState {
  step: number // 0-indexed (0~3)
  basicInfo: BasicInfoFormData
  vectors: VectorFormData
  prompt: PromptFormData
  saveAction: SaveAction
}

export const INITIAL_FORM_STATE: PersonaFormState = {
  step: 0,
  basicInfo: {
    name: "",
    role: "REVIEWER",
    expertise: [],
    profileImageUrl: "",
    description: "",
  },
  vectors: {
    l1: {
      depth: 0.5,
      lens: 0.5,
      stance: 0.5,
      scope: 0.5,
      taste: 0.5,
      purpose: 0.5,
      sociability: 0.5,
    },
    l2: {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    },
    l3: {
      lack: 0.5,
      moralCompass: 0.5,
      volatility: 0.5,
      growthArc: 0.5,
    },
    archetypeId: null,
  },
  prompt: {
    basePrompt: "",
    reviewPrompt: "",
    postPrompt: "",
    commentPrompt: "",
    interactionPrompt: "",
    promptVersion: "1.0.0",
  },
  saveAction: "DRAFT",
}

// ── Validation ──────────────────────────────────────────────
export interface StepValidation {
  valid: boolean
  errors: Record<string, string>
}

export function validateStep1(data: BasicInfoFormData): StepValidation {
  const errors: Record<string, string> = {}

  if (!data.name.trim()) {
    errors.name = "이름을 입력하세요."
  } else if (data.name.trim().length < 2) {
    errors.name = "이름은 2자 이상이어야 합니다."
  } else if (data.name.trim().length > 30) {
    errors.name = "이름은 30자 이하여야 합니다."
  }

  if (!data.role) {
    errors.role = "역할을 선택하세요."
  }

  if (data.description && data.description.length > 100) {
    errors.description = "설명은 100자 이하여야 합니다."
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateStep2(data: VectorFormData): StepValidation {
  const errors: Record<string, string> = {}

  // Validate all dimensions are in 0~1 range
  const checkRange = (
    label: string,
    vec: SocialPersonaVector | CoreTemperamentVector | NarrativeDriveVector
  ) => {
    for (const [key, value] of Object.entries(vec)) {
      if (typeof value === "number" && (value < 0 || value > 1)) {
        errors[`${label}.${key}`] = `${key}는 0.0~1.0 범위여야 합니다.`
      }
    }
  }

  checkRange("l1", data.l1)
  checkRange("l2", data.l2)
  checkRange("l3", data.l3)

  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateStep3(data: PromptFormData): StepValidation {
  const errors: Record<string, string> = {}

  if (!data.basePrompt.trim()) {
    errors.basePrompt = "프롬프트를 입력하세요."
  } else if (data.basePrompt.trim().length < 50) {
    errors.basePrompt = "프롬프트는 최소 50자 이상이어야 합니다."
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
