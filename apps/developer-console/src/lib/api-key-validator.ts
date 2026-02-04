import { NextRequest } from "next/server"
import crypto from "crypto"
import prisma from "./prisma"

export interface ValidatedApiKey {
  id: string
  name: string
  organizationId: string
  userId: string
  environment: "TEST" | "LIVE"
  permissions: string[]
  rateLimit: number
}

export interface ApiKeyValidationResult {
  valid: boolean
  apiKey?: ValidatedApiKey
  error?: {
    code: string
    message: string
  }
}

/**
 * Hash an API key for comparison
 */
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex")
}

/**
 * Extract API key from request headers
 */
export function extractApiKey(request: NextRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get("Authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get("X-API-Key")
  if (apiKeyHeader) {
    return apiKeyHeader
  }

  return null
}

/**
 * Validate an API key and return the associated organization
 */
export async function validateApiKey(request: NextRequest): Promise<ApiKeyValidationResult> {
  const apiKeyValue = extractApiKey(request)

  if (!apiKeyValue) {
    return {
      valid: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing API key. Provide it via Authorization: Bearer <key> or X-API-Key header.",
      },
    }
  }

  try {
    const keyHash = hashApiKey(apiKeyValue)

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        organization: true,
      },
    })

    if (!apiKey) {
      return {
        valid: false,
        error: {
          code: "INVALID_API_KEY",
          message: "Invalid API key.",
        },
      }
    }

    // Check if key is active
    if (apiKey.status !== "ACTIVE") {
      return {
        valid: false,
        error: {
          code: "API_KEY_INACTIVE",
          message: `API key is ${apiKey.status.toLowerCase()}.`,
        },
      }
    }

    // Check if key is expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return {
        valid: false,
        error: {
          code: "API_KEY_EXPIRED",
          message: "API key has expired.",
        },
      }
    }

    // Update last used timestamp (fire and forget)
    prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Ignore errors from lastUsedAt update
      })

    return {
      valid: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        organizationId: apiKey.organizationId,
        userId: apiKey.userId,
        environment: apiKey.environment,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
      },
    }
  } catch (error) {
    console.error("API key validation error:", error)
    return {
      valid: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to validate API key.",
      },
    }
  }
}

/**
 * Check if the API key has the required permission
 */
export function hasPermission(apiKey: ValidatedApiKey, permission: string): boolean {
  // Admin permission grants all
  if (apiKey.permissions.includes("*") || apiKey.permissions.includes("admin")) {
    return true
  }

  return apiKey.permissions.includes(permission)
}

export default {
  validateApiKey,
  extractApiKey,
  hasPermission,
}
