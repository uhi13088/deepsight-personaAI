/**
 * Dashboard Service - 대시보드 데이터 서비스
 * KPI, 트렌드, 활동 로그, 시스템 상태 등을 제공합니다.
 */

import { apiClient, ApiError } from "./api-client"
import { MOCK_MATCHING_TREND_DATA, MOCK_KPI_DATA, MOCK_PERSONAS } from "./mock-data.service"

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
  type: "PERSONA_DEPLOYED" | "AB_TEST_COMPLETED" | "INCUBATOR" | "PERSONA_CREATED" | "SYSTEM"
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
  private readonly baseEndpoint = "/dashboard"

  // 개발 모드 여부 (환경변수로 제어)
  private get useMockData(): boolean {
    return (
      process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || process.env.NODE_ENV === "development"
    )
  }

  /**
   * 대시보드 전체 데이터 조회
   */
  async getDashboardData(): Promise<DashboardData> {
    if (this.useMockData) {
      return this.getMockDashboardData()
    }

    const response = await apiClient.get<DashboardData>(this.baseEndpoint)

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

  /**
   * KPI 데이터만 조회
   */
  async getKPI(): Promise<DashboardKPI> {
    if (this.useMockData) {
      return this.getMockKPI()
    }

    const response = await apiClient.get<DashboardKPI>(`${this.baseEndpoint}/kpi`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "KPI_FETCH_FAILED",
        message: "KPI 데이터를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 트렌드 데이터 조회
   */
  async getTrendData(days: number = 7): Promise<TrendDataPoint[]> {
    if (this.useMockData) {
      return this.getMockTrendData()
    }

    const response = await apiClient.get<TrendDataPoint[]>(`${this.baseEndpoint}/trends`, { days })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "TREND_FETCH_FAILED",
        message: "트렌드 데이터를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 활동 로그 조회
   */
  async getActivityLog(limit: number = 10): Promise<ActivityLogItem[]> {
    if (this.useMockData) {
      return this.getMockActivityLog()
    }

    const response = await apiClient.get<ActivityLogItem[]>(`${this.baseEndpoint}/activity`, {
      limit,
    })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ACTIVITY_FETCH_FAILED",
        message: "활동 로그를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 시스템 상태 조회
   */
  async getSystemStatus(): Promise<SystemStatus> {
    if (this.useMockData) {
      return this.getMockSystemStatus()
    }

    const response = await apiClient.get<SystemStatus>(`${this.baseEndpoint}/system-status`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "STATUS_FETCH_FAILED",
        message: "시스템 상태를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  // ============================================================================
  // Mock 데이터 메서드 (개발용)
  // ============================================================================

  private getMockDashboardData(): DashboardData {
    return {
      kpi: this.getMockKPI(),
      trendData: this.getMockTrendData(),
      activityLog: this.getMockActivityLog(),
      topPersonas: this.getMockTopPersonas(),
      systemStatus: this.getMockSystemStatus(),
    }
  }

  private getMockKPI(): DashboardKPI {
    const activePersonas = MOCK_PERSONAS.filter((p) => p.status === "ACTIVE").length
    const accuracyKPI = MOCK_KPI_DATA.find((k) => k.label === "평균 정확도")

    return {
      totalMatches: 156789,
      todayMatches: 3456,
      matchingAccuracy: accuracyKPI?.value ?? 94.2,
      avgMatchScore: 87.5,
      ctr: 23.8,
      nps: 72,
      activePersonas,
      totalPersonas: MOCK_PERSONAS.length,
    }
  }

  private getMockTrendData(): TrendDataPoint[] {
    return MOCK_MATCHING_TREND_DATA.map((item) => ({
      date:
        item.date && item.date.length >= 10
          ? item.date.slice(5).replace("-", "/")
          : item.date || "N/A",
      matches: Math.round(item.matches / 40),
      accuracy: item.accuracy,
    }))
  }

  private getMockActivityLog(): ActivityLogItem[] {
    return [
      {
        id: "1",
        type: "PERSONA_DEPLOYED",
        title: "페르소나 배포 완료",
        description: "'논리적 평론가' 페르소나가 프로덕션에 배포되었습니다.",
        time: "10분 전",
        status: "success",
      },
      {
        id: "2",
        type: "AB_TEST_COMPLETED",
        title: "A/B 테스트 완료",
        description:
          "'알고리즘 v2.1' 테스트가 종료되었습니다. 테스트 그룹이 5.2% 더 높은 CTR을 기록했습니다.",
        time: "1시간 전",
        status: "info",
      },
      {
        id: "3",
        type: "INCUBATOR",
        title: "인큐베이터 결과",
        description: "오늘 생성된 3개의 페르소나 중 2개가 품질 검증을 통과했습니다.",
        time: "3시간 전",
        status: "warning",
      },
      {
        id: "4",
        type: "PERSONA_CREATED",
        title: "새 페르소나 생성",
        description: "'감성 에세이스트' 페르소나가 생성되어 리뷰 대기 중입니다.",
        time: "5시간 전",
        status: "info",
      },
    ]
  }

  private getMockTopPersonas(): TopPersona[] {
    return MOCK_PERSONAS.filter((p) => p.status === "ACTIVE")
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        matches: p.matchCount,
        accuracy: p.accuracy,
        score: Math.round(p.accuracy * 0.96),
      }))
  }

  private getMockSystemStatus(): SystemStatus {
    return {
      api: { status: "healthy", latency: 142 },
      database: { status: "healthy", connections: 45 },
      matchingEngine: { status: "healthy", qps: 234 },
      incubator: { status: "idle", lastRun: "03:00 AM" },
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const dashboardService = new DashboardService()
export default dashboardService
