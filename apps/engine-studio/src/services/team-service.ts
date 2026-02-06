/**
 * Team Service - 팀 멤버 관리 서비스
 * 팀원 CRUD 및 초대 기능을 제공합니다.
 */

import { apiClient, ApiError } from "./api-client"
import type { UserRole } from "@/types"

// ============================================================================
// 타입 정의
// ============================================================================

export interface TeamMember {
  id: string
  name: string
  email: string
  role: UserRole
  status: "ACTIVE" | "INACTIVE" | "PENDING"
  department: string
  avatar?: string
  lastActive: string
  joinedAt: string
}

export interface TeamMemberCreateInput {
  email: string
  name?: string
  role: UserRole
  message?: string
}

export interface TeamMemberUpdateInput {
  name?: string
  role?: UserRole
  status?: TeamMember["status"]
  department?: string
}

export interface TeamStats {
  totalMembers: number
  activeMembers: number
  pendingInvites: number
  totalRoles: number
}

export interface TeamListResponse {
  members: TeamMember[]
  total: number
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class TeamService {
  private readonly baseEndpoint = "/users"

  /**
   * 팀 멤버 목록 조회
   */
  async getMembers(filters?: { role?: UserRole; search?: string }): Promise<TeamListResponse> {
    const response = await apiClient.get<{
      data: Array<{
        id: string
        name: string | null
        email: string
        role: UserRole
        status: string
        department: string | null
        image: string | null
        lastLogin: string | null
        createdAt: string
      }>
      total: number
    }>(this.baseEndpoint, filters)

    if (!response.success || !response.data) {
      return { members: [], total: 0 }
    }

    // API 응답을 TeamMember 형식으로 변환
    const rawData = response.data.data || []
    const members: TeamMember[] = rawData.map((user) => ({
      id: user.id,
      name: user.name || user.email.split("@")[0],
      email: user.email,
      role: user.role,
      status: (user.status as TeamMember["status"]) || "ACTIVE",
      department: user.department || "미정",
      avatar: user.image || undefined,
      lastActive: user.lastLogin || user.createdAt,
      joinedAt: user.createdAt,
    }))

    return {
      members,
      total: response.data.total || members.length,
    }
  }

  /**
   * 팀 멤버 상세 조회
   */
  async getMemberById(id: string): Promise<TeamMember> {
    const response = await apiClient.get<{
      id: string
      name: string | null
      email: string
      role: UserRole
      status: string
      department: string | null
      image: string | null
      lastLogin: string | null
      createdAt: string
    }>(`${this.baseEndpoint}/${id}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "MEMBER_NOT_FOUND",
        message: "팀 멤버를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    const user = response.data
    return {
      id: user.id,
      name: user.name || user.email.split("@")[0],
      email: user.email,
      role: user.role,
      status: (user.status as TeamMember["status"]) || "ACTIVE",
      department: user.department || "미정",
      avatar: user.image || undefined,
      lastActive: user.lastLogin || user.createdAt,
      joinedAt: user.createdAt,
    }
  }

  /**
   * 팀 멤버 초대
   */
  async inviteMember(input: TeamMemberCreateInput): Promise<TeamMember> {
    if (!input.email) {
      throw new ApiError({
        code: "VALIDATION_ERROR",
        message: "이메일 주소를 입력해주세요.",
        status: 400,
        timestamp: new Date().toISOString(),
      })
    }

    if (!input.role) {
      throw new ApiError({
        code: "VALIDATION_ERROR",
        message: "역할을 선택해주세요.",
        status: 400,
        timestamp: new Date().toISOString(),
      })
    }

    const response = await apiClient.post<{
      id: string
      name: string | null
      email: string
      role: UserRole
      createdAt: string
    }>(`${this.baseEndpoint}/invite`, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "INVITE_FAILED",
        message: "초대 발송에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    const user = response.data
    return {
      id: user.id,
      name: user.name || input.name || user.email.split("@")[0],
      email: user.email,
      role: user.role,
      status: "PENDING",
      department: "미정",
      lastActive: user.createdAt,
      joinedAt: user.createdAt,
    }
  }

  /**
   * 팀 멤버 수정
   */
  async updateMember(id: string, input: TeamMemberUpdateInput): Promise<TeamMember> {
    const response = await apiClient.patch<{
      id: string
      name: string | null
      email: string
      role: UserRole
      status: string
      department: string | null
      image: string | null
      lastLogin: string | null
      createdAt: string
      updatedAt: string
    }>(`${this.baseEndpoint}/${id}`, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "UPDATE_FAILED",
        message: "팀 멤버 정보 수정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    const user = response.data
    return {
      id: user.id,
      name: user.name || user.email.split("@")[0],
      email: user.email,
      role: user.role,
      status: (user.status as TeamMember["status"]) || "ACTIVE",
      department: user.department || "미정",
      avatar: user.image || undefined,
      lastActive: user.lastLogin || user.createdAt,
      joinedAt: user.createdAt,
    }
  }

  /**
   * 팀 멤버 삭제
   */
  async deleteMember(id: string): Promise<void> {
    const response = await apiClient.delete(`${this.baseEndpoint}/${id}`)

    if (!response.success) {
      throw new ApiError({
        code: "DELETE_FAILED",
        message: "팀 멤버 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  /**
   * 비밀번호 재설정 링크 발송
   */
  async resetPassword(id: string): Promise<void> {
    const response = await apiClient.post(`${this.baseEndpoint}/${id}/reset-password`, {})

    if (!response.success) {
      throw new ApiError({
        code: "RESET_FAILED",
        message: "비밀번호 재설정 링크 발송에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  /**
   * 팀 통계 조회
   */
  async getStats(): Promise<TeamStats> {
    const response = await apiClient.get<{
      total: number
      byRole: Record<string, number>
      byStatus: Record<string, number>
    }>(`${this.baseEndpoint}?stats=true`)

    if (!response.success || !response.data) {
      return { totalMembers: 0, activeMembers: 0, pendingInvites: 0, totalRoles: 4 }
    }

    const stats = response.data
    return {
      totalMembers: stats.total || 0,
      activeMembers: stats.byStatus?.active || 0,
      pendingInvites: stats.byStatus?.pending || 0,
      totalRoles: Object.keys(stats.byRole || {}).length || 4,
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const teamService = new TeamService()
export default teamService
