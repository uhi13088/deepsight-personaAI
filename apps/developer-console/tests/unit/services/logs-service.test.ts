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

import { logsService } from "@/services/logs-service"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("logsService.getLogs", () => {
  it("fetches logs without filters", async () => {
    const data = { logs: [], stats: { total: 0 }, total: 0 }
    mockApiClient.get.mockResolvedValue({ success: true, data })

    const result = await logsService.getLogs()
    expect(mockApiClient.get).toHaveBeenCalledWith("/logs", {})
    expect(result).toEqual(data)
  })

  it("passes search filter", async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { logs: [], stats: {}, total: 0 } })
    await logsService.getLogs({ search: "match" })
    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/logs",
      expect.objectContaining({ search: "match" })
    )
  })

  it("passes status filter", async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { logs: [], stats: {}, total: 0 } })
    await logsService.getLogs({ status: "success" })
    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/logs",
      expect.objectContaining({ status: "success" })
    )
  })

  it("passes all filters", async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: { logs: [], stats: {}, total: 0 } })
    await logsService.getLogs({
      search: "test",
      status: "client_error",
      endpoint: "/v1/match",
      apiKeyId: "key_123",
      limit: 50,
      offset: 10,
    })
    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/logs",
      expect.objectContaining({
        search: "test",
        status: "client_error",
        endpoint: "/v1/match",
        apiKeyId: "key_123",
        limit: 50,
        offset: 10,
      })
    )
  })

  it("returns empty response when API returns no data", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    const result = await logsService.getLogs()
    expect(result.logs).toEqual([])
    expect(result.total).toBe(0)
  })
})

describe("logsService.getLog", () => {
  it("fetches single log by id", async () => {
    const log = { id: "log_123", method: "POST", endpoint: "/v1/match" }
    mockApiClient.get.mockResolvedValue({ success: true, data: { log } })

    const result = await logsService.getLog("log_123")
    expect(mockApiClient.get).toHaveBeenCalledWith("/logs/log_123")
    expect(result.id).toBe("log_123")
  })

  it("throws when log not found", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    await expect(logsService.getLog("nonexistent")).rejects.toThrow()
  })
})

describe("logsService.getErrorDashboard", () => {
  it("fetches error dashboard data", async () => {
    const data = {
      errorRateTrend: [],
      errorsByType: [],
      errorsByEndpoint: [],
      topErrorMessages: [],
    }
    mockApiClient.get.mockResolvedValue({ success: true, data })

    const result = await logsService.getErrorDashboard()
    expect(mockApiClient.get).toHaveBeenCalledWith("/logs/error-dashboard", { period: "7d" })
    expect(result).toEqual(data)
  })

  it("throws on failure", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    await expect(logsService.getErrorDashboard()).rejects.toThrow()
  })
})

describe("logsService.getErrorAlertConfig", () => {
  it("fetches error alert config", async () => {
    const config = {
      enabled: true,
      errorRateThreshold: 5,
      consecutiveErrorCount: 10,
      notifyChannels: { email: true, slack: false, webhook: false },
    }
    mockApiClient.get.mockResolvedValue({ success: true, data: config })

    const result = await logsService.getErrorAlertConfig()
    expect(result.enabled).toBe(true)
  })
})

describe("logsService.updateErrorAlertConfig", () => {
  it("updates error alert config", async () => {
    const config = {
      enabled: true,
      errorRateThreshold: 10,
      consecutiveErrorCount: 5,
      notifyChannels: { email: true, slack: true, webhook: false },
    }
    mockApiClient.put.mockResolvedValue({ success: true })
    await logsService.updateErrorAlertConfig(config)
    expect(mockApiClient.put).toHaveBeenCalledWith("/logs/error-alert-config", config)
  })
})
