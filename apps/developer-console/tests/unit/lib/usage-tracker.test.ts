import { describe, it, expect, vi, beforeEach } from "vitest"
import type { ValidatedApiKey } from "@/lib/api-key-validator"

// Mock prisma
const mockPrisma = vi.hoisted(() => ({
  apiLog: { create: vi.fn() },
  usageRecord: { upsert: vi.fn() },
}))
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }))

// Import after mocking
import {
  logApiRequest,
  updateUsageRecord,
  trackApiUsage,
  type ApiLogEntry,
} from "@/lib/usage-tracker"
import { NextRequest } from "next/server"

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.apiLog.create.mockResolvedValue({})
  mockPrisma.usageRecord.upsert.mockResolvedValue({})
})

function createApiLogEntry(overrides: Partial<ApiLogEntry> = {}): ApiLogEntry {
  return {
    requestId: "req_123",
    method: "POST",
    endpoint: "/v1/match",
    statusCode: 200,
    latencyMs: 45,
    organizationId: "org_123",
    ...overrides,
  }
}

describe("logApiRequest", () => {
  it("creates a log entry in database", async () => {
    const entry = createApiLogEntry()
    await logApiRequest(entry)
    expect(mockPrisma.apiLog.create).toHaveBeenCalledOnce()
    expect(mockPrisma.apiLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: "req_123",
        method: "POST",
        endpoint: "/v1/match",
        statusCode: 200,
        latencyMs: 45,
        organizationId: "org_123",
      }),
    })
  })

  it("includes optional fields when provided", async () => {
    const entry = createApiLogEntry({
      ipAddress: "192.168.1.1",
      userAgent: "TestAgent/1.0",
      apiKeyId: "key_123",
      userId: "user_123",
    })
    await logApiRequest(entry)
    expect(mockPrisma.apiLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: "192.168.1.1",
        userAgent: "TestAgent/1.0",
        apiKeyId: "key_123",
        userId: "user_123",
      }),
    })
  })

  it("does not throw on database error", async () => {
    mockPrisma.apiLog.create.mockRejectedValue(new Error("DB Error"))
    const entry = createApiLogEntry()
    await expect(logApiRequest(entry)).resolves.toBeUndefined()
  })
})

describe("updateUsageRecord", () => {
  it("upserts usage record for success", async () => {
    await updateUsageRecord("org_123", "/v1/match", true, 50)
    expect(mockPrisma.usageRecord.upsert).toHaveBeenCalledOnce()
    const call = mockPrisma.usageRecord.upsert.mock.calls[0][0]
    expect(call.create.organizationId).toBe("org_123")
    expect(call.create.endpoint).toBe("/v1/match")
    expect(call.create.successCalls).toBe(1)
    expect(call.create.failedCalls).toBe(0)
  })

  it("upserts usage record for failure", async () => {
    await updateUsageRecord("org_123", "/v1/match", false, 100)
    const call = mockPrisma.usageRecord.upsert.mock.calls[0][0]
    expect(call.create.successCalls).toBe(0)
    expect(call.create.failedCalls).toBe(1)
  })

  it("does not throw on database error", async () => {
    mockPrisma.usageRecord.upsert.mockRejectedValue(new Error("DB Error"))
    await expect(updateUsageRecord("org_123", "/v1/match", true, 50)).resolves.toBeUndefined()
  })
})

describe("trackApiUsage", () => {
  it("does nothing when apiKey is null", async () => {
    const request = new NextRequest("http://localhost:3001/api/v1/test")
    await trackApiUsage(request, null, "req_1", "/v1/test", 200, 50)
    expect(mockPrisma.apiLog.create).not.toHaveBeenCalled()
    expect(mockPrisma.usageRecord.upsert).not.toHaveBeenCalled()
  })

  it("logs request and updates usage when apiKey provided", async () => {
    const request = new NextRequest("http://localhost:3001/api/v1/match", {
      headers: { "user-agent": "TestAgent/1.0" },
    })
    const apiKey: ValidatedApiKey = {
      id: "key_123",
      name: "Test Key",
      organizationId: "org_123",
      userId: "user_123",
      environment: "LIVE",
      permissions: ["*"],
      rateLimit: 100,
    }
    await trackApiUsage(request, apiKey, "req_1", "/v1/match", 200, 50)
    expect(mockPrisma.apiLog.create).toHaveBeenCalledOnce()
    expect(mockPrisma.usageRecord.upsert).toHaveBeenCalledOnce()
  })

  it("treats 2xx and 3xx as success", async () => {
    const request = new NextRequest("http://localhost:3001/api/v1/match")
    const apiKey: ValidatedApiKey = {
      id: "key_123",
      name: "Test Key",
      organizationId: "org_123",
      userId: "user_123",
      environment: "LIVE",
      permissions: ["*"],
      rateLimit: 100,
    }
    await trackApiUsage(request, apiKey, "req_1", "/v1/match", 301, 50)
    const usageCall = mockPrisma.usageRecord.upsert.mock.calls[0][0]
    expect(usageCall.create.successCalls).toBe(1)
  })

  it("treats 4xx as failure", async () => {
    const request = new NextRequest("http://localhost:3001/api/v1/match")
    const apiKey: ValidatedApiKey = {
      id: "key_123",
      name: "Test Key",
      organizationId: "org_123",
      userId: "user_123",
      environment: "LIVE",
      permissions: ["*"],
      rateLimit: 100,
    }
    await trackApiUsage(request, apiKey, "req_1", "/v1/match", 400, 50)
    const usageCall = mockPrisma.usageRecord.upsert.mock.calls[0][0]
    expect(usageCall.create.failedCalls).toBe(1)
  })
})
