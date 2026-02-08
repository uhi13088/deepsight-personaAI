/**
 * Incubator Service - 인큐베이터 관리 서비스
 * 자동 페르소나 생성 및 검증 시스템 기능을 제공합니다.
 */

import { apiClient, ApiError } from "./api-client"
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

  /**
   * 인큐베이터 통계 조회
   */
  async getStats(): Promise<IncubatorStats> {
    const response = await apiClient.get<{
      data: {
        enabled: boolean
        lastRun: string | null
        nextRun: string
        todayGenerated: number
        todayPassed: number
        todayFailed: number
        todayPending: number
        weeklyStats: {
          avgScore: number
          passRate: number
        }
      }
    }>(`${this.baseEndpoint}?view=stats`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "INCUBATOR_STATS_FAILED",
        message: "인큐베이터 통계를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    const stats = response.data.data
    return {
      enabled: stats.enabled,
      lastRunTime: stats.lastRun || "없음",
      nextRunTime: stats.nextRun,
      todayGenerated: stats.todayGenerated,
      todayPassed: stats.todayPassed,
      todayFailed: stats.todayFailed,
      todayPending: stats.todayPending,
      weeklyAvgScore: stats.weeklyStats.avgScore,
      weeklyPassRate: stats.weeklyStats.passRate,
    }
  }

  /**
   * 오늘 생성된 페르소나 목록 조회
   */
  async getTodayPersonas(): Promise<IncubatorPersonasResponse> {
    const response = await apiClient.get<{
      data: Array<{
        id: string
        personaName: string
        status: string
        scores: {
          consistency: number
          vectorAlignment: number
          toneMatch: number
          reasoning: number
          overall: number
        }
        vector: Vector6D
        createdAt: string
        failReason: string | null
      }>
      total: number
    }>(`${this.baseEndpoint}?view=today`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "INCUBATOR_PERSONAS_FAILED",
        message: "오늘 생성된 페르소나를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    const personas: IncubatorPersona[] = (response.data.data ?? []).map((item) => ({
      id: item.id,
      name: item.personaName,
      status: item.status as IncubatorPersona["status"],
      consistencyScore: item.scores.consistency,
      vectorAlignmentScore: item.scores.vectorAlignment,
      toneMatchScore: item.scores.toneMatch,
      reasoningScore: item.scores.reasoning,
      overallScore: item.scores.overall,
      vector: item.vector,
      createdAt: item.createdAt,
      failReason: item.failReason || undefined,
    }))

    return {
      personas,
      total: response.data.total,
    }
  }

  /**
   * 생성 이력 조회
   */
  async getHistory(days: number = 7): Promise<IncubatorHistoryItem[]> {
    const response = await apiClient.get<{
      data: Array<{
        date: string
        generated: number
        passed: number
        failed: number
        avgScore: number
      }>
    }>(`${this.baseEndpoint}?view=history&days=${days}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "INCUBATOR_HISTORY_FAILED",
        message: "생성 이력을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  /**
   * 페르소나 승인
   */
  async approvePersona(id: string): Promise<void> {
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
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const incubatorService = new IncubatorService()
export default incubatorService
