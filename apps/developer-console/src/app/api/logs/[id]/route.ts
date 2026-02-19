import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/require-auth"

// ============================================================================
// GET /api/logs/[id] - Get single log detail
// ============================================================================

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params

    const log = await prisma.apiLog.findUnique({
      where: { id },
      include: {
        apiKey: {
          select: {
            id: true,
            name: true,
            lastFour: true,
            keyPrefix: true,
            environment: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!log) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Log not found" },
        },
        { status: 404 }
      )
    }

    const transformedLog = {
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      requestId: log.requestId,
      method: log.method,
      endpoint: log.endpoint,
      status: log.statusCode,
      latency: log.latencyMs,
      apiKey: log.apiKey ? `${log.apiKey.keyPrefix}...${log.apiKey.lastFour}` : "N/A",
      apiKeyName: log.apiKey?.name || "Unknown",
      apiKeyId: log.apiKey?.id || null,
      apiKeyEnvironment: log.apiKey?.environment || null,
      ip: log.ipAddress || "N/A",
      userAgent: log.userAgent || "N/A",
      requestBody: log.requestBody as Record<string, unknown> | null,
      responseBody: (log.responseBody as Record<string, unknown>) || {},
      requestHeaders: (log.requestHeaders as Record<string, string>) || {},
      responseHeaders: (log.responseHeaders as Record<string, string>) || {},
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            email: log.user.email,
          }
        : null,
      organization: log.organization
        ? {
            id: log.organization.id,
            name: log.organization.name,
          }
        : null,
    }

    return NextResponse.json({
      success: true,
      data: { log: transformedLog },
    })
  } catch (error) {
    console.error("Error fetching log:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch log" },
      },
      { status: 500 }
    )
  }
}
