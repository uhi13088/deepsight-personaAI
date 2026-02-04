/**
 * A/B Tests Service - A/B 테스트 관리 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export type ABTestStatus = "DRAFT" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED"
export type ABTestType = "ALGORITHM" | "PERSONA"

export interface ABTest {
  id: string
  name: string
  description: string | null
  testType: ABTestType
  status: ABTestStatus
  controlAlgorithm: { id: string; name: string; version: string } | null
  testAlgorithm: { id: string; name: string; version: string } | null
  controlConfig: Record<string, unknown>
  testConfig: Record<string, unknown>
  trafficSplit: number
  startDate: string | null
  endDate: string | null
  results: Record<string, unknown> | null
  createdBy: { id: string; name: string | null; email: string }
  createdAt: string
  updatedAt: string
}

export interface ABTestStats {
  total: number
  running: number
  completed: number
  draft: number
}

export interface CreateABTestInput {
  name: string
  description?: string
  testType: ABTestType
  controlAlgorithmId?: string
  testAlgorithmId?: string
  controlConfig?: Record<string, unknown>
  testConfig?: Record<string, unknown>
  trafficSplit?: number
  startDate?: string
  endDate?: string
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class ABTestsService {
  async getTests(filters?: {
    status?: ABTestStatus
    testType?: ABTestType
  }): Promise<{ tests: ABTest[]; stats: ABTestStats }> {
    const params = new URLSearchParams()
    if (filters?.status) params.set("status", filters.status)
    if (filters?.testType) params.set("testType", filters.testType)

    const response = await apiClient.get<{
      tests: ABTest[]
      stats: ABTestStats
    }>(`/ab-tests?${params.toString()}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ABTESTS_FETCH_FAILED",
        message: "A/B 테스트 목록을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      tests: response.data.tests,
      stats: response.data.stats,
    }
  }

  async getTest(id: string): Promise<ABTest> {
    const response = await apiClient.get<{ data: ABTest }>(`/ab-tests/${id}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ABTEST_NOT_FOUND",
        message: "A/B 테스트를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async createTest(input: CreateABTestInput): Promise<ABTest> {
    const response = await apiClient.post<{ data: ABTest }>("/ab-tests", input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ABTEST_CREATE_FAILED",
        message: "A/B 테스트 생성에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async updateTest(
    id: string,
    input: Partial<CreateABTestInput> & { status?: ABTestStatus; results?: Record<string, unknown> }
  ): Promise<ABTest> {
    const response = await apiClient.patch<{ data: ABTest }>(`/ab-tests/${id}`, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "ABTEST_UPDATE_FAILED",
        message: "A/B 테스트 수정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async deleteTest(id: string): Promise<void> {
    const response = await apiClient.delete(`/ab-tests/${id}`)

    if (!response.success) {
      throw new ApiError({
        code: "ABTEST_DELETE_FAILED",
        message: "A/B 테스트 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async startTest(id: string): Promise<ABTest> {
    return this.updateTest(id, { status: "RUNNING", startDate: new Date().toISOString() })
  }

  async pauseTest(id: string): Promise<ABTest> {
    return this.updateTest(id, { status: "PAUSED" })
  }

  async completeTest(id: string): Promise<ABTest> {
    return this.updateTest(id, { status: "COMPLETED", endDate: new Date().toISOString() })
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const abTestsService = new ABTestsService()
export default abTestsService
