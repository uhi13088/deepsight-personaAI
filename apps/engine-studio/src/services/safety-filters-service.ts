/**
 * Safety Filters Service - 안전 필터 관리 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export type FilterType = "PROFANITY" | "HATE_SPEECH" | "POLITICAL" | "RELIGIOUS" | "CUSTOM"

export interface SafetyFilter {
  id: string
  name: string
  filterType: FilterType
  pattern: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SafetyFilterStats {
  total: number
  active: number
  inactive: number
  byType: Record<FilterType, number>
}

export interface CreateSafetyFilterInput {
  name: string
  filterType: FilterType
  pattern: string
  isActive?: boolean
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class SafetyFiltersService {
  async getFilters(filterType?: FilterType): Promise<{
    filters: SafetyFilter[]
    stats: SafetyFilterStats
  }> {
    const params = filterType ? `?filterType=${filterType}` : ""
    const response = await apiClient.get<{
      data: SafetyFilter[]
      total: number
      byType: Record<FilterType, number>
    }>(`/safety-filters${params}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "FILTERS_FETCH_FAILED",
        message: "안전 필터 목록을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    const filters = response.data.data
    const activeCount = filters.filter((f) => f.isActive).length

    return {
      filters,
      stats: {
        total: response.data.total,
        active: activeCount,
        inactive: response.data.total - activeCount,
        byType: response.data.byType || ({} as Record<FilterType, number>),
      },
    }
  }

  async getFilter(id: string): Promise<SafetyFilter> {
    const response = await apiClient.get<{ data: SafetyFilter }>(`/safety-filters/${id}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "FILTER_NOT_FOUND",
        message: "안전 필터를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async createFilter(input: CreateSafetyFilterInput): Promise<SafetyFilter> {
    const response = await apiClient.post<{ data: SafetyFilter }>("/safety-filters", input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "FILTER_CREATE_FAILED",
        message: "안전 필터 생성에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async updateFilter(id: string, input: Partial<CreateSafetyFilterInput>): Promise<SafetyFilter> {
    const response = await apiClient.patch<{ data: SafetyFilter }>(`/safety-filters/${id}`, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "FILTER_UPDATE_FAILED",
        message: "안전 필터 수정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async deleteFilter(id: string): Promise<void> {
    const response = await apiClient.delete(`/safety-filters/${id}`)

    if (!response.success) {
      throw new ApiError({
        code: "FILTER_DELETE_FAILED",
        message: "안전 필터 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async toggleFilter(id: string, isActive: boolean): Promise<SafetyFilter> {
    return this.updateFilter(id, { isActive })
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const safetyFiltersService = new SafetyFiltersService()
export default safetyFiltersService
