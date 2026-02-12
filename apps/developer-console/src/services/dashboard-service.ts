/**
 * Dashboard Service - 대시보드 통계 서비스 (v3)
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export type DashboardPeriod = "today" | "yesterday" | "7d" | "30d"

export interface DashboardStats {
  apiCalls: {
    today: number
    yesterday: number
    thisMonth: number
    lastMonth: number
    change: number
  }
  successRate: {
    value: number
    change: number
  }
  latency: {
    p50: number
    p95: number
    p99: number
    change: number
  }
  cost: {
    thisMonth: number
    lastMonth: number
    quotaUsed: number
    quotaLimit: number
  }
  activeKeys: {
    total: number
    live: number
    test: number
  }
  errorTop5: ErrorSummary[]
}

export interface ErrorSummary {
  code: string
  count: number
  lastOccurred: string
  endpoint: string
}

export interface RecentActivity {
  id: string
  timestamp: string
  endpoint: string
  method: string
  status: number
  latency: number
  requestId: string
}

export interface UsageByDay {
  date: string
  calls: number
  errors: number
}

export interface UsageByEndpoint {
  endpoint: string
  calls: number
  percentage: number
  avgLatency: number
}

export interface DashboardData {
  stats: DashboardStats
  recentActivity: RecentActivity[]
  usageByDay: UsageByDay[]
  usageByEndpoint: UsageByEndpoint[]
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class DashboardService {
  async getStats(period: DashboardPeriod = "7d"): Promise<DashboardData> {
    const response = await apiClient.get<DashboardData>("/dashboard/stats", { period })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "DASHBOARD_FETCH_FAILED",
        message: "대시보드 데이터를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const dashboardService = new DashboardService()
export default dashboardService
