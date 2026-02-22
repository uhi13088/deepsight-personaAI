import { describe, it, expect, vi, beforeEach } from "vitest"

const mockApiClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))
vi.mock("@/services/api-client", () => ({
  apiClient: mockApiClient,
  ApiError: class MockApiError extends Error {
    code: string
    status: number
    timestamp: string
    constructor(details: { code: string; message: string; status: number; timestamp: string }) {
      super(details.message)
      this.code = details.code
      this.status = details.status
      this.timestamp = details.timestamp
    }
  },
}))

import { settingsService } from "@/services/settings-service"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("settingsService.getSettings", () => {
  it("fetches settings", async () => {
    const settings = {
      profile: { name: "Test User" },
      notifications: {},
      sessions: [],
    }
    mockApiClient.get.mockResolvedValue({ success: true, data: settings })

    const result = await settingsService.getSettings()
    expect(mockApiClient.get).toHaveBeenCalledWith("/settings")
    expect(result.profile.name).toBe("Test User")
  })

  it("returns default data on failure", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    const result = await settingsService.getSettings()
    expect(result.profile).toBeDefined()
    expect(result.notifications).toBeDefined()
    expect(result.sessions).toEqual([])
  })
})

describe("settingsService.updateProfile", () => {
  it("updates user profile", async () => {
    const profile = { name: "Updated Name", timezone: "Asia/Seoul" }
    mockApiClient.patch.mockResolvedValue({ success: true, data: { profile } })

    const result = await settingsService.updateProfile(profile)
    expect(mockApiClient.patch).toHaveBeenCalledWith("/settings/profile", profile)
    expect(result.name).toBe("Updated Name")
  })
})

describe("settingsService.updateNotifications", () => {
  it("updates notification settings", async () => {
    const notifications = {
      email: {
        apiAlerts: true,
        usageReports: true,
        billing: true,
        security: true,
        marketing: false,
        productUpdates: false,
      },
      push: { apiAlerts: true, usageReports: false, billing: true, security: true },
    }
    mockApiClient.patch.mockResolvedValue({ success: true, data: { notifications } })

    const result = await settingsService.updateNotifications(notifications)
    expect(mockApiClient.patch).toHaveBeenCalledWith("/settings/notifications", notifications)
    expect(result).toEqual(notifications)
  })
})

describe("settingsService.changePassword", () => {
  it("changes password", async () => {
    mockApiClient.post.mockResolvedValue({ success: true })
    await settingsService.changePassword({
      currentPassword: "old123",
      newPassword: "new456",
    })
    expect(mockApiClient.post).toHaveBeenCalledWith("/settings/password", {
      currentPassword: "old123",
      newPassword: "new456",
    })
  })
})

describe("settingsService.enable2FA", () => {
  it("initiates 2FA setup", async () => {
    const setup = { secret: "ABCDEF", qrCode: "data:image/png;..." }
    mockApiClient.post.mockResolvedValue({ success: true, data: setup })

    const result = await settingsService.enable2FA()
    expect(mockApiClient.post).toHaveBeenCalledWith("/settings/2fa/enable")
    expect(result.secret).toBe("ABCDEF")
  })
})

describe("settingsService.verify2FA", () => {
  it("verifies 2FA code", async () => {
    mockApiClient.post.mockResolvedValue({ success: true })
    await settingsService.verify2FA("123456")
    expect(mockApiClient.post).toHaveBeenCalledWith("/settings/2fa/verify", { code: "123456" })
  })
})

describe("settingsService.revokeSession", () => {
  it("revokes a session", async () => {
    mockApiClient.delete.mockResolvedValue({ success: true })
    await settingsService.revokeSession("session_123")
    expect(mockApiClient.delete).toHaveBeenCalledWith("/settings/sessions/session_123")
  })
})

describe("settingsService.getSessions", () => {
  it("fetches sessions", async () => {
    const sessions = [{ id: "s_1", device: "Chrome", current: true }]
    mockApiClient.get.mockResolvedValue({ success: true, data: { sessions } })

    const result = await settingsService.getSessions()
    expect(result).toHaveLength(1)
  })

  it("returns empty array on failure", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    const result = await settingsService.getSessions()
    expect(result).toEqual([])
  })
})

describe("settingsService.disable2FA", () => {
  it("disables 2FA", async () => {
    mockApiClient.post.mockResolvedValue({ success: true })
    await settingsService.disable2FA("123456")
    expect(mockApiClient.post).toHaveBeenCalledWith("/settings/2fa/disable", { code: "123456" })
  })
})
