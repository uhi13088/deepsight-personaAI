import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const updateEndpointSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "DEPRECATED", "DISABLED"]).optional(),
  rateLimit: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional(),
  requiresAuth: z.boolean().optional(),
})

// GET /api/api-endpoints/[id] - 엔드포인트 상세 조회
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params

    const endpoint = await prisma.apiEndpoint.findUnique({ where: { id } })

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "엔드포인트를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: endpoint.id,
        path: endpoint.path,
        method: endpoint.method,
        name: endpoint.name,
        description: endpoint.description,
        version: endpoint.version,
        status: endpoint.status.toLowerCase(),
        category: endpoint.category,
        requiresAuth: endpoint.requiresAuth,
        rateLimit: endpoint.rateLimit,
        timeout: endpoint.timeout,
        createdAt: endpoint.createdAt.toISOString(),
        updatedAt: endpoint.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] GET /api/api-endpoints/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "엔드포인트 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/api-endpoints/[id] - 엔드포인트 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "관리자 권한이 필요합니다" } },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateEndpointSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const existing = await prisma.apiEndpoint.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "엔드포인트를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    const endpoint = await prisma.apiEndpoint.update({
      where: { id },
      data: parsed.data,
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ENDPOINT_UPDATE",
        targetType: "API_ENDPOINT",
        targetId: endpoint.id,
        details: { changes: parsed.data },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: endpoint.id,
        path: endpoint.path,
        method: endpoint.method,
        name: endpoint.name,
        status: endpoint.status.toLowerCase(),
        updatedAt: endpoint.updatedAt.toISOString(),
      },
      message: "엔드포인트가 수정되었습니다",
    })
  } catch (error) {
    console.error("[API] PATCH /api/api-endpoints/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "엔드포인트 수정에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/api-endpoints/[id] - 엔드포인트 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "관리자 권한이 필요합니다" } },
        { status: 403 }
      )
    }

    const { id } = await params

    const existing = await prisma.apiEndpoint.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "엔드포인트를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    await prisma.apiEndpoint.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ENDPOINT_DELETE",
        targetType: "API_ENDPOINT",
        targetId: id,
        details: { path: existing.path, method: existing.method },
      },
    })

    return NextResponse.json({
      success: true,
      message: "엔드포인트가 삭제되었습니다",
    })
  } catch (error) {
    console.error("[API] DELETE /api/api-endpoints/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "엔드포인트 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
