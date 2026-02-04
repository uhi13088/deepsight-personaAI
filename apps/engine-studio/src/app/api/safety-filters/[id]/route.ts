import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import type { FilterType } from "@prisma/client"

const updateSafetyFilterSchema = z.object({
  name: z.string().min(1).optional(),
  filterType: z.enum(["PROFANITY", "HATE_SPEECH", "POLITICAL", "RELIGIOUS", "CUSTOM"]).optional(),
  pattern: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
})

// GET /api/safety-filters/[id] - 단일 안전 필터 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params

    const filter = await prisma.safetyFilter.findUnique({
      where: { id },
    })

    if (!filter) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "안전 필터를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: filter.id,
        name: filter.name,
        filterType: filter.filterType,
        pattern: filter.pattern,
        isActive: filter.isActive,
        createdAt: filter.createdAt.toISOString(),
        updatedAt: filter.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] GET /api/safety-filters/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "안전 필터 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// PATCH /api/safety-filters/[id] - 안전 필터 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    if (!["ADMIN", "AI_ENGINEER"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateSafetyFilterSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const existing = await prisma.safetyFilter.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "안전 필터를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    const { name, filterType, pattern, isActive } = parsed.data

    // 정규식 패턴 유효성 검증
    if (pattern) {
      try {
        new RegExp(pattern)
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: { code: "VALIDATION_ERROR", message: "유효하지 않은 정규식 패턴입니다" },
          },
          { status: 400 }
        )
      }
    }

    const filter = await prisma.safetyFilter.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(filterType && { filterType: filterType as FilterType }),
        ...(pattern && { pattern }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "SAFETY_FILTER_UPDATE",
        targetType: "SAFETY_FILTER",
        targetId: id,
        details: { changes: Object.keys(parsed.data) },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: filter.id,
        name: filter.name,
        filterType: filter.filterType,
        isActive: filter.isActive,
        updatedAt: filter.updatedAt.toISOString(),
      },
      message: "안전 필터가 수정되었습니다",
    })
  } catch (error) {
    console.error("[API] PATCH /api/safety-filters/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "안전 필터 수정에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// DELETE /api/safety-filters/[id] - 안전 필터 삭제
export async function DELETE(
  request: NextRequest,
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
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const { id } = await params

    // 소프트 삭제 (비활성화)
    await prisma.safetyFilter.update({
      where: { id },
      data: { isActive: false },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "SAFETY_FILTER_DELETE",
        targetType: "SAFETY_FILTER",
        targetId: id,
      },
    })

    return NextResponse.json({
      success: true,
      message: "안전 필터가 비활성화되었습니다",
    })
  } catch (error) {
    console.error("[API] DELETE /api/safety-filters/[id] error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "안전 필터 삭제에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
