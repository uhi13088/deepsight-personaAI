/**
 * Deployments Service - 배포 관리 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export type DeploymentTarget = "PERSONA" | "ALGORITHM" | "CONFIG"
export type DeploymentEnv = "DEV" | "STG" | "PROD"
export type DeploymentStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "ROLLED_BACK"

export interface Deployment {
  id: string
  targetType: DeploymentTarget
  targetId: string
  targetName: string
  environment: DeploymentEnv
  status: DeploymentStatus
  version: string | null
  notes: string | null
  deployedBy: { id: string; name?: string | null; email?: string }
  createdAt: string
  completedAt: string | null
}

export interface DeploymentStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  failed: number
  byEnvironment: {
    DEV: number
    STG: number
    PROD: number
  }
}

export interface CreateDeploymentInput {
  targetType: DeploymentTarget
  targetId: string
  environment: DeploymentEnv
  version?: string
  notes?: string
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class DeploymentsService {
  async getDeployments(filters?: {
    targetType?: DeploymentTarget
    environment?: DeploymentEnv
    status?: DeploymentStatus
  }): Promise<{ deployments: Deployment[]; stats: DeploymentStats }> {
    const params = new URLSearchParams()
    if (filters?.targetType) params.set("targetType", filters.targetType)
    if (filters?.environment) params.set("environment", filters.environment)
    if (filters?.status) params.set("status", filters.status)

    const response = await apiClient.get<{
      deployments: Deployment[]
      stats: DeploymentStats
    }>(`/deployments?${params.toString()}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "DEPLOYMENTS_FETCH_FAILED",
        message: "배포 목록을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      deployments: response.data.deployments,
      stats: response.data.stats,
    }
  }

  async getDeployment(id: string): Promise<Deployment> {
    const response = await apiClient.get<{ data: Deployment }>(`/deployments/${id}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "DEPLOYMENT_NOT_FOUND",
        message: "배포를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async createDeployment(input: CreateDeploymentInput): Promise<Deployment> {
    const response = await apiClient.post<{ data: Deployment }>("/deployments", input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "DEPLOYMENT_CREATE_FAILED",
        message: "배포 생성에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async updateDeploymentStatus(id: string, status: DeploymentStatus): Promise<Deployment> {
    const response = await apiClient.patch<{ data: Deployment }>(`/deployments/${id}`, { status })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "DEPLOYMENT_UPDATE_FAILED",
        message: "배포 상태 업데이트에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.data
  }

  async deleteDeployment(id: string): Promise<void> {
    const response = await apiClient.delete(`/deployments/${id}`)

    if (!response.success) {
      throw new ApiError({
        code: "DEPLOYMENT_DELETE_FAILED",
        message: "배포 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async startDeployment(id: string): Promise<Deployment> {
    return this.updateDeploymentStatus(id, "IN_PROGRESS")
  }

  async completeDeployment(id: string): Promise<Deployment> {
    return this.updateDeploymentStatus(id, "COMPLETED")
  }

  async rollbackDeployment(id: string): Promise<Deployment> {
    return this.updateDeploymentStatus(id, "ROLLED_BACK")
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const deploymentsService = new DeploymentsService()
export default deploymentsService
