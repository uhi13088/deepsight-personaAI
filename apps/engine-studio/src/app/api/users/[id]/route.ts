import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth, hashPassword } from "@/lib/auth"
import type { UserRole } from "@prisma/client"

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "AI_ENGINEER", "CONTENT_MANAGER", "ANALYST"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

// GET /api/users/[id] - 단일 사용자 조회
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

    // 본인 또는 관리자만 조회 가능
    if (session.user.id !== id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        image: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.isActive ? "active" : "inactive",
        lastActive: user.lastLoginAt?.toISOString() || null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        image: user.image,
      },
    })
  } catch (error) {
    console.error("[API] GET /api/users/[id] error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "사용자 조회에 실패했습니다" } },
      { status: 500 }
    )
  }
}

// PATCH /api/users/[id] - 사용자 수정
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    const { id } = await params

    // 본인은 이름만 수정 가능, 관리자는 모두 수정 가능
    const isAdmin = session.user.role === "ADMIN"
    const isSelf = session.user.id === id

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { name, role, isActive, password } = parsed.data

    // 본인은 이름과 비밀번호만 수정 가능
    if (!isAdmin && (role !== undefined || isActive !== undefined)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "역할 및 상태 변경 권한이 없습니다" },
        },
        { status: 403 }
      )
    }

    const updateData: {
      name?: string
      role?: UserRole
      isActive?: boolean
      password?: string
    } = {}

    if (name !== undefined) updateData.name = name
    if (role !== undefined && isAdmin) updateData.role = role as UserRole
    if (isActive !== undefined && isAdmin) updateData.isActive = isActive
    if (password !== undefined) updateData.password = await hashPassword(password)

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    })

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "USER_UPDATE",
        targetType: "USER",
        targetId: id,
        details: { changes: Object.keys(updateData) },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.isActive ? "active" : "inactive",
        updatedAt: user.updatedAt.toISOString(),
      },
      message: "사용자 정보가 수정되었습니다",
    })
  } catch (error) {
    console.error("[API] PATCH /api/users/[id] error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "사용자 수정에 실패했습니다" } },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - 사용자 비활성화
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

    // 자기 자신은 삭제 불가
    if (session.user.id === id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "본인 계정은 삭제할 수 없습니다" } },
        { status: 403 }
      )
    }

    // 소프트 삭제 (비활성화)
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    })

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "USER_DELETE",
        targetType: "USER",
        targetId: id,
      },
    })

    return NextResponse.json({
      success: true,
      message: "사용자가 비활성화되었습니다",
    })
  } catch (error) {
    console.error("[API] DELETE /api/users/[id] error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "사용자 삭제에 실패했습니다" } },
      { status: 500 }
    )
  }
}
