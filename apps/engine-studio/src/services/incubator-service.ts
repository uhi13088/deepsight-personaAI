/**
 * Incubator Service - 인큐베이터 관리 서비스
 * 자동 페르소나 생성 및 검증 시스템 기능을 제공합니다.
 */

import { apiClient, ApiError } from "./api-client"
import { MOCK_INCUBATOR_PERSONAS, generateRandomVector } from "./mock-data.service"
import type { Vector6D } from "@/types"

// ============================================================================
// 타입 정의
// ============================================================================

export interface IncubatorStats {
  enabled: boolean
  lastRunTime: string
  nextRunTime: string
  todayGenerated: number
  todayPassed: number
  todayFailed: number
  todayPending: number
  weeklyAvgScore: number
  weeklyPassRate: number
}

export interface IncubatorPersona {
  id: string
  name: string
  status: "PASSED" | "FAILED" | "PENDING"
  consistencyScore: number
  vectorAlignmentScore: number
  toneMatchScore: number
  reasoningScore: number
  overallScore: number
  vector: Vector6D
  createdAt: string
  failReason?: string
}

export interface IncubatorHistoryItem {
  date: string
  generated: number
  passed: number
  failed: number
  avgScore: number
}

export interface IncubatorSettings {
  enabled: boolean
  runTime: string
  dailyLimit: number
  minPassScore: number
  autoApproveScore: number
}

export interface IncubatorPersonasResponse {
  personas: IncubatorPersona[]
  total: number
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class IncubatorService {
  private readonly baseEndpoint = "/incubator"

  // Mock 데이터 저장소 (개발용)
  private mockPersonas: IncubatorPersona[] = []
  private mockSettings: IncubatorSettings = {
    enabled: true,
    runTime: "03:00",
    dailyLimit: 5,
    minPassScore: 70,
    autoApproveScore: 85,
  }

  constructor() {
    // MOCK_INCUBATOR_PERSONAS를 내부 형식으로 변환
    this.mockPersonas = MOCK_INCUBATOR_PERSONAS.map((p, index) =>
      this.transformMockPersona(p, index)
    )
  }

  // 개발 모드 여부 (환경변수로 제어)
  private get useMockData(): boolean {
    return (
      process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || process.env.NODE_ENV === "development"
    )
  }

  private transformMockPersona(
    p: (typeof MOCK_INCUBATOR_PERSONAS)[0],
    index: number
  ): IncubatorPersona {
    const baseScore = p.testScore / 100
    const status =
      p.status === "READY" ? "PASSED" : p.status === "FAILED" ? "FAILED" : ("PENDING" as const)

    return {
      id: p.id,
      name: p.name,
      status,
      consistencyScore: Math.min(0.95, baseScore + 0.05 * (index % 3)),
      vectorAlignmentScore: Math.min(0.95, baseScore - 0.02 + 0.03 * (index % 2)),
      toneMatchScore: Math.min(0.98, baseScore + 0.08),
      reasoningScore: Math.min(0.92, baseScore - 0.05),
      overallScore: p.testScore,
      vector: generateRandomVector(),
      createdAt: `03:${(15 + index * 7).toString().padStart(2, "0")}`,
      failReason: status === "FAILED" ? `테스트 점수 미달 (${p.testScore} < 70)` : undefined,
    }
  }

  /**
   * 인큐베이터 통계 조회
   */
  async getStats(): Promise<IncubatorStats> {
    if (this.useMockData) {
      return this.getMockStats()
    }

    const response = await apiClient.get<IncubatorStats>(`${this.baseEndpoint}/stats`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "INCUBATOR_STATS_FAILED",
        message: "인큐베이터 통계를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 오늘 생성된 페르소나 목록 조회
   */
  async getTodayPersonas(): Promise<IncubatorPersonasResponse> {
    if (this.useMockData) {
      return this.getMockTodayPersonas()
    }

    const response = await apiClient.get<IncubatorPersonasResponse>(`${this.baseEndpoint}/today`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "INCUBATOR_PERSONAS_FAILED",
        message: "오늘 생성된 페르소나를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 생성 이력 조회
   */
  async getHistory(days: number = 7): Promise<IncubatorHistoryItem[]> {
    if (this.useMockData) {
      return this.getMockHistory()
    }

    const response = await apiClient.get<IncubatorHistoryItem[]>(`${this.baseEndpoint}/history`, {
      days,
    })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "INCUBATOR_HISTORY_FAILED",
        message: "생성 이력을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 페르소나 승인
   */
  async approvePersona(id: string): Promise<void> {
    if (this.useMockData) {
      return this.approveMockPersona(id)
    }

    const response = await apiClient.post(`${this.baseEndpoint}/${id}/approve`, {})

    if (!response.success) {
      throw new ApiError({
        code: "APPROVE_FAILED",
        message: "페르소나 승인에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  /**
   * 페르소나 거부
   */
  async rejectPersona(id: string, reason?: string): Promise<void> {
    if (this.useMockData) {
      return this.rejectMockPersona(id)
    }

    const response = await apiClient.post(`${this.baseEndpoint}/${id}/reject`, { reason })

    if (!response.success) {
      throw new ApiError({
        code: "REJECT_FAILED",
        message: "페르소나 거부에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  /**
   * 설정 조회
   */
  async getSettings(): Promise<IncubatorSettings> {
    if (this.useMockData) {
      return { ...this.mockSettings }
    }

    const response = await apiClient.get<IncubatorSettings>(`${this.baseEndpoint}/settings`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "SETTINGS_FETCH_FAILED",
        message: "인큐베이터 설정을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 설정 저장
   */
  async updateSettings(settings: Partial<IncubatorSettings>): Promise<IncubatorSettings> {
    if (this.useMockData) {
      return this.updateMockSettings(settings)
    }

    const response = await apiClient.patch<IncubatorSettings>(
      `${this.baseEndpoint}/settings`,
      settings
    )

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "SETTINGS_UPDATE_FAILED",
        message: "인큐베이터 설정 저장에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  // ============================================================================
  // Mock 데이터 메서드 (개발용)
  // ============================================================================

  private getMockStats(): IncubatorStats {
    const passed = this.mockPersonas.filter((p) => p.status === "PASSED").length
    const failed = this.mockPersonas.filter((p) => p.status === "FAILED").length
    const pending = this.mockPersonas.filter((p) => p.status === "PENDING").length

    return {
      enabled: this.mockSettings.enabled,
      lastRunTime: "2024-01-17 03:00",
      nextRunTime: "2024-01-18 03:00",
      todayGenerated: this.mockPersonas.length,
      todayPassed: passed,
      todayFailed: failed,
      todayPending: pending,
      weeklyAvgScore: 78.5,
      weeklyPassRate: 65,
    }
  }

  private getMockTodayPersonas(): IncubatorPersonasResponse {
    return {
      personas: [...this.mockPersonas],
      total: this.mockPersonas.length,
    }
  }

  private getMockHistory(): IncubatorHistoryItem[] {
    return [
      { date: "01/16", generated: 5, passed: 4, failed: 1, avgScore: 82 },
      { date: "01/15", generated: 6, passed: 4, failed: 2, avgScore: 78 },
      { date: "01/14", generated: 4, passed: 3, failed: 1, avgScore: 81 },
      { date: "01/13", generated: 5, passed: 3, failed: 2, avgScore: 75 },
      { date: "01/12", generated: 5, passed: 4, failed: 1, avgScore: 80 },
      { date: "01/11", generated: 6, passed: 5, failed: 1, avgScore: 84 },
      { date: "01/10", generated: 4, passed: 2, failed: 2, avgScore: 72 },
    ]
  }

  private approveMockPersona(id: string): void {
    const index = this.mockPersonas.findIndex((p) => p.id === id)
    if (index === -1) {
      throw new ApiError({
        code: "PERSONA_NOT_FOUND",
        message: "페르소나를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    // 승인되면 목록에서 제거 (실제 페르소나 목록으로 이동)
    this.mockPersonas.splice(index, 1)
  }

  private rejectMockPersona(id: string): void {
    const index = this.mockPersonas.findIndex((p) => p.id === id)
    if (index === -1) {
      throw new ApiError({
        code: "PERSONA_NOT_FOUND",
        message: "페르소나를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    // 거부되면 상태를 FAILED로 변경
    this.mockPersonas[index].status = "FAILED"
    this.mockPersonas[index].failReason = "수동 거부됨"
  }

  private updateMockSettings(settings: Partial<IncubatorSettings>): IncubatorSettings {
    this.mockSettings = {
      ...this.mockSettings,
      ...settings,
    }
    return { ...this.mockSettings }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const incubatorService = new IncubatorService()
export default incubatorService
