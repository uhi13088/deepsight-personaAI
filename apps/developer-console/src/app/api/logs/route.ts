import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import type { Prisma, ApiLog, ApiKey } from "@prisma/client"

type ApiLogWithApiKey = ApiLog & {
  apiKey: Pick<ApiKey, "id" | "name" | "lastFour" | "keyPrefix"> | null
}

// ============================================================================
// GET /api/logs - Get API logs with filtering
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const status = searchParams.get("status") // "success", "error", "all"
    const endpoint = searchParams.get("endpoint")
    const apiKeyId = searchParams.get("apiKeyId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 100)
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0)

    // TODO: Get organizationId from session - for now, get all logs
    // In production, filter by organization
    // const organizationId = await getOrganizationId(request)

    // Build where clause
    const where: Record<string, unknown> = {}

    if (status === "success") {
      where.statusCode = { lt: 400 }
    } else if (status === "error") {
      where.statusCode = { gte: 400 }
    } else if (status === "client_error") {
      where.statusCode = { gte: 400, lt: 500 }
    } else if (status === "server_error") {
      where.statusCode = { gte: 500 }
    }

    if (endpoint) {
      where.endpoint = { contains: endpoint }
    }

    if (apiKeyId) {
      where.apiKeyId = apiKeyId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        ;(where.createdAt as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        ;(where.createdAt as Record<string, Date>).lte = new Date(endDate)
      }
    }

    // Fetch logs with pagination
    const [logs, total, statsData] = await Promise.all([
      prisma.apiLog.findMany({
        where,
        include: {
          apiKey: {
            select: {
              id: true,
              name: true,
              lastFour: true,
              keyPrefix: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.apiLog.count({ where }),
      // Aggregate stats
      prisma.apiLog.aggregate({
        where,
        _count: true,
        _avg: { latencyMs: true },
      }),
    ])

    // Calculate stats by status
    const [successCount, clientErrorCount, serverErrorCount] = await Promise.all([
      prisma.apiLog.count({
        where: { ...where, statusCode: { lt: 400 } },
      }),
      prisma.apiLog.count({
        where: { ...where, statusCode: { gte: 400, lt: 500 } },
      }),
      prisma.apiLog.count({
        where: { ...where, statusCode: { gte: 500 } },
      }),
    ])

    // Transform logs for response
    const transformedLogs = logs.map((log: ApiLogWithApiKey) => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      method: log.method,
      endpoint: log.endpoint,
      status: log.statusCode,
      latency: log.latencyMs,
      apiKey: log.apiKey ? `${log.apiKey.keyPrefix}...${log.apiKey.lastFour}` : "N/A",
      apiKeyName: log.apiKey?.name || "Unknown",
      ip: log.ipAddress || "N/A",
      userAgent: log.userAgent || "N/A",
      requestBody: log.requestBody as Record<string, unknown> | null,
      responseBody: (log.responseBody as Record<string, unknown>) || {},
      requestHeaders: (log.requestHeaders as Record<string, string>) || {},
      responseHeaders: (log.responseHeaders as Record<string, string>) || {},
    }))

    const stats = {
      total: total,
      success: successCount,
      clientError: clientErrorCount,
      serverError: serverErrorCount,
      avgLatency: Math.round(statsData._avg.latencyMs || 0),
    }

    return NextResponse.json({
      success: true,
      data: {
        logs: transformedLogs,
        stats,
        total,
      },
    })
  } catch (error) {
    console.error("Error fetching logs:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch logs" },
      },
      { status: 500 }
    )
  }
}
