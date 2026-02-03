/**
 * Team Service - 팀 멤버 관리 서비스
 * 팀원 CRUD 및 초대 기능을 제공합니다.
 */

import { apiClient, ApiError } from "./api-client"
import { MOCK_TEAM_MEMBERS, type MockTeamMember } from "./mock-data.service"
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
  private readonly baseEndpoint = "/team"

  // Mock 데이터 저장소 (개발용)
  private mockMembers: TeamMember[] = []

  constructor() {
    // MOCK_TEAM_MEMBERS를 내부 형식으로 변환
    this.mockMembers = MOCK_TEAM_MEMBERS.map(this.transformMockMember)
  }

  // 개발 모드 여부 (환경변수로 제어)
  private get useMockData(): boolean {
    return (
      process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || process.env.NODE_ENV === "development"
    )
  }

  private transformMockMember(member: MockTeamMember): TeamMember {
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      department: member.department,
      avatar: member.avatar,
      lastActive: member.lastActive,
      joinedAt: member.joinedAt,
    }
  }

  /**
   * 팀 멤버 목록 조회
   */
  async getMembers(filters?: { role?: UserRole; search?: string }): Promise<TeamListResponse> {
    if (this.useMockData) {
      return this.getMockMembers(filters)
    }

    const response = await apiClient.get<TeamListResponse>(this.baseEndpoint, filters)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "TEAM_FETCH_FAILED",
        message: "팀 멤버 목록을 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 팀 멤버 상세 조회
   */
  async getMemberById(id: string): Promise<TeamMember> {
    if (this.useMockData) {
      return this.getMockMemberById(id)
    }

    const response = await apiClient.get<TeamMember>(`${this.baseEndpoint}/${id}`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "MEMBER_NOT_FOUND",
        message: "팀 멤버를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
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

    if (this.useMockData) {
      return this.createMockMember(input)
    }

    const response = await apiClient.post<TeamMember>(`${this.baseEndpoint}/invite`, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "INVITE_FAILED",
        message: "초대 발송에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 팀 멤버 수정
   */
  async updateMember(id: string, input: TeamMemberUpdateInput): Promise<TeamMember> {
    if (this.useMockData) {
      return this.updateMockMember(id, input)
    }

    const response = await apiClient.patch<TeamMember>(`${this.baseEndpoint}/${id}`, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "UPDATE_FAILED",
        message: "팀 멤버 정보 수정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  /**
   * 팀 멤버 삭제
   */
  async deleteMember(id: string): Promise<void> {
    if (this.useMockData) {
      return this.deleteMockMember(id)
    }

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
    if (this.useMockData) {
      // Mock: 단순히 성공으로 처리
      return
    }

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
    if (this.useMockData) {
      return this.getMockStats()
    }

    const response = await apiClient.get<TeamStats>(`${this.baseEndpoint}/stats`)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "STATS_FETCH_FAILED",
        message: "팀 통계를 불러오는데 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  // ============================================================================
  // Mock 데이터 메서드 (개발용)
  // ============================================================================

  private getMockMembers(filters?: { role?: UserRole; search?: string }): TeamListResponse {
    let result = [...this.mockMembers]

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(searchLower) || m.email.toLowerCase().includes(searchLower)
      )
    }

    if (filters?.role) {
      result = result.filter((m) => m.role === filters.role)
    }

    return {
      members: result,
      total: result.length,
    }
  }

  private getMockMemberById(id: string): TeamMember {
    const member = this.mockMembers.find((m) => m.id === id)

    if (!member) {
      throw new ApiError({
        code: "MEMBER_NOT_FOUND",
        message: "팀 멤버를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    return member
  }

  private createMockMember(input: TeamMemberCreateInput): TeamMember {
    const now = new Date().toISOString()
    const id = `member-${Date.now()}`

    const newMember: TeamMember = {
      id,
      name: input.name || input.email.split("@")[0],
      email: input.email,
      role: input.role,
      status: "PENDING",
      department: "미정",
      lastActive: now,
      joinedAt: now,
    }

    this.mockMembers.push(newMember)
    return newMember
  }

  private updateMockMember(id: string, input: TeamMemberUpdateInput): TeamMember {
    const index = this.mockMembers.findIndex((m) => m.id === id)

    if (index === -1) {
      throw new ApiError({
        code: "MEMBER_NOT_FOUND",
        message: "팀 멤버를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    this.mockMembers[index] = {
      ...this.mockMembers[index],
      ...input,
    }

    return this.mockMembers[index]
  }

  private deleteMockMember(id: string): void {
    const index = this.mockMembers.findIndex((m) => m.id === id)

    if (index === -1) {
      throw new ApiError({
        code: "MEMBER_NOT_FOUND",
        message: "팀 멤버를 찾을 수 없습니다.",
        status: 404,
        timestamp: new Date().toISOString(),
      })
    }

    this.mockMembers.splice(index, 1)
  }

  private getMockStats(): TeamStats {
    return {
      totalMembers: this.mockMembers.length,
      activeMembers: this.mockMembers.filter((m) => m.status === "ACTIVE").length,
      pendingInvites: this.mockMembers.filter((m) => m.status === "PENDING").length,
      totalRoles: 4, // Fixed number of roles
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const teamService = new TeamService()
export default teamService
