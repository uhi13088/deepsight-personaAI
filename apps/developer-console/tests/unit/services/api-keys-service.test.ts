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

import { apiKeysService } from "@/services/api-keys-service"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("apiKeysService.getKeys", () => {
  it("fetches all API keys", async () => {
    const data = { apiKeys: [{ id: "key_1", name: "Test Key" }], total: 1 }
    mockApiClient.get.mockResolvedValue({ success: true, data })

    const result = await apiKeysService.getKeys()
    expect(mockApiClient.get).toHaveBeenCalledWith("/api-keys")
    expect(result.apiKeys).toHaveLength(1)
    expect(result.total).toBe(1)
  })

  it("throws on failure", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    await expect(apiKeysService.getKeys()).rejects.toThrow()
  })
})

describe("apiKeysService.createKey", () => {
  it("creates a new API key", async () => {
    const newKey = {
      apiKey: { id: "key_new", name: "New Key" },
      key: "ds_live_xxx",
      message: "Created",
    }
    mockApiClient.post.mockResolvedValue({ success: true, data: newKey })

    const result = await apiKeysService.createKey({
      name: "New Key",
      environment: "live",
      permissions: ["match:read"],
    })
    expect(mockApiClient.post).toHaveBeenCalledWith("/api-keys", {
      name: "New Key",
      environment: "live",
      permissions: ["match:read"],
    })
    expect(result.key).toBe("ds_live_xxx")
  })
})

describe("apiKeysService.revokeKey", () => {
  it("revokes an API key via DELETE", async () => {
    mockApiClient.delete.mockResolvedValue({ success: true })
    await apiKeysService.revokeKey("key_123")
    expect(mockApiClient.delete).toHaveBeenCalledWith("/api-keys/key_123")
  })
})

describe("apiKeysService.rotateKey", () => {
  it("rotates an API key", async () => {
    const rotated = { apiKey: { id: "key_123", key: "ds_live_newkey" }, message: "Rotated" }
    mockApiClient.post.mockResolvedValue({ success: true, data: rotated })

    const result = await apiKeysService.rotateKey("key_123")
    expect(mockApiClient.post).toHaveBeenCalledWith("/api-keys/key_123/rotate")
    expect(result.apiKey.key).toBe("ds_live_newkey")
  })
})

describe("apiKeysService.updateKey", () => {
  it("updates an API key", async () => {
    const apiKey = { id: "key_123", name: "Updated Key" }
    mockApiClient.patch.mockResolvedValue({ success: true, data: { apiKey } })

    const result = await apiKeysService.updateKey("key_123", { name: "Updated Key" })
    expect(mockApiClient.patch).toHaveBeenCalledWith("/api-keys/key_123", { name: "Updated Key" })
    expect(result.name).toBe("Updated Key")
  })
})

describe("apiKeysService.getKey", () => {
  it("fetches a single API key", async () => {
    const apiKey = { id: "key_123", name: "Test Key" }
    mockApiClient.get.mockResolvedValue({ success: true, data: { apiKey } })

    const result = await apiKeysService.getKey("key_123")
    expect(mockApiClient.get).toHaveBeenCalledWith("/api-keys/key_123")
    expect(result.name).toBe("Test Key")
  })

  it("throws when key not found", async () => {
    mockApiClient.get.mockResolvedValue({ success: false })
    await expect(apiKeysService.getKey("nonexistent")).rejects.toThrow()
  })
})
