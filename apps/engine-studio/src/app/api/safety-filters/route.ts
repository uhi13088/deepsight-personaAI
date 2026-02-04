import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { FilterType } from "@prisma/client"

const createFilterSchema = z.object({
  name: z.string().min(1, "이름은 필수입니다"),
  filterType: z.enum(["PROFANITY", "HATE_SPEECH", "POLITICAL", "RELIGIOUS", "CUSTOM"]),
  pattern: z.string().min(1, "패턴은 필수입니다"),
  isActive: z.boolean().default(true),
})

const updateFilterSchema = z.object({
  name: z.string().min(1).optional(),
  filterType: z.enum(["PROFANITY", "HATE_SPEECH", "POLITICAL", "RELIGIOUS", "CUSTOM"]).optional(),
  pattern: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

// GET /api/safety-filters - 안전 필터 목록 조회
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
    const type = searchParams.get("type")
    const active = searchParams.get("active")

    const where: { filterType?: FilterType; isActive?: boolean } = {}

    if (type && type !== "all") {
      where.filterType = type as FilterType
    }

    if (active && active !== "all") {
      where.isActive = active === "true"
    }

    const filters = await prisma.safetyFilter.findMany({
      where,
      orderBy: [{ filterType: "asc" }, { name: "asc" }],
    })

    const data = filters.map((filter) => ({
      id: filter.id,
      name: filter.name,
      filterType: filter.filterType,
      pattern: filter.pattern,
      isActive: filter.isActive,
      createdAt: filter.createdAt.toISOString(),
      updatedAt: filter.updatedAt.toISOString(),
    }))

    // 타입별 통계
    const stats = await prisma.safetyFilter.groupBy({
      by: ["filterType"],
      _count: true,
    })

    const typeCounts = stats.reduce(
      (acc, item) => {
        acc[item.filterType.toLowerCase()] = item._count
        return acc
      },
      {} as Record<string, number>
    )

    return NextResponse.json({
      success: true,
      data,
      stats: {
        total: data.length,
        active: data.filter((f) => f.isActive).length,
        byType: typeCounts,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/safety-filters error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "필터 조회에 실패했습니다" } },
      { status: 500 }
    )
  }
}

// POST /api/safety-filters - 안전 필터 생성
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
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createFilterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    // 패턴 유효성 검사
    try {
      new RegExp(parsed.data.pattern)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "유효하지 않은 정규식 패턴입니다" },
        },
        { status: 400 }
      )
    }

    const filter = await prisma.safetyFilter.create({
      data: {
        name: parsed.data.name,
        filterType: parsed.data.filterType as FilterType,
        pattern: parsed.data.pattern,
        isActive: parsed.data.isActive,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "FILTER_CREATE",
        targetType: "SAFETY_FILTER",
        targetId: filter.id,
        details: { name: filter.name, filterType: filter.filterType },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: filter.id,
        name: filter.name,
        filterType: filter.filterType,
        isActive: filter.isActive,
        createdAt: filter.createdAt.toISOString(),
      },
      message: "필터가 생성되었습니다",
    })
  } catch (error) {
    console.error("[API] POST /api/safety-filters error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "필터 생성에 실패했습니다" } },
      { status: 500 }
    )
  }
}
