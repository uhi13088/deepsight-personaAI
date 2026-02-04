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
// 서비스 클래스
// ============================================================================

class PersonaService {
  private readonly baseEndpoint = "/personas"

  /**
   * 페르소나 목록 조회
   */
  async getPersonas(
    filters?: PersonaFilters,
    pagination?: PaginationParams
  ): Promise<PersonaListResponse> {
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
      const vectorKeys: (keyof Vector6D)[] = [
        "depth",
        "lens",
        "stance",
        "scope",
        "taste",
        "purpose",
      ]
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
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const personaService = new PersonaService()
export default personaService
