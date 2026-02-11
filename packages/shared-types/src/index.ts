/**
 * DeepSight 공유 타입 정의
 * @module @deepsight/shared-types
 */

// ============================================
// v3.0 106D+ 타입 시스템
// ============================================
export * from "./persona-v3"

// ============================================
// 6D 벡터 시스템 (Legacy — backward compat)
// ============================================

/**
 * 6D 페르소나 벡터
 * 각 차원은 0-1 범위의 값
 */
export interface PersonaVector {
  depth: number // 깊이 (표면적 ↔ 심층적)
  lens: number // 렌즈 (객관적 ↔ 주관적)
  stance: number // 입장 (보수적 ↔ 진보적)
  scope: number // 범위 (개인적 ↔ 사회적)
  taste: number // 취향 (대중적 ↔ 마니아)
  purpose: number // 목적 (정보 ↔ 감성)
}

/**
 * 벡터 차원 이름
 */
export const VECTOR_DIMENSIONS = ["depth", "lens", "stance", "scope", "taste", "purpose"] as const

export type VectorDimension = (typeof VECTOR_DIMENSIONS)[number]

// ============================================
// 페르소나
// ============================================

export type PersonaStatus = "DRAFT" | "ACTIVE" | "LEGACY" | "DEPRECATED" | "ARCHIVED"
export type PersonaVisibility = "PUBLIC" | "PRIVATE"

export interface Persona {
  id: string
  name: string
  role: string
  tagline?: string
  description?: string
  avatarUrl?: string
  status: PersonaStatus
  visibility: PersonaVisibility
  specialty: string[]
  tags: string[]
  vector: PersonaVector
  createdAt: string
  updatedAt: string
}

// ============================================
// 매칭 결과
// ============================================

export interface MatchResult {
  personaId: string
  personaName: string
  score: number
  explanation?: string
}

export interface MatchRequest {
  userVector: PersonaVector
  contentType?: string
  limit?: number
}

// ============================================
// 플랜 & 빌링
// ============================================

export type Plan = "FREE" | "STARTER" | "PRO" | "ENTERPRISE"

export interface PlanDetails {
  name: Plan
  displayName: string
  price: number
  apiCallLimit: number
  rateLimit: number
  apiKeysLimit: number
  teamMembersLimit: number
  features: string[]
}

export const PLAN_LIMITS: Record<Plan, PlanDetails> = {
  FREE: {
    name: "FREE",
    displayName: "Free",
    price: 0,
    apiCallLimit: 1000,
    rateLimit: 10,
    apiKeysLimit: 1,
    teamMembersLimit: 1,
    features: ["기본 매칭", "3개 페르소나"],
  },
  STARTER: {
    name: "STARTER",
    displayName: "Starter",
    price: 49,
    apiCallLimit: 10000,
    rateLimit: 50,
    apiKeysLimit: 3,
    teamMembersLimit: 3,
    features: ["규칙 기반 가중치", "10개 페르소나", "기본 분석"],
  },
  PRO: {
    name: "PRO",
    displayName: "Pro",
    price: 199,
    apiCallLimit: 100000,
    rateLimit: 200,
    apiKeysLimit: 10,
    teamMembersLimit: 10,
    features: ["LLM 컨텍스트 분석", "무제한 페르소나", "고급 분석", "우선 지원"],
  },
  ENTERPRISE: {
    name: "ENTERPRISE",
    displayName: "Enterprise",
    price: -1, // 문의
    apiCallLimit: -1,
    rateLimit: -1,
    apiKeysLimit: -1,
    teamMembersLimit: -1,
    features: ["전용 인프라", "SLA 보장", "전담 지원", "커스텀 기능"],
  },
}

// ============================================
// API 응답 형식
// ============================================

export interface ApiResponse<T> {
  success: true
  data: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    hasMore?: boolean
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

// ============================================
// 사용자 & 조직
// ============================================

export type MemberRole = "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER" | "BILLING"

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  role: MemberRole
  createdAt: string
  updatedAt: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  logoUrl?: string
  plan: Plan
  createdAt: string
  updatedAt: string
}
