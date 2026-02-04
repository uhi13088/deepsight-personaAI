/**
 * Settings Service - 설정 관리 서비스
 */

import { apiClient, ApiError } from "./api-client"

// ============================================================================
// 타입 정의
// ============================================================================

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string | null
  phone: string
  company: string
  timezone: string
  language: string
  twoFactorEnabled: boolean
  lastPasswordChange: string
}

export interface NotificationSettings {
  email: {
    apiAlerts: boolean
    usageReports: boolean
    billing: boolean
    security: boolean
    marketing: boolean
    productUpdates: boolean
  }
  push: {
    apiAlerts: boolean
    usageReports: boolean
    billing: boolean
    security: boolean
  }
}

export interface Session {
  id: string
  device: string
  ip: string
  location: string
  lastActive: string
  current: boolean
}

export interface UpdateProfileInput {
  name?: string
  email?: string
  phone?: string
  company?: string
  timezone?: string
  language?: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface SettingsData {
  profile: UserProfile
  notifications: NotificationSettings
  sessions: Session[]
}

// ============================================================================
// 서비스 클래스
// ============================================================================

class SettingsService {
  async getSettings(): Promise<SettingsData> {
    const response = await apiClient.get<SettingsData>("/settings")

    if (!response.success || !response.data) {
      // Return default data if API not implemented
      return {
        profile: {
          id: "",
          name: "",
          email: "",
          avatar: null,
          phone: "",
          company: "",
          timezone: "Asia/Seoul",
          language: "ko",
          twoFactorEnabled: false,
          lastPasswordChange: "",
        },
        notifications: {
          email: {
            apiAlerts: true,
            usageReports: false,
            billing: true,
            security: true,
            marketing: false,
            productUpdates: false,
          },
          push: {
            apiAlerts: true,
            usageReports: false,
            billing: true,
            security: true,
          },
        },
        sessions: [],
      }
    }

    return response.data
  }

  async updateProfile(input: UpdateProfileInput): Promise<UserProfile> {
    const response = await apiClient.patch<{ profile: UserProfile }>("/settings/profile", input)

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "PROFILE_UPDATE_FAILED",
        message: "프로필 수정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.profile
  }

  async changePassword(input: ChangePasswordInput): Promise<void> {
    const response = await apiClient.post("/settings/password", input)

    if (!response.success) {
      throw new ApiError({
        code: "PASSWORD_CHANGE_FAILED",
        message: "비밀번호 변경에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async updateNotifications(settings: NotificationSettings): Promise<NotificationSettings> {
    const response = await apiClient.patch<{ notifications: NotificationSettings }>(
      "/settings/notifications",
      settings
    )

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "NOTIFICATIONS_UPDATE_FAILED",
        message: "알림 설정 수정에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data.notifications
  }

  async enable2FA(): Promise<{ qrCode: string; secret: string }> {
    const response = await apiClient.post<{ qrCode: string; secret: string }>(
      "/settings/2fa/enable"
    )

    if (!response.success || !response.data) {
      throw new ApiError({
        code: "2FA_ENABLE_FAILED",
        message: "2FA 활성화에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }

    return response.data
  }

  async verify2FA(code: string): Promise<void> {
    const response = await apiClient.post("/settings/2fa/verify", { code })

    if (!response.success) {
      throw new ApiError({
        code: "2FA_VERIFY_FAILED",
        message: "2FA 인증에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async disable2FA(code: string): Promise<void> {
    const response = await apiClient.post("/settings/2fa/disable", { code })

    if (!response.success) {
      throw new ApiError({
        code: "2FA_DISABLE_FAILED",
        message: "2FA 비활성화에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async getSessions(): Promise<Session[]> {
    const response = await apiClient.get<{ sessions: Session[] }>("/settings/sessions")

    if (!response.success || !response.data) {
      return []
    }

    return response.data.sessions
  }

  async revokeSession(sessionId: string): Promise<void> {
    const response = await apiClient.delete(`/settings/sessions/${sessionId}`)

    if (!response.success) {
      throw new ApiError({
        code: "SESSION_REVOKE_FAILED",
        message: "세션 종료에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async revokeAllSessions(): Promise<void> {
    const response = await apiClient.delete("/settings/sessions")

    if (!response.success) {
      throw new ApiError({
        code: "SESSIONS_REVOKE_FAILED",
        message: "모든 세션 종료에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async deleteAccount(confirmation: string): Promise<void> {
    const response = await apiClient.delete("/settings/account")

    if (!response.success) {
      throw new ApiError({
        code: "ACCOUNT_DELETE_FAILED",
        message: "계정 삭제에 실패했습니다.",
        status: 500,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

// ============================================================================
// 싱글톤 인스턴스 export
// ============================================================================

export const settingsService = new SettingsService()
export default settingsService
