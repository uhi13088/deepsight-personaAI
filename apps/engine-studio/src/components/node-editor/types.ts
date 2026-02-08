/**
 * Node Editor 타입 정의
 * ComfyUI 스타일 페르소나 편집기를 위한 타입 시스템
 */

import type { Vector6D, PersonaRole, PersonaStatus } from "@/types"

// ============================================
// 노드 데이터 타입 (type alias — @xyflow/react Record<string,unknown> 호환)
// ============================================

export type BasicInfoNodeData = {
  name: string
  role: PersonaRole
  expertise: string[]
  description: string
  status: PersonaStatus
  visibility: string
  onChange: (field: string, value: unknown) => void
}

export type VectorNodeData = {
  vector: Vector6D
  onChange: (key: string, value: number) => void
}

export type CharacterNodeData = {
  warmth: number
  speechPatterns: string[]
  quirks: string[]
  background: string
  favoriteGenres: string[]
  dislikedGenres: string[]
  onChange: (field: string, value: unknown) => void
}

export type PromptNodeData = {
  systemPrompt: string
  exampleResponses: string[]
  restrictions: string[]
  onChange: (field: string, value: unknown) => void
  onAutoGenerate?: () => void
}

export type TestNodeData = {
  personaId: string
  testHistory: TestResult[]
  isRunning: boolean
  onRunTest: (content: string, description: string) => void
}

export type ValidationNodeData = {
  qualityScore: number
  validationResult: ValidationResult | null
  isValidating: boolean
  onValidate: () => void
}

export type DeployNodeData = {
  status: PersonaStatus
  versions: VersionEntry[]
  onStatusChange: (status: PersonaStatus) => void
  onSave: () => void
  isSaving: boolean
}

// ============================================
// 보조 타입
// ============================================

export type TestResult = {
  id: string
  content: string
  response: string
  scores: {
    vectorAlignment: number
    toneMatch: number
    reasoningQuality: number
  }
  timestamp: string
}

export type ValidationResult = {
  overallScore: number
  passed: boolean
  breakdown: {
    promptQuality: { score: number; issues: string[] }
    vectorConsistency: { score: number; issues: string[] }
    expertiseRelevance: { score: number; issues: string[] }
  }
  allIssues: string[]
}

export type VersionEntry = {
  version: string
  date: string
  changes: string
}

// ============================================
// 노드 에디터 상태
// ============================================

export type PersonaEditorState = {
  personaId: string | null
  basicInfo: {
    name: string
    role: PersonaRole
    expertise: string[]
    description: string
    status: PersonaStatus
    visibility: string
  }
  vector: Vector6D
  character: {
    warmth: number
    speechPatterns: string[]
    quirks: string[]
    background: string
    favoriteGenres: string[]
    dislikedGenres: string[]
  }
  prompt: {
    systemPrompt: string
    exampleResponses: string[]
    restrictions: string[]
  }
  testHistory: TestResult[]
  validationResult: ValidationResult | null
  versions: VersionEntry[]
  qualityScore: number
  isDirty: boolean
}

// ============================================
// 노드 타입 ID
// ============================================

export const NODE_TYPES = {
  BASIC_INFO: "basicInfo",
  VECTOR: "vector",
  CHARACTER: "character",
  PROMPT: "prompt",
  TEST: "test",
  VALIDATION: "validation",
  DEPLOY: "deploy",
} as const

export type NodeTypeId = (typeof NODE_TYPES)[keyof typeof NODE_TYPES]
