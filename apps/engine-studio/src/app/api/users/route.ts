import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth, hashPassword } from "@/lib/auth"
import type { UserRole } from "@prisma/client"

// 사용자 생성 스키마
const createUserSchema = z.object({
  email: z.string().email("유효한 이메일을 입력해주세요"),
  name: z.string().min(1, "이름은 필수입니다").optional(),
  password: z.string().min(8, "비밀번호는 최소 8자 이상이어야 합니다").optional(),
  role: z.enum(["ADMIN", "AI_ENGINEER", "CONTENT_MANAGER", "ANALYST"]).default("ANALYST"),
})

// GET /api/users - 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    // 관리자만 전체 사용자 목록 조회 가능
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    const where: {
      role?: UserRole
      isActive?: boolean
      OR?: {
        name?: { contains: string; mode: "insensitive" }
        email?: { contains: string; mode: "insensitive" }
      }[]
    } = {}

    if (role && role !== "all") {
      where.role = role as UserRole
    }

    if (status && status !== "all") {
      where.isActive = status === "active"
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        image: true,
      },
      orderBy: { createdAt: "desc" },
    })

    const data = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.isActive ? "active" : "inactive",
      lastActive: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
      image: user.image,
    }))

    return NextResponse.json({
      success: true,
      data,
      total: data.length,
    })
  } catch (error) {
    console.error("[API] GET /api/users error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "사용자 목록 조회에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}

// POST /api/users - 사용자 생성/초대
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    // 관리자만 사용자 생성 가능
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { email, name, password, role } = parsed.data

    // 이메일 중복 체크
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "이미 등록된 이메일입니다" } },
        { status: 409 }
      )
    }

    // 사용자 생성
    const hashedPassword = password ? await hashPassword(password) : null

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || email.split("@")[0],
        password: hashedPassword,
        role: role as UserRole,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    // 감사 로그 기록
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "USER_CREATE",
        targetType: "USER",
        targetId: newUser.id,
        details: { email: newUser.email, role: newUser.role },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.isActive ? "active" : "inactive",
        createdAt: newUser.createdAt.toISOString(),
      },
      message: "사용자가 생성되었습니다",
    })
  } catch (error) {
    console.error("[API] POST /api/users error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "사용자 생성에 실패했습니다" } },
      { status: 500 }
    )
  }
}
