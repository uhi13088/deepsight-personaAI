import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/require-auth"
import { getUserOrganization } from "@/lib/get-user-organization"

// GET /api/api-keys/[id] - Get a specific API key
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params
    const membership = await getUserOrganization(session.user.id)

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "NO_ORGANIZATION", message: "조직을 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        organizationId: membership.organizationId,
      },
    })

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "API 키를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Fetch usage stats for this key
    const [totalCalls, callsThisMonth, latencyStats] = await Promise.all([
      prisma.apiLog.count({ where: { apiKeyId: id } }),
      prisma.apiLog.count({
        where: {
          apiKeyId: id,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      prisma.apiLog.aggregate({
        where: { apiKeyId: id },
        _avg: { latencyMs: true },
        _count: { id: true },
      }),
    ])

    const successCalls = await prisma.apiLog.count({
      where: { apiKeyId: id, statusCode: { lt: 400 } },
    })

    return NextResponse.json({
      success: true,
      data: {
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          prefix: apiKey.keyPrefix,
          lastFour: apiKey.lastFour,
          environment: apiKey.environment.toLowerCase(),
          status: apiKey.status.toLowerCase(),
          permissions: apiKey.permissions,
          rateLimit: apiKey.rateLimit,
          expiresAt: apiKey.expiresAt?.toISOString() || null,
          createdAt: apiKey.createdAt.toISOString(),
          lastUsedAt: apiKey.lastUsedAt?.toISOString() || null,
          revokedAt: apiKey.revokedAt?.toISOString() || null,
          stats: {
            totalCalls,
            callsThisMonth,
            successRate: totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 0,
            avgLatency: Math.round(latencyStats._avg.latencyMs ?? 0),
          },
        },
      },
    })
  } catch (error) {
    console.error("Error fetching API key:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "API 키 조회에 실패했습니다." } },
      { status: 500 }
    )
  }
}

// PATCH /api/api-keys/[id] - Update an API key
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params
    const membership = await getUserOrganization(session.user.id)

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "NO_ORGANIZATION", message: "조직을 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Verify ownership
    const existing = await prisma.apiKey.findFirst({
      where: { id, organizationId: membership.organizationId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "API 키를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    if (existing.status === "REVOKED") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "KEY_REVOKED", message: "취소된 API 키는 수정할 수 없습니다." },
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, permissions, rateLimit } = body

    // Validate
    if (name !== undefined && (typeof name !== "string" || name.length < 3)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "이름은 3자 이상이어야 합니다." },
        },
        { status: 400 }
      )
    }

    if (
      rateLimit !== undefined &&
      (typeof rateLimit !== "number" || rateLimit < 1 || rateLimit > 10000)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "rateLimit은 1~10000 사이여야 합니다." },
        },
        { status: 400 }
      )
    }

    const updatedApiKey = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(permissions !== undefined && { permissions }),
        ...(rateLimit !== undefined && { rateLimit }),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        apiKey: {
          id: updatedApiKey.id,
          name: updatedApiKey.name,
          prefix: updatedApiKey.keyPrefix,
          lastFour: updatedApiKey.lastFour,
          environment: updatedApiKey.environment.toLowerCase(),
          status: updatedApiKey.status.toLowerCase(),
          permissions: updatedApiKey.permissions,
          rateLimit: updatedApiKey.rateLimit,
          updatedAt: updatedApiKey.updatedAt.toISOString(),
        },
      },
    })
  } catch (error) {
    console.error("Error updating API key:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "API 키 수정에 실패했습니다." } },
      { status: 500 }
    )
  }
}

// DELETE /api/api-keys/[id] - Revoke an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const { id } = await params
    const membership = await getUserOrganization(session.user.id)

    if (!membership) {
      return NextResponse.json(
        { success: false, error: { code: "NO_ORGANIZATION", message: "조직을 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    // Verify ownership
    const existing = await prisma.apiKey.findFirst({
      where: { id, organizationId: membership.organizationId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "API 키를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    if (existing.status === "REVOKED") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "ALREADY_REVOKED", message: "이미 취소된 API 키입니다." },
        },
        { status: 400 }
      )
    }

    const revoked = await prisma.apiKey.update({
      where: { id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        revokedAt: revoked.revokedAt?.toISOString(),
      },
    })
  } catch (error) {
    console.error("Error revoking API key:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "API 키 취소에 실패했습니다." } },
      { status: 500 }
    )
  }
}
