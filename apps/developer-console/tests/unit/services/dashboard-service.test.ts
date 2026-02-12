import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock api-client
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

import { dashboardService } from "@/services/dashboard-service"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("dashboardService.getStats", () => {
  it("fetches dashboard stats with default period", async () => {
    const responseData = {
      stats: { apiCalls: { today: 100 } },
      recentActivity: [],
      usageByDay: [],
      usageByEndpoint: [],
    }
    mockApiClient.get.mockResolvedValue({ success: true, data: responseData })

    const result = await dashboardService.getStats()
    expect(mockApiClient.get).toHaveBeenCalledWith("/dashboard/stats", { period: "7d" })
    expect(result).toEqual(responseData)
  })

  it("fetches stats with custom period", async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} })
    await dashboardService.getStats("30d")
    expect(mockApiClient.get).toHaveBeenCalledWith("/dashboard/stats", { period: "30d" })
  })

  it("throws when API returns failure", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    await expect(dashboardService.getStats()).rejects.toThrow()
  })

  it("throws when data is null", async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: null })
    await expect(dashboardService.getStats()).rejects.toThrow()
  })
})

describe("dashboardService.getRealTimeMetrics", () => {
  it("fetches realtime metrics", async () => {
    const metrics = {
      rps: 12.5,
      successRate: 99.8,
      avgResponseTime: 45,
      activeConnections: 23,
      timestamp: "2025-01-01T00:00:00Z",
    }
    mockApiClient.get.mockResolvedValue({ success: true, data: metrics })

    const result = await dashboardService.getRealTimeMetrics()
    expect(mockApiClient.get).toHaveBeenCalledWith("/dashboard/realtime")
    expect(result).toEqual(metrics)
  })

  it("throws on failure", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    await expect(dashboardService.getRealTimeMetrics()).rejects.toThrow()
  })
})

describe("dashboardService.getAlerts", () => {
  it("fetches alerts", async () => {
    const alerts = [{ id: "1", type: "usage", title: "High usage" }]
    mockApiClient.get.mockResolvedValue({ success: true, data: alerts })

    const result = await dashboardService.getAlerts()
    expect(mockApiClient.get).toHaveBeenCalledWith("/dashboard/alerts")
    expect(result).toEqual(alerts)
  })
})

describe("dashboardService.markAlertRead", () => {
  it("patches alert as read", async () => {
    mockApiClient.patch.mockResolvedValue({ success: true })
    await dashboardService.markAlertRead("alert_123")
    expect(mockApiClient.patch).toHaveBeenCalledWith("/dashboard/alerts/alert_123", { read: true })
  })
})

describe("dashboardService.getAlertChannels", () => {
  it("fetches alert channel config", async () => {
    const config = {
      email: true,
      slack: false,
      webhook: false,
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
    }
    mockApiClient.get.mockResolvedValue({ success: true, data: config })

    const result = await dashboardService.getAlertChannels()
    expect(result).toEqual(config)
  })
})

describe("dashboardService.updateAlertChannels", () => {
  it("puts alert channel config", async () => {
    const config = {
      email: true,
      slack: true,
      webhook: false,
      quietHoursEnabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
    }
    mockApiClient.put.mockResolvedValue({ success: true })
    await dashboardService.updateAlertChannels(config)
    expect(mockApiClient.put).toHaveBeenCalledWith("/dashboard/alert-channels", config)
  })
})
