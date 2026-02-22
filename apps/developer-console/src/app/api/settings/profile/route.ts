import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/require-auth"

/**
 * PATCH /api/settings/profile - 프로필 업데이트
 */
export async function PATCH(request: NextRequest) {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { name, phone, timezone, language } = body

    // Validate name if provided
    if (name !== undefined && (typeof name !== "string" || name.trim().length < 1)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "이름은 1자 이상이어야 합니다." },
        },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        twoFactorEnabled: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: updatedUser.id,
          name: updatedUser.name || "",
          email: updatedUser.email,
          avatar: updatedUser.image || null,
          phone: updatedUser.phone || "",
          timezone: timezone || "Asia/Seoul",
          language: language || "ko",
          twoFactorEnabled: updatedUser.twoFactorEnabled,
          lastPasswordChange: updatedUser.updatedAt.toISOString(),
        },
      },
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "PROFILE_UPDATE_FAILED", message: "프로필 수정에 실패했습니다." },
      },
      { status: 500 }
    )
  }
}
