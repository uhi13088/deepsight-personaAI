import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const updateConfigSchema = z.object({
  category: z.string().min(1),
  key: z.string().min(1),
  value: z.unknown(),
  description: z.string().optional(),
})

// GET /api/system-config - 시스템 설정 조회
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

    const where = category && category !== "all" ? { category } : {}

    const configs = await prisma.systemConfig.findMany({
      where,
      orderBy: [{ category: "asc" }, { key: "asc" }],
    })

    // 카테고리별로 그룹화
    const grouped = configs.reduce(
      (acc, config) => {
        if (!acc[config.category]) {
          acc[config.category] = []
        }
        acc[config.category].push({
          id: config.id,
          key: config.key,
          value: config.value,
          description: config.description,
          updatedAt: config.updatedAt.toISOString(),
        })
        return acc
      },
      {} as Record<
        string,
        { id: string; key: string; value: unknown; description: string | null; updatedAt: string }[]
      >
    )

    return NextResponse.json({
      success: true,
      data: grouped,
      categories: Object.keys(grouped),
      total: configs.length,
    })
  } catch (error) {
    console.error("[API] GET /api/system-config error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "설정 조회에 실패했습니다" } },
      { status: 500 }
    )
  }
}

// POST /api/system-config - 설정 생성/수정 (upsert)
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
    const parsed = updateConfigSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { category, key, value, description } = parsed.data

    const config = await prisma.systemConfig.upsert({
      where: {
        category_key: { category, key },
      },
      update: {
        value: value as object,
        description,
      },
      create: {
        category,
        key,
        value: value as object,
        description,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CONFIG_UPDATE",
        targetType: "SYSTEM_CONFIG",
        targetId: config.id,
        details: { category, key },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: config.id,
        category: config.category,
        key: config.key,
        value: config.value,
        updatedAt: config.updatedAt.toISOString(),
      },
      message: "설정이 저장되었습니다",
    })
  } catch (error) {
    console.error("[API] POST /api/system-config error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "설정 저장에 실패했습니다" } },
      { status: 500 }
    )
  }
}
