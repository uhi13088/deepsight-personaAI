import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/persona-world/notifications
 *
 * 유저 알림 목록 조회.
 *
 * Query Parameters:
 * - userId: string (필수)
 * - limit: 조회 개수 (최대 50, 기본 20)
 * - cursor: 페이지네이션 커서
 * - unreadOnly: "true"이면 읽지 않은 알림만
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const userId = searchParams.get("userId")
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 50)
    const cursor = searchParams.get("cursor")
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { userId }
    if (unreadOnly) {
      where.read = false
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.pWNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          type: true,
          message: true,
          personaId: true,
          personaName: true,
          postId: true,
          commentId: true,
          read: true,
          createdAt: true,
        },
      }),
      prisma.pWNotification.count({
        where: { userId, read: false },
      }),
    ])

    const hasMore = notifications.length > limit
    const sliced = hasMore ? notifications.slice(0, limit) : notifications
    const nextCursor = hasMore ? (sliced[sliced.length - 1]?.id ?? null) : null

    return NextResponse.json({
      success: true,
      data: {
        notifications: sliced.map((n) => ({
          id: n.id,
          type: n.type,
          message: n.message,
          personaId: n.personaId,
          personaName: n.personaName,
          postId: n.postId,
          commentId: n.commentId,
          read: n.read,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
        nextCursor,
        hasMore,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "NOTIFICATION_ERROR", message } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/persona-world/notifications
 *
 * 알림 상태 관리.
 *
 * Body:
 * - action: "markRead" | "markAllRead" | "delete"
 * - userId: string (필수)
 * - notificationId?: string (markRead, delete 시)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, notificationId } = body as {
      action?: string
      userId?: string
      notificationId?: string
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    if (!action || !["markRead", "markAllRead", "delete"].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "action은 markRead, markAllRead, delete 중 하나여야 합니다",
          },
        },
        { status: 400 }
      )
    }

    if (action === "markAllRead") {
      const result = await prisma.pWNotification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      })
      return NextResponse.json({
        success: true,
        data: { updatedCount: result.count },
      })
    }

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "notificationId 필요" } },
        { status: 400 }
      )
    }

    // 알림 소유권 확인
    const notification = await prisma.pWNotification.findUnique({
      where: { id: notificationId },
      select: { userId: true },
    })

    if (!notification || notification.userId !== userId) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "알림을 찾을 수 없습니다" } },
        { status: 404 }
      )
    }

    if (action === "markRead") {
      await prisma.pWNotification.update({
        where: { id: notificationId },
        data: { read: true },
      })
      return NextResponse.json({
        success: true,
        data: { notificationId, read: true },
      })
    }

    if (action === "delete") {
      await prisma.pWNotification.delete({
        where: { id: notificationId },
      })
      return NextResponse.json({
        success: true,
        data: { notificationId, deleted: true },
      })
    }

    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: "알 수 없는 action" } },
      { status: 400 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: { code: "NOTIFICATION_ERROR", message } },
      { status: 500 }
    )
  }
}
