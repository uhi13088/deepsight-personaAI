/**
 * Logs Service - API 로그 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export interface ApiLog {
  id: string
  timestamp: string
  method: string
  endpoint: string
  status: number
  latency: number
  apiKey: string
  apiKeyName: string
  ip: string
  userAgent: string
  requestBody: Record<string, unknown> | null
  responseBody: Record<string, unknown>
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
}

export interface LogsFilters {
  search?: string
  status?: string
  endpoint?: string
  apiKeyId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface LogsStats {
  total: number
  success: number
  clientError: number
  serverError: number
  avgLatency: number
}

export interface LogsResponse {
  logs: ApiLog[]
  stats: LogsStats
  total: number
}

// ============================================================================
// 에러 대시보드 (§7.2 + §7.3)
// ============================================================================

export interface ErrorDashboardData {
  errorRateTrend: { date: string; errorRate: number; totalCalls: number; errors: number }[]
  errorsByType: { code: number; description: string; count: number; percentage: number }[]
  errorsByEndpoint: { endpoint: string; errorCount: number; errorRate: number }[]
  topErrorMessages: { message: string; count: number; lastOccurred: string }[]
}

export interface ErrorAlertConfig {
  enabled: boolean
  errorRateThreshold: number
  consecutiveErrorCount: number
  notifyChannels: { email: boolean; slack: boolean; webhook: boolean }
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class LogsService {
  async getLogs(filters?: LogsFilters): Promise<LogsResponse> {
    const params: Record<string, string | number | boolean | undefined> = {}
    if (filters?.search) params.search = filters.search
    if (filters?.status) params.status = filters.status
    if (filters?.endpoint) params.endpoint = filters.endpoint
    if (filters?.apiKeyId) params.apiKeyId = filters.apiKeyId
    if (filters?.startDate) params.startDate = filters.startDate
    if (filters?.endDate) params.endDate = filters.endDate
    if (filters?.limit) params.limit = filters.limit
    if (filters?.offset) params.offset = filters.offset

    const response = await apiClient.get<LogsResponse>("/logs", params)

    if (!response.success || !response.data) {
      // Return empty response if API not implemented yet
      return {
        logs: [],
        stats: { total: 0, success: 0, clientError: 0, serverError: 0, avgLatency: 0 },
        total: 0,
      }
    }

    return response.data
  }

  async getLog(id: string): Promise<ApiLog> {
    const response = await apiClient.get<{ log: ApiLog }>(`/logs/${id}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "LOG_NOT_FOUND",
        message: "로그를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.log
  }

  async getErrorDashboard(period: string = "7d"): Promise<ErrorDashboardData> {
    const response = await apiClient.get<ErrorDashboardData>("/logs/error-dashboard", { period })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ERROR_DASHBOARD_FETCH_FAILED",
        message: "에러 대시보드 데이터를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  async getErrorAlertConfig(): Promise<ErrorAlertConfig> {
    const response = await apiClient.get<ErrorAlertConfig>("/logs/error-alert-config")

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ERROR_ALERT_CONFIG_FETCH_FAILED",
        message: "에러 알림 설정을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  async updateErrorAlertConfig(config: ErrorAlertConfig): Promise<void> {
    await apiClient.put("/logs/error-alert-config", config)
  }

  async exportLogs(filters?: LogsFilters, format: "csv" | "jsonl" = "csv"): Promise<Blob> {
    const params = new URLSearchParams()
    if (filters?.status) params.set("status", filters.status)
    if (filters?.endpoint) params.set("endpoint", filters.endpoint)
    if (filters?.startDate) params.set("startDate", filters.startDate)
    if (filters?.endDate) params.set("endDate", filters.endDate)
    params.set("format", format)

    const response = await fetch(`/api/logs/export?${params.toString()}`, {
      credentials: "include",
    })

    if (!response.ok) {
      throw new ApiError({
        code: "EXPORT_FAILED",
        message: "로그 내보내기에 실패했습니다.",
        status: response.status,
        timestamp: new Date().toISOString(),
      })
    }

    return response.blob()
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const logsService = new LogsService()
export default logsService
