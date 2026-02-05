import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const createEndpointSchema = z.object({
  path: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().default("v1"),
  category: z.string().default("general"),
  requiresAuth: z.boolean().default(true),
  rateLimit: z.number().int().positive().default(100),
  timeout: z.number().int().positive().default(30000),
})

// GET /api/api-endpoints - 엔드포인트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    const where: Record<string, unknown> = {}
    if (category && category !== "all") {
      where.category = category
    }
    if (status && status !== "all") {
      where.status = status.toUpperCase()
    }
    if (search) {
      where.OR = [
        { path: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ]
    }

    const endpoints = await prisma.apiEndpoint.findMany({
      where,
      orderBy: [{ category: "asc" }, { path: "asc" }],
    })

    const categories = [...new Set(endpoints.map((ep) => ep.category))]

    return NextResponse.json({
      success: true,
      data: endpoints.map((ep) => ({
        id: ep.id,
        path: ep.path,
        method: ep.method,
        name: ep.name,
        description: ep.description,
        version: ep.version,
        status: ep.status.toLowerCase(),
        category: ep.category,
        requiresAuth: ep.requiresAuth,
        rateLimit: ep.rateLimit,
        timeout: ep.timeout,
        createdAt: ep.createdAt.toISOString(),
        updatedAt: ep.updatedAt.toISOString(),
      })),
      categories,
      total: endpoints.length,
    })
  } catch (error) {
    console.error("[API] GET /api/api-endpoints error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "엔드포인트 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/api-endpoints - 엔드포인트 등록
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const parsed = createEndpointSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const endpoint = await prisma.apiEndpoint.create({
      data: parsed.data,
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ENDPOINT_CREATE",
        targetType: "API_ENDPOINT",
        targetId: endpoint.id,
        details: { path: endpoint.path, method: endpoint.method },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          id: endpoint.id,
          path: endpoint.path,
          method: endpoint.method,
          name: endpoint.name,
          status: endpoint.status.toLowerCase(),
        },
        message: "엔드포인트가 등록되었습니다",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API] POST /api/api-endpoints error:", error)

    const prismaError = error as { code?: string }
    if (prismaError.code === "P2002") {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE", message: "이미 등록된 엔드포인트입니다" } },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "엔드포인트 등록에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
