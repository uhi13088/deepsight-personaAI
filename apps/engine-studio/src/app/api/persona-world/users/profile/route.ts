import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyInternalToken } from "@/lib/internal-auth"

/**
 * PATCH /api/persona-world/users/profile
 *
 * 유저 프로필 수정 (현재: nickname만 지원).
 *
 * Body: { userId: string, nickname: string }
 * - nickname: 2~20자, 앞뒤 공백 제거
 */
export async function PATCH(request: NextRequest) {
  const authError = verifyInternalToken(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { userId, nickname } = body as {
      userId: string
      nickname?: string
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    if (nickname !== undefined) {
      const trimmed = nickname.trim()
      if (trimmed.length < 2 || trimmed.length > 20) {
        return NextResponse.json(
          {
            success: false,
            error: { code: "INVALID_NICKNAME", message: "활동명은 2~20자여야 합니다" },
          },
          { status: 400 }
        )
      }

      const updated = await prisma.personaWorldUser.update({
        where: { id: userId },
        data: { nickname: trimmed },
        select: { id: true, nickname: true },
      })

      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json(
      { success: false, error: { code: "NO_CHANGES", message: "변경할 필드가 없습니다" } },
      { status: 400 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "PROFILE_UPDATE_ERROR", message } },
      { status: 500 }
    )
  }
}
