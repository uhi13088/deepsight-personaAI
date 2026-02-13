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

import { webhooksService } from "@/services/webhooks-service"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("webhooksService.getWebhooks", () => {
  it("fetches all webhooks", async () => {
    const data = {
      webhooks: [{ id: "wh_1", url: "https://example.com/webhook" }],
      deliveryLogs: [],
    }
    mockApiClient.get.mockResolvedValue({ success: true, data })

    const result = await webhooksService.getWebhooks()
    expect(mockApiClient.get).toHaveBeenCalledWith("/webhooks")
    expect(result.webhooks).toHaveLength(1)
  })

  it("returns empty data on failure", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    const result = await webhooksService.getWebhooks()
    expect(result.webhooks).toEqual([])
    expect(result.deliveryLogs).toEqual([])
  })
})

describe("webhooksService.getWebhook", () => {
  it("fetches a single webhook", async () => {
    const webhook = { id: "wh_1", url: "https://example.com/webhook" }
    mockApiClient.get.mockResolvedValue({ success: true, data: { webhook } })

    const result = await webhooksService.getWebhook("wh_1")
    expect(mockApiClient.get).toHaveBeenCalledWith("/webhooks/wh_1")
    expect(result.url).toBe("https://example.com/webhook")
  })

  it("throws when webhook not found", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    await expect(webhooksService.getWebhook("nonexistent")).rejects.toThrow()
  })
})

describe("webhooksService.createWebhook", () => {
  it("creates a new webhook", async () => {
    const webhook = { id: "wh_new", url: "https://example.com/new" }
    mockApiClient.post.mockResolvedValue({ success: true, data: { webhook } })

    const result = await webhooksService.createWebhook({
      url: "https://example.com/new",
      events: ["match.completed"],
    })
    expect(mockApiClient.post).toHaveBeenCalledWith("/webhooks", {
      url: "https://example.com/new",
      events: ["match.completed"],
    })
    expect(result.url).toBe("https://example.com/new")
  })
})

describe("webhooksService.deleteWebhook", () => {
  it("deletes a webhook", async () => {
    mockApiClient.delete.mockResolvedValue({ success: true })
    await webhooksService.deleteWebhook("wh_123")
    expect(mockApiClient.delete).toHaveBeenCalledWith("/webhooks/wh_123")
  })
})

describe("webhooksService.testWebhook", () => {
  it("tests a webhook", async () => {
    const testData = { success: true, statusCode: 200, latency: 150 }
    mockApiClient.post.mockResolvedValue({ success: true, data: testData })

    const result = await webhooksService.testWebhook("wh_123")
    expect(mockApiClient.post).toHaveBeenCalledWith("/webhooks/wh_123/test")
    expect(result.success).toBe(true)
  })
})

describe("webhooksService.getDeliveryLogs", () => {
  it("fetches delivery logs for a webhook", async () => {
    const logs = [{ id: "del_1", webhookId: "wh_123", statusCode: 200 }]
    mockApiClient.get.mockResolvedValue({ success: true, data: { logs } })

    const result = await webhooksService.getDeliveryLogs("wh_123")
    expect(mockApiClient.get).toHaveBeenCalledWith("/webhooks/deliveries", { webhookId: "wh_123" })
    expect(result).toHaveLength(1)
  })

  it("returns empty array on failure", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    const result = await webhooksService.getDeliveryLogs()
    expect(result).toEqual([])
  })
})
