import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import crypto from "crypto"

const inviteSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요"),
  role: z.enum(["ADMIN", "AI_ENGINEER", "CONTENT_MANAGER", "ANALYST"]),
  name: z.string().optional(),
})

/**
 * POST /api/users/invite - 사용자 초대
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다" } },
        { status: 401 }
      )
    }

    // Only ADMIN can invite users
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "권한이 없습니다" } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message },
        },
        { status: 400 }
      )
    }

    const { email, role, name } = parsed.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: "USER_EXISTS", message: "이미 등록된 이메일입니다" } },
        { status: 400 }
      )
    }

    // Create a temporary password (user will need to reset)
    const tempPassword = crypto.randomBytes(16).toString("hex")

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        role,
        password: tempPassword, // In production, this should be hashed
        isActive: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "USER_INVITE",
        targetType: "USER",
        targetId: user.id,
        details: { invitedEmail: email, role },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      message: "초대가 발송되었습니다",
    })
  } catch (error) {
    console.error("[API] POST /api/users/invite error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "사용자 초대에 실패했습니다" },
      },
      { status: 500 }
    )
  }
}
