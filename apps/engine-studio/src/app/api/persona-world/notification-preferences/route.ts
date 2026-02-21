import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { NotificationPreferenceData } from "@/lib/persona-world/notification-preference"
import { DEFAULT_PREFERENCES } from "@/lib/persona-world/notification-preference"

/**
 * GET /api/persona-world/notification-preferences?userId=xxx
 *
 * 유저의 알림 설정 조회 (없으면 기본값)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    const pref = await prisma.pWNotificationPreference.findUnique({
      where: { userId },
    })

    const data: NotificationPreferenceData = pref
      ? {
          likeEnabled: pref.likeEnabled,
          commentEnabled: pref.commentEnabled,
          followEnabled: pref.followEnabled,
          mentionEnabled: pref.mentionEnabled,
          repostEnabled: pref.repostEnabled,
          recommendationEnabled: pref.recommendationEnabled,
          newPostEnabled: pref.newPostEnabled,
          systemEnabled: pref.systemEnabled,
          quietHoursStart: pref.quietHoursStart,
          quietHoursEnd: pref.quietHoursEnd,
        }
      : { ...DEFAULT_PREFERENCES }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[notification-preferences] GET error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "알림 설정 조회 실패" } },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/persona-world/notification-preferences
 *
 * 유저의 알림 설정 업데이트 (upsert)
 *
 * Body: { userId: string, ...partialPreferences }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ...updates } = body as { userId: string } & Partial<NotificationPreferenceData>

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_REQUEST", message: "userId 필요" } },
        { status: 400 }
      )
    }

    // quietHours 유효성 검증
    if (updates.quietHoursStart !== undefined && updates.quietHoursStart !== null) {
      if (updates.quietHoursStart < 0 || updates.quietHoursStart > 23) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_REQUEST", message: "quietHoursStart는 0~23" } },
          { status: 400 }
        )
      }
    }
    if (updates.quietHoursEnd !== undefined && updates.quietHoursEnd !== null) {
      if (updates.quietHoursEnd < 0 || updates.quietHoursEnd > 23) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_REQUEST", message: "quietHoursEnd는 0~23" } },
          { status: 400 }
        )
      }
    }

    // boolean 필드만 허용
    const allowedFields = [
      "likeEnabled",
      "commentEnabled",
      "followEnabled",
      "mentionEnabled",
      "repostEnabled",
      "recommendationEnabled",
      "newPostEnabled",
      "systemEnabled",
      "quietHoursStart",
      "quietHoursEnd",
    ] as const

    const safeUpdates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field]
      }
    }

    const pref = await prisma.pWNotificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...DEFAULT_PREFERENCES,
        ...safeUpdates,
      },
      update: safeUpdates,
    })

    const data: NotificationPreferenceData = {
      likeEnabled: pref.likeEnabled,
      commentEnabled: pref.commentEnabled,
      followEnabled: pref.followEnabled,
      mentionEnabled: pref.mentionEnabled,
      repostEnabled: pref.repostEnabled,
      recommendationEnabled: pref.recommendationEnabled,
      newPostEnabled: pref.newPostEnabled,
      systemEnabled: pref.systemEnabled,
      quietHoursStart: pref.quietHoursStart,
      quietHoursEnd: pref.quietHoursEnd,
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[notification-preferences] PUT error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "알림 설정 저장 실패" } },
      { status: 500 }
    )
  }
}
