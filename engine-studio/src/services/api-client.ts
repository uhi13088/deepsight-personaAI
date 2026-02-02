/**
 * API Client - 중앙화된 HTTP 클라이언트
 * 모든 API 호출의 에러 처리, 재시도, 타임아웃을 관리합니다.
 */

import { API_CONFIG, ERROR_CODES, HTTP_STATUS } from "@/constants"
import type { ApiResponse } from "@/types"

// ============================================================================
// 타입 정의
// ============================================================================

export interface RequestConfig extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
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

  static fromResponse(status: number, data?: { code?: string; message?: string; details?: Record<string, unknown> }): ApiError {
    const errorMap: Record<number, { code: string; message: string }> = {
      [HTTP_STATUS.BAD_REQUEST]: { code: ERROR_CODES.VALIDATION_ERROR, message: "잘못된 요청입니다." },
      [HTTP_STATUS.UNAUTHORIZED]: { code: ERROR_CODES.AUTH_INVALID_CREDENTIALS, message: "인증이 필요합니다." },
      [HTTP_STATUS.FORBIDDEN]: { code: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, message: "권한이 없습니다." },
      [HTTP_STATUS.NOT_FOUND]: { code: ERROR_CODES.PERSONA_NOT_FOUND, message: "요청한 리소스를 찾을 수 없습니다." },
      [HTTP_STATUS.TOO_MANY_REQUESTS]: { code: ERROR_CODES.RATE_LIMIT_EXCEEDED, message: "요청 한도를 초과했습니다." },
      [HTTP_STATUS.INTERNAL_SERVER_ERROR]: { code: ERROR_CODES.SYSTEM_UNAVAILABLE, message: "서버 오류가 발생했습니다." },
      [HTTP_STATUS.SERVICE_UNAVAILABLE]: { code: ERROR_CODES.SYSTEM_UNAVAILABLE, message: "서비스를 일시적으로 사용할 수 없습니다." },
    }

    const defaultError = errorMap[status] || { code: ERROR_CODES.UNKNOWN_ERROR, message: "알 수 없는 오류가 발생했습니다." }

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
      code: ERROR_CODES.SYSTEM_UNAVAILABLE,
      message: message || "네트워크 오류가 발생했습니다.",
      status: 0,
      timestamp: new Date().toISOString(),
    })
  }

  static timeoutError(): ApiError {
    return new ApiError({
      code: ERROR_CODES.SYSTEM_UNAVAILABLE,
      message: "요청 시간이 초과되었습니다.",
      status: 408,
      timestamp: new Date().toISOString(),
    })
  }
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 지연 함수
 */
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 타임아웃이 적용된 fetch
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw ApiError.timeoutError()
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * 재시도 가능한 fetch
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: { timeout: number; retries: number; retryDelay: number }
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, config.timeout)

      // 5xx 에러는 재시도
      if (response.status >= 500 && attempt < config.retries) {
        await delay(config.retryDelay * Math.pow(2, attempt)) // 지수 백오프
        continue
      }

      return response
    } catch (error) {
      lastError = error as Error

      // 네트워크 에러는 재시도
      if (attempt < config.retries && !(error instanceof ApiError && error.status === 408)) {
        await delay(config.retryDelay * Math.pow(2, attempt))
        continue
      }
    }
  }

  throw lastError || ApiError.networkError("요청 실패")
}

// ============================================================================
// API Client 클래스
// ============================================================================

class ApiClient {
  private baseUrl: string
  private defaultConfig: RequestConfig

  constructor(baseUrl: string = API_CONFIG.baseUrl) {
    this.baseUrl = baseUrl
    this.defaultConfig = {
      timeout: API_CONFIG.timeout,
      retries: API_CONFIG.retryCount,
      retryDelay: API_CONFIG.retryDelay,
      headers: {
        "Content-Type": "application/json",
      },
    }
  }

  /**
   * 기본 헤더 설정
   */
  private getHeaders(customHeaders?: HeadersInit): Headers {
    const headers = new Headers(this.defaultConfig.headers)

    if (customHeaders) {
      const custom = new Headers(customHeaders)
      custom.forEach((value, key) => headers.set(key, value))
    }

    // TODO: 인증 토큰 추가 로직
    // const token = getAuthToken()
    // if (token) {
    //   headers.set('Authorization', `Bearer ${token}`)
    // }

    return headers
  }

  /**
   * URL 빌드
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    return url.toString()
  }

  /**
   * 응답 파싱
   */
  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get("content-type")

    if (!response.ok) {
      let errorData: { code?: string; message?: string; details?: Record<string, unknown> } | undefined

      if (contentType?.includes("application/json")) {
        try {
          errorData = await response.json()
        } catch {
          // JSON 파싱 실패시 무시
        }
      }

      throw ApiError.fromResponse(response.status, errorData)
    }

    // 204 No Content
    if (response.status === HTTP_STATUS.NO_CONTENT) {
      return { success: true }
    }

    // JSON 응답
    if (contentType?.includes("application/json")) {
      const data = await response.json()
      return {
        success: true,
        data: data.data ?? data,
        meta: data.meta,
      }
    }

    // 텍스트 응답
    const text = await response.text()
    return {
      success: true,
      data: text as unknown as T,
    }
  }

  /**
   * HTTP 요청 실행
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options?: {
      body?: unknown
      params?: Record<string, string | number | boolean | undefined>
      headers?: HeadersInit
      config?: RequestConfig
    }
  ): Promise<ApiResponse<T>> {
    const config = { ...this.defaultConfig, ...options?.config }
    const url = this.buildUrl(endpoint, options?.params)

    const requestOptions: RequestInit = {
      method,
      headers: this.getHeaders(options?.headers),
      credentials: "include",
    }

    if (options?.body && method !== "GET") {
      requestOptions.body = JSON.stringify(options.body)
    }

    try {
      const response = await fetchWithRetry(url, requestOptions, {
        timeout: config.timeout || API_CONFIG.timeout,
        retries: config.retries || API_CONFIG.retryCount,
        retryDelay: config.retryDelay || API_CONFIG.retryDelay,
      })

      return this.parseResponse<T>(response)
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      throw ApiError.networkError((error as Error).message)
    }
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>("GET", endpoint, { params, config })
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>("POST", endpoint, { body, config })
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", endpoint, { body, config })
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", endpoint, { body, config })
  }

  async delete<T>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", endpoint, { config })
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const apiClient = new ApiClient()

// 기본 export
export default apiClient
