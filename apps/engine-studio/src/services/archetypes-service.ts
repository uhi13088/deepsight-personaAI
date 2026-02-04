/**
 * Archetypes Service - 아키타입 관리 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export interface VectorRange {
  min: number
  max: number
}

export interface Archetype {
  id: string
  name: string
  description: string | null
  vectorRanges: {
    depth: VectorRange
    lens: VectorRange
    stance: VectorRange
    scope: VectorRange
    taste: VectorRange
    purpose: VectorRange
  }
  recommendedPersonaIds: string[]
  recommendedPersonas?: Array<{
    id: string
    name: string
    role: string
    qualityScore: number | null
  }>
  createdAt: string
  updatedAt: string
}

export interface ArchetypeStats {
  total: number
  avgUserCount: number
  topArchetype: string | null
}

export interface CreateArchetypeInput {
  name: string
  description?: string
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
  recommendedPersonaIds?: string[]
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class ArchetypesService {
  async getArchetypes(): Promise<{ archetypes: Archetype[]; stats: ArchetypeStats }> {
    const response = await apiClient.get<{
      data: Archetype[]
      total: number
    }>("/archetypes")

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ARCHETYPES_FETCH_FAILED",
        message: "아키타입 목록을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      archetypes: response.data.data,
      stats: {
        total: response.data.total,
        avgUserCount: 0,
        topArchetype: response.data.data[0]?.name || null,
      },
    }
  }

  async getArchetype(id: string): Promise<Archetype> {
    const response = await apiClient.get<{ data: Archetype }>(`/archetypes/${id}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ARCHETYPE_NOT_FOUND",
        message: "아키타입을 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async createArchetype(input: CreateArchetypeInput): Promise<Archetype> {
    const response = await apiClient.post<{ data: Archetype }>("/archetypes", input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ARCHETYPE_CREATE_FAILED",
        message: "아키타입 생성에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async updateArchetype(id: string, input: Partial<CreateArchetypeInput>): Promise<Archetype> {
    const response = await apiClient.patch<{ data: Archetype }>(`/archetypes/${id}`, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ARCHETYPE_UPDATE_FAILED",
        message: "아키타입 수정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async deleteArchetype(id: string): Promise<void> {
    const response = await apiClient.delete(`/archetypes/${id}`)

    if (!response.success) {
      throw new ApiError({
        code: "ARCHETYPE_DELETE_FAILED",
        message: "아키타입 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const archetypesService = new ArchetypesService()
export default archetypesService
