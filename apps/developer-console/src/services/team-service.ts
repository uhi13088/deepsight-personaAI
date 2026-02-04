/**
 * Team Service - 팀/조직 관리 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export type MemberRole = "owner" | "admin" | "developer" | "viewer"
export type MemberStatus = "active" | "pending" | "inactive"

export interface Organization {
  id: string
  name: string
  plan: string
  createdAt: string
  memberCount: number
  maxMembers: number
}

export interface Member {
  id: string
  name: string
  email: string
  avatar: string | null
  role: MemberRole
  status: MemberStatus
  joinedAt: string
  lastActive: string | null
}

export interface PendingInvite {
  id: string
  email: string
  role: MemberRole
  invitedBy: string
  invitedAt: string
  expiresAt: string
}

export interface InviteMemberInput {
  email: string
  role: MemberRole
}

export interface UpdateMemberInput {
  role?: MemberRole
}

export interface TeamData {
  organization: Organization
  members: Member[]
  pendingInvites: PendingInvite[]
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class TeamService {
  async getTeam(): Promise<TeamData> {
    const response = await apiClient.get<TeamData>("/team")

    if (!response.success || !response.data) {
      // Return empty data if API not implemented
      return {
        organization: {
          id: "",
          name: "My Organization",
          plan: "Free",
          createdAt: new Date().toISOString(),
          memberCount: 0,
          maxMembers: 5,
        },
        members: [],
        pendingInvites: [],
      }
    }

    return response.data
  }

  async inviteMember(input: InviteMemberInput): Promise<PendingInvite> {
    const response = await apiClient.post<{ invite: PendingInvite }>("/team/invite", input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "INVITE_FAILED",
        message: "초대 발송에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.invite
  }

  async updateMember(memberId: string, input: UpdateMemberInput): Promise<Member> {
    const response = await apiClient.patch<{ member: Member }>(`/team/members/${memberId}`, input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "MEMBER_UPDATE_FAILED",
        message: "멤버 정보 수정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.member
  }

  async removeMember(memberId: string): Promise<void> {
    const response = await apiClient.delete(`/team/members/${memberId}`)

    if (!response.success) {
      throw new ApiError({
        code: "MEMBER_REMOVE_FAILED",
        message: "멤버 제거에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async cancelInvite(inviteId: string): Promise<void> {
    const response = await apiClient.delete(`/team/invites/${inviteId}`)

    if (!response.success) {
      throw new ApiError({
        code: "INVITE_CANCEL_FAILED",
        message: "초대 취소에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async resendInvite(inviteId: string): Promise<void> {
    const response = await apiClient.post(`/team/invites/${inviteId}/resend`)

    if (!response.success) {
      throw new ApiError({
        code: "INVITE_RESEND_FAILED",
        message: "초대 재발송에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const teamService = new TeamService()
export default teamService
