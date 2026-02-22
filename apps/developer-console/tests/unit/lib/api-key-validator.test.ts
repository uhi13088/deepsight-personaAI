import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { extractApiKey, hasPermission, type ValidatedApiKey } from "@/lib/api-key-validator"

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  default: {
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

function createMockRequest(headers: Record<string, string> = {}): NextRequest {
  const url = "http://localhost:3001/api/v1/test"
  return new NextRequest(url, { headers: new Headers(headers) })
}

function createMockApiKey(overrides: Partial<ValidatedApiKey> = {}): ValidatedApiKey {
  return {
    id: "key_123",
    name: "Test Key",
    organizationId: "org_123",
    userId: "user_123",
    environment: "LIVE",
    permissions: ["match:read", "personas:read"],
    rateLimit: 100,
    ...overrides,
  }
}

describe("extractApiKey", () => {
  it("extracts from Authorization Bearer header", () => {
    const request = createMockRequest({ Authorization: "Bearer ds_live_abc123" })
    const key = extractApiKey(request)
    expect(key).toBe("ds_live_abc123")
  })

  it("extracts from X-API-Key header", () => {
    const request = createMockRequest({ "X-API-Key": "ds_test_xyz789" })
    const key = extractApiKey(request)
    expect(key).toBe("ds_test_xyz789")
  })

  it("prefers Authorization header over X-API-Key", () => {
    const request = createMockRequest({
      Authorization: "Bearer bearer_key",
      "X-API-Key": "x-api-key",
    })
    const key = extractApiKey(request)
    expect(key).toBe("bearer_key")
  })

  it("returns null when no auth headers present", () => {
    const request = createMockRequest({})
    const key = extractApiKey(request)
    expect(key).toBeNull()
  })

  it("returns null for non-Bearer Authorization", () => {
    const request = createMockRequest({ Authorization: "Basic dXNlcjpwYXNz" })
    const key = extractApiKey(request)
    expect(key).toBeNull()
  })

  it("handles empty Bearer token", () => {
    // Headers API trims trailing whitespace, so "Bearer " becomes "Bearer"
    // which doesn't match "Bearer " prefix, returning null
    const request = createMockRequest({ Authorization: "Bearer " })
    const key = extractApiKey(request)
    expect(key).toBeNull()
  })
})

describe("hasPermission", () => {
  it("returns true for matching permission", () => {
    const apiKey = createMockApiKey({ permissions: ["match:read", "personas:read"] })
    expect(hasPermission(apiKey, "match:read")).toBe(true)
  })

  it("returns false for missing permission", () => {
    const apiKey = createMockApiKey({ permissions: ["match:read"] })
    expect(hasPermission(apiKey, "admin:write")).toBe(false)
  })

  it("grants all permissions with wildcard (*)", () => {
    const apiKey = createMockApiKey({ permissions: ["*"] })
    expect(hasPermission(apiKey, "match:read")).toBe(true)
    expect(hasPermission(apiKey, "admin:delete")).toBe(true)
  })

  it("grants all permissions with admin", () => {
    const apiKey = createMockApiKey({ permissions: ["admin"] })
    expect(hasPermission(apiKey, "match:read")).toBe(true)
    expect(hasPermission(apiKey, "billing:write")).toBe(true)
  })

  it("returns false for empty permissions", () => {
    const apiKey = createMockApiKey({ permissions: [] })
    expect(hasPermission(apiKey, "match:read")).toBe(false)
  })

  it("is case-sensitive", () => {
    const apiKey = createMockApiKey({ permissions: ["match:read"] })
    expect(hasPermission(apiKey, "Match:Read")).toBe(false)
  })
})
