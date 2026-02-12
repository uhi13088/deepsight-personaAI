/**
 * Usage Service - 사용량 통계 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export interface UsageOverview {
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  successRate: number
  averageLatency: number
  p95Latency: number
  p99Latency: number
  totalCost: number
  quotaUsed: number
  quotaLimit: number
}

export interface DailyUsage {
  date: string
  calls: number
  success: number
  failed: number
  cost: number
  avgLatency: number
}

export interface EndpointUsage {
  endpoint: string
  calls: number
  percentage: number
  avgLatency: number
  successRate: number
}

export interface StatusCodeBreakdown {
  code: number
  count: number
  percentage: number
}

export interface RegionUsage {
  region: string
  calls: number
  percentage: number
}

export interface HourlyDistribution {
  hour: string
  calls: number
}

export interface UsageData {
  period: string
  overview: UsageOverview
  dailyUsage: DailyUsage[]
  byEndpoint: EndpointUsage[]
  byStatusCode: StatusCodeBreakdown[]
  byRegion: RegionUsage[]
  hourlyDistribution: HourlyDistribution[]
}

// ============================================================================
// 엔드포인트 상세 분석 (§6.2)
// ============================================================================

export interface EndpointDetail {
  endpoint: string
  totalCalls: number
  successRate: number
  latency: {
    p50: number
    p90: number
    p95: number
    p99: number
    avg: number
  }
  hourlyPattern: { hour: string; calls: number }[]
  errorTypes: { code: number; count: number; message: string }[]
}

// ============================================================================
// 비용 분석 (§6.2.4)
// ============================================================================

export interface CostAnalysis {
  byEndpoint: { endpoint: string; calls: number; cost: number }[]
  dailyCost: { date: string; cost: number }[]
  projectedMonthly: number
  currentMonthly: number
}

export interface CostSimulationResult {
  planName: string
  monthlyCost: number
  perCallRate: number
  included: number
  overageRate: number
  overageCost: number
  totalCost: number
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class UsageService {
  async getUsage(period: string = "7d"): Promise<UsageData> {
    const response = await apiClient.get<UsageData>("/usage", { period })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "USAGE_FETCH_FAILED",
        message: "사용량 데이터를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  async getEndpointDetail(endpoint: string, period: string = "7d"): Promise<EndpointDetail> {
    const response = await apiClient.get<EndpointDetail>("/usage/endpoint-detail", {
      endpoint,
      period,
    })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ENDPOINT_DETAIL_FETCH_FAILED",
        message: "엔드포인트 상세 데이터를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  async getCostAnalysis(period: string = "30d"): Promise<CostAnalysis> {
    const response = await apiClient.get<CostAnalysis>("/usage/cost-analysis", { period })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "COST_ANALYSIS_FETCH_FAILED",
        message: "비용 분석 데이터를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  async simulateCost(dailyCalls: number): Promise<CostSimulationResult[]> {
    const response = await apiClient.post<CostSimulationResult[]>("/usage/simulate-cost", {
      dailyCalls,
    })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "COST_SIMULATION_FAILED",
        message: "비용 시뮬레이션에 실패했습니다.",
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

export const usageService = new UsageService()
export default usageService
