/**
 * Persona Service - 페르소나 관련 API 서비스
 * 페르소나 CRUD 및 관련 기능을 제공합니다.
 */

import { apiClient, ApiError } from "./api-client"
import type {
  Persona,
  PersonaCreateInput,
  PersonaUpdateInput,
  PersonaFilters,
  PersonaVector,
  Vector6D,
  PaginationParams,
} from "@/types"
import { PAGINATION_DEFAULTS } from "@/constants"

// ============================================================================
// 타입 정의
// ============================================================================

export interface PersonaListResponse {
  personas: PersonaWithVector[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface PersonaWithVector extends Persona {
  vector: Vector6D
}

export interface PersonaDetailResponse extends PersonaWithVector {
  versions: PersonaVector[]
  metrics?: PersonaMetrics
}

export interface PersonaMetrics {
  impressions: number
  clicks: number
  ctr: number
  likes: number
  dislikes: number
  satisfactionRate: number
  avgEngagementTime: number
}

export interface PersonaTestRequest {
  contentTitle: string
  contentDescription: string
  personaId: string
}

export interface PersonaTestResponse {
  response: string
  scores: {
    vectorAlignment: number
    toneMatch: number
    reasoningQuality: number
  }
  executionTime: number
}

// ============================================================================
// Mock 데이터 (개발용 - 프로덕션에서는 API로 대체)
// ============================================================================

const MOCK_PERSONAS: PersonaWithVector[] = [
  {
    id: "persona-001",
    organizationId: null,
    visibility: "GLOBAL",
    sharedWithOrgs: [],
    name: "논리적 평론가",
    role: "REVIEWER",
    expertise: ["영화", "드라마"],
    description: "데이터와 논리로 콘텐츠를 분석하는 평론가입니다.",
    profileImageUrl: null,
    promptTemplate: "당신은 논리적 평론가입니다...",
    promptVersion: "1.0.0",
    status: "ACTIVE",
    qualityScore: 92,
    validationScore: 95,
    validationVersion: 1,
    lastValidationDate: new Date("2024-01-15"),
    source: "MANUAL",
    parentPersonaId: null,
    createdById: "user-001",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
    activatedAt: new Date("2024-01-10"),
    archivedAt: null,
    vector: {
      depth: 0.85,
      lens: 0.9,
      stance: 0.8,
      scope: 0.85,
      taste: 0.3,
      purpose: 0.7,
    },
  },
  {
    id: "persona-002",
    organizationId: null,
    visibility: "GLOBAL",
    sharedWithOrgs: [],
    name: "감성 에세이스트",
    role: "CURATOR",
    expertise: ["음악", "예술"],
    description: "감정과 분위기로 콘텐츠를 소개하는 큐레이터입니다.",
    profileImageUrl: null,
    promptTemplate: "당신은 감성 에세이스트입니다...",
    promptVersion: "1.0.0",
    status: "ACTIVE",
    qualityScore: 88,
    validationScore: 90,
    validationVersion: 1,
    lastValidationDate: new Date("2024-01-14"),
    source: "MANUAL",
    parentPersonaId: null,
    createdById: "user-001",
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-14"),
    activatedAt: new Date("2024-01-10"),
    archivedAt: null,
    vector: {
      depth: 0.6,
      lens: 0.2,
      stance: 0.3,
      scope: 0.4,
      taste: 0.6,
      purpose: 0.8,
    },
  },
  {
    id: "persona-003",
    organizationId: null,
    visibility: "GLOBAL",
    sharedWithOrgs: [],
    name: "트렌드 헌터",
    role: "CURATOR",
    expertise: ["팝컬처", "SNS"],
    description: "최신 트렌드를 빠르게 포착하는 큐레이터입니다.",
    profileImageUrl: null,
    promptTemplate: "당신은 트렌드 헌터입니다...",
    promptVersion: "1.0.0",
    status: "ACTIVE",
    qualityScore: 85,
    validationScore: 88,
    validationVersion: 1,
    lastValidationDate: new Date("2024-01-13"),
    source: "INCUBATOR",
    parentPersonaId: null,
    createdById: "user-002",
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date("2024-01-13"),
    activatedAt: new Date("2024-01-10"),
    archivedAt: null,
    vector: {
      depth: 0.4,
      lens: 0.5,
      stance: 0.4,
      scope: 0.3,
      taste: 0.95,
      purpose: 0.3,
    },
  },
  {
    id: "persona-004",
    organizationId: null,
    visibility: "GLOBAL",
    sharedWithOrgs: [],
    name: "클래식 감정가",
    role: "ANALYST",
    expertise: ["클래식 음악", "문학"],
    description: "시간이 검증한 작품을 깊이 분석하는 감정가입니다.",
    profileImageUrl: null,
    promptTemplate: "당신은 클래식 감정가입니다...",
    promptVersion: "1.0.0",
    status: "STANDARD",
    qualityScore: 78,
    validationScore: 82,
    validationVersion: 1,
    lastValidationDate: new Date("2024-01-12"),
    source: "MANUAL",
    parentPersonaId: null,
    createdById: "user-001",
    createdAt: new Date("2024-01-04"),
    updatedAt: new Date("2024-01-12"),
    activatedAt: new Date("2024-01-10"),
    archivedAt: null,
    vector: {
      depth: 0.9,
      lens: 0.7,
      stance: 0.6,
      scope: 0.8,
      taste: 0.1,
      purpose: 0.9,
    },
  },
  {
    id: "persona-005",
    organizationId: null,
    visibility: "GLOBAL",
    sharedWithOrgs: [],
    name: "캐주얼 가이드",
    role: "COMPANION",
    expertise: ["대중문화", "엔터테인먼트"],
    description: "가볍고 친근하게 콘텐츠를 소개하는 가이드입니다.",
    profileImageUrl: null,
    promptTemplate: "당신은 캐주얼 가이드입니다...",
    promptVersion: "1.0.0",
    status: "DRAFT",
    qualityScore: 65,
    validationScore: null,
    validationVersion: null,
    lastValidationDate: null,
    source: "MANUAL",
    parentPersonaId: null,
    createdById: "user-002",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-15"),
    activatedAt: null,
    archivedAt: null,
    vector: {
      depth: 0.2,
      lens: 0.4,
      stance: 0.2,
      scope: 0.2,
      taste: 0.6,
      purpose: 0.2,
    },
  },
]

// ============================================================================
// 서비스 클래스
// ============================================================================

class PersonaService {
  private readonly baseEndpoint = "/personas"

  // 개발 모드 여부 (환경변수로 제어)
  private get useMockData(): boolean {
    return process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || process.env.NODE_ENV === "development"
  }

  /**
   * 페르소나 목록 조회
   */
  async getPersonas(
    filters?: PersonaFilters,
    pagination?: PaginationParams
  ): Promise<PersonaListResponse> {
    if (this.useMockData) {
      return this.getMockPersonas(filters, pagination)
    }

    const params: Record<string, string | number | boolean | undefined> = {
      page: pagination?.page ?? PAGINATION_DEFAULTS.page,
      limit: pagination?.limit ?? PAGINATION_DEFAULTS.limit,
      sortBy: pagination?.sortBy ?? filters?.sortBy,
      sortOrder: pagination?.sortOrder ?? filters?.sortOrder,
      search: filters?.search,
      source: filters?.source,
    }

    // 배열 필터 처리
    if (filters?.status) {
      params.status = Array.isArray(filters.status) ? filters.status.join(",") : filters.status
    }
    if (filters?.role) {
      params.role = Array.isArray(filters.role) ? filters.role.join(",") : filters.role
    }

    const response = await apiClient.get<PersonaListResponse>(this.baseEndpoint, params)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "PERSONA_FETCH_FAILED",
        message: "페르소나 목록을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 페르소나 상세 조회
   */
  async getPersonaById(id: string): Promise<PersonaDetailResponse> {
    if (this.useMockData) {
      return this.getMockPersonaById(id)
    }

    const response = await apiClient.get<PersonaDetailResponse>(`${this.baseEndpoint}/${id}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "PERSONA_NOT_FOUND",
        message: "페르소나를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 페르소나 생성
   */
  async createPersona(input: PersonaCreateInput): Promise<PersonaWithVector> {
    // 입력 유효성 검증
    this.validatePersonaInput(input)

    if (this.useMockData) {
      return this.createMockPersona(input)
    }

    const response = await apiClient.post<PersonaWithVector>(this.baseEndpoint, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "PERSONA_CREATE_FAILED",
        message: "페르소나 생성에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 페르소나 수정
   */
  async updatePersona(id: string, input: PersonaUpdateInput): Promise<PersonaWithVector> {
    if (this.useMockData) {
      return this.updateMockPersona(id, input)
    }

    const response = await apiClient.patch<PersonaWithVector>(`${this.baseEndpoint}/${id}`, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "PERSONA_UPDATE_FAILED",
        message: "페르소나 수정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 페르소나 삭제 (아카이브)
   */
  async deletePersona(id: string): Promise<void> {
    if (this.useMockData) {
      return this.deleteMockPersona(id)
    }

    const response = await apiClient.delete(`${this.baseEndpoint}/${id}`)

    if (!response.success) {
      throw new ApiError({
        code: "PERSONA_DELETE_FAILED",
        message: "페르소나 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  /**
   * 페르소나 테스트
   */
  async testPersona(request: PersonaTestRequest): Promise<PersonaTestResponse> {
    if (this.useMockData) {
      return this.mockTestPersona(request)
    }

    const response = await apiClient.post<PersonaTestResponse>(
      `${this.baseEndpoint}/${request.personaId}/test`,
      {
        contentTitle: request.contentTitle,
        contentDescription: request.contentDescription,
      }
    )

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "PERSONA_TEST_FAILED",
        message: "페르소나 테스트에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 페르소나 상태 변경
   */
  async updatePersonaStatus(id: string, status: Persona["status"]): Promise<PersonaWithVector> {
    return this.updatePersona(id, { status })
  }

  // ============================================================================
  // 유효성 검증
  // ============================================================================

  private validatePersonaInput(input: PersonaCreateInput): void {
    const errors: string[] = []

    if (!input.name || input.name.trim().length < 2) {
      errors.push("이름은 2자 이상이어야 합니다.")
    }

    if (!input.role) {
      errors.push("역할을 선택해주세요.")
    }

    if (!input.vector) {
      errors.push("벡터 설정이 필요합니다.")
    } else {
      const vectorKeys: (keyof Vector6D)[] = ["depth", "lens", "stance", "scope", "taste", "purpose"]
      for (const key of vectorKeys) {
        const value = input.vector[key]
        if (typeof value !== "number" || value < 0 || value > 1) {
          errors.push(`벡터 ${key} 값은 0~1 사이여야 합니다.`)
        }
      }
    }

    if (!input.promptTemplate || input.promptTemplate.trim().length < 50) {
      errors.push("프롬프트 템플릿은 50자 이상이어야 합니다.")
    }

    if (errors.length > 0) {
      throw new ApiError({
        code: "VALIDATION_ERROR",
        message: errors.join(" "),
        status: 400,
        details: { errors },
        timestamp: new Date().toISOString(),
      })
    }
  }

  // ============================================================================
  // Mock 데이터 메서드 (개발용)
  // ============================================================================

  private getMockPersonas(
    filters?: PersonaFilters,
    pagination?: PaginationParams
  ): PersonaListResponse {
    let result = [...MOCK_PERSONAS]

    // 필터링
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower)
      )
    }

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      result = result.filter((p) => statuses.includes(p.status))
    }

    if (filters?.role) {
      const roles = Array.isArray(filters.role) ? filters.role : [filters.role]
      result = result.filter((p) => roles.includes(p.role))
    }

    // 정렬
    const sortBy = filters?.sortBy || pagination?.sortBy || "createdAt"
    const sortOrder = filters?.sortOrder || pagination?.sortOrder || "desc"

    result.sort((a, b) => {
      const aVal = a[sortBy as keyof PersonaWithVector]
      const bVal = b[sortBy as keyof PersonaWithVector]

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    // 페이지네이션
    const page = pagination?.page ?? PAGINATION_DEFAULTS.page
    const limit = pagination?.limit ?? PAGINATION_DEFAULTS.limit
    const start = (page - 1) * limit
    const end = start + limit
    const paginatedResult = result.slice(start, end)

    return {
      personas: paginatedResult,
      total: result.length,
      page,
      limit,
      hasMore: end < result.length,
    }
  }

  private getMockPersonaById(id: string): PersonaDetailResponse {
    const persona = MOCK_PERSONAS.find((p) => p.id === id)

    if (!persona) {
      throw new ApiError({
        code: "PERSONA_NOT_FOUND",
        message: "페르소나를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      ...persona,
      versions: [
        {
          id: `${id}-v1`,
          personaId: id,
          version: 1,
          ...persona.vector,
          createdAt: persona.createdAt,
        },
      ],
      metrics: {
        impressions: Math.floor(Math.random() * 10000),
        clicks: Math.floor(Math.random() * 1000),
        ctr: Math.random() * 10,
        likes: Math.floor(Math.random() * 500),
        dislikes: Math.floor(Math.random() * 50),
        satisfactionRate: 70 + Math.random() * 30,
        avgEngagementTime: Math.floor(Math.random() * 300),
      },
    }
  }

  private createMockPersona(input: PersonaCreateInput): PersonaWithVector {
    const now = new Date()
    const id = `persona-${Date.now()}`

    return {
      id,
      organizationId: null,
      visibility: "GLOBAL",
      sharedWithOrgs: [],
      name: input.name,
      role: input.role,
      expertise: input.expertise ?? [],
      description: input.description ?? null,
      profileImageUrl: input.profileImageUrl ?? null,
      promptTemplate: input.promptTemplate,
      promptVersion: "1.0.0",
      status: "DRAFT",
      qualityScore: null,
      validationScore: null,
      validationVersion: null,
      lastValidationDate: null,
      source: "MANUAL",
      parentPersonaId: null,
      createdById: "current-user",
      createdAt: now,
      updatedAt: now,
      activatedAt: null,
      archivedAt: null,
      vector: input.vector,
    }
  }

  private updateMockPersona(id: string, input: PersonaUpdateInput): PersonaWithVector {
    const persona = MOCK_PERSONAS.find((p) => p.id === id)

    if (!persona) {
      throw new ApiError({
        code: "PERSONA_NOT_FOUND",
        message: "페르소나를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      ...persona,
      ...input,
      vector: input.vector ?? persona.vector,
      updatedAt: new Date(),
    }
  }

  private deleteMockPersona(id: string): void {
    const index = MOCK_PERSONAS.findIndex((p) => p.id === id)

    if (index === -1) {
      throw new ApiError({
        code: "PERSONA_NOT_FOUND",
        message: "페르소나를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    // Mock에서는 실제로 삭제하지 않고 상태만 변경
    MOCK_PERSONAS[index].status = "ARCHIVED"
    MOCK_PERSONAS[index].archivedAt = new Date()
  }

  private mockTestPersona(request: PersonaTestRequest): PersonaTestResponse {
    const persona = MOCK_PERSONAS.find((p) => p.id === request.personaId)

    if (!persona) {
      throw new ApiError({
        code: "PERSONA_NOT_FOUND",
        message: "페르소나를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    // Mock 응답 생성
    const depthDescriptor = persona.vector.depth > 0.7 ? "깊이 있게 분석하자면" : "간단히 말하자면"
    const lensDescriptor = persona.vector.lens > 0.7 ? "객관적으로 평가하면" : "개인적인 느낌으로는"

    return {
      response: `${depthDescriptor}, "${request.contentTitle}"은(는) ${lensDescriptor} 매우 흥미로운 작품입니다. ${request.contentDescription}에서 드러나는 주제의식이 인상적입니다.`,
      scores: {
        vectorAlignment: 85 + Math.random() * 15,
        toneMatch: 80 + Math.random() * 20,
        reasoningQuality: 75 + Math.random() * 25,
      },
      executionTime: 500 + Math.random() * 1000,
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const personaService = new PersonaService()
export default personaService
