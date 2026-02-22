import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/require-auth"

/**
 * GET /api/settings - 사용자 설정 조회
 */
export async function GET() {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phone: true,
        twoFactorEnabled: true,
        updatedAt: true,
        sessions: {
          orderBy: { expires: "desc" },
          take: 10,
          select: {
            id: true,
            userAgent: true,
            ipAddress: true,
            expires: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    const sessions = user.sessions.map((s, idx) => ({
      id: s.id,
      device: s.userAgent || "Unknown Device",
      ip: s.ipAddress || "Unknown",
      location: "Unknown",
      lastActive: s.expires.toISOString(),
      current: idx === 0,
    }))

    return NextResponse.json({
      success: true,
      data: {
        profile: {
          id: user.id,
          name: user.name || "",
          email: user.email,
          avatar: user.image || null,
          phone: user.phone || "",
          twoFactorEnabled: user.twoFactorEnabled,
          lastPasswordChange: user.updatedAt.toISOString(),
        },
        notifications: {
          email: {
            apiAlerts: true,
            usageReports: false,
            billing: true,
            security: true,
            marketing: false,
            productUpdates: false,
          },
          push: {
            apiAlerts: true,
            usageReports: false,
            billing: true,
            security: true,
          },
        },
        sessions,
      },
    })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "설정 조회에 실패했습니다." } },
      { status: 500 }
    )
  }
}
