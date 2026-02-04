/**
 * Dashboard Service - 대시보드 데이터 서비스
 * KPI, 트렌드, 활동 로그, 시스템 상태 등을 제공합니다.
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export interface DashboardKPI {
  totalMatches: number
  todayMatches: number
  matchingAccuracy: number
  avgMatchScore: number
  ctr: number
  nps: number
  activePersonas: number
  totalPersonas: number
}

export interface TrendDataPoint {
  date: string
  matches: number
  accuracy: number
}

export interface ActivityLogItem {
  id: string
  type:
    | "PERSONA_DEPLOYED"
    | "AB_TEST_COMPLETED"
    | "INCUBATOR"
    | "PERSONA_CREATED"
    | "SYSTEM"
    | string
  title: string
  description: string
  time: string
  status: "success" | "warning" | "error" | "info"
}

export interface TopPersona {
  name: string
  matches: number
  accuracy: number
  score: number
}

export interface SystemStatusItem {
  name: string
  status: "healthy" | "warning" | "error" | "idle"
  metric: string
}

export interface SystemStatus {
  api: { status: "healthy" | "warning" | "error"; latency: number }
  database: { status: "healthy" | "warning" | "error"; connections: number }
  matchingEngine: { status: "healthy" | "warning" | "error"; qps: number }
  incubator: { status: "healthy" | "idle"; lastRun: string }
}

export interface DashboardData {
  kpi: DashboardKPI
  trendData: TrendDataPoint[]
  activityLog: ActivityLogItem[]
  topPersonas: TopPersona[]
  systemStatus: SystemStatus
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class DashboardService {
  private readonly baseEndpoint = "/dashboard/stats"

  /**
   * 대시보드 전체 데이터 조회
   */
  async getDashboardData(): Promise<DashboardData> {
    const response = await apiClient.get<{
      kpi: DashboardKPI
      trend: TrendDataPoint[]
      topPersonas: TopPersona[]
      recentActivity: ActivityLogItem[]
      systemStatus: SystemStatus
    }>(this.baseEndpoint)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "DASHBOARD_FETCH_FAILED",
        message: "대시보드 데이터를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    // API 응답을 DashboardData 형식에 맞게 매핑
    return {
      kpi: response.data.kpi,
      trendData: response.data.trend || [],
      activityLog: response.data.recentActivity || [],
      topPersonas: response.data.topPersonas || [],
      systemStatus: response.data.systemStatus,
    }
  }

  /**
   * KPI 데이터만 조회
   */
  async getKPI(): Promise<DashboardKPI> {
    const data = await this.getDashboardData()
    return data.kpi
  }

  /**
   * 트렌드 데이터 조회
   */
  async getTrendData(): Promise<TrendDataPoint[]> {
    const data = await this.getDashboardData()
    return data.trendData
  }

  /**
   * 활동 로그 조회
   */
  async getActivityLog(): Promise<ActivityLogItem[]> {
    const data = await this.getDashboardData()
    return data.activityLog
  }

  /**
   * 시스템 상태 조회
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const data = await this.getDashboardData()
    return data.systemStatus
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const dashboardService = new DashboardService()
export default dashboardService
