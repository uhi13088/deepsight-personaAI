/**
 * Operations Service - 운영 관리 서비스
 * 모니터링, 인시던트, 백업 관련 API 연동
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 모니터링 타입 정의
// ============================================================================

export interface SystemMetrics {
  cpu: number
  memory: number
  disk: number
  network: number
  requestsPerSec: number
  avgLatency: number
  errorRate: number
  uptime: number
}

export interface ServiceStatus {
  id: string
  name: string
  status: "healthy" | "degraded" | "down"
  latency: number
  lastCheck: string
}

export interface SystemAlert {
  id: string
  type: "warning" | "error" | "critical"
  message: string
  source: string
  createdAt: string
  resolved: boolean
}

export interface MonitoringData {
  metrics: SystemMetrics
  services: ServiceStatus[]
  alerts: SystemAlert[]
  timeSeriesData: Array<{ time: string; cpu: number; memory: number; requests: number }>
}

// ============================================================================
// 인시던트 타입 정의
// ============================================================================

export interface Incident {
  id: string
  title: string
  description: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  status: "REPORTED" | "INVESTIGATING" | "IDENTIFIED" | "FIXING" | "RESOLVED"
  affectedSystems: string[]
  reporter: { id: string; name?: string; email?: string }
  resolution: string | null
  resolvedAt: string | null
  timeline: IncidentTimelineEntry[]
  createdAt: string
  updatedAt: string
}

export interface IncidentTimelineEntry {
  id: string
  action: string
  description: string
  performedBy: { id: string; name?: string }
  createdAt: string
}

export interface IncidentStats {
  total: number
  open: number
  investigating: number
  resolved: number
  critical: number
}

export interface CreateIncidentInput {
  title: string
  description: string
  severity: Incident["severity"]
  affectedSystems: string[]
}

// ============================================================================
// 백업 타입 정의
// ============================================================================

export interface Backup {
  id: string
  type: "FULL" | "INCREMENTAL" | "DIFFERENTIAL"
  status: "COMPLETED" | "IN_PROGRESS" | "FAILED" | "SCHEDULED"
  size: number
  duration: number | null
  location: string
  createdAt: string
  completedAt: string | null
}

export interface BackupStats {
  totalBackups: number
  totalSize: number
  lastBackup: string | null
  nextScheduled: string | null
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class OperationsService {
  // ========== 모니터링 ==========

  async getMonitoringData(period: string = "1h"): Promise<MonitoringData> {
    const response = await apiClient.get<{
      currentStatus: Record<string, { value: number; unit: string; status: string }>
      metrics: Record<string, Array<{ value: number; recordedAt: string }>>
    }>(`/operations/monitoring?period=${period}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "MONITORING_FETCH_FAILED",
        message: "모니터링 데이터를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    // currentStatus에서 최신 값 추출
    const status = response.data.currentStatus || {}

    // 시계열 데이터 변환
    const cpuData = response.data.metrics?.CPU || []
    const memoryData = response.data.metrics?.MEMORY || []
    const timeSeriesData = cpuData.slice(-30).map((item, index) => ({
      time: item.recordedAt,
      cpu: item.value,
      memory: memoryData[index]?.value || 0,
      requests: 0,
    }))

    return {
      metrics: {
        cpu: status.CPU?.value || 0,
        memory: status.MEMORY?.value || 0,
        disk: status.DISK?.value || 0,
        network: status.NETWORK_IO?.value || 0,
        requestsPerSec: status.REQUEST_COUNT?.value || 0,
        avgLatency: status.API_LATENCY?.value || 0,
        errorRate: status.ERROR_RATE?.value || 0,
        uptime: 99.9, // 기본값
      },
      services: [],
      alerts: [],
      timeSeriesData,
    }
  }

  // ========== 인시던트 ==========

  async getIncidents(filters?: {
    status?: Incident["status"]
    severity?: Incident["severity"]
  }): Promise<{ incidents: Incident[]; stats: IncidentStats }> {
    const params = new URLSearchParams()
    if (filters?.status) params.set("status", filters.status)
    if (filters?.severity) params.set("severity", filters.severity)

    const response = await apiClient.get<{
      data: Incident[]
      stats: Record<string, number>
      pagination: { total: number }
    }>(`/operations/incidents?${params.toString()}`)

    if (!response.success || !response.data) {
      return {
        incidents: [],
        stats: { total: 0, open: 0, investigating: 0, resolved: 0, critical: 0 },
      }
    }

    const statusStats = response.data.stats || {}
    const total = response.data.pagination?.total || response.data.data?.length || 0

    return {
      incidents: response.data.data || [],
      stats: {
        total,
        open:
          (statusStats.reported || 0) +
          (statusStats.investigating || 0) +
          (statusStats.identified || 0) +
          (statusStats.fixing || 0),
        investigating: statusStats.investigating || 0,
        resolved: (statusStats.resolved || 0) + (statusStats.closed || 0),
        critical: 0, // 별도 쿼리 필요
      },
    }
  }

  async getIncident(id: string): Promise<Incident> {
    const response = await apiClient.get<{ data: Incident }>(`/operations/incidents/${id}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "INCIDENT_NOT_FOUND",
        message: "인시던트를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async createIncident(input: CreateIncidentInput): Promise<Incident> {
    const response = await apiClient.post<{ data: Incident }>("/operations/incidents", input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "INCIDENT_CREATE_FAILED",
        message: "인시던트 생성에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async updateIncident(
    id: string,
    input: Partial<Omit<Incident, "id" | "createdAt" | "updatedAt">>
  ): Promise<Incident> {
    const response = await apiClient.patch<{ data: Incident }>(`/operations/incidents/${id}`, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "INCIDENT_UPDATE_FAILED",
        message: "인시던트 수정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async addIncidentTimeline(
    id: string,
    entry: { action: string; description: string }
  ): Promise<void> {
    const response = await apiClient.patch(`/operations/incidents/${id}`, {
      timelineEntry: entry,
    })

    if (!response.success) {
      throw new ApiError({
        code: "TIMELINE_ADD_FAILED",
        message: "타임라인 추가에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // ========== 백업 ==========

  async getBackups(): Promise<{ backups: Backup[]; stats: BackupStats }> {
    const response = await apiClient.get<{
      data: Backup[]
      stats: BackupStats
    }>("/operations/backup")

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "BACKUPS_FETCH_FAILED",
        message: "백업 목록을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      backups: response.data.data,
      stats: response.data.stats,
    }
  }

  async startBackup(type: Backup["type"]): Promise<Backup> {
    const response = await apiClient.post<{ data: Backup }>("/operations/backup", { type })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "BACKUP_START_FAILED",
        message: "백업 시작에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const operationsService = new OperationsService()
export default operationsService
