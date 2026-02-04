/**
 * Audit Logs Service - 감사 로그 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export interface AuditLog {
  id: string
  action: string
  targetType: string
  targetId: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
  createdAt: string
}

export interface AuditLogStats {
  total: number
  today: number
  byAction: Record<string, number>
  byTargetType: Record<string, number>
}

export interface AuditLogFilters {
  action?: string
  targetType?: string
  userId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class AuditLogsService {
  async getLogs(filters?: AuditLogFilters): Promise<{
    logs: AuditLog[]
    total: number
    stats: AuditLogStats
  }> {
    const params = new URLSearchParams()
    if (filters?.action) params.set("action", filters.action)
    if (filters?.targetType) params.set("targetType", filters.targetType)
    if (filters?.userId) params.set("userId", filters.userId)
    if (filters?.startDate) params.set("startDate", filters.startDate)
    if (filters?.endDate) params.set("endDate", filters.endDate)
    if (filters?.page) params.set("page", filters.page.toString())
    if (filters?.limit) params.set("limit", filters.limit.toString())

    const response = await apiClient.get<{
      data: AuditLog[]
      total: number
      stats: AuditLogStats
    }>(`/audit-logs?${params.toString()}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "AUDIT_LOGS_FETCH_FAILED",
        message: "감사 로그를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      logs: response.data.data,
      total: response.data.total,
      stats: response.data.stats || {
        total: response.data.total,
        today: 0,
        byAction: {},
        byTargetType: {},
      },
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const auditLogsService = new AuditLogsService()
export default auditLogsService
