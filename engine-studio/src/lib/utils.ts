import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("ko-KR").format(num)
}

export function formatPercent(num: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num / 100)
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount)
}

export function generateId(): string {
  // Use crypto.randomUUID() for guaranteed uniqueness
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older environments
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 15)}`
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// 6D Vector 관련 유틸리티
export interface Vector6D {
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
}

export type VectorDimension = keyof Vector6D

export function calculateCosineSimilarity(v1: Vector6D, v2: Vector6D): number {
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (const dim of dimensions) {
    dotProduct += v1[dim] * v2[dim]
    norm1 += v1[dim] * v1[dim]
    norm2 += v2[dim] * v2[dim]
  }

  if (norm1 === 0 || norm2 === 0) return 0

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

export function calculateWeightedSimilarity(
  v1: Vector6D,
  v2: Vector6D,
  weights: Vector6D
): number {
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const

  let weightedDot = 0
  let weightedNorm1 = 0
  let weightedNorm2 = 0

  for (const dim of dimensions) {
    const w = weights[dim]
    weightedDot += w * v1[dim] * v2[dim]
    weightedNorm1 += w * v1[dim] * v1[dim]
    weightedNorm2 += w * v2[dim] * v2[dim]
  }

  if (weightedNorm1 === 0 || weightedNorm2 === 0) return 0

  return weightedDot / (Math.sqrt(weightedNorm1) * Math.sqrt(weightedNorm2))
}

export function normalizeVector(v: Vector6D): Vector6D {
  const dimensions = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const
  let norm = 0

  for (const dim of dimensions) {
    norm += v[dim] * v[dim]
  }

  norm = Math.sqrt(norm)
  if (norm === 0) return { ...v }

  const result: Vector6D = { ...v }
  for (const dim of dimensions) {
    result[dim] = v[dim] / norm
  }

  return result
}

export function vectorToMatchScore(similarity: number): number {
  // Convert cosine similarity (-1 to 1) to match score (0 to 100)
  return Math.round(((similarity + 1) / 2) * 100)
}

// Persona 상태 라벨
export const PERSONA_STATUS_LABELS: Record<string, string> = {
  DRAFT: "초안",
  REVIEW: "검수 대기",
  ACTIVE: "활성",
  STANDARD: "표준",
  LEGACY: "구형",
  DEPRECATED: "지원 중단",
  PAUSED: "일시 중단",
  ARCHIVED: "보관",
}

export const PERSONA_ROLE_LABELS: Record<string, string> = {
  REVIEWER: "리뷰어",
  CURATOR: "큐레이터",
  EDUCATOR: "교육자",
  COMPANION: "동반자",
  ANALYST: "분석가",
}

export const USER_ROLE_LABELS: Record<string, string> = {
  ADMIN: "관리자",
  AI_ENGINEER: "AI 엔지니어",
  CONTENT_MANAGER: "콘텐츠 매니저",
  ANALYST: "분석가",
}

// 6D 벡터 차원 라벨
export const VECTOR_DIMENSION_LABELS = {
  depth: {
    name: "Depth",
    label: "분석 깊이",
    low: "직관적",
    high: "심층적",
    description: "콘텐츠를 얼마나 깊이 분석하는지",
  },
  lens: {
    name: "Lens",
    label: "판단 렌즈",
    low: "감성적",
    high: "논리적",
    description: "감성적 vs 논리적 판단 성향",
  },
  stance: {
    name: "Stance",
    label: "평가 태도",
    low: "수용적",
    high: "비판적",
    description: "콘텐츠에 대한 수용/비판 정도",
  },
  scope: {
    name: "Scope",
    label: "관심 범위",
    low: "핵심만",
    high: "디테일",
    description: "핵심 요약 vs 세부 사항 관심도",
  },
  taste: {
    name: "Taste",
    label: "취향 성향",
    low: "클래식",
    high: "실험적",
    description: "검증된 작품 vs 실험적 작품 선호",
  },
  purpose: {
    name: "Purpose",
    label: "소비 목적",
    low: "오락",
    high: "의미 추구",
    description: "가벼운 오락 vs 의미 추구",
  },
} as const

// 벡터 프리셋
export const VECTOR_PRESETS = {
  coldAnalyst: {
    name: "냉철한 분석가",
    depth: 0.9,
    lens: 0.85,
    stance: 0.75,
    scope: 0.8,
    taste: 0.3,
    purpose: 0.7,
  },
  emotionalEssayist: {
    name: "감성 에세이스트",
    depth: 0.6,
    lens: 0.2,
    stance: 0.4,
    scope: 0.5,
    taste: 0.5,
    purpose: 0.8,
  },
  trendHunter: {
    name: "트렌드 헌터",
    depth: 0.4,
    lens: 0.5,
    stance: 0.3,
    scope: 0.6,
    taste: 0.9,
    purpose: 0.4,
  },
  balancedGuide: {
    name: "균형 잡힌 가이드",
    depth: 0.5,
    lens: 0.5,
    stance: 0.5,
    scope: 0.5,
    taste: 0.5,
    purpose: 0.5,
  },
} as const

// =============================================================================
// DB ↔ Frontend 데이터 변환 유틸리티
// =============================================================================

/**
 * DB UserVector 형식 (개별 칼럼)
 * DB에서는 depth, lens, stance, scope, taste, purpose를 개별 칼럼으로 저장
 */
export interface DBUserVector {
  id: string
  userId: string
  onboardingLevel: "LIGHT" | "MEDIUM" | "DEEP"
  depth: number
  lens: number
  stance: number
  scope: number
  taste: number
  purpose: number
  archetype: string | null
  confidenceDepth: number | null
  confidenceLens: number | null
  confidenceStance: number | null
  confidenceScope: number | null
  confidenceTaste: number | null
  confidencePurpose: number | null
  updatedAt: Date
}

/**
 * Frontend UserVector 형식 (중첩 객체)
 */
export interface FrontendUserVector {
  id: string
  userId: string
  onboardingLevel: "LIGHT" | "MEDIUM" | "DEEP"
  vector: Vector6D
  archetype: string | null
  confidenceScores: Vector6D | null
  updatedAt: Date
}

/**
 * DB UserVector → Frontend UserVector 변환
 */
export function transformDBUserVectorToFrontend(db: DBUserVector): FrontendUserVector {
  return {
    id: db.id,
    userId: db.userId,
    onboardingLevel: db.onboardingLevel,
    vector: {
      depth: db.depth,
      lens: db.lens,
      stance: db.stance,
      scope: db.scope,
      taste: db.taste,
      purpose: db.purpose,
    },
    archetype: db.archetype,
    confidenceScores: db.confidenceDepth !== null ? {
      depth: db.confidenceDepth ?? 0,
      lens: db.confidenceLens ?? 0,
      stance: db.confidenceStance ?? 0,
      scope: db.confidenceScope ?? 0,
      taste: db.confidenceTaste ?? 0,
      purpose: db.confidencePurpose ?? 0,
    } : null,
    updatedAt: db.updatedAt,
  }
}

/**
 * Frontend UserVector → DB UserVector 변환
 */
export function transformFrontendUserVectorToDB(
  frontend: FrontendUserVector
): Omit<DBUserVector, "id" | "updatedAt"> {
  return {
    userId: frontend.userId,
    onboardingLevel: frontend.onboardingLevel,
    depth: frontend.vector.depth,
    lens: frontend.vector.lens,
    stance: frontend.vector.stance,
    scope: frontend.vector.scope,
    taste: frontend.vector.taste,
    purpose: frontend.vector.purpose,
    archetype: frontend.archetype,
    confidenceDepth: frontend.confidenceScores?.depth ?? null,
    confidenceLens: frontend.confidenceScores?.lens ?? null,
    confidenceStance: frontend.confidenceScores?.stance ?? null,
    confidenceScope: frontend.confidenceScores?.scope ?? null,
    confidenceTaste: frontend.confidenceScores?.taste ?? null,
    confidencePurpose: frontend.confidenceScores?.purpose ?? null,
  }
}

/**
 * DB Archetype 형식 (개별 min/max 칼럼)
 */
export interface DBArchetype {
  id: string
  name: string
  description: string | null
  depthMin: number
  depthMax: number
  lensMin: number
  lensMax: number
  stanceMin: number
  stanceMax: number
  scopeMin: number
  scopeMax: number
  tasteMin: number
  tasteMax: number
  purposeMin: number
  purposeMax: number
  recommendedPersonaIds: string[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Frontend Archetype 형식 (중첩 vectorRanges 객체)
 */
export interface FrontendArchetype {
  id: string
  name: string
  description: string | null
  vectorRanges: {
    [K in VectorDimension]: { min: number; max: number }
  }
  recommendedPersonaIds: string[]
  createdAt: Date
  updatedAt: Date
}

/**
 * DB Archetype → Frontend Archetype 변환
 */
export function transformDBArchetypeToFrontend(db: DBArchetype): FrontendArchetype {
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    vectorRanges: {
      depth: { min: db.depthMin, max: db.depthMax },
      lens: { min: db.lensMin, max: db.lensMax },
      stance: { min: db.stanceMin, max: db.stanceMax },
      scope: { min: db.scopeMin, max: db.scopeMax },
      taste: { min: db.tasteMin, max: db.tasteMax },
      purpose: { min: db.purposeMin, max: db.purposeMax },
    },
    recommendedPersonaIds: db.recommendedPersonaIds,
    createdAt: db.createdAt,
    updatedAt: db.updatedAt,
  }
}

/**
 * Frontend Archetype → DB Archetype 변환
 */
export function transformFrontendArchetypeToDB(
  frontend: FrontendArchetype
): Omit<DBArchetype, "id" | "createdAt" | "updatedAt"> {
  return {
    name: frontend.name,
    description: frontend.description,
    depthMin: frontend.vectorRanges.depth.min,
    depthMax: frontend.vectorRanges.depth.max,
    lensMin: frontend.vectorRanges.lens.min,
    lensMax: frontend.vectorRanges.lens.max,
    stanceMin: frontend.vectorRanges.stance.min,
    stanceMax: frontend.vectorRanges.stance.max,
    scopeMin: frontend.vectorRanges.scope.min,
    scopeMax: frontend.vectorRanges.scope.max,
    tasteMin: frontend.vectorRanges.taste.min,
    tasteMax: frontend.vectorRanges.taste.max,
    purposeMin: frontend.vectorRanges.purpose.min,
    purposeMax: frontend.vectorRanges.purpose.max,
    recommendedPersonaIds: frontend.recommendedPersonaIds,
  }
}
