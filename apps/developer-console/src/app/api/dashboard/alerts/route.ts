import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireAuth } from "@/lib/require-auth"

// ============================================================================
// GET /api/dashboard/alerts - Get dashboard alerts (Notification 모델 기반)
// ============================================================================

export async function GET(_request: NextRequest) {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        read: true,
        readAt: true,
        actionUrl: true,
        metadata: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type.toLowerCase(),
        title: n.title,
        message: n.message,
        read: n.read,
        readAt: n.readAt?.toISOString() || null,
        actionUrl: n.actionUrl || null,
        metadata: n.metadata,
        createdAt: n.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error fetching alerts:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "알림 조회에 실패했습니다." } },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH /api/dashboard/alerts/:id - Mark alert as read
// ============================================================================

export async function PATCH(request: NextRequest) {
  const { session, response } = await requireAuth()
  if (response) return response

  try {
    const body = await request.json()
    const { id, read } = body as { id?: string; read: boolean }

    if (id) {
      // 특정 알림 읽음 처리
      const notification = await prisma.notification.findFirst({
        where: { id, userId: session.user.id },
      })

      if (!notification) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "알림을 찾을 수 없습니다." } },
          { status: 404 }
        )
      }

      await prisma.notification.update({
        where: { id },
        data: { read, readAt: read ? new Date() : null },
      })
    } else {
      // id 없으면 전체 읽음 처리
      await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true, readAt: new Date() },
      })
    }

    return NextResponse.json({ success: true, data: { read } })
  } catch (error) {
    console.error("Error updating alert:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "알림 업데이트에 실패했습니다." },
      },
      { status: 500 }
    )
  }
}
