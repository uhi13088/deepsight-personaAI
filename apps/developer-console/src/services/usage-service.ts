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
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const usageService = new UsageService()
export default usageService
