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
// 실시간 모니터링 (§4.2)
// ============================================================================

export interface RealTimeMetrics {
  rps: number
  successRate: number
  avgResponseTime: number
  activeConnections: number
  timestamp: string
}

// ============================================================================
// 알림 센터 (§4.3)
// ============================================================================

export type AlertType = "usage" | "error" | "security" | "billing" | "system"
export type AlertSeverity = "info" | "warning" | "critical"

export interface AlertItem {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
}

export interface AlertChannelConfig {
  email: boolean
  slack: boolean
  webhook: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
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

  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    const response = await apiClient.get<RealTimeMetrics>("/dashboard/realtime")

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "REALTIME_FETCH_FAILED",
        message: "실시간 지표를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  async getAlerts(): Promise<AlertItem[]> {
    const response = await apiClient.get<AlertItem[]>("/dashboard/alerts")

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ALERTS_FETCH_FAILED",
        message: "알림을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  async markAlertRead(alertId: string): Promise<void> {
    await apiClient.patch(`/dashboard/alerts/${alertId}`, { read: true })
  }

  async getAlertChannels(): Promise<AlertChannelConfig> {
    const response = await apiClient.get<AlertChannelConfig>("/dashboard/alert-channels")

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ALERT_CHANNELS_FETCH_FAILED",
        message: "알림 채널 설정을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  async updateAlertChannels(config: AlertChannelConfig): Promise<void> {
    await apiClient.put("/dashboard/alert-channels", config)
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const dashboardService = new DashboardService()
export default dashboardService
