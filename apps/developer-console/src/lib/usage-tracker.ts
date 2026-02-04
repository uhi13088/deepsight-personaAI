import { NextRequest } from "next/server"
import prisma from "./prisma"
import type { ValidatedApiKey } from "./api-key-validator"

export interface ApiLogEntry {
  requestId: string
  method: string
  endpoint: string
  statusCode: number
  latencyMs: number
  requestBody?: unknown
  responseBody?: unknown
  ipAddress?: string
  userAgent?: string
  apiKeyId?: string
  userId?: string
  organizationId: string
}

/**
 * Log an API request
 */
export async function logApiRequest(entry: ApiLogEntry): Promise<void> {
  try {
    await prisma.apiLog.create({
      data: {
        requestId: entry.requestId,
        method: entry.method,
        endpoint: entry.endpoint,
        statusCode: entry.statusCode,
        latencyMs: entry.latencyMs,
        requestBody: entry.requestBody as object | undefined,
        responseBody: entry.responseBody as object | undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        apiKeyId: entry.apiKeyId,
        userId: entry.userId,
        organizationId: entry.organizationId,
      },
    })
  } catch (error) {
    console.error("Failed to log API request:", error)
  }
}

/**
 * Update usage record for aggregation
 */
export async function updateUsageRecord(
  organizationId: string,
  endpoint: string,
  success: boolean,
  latencyMs: number
): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    await prisma.usageRecord.upsert({
      where: {
        organizationId_date_endpoint: {
          organizationId,
          date: today,
          endpoint,
        },
      },
      create: {
        organizationId,
        date: today,
        endpoint,
        totalCalls: 1,
        successCalls: success ? 1 : 0,
        failedCalls: success ? 0 : 1,
        totalLatencyMs: BigInt(latencyMs),
      },
      update: {
        totalCalls: { increment: 1 },
        successCalls: success ? { increment: 1 } : undefined,
        failedCalls: success ? undefined : { increment: 1 },
        totalLatencyMs: { increment: BigInt(latencyMs) },
      },
    })
  } catch (error) {
    console.error("Failed to update usage record:", error)
  }
}

/**
 * Track API usage (logs and aggregates)
 */
export async function trackApiUsage(
  request: NextRequest,
  apiKey: ValidatedApiKey | null,
  requestId: string,
  endpoint: string,
  statusCode: number,
  latencyMs: number,
  requestBody?: unknown,
  responseBody?: unknown
): Promise<void> {
  if (!apiKey) return

  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown"
  const userAgent = request.headers.get("user-agent") || undefined

  // Log the request
  await logApiRequest({
    requestId,
    method: request.method,
    endpoint,
    statusCode,
    latencyMs,
    requestBody,
    responseBody,
    ipAddress,
    userAgent,
    apiKeyId: apiKey.id,
    userId: apiKey.userId,
    organizationId: apiKey.organizationId,
  })

  // Update usage aggregation
  const success = statusCode >= 200 && statusCode < 400
  await updateUsageRecord(apiKey.organizationId, endpoint, success, latencyMs)
}

export default {
  logApiRequest,
  updateUsageRecord,
  trackApiUsage,
}
