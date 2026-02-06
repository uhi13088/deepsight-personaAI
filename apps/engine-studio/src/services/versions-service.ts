/**
 * Versions Service - 버전 관리 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export interface Version {
  id: string
  tag: string
  name: string
  description: string
  commitHash: string
  branch: string
  createdBy: string
  createdAt: string
  environment: "development" | "staging" | "production" | null
  status: "active" | "deprecated" | "archived"
  changes: {
    added: number
    modified: number
    deleted: number
  }
  components: string[]
}

export interface Commit {
  hash: string
  shortHash: string
  message: string
  author: string
  authorEmail: string
  date: string
  branch: string
  filesChanged: number
}

export interface Branch {
  name: string
  lastCommit: string
  lastCommitDate: string
  author: string
  isProtected: boolean
  isDefault: boolean
  aheadBehind: {
    ahead: number
    behind: number
  }
}

export interface VersionsData {
  versions: Version[]
  commits: Commit[]
  branches: Branch[]
}

export interface CreateVersionInput {
  tag: string
  name: string
  description: string
  branch: string
  commitHash?: string
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class VersionsService {
  async getVersions(): Promise<VersionsData> {
    const response = await apiClient.get<VersionsData>("/versions")

    if (!response.success || !response.data) {
      return {
        versions: [],
        commits: [],
        branches: [],
      }
    }

    return response.data
  }

  async createVersion(input: CreateVersionInput): Promise<Version> {
    const response = await apiClient.post<{ version: Version }>("/versions", input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "VERSION_CREATE_FAILED",
        message: "버전 생성에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.version
  }

  async rollbackVersion(versionId: string): Promise<void> {
    const response = await apiClient.post(`/api/versions/${versionId}/rollback`)

    if (!response.success) {
      throw new ApiError({
        code: "VERSION_ROLLBACK_FAILED",
        message: "버전 롤백에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async deleteVersion(versionId: string): Promise<void> {
    const response = await apiClient.delete(`/api/versions/${versionId}`)

    if (!response.success) {
      throw new ApiError({
        code: "VERSION_DELETE_FAILED",
        message: "버전 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async downloadSource(versionId: string): Promise<Blob> {
    const response = await fetch(`/api/versions/${versionId}/download`)
    if (!response.ok) {
      throw new ApiError({
        code: "VERSION_DOWNLOAD_FAILED",
        message: "소스 다운로드에 실패했습니다.",
        status: response.status,
        timestamp: new Date().toISOString(),
      })
    }
    return response.blob()
  }

  async compareVersions(
    baseTag: string,
    targetTag: string
  ): Promise<{
    added: string[]
    modified: string[]
    deleted: string[]
    commits: Commit[]
  }> {
    const response = await apiClient.get<{
      added: string[]
      modified: string[]
      deleted: string[]
      commits: Commit[]
    }>("/versions/compare", { base: baseTag, target: targetTag })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "VERSION_COMPARE_FAILED",
        message: "버전 비교에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  // 브랜치 관련 메서드
  async createBranch(name: string, baseBranch: string): Promise<Branch> {
    const response = await apiClient.post<{ branch: Branch }>("/versions/branches", {
      name,
      baseBranch,
    })

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "BRANCH_CREATE_FAILED",
        message: "브랜치 생성에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.branch
  }

  async mergeBranch(branchName: string, targetBranch: string = "main"): Promise<void> {
    const response = await apiClient.post(`/api/versions/branches/${branchName}/merge`, {
      targetBranch,
    })

    if (!response.success) {
      throw new ApiError({
        code: "BRANCH_MERGE_FAILED",
        message: "브랜치 병합에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async deleteBranch(branchName: string): Promise<void> {
    const response = await apiClient.delete(`/api/versions/branches/${branchName}`)

    if (!response.success) {
      throw new ApiError({
        code: "BRANCH_DELETE_FAILED",
        message: "브랜치 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const versionsService = new VersionsService()
export default versionsService
