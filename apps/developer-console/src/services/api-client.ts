/**
 * API Client - Developer Console API 클라이언트
 */

// ============================================================================
// 타입 정의
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: Record<string, unknown>
}

export interface ApiErrorDetails {
  code: string
  message: string
  status: number
  details?: Record<string, unknown>
  timestamp: string
}

export class ApiError extends Error {
  public readonly code: string
  public readonly status: number
  public readonly details?: Record<string, unknown>
  public readonly timestamp: string

  constructor(errorDetails: ApiErrorDetails) {
    super(errorDetails.message)
    this.name = "ApiError"
    this.code = errorDetails.code
    this.status = errorDetails.status
    this.details = errorDetails.details
    this.timestamp = errorDetails.timestamp
  }

  static fromResponse(
    status: number,
    data?: { code?: string; message?: string; details?: Record<string, unknown> }
  ): ApiError {
    const errorMessages: Record<number, { code: string; message: string }> = {
      400: { code: "VALIDATION_ERROR", message: "잘못된 요청입니다." },
      401: { code: "UNAUTHORIZED", message: "인증이 필요합니다." },
      403: { code: "FORBIDDEN", message: "권한이 없습니다." },
      404: { code: "NOT_FOUND", message: "요청한 리소스를 찾을 수 없습니다." },
      429: { code: "RATE_LIMIT", message: "요청 한도를 초과했습니다." },
      500: { code: "SERVER_ERROR", message: "서버 오류가 발생했습니다." },
    }

    const defaultError = errorMessages[status] || {
      code: "UNKNOWN_ERROR",
      message: "알 수 없는 오류가 발생했습니다.",
    }

    return new ApiError({
      code: data?.code || defaultError.code,
      message: data?.message || defaultError.message,
      status,
      details: data?.details,
      timestamp: new Date().toISOString(),
    })
  }

  static networkError(message: string): ApiError {
    return new ApiError({
      code: "NETWORK_ERROR",
      message: message || "네트워크 오류가 발생했습니다.",
      status: 0,
      timestamp: new Date().toISOString(),
    })
  }
}

// ============================================================================
// API Client 클래스
// ============================================================================

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = "/api") {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    method: string,
    endpoint: string,
    options?: { body?: unknown; params?: Record<string, string | number | boolean | undefined> }
  ): Promise<ApiResponse<T>> {
    const fullPath = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`
    const base = typeof window !== "undefined" ? window.location.origin : "http://localhost:3001"
    const url = new URL(fullPath, fullPath.startsWith("http") ? undefined : base)

    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const requestOptions: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }

    if (options?.body && method !== "GET") {
      requestOptions.body = JSON.stringify(options.body)
    }

    try {
      const response = await fetch(url.toString(), requestOptions)

      if (!response.ok) {
        let errorData:
          | { code?: string; message?: string; details?: Record<string, unknown> }
          | undefined
        try {
          errorData = await response.json()
        } catch {
          // JSON parsing failed
        }
        throw ApiError.fromResponse(response.status, errorData)
      }

      if (response.status === 204) {
        return { success: true }
      }

      const data = await response.json()
      return { success: true, data: data.data ?? data }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw ApiError.networkError((error as Error).message)
    }
  }

  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<ApiResponse<T>> {
    return this.request<T>("GET", endpoint, { params })
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("POST", endpoint, { body })
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", endpoint, { body })
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", endpoint, { body })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", endpoint)
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const apiClient = new ApiClient()
export default apiClient
