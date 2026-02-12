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

import { usageService } from "@/services/usage-service"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("usageService.getUsage", () => {
  it("fetches usage with default period", async () => {
    const data = { period: "7d", overview: {}, dailyUsage: [] }
    mockApiClient.get.mockResolvedValue({ success: true, data })

    const result = await usageService.getUsage()
    expect(mockApiClient.get).toHaveBeenCalledWith("/usage", { period: "7d" })
    expect(result).toEqual(data)
  })

  it("fetches usage with custom period", async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} })
    await usageService.getUsage("30d")
    expect(mockApiClient.get).toHaveBeenCalledWith("/usage", { period: "30d" })
  })

  it("throws on failure", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    await expect(usageService.getUsage()).rejects.toThrow()
  })
})

describe("usageService.getEndpointDetail", () => {
  it("fetches endpoint detail", async () => {
    const detail = {
      endpoint: "/v1/match",
      totalCalls: 5000,
      latency: { p50: 30, p90: 80, p95: 120, p99: 250, avg: 45 },
    }
    mockApiClient.get.mockResolvedValue({ success: true, data: detail })

    const result = await usageService.getEndpointDetail("/v1/match")
    expect(mockApiClient.get).toHaveBeenCalledWith("/usage/endpoint-detail", {
      endpoint: "/v1/match",
      period: "7d",
    })
    expect(result.endpoint).toBe("/v1/match")
  })

  it("passes custom period", async () => {
    mockApiClient.get.mockResolvedValue({ success: true, data: {} })
    await usageService.getEndpointDetail("/v1/match", "30d")
    expect(mockApiClient.get).toHaveBeenCalledWith("/usage/endpoint-detail", {
      endpoint: "/v1/match",
      period: "30d",
    })
  })

  it("throws on failure", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    await expect(usageService.getEndpointDetail("/v1/match")).rejects.toThrow()
  })
})

describe("usageService.getCostAnalysis", () => {
  it("fetches cost analysis", async () => {
    const data = { byEndpoint: [], dailyCost: [], projectedMonthly: 250, currentMonthly: 180 }
    mockApiClient.get.mockResolvedValue({ success: true, data })

    const result = await usageService.getCostAnalysis()
    expect(mockApiClient.get).toHaveBeenCalledWith("/usage/cost-analysis", { period: "30d" })
    expect(result.projectedMonthly).toBe(250)
  })

  it("throws on failure", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    await expect(usageService.getCostAnalysis()).rejects.toThrow()
  })
})

describe("usageService.simulateCost", () => {
  it("sends daily calls for simulation", async () => {
    const plans = [{ planName: "Starter", totalCost: 199 }]
    mockApiClient.post.mockResolvedValue({ success: true, data: plans })

    const result = await usageService.simulateCost(1000)
    expect(mockApiClient.post).toHaveBeenCalledWith("/usage/simulate-cost", { dailyCalls: 1000 })
    expect(result).toEqual(plans)
  })

  it("throws on failure", async () => {
    mockApiClient.post.mockResolvedValue({ success: false })
    await expect(usageService.simulateCost(1000)).rejects.toThrow()
  })
})
