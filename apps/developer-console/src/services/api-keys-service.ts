/**
 * API Keys Service - API 키 관리 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export type ApiKeyEnvironment = "test" | "live"
export type ApiKeyStatus = "active" | "revoked" | "expired"

export interface ApiKey {
  id: string
  name: string
  prefix: string
  lastFour: string
  environment: ApiKeyEnvironment
  status: ApiKeyStatus
  permissions: string[]
  createdAt: string
  lastUsedAt: string | null
  rateLimit: number
  stats?: {
    totalCalls: number
    callsThisMonth: number
    successRate: number
    avgLatency: number
  }
}

export interface CreateApiKeyInput {
  name: string
  environment: ApiKeyEnvironment
  permissions: string[]
}

export interface UpdateApiKeyInput {
  name?: string
  permissions?: string[]
  rateLimit?: number
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey
  key: string
  message: string
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class ApiKeysService {
  async getKeys(): Promise<{ apiKeys: ApiKey[]; total: number }> {
    const response = await apiClient.get<{ apiKeys: ApiKey[]; total: number }>("/api-keys")

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "API_KEYS_FETCH_FAILED",
        message: "API 키 목록을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  async getKey(id: string): Promise<ApiKey> {
    const response = await apiClient.get<{ apiKey: ApiKey }>(`/api-keys/${id}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "API_KEY_NOT_FOUND",
        message: "API 키를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.apiKey
  }

  async createKey(input: CreateApiKeyInput): Promise<CreateApiKeyResponse> {
    const response = await apiClient.post<CreateApiKeyResponse>("/api-keys", input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "API_KEY_CREATE_FAILED",
        message: "API 키 생성에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  async updateKey(id: string, input: UpdateApiKeyInput): Promise<ApiKey> {
    const response = await apiClient.patch<{ apiKey: ApiKey }>(`/api-keys/${id}`, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "API_KEY_UPDATE_FAILED",
        message: "API 키 수정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.apiKey
  }

  async revokeKey(id: string): Promise<void> {
    const response = await apiClient.delete(`/api-keys/${id}`)

    if (!response.success) {
      throw new ApiError({
        code: "API_KEY_REVOKE_FAILED",
        message: "API 키 폐기에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const apiKeysService = new ApiKeysService()
export default apiKeysService
