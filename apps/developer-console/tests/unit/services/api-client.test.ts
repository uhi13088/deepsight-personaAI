import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ApiError } from "@/services/api-client"

// We test ApiError independently since ApiClient uses fetch
describe("ApiError", () => {
  describe("constructor", () => {
    it("creates error with all fields", () => {
      const error = new ApiError({
        code: "TEST_ERROR",
        message: "Test error message",
        status: 400,
        timestamp: "2025-01-15T00:00:00Z",
      })
      expect(error.code).toBe("TEST_ERROR")
      expect(error.message).toBe("Test error message")
      expect(error.status).toBe(400)
      expect(error.timestamp).toBe("2025-01-15T00:00:00Z")
      expect(error.name).toBe("ApiError")
    })

    it("extends Error", () => {
      const error = new ApiError({
        code: "TEST",
        message: "test",
        status: 500,
        timestamp: new Date().toISOString(),
      })
      expect(error).toBeInstanceOf(Error)
    })

    it("stores details when provided", () => {
      const error = new ApiError({
        code: "TEST",
        message: "test",
        status: 422,
        timestamp: new Date().toISOString(),
        details: { field: "email", reason: "invalid" },
      })
      expect(error.details).toEqual({ field: "email", reason: "invalid" })
    })
  })

  describe("fromResponse", () => {
    it("creates error from 400 response", () => {
      const error = ApiError.fromResponse(400)
      expect(error.code).toBe("VALIDATION_ERROR")
      expect(error.status).toBe(400)
    })

    it("creates error from 401 response", () => {
      const error = ApiError.fromResponse(401)
      expect(error.code).toBe("UNAUTHORIZED")
      expect(error.status).toBe(401)
    })

    it("creates error from 403 response", () => {
      const error = ApiError.fromResponse(403)
      expect(error.code).toBe("FORBIDDEN")
      expect(error.status).toBe(403)
    })

    it("creates error from 404 response", () => {
      const error = ApiError.fromResponse(404)
      expect(error.code).toBe("NOT_FOUND")
      expect(error.status).toBe(404)
    })

    it("creates error from 429 response", () => {
      const error = ApiError.fromResponse(429)
      expect(error.code).toBe("RATE_LIMIT")
      expect(error.status).toBe(429)
    })

    it("creates error from 500 response", () => {
      const error = ApiError.fromResponse(500)
      expect(error.code).toBe("SERVER_ERROR")
      expect(error.status).toBe(500)
    })

    it("uses custom data if provided", () => {
      const error = ApiError.fromResponse(400, {
        code: "CUSTOM_ERROR",
        message: "Custom message",
      })
      expect(error.code).toBe("CUSTOM_ERROR")
      expect(error.message).toBe("Custom message")
    })

    it("falls back to UNKNOWN_ERROR for unmapped status", () => {
      const error = ApiError.fromResponse(418)
      expect(error.code).toBe("UNKNOWN_ERROR")
      expect(error.status).toBe(418)
    })

    it("includes timestamp", () => {
      const error = ApiError.fromResponse(500)
      expect(error.timestamp).toBeTruthy()
    })
  })

  describe("networkError", () => {
    it("creates network error with status 0", () => {
      const error = ApiError.networkError("Failed to fetch")
      expect(error.code).toBe("NETWORK_ERROR")
      expect(error.status).toBe(0)
      expect(error.message).toBe("Failed to fetch")
    })

    it("uses default message when empty", () => {
      const error = ApiError.networkError("")
      expect(error.code).toBe("NETWORK_ERROR")
    })
  })
})
